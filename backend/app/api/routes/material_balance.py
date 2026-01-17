from typing import Any, Dict, List, Optional
from uuid import uuid4
import asyncio
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlmodel import Session, select

from app.api.deps import (
    CurrentUser,
    SessionDep,
    get_current_active_superuser,
)
from app.models import (
    MaterialBalanceInput,
    MaterialBalanceResult,
    MaterialBalanceResultSummary,
    MaterialBalanceTimeSeriesQuery,
    MaterialBalanceTimeSeriesResponse,
    MaterialBalanceValidationRequest,
    MaterialBalanceValidationResponse,
    MaterialBalanceJob,
    MaterialBalanceJobPublic,
    MaterialBalanceJobsPublic,
    MaterialBalanceJobInputDataResponse,
    MaterialBalanceJobStatus,
    Message,
)
from app.services.material_balance_service import MaterialBalanceService
from app.services.data_conversion_service import DataConversionService

router = APIRouter()

# Initialize services
material_balance_service = MaterialBalanceService()
data_conversion_service = DataConversionService()


@router.post("/calculate", response_model=MaterialBalanceJobPublic)
def create_calculation_job(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    background_tasks: BackgroundTasks,
    calculation_input: MaterialBalanceInput,
) -> Any:
    """
    创建物料平衡计算任务
    """
    # Generate unique job ID
    job_id = str(uuid4())
    
    # Generate job name with timestamp
    current_time = datetime.now().strftime("%Y%m%d%H%M")
    job_name = f"unknown_{current_time}"
    
    # Create job record
    # 如果calculation_input包含original_flowchart_data，优先保存原始流程图数据
    if calculation_input.original_flowchart_data:
        input_data = calculation_input.original_flowchart_data
    else:
        input_data = calculation_input.model_dump()
    
    job = MaterialBalanceJob(
        job_id=job_id,
        job_name=job_name,
        status=MaterialBalanceJobStatus.pending,
        input_data=input_data,
        owner_id=current_user.id,
    )
    
    session.add(job)
    session.commit()
    session.refresh(job)
    
    # Start background calculation
    background_tasks.add_task(
        material_balance_service.run_calculation,
        session,
        job_id,
        calculation_input
    )
    
    return MaterialBalanceJobPublic(
        id=job.id,
        job_id=job.job_id,
        job_name=job.job_name,
        status=job.status,
        created_at=job.created_at,
        started_at=job.started_at,
        completed_at=job.completed_at,
        error_message=job.error_message,
    )


@router.post("/calculate-from-flowchart", response_model=MaterialBalanceJobPublic)
def create_calculation_job_from_flowchart(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    background_tasks: BackgroundTasks,
    flowchart_data: Dict[str, Any],
) -> Any:
    """
    从流程图数据创建物料平衡计算任务
    """
    try:
        # 调试：打印接收到的数据结构
        print(f"\n=== 接收到的flowchart_data ===")
        print(f"顶级字段: {list(flowchart_data.keys())}")
        
        if 'nodes' in flowchart_data:
            print(f"节点数量: {len(flowchart_data['nodes'])}")
            if flowchart_data['nodes']:
                first_node = flowchart_data['nodes'][0]
                print(f"第一个节点: {first_node.get('id', 'N/A')}, 类型: {first_node.get('type', 'N/A')}")
                print(f"节点数据字段: {list(first_node.get('data', {}).keys())}")
        
        if 'edges' in flowchart_data:
            print(f"边数量: {len(flowchart_data['edges'])}")
            if flowchart_data['edges']:
                first_edge = flowchart_data['edges'][0]
                print(f"第一条边: {first_edge.get('id', 'N/A')}")
                print(f"边数据字段: {list(first_edge.get('data', {}).keys())}")
        
        if 'customParameters' in flowchart_data:
            print(f"自定义参数数量: {len(flowchart_data['customParameters'])}")
        
        if 'calculationParameters' in flowchart_data:
            print(f"计算参数: {flowchart_data['calculationParameters']}")
        
        print("=== 开始转换数据 ===")
        
        # 转换flowchart数据为MaterialBalanceInput格式
        calculation_input = data_conversion_service.convert_flowchart_to_material_balance_input(
            flowchart_data=flowchart_data,
            calculation_params=flowchart_data.get('calculationParameters')
        )
        
        print(f"=== 数据转换成功，开始创建任务 ===")
        
        # Generate unique job ID
        job_id = str(uuid4())
        
        # Generate job name from flowchart name and timestamp
        current_time = datetime.now().strftime("%Y%m%d%H%M")
        flowchart_name = flowchart_data.get('name', 'unknown')
        if not flowchart_name or flowchart_name.strip() == '':
            flowchart_name = 'unknown'
        job_name = f"{flowchart_name}_{current_time}"
        
        # 尝试序列化calculation_input
        try:
            input_data_dict = calculation_input.model_dump()
            print(f"calculation_input序列化成功")
        except Exception as e:
            print(f"calculation_input序列化失败: {type(e).__name__}: {str(e)}")
            if hasattr(e, 'errors'):
                print(f"序列化错误详情:")
                for error in e.errors():
                    print(f"  - 字段: {error.get('loc', 'unknown')}")
                    print(f"    错误类型: {error.get('type', 'unknown')}")
                    print(f"    错误信息: {error.get('msg', 'unknown')}")
            raise
        
        # Create job record
        try:
            print(f"=== 开始创建数据库记录 ===")
            job = MaterialBalanceJob(
                job_id=job_id,
                job_name=job_name,
                status=MaterialBalanceJobStatus.pending,
                input_data=flowchart_data,
                owner_id=current_user.id,
            )
            print(f"MaterialBalanceJob对象创建成功")
            
            session.add(job)
            print(f"已添加到session")
            
            session.commit()
            print(f"数据库提交成功")
            
            session.refresh(job)
            print(f"数据库记录刷新成功，job.id={job.id}")
            
        except Exception as db_error:
            print(f"数据库操作失败: {type(db_error).__name__}: {str(db_error)}")
            session.rollback()
            raise
        
        # Start background calculation
        try:
            print(f"=== 开始启动后台计算任务 ===")
            background_tasks.add_task(
                material_balance_service.run_calculation,
                session,
                job_id,
                calculation_input
            )
            print(f"后台任务启动成功")
        except Exception as task_error:
            print(f"后台任务启动失败: {type(task_error).__name__}: {str(task_error)}")
            raise
        
        # Create response
        try:
            print(f"=== 开始创建响应对象 ===")
            response = MaterialBalanceJobPublic(
                id=job.id,
                job_id=job.job_id,
                job_name=job.job_name,
                status=job.status,
                created_at=job.created_at,
                started_at=job.started_at,
                completed_at=job.completed_at,
                error_message=job.error_message,
            )
            print(f"响应对象创建成功")
            return response
        except Exception as response_error:
            print(f"响应对象创建失败: {type(response_error).__name__}: {str(response_error)}")
            raise
        
    except Exception as e:
        raise HTTPException(
            status_code=422,
            detail=f"Failed to process flowchart data: {str(e)}"
        )


@router.get("/result/{job_id}", response_model=MaterialBalanceResultSummary)
def get_calculation_result_summary(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    job_id: str,
) -> Any:
    """
    获取计算结果摘要
    """
    statement = select(MaterialBalanceJob).where(
        MaterialBalanceJob.job_id == job_id,
        MaterialBalanceJob.owner_id == current_user.id
    )
    job = session.exec(statement).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status != MaterialBalanceJobStatus.success:
        if job.status == MaterialBalanceJobStatus.failed:
            return MaterialBalanceResultSummary(
                job_id=job_id,
                status=job.status,
                total_time=None,
                total_steps=0,
                calculation_time_seconds=0.0,
                convergence_status="failed",
                final_mass_balance_error=None,
                final_total_volume=0.0,
                solver_method=None,
                error_message=job.error_message,
            )
        else:
            return MaterialBalanceResultSummary(
                job_id=job_id,
                status=job.status,
                total_time=None,
                total_steps=0,
                calculation_time_seconds=0.0,
                convergence_status="pending",
                final_mass_balance_error=None,
                final_total_volume=0.0,
                solver_method=None,
                error_message=None,
            )
    
    # Extract summary data - prioritize summary_data field, fallback to result_data
    if job.summary_data:
        summary = job.summary_data
    else:
        # Fallback to extracting from result_data for backward compatibility
        result_data = job.result_data or {}
        summary = result_data.get("summary", {})
    
    return MaterialBalanceResultSummary(
        job_id=job_id,
        status=job.status,
        total_time=summary.get("total_time"),
        total_steps=summary.get("total_steps", 0),
        calculation_time_seconds=summary.get("calculation_time_seconds", 0.0),
        convergence_status=summary.get("convergence_status", "unknown"),
        final_mass_balance_error=summary.get("final_mass_balance_error"),
        final_total_volume=summary.get("final_total_volume", 0.0),
        solver_method=summary.get("solver_method"),
        error_message=job.error_message,
    )


@router.get("/result/{job_id}/final-values", response_model=Dict[str, Any])
def get_calculation_final_values(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    job_id: str,
) -> Any:
    """
    获取计算结果中数组的最后一位数据（最终状态）
    """
    statement = select(MaterialBalanceJob).where(
        MaterialBalanceJob.job_id == job_id,
        MaterialBalanceJob.owner_id == current_user.id
    )
    job = session.exec(statement).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status != MaterialBalanceJobStatus.success:
        raise HTTPException(
            status_code=400, 
            detail=f"Job is not completed successfully. Status: {job.status}"
        )
    
    if not job.result_data:
        raise HTTPException(status_code=404, detail="Result data not found")
    
    result_data = job.result_data
    timestamps = result_data.get("timestamps", [])
    node_data = result_data.get("node_data", {})
    edge_data = result_data.get("edge_data", {})
    
    if not timestamps:
        raise HTTPException(status_code=404, detail="No time series data found")
    
    # 提取每个节点和边的最后一位数据
    final_node_data = {}
    for node_id, data in node_data.items():
        final_node_data[node_id] = {}
        for param_name, values in data.items():
            # 跳过label字段，因为它不是时间序列数据
            if param_name == "label":
                continue
            if values and len(values) > 0:
                final_node_data[node_id][param_name] = values[-1]  # 获取数组的最后一位
            else:
                final_node_data[node_id][param_name] = 0.0
    
    final_edge_data = {}
    for edge_id, data in edge_data.items():
        final_edge_data[edge_id] = {}
        for param_name, values in data.items():
            if values and len(values) > 0:
                final_edge_data[edge_id][param_name] = values[-1]  # 获取数组的最后一位
            else:
                final_edge_data[edge_id][param_name] = 0.0
    
    return {
        "job_id": job_id,
        "final_time": timestamps[-1] if timestamps else 0.0,
        "node_data": final_node_data,
        "edge_data": final_edge_data,
        "status": job.status
    }


@router.get("/result/{job_id}/timeseries", response_model=MaterialBalanceTimeSeriesResponse)
def get_calculation_timeseries(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    job_id: str,
    start_time: Optional[float] = Query(None, description="开始时间 (小时)"),
    end_time: Optional[float] = Query(None, description="结束时间 (小时)"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(100, ge=1, le=1000, description="每页数据量"),
    node_ids: Optional[List[str]] = Query(None, description="指定节点ID列表"),
    edge_ids: Optional[List[str]] = Query(None, description="指定边ID列表"),
) -> Any:
    """
    分页获取时间序列数据
    """
    statement = select(MaterialBalanceJob).where(
        MaterialBalanceJob.job_id == job_id,
        MaterialBalanceJob.owner_id == current_user.id
    )
    job = session.exec(statement).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status != MaterialBalanceJobStatus.success:
        raise HTTPException(
            status_code=400, 
            detail=f"Job is not completed successfully. Status: {job.status}"
        )
    
    if not job.result_data:
        raise HTTPException(status_code=404, detail="Result data not found")
    
    # Create query parameters
    query = MaterialBalanceTimeSeriesQuery(
        start_time=start_time,
        end_time=end_time,
        page=page,
        page_size=page_size,
        node_ids=node_ids,
        edge_ids=edge_ids,
    )
    
    # Extract and paginate time series data
    return data_conversion_service.extract_timeseries_data(
        job.result_data, query
    )


@router.get("/status/{job_id}", response_model=MaterialBalanceJobPublic)
def get_calculation_status(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    job_id: str,
) -> Any:
    """
    查询计算状态
    """
    statement = select(MaterialBalanceJob).where(
        MaterialBalanceJob.job_id == job_id,
        MaterialBalanceJob.owner_id == current_user.id
    )
    job = session.exec(statement).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return MaterialBalanceJobPublic(
        id=job.id,
        job_id=job.job_id,
        job_name=job.job_name,
        status=job.status,
        created_at=job.created_at,
        started_at=job.started_at,
        completed_at=job.completed_at,
        error_message=job.error_message,
    )


@router.post("/validate", response_model=MaterialBalanceValidationResponse)
def validate_calculation_input(
    *,
    current_user: CurrentUser,
    validation_request: MaterialBalanceValidationRequest,
) -> Any:
    """
    验证输入参数
    """
    try:
        # Validate input data structure
        input_data = validation_request.input_data
        
        # Perform validation using data conversion service
        validation_result = data_conversion_service.validate_input_data(input_data)
        
        return MaterialBalanceValidationResponse(
            is_valid=validation_result["is_valid"],
            errors=validation_result["errors"],
            warnings=validation_result["warnings"],
            estimated_memory_mb=validation_result["estimated_memory_mb"],
            estimated_time_seconds=validation_result["estimated_time_seconds"],
        )
    
    except Exception as e:
        return MaterialBalanceValidationResponse(
            is_valid=False,
            errors=[f"Validation error: {str(e)}"],
            warnings=[],
            estimated_memory_mb=0.0,
            estimated_time_seconds=0.0,
        )


@router.get("/jobs", response_model=MaterialBalanceJobsPublic)
def get_user_calculation_jobs(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = Query(0, ge=0, description="跳过的记录数"),
    limit: int = Query(100, ge=1, le=1000, description="返回的记录数"),
) -> Any:
    """
    获取用户的计算任务列表
    """
    statement = (
        select(MaterialBalanceJob)
        .where(MaterialBalanceJob.owner_id == current_user.id)
        .order_by(MaterialBalanceJob.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    jobs = session.exec(statement).all()
    
    # Get total count
    count_statement = select(MaterialBalanceJob).where(
        MaterialBalanceJob.owner_id == current_user.id
    )
    total_count = len(session.exec(count_statement).all())
    
    jobs_public = [
        MaterialBalanceJobPublic(
            id=job.id,
            job_id=job.job_id,
            job_name=job.job_name,
            status=job.status,
            created_at=job.created_at,
            started_at=job.started_at,
            completed_at=job.completed_at,
            error_message=job.error_message,
        )
        for job in jobs
    ]
    
    return MaterialBalanceJobsPublic(
        data=jobs_public,
        count=total_count,
    )


@router.delete("/jobs/{job_id}", response_model=Message)
def delete_calculation_job(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    job_id: str,
) -> Any:
    """
    删除计算任务
    """
    statement = select(MaterialBalanceJob).where(
        MaterialBalanceJob.job_id == job_id,
        MaterialBalanceJob.owner_id == current_user.id
    )
    job = session.exec(statement).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    session.delete(job)
    session.commit()
    
    return Message(message="Job deleted successfully")


@router.get("/jobs/{job_id}/input-data", response_model=MaterialBalanceJobInputDataResponse)
def get_job_input_data(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    job_id: str,
) -> Any:
    """
    获取计算任务的输入数据
    """
    statement = select(MaterialBalanceJob).where(
        MaterialBalanceJob.job_id == job_id,
        MaterialBalanceJob.owner_id == current_user.id
    )
    job = session.exec(statement).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if not job.input_data:
        raise HTTPException(status_code=404, detail="Input data not found")
    
    if not job.result_data:
        raise HTTPException(status_code=404, detail="Result data not found")
    
    return MaterialBalanceJobInputDataResponse(
        job_id=job_id,
        input_data=job.input_data,
        result_data=job.result_data,
        status=job.status
    )