from fastapi import APIRouter

from app.api.routes import asm1, asm1_flowcharts, asm1slim, asm1slim_flowcharts, asm3, asm3_flowcharts, flowcharts, items, login, material_balance, private, stats, users, utils
from app.api.v1 import simple_websocket
from app.core.config import settings

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(utils.router)
api_router.include_router(items.router)
api_router.include_router(flowcharts.router)
api_router.include_router(asm1slim_flowcharts.router)
api_router.include_router(asm1_flowcharts.router)
api_router.include_router(asm3_flowcharts.router)
api_router.include_router(material_balance.router, prefix="/material-balance", tags=["material-balance"])
api_router.include_router(asm1slim.router, prefix="/asm1slim", tags=["asm1slim"])
api_router.include_router(asm1.router, prefix="/asm1", tags=["asm1"])
api_router.include_router(asm3.router, prefix="/asm3", tags=["asm3"])
api_router.include_router(simple_websocket.router, prefix="/simple-ws", tags=["simple-websocket"])
api_router.include_router(stats.router)


if settings.ENVIRONMENT == "local":
    api_router.include_router(private.router)
