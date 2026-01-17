#!/usr/bin/env python3
"""
本地数据库连接测试脚本
用于验证本地 PostgreSQL 数据库的连接和基本功能
"""

import sys
import os
import logging
import time
from pathlib import Path

# 添加backend目录到Python路径
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

try:
    import psycopg
    from sqlalchemy import create_engine, text
    from sqlalchemy.orm import sessionmaker
    from app.core.config import settings
    from app.core.db import engine
    
    def test_environment_config():
        """测试环境配置"""
        print("🔧 测试环境配置...")
        
        try:
            print(f"   环境: {settings.ENVIRONMENT}")
            print(f"   项目名称: {settings.PROJECT_NAME}")
            print(f"   数据库服务器: {settings.POSTGRES_SERVER}")
            print(f"   数据库名称: {settings.POSTGRES_DB}")
            print(f"   数据库用户: {settings.POSTGRES_USER}")
            print(f"   是否本地环境: {getattr(settings, 'is_local_environment', 'N/A')}")
            print(f"   调试模式: {getattr(settings, 'DEBUG', 'N/A')}")
            print("✅ 环境配置正常")
            return True
        except Exception as e:
            print(f"❌ 环境配置错误: {e}")
            return False

    def test_psycopg_direct_connection():
        """测试 psycopg 直接连接"""
        print("🔌 测试 psycopg 直接连接...")
        
        try:
            conn_params = {
                "host": settings.POSTGRES_SERVER,
                "port": settings.POSTGRES_PORT,
                "dbname": settings.POSTGRES_DB,
                "user": settings.POSTGRES_USER,
                "password": settings.POSTGRES_PASSWORD,
            }
            
            with psycopg.connect(**conn_params) as conn:
                with conn.cursor() as cur:
                    # 测试基本查询
                    cur.execute("SELECT version();")
                    version = cur.fetchone()[0]
                    print(f"   PostgreSQL 版本: {version}")
                    
                    # 测试数据库信息
                    cur.execute("SELECT current_database(), current_user, current_timestamp;")
                    db_info = cur.fetchone()
                    print(f"   当前数据库: {db_info[0]}")
                    print(f"   当前用户: {db_info[1]}")
                    print(f"   当前时间: {db_info[2]}")
                    
                    # 测试扩展
                    cur.execute("SELECT extname FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto');")
                    extensions = [row[0] for row in cur.fetchall()]
                    print(f"   已安装扩展: {extensions}")
                    
            print("✅ psycopg 直接连接成功")
            return True
        except Exception as e:
            print(f"❌ psycopg 直接连接失败: {e}")
            return False

    def test_sqlalchemy_connection():
        """测试 SQLAlchemy 连接"""
        print("🔗 测试 SQLAlchemy 连接...")
        
        try:
            # 测试连接
            with engine.connect() as conn:
                # 测试基本查询
                result = conn.execute(text("SELECT 1 as test_value"))
                test_value = result.fetchone()[0]
                print(f"   测试查询结果: {test_value}")
                
                # 测试数据库信息
                result = conn.execute(text("SELECT current_database(), current_user"))
                db_info = result.fetchone()
                print(f"   数据库: {db_info[0]}, 用户: {db_info[1]}")
                
            print("✅ SQLAlchemy 连接成功")
            return True
        except Exception as e:
            print(f"❌ SQLAlchemy 连接失败: {e}")
            return False

    def test_database_tables():
        """测试数据库表结构"""
        print("📋 测试数据库表结构...")
        
        try:
            with engine.connect() as conn:
                # 查询所有表
                result = conn.execute(text("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    ORDER BY table_name
                """))
                tables = [row[0] for row in result.fetchall()]
                
                if tables:
                    print(f"   找到 {len(tables)} 个表:")
                    for table in tables:
                        print(f"     - {table}")
                else:
                    print("   ⚠️ 未找到任何表 (可能需要运行迁移)")
                
                # 查询 Alembic 版本表
                try:
                    result = conn.execute(text("SELECT version_num FROM alembic_version"))
                    version = result.fetchone()
                    if version:
                        print(f"   Alembic 版本: {version[0]}")
                    else:
                        print("   ⚠️ 未找到 Alembic 版本信息")
                except Exception:
                    print("   ⚠️ Alembic 版本表不存在")
                    
            print("✅ 数据库表结构检查完成")
            return True
        except Exception as e:
            print(f"❌ 数据库表结构检查失败: {e}")
            return False

    def test_database_performance():
        """测试数据库性能"""
        print("⚡ 测试数据库性能...")
        
        try:
            with engine.connect() as conn:
                # 测试简单查询性能
                start_time = time.time()
                for _ in range(10):
                    conn.execute(text("SELECT 1"))
                end_time = time.time()
                
                avg_time = (end_time - start_time) / 10 * 1000  # 转换为毫秒
                print(f"   平均查询时间: {avg_time:.2f} ms")
                
                if avg_time < 10:
                    print("   ✅ 查询性能良好")
                elif avg_time < 50:
                    print("   ⚠️ 查询性能一般")
                else:
                    print("   ❌ 查询性能较差")
                    
            print("✅ 数据库性能测试完成")
            return True
        except Exception as e:
            print(f"❌ 数据库性能测试失败: {e}")
            return False

    def main():
        """主函数"""
        print("=== 本地数据库连接测试 ===")
        print()
        
        tests = [
            ("环境配置", test_environment_config),
            ("psycopg 直接连接", test_psycopg_direct_connection),
            ("SQLAlchemy 连接", test_sqlalchemy_connection),
            ("数据库表结构", test_database_tables),
            ("数据库性能", test_database_performance),
        ]
        
        results = []
        
        for test_name, test_func in tests:
            try:
                result = test_func()
                results.append((test_name, result))
            except Exception as e:
                print(f"❌ {test_name} 测试异常: {e}")
                results.append((test_name, False))
            print()
        
        # 汇总结果
        print("=== 测试结果汇总 ===")
        passed = 0
        total = len(results)
        
        for test_name, result in results:
            status = "✅ 通过" if result else "❌ 失败"
            print(f"{test_name}: {status}")
            if result:
                passed += 1
        
        print()
        print(f"总计: {passed}/{total} 个测试通过")
        
        if passed == total:
            print("🎉 所有测试通过！本地数据库配置正常。")
            return 0
        else:
            print("⚠️ 部分测试失败，请检查配置和数据库状态。")
            return 1

    if __name__ == "__main__":
        sys.exit(main())
            
except ImportError as e:
    print(f"❌ 导入错误: {e}")
    print("请确保在backend目录下运行此脚本，并且虚拟环境已激活")
    sys.exit(1)