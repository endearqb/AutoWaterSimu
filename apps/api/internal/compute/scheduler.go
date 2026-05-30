package compute

import (
	"context"
	"log/slog"
	"time"
)

func StartArtifactRetentionScheduler(ctx context.Context, svc *Service, options ArtifactRetentionSchedulerOptions, logger *slog.Logger) error {
	if options.Interval <= 0 {
		return nil
	}
	if logger == nil {
		logger = slog.Default()
	}
	limit := normalizeRetentionLimit(options.Limit)
	ticker := time.NewTicker(options.Interval)
	go func() {
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				report, err := svc.SweepArtifactRetention(ctx, ArtifactRetentionSweepOptions{
					DryRun: options.DryRun,
					Limit:  limit,
				})
				if err != nil {
					logger.Error("artifact retention sweep failed", "error", err)
					continue
				}
				logger.Info(
					"artifact retention sweep completed",
					"dry_run", report.DryRun,
					"checked", report.Checked,
					"deleted", report.Deleted,
					"skipped", report.Skipped,
				)
			}
		}
	}()
	return nil
}
