try:
    import sentry_sdk
except ImportError:
    sentry_sdk = None

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.routing import APIRoute
from starlette.middleware.cors import CORSMiddleware

from app.api.main import api_router
from app.core.config import settings
from app.core.exception_handlers import setup_exception_handlers
from app.core.simple_websocket_manager import simple_websocket_manager
from app.core.logging_config import setup_logging


def custom_generate_unique_id(route: APIRoute) -> str:
    if route.tags:
        return f"{route.tags[0]}-{route.name}"
    return route.name


if sentry_sdk and settings.SENTRY_DSN and settings.ENVIRONMENT != "local":
    sentry_sdk.init(dsn=str(settings.SENTRY_DSN), enable_tracing=True)

# 初始化日志配置
setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage legacy application startup/shutdown hooks."""

    await simple_websocket_manager.start_background_tasks()
    try:
        yield
    finally:
        await simple_websocket_manager.stop_background_tasks()


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    generate_unique_id_function=custom_generate_unique_id,
    lifespan=lifespan,
)

# Set all CORS enabled origins
if settings.all_cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.all_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Setup exception handlers
setup_exception_handlers(app)

app.include_router(api_router, prefix=settings.API_V1_STR)
