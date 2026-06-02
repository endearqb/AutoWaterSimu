package compute

type rowScanner interface {
	Scan(dest ...any) error
}

func nullString(value string) any {
	if value == "" {
		return nil
	}
	return value
}
