"""时区相关的依赖注入"""
from typing import Optional
from fastapi import Header, Request
from app.utils.timezone_utils import TimezoneUtils


def get_user_timezone(
    x_timezone: Optional[str] = Header(None, alias="X-Timezone"),
    request: Request = None
) -> str:
    """
    获取用户时区信息
    
    优先级：
    1. HTTP Header中的X-Timezone
    2. 默认时区（中国标准时间）
    
    Args:
        x_timezone: HTTP Header中的时区信息
        request: FastAPI请求对象
        
    Returns:
        时区字符串
    """
    # 优先使用Header中的时区信息
    if x_timezone:
        try:
            # 验证时区是否有效
            import pytz
            pytz.timezone(x_timezone)
            return x_timezone
        except Exception:
            # 如果时区无效，使用默认时区
            pass
    
    # 使用默认时区
    return TimezoneUtils.DEFAULT_TIMEZONE


def get_timezone_aware_response():
    """
    获取时区感知的响应处理器
    
    Returns:
        时区处理函数
    """
    def convert_datetime_fields(data: dict, timezone_str: str) -> dict:
        """
        递归转换字典中的datetime字段为本地时间
        
        Args:
            data: 响应数据字典
            timezone_str: 目标时区
            
        Returns:
            转换后的数据字典
        """
        if not isinstance(data, dict):
            return data
            
        converted_data = {}
        
        for key, value in data.items():
            if isinstance(value, dict):
                # 递归处理嵌套字典
                converted_data[key] = convert_datetime_fields(value, timezone_str)
            elif isinstance(value, list):
                # 处理列表
                converted_data[key] = [
                    convert_datetime_fields(item, timezone_str) if isinstance(item, dict) else item
                    for item in value
                ]
            elif key.endswith(('_at', '_time')) and value:
                # 转换时间字段
                try:
                    from datetime import datetime
                    if isinstance(value, datetime):
                        converted_data[key] = TimezoneUtils.utc_to_local(value, timezone_str)
                    elif isinstance(value, str):
                        # 尝试解析ISO格式的时间字符串
                        dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
                        converted_data[key] = TimezoneUtils.utc_to_local(dt, timezone_str)
                    else:
                        converted_data[key] = value
                except Exception:
                    # 如果转换失败，保持原值
                    converted_data[key] = value
            else:
                converted_data[key] = value
                
        return converted_data
    
    return convert_datetime_fields