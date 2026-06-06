ALTER TABLE process_graphs
    ADD COLUMN IF NOT EXISTS site_id TEXT;

ALTER TABLE simulation_inputs
    ADD COLUMN IF NOT EXISTS site_id TEXT;
