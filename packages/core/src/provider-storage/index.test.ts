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

import { describe, expect, it, vi } from "vitest";
import {
  createProviderManifest,
  normalizeObjectKey,
  publishProviderManifest,
  ProviderObjectStorage,
  ProviderPreconditionError,
  ProviderRegistry,
  StorageDestination,
  validateUserStorageConfiguration,
  writeSnapshotToDestinations
} from "./index.js";

function mockProvider(
  id: string,
  options: { fail?: boolean } = {}
): ProviderObjectStorage {
  const objects = new Map<string, Uint8Array>();
  return {
    id,
    displayName: id,
    capabilities: {
      conditionalWrites: true,
      checksums: false,
      resumableUploads: false
    },
    list: vi.fn(async (prefix: string) => ({
      objects: [...objects.entries()]
        .filter(([key]) => key.startsWith(prefix))
        .map(([key, data]) => ({
          key,
          size: data.byteLength,
          etag: `etag-${key}`,
          modifiedAt: Date.now()
        }))
    })),
    get: vi.fn(async (key: string) => objects.get(key)),
    head: vi.fn(async (key: string) => {
      const data = objects.get(key);
      return data
        ? {
            key,
            size: data.byteLength,
            etag: `etag-${key}`,
            modifiedAt: Date.now()
          }
        : undefined;
    }),
    put: vi.fn(async (key: string, data: Uint8Array) => {
      if (options.fail) throw new Error("Provider unavailable");
      if (options.rejectExisting && objects.has(key)) {
        throw new ProviderPreconditionError("Object already exists");
      }
      objects.set(key, data);
      return {
        key,
        size: data.byteLength,
        etag: `etag-${key}`,
        modifiedAt: Date.now()
      };
    }),
    delete: vi.fn(async (key: string) => {
      objects.delete(key);
    })
  };
}

function destination(
  id: string,
  provider: ProviderObjectStorage,
  enabled = true
): StorageDestination {
  return { id, label: id, provider, root: "JivanLekh", enabled };
}

describe("provider storage", () => {
  it("normalizes safe object keys and rejects traversal", () => {
    expect(normalizeObjectKey("/backups//daily.zip/")).toBe(
      "backups/daily.zip"
    );
    expect(() => normalizeObjectKey("../private/key")).toThrow(
      "Invalid provider object key"
    );
    expect(() => normalizeObjectKey("notes/../../private")).toThrow(
      "Invalid provider object key"
    );
  });

  it("writes one snapshot to all selected destinations", async () => {
    const onedrive = mockProvider("onedrive");
    const webdav = mockProvider("webdav");
    const bytes = new TextEncoder().encode("verified backup");
    const report = await writeSnapshotToDestinations(
      {
        key: "backups/snapshot-001.nnbackupz",
        data: bytes,
        contentType: "application/zip"
      },
      [destination("personal-onedrive", onedrive), destination("home-nas", webdav)]
    );

    expect(report.complete).toBe(true);
    expect(report.saved).toBe(2);
    expect(report.failed).toBe(0);
    expect(onedrive.put).toHaveBeenCalledWith(
      "JivanLekh/backups/snapshot-001.nnbackupz",
      bytes,
      expect.objectContaining({ condition: { ifNoneMatch: true } })
    );
    expect(webdav.put).toHaveBeenCalledTimes(1);
  });

  it("continues to other destinations when one provider fails", async () => {
    const failed = mockProvider("dropbox", { fail: true });
    const working = mockProvider("onedrive");
    const report = await writeSnapshotToDestinations(
      {
        key: "backups/snapshot-002.nnbackupz",
        data: new Uint8Array([1, 2, 3]),
        contentType: "application/zip"
      },
      [destination("dropbox-main", failed), destination("onedrive-main", working)]
    );

    expect(report.complete).toBe(false);
    expect(report.saved).toBe(1);
    expect(report.failed).toBe(1);
    expect(report.results.find((result) => result.status === "failed")?.error)
      .toBe("Provider unavailable");
  });

  it("does not treat disabled destinations as failed or selected", async () => {
    const provider = mockProvider("onedrive");
    const report = await writeSnapshotToDestinations(
      {
        key: "backups/snapshot-003.nnbackupz",
        data: new Uint8Array([1]),
        contentType: "application/zip"
      },
      [destination("onedrive-main", provider), destination("dropbox-main", provider, false)]
    );

    expect(report.complete).toBe(true);
    expect(report.saved).toBe(1);
    expect(report.skipped).toBe(1);
  });

  it("requires at least one enabled destination", async () => {
    await expect(
      writeSnapshotToDestinations(
        {
          key: "backups/snapshot-004.nnbackupz",
          data: new Uint8Array([1]),
          contentType: "application/zip"
        },
        [destination("onedrive-main", mockProvider("onedrive"), false)]
      )
    ).rejects.toThrow("Select at least one enabled storage destination");
  });

  it("requires conditional writes before publishing a sync manifest", async () => {
    const provider = mockProvider("onedrive");
    const manifest = createProviderManifest({ cursor: "device-1" }, 1, "device-1");
    await publishProviderManifest(provider, "sync/manifest.json", manifest);

    expect(provider.put).toHaveBeenCalledWith(
      "sync/manifest.json",
      expect.any(Uint8Array),
      expect.objectContaining({ condition: { ifNoneMatch: true } })
    );

    const unsafeProvider = {
      ...mockProvider("legacy"),
      capabilities: {
        conditionalWrites: false,
        checksums: false,
        resumableUploads: false
      }
    };
    await expect(
      publishProviderManifest(unsafeProvider, "sync/manifest.json", manifest)
    ).rejects.toThrow("does not support safe manifest updates");
  });

  it("validates sync manifest revisions and device IDs", () => {
    expect(createProviderManifest({ ok: true }, 2, "device-2").revision).toBe(2);
    expect(() => createProviderManifest({}, 0, "device-1")).toThrow(
      "Manifest revision must be a positive safe integer"
    );
    expect(() => createProviderManifest({}, 1, " ")).toThrow(
      "Manifest device ID is required"
    );
  });
});
