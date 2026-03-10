-- Database initialization script for local PostgreSQL development.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

SET timezone = 'UTC';

-- CREATE USER dev_user WITH PASSWORD 'dev_password';
-- GRANT ALL PRIVILEGES ON DATABASE autowatersimu TO dev_user;

GRANT ALL PRIVILEGES ON DATABASE autowatersimu TO postgres;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;

DO $$
BEGIN
    RAISE NOTICE 'Database initialized - autowatersimu';
    RAISE NOTICE 'Timezone: %', current_setting('timezone');
    RAISE NOTICE 'PostgreSQL version: %', version();
END $$;
