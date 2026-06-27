# AutoWaterSimu

[README](./README.md)
---


一个自动化水循环模拟系统，用于模拟和分析水循环和水处理过程。  
AutoWaterSimu Next 是当前 canonical 主线：面向 Go Compute API、Python simulation worker、桌面/运行时打包、UDM 网络仿真、ASM/BSM 工作流和 legacy parity evidence 的 contract-first monorepo。


> 原 FastAPI + React 系统仍保留在 `backend/` 和 `frontend/`，作为 legacy 对照、迁移 oracle 和紧急维护材料。冻结分支为 `legacy/fastapi-frozen`。


---
## README First / AI 协作上下文

本仓库采用 README First 协作流程。`AGENTS.md` 是可执行规则，`README_First.md` 解释规则背后的原则和文档分工。

修改文件前建议按以下顺序阅读：

1. `AGENTS.md`
2. `README_First.md`
3. 根目录 `README.md` / `README_zh.md`
4. 目标路径上从上到下的最近目录 `README.md`
5. 目标文件、直接依赖、调用方和相关测试

长期 AI 协作记录位于 `.ai/`：

- `.ai/changes/`：记录修改原因、验证方式和剩余不确定性
- `.ai/decisions/`：记录长期架构决策
- `.ai/plans/`：可选复杂任务计划
- `.ai/reviews/`：可选 review 记录

AutoWaterSimu Next 在本仓库中以 monorepo 方式演进：

- legacy `frontend/` 和 `backend/` 作为迁移/oracle 材料保留
- `contracts/`、worker、Go API 和 desktop surface 是当前 Next 主线
- 迁移通过 adapter、fixture 和 old-vs-new baseline 验证

---
## 赞助支持（Sponsors）

感谢以下赞助方对本项目开发与维护的支持：

[![pipellm.ai](docs/logo-DWhD8xlx.svg)](https://pipellm.ai)

**[pipellm.ai](https://pipellm.ai)**  
感谢提供 API 资源支持。

[![waterdataai.com](docs/waterdataai.png)](https://waterdataai.com)

**[waterdataai.com](https://waterdataai.com)**

---
## 截图与示意图

### Landing Page
![](frontend/public/assets/images/home.png)

### 流程图新主题与模拟面板
![](frontend/public/assets/images/newflowtheme.png)

### 后端核心逻辑（AI 生成的手绘推导式）
该图用于展示多池仿真模拟计算的核心实现逻辑（后端核心代码对应的推导思路）。

![](frontend/public/assets/images/handwriting.jpeg)

---

## 功能简介

- **Contract-first 仿真链路**
  - 拆分 UI 画布、领域流程拓扑、可执行仿真输入、计算任务、结果和 artifact。
  - 通过 JSON Schema 合同和 fixture，让 Web、Desktop、worker 与 API 共用同一集成边界。

- **Standalone 计算运行时**
  - 通过 `docker-compose.standalone.yml` 启动 Go Compute API、Python simulation worker、standalone React 前端和 Compute PostgreSQL。
  - 将无登录 standalone 运行方式与 legacy FastAPI 认证路径隔离。

- **水处理与污水处理模型执行**
  - 支持物料平衡、ASM1、ASM1Slim、ASM3、UDM catalog/template、Hybrid UDM 校验和 UDM Network v2 路线。
  - legacy FastAPI 行为保留为迁移 oracle，直到 parity 和退役门通过。

- **Evidence、artifact 和 release gate**
  - summary 写入 metadata 记录，大型时间序列结果进入 artifact 文件。
  - 通过 golden scenarios、standalone smoke、live evidence 和 release gates 约束仿真结果可复现。

- **Desktop 与现场交付路线**
  - 跟踪 Tauri/Rust + React 桌面壳、打包 Python worker sidecar、本地项目状态、本地 artifact 和 support bundle。

---

## 技术栈

- **计算与编排**
  - [Go](https://go.dev)：Compute API、job lifecycle、workspace/model 持久化和 OpenAPI surface
  - [Python](https://www.python.org)：simulation core 与 simulation-worker runtime
  - [PostgreSQL](https://www.postgresql.org)：Compute API metadata store
  - `contracts/` 下的 JSON Schema 合同

- **前端**
  - [React](https://react.dev) + TypeScript + Vite
  - [Chakra UI](https://chakra-ui.com)：UI 组件库
  - [Playwright](https://playwright.dev)：端到端测试
  - React Flow / XYFlow：流程图编辑能力（位于 `frontend/src/components/Flow`）

- **桌面端**
  - [Tauri](https://tauri.app) / Rust 桌面壳
  - 打包 Python worker sidecar 与本地 artifact/project 存储

- **Legacy oracle**
  - `backend/` 下的 [FastAPI](https://fastapi.tiangolo.com) + SQLModel legacy 后端
  - 仅用于迁移、parity 对照和紧急 legacy 维护

- **基础设施**
  - [Docker Compose](https://www.docker.com)：standalone 和开发栈
  - [Traefik](https://traefik.io)：legacy 反向代理 / 负载均衡（启用时）
  - GitHub Actions：CI / CD 工作流（见 `.github/workflows`）

---

## 项目结构

仓库根目录即 AutoWaterSimu 工程根目录，核心目录结构如下：

- `backend/`：legacy FastAPI 应用和迁移/oracle 对照
  - `app/material_balance/`：物料平衡计算核心模块
  - `app/api/routes/`：API 路由（包含 ASM1/ASM3、物料平衡等接口）
  - `app/services/`：业务服务层
  - `app/core/`：配置、数据库、日志、安全等核心模块
- `frontend/`：React 单页应用，同时承载 legacy 与 standalone/Next runtime mode
  - `src/components/Flow/`：流程图编辑器与相关 UI
  - `src/routes/`：页面路由（含物料平衡页面、模型配置页面等）
- `docs/`：项目使用与开发文档
- `docs/architecture/`：AutoWaterSimu Next 模块图、依赖图、ontology、本地开发入口和当前状态说明
- `contracts/`：AutoWaterSimu Next JSON Schema 合同与示例
- `ontology/`：Water Ontology 对象、动作、连接和策略注册表
- `simulation_core/`：纯 Python 仿真运行时核心
- `services/simulation-worker/`：Python worker CLI / sidecar runtime
- `apps/api/`：Go Compute API 后端
- `apps/desktop/`：Tauri/Rust + React 桌面壳
- `Justfile`：monorepo 任务入口，覆盖 doctor、check、依赖检查、生成、开发辅助和 release gate
- `scripts/`：仓库级自动化脚本，包括 AutoWaterSimu Next release gates
- `.ai/`：README First 变更、决策、计划和 review 记录
- `.github/`：GitHub Actions 和仓库自动化
- `tasks/`：任务记录、工作日志和实现计划
- `backend/scripts/`：后端辅助脚本（测试、lint、format、数据库初始化、prestart 等）
- 其他：
  - `docker-compose*.yml`：各种部署/开发用 Docker Compose 配置
  - `deployment.md`：部署说明
  - `development.md`：开发说明

---

## 快速开始

以下命令均在仓库根目录（即本 README 所在目录）执行。

### AutoWaterSimu Next 任务入口

Next monorepo 工作优先使用根目录 `Justfile`：

```powershell
just doctor
just standalone-up
just standalone-status
just standalone-smoke
just standalone-five-model-smoke
just standalone-five-model-live
just standalone-release-gate
just standalone-release-gate-full
just readme-check
just check
just pr-fast
just integration-smoke
just current-flow-live-smoke
```

如果没有安装 `just`，可直接运行底层脚本和检查：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\doctor.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\readme-contract-check.ps1 -FailOnWarnings
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\standalone-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1
Push-Location apps\api; go test ./...; Pop-Location
Push-Location frontend; npx tsc --noEmit; Pop-Location
```

Standalone RC 只有在当前 HEAD full gate 无 skip 通过时才算完成；在此之前，FastAPI/legacy client 仍作为 comparison/oracle 材料保留，不提前退役。

Next 长期架构入口见 [docs/architecture](./docs/architecture/README.md)。source-mounted Next 本地栈候选为 [docker-compose.dev.yml](./docker-compose.dev.yml)。standalone no-login 栈入口为 [docker-compose.standalone.yml](./docker-compose.standalone.yml)。

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


### 2. AutoWaterSimu Next Standalone 栈

```powershell
just standalone-up
```

如果没有安装 `just`：

```powershell
docker compose -p autowatersimu-standalone -f docker-compose.standalone.yml up -d
```

standalone 栈会启动：

- Go Compute API
- Python simulation worker
- standalone 前端
- Compute PostgreSQL

常用辅助命令：

```powershell
just standalone-status
just standalone-smoke
just standalone-reset
```

更详细的 Docker、本地域名和 HTTPS 设置，请参考：

- [deployment.md](./deployment.md)
- [development.md](./development.md)

### 3. Legacy FastAPI / React 栈

legacy 栈仅用于迁移/oracle 对照或旧 FastAPI 紧急维护：

```powershell
docker compose up -d
```

#### Legacy 后端

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

Next 主线变更优先运行根目录 gate：

```powershell
just readme-check
just pr-fast
just standalone-smoke
```

按修改面选择更聚焦的检查：

```powershell
Push-Location apps\api; go test ./...; Pop-Location
Push-Location frontend; npx tsc --noEmit; Pop-Location
backend\.venv\Scripts\python -m pytest contracts\tests -q
```

legacy FastAPI 检查仅用于 `backend/` oracle 或维护工作：

```bash
cd backend
pytest
```

前端行为变化仍可运行 Playwright：

```bash
cd frontend
pnpm test:e2e
```

具体测试命令和配置可参考各自目录下的 README 或 `package.json` / `pyproject.toml`。
---

## Roadmap

| 项目 | 规划事项 | 进度 |
| --- | --- | --- |
| 1 | 将 AutoWaterSimu Next 提升为 `main`，冻结 FastAPI legacy 线 | 完成 |
| 2 | 保持共享合同、artifact 边界和 README First 治理稳定 | 进行中 |
| 3 | 完成 standalone RC 无 skip evidence，包括 live migration 和 object-store 检查 | 等待外部 evidence |
| 4 | 冻结 UDM-v2 ADR，并新增 `simulation.udm_network.v1` 对应的 `network_process_graph.v1` / `network_simulation_input.v1` 合同 | 下一步 |
| 5 | 建立 `hydraulic` / `pump` / `settling` / `signal` 四类边建模与运行时校验，并补齐严格流量平衡诊断 | 计划中 |
| 6 | 构建 UDM Network compiler/solver，覆盖 passive UDM、reaction UDM、transport model 和 v1 五模型 parity gates | 计划中 |
| 7 | 增加 `SecondaryClarifier10Layer`、Takacs 沉降、BSM1 reference profile 和 benchmark-backed golden evidence | 计划中 |
| 8 | 将 UDM Network v2 接入 worker/API/catalog/artifact 后，再切换 standalone 默认路径 | 计划中 |
| 9 | 仅在 parity、migration、BSM1 和 release gates 通过后退役 legacy FastAPI/v1 计算路径 | 门禁控制 |
| 10 | 加固 Desktop 打包、support bundle、backup/restore 和 release artifacts | 进行中 |

---

## 发行说明与变更记录

项目的更新记录见：

- [release-notes.md](./release-notes.md)

---

## 许可证

## License

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

