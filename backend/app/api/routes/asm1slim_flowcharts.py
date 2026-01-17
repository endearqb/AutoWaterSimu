import uuid
from typing import Any
from datetime import datetime

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    ASM1SlimFlowChart,
    ASM1SlimFlowChartCreate,
    ASM1SlimFlowChartPublic,
    ASM1SlimFlowChartsPublic,
    ASM1SlimFlowChartUpdate,
    Message,
)

router = APIRouter(prefix="/asm1slim-flowcharts", tags=["asm1slim-flowcharts"])


@router.get("/", response_model=ASM1SlimFlowChartsPublic)
def read_asm1slim_flowcharts(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    """
    Retrieve ASM1Slim flowcharts.
    """

    if current_user.is_superuser:
        count_statement = select(func.count()).select_from(ASM1SlimFlowChart)
        count = session.exec(count_statement).one()
        statement = select(ASM1SlimFlowChart).offset(skip).limit(limit).order_by(ASM1SlimFlowChart.updated_at.desc())
        flowcharts = session.exec(statement).all()
    else:
        count_statement = (
            select(func.count())
            .select_from(ASM1SlimFlowChart)
            .where(ASM1SlimFlowChart.owner_id == current_user.id)
        )
        count = session.exec(count_statement).one()
        statement = (
            select(ASM1SlimFlowChart)
            .where(ASM1SlimFlowChart.owner_id == current_user.id)
            .offset(skip)
            .limit(limit)
            .order_by(ASM1SlimFlowChart.updated_at.desc())
        )
        flowcharts = session.exec(statement).all()

    return ASM1SlimFlowChartsPublic(data=flowcharts, count=count)


@router.get("/{id}", response_model=ASM1SlimFlowChartPublic)
def read_asm1slim_flowchart(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    """
    Get ASM1Slim flowchart by ID.
    """
    flowchart = session.get(ASM1SlimFlowChart, id)
    if not flowchart:
        raise HTTPException(status_code=404, detail="ASM1Slim FlowChart not found")
    if not current_user.is_superuser and (flowchart.owner_id != current_user.id):
        raise HTTPException(status_code=400, detail="Not enough permissions")
    return flowchart


@router.post("/", response_model=ASM1SlimFlowChartPublic)
def create_asm1slim_flowchart(
    *, session: SessionDep, current_user: CurrentUser, flowchart_in: ASM1SlimFlowChartCreate
) -> Any:
    """
    Create new ASM1Slim flowchart.
    """
    print(f"DEBUG: Received flowchart_in: {flowchart_in}")
    print(f"DEBUG: flowchart_in.name: {flowchart_in.name}")
    print(f"DEBUG: flowchart_in.description: {flowchart_in.description}")
    print(f"DEBUG: flowchart_in.flow_data type: {type(flowchart_in.flow_data)}")
    print(f"DEBUG: flowchart_in.flow_data: {flowchart_in.flow_data}")
    
    try:
        flowchart = ASM1SlimFlowChart(
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


@router.put("/{id}", response_model=ASM1SlimFlowChartPublic)
def update_asm1slim_flowchart(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    flowchart_in: ASM1SlimFlowChartUpdate,
) -> Any:
    """
    Update an ASM1Slim flowchart.
    """
    flowchart = session.get(ASM1SlimFlowChart, id)
    if not flowchart:
        raise HTTPException(status_code=404, detail="ASM1Slim FlowChart not found")
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
def delete_asm1slim_flowchart(
    session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Message:
    """
    Delete an ASM1Slim flowchart.
    """
    flowchart = session.get(ASM1SlimFlowChart, id)
    if not flowchart:
        raise HTTPException(status_code=404, detail="ASM1Slim FlowChart not found")
    if not current_user.is_superuser and (flowchart.owner_id != current_user.id):
        raise HTTPException(status_code=400, detail="Not enough permissions")
    session.delete(flowchart)
    session.commit()
    return Message(message="ASM1Slim FlowChart deleted successfully")