#!/usr/bin/env python3
"""
简化的数据库连接测试脚本
测试不使用密码的 trust 认证连接
"""

import psycopg

def test_simple_connection():
    """测试简单的数据库连接（不使用密码）"""
    print("=== 简化数据库连接测试 ===")
    
    try:
        # 使用连接字符串，不包含密码
        conn_string = "host=127.0.0.1 port=5433 dbname=dataanalysis_local user=postgres"
        
        print(f"🔌 尝试连接到: 127.0.0.1:5433/dataanalysis_local")
        print(f"   用户: postgres")
        print(f"   认证方式: trust (无密码)")
        print(f"   连接字符串: {conn_string}")
        
        with psycopg.connect(conn_string) as conn:
            with conn.cursor() as cur:
                # 测试基本查询
                cur.execute("SELECT version();")
                version = cur.fetchone()[0]
                print(f"✅ 连接成功！PostgreSQL 版本: {version}")
                
                # 测试数据库信息
                cur.execute("SELECT current_database(), current_user;")
                db_info = cur.fetchone()
                print(f"   当前数据库: {db_info[0]}")
                print(f"   当前用户: {db_info[1]}")
                
                return True
                
    except Exception as e:
        print(f"❌ 连接失败: {e}")
        return False

if __name__ == "__main__":
    success = test_simple_connection()
    exit(0 if success else 1)