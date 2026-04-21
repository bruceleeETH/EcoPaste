const COMMANDS: &[&str] = &["paste", "get_active_application"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
