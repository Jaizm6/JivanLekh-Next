/*
This file is part of the Notesnook project (https://notesnook.com/)

Copyright (C) 2023 Streetwriters (Private) Limited

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/**
 * Provider-neutral object storage contracts used by direct, user-owned
 * backup/sync destinations. These contracts deliberately do not depend on
 * the JivanLekh sync service or on a particular cloud vendor.
 */

export type ProviderCapabilities = {
  /** Provider supports conditional writes (ETag / generation preconditions). */
  conditionalWrites: boolean;
  /** Provider can return a stable content checksum for stored objects. */
  checksums: boolean;
  /** Provider supports resumable or multipart uploads. */
  resumableUploads: boolean;
};

export type ProviderObjectMetadata = {
  key: string;
  size: number;
  etag: string;
  modifiedAt: number;
  /** SHA-256 in lowercase hexadecimal, when supplied by the provider. */
  sha256?: string;
};

export type ProviderWriteCondition =
  | { ifNoneMatch: true }
  | { ifMatch: string };

export type ProviderWriteOptions = {
  contentType?: string;
  condition?: ProviderWriteCondition;
};

export interface ProviderObjectStorage {
  /** Stable adapter identifier, e.g. "onedrive", "webdav", or "s3". */
  readonly id: string;
  readonly displayName: string;
  readonly capabilities: ProviderCapabilities;

  list(prefix: string, cursor?: string): Promise<{
    objects: ProviderObjectMetadata[];
    nextCursor?: string;
  }>;
  get(key: string): Promise<Uint8Array | undefined>;
  head(key: string): Promise<ProviderObjectMetadata | undefined>;
  put(
    key: string,
    data: Uint8Array,
    options?: ProviderWriteOptions
  ): Promise<ProviderObjectMetadata>;
  delete(key: string, condition?: ProviderWriteCondition): Promise<void>;
}

/**
 * A destination is an independently configured location. Two destinations
 * may use the same provider (for example, two different OneDrive folders).
 * Secrets and OAuth tokens must be held by the adapter's secure credential
 * layer, never in this descriptor.
 */
export type StorageDestination = {
  id: string;
  label: string;
  provider: ProviderObjectStorage;
  /** Provider-relative root, without a leading or trailing slash. */
  root: string;
  enabled: boolean;
};

/**
 * Serializable destination configuration. "providerId" is intentionally an
 * open string so third-party/custom adapters can be registered without
 * changing the core package. credentialRef points to an OS-secure credential
 * entry; access tokens and passwords must never be stored here.
 */
export type StorageDestinationConfig = {
  id: string;
  providerId: string;
  label: string;
  root: string;
  enabled: boolean;
  credentialRef?: string;
};

/**
 * Server sync is optional. Provider sync can replicate to multiple selected
 * destinations; backup destinations are independently multi-selectable.
 */
export type UserStorageConfiguration = {
  syncMode: "off" | "server" | "providers";
  syncDestinationIds: string[];
  backupDestinationIds: string[];
  destinations: StorageDestinationConfig[];
};

export function validateUserStorageConfiguration(
  configuration: UserStorageConfiguration
): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const destination of configuration.destinations) {
    if (!destination.id.trim()) {
      errors.push("Every storage destination needs an ID.");
      continue;
    }
    if (ids.has(destination.id)) {
      errors.push(`Duplicate storage destination ID: ${destination.id}`);
    }
    ids.add(destination.id);
    if (!destination.providerId.trim()) {
      errors.push(`Storage destination "${destination.id}" has no provider.`);
    }
    if (destination.credentialRef?.trim() === "") {
      errors.push(`Storage destination "${destination.id}" has an empty credential reference.`);
    }
  }

  const enabledIds = new Set(
    configuration.destinations
      .filter((destination) => destination.enabled)
      .map((destination) => destination.id)
  );

  for (const id of configuration.backupDestinationIds) {
    if (!enabledIds.has(id)) {
      errors.push(`Backup destination "${id}" is missing or disabled.`);
    }
  }

  for (const id of configuration.syncDestinationIds) {
    if (!enabledIds.has(id)) {
      errors.push(`Sync destination "${id}" is missing or disabled.`);
    }
  }

  if (new Set(configuration.backupDestinationIds).size !== configuration.backupDestinationIds.length) {
    errors.push("Backup destination selections must not contain duplicates.");
  }
  if (new Set(configuration.syncDestinationIds).size !== configuration.syncDestinationIds.length) {
    errors.push("Sync destination selections must not contain duplicates.");
  }
  if (
    configuration.syncMode === "providers" &&
    configuration.syncDestinationIds.length === 0
  ) {
    errors.push("Select at least one provider destination or choose another sync mode.");
  }
  if (
    configuration.syncMode !== "providers" &&
    configuration.syncDestinationIds.length > 0
  ) {
    errors.push("Provider sync destinations can only be selected when provider sync is enabled.");
  }

  return errors;
}

export type ImmutableSnapshot = {
  /** Globally unique path, normally containing a timestamp and random ID. */
  key: string;
  data: Uint8Array;
  contentType: string;
  /** Expected SHA-256 when calculated by the caller. */
  sha256?: string;
};

export type DestinationWriteResult = {
  destinationId: string;
  label: string;
  providerId: string;
  status: "saved" | "failed" | "skipped";
  metadata?: ProviderObjectMetadata;
  error?: string;
};

export type MultiDestinationWriteReport = {
  key: string;
  total: number;
  saved: number;
  failed: number;
  skipped: number;
  results: DestinationWriteResult[];
  /** True only when every enabled destination has a verified copy. */
  complete: boolean;
};

export class ProviderPreconditionError extends Error {
  constructor(message = "The remote object changed before the write completed.") {
    super(message);
    this.name = "ProviderPreconditionError";
  }
}

export function normalizeObjectKey(key: string): string {
  const normalized = key.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  const segments = normalized.split("/");
  if (
    !normalized ||
    segments.some((segment) => !segment || segment === "." || segment === "..") ||
    normalized.includes("\0")
  ) {
    throw new Error("Invalid provider object key.");
  }
  return normalized;
}

function destinationKey(destination: StorageDestination, key: string) {
  const root = destination.root
    ? normalizeObjectKey(destination.root)
    : "";
  const child = normalizeObjectKey(key);
  return root ? `${root}/${child}` : child;
}

/**
 * Writes one immutable snapshot to every enabled destination. Destinations
 * are attempted independently: a failure in one cloud must not prevent other
 * selected clouds from receiving their copies. The returned report is partial
 * when any destination fails; callers must not display a full-success state
 * unless report.complete is true.
 */
export async function writeSnapshotToDestinations(
  snapshot: ImmutableSnapshot,
  destinations: StorageDestination[]
): Promise<MultiDestinationWriteReport> {
  const key = normalizeObjectKey(snapshot.key);
  const enabled = destinations.filter((destination) => destination.enabled);
  const ids = new Set<string>();

  for (const destination of destinations) {
    if (!destination.id.trim() || ids.has(destination.id)) {
      throw new Error("Enabled storage destination IDs must be unique and non-empty.");
    }
    ids.add(destination.id);
  }

  if (!enabled.length) {
    throw new Error("Select at least one enabled storage destination.");
  }

  const results = await Promise.all(
    destinations.map(async (destination): Promise<DestinationWriteResult> => {
      if (!destination.enabled) {
        return {
          destinationId: destination.id,
          label: destination.label,
          providerId: destination.provider.id,
          status: "skipped"
        };
      }
      const remoteKey = destinationKey(destination, key);
      try {
        const written = await destination.provider.put(remoteKey, snapshot.data, {
          contentType: snapshot.contentType,
          // Snapshots are immutable. Never silently replace an existing copy.
          condition: { ifNoneMatch: true }
        });
        const verified = await destination.provider.head(remoteKey);
        if (!verified || verified.size !== snapshot.data.byteLength) {
          throw new Error("Remote verification failed: stored size does not match.");
        }
        if (snapshot.sha256 && verified.sha256 && snapshot.sha256 !== verified.sha256) {
          throw new Error("Remote verification failed: SHA-256 does not match.");
        }
        return {
          destinationId: destination.id,
          label: destination.label,
          providerId: destination.provider.id,
          status: "saved",
          metadata: verified ?? written
        };
      } catch (error) {
        return {
          destinationId: destination.id,
          label: destination.label,
          providerId: destination.provider.id,
          status: "failed",
          error: error instanceof Error ? error.message : String(error)
        };
      }
    })
  );

  const saved = results.filter((result) => result.status === "saved").length;
  const failed = results.filter((result) => result.status === "failed").length;
  const skipped = destinations.length - enabled.length;

  return {
    key,
    total: destinations.length,
    saved,
    failed,
    skipped,
    results,
    complete: enabled.length > 0 && failed === 0 && saved === enabled.length
  };
}

export type ProviderManifest<T> = {
  schemaVersion: 1;
  revision: number;
  updatedAt: number;
  updatedBy: string;
  payload: T;
};

export function createProviderManifest<T>(
  payload: T,
  revision: number,
  updatedBy: string,
  updatedAt = Date.now()
): ProviderManifest<T> {
  if (!Number.isSafeInteger(revision) || revision < 1) {
    throw new Error("Manifest revision must be a positive safe integer.");
  }
  if (!updatedBy.trim()) throw new Error("Manifest device ID is required.");
  return { schemaVersion: 1, revision, updatedAt, updatedBy, payload };
}

/**
 * Compare-and-swap manifest publishing. A provider must enforce the supplied
 * condition atomically; this prevents two devices from silently overwriting
 * each other's latest manifest. A conflict is surfaced for a merge/retry
 * policy at the sync-engine layer.
 */
export async function publishProviderManifest<T>(
  provider: ProviderObjectStorage,
  key: string,
  manifest: ProviderManifest<T>,
  expectedEtag?: string
): Promise<ProviderObjectMetadata> {
  if (!provider.capabilities.conditionalWrites) {
    throw new Error(
      `Provider "${provider.displayName}" does not support safe manifest updates.`
    );
  }
  const normalizedKey = normalizeObjectKey(key);
  const bytes = new TextEncoder().encode(JSON.stringify(manifest));
  return provider.put(normalizedKey, bytes, {
    contentType: "application/json",
    condition: expectedEtag
      ? { ifMatch: expectedEtag }
      : { ifNoneMatch: true }
  });
}
