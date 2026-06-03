package compute

import "context"

func (svc *ArtifactLifecycleService) ListJobArtifacts(ctx context.Context, jobID string) ([]ArtifactRecord, error) {
	return svc.metadata.Artifacts(ctx, jobID)
}

func (svc *ArtifactLifecycleService) ArtifactMetadata(ctx context.Context, artifactID string) (ArtifactRecord, error) {
	artifact, err := svc.metadata.FindArtifact(ctx, required(artifactID, "artifact_id"))
	if err != nil {
		return ArtifactRecord{}, err
	}
	return *artifact, nil
}

func (svc *ArtifactLifecycleService) DownloadArtifact(ctx context.Context, artifactID string) (ArtifactRecord, []byte, error) {
	artifact, err := svc.metadata.FindArtifact(ctx, required(artifactID, "artifact_id"))
	if err != nil {
		return ArtifactRecord{}, nil, err
	}
	bytes, err := svc.artifacts.Read(ctx, artifact.ObjectKey)
	if err != nil {
		appErr := ToAppError(err)
		if svc.archiveArtifacts == nil || svc.archiveMetadata == nil || appErr.ErrorCode != CodeArtifactNotFound {
			return ArtifactRecord{}, nil, err
		}
		archive, archiveErr := svc.archiveMetadata.FindArtifactArchive(ctx, artifact.ArtifactID)
		if archiveErr != nil || archive.Status != "archived" {
			return ArtifactRecord{}, nil, err
		}
		bytes, err = svc.archiveArtifacts.Read(ctx, archive.ArchiveObjectKey)
		if err != nil {
			return ArtifactRecord{}, nil, err
		}
		if archive.Checksum != artifact.Checksum {
			return ArtifactRecord{}, nil, NewAppError(500, CodeInternal, "artifact archive metadata checksum mismatch", true, nil)
		}
	}
	if "sha256:"+SHA256Hex(bytes) != artifact.Checksum {
		return ArtifactRecord{}, nil, NewAppError(500, CodeInternal, "artifact checksum verification failed", true, nil)
	}
	return *artifact, bytes, nil
}
