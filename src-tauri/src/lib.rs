use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use sysinfo::{Networks, System};
use tauri::menu::{CheckMenuItemBuilder, Menu, MenuBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager, PhysicalPosition, Position, WebviewWindow, WindowEvent};
#[cfg(not(any(target_os = "android", target_os = "ios")))]
use tauri_plugin_global_shortcut::ShortcutState;

#[cfg(windows)]
use windows_sys::Win32::{
  Foundation::{HWND, RECT},
  Graphics::Gdi::{GetMonitorInfoW, MonitorFromWindow, MONITORINFO, MONITOR_DEFAULTTONEAREST},
  UI::WindowsAndMessaging::{
    GetClassNameW, GetDesktopWindow, GetForegroundWindow, GetShellWindow, GetWindowLongW,
    GetWindowRect, GetWindowThreadProcessId, IsWindowVisible, SetWindowLongW, SetWindowPos,
    GWL_EXSTYLE, HWND_BOTTOM, HWND_TOPMOST, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE,
    SWP_SHOWWINDOW, WS_EX_APPWINDOW, WS_EX_TOOLWINDOW,
  },
};

const STATUS_WINDOW_EDGE_MARGIN: i32 = 8;
const STATUS_WINDOW_LABEL: &str = "main";
const STATUS_CENTER_MENU_ACTION_EVENT: &str = "status-center://menu-action";
const STATUS_CENTER_SETTINGS_EVENT: &str = "status-center://settings";
const STATUS_CENTER_OPEN_SETTINGS_EVENT: &str = "status-center://open-settings";
const TRAY_ID: &str = "status-center-tray";
const PREFERENCES_FILE_NAME: &str = "status-center-preferences.json";
const MENU_REFRESH_DATA: &str = "refresh-data";
const MENU_ALWAYS_FLOAT: &str = "always-float";
const MENU_AVOID_FULLSCREEN: &str = "avoid-fullscreen";
const MENU_LOCK_POSITION: &str = "lock-position";
const MENU_RESET_POSITION: &str = "reset-position";
const MENU_OPEN_SETTINGS: &str = "open-settings";
const MENU_QUIT: &str = "quit";
const TRAY_MENU_SHOW_STATUS_CENTER: &str = "tray-show-status-center";
const TRAY_MENU_OPEN_SETTINGS: &str = "tray-open-settings";
const GLOBAL_SHORTCUT_RECALL: &str = "Alt+Shift+Space";

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopStatusPreferences {
  always_float: bool,
  avoid_fullscreen: bool,
  lock_position: bool,
}

impl Default for DesktopStatusPreferences {
  fn default() -> Self {
    Self {
      always_float: true,
      avoid_fullscreen: true,
      lock_position: false,
    }
  }
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct StatusCenterSettingsPayload {
  preferences: DesktopStatusPreferences,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct StatusCenterOpenSettingsPayload {
  source: &'static str,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct StatusCenterMenuActionPayload {
  action: &'static str,
  checked: Option<bool>,
}

struct StatusCenterMenuItems<R: tauri::Runtime> {
  menu: Menu<R>,
  always_float: tauri::menu::CheckMenuItem<R>,
  avoid_fullscreen: tauri::menu::CheckMenuItem<R>,
  lock_position: tauri::menu::CheckMenuItem<R>,
}

struct DesktopProductState<R: tauri::Runtime> {
  preferences: DesktopStatusPreferences,
  menu_items: Option<StatusCenterMenuItems<R>>,
}

impl<R: tauri::Runtime> Default for DesktopProductState<R> {
  fn default() -> Self {
    Self {
      preferences: DesktopStatusPreferences::default(),
      menu_items: None,
    }
  }
}

type SharedDesktopProductState<R> = Arc<Mutex<DesktopProductState<R>>>;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct HubEventFixture {
  id: String,
  #[serde(rename = "type")]
  event_type: String,
  source: String,
  created_at: u64,
  progress: Option<u8>,
  payload: Value,
  metadata: Value,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeCapabilities {
  runtime: String,
  fixture_ipc: bool,
  tray: bool,
  always_on_top: bool,
  windows_providers: bool,
  configured_shell_window: ConfiguredShellWindow,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ConfiguredShellWindow {
  configured: bool,
  title: String,
  width: u16,
  height: u16,
  min_width: u16,
  min_height: u16,
  resizable: bool,
  centered: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SystemPerformanceSnapshot {
  cpu: u8,
  memory: u8,
  network: u8,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct OverlayPolicy {
  foreground_fullscreen: bool,
  should_float: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WindowPositionCorrection {
  corrected: bool,
  x: i32,
  y: i32,
}

#[tauri::command]
fn get_hub_event_fixtures() -> Vec<HubEventFixture> {
  vec![HubEventFixture {
    id: "tauri-fixture-ai-1780743600000".into(),
    event_type: "ai".into(),
    source: "mock".into(),
    created_at: 1_780_743_600_000,
    progress: Some(64),
    payload: json!({
      "id": "tauri-fixture-ai-task",
      "type": "ai",
      "title": "Tauri IPC fixture",
      "subtitle": "Boundary smoke event from native fixture command",
      "progress": 64,
      "accent": "blue"
    }),
    metadata: json!({
      "runtime": "tauri",
      "fixture": true,
      "version": "0.7.0"
    }),
  }]
}

#[tauri::command]
fn get_runtime_capabilities() -> RuntimeCapabilities {
  RuntimeCapabilities {
    runtime: "tauri".into(),
    fixture_ipc: true,
    tray: true,
    always_on_top: true,
    windows_providers: true,
    configured_shell_window: ConfiguredShellWindow {
      configured: true,
      title: "Cober Windows Bar".into(),
      width: 350,
      height: 70,
      min_width: 350,
      min_height: 70,
      resizable: false,
      centered: true,
    },
  }
}

#[tauri::command]
fn get_system_performance() -> SystemPerformanceSnapshot {
  let mut system = System::new_all();

  system.refresh_cpu();
  std::thread::sleep(sysinfo::MINIMUM_CPU_UPDATE_INTERVAL);
  system.refresh_cpu();
  system.refresh_memory();

  let cpu = clamp_percent(system.global_cpu_info().cpu_usage() as f64);
  let memory = if system.total_memory() == 0 {
    0
  } else {
    clamp_percent((system.used_memory() as f64 / system.total_memory() as f64) * 100.0)
  };
  let network = sample_network_percent();

  SystemPerformanceSnapshot { cpu, memory, network }
}

#[tauri::command]
fn get_overlay_policy(state: tauri::State<'_, SharedDesktopProductState<tauri::Wry>>) -> OverlayPolicy {
  let foreground_fullscreen = foreground_window_is_fullscreen();
  let avoid_fullscreen = state
    .lock()
    .map(|state| state.preferences.avoid_fullscreen)
    .unwrap_or(true);
  let should_float = if avoid_fullscreen {
    !foreground_fullscreen
  } else {
    true
  };

  OverlayPolicy {
    foreground_fullscreen,
    should_float,
  }
}

#[tauri::command]
fn set_status_window_floating(window: WebviewWindow, floating: bool) -> Result<(), String> {
  apply_status_window_tool_style(&window)?;

  if floating {
    #[cfg(not(windows))]
    window.show().map_err(|error| error.to_string())?;

    #[cfg(not(windows))]
    window
      .set_always_on_top(true)
      .map_err(|error| error.to_string())?;

    set_status_window_z_order(&window, true)?;
  } else {
    set_status_window_z_order(&window, false)?;

    #[cfg(not(windows))]
    window
      .set_always_on_top(false)
      .map_err(|error| error.to_string())?;

    #[cfg(not(windows))]
    window.hide().map_err(|error| error.to_string())?;
  }

  Ok(())
}

#[tauri::command]
fn correct_status_window_position(window: WebviewWindow) -> Result<WindowPositionCorrection, String> {
  correct_status_window_position_for_window(&window)
}

fn correct_status_window_position_for_window<R: tauri::Runtime>(
  window: &WebviewWindow<R>,
) -> Result<WindowPositionCorrection, String> {
  let position = window.outer_position().map_err(|error| error.to_string())?;
  let size = window.outer_size().map_err(|error| error.to_string())?;
  let monitors = window.available_monitors().map_err(|error| error.to_string())?;
  let width = size.width.min(i32::MAX as u32) as i32;
  let height = size.height.min(i32::MAX as u32) as i32;
  let (x, y) = corrected_window_position(position.x, position.y, width, height, &monitors);
  let corrected = x != position.x || y != position.y;

  if corrected {
    window
      .set_position(PhysicalPosition::new(x, y))
      .map_err(|error| error.to_string())?;
  }

  Ok(WindowPositionCorrection { corrected, x, y })
}

#[tauri::command]
fn start_window_drag(window: WebviewWindow) -> Result<(), String> {
  window.start_dragging().map_err(|error| error.to_string())
}

#[tauri::command]
fn show_status_center_context_menu(
  app: tauri::AppHandle,
  x: f64,
  y: f64,
) -> Result<(), String> {
  let window = app
    .get_webview_window(STATUS_WINDOW_LABEL)
    .ok_or_else(|| "status center window not found".to_string())?;
  let state = app.state::<SharedDesktopProductState<tauri::Wry>>();
  let state = state
    .lock()
    .map_err(|_| "status center state lock poisoned".to_string())?;
  let menu = state
    .menu_items
    .as_ref()
    .ok_or_else(|| "status center menu not initialized".to_string())?;

  window
    .popup_menu_at(
      &menu.menu,
      Position::Physical(PhysicalPosition::new(x as i32, y as i32)),
    )
    .map_err(|error| error.to_string())
}

#[tauri::command]
fn get_status_center_settings(
  state: tauri::State<'_, SharedDesktopProductState<tauri::Wry>>,
) -> Result<StatusCenterSettingsPayload, String> {
  let preferences = state
    .lock()
    .map_err(|_| "status center state lock poisoned".to_string())?
    .preferences
    .clone();

  Ok(StatusCenterSettingsPayload { preferences })
}

#[tauri::command]
fn set_status_center_preferences(
  app: tauri::AppHandle,
  state: tauri::State<'_, SharedDesktopProductState<tauri::Wry>>,
  preferences: DesktopStatusPreferences,
) -> Result<StatusCenterSettingsPayload, String> {
  {
    let mut state = state
      .lock()
      .map_err(|_| "status center state lock poisoned".to_string())?;

    state.preferences = preferences.clone();
    if let Some(menu_items) = &state.menu_items {
      apply_preference_menu_state(menu_items, &state.preferences);
    }
  }

  persist_status_center_preferences(&app, &preferences)?;
  emit_status_center_settings(&app, &preferences);

  Ok(StatusCenterSettingsPayload { preferences })
}

#[tauri::command]
fn show_status_center_window(app: tauri::AppHandle) -> Result<(), String> {
  toggle_status_center_window(&app);
  Ok(())
}

#[tauri::command]
fn open_status_center_settings(app: tauri::AppHandle) -> Result<(), String> {
  request_open_settings(&app, "invoke");
  Ok(())
}

fn sample_network_percent() -> u8 {
  let mut networks = Networks::new_with_refreshed_list();
  std::thread::sleep(std::time::Duration::from_millis(750));
  networks.refresh();

  let total_bytes: u64 = networks
    .values()
    .map(|data| data.received() + data.transmitted())
    .sum();

  clamp_percent((total_bytes as f64 / 1_250_000.0) * 100.0)
}

fn clamp_percent(value: f64) -> u8 {
  if !value.is_finite() {
    return 0;
  }

  value.round().clamp(0.0, 100.0) as u8
}

fn corrected_window_position(
  left: i32,
  top: i32,
  width: i32,
  height: i32,
  monitors: &[tauri::window::Monitor],
) -> (i32, i32) {
  let mut best: Option<(i32, i32, i64)> = None;

  for monitor in monitors {
    let work_area = monitor.work_area();
    let area_left = work_area.position.x + STATUS_WINDOW_EDGE_MARGIN;
    let area_top = work_area.position.y + STATUS_WINDOW_EDGE_MARGIN;
    let area_width = work_area.size.width.min(i32::MAX as u32) as i32;
    let area_height = work_area.size.height.min(i32::MAX as u32) as i32;
    let candidate_x = clamp_window_axis(left, width, area_left, area_width);
    let candidate_y = clamp_window_axis(top, height, area_top, area_height);

    if candidate_x == left && candidate_y == top {
      return (left, top);
    }

    let cost = i64::from((candidate_x - left).abs()) + i64::from((candidate_y - top).abs());
    if best.map_or(true, |(_, _, best_cost)| cost < best_cost) {
      best = Some((candidate_x, candidate_y, cost));
    }
  }

  best.map(|(x, y, _)| (x, y)).unwrap_or((left, top))
}

fn clamp_window_axis(position: i32, window_size: i32, area_start: i32, area_size: i32) -> i32 {
  let max_position = area_start + area_size - window_size - STATUS_WINDOW_EDGE_MARGIN;

  if max_position <= area_start {
    return area_start;
  }

  position.clamp(area_start, max_position)
}

#[cfg(windows)]
fn foreground_window_is_fullscreen() -> bool {
  const EDGE_TOLERANCE: i32 = 2;

  unsafe {
    let hwnd = GetForegroundWindow();
    if hwnd.is_null() || IsWindowVisible(hwnd) == 0 {
      return false;
    }

    if hwnd == GetDesktopWindow() || hwnd == GetShellWindow() {
      return false;
    }

    let mut class_name = [0u16; 256];
    let class_len = GetClassNameW(hwnd, class_name.as_mut_ptr(), class_name.len() as i32);
    if class_len > 0 {
      let class_name = String::from_utf16_lossy(&class_name[..class_len as usize]);
      if class_name == "WorkerW" || class_name == "Progman" {
        return false;
      }
    }

    let mut foreground_pid = 0u32;
    GetWindowThreadProcessId(hwnd, &mut foreground_pid);
    if foreground_pid == std::process::id() {
      return false;
    }

    let mut window_rect = RECT {
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
    };
    if GetWindowRect(hwnd, &mut window_rect) == 0 {
      return false;
    }

    let monitor = MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST);
    if monitor.is_null() {
      return false;
    }

    let mut monitor_info = MONITORINFO {
      cbSize: std::mem::size_of::<MONITORINFO>() as u32,
      rcMonitor: RECT {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
      },
      rcWork: RECT {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
      },
      dwFlags: 0,
    };

    if GetMonitorInfoW(monitor, &mut monitor_info) == 0 {
      return false;
    }

    window_rect.left <= monitor_info.rcMonitor.left + EDGE_TOLERANCE
      && window_rect.top <= monitor_info.rcMonitor.top + EDGE_TOLERANCE
      && window_rect.right >= monitor_info.rcMonitor.right - EDGE_TOLERANCE
      && window_rect.bottom >= monitor_info.rcMonitor.bottom - EDGE_TOLERANCE
  }
}

#[cfg(windows)]
fn apply_status_window_tool_style(window: &WebviewWindow) -> Result<(), String> {
  let hwnd = status_window_hwnd(window)?;

  unsafe {
    let ex_style = GetWindowLongW(hwnd, GWL_EXSTYLE) as u32;
    let next_style = (ex_style | WS_EX_TOOLWINDOW) & !WS_EX_APPWINDOW;

    if next_style != ex_style {
      SetWindowLongW(hwnd, GWL_EXSTYLE, next_style as i32);
      SetWindowPos(
        hwnd,
        std::ptr::null_mut(),
        0,
        0,
        0,
        0,
        SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE,
      );
    }
  }

  Ok(())
}

#[cfg(not(windows))]
fn apply_status_window_tool_style(_window: &WebviewWindow) -> Result<(), String> {
  Ok(())
}

#[cfg(windows)]
fn set_status_window_z_order(window: &WebviewWindow, floating: bool) -> Result<(), String> {
  let hwnd = status_window_hwnd(window)?;
  let insert_after = if floating { HWND_TOPMOST } else { HWND_BOTTOM };
  let visibility_flag = if floating { SWP_SHOWWINDOW } else { Default::default() };

  unsafe {
    if SetWindowPos(
      hwnd,
      insert_after,
      0,
      0,
      0,
      0,
      SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | visibility_flag,
    ) == 0
    {
      return Err("failed to update status window z-order".into());
    }
  }

  Ok(())
}

#[cfg(not(windows))]
fn set_status_window_z_order(_window: &WebviewWindow, _floating: bool) -> Result<(), String> {
  Ok(())
}

#[cfg(windows)]
fn status_window_hwnd(window: &WebviewWindow) -> Result<HWND, String> {
  window
    .hwnd()
    .map(|hwnd| hwnd.0 as HWND)
    .map_err(|error| error.to_string())
}

#[cfg(not(windows))]
fn foreground_window_is_fullscreen() -> bool {
  false
}

fn create_status_center_menu<R: tauri::Runtime>(
  app: &tauri::AppHandle<R>,
  preferences: &DesktopStatusPreferences,
) -> Result<StatusCenterMenuItems<R>, tauri::Error> {
  let always_float =
    CheckMenuItemBuilder::with_id(MENU_ALWAYS_FLOAT, "\u{603B}\u{662F}\u{60AC}\u{6D6E}")
    .checked(preferences.always_float)
    .build(app)?;
  let avoid_fullscreen =
    CheckMenuItemBuilder::with_id(
      MENU_AVOID_FULLSCREEN,
      "\u{5168}\u{5C4F}\u{65F6}\u{907F}\u{8BA9}",
    )
      .checked(preferences.avoid_fullscreen)
      .build(app)?;
  let lock_position =
    CheckMenuItemBuilder::with_id(MENU_LOCK_POSITION, "\u{9501}\u{5B9A}\u{4F4D}\u{7F6E}")
      .checked(preferences.lock_position)
      .build(app)?;

  let menu = MenuBuilder::new(app)
    .text(
      MENU_REFRESH_DATA,
      "\u{5237}\u{65B0}\u{6570}\u{636E}",
    )
    .item(&always_float)
    .item(&avoid_fullscreen)
    .item(&lock_position)
    .separator()
    .text(
      MENU_RESET_POSITION,
      "\u{91CD}\u{7F6E}\u{4F4D}\u{7F6E}",
    )
    .text(
      MENU_OPEN_SETTINGS,
      "\u{6253}\u{5F00}\u{8BBE}\u{7F6E}",
    )
    .separator()
    .text(MENU_QUIT, "\u{9000}\u{51FA}")
    .build()?;

  Ok(StatusCenterMenuItems {
    menu,
    always_float,
    avoid_fullscreen,
    lock_position,
  })
}

fn create_tray_menu<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> Result<Menu<R>, tauri::Error> {
  MenuBuilder::new(app)
    .text(
      TRAY_MENU_SHOW_STATUS_CENTER,
      "\u{663E}\u{793A}\u{0020}/\u{0020}\u{53EC}\u{56DE}\u{72B6}\u{6001}\u{4E2D}\u{5FC3}",
    )
    .text(
      TRAY_MENU_OPEN_SETTINGS,
      "\u{6253}\u{5F00}\u{8BBE}\u{7F6E}",
    )
    .separator()
    .text(MENU_QUIT, "\u{9000}\u{51FA}")
    .build()
}

fn emit_status_center_settings<R: tauri::Runtime>(
  app: &tauri::AppHandle<R>,
  preferences: &DesktopStatusPreferences,
) {
  let _ = app.emit_to(
    STATUS_WINDOW_LABEL,
    STATUS_CENTER_SETTINGS_EVENT,
    StatusCenterSettingsPayload {
      preferences: preferences.clone(),
    },
  );
}

fn emit_open_settings_requested<R: tauri::Runtime>(app: &tauri::AppHandle<R>, source: &'static str) {
  let _ = app.emit_to(
    STATUS_WINDOW_LABEL,
    STATUS_CENTER_OPEN_SETTINGS_EVENT,
    StatusCenterOpenSettingsPayload { source },
  );
}

fn emit_status_center_action<R: tauri::Runtime>(
  app: &tauri::AppHandle<R>,
  action: &'static str,
  checked: Option<bool>,
) {
  let _ = app.emit_to(
    STATUS_WINDOW_LABEL,
    STATUS_CENTER_MENU_ACTION_EVENT,
    StatusCenterMenuActionPayload { action, checked },
  );
}

fn status_center_preferences_path<R: tauri::Runtime>(
  app: &tauri::AppHandle<R>,
) -> Result<PathBuf, String> {
  let mut path = app
    .path()
    .app_config_dir()
    .map_err(|error| format!("failed to resolve app config dir: {error}"))?;
  path.push(PREFERENCES_FILE_NAME);
  Ok(path)
}

fn load_status_center_preferences<R: tauri::Runtime>(
  app: &tauri::AppHandle<R>,
) -> DesktopStatusPreferences {
  let Ok(path) = status_center_preferences_path(app) else {
    return DesktopStatusPreferences::default();
  };

  let Ok(contents) = fs::read_to_string(path) else {
    return DesktopStatusPreferences::default();
  };

  serde_json::from_str::<DesktopStatusPreferences>(&contents).unwrap_or_default()
}

fn persist_status_center_preferences<R: tauri::Runtime>(
  app: &tauri::AppHandle<R>,
  preferences: &DesktopStatusPreferences,
) -> Result<(), String> {
  let path = status_center_preferences_path(app)?;
  let parent = path
    .parent()
    .ok_or_else(|| "preferences path missing parent directory".to_string())?;
  fs::create_dir_all(parent).map_err(|error| {
    format!(
      "failed to create preferences directory {}: {error}",
      parent.display()
    )
  })?;

  let payload = serde_json::to_vec_pretty(preferences)
    .map_err(|error| format!("failed to serialize preferences: {error}"))?;
  fs::write(&path, payload)
    .map_err(|error| format!("failed to write preferences {}: {error}", path.display()))
}

fn apply_preference_menu_state<R: tauri::Runtime>(
  menu_items: &StatusCenterMenuItems<R>,
  preferences: &DesktopStatusPreferences,
) {
  let _ = menu_items.always_float.set_checked(preferences.always_float);
  let _ = menu_items
    .avoid_fullscreen
    .set_checked(preferences.avoid_fullscreen);
  let _ = menu_items.lock_position.set_checked(preferences.lock_position);
}

fn request_open_settings<R: tauri::Runtime>(app: &tauri::AppHandle<R>, source: &'static str) {
  reveal_status_center_window(app);
  emit_open_settings_requested(app, source);
  emit_status_center_action(app, "open-settings", None);
}

fn handle_status_center_menu_event<R: tauri::Runtime>(
  app: &tauri::AppHandle<R>,
  state: &SharedDesktopProductState<R>,
  id: &str,
) {
  let Ok(mut state) = state.lock() else {
    return;
  };
  let mut preferences_changed = false;

  match id {
    TRAY_MENU_SHOW_STATUS_CENTER => reveal_status_center_window(app),
    TRAY_MENU_OPEN_SETTINGS => request_open_settings(app, "tray"),
    MENU_REFRESH_DATA => emit_status_center_action(app, "refresh-data", None),
    MENU_ALWAYS_FLOAT => {
      state.preferences.always_float = !state.preferences.always_float;
      preferences_changed = true;
      if let Some(menu_items) = &state.menu_items {
        apply_preference_menu_state(menu_items, &state.preferences);
      }
      emit_status_center_settings(app, &state.preferences);
      emit_status_center_action(app, "toggle-always-float", Some(state.preferences.always_float));
    }
    MENU_AVOID_FULLSCREEN => {
      state.preferences.avoid_fullscreen = !state.preferences.avoid_fullscreen;
      preferences_changed = true;
      if let Some(menu_items) = &state.menu_items {
        apply_preference_menu_state(menu_items, &state.preferences);
      }
      emit_status_center_settings(app, &state.preferences);
      emit_status_center_action(
        app,
        "toggle-avoid-fullscreen",
        Some(state.preferences.avoid_fullscreen),
      );
    }
    MENU_LOCK_POSITION => {
      state.preferences.lock_position = !state.preferences.lock_position;
      preferences_changed = true;
      if let Some(menu_items) = &state.menu_items {
        apply_preference_menu_state(menu_items, &state.preferences);
      }
      emit_status_center_settings(app, &state.preferences);
      emit_status_center_action(app, "toggle-lock-position", Some(state.preferences.lock_position));
    }
    MENU_RESET_POSITION => emit_status_center_action(app, "reset-position", None),
    MENU_OPEN_SETTINGS => request_open_settings(app, "menu"),
    MENU_QUIT => {
      emit_status_center_action(app, "quit", None);
      app.exit(0);
    }
    _ => {}
  }

  if preferences_changed {
    let _ = persist_status_center_preferences(app, &state.preferences);
  }
}

fn reveal_status_center_window<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
  if let Some(window) = app.get_webview_window(STATUS_WINDOW_LABEL) {
    let _ = window.unminimize();
    let _ = window.show();
    let _ = correct_status_window_position_for_window(&window);
    let _ = window.set_focus();
  }
}

fn hide_status_center_window<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
  if let Some(window) = app.get_webview_window(STATUS_WINDOW_LABEL) {
    let _ = window.hide();
  }
}

fn toggle_status_center_window<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
  if let Some(window) = app.get_webview_window(STATUS_WINDOW_LABEL) {
    let is_visible = window.is_visible().unwrap_or(false);
    let is_minimized = window.is_minimized().unwrap_or(false);

    if is_visible && !is_minimized {
      let _ = window.hide();
      return;
    }
  }

  reveal_status_center_window(app);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let desktop_product_state: SharedDesktopProductState<tauri::Wry> =
    Arc::new(Mutex::new(DesktopProductState::default()));
  let setup_state = Arc::clone(&desktop_product_state);

  tauri::Builder::default()
    .manage(desktop_product_state.clone())
    .setup(move |app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      app.handle().plugin(tauri_plugin_opener::init())?;

      #[cfg(not(any(target_os = "android", target_os = "ios")))]
      app.handle().plugin(
        tauri_plugin_global_shortcut::Builder::new()
          .with_shortcut(GLOBAL_SHORTCUT_RECALL)?
          .with_handler(|app, shortcut, event| {
            if event.state == ShortcutState::Pressed
              && shortcut.to_string().eq_ignore_ascii_case(GLOBAL_SHORTCUT_RECALL)
            {
              reveal_status_center_window(app);
            }
          })
          .build(),
      )?;

      let preferences = load_status_center_preferences(app.handle());
      let menu_items = create_status_center_menu(app.handle(), &preferences)?;
      let tray_menu = create_tray_menu(app.handle())?;

      let mut tray_builder = TrayIconBuilder::with_id(TRAY_ID)
        .menu(&tray_menu)
        .show_menu_on_left_click(false)
        .tooltip("Cober Windows Bar")
        .on_tray_icon_event(|tray, event| {
          if let TrayIconEvent::Click {
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            ..
          } = event
          {
            toggle_status_center_window(tray.app_handle());
          }
        });

      if let Some(icon) = app.default_window_icon().cloned() {
        tray_builder = tray_builder.icon(icon);
      }

      let tray = tray_builder.build(app)?;

      let _ = tray.set_show_menu_on_left_click(false);

      if let Ok(mut state) = setup_state.lock() {
        state.preferences = preferences.clone();
        state.menu_items = Some(menu_items);
      }

      if let Some(window) = app.get_webview_window(STATUS_WINDOW_LABEL) {
        let app_handle = app.handle().clone();
        window.on_window_event(move |event| {
          if let WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
            hide_status_center_window(&app_handle);
          }
        });
      }

      emit_status_center_settings(app.handle(), &preferences);

      Ok(())
    })
    .on_menu_event({
      let desktop_product_state = desktop_product_state.clone();
      move |app, event| {
        handle_status_center_menu_event(app, &desktop_product_state, event.id().as_ref());
      }
    })
    .invoke_handler(tauri::generate_handler![
      get_hub_event_fixtures,
      get_runtime_capabilities,
      get_system_performance,
      get_overlay_policy,
      set_status_window_floating,
      correct_status_window_position,
      start_window_drag,
      show_status_center_context_menu,
      get_status_center_settings,
      set_status_center_preferences,
      show_status_center_window,
      open_status_center_settings
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
