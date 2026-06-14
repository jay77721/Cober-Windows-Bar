// ---------------------------------------------------------------------------
// Window management module
// ---------------------------------------------------------------------------
// All Windows-specific window management primitives live here:
// DWM shadow suppression, fullscreen detection, z-order control, and
// multi-monitor position correction. lib.rs is the wiring layer that
// calls into these from the `setup` callback and from #[tauri::command]
// handlers.

use crate::types::WindowPositionCorrection;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{PhysicalPosition, WebviewWindow};

#[cfg(windows)]
use windows_sys::Win32::{
    Foundation::{HWND, RECT},
    Graphics::{
        Dwm::{DwmSetWindowAttribute, DWMWA_WINDOW_CORNER_PREFERENCE, DWMWCP_DONOTROUND},
        Gdi::{GetMonitorInfoW, MonitorFromWindow, MONITORINFO, MONITOR_DEFAULTTONEAREST},
    },
    UI::WindowsAndMessaging::{
        GetClassNameW, GetDesktopWindow, GetForegroundWindow, GetShellWindow, GetWindowLongW,
        GetWindowRect, GetWindowThreadProcessId, IsWindowVisible, SetWindowLongW, SetWindowPos,
        GWL_EXSTYLE, HWND_BOTTOM, HWND_TOPMOST, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE,
        SWP_SHOWWINDOW, WS_EX_APPWINDOW, WS_EX_TOOLWINDOW,
    },
};

// DWMWA_SYSTEMBACKDROP_TYPE — disables Mica/Acrylic backdrop (Win11 22H2+)
#[cfg(windows)]
const DWMWA_SYSTEMBACKDROP_TYPE: u32 = 38;
#[cfg(windows)]
const DWMSBT_NONE: i32 = 1;

pub(crate) const STATUS_WINDOW_EDGE_MARGIN: i32 = 8;

pub(crate) fn corrected_window_position(
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

pub(crate) fn correct_status_window_position_for_window<R: tauri::Runtime>(
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

#[cfg(windows)]
pub(crate) fn foreground_window_is_fullscreen() -> bool {
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
pub(crate) fn apply_status_window_tool_style(window: &WebviewWindow) -> Result<(), String> {
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
pub(crate) fn apply_status_window_tool_style(_window: &WebviewWindow) -> Result<(), String> {
    Ok(())
}

#[cfg(windows)]
pub(crate) fn set_status_window_z_order(window: &WebviewWindow, floating: bool) -> Result<(), String> {
    let hwnd = status_window_hwnd(window)?;
    let insert_after = if floating { HWND_TOPMOST } else { HWND_BOTTOM };
    let visibility_flag = if floating {
        SWP_SHOWWINDOW
    } else {
        Default::default()
    };

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
pub(crate) fn set_status_window_z_order(_window: &WebviewWindow, _floating: bool) -> Result<(), String> {
    Ok(())
}

#[cfg(windows)]
fn status_window_hwnd(window: &WebviewWindow) -> Result<HWND, String> {
    window
        .hwnd()
        .map(|hwnd| hwnd.0 as HWND)
        .map_err(|error| error.to_string())
}

/// Core logic to strip all DWM shadow artifacts from the transparent borderless window.
/// Called both immediately at startup and again after a delay to catch late resets
/// by WebView2/DWM during window initialization.
#[cfg(windows)]
fn apply_shadow_suppression(hwnd: HWND) {
    unsafe {
        // NOTE: We deliberately do NOT set DWMWA_NCRENDERING_POLICY = DWMNCRP_DISABLED.
        // That attribute FORCIBLY DISABLES DWM non-client rendering for the window,
        // which makes Windows fall back to the *classic* (non-DWM) window frame —
        // producing the black border lines and the Win7-style classic title-bar
        // close button. The window is already borderless/transparent via Tauri
        // (decorations:false, transparent:true, shadow:false); no NC suppression is
        // needed or wanted.

        // 1. Disable Win11 rounded corners so DWM does not add its own corner shadow.
        let corner_pref = DWMWCP_DONOTROUND;
        let _ = DwmSetWindowAttribute(
            hwnd,
            DWMWA_WINDOW_CORNER_PREFERENCE as u32,
            &corner_pref as *const i32 as *const _,
            std::mem::size_of::<i32>() as u32,
        );

        // 2. Disable system backdrop type (Mica/Acrylic) that can cause shadow
        let backdrop = DWMSBT_NONE;
        let _ = DwmSetWindowAttribute(
            hwnd,
            DWMWA_SYSTEMBACKDROP_TYPE,
            &backdrop as *const i32 as *const _,
            std::mem::size_of::<i32>() as u32,
        );

        // NOTE: We deliberately do NOT call SetWindowCompositionAttribute with an
        // ACCENT_* policy here. The accent policy applies over the full *rectangular*
        // window, including the four corners that sit OUTSIDE the pill's CSS
        // border-radius. With a transparent gradient color (alpha = 0), many Windows
        // builds render those corner areas as opaque WHITE instead of transparent —
        // which is exactly the residual white blocks seen at the four corners.
        // Letting WebView2's transparent surface + anti-aliased CSS border-radius
        // composite the corners via DirectComposition yields true transparency.
    }
}

#[cfg(windows)]
pub(crate) fn disable_dwm_window_shadow(window: &WebviewWindow, shutdown: Arc<AtomicBool>) {
    if let Ok(hwnd) = status_window_hwnd(window) {
        // The window is sized 303x64 to exactly match the pill. The rounded pill
        // shape is drawn by the WebView2 transparent surface with anti-aliased CSS
        // border-radius — DirectComposition composites the corners to true
        // transparency. We must NOT use SetWindowRgn here: a GDI region clip has
        // hard (aliased) corners that do not coincide with the smooth CSS corners,
        // leaving 1-2px residual artifacts at the four corners.
        apply_shadow_suppression(hwnd);

        // Reapply after delays to catch WebView2/DWM late initialization resets.
        let hwnd_raw = hwnd as isize;
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(500));
            if shutdown.load(Ordering::Relaxed) {
                return;
            }
            apply_shadow_suppression(hwnd_raw as HWND);
            std::thread::sleep(std::time::Duration::from_millis(1500));
            if shutdown.load(Ordering::Relaxed) {
                return;
            }
            apply_shadow_suppression(hwnd_raw as HWND);
        });
    }
}

#[cfg(not(windows))]
pub(crate) fn disable_dwm_window_shadow(_window: &WebviewWindow, _shutdown: Arc<AtomicBool>) {}

#[cfg(not(windows))]
pub(crate) fn foreground_window_is_fullscreen() -> bool {
    false
}

// ---------------------------------------------------------------------------
// Tests — pure-function position math only.
// ---------------------------------------------------------------------------
// `clamp_window_axis` and the empty-monitor fast path inside
// `corrected_window_position` have no side effects and are safe to cover in
// unit tests. The `tauri::Monitor` struct's fields are `pub(crate)` in
// Tauri 2, so we cannot construct non-empty monitor slices from a unit test
// — that branch is exercised by the real-desktop integration flow.

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn clamp_window_axis_clamps_within_bounds() {
        let result = clamp_window_axis(0, 100, 0, 1000);
        assert_eq!(result, 0);
    }

    #[test]
    fn clamp_window_axis_clamps_to_max() {
        // max_position = area_start + area_size - window_size - margin
        //              = 0 + 1000 - 100 - 8 = 892
        let result = clamp_window_axis(5000, 100, 0, 1000);
        assert_eq!(result, 892);
    }

    #[test]
    fn clamp_window_axis_returns_start_when_window_too_large() {
        // max_position = 0 + 100 - 5000 - 8 < 0, so the guard returns area_start
        let result = clamp_window_axis(500, 5000, 0, 100);
        assert_eq!(result, 0);
    }

    #[test]
    fn clamp_window_axis_respects_nonzero_area_start() {
        // area starts at x=100; max_position = 100 + 500 - 50 - 8 = 542
        let in_bounds = clamp_window_axis(100, 50, 100, 500);
        assert_eq!(in_bounds, 100);

        let over_max = clamp_window_axis(9999, 50, 100, 500);
        assert_eq!(over_max, 542);
    }

    #[test]
    fn corrected_window_position_returns_unchanged_with_no_monitors() {
        let monitors: &[tauri::window::Monitor] = &[];
        let (x, y) = corrected_window_position(100, 200, 300, 64, monitors);
        assert_eq!((x, y), (100, 200));
    }
}
