package config

import "time"

type Config struct {
	Environment            string
	DatabaseURL            string
	ArtifactDir            string
	ArchiveDir             string
	ArchiveS3Endpoint      string
	ArchiveS3Bucket        string
	ArchiveS3Region        string
	ArchiveS3AccessKeyID   string
	ArchiveS3SecretKey     string
	ArchiveS3Prefix        string
	TokensJSON             string
	Port                   string
	RepoRoot               string
	RetentionSweepInterval time.Duration
	RetentionSweepDryRun   bool
	RetentionSweepLimit    int
}
