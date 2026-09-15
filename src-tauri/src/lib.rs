use std::path::{Path, PathBuf};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

fn strip_unc(p: &Path) -> PathBuf {
    let s = p.to_string_lossy();
    if let Some(stripped) = s.strip_prefix(r"\\?\") {
        PathBuf::from(stripped)
    } else {
        p.to_path_buf()
    }
}

fn find_dsh_runner(jingyun_dir: &Path, vendor_dir: &Path) -> Option<(PathBuf, PathBuf)> {
    // 1. 优先在打包目录中查找 scripts/run_dsh.js
    let prod_script = jingyun_dir.join("scripts").join("run_dsh.js");
    if prod_script.exists() {
        return Some((prod_script, jingyun_dir.to_path_buf()));
    }

    // 2. 本地开发环境回退查找
    let candidates = [
        std::env::current_dir().unwrap_or_default().join("scripts").join("run_dsh.js"),
        vendor_dir.join("..").join("..").join("scripts").join("run_dsh.js"),
        vendor_dir.join("..").join("..").join("..").join("scripts").join("run_dsh.js"),
    ];

    for c in &candidates {
        if c.exists() {
            if let Ok(canon) = c.canonicalize() {
                let working_dir = canon.parent().and_then(|p| p.parent()).map(|p| p.to_path_buf())
                    .unwrap_or_else(|| std::env::current_dir().unwrap_or_default());
                return Some((canon, working_dir));
            }
            return Some((c.clone(), std::env::current_dir().unwrap_or_default()));
        }
    }

    None
}

fn launch_dsh_backend(vendor_dir: &Path, jingyun_dir: &Path, dsh_home: &Path, is_portable: bool) {
    let vendor_dir = strip_unc(vendor_dir);
    let jingyun_dir = strip_unc(jingyun_dir);
    let dsh_home = strip_unc(dsh_home);

    #[cfg(target_os = "windows")]
    let node_exe = vendor_dir.join("node").join("node.exe");

    #[cfg(not(target_os = "windows"))]
    let node_exe = {
        let unix_node = vendor_dir.join("node").join("bin").join("node");
        if unix_node.exists() {
            unix_node
        } else {
            vendor_dir.join("node").join("node")
        }
    };

    let runner = find_dsh_runner(&jingyun_dir, &vendor_dir);

    if node_exe.exists() && runner.is_some() {
        let (runner_script, working_dir) = runner.unwrap();
        println!(
            "[Tauri] Spawning Unified DSH Runner: {} {} (cwd: {})",
            node_exe.display(),
            runner_script.display(),
            working_dir.display()
        );

        let mut cmd = std::process::Command::new(&node_exe);
        cmd.arg(&runner_script);
        cmd.arg("--tauri");
        cmd.arg("--no-open");
        cmd.current_dir(&working_dir);

        cmd.env("DSH_HOME", dsh_home.to_string_lossy().as_ref());
        cmd.env("DSH_PORTABLE", if is_portable { "1" } else { "0" });

        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }

        let log_path = dsh_home.join("dsh_sidecar.log");
        if let Ok(log_file) = std::fs::File::create(&log_path) {
            if let Ok(err_file) = log_file.try_clone() {
                cmd.stdout(log_file);
                cmd.stderr(err_file);
            }
        }

        match cmd.spawn() {
            Ok(child) => {
                println!(
                    "[Tauri] DSH Sidecar process spawned successfully! PID: {}",
                    child.id()
                );
                #[cfg(target_os = "windows")]
                {
                    use std::os::windows::io::AsRawHandle;
                    win_job::assign_process_to_kill_on_close_job(child.as_raw_handle());
                }
            }
            Err(e) => eprintln!("[Tauri] Failed to spawn DSH Sidecar: {}", e),
        }
    } else {
        eprintln!(
            "[Tauri] Sidecar target missing. Node ({:?}): {:?}, Runner ({:?}): {:?}",
            node_exe,
            node_exe.exists(),
            runner,
            runner.is_some()
        );
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
                    println!(
                        "[Tauri] Successfully assigned Sidecar process to KillOnClose Job Object"
                    );
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

#[cfg(windows)]
fn apply_tenant_icon(app: &tauri::App) -> Option<tauri::image::Image<'static>> {
    use std::os::windows::ffi::OsStrExt;
    let exe_path = std::env::current_exe().ok()?;

    // 1. 发送 Win32 原生 WM_SETICON 消息给窗口句柄，立即刷新 Windows 任务栏大图标与小图标
    if let Some(main_win) = app.get_webview_window("main") {
        if let Ok(hwnd) = main_win.hwnd() {
            let mut wide_path: Vec<u16> = exe_path.as_os_str().encode_wide().collect();
            wide_path.push(0);
            let mut large = std::ptr::null_mut();
            let mut small = std::ptr::null_mut();
            unsafe {
                use windows_sys::Win32::UI::Shell::ExtractIconExW;
                use windows_sys::Win32::UI::WindowsAndMessaging::*;
                if ExtractIconExW(wide_path.as_ptr(), 0, &mut large, &mut small, 1) > 0 {
                    if !large.is_null() {
                        SendMessageW(hwnd.0 as _, WM_SETICON, ICON_BIG as _, large as _);
                    }
                    if !small.is_null() {
                        SendMessageW(hwnd.0 as _, WM_SETICON, ICON_SMALL as _, small as _);
                    }
                }
            }
        }
    }

    // 2. 利用 pelite + ico crate 直接从内存把 exe 图标解码为 RGBA 供给托盘
    let bytes = std::fs::read(&exe_path).ok()?;
    let pe = pelite::PeFile::from_bytes(&bytes).ok()?;
    let mut ico_buf = Vec::new();
    let has_icon = match pe {
        pelite::Wrap::T32(p) => {
            use pelite::pe32::Pe;
            p.resources()
                .ok()?
                .icons()
                .next()?
                .ok()?
                .1
                .write(&mut ico_buf)
                .is_ok()
        }
        pelite::Wrap::T64(p) => {
            use pelite::pe64::Pe;
            p.resources()
                .ok()?
                .icons()
                .next()?
                .ok()?
                .1
                .write(&mut ico_buf)
                .is_ok()
        }
    };
    if !has_icon || ico_buf.is_empty() {
        return None;
    }

    let dir = ico::IconDir::read(std::io::Cursor::new(&ico_buf)).ok()?;
    let entry = dir
        .entries()
        .iter()
        .filter(|e| e.width() <= 64 && e.height() <= 64)
        .max_by_key(|e| e.width() * e.height())
        .or_else(|| dir.entries().first())?;

    let decoded = entry.decode().ok()?;
    Some(tauri::image::Image::new_owned(
        decoded.rgba_data().to_vec(),
        decoded.width(),
        decoded.height(),
    ))
}

fn load_tenant_name(dsh_home: &Path) -> String {
    // 1. 优先读取 EXE 同级目录下的 desktop-config.json
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let p = exe_dir.join("desktop-config.json");
            if let Ok(c) = std::fs::read_to_string(&p) {
                if let Ok(v) = serde_json::from_str::<serde_json::Value>(&c) {
                    if let Some(n) = v.get("custom_name").and_then(|v| v.as_str()) {
                        if !n.trim().is_empty() {
                            return n.trim().to_string();
                        }
                    }
                }
            }
        }
    }

    // 2. 读取 dsh_home 下的 desktop-config.json
    let p = dsh_home.join("desktop-config.json");
    if let Ok(c) = std::fs::read_to_string(&p) {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&c) {
            if let Some(n) = v.get("custom_name").and_then(|v| v.as_str()) {
                if !n.trim().is_empty() {
                    return n.trim().to_string();
                }
            }
        }
    }

    // 3. 从 EXE 的 PE 版本信息中读取被 rcedit 修改后的 ProductName / FileDescription
    #[cfg(windows)]
    {
        if let Ok(exe_path) = std::env::current_exe() {
            if let Ok(bytes) = std::fs::read(&exe_path) {
                if let Ok(pe_file) = pelite::PeFile::from_bytes(&bytes) {
                    let version_info = match pe_file {
                        pelite::Wrap::T32(pe) => {
                            use pelite::pe32::Pe;
                            pe.resources().ok().and_then(|r| r.version_info().ok())
                        }
                        pelite::Wrap::T64(pe) => {
                            use pelite::pe64::Pe;
                            pe.resources().ok().and_then(|r| r.version_info().ok())
                        }
                    };
                    if let Some(vi) = version_info {
                        for (_lang, table) in &vi.file_info().strings {
                            if let Some(prod) = table.get("ProductName") {
                                let s = prod.trim();
                                if !s.is_empty()
                                    && s != "Jingyun.Studio"
                                    && s != "jingyun-dsh-client"
                                {
                                    return s.to_string();
                                }
                            }
                            if let Some(desc) = table.get("FileDescription") {
                                let s = desc.trim();
                                if !s.is_empty()
                                    && s != "Jingyun.Studio"
                                    && s != "jingyun-dsh-client"
                                {
                                    return s.to_string();
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    String::new()
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            app_start_drag,
            app_minimize,
            app_toggle_maximize,
            app_close
        ])
        .setup(|app| {
            #[cfg(windows)]
            let tenant_icon = apply_tenant_icon(app);
            #[cfg(not(windows))]
            let tenant_icon: Option<tauri::image::Image<'static>> = None;

            // 解析租户定制名称
            let (dsh_home, _) = resolve_dsh_home(app);
            let tenant_name = load_tenant_name(&dsh_home);

            // Build Native Windows System Tray Icon & Context Menu
            let tray_icon = tenant_icon.or_else(|| app.default_window_icon().cloned());
            if let Some(icon) = tray_icon {
                let tray_tooltip = if !tenant_name.is_empty() {
                    tenant_name.clone()
                } else {
                    "AI Studio".to_string()
                };
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
            if let Some(main_win) = app.get_webview_window("main") {
                if !tenant_name.is_empty() {
                    let _ = main_win.set_title(&tenant_name);
                }
                let _ = main_win.show();
            }

            let (dsh_home, is_portable) = resolve_dsh_home(app);
            let _ = std::fs::create_dir_all(&dsh_home);
            println!(
                "[Tauri] DSH_HOME: {} (Portable: {})",
                dsh_home.display(),
                is_portable
            );
            let resource_dir = app.path().resource_dir().unwrap_or_default();

            std::thread::spawn(move || {
                let res_vendor = resource_dir.join("resources").join("vendor");
                let vendor_dir = if res_vendor.exists() {
                    res_vendor
                } else {
                    resource_dir.join("vendor")
                };
                let jingyun_dir = vendor_dir.join("jingyun");

                launch_dsh_backend(&vendor_dir, &jingyun_dir, &dsh_home, is_portable);
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
