# Provider-based Backup & Sync

## Product decisions

- The JivanLekh sync server is optional. It is one selectable sync mode, not a dependency of provider-based sync.
- Users can configure more than one storage destination.
- Backup destination selection is multi-select: one backup snapshot is copied independently to every selected destination.
- Provider sync can also select multiple replicas, but that is a separate replication workflow from multi-destination backup.
- Provider IDs are open strings. A first-party or third-party adapter can be added without changing the core storage contracts.
- Authentication secrets and refresh tokens belong in the platform's secure credential store. Settings only keep a credential reference.

## Current core foundation

`packages/core/src/provider-storage/index.ts` contains:

- `ProviderObjectStorage`: a vendor-neutral object-storage contract.
- `StorageDestinationConfig` and `UserStorageConfiguration`: serializable config with independent multi-select lists for sync and backup.
- `validateUserStorageConfiguration`: validates references, selection modes, and duplicate destination IDs.
- `writeSnapshotToDestinations`: fans an immutable snapshot out to all enabled targets, independently records failures, and verifies the remote object size after upload.
- `ProviderManifest` and `publishProviderManifest`: compare-and-swap manifest publishing. A provider without atomic conditional writes cannot be used for safe manifest updates.

## Required behavior before production

### Backup

1. Generate one immutable snapshot and unique object key.
2. Upload it to every selected destination.
3. Verify every remote copy (size and a strong checksum when available).
4. Report each destination separately. A partial result is never displayed as full success.
5. Retry only failed destinations; never delete good copies because another destination failed.
6. Keep retention and deletion as explicit policies, with tombstone/version handling so retention cannot erase a newer copy.

The current snapshot helper accepts a `Uint8Array`. The existing backup exporters are streaming and can produce large attachment archives; the app integration must add a streaming upload path before using this helper for large production backups.

### Provider sync

1. Provider sync is independent of the JivanLekh sync server and must work with a locally held sync-encryption key.
2. Each device writes immutable, encrypted change segments and updates a versioned manifest with conditional writes.
3. Devices fetch unseen segments, validate hashes, decrypt locally, and merge through the existing collection conflict logic.
4. Manifest updates use ETag/generation compare-and-swap. Conflicts are merged/retried; they are never silently overwritten.
5. Multi-provider replicas are tracked independently. A failed replica remains pending and is repaired on the next run.
6. A device must persist its local upload/download cursor only after the corresponding remote operation and local merge have succeeded.

The current Notesnook-derived collector uses account-derived data encryption keys and its transport is coupled to the SignalR sync service. That collector cannot simply be pointed at OneDrive/WebDAV: provider sync needs an account-independent key setup and a transport coordinator that reuses the validated merge path without opening a SignalR connection.

## Provider rollout

1. WebDAV: useful for self-hosted NAS and broad interoperability; require HTTPS and secure credential handling.
2. OneDrive: Microsoft Graph OAuth adapter.
3. Google Drive: OAuth adapter.
4. Dropbox: OAuth adapter.
5. S3-compatible storage: endpoint/region/bucket/credential adapter.
6. Custom provider adapters: documented contract and capability tests.

A provider is not advertised as supported until OAuth/credential renewal, mobile behavior, interrupted uploads, conditional writes, remote verification, and cross-device tests pass.

## Current implementation status

This branch introduces the shared contract, multi-select configuration shape, safe snapshot fan-out helper, manifest compare-and-swap contract, and unit tests. It does not yet contain cloud-provider adapters, provider authentication screens, platform secure credential storage, backup UI integration, or the provider sync engine. These must be implemented in subsequent steps before enabling provider sync for users.
