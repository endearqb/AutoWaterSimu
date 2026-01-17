import asyncio
import time
import traceback
from datetime import datetime
from typing import Any, Dict, Optional

from sqlmodel import Session, select

from app.models import (
    MaterialBalanceInput,
    ASM1SlimJob,
    MaterialBalanceJobStatus,
)
from app.services.data_conversion_service import DataConversionService
from app.material_balance.core import MaterialBalanceCalculator


class ASM1SlimService:
    """
    ASM1slim计算服务
    """
    
    def __init__(self):
        self.data_conversion_service = DataConversionService()
        self.calculator = MaterialBalanceCalculator()
    
    async def run_calculation(
        self,
        session: Session,
        job_id: str,
        input_data: MaterialBalanceInput
    ) -> None:
        """
        异步执行ASM1slim计算
        """
        # Get job from database
        statement = select(ASM1SlimJob).where(
            ASM1SlimJob.job_id == job_id
        )
        job = session.exec(statement).first()
        
        if not job:
            return
        
        try:
            # Update job status to running
            job.status = MaterialBalanceJobStatus.running
            job.started_at = datetime.now()
            session.add(job)
            session.commit()
            
            # Start calculation
            start_time = time.time()
            
            # Calculate estimated timeout based on problem complexity
            total_steps = int(input_data.parameters.hours * input_data.parameters.steps_per_hour) + 1
            num_nodes = len(input_data.nodes)
            num_components = len(input_data.nodes[0].initial_concentrations) if input_data.nodes else 1
            
            # Estimate timeout: base time + complexity factor
            base_timeout = 180  # 3 minutes base
            complexity_factor = (total_steps * num_nodes * num_components) / 1000
            timeout_seconds = min(base_timeout + complexity_factor * 10, 600)  # Max 10 minutes
            
            print(f"Starting ASM1slim calculation for job {job_id}: {total_steps} steps, {num_nodes} nodes, timeout: {timeout_seconds:.1f}s")
            
            # Run calculation with timeout
            try:
                result = await asyncio.wait_for(
                    asyncio.get_event_loop().run_in_executor(
                        None,
                        self._run_calculation_sync,
                        input_data
                    ),
                    timeout=timeout_seconds
                )
            except asyncio.TimeoutError:
                raise Exception(f"ASM1slim calculation timed out after {timeout_seconds:.1f} seconds. Try reducing simulation time or steps per hour.")
            
            # Calculate execution time
            calculation_time = time.time() - start_time
            print(f"ASM1slim calculation completed for job {job_id} in {calculation_time:.2f} seconds")
            
            # Convert MaterialBalanceResult to dict format for database storage
            print(f"Converting ASM1slim result to dict for job {job_id}")
            output_data = {
                "job_id": result.job_id,
                "status": result.status,
                "timestamps": result.timestamps,
                "node_data": result.node_data,
                "edge_data": result.edge_data,
                "summary": result.summary
            }
            print(f"ASM1slim result conversion completed for job {job_id}")
            
            # Update job with results
            job.status = MaterialBalanceJobStatus.success
            job.completed_at = datetime.now()
            job.result_data = output_data
            job.summary_data = result.summary  # Save summary separately for optimized queries
            job.error_message = None
            
        except asyncio.CancelledError:
            # Handle cancellation (e.g., server shutdown)
            print(f"ASM1slim calculation cancelled for job {job_id}")
            job.status = MaterialBalanceJobStatus.cancelled
            job.completed_at = datetime.now()
            job.error_message = "ASM1slim calculation cancelled due to server shutdown"
            job.result_data = None
            # Re-raise to properly handle the cancellation
            raise
        except Exception as e:
            # Handle calculation error
            error_message = f"ASM1slim calculation failed: {str(e)}"
            print(f"ASM1slim calculation error for job {job_id}: {error_message}")
            print(f"Traceback: {traceback.format_exc()}")
            
            job.status = MaterialBalanceJobStatus.failed
            job.completed_at = datetime.now()
            job.error_message = error_message
            job.result_data = None
        
        finally:
            # Save job state
            session.add(job)
            session.commit()
    
    def _run_calculation_sync(self, input_data: MaterialBalanceInput) -> Dict[str, Any]:
        """
        同步执行ASM1slim计算（在线程池中运行）
        """
        # Run calculation with MaterialBalanceInput object
        # The MaterialBalanceCalculator already supports ASM1slim calculations
        result = self.calculator.calculate(input_data)
        
        return result
    
    def get_calculation_progress(self, job_id: str, session: Session) -> Optional[Dict[str, Any]]:
        """
        获取ASM1slim计算进度（如果支持的话）
        """
        statement = select(ASM1SlimJob).where(
            ASM1SlimJob.job_id == job_id
        )
        job = session.exec(statement).first()
        
        if not job:
            return None
        
        progress_info = {
            "job_id": job_id,
            "status": job.status,
            "created_at": job.created_at,
            "started_at": job.started_at,
            "completed_at": job.completed_at,
            "error_message": job.error_message,
        }
        
        # Add estimated progress for running jobs
        if job.status == MaterialBalanceJobStatus.running and job.started_at:
            elapsed_time = (datetime.now() - job.started_at).total_seconds()
            
            # Estimate total time based on job complexity if input_data is available
            try:
                # Try to get complexity from input_data if available
                input_data = job.input_data
                if input_data and isinstance(input_data, dict):
                    params = input_data.get('parameters', {})
                    hours = params.get('hours', 1)
                    steps_per_hour = params.get('steps_per_hour', 10)
                    total_steps = int(hours * steps_per_hour) + 1
                    
                    nodes = input_data.get('nodes', [])
                    num_nodes = len(nodes)
                    num_components = len(nodes[0].get('initial_concentrations', [1])) if nodes else 1
                    
                    # Use same estimation logic as in run_calculation
                    base_timeout = 180
                    complexity_factor = (total_steps * num_nodes * num_components) / 1000
                    estimated_total_time = min(base_timeout + complexity_factor * 10, 600)
                else:
                    estimated_total_time = 30.0  # fallback
            except Exception:
                estimated_total_time = 30.0  # fallback for any errors
            
            progress_percentage = min(95, (elapsed_time / estimated_total_time) * 100)
            progress_info["progress_percentage"] = progress_percentage
            progress_info["elapsed_time_seconds"] = elapsed_time
            progress_info["estimated_total_time_seconds"] = estimated_total_time
        
        return progress_info
    
    def cancel_calculation(self, job_id: str, session: Session) -> bool:
        """
        取消ASM1slim计算任务
        """
        statement = select(ASM1SlimJob).where(
            ASM1SlimJob.job_id == job_id
        )
        job = session.exec(statement).first()
        
        if not job:
            return False
        
        if job.status in [MaterialBalanceJobStatus.pending, MaterialBalanceJobStatus.running]:
            job.status = MaterialBalanceJobStatus.cancelled
            job.completed_at = datetime.now()
            job.error_message = "ASM1slim calculation cancelled by user"
            session.add(job)
            session.commit()
            return True
        
        return False
    
    def cleanup_old_jobs(self, session: Session, days_old: int = 30) -> int:
        """
        清理旧的ASM1slim计算任务
        """
        from datetime import timedelta
        
        cutoff_date = datetime.now() - timedelta(days=days_old)
        
        statement = select(ASM1SlimJob).where(
            ASM1SlimJob.created_at < cutoff_date
        )
        old_jobs = session.exec(statement).all()
        
        count = 0
        for job in old_jobs:
            session.delete(job)
            count += 1
        
        session.commit()
        return count