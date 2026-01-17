"""
Enhanced error handling mechanism for the data analysis application.
Provides structured error responses with detailed information for debugging.
"""

import logging
import traceback
from typing import Any, Dict, Optional, Union
from enum import Enum

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel


logger = logging.getLogger(__name__)


class ErrorCode(str, Enum):
    """Standardized error codes for the application."""
    
    # File related errors
    FILE_NOT_FOUND = "FILE_NOT_FOUND"
    FILE_UPLOAD_FAILED = "FILE_UPLOAD_FAILED"
    FILE_VALIDATION_FAILED = "FILE_VALIDATION_FAILED"
    FILE_PROCESSING_FAILED = "FILE_PROCESSING_FAILED"
    
    # Data analysis errors
    ANALYSIS_FAILED = "ANALYSIS_FAILED"
    ANALYSIS_NOT_FOUND = "ANALYSIS_NOT_FOUND"
    ANALYSIS_TIMEOUT = "ANALYSIS_TIMEOUT"
    INVALID_ANALYSIS_CONFIG = "INVALID_ANALYSIS_CONFIG"
    
    # Task related errors
    TASK_NOT_FOUND = "TASK_NOT_FOUND"
    TASK_CREATION_FAILED = "TASK_CREATION_FAILED"
    TASK_EXECUTION_FAILED = "TASK_EXECUTION_FAILED"
    TASK_CANCELLATION_FAILED = "TASK_CANCELLATION_FAILED"
    
    # Database errors
    DATABASE_ERROR = "DATABASE_ERROR"
    DATABASE_CONNECTION_FAILED = "DATABASE_CONNECTION_FAILED"
    
    # Authentication/Authorization errors
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    
    # Validation errors
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INVALID_INPUT = "INVALID_INPUT"
    
    # System errors
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR"


class ErrorDetail(BaseModel):
    """Detailed error information."""
    
    code: ErrorCode
    message: str
    details: Optional[Dict[str, Any]] = None
    timestamp: Optional[str] = None
    request_id: Optional[str] = None
    user_message: Optional[str] = None  # User-friendly message
    debug_info: Optional[Dict[str, Any]] = None  # Debug information (only in dev mode)


class ApplicationError(Exception):
    """Base application error with structured information."""
    
    def __init__(
        self,
        code: ErrorCode,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        user_message: Optional[str] = None,
        status_code: int = 500,
        original_exception: Optional[Exception] = None
    ):
        self.code = code
        self.message = message
        self.details = details or {}
        self.user_message = user_message
        self.status_code = status_code
        self.original_exception = original_exception
        super().__init__(message)


class FileError(ApplicationError):
    """File-related errors."""
    
    def __init__(
        self,
        code: ErrorCode,
        message: str,
        filename: Optional[str] = None,
        file_id: Optional[str] = None,
        **kwargs
    ):
        details = kwargs.get('details', {})
        if filename:
            details['filename'] = filename
        if file_id:
            details['file_id'] = file_id
        kwargs['details'] = details
        super().__init__(code, message, **kwargs)


class AnalysisError(ApplicationError):
    """Data analysis related errors."""
    
    def __init__(
        self,
        code: ErrorCode,
        message: str,
        task_id: Optional[str] = None,
        analysis_type: Optional[str] = None,
        **kwargs
    ):
        details = kwargs.get('details', {})
        if task_id:
            details['task_id'] = task_id
        if analysis_type:
            details['analysis_type'] = analysis_type
        kwargs['details'] = details
        super().__init__(code, message, **kwargs)


class ValidationError(ApplicationError):
    """Validation related errors."""
    
    def __init__(
        self,
        message: str,
        field: Optional[str] = None,
        value: Optional[Any] = None,
        **kwargs
    ):
        details = kwargs.get('details', {})
        if field:
            details['field'] = field
        if value is not None:
            details['value'] = str(value)
        kwargs['details'] = details
        super().__init__(ErrorCode.VALIDATION_ERROR, message, status_code=400, **kwargs)


def create_error_response(
    error: Union[ApplicationError, Exception],
    request: Optional[Request] = None,
    include_debug: bool = False
) -> JSONResponse:
    """Create a standardized error response."""
    
    from datetime import datetime
    import uuid
    
    # Generate request ID if not provided
    request_id = str(uuid.uuid4())
    
    if isinstance(error, ApplicationError):
        error_detail = ErrorDetail(
            code=error.code,
            message=error.message,
            details=error.details,
            timestamp=datetime.utcnow().isoformat(),
            request_id=request_id,
            user_message=error.user_message
        )
        status_code = error.status_code
        
        # Add debug info if requested and available
        if include_debug and error.original_exception:
            error_detail.debug_info = {
                "original_exception": str(error.original_exception),
                "traceback": traceback.format_exc()
            }
    else:
        # Handle generic exceptions
        error_detail = ErrorDetail(
            code=ErrorCode.INTERNAL_SERVER_ERROR,
            message="An unexpected error occurred",
            details={"original_error": str(error)},
            timestamp=datetime.utcnow().isoformat(),
            request_id=request_id,
            user_message="An internal server error occurred. Please try again later."
        )
        status_code = 500
        
        if include_debug:
            error_detail.debug_info = {
                "exception_type": type(error).__name__,
                "traceback": traceback.format_exc()
            }
    
    # Log the error
    logger.error(
        f"Error {error_detail.code}: {error_detail.message}",
        extra={
            "error_code": error_detail.code,
            "request_id": request_id,
            "details": error_detail.details,
            "status_code": status_code
        }
    )
    
    return JSONResponse(
        status_code=status_code,
        content=error_detail.dict(exclude_none=True)
    )


def handle_database_error(e: Exception, operation: str = "database operation") -> ApplicationError:
    """Handle database-related errors with appropriate error codes."""
    
    error_message = str(e).lower()
    
    if "connection" in error_message or "timeout" in error_message:
        return ApplicationError(
            code=ErrorCode.DATABASE_CONNECTION_FAILED,
            message=f"Database connection failed during {operation}",
            details={"operation": operation},
            user_message="Database is temporarily unavailable. Please try again later.",
            status_code=503,
            original_exception=e
        )
    elif "constraint" in error_message or "unique" in error_message:
        return ApplicationError(
            code=ErrorCode.VALIDATION_ERROR,
            message=f"Data validation failed during {operation}",
            details={"operation": operation},
            user_message="The provided data conflicts with existing records.",
            status_code=400,
            original_exception=e
        )
    else:
        return ApplicationError(
            code=ErrorCode.DATABASE_ERROR,
            message=f"Database error during {operation}",
            details={"operation": operation},
            user_message="A database error occurred. Please try again later.",
            status_code=500,
            original_exception=e
        )


def handle_file_error(e: Exception, filename: str = None, operation: str = "file operation") -> FileError:
    """Handle file-related errors with appropriate error codes."""
    
    error_message = str(e).lower()
    
    if "not found" in error_message or "no such file" in error_message:
        return FileError(
            code=ErrorCode.FILE_NOT_FOUND,
            message=f"File not found during {operation}",
            filename=filename,
            details={"operation": operation},
            user_message="The requested file could not be found.",
            status_code=404,
            original_exception=e
        )
    elif "permission" in error_message or "access" in error_message:
        return FileError(
            code=ErrorCode.FILE_PROCESSING_FAILED,
            message=f"File access denied during {operation}",
            filename=filename,
            details={"operation": operation},
            user_message="Access to the file was denied.",
            status_code=403,
            original_exception=e
        )
    elif "size" in error_message or "too large" in error_message:
        return FileError(
            code=ErrorCode.FILE_VALIDATION_FAILED,
            message=f"File size validation failed during {operation}",
            filename=filename,
            details={"operation": operation},
            user_message="The file is too large to process.",
            status_code=413,
            original_exception=e
        )
    else:
        return FileError(
            code=ErrorCode.FILE_PROCESSING_FAILED,
            message=f"File processing failed during {operation}",
            filename=filename,
            details={"operation": operation},
            user_message="An error occurred while processing the file.",
            status_code=500,
            original_exception=e
        )


def handle_analysis_error(e: Exception, task_id: str = None, analysis_type: str = None) -> AnalysisError:
    """Handle analysis-related errors with appropriate error codes."""
    
    error_message = str(e).lower()
    
    if "timeout" in error_message:
        return AnalysisError(
            code=ErrorCode.ANALYSIS_TIMEOUT,
            message="Analysis operation timed out",
            task_id=task_id,
            analysis_type=analysis_type,
            user_message="The analysis is taking longer than expected. Please try again.",
            status_code=408,
            original_exception=e
        )
    elif "memory" in error_message or "out of memory" in error_message:
        return AnalysisError(
            code=ErrorCode.ANALYSIS_FAILED,
            message="Analysis failed due to memory constraints",
            task_id=task_id,
            analysis_type=analysis_type,
            user_message="The dataset is too large to process. Please try with a smaller file.",
            status_code=413,
            original_exception=e
        )
    elif "invalid" in error_message or "format" in error_message:
        return AnalysisError(
            code=ErrorCode.INVALID_ANALYSIS_CONFIG,
            message="Invalid analysis configuration or data format",
            task_id=task_id,
            analysis_type=analysis_type,
            user_message="The data format is not supported for this analysis.",
            status_code=400,
            original_exception=e
        )
    else:
        return AnalysisError(
            code=ErrorCode.ANALYSIS_FAILED,
            message="Analysis operation failed",
            task_id=task_id,
            analysis_type=analysis_type,
            user_message="The analysis could not be completed. Please check your data and try again.",
            status_code=500,
            original_exception=e
        )