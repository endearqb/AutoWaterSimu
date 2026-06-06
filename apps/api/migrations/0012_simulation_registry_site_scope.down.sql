ALTER TABLE simulation_inputs
    DROP COLUMN IF EXISTS site_id;

ALTER TABLE process_graphs
    DROP COLUMN IF EXISTS site_id;
