import uuid
from typing import Any
from datetime import datetime

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
        raise HTTPException(status_code=400, detail="Not enough permissions")
    return flowchart


@router.post("/", response_model=ASM3FlowChartPublic)
def create_asm3_flowchart(
    *, session: SessionDep, current_user: CurrentUser, flowchart_in: ASM3FlowChartCreate
) -> Any:
    """
    Create new ASM3 flowchart.
    """
    print(f"DEBUG: Received flowchart_in: {flowchart_in}")
    print(f"DEBUG: flowchart_in.name: {flowchart_in.name}")
    print(f"DEBUG: flowchart_in.description: {flowchart_in.description}")
    print(f"DEBUG: flowchart_in.flow_data type: {type(flowchart_in.flow_data)}")
    print(f"DEBUG: flowchart_in.flow_data: {flowchart_in.flow_data}")
    
    try:
        flowchart = ASM3FlowChart(
            name=flowchart_in.name,
            description=flowchart_in.description,
            flow_data=flowchart_in.flow_data,
            owner_id=current_user.id,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        print(f"DEBUG: Created flowchart object: {flowchart}")
        session.add(flowchart)
        session.commit()
        session.refresh(flowchart)
        print(f"DEBUG: Successfully saved flowchart with id: {flowchart.id}")
        return flowchart
    except Exception as e:
        print(f"DEBUG: Error creating flowchart: {e}")
        print(f"DEBUG: Error type: {type(e)}")
        raise e


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
        raise HTTPException(status_code=400, detail="Not enough permissions")
    
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
        raise HTTPException(status_code=400, detail="Not enough permissions")
    session.delete(flowchart)
    session.commit()
    return Message(message="ASM3 FlowChart deleted successfully")