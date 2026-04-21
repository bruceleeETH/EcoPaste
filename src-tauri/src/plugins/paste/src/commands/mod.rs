use serde::Serialize;

#[cfg(target_os = "macos")]
mod macos;

#[cfg(target_os = "windows")]
mod windows;

#[cfg(target_os = "linux")]
mod linux;

#[cfg(target_os = "macos")]
pub use macos::*;

#[cfg(target_os = "windows")]
pub use windows::*;

#[cfg(target_os = "linux")]
pub use linux::*;

#[derive(Clone, Serialize)]
pub struct ActiveApplication {
    pub name: Option<String>,
    pub path: Option<String>,
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
pub async fn get_active_application() -> Option<ActiveApplication> {
    None
}

#[cfg(not(target_os = "macos"))]
pub fn wait(millis: u64) {
    use std::{thread, time};

    thread::sleep(time::Duration::from_millis(millis));
}
