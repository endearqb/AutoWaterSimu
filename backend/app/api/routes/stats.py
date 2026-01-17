from typing import Any, Dict
from fastapi import APIRouter, Depends
from sqlmodel import func, select

from app.api.deps import SessionDep, get_current_active_superuser
from app.models import (
    User, FlowChart, MaterialBalanceJob,
    ASM1FlowChart, ASM1Job, ASM1SlimFlowChart, ASM1SlimJob,
    MaterialBalanceJobStatus
)

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/dashboard", dependencies=[Depends(get_current_active_superuser)])
def get_dashboard_stats(session: SessionDep) -> Dict[str, Any]:
    """
    获取超级用户dashboard统计数据
    只有超级用户可以访问此接口
    """
    
    # 用户统计
    total_users = session.exec(select(func.count(User.id))).one()
    active_users = session.exec(select(func.count(User.id)).where(User.is_active == True)).one()
    superusers = session.exec(select(func.count(User.id)).where(User.is_superuser == True)).one()
    
    # 按用户类型统计
    user_type_stats = session.exec(
        select(User.user_type, func.count(User.id))
        .group_by(User.user_type)
    ).all()
    
    # 任务统计
    total_material_balance_jobs = session.exec(select(func.count(MaterialBalanceJob.id))).one()
    total_asm1_jobs = session.exec(select(func.count(ASM1Job.id))).one()
    total_asm1slim_jobs = session.exec(select(func.count(ASM1SlimJob.id))).one()
    
    # 流程图统计
    total_material_balance_flowcharts = session.exec(select(func.count(FlowChart.id))).one()
    total_asm1_flowcharts = session.exec(select(func.count(ASM1FlowChart.id))).one()
    total_asm1slim_flowcharts = session.exec(select(func.count(ASM1SlimFlowChart.id))).one()
    
    # 最近注册用户（最近7天）
    from datetime import datetime, timedelta
    seven_days_ago = datetime.now() - timedelta(days=7)
    
    # 最近注册用户（最近7天）- 现在User模型有created_at字段了
    recent_users = session.exec(
        select(func.count(User.id))
        .where(User.created_at >= seven_days_ago)
    ).one()
    
    # 任务状态统计
    material_balance_status_stats = session.exec(
        select(MaterialBalanceJob.status, func.count(MaterialBalanceJob.id))
        .group_by(MaterialBalanceJob.status)
    ).all()
    
    asm1_status_stats = session.exec(
        select(ASM1Job.status, func.count(ASM1Job.id))
        .group_by(ASM1Job.status)
    ).all()
    
    asm1slim_status_stats = session.exec(
        select(ASM1SlimJob.status, func.count(ASM1SlimJob.id))
        .group_by(ASM1SlimJob.status)
    ).all()
    
    # 最活跃用户（按所有类型流程图数量）- 分别统计避免JOIN重复计数
    users_for_ranking = session.exec(select(User)).all()
    
    # 流程图创建排行榜
    flowchart_rankings = []
    for user in users_for_ranking:
        material_balance_flowchart_count = session.exec(
            select(func.count(FlowChart.id)).where(FlowChart.owner_id == user.id)
        ).one()
        asm1_flowchart_count = session.exec(
            select(func.count(ASM1FlowChart.id)).where(ASM1FlowChart.owner_id == user.id)
        ).one()
        asm1slim_flowchart_count = session.exec(
            select(func.count(ASM1SlimFlowChart.id)).where(ASM1SlimFlowChart.owner_id == user.id)
        ).one()
        
        total_flowcharts = material_balance_flowchart_count + asm1_flowchart_count + asm1slim_flowchart_count
        if total_flowcharts > 0:
            flowchart_rankings.append((user.full_name, user.email, total_flowcharts))
    
    # 按流程图总数排序，取前5名
    top_users_by_flowcharts = sorted(flowchart_rankings, key=lambda x: x[2], reverse=True)[:5]
    
    # 任务创建排行榜
    task_rankings = []
    for user in users_for_ranking:
        material_balance_count = session.exec(
            select(func.count(MaterialBalanceJob.id)).where(MaterialBalanceJob.owner_id == user.id)
        ).one()
        asm1_job_count = session.exec(
            select(func.count(ASM1Job.id)).where(ASM1Job.owner_id == user.id)
        ).one()
        asm1slim_job_count = session.exec(
            select(func.count(ASM1SlimJob.id)).where(ASM1SlimJob.owner_id == user.id)
        ).one()
        
        total_tasks = material_balance_count + asm1_job_count + asm1slim_job_count
        if total_tasks > 0:
            task_rankings.append((user.full_name, user.email, total_tasks))
    
    # 按任务总数排序，取前5名
    top_users_by_tasks = sorted(task_rankings, key=lambda x: x[2], reverse=True)[:5]
    
    return {
        "user_stats": {
            "total_users": total_users,
            "active_users": active_users,
            "superusers": superusers,
            "recent_users": recent_users,
            "user_type_distribution": {
                user_type: count for user_type, count in user_type_stats
            }
        },
        "content_stats": {
            "flowcharts": {
                "material_balance": total_material_balance_flowcharts,
                "asm1": total_asm1_flowcharts,
                "asm1slim": total_asm1slim_flowcharts,
                "total": total_material_balance_flowcharts + total_asm1_flowcharts + total_asm1slim_flowcharts
            },
            "jobs": {
                "material_balance": total_material_balance_jobs,
                "asm1": total_asm1_jobs,
                "asm1slim": total_asm1slim_jobs,
                "total": total_material_balance_jobs + total_asm1_jobs + total_asm1slim_jobs
            }
        },
        "job_status_stats": {
            "material_balance": {
                status.value if hasattr(status, 'value') else str(status): count 
                for status, count in material_balance_status_stats
            },
            "asm1": {
                status.value if hasattr(status, 'value') else str(status): count 
                for status, count in asm1_status_stats
            },
            "asm1slim": {
                status.value if hasattr(status, 'value') else str(status): count 
                for status, count in asm1slim_status_stats
            }
        },
        "activity_stats": {
            "top_users_by_flowcharts": [
                {
                    "name": name or email,
                    "email": email,
                    "flowchart_count": count
                }
                for name, email, count in top_users_by_flowcharts
            ],
            "top_users_by_tasks": [
                {
                    "name": name or email,
                    "email": email,
                    "task_count": count
                }
                for name, email, count in top_users_by_tasks
            ]
        }
    }


@router.get("/users", dependencies=[Depends(get_current_active_superuser)])
def get_user_stats(session: SessionDep) -> Dict[str, Any]:
    """
    获取详细的用户统计信息
    """
    
    # 按月统计用户注册
    from datetime import datetime
    from sqlmodel import extract
    
    monthly_registrations = session.exec(
        select(
            extract('year', User.created_at).label('year'),
            extract('month', User.created_at).label('month'),
            func.count(User.id).label('count')
        )
        .group_by(extract('year', User.created_at), extract('month', User.created_at))
        .order_by(extract('year', User.created_at), extract('month', User.created_at))
    ).all()
    
    # 用户活跃度统计 - 分别统计各类型避免JOIN重复计数
    # 首先获取所有用户基本信息
    users = session.exec(select(User)).all()
    
    user_activity = []
    for user in users:
        # 分别统计每种类型的数量
        material_balance_flowchart_count = session.exec(
            select(func.count(FlowChart.id)).where(FlowChart.owner_id == user.id)
        ).one()
        
        material_balance_count = session.exec(
            select(func.count(MaterialBalanceJob.id)).where(MaterialBalanceJob.owner_id == user.id)
        ).one()
        
        asm1_flowchart_count = session.exec(
            select(func.count(ASM1FlowChart.id)).where(ASM1FlowChart.owner_id == user.id)
        ).one()
        
        asm1_job_count = session.exec(
            select(func.count(ASM1Job.id)).where(ASM1Job.owner_id == user.id)
        ).one()
        
        asm1slim_flowchart_count = session.exec(
            select(func.count(ASM1SlimFlowChart.id)).where(ASM1SlimFlowChart.owner_id == user.id)
        ).one()
        
        asm1slim_job_count = session.exec(
            select(func.count(ASM1SlimJob.id)).where(ASM1SlimJob.owner_id == user.id)
        ).one()
        
        user_activity.append((
            user.id, user.full_name, user.email, user.user_type, user.is_active, user.created_at,
            material_balance_flowchart_count, material_balance_count, asm1_flowchart_count, 
            asm1_job_count, asm1slim_flowchart_count, asm1slim_job_count
        ))
    
    # 按总活跃度排序
    user_activity.sort(key=lambda x: x[6] + x[7] + x[8] + x[9] + x[10] + x[11], reverse=True)
    
    return {
        "monthly_registrations": [
            {
                "year": int(year),
                "month": int(month),
                "count": count,
                "date": f"{int(year)}-{int(month):02d}"
            }
            for year, month, count in monthly_registrations
        ],
        "user_activity": [
            {
                "id": str(user_id),
                "name": name or email,
                "email": email,
                "user_type": user_type,
                "is_active": is_active,
                "created_at": created_at.isoformat() if created_at else None,
                "activity": {
                    "flowcharts": material_balance_flowchart_count + asm1_flowchart_count + asm1slim_flowchart_count,
                    "jobs": material_balance_count + asm1_job_count + asm1slim_job_count,
                    "material_balance_flowcharts": material_balance_flowchart_count,
                    "material_balance_jobs": material_balance_count,
                    "asm1_flowcharts": asm1_flowchart_count,
                    "asm1_jobs": asm1_job_count,
                    "asm1slim_flowcharts": asm1slim_flowchart_count,
                    "asm1slim_jobs": asm1slim_job_count,
                    "total": (
                        material_balance_flowchart_count + material_balance_count + 
                        asm1_flowchart_count + asm1_job_count + 
                        asm1slim_flowchart_count + asm1slim_job_count
                    )
                }
            }
            for (
                user_id, name, email, user_type, is_active, created_at,
                material_balance_flowchart_count, material_balance_count, 
                asm1_flowchart_count, asm1_job_count,
                asm1slim_flowchart_count, asm1slim_job_count
            ) in user_activity
        ]
    }