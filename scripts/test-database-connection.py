#!/usr/bin/env python3
"""
测试本地数据库连接
"""
import os
import sys
import logging
from pathlib import Path

# 设置项目根目录和.env文件路径
project_root = Path(__file__).parent.parent
env_file = project_root / ".env"

# 手动加载.env文件
if env_file.exists():
    with open(env_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key.strip()] = value.strip()

# 添加backend目录到Python路径
backend_dir = project_root / "backend"
sys.path.insert(0, str(backend_dir))

try:
    import psycopg
    from sqlmodel import create_engine, Session, select
    from app.core.config import settings
    from app.models import User
except ImportError as e:
    print(f"导入错误: {e}")
    print("请确保已激活虚拟环境并安装了所有依赖")
    sys.exit(1)

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_psycopg_connection():
    """测试psycopg直接连接"""
    logger.info("测试 psycopg 直接连接...")
    
    try:
        # 构建连接字符串
        conn_str = f"postgresql://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
        
        with psycopg.connect(conn_str) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT version();")
                version = cur.fetchone()[0]
                logger.info(f"PostgreSQL 版本: {version}")
                
                # 测试基本查询
                cur.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
                table_count = cur.fetchone()[0]
                logger.info(f"公共模式中的表数量: {table_count}")
                
        logger.info("✓ psycopg 连接测试通过")
        return True
        
    except Exception as e:
        logger.error(f"✗ psycopg 连接测试失败: {e}")
        return False

def test_sqlmodel_connection():
    """测试SQLModel/SQLAlchemy连接"""
    logger.info("测试 SQLModel/SQLAlchemy 连接...")
    
    try:
        # 使用应用配置的数据库URI
        engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))
        
        with Session(engine) as session:
            # 测试用户表查询
            statement = select(User)
            users = session.exec(statement).all()
            logger.info(f"用户表中的用户数量: {len(users)}")
            
            if users:
                first_user = users[0]
                logger.info(f"第一个用户: {first_user.email} (ID: {first_user.id})")
            
        logger.info("✓ SQLModel 连接测试通过")
        return True
        
    except Exception as e:
        logger.error(f"✗ SQLModel 连接测试失败: {e}")
        return False

def test_database_tables():
    """测试数据库表结构"""
    logger.info("检查数据库表结构...")
    
    try:
        conn_str = f"postgresql://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
        
        with psycopg.connect(conn_str) as conn:
            with conn.cursor() as cur:
                # 获取所有表
                cur.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    ORDER BY table_name;
                """)
                tables = cur.fetchall()
                
                logger.info("数据库表列表:")
                for table in tables:
                    logger.info(f"  - {table[0]}")
                
                # 检查关键表是否存在
                key_tables = ['user', 'item', 'alembic_version']
                existing_tables = [t[0] for t in tables]
                
                for table in key_tables:
                    if table in existing_tables:
                        logger.info(f"✓ 关键表 '{table}' 存在")
                    else:
                        logger.warning(f"⚠ 关键表 '{table}' 不存在")
        
        logger.info("✓ 数据库表结构检查完成")
        return True
        
    except Exception as e:
        logger.error(f"✗ 数据库表结构检查失败: {e}")
        return False

def main():
    """主测试函数"""
    logger.info("开始数据库连接测试...")
    logger.info(f"数据库配置:")
    logger.info(f"  服务器: {settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}")
    logger.info(f"  数据库: {settings.POSTGRES_DB}")
    logger.info(f"  用户: {settings.POSTGRES_USER}")
    logger.info("=" * 50)
    
    tests = [
        ("psycopg 直接连接", test_psycopg_connection),
        ("SQLModel 连接", test_sqlmodel_connection),
        ("数据库表结构", test_database_tables),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        logger.info(f"\n运行测试: {test_name}")
        if test_func():
            passed += 1
        logger.info("-" * 30)
    
    logger.info(f"\n测试结果总结:")
    logger.info(f"  通过: {passed}/{total}")
    
    if passed == total:
        logger.info("🎉 所有数据库连接测试通过！")
        return 0
    else:
        logger.error("❌ 部分测试失败，请检查配置")
        return 1

if __name__ == "__main__":
    sys.exit(main())