use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use sysinfo::{Networks, System};
use tauri::menu::{CheckMenuItemBuilder, Menu, MenuBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager, PhysicalPosition, Position, WebviewWindow, WindowEvent};
#[cfg(not(any(target_os = "android", target_os = "ios")))]
use tauri_plugin_global_shortcut::ShortcutState;
#[cfg(not(any(target_os = "android", target_os = "ios")))]
use tauri_plugin_autostart::MacosLauncher;

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

#[cfg(windows)]
use windows::Media::Control::{
  GlobalSystemMediaTransportControlsSessionManager,
  GlobalSystemMediaTransportControlsSessionPlaybackStatus,
};

const STATUS_WINDOW_EDGE_MARGIN: i32 = 8;
const STATUS_WINDOW_LABEL: &str = "main";
const STATUS_CENTER_HUB_EVENTS_EVENT: &str = "status-center://hub-events";
const STATUS_CENTER_MENU_ACTION_EVENT: &str = "status-center://menu-action";
const STATUS_CENTER_SETTINGS_EVENT: &str = "status-center://settings";
const STATUS_CENTER_OPEN_SETTINGS_EVENT: &str = "status-center://open-settings";
const STATUS_CENTER_CLIPBOARD_EVENT: &str = "status-center://clipboard-changed";
const STATUS_CENTER_FOCUS_ASSIST_EVENT: &str = "status-center://focus-assist-changed";
const STATUS_CENTER_NOTIFICATION_EVENT: &str = "status-center://notifications-changed";
const FOCUS_ASSIST_MONITOR_INTERVAL: Duration = Duration::from_secs(2);
const NOTIFICATION_MONITOR_INTERVAL: Duration = Duration::from_secs(5);
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
const HUB_EVENT_FIXTURE_INTERVAL: Duration = Duration::from_secs(5);
const STATUS_WINDOW_CONFIGURED_WIDTH: u16 = 315;
const STATUS_WINDOW_CONFIGURED_HEIGHT: u16 = 80;

static HUB_EVENT_FIXTURE_TICK: AtomicU64 = AtomicU64::new(0);

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

struct NetworkSample {
  total_bytes: u64,
  sampled_at: std::time::Instant,
}

struct SystemPerformanceCache {
  network_sample: Option<NetworkSample>,
}

impl Default for SystemPerformanceCache {
  fn default() -> Self {
    Self {
      network_sample: None,
    }
  }
}

struct DesktopProductState<R: tauri::Runtime> {
  preferences: DesktopStatusPreferences,
  menu_items: Option<StatusCenterMenuItems<R>>,
  perf_cache: SystemPerformanceCache,
}

impl<R: tauri::Runtime> Default for DesktopProductState<R> {
  fn default() -> Self {
    Self {
      preferences: DesktopStatusPreferences::default(),
      menu_items: None,
      perf_cache: SystemPerformanceCache::default(),
    }
  }
}

type SharedDesktopProductState<R> = Arc<Mutex<DesktopProductState<R>>>;

#[derive(Clone, Serialize)]
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

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct StatusCenterHubEventsPayload {
  events: Vec<HubEventFixture>,
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
struct GuestProviderCapability {
  kind: &'static str,
  quality: &'static str,
  code: &'static str,
  safe_to_display: bool,
  last_checked_at: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct GuestProviderCapabilitiesPayload {
  providers: Vec<GuestProviderCapability>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct MediaSessionStatus {
  available: bool,
  playback_status: &'static str,
  progress: u8,
  position_ms: Option<u64>,
  duration_ms: Option<u64>,
  code: &'static str,
  checked_at: u64,
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

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ClipboardContent {
  text: String,
  source_app: String,
  copied_at: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MediaControlResult {
  success: bool,
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

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct FocusAssistStatePayload {
  active: bool,
  profile: String,
  checked_at: u64,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct NotificationSummaryPayload {
  focus_assist_active: bool,
  checked_at: u64,
}

#[tauri::command]
fn get_hub_event_fixtures() -> Vec<HubEventFixture> {
  build_hub_event_fixtures(HUB_EVENT_FIXTURE_TICK.load(Ordering::Relaxed))
}

#[tauri::command]
fn emit_hub_event_fixtures(app: tauri::AppHandle) -> Result<usize, String> {
  let fixtures = get_hub_event_fixtures();
  let emitted = fixtures.len();
  emit_hub_events(&app, fixtures);
  Ok(emitted)
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
      width: STATUS_WINDOW_CONFIGURED_WIDTH,
      height: STATUS_WINDOW_CONFIGURED_HEIGHT,
      min_width: STATUS_WINDOW_CONFIGURED_WIDTH,
      min_height: STATUS_WINDOW_CONFIGURED_HEIGHT,
     resizable: false,
     centered: true,
    },
  }
}

#[tauri::command]
fn get_guest_provider_capabilities() -> GuestProviderCapabilitiesPayload {
  let last_checked_at = unix_time_ms();
  let media_capability = get_media_provider_capability(last_checked_at);
  let focus_capability = get_focus_provider_capability(last_checked_at);

  GuestProviderCapabilitiesPayload {
    providers: vec![
      GuestProviderCapability {
        kind: "update",
        quality: "unavailable",
        code: "not-implemented",
        safe_to_display: false,
        last_checked_at,
      },
      GuestProviderCapability {
        kind: focus_capability.kind,
        quality: focus_capability.quality,
        code: focus_capability.code,
        safe_to_display: focus_capability.safe_to_display,
        last_checked_at: focus_capability.last_checked_at,
      },
      GuestProviderCapability {
        kind: media_capability.kind,
        quality: media_capability.quality,
        code: media_capability.code,
        safe_to_display: media_capability.safe_to_display,
        last_checked_at: media_capability.last_checked_at,
      },
      GuestProviderCapability {
        kind: "download",
        quality: "unavailable",
        code: "not-implemented",
        safe_to_display: false,
        last_checked_at,
      },
      GuestProviderCapability {
        kind: "clipboard",
        quality: "native",
        code: "available",
        safe_to_display: true,
        last_checked_at,
      },
    ],
  }
}

fn get_focus_provider_capability(last_checked_at: u64) -> GuestProviderCapability {
  let state = read_focus_assist_state();
  let (quality, code) = if cfg!(windows) {
    ("native", "available")
  } else {
    ("unavailable", "unsupported")
  };

  GuestProviderCapability {
    kind: "focus",
    quality,
    code,
    safe_to_display: cfg!(windows),
    last_checked_at: state.checked_at.max(last_checked_at),
  }
}

#[tauri::command]
fn get_media_session_status() -> MediaSessionStatus {
  read_media_session_status()
}

#[tauri::command]
fn get_clipboard_content() -> Result<ClipboardContent, String> {
  let mut clipboard = arboard::Clipboard::new().map_err(|e| format!("clipboard init failed: {e}"))?;
  let text = clipboard.get_text().map_err(|e| format!("clipboard read failed: {e}"))?;
  let source_app = String::new(); // arboard does not expose source app

  Ok(ClipboardContent {
    text,
    source_app,
    copied_at: unix_time_ms(),
  })
}

#[tauri::command]
fn set_clipboard_content(text: String) -> Result<(), String> {
  let mut clipboard = arboard::Clipboard::new().map_err(|e| format!("clipboard init failed: {e}"))?;
  clipboard.set_text(&text).map_err(|e| format!("clipboard write failed: {e}"))?;
  Ok(())
}

#[cfg(windows)]
fn try_media_session_action(action: &str) -> Result<MediaControlResult, String> {
  use windows::Media::Control::{
    GlobalSystemMediaTransportControlsSessionManager,
    GlobalSystemMediaTransportControlsSessionPlaybackStatus,
  };

  let manager = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
    .map_err(|e| format!("media manager request failed: {e}"))?
    .get()
    .map_err(|e| format!("media manager get failed: {e}"))?;
  let session = manager
    .GetCurrentSession()
    .map_err(|e| format!("no active media session: {e}"))?;

  let success = match action {
    "play-pause" => {
      let playback_info = session.GetPlaybackInfo()
        .map_err(|e| format!("playback info failed: {e}"))?;
      let is_playing = playback_info.PlaybackStatus()
        .map(|s| s == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing)
        .unwrap_or(false);

      if is_playing {
        session.TryPauseAsync()
          .map_err(|e| format!("pause dispatch failed: {e}"))?
          .get()
          .map_err(|e| format!("pause failed: {e}"))?
      } else {
        session.TryPlayAsync()
          .map_err(|e| format!("play dispatch failed: {e}"))?
          .get()
          .map_err(|e| format!("play failed: {e}"))?
      }
    }
    "next" => {
      session.TrySkipNextAsync()
        .map_err(|e| format!("skip next dispatch failed: {e}"))?
        .get()
        .map_err(|e| format!("skip next failed: {e}"))?
    }
    "previous" => {
      session.TrySkipPreviousAsync()
        .map_err(|e| format!("skip previous dispatch failed: {e}"))?
        .get()
        .map_err(|e| format!("skip previous failed: {e}"))?
    }
    _ => return Err(format!("unknown media action: {action}")),
  };

  Ok(MediaControlResult { success })
}

#[cfg(not(windows))]
fn try_media_session_action(_action: &str) -> Result<MediaControlResult, String> {
  Err("media control is only supported on Windows".into())
}

#[tauri::command]
fn media_control(action: String) -> Result<MediaControlResult, String> {
  try_media_session_action(&action)
}

// ---------- Focus Assist Detection (Windows Registry) ----------

#[cfg(windows)]
fn read_focus_assist_state() -> FocusAssistStatePayload {
  use winreg::enums::{HKEY_CURRENT_USER, KEY_READ};
  use winreg::RegKey;

  let active = RegKey::predef(HKEY_CURRENT_USER)
    .open_subkey_with_flags(r"Software\Microsoft\Windows\CurrentVersion\QuietHours", KEY_READ)
    .and_then(|key| key.get_value::<u32, _>("NFPEnabled"))
    .map(|v| v == 1)
    .unwrap_or(false);

  let profile = RegKey::predef(HKEY_CURRENT_USER)
    .open_subkey_with_flags(r"Software\Microsoft\Windows\CurrentVersion\QuietHours", KEY_READ)
    .and_then(|key| key.get_value::<String, _>("Profile"))
    .unwrap_or_default();

  FocusAssistStatePayload {
    active,
    profile,
    checked_at: unix_time_ms(),
  }
}

#[cfg(not(windows))]
fn read_focus_assist_state() -> FocusAssistStatePayload {
  FocusAssistStatePayload {
    active: false,
    profile: String::new(),
    checked_at: unix_time_ms(),
  }
}

#[tauri::command]
fn get_focus_assist_state() -> FocusAssistStatePayload {
  read_focus_assist_state()
}

// ---------- Notification Summary (Windows Registry) ----------

#[cfg(windows)]
fn read_notification_summary() -> NotificationSummaryPayload {
  let focus = read_focus_assist_state();

  NotificationSummaryPayload {
    focus_assist_active: focus.active,
    checked_at: unix_time_ms(),
  }
}

#[cfg(not(windows))]
fn read_notification_summary() -> NotificationSummaryPayload {
  NotificationSummaryPayload {
    focus_assist_active: false,
    checked_at: unix_time_ms(),
  }
}

#[tauri::command]
fn get_notification_summary() -> NotificationSummaryPayload {
  read_notification_summary()
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
#[tauri::command]
fn get_autostart_enabled(
  autostart: tauri::State<'_, tauri_plugin_autostart::AutoLaunchManager>,
) -> bool {
  autostart.is_enabled().unwrap_or(false)
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
#[tauri::command]
fn set_autostart_enabled(
  autostart: tauri::State<'_, tauri_plugin_autostart::AutoLaunchManager>,
  enabled: bool,
) -> Result<(), String> {
  if enabled {
    autostart.enable().map_err(|e| format!("enable autostart failed: {e}"))?;
  } else {
    autostart.disable().map_err(|e| format!("disable autostart failed: {e}"))?;
  }
  Ok(())
}

#[tauri::command]
async fn get_system_performance(
  state: tauri::State<'_, SharedDesktopProductState<tauri::Wry>>,
) -> Result<SystemPerformanceSnapshot, String> {
  let (cpu, memory) = tauri::async_runtime::spawn_blocking(|| {
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

    (cpu, memory)
  })
  .await
  .map_err(|e| format!("spawn_blocking failed: {e}"))?;

  let network = sample_network_percent(&state);

  Ok(SystemPerformanceSnapshot { cpu, memory, network })
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

#[tauri::command]
fn quit_status_center(app: tauri::AppHandle) -> Result<(), String> {
  app.exit(0);
  Ok(())
}

/// Normalizes network throughput against a 1 Gbps reference bandwidth (~125 MB/s).
/// Uses delta-based rate calculation between invocations for accurate throughput measurement.
fn sample_network_percent(state: &SharedDesktopProductState<tauri::Wry>) -> u8 {
  let mut networks = Networks::new_with_refreshed_list();
  networks.refresh();

  let total_bytes: u64 = networks
    .values()
    .map(|data| data.received() + data.transmitted())
    .sum();
  let now = std::time::Instant::now();

  let mut percent: u8 = 0;

  if let Ok(mut guard) = state.lock() {
    let cache = &mut guard.perf_cache;

    if let Some(prev) = &cache.network_sample {
      let elapsed = now.duration_since(prev.sampled_at).as_secs_f64();

      if elapsed > 0.05 {
        let delta_bytes = total_bytes.saturating_sub(prev.total_bytes);
        let bytes_per_second = delta_bytes as f64 / elapsed;
        // Normalize against 1 Gbps (125 MB/s) reference bandwidth
        percent = clamp_percent((bytes_per_second / 125_000_000.0) * 100.0);
      }
      // else: too short interval, keep percent at 0 to avoid spikes
    }
    // else: first sample, no previous data — keep percent at 0

    cache.network_sample = Some(NetworkSample {
      total_bytes,
      sampled_at: now,
    });
  }
  // else: lock poisoned, fall back to 0

  percent
}

fn get_media_provider_capability(last_checked_at: u64) -> GuestProviderCapability {
  let status = read_media_session_status_at(last_checked_at);
  let (quality, code, safe_to_display) = match status.code {
    "available" | "not-playing" => ("native", "available", true),
    "unsupported" => ("unavailable", "unsupported", false),
    _ => ("unavailable", status.code, false),
  };

  GuestProviderCapability {
    kind: "media",
    quality,
    code,
    safe_to_display,
    last_checked_at,
  }
}

fn read_media_session_status() -> MediaSessionStatus {
  read_media_session_status_at(unix_time_ms())
}

#[cfg(windows)]
fn read_media_session_status_at(checked_at: u64) -> MediaSessionStatus {
  match read_windows_media_session_status(checked_at) {
    Ok(status) => status,
    Err(_) => MediaSessionStatus {
      available: false,
      playback_status: "unavailable",
      progress: 0,
      position_ms: None,
      duration_ms: None,
      code: "provider-failed",
      checked_at,
    },
  }
}

#[cfg(not(windows))]
fn read_media_session_status_at(checked_at: u64) -> MediaSessionStatus {
  MediaSessionStatus {
    available: false,
    playback_status: "unsupported",
    progress: 0,
    position_ms: None,
    duration_ms: None,
    code: "unsupported",
    checked_at,
  }
}

#[cfg(windows)]
fn read_windows_media_session_status(checked_at: u64) -> windows::core::Result<MediaSessionStatus> {
  let manager = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()?.get()?;
  let session = manager.GetCurrentSession()?;
  let playback_info = session.GetPlaybackInfo()?;
  let playback_status = playback_info.PlaybackStatus()?;
  let timeline = session.GetTimelineProperties()?;
  let position_ms = duration_100ns_to_ms(timeline.Position()?.Duration);
  let duration_ms = duration_100ns_to_ms(timeline.EndTime()?.Duration);
  let progress = match (position_ms, duration_ms) {
    (Some(position), Some(duration)) if duration > 0 => {
      clamp_percent((position as f64 / duration as f64) * 100.0)
    }
    _ => 0,
  };
  let playback_status_label =
    if playback_status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing {
      "playing"
    } else {
      "paused"
    };

  Ok(MediaSessionStatus {
    available: true,
    playback_status: playback_status_label,
    progress,
    position_ms,
    duration_ms,
    code: "available",
    checked_at,
  })
}

#[cfg(windows)]
fn duration_100ns_to_ms(value: i64) -> Option<u64> {
  if value <= 0 {
    return None;
  }

  Some((value as u64) / 10_000)
}

fn build_hub_event_fixtures(tick: u64) -> Vec<HubEventFixture> {
  let now_ms = unix_time_ms();
  let ai_progress = 35 + ((tick * 11) % 55) as u8;
  let download_progress = 18 + ((tick * 17) % 70) as u8;
  let cpu_hint = 24 + ((tick * 9) % 58) as u8;
  let accent = match tick % 3 {
    0 => "blue",
    1 => "violet",
    _ => "cyan",
  };

  vec![
    HubEventFixture {
      id: "tauri-fixture-ai-task".into(),
      event_type: "ai".into(),
      source: "mock".into(),
      created_at: now_ms.saturating_sub(1_500),
      progress: Some(ai_progress),
      payload: json!({
        "id": "tauri-fixture-ai-task",
        "type": "ai",
        "title": "Tauri IPC fixture",
        "subtitle": format!("Native fixture stream tick {}", tick),
        "progress": ai_progress,
        "accent": accent
      }),
      metadata: json!({
        "runtime": "tauri",
        "fixture": true,
        "streaming": true,
        "tick": tick,
        "version": "0.7.0"
      }),
    },
    HubEventFixture {
      id: "tauri-fixture-download-task".into(),
      event_type: "download".into(),
      source: "mock".into(),
      created_at: now_ms.saturating_sub(800),
      progress: Some(download_progress),
      payload: json!({
        "id": "tauri-fixture-download-task",
        "type": "download",
        "title": "Downloads queue",
        "subtitle": format!("Fixture refresh {}s cadence", HUB_EVENT_FIXTURE_INTERVAL.as_secs()),
        "progress": download_progress,
        "accent": "emerald"
      }),
      metadata: json!({
        "runtime": "tauri",
        "fixture": true,
        "streaming": true,
        "tick": tick,
        "surface": "downloads"
      }),
    },
    HubEventFixture {
      id: "tauri-fixture-notification-task".into(),
      event_type: "notification".into(),
      source: "system".into(),
      created_at: now_ms,
      progress: None,
      payload: json!({
        "id": "tauri-fixture-notification-task",
        "type": "notification",
        "title": "System pulse",
        "subtitle": format!("Synthetic native heartbeat at {}", now_ms),
        "accent": "amber"
      }),
      metadata: json!({
        "runtime": "tauri",
        "fixture": true,
        "streaming": true,
        "tick": tick,
        "cpuHint": cpu_hint
      }),
    },
  ]
}

fn unix_time_ms() -> u64 {
  SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map(|duration| duration.as_millis().min(u128::from(u64::MAX)) as u64)
    .unwrap_or(0)
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

fn emit_hub_events<R: tauri::Runtime>(app: &tauri::AppHandle<R>, events: Vec<HubEventFixture>) {
  let _ = app.emit_to(
    STATUS_WINDOW_LABEL,
    STATUS_CENTER_HUB_EVENTS_EVENT,
    StatusCenterHubEventsPayload { events },
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

      #[cfg(not(any(target_os = "android", target_os = "ios")))]
      app.handle().plugin(
        tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, Some(vec!["--minimized"])),
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

      // Start clipboard change monitor
      {
        let clipboard_app_handle = app.handle().clone();
        std::thread::spawn(move || {
          let mut last_text = String::new();
          loop {
            std::thread::sleep(Duration::from_millis(800));
            if let Ok(mut clipboard) = arboard::Clipboard::new() {
              if let Ok(text) = clipboard.get_text() {
                if text != last_text && !text.is_empty() {
                  last_text = text.clone();
                  let payload = ClipboardContent {
                    text,
                    source_app: String::new(),
                    copied_at: unix_time_ms(),
                  };
                  let _ = clipboard_app_handle.emit(STATUS_CENTER_CLIPBOARD_EVENT, &payload);
                }
              }
            }
          }
        });
      }

      // Start Focus Assist state monitor
      {
        let focus_app_handle = app.handle().clone();
        std::thread::spawn(move || {
          let mut last_active = false;
          let mut last_profile = String::new();
          loop {
            std::thread::sleep(FOCUS_ASSIST_MONITOR_INTERVAL);
            let state = read_focus_assist_state();
            if state.active != last_active || state.profile != last_profile {
              last_active = state.active;
              last_profile = state.profile.clone();
              let _ = focus_app_handle.emit(STATUS_CENTER_FOCUS_ASSIST_EVENT, &state);
            }
          }
        });
      }

      // Start notification summary monitor
      {
        let notif_app_handle = app.handle().clone();
        std::thread::spawn(move || {
          let mut last_focus_active = false;
          loop {
            std::thread::sleep(NOTIFICATION_MONITOR_INTERVAL);
            let summary = read_notification_summary();
            if summary.focus_assist_active != last_focus_active {
              last_focus_active = summary.focus_assist_active;
              let _ = notif_app_handle.emit(STATUS_CENTER_NOTIFICATION_EVENT, &summary);
            }
          }
        });
      }

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
      emit_hub_event_fixtures,
      get_runtime_capabilities,
      get_guest_provider_capabilities,
      get_media_session_status,
      get_system_performance,
      get_overlay_policy,
      set_status_window_floating,
      correct_status_window_position,
      start_window_drag,
      show_status_center_context_menu,
      get_status_center_settings,
      set_status_center_preferences,
      show_status_center_window,
      open_status_center_settings,
      quit_status_center,
      get_clipboard_content,
      set_clipboard_content,
      media_control,
      get_focus_assist_state,
      get_notification_summary,
      get_autostart_enabled,
      set_autostart_enabled
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
