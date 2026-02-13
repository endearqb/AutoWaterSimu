import asyncio
import logging
import time
from datetime import datetime
from typing import Any, Dict, Optional

from sqlmodel import Session, select

from app.material_balance.core import MaterialBalanceCalculator
from app.material_balance.models import MaterialBalanceResult
from app.models import MaterialBalanceInput, MaterialBalanceJobStatus, UDMJob
from app.services.data_conversion_service import DataConversionService

logger = logging.getLogger(__name__)


class UDMService:
    """UDM计算服务。"""

    def __init__(self):
        self.data_conversion_service = DataConversionService()
        self.calculator = MaterialBalanceCalculator()

    async def run_calculation(
        self,
        session: Session,
        job_id: str,
        input_data: MaterialBalanceInput,
    ) -> None:
        statement = select(UDMJob).where(UDMJob.job_id == job_id)
        job = session.exec(statement).first()

        if not job:
            return

        try:
            job.status = MaterialBalanceJobStatus.running
            job.started_at = datetime.now()
            session.add(job)
            session.commit()

            start_time = time.time()

            total_steps = int(input_data.parameters.hours * input_data.parameters.steps_per_hour) + 1
            num_nodes = len(input_data.nodes)
            num_components = len(input_data.nodes[0].initial_concentrations) if input_data.nodes else 1

            base_timeout = 180
            complexity_factor = (total_steps * num_nodes * num_components) / 1000
            timeout_seconds = min(base_timeout + complexity_factor * 10, 600)

            logger.info(
                "udm calculation started",
                extra={
                    "job_id": job_id,
                    "steps": total_steps,
                    "nodes": num_nodes,
                    "timeout_seconds": round(timeout_seconds, 2),
                },
            )

            try:
                result = await asyncio.wait_for(
                    asyncio.get_event_loop().run_in_executor(
                        None,
                        self._run_calculation_sync,
                        input_data,
                    ),
                    timeout=timeout_seconds,
                )
            except asyncio.TimeoutError:
                raise Exception(
                    f"UDM calculation timed out after {timeout_seconds:.1f} seconds. "
                    "Try reducing simulation time or steps per hour."
                )

            calculation_time = time.time() - start_time
            logger.info(
                "udm calculation completed",
                extra={
                    "job_id": job_id,
                    "calculation_time_seconds": round(calculation_time, 2),
                },
            )

            output_data = {
                "job_id": result.job_id,
                "status": result.status,
                "timestamps": result.timestamps,
                "node_data": result.node_data,
                "edge_data": result.edge_data,
                "segment_markers": result.segment_markers,
                "parameter_change_events": result.parameter_change_events,
                "summary": result.summary,
            }

            job.status = MaterialBalanceJobStatus.success
            job.completed_at = datetime.now()
            job.result_data = output_data
            job.summary_data = result.summary
            job.error_message = None

        except asyncio.CancelledError:
            logger.warning("udm calculation cancelled", extra={"job_id": job_id})
            job.status = MaterialBalanceJobStatus.cancelled
            job.completed_at = datetime.now()
            job.error_message = "UDM calculation cancelled due to server shutdown"
            job.result_data = None
            raise
        except Exception as e:
            error_message = f"UDM calculation failed: {str(e)}"
            logger.exception(
                "udm calculation failed",
                extra={"job_id": job_id, "error_message": error_message},
            )

            job.status = MaterialBalanceJobStatus.failed
            job.completed_at = datetime.now()
            job.error_message = error_message
            job.result_data = None

        finally:
            session.add(job)
            session.commit()

    def _run_calculation_sync(self, input_data: MaterialBalanceInput) -> MaterialBalanceResult:
        return self.calculator.calculate(input_data)

    def get_calculation_progress(self, job_id: str, session: Session) -> Optional[Dict[str, Any]]:
        statement = select(UDMJob).where(UDMJob.job_id == job_id)
        job = session.exec(statement).first()

        if not job:
            return None

        progress_info: Dict[str, Any] = {
            "job_id": job_id,
            "status": job.status,
            "created_at": job.created_at,
            "started_at": job.started_at,
            "completed_at": job.completed_at,
            "error_message": job.error_message,
        }

        if job.status == MaterialBalanceJobStatus.running and job.started_at:
            elapsed_time = (datetime.now() - job.started_at).total_seconds()

            try:
                input_data = job.input_data
                if input_data and isinstance(input_data, dict):
                    params = input_data.get("parameters", {})
                    hours = params.get("hours", 1)
                    steps_per_hour = params.get("steps_per_hour", 10)
                    total_steps = int(hours * steps_per_hour) + 1

                    nodes = input_data.get("nodes", [])
                    num_nodes = len(nodes)
                    num_components = len(nodes[0].get("initial_concentrations", [1])) if nodes else 1

                    base_timeout = 180
                    complexity_factor = (total_steps * num_nodes * num_components) / 1000
                    estimated_total_time = min(base_timeout + complexity_factor * 10, 600)
                else:
                    estimated_total_time = 30.0
            except Exception:
                estimated_total_time = 30.0

            progress_percentage = min(95, (elapsed_time / estimated_total_time) * 100)
            progress_info["progress_percentage"] = progress_percentage
            progress_info["elapsed_time_seconds"] = elapsed_time
            progress_info["estimated_total_time_seconds"] = estimated_total_time

        return progress_info

    def cancel_calculation(self, job_id: str, session: Session) -> bool:
        statement = select(UDMJob).where(UDMJob.job_id == job_id)
        job = session.exec(statement).first()

        if not job:
            return False

        if job.status in [MaterialBalanceJobStatus.pending, MaterialBalanceJobStatus.running]:
            job.status = MaterialBalanceJobStatus.cancelled
            job.completed_at = datetime.now()
            job.error_message = "UDM calculation cancelled by user"
            session.add(job)
            session.commit()
            return True

        return False
