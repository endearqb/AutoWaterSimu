CREATE TABLE IF NOT EXISTS udm_models (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    tags_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    current_version INTEGER NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT false,
    source_system TEXT NOT NULL,
    requested_by TEXT NOT NULL,
    tenant_id TEXT,
    project_id TEXT,
    site_id TEXT,
    metadata_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_udm_models_scope_updated
    ON udm_models(tenant_id, project_id, site_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS udm_model_versions (
    id TEXT PRIMARY KEY,
    model_id TEXT NOT NULL REFERENCES udm_models(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    content_hash TEXT NOT NULL,
    parameter_hash TEXT NOT NULL,
    components_json JSONB NOT NULL,
    parameters_json JSONB NOT NULL,
    processes_json JSONB NOT NULL,
    meta_json JSONB,
    validation_ok BOOLEAN NOT NULL,
    validation_errors_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    seed_source TEXT,
    source_system TEXT NOT NULL,
    requested_by TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    tenant_id TEXT,
    project_id TEXT,
    site_id TEXT,
    metadata_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(model_id, version)
);

CREATE INDEX IF NOT EXISTS idx_udm_model_versions_model_version
    ON udm_model_versions(model_id, version DESC);

CREATE TABLE IF NOT EXISTS udm_hybrid_configs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    hybrid_config_json JSONB NOT NULL,
    parameter_hash TEXT NOT NULL,
    validation_json JSONB,
    source_system TEXT NOT NULL,
    requested_by TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    tenant_id TEXT,
    project_id TEXT,
    site_id TEXT,
    metadata_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_udm_hybrid_configs_scope_updated
    ON udm_hybrid_configs(tenant_id, project_id, site_id, updated_at DESC);
