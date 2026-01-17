"""
简化的WebSocket路由 - 使用简化的WebSocket管理器
"""
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Optional
from app.core.simple_websocket_manager import simple_websocket_manager

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/task/{task_id}")
async def websocket_task_endpoint(
    websocket: WebSocket,
    task_id: str,
    user_id: Optional[str] = Query(None)
):
    """
    WebSocket端点，用于接收任务进度更新
    
    Args:
        websocket: WebSocket连接
        task_id: 任务ID
        user_id: 用户ID（可选）
    """
    logger.info(f"[SimpleWebSocket] 新的WebSocket连接请求: task_id={task_id}, user_id={user_id}")
    
    async with simple_websocket_manager.websocket_connection(websocket, task_id, user_id) as connection_id:
        try:
            # 发送连接确认消息
            welcome_message = {
                "type": "connection_established",
                "task_id": task_id,
                "connection_id": connection_id,
                "message": "WebSocket connection established successfully"
            }
            await websocket.send_text(json.dumps(welcome_message, ensure_ascii=False))
            
            # 保持连接活跃，处理客户端消息
            while True:
                try:
                    # 接收客户端消息
                    data = await websocket.receive_text()
                    message = json.loads(data)
                    
                    # 处理不同类型的客户端消息
                    message_type = message.get("type")
                    
                    if message_type == "ping":
                        # 响应ping消息
                        pong_message = {
                            "type": "pong",
                            "timestamp": message.get("timestamp"),
                            "connection_id": connection_id
                        }
                        await websocket.send_text(json.dumps(pong_message, ensure_ascii=False))
                        logger.debug(f"[SimpleWebSocket] Pong sent: {connection_id}")
                        
                    elif message_type == "subscribe":
                        # 处理订阅请求（如果需要）
                        response = {
                            "type": "subscription_confirmed",
                            "task_id": task_id,
                            "connection_id": connection_id
                        }
                        await websocket.send_text(json.dumps(response, ensure_ascii=False))
                        logger.info(f"[SimpleWebSocket] Subscription confirmed: {connection_id}")
                        
                    elif message_type == "get_status":
                        # 获取连接状态
                        connection_count = await simple_websocket_manager.get_connection_count(task_id)
                        status_message = {
                            "type": "status_response",
                            "task_id": task_id,
                            "connection_id": connection_id,
                            "connection_count": connection_count,
                            "active_connections": await simple_websocket_manager.get_task_connections(task_id)
                        }
                        await websocket.send_text(json.dumps(status_message, ensure_ascii=False))
                        logger.info(f"[SimpleWebSocket] Status sent: {connection_id}")
                        
                    else:
                        # 未知消息类型
                        error_message = {
                            "type": "error",
                            "message": f"Unknown message type: {message_type}",
                            "connection_id": connection_id
                        }
                        await websocket.send_text(json.dumps(error_message, ensure_ascii=False))
                        logger.warning(f"[SimpleWebSocket] Unknown message type: {message_type} from {connection_id}")
                        
                except json.JSONDecodeError:
                    # JSON解析错误
                    error_message = {
                        "type": "error",
                        "message": "Invalid JSON format",
                        "connection_id": connection_id
                    }
                    await websocket.send_text(json.dumps(error_message, ensure_ascii=False))
                    logger.warning(f"[SimpleWebSocket] JSON decode error from {connection_id}")
                    
                except Exception as e:
                    logger.error(f"[SimpleWebSocket] Error processing message from {connection_id}: {e}")
                    break
                    
        except WebSocketDisconnect:
            logger.info(f"[SimpleWebSocket] 客户端主动断开连接: {connection_id}")
        except Exception as e:
            logger.error(f"[SimpleWebSocket] WebSocket连接异常: {connection_id}, error={e}")


@router.get("/connections/{task_id}")
async def get_task_connections(task_id: str):
    """
    获取指定任务的WebSocket连接信息
    
    Args:
        task_id: 任务ID
        
    Returns:
        连接信息
    """
    try:
        connections = await simple_websocket_manager.get_task_connections(task_id)
        connection_count = await simple_websocket_manager.get_connection_count(task_id)
        
        return {
            "task_id": task_id,
            "connection_count": connection_count,
            "connections": connections,
            "status": "success"
        }
    except Exception as e:
        logger.error(f"[SimpleWebSocket] Error getting connections for task {task_id}: {e}")
        return {
            "task_id": task_id,
            "error": str(e),
            "status": "error"
        }


@router.post("/broadcast/{task_id}")
async def broadcast_message(task_id: str, message: dict):
    """
    向指定任务的所有连接广播消息
    
    Args:
        task_id: 任务ID
        message: 要广播的消息
        
    Returns:
        广播结果
    """
    try:
        await simple_websocket_manager.broadcast_to_task(message, task_id)
        connection_count = await simple_websocket_manager.get_connection_count(task_id)
        
        return {
            "task_id": task_id,
            "message": "Message broadcasted successfully",
            "connection_count": connection_count,
            "status": "success"
        }
    except Exception as e:
        logger.error(f"[SimpleWebSocket] Error broadcasting message to task {task_id}: {e}")
        return {
            "task_id": task_id,
            "error": str(e),
            "status": "error"
        }


@router.get("/health")
async def websocket_health():
    """
    WebSocket服务健康检查
    
    Returns:
        健康状态
    """
    try:
        # 获取总连接数
        total_connections = sum(
            len(connections) 
            for connections in simple_websocket_manager.active_connections.values()
        )
        
        return {
            "status": "healthy",
            "total_connections": total_connections,
            "active_tasks": len(simple_websocket_manager.active_connections),
            "message": "Simple WebSocket service is running"
        }
    except Exception as e:
        logger.error(f"[SimpleWebSocket] Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "message": "Simple WebSocket service has issues"
        }