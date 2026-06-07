package compute

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
)

func handleBenchmarkCaseScheduleRun(server *Server, w http.ResponseWriter, r *http.Request, modelKey, modelVersion, benchmarkCaseID string) {
	principal, err := server.auth.Principal(r, "job:create")
	if err != nil {
		WriteError(w, err)
		return
	}
	request, err := readBenchmarkCaseRunRequest(r)
	if err != nil {
		WriteError(w, err)
		return
	}
	filter := filterForPrincipalDataScope(ListFilter{}, *principal)
	response, status, err := server.service.ScheduleBenchmarkCaseRunForScope(withAuditPrincipal(r.Context(), *principal, r), modelKey, modelVersion, benchmarkCaseID, request, "compute-api", principal.Name, filter)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, status, response)
}

func readBenchmarkCaseRunRequest(r *http.Request) (BenchmarkCaseRunRequest, error) {
	var request BenchmarkCaseRunRequest
	body, err := io.ReadAll(r.Body)
	if err != nil {
		return request, ValidationError("read request body failed")
	}
	if strings.TrimSpace(string(body)) == "" {
		return request, nil
	}
	if err := json.Unmarshal(body, &request); err != nil {
		return request, ValidationError("benchmark case run request JSON is invalid")
	}
	return request, nil
}
