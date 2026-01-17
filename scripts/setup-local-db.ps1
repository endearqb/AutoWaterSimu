# 本地数据库设置脚本
# 用于自动化设置和启动本地 PostgreSQL 数据库

param(
    [switch]$Reset,      # 重置数据库 (删除所有数据)
    [switch]$Stop,       # 停止数据库服务
    [switch]$Logs,       # 查看数据库日志
    [switch]$Status      # 查看服务状态
)

# 设置错误处理
$ErrorActionPreference = "Stop"

Write-Host "=== 数据分析工具 - 本地数据库设置 ===" -ForegroundColor Green

# 处理不同的操作模式
if ($Stop) {
    Write-Host "停止本地数据库服务..." -ForegroundColor Yellow
    docker-compose -f docker-compose.local.yml down
    Write-Host "数据库服务已停止" -ForegroundColor Green
    exit 0
}

if ($Logs) {
    Write-Host "显示数据库日志..." -ForegroundColor Yellow
    docker-compose -f docker-compose.local.yml logs -f postgres
    exit 0
}

if ($Status) {
    Write-Host "检查服务状态..." -ForegroundColor Yellow
    docker-compose -f docker-compose.local.yml ps
    exit 0
}

if ($Reset) {
    Write-Host "重置本地数据库 (这将删除所有数据)..." -ForegroundColor Red
    $confirmation = Read-Host "确认要重置数据库吗? (y/N)"
    if ($confirmation -ne "y" -and $confirmation -ne "Y") {
        Write-Host "操作已取消" -ForegroundColor Yellow
        exit 0
    }
    
    Write-Host "停止并删除现有容器和数据卷..." -ForegroundColor Yellow
    docker-compose -f docker-compose.local.yml down -v
}

# 检查Docker是否运行
Write-Host "🔍 检查Docker状态..." -ForegroundColor Yellow
try {
    docker version | Out-Null
} catch {
    Write-Host "❌ Docker未运行，请先启动Docker Desktop" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker已运行" -ForegroundColor Green

# 启动本地数据库
Write-Host "📦 启动PostgreSQL容器..." -ForegroundColor Yellow
docker-compose -f docker-compose.local.yml up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 启动数据库容器失败" -ForegroundColor Red
    exit 1
}

# 等待数据库启动
Write-Host "⏳ 等待数据库启动..." -ForegroundColor Yellow
$maxRetries = 30
$retryCount = 0

while ($retryCount -lt $maxRetries) {
    $retryCount++
    try {
        docker exec dataanalysis_postgres_local pg_isready -U postgres -d dataanalysis_local 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ 数据库连接成功" -ForegroundColor Green
            break
        }
    } catch {
        # 继续等待
    }
    Write-Host "⏳ 等待数据库启动... (尝试 $retryCount/$maxRetries)" -ForegroundColor Yellow
    Start-Sleep -Seconds 2
}

if ($retryCount -eq $maxRetries) {
    Write-Host "❌ 数据库连接超时" -ForegroundColor Red
    exit 1
}

# 进入backend目录
Write-Host "📁 进入backend目录..." -ForegroundColor Yellow
Set-Location backend

# 检查虚拟环境
if (Test-Path ".\.venv\Scripts\Activate.ps1") {
    Write-Host "🐍 激活Python虚拟环境..." -ForegroundColor Yellow
    & .\.venv\Scripts\Activate.ps1
} else {
    Write-Host "⚠️ 虚拟环境不存在，使用系统Python..." -ForegroundColor Yellow
}

# 运行数据库迁移
Write-Host "🔄 运行数据库迁移..." -ForegroundColor Yellow
alembic upgrade head

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 数据库迁移失败" -ForegroundColor Red
    Set-Location ..
    exit 1
}

# 创建初始数据
Write-Host "📊 创建初始数据..." -ForegroundColor Yellow
python -m app.initial_data

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ 初始数据创建可能有问题，但继续..." -ForegroundColor Yellow
}

# 返回项目根目录
Set-Location ..

Write-Host "`n=== 数据库连接信息 ===" -ForegroundColor Green
Write-Host "数据库地址: localhost:5432" -ForegroundColor Cyan
Write-Host "数据库名称: dataanalysis_local" -ForegroundColor Cyan
Write-Host "用户名: postgres" -ForegroundColor Cyan
Write-Host "密码: dataanalysis123" -ForegroundColor Cyan
Write-Host "`npgAdmin 管理界面: http://localhost:5050" -ForegroundColor Cyan
Write-Host "pgAdmin 用户: admin@dataanalysis.local" -ForegroundColor Cyan
Write-Host "pgAdmin 密码: admin123" -ForegroundColor Cyan

Write-Host "`n=== 常用命令 ===" -ForegroundColor Green
Write-Host "查看服务状态: .\scripts\setup-local-db.ps1 -Status" -ForegroundColor Cyan
Write-Host "查看数据库日志: .\scripts\setup-local-db.ps1 -Logs" -ForegroundColor Cyan
Write-Host "停止数据库: .\scripts\setup-local-db.ps1 -Stop" -ForegroundColor Cyan
Write-Host "重置数据库: .\scripts\setup-local-db.ps1 -Reset" -ForegroundColor Cyan

Write-Host "`n✅ 本地数据库设置完成!" -ForegroundColor Green