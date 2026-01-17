#!/usr/bin/env python3
"""测试psycopg3数据库连接"""

import sys
import os
from pathlib import Path

# 添加backend目录到Python路径
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

def test_psycopg3_connection():
    """测试psycopg3连接"""
    try:
        import psycopg
        print("✅ psycopg3 导入成功")
        print(f"📊 psycopg版本: {psycopg.__version__}")
        
        # 测试基本连接功能
        from app.core.config import settings
        
        # 构建连接字符串
        db_url = str(settings.SQLALCHEMY_DATABASE_URI)
        print(f"🔗 数据库连接字符串: {db_url}")
        
        # 使用psycopg3连接
        with psycopg.connect(db_url) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT version()")
                version = cur.fetchone()[0]
                print(f"✅ psycopg3连接成功!")
                print(f"📊 PostgreSQL版本: {version}")
                
                # 测试表查询
                cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
                tables = cur.fetchall()
                print(f"📋 数据库表数量: {len(tables)}")
                if tables:
                    print("📋 表列表:")
                    for table in tables[:5]:  # 只显示前5个表
                        print(f"   - {table[0]}")
                
        return True
        
    except ImportError as e:
        print(f"❌ psycopg3导入失败: {e}")
        return False
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")
        return False

def test_project_configuration():
    """测试项目配置是否正确"""
    print("\n🔧 检查项目配置...")
    
    try:
        # 检查 pyproject.toml 中的依赖
        import tomllib
        pyproject_path = Path(__file__).parent.parent / "backend" / "pyproject.toml"
        
        if pyproject_path.exists():
            with open(pyproject_path, "rb") as f:
                config = tomllib.load(f)
            
            dependencies = config.get("project", {}).get("dependencies", [])
            psycopg_deps = [dep for dep in dependencies if "psycopg" in dep.lower()]
            
            print("📦 项目依赖配置:")
            for dep in psycopg_deps:
                print(f"   - {dep}")
            
            if any("psycopg[" in dep for dep in psycopg_deps):
                print("✅ 项目正确配置了 psycopg3")
                return True
            else:
                print("⚠️ 未找到 psycopg3 配置")
                return False
        else:
            print("❌ 未找到 pyproject.toml 文件")
            return False
            
    except Exception as e:
        print(f"⚠️ 配置检查失败: {e}")
        return False

if __name__ == "__main__":
    print("🚀 开始 PostgreSQL psycopg3 驱动测试...")
    print("=" * 60)
    
    # 测试项目配置
    print("1️⃣ 检查项目配置:")
    config_success = test_project_configuration()
    
    print("\n" + "=" * 60)
    
    # 测试psycopg3
    print("2️⃣ 测试 psycopg3 连接:")
    psycopg3_success = test_psycopg3_connection()
    
    print("\n" + "=" * 60)
    print("📋 测试总结:")
    
    if config_success and psycopg3_success:
        print("🎉 完美！项目配置正确，psycopg3 工作正常")
        print("💡 使用方式: import psycopg")
        print("📚 API 文档: https://www.psycopg.org/psycopg3/docs/")
    elif config_success and not psycopg3_success:
        print("⚠️ 配置正确，但连接失败")
        print("🔍 请检查数据库是否运行，环境变量是否设置")
    elif not config_success and psycopg3_success:
        print("⚠️ 连接成功，但配置可能有问题")
        print("🔍 请检查 pyproject.toml 中的依赖配置")
    else:
        print("❌ 配置和连接都有问题")
        print("🛠️ 请运行: uv add 'psycopg[binary]'")
        print("🔍 然后检查数据库配置和环境变量")
    
    print("\n💡 迁移提示:")
    print("   如果您的代码中有 'import psycopg2'")
    print("   请改为 'import psycopg'")
    print("   并注意 API 的细微差异（如 database → dbname）")