from fastapi import HTTPException, status

from app.core.config import settings


def ensure_legacy_compute_writable() -> None:
    if not settings.LEGACY_COMPUTE_READ_ONLY:
        return

    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail={
            "code": "LEGACY_COMPUTE_READ_ONLY",
            "message": (
                "Legacy FastAPI compute is running in read-only comparison mode; "
                "create new compute jobs through the AutoWaterSimu Next Compute API."
            ),
            "replacement": "/api/v1/simulation-checks",
        },
    )
