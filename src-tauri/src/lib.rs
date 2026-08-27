use std::path::{Path, PathBuf};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

fn launch_dsh_backend(vendor_dir: &Path, jingyun_dir: &Path) {
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

fn ensure_profile_bundles(app_handle: &tauri::AppHandle) {
    if let Ok(home_dir) = app_handle.path().home_dir() {
        let profile_dir = home_dir.join(".dsh").join("profiles").join("web");
        let pkg_path = profile_dir.join("package.json");
        
        // Ensure parent directory exists
        let _ = std::fs::create_dir_all(&profile_dir);
        
        let mut needs_write = false;
        
        if pkg_path.exists() {
            if let Ok(existing_content) = std::fs::read_to_string(&pkg_path) {
                // If it doesn't contain our custom plugin, we need to inject it
                if !existing_content.contains("@jingyun-ai/jingyun-dsh") {
                    needs_write = true;
                }
            } else {
                needs_write = true;
            }
        } else {
            needs_write = true;
        }
        
        if needs_write {
            println!("[Tauri] Pre-initializing web profile package.json with @jingyun-ai/jingyun-dsh");
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

            // 1. Check app_local_data_dir/vendor (%LOCALAPPDATA%\online.jingyun.dsh\vendor)
            let mut vendor_dir = PathBuf::new();
            if let Ok(local_data) = app.path().app_local_data_dir() {
                let p = local_data.join("vendor");
                if p.join("node").join("node.exe").exists() {
                    vendor_dir = p;
                }
            }

            // 2. Check AppData/Local/Jingyun-DSH/vendor (Fallback)
            if !vendor_dir.exists() {
                if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
                    let p = PathBuf::from(local_app_data).join("Jingyun-DSH").join("vendor");
                    if p.join("node").join("node.exe").exists() {
                        vendor_dir = p;
                    }
                }
            }

            // 3. Check resource_dir/resources/vendor
            if !vendor_dir.exists() {
                if let Ok(res_dir) = app.path().resource_dir() {
                    vendor_dir = res_dir.join("resources").join("vendor");
                }
            }

            let resource_dir = app.path().resource_dir().unwrap_or_default();
            let resource_jingyun_dir = resource_dir.join("resources").join("vendor").join("jingyun");
            
            let jingyun_dir = if resource_jingyun_dir.join("node_modules/@deepseek-ai/dsh/lib/bin.js").exists() {
                resource_jingyun_dir
            } else {
                vendor_dir.join("jingyun")
            };

            let app_handle = app.handle().clone();
            ensure_profile_bundles(&app_handle);

            // Launch backend
            launch_dsh_backend(&vendor_dir, &jingyun_dir);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
