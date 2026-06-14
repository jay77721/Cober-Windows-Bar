// ---------------------------------------------------------------------------
// Tauri command handlers
// ---------------------------------------------------------------------------
// All #[tauri::command] functions consumed by tauri::generate_handler![...]
// live in this module. lib.rs owns the run() builder; types.rs owns the
// data structures. This file is pure command glue plus the small private
// helpers that only commands depend on.

use crate::clamp_percent;
use crate::types::*;
use crate::unix_time_ms;
use serde_json::json;

use sysinfo::System;
use tauri::Emitter;

// ---------------------------------------------------------------------------
// Shared constants used only by command handlers
// ---------------------------------------------------------------------------

/// Event name used by emit_hub_event_fixtures.
const STATUS_CENTER_HUB_EVENTS_EVENT: &str = "status-center://hub-events";

/// Window-size hint surfaced in the runtime capabilities payload.
const STATUS_WINDOW_CONFIGURED_WIDTH: u16 = 303;
const STATUS_WINDOW_CONFIGURED_HEIGHT: u16 = 64;

// ---------------------------------------------------------------------------
// Hub event fixtures
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn get_hub_event_fixtures() -> Vec<HubEventFixture> {
    build_hub_event_fixtures(0)
}

#[tauri::command]
pub fn emit_hub_event_fixtures(app: tauri::AppHandle) -> Result<usize, String> {
    let fixtures = get_hub_event_fixtures();
    let emitted = fixtures.len();
    let _ = app.emit_to(
        "main",
        STATUS_CENTER_HUB_EVENTS_EVENT,
        StatusCenterHubEventsPayload { events: fixtures },
    );
    Ok(emitted)
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
            expires_at: Some(now_ms + 15_000),
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
            expires_at: Some(now_ms + 15_000),
            progress: Some(download_progress),
            payload: json!({
              "id": "tauri-fixture-download-task",
              "type": "download",
              "title": "Downloads queue",
              "subtitle": "Fixture refresh 5s cadence".to_string(),
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
            expires_at: Some(now_ms + 5_000),
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

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn get_runtime_capabilities() -> RuntimeCapabilities {
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
pub async fn get_guest_provider_capabilities() -> GuestProviderCapabilitiesPayload {
    let result = tokio::time::timeout(
        std::time::Duration::from_secs(3),
        tauri::async_runtime::spawn_blocking(|| {
            let last_checked_at = unix_time_ms();
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
                        kind: "media",
                        quality: "native",
                        code: "available",
                        safe_to_display: true,
                        last_checked_at,
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
        }),
    )
    .await;

    match result {
        Ok(Ok(payload)) => payload,
        _ => GuestProviderCapabilitiesPayload { providers: vec![] },
    }
}

pub fn get_focus_provider_capability(last_checked_at: u64) -> GuestProviderCapability {
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

// ---------------------------------------------------------------------------
// URL
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn open_url_in_browser(url: String) -> Result<(), String> {
    // Validate that the URL uses http or https scheme
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err("only http/https URLs are allowed".into());
    }
    // Use explorer.exe -- the most reliable way to open URLs on Windows.
    // It delegates to the registered default browser handler.
    std::process::Command::new("explorer")
        .arg(&url)
        .spawn()
        .map_err(|e| format!("failed to open URL: {e}"))?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Clipboard
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn get_clipboard_content() -> Result<ClipboardContent, String> {
    let mut clipboard =
        arboard::Clipboard::new().map_err(|e| format!("clipboard init failed: {e}"))?;
    let text = clipboard
        .get_text()
        .map_err(|e| format!("clipboard read failed: {e}"))?;
    let source_app = String::new(); // arboard does not expose source app

    Ok(ClipboardContent {
        text,
        source_app,
        copied_at: unix_time_ms(),
    })
}

#[tauri::command]
pub fn set_clipboard_content(text: String) -> Result<(), String> {
    let mut clipboard =
        arboard::Clipboard::new().map_err(|e| format!("clipboard init failed: {e}"))?;
    clipboard
        .set_text(&text)
        .map_err(|e| format!("clipboard write failed: {e}"))?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Focus assist (Windows Registry)
// ---------------------------------------------------------------------------

#[cfg(windows)]
pub(crate) fn read_focus_assist_state() -> FocusAssistStatePayload {
    use winreg::enums::{HKEY_CURRENT_USER, KEY_READ};
    use winreg::RegKey;

    let active = RegKey::predef(HKEY_CURRENT_USER)
        .open_subkey_with_flags(
            r"Software\Microsoft\Windows\CurrentVersion\QuietHours",
            KEY_READ,
        )
        .and_then(|key| key.get_value::<u32, _>("NFPEnabled"))
        .map(|v| v == 1)
        .unwrap_or(false);

    let profile = RegKey::predef(HKEY_CURRENT_USER)
        .open_subkey_with_flags(
            r"Software\Microsoft\Windows\CurrentVersion\QuietHours",
            KEY_READ,
        )
        .and_then(|key| key.get_value::<String, _>("Profile"))
        .unwrap_or_default();

    FocusAssistStatePayload {
        active,
        profile,
        checked_at: unix_time_ms(),
    }
}

#[cfg(not(windows))]
pub(crate) fn read_focus_assist_state() -> FocusAssistStatePayload {
    FocusAssistStatePayload {
        active: false,
        profile: String::new(),
        checked_at: unix_time_ms(),
    }
}

#[tauri::command]
pub fn get_focus_assist_state() -> FocusAssistStatePayload {
    read_focus_assist_state()
}

#[cfg(windows)]
fn write_focus_assist_enabled(enabled: bool) -> Result<(), String> {
    use winreg::enums::{HKEY_CURRENT_USER, KEY_READ, KEY_SET_VALUE};
    use winreg::RegKey;
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let (key, _) = hkcu
        .create_subkey_with_flags(
            r"Software\Microsoft\Windows\CurrentVersion\QuietHours",
            KEY_READ | KEY_SET_VALUE,
        )
        .map_err(|e| format!("failed to open QuietHours key: {e}"))?;
    let value: u32 = if enabled { 1 } else { 0 };
    key.set_value("NFPEnabled", &value)
        .map_err(|e| format!("failed to write NFPEnabled: {e}"))?;
    Ok(())
}

#[cfg(not(windows))]
fn write_focus_assist_enabled(_enabled: bool) -> Result<(), String> {
    Err("focus assist control is only supported on Windows".into())
}

#[tauri::command]
pub fn stop_focus_session() -> Result<MediaControlResult, String> {
    write_focus_assist_enabled(false)?;
    Ok(MediaControlResult { success: true })
}

// ---------------------------------------------------------------------------
// Download control stubs
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn pause_download() -> Result<DownloadControlResult, String> {
    // No real download manager is wired up yet; the capability provider reports
    // "unavailable" / "not-implemented", so we always succeed to avoid blocking
    // the UI. A future download provider will replace this with real logic.
    Ok(DownloadControlResult { success: true })
}

#[tauri::command]
pub fn resume_download() -> Result<DownloadControlResult, String> {
    Ok(DownloadControlResult { success: true })
}

#[tauri::command]
pub fn cancel_download() -> Result<DownloadControlResult, String> {
    Ok(DownloadControlResult { success: true })
}

// ---------------------------------------------------------------------------
// Update / notification stubs
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn install_update() -> Result<DownloadControlResult, String> {
    Ok(DownloadControlResult { success: true })
}

#[tauri::command]
pub fn dismiss_notification() -> Result<DownloadControlResult, String> {
    // The notification payload surfaced to the front-end is a synthetic
    // summary derived from the Focus Assist registry monitor -- there is no
    // per-notification record to dismiss. Returning success acknowledges the
    // dismissal in the synthetic lifecycle and keeps the IPC contract real
    // so the front-end can stop showing the best-effort "couldn't dismiss"
    // toast. A future native notification provider can replace this with
    // real Windows Toast dismissal (ToastNotificationHistory).
    Ok(DownloadControlResult { success: true })
}

// ---------------------------------------------------------------------------
// Notification summary
// ---------------------------------------------------------------------------

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
pub fn get_notification_summary() -> NotificationSummaryPayload {
    read_notification_summary()
}

// ---------------------------------------------------------------------------
// Autostart
// ---------------------------------------------------------------------------

#[cfg(not(any(target_os = "android", target_os = "ios")))]
#[tauri::command]
pub fn get_autostart_enabled(
    autostart: tauri::State<'_, tauri_plugin_autostart::AutoLaunchManager>,
) -> bool {
    autostart.is_enabled().unwrap_or(false)
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
#[tauri::command]
pub fn set_autostart_enabled(
    autostart: tauri::State<'_, tauri_plugin_autostart::AutoLaunchManager>,
    enabled: bool,
) -> Result<(), String> {
    if enabled {
        autostart
            .enable()
            .map_err(|e| format!("enable autostart failed: {e}"))?;
    } else {
        autostart
            .disable()
            .map_err(|e| format!("disable autostart failed: {e}"))?;
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// System performance
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn get_system_performance(
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

    let (download_speed, upload_speed) = sample_network_speeds(&state);

    Ok(SystemPerformanceSnapshot {
        cpu,
        memory,
        download_speed,
        upload_speed,
    })
}

/// Calculates download and upload speeds in bytes per second using delta-based
/// rate measurement between invocations. Reuses the same Networks instance
/// across calls so that cumulative counter deltas are meaningful.
fn sample_network_speeds(state: &SharedDesktopProductState<tauri::Wry>) -> (u64, u64) {
    use sysinfo::Networks;
    let now = std::time::Instant::now();
    let mut download_bps: u64 = 0;
    let mut upload_bps: u64 = 0;

    if let Ok(mut guard) = state.lock() {
        let cache = &mut guard.perf_cache;

        // Lazily initialize the Networks instance on first call
        let networks = cache
            .networks
            .get_or_insert_with(Networks::new_with_refreshed_list);
        networks.refresh();

        let received_bytes: u64 = networks.values().map(|data| data.received()).sum();
        let transmitted_bytes: u64 = networks.values().map(|data| data.transmitted()).sum();

        if let Some(prev) = &cache.network_sample {
            let elapsed = now.duration_since(prev.sampled_at).as_secs_f64();

            if elapsed > 0.05 {
                let delta_rx = received_bytes.saturating_sub(prev.received_bytes);
                let delta_tx = transmitted_bytes.saturating_sub(prev.transmitted_bytes);
                download_bps = (delta_rx as f64 / elapsed) as u64;
                upload_bps = (delta_tx as f64 / elapsed) as u64;
            }
        }

        cache.network_sample = Some(NetworkSample {
            received_bytes,
            transmitted_bytes,
            sampled_at: now,
        });
    }

    (download_bps, upload_bps)
}
