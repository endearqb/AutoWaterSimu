import uuid
from typing import Any
from datetime import datetime

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    ASM1FlowChart,
    ASM1FlowChartCreate,
    ASM1FlowChartPublic,
    ASM1FlowChartsPublic,
    ASM1FlowChartUpdate,
    Message,
)

router = APIRouter(prefix="/asm1-flowcharts", tags=["asm1-flowcharts"])


@router.get("/", response_model=ASM1FlowChartsPublic)
def read_asm1_flowcharts(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    """
    Retrieve ASM1 flowcharts.
    """

    if current_user.is_superuser:
        count_statement = select(func.count()).select_from(ASM1FlowChart)
        count = session.exec(count_statement).one()
        statement = select(ASM1FlowChart).offset(skip).limit(limit).order_by(ASM1FlowChart.updated_at.desc())
        flowcharts = session.exec(statement).all()
    else:
        count_statement = (
            select(func.count())
            .select_from(ASM1FlowChart)
            .where(ASM1FlowChart.owner_id == current_user.id)
        )
        count = session.exec(count_statement).one()
        statement = (
            select(ASM1FlowChart)
            .where(ASM1FlowChart.owner_id == current_user.id)
            .offset(skip)
            .limit(limit)
            .order_by(ASM1FlowChart.updated_at.desc())
        )
        flowcharts = session.exec(statement).all()

    return ASM1FlowChartsPublic(data=flowcharts, count=count)


@router.get("/{id}", response_model=ASM1FlowChartPublic)
def read_asm1_flowchart(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    """
    Get ASM1 flowchart by ID.
    """
    flowchart = session.get(ASM1FlowChart, id)
    if not flowchart:
        raise HTTPException(status_code=404, detail="ASM1 FlowChart not found")
    if not current_user.is_superuser and (flowchart.owner_id != current_user.id):
        raise HTTPException(status_code=400, detail="Not enough permissions")
    return flowchart


@router.post("/", response_model=ASM1FlowChartPublic)
def create_asm1_flowchart(
    *, session: SessionDep, current_user: CurrentUser, flowchart_in: ASM1FlowChartCreate
) -> Any:
    """
    Create new ASM1 flowchart.
    """
    print(f"DEBUG: Received flowchart_in: {flowchart_in}")
    print(f"DEBUG: flowchart_in.name: {flowchart_in.name}")
    print(f"DEBUG: flowchart_in.description: {flowchart_in.description}")
    print(f"DEBUG: flowchart_in.flow_data type: {type(flowchart_in.flow_data)}")
    print(f"DEBUG: flowchart_in.flow_data: {flowchart_in.flow_data}")
    
    try:
        flowchart = ASM1FlowChart(
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


@router.put("/{id}", response_model=ASM1FlowChartPublic)
def update_asm1_flowchart(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    flowchart_in: ASM1FlowChartUpdate,
) -> Any:
    """
    Update an ASM1 flowchart.
    """
    flowchart = session.get(ASM1FlowChart, id)
    if not flowchart:
        raise HTTPException(status_code=404, detail="ASM1 FlowChart not found")
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
def delete_asm1_flowchart(
    session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Message:
    """
    Delete an ASM1 flowchart.
    """
    flowchart = session.get(ASM1FlowChart, id)
    if not flowchart:
        raise HTTPException(status_code=404, detail="ASM1 FlowChart not found")
    if not current_user.is_superuser and (flowchart.owner_id != current_user.id):
        raise HTTPException(status_code=400, detail="Not enough permissions")
    session.delete(flowchart)
    session.commit()
    return Message(message="ASM1 FlowChart deleted successfully")