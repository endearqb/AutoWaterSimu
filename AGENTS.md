# 项目 Agent 协作与开发规范（AGENTS.md）

本文件为在本仓库中协作的「人类与智能体」统一指南。请严格遵循以下约定开展工作。

> 技术栈：Frontend 使用 React + TypeScript + Chakra UI v3 + Vite；流程图使用 React Flow（@xyflow/react）；Backend 使用 Python + FastAPI；数据库 PostgreSQL。

---

## 1. 项目规则

### 1.1 前端约定
- 框架与语言：React + TypeScript。
- 组件库：Chakra UI v3。
  - 使用组件前先阅读本地迁移`llms-v3-migration.txt`，然后按需阅读组件文档：
    - 迁移文档 v3：`llms-v3-migration.txt`
    - 组件：`llms-components.txt`
    - 图表：`llms-charts.txt`
    - 样式系统：`llms-styling.txt`
    - 主题：`llms-theming.txt`
    - 完整文档：`llms-full.txt`
  - 若上述文件不存在，请参考官方 Chakra UI v3 文档，并确保 API 用法与 v3 一致。
- 类型检查：完成前端改动后，务必执行 TypeScript 类型检查（不生成输出）：
  
  ```powershell
  cd frontend; npx tsc --noEmit
  ```
- React Flow（流程图）：使用 `@xyflow/react`，固定导入格式：
  
  ```ts
  import { ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
  ```
  - 本地文档目录：`reactflow_docs/`（概念、教程、性能与调试、TypeScript 等）。

### 1.2 终端与命令执行
- 默认终端：Windows PowerShell。
- 后端虚拟环境：从后端目录激活虚拟环境的命令为：
  
  ```powershell
  .venv\Scripts\activate
  ```

- 多条命令请使用分号 `;` 分隔，而不是 `&&`。例如：
  
  ```powershell
  cd backend; .venv\Scripts\activate; uv sync; fastapi run app/main.py
  ```

### 1.3 后端约定
- 框架/数据库：FastAPI + PostgreSQL。
- 数据计算与处理：涉及密集计算、复杂数据处理时，请尽可能多地添加调试信息（建议使用标准 `logging`，避免随意 `print`）。建议模式：
  
  ```python
  import logging
  logger = logging.getLogger(__name__)

  def compute(payload: dict) -> Result:
      logger.debug("compute:start", extra={"shape": len(payload)})
      # 关键步骤加入关键变量与中间统计信息
      result = heavy_calc(payload)
      logger.debug("compute:done", extra={"size": result.size})
      return result
  ```
  
  - 调试完成后，请移除或降级不必要的调试日志，避免污染日志与影响性能。
  - 如需长期保留的运行信息，使用 `INFO` 级别，保持结构化且简洁。

---

## 2. 生成前端客户端（OpenAPI Client）

前端客户端基于后端 OpenAPI Schema 生成。每次后端接口/Schema 变更后，都需要重新生成前端客户端并提交。

### 2.1 自动方式
1. 激活后端虚拟环境。
2. 在项目顶级目录运行脚本：
   
   ```bash
   ./scripts/generate-client.sh
   ```
   
   - Windows 下如直接执行失败，请使用手动方式。
3. 提交更改。

### 2.2 手动方式
1. 启动本地后端（或确保可访问 API）。
2. 下载 OpenAPI JSON：`http://localhost/api/v1/openapi.json`，保存为 `frontend/openapi.json`。
3. 生成前端客户端：
   
   ```powershell
   cd frontend; npm run generate-client
   ```
4. 提交更改。

> 注意：每次后端更改（OpenAPI 架构变化）后都需要重复上述步骤更新前端客户端。

---

## 3. 日常开发流程（推荐）

- 拉取/更新代码；在独立分支上进行工作。
- 前端改动：实现功能 → `cd frontend; npx tsc --noEmit` 确认类型通过 → 本地运行预览。
- 后端改动：激活虚拟环境 → 开发与调试（增加必要的结构化调试信息）→ 完成后移除冗余调试。
- 如涉及接口变更：更新/生成 OpenAPI 前端客户端，并验证类型与运行。
- 更新每日工作日志（见下文）。
- 提交代码并发起合并请求。

---

## 4. 更新每日工作日志（updatenote）

- 位置：项目根目录 `updatenote/`。
- 文件名：以日期命名的 Markdown 文件，例如：`2023-08-01.md`。
- 建议内容模板：
  
  ```md
  日期：2023-08-01
  
  内容：
    - 新增功能：
      - 新增了一个新的功能：xxxxxx
    - 改进：
      - 改进了一个旧的功能：xxxxxx
    - 修复：
      - 修复了一个旧的功能：xxxxxx
  ```
---

## 5. 目录与关键路径（对齐现有结构）

- 前端主要目录：`frontend/`
  - 源码：`frontend/src`
  - 生成的 OpenAPI 客户端：`frontend/src/client`
  - 自定义主题：`frontend/theme.tsx`
- React Flow 文档：`reactflow_docs/`（本地说明与示例）
- OpenAPI Schema（运行时）：`http://localhost/api/v1/openapi.json`

---

## 6. 常用命令速查（PowerShell）

- 前端类型检查：
  
  ```powershell
  cd frontend; npx tsc --noEmit
  ```

- 前端开发启动（若配置存在于 package.json 中）：
  
  ```powershell
  cd frontend; npm install; npm run dev
  ```

- 激活后端虚拟环境并运行（示例）：
  
  ```powershell
  cd backend; .venv\Scripts\activate; fastapi run app/main.py
  ```

- 生成前端客户端（手动）：
  
  ```powershell
  Invoke-WebRequest http://localhost/api/v1/openapi.json -OutFile frontend/openapi.json; `
  cd frontend; npm run generate-client
  ```

---

## 7. 代码质量与风格

- 保持 TypeScript 类型完备，尽量避免 `any`；新增类型定义放在合适的 `types`/`interfaces` 文件。
- Chakra 组件使用 v3 API；样式尽量使用主题 Token 与系统化写法（参考 `llms-styling.txt`、`llms-theming.txt`）。
- 后端调试信息应结构化、可控（使用 `logging`），在确认稳定后删除临时调试语句。
- 变更涉及 API 时，务必同步更新前端客户端并进行类型与运行验证。

---


