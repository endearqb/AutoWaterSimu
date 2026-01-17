-- 数据库初始化脚本
-- 用于本地开发环境的 PostgreSQL 数据库初始化

-- 创建必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 设置时区
SET timezone = 'UTC';

-- 创建开发用户权限 (如果需要额外用户)
-- CREATE USER dev_user WITH PASSWORD 'dev_password';
-- GRANT ALL PRIVILEGES ON DATABASE dataanalysis_local TO dev_user;

-- 确保 postgres 用户有完整权限
GRANT ALL PRIVILEGES ON DATABASE dataanalysis_local TO postgres;

-- 创建基础 schema (如果需要)
-- CREATE SCHEMA IF NOT EXISTS analytics;
-- CREATE SCHEMA IF NOT EXISTS material_balance;

-- 设置默认权限
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;

-- 输出初始化完成信息
DO $$
BEGIN
    RAISE NOTICE '数据库初始化完成 - dataanalysis_local';
    RAISE NOTICE '时区设置: %', current_setting('timezone');
    RAISE NOTICE '数据库版本: %', version();
END $$;