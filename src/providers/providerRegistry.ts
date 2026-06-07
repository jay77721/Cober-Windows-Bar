import type {
  HubProvider,
  HubProviderCapability,
  HubProviderKind,
  HubProviderMetadata,
  HubProviderStatus,
} from "./types";

export type ProviderRegistryRecord = {
  id: string;
  name: string;
  kind: HubProviderKind;
  metadata: HubProviderMetadata;
  capabilities: HubProviderCapability[];
  status: HubProviderStatus;
  registrationOrder: number;
};

export type ProviderRegistryRegisterResult =
  | {
      ok: true;
      record: ProviderRegistryRecord;
    }
  | {
      ok: false;
      error: "duplicate-provider-id";
      id: string;
    };

export type ProviderRegistryCapabilitySupportRecord = {
  providerId: string;
  providerName: string;
  providerKind: HubProviderKind;
  registrationOrder: number;
  capability: HubProviderCapability;
};

type ProviderRegistryEntry = {
  provider: HubProvider;
  registrationOrder: number;
};

function snapshotProvider(entry: ProviderRegistryEntry): ProviderRegistryRecord {
  const { provider, registrationOrder } = entry;

  return {
    id: provider.id,
    name: provider.metadata.name,
    kind: provider.metadata.kind,
    metadata: { ...provider.metadata },
    capabilities: provider.capabilities.map((capability) => ({ ...capability })),
    status: { ...provider.status() },
    registrationOrder,
  };
}

function snapshotCapabilitySupport(
  entry: ProviderRegistryEntry,
): ProviderRegistryCapabilitySupportRecord[] {
  const { provider, registrationOrder } = entry;

  return provider.capabilities.map((capability) => ({
    providerId: provider.id,
    providerName: provider.metadata.name,
    providerKind: provider.metadata.kind,
    registrationOrder,
    capability: { ...capability },
  }));
}

export function createProviderRegistry() {
  const entries = new Map<string, ProviderRegistryEntry>();
  let nextRegistrationOrder = 0;

  function getEntry(providerId: string) {
    return entries.get(providerId);
  }

  return {
    register(provider: HubProvider): ProviderRegistryRegisterResult {
      if (entries.has(provider.id)) {
        return {
          ok: false,
          error: "duplicate-provider-id",
          id: provider.id,
        };
      }

      const entry = {
        provider,
        registrationOrder: nextRegistrationOrder,
      };

      nextRegistrationOrder += 1;
      entries.set(provider.id, entry);

      return {
        ok: true,
        record: snapshotProvider(entry),
      };
    },

    get(providerId: string) {
      const entry = getEntry(providerId);

      return entry ? snapshotProvider(entry) : undefined;
    },

    list() {
      return [...entries.values()]
        .sort((left, right) => left.registrationOrder - right.registrationOrder)
        .map(snapshotProvider);
    },

    listCapabilitySupport() {
      return [...entries.values()]
        .sort((left, right) => left.registrationOrder - right.registrationOrder)
        .flatMap(snapshotCapabilitySupport);
    },

    unregister(providerId: string) {
      const entry = getEntry(providerId);

      if (!entry) {
        return false;
      }

      const lifecycle = entry.provider.status().lifecycle;

      if (lifecycle === "Started" || lifecycle === "Publishing" || lifecycle === "Paused") {
        entry.provider.stop();
      }

      entries.delete(providerId);

      return true;
    },

    start(providerId: string) {
      const entry = getEntry(providerId);

      if (!entry) {
        return undefined;
      }

      entry.provider.start();

      return snapshotProvider(entry);
    },

    stop(providerId: string) {
      const entry = getEntry(providerId);

      if (!entry) {
        return undefined;
      }

      entry.provider.stop();

      return snapshotProvider(entry);
    },
  };
}
