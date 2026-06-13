package compute

import (
	"net/http"
	"testing"
)

func TestHTTPResultExplanationAuditEvents(t *testing.T) {
	scenario := newResultExplanationAuditScenario(t)

	rec := scenario.submit(t)
	if rec.Code != http.StatusCreated {
		t.Fatalf("result explanation submit failed: %d %s", rec.Code, rec.Body.String())
	}

	rec = scenario.submit(t)
	if rec.Code != http.StatusOK {
		t.Fatalf("duplicate submit should be idempotent: %d %s", rec.Code, rec.Body.String())
	}

	counts, byType := scenario.resultExplanationAuditEvents(t)
	if counts["result_explanation.submitted"] != 1 {
		t.Fatalf("expected one submitted audit event, got counts=%#v events=%#v", counts, byType)
	}

	submittedAudit := assertResultExplanationAudit(
		t,
		byType["result_explanation.submitted"],
		"result_explanation.submitted",
		"result_explanation.submit",
		scenario.resultExplanationAuditPath(),
		"submitted",
	)
	if submittedAudit["before"] != nil {
		t.Fatalf("submit audit should not have before state: %#v", submittedAudit["before"])
	}
	submittedAfter, ok := submittedAudit["after"].(map[string]any)
	if !ok || submittedAfter["payload_hash"] == "" || submittedAfter["resolved_evidence_ref_count"].(float64) != 2 {
		t.Fatalf("submit audit should include compact after state: %#v", submittedAudit["after"])
	}
}

func TestHTTPResultExplanationReviewPublishAuditEvents(t *testing.T) {
	scenario := newResultExplanationAuditScenario(t)

	rec := scenario.submit(t)
	if rec.Code != http.StatusCreated {
		t.Fatalf("result explanation submit failed: %d %s", rec.Code, rec.Body.String())
	}

	rec = scenario.review(t, `{"decision":"approved","reason":"evidence refs verified"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("result explanation review failed: %d %s", rec.Code, rec.Body.String())
	}

	rec = scenario.publish(t)
	if rec.Code != http.StatusOK {
		t.Fatalf("result explanation publish failed: %d %s", rec.Code, rec.Body.String())
	}

	rec = scenario.publish(t)
	if rec.Code != http.StatusOK {
		t.Fatalf("duplicate publish should be idempotent: %d %s", rec.Code, rec.Body.String())
	}

	counts, byType := scenario.resultExplanationAuditEvents(t)
	if counts["result_explanation.reviewed"] != 1 ||
		counts["result_explanation.published"] != 1 {
		t.Fatalf("expected one audit event per review/publish mutation, got counts=%#v events=%#v", counts, byType)
	}

	reviewedAudit := assertResultExplanationAudit(
		t,
		byType["result_explanation.reviewed"],
		"result_explanation.reviewed",
		"result_explanation.review",
		scenario.resultExplanationAuditPath(scenario.explanationID, "review"),
		"approved",
	)
	reviewBefore, ok := reviewedAudit["before"].(map[string]any)
	if !ok || reviewBefore["status"] != "submitted" {
		t.Fatalf("review audit should include submitted before state: %#v", reviewedAudit["before"])
	}
	reviewAfter, ok := reviewedAudit["after"].(map[string]any)
	if !ok || reviewAfter["status"] != "approved" || reviewAfter["review_decision"] != "approved" {
		t.Fatalf("review audit should include approved after state: %#v", reviewedAudit["after"])
	}
	if reviewedAudit["reason"] != "evidence refs verified" {
		t.Fatalf("review audit should preserve reason, got %#v", reviewedAudit)
	}

	publishedAudit := assertResultExplanationAudit(
		t,
		byType["result_explanation.published"],
		"result_explanation.published",
		"result_explanation.publish",
		scenario.resultExplanationAuditPath(scenario.explanationID, "publish"),
		"published",
	)
	publishBefore, ok := publishedAudit["before"].(map[string]any)
	if !ok || publishBefore["status"] != "approved" {
		t.Fatalf("publish audit should include approved before state: %#v", publishedAudit["before"])
	}
	publishAfter, ok := publishedAudit["after"].(map[string]any)
	if !ok || publishAfter["status"] != "published" || publishAfter["published_by"] != "result-auditor" {
		t.Fatalf("publish audit should include published after state: %#v", publishedAudit["after"])
	}
}
