import uuid
from typing import Any
from datetime import datetime

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    UDMFlowChart,
    UDMFlowChartCreate,
    UDMFlowChartPublic,
    UDMFlowChartsPublic,
    UDMFlowChartUpdate,
    Message,
)

router = APIRouter(prefix="/udm-flowcharts", tags=["udm-flowcharts"])


@router.get("/", response_model=UDMFlowChartsPublic)
def read_udm_flowcharts(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    """
    Retrieve UDM flowcharts.
    """

    if current_user.is_superuser:
        count_statement = select(func.count()).select_from(UDMFlowChart)
        count = session.exec(count_statement).one()
        statement = select(UDMFlowChart).offset(skip).limit(limit).order_by(UDMFlowChart.updated_at.desc())
        flowcharts = session.exec(statement).all()
    else:
        count_statement = (
            select(func.count())
            .select_from(UDMFlowChart)
            .where(UDMFlowChart.owner_id == current_user.id)
        )
        count = session.exec(count_statement).one()
        statement = (
            select(UDMFlowChart)
            .where(UDMFlowChart.owner_id == current_user.id)
            .offset(skip)
            .limit(limit)
            .order_by(UDMFlowChart.updated_at.desc())
        )
        flowcharts = session.exec(statement).all()

    return UDMFlowChartsPublic(data=flowcharts, count=count)


@router.get("/{id}", response_model=UDMFlowChartPublic)
def read_udm_flowchart(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    """
    Get UDM flowchart by ID.
    """
    flowchart = session.get(UDMFlowChart, id)
    if not flowchart:
        raise HTTPException(status_code=404, detail="UDM FlowChart not found")
    if not current_user.is_superuser and (flowchart.owner_id != current_user.id):
        raise HTTPException(status_code=400, detail="Not enough permissions")
    return flowchart


@router.post("/", response_model=UDMFlowChartPublic)
def create_udm_flowchart(
    *, session: SessionDep, current_user: CurrentUser, flowchart_in: UDMFlowChartCreate
) -> Any:
    """
    Create new UDM flowchart.
    """
    flowchart = UDMFlowChart(
        name=flowchart_in.name,
        description=flowchart_in.description,
        flow_data=flowchart_in.flow_data,
        owner_id=current_user.id,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    session.add(flowchart)
    session.commit()
    session.refresh(flowchart)
    return flowchart


@router.put("/{id}", response_model=UDMFlowChartPublic)
def update_udm_flowchart(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    flowchart_in: UDMFlowChartUpdate,
) -> Any:
    """
    Update an UDM flowchart.
    """
    flowchart = session.get(UDMFlowChart, id)
    if not flowchart:
        raise HTTPException(status_code=404, detail="UDM FlowChart not found")
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
def delete_udm_flowchart(
    session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Message:
    """
    Delete an UDM flowchart.
    """
    flowchart = session.get(UDMFlowChart, id)
    if not flowchart:
        raise HTTPException(status_code=404, detail="UDM FlowChart not found")
    if not current_user.is_superuser and (flowchart.owner_id != current_user.id):
        raise HTTPException(status_code=400, detail="Not enough permissions")
    session.delete(flowchart)
    session.commit()
    return Message(message="UDM FlowChart deleted successfully")
