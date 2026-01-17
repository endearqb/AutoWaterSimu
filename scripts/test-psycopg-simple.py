#!/usr/bin/env python3
"""测试PostgreSQL驱动包 psycopg3 的导入和功能"""

def test_psycopg3_import():
    """测试 psycopg3 包的导入和基本功能"""
    
    print("🔍 测试 PostgreSQL 驱动包 psycopg3...")
    print("=" * 60)
    
    # 测试psycopg3
    try:
        import psycopg
        print("✅ psycopg (psycopg3) 导入成功")
        print(f"   版本: {psycopg.__version__}")
        print(f"   位置: {psycopg.__file__}")
        
        # 测试基本功能
        try:
            # 测试连接类是否可用
            conn_class = psycopg.Connection
            print(f"   连接类: {conn_class}")
            
            # 测试其他重要类
            cursor_class = psycopg.Cursor
            print(f"   游标类: {cursor_class}")
            
            # 测试连接函数
            connect_func = psycopg.connect
            print(f"   连接函数: {connect_func}")
            
            print("   ✅ psycopg3 功能正常")
        except Exception as e:
            print(f"   ⚠️ psycopg3 功能测试失败: {e}")
            
    except ImportError as e:
        print(f"❌ psycopg (psycopg3) 导入失败: {e}")
        print("💡 请确保已安装 psycopg[binary]")
        return False
    
    print("=" * 60)
    
    # 检查已安装的包
    try:
        import pkg_resources
        print("📦 已安装的PostgreSQL相关包:")
        for pkg in pkg_resources.working_set:
            if 'psycopg' in pkg.project_name.lower():
                print(f"   - {pkg.project_name}: {pkg.version}")
    except:
        print("⚠️ 无法检查已安装的包")
    
    return True

def test_psycopg3_connection():
    """测试 psycopg3 直接连接（不依赖配置文件）"""
    print("\n🔗 测试 psycopg3 数据库连接...")
    print("=" * 60)
    
    # 使用本地数据库配置
    test_configs = [
        {
            "name": "本地开发数据库",
            "host": "localhost",
            "port": 5432,
            "database": "my_full_stack_local",
            "user": "dataanalysis",
            "password": "11235813"
        }
    ]
    
    for config in test_configs:
        print(f"🔍 测试 {config['name']}...")
        
        # 测试psycopg3 - 使用连接字符串
        try:
            import psycopg
            conn_str = f"postgresql://{config['user']}:{config['password']}@{config['host']}:{config['port']}/{config['database']}"
            
            with psycopg.connect(conn_str, connect_timeout=5) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT version()")
                    version = cur.fetchone()[0]
                    print(f"   ✅ psycopg3 连接成功! (连接字符串方式)")
                    print(f"   📊 PostgreSQL: {version[:50]}...")
                    return True
                    
        except ImportError:
            print("   ❌ psycopg3 不可用")
        except Exception as e:
            print(f"   ❌ psycopg3 连接失败 (连接字符串): {e}")
        
        # 测试psycopg3 - 使用参数字典
        try:
            import psycopg
            
            with psycopg.connect(
                host=config['host'],
                port=config['port'],
                dbname=config['database'],  # 注意：psycopg3 使用 dbname 而不是 database
                user=config['user'],
                password=config['password'],
                connect_timeout=5
            ) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT version()")
                    version = cur.fetchone()[0]
                    print(f"   ✅ psycopg3 连接成功! (参数字典方式)")
                    print(f"   📊 PostgreSQL: {version[:50]}...")
                    return True
            
        except ImportError:
            print("   ❌ psycopg3 不可用")
        except Exception as e:
            print(f"   ❌ psycopg3 连接失败 (参数字典): {e}")
    
    return False

def show_migration_guide():
    """显示从 psycopg2 到 psycopg3 的迁移指导"""
    print("\n📚 psycopg2 → psycopg3 迁移指导:")
    print("=" * 60)
    print("🔄 导入语句变更:")
    print("   旧: import psycopg2")
    print("   新: import psycopg")
    print()
    print("🔄 连接方式变更:")
    print("   旧: psycopg2.connect(database='db', ...)")
    print("   新: psycopg.connect(dbname='db', ...)  # 注意参数名变化")
    print()
    print("🔄 上下文管理器:")
    print("   psycopg3 原生支持 with 语句，更安全")
    print("   推荐: with psycopg.connect(...) as conn:")
    print()
    print("✨ psycopg3 的优势:")
    print("   - 更好的性能")
    print("   - 原生异步支持")
    print("   - 完整的类型提示")
    print("   - 更现代的 API 设计")

if __name__ == "__main__":
    # 测试 psycopg3 导入
    import_success = test_psycopg3_import()
    
    if import_success:
        # 测试数据库连接
        connection_success = test_psycopg3_connection()
        
        if connection_success:
            print("\n✅ 所有测试通过！psycopg3 工作正常")
        else:
            print("\n⚠️ 导入成功，但数据库连接失败")
            print("   请检查数据库是否运行，配置是否正确")
    else:
        print("\n❌ psycopg3 导入失败")
        print("   请运行: uv add 'psycopg[binary]'")
    
    # 显示迁移指导
    show_migration_guide()
    
    print("\n💡 总结和建议:")
    print("=" * 60)
    print("1. ✅ 您的项目已配置使用 psycopg3 (现代版本)")
    print("2. 🔄 导入时使用: import psycopg  (不是 psycopg2)")
    print("3. 📈 psycopg3 是 psycopg2 的现代化重写版本")
    print("4. 🛠️ 旧代码需要修改导入语句和部分 API 调用")
    print("5. 📖 详细迁移指导请参考上方说明")