package compute

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
)

func (server *Server) artifactByID(w http.ResponseWriter, r *http.Request) {
	principal, err := server.auth.Principal(r, "artifact:read")
	if err != nil {
		WriteError(w, err)
		return
	}
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	artifactID := strings.TrimPrefix(r.URL.Path, "/api/v1/artifacts/")
	metadata, err := server.service.ArtifactMetadata(r.Context(), artifactID)
	if err != nil {
		WriteError(w, err)
		return
	}
	if err := server.authorizeJobRouteDataScope(r.Context(), *principal, metadata.JobID); err != nil {
		WriteError(w, err)
		return
	}
	artifact, bytes, err := server.service.DownloadArtifact(r.Context(), artifactID)
	if err != nil {
		WriteError(w, err)
		return
	}
	w.Header().Set("Content-Type", artifact.ContentType)
	w.Header().Set("X-Artifact-Checksum", artifact.Checksum)
	_, _ = w.Write(bytes)
}

func (server *Server) artifactRetentionSweep(w http.ResponseWriter, r *http.Request) {
	principal, err := server.auth.Principal(r, "artifact:admin")
	if err != nil {
		WriteError(w, err)
		return
	}
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	request, err := readArtifactRetentionSweepRequest(r)
	if err != nil {
		WriteError(w, err)
		return
	}
	dryRun := true
	if request.DryRun != nil {
		dryRun = *request.DryRun
	}
	report, err := server.service.SweepArtifactRetention(withAuditPrincipal(r.Context(), *principal, r), ArtifactRetentionSweepOptions{
		DryRun: dryRun,
		Limit:  request.Limit,
	})
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, report)
}

func readArtifactRetentionSweepRequest(r *http.Request) (ArtifactRetentionSweepRequest, error) {
	var request ArtifactRetentionSweepRequest
	body, err := io.ReadAll(r.Body)
	if err != nil {
		return request, ValidationError("read request body failed")
	}
	if strings.TrimSpace(string(body)) == "" {
		return request, nil
	}
	if err := json.Unmarshal(body, &request); err != nil {
		return request, ValidationError("artifact retention sweep request JSON is invalid")
	}
	if request.Limit < 0 {
		return request, ValidationError("limit must be non-negative")
	}
	return request, nil
}
