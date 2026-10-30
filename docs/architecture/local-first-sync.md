# JivanLekh: local-first storage and provider sync

**Status: architecture plan — provider adapters are not implemented by this document.**

## Product direction

JivanLekh is intended to be free to use, local-first, and independent of a JivanLekh-hosted storage subscription. Notes should remain usable on the device without requiring a paid plan. Users should be able to choose where sync data is stored, including a local folder or a cloud account they control.

The app does not promise unlimited storage. A cloud provider's own quota, local disk capacity, API limits, or network conditions still apply.

## Current implementation boundary

The current sync transport is still the inherited Notesnook service integration:

- Sync records are exchanged through an authenticated SignalR connection at the configured API host.
- Attachment transfer uses the configured API host's S3-style endpoints.
- Device registration and access tokens are managed by the inherited account service.
- The local application database remains separate from this remote transport.

**This means JivanLekh is not yet BYOS.** Removing in-app subscription gates does not convert the existing hosted transport into Google Drive, OneDrive, MEGA, JioAICloud, WebDAV, or Syncthing support. A provider adapter and an end-to-end sync workflow must be implemented and tested before those options can be advertised.

## Non-negotiable data-safety rules

1. Never synchronize a live SQLite database file between devices. Every device keeps its own local database; sync exchanges versioned application objects.
2. Preserve object-level encryption before remote writes. Provider credentials must not be used as encryption keys, and the provider must not receive the user's decryption secret.
3. Use stable opaque object identifiers. Avoid exposing note titles, notebook names, or other plaintext metadata in remote file names.
4. Represent deletions as syncable tombstones until all participating devices can safely observe them. A provider-side delete alone is not a sufficient deletion protocol.
5. Track provider revisions/ETags and detect concurrent writes. Do not silently overwrite a divergent copy based only on a timestamp.
6. Verify downloaded object integrity, checkpoint only completed transfers, and make interrupted uploads recoverable.
7. Keep export and restore available so users can leave a provider without losing their notes.

## Provider contract to implement

A provider adapter should expose file-like operations independent of the sync engine:

- connect / disconnect and a connection test;
- paginated list(prefix, cursor) returning stable keys and provider revisions;
- read(key) returning bytes and the current revision;
- conditional write(key, bytes, expectedRevision) returning the new revision;
- conditional delete(key, expectedRevision);
- optional change-feed support, quota information, and resumable-upload capabilities.

The sync engine should own object serialization, encryption, tombstones, conflict detection, and checkpointing. Providers should only store opaque byte objects and report their revisions/capabilities. The existing collector and merge/conflict code can be evaluated for reuse, but the provider transport must not assume that the current SignalR protocol maps directly to a drive API.

## Rollout order

1. **Local folder on desktop.** Store sync objects in a user-selected folder. Users can use Syncthing to replicate that folder between their own devices; Syncthing remains a separate file-sync tool, not a JivanLekh cloud service.
2. **Google Drive.** Implement user-consented OAuth and the least-privilege file scope suitable for app-managed files. Use Drive change tokens for incremental discovery where supported.
3. **OneDrive.** Use Microsoft Graph drive-item delta queries and persist the returned delta link as the incremental cursor.
4. **WebDAV / S3-compatible storage.** Provide a standards-based adapter for self-hosted and compatible services.
5. **MEGA.** Evaluate the official SDK, supported platforms, concurrency behavior, and all applicable license/attribution obligations before shipping.
6. **JioAICloud.** Add only after an official, documented developer integration is available. Do not build on reverse-engineered private endpoints.

## Browser versus desktop

A browser may offer user-selected directory access through the File System Access API, but browser support and permission behavior are not uniform. The first reliable local-folder implementation should therefore target the desktop app; browser folder sync needs a supported-browser matrix and a clear fallback.

## User-facing settings target

A future **Sync & Storage** section should show the active provider, selected folder/account, connection state, last successful sync, pending changes, and any conflict requiring attention. It should offer a test-connection action, explicit disconnect/switch-provider behavior, and a clear warning before deleting remote data.

Until the adapters and safety tests exist, keep provider choices out of the UI rather than presenting non-functional buttons.
