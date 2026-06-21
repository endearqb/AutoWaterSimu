package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"time"

	"autowatersimu/apps/api/internal/legacyimport"
)

func main() {
	if err := run(); err != nil {
		slog.Error("legacy migration failed", "error", err)
		os.Exit(1)
	}
}

func run() error {
	var only multiFlag
	var opt legacyimport.Options
	flag.StringVar(&opt.LegacyDatabaseURL, "legacy-database-url", os.Getenv("AUTOWATERSIMU_LEGACY_DATABASE_URL"), "legacy FastAPI PostgreSQL DSN")
	flag.StringVar(&opt.TargetDatabaseURL, "target-database-url", os.Getenv("COMPUTE_API_DATABASE_URL"), "AutoWaterSimu Next PostgreSQL DSN")
	flag.BoolVar(&opt.DryRun, "dry-run", false, "scan and report without writing target database")
	flag.BoolVar(&opt.Resume, "resume", false, "skip existing target rows with matching legacy source hash")
	flag.BoolVar(&opt.VerifyOnly, "verify-only", false, "verify target coverage without writing target database")
	flag.IntVar(&opt.BatchSize, "batch-size", 500, "legacy read batch size")
	flag.StringVar(&opt.ReportPath, "report", "", "write migration report JSON to path; stdout when empty")
	flag.Var(&only, "only", "resource filter: flowcharts,udm,jobs; may be repeated or comma-separated")
	flag.Parse()
	opt.Only = only
	if opt.VerifyOnly {
		opt.DryRun = true
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()
	report, err := legacyimport.Run(ctx, opt)
	if opt.ReportPath == "" {
		bytes, marshalErr := json.MarshalIndent(report, "", "  ")
		if marshalErr == nil {
			fmt.Println(string(bytes))
		}
	}
	if err != nil {
		return err
	}
	if len(report.Conflicts) > 0 {
		return fmt.Errorf("migration completed with %d conflicts", len(report.Conflicts))
	}
	return nil
}

type multiFlag []string

func (m *multiFlag) String() string {
	return strings.Join(*m, ",")
}

func (m *multiFlag) Set(value string) error {
	for _, part := range strings.Split(value, ",") {
		part = strings.TrimSpace(part)
		if part != "" {
			*m = append(*m, part)
		}
	}
	return nil
}
