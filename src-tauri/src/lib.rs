use std::path::{Path, PathBuf};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

fn launch_dsh_backend(vendor_dir: &Path, jingyun_dir: &Path, dsh_home: &Path, is_portable: bool) {
    let node_exe = vendor_dir.join("node").join("node.exe");
    let dsh_bin = jingyun_dir.join("node_modules/@deepseek-ai/dsh/lib/bin.js");

    if node_exe.exists() && dsh_bin.exists() {
        println!("[Tauri] Spawning DSH Backend: {} {}", node_exe.display(), dsh_bin.display());
        let mut cmd = std::process::Command::new(&node_exe);
        cmd.arg(&dsh_bin);
        cmd.arg("--profile");
        cmd.arg("web");
        cmd.arg("--no-open");
        cmd.current_dir(jingyun_dir);

        let current_path = std::env::var("PATH").unwrap_or_default();
        let new_path = format!(
            "{};{};{};{}",
            vendor_dir.join("node").to_string_lossy(),
            vendor_dir.join("python").to_string_lossy(),
            vendor_dir.join("git/PortableGit/cmd").to_string_lossy(),
            current_path
        );
        cmd.env("PATH", &new_path);
        cmd.env("DSH_HOME", dsh_home.to_string_lossy().as_ref());
        cmd.env("DSH_CONFIG_DIR", dsh_home.to_string_lossy().as_ref());
        cmd.env("DSH_PORTABLE", if is_portable { "1" } else { "0" });

        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }

        match cmd.spawn() {
            Ok(child) => {
                println!("[Tauri] DSH Sidecar process spawned successfully! PID: {}", child.id());
                #[cfg(target_os = "windows")]
                {
                    use std::os::windows::io::AsRawHandle;
                    win_job::assign_process_to_kill_on_close_job(child.as_raw_handle());
                }
            }
            Err(e) => eprintln!("[Tauri] Failed to spawn DSH Sidecar: {}", e),
        }
    } else {
        eprintln!("[Tauri] Sidecar target missing. Node ({:?}): {:?}, Bin ({:?}): {:?}", node_exe, node_exe.exists(), dsh_bin, dsh_bin.exists());
    }
}

#[cfg(target_os = "windows")]
mod win_job {
    use std::ffi::c_void;
    use std::os::windows::io::RawHandle;

    type HANDLE = *mut c_void;
    type BOOL = i32;
    type DWORD = u32;
    #[allow(non_camel_case_types)]
    type ULONG_PTR = usize;

    #[repr(C)]
    struct JOBOBJECT_BASIC_LIMIT_INFORMATION {
        per_process_user_time_limit: i64,
        per_job_user_time_limit: i64,
        limit_flags: DWORD,
        minimum_working_set_size: ULONG_PTR,
        maximum_working_set_size: ULONG_PTR,
        active_process_limit: DWORD,
        affinity: ULONG_PTR,
        priority_class: DWORD,
        scheduling_class: DWORD,
    }

    #[repr(C)]
    struct IO_COUNTERS {
        read_operation_count: u64,
        write_operation_count: u64,
        other_operation_count: u64,
        read_transfer_count: u64,
        write_transfer_count: u64,
        other_transfer_count: u64,
    }

    #[repr(C)]
    struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION {
        basic_limit_information: JOBOBJECT_BASIC_LIMIT_INFORMATION,
        io_info: IO_COUNTERS,
        process_memory_limit: ULONG_PTR,
        job_memory_limit: ULONG_PTR,
        peak_process_memory_used: ULONG_PTR,
        peak_job_memory_used: ULONG_PTR,
    }

    const JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE: DWORD = 0x2000;
    const JOB_OBJECT_INFO_CLASS_EXTENDED_LIMIT_INFORMATION: i32 = 9;

    extern "system" {
        fn CreateJobObjectW(lp_job_attributes: *const c_void, lp_name: *const u16) -> HANDLE;
        fn SetInformationJobObject(
            h_job: HANDLE,
            job_object_info_class: i32,
            lp_job_object_info: *const c_void,
            cb_job_object_info_length: DWORD,
        ) -> BOOL;
        fn AssignProcessToJobObject(h_job: HANDLE, h_process: HANDLE) -> BOOL;
    }

    pub fn assign_process_to_kill_on_close_job(process_handle: RawHandle) {
        unsafe {
            let job = CreateJobObjectW(std::ptr::null(), std::ptr::null());
            if job.is_null() {
                eprintln!("[Tauri] Failed to create Job Object");
                return;
            }
            let mut info: JOBOBJECT_EXTENDED_LIMIT_INFORMATION = std::mem::zeroed();
            info.basic_limit_information.limit_flags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
            let res = SetInformationJobObject(
                job,
                JOB_OBJECT_INFO_CLASS_EXTENDED_LIMIT_INFORMATION,
                &info as *const _ as *const c_void,
                std::mem::size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as DWORD,
            );
            if res != 0 {
                if AssignProcessToJobObject(job, process_handle as HANDLE) != 0 {
                    println!("[Tauri] Successfully assigned Sidecar process to KillOnClose Job Object");
                } else {
                    eprintln!("[Tauri] Failed to assign process to Job Object");
                }
            } else {
                eprintln!("[Tauri] Failed to set Job Object information");
            }
            // Keep job handle open indefinitely without closing it so OS will auto-terminate child processes when parent exits
            let _ = job;
        }
    }
}

#[tauri::command]
fn app_start_drag(window: tauri::Window) {
    let _ = window.start_dragging();
}

#[tauri::command]
fn app_minimize(window: tauri::Window) {
    let _ = window.minimize();
}

#[tauri::command]
fn app_toggle_maximize(window: tauri::Window) {
    if let Ok(is_maximized) = window.is_maximized() {
        if is_maximized {
            let _ = window.unmaximize();
        } else {
            let _ = window.maximize();
        }
    }
}

#[tauri::command]
fn app_close(window: tauri::Window) {
    let _ = window.close();
}

fn ensure_profile_bundles(dsh_home: &Path) {
    let profile_dir = dsh_home.join("profiles").join("web");
    let pkg_path = profile_dir.join("package.json");
    let _ = std::fs::create_dir_all(&profile_dir);

    let needs_write = match std::fs::read_to_string(&pkg_path) {
        Ok(content) => !content.contains("@jingyun-ai/jingyun-dsh"),
        Err(_) => true,
    };

    if needs_write {
        println!("[Tauri] Initializing web profile package.json: {}", pkg_path.display());
        let default_pkg = r#"{
  "name": "dsh-profile-web",
  "private": true,
  "dependencies": {},
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "@jingyun-ai/jingyun-dsh"
      ]
    }
  }
}"#;
        let _ = std::fs::write(&pkg_path, default_pkg);
    }
}

fn resolve_dsh_home(app: &tauri::App) -> (PathBuf, bool) {
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_default();
    let data_dir = exe_dir.join("data");
    if data_dir.exists() {
        (data_dir, true)
    } else {
        let home = app.path().home_dir().unwrap_or_default();
        (home.join(".dsh"), false)
    }
}

fn extract_zip(zip_path: &Path, target_dir: &Path) -> std::io::Result<()> {
    let file = std::fs::File::open(zip_path)?;
    let mut archive = zip::ZipArchive::new(file)?;
    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        let outpath = match file.enclosed_name() {
            Some(path) => target_dir.join(path),
            None => continue,
        };
        if file.name().ends_with('/') {
            std::fs::create_dir_all(&outpath)?;
        } else {
            if let Some(p) = outpath.parent() {
                if !p.exists() {
                    std::fs::create_dir_all(p)?;
                }
            }
            let mut outfile = std::fs::File::create(&outpath)?;
            std::io::copy(&mut file, &mut outfile)?;
        }
    }
    Ok(())
}

fn copy_dir_all(src: &Path, dst: &Path) -> std::io::Result<()> {
    std::fs::create_dir_all(dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        let dst_path = dst.join(entry.file_name());
        if ty.is_dir() {
            copy_dir_all(&entry.path(), &dst_path)?;
        } else {
            std::fs::copy(entry.path(), dst_path)?;
        }
    }
    Ok(())
}

fn ensure_portable_vendor(data_dir: &Path, resource_dir: &Path) {
    let vendor_dir = data_dir.join("vendor");
    let node_exe = vendor_dir.join("node").join("node.exe");
    if node_exe.exists() {
        return;
    }

    println!("[Tauri] Native initializing portable vendor to: {}", vendor_dir.display());
    let _ = std::fs::create_dir_all(&vendor_dir);

    let res_vendor = resource_dir.join("resources").join("vendor");
    let src_vendor = if res_vendor.exists() {
        res_vendor
    } else {
        resource_dir.join("vendor")
    };

    // 1. 原生解压 node.zip / python.zip / vendor_deps.zip
    let _ = extract_zip(&src_vendor.join("node.zip"), &vendor_dir.join("node"));
    let _ = extract_zip(&src_vendor.join("python.zip"), &vendor_dir.join("python"));
    let _ = extract_zip(&src_vendor.join("vendor_deps.zip"), &vendor_dir.join("jingyun"));

    // 2. 拷贝 workspace 插件
    let workspace_src = src_vendor.join("workspace");
    if workspace_src.exists() {
        let _ = copy_dir_all(&workspace_src, &vendor_dir.join("jingyun"));
    }

    // 3. 确保 @jingyun-ai 自链接
    let plugin_src = vendor_dir.join("jingyun").join("packages").join("jingyun-dsh");
    if plugin_src.exists() {
        let target_sym = vendor_dir.join("jingyun").join("node_modules").join("@jingyun-ai").join("jingyun-dsh");
        let _ = std::fs::create_dir_all(vendor_dir.join("jingyun").join("node_modules").join("@jingyun-ai"));
        let _ = copy_dir_all(&plugin_src, &target_sym);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![app_start_drag, app_minimize, app_toggle_maximize, app_close])
        .setup(|app| {
            // Build Native Windows System Tray Icon & Context Menu
            if let Some(icon) = app.default_window_icon() {
                let app_title = app.package_info().name.clone();
                let tray_tooltip = if app_title.is_empty() { "Jingyun Studio".to_string() } else { app_title };
                if let (Ok(show_i), Ok(quit_i)) = (
                    MenuItem::with_id(app, "show", "显示", true, None::<&str>),
                    MenuItem::with_id(app, "quit", "退出", true, None::<&str>),
                ) {
                    if let Ok(menu) = Menu::with_items(app, &[&show_i, &quit_i]) {
                        let _ = TrayIconBuilder::new()
                            .icon(icon.clone())
                            .tooltip(tray_tooltip)
                            .menu(&menu)
                            .on_menu_event(|app_handle, event| match event.id.as_ref() {
                                "show" => {
                                    if let Some(window) = app_handle.get_webview_window("main") {
                                        let _ = window.show();
                                        let _ = window.set_focus();
                                    }
                                }
                                "quit" => {
                                    std::process::exit(0);
                                }
                                _ => {}
                            })
                            .on_tray_icon_event(|tray, event| {
                                if let TrayIconEvent::Click {
                                    button: MouseButton::Left,
                                    button_state: MouseButtonState::Up,
                                    ..
                                } = event
                                {
                                    let app_handle = tray.app_handle();
                                    if let Some(window) = app_handle.get_webview_window("main") {
                                        let _ = window.show();
                                        let _ = window.set_focus();
                                    }
                                }
                            })
                            .build(app);
                    }
                }
            }

            // 1. 确定 DSH 数据根目录（便携版读取同级 data 目录，安装版读取 ~/.dsh）
            let (dsh_home, is_portable) = resolve_dsh_home(app);
            let _ = std::fs::create_dir_all(&dsh_home);
            println!("[Tauri] DSH_HOME: {} (Portable: {})", dsh_home.display(), is_portable);

            let resource_dir = app.path().resource_dir().unwrap_or_default();

            // 2. 查找运行环境 (Vendor)
            let mut vendor_dir = PathBuf::new();
            if is_portable {
                // 便携模式：自动解压至 data/vendor，严格只使用 data/vendor，绝不读取 AppData
                ensure_portable_vendor(&dsh_home, &resource_dir);
                let p = dsh_home.join("vendor");
                if p.join("node").join("node.exe").exists() {
                    vendor_dir = p;
                }
            } else {
                // 安装模式：读取标准 AppData
                if let Ok(local_data) = app.path().app_local_data_dir() {
                    let p = local_data.join("vendor");
                    if p.join("node").join("node.exe").exists() {
                        vendor_dir = p;
                    }
                }
                if !vendor_dir.exists() {
                    if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
                        let p = PathBuf::from(local_app_data).join("Jingyun-DSH").join("vendor");
                        if p.join("node").join("node.exe").exists() {
                            vendor_dir = p;
                        }
                    }
                }
                if !vendor_dir.exists() {
                    let p = resource_dir.join("resources").join("vendor");
                    if p.join("node").join("node.exe").exists() {
                        vendor_dir = p;
                    }
                }
            }

            let resource_jingyun_dir = resource_dir.join("resources").join("vendor").join("jingyun");
            let jingyun_dir = if resource_jingyun_dir.join("node_modules/@deepseek-ai/dsh/lib/bin.js").exists() {
                resource_jingyun_dir
            } else {
                vendor_dir.join("jingyun")
            };

            ensure_profile_bundles(&dsh_home);

            // Launch backend
            launch_dsh_backend(&vendor_dir, &jingyun_dir, &dsh_home, is_portable);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
