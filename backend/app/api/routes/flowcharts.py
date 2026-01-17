import uuid
from typing import Any
from datetime import datetime

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    FlowChart,
    FlowChartCreate,
    FlowChartPublic,
    FlowChartsPublic,
    FlowChartUpdate,
    Message,
)

router = APIRouter(prefix="/flowcharts", tags=["flowcharts"])


@router.get("/", response_model=FlowChartsPublic)
def read_flowcharts(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    """
    Retrieve flowcharts.
    """

    if current_user.is_superuser:
        count_statement = select(func.count()).select_from(FlowChart)
        count = session.exec(count_statement).one()
        statement = select(FlowChart).offset(skip).limit(limit).order_by(FlowChart.updated_at.desc())
        flowcharts = session.exec(statement).all()
    else:
        count_statement = (
            select(func.count())
            .select_from(FlowChart)
            .where(FlowChart.owner_id == current_user.id)
        )
        count = session.exec(count_statement).one()
        statement = (
            select(FlowChart)
            .where(FlowChart.owner_id == current_user.id)
            .offset(skip)
            .limit(limit)
            .order_by(FlowChart.updated_at.desc())
        )
        flowcharts = session.exec(statement).all()

    return FlowChartsPublic(data=flowcharts, count=count)


@router.get("/{id}", response_model=FlowChartPublic)
def read_flowchart(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    """
    Get flowchart by ID.
    """
    flowchart = session.get(FlowChart, id)
    if not flowchart:
        raise HTTPException(status_code=404, detail="FlowChart not found")
    if not current_user.is_superuser and (flowchart.owner_id != current_user.id):
        raise HTTPException(status_code=400, detail="Not enough permissions")
    return flowchart


@router.post("/", response_model=FlowChartPublic)
def create_flowchart(
    *, session: SessionDep, current_user: CurrentUser, flowchart_in: FlowChartCreate
) -> Any:
    """
    Create new flowchart.
    """
    flowchart = FlowChart.model_validate(
        flowchart_in, 
        update={
            "owner_id": current_user.id,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
    )
    session.add(flowchart)
    session.commit()
    session.refresh(flowchart)
    return flowchart


@router.put("/{id}", response_model=FlowChartPublic)
def update_flowchart(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    flowchart_in: FlowChartUpdate,
) -> Any:
    """
    Update a flowchart.
    """
    flowchart = session.get(FlowChart, id)
    if not flowchart:
        raise HTTPException(status_code=404, detail="FlowChart not found")
    if not current_user.is_superuser and (flowchart.owner_id != current_user.id):
        raise HTTPException(status_code=400, detail="Not enough permissions")
    
    update_dict = flowchart_in.model_dump(exclude_unset=True)
    # Always update the updated_at timestamp
    update_dict["updated_at"] = datetime.now()
    
    flowchart.sqlmodel_update(update_dict)
    session.add(flowchart)
    session.commit()
    session.refresh(flowchart)
    return flowchart


@router.delete("/{id}")
def delete_flowchart(
    session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Message:
    """
    Delete a flowchart.
    """
    flowchart = session.get(FlowChart, id)
    if not flowchart:
        raise HTTPException(status_code=404, detail="FlowChart not found")
    if not current_user.is_superuser and (flowchart.owner_id != current_user.id):
        raise HTTPException(status_code=400, detail="Not enough permissions")
    session.delete(flowchart)
    session.commit()
    return Message(message="FlowChart deleted successfully")