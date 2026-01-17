#!/usr/bin/env python3
"""
导出ASM1Job表中的result_data数据到JSON文件
每条记录的result_data将保存为单独的JSON文件到todos文件夹中
"""

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Optional

from sqlmodel import Session, create_engine, select

# 导入模型和配置
from app.core.config import settings
from app.models import ASM1Job


def export_asm1job_results():
    """
    导出ASM1Job表中所有记录的result_data到JSON文件
    """
    # 创建数据库引擎
    engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))
    
    # 确保todos文件夹存在
    todos_dir = Path("todos")
    todos_dir.mkdir(exist_ok=True)
    
    exported_count = 0
    skipped_count = 0
    
    try:
        with Session(engine) as session:
            # 查询所有ASM1Job记录
            statement = select(ASM1Job)
            jobs = session.exec(statement).all()
            
            print(f"找到 {len(jobs)} 条ASM1Job记录")
            
            for job in jobs:
                # 检查是否有result_data
                if job.result_data is None:
                    print(f"跳过记录 {job.job_id}: 没有result_data")
                    skipped_count += 1
                    continue
                
                # 生成文件名
                # 使用job_id和创建时间来生成唯一的文件名
                timestamp = job.created_at.strftime("%Y%m%d_%H%M%S")
                filename = f"asm1job_{job.job_id}_{timestamp}.json"
                filepath = todos_dir / filename
                
                # 准备导出的数据
                export_data = {
                    "job_info": {
                        "id": str(job.id),
                        "job_id": job.job_id,
                        "job_name": job.job_name,
                        "status": job.status.value if job.status else None,
                        "created_at": job.created_at.isoformat() if job.created_at else None,
                        "started_at": job.started_at.isoformat() if job.started_at else None,
                        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
                        "owner_id": str(job.owner_id)
                    },
                    "result_data": job.result_data
                }
                
                # 写入JSON文件
                try:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        json.dump(export_data, f, ensure_ascii=False, indent=2)
                    
                    print(f"已导出: {filename}")
                    exported_count += 1
                    
                except Exception as e:
                    print(f"导出失败 {filename}: {str(e)}")
                    
    except Exception as e:
        print(f"数据库连接或查询失败: {str(e)}")
        return
    
    print(f"\n导出完成!")
    print(f"成功导出: {exported_count} 个文件")
    print(f"跳过记录: {skipped_count} 个")
    print(f"文件保存位置: {todos_dir.absolute()}")


if __name__ == "__main__":
    print("开始导出ASM1Job结果数据...")
    export_asm1job_results()
    print("导出完成!")