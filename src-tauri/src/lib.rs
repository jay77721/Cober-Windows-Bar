use serde::Serialize;
use serde_json::{json, Value};
use sysinfo::{Networks, System};
use tauri::PhysicalPosition;

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
    tray: false,
    always_on_top: false,
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
fn get_overlay_policy() -> OverlayPolicy {
  let foreground_fullscreen = foreground_window_is_fullscreen();

  OverlayPolicy {
    foreground_fullscreen,
    should_float: !foreground_fullscreen,
  }
}

#[tauri::command]
fn set_status_window_floating(window: tauri::WebviewWindow, floating: bool) -> Result<(), String> {
  apply_status_window_tool_style(&window)?;

  if floating {
    #[cfg(not(windows))]
    window.show().map_err(|error| error.to_string())?;

    #[cfg(not(windows))]
    window.set_always_on_top(true).map_err(|error| error.to_string())?;

    set_status_window_z_order(&window, true)?;
  } else {
    set_status_window_z_order(&window, false)?;

    #[cfg(not(windows))]
    window.set_always_on_top(false).map_err(|error| error.to_string())?;

    #[cfg(not(windows))]
    window.hide().map_err(|error| error.to_string())?;
  }

  Ok(())
}

#[tauri::command]
fn correct_status_window_position(
  window: tauri::WebviewWindow,
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
fn start_window_drag(window: tauri::WebviewWindow) -> Result<(), String> {
  window.start_dragging().map_err(|error| error.to_string())
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
fn apply_status_window_tool_style(window: &tauri::WebviewWindow) -> Result<(), String> {
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
fn apply_status_window_tool_style(_window: &tauri::WebviewWindow) -> Result<(), String> {
  Ok(())
}

#[cfg(windows)]
fn set_status_window_z_order(window: &tauri::WebviewWindow, floating: bool) -> Result<(), String> {
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
fn set_status_window_z_order(
  _window: &tauri::WebviewWindow,
  _floating: bool,
) -> Result<(), String> {
  Ok(())
}

#[cfg(windows)]
fn status_window_hwnd(window: &tauri::WebviewWindow) -> Result<HWND, String> {
  window
    .hwnd()
    .map(|hwnd| hwnd.0 as HWND)
    .map_err(|error| error.to_string())
}

#[cfg(not(windows))]
fn foreground_window_is_fullscreen() -> bool {
  false
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      get_hub_event_fixtures,
      get_runtime_capabilities,
      get_system_performance,
      get_overlay_policy,
      set_status_window_floating,
      correct_status_window_position,
      start_window_drag
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
