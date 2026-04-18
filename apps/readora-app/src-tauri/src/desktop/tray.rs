use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    App, Manager, Runtime,
};

use crate::desktop::window::focus_main_window;

pub fn setup_tray<R: Runtime>(app: &mut App<R>) -> tauri::Result<()> {
    let show_item = MenuItem::with_id(app, "show", "显示", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

    TrayIconBuilder::new()
        .icon(Image::from_bytes(include_bytes!("../../icons/icon.png"))?)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => focus_main_window(&app.app_handle()),
            "quit" => app.exit(0),
            _ => log::debug!("menu item {:?} not handled", event.id),
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::DoubleClick { .. } = event {
                focus_main_window(&tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}
