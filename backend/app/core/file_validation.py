"""
统一的文件类型验证配置
用于前后端一致的文件类型验证
"""

from typing import Dict, List, Set
from dataclasses import dataclass


@dataclass
class FileTypeConfig:
    """文件类型配置"""
    extensions: Set[str]
    mime_types: Set[str]
    max_size_mb: int
    description: str


class FileValidationConfig:
    """统一的文件验证配置"""
    
    # 支持的文件类型配置
    SUPPORTED_TYPES: Dict[str, FileTypeConfig] = {
        "csv": FileTypeConfig(
            extensions={".csv"},
            mime_types={
                "text/csv",
                "application/csv",
                "text/comma-separated-values"
            },
            max_size_mb=100,
            description="CSV文件"
        ),
        "excel": FileTypeConfig(
            extensions={".xlsx", ".xls"},
            mime_types={
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "application/vnd.ms-excel",
                "application/excel",
                "application/x-excel",
                "application/x-msexcel"
            },
            max_size_mb=100,
            description="Excel文件"
        )
    }
    
    @classmethod
    def get_all_extensions(cls) -> Set[str]:
        """获取所有支持的文件扩展名"""
        extensions = set()
        for config in cls.SUPPORTED_TYPES.values():
            extensions.update(config.extensions)
        return extensions
    
    @classmethod
    def get_all_mime_types(cls) -> Set[str]:
        """获取所有支持的MIME类型"""
        mime_types = set()
        for config in cls.SUPPORTED_TYPES.values():
            mime_types.update(config.mime_types)
        return mime_types
    
    @classmethod
    def get_max_file_size(cls) -> int:
        """获取最大文件大小（字节）"""
        max_size_mb = max(config.max_size_mb for config in cls.SUPPORTED_TYPES.values())
        return max_size_mb * 1024 * 1024
    
    @classmethod
    def is_extension_allowed(cls, filename: str) -> bool:
        """检查文件扩展名是否被允许"""
        filename_lower = filename.lower()
        return any(filename_lower.endswith(ext) for ext in cls.get_all_extensions())
    
    @classmethod
    def is_mime_type_allowed(cls, mime_type: str) -> bool:
        """检查MIME类型是否被允许"""
        return mime_type.lower() in {mt.lower() for mt in cls.get_all_mime_types()}
    
    @classmethod
    def get_file_type_by_extension(cls, filename: str) -> str | None:
        """根据文件扩展名获取文件类型"""
        filename_lower = filename.lower()
        for file_type, config in cls.SUPPORTED_TYPES.items():
            if any(filename_lower.endswith(ext) for ext in config.extensions):
                return file_type
        return None
    
    @classmethod
    def get_file_type_by_mime(cls, mime_type: str) -> str | None:
        """根据MIME类型获取文件类型"""
        mime_type_lower = mime_type.lower()
        for file_type, config in cls.SUPPORTED_TYPES.items():
            if mime_type_lower in {mt.lower() for mt in config.mime_types}:
                return file_type
        return None
    
    @classmethod
    def validate_file(
        cls,
        filename: str,
        mime_type: str,
        file_size: int,
        max_size_bytes: int | None = None,
    ) -> Dict[str, any]:
        """
        验证文件
        
        Args:
            filename: 文件名
            mime_type: MIME类型
            file_size: 文件大小（字节）
            
        Returns:
            验证结果字典，包含 is_valid, errors, file_type
        """
        errors = []
        file_type = None
        
        # 检查扩展名
        if not cls.is_extension_allowed(filename):
            supported_exts = ", ".join(sorted(cls.get_all_extensions()))
            errors.append(f"不支持的文件扩展名。支持的格式: {supported_exts}")
        else:
            file_type = cls.get_file_type_by_extension(filename)
        
        # 检查MIME类型
        if not cls.is_mime_type_allowed(mime_type):
            errors.append(f"不支持的文件类型: {mime_type}")
        
        # 检查文件大小
        max_size = max_size_bytes if max_size_bytes is not None else cls.get_max_file_size()
        if file_size > max_size:
            max_size_mb = max_size // (1024 * 1024)
            current_size_mb = file_size / (1024 * 1024)
            errors.append(f"文件大小超过限制。当前: {current_size_mb:.1f}MB，最大: {max_size_mb}MB")
        
        return {
            "is_valid": len(errors) == 0,
            "errors": errors,
            "file_type": file_type,
            "supported_extensions": list(cls.get_all_extensions()),
            "supported_mime_types": list(cls.get_all_mime_types()),
            "max_size_mb": max_size // (1024 * 1024)
        }
    
    @classmethod
    def get_frontend_accept_string(cls) -> str:
        """获取前端input accept属性的字符串"""
        extensions = cls.get_all_extensions()
        mime_types = cls.get_all_mime_types()
        return ",".join(sorted(extensions) + sorted(mime_types))
