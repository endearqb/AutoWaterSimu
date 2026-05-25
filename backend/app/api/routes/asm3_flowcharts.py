import uuid
from typing import Any
from datetime import datetime
import logging

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    ASM3FlowChart,
    ASM3FlowChartCreate,
    ASM3FlowChartPublic,
    ASM3FlowChartsPublic,
    ASM3FlowChartUpdate,
    Message,
)

router = APIRouter(prefix="/asm3-flowcharts", tags=["asm3-flowcharts"])
logger = logging.getLogger(__name__)


@router.get("/", response_model=ASM3FlowChartsPublic)
def read_asm3_flowcharts(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    """
    Retrieve ASM3 flowcharts.
    """

    if current_user.is_superuser:
        count_statement = select(func.count()).select_from(ASM3FlowChart)
        count = session.exec(count_statement).one()
        statement = select(ASM3FlowChart).offset(skip).limit(limit).order_by(ASM3FlowChart.updated_at.desc())
        flowcharts = session.exec(statement).all()
    else:
        count_statement = (
            select(func.count())
            .select_from(ASM3FlowChart)
            .where(ASM3FlowChart.owner_id == current_user.id)
        )
        count = session.exec(count_statement).one()
        statement = (
            select(ASM3FlowChart)
            .where(ASM3FlowChart.owner_id == current_user.id)
            .offset(skip)
            .limit(limit)
            .order_by(ASM3FlowChart.updated_at.desc())
        )
        flowcharts = session.exec(statement).all()

    return ASM3FlowChartsPublic(data=flowcharts, count=count)


@router.get("/{id}", response_model=ASM3FlowChartPublic)
def read_asm3_flowchart(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    """
    Get ASM3 flowchart by ID.
    """
    flowchart = session.get(ASM3FlowChart, id)
    if not flowchart:
        raise HTTPException(status_code=404, detail="ASM3 FlowChart not found")
    if not current_user.is_superuser and (flowchart.owner_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return flowchart


@router.post("/", response_model=ASM3FlowChartPublic)
def create_asm3_flowchart(
    *, session: SessionDep, current_user: CurrentUser, flowchart_in: ASM3FlowChartCreate
) -> Any:
    """
    Create new ASM3 flowchart.
    """
    logger.debug(
        "Creating ASM3 flowchart",
        extra={
            "flowchart_name": flowchart_in.name,
            "has_description": bool(flowchart_in.description),
            "flow_data_type": type(flowchart_in.flow_data).__name__,
        },
    )
    
    try:
        flowchart = ASM3FlowChart(
            name=flowchart_in.name,
            description=flowchart_in.description,
            flow_data=flowchart_in.flow_data,
            owner_id=current_user.id,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        session.add(flowchart)
        session.commit()
        session.refresh(flowchart)
        logger.debug(
            "Saved ASM3 flowchart",
            extra={"flowchart_id": str(flowchart.id), "flowchart_name": flowchart.name},
        )
        return flowchart
    except Exception:
        logger.exception(
            "Failed to create ASM3 flowchart",
            extra={"flowchart_name": flowchart_in.name},
        )
        raise


@router.put("/{id}", response_model=ASM3FlowChartPublic)
def update_asm3_flowchart(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    flowchart_in: ASM3FlowChartUpdate,
) -> Any:
    """
    Update an ASM3 flowchart.
    """
    flowchart = session.get(ASM3FlowChart, id)
    if not flowchart:
        raise HTTPException(status_code=404, detail="ASM3 FlowChart not found")
    if not current_user.is_superuser and (flowchart.owner_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    update_dict = flowchart_in.model_dump(exclude_unset=True)
    
    update_dict["updated_at"] = datetime.now()
    
    flowchart.sqlmodel_update(update_dict)
    session.add(flowchart)
    session.commit()
    session.refresh(flowchart)
    return flowchart


@router.delete("/{id}")
def delete_asm3_flowchart(
    session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Message:
    """
    Delete an ASM3 flowchart.
    """
    flowchart = session.get(ASM3FlowChart, id)
    if not flowchart:
        raise HTTPException(status_code=404, detail="ASM3 FlowChart not found")
    if not current_user.is_superuser and (flowchart.owner_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    session.delete(flowchart)
    session.commit()
    return Message(message="ASM3 FlowChart deleted successfully")
