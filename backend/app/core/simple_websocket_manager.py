"""
简化的WebSocket管理器 - 直接在FastAPI中处理消息，减少Redis依赖
"""
import asyncio
import json
import logging
from typing import Dict, Set, Optional, Any, List
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect
from contextlib import asynccontextmanager
import weakref
import threading

logger = logging.getLogger(__name__)


class SimpleWebSocketManager:
    """简化的WebSocket连接管理器，直接处理消息传递"""
    
    def __init__(self):
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}
        self.connection_metadata: Dict[str, Dict[str, Any]] = {}
        self._connection_counter = 0
        self._lock = asyncio.Lock()
        self._cleanup_task: Optional[asyncio.Task] = None
        self._ping_task: Optional[asyncio.Task] = None
        
        # 全局消息队列，用于跨线程消息传递
        self._message_queue: asyncio.Queue = asyncio.Queue()
        self._message_processor_task: Optional[asyncio.Task] = None
        
    def _generate_connection_id(self) -> str:
        """生成唯一的连接ID"""
        self._connection_counter += 1
        return f"conn_{self._connection_counter}_{int(datetime.now().timestamp() * 1000)}"
    
    async def connect(self, websocket: WebSocket, task_id: str, user_id: Optional[str] = None) -> str:
        """建立WebSocket连接"""
        await websocket.accept()
        
        connection_id = self._generate_connection_id()
        
        async with self._lock:
            # 初始化任务连接组
            if task_id not in self.active_connections:
                self.active_connections[task_id] = {}
            
            # 添加连接
            self.active_connections[task_id][connection_id] = websocket
            
            # 存储连接元数据
            self.connection_metadata[connection_id] = {
                "task_id": task_id,
                "user_id": user_id,
                "connected_at": datetime.now(),
                "last_ping": datetime.now()
            }
        
        logger.info(f"[SimpleWebSocket] 连接已建立: task_id={task_id}, connection_id={connection_id}, user_id={user_id}")
        logger.info(f"[SimpleWebSocket] 当前活跃连接总数: {len(self.active_connections)}")
        logger.info(f"[SimpleWebSocket] 任务 {task_id} 的连接数: {len(self.active_connections.get(task_id, {}))}")
        return connection_id
    
    async def disconnect(self, connection_id: str):
        """断开WebSocket连接"""
        async with self._lock:
            if connection_id in self.connection_metadata:
                metadata = self.connection_metadata[connection_id]
                task_id = metadata["task_id"]
                
                # 移除连接
                if task_id in self.active_connections:
                    self.active_connections[task_id].pop(connection_id, None)
                    
                    # 如果任务没有活跃连接，清理任务组
                    if not self.active_connections[task_id]:
                        del self.active_connections[task_id]
                
                # 移除元数据
                del self.connection_metadata[connection_id]
                
                logger.info(f"[SimpleWebSocket] 连接已断开: task_id={task_id}, connection_id={connection_id}")
    
    async def get_task_connections(self, task_id: str) -> List[str]:
        """获取任务的活跃连接ID列表"""
        async with self._lock:
            if task_id in self.active_connections:
                return list(self.active_connections[task_id].keys())
            return []
    
    async def get_connection_count(self, task_id: str) -> int:
        """获取任务的连接数量"""
        async with self._lock:
            return len(self.active_connections.get(task_id, {}))
    
    async def broadcast_to_task(self, message: dict, task_id: str):
        """向指定任务的所有连接广播消息"""
        async with self._lock:
            if task_id not in self.active_connections:
                logger.warning(f"[SimpleWebSocket] 任务 {task_id} 没有活跃连接")
                return
            
            connections = self.active_connections[task_id].copy()
        
        # 发送消息给所有连接
        disconnected_connections = []
        for connection_id, websocket in connections.items():
            try:
                await websocket.send_text(json.dumps(message, ensure_ascii=False))
                logger.debug(f"[SimpleWebSocket] 消息已发送: task_id={task_id}, connection_id={connection_id}")
            except Exception as e:
                logger.error(f"[SimpleWebSocket] 发送消息失败: task_id={task_id}, connection_id={connection_id}, error={e}")
                disconnected_connections.append(connection_id)
        
        # 清理断开的连接
        if disconnected_connections:
            async with self._lock:
                for connection_id in disconnected_connections:
                    await self.disconnect(connection_id)
    
    async def send_progress_update(self, task_id: str, progress_data: dict):
        """发送进度更新"""
        message = {
            "type": "progress_update",
            "task_id": task_id,
            "timestamp": datetime.now().isoformat(),
            "data": progress_data
        }
        await self.broadcast_to_task(message, task_id)
    
    async def send_task_complete(self, task_id: str, result_data: dict):
        """发送任务完成通知"""
        message = {
            "type": "task_complete",
            "task_id": task_id,
            "timestamp": datetime.now().isoformat(),
            "data": result_data
        }
        await self.broadcast_to_task(message, task_id)
    
    async def send_task_error(self, task_id: str, error_data: dict):
        """发送任务错误通知"""
        message = {
            "type": "task_error",
            "task_id": task_id,
            "timestamp": datetime.now().isoformat(),
            "data": error_data
        }
        await self.broadcast_to_task(message, task_id)
    
    def send_progress_from_thread(self, task_id: str, progress: float, message: str, status: str = "running"):
        """从其他线程发送进度更新（线程安全）"""
        progress_data = {
            "progress": progress,
            "message": message,
            "status": status
        }
        
        # 将消息放入队列，由消息处理器异步处理
        try:
            self._message_queue.put_nowait({
                "type": "progress_update",
                "task_id": task_id,
                "data": progress_data
            })
            logger.info(f"[SimpleWebSocket] 进度消息已加入队列: task_id={task_id}, progress={progress}")
        except Exception as e:
            logger.error(f"[SimpleWebSocket] 加入消息队列失败: task_id={task_id}, error={e}")
    
    def send_task_complete_from_thread(self, task_id: str, result_data: dict):
        """从其他线程发送任务完成通知（线程安全）"""
        try:
            self._message_queue.put_nowait({
                "type": "task_complete",
                "task_id": task_id,
                "data": result_data
            })
            logger.info(f"[SimpleWebSocket] 完成消息已加入队列: task_id={task_id}")
        except Exception as e:
            logger.error(f"[SimpleWebSocket] 加入消息队列失败: task_id={task_id}, error={e}")
    
    def send_task_error_from_thread(self, task_id: str, error_data: dict):
        """从其他线程发送任务错误通知（线程安全）"""
        try:
            self._message_queue.put_nowait({
                "type": "task_error",
                "task_id": task_id,
                "data": error_data
            })
            logger.info(f"[SimpleWebSocket] 错误消息已加入队列: task_id={task_id}")
        except Exception as e:
            logger.error(f"[SimpleWebSocket] 加入消息队列失败: task_id={task_id}, error={e}")
    
    async def _process_message_queue(self):
        """处理消息队列中的消息"""
        while True:
            try:
                # 等待消息
                message_data = await self._message_queue.get()
                
                message_type = message_data["type"]
                task_id = message_data["task_id"]
                data = message_data["data"]
                
                # 构建WebSocket消息
                message = {
                    "type": message_type,
                    "task_id": task_id,
                    "timestamp": datetime.now().isoformat(),
                    "data": data
                }
                
                # 广播消息
                await self.broadcast_to_task(message, task_id)
                
                # 标记任务完成
                self._message_queue.task_done()
                
            except Exception as e:
                logger.error(f"[SimpleWebSocket] 处理消息队列失败: {e}")
                await asyncio.sleep(1)  # 避免快速重试
    
    async def cleanup_stale_connections(self):
        """清理过期连接"""
        while True:
            try:
                await asyncio.sleep(300)  # 每5分钟检查一次
                
                current_time = datetime.now()
                stale_connections = []
                
                async with self._lock:
                    for connection_id, metadata in self.connection_metadata.items():
                        last_ping = metadata.get("last_ping", metadata["connected_at"])
                        if isinstance(last_ping, str):
                            last_ping = datetime.fromisoformat(last_ping)
                        
                        # 如果超过10分钟没有ping，认为连接已断开
                        if (current_time - last_ping).total_seconds() > 600:
                            stale_connections.append(connection_id)
                
                # 清理过期连接
                for connection_id in stale_connections:
                    await self.disconnect(connection_id)
                    logger.info(f"[SimpleWebSocket] 清理过期连接: {connection_id}")
                    
            except Exception as e:
                logger.error(f"[SimpleWebSocket] 清理过期连接失败: {e}")
    
    async def ping_all_connections(self):
        """向所有连接发送ping"""
        while True:
            try:
                await asyncio.sleep(60)  # 每分钟ping一次
                
                async with self._lock:
                    all_connections = {}
                    for task_id, connections in self.active_connections.items():
                        all_connections.update(connections)
                
                ping_message = {
                    "type": "ping",
                    "timestamp": datetime.now().isoformat()
                }
                
                disconnected_connections = []
                for connection_id, websocket in all_connections.items():
                    try:
                        await websocket.send_text(json.dumps(ping_message))
                        # 更新ping时间
                        if connection_id in self.connection_metadata:
                            self.connection_metadata[connection_id]["last_ping"] = datetime.now()
                    except Exception as e:
                        logger.warning(f"[SimpleWebSocket] Ping失败: {connection_id}, error={e}")
                        disconnected_connections.append(connection_id)
                
                # 清理断开的连接
                for connection_id in disconnected_connections:
                    await self.disconnect(connection_id)
                    
            except Exception as e:
                logger.error(f"[SimpleWebSocket] Ping所有连接失败: {e}")
    
    async def start_background_tasks(self):
        """启动后台任务"""
        if not self._cleanup_task:
            self._cleanup_task = asyncio.create_task(self.cleanup_stale_connections())
        if not self._ping_task:
            self._ping_task = asyncio.create_task(self.ping_all_connections())
        if not self._message_processor_task:
            self._message_processor_task = asyncio.create_task(self._process_message_queue())
        
        logger.info("[SimpleWebSocket] 后台任务已启动")
    
    async def stop_background_tasks(self):
        """停止后台任务"""
        tasks = [self._cleanup_task, self._ping_task, self._message_processor_task]
        for task in tasks:
            if task and not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
        
        self._cleanup_task = None
        self._ping_task = None
        self._message_processor_task = None
        
        logger.info("[SimpleWebSocket] 后台任务已停止")
    
    @asynccontextmanager
    async def websocket_connection(self, websocket: WebSocket, task_id: str, user_id: Optional[str] = None):
        """WebSocket连接上下文管理器"""
        connection_id = await self.connect(websocket, task_id, user_id)
        try:
            yield connection_id
        except WebSocketDisconnect:
            logger.info(f"[SimpleWebSocket] 客户端主动断开连接: {connection_id}")
        except Exception as e:
            logger.error(f"[SimpleWebSocket] WebSocket连接异常: {connection_id}, error={e}")
        finally:
            await self.disconnect(connection_id)


# 全局简化WebSocket管理器实例
simple_websocket_manager = SimpleWebSocketManager()