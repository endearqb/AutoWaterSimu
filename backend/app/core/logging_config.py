"""
统一的日志配置系统
提供结构化日志记录和性能监控
"""

import logging
import logging.config
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from app.core.config import settings


class StructuredFormatter(logging.Formatter):
    """结构化日志格式化器"""
    
    def format(self, record: logging.LogRecord) -> str:
        # 基础日志信息
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        
        # 添加额外的结构化数据
        if hasattr(record, 'extra_data'):
            log_data.update(record.extra_data)
        
        # 添加异常信息
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        # 添加文件和行号信息（仅在DEBUG模式下）
        if settings.LOG_LEVEL == "DEBUG":
            log_data.update({
                "file": record.filename,
                "line": record.lineno,
                "function": record.funcName
            })
        
        # 格式化输出
        formatted_parts = [
            f"{log_data['timestamp']}",
            f"[{log_data['level']}]",
            f"{log_data['logger']}:",
            f"{log_data['message']}"
        ]
        
        # 添加额外数据
        extra_items = []
        for key, value in log_data.items():
            if key not in ['timestamp', 'level', 'logger', 'message', 'file', 'line', 'function', 'exception']:
                extra_items.append(f"{key}={value}")
        
        if extra_items:
            formatted_parts.append(f"[{', '.join(extra_items)}]")
        
        # 添加调试信息
        if settings.LOG_LEVEL == "DEBUG" and 'file' in log_data:
            formatted_parts.append(f"({log_data['file']}:{log_data['line']})")
        
        result = " ".join(formatted_parts)
        
        # 添加异常信息
        if 'exception' in log_data:
            result += f"\n{log_data['exception']}"
        
        return result


def setup_logging() -> None:
    """设置应用程序日志配置"""
    
    # 确保日志目录存在
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    # 日志配置
    logging_config = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "structured": {
                "()": StructuredFormatter,
            },
            "simple": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S"
            }
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "level": settings.LOG_LEVEL,
                "formatter": "structured",
                "stream": sys.stdout
            },
            "file": {
                "class": "logging.handlers.RotatingFileHandler",
                "level": "DEBUG",
                "formatter": "structured",
                "filename": "logs/app.log",
                "maxBytes": 10485760,  # 10MB
                "backupCount": 5,
                "encoding": "utf-8"
            },
            "error_file": {
                "class": "logging.handlers.RotatingFileHandler",
                "level": "ERROR",
                "formatter": "structured",
                "filename": "logs/error.log",
                "maxBytes": 10485760,  # 10MB
                "backupCount": 5,
                "encoding": "utf-8"
            }
        },
        "loggers": {
            "app": {
                "level": "DEBUG",
                "handlers": ["console", "file", "error_file"],
                "propagate": False
            },
            "uvicorn": {
                "level": "INFO",
                "handlers": ["console"],
                "propagate": False
            },
            "sqlalchemy.engine": {
                "level": "WARNING",
                "handlers": ["console"],
                "propagate": False
            }
        },
        "root": {
            "level": settings.LOG_LEVEL,
            "handlers": ["console", "file"]
        }
    }
    
    # 应用日志配置
    logging.config.dictConfig(logging_config)


class StructuredLogger:
    """结构化日志记录器包装类"""
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
    
    def _log_with_extra(self, level: int, message: str, **kwargs) -> None:
        """带额外数据的日志记录"""
        extra_data = {k: v for k, v in kwargs.items() if v is not None}
        self.logger.log(level, message, extra={'extra_data': extra_data})
    
    def debug(self, message: str, **kwargs) -> None:
        """调试日志"""
        self._log_with_extra(logging.DEBUG, message, **kwargs)
    
    def info(self, message: str, **kwargs) -> None:
        """信息日志"""
        self._log_with_extra(logging.INFO, message, **kwargs)
    
    def warning(self, message: str, **kwargs) -> None:
        """警告日志"""
        self._log_with_extra(logging.WARNING, message, **kwargs)
    
    def error(self, message: str, **kwargs) -> None:
        """错误日志"""
        self._log_with_extra(logging.ERROR, message, **kwargs)
    
    def critical(self, message: str, **kwargs) -> None:
        """严重错误日志"""
        self._log_with_extra(logging.CRITICAL, message, **kwargs)


class TaskLogger(StructuredLogger):
    """任务专用日志记录器"""
    
    def __init__(self, task_id: str, task_type: str = "unknown"):
        super().__init__(f"app.tasks.{task_type}")
        self.task_id = task_id
        self.task_type = task_type
    
    def _log_with_task_context(self, level: int, message: str, **kwargs) -> None:
        """带任务上下文的日志记录"""
        kwargs.update({
            "task_id": self.task_id,
            "task_type": self.task_type
        })
        self._log_with_extra(level, message, **kwargs)
    
    def log_start(self, **kwargs) -> None:
        """记录任务开始"""
        self._log_with_task_context(logging.INFO, "任务开始", **kwargs)
    
    def log_progress(self, progress: float, step: str, **kwargs) -> None:
        """记录任务进度"""
        self._log_with_task_context(
            logging.INFO, 
            f"任务进度更新: {step}", 
            progress=f"{progress:.1f}%",
            step=step,
            **kwargs
        )
    
    def log_completion(self, duration_seconds: float, **kwargs) -> None:
        """记录任务完成"""
        self._log_with_task_context(
            logging.INFO, 
            "任务完成", 
            duration_seconds=duration_seconds,
            **kwargs
        )
    
    def log_error(self, error: Exception, **kwargs) -> None:
        """记录任务错误"""
        self._log_with_task_context(
            logging.ERROR, 
            f"任务执行失败: {str(error)}", 
            error_type=type(error).__name__,
            **kwargs
        )
        self.logger.exception("任务异常详情")
    
    def log_cancellation(self, reason: str = "用户取消", **kwargs) -> None:
        """记录任务取消"""
        self._log_with_task_context(
            logging.WARNING, 
            f"任务被取消: {reason}", 
            cancellation_reason=reason,
            **kwargs
        )


class PerformanceLogger(StructuredLogger):
    """性能监控日志记录器"""
    
    def __init__(self, name: str):
        super().__init__(f"app.performance.{name}")
    
    def log_memory_usage(self, memory_mb: float, context: str = "", **kwargs) -> None:
        """记录内存使用情况"""
        self._log_with_extra(
            logging.INFO, 
            f"内存使用情况: {context}", 
            memory_mb=memory_mb,
            context=context,
            **kwargs
        )
    
    def log_execution_time(self, operation: str, duration_seconds: float, **kwargs) -> None:
        """记录执行时间"""
        self._log_with_extra(
            logging.INFO, 
            f"操作执行时间: {operation}", 
            operation=operation,
            duration_seconds=duration_seconds,
            **kwargs
        )
    
    def log_database_query(self, query_type: str, duration_ms: float, **kwargs) -> None:
        """记录数据库查询性能"""
        self._log_with_extra(
            logging.DEBUG, 
            f"数据库查询: {query_type}", 
            query_type=query_type,
            duration_ms=duration_ms,
            **kwargs
        )


def get_logger(name: str) -> StructuredLogger:
    """获取结构化日志记录器"""
    return StructuredLogger(name)


def get_task_logger(task_id: str, task_type: str = "unknown") -> TaskLogger:
    """获取任务日志记录器"""
    return TaskLogger(task_id, task_type)


def get_performance_logger(name: str) -> PerformanceLogger:
    """获取性能日志记录器"""
    return PerformanceLogger(name)


# 初始化日志系统
setup_logging()