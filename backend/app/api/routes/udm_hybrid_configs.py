import uuid
from typing import Any
from datetime import datetime

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Message,
    UDMHybridConfig,
    UDMHybridConfigCreate,
    UDMHybridConfigPublic,
    UDMHybridConfigsPublic,
    UDMHybridConfigUpdate,
)
from app.services.hybrid_udm_validation import build_hybrid_runtime_info

router = APIRouter(prefix="/udm-hybrid-configs", tags=["udm-hybrid-configs"])


def _validate_hybrid_config_or_raise(raw_hybrid_config: dict[str, Any]) -> None:
    try:
        build_hybrid_runtime_info(
            {
                "hybrid_config": raw_hybrid_config,
                "nodes": [],
                "edges": [],
                "customParameters": [],
            },
            strict=True,
        )
    except ValueError as validation_error:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "HYBRID_UDM_VALIDATION_FAILED",
                "errors": [str(validation_error)],
            },
        ) from validation_error


@router.get("/", response_model=UDMHybridConfigsPublic)
def read_udm_hybrid_configs(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    """
    Retrieve UDM hybrid configs.
    """
    if current_user.is_superuser:
        count_statement = select(func.count()).select_from(UDMHybridConfig)
        count = session.exec(count_statement).one()
        statement = (
            select(UDMHybridConfig)
            .offset(skip)
            .limit(limit)
            .order_by(UDMHybridConfig.updated_at.desc())
        )
        configs = session.exec(statement).all()
    else:
        count_statement = (
            select(func.count())
            .select_from(UDMHybridConfig)
            .where(UDMHybridConfig.owner_id == current_user.id)
        )
        count = session.exec(count_statement).one()
        statement = (
            select(UDMHybridConfig)
            .where(UDMHybridConfig.owner_id == current_user.id)
            .offset(skip)
            .limit(limit)
            .order_by(UDMHybridConfig.updated_at.desc())
        )
        configs = session.exec(statement).all()

    return UDMHybridConfigsPublic(data=configs, count=count)


@router.get("/{id}", response_model=UDMHybridConfigPublic)
def read_udm_hybrid_config(
    session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Any:
    """
    Get UDM hybrid config by ID.
    """
    hybrid_config = session.get(UDMHybridConfig, id)
    if not hybrid_config:
        raise HTTPException(status_code=404, detail="UDM Hybrid config not found")
    if not current_user.is_superuser and (hybrid_config.owner_id != current_user.id):
        raise HTTPException(status_code=400, detail="Not enough permissions")
    return hybrid_config


@router.post("/", response_model=UDMHybridConfigPublic)
def create_udm_hybrid_config(
    *, session: SessionDep, current_user: CurrentUser, config_in: UDMHybridConfigCreate
) -> Any:
    """
    Create new UDM hybrid config.
    """
    raw_hybrid_config = (
        config_in.hybrid_config.model_dump()
        if hasattr(config_in.hybrid_config, "model_dump")
        else dict(config_in.hybrid_config)
    )
    _validate_hybrid_config_or_raise(raw_hybrid_config)

    hybrid_config = UDMHybridConfig(
        name=config_in.name,
        description=config_in.description,
        hybrid_config=raw_hybrid_config,
        owner_id=current_user.id,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    session.add(hybrid_config)
    session.commit()
    session.refresh(hybrid_config)
    return hybrid_config


@router.put("/{id}", response_model=UDMHybridConfigPublic)
def update_udm_hybrid_config(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    config_in: UDMHybridConfigUpdate,
) -> Any:
    """
    Update an UDM hybrid config.
    """
    hybrid_config = session.get(UDMHybridConfig, id)
    if not hybrid_config:
        raise HTTPException(status_code=404, detail="UDM Hybrid config not found")
    if not current_user.is_superuser and (hybrid_config.owner_id != current_user.id):
        raise HTTPException(status_code=400, detail="Not enough permissions")

    update_dict = config_in.model_dump(exclude_unset=True)
    if "hybrid_config" in update_dict and update_dict["hybrid_config"] is not None:
        raw_hybrid_config = (
            update_dict["hybrid_config"].model_dump()
            if hasattr(update_dict["hybrid_config"], "model_dump")
            else dict(update_dict["hybrid_config"])
        )
        _validate_hybrid_config_or_raise(raw_hybrid_config)
        update_dict["hybrid_config"] = raw_hybrid_config

    update_dict["updated_at"] = datetime.now()
    hybrid_config.sqlmodel_update(update_dict)
    session.add(hybrid_config)
    session.commit()
    session.refresh(hybrid_config)
    return hybrid_config


@router.delete("/{id}")
def delete_udm_hybrid_config(
    session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Message:
    """
    Delete an UDM hybrid config.
    """
    hybrid_config = session.get(UDMHybridConfig, id)
    if not hybrid_config:
        raise HTTPException(status_code=404, detail="UDM Hybrid config not found")
    if not current_user.is_superuser and (hybrid_config.owner_id != current_user.id):
        raise HTTPException(status_code=400, detail="Not enough permissions")
    session.delete(hybrid_config)
    session.commit()
    return Message(message="UDM Hybrid config deleted successfully")
