import type {
  HubProvider,
  HubProviderCapability,
  HubProviderKind,
  HubProviderMetadata,
  HubProviderStatus,
} from "./types";

type ProviderRegistryRecord = {
  id: string;
  name: string;
  kind: HubProviderKind;
  metadata: HubProviderMetadata;
  capabilities: HubProviderCapability[];
  status: HubProviderStatus;
  registrationOrder: number;
};

type ProviderRegistryRegisterResult =
  | {
      ok: true;
      record: ProviderRegistryRecord;
    }
  | {
      ok: false;
      error: "duplicate-provider-id";
      id: string;
    };

type ProviderRegistryCapabilitySupportRecord = {
  providerId: string;
  providerName: string;
  providerKind: HubProviderKind;
  registrationOrder: number;
  capability: HubProviderCapability;
};

type ProviderRegistryCapabilitySupportSummary = {
  kind: HubProviderCapability["kind"];
  origin: HubProviderCapability["origin"];
  support: HubProviderCapability["support"];
  capabilityCount: number;
  providerCount: number;
  providerIds: string[];
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

function summarizeCapabilitySupportRecords(
  records: ProviderRegistryCapabilitySupportRecord[],
): ProviderRegistryCapabilitySupportSummary[] {
  const summaries = new Map<string, ProviderRegistryCapabilitySupportSummary & { providerIdsSet: Set<string> }>();

  records.forEach((record) => {
    const { capability } = record;
    const key = `${capability.kind}:${capability.origin}:${capability.support}`;
    const existing =
      summaries.get(key) ??
      {
        kind: capability.kind,
        origin: capability.origin,
        support: capability.support,
        capabilityCount: 0,
        providerCount: 0,
        providerIds: [],
        providerIdsSet: new Set<string>(),
      };

    existing.capabilityCount += 1;

    if (!existing.providerIdsSet.has(record.providerId)) {
      existing.providerIdsSet.add(record.providerId);
      existing.providerIds.push(record.providerId);
      existing.providerCount += 1;
    }

    summaries.set(key, existing);
  });

  return [...summaries.values()].map(({ providerIdsSet, ...summary }) => ({
    ...summary,
    providerIds: [...summary.providerIds],
  }));
}

export function createProviderRegistry() {
  const entries = new Map<string, ProviderRegistryEntry>();
  let nextRegistrationOrder = 0;

  function getEntry(providerId: string) {
    return entries.get(providerId);
  }

  function listCapabilitySupport() {
    return [...entries.values()]
      .sort((left, right) => left.registrationOrder - right.registrationOrder)
      .flatMap(snapshotCapabilitySupport);
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

    listCapabilitySupport,

    summarizeCapabilitySupport() {
      return summarizeCapabilitySupportRecords(listCapabilitySupport());
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
