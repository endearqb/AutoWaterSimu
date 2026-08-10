`Justfile` 已经提供了分终端调试 Next 的命令。

终端 1：数据库
```powershell
just standalone-db
```

终端 2：API
```powershell
just dev-api-noauth
```

终端 3：Worker，可选，跑仿真任务需要
```powershell
just dev-worker-noauth
```

终端 4：前端 standalone
```powershell
just dev-frontend-standalone
```

注意：`just dev-api-noauth` 默认没有写死数据库连接。你如果要连刚启动的 standalone 数据库，先在同一个 API 终端设环境变量：

```powershell
$env:COMPUTE_API_DATABASE_URL="postgres://autowatersimu:autowatersimu@localhost:5434/autowatersimu_compute?sslmode=disable"
just dev-api-noauth
```

前端地址：http://localhost:5173  
API 地址：http://localhost:8088/readyz

这个 API 启动后会自动应用 `apps/api/migrations`，不用单独先迁移。