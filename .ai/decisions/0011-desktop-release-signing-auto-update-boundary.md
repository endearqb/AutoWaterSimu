# 0011 - Desktop Release Signing and Auto Update Boundary

## Status

Accepted.

## Context

AutoWaterSimu Next P0 requires Windows Desktop release evidence: packaged worker sidecar smoke, NSIS installer smoke, release gate evidence, and explicit source-controlled release automation. The PRD, Technical Spec, and Development Plan all mark installer signing, auto update, and Microsoft Store distribution as post-P0 work.

The current repository can build unsigned Desktop workflow artifacts through manual GitHub Actions dispatch and can validate locally built sidecar and NSIS installer artifacts. It does not have certificate material, timestamping authority configuration, update-channel metadata, private update keys, or a maintainer-approved GitHub Release publication policy.

## Decision

- P0 Desktop release artifacts remain unsigned NSIS installer and packaged worker artifacts with smoke evidence.
- GitHub Actions may build and upload unsigned Desktop workflow artifacts when `build_release_artifacts=true` is selected manually.
- Source-controlled workflows and scripts must not contain signing certificates, signing passwords, updater private keys, or release publication tokens.
- `tauri-plugin-updater`, updater endpoint metadata, Microsoft Store packaging, MSI packaging, and installer code signing remain post-P0.
- GitHub Release publication is not treated as automatic P0 completion. It may be added only after a maintainer-approved policy defines version/tag naming, release notes, artifact retention/download checks, manual approval, and token scope.
- Future signing implementation must keep secret material in CI secret storage or an external signing service and must record evidence that the signed installer still passes the existing installer smoke.
- Future auto update implementation must include update manifest signing, channel policy, rollback behavior, and an end-to-end update smoke before it can be called release-ready.

## Consequences

- Current P0 release evidence can pass with unsigned artifacts, provided packaged sidecar smoke, NSIS installer smoke, and release gate evidence pass.
- Release documentation must describe unsigned artifacts as P0 artifacts, not production-distribution-ready signed installers.
- No Tauri updater configuration, signing workflow, GitHub Release publishing step, or Microsoft Store package is added by this decision.
- The release backlog becomes policy-driven rather than an implementation ambiguity: signing, auto update, Store/MSI, and GitHub Release publication require separate decisions before implementation.

## Alternatives Considered

- Add a placeholder signing step in CI: rejected because it would imply a signing policy and secrets model that do not exist.
- Enable the Tauri updater without signed update metadata: rejected because update integrity and rollback behavior would be undefined.
- Publish workflow artifacts automatically to GitHub Releases: rejected because tag/version policy, approval flow, and token scope have not been defined.
- Treat unsigned workflow artifacts as production distribution: rejected because they are P0 smoke artifacts and do not satisfy signing or update-channel expectations.
