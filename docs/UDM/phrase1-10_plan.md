# UDM Phrase1-10 执行计划（可执行版）

日期：2026-02-11

## 目标

按 `docs/UDM/requirement_discuss.md` 补齐 UDM 当前缺口，完成“模型编辑 -> 校验 -> 参数范围 -> 生成画布 -> 仿真”的最小闭环。

## phrase1：基线冻结与差距确认

- 现状：后端 UDM API、UDM 计算链路、UDM 画布页已存在；模型库与模型编辑器页缺失。
- 产出：
  - 缺口清单（模型库页、编辑器、CSV、一键生成画布）
  - 执行顺序与验收标准

## phrase2：模型库前端能力

- 新增 `/_layout/udmModels` 页面
- 能力：
  - 模型列表查询（搜索/分页）
  - 模板列表查询
  - 从模板创建模型
  - 编辑、复制、发布/取消发布、删除

## phrase3：模型编辑器页面骨架

- 新增 `/_layout/udmModelEditor` 页面
- 能力：
  - 模型基础信息编辑（name/description/tags）
  - Components / Processes / Stoich / RateExpr 编辑
  - 行列增删

## phrase4：表达式校验与参数抽取

- 接入 `POST /api/v1/udm-models/validate`
- 展示：
  - errors / warnings
  - extracted_parameters
- 支持“用抽取结果补齐参数表”

## phrase5：参数范围向导

- 在编辑页内置参数范围表
- 字段：
  - default/min/max/scale/unit/note
- 前端规则：
  - min < default < max
  - scale=log 时 min > 0

## phrase6：保存与版本

- 新建模型：`POST /udm-models/`
- 更新模型：`PUT /udm-models/{id}`
- 复制模型：读详情后按最新版本重新创建（前端组合实现）

## phrase7：一键生成默认画布

- 生成拓扑：Input -> UDM Reactor -> Output
- 自动写入：
  - `customParameters`（来自 components）
  - `udmModel/udmModelSnapshot/udmProcesses/udmParameterValues`
  - 边系数 `a/b`

## phrase8：与 UDM 画布联动

- 生成后：
  - 创建并保存 flowchart
  - 导入 `useUDMFlowStore`
  - 跳转 `/udm`

## phrase9：路由与导航接入

- 侧边栏加入模型库入口
- route tree 增加：
  - `/_layout/udmModels`
  - `/_layout/udmModelEditor`

## phrase10：校验与交付

- 类型检查：
  - `cd frontend; npx tsc --noEmit`
- 后端编译检查（UDM相关）
- 输出实施说明与已知风险

## 验收标准

1. 能在模型库用模板快速创建模型并进入编辑。
2. 能在编辑器维护 Petersen 矩阵与速率表达式。
3. 能执行 validate 并看到抽取参数与错误信息。
4. 参数范围规则生效。
5. 点击“保存并生成画布”后可跳转 `/udm` 并看到默认三节点。
6. UDM 仿真可正常发起并查看结果。

