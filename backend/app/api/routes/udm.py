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
    HybridUDMValidationResponse,
    UDMJob,
    UDMJobPublic,
    UDMJobsPublic,
    UDMJobInputDataResponse,
    MaterialBalanceJobStatus,
    Message,
)
from app.services.udm_service import UDMService
from app.services.data_conversion_service import DataConversionService
from app.services.hybrid_udm_validation import (
    build_hybrid_runtime_info,
    validate_hybrid_flowchart,
)
from app.services.time_segment_validation import validate_time_segments

router = APIRouter()

# Initialize services
udm_service = UDMService()
data_conversion_service = DataConversionService()


@router.post("/calculate", response_model=UDMJobPublic)
def create_calculation_job(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    background_tasks: BackgroundTasks,
    calculation_input: MaterialBalanceInput,
) -> Any:
    """
    创建UDM计算任务
    """
    # Generate unique job ID
    job_id = str(uuid4())
    
    # Generate job name with timestamp
    current_time = datetime.now().strftime("%Y%m%d%H%M")
    job_name = f"udm_{current_time}"
    
    # Create job record
    job = UDMJob(
        job_id=job_id,
        job_name=job_name,
        status=MaterialBalanceJobStatus.pending,
        input_data=calculation_input.model_dump(),
        owner_id=current_user.id,
    )
    
    session.add(job)
    session.commit()
    session.refresh(job)
    
    # Start background calculation
    background_tasks.add_task(
        udm_service.run_calculation,
        session,
        job_id,
        calculation_input
    )
    
    return UDMJobPublic(
        id=job.id,
        job_id=job.job_id,
        job_name=job.job_name,
        status=job.status,
        created_at=job.created_at,
        started_at=job.started_at,
        completed_at=job.completed_at,
        error_message=job.error_message,
        result_data=job.result_data,
    )


@router.post("/calculate-from-flowchart", response_model=UDMJobPublic)
def create_calculation_job_from_flowchart(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    background_tasks: BackgroundTasks,
    flowchart_data: Dict[str, Any],
) -> Any:
    """
    从流程图数据创建UDM计算任务
    """
    try:
        calculation_params = flowchart_data.get("calculationParameters", {})
        time_segment_errors = validate_time_segments(
            time_segments=flowchart_data.get(
                "timeSegments",
                flowchart_data.get("time_segments"),
            ),
            total_hours=calculation_params.get("hours"),
            edge_ids=[
                str(edge.get("id"))
                for edge in flowchart_data.get("edges", [])
                if isinstance(edge, dict) and edge.get("id") is not None
            ],
            parameter_names=[
                str(param.get("name"))
                for param in flowchart_data.get("customParameters", [])
                if isinstance(param, dict) and param.get("name") is not None
            ],
        )
        if time_segment_errors:
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "TIME_SEGMENT_VALIDATION_FAILED",
                    "errors": time_segment_errors,
                },
            )

        try:
            hybrid_runtime_info = build_hybrid_runtime_info(
                flowchart_data,
                strict=True,
            )
        except ValueError as validation_error:
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "HYBRID_UDM_VALIDATION_FAILED",
                    "errors": [str(validation_error)],
                },
            )

        calculation_input = (
            data_conversion_service.convert_flowchart_to_material_balance_input(
                flowchart_data,
                hybrid_runtime=hybrid_runtime_info,
            )
        )
        
        # Generate unique job ID
        job_id = str(uuid4())
        
        # Generate job name from flowchart or use timestamp
        flowchart_name = flowchart_data.get('name', 'unknown')
        current_time = datetime.now().strftime("%Y%m%d%H%M")
        job_name = f"udm_{flowchart_name}_{current_time}"
        
        # Create job record
        job = UDMJob(
            job_id=job_id,
            job_name=job_name,
            status=MaterialBalanceJobStatus.pending,
            input_data=flowchart_data,
            owner_id=current_user.id,
        )
        
        session.add(job)
        session.commit()
        session.refresh(job)
        
        # Start background calculation
        background_tasks.add_task(
            udm_service.run_calculation,
            session,
            job_id,
            calculation_input
        )
        
        return UDMJobPublic(
            id=job.id,
            job_id=job.job_id,
            job_name=job.job_name,
            status=job.status,
            created_at=job.created_at,
            started_at=job.started_at,
            completed_at=job.completed_at,
            error_message=job.error_message,
            result_data=job.result_data,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to convert flowchart data: {str(e)}"
        )


@router.post(
    "/validate-hybrid-flowchart",
    response_model=HybridUDMValidationResponse,
)
def validate_hybrid_udm_flowchart(
    *,
    current_user: CurrentUser,
    flowchart_data: Dict[str, Any],
) -> Any:
    """
    校验 Hybrid UDM 流程图配置（模型选择、模型对映射、节点绑定与变量覆盖）。
    """
    _ = current_user
    validation_result = validate_hybrid_flowchart(flowchart_data)
    return HybridUDMValidationResponse(
        is_valid=validation_result.get("is_valid", False),
        errors=validation_result.get("errors", []) or [],
        warnings=validation_result.get("warnings", []) or [],
        details=validation_result.get("details", {}) or {},
        normalized_hybrid_config=validation_result.get("normalized_hybrid_config"),
    )


@router.get("/result/{job_id}", response_model=MaterialBalanceResultSummary)
def get_calculation_result_summary(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    job_id: str,
) -> Any:
    """
    获取UDM计算结果摘要
    """
    statement = select(UDMJob).where(
        UDMJob.job_id == job_id,
        UDMJob.owner_id == current_user.id
    )
    job = session.exec(statement).first()
    
    if not job:
        raise HTTPException(
            status_code=404,
            detail="UDM calculation job not found"
        )
    
    if job.status != MaterialBalanceJobStatus.success:
        raise HTTPException(
            status_code=400,
            detail=f"UDM calculation not completed successfully. Status: {job.status}"
        )
    
    if not job.result_data:
        raise HTTPException(
            status_code=404,
            detail="UDM calculation result data not found"
        )
    
    # Extract summary data - prioritize summary_data field, fallback to result_data
    if job.summary_data:
        summary_data = job.summary_data
    else:
        # Fallback to extracting from result_data for backward compatibility
        result_data = job.result_data or {}
        summary_data = result_data.get('summary', {})
    
    return MaterialBalanceResultSummary(
        job_id=job_id,
        status=job.status.value,
        total_time=summary_data.get('total_time', 0.0),
        total_steps=summary_data.get('total_steps', 0),
        calculation_time_seconds=summary_data.get('calculation_time_seconds', 0.0),
        convergence_status=summary_data.get('convergence_status', 'unknown'),
        final_mass_balance_error=summary_data.get('final_mass_balance_error', 0.0),
        final_total_volume=summary_data.get('final_total_volume', 0.0),
        solver_method=summary_data.get('solver_method', None),
        segment_count=summary_data.get("segment_count"),
        parameter_change_event_count=summary_data.get("parameter_change_event_count"),
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
    获取UDM计算的最终值
    """
    statement = select(UDMJob).where(
        UDMJob.job_id == job_id,
        UDMJob.owner_id == current_user.id
    )
    job = session.exec(statement).first()
    
    if not job:
        raise HTTPException(
            status_code=404,
            detail="UDM calculation job not found"
        )
    
    if job.status != MaterialBalanceJobStatus.success:
        raise HTTPException(
            status_code=400,
            detail=f"UDM calculation not completed successfully. Status: {job.status}"
        )
    
    if not job.result_data:
        raise HTTPException(
            status_code=404,
            detail="UDM calculation result data not found"
        )
    
    result_data = job.result_data
    node_data = result_data.get('node_data', {})
    edge_data = result_data.get('edge_data', {})
    
    # Extract final values (last timestamp)
    final_values = {
        'nodes': {},
        'edges': {}
    }
    
    # Get final node values
    for node_id, data in node_data.items():
        final_values['nodes'][node_id] = {}
        for param_name, values in data.items():
            # Skip label field as it's not time series data
            if param_name == "label":
                continue
            if values and len(values) > 0:
                final_values['nodes'][node_id][param_name] = values[-1]  # Get last value
            else:
                final_values['nodes'][node_id][param_name] = 0.0
    
    # Get final edge values
    for edge_id, data in edge_data.items():
        final_values['edges'][edge_id] = {}
        for param_name, values in data.items():
            if values and len(values) > 0:
                final_values['edges'][edge_id][param_name] = values[-1]  # Get last value
            else:
                final_values['edges'][edge_id][param_name] = 0.0
    
    return {
        'job_id': job_id,
        'final_values': final_values,
        'timestamps': result_data.get('timestamps', []),
        'summary': result_data.get('summary', {})
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
    获取UDM计算的时间序列数据
    """
    statement = select(UDMJob).where(
        UDMJob.job_id == job_id,
        UDMJob.owner_id == current_user.id
    )
    job = session.exec(statement).first()
    
    if not job:
        raise HTTPException(
            status_code=404,
            detail="UDM calculation job not found"
        )
    
    if job.status != MaterialBalanceJobStatus.success:
        raise HTTPException(
            status_code=400,
            detail=f"UDM calculation not completed successfully. Status: {job.status}"
        )
    
    if not job.result_data:
        raise HTTPException(
            status_code=404,
            detail="UDM calculation result data not found"
        )
    
    result_data = job.result_data
    timestamps = result_data.get('timestamps', [])
    node_data = result_data.get('node_data', {})
    edge_data = result_data.get('edge_data', {})
    
    # Filter by time range
    start_idx = 0
    end_idx = len(timestamps)
    
    if start_time is not None:
        start_idx = next((i for i, t in enumerate(timestamps) if t >= start_time), 0)
    if end_time is not None:
        end_idx = next((i for i, t in enumerate(timestamps) if t > end_time), len(timestamps))
    
    # Apply pagination
    total_points = end_idx - start_idx
    start_page_idx = start_idx + (page - 1) * page_size
    end_page_idx = min(start_idx + page * page_size, end_idx)
    
    # Filter data
    filtered_timestamps = timestamps[start_page_idx:end_page_idx]
    filtered_node_data = {}
    filtered_edge_data = {}
    
    # Filter node data
    if node_ids:
        for node_id in node_ids:
            if node_id in node_data:
                filtered_node_data[node_id] = {}
                for param_name, values in node_data[node_id].items():
                    if param_name == "label":
                        continue
                    filtered_node_data[node_id][param_name] = values[start_page_idx:end_page_idx]
    else:
        for node_id, data in node_data.items():
            filtered_node_data[node_id] = {}
            for param_name, values in data.items():
                if param_name == "label":
                    continue
                filtered_node_data[node_id][param_name] = values[start_page_idx:end_page_idx]
    
    # Filter edge data
    if edge_ids:
        for edge_id in edge_ids:
            if edge_id in edge_data:
                filtered_edge_data[edge_id] = {}
                for param_name, values in edge_data[edge_id].items():
                    filtered_edge_data[edge_id][param_name] = values[start_page_idx:end_page_idx]
    else:
        for edge_id, data in edge_data.items():
            filtered_edge_data[edge_id] = {}
            for param_name, values in data.items():
                filtered_edge_data[edge_id][param_name] = values[start_page_idx:end_page_idx]
    
    return MaterialBalanceTimeSeriesResponse(
        job_id=job_id,
        timestamps=filtered_timestamps,
        node_data=filtered_node_data,
        edge_data=filtered_edge_data,
        pagination={
            'page': page,
            'page_size': page_size,
            'total_points': total_points,
            'total_pages': (total_points + page_size - 1) // page_size,
            'has_next': end_page_idx < end_idx,
            'has_prev': page > 1
        }
    )

@router.get("/status/{job_id}", response_model=UDMJobPublic)
def get_calculation_status(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    job_id: str,
) -> Any:
    """
    获取UDM计算任务状态
    """
    statement = select(UDMJob).where(
        UDMJob.job_id == job_id,
        UDMJob.owner_id == current_user.id
    )
    job = session.exec(statement).first()
    
    if not job:
        raise HTTPException(
            status_code=404,
            detail="UDM calculation job not found"
        )
    
    return UDMJobPublic(
        id=job.id,
        job_id=job.job_id,
        job_name=job.job_name,
        status=job.status,
        created_at=job.created_at,
        started_at=job.started_at,
        completed_at=job.completed_at,
        error_message=job.error_message,
        result_data=job.result_data,
    )


@router.post("/validate", response_model=MaterialBalanceValidationResponse)
def validate_calculation_input(
    *,
    current_user: CurrentUser,
    validation_request: MaterialBalanceValidationRequest,
) -> Any:
    """
    验证UDM计算输入数据
    """
    try:
        # Use the same validation logic as material balance
        # since UDM uses the same input structure
        input_data = validation_request.input_data
        
        # Basic validation
        errors = []
        warnings = []
        
        # Validate nodes
        if not input_data.nodes or len(input_data.nodes) == 0:
            errors.append("At least one node is required")
        
        # Validate parameters
        if input_data.parameters.hours <= 0:
            errors.append("Simulation time must be positive")
        
        if input_data.parameters.steps_per_hour <= 0:
            errors.append("Steps per hour must be positive")
        
        # Check for reasonable simulation parameters
        total_steps = input_data.parameters.hours * input_data.parameters.steps_per_hour
        if total_steps > 10000:
            warnings.append(f"Large number of simulation steps ({total_steps}). Consider reducing simulation time or steps per hour for better performance.")
        
        is_valid = len(errors) == 0
        
        return MaterialBalanceValidationResponse(
            is_valid=is_valid,
            errors=errors,
            warnings=warnings,
            estimated_calculation_time_seconds=min(30 + total_steps * 0.001, 600)
        )
        
    except Exception as e:
        return MaterialBalanceValidationResponse(
            is_valid=False,
            errors=[f"Validation error: {str(e)}"],
            warnings=[],
            estimated_calculation_time_seconds=0
        )


@router.get("/jobs", response_model=UDMJobsPublic)
def get_user_calculation_jobs(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = Query(0, ge=0, description="跳过的记录数"),
    limit: int = Query(100, ge=1, le=1000, description="返回的记录数"),
) -> Any:
    """
    获取用户的UDM计算任务列表
    """
    # Get total count
    count_statement = select(UDMJob).where(
        UDMJob.owner_id == current_user.id
    )
    total_count = len(session.exec(count_statement).all())
    
    # Get jobs with pagination
    statement = (
        select(UDMJob)
        .where(UDMJob.owner_id == current_user.id)
        .order_by(UDMJob.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    jobs = session.exec(statement).all()

    # Convert to public models  
    job_publics = [
        UDMJobPublic(
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
    
    return UDMJobsPublic(
        data=job_publics,
        count=total_count
    )


@router.delete("/jobs/{job_id}", response_model=Message)
def delete_calculation_job(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    job_id: str,
) -> Any:
    """
    删除UDM计算任务
    """
    statement = select(UDMJob).where(
        UDMJob.job_id == job_id,
        UDMJob.owner_id == current_user.id
    )
    job = session.exec(statement).first()
    
    if not job:
        raise HTTPException(
            status_code=404,
            detail="UDM calculation job not found"
        )
    
    session.delete(job)
    session.commit()
    
    return Message(message="UDM calculation job deleted successfully")


@router.get("/jobs/{job_id}/input-data", response_model=UDMJobInputDataResponse)
def get_job_input_data(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    job_id: str,
) -> Any:
    """
    获取UDM计算任务的输入数据
    """
    statement = select(UDMJob).where(
        UDMJob.job_id == job_id,
        UDMJob.owner_id == current_user.id
    )
    job = session.exec(statement).first()
    
    if not job:
        raise HTTPException(
            status_code=404,
            detail="UDM calculation job not found"
        )
    
    return UDMJobInputDataResponse(
        job_id=job.job_id,
        input_data=job.input_data or {},
        result_data=job.result_data or {},
        status=job.status,
    )
