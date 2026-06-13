package compute

import "net/http"

func rejectUndeclaredHTTPMethod(w http.ResponseWriter, method string, allowed ...string) bool {
	for _, declared := range allowed {
		if method == declared {
			return false
		}
	}
	w.WriteHeader(http.StatusMethodNotAllowed)
	return true
}
