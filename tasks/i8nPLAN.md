# UDM/Hybrid/Tutorial i18n 全面修复计划

## Summary
- 目标是把 `udmModels`、`hybrid`、Petersen 矩阵教学页的用户可见文案补齐到真正可切换的双语状态，同时保持内部 `name`、`rate_expr`、`stoich_expr` 等 canonical 英文 ID 不变。
- 教程页采用“前端翻译键作为本地化真源头”的方案；后端继续返回 canonical seed 数据和稳定 `lessonKey` 元数据，前端按 `lessonKey + canonical id` 解析显示别名。
- 本次会同时处理两个已确认问题：现有 `en.ts`/`zh.ts` 中的 mojibake 编码损坏，以及教程矩阵里仍存在的硬编码英文/符号乱码。

## Implementation Changes
- 先把实施清单写入 `tasks/todo.md`，包含前端 i18n 清理、教程别名解析层、后端 seed 元数据核对、验证项和回顾项。
- 清理并补齐 `frontend/src/i18n/messages/en.ts` 与 `frontend/src/i18n/messages/zh.ts`：
  - 修复现有编码损坏文本。
  - 补齐 `flow.udmModels`、`flow.hybridConfigs`、`flow.hybridSetup`、`flow.udmEditor`、`flow.tutorial` 下缺失或不完整的键。
  - 新增教程专用别名字典，按 `chapter -> model/components/processes/parameters/notes` 组织。
- 增加教程显示解析工具：
  - 输入 `lessonKey`、模型详情、canonical component/process/parameter ID，输出当前语言下的显示名、描述、备注。
  - 解析优先级固定为：教程翻译键 > 现有 `component.label`/说明字段 > canonical `name`。
- 将解析层接入前端展示面：
  - `frontend/src/components/UDM/UDMModelEditorForm.tsx`：组件表、过程表、参数表、教程标题、预填说明、默认 flow 名称相关展示改为本地化显示。
  - `frontend/src/components/UDM/tutorial/ArrowMatrixView.tsx`：去掉硬编码 `Process`，行名/列名/箭头符号文案全部走 i18n 或解析器。
  - `frontend/src/routes/_layout/udmModels.tsx`、`frontend/src/routes/_layout/hybrid.tsx`、`HybridUDMSetupDialog`、`UDMPropertyPanel`：教程模型卡片、Hybrid 选择器/映射器、模型预览中的显示名改为别名展示。
- 后端只做稳定性与一致性修正，不引入 OpenAPI schema 变化：
  - 核对 `backend/app/services/udm_seed_templates.py` 中 tutorial seed 的 `lessonKey`、tags、learning meta、recommended charts。
  - 清理 seed template 中会直接泄漏到 API/日志的乱码名称、描述、注释，保持 canonical 文案一致。
  - 不新增 `process/parameter label` API 字段；若实现中发现必须改 schema，再单独触发 client 生成。

## Test Plan
- 切换 `zh`/`en`，逐页核对：
  - `udmModels`：标题、按钮、模板区、模型列表、分页、删除确认。
  - `hybrid`：页面标题、表头、按钮、保存/应用提示、Hybrid dialog 的 tab 与映射说明。
  - 教程矩阵页：章节标题、步骤卡、表格名、列名、行名、连续性检查、结果解读、推荐变量。
- 重点验证 `chapter-1`、`chapter-2`、`chapter-3`、`chapter-7`：
  - 组件列显示本地化别名。
  - 过程行显示本地化别名。
  - 参数显示本地化别名。
  - 预填默认值、`rateExpr`、`stoich` 数值/表达式不被翻译或破坏。
- 行为回归：
  - 保存模型、校验、提取参数、生成 flowchart、Hybrid 映射应用、问题跳转仍使用 canonical ID 正常工作。
- 执行验证：
  - `cd frontend; npx tsc --noEmit`
  - 若后端文件有变更，补跑 tutorial/UDM 相关后端测试；若实现未改 schema，则不执行 client regenerate。

## Assumptions
- `cod`、`dissolvedOxygen`、`aerobic_cod_removal` 这类 canonical ID 继续作为持久化数据、表达式变量、校验定位和 Hybrid 映射键，不做翻译。
- 本次“本地化预填内容”指用户在页面上看到的标题、别名、说明、教程文案与展示层默认内容；不是把数据库里的 tutorial seed 原始字段改造成按语言存两份。
- 除非实施中确认必须扩展 API，否则保持现有 OpenAPI 不变，也不生成新的前端 client。
