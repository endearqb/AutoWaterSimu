package compute

import (
	"context"
	"mime/multipart"
)

func (svc *Service) UploadArtifact(ctx context.Context, workerID, jobID string, metadataText string, file multipart.File) (ArtifactRecord, error) {
	return svc.artifactLifecycle.UploadArtifact(ctx, workerID, jobID, metadataText, file)
}

func (svc *Service) ArtifactMetadata(ctx context.Context, artifactID string) (ArtifactRecord, error) {
	return svc.artifactLifecycle.ArtifactMetadata(ctx, artifactID)
}

func (svc *Service) DownloadArtifact(ctx context.Context, artifactID string) (ArtifactRecord, []byte, error) {
	return svc.artifactLifecycle.DownloadArtifact(ctx, artifactID)
}

func (svc *Service) SweepArtifactRetention(ctx context.Context, options ArtifactRetentionSweepOptions) (ArtifactRetentionSweepReport, error) {
	return svc.artifactLifecycle.SweepArtifactRetention(ctx, options)
}
