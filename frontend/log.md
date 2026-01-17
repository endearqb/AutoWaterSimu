INFO:     127.0.0.1:54178 - "GET /api/v1/stats/users HTTP/1.1" 500 Internal Server Error
ERROR:    Exception in ASGI application
Traceback (most recent call last):
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\engine\base.py", line 1967, in _exec_single_context
    self.dialect.do_execute(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\engine\default.py", line 941, in do_execute
    cursor.execute(statement, parameters)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\psycopg\cursor.py", line 97, in execute     
    raise ex.with_traceback(None)
psycopg.errors.SyntaxError: syntax error at or near "+"
LINE 2: ...user".is_active ORDER BY count(flowchart.id) DESC + count(ma...
                                                             ^

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\uvicorn\protocols\http\httptools_impl.py", line 401, in run_asgi
    result = await app(  # type: ignore[func-returns-value]
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\uvicorn\middleware\proxy_headers.py", line 70, in __call__
    return await self.app(scope, receive, send)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\fastapi\applications.py", line 1054, in __call__
    await super().__call__(scope, receive, send)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\applications.py", line 113, in __call__
    await self.middleware_stack(scope, receive, send)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\middleware\errors.py", line 187, in __call__
    raise exc
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\middleware\errors.py", line 165, in __call__
    await self.app(scope, receive, _send)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\middleware\cors.py", line 93, in __call__
    await self.simple_response(scope, receive, send, request_headers=headers)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\middleware\cors.py", line 144, in simple_response
    await self.app(scope, receive, send)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\middleware\exceptions.py", line 62, in __call__
    await wrap_app_handling_exceptions(self.app, conn)(scope, receive, send)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\_exception_handler.py", line 62, in wrapped_app
    raise exc
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\_exception_handler.py", line 51, in wrapped_app
    await app(scope, receive, sender)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\routing.py", line 715, in __call__
    await self.middleware_stack(scope, receive, send)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\routing.py", line 735, in app     
    await route.handle(scope, receive, send)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\routing.py", line 288, in handle  
    await self.app(scope, receive, send)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\routing.py", line 76, in app      
    await wrap_app_handling_exceptions(app, request)(scope, receive, send)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\_exception_handler.py", line 62, in wrapped_app
    raise exc
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\_exception_handler.py", line 51, in wrapped_app
    await app(scope, receive, sender)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\routing.py", line 73, in app      
    response = await f(request)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\fastapi\routing.py", line 301, in app       
    raw_response = await run_endpoint_function(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\fastapi\routing.py", line 214, in run_endpoint_function
    return await run_in_threadpool(dependant.call, **values)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\concurrency.py", line 39, in run_in_threadpool
    return await anyio.to_thread.run_sync(func, *args)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\anyio\to_thread.py", line 56, in run_sync   
    return await get_async_backend().run_sync_in_worker_thread(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\anyio\_backends\_asyncio.py", line 2405, in run_sync_in_worker_thread
    return await future
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\anyio\_backends\_asyncio.py", line 914, in run
    result = context.run(func, *args)
  File "D:\MyProject\my-full-stack\backend\app\api\routes\stats.py", line 107, in get_user_stats
    user_activity = session.exec(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlmodel\orm\session.py", line 66, in exec  
    results = super().execute(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\orm\session.py", line 2362, in execute
    return self._execute_internal(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\orm\session.py", line 2247, in _execute_internal
    result: Result[Any] = compile_state_cls.orm_execute_statement(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\orm\context.py", line 305, in orm_execute_statement
    result = conn.execute(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\engine\base.py", line 1418, in execute
    return meth(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\sql\elements.py", line 515, in _execute_on_connection
    return connection._execute_clauseelement(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\engine\base.py", line 1640, in _execute_clauseelement
    ret = self._execute_context(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\engine\base.py", line 1846, in _execute_context
    return self._exec_single_context(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\engine\base.py", line 1986, in _exec_single_context
    self._handle_dbapi_exception(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\engine\base.py", line 2355, in _handle_dbapi_exception
    raise sqlalchemy_exception.with_traceback(exc_info[2]) from e
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\engine\base.py", line 1967, in _exec_single_context
    self.dialect.do_execute(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\engine\default.py", line 941, in do_execute
    cursor.execute(statement, parameters)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\psycopg\cursor.py", line 97, in execute     
    raise ex.with_traceback(None)
sqlalchemy.exc.ProgrammingError: (psycopg.errors.SyntaxError) syntax error at or near "+"
LINE 2: ...user".is_active ORDER BY count(flowchart.id) DESC + count(ma...
                                                             ^
[SQL: SELECT "user".id, "user".full_name, "user".email, "user".user_type, "user".is_active, count(flowchart.id) AS flowchart_count, count(materialbalancejob.id) AS material_balance_count
FROM "user" LEFT OUTER JOIN flowchart ON "user".id = flowchart.owner_id LEFT OUTER JOIN materialbalancejob ON "user".id = materialbalancejob.owner_id GROUP BY "user".id, "user".full_name, "user".email, "user".user_type, "user".is_active ORDER BY count(flowchart.id) DESC + count(materialbalancejob.id) DESC]
(Background on this error at: https://sqlalche.me/e/20/f405)
INFO:     127.0.0.1:54179 - "GET /api/v1/stats/dashboard HTTP/1.1" 200 OK
INFO:     127.0.0.1:54179 - "GET /api/v1/stats/users HTTP/1.1" 500 Internal Server Error
ERROR:    Exception in ASGI application
Traceback (most recent call last):
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\engine\base.py", line 1967, in _exec_single_context
    self.dialect.do_execute(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\engine\default.py", line 941, in do_execute
    cursor.execute(statement, parameters)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\psycopg\cursor.py", line 97, in execute     
    raise ex.with_traceback(None)
psycopg.errors.SyntaxError: syntax error at or near "+"
LINE 2: ...user".is_active ORDER BY count(flowchart.id) DESC + count(ma...
                                                             ^

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\uvicorn\protocols\http\httptools_impl.py", line 401, in run_asgi
    result = await app(  # type: ignore[func-returns-value]
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\uvicorn\middleware\proxy_headers.py", line 70, in __call__
    return await self.app(scope, receive, send)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\fastapi\applications.py", line 1054, in __call__
    await super().__call__(scope, receive, send)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\applications.py", line 113, in __call__
    await self.middleware_stack(scope, receive, send)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\middleware\errors.py", line 187, in __call__
    raise exc
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\middleware\errors.py", line 165, in __call__
    await self.app(scope, receive, _send)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\middleware\cors.py", line 93, in __call__
    await self.simple_response(scope, receive, send, request_headers=headers)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\middleware\cors.py", line 144, in simple_response
    await self.app(scope, receive, send)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\middleware\exceptions.py", line 62, in __call__
    await wrap_app_handling_exceptions(self.app, conn)(scope, receive, send)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\_exception_handler.py", line 62, in wrapped_app
    raise exc
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\_exception_handler.py", line 51, in wrapped_app
    await app(scope, receive, sender)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\routing.py", line 715, in __call__
    await self.middleware_stack(scope, receive, send)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\routing.py", line 735, in app     
    await route.handle(scope, receive, send)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\routing.py", line 288, in handle  
    await self.app(scope, receive, send)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\routing.py", line 76, in app      
    await wrap_app_handling_exceptions(app, request)(scope, receive, send)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\_exception_handler.py", line 62, in wrapped_app
    raise exc
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\_exception_handler.py", line 51, in wrapped_app
    await app(scope, receive, sender)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\routing.py", line 73, in app      
    response = await f(request)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\fastapi\routing.py", line 301, in app       
    raw_response = await run_endpoint_function(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\fastapi\routing.py", line 214, in run_endpoint_function
    return await run_in_threadpool(dependant.call, **values)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\concurrency.py", line 39, in run_in_threadpool
    return await anyio.to_thread.run_sync(func, *args)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\anyio\to_thread.py", line 56, in run_sync   
    return await get_async_backend().run_sync_in_worker_thread(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\anyio\_backends\_asyncio.py", line 2405, in run_sync_in_worker_thread
    return await future
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\anyio\_backends\_asyncio.py", line 914, in run
    result = context.run(func, *args)
  File "D:\MyProject\my-full-stack\backend\app\api\routes\stats.py", line 107, in get_user_stats
    user_activity = session.exec(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlmodel\orm\session.py", line 66, in exec  
    results = super().execute(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\orm\session.py", line 2362, in execute
    return self._execute_internal(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\orm\session.py", line 2247, in _execute_internal
    result: Result[Any] = compile_state_cls.orm_execute_statement(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\orm\context.py", line 305, in orm_execute_statement
    result = conn.execute(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\engine\base.py", line 1418, in execute
    return meth(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\sql\elements.py", line 515, in _execute_on_connection
    return connection._execute_clauseelement(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\engine\base.py", line 1640, in _execute_clauseelement
    ret = self._execute_context(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\engine\base.py", line 1846, in _execute_context
    return self._exec_single_context(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\engine\base.py", line 1986, in _exec_single_context
    self._handle_dbapi_exception(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\engine\base.py", line 2355, in _handle_dbapi_exception
    raise sqlalchemy_exception.with_traceback(exc_info[2]) from e
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\engine\base.py", line 1967, in _exec_single_context
    self.dialect.do_execute(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\engine\default.py", line 941, in do_execute
    cursor.execute(statement, parameters)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\psycopg\cursor.py", line 97, in execute     
    raise ex.with_traceback(None)
sqlalchemy.exc.ProgrammingError: (psycopg.errors.SyntaxError) syntax error at or near "+"
LINE 2: ...user".is_active ORDER BY count(flowchart.id) DESC + count(ma...
                                                             ^
[SQL: SELECT "user".id, "user".full_name, "user".email, "user".user_type, "user".is_active, count(flowchart.id) AS flowchart_count, count(materialbalancejob.id) AS material_balance_count
FROM "user" LEFT OUTER JOIN flowchart ON "user".id = flowchart.owner_id LEFT OUTER JOIN materialbalancejob ON "user".id = materialbalancejob.owner_id GROUP BY "user".id, "user".full_name, "user".email, "user".user_type, "user".is_active ORDER BY count(flowchart.id) DESC + count(materialbalancejob.id) DESC]
(Background on this error at: https://sqlalche.me/e/20/f405)
INFO:     127.0.0.1:54197 - "GET /api/v1/stats/users HTTP/1.1" 500 Internal Server Error
ERROR:    Exception in ASGI application
Traceback (most recent call last):
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\engine\base.py", line 1967, in _exec_single_context
    self.dialect.do_execute(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\engine\default.py", line 941, in do_execute
    cursor.execute(statement, parameters)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\psycopg\cursor.py", line 97, in execute     
    raise ex.with_traceback(None)
psycopg.errors.SyntaxError: syntax error at or near "+"
LINE 2: ...user".is_active ORDER BY count(flowchart.id) DESC + count(ma...
                                                             ^

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\uvicorn\protocols\http\httptools_impl.py", line 401, in run_asgi
    result = await app(  # type: ignore[func-returns-value]
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\uvicorn\middleware\proxy_headers.py", line 70, in __call__
    return await self.app(scope, receive, send)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\fastapi\applications.py", line 1054, in __call__
    await super().__call__(scope, receive, send)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\applications.py", line 113, in __call__
    await self.middleware_stack(scope, receive, send)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\middleware\errors.py", line 187, in __call__
    raise exc
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\middleware\errors.py", line 165, in __call__
    await self.app(scope, receive, _send)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\middleware\cors.py", line 93, in __call__
    await self.simple_response(scope, receive, send, request_headers=headers)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\middleware\cors.py", line 144, in simple_response
    await self.app(scope, receive, send)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\middleware\exceptions.py", line 62, in __call__
    await wrap_app_handling_exceptions(self.app, conn)(scope, receive, send)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\_exception_handler.py", line 62, in wrapped_app
    raise exc
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\_exception_handler.py", line 51, in wrapped_app
    await app(scope, receive, sender)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\routing.py", line 715, in __call__
    await self.middleware_stack(scope, receive, send)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\routing.py", line 735, in app     
    await route.handle(scope, receive, send)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\routing.py", line 288, in handle  
    await self.app(scope, receive, send)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\routing.py", line 76, in app      
    await wrap_app_handling_exceptions(app, request)(scope, receive, send)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\_exception_handler.py", line 62, in wrapped_app
    raise exc
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\_exception_handler.py", line 51, in wrapped_app
    await app(scope, receive, sender)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\routing.py", line 73, in app      
    response = await f(request)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\fastapi\routing.py", line 301, in app       
    raw_response = await run_endpoint_function(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\fastapi\routing.py", line 214, in run_endpoint_function
    return await run_in_threadpool(dependant.call, **values)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\concurrency.py", line 39, in run_in_threadpool
    return await anyio.to_thread.run_sync(func, *args)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\anyio\to_thread.py", line 56, in run_sync   
    return await get_async_backend().run_sync_in_worker_thread(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\anyio\_backends\_asyncio.py", line 2405, in run_sync_in_worker_thread
    return await future
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\anyio\_backends\_asyncio.py", line 914, in run
    result = context.run(func, *args)
  File "D:\MyProject\my-full-stack\backend\app\api\routes\stats.py", line 107, in get_user_stats
    user_activity = session.exec(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlmodel\orm\session.py", line 66, in exec  
    results = super().execute(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\orm\session.py", line 2362, in execute
    return self._execute_internal(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\orm\session.py", line 2247, in _execute_internal
    result: Result[Any] = compile_state_cls.orm_execute_statement(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\orm\context.py", line 305, in orm_execute_statement
    result = conn.execute(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\engine\base.py", line 1418, in execute
    return meth(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\sql\elements.py", line 515, in _execute_on_connection
    return connection._execute_clauseelement(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\engine\base.py", line 1640, in _execute_clauseelement
    ret = self._execute_context(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\engine\base.py", line 1846, in _execute_context
    return self._exec_single_context(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\engine\base.py", line 1986, in _exec_single_context
    self._handle_dbapi_exception(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\engine\base.py", line 2355, in _handle_dbapi_exception
    raise sqlalchemy_exception.with_traceback(exc_info[2]) from e
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\engine\base.py", line 1967, in _exec_single_context
    self.dialect.do_execute(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\engine\default.py", line 941, in do_execute
    cursor.execute(statement, parameters)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\psycopg\cursor.py", line 97, in execute     
    raise ex.with_traceback(None)
sqlalchemy.exc.ProgrammingError: (psycopg.errors.SyntaxError) syntax error at or near "+"
LINE 2: ...user".is_active ORDER BY count(flowchart.id) DESC + count(ma...
                                                             ^
[SQL: SELECT "user".id, "user".full_name, "user".email, "user".user_type, "user".is_active, count(flowchart.id) AS flowchart_count, count(materialbalancejob.id) AS material_balance_count
FROM "user" LEFT OUTER JOIN flowchart ON "user".id = flowchart.owner_id LEFT OUTER JOIN materialbalancejob ON "user".id = materialbalancejob.owner_id GROUP BY "user".id, "user".full_name, "user".email, "user".user_type, "user".is_active ORDER BY count(flowchart.id) DESC + count(materialbalancejob.id) DESC]
(Background on this error at: https://sqlalche.me/e/20/f405)
INFO:     127.0.0.1:54208 - "GET /api/v1/stats/users HTTP/1.1" 500 Internal Server Error
ERROR:    Exception in ASGI application
Traceback (most recent call last):
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\engine\base.py", line 1967, in _exec_single_context
    self.dialect.do_execute(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\engine\default.py", line 941, in do_execute
    cursor.execute(statement, parameters)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\psycopg\cursor.py", line 97, in execute     
    raise ex.with_traceback(None)
psycopg.errors.SyntaxError: syntax error at or near "+"
LINE 2: ...user".is_active ORDER BY count(flowchart.id) DESC + count(ma...
                                                             ^

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\uvicorn\protocols\http\httptools_impl.py", line 401, in run_asgi
    result = await app(  # type: ignore[func-returns-value]
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\uvicorn\middleware\proxy_headers.py", line 70, in __call__
    return await self.app(scope, receive, send)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\fastapi\applications.py", line 1054, in __call__
    await super().__call__(scope, receive, send)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\applications.py", line 113, in __call__
    await self.middleware_stack(scope, receive, send)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\middleware\errors.py", line 187, in __call__
    raise exc
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\middleware\errors.py", line 165, in __call__
    await self.app(scope, receive, _send)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\middleware\cors.py", line 93, in __call__
    await self.simple_response(scope, receive, send, request_headers=headers)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\middleware\cors.py", line 144, in simple_response
    await self.app(scope, receive, send)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\middleware\exceptions.py", line 62, in __call__
    await wrap_app_handling_exceptions(self.app, conn)(scope, receive, send)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\_exception_handler.py", line 62, in wrapped_app
    raise exc
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\_exception_handler.py", line 51, in wrapped_app
    await app(scope, receive, sender)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\routing.py", line 715, in __call__
    await self.middleware_stack(scope, receive, send)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\routing.py", line 735, in app     
    await route.handle(scope, receive, send)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\routing.py", line 288, in handle  
    await self.app(scope, receive, send)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\routing.py", line 76, in app      
    await wrap_app_handling_exceptions(app, request)(scope, receive, send)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\_exception_handler.py", line 62, in wrapped_app
    raise exc
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\_exception_handler.py", line 51, in wrapped_app
    await app(scope, receive, sender)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\routing.py", line 73, in app      
    response = await f(request)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\fastapi\routing.py", line 301, in app       
    raw_response = await run_endpoint_function(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\fastapi\routing.py", line 214, in run_endpoint_function
    return await run_in_threadpool(dependant.call, **values)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\starlette\concurrency.py", line 39, in run_in_threadpool
    return await anyio.to_thread.run_sync(func, *args)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\anyio\to_thread.py", line 56, in run_sync   
    return await get_async_backend().run_sync_in_worker_thread(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\anyio\_backends\_asyncio.py", line 2405, in run_sync_in_worker_thread
    return await future
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\anyio\_backends\_asyncio.py", line 914, in run
    result = context.run(func, *args)
  File "D:\MyProject\my-full-stack\backend\app\api\routes\stats.py", line 107, in get_user_stats
    user_activity = session.exec(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlmodel\orm\session.py", line 66, in exec  
    results = super().execute(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\orm\session.py", line 2362, in execute
    return self._execute_internal(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\orm\session.py", line 2247, in _execute_internal
    result: Result[Any] = compile_state_cls.orm_execute_statement(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\orm\context.py", line 305, in orm_execute_statement
    result = conn.execute(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\engine\base.py", line 1418, in execute
    return meth(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\sql\elements.py", line 515, in _execute_on_connection
    return connection._execute_clauseelement(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\engine\base.py", line 1640, in _execute_clauseelement
    ret = self._execute_context(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\engine\base.py", line 1846, in _execute_context
    return self._exec_single_context(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\engine\base.py", line 1986, in _exec_single_context
    self._handle_dbapi_exception(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\engine\base.py", line 2355, in _handle_dbapi_exception
    raise sqlalchemy_exception.with_traceback(exc_info[2]) from e
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\engine\base.py", line 1967, in _exec_single_context
    self.dialect.do_execute(
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\sqlalchemy\engine\default.py", line 941, in do_execute
    cursor.execute(statement, parameters)
  File "D:\MyProject\my-full-stack\backend\.venv\lib\site-packages\psycopg\cursor.py", line 97, in execute     
    raise ex.with_traceback(None)
sqlalchemy.exc.ProgrammingError: (psycopg.errors.SyntaxError) syntax error at or near "+"
LINE 2: ...user".is_active ORDER BY count(flowchart.id) DESC + count(ma...
                                                             ^
[SQL: SELECT "user".id, "user".full_name, "user".email, "user".user_type, "user".is_active, count(flowchart.id) AS flowchart_count, count(materialbalancejob.id) AS material_balance_count
FROM "user" LEFT OUTER JOIN flowchart ON "user".id = flowchart.owner_id LEFT OUTER JOIN materialbalancejob ON "user".id = materialbalancejob.owner_id GROUP BY "user".id, "user".full_name, "user".email, "user".user_type, "user".is_active ORDER BY count(flowchart.id) DESC + count(materialbalancejob.id) DESC]
(Background on this error at: https://sqlalche.me/e/20/f405)
