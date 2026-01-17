#!/usr/bin/env python3
"""
测试 psycopg3 迁移后的数据库功能
验证数据库连接、查询和 SQLAlchemy 集成
"""

import sys
import os
import logging
from typing import Any, Dict

# 添加项目根目录到 Python 路径
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

# 设置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_psycopg3_direct_connection():
    """测试 psycopg3 直接连接"""
    try:
        import psycopg
        logger.info("✓ psycopg3 导入成功")
        
        # 测试连接参数
        conn_params = {
            'host': 'localhost',
            'port': 5432,
            'dbname': 'dataanalysis',
            'user': 'dataanalysis',
            'password': 'dataanalysis123'
        }
        
        # 尝试连接
        with psycopg.connect(**conn_params) as conn:
            with conn.cursor() as cur:
                # 测试基本查询
                cur.execute("SELECT version();")
                version = cur.fetchone()[0]
                logger.info(f"✓ PostgreSQL 版本: {version}")
                
                # 测试当前数据库
                cur.execute("SELECT current_database();")
                db_name = cur.fetchone()[0]
                logger.info(f"✓ 当前数据库: {db_name}")
                
                # 测试表列表
                cur.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public'
                    ORDER BY table_name;
                """)
                tables = cur.fetchall()
                logger.info(f"✓ 找到 {len(tables)} 个表")
                for table in tables[:5]:  # 显示前5个表
                    logger.info(f"  - {table[0]}")
                
        return True
        
    except Exception as e:
        logger.error(f"✗ psycopg3 直接连接失败: {e}")
        return False

def test_sqlalchemy_connection():
    """测试 SQLAlchemy 与 psycopg3 的集成"""
    try:
        from sqlalchemy import create_engine, text
        from sqlalchemy.orm import sessionmaker
        
        # 构建连接字符串 (使用 psycopg3)
        database_url = "postgresql+psycopg://dataanalysis:dataanalysis123@localhost:5432/dataanalysis"
        
        # 创建引擎
        engine = create_engine(database_url, echo=False)
        
        # 测试连接
        with engine.connect() as conn:
            # 测试基本查询
            result = conn.execute(text("SELECT version();"))
            version = result.fetchone()[0]
            logger.info(f"✓ SQLAlchemy + psycopg3 连接成功")
            logger.info(f"✓ PostgreSQL 版本: {version}")
            
            # 测试表计数
            result = conn.execute(text("""
                SELECT COUNT(*) 
                FROM information_schema.tables 
                WHERE table_schema = 'public';
            """))
            table_count = result.fetchone()[0]
            logger.info(f"✓ 公共模式中有 {table_count} 个表")
            
        return True
        
    except Exception as e:
        logger.error(f"✗ SQLAlchemy 连接失败: {e}")
        return False

def test_backend_models():
    """测试后端模型和数据库操作"""
    try:
        # 导入后端配置和模型
        from backend.app.core.config import settings
        from backend.app.core.db import engine
        from sqlmodel import Session, select, func
        
        logger.info(f"✓ 后端配置加载成功")
        logger.info(f"✓ 数据库 URL: {settings.SQLALCHEMY_DATABASE_URI}")
        
        # 测试数据库连接
        with Session(engine) as session:
            # 测试基本查询
            result = session.exec(select(func.version())).first()
            logger.info(f"✓ 后端数据库连接成功")
            logger.info(f"✓ PostgreSQL 版本: {result}")
            
            # 尝试导入和测试用户模型
            try:
                from backend.app.models import User
                user_count = session.exec(select(func.count(User.id))).first()
                logger.info(f"✓ 用户表查询成功，共有 {user_count} 个用户")
            except Exception as e:
                logger.warning(f"⚠ 用户表查询失败: {e}")
            
            # 尝试导入和测试其他模型
            try:
                from backend.app.models import FlowChart, MaterialBalanceJob
                flowchart_count = session.exec(select(func.count(FlowChart.id))).first()
                job_count = session.exec(select(func.count(MaterialBalanceJob.id))).first()
                logger.info(f"✓ FlowChart 表查询成功，共有 {flowchart_count} 个流程图")
                logger.info(f"✓ MaterialBalanceJob 表查询成功，共有 {job_count} 个作业")
            except Exception as e:
                logger.warning(f"⚠ 其他表查询失败: {e}")
                
        return True
        
    except Exception as e:
        logger.error(f"✗ 后端模型测试失败: {e}")
        return False

def test_complex_queries():
    """测试复杂查询，特别是可能导致 SQL 语法错误的查询"""
    try:
        from backend.app.core.db import engine
        from sqlmodel import Session, select, func
        from backend.app.models import User, FlowChart, MaterialBalanceJob
        
        with Session(engine) as session:
            # 测试用户活跃度统计（避免之前的 ORDER BY 错误）
            users = session.exec(select(User)).all()
            logger.info(f"✓ 获取到 {len(users)} 个用户")
            
            if users:
                # 测试单个用户的统计
                user = users[0]
                flowchart_count = session.exec(
                    select(func.count(FlowChart.id)).where(FlowChart.owner_id == user.id)
                ).one()
                
                job_count = session.exec(
                    select(func.count(MaterialBalanceJob.id)).where(MaterialBalanceJob.owner_id == user.id)
                ).one()
                
                logger.info(f"✓ 用户 {user.email} 的统计:")
                logger.info(f"  - FlowChart 数量: {flowchart_count}")
                logger.info(f"  - MaterialBalanceJob 数量: {job_count}")
                
            # 测试月度注册统计
            from sqlmodel import extract
            monthly_stats = session.exec(
                select(
                    extract('year', User.created_at).label('year'),
                    extract('month', User.created_at).label('month'),
                    func.count(User.id).label('count')
                )
                .group_by(extract('year', User.created_at), extract('month', User.created_at))
                .order_by(extract('year', User.created_at), extract('month', User.created_at))
            ).all()
            
            logger.info(f"✓ 月度注册统计查询成功，共 {len(monthly_stats)} 个月份")
            
        return True
        
    except Exception as e:
        logger.error(f"✗ 复杂查询测试失败: {e}")
        return False

def main():
    """主测试函数"""
    logger.info("开始测试 psycopg3 迁移后的数据库功能")
    logger.info("=" * 60)
    
    tests = [
        ("psycopg3 直接连接", test_psycopg3_direct_connection),
        ("SQLAlchemy 集成", test_sqlalchemy_connection),
        ("后端模型", test_backend_models),
        ("复杂查询", test_complex_queries),
    ]
    
    results = {}
    for test_name, test_func in tests:
        logger.info(f"\n测试: {test_name}")
        logger.info("-" * 40)
        try:
            results[test_name] = test_func()
        except Exception as e:
            logger.error(f"测试 {test_name} 出现异常: {e}")
            results[test_name] = False
    
    # 总结
    logger.info("\n" + "=" * 60)
    logger.info("测试结果总结:")
    
    passed = 0
    total = len(tests)
    
    for test_name, result in results.items():
        status = "✓ 通过" if result else "✗ 失败"
        logger.info(f"  {test_name}: {status}")
        if result:
            passed += 1
    
    logger.info(f"\n总计: {passed}/{total} 个测试通过")
    
    if passed == total:
        logger.info("🎉 所有测试通过！psycopg3 迁移成功！")
        return True
    else:
        logger.warning(f"⚠ 有 {total - passed} 个测试失败，需要进一步检查")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)