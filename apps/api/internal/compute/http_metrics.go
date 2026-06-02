package compute

import (
	platformmetrics "autowatersimu/apps/api/internal/platform/metrics"
	"net/http"
)

func (server *Server) metrics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	snapshot, err := server.service.Metrics(r.Context())
	if err != nil {
		http.Error(w, "metrics unavailable", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/plain; version=0.0.4")
	_, _ = w.Write([]byte(platformmetrics.RenderPrometheus(snapshot)))
}
