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
from app.services.time_segment_validation import validate_time_segments

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
    鍒涘缓鐗╂枡骞宠　璁＄畻浠诲姟
    """
    # Generate unique job ID
    job_id = str(uuid4())
    
    # Generate job name with timestamp
    current_time = datetime.now().strftime("%Y%m%d%H%M")
    job_name = f"unknown_{current_time}"
    
    # Create job record
    # 濡傛灉calculation_input鍖呭惈original_flowchart_data锛屼紭鍏堜繚瀛樺師濮嬫祦绋嬪浘鏁版嵁
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
    浠庢祦绋嬪浘鏁版嵁鍒涘缓鐗╂枡骞宠　璁＄畻浠诲姟
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

        calculation_input = data_conversion_service.convert_flowchart_to_material_balance_input(
            flowchart_data=flowchart_data,
            calculation_params=calculation_params,
        )

        job_id = str(uuid4())
        current_time = datetime.now().strftime("%Y%m%d%H%M")
        flowchart_name = flowchart_data.get("name", "unknown") or "unknown"
        job_name = f"{flowchart_name}_{current_time}"

        job = MaterialBalanceJob(
            job_id=job_id,
            job_name=job_name,
            status=MaterialBalanceJobStatus.pending,
            input_data=flowchart_data,
            owner_id=current_user.id,
        )

        session.add(job)
        session.commit()
        session.refresh(job)

        background_tasks.add_task(
            material_balance_service.run_calculation,
            session,
            job_id,
            calculation_input,
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

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to process flowchart data: {str(e)}",
        )

@router.get("/result/{job_id}", response_model=MaterialBalanceResultSummary)
def get_calculation_result_summary(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    job_id: str,
) -> Any:
    """
    鑾峰彇璁＄畻缁撴灉鎽樿
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
                segment_count=None,
                parameter_change_event_count=None,
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
                segment_count=None,
                parameter_change_event_count=None,
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
        segment_count=summary.get("segment_count"),
        parameter_change_event_count=summary.get("parameter_change_event_count"),
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
    鑾峰彇璁＄畻缁撴灉涓暟缁勭殑鏈€鍚庝竴浣嶆暟鎹紙鏈€缁堢姸鎬侊級
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
    
    # 鎻愬彇姣忎釜鑺傜偣鍜岃竟鐨勬渶鍚庝竴浣嶆暟鎹?
    final_node_data = {}
    for node_id, data in node_data.items():
        final_node_data[node_id] = {}
        for param_name, values in data.items():
            # 璺宠繃label瀛楁锛屽洜涓哄畠涓嶆槸鏃堕棿搴忓垪鏁版嵁
            if param_name == "label":
                continue
            if values and len(values) > 0:
                final_node_data[node_id][param_name] = values[-1]  # 鑾峰彇鏁扮粍鐨勬渶鍚庝竴浣?
            else:
                final_node_data[node_id][param_name] = 0.0
    
    final_edge_data = {}
    for edge_id, data in edge_data.items():
        final_edge_data[edge_id] = {}
        for param_name, values in data.items():
            if values and len(values) > 0:
                final_edge_data[edge_id][param_name] = values[-1]  # 鑾峰彇鏁扮粍鐨勬渶鍚庝竴浣?
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
    start_time: Optional[float] = Query(None, description="寮€濮嬫椂闂?(灏忔椂)"),
    end_time: Optional[float] = Query(None, description="缁撴潫鏃堕棿 (灏忔椂)"),
    page: int = Query(1, ge=1, description="椤电爜"),
    page_size: int = Query(100, ge=1, le=1000, description="Page size"),
    node_ids: Optional[List[str]] = Query(None, description="鎸囧畾鑺傜偣ID鍒楄〃"),
    edge_ids: Optional[List[str]] = Query(None, description="鎸囧畾杈笽D鍒楄〃"),
) -> Any:
    """
    鍒嗛〉鑾峰彇鏃堕棿搴忓垪鏁版嵁
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
    鏌ヨ璁＄畻鐘舵€?
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
    楠岃瘉杈撳叆鍙傛暟
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
    skip: int = Query(0, ge=0, description="璺宠繃鐨勮褰曟暟"),
    limit: int = Query(100, ge=1, le=1000, description="杩斿洖鐨勮褰曟暟"),
) -> Any:
    """
    鑾峰彇鐢ㄦ埛鐨勮绠椾换鍔″垪琛?
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
    鍒犻櫎璁＄畻浠诲姟
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
    鑾峰彇璁＄畻浠诲姟鐨勮緭鍏ユ暟鎹?
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
