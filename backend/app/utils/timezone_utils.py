"""时区处理工具类"""
from datetime import datetime, timezone
from typing import Optional
import pytz


class TimezoneUtils:
    """时区处理工具类"""
    
    # 默认时区设置为中国标准时间
    DEFAULT_TIMEZONE = "Asia/Shanghai"
    
    @classmethod
    def utc_to_local(cls, utc_datetime: datetime, target_timezone: str = None) -> datetime:
        """
        将UTC时间转换为指定时区的本地时间
        
        Args:
            utc_datetime: UTC时间
            target_timezone: 目标时区，默认为中国标准时间
            
        Returns:
            转换后的本地时间
        """
        if utc_datetime is None:
            return None
            
        # 如果没有时区信息，假设为UTC
        if utc_datetime.tzinfo is None:
            utc_datetime = utc_datetime.replace(tzinfo=timezone.utc)
        
        # 使用默认时区
        if target_timezone is None:
            target_timezone = cls.DEFAULT_TIMEZONE
            
        # 转换到目标时区
        target_tz = pytz.timezone(target_timezone)
        local_datetime = utc_datetime.astimezone(target_tz)
        
        return local_datetime
    
    @classmethod
    def local_to_utc(cls, local_datetime: datetime, source_timezone: str = None) -> datetime:
        """
        将本地时间转换为UTC时间
        
        Args:
            local_datetime: 本地时间
            source_timezone: 源时区，默认为中国标准时间
            
        Returns:
            转换后的UTC时间
        """
        if local_datetime is None:
            return None
            
        # 使用默认时区
        if source_timezone is None:
            source_timezone = cls.DEFAULT_TIMEZONE
            
        # 如果没有时区信息，添加源时区信息
        if local_datetime.tzinfo is None:
            source_tz = pytz.timezone(source_timezone)
            local_datetime = source_tz.localize(local_datetime)
        
        # 转换为UTC
        utc_datetime = local_datetime.astimezone(timezone.utc)
        
        return utc_datetime
    
    @classmethod
    def format_local_datetime(cls, utc_datetime: datetime, target_timezone: str = None, 
                            format_str: str = "%Y-%m-%d %H:%M:%S") -> str:
        """
        将UTC时间格式化为本地时间字符串
        
        Args:
            utc_datetime: UTC时间
            target_timezone: 目标时区
            format_str: 格式化字符串
            
        Returns:
            格式化后的时间字符串
        """
        if utc_datetime is None:
            return None
            
        local_datetime = cls.utc_to_local(utc_datetime, target_timezone)
        return local_datetime.strftime(format_str)
    
    @classmethod
    def get_current_local_time(cls, timezone_str: str = None) -> datetime:
        """
        获取指定时区的当前时间
        
        Args:
            timezone_str: 时区字符串
            
        Returns:
            当前本地时间
        """
        if timezone_str is None:
            timezone_str = cls.DEFAULT_TIMEZONE
            
        tz = pytz.timezone(timezone_str)
        return datetime.now(tz)
    
    @classmethod
    def get_timezone_offset(cls, timezone_str: str = None) -> str:
        """
        获取时区偏移量
        
        Args:
            timezone_str: 时区字符串
            
        Returns:
            时区偏移量字符串，如 "+08:00"
        """
        if timezone_str is None:
            timezone_str = cls.DEFAULT_TIMEZONE
            
        tz = pytz.timezone(timezone_str)
        now = datetime.now(tz)
        offset = now.strftime('%z')
        
        # 格式化为 +08:00 形式
        if len(offset) == 5:
            offset = f"{offset[:3]}:{offset[3:]}"
            
        return offset