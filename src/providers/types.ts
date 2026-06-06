import type { HubEvent } from "../types/hub";

export type HubProviderLifecycle =
  | "Registered"
  | "Started"
  | "Publishing"
  | "Paused"
  | "Stopped"
  | "Failed";

export type HubProviderHealth = "Healthy" | "Degraded" | "Unhealthy";

export type HubProviderStatus = {
  lifecycle: HubProviderLifecycle;
  health: HubProviderHealth;
};

export type HubProviderListener = (events: HubEvent[]) => void;

export type MockProviderOptions = {
  now?: number | (() => number);
};

export type HubProvider = {
  id: string;
  label: string;
  start(): void;
  stop(): void;
  subscribe(listener: HubProviderListener): () => void;
  status(): HubProviderStatus;
};
