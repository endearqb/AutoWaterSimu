import hashlib
import json
import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import Session, func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Message,
    UDMModel,
    UDMModelCreate,
    UDMModelCreateFromTemplate,
    UDMModelDefinitionDraft,
    UDMModelDetailPublic,
    UDMModelPublic,
    UDMModelUpdate,
    UDMModelsPublic,
    UDMModelVersion,
    UDMModelVersionPublic,
    UDMValidationIssue,
    UDMValidationResponse,
)
from app.services.udm_expression import validate_udm_definition
from app.services.udm_seed_templates import (
    get_udm_seed_template,
    list_udm_seed_templates,
)

router = APIRouter(prefix="/udm-models", tags=["udm-models"])


def _definition_hash(
    *,
    components: list[dict[str, Any]],
    parameters: list[dict[str, Any]],
    processes: list[dict[str, Any]],
    meta: dict[str, Any] | None,
) -> str:
    payload = {
        "components": components,
        "parameters": parameters,
        "processes": processes,
        "meta": meta or {},
    }
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _validate_definition_payload(
    *,
    components: list[dict[str, Any]],
    parameters: list[dict[str, Any]],
    processes: list[dict[str, Any]],
) -> UDMValidationResponse:
    component_names = [str(item.get("name", "")).strip() for item in components]
    parameter_names = [str(item.get("name", "")).strip() for item in parameters]

    result = validate_udm_definition(
        components=component_names,
        processes=processes,
        declared_parameters=parameter_names,
    )

    return UDMValidationResponse(
        ok=result.ok,
        errors=[
            UDMValidationIssue(
                code=issue.code,
                message=issue.message,
                process=issue.process,
            )
            for issue in result.errors
        ],
        warnings=[
            UDMValidationIssue(
                code=issue.code,
                message=issue.message,
                process=issue.process,
            )
            for issue in result.warnings
        ],
        extracted_parameters=result.extracted_parameters,
    )


def _to_model_public(model: UDMModel) -> UDMModelPublic:
    return UDMModelPublic(
        id=model.id,
        name=model.name,
        description=model.description,
        tags=model.tags or [],
        current_version=model.current_version,
        is_published=model.is_published,
        owner_id=model.owner_id,
        created_at=model.created_at,
        updated_at=model.updated_at,
    )


def _to_version_public(version: UDMModelVersion) -> UDMModelVersionPublic:
    return UDMModelVersionPublic(
        id=version.id,
        model_id=version.model_id,
        version=version.version,
        content_hash=version.content_hash,
        components=version.components or [],
        parameters=version.parameters or [],
        processes=version.processes or [],
        meta=version.meta,
        validation_ok=version.validation_ok,
        validation_errors=version.validation_errors or [],
        seed_source=version.seed_source,
        created_at=version.created_at,
        updated_at=version.updated_at,
    )


def _build_model_detail(session: Session, model: UDMModel) -> UDMModelDetailPublic:
    versions = session.exec(
        select(UDMModelVersion)
        .where(UDMModelVersion.model_id == model.id)
        .order_by(UDMModelVersion.version.desc())
    ).all()
    versions_public = [_to_version_public(version) for version in versions]
    latest_version = versions_public[0] if versions_public else None

    return UDMModelDetailPublic(
        **_to_model_public(model).model_dump(),
        latest_version=latest_version,
        versions=versions_public,
    )


def _get_model_or_404(
    session: Session,
    current_user: CurrentUser,
    model_id: uuid.UUID,
) -> UDMModel:
    model = session.get(UDMModel, model_id)
    if not model:
        raise HTTPException(status_code=404, detail="UDM model not found")
    if not current_user.is_superuser and model.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return model


def _create_model_with_version(
    *,
    session: Session,
    current_user: CurrentUser,
    create_data: UDMModelCreate,
) -> UDMModelDetailPublic:
    components = [item.model_dump() for item in create_data.components]
    parameters = [item.model_dump() for item in create_data.parameters]
    processes = [item.model_dump() for item in create_data.processes]
    meta = create_data.meta

    validation = _validate_definition_payload(
        components=components,
        parameters=parameters,
        processes=processes,
    )
    if not validation.ok:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "UDM model definition validation failed",
                "errors": [item.model_dump() for item in validation.errors],
                "warnings": [item.model_dump() for item in validation.warnings],
            },
        )

    now = datetime.now()
    model = UDMModel(
        name=create_data.name,
        description=create_data.description,
        tags=create_data.tags,
        current_version=1,
        is_published=False,
        owner_id=current_user.id,
        created_at=now,
        updated_at=now,
    )
    session.add(model)
    session.flush()

    version = UDMModelVersion(
        model_id=model.id,
        version=1,
        content_hash=_definition_hash(
            components=components,
            parameters=parameters,
            processes=processes,
            meta=meta,
        ),
        components=components,
        parameters=parameters,
        processes=processes,
        meta=meta,
        validation_ok=validation.ok,
        validation_errors=[item.model_dump() for item in validation.errors],
        seed_source=create_data.seed_source,
        owner_id=current_user.id,
        created_at=now,
        updated_at=now,
    )
    session.add(version)
    session.commit()
    session.refresh(model)

    return _build_model_detail(session, model)


@router.get("/templates", response_model=list[dict[str, Any]])
def get_udm_templates() -> Any:
    return list_udm_seed_templates()


@router.post("/validate", response_model=UDMValidationResponse)
def validate_udm_model_definition(
    *,
    draft: UDMModelDefinitionDraft,
) -> Any:
    components = [item.model_dump() for item in draft.components]
    parameters = [item.model_dump() for item in draft.parameters]
    processes = [item.model_dump() for item in draft.processes]

    return _validate_definition_payload(
        components=components,
        parameters=parameters,
        processes=processes,
    )


@router.post("/", response_model=UDMModelDetailPublic)
def create_udm_model(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    model_in: UDMModelCreate,
) -> Any:
    return _create_model_with_version(
        session=session,
        current_user=current_user,
        create_data=model_in,
    )


@router.post("/from-template", response_model=UDMModelDetailPublic)
def create_udm_model_from_template(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    template_in: UDMModelCreateFromTemplate,
) -> Any:
    try:
        template = get_udm_seed_template(template_in.template_key)
    except KeyError as ex:
        raise HTTPException(status_code=404, detail=str(ex)) from ex

    model_create = UDMModelCreate(
        name=template_in.name or template["name"],
        description=template_in.description or template.get("description"),
        tags=template.get("tags", []),
        components=template.get("components", []),
        parameters=template.get("parameters", []),
        processes=template.get("processes", []),
        meta=template.get("meta"),
        seed_source=template.get("key"),
    )
    return _create_model_with_version(
        session=session,
        current_user=current_user,
        create_data=model_create,
    )


@router.get("/", response_model=UDMModelsPublic)
def read_udm_models(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    q: str | None = Query(default=None, description="Search by model name"),
) -> Any:
    filters = []
    if not current_user.is_superuser:
        filters.append(UDMModel.owner_id == current_user.id)
    if q:
        filters.append(UDMModel.name.ilike(f"%{q}%"))

    count_statement = select(func.count()).select_from(UDMModel)
    if filters:
        count_statement = count_statement.where(*filters)
    count = session.exec(count_statement).one()

    statement = select(UDMModel)
    if filters:
        statement = statement.where(*filters)
    statement = statement.order_by(UDMModel.updated_at.desc()).offset(skip).limit(limit)
    models = session.exec(statement).all()

    return UDMModelsPublic(
        data=[_to_model_public(model) for model in models],
        count=count,
    )


@router.get("/{model_id}", response_model=UDMModelDetailPublic)
def read_udm_model(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    model_id: uuid.UUID,
) -> Any:
    model = _get_model_or_404(session, current_user, model_id)
    return _build_model_detail(session, model)


@router.put("/{model_id}", response_model=UDMModelDetailPublic)
def update_udm_model(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    model_id: uuid.UUID,
    model_in: UDMModelUpdate,
) -> Any:
    model = _get_model_or_404(session, current_user, model_id)
    latest_version = session.exec(
        select(UDMModelVersion)
        .where(UDMModelVersion.model_id == model.id)
        .order_by(UDMModelVersion.version.desc())
    ).first()
    if not latest_version:
        raise HTTPException(status_code=500, detail="UDM model has no version data")

    update_data = model_in.model_dump(exclude_unset=True)
    now = datetime.now()

    for key in ("name", "description", "tags", "is_published"):
        if key in update_data:
            setattr(model, key, update_data[key])

    definition_changed = any(
        key in update_data for key in ("components", "parameters", "processes", "meta")
    )

    if definition_changed:
        components = update_data.get("components", latest_version.components or [])
        parameters = update_data.get("parameters", latest_version.parameters or [])
        processes = update_data.get("processes", latest_version.processes or [])
        meta = update_data.get("meta", latest_version.meta)

        validation = _validate_definition_payload(
            components=components,
            parameters=parameters,
            processes=processes,
        )
        if not validation.ok:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "UDM model definition validation failed",
                    "errors": [item.model_dump() for item in validation.errors],
                    "warnings": [item.model_dump() for item in validation.warnings],
                },
            )

        content_hash = _definition_hash(
            components=components,
            parameters=parameters,
            processes=processes,
            meta=meta,
        )

        if content_hash != latest_version.content_hash:
            new_version_no = model.current_version + 1
            new_version = UDMModelVersion(
                model_id=model.id,
                version=new_version_no,
                content_hash=content_hash,
                components=components,
                parameters=parameters,
                processes=processes,
                meta=meta,
                validation_ok=validation.ok,
                validation_errors=[item.model_dump() for item in validation.errors],
                seed_source=latest_version.seed_source,
                owner_id=current_user.id,
                created_at=now,
                updated_at=now,
            )
            model.current_version = new_version_no
            session.add(new_version)

    model.updated_at = now
    session.add(model)
    session.commit()
    session.refresh(model)
    return _build_model_detail(session, model)


@router.delete("/{model_id}", response_model=Message)
def delete_udm_model(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    model_id: uuid.UUID,
) -> Any:
    model = _get_model_or_404(session, current_user, model_id)
    session.delete(model)
    session.commit()
    return Message(message="UDM model deleted successfully")
