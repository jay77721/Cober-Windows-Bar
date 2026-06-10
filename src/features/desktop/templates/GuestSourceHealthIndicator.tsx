import type { GuestProviderSourceHealth, GuestProviderSourceQuality } from "../../../types/hub";
import { sourceQualityClassName } from "./ResidentStatusTemplate";

type GuestSourceHealthIndicatorProps = {
  sourceHealth?: GuestProviderSourceHealth;
};

export function GuestSourceHealthIndicator({ sourceHealth }: GuestSourceHealthIndicatorProps) {
  const label = guestSourceQualityLabel(sourceHealth?.quality);

  return (
    <span
      className={`product-status-source-health ${guestSourceQualityClassName(sourceHealth?.quality)}`}
      aria-label={`Guest provider diagnostic source ${label}`}
      title={`Guest provider source: ${label}`}
    >
      <span />
      <span className="product-status-source-health-label">{label}</span>
    </span>
  );
}

export function guestSourceQualityLabel(quality: GuestProviderSourceQuality | undefined) {
  switch (quality) {
    case "native":
      return "Native";
    case "app-owned":
      return "App";
    case "fixture":
      return "Fixture";
    case "mock":
      return "Mock";
    case "unavailable":
    default:
      return "Unavailable";
  }
}

function guestSourceQualityClassName(quality: GuestProviderSourceQuality | undefined) {
  switch (quality) {
    case "native":
      return sourceQualityClassName("live");
    case "app-owned":
      return "is-app";
    case "fixture":
    case "mock":
      return sourceQualityClassName("fallback");
    case "unavailable":
    default:
      return sourceQualityClassName("unavailable");
  }
}
