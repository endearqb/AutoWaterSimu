# AutoWaterSimu

一个自动化水循环模拟系统，用于模拟和分析水循环和水处理过程。  
基于 FastAPI + React 的全栈架构，支持工艺流程建模、ASM 动力学模拟和物料平衡分析。

> 本项目在 [Full Stack FastAPI Template](https://github.com/fastapi/full-stack-fastapi-template) 的基础上深度定制而来，保留了原有的工程化能力，并加入了水处理领域的专用功能。

---

## 功能简介

- **工艺流程建模**
  - 前端基于 React Flow 的流程图编辑器
  - 支持进水、出水、反应池等多种节点类型
  - 通过拖拽、连线的方式搭建废水处理/水循环工艺流程

- **ASM 模型模拟**
  - 后端集成 ASM1 / ASM1slim / ASM3 等活性污泥模型
  - 支持设置模型参数、进水水质、运行时间等
  - 返回时间序列仿真结果，用于分析各节点浓度、负荷变化

- **物料平衡与体积平衡计算**
  - 独立的物料平衡计算模块（`backend/app/material_balance`）
  - 基于张量运算与 ODE 求解进行多组分物料平衡模拟
  - 提供质量守恒检查与体积变化跟踪

- **任务与结果管理**
  - 采用数据库记录计算任务与结果
  - 支持结果摘要（总步数、计算耗时、收敛状态等）

- **账号与权限（来自模板能力）**
  - 基于 JWT 的身份认证
  - 用户注册、登录、权限控制
  - 邮件找回密码（需配置 SMTP）

---

## 技术栈

- **后端**
  - [FastAPI](https://fastapi.tiangolo.com)：提供 REST API 与后台服务
  - [SQLModel](https://sqlmodel.tiangolo.com)：数据库 ORM
  - [PostgreSQL](https://www.postgresql.org)：关系型数据库
  - [Pytest](https://pytest.org)：后端测试

- **前端**
  - [React](https://react.dev) + TypeScript + Vite
  - [Chakra UI](https://chakra-ui.com)：UI 组件库
  - [Playwright](https://playwright.dev)：端到端测试
  - React Flow / XYFlow：流程图编辑能力（位于 `frontend/src/components/Flow`）

- **基础设施**
  - [Docker Compose](https://www.docker.com)：一键启动开发/部署环境
  - [Traefik](https://traefik.io)：反向代理 / 负载均衡（可选）
  - GitHub Actions：CI / CD 工作流（见 `.github/workflows`）

---

## 项目结构

仓库根目录即 AutoWaterSimu 工程根目录，核心目录结构如下：

- `backend/`：后端 FastAPI 应用
  - `app/material_balance/`：物料平衡计算核心模块
  - `app/api/routes/`：API 路由（包含 ASM1/ASM3、物料平衡等接口）
  - `app/services/`：业务服务层
  - `app/core/`：配置、数据库、日志、安全等核心模块
- `frontend/`：前端 React 单页应用
  - `src/components/Flow/`：流程图编辑器与相关 UI
  - `src/routes/`：页面路由（含物料平衡页面、模型配置页面等）
  - `content/knowledge/`：与环境工程、水处理相关的知识库内容
- `docs/`：项目使用与开发文档
- `scripts/`：辅助脚本（构建、测试、数据库初始化等）
- 其他：
  - `docker-compose*.yml`：各种部署/开发用 Docker Compose 配置
  - `deployment.md`：部署说明
  - `development.md`：开发说明

---

## 快速开始

以下命令均在仓库根目录（即本 README 所在目录）执行。

### 1. 准备环境

- 安装依赖工具：
  - Docker / Docker Desktop
  - Docker Compose（v2 以上推荐使用 `docker compose` 命令）
- 拷贝并编辑环境变量文件：

```bash
cp .env.example .env
```

至少需要根据实际环境修改：

- `SECRET_KEY`
- `FIRST_SUPERUSER_PASSWORD`
- `POSTGRES_PASSWORD`

这些敏感信息建议通过环境变量或密钥管理服务注入。

### 2. 使用 Docker Compose 一键启动

```bash
docker compose up -d
```

默认会启动：

- 后端 API 服务（FastAPI）
- 前端 Web 应用（React）
- 数据库（PostgreSQL）
- 反向代理 / Traefik（如在 Compose 中启用）

启动完成后，你可以：

- 在浏览器中访问前端界面（域名或端口以 `docker-compose.yml` 中为准）
- 访问后端交互式 API 文档：`/docs` 或 `/redoc`

更详细的 Docker、本地域名和 HTTPS 设置，请参考：

- [deployment.md](./deployment.md)
- [development.md](./development.md)

### 3. 本地开发（不使用 Docker）

#### 后端

```bash
cd backend
# 安装依赖（可按你本机的 Python/包管理工具习惯执行）
uv sync  # 或使用 pip / poetry 等
uv run uvicorn app.main:app --reload
```

更多后端开发说明见：

- [backend/README.md](./backend/README.md)

#### 前端

```bash
cd frontend
pnpm install  # 或 npm / yarn，按你的环境选择
pnpm dev
```

更多前端开发说明见：

- [frontend/README.md](./frontend/README.md)

---

## 配置与环境变量

项目使用多个 `.env` 文件来管理配置（数据库连接、邮件服务、JWT 密钥等）。  
你可以在以下文件中查看和修改默认配置：

- 根目录的 `.env`：整体栈配置（数据库、域名等）
- `backend/.env`（如存在）：后端服务相关配置
- 其他环境文件：详见 [development.md](./development.md)

生成安全随机密钥的一个简单方式：

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## 测试

### 后端测试

```bash
cd backend
pytest
```

### 前端端到端测试（Playwright）

```bash
cd frontend
pnpm test:e2e
```

具体测试命令和配置可参考各自目录下的 README 或 `package.json` / `pyproject.toml`。

---

## Roadmap

| 项目 | 规划事项 |
| --- | --- |
| 1 | Docker Compose 全链路跑通（含 DB） |
| 2 | 清理敏感/多余数据表与中间文件，增加国际化支持 |
| 3 | 最小示例 Case 一键仿真 + 冒烟测试 CI |
| 4 | 连续进水（时间序列输入） |
| 5 | 核心模块初步拆分（core.py 解耦到可维护结构） |
| 6 | 一维沉淀池模型 |
| 7 | pH 计算 |
| 8 | 参数的温度校正 |
| 9 | 增加更多开源模型 |
| 10 | 优化模型添加流程 |
| 11 | 增加添加自定义模型功能 |
| 12 | 文献数据集 Benchmark Case，与文献曲线对标输出（可复现） |
| 13 | 多节点张量化表示 + 分组异构模型（每节点可跑不同模型） |
| 14 | 参数扫掠/方案对比（“一张图跑所有选项”） |
| 15 | 性能基准与可选 GPU 加速落地 |
| 16 | 校准/调参工作流（真实项目落地包） |
| 17 | “Vibe Modeling”自然语言建模入口（远期愿景） |

---

## 发行说明与变更记录

项目的更新记录见：

- [release-notes.md](./release-notes.md)

---

## 许可证

本项目基于 **Apache License 2.0** 并附加商业使用相关条件进行发布，  
完整条款请查看：

- [LICENSE](./LICENSE)

简要说明：

- 允许个人学习、研究使用
- 允许企业内部单租户部署和为单一客户提供定制化部署
- 禁止在未获得作者书面授权的前提下，将本项目用于多租户 SaaS 平台运营
- 禁止直接转售源码（无论是否修改）
- 使用本项目时需保留版权声明、作者署名和项目来源等信息

如需进行多租户 SaaS 等商业化使用，请根据 LICENSE 中说明联系作者获取商业授权。

本项目起始于 FastAPI 官方的 Full Stack FastAPI Template，并在此基础上针对水处理与自动化水循环模拟场景进行了大量扩展与改造。
