"""
Global exception handlers for the FastAPI application.
Provides consistent error responses across the entire application.
"""

import logging
from typing import Union

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.exc import SQLAlchemyError
from pydantic import ValidationError

from .error_handler import (
    ApplicationError,
    ErrorCode,
    ErrorDetail,
    create_error_response,
    handle_database_error,
)
from ..core.config import settings


logger = logging.getLogger(__name__)


def setup_exception_handlers(app: FastAPI) -> None:
    """Setup global exception handlers for the FastAPI application."""
    
    @app.exception_handler(ApplicationError)
    async def application_error_handler(request: Request, exc: ApplicationError) -> JSONResponse:
        """Handle custom application errors."""
        return create_error_response(
            error=exc,
            request=request,
            include_debug=settings.DEBUG
        )
    
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        """Handle FastAPI HTTP exceptions."""
        
        # Map HTTP status codes to error codes
        error_code_map = {
            400: ErrorCode.VALIDATION_ERROR,
            401: ErrorCode.UNAUTHORIZED,
            403: ErrorCode.FORBIDDEN,
            404: ErrorCode.FILE_NOT_FOUND,
            413: ErrorCode.FILE_VALIDATION_FAILED,
            422: ErrorCode.VALIDATION_ERROR,
            500: ErrorCode.INTERNAL_SERVER_ERROR,
            503: ErrorCode.SERVICE_UNAVAILABLE,
        }
        
        error_code = error_code_map.get(exc.status_code, ErrorCode.INTERNAL_SERVER_ERROR)
        
        app_error = ApplicationError(
            code=error_code,
            message=exc.detail,
            status_code=exc.status_code,
            user_message=exc.detail if exc.status_code < 500 else "An error occurred while processing your request."
        )
        
        return create_error_response(
            error=app_error,
            request=request,
            include_debug=settings.DEBUG
        )
    
    @app.exception_handler(StarletteHTTPException)
    async def starlette_http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        """Handle Starlette HTTP exceptions."""
        
        app_error = ApplicationError(
            code=ErrorCode.INTERNAL_SERVER_ERROR,
            message=exc.detail,
            status_code=exc.status_code,
            user_message="An error occurred while processing your request."
        )
        
        return create_error_response(
            error=app_error,
            request=request,
            include_debug=settings.DEBUG
        )
    
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        """Handle Pydantic validation errors."""
        
        # Extract validation error details
        validation_errors = []
        for error in exc.errors():
            field_path = " -> ".join(str(loc) for loc in error["loc"])
            validation_errors.append({
                "field": field_path,
                "message": error["msg"],
                "type": error["type"],
                "input": error.get("input")
            })
        
        app_error = ApplicationError(
            code=ErrorCode.VALIDATION_ERROR,
            message="Request validation failed",
            details={"validation_errors": validation_errors},
            user_message="The provided data is invalid. Please check your input and try again.",
            status_code=422
        )
        
        return create_error_response(
            error=app_error,
            request=request,
            include_debug=settings.DEBUG
        )
    
    @app.exception_handler(ValidationError)
    async def pydantic_validation_exception_handler(request: Request, exc: ValidationError) -> JSONResponse:
        """Handle Pydantic model validation errors."""
        
        validation_errors = []
        for error in exc.errors():
            field_path = " -> ".join(str(loc) for loc in error["loc"])
            validation_errors.append({
                "field": field_path,
                "message": error["msg"],
                "type": error["type"]
            })
        
        app_error = ApplicationError(
            code=ErrorCode.VALIDATION_ERROR,
            message="Data validation failed",
            details={"validation_errors": validation_errors},
            user_message="The provided data format is invalid.",
            status_code=400
        )
        
        return create_error_response(
            error=app_error,
            request=request,
            include_debug=settings.DEBUG
        )
    
    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
        """Handle SQLAlchemy database errors."""
        
        app_error = handle_database_error(exc, "database operation")
        
        return create_error_response(
            error=app_error,
            request=request,
            include_debug=settings.DEBUG
        )
    
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        """Handle all other unhandled exceptions."""
        
        logger.exception("Unhandled exception occurred", exc_info=exc)
        
        app_error = ApplicationError(
            code=ErrorCode.INTERNAL_SERVER_ERROR,
            message="An unexpected error occurred",
            details={"exception_type": type(exc).__name__},
            user_message="An internal server error occurred. Please try again later.",
            status_code=500,
            original_exception=exc
        )
        
        return create_error_response(
            error=app_error,
            request=request,
            include_debug=settings.DEBUG
        )


def log_error_context(
    error: Union[Exception, ApplicationError],
    request: Request = None,
    additional_context: dict = None
) -> None:
    """Log error with additional context information."""
    
    context = {
        "error_type": type(error).__name__,
        "error_message": str(error),
    }
    
    if request:
        context.update({
            "method": request.method,
            "url": str(request.url),
            "client_ip": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent"),
        })
    
    if isinstance(error, ApplicationError):
        context.update({
            "error_code": error.code,
            "status_code": error.status_code,
            "details": error.details,
        })
    
    if additional_context:
        context.update(additional_context)
    
    logger.error("Error occurred", extra=context)