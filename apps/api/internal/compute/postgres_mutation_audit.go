package compute

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
)

func (store *PostgresStore) ListMutationAuditEvents(ctx context.Context, filter MutationAuditFilter) ([]MutationAuditRecord, string, int, error) {
	limit := normalizeListLimit(filter.Limit)
	offset := decodeCursor(filter.Cursor)
	where, args := mutationAuditListWhere(filter)
	var total int
	if err := store.pool.QueryRow(ctx, "SELECT COUNT(*) FROM mutation_audit_events"+where, args...).Scan(&total); err != nil {
		return nil, "", 0, err
	}
	args = append(args, limit+1, offset)
	rows, err := store.pool.Query(ctx, mutationAuditSelectSQL()+where+" ORDER BY created_at DESC, id DESC LIMIT $"+fmt.Sprint(len(args)-1)+" OFFSET $"+fmt.Sprint(len(args)), args...)
	if err != nil {
		return nil, "", 0, err
	}
	defer rows.Close()
	var records []MutationAuditRecord
	for rows.Next() {
		record, err := scanMutationAudit(rows)
		if err != nil {
			return nil, "", 0, err
		}
		records = append(records, *record)
	}
	next := ""
	if len(records) > limit {
		records = records[:limit]
		next = encodeCursor(offset + limit)
	}
	return records, next, total, rows.Err()
}

func insertMutationAuditEvent(ctx context.Context, tx pgx.Tx, record MutationAuditRecord) error {
	if len(record.EventJSON) == 0 {
		record.EventJSON = mustJSON(map[string]any{})
	}
	_, err := tx.Exec(ctx, `INSERT INTO mutation_audit_events (
		event_type, target_object, target_id, event_json, created_at
	) VALUES ($1,$2,$3,$4,$5)`,
		record.EventType, record.TargetObject, record.TargetID, record.EventJSON, record.CreatedAt)
	return err
}

func scanMutationAudit(row rowScanner) (*MutationAuditRecord, error) {
	var record MutationAuditRecord
	err := row.Scan(
		&record.ID,
		&record.EventType,
		&record.TargetObject,
		&record.TargetID,
		&record.EventJSON,
		&record.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &record, nil
}

func mutationAuditSelectSQL() string {
	return `SELECT id, event_type, target_object, target_id, event_json, created_at FROM mutation_audit_events`
}

func mutationAuditListWhere(filter MutationAuditFilter) (string, []any) {
	var clauses []string
	var args []any
	add := func(sql string, value any) {
		args = append(args, value)
		clauses = append(clauses, fmt.Sprintf(sql, len(args)))
	}
	if filter.EventType != "" {
		add("event_type=$%d", filter.EventType)
	}
	if filter.TargetObject != "" {
		add("target_object=$%d", filter.TargetObject)
	}
	if filter.TargetID != "" {
		add("target_id=$%d", filter.TargetID)
	}
	if len(clauses) == 0 {
		return "", args
	}
	return " WHERE " + strings.Join(clauses, " AND "), args
}
