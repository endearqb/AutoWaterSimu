# AutoWaterSimu UDM 页面实现 Petersen 矩阵平缓学习曲线
开发文档与开发需求

## 文档定位

- 项目：AutoWaterSimu
- 目标：基于现有 UDM 页面与功能，实现 Petersen 矩阵的平缓学习曲线
- 性质：开发文档 + 功能需求文档 + 迭代实施建议

## 一、输入依据与现状判断

本方案基于仓库 README、docs/UDM 文档、项目内《AutoWaterSimu：流程图仿真与自定义模型(UDM) 实战通关教程》，以及附件《Petersen 矩阵：初级水处理工程师从零到一教程》。核心判断是：当前项目的 UDM 主链路已经具备“模型库 → 模型编辑器 → 自动生成流程图 → 计算仿真”的闭环，因此不需要重写 UDM 引擎，而应在其上增加教学编排层、引导交互层、学习反馈层。

## 二、产品目标

“平缓的学习曲线”指的是：用户每次只需要理解当前阶段新增的一个概念，并且能在当前页面就看到该概念对仿真结果的影响。具体体现为：

1. 先直觉后公式。
2. 先单反应后全模型。
3. 先会运行再会校准。
4. 每一步都有即时反馈。
5. 全程绑定工程场景而不是抽象公式。

## 三、现有能力与差距

### 已有能力

- UDM 后端主链路已接通。
- 已接入 ASM1 / ASM1Slim / ASM3 三套 seed templates。
- `/udmModels` 已支持模板创建、复制、发布。
- `/udmModelEditor` 已支持 components / parameters / processes / stoich / rateExpr 编辑。
- 保存模型后可一键生成默认流程图。
- `/udm` 已有属性、计算、仿真面板。
- 项目内已有 Flow + UDM + 排错教程叙事框架。

### 主要差距

- 没有章节化教程入口。
- 没有 guided mode / expert mode 分层。
- 没有连续性检查与工程解释。
- 没有基于章节的流程图预设与图表预设。
- 没有学习进度与练习反馈。

## 四、总体方案：三层式教学化改造

### 1. 模板层
用 tutorial templates 把知识按章节拆开，入口落在 `/udmModels`。

### 2. 引导层
在 `/udmModelEditor` 中通过 guided mode、stepper、箭头模式、公式配方等方式控制学习节奏。

### 3. 反馈层
在 `/udm` 中通过预置仿真、图表解释、爆炸曲线排错清单、基线对比等方式给用户即时反馈。

## 五、学习路径映射

- L0 为什么学：场景卡片
- L1 记账本直觉：箭头矩阵
- L2 第一张真矩阵：Y + Monod + 2×3
- L3 连续性检查：COD/N/ALK 对账
- L4 进水分馏：SS/SI/XS/XI/XH 向导
- L5 开关函数：好氧/缺氧开关配方
- L6 完整 ASM1：ASM1 / ASM1Slim / ASM3 模板
- L7 Excel 实操：单池沙盒
- L8 模型校准：参数敏感性与调参顺序
- L9 全景迁移：Hybrid 与流程级耦合

## 六、页面级开发需求

### `/udmModels`

- 增加“教程模板”分组。
- 卡片显示目标、时长、先修要求、完成度。
- 支持“继续学习”。
- 保留 blank / template / duplicate / publish 原有工程能力。

### `/udmModelEditor`

- 提供 Guided / Expert 双模式。
- 增加 stepper：组分 → 过程 → 系数 → 速率 → 参数 → 检查。
- L1 支持箭头模式。
- L2 起支持数字/公式模式。
- 提供常见公式与 stoich 配方按钮。
- 自动识别新参数并提示补范围。
- 增加连续性检查和常见错因提示。
- 右侧展示章节讲解与样例思考过程。

### `/udm`

- lesson 模式下提供图表预设。
- 提供结果解释卡。
- 提供爆炸曲线排错清单。
- 支持与模板默认结果对比。

## 七、数据结构与接口建议

建议扩展模板 `meta.learning`，包括：

- `lessonKey`
- `level`
- `objectives`
- `prerequisites`
- `lockedFields`
- `recipes`
- `notes`
- `misconceptions`
- `flowPreset`
- `chartPreset`
- `solverPreset`

建议扩展 validate 响应：

- `syntaxIssues`
- `semanticIssues`
- `teachingIssues`
- `continuityChecks`

MVP 可不新增独立 lesson progress 表，先用前端本地存储保存学习进度。

## 八、迭代建议

- P0：整理教程模板与入口
- P1：实现 guided mode 与 stepper
- P2：实现连续性检查与教学提示
- P3：实现进度与练习反馈
- P4：扩展到 ASM 高阶模板与 hybrid

## 九、验收标准

- 新用户可在产品内完成最小 2×3 矩阵闭环。
- guided mode 不暴露过量复杂字段。
- 至少支持 COD 连续性检查。
- 错误提示必须告诉用户如何修正。
- 一键生成流程图后可直接运行。
- 专家模式保持不受影响。

## 十、结论

最优策略不是重写 UDM，而是把现在这个“能算的 UDM”改造成“能教、能练、能跑、能排错的 Petersen 学习系统”。
