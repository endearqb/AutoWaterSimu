# 代码审查 Ch02 执行记录 — 2026-03-04

## 来源

`tasks/code_review_optimization_2026-03-03_ch02.md` — 5 项改进任务

## 执行结果

### 1. P1-2：权限不足 400 → 403（7 文件，21 处）

**状态**：✅ 完成

使用 `replace_all` 批量将 `status_code=400, detail="Not enough permissions"` → `status_code=403, detail="Not enough permissions"`。

修改文件：
- `backend/app/api/routes/flowcharts.py` (3处)
- `backend/app/api/routes/udm_flowcharts.py` (3处)
- `backend/app/api/routes/udm_hybrid_configs.py` (3处)
- `backend/app/api/routes/asm1_flowcharts.py` (3处)
- `backend/app/api/routes/asm1slim_flowcharts.py` (3处)
- `backend/app/api/routes/asm3_flowcharts.py` (3处)
- `backend/app/api/routes/items.py` (3处)

### 2. P1-1：UDM 任务列表计数改为数据库 COUNT

**状态**：✅ 完成

修改文件：`backend/app/api/routes/udm.py`
- import 添加 `func`：`from sqlmodel import Session, func, select`
- 替换 `len(session.exec(count_statement).all())` → `session.exec(select(func.count()).select_from(UDMJob).where(...)).one()`

### 3. P2-1：Pydantic v2 迁移（models.py）

**状态**：✅ 完成

修改文件：`backend/app/material_balance/models.py`
- import：添加 `ConfigDict, field_validator`
- 7 处 `@validator` → `@field_validator` + `@classmethod`
- 2 处使用 `values` 的签名改为 `info`（`ValidationInfo`），`values.get()` → `info.data.get()`
- `class Config: schema_extra` → `model_config = ConfigDict(json_schema_extra=...)`

### 4. P0-2：FlowComponentsDocs 快照/回滚补齐字段

**状态**：✅ 完成

修改文件：`frontend/src/components/HomePosthog/FlowComponentsDocs.tsx`
- `FlowStoreSnapshot` 类型添加 `timeSegments`、`hybridConfig`、`isEdgeTimeSegmentMode`
- 快照创建补齐 3 个字段
- 回滚恢复补齐 3 个字段

### 5. P0-1：流程图导入恢复 calculationParameters + UI 策略选择

**状态**：✅ 完成

#### 修改 1：importFlowData 接受策略参数
- `frontend/src/stores/createModelFlowStore.ts`：
  - 类型签名添加 `options?: { restoreCalculationParams?: boolean }`
  - 解构添加 `calculationParameters: importedCalcParams`
  - `set({...})` 添加条件恢复逻辑
- `frontend/src/stores/flowStore.ts`：同上

#### 修改 2：创建策略选择对话框
- 新建 `frontend/src/components/Flow/menu/ImportCalcParamsDialog.tsx`
  - 复用 Chakra Dialog.Root + Portal 模式
  - 两个按钮："使用文件参数" / "保持当前参数"
  - 回调 `onChoice(boolean)` 传递用户选择

#### 修改 3：FlowLayout 集成对话框
- `frontend/src/components/Flow/FlowLayout.tsx`：
  - 添加 `pendingImport` state 暂存待导入数据
  - `handleImport` 中检查 `calculationParameters` 是否存在
  - 若存在，暂存数据并显示对话框
  - 对话框回调 `handleCalcParamsChoice` 完成导入

#### 修改 4：i18n 文案
- `frontend/src/i18n/types.ts`：添加 4 个 key 类型
- `frontend/src/i18n/messages/zh.ts`：添加中文文案
- `frontend/src/i18n/messages/en.ts`：添加英文文案

新增 keys：
| Key | 中文 | English |
|-----|------|---------|
| `flow.menu.importCalcParamsTitle` | 导入计算参数 | Import Calculation Parameters |
| `flow.menu.importCalcParamsMessage` | 导入文件包含计算参数，是否使用？ | The imported file contains calculation parameters. Use them? |
| `flow.menu.useFileParams` | 使用文件参数 | Use File Parameters |
| `flow.menu.keepCurrentParams` | 保持当前参数 | Keep Current Parameters |

## 验证

- **ruff lint**：通过（仅有 pre-existing 警告：W293 空白行、UP006/UP007 typing 旧写法、I001 import 排序）
- **tsc --noEmit**：通过（exit 0）（pre-existing 编码问题：zh.ts 中文引号 TS1127）
