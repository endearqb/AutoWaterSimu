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

## 4. 工作流编排

### 4.1. 计划节点默认行为
- 对于任何非简单任务（3步以上或涉及架构决策），默认进入计划模式
- 如果出现问题，立即停止并重新规划，不要一头扎进去硬撑
- 在验证步骤中也使用计划模式，而不仅仅是构建阶段
- 提前编写详细规格说明，减少歧义

### 4.2. 子代理策略
- 大量使用子代理，保持主上下文窗口整洁
- 将研究、探索和并行分析任务分配给子代理
- 面对复杂问题，通过子代理投入更多算力
- 每个子代理专注单一任务，确保执行聚焦

### 4.3. 自我改进循环
- 每次被用户纠正后：将经验规律更新到 `tasks/lessons.md`
- 为自己制定规则，防止重犯同类错误
- 持续迭代这些经验，直到错误率下降
- 每次会话开始时回顾与当前项目相关的经验

### 4.4. 完成前验证
- 未经证明可正常运行，绝不将任务标记为完成
- 必要时对比主版本与修改后的行为差异
- 问自己："高级工程师会认可这个方案吗？"
- 运行测试、检查日志、演示正确性

### 4.5. 追求优雅（适度平衡）
- 对于非简单改动：停下来问"有没有更优雅的实现方式？"
- 如果修复方案感觉像是临时补丁，就说："基于我现在掌握的全部信息，实现一个优雅的解决方案"
- 对于简单明显的修复，跳过此步骤，不要过度设计
- 在提交方案前先审视自己的工作

### 4.6. 自主修复 Bug
- 收到 Bug 报告后：直接修复，无需寻求引导
- 定位日志、错误信息、失败的测试，然后解决它们
- 不需要用户切换上下文
- 无需被告知如何操作，主动去修复失败的 CI 测试

### 4.7. 任务管理

1. **先写计划**：将计划写入 `tasks/todo.md`，包含可勾选的条目
2. **确认计划**：开始实施前进行检查确认
3. **追踪进度**：完成后逐项标记
4. **说明变更**：每步提供高层级摘要
5. **记录结果**：在 `tasks/todo.md` 中添加回顾章节
6. **沉淀经验**：被纠正后更新 `tasks/lessons.md`


### 4.8. 核心原则

- **简洁优先**：每次改动尽可能简单，影响尽量少的代码
- **杜绝懒惰**：找到根本原因，不打临时补丁，保持高级开发者标准
- **最小影响**：变更只触及必要之处，避免引入新 Bug
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
- Chakra 组件使用 v3 API；样式尽量使用主题 Token 与系统化写法。
- 后端调试信息应结构化、可控（使用 `logging`），在确认稳定后删除临时调试语句。
- 变更涉及 API 时，务必同步更新前端客户端并进行类型与运行验证。

---


