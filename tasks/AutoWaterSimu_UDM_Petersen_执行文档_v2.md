# AutoWaterSimu × UDM × Petersen 矩阵
## 任务清单 + 页面原型说明 + API 改动清单

> 本文档基于上一版《AutoWaterSimu 基于 UDM 实现 Petersen 矩阵“平缓学习曲线”的开发文档与开发需求》进一步拆解，目标是把方案从“方向性文档”转为“可排期、可设计、可开发、可联调”的执行文档。
>
> 使用范围：产品评审、研发排期、前后端联调、测试准备。

---

## 0. 执行范围与拆解原则

### 0.1 本轮拆解聚焦的三件事
1. **任务清单**：拆到 Sprint / 模块 / 角色 / 依赖 / 验收。
2. **页面原型说明**：拆到页面区块、交互、状态、组件复用。
3. **API 改动清单**：拆到字段、接口、响应结构、兼容策略。

### 0.2 默认产品边界
- 不新做一套独立的 Petersen 建模系统；
- 继续复用现有 UDM Models / UDM Model Editor / UDM Flow & Simulation 主链路；
- 第一阶段优先做“**教学模式 + 模板库 + 连续性检查 + 一键仿真闭环**”；
- 学习入口页、章节模板、教学提示、连续性检查结果，全部作为 **UDM 的增强层** 实现。

### 0.3 MVP 目标（用于排期对齐）
让新用户在一次 30–60 分钟的学习中完成：
- 打开第 1–3 章模板；
- 在教学模式下理解矩阵行列含义；
- 修改一个 Y 或 Monod 相关参数；
- 执行一次连续性检查；
- 一键生成流程图并完成一次仿真；
- 看懂至少 3 条核心结果曲线。

---

# Part A. 任务清单

## 1. 里程碑与版本切分

### 1.1 版本切分

| 版本 | 目标 | 输出 |
|---|---|---|
| MVP | 打通“模板 → 编辑 → 校验 → 仿真”学习闭环 | 4 个模板、教学模式、连续性检查、教学型结果面板 |
| V1 | 覆盖教程主章节与常见场景 | 章节模板扩展、分馏/硝化反硝化/校准模板、对比实验 |
| V2 | 教学管理与学习追踪 | 学习进度、完成状态、内容配置后台、更多案例 |

### 1.2 研发里程碑建议

| 里程碑 | 周期 | 验收重点 |
|---|---|---|
| M1 模板库与入口 | Sprint 1 | 用户能找到并打开章节模板 |
| M2 教学模式编辑器 | Sprint 2 | 用户能按步骤完成编辑与保存 |
| M3 连续性检查 | Sprint 3 | 用户能看到可解释的守恒检查结果 |
| M4 仿真闭环 | Sprint 4 | 用户能从模板一键跑到结果图 |
| M5 进阶模板 | Sprint 5 | 支持分馏、硝化反硝化、校准实验 |

---

## 2. Epic 级任务拆解

## Epic 01：学习入口与模板体系

### 目标
建立“章节模板库”和“从教程直接进入模型”的入口。

### 任务清单

| ID | 优先级 | 任务 | 角色 | 依赖 | 输出/验收 |
|---|---|---|---|---|---|
| E01-T01 | P0 | 扩展 `meta.learning` 数据结构 | 后端 | 无 | 模型可携带 chapter/difficulty/templateType 等元数据 |
| E01-T02 | P0 | 补齐 4 个 MVP 种子模板 | 后端/内容 | T01 | 至少有 chapter-1 / chapter-2 / chapter-3 / chapter-7 模板 |
| E01-T03 | P0 | `UDM Models` 页面增加 Petersen 筛选条件 | 前端 | T01 | 可按章节/难度/模板类型筛选 |
| E01-T04 | P0 | 模板卡片增加章节、难度、预计时长、前置知识展示 | 前端 | T01 | 用户一眼区分模板用途 |
| E01-T05 | P0 | 模板卡片增加“开始学习 / 打开练习版 / 打开答案版 / 克隆”按钮 | 前端 | T02 | 用户可从模板直接进入编辑器 |
| E01-T06 | P1 | 新增学习入口页 `/petersen` | 前端 | T02 | 展示章节地图、推荐路径、最近学习 |
| E01-T07 | P1 | 模板详情侧栏/弹窗 | 前端 | T01 | 展示学习目标、常见错误、推荐下一章 |
| E01-T08 | P1 | 教程内容资源配置（章节、提示、案例）落地成 JSON | 后端/内容 | T01 | 教学文案不硬编码在页面中 |
| E01-T09 | P1 | 权限与发布策略梳理（系统模板/个人模型） | 后端 | T01 | 系统模板可只读、个人模型可克隆编辑 |
| E01-T10 | P1 | 模板列表与入口页 E2E 测试 | QA | T02–T06 | 模板加载、筛选、跳转流程通过 |

### 交付标准
- UDM Models 中可以筛出 Petersen 教程模板；
- 模板卡片能分辨练习版、答案版、案例版；
- 用户能从模板一键进入编辑器；
- 学习入口页至少能展示第 0–8 章的导航结构。

---

## Epic 02：教学模式编辑器

### 目标
把现有 UDMModelEditorForm 变成“分步骤教学版矩阵编辑器”。

### 任务清单

| ID | 优先级 | 任务 | 角色 | 依赖 | 输出/验收 |
|---|---|---|---|---|---|
| E02-T01 | P0 | 设计 `LearningModeConfig` 前端状态结构 | 前端 | E01-T01 | 支持 chapter、step、可见区块、锁定字段 |
| E02-T02 | P0 | 编辑器顶部增加“教学模式开关 + Step 导航” | 前端 | T01 | 可切换 Step 1–5 |
| E02-T03 | P0 | Step 1 仅显示 Components / Processes | 前端 | T01 | 初学者不先看到全部公式/参数 |
| E02-T04 | P0 | Step 2 显示 stoich 表格与箭头提示 | 前端 | T01 | 支持符号/箭头占位和数字输入 |
| E02-T05 | P0 | Step 3 显示 rate expression 区与公式片段插入 | 前端 | T01 | 用户可插入 Monod / 开关函数模板 |
| E02-T06 | P0 | Step 4 显示参数表与自动抽取参数 | 前端/后端 | T01 | 从公式提取参数并合并参数区 |
| E02-T07 | P1 | Step 5 开放高级字段与自由编辑 | 前端 | T01 | 教学模式可平滑过渡到工程模式 |
| E02-T08 | P0 | 增加章节引导卡片 | 前端/内容 | E01-T08 | 每章显示目标、概念、常见错误 |
| E02-T09 | P1 | 行级“故事解释 / 常见错误 / 教程链接 / 参考写法” | 前端/内容 | E01-T08 | 每个过程行可获得教学辅助 |
| E02-T10 | P0 | Validation issue 映射到具体 process/component/cell | 前端 | API 改动 | 点选错误能跳到具体单元格 |
| E02-T11 | P1 | 自动保存教学进度（本地或服务端） | 前端/后端 | T01 | 返回时能恢复上次 step |
| E02-T12 | P1 | 编辑器交互与步骤切换测试 | QA | T02–T10 | 步骤可见性与跳转行为稳定 |

### 交付标准
- Step 1–5 能正常切换；
- 用户在不同 Step 只看到当前应学内容；
- 错误提示能定位到行/列/单元格；
- 教程提示区与矩阵编辑区是联动的。

---

## Epic 03：Petersen 连续性检查

### 目标
把“COD / N / ALK 守恒”做成教学反馈核心能力，而不是纯技术报错。

### 任务清单

| ID | 优先级 | 任务 | 角色 | 依赖 | 输出/验收 |
|---|---|---|---|---|---|
| E03-T01 | P0 | 扩展 component 的 `conversion_factors` 结构 | 后端 | E01-T01 | 每个组分可声明对 COD/N/ALK 的换算 |
| E03-T02 | P0 | 设计 `ContinuityCheckItem` 返回结构 | 后端 | T01 | 明确 processName、dimension、status、explanation |
| E03-T03 | P0 | 新增 `PetersenContinuityService` | 后端 | T01–T02 | 支持 COD / N / ALK 检查 |
| E03-T04 | P0 | 支持 `strict / teaching / off` 模式 | 后端 | T03 | 教学简化模型可返回 warning 而非硬 fail |
| E03-T05 | P0 | 将 continuity 结果挂入 validate 响应 | 后端 | T03 | 编辑器 validate 结果可直接消费 |
| E03-T06 | P0 | 前端新增 Continuity 面板 | 前端 | T05 | 可按维度查看逐过程检查结果 |
| E03-T07 | P0 | 每条 continuity item 支持“跳到该过程” | 前端 | T05 | 点击后高亮对应过程行 |
| E03-T08 | P1 | 增加“为什么错 / 怎么改 / 去看哪章”文案 | 内容/前端 | E01-T08 | 错误提示具有教学闭环 |
| E03-T09 | P1 | 容差配置与简化矩阵白名单 | 后端 | T03 | 避免教学模型误报 |
| E03-T10 | P1 | 守恒检查单元测试 + 示例模板回归测试 | QA/后端 | T03–T09 | 典型模板在 strict/teaching 模式下结果稳定 |

### 交付标准
- `validate` 响应中包含 continuity 结果；
- 至少支持 COD 与 N 的逐过程检查；
- 教学模式下能识别“简化模型缺列”并返回 warning；
- 前端可查看、定位、理解错误。

---

## Epic 04：一键生成流程图与教学型结果页

### 目标
让学习者从矩阵编辑顺滑进入仿真，并看懂结果。

### 任务清单

| ID | 优先级 | 任务 | 角色 | 依赖 | 输出/验收 |
|---|---|---|---|---|---|
| E04-T01 | P0 | `saveAndGenerateFlowchart` 补齐默认场景映射 | 前端/后端 | E01-T02 | 模板可生成 Input → Reactor → Output 默认流图 |
| E04-T02 | P0 | 流程图默认参数/初值/运行时长配置 | 后端/内容 | T01 | 不需要用户手工补全即可跑通 |
| E04-T03 | P0 | 结果页增加“推荐观测变量”区 | 前端 | T02 | 默认展示 S/X/DO/NH4/NO3/OUR |
| E04-T04 | P0 | 结果页增加“教学解释卡” | 前端/内容 | T03 | 例如“Y 降低为什么 OUR 增加” |
| E04-T05 | P1 | 增加 baseline vs modified 对比模式 | 前端/后端 | T03 | 可对比两次参数设置结果 |
| E04-T06 | P1 | 增加参数滑条实验（Y、DO、进水分馏） | 前端 | T03 | 用户可做敏感性试验 |
| E04-T07 | P1 | 预设 scenario 切换（基础 CSTR / 硝化 / 反硝化） | 后端/前端 | E01-T08 | 模板可快速切换实验场景 |
| E04-T08 | P1 | 章节完成提示与下一步推荐 | 前端 | E02-T11 | 完成仿真后引导进入下一章 |
| E04-T09 | P1 | 仿真闭环 E2E 回归测试 | QA | T01–T08 | 从模板到结果图的完整链路通过 |

### 交付标准
- 模板可一键转成默认流程图；
- 至少有 1 个基础 CSTR 场景可直接运行；
- 结果页默认展示关键曲线和解释卡；
- 用户不需要额外配置即可看到第一次仿真结果。

---

## Epic 05：内容配置、测试与运营准备

### 目标
保证教学内容可维护，系统可测试，后续可扩展。

### 任务清单

| ID | 优先级 | 任务 | 角色 | 依赖 | 输出/验收 |
|---|---|---|---|---|---|
| E05-T01 | P0 | 建立 `chapters / hints / scenarios` 配置目录规范 | 后端/内容 | E01-T08 | 内容配置可复用 |
| E05-T02 | P0 | 首批章节提示文案编写 | 内容 | T01 | 覆盖第 1–3、7 章 |
| E05-T03 | P0 | 首批模板验算与答案校核 | 内容/后端 | E01-T02 | 模板数值逻辑可用 |
| E05-T04 | P1 | 增加教程深链（chapter/section）映射 | 前端/内容 | T01 | 错误提示可跳到教程章节 |
| E05-T05 | P1 | 埋点方案（开始学习、首次通过校验、首次仿真） | 产品/前端 | 基础功能完成 | 可评估学习闭环转化 |
| E05-T06 | P1 | 发布与回滚策略 | 后端/运维 | T01 | 模板升级不影响旧模型 |
| E05-T07 | P1 | V1 模板扩展：分馏、硝化/反硝化、校准 | 内容/后端 | MVP 完成 | 模板体系从 4 个扩展到 8–10 个 |

---

## 3. 按 Sprint 的推荐排期

### Sprint 1：模板与入口
- E01-T01 ~ E01-T06
- E05-T01 ~ E05-T03

**Sprint 1 结束定义**
- 用户可以看到 Petersen 模板；
- 能从模板进入编辑器；
- 系统已有最小章节结构和种子模板。

### Sprint 2：教学模式编辑器
- E02-T01 ~ E02-T10
- E01-T07

**Sprint 2 结束定义**
- 教学模式 Step 1–5 可用；
- 章节卡片与错误定位可用；
- 初学者可完成第一次保存与 validate。

### Sprint 3：连续性检查
- E03-T01 ~ E03-T08
- E02-T11（可选）

**Sprint 3 结束定义**
- 守恒检查进入 validate 链路；
- 编辑器能展示逐过程 continuity 结果；
- 教学 warning 机制可用。

### Sprint 4：仿真闭环
- E04-T01 ~ E04-T08
- E03-T09 ~ E03-T10
- E04-T09

**Sprint 4 结束定义**
- 模板可一键跑到结果图；
- 结果页有教学解释；
- MVP 验收通过。

### Sprint 5：V1 进阶场景
- E04-T05 ~ E04-T07
- E05-T04 ~ E05-T07

---

## 4. 角色分工建议

| 角色 | 核心职责 |
|---|---|
| 产品 | 章节范围、模板清单、验收标准、埋点 |
| UX / 设计 | 学习入口页、教学模式编辑器、错误提示信息架构 |
| 前端 | 页面增强、教学模式状态管理、结果面板、交互跳转 |
| 后端 | 元数据扩展、模板种子、连续性检查、接口兼容 |
| 内容/工艺 | 模板数值、章节提示、常见错误、场景配置 |
| QA | 模板回归、守恒检查、端到端链路测试 |

---

## 5. MVP 验收清单（可直接拿去排期会）

### 产品与内容
- [ ] 至少有 4 个模板：第 1 章 / 第 2 章 / 第 3 章 / 第 7 章；
- [ ] 每个模板都有学习目标、前置知识、预计时间、常见错误；
- [ ] 至少 1 个练习版 + 1 个答案版模板配对。

### 前端
- [ ] `/petersen` 或等效学习入口可访问；
- [ ] `/udmModels` 支持 Petersen 筛选与模板动作；
- [ ] `/udmModelEditor` 支持教学模式与 Step 切换；
- [ ] Validate 结果可跳到具体行/列/单元格；
- [ ] `/udm` 结果页有教学型图表和解释卡。

### 后端
- [ ] 模型元数据支持 `meta.learning`；
- [ ] validate 响应支持 continuity_checks；
- [ ] 默认流程图可按模板生成；
- [ ] 模板种子可初始化与回滚。

### 测试与体验
- [ ] 新用户 10 分钟内能完成首次保存和验证；
- [ ] 15 分钟内能生成默认流程图；
- [ ] 20 分钟内能看到仿真结果；
- [ ] 教学 warning 与 strict fail 的区别可验证。

---

# Part B. 页面原型说明

## 6. 页面总览

| 页面 | 路由建议 | 作用 | 主要用户 |
|---|---|---|---|
| 页面 A 学习入口页 | `/petersen` | 展示学习路径、章节地图、推荐入口 | 初学者 |
| 页面 B 模板库页 | `/udmModels` | 浏览/筛选/启动章节模板 | 初学者 / 讲师 / 工艺工程师 |
| 页面 C 教学模式编辑器 | `/udmModelEditor/:id` | 分步骤编辑矩阵并校验 | 初学者 / 进阶用户 |
| 页面 D 仿真页 | `/udm` | 从矩阵进入流程图与结果观察 | 初学者 / 进阶用户 |

---

## 7. 页面 A：学习入口页 `/petersen`

### 7.1 页面目标
给初学者一个明确的“从哪里开始、学到哪一步、下一章是什么”的入口，而不是直接扔到模型列表里。

### 7.2 信息区块

1. **顶部 Hero 区**
   - 标题：Petersen 矩阵学习路径
   - 副标题：从“记账本直觉”到“可运行仿真”
   - 主按钮：从第 1 章开始
   - 次按钮：继续上次学习

2. **知识地图区**
   - 显示第 0–9 章的路径关系；
   - 用连线表示“前置知识”；
   - 第 1 章、第 2 章、第 3 章、第 7 章在 MVP 中高亮可用。

3. **章节卡片区**
   - 卡片字段：章节名、难度、预计时间、前置知识、模板数、完成状态；
   - CTA：开始学习 / 查看模板 / 查看答案。

4. **最近学习区**
   - 最近打开的模板；
   - 最近完成的章节；
   - 最近一次仿真结果时间。

5. **推荐路径区**
   - 新手路径：第 1 章 → 第 2 章 → 第 3 章 → 第 7 章；
   - 工艺路径：第 2 章 → 第 5 章 → 第 6 章 → 第 8 章。

### 7.3 页面线框（低保真）

```text
+-----------------------------------------------------------+
| Hero: Petersen 矩阵学习路径            [从第1章开始]       |
| 从直觉理解到在线仿真                    [继续上次学习]     |
+-----------------------------------------------------------+
| 知识地图： 0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 |
+-----------------------------------------------------------+
| [第1章卡片] [第2章卡片] [第3章卡片] [第4章卡片] ...        |
| 章节名 / 难度 / 时间 / 前置 / 模板数 / CTA                |
+-----------------------------------------------------------+
| 最近学习                                                   |
| 最近模板 / 最近通过校验 / 最近仿真                        |
+-----------------------------------------------------------+
| 推荐路径                                                   |
| 新手路径 | 工艺路径                                        |
+-----------------------------------------------------------+
```

### 7.4 关键交互
- 点击“从第 1 章开始”默认跳到 chapter-1 的练习模板；
- 点击章节卡片可进入该章模板列表；
- 若用户已有最近进度，点击“继续上次学习”直接恢复到最近模板和 step；
- 若某章节前置未完成，仍可进入，但给出提示而不强制阻塞。

### 7.5 状态设计
- **Loading**：骨架屏展示章节卡片；
- **Empty**：若模板未加载成功，显示“暂无章节模板，请联系管理员”；
- **No Progress**：最近学习区提示“从第 1 章开始”；
- **Error**：入口页加载失败时提供“重试 + 去模板库”。

### 7.6 组件复用建议
- 卡片与徽章样式复用现有 UDM Models 卡片；
- 新增 `LearningPathMap` 组件；
- 新增 `RecentLearningPanel` 组件。

---

## 8. 页面 B：模板库页 `/udmModels`（增强）

### 8.1 页面目标
继续使用现有模型库页，但让它变成“教程模板库 + 练习入口”。

### 8.2 信息区块

1. **筛选栏**
   - Track：Petersen / All；
   - Chapter：第 0–9 章；
   - Difficulty：入门 / 进阶 / 完整；
   - Type：讲解 / 练习 / 答案 / 案例；
   - Ownership：系统模板 / 我的模型。

2. **模板卡片/表格**
   - 标题；
   - 章节徽章；
   - 难度徽章；
   - 模板类型徽章；
   - 预计时长；
   - 前置知识摘要；
   - 更新时间；
   - 操作按钮。

3. **详情侧栏**
   - 学习目标；
   - 核心概念；
   - 常见错误；
   - 推荐下一章；
   - 推荐观测变量；
   - 打开练习版 / 打开答案版 / 克隆。

### 8.3 页面线框（低保真）

```text
+----------------------------------------------------------------+
| 筛选栏: Track | Chapter | Difficulty | Type | Ownership         |
+----------------------------------------------------------------+
| 模板卡片 / 表格                                                |
| -------------------------------------------------------------- |
| 标题      [Chapter-2] [入门] [练习]   25 min   [开始学习]      |
| 前置知识：chapter-1                                            |
| -------------------------------------------------------------- |
| 标题      [Chapter-3] [入门] [答案]   20 min   [打开答案]      |
| -------------------------------------------------------------- |
+----------------------------------------------------------------+
| 右侧详情栏（点击卡片打开）                                     |
| 学习目标 / 核心概念 / 常见错误 / 下一章 / 操作按钮             |
+----------------------------------------------------------------+
```

### 8.4 关键交互
- 卡片主按钮根据模板类型变化：
  - 练习版：开始学习；
  - 答案版：查看答案；
  - 案例版：运行案例；
- 点击“克隆到我的模型”后生成个人模型副本；
- 点击“查看教程说明”打开详情侧栏；
- 从模板库进入编辑器时，将 `learning.track/chapter/stepConfig` 一起带入。

### 8.5 状态设计
- **Loading**：模板列表骨架屏；
- **No Result**：当前筛选条件下无模板；
- **Permission**：系统模板可只读，个人模型可编辑；
- **Error**：列表加载失败时保留筛选栏并允许重试。

### 8.6 组件复用建议
- 复用现有 UDM 模型列表容器；
- 新增 `LearningTemplateBadgeGroup`；
- 新增 `TemplateLearningDrawer`。

---

## 9. 页面 C：教学模式编辑器 `/udmModelEditor/:id`

### 9.1 页面目标
把当前 UDMModelEditorForm 改造成“带辅助轮”的学习型矩阵编辑器。

### 9.2 页面结构建议

1. **顶部工具条**
   - 模板名称；
   - 章节标签；
   - 教学模式开关；
   - Step 导航（1–5）；
   - 操作按钮：Validate / Save / Save & Generate Flowchart。

2. **左侧教学区**
   - 章节引导卡片；
   - 学习目标；
   - 当前 Step 要点；
   - 常见错误；
   - 教程原文跳转。

3. **中间编辑区**
   - Components 区；
   - Processes 区；
   - Stoich Matrix 区；
   - Rate Expressions 区；
   - Parameters 区；
   - 高级字段区。

4. **右侧校验区 / 抽屉**
   - 基础校验问题；
   - Continuity 检查；
   - 错误解释；
   - 跳转按钮。

### 9.3 Step 设计

| Step | 显示内容 | 学习目标 |
|---|---|---|
| Step 1 | Components、Processes | 理解行/列/过程/组分 |
| Step 2 | Stoich Matrix | 理解“谁增加谁减少、系数大小” |
| Step 3 | Rate Expressions | 理解 Monod 与开关函数 |
| Step 4 | Parameters | 理解参数意义与取值范围 |
| Step 5 | 高级字段与自由编辑 | 进入工程模式 |

### 9.4 页面线框（低保真）

```text
+--------------------------------------------------------------------------------+
| 模板名 [Chapter-2] [教学模式 ON] [Step1][Step2][Step3][Step4][Step5]           |
| [Validate] [Save] [Save & Generate Flowchart]                                  |
+--------------------------+--------------------------------+----------------------+
| 左侧教学区               | 中间编辑区                     | 右侧校验区           |
| - 学习目标               | Components                    | Validation issues    |
| - 当前Step说明           | Processes                     | Continuity checks    |
| - 常见错误               | Stoich Matrix                 | Why / How to fix     |
| - 教程链接               | Rate Expressions              | [Jump to row/cell]   |
|                          | Parameters                    |                      |
+--------------------------+--------------------------------+----------------------+
```

### 9.5 关键交互
- 切换 Step 时，仅展示当前需要理解的区块；
- 点击某个过程行的“故事解释”，弹出简要文字：
  - 例：好氧生长 = 食物减少、菌体增加、氧气减少；
- 点击“插入 Monod 模板”自动填入表达式片段；
- validate 返回错误后，点击错误项高亮对应单元格；
- continuity 结果点击后定位到具体过程行，并在左侧展示“为什么错”；
- 点击 `Save & Generate Flowchart` 后，直接进入默认流程图。

### 9.6 字段可见性与锁定规则

| 区块 | Step1 | Step2 | Step3 | Step4 | Step5 |
|---|---:|---:|---:|---:|---:|
| Components | 显示 | 显示 | 显示 | 显示 | 显示 |
| Processes | 显示 | 显示 | 显示 | 显示 | 显示 |
| Stoich | 隐藏/箭头提示 | 显示 | 显示 | 显示 | 显示 |
| Rate Expressions | 隐藏 | 隐藏/只读提示 | 显示 | 显示 | 显示 |
| Parameters | 隐藏 | 隐藏 | 隐藏/自动抽取入口 | 显示 | 显示 |
| Advanced Fields | 隐藏 | 隐藏 | 隐藏 | 隐藏 | 显示 |

### 9.7 状态设计
- **New Template**：首次打开显示“本章建议先完成 Step 1–3”；
- **Draft**：显示最近保存时间；
- **Validation Fail**：右侧按 severity 分组；
- **Continuity Warning**：橙色提示“教学简化省略列”；
- **Success**：显示“已通过基础校验，可进入流程图”。

### 9.8 组件复用与新增建议
- 复用现有 `UDMModelEditorForm` 主结构；
- 新增 `LearningModeStepper`；
- 新增 `ChapterGuideCard`；
- 新增 `ProcessTeachingPopover`；
- 新增 `ContinuityValidationPanel`。

---

## 10. 页面 D：仿真页 `/udm`（增强）

### 10.1 页面目标
让“矩阵”在用户眼中真正变成“会动的系统”。

### 10.2 页面结构建议

1. **顶部场景条**
   - 当前模板名；
   - 当前 scenario 名称；
   - 运行按钮；
   - 参数试验快捷入口。

2. **左侧流程图区**
   - Input → UDM Reactor → Output 默认结构；
   - 可保留现有流程图画布；
   - 默认只突出教学相关节点。

3. **右侧 Inspector 区**
   - 参数；
   - 计算；
   - 仿真设置；
   - 推荐变量选择。

4. **底部结果区**
   - 核心曲线；
   - 最终稳态值；
   - 教学解释卡；
   - 对比实验结果。

### 10.3 页面线框（低保真）

```text
+----------------------------------------------------------------------------+
| 模板: Chapter-7 基础 CSTR   场景: basic_cstr   [Run] [对比实验] [改Y值]      |
+-----------------------------------+----------------------------------------+
| 流程图画布                        | Inspector                               |
| Input -> Reactor -> Output        | 参数 / 计算 / 仿真 / 推荐变量           |
+----------------------------------------------------------------------------+
| 结果区                                                                    |
| [S vs time] [X vs time] [DO/OUR] [NH4/NO3]                                |
| 教学解释：为什么 X 先升后稳？ 为什么 Y 降低后耗氧增加？                    |
+----------------------------------------------------------------------------+
```

### 10.4 关键交互
- 从编辑器进入该页时，自动带入默认流程图和运行参数；
- 结果页默认优先显示模板推荐变量；
- 点击“改 Y 值”生成对比实验副本；
- 点击“切换 DO”或“切换分馏场景”刷新结果；
- 仿真结束后显示“下一章建议”。

### 10.5 状态设计
- **Before Run**：展示“运行后将看到 S/X/OUR 曲线”；
- **Running**：显示进度和禁用重复提交；
- **Run Success**：展示关键图表与解释卡；
- **Run Error**：保留最后一次配置并提示检查参数或流程图；
- **Compare Mode**：左右版本标签明显区分 baseline / modified。

### 10.6 组件复用与新增建议
- 复用现有流程图画布、Inspector tab、结果图表组件；
- 新增 `RecommendedChartsPanel`；
- 新增 `TeachingResultCard`；
- 新增 `ScenarioQuickActions`。

---

## 11. 页面间跳转关系

```text
/petersen
  -> /udmModels?track=petersen&chapter=chapter-1
  -> /udmModelEditor/:id?learningMode=1&chapter=chapter-1
  -> /udm?flowchartId=xxx&sourceTemplate=chapter-1
```

### 跳转原则
- 学习入口页强调“从章节进入”；
- 模板库强调“从模板进入”；
- 编辑器强调“完成校验后进入仿真”；
- 仿真页强调“完成本章后进入下一章”。

---

# Part C. API 改动清单

## 12. API 改动策略

### 12.1 总原则
- **MVP 优先扩展现有 UDM API**，避免一开始切出过多新服务；
- **V1/V2 再视情况增加 `/petersen/*` 专属接口**；
- 尽量把教学信息放在 `meta.learning` 与 `validation.continuity_checks` 中；
- 保持现有自由建模接口兼容，未使用教学模式的模型不受影响。

### 12.2 推荐分层
1. **模型层**：`meta.learning`、components/processes/parameters 扩展字段；
2. **校验层**：validate 返回 continuity_checks；
3. **模板层**：模板列表支持 learning 筛选；
4. **场景层**：默认流程图和 recommended charts 与模板关联。

---

## 13. 数据结构改动

## 13.1 模型 meta 扩展

### 新增字段建议

```json
{
  "meta": {
    "source": "seed-template",
    "learning": {
      "track": "petersen",
      "chapter": "chapter-2",
      "chapterTitle": "你的第一张真矩阵",
      "difficulty": "beginner",
      "templateType": "exercise",
      "estimatedMinutes": 25,
      "prerequisites": ["chapter-1"],
      "stepConfig": {
        "defaultStep": 2,
        "maxStep": 4
      },
      "hintRefs": [
        "petersen/ch2/yield",
        "petersen/ch2/monod"
      ],
      "continuityProfiles": ["COD"],
      "defaultScenario": "cstr_basic",
      "recommendedCharts": ["S", "X", "OUR"],
      "readonlyMode": false
    }
  }
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|---|---|---|
| track | string | `petersen` / 未来其他课程轨道 |
| chapter | string | 章节唯一标识 |
| chapterTitle | string | 页面展示标题 |
| difficulty | string | beginner / intermediate / full |
| templateType | string | guide / exercise / answer / case |
| estimatedMinutes | number | 预计完成时长 |
| prerequisites | string[] | 前置章节 |
| stepConfig | object | 默认学习 step 与上限 |
| hintRefs | string[] | 对应提示资源 |
| continuityProfiles | string[] | 需要检查的维度 |
| defaultScenario | string | 默认仿真场景 |
| recommendedCharts | string[] | 结果页默认推荐曲线 |
| readonlyMode | boolean | 是否只读参考模板 |

---

## 13.2 component 扩展

```json
{
  "name": "S_O",
  "label": "Dissolved Oxygen",
  "unit": "mg/L",
  "conversion_factors": {
    "COD": -1.0,
    "N": 0.0,
    "ALK": 0.0
  },
  "domain_tags": ["oxygen", "cod-equivalent"],
  "teaching_note": "溶解氧在 COD 守恒中通常用等价换算处理"
}
```

### 用途
- 连续性检查；
- 页面上的组分说明；
- 教学解释卡的生成。

---

## 13.3 process 扩展

```json
{
  "name": "Aerobic growth",
  "rate_expr": "mu_H * S_S/(K_S+S_S) * S_O/(K_OH+S_O) * X_BH",
  "stoich": {
    "S_S": "-1/Y_H",
    "X_BH": 1,
    "S_O": "-(1-Y_H)/Y_H"
  },
  "teaching": {
    "story": "食物减少、菌体增加、氧气减少",
    "commonMistakes": [
      "把 S_O 写成增加",
      "把 -1/Y_H 写成 -Y_H"
    ],
    "tutorialRef": "chapter-2",
    "hintRefs": ["petersen/ch2/yield"]
  }
}
```

### 用途
- 行级提示；
- 常见错误展示；
- 与教程章节联动。

---

## 13.4 parameter 扩展

```json
{
  "name": "Y_H",
  "default_value": 0.67,
  "unit": "gCOD/gCOD",
  "min_value": 0.2,
  "max_value": 0.8,
  "teaching": {
    "meaning": "每消耗 1 单位基质，有多少转成新菌体",
    "effect": "Y 越低，耗氧越多；Y 越高，产泥越多"
  }
}
```

---

## 14. 现有接口扩展清单（MVP 推荐）

> 这一组接口建议优先在现有 UDM 接口上扩展，不强制新建 Petersen 专用服务。

## 14.1 `GET /udm-models`

### 目标
支持模板库按教学维度筛选。

### 新增 query 参数建议

| 参数 | 类型 | 说明 |
|---|---|---|
| track | string | `petersen` |
| chapter | string | `chapter-1` 等 |
| difficulty | string | beginner / intermediate / full |
| template_type | string | guide / exercise / answer / case |
| include_learning | boolean | 是否返回 `meta.learning` |
| ownership | string | system / mine / all |

### 响应新增字段

```json
{
  "items": [
    {
      "id": "udm_tpl_001",
      "name": "Chapter 2 - Basic Growth Exercise",
      "is_template": true,
      "meta": {
        "learning": {
          "track": "petersen",
          "chapter": "chapter-2",
          "difficulty": "beginner",
          "templateType": "exercise",
          "estimatedMinutes": 25,
          "prerequisites": ["chapter-1"]
        }
      }
    }
  ]
}
```

### 兼容策略
- 未传 `include_learning` 时可不返回大段教学字段；
- 非教学模板的 `meta.learning` 可以为空；
- 原有 UDM 列表使用方不受影响。

---

## 14.2 `GET /udm-models/{id}`

### 目标
编辑器打开模型时，一次性拿到教学配置。

### 响应新增字段
- `meta.learning`
- `components[].conversion_factors`
- `components[].teaching_note`
- `processes[].teaching`
- `parameters[].teaching`
- `recommendedCharts`

### 说明
若当前仓库尚未提供 detail 接口，可在现有读取模型接口中按同样结构补齐。

---

## 14.3 `POST /udm-models`

### 目标
允许创建带教学元数据的系统模板或个人练习模型。

### 请求体新增字段

```json
{
  "name": "Chapter 3 - Continuity Exercise",
  "definition": { ... },
  "meta": {
    "learning": {
      "track": "petersen",
      "chapter": "chapter-3",
      "difficulty": "beginner",
      "templateType": "exercise"
    }
  }
}
```

### 说明
- 系统模板通常由 seed 或后台生成；
- 个人克隆模型时可保留 chapter，但将 `templateType` 切为 `personal-copy` 或在 ownership 层区分。

---

## 14.4 `PATCH /udm-models/{id}`

### 目标
支持更新学习元数据、步骤进度、默认场景等。

### 请求体建议支持

```json
{
  "meta": {
    "learning": {
      "stepProgress": 3,
      "lastOpenedAt": "2026-03-06T14:00:00Z",
      "defaultScenario": "cstr_basic"
    }
  }
}
```

### 兼容建议
- 仅对传入字段做 merge patch；
- 系统模板的核心定义可限制不可直接修改；
- 个人模型可全量编辑。

---

## 14.5 `POST /udm-models/validate`

### 目标
在原有校验结果上增加教学相关结果。

### 请求体新增字段建议

```json
{
  "definition": { ... },
  "validation_mode": {
    "continuity": "teaching",
    "profiles": ["COD", "N"]
  },
  "context": {
    "track": "petersen",
    "chapter": "chapter-3"
  }
}
```

### 响应新增字段建议

```json
{
  "valid": false,
  "issues": [
    {
      "code": "UNDEFINED_PARAMETER",
      "severity": "error",
      "message": "Y_H 未定义",
      "location": {
        "section": "parameters",
        "parameterName": "Y_H"
      }
    }
  ],
  "continuity_checks": [
    {
      "processName": "Aerobic growth",
      "dimension": "COD",
      "balanceValue": 0.0,
      "status": "pass",
      "explanation": "该过程在 COD 维度守恒"
    },
    {
      "processName": "Decay",
      "dimension": "COD",
      "balanceValue": -0.2,
      "status": "warn",
      "explanation": "当前教学简化模型省略了 XS/XP 列，因此出现表观不守恒",
      "suggestion": "若要严格守恒，请补充 decay products 相关组分"
    }
  ]
}
```

### 兼容策略
- `continuity_checks` 为新增字段，不影响旧前端；
- 未传 `validation_mode` 时沿用旧逻辑；
- teaching 模式默认允许简化教学 warning。

---

## 14.6 `POST /udm-flowcharts`

### 目标
根据模板的 `defaultScenario` 和默认参数，生成最小可运行流程图。

### 请求体新增字段建议

```json
{
  "model_id": "udm_tpl_001",
  "scenario": "cstr_basic",
  "source": "learning-template",
  "include_default_runtime": true
}
```

### 响应新增字段建议

```json
{
  "flowchart_id": "flow_001",
  "default_runtime": {
    "duration": 10,
    "time_unit": "day"
  },
  "recommended_outputs": ["S", "X", "OUR"],
  "teaching_message": "已为你生成基础 CSTR 场景，可直接运行"
}
```

---

## 14.7 `POST /udm/calculate` 或现有仿真接口

### 目标
返回结果页所需的教学辅助信息。

### 响应新增字段建议

```json
{
  "series": { ... },
  "summary": { ... },
  "recommended_charts": [
    { "key": "S", "label": "Substrate" },
    { "key": "X", "label": "Biomass" },
    { "key": "OUR", "label": "Oxygen Uptake Rate" }
  ],
  "teaching_insights": [
    {
      "title": "为什么 S 会下降？",
      "body": "因为该模板中基质被好氧生长过程持续消耗"
    },
    {
      "title": "为什么 Y 降低后 OUR 会增加？",
      "body": "同样基质消耗下，更多比例转为氧消耗而非菌体增长"
    }
  ]
}
```

### 兼容策略
- `series/summary` 保持现有结构；
- 前端若未识别 `recommended_charts` / `teaching_insights` 则忽略。

---

## 15. 新增接口建议（V1/V2 可选）

> 这一组接口不建议在 MVP 第一周就上，但如果后续需要课程运营、学习进度和内容配置管理，可以逐步增加。

## 15.1 `GET /petersen/chapters`

### 作用
获取章节目录、前置关系、推荐路径、开放状态。

### 响应示例

```json
{
  "items": [
    {
      "id": "chapter-1",
      "title": "记账本直觉",
      "difficulty": "beginner",
      "estimatedMinutes": 20,
      "prerequisites": [],
      "templateIds": ["udm_tpl_101", "udm_tpl_102"]
    }
  ]
}
```

---

## 15.2 `GET /petersen/chapters/{id}`

### 作用
获取单章详细说明、常见错误、推荐模板、教程锚点。

---

## 15.3 `GET /petersen/templates`

### 作用
以课程视角返回模板列表，适合学习入口页使用。

### 与 `GET /udm-models` 的关系
- 若团队想保持接口简洁，可不做；
- 若未来课程内容增多，可将“课程模板查询”从通用 UDM 模型列表中拆出。

---

## 15.4 `GET /petersen/hints/{id}`

### 作用
按需加载提示文案、例题说明、常见错误，避免首次加载过重。

---

## 15.5 `POST /petersen/progress`

### 作用
记录章节完成情况、最近 step、最近仿真结果等学习进度。

### 请求体示例

```json
{
  "chapter": "chapter-2",
  "templateId": "udm_tpl_201",
  "stepProgress": 4,
  "validatePassed": true,
  "simulationRunAt": "2026-03-06T14:30:00Z"
}
```

---

## 16. 错误码与返回规范建议

## 16.1 Validate 场景推荐错误级别

| 级别 | 用途 | 页面表现 |
|---|---|---|
| error | 必须修改，否则不能保存或不能生成流程图 | 红色，阻断 |
| warn | 建议修正，教学简化或潜在不一致 | 橙色，不阻断 |
| info | 说明性提示或建议阅读内容 | 蓝色，不阻断 |

## 16.2 推荐 location 结构

```json
{
  "location": {
    "section": "stoich",
    "processName": "Aerobic growth",
    "componentName": "S_O",
    "cellKey": "Aerobic growth:S_O"
  }
}
```

### 用途
- 前端直接实现“跳到过程/组分/单元格”；
- 避免只返回纯文本错误造成不可定位。

---

## 17. 兼容性与实施注意事项

### 17.1 向后兼容
- 所有新增字段都应尽量做成可选；
- 对非教学模型，`meta.learning` 可以为空；
- 对旧版前端，新增字段默认可忽略；
- 对旧版模型，未配置 `conversion_factors` 时不强制 continuity。

### 17.2 数据迁移建议
- 旧模板无需一次性迁移；
- 仅 Petersen 相关模板先补元数据；
- 可通过 seed 或后台脚本批量注入 `meta.learning`。

### 17.3 性能建议
- 模板列表页只返回必要摘要字段；
- hints/章节长文本可按需拉取；
- validate 中 continuity 检查应与基础语法校验并行或分层执行。

### 17.4 安全与权限建议
- 系统模板：只读，可克隆；
- 个人模型：可读写；
- 答案模板如需控制，可仅对内部讲师或管理员开放。

---

## 18. 最终落地建议

### 18.1 最推荐的 MVP 实现顺序
1. 先做 `meta.learning` + 4 个 seed templates；
2. 再做 `UDM Models` 的筛选和模板动作；
3. 然后做 `UDMModelEditorForm` 的教学模式 Step 1–4；
4. 再把 `validate` 接上 continuity_checks；
5. 最后优化 `saveAndGenerateFlowchart` 与结果页教学卡片。

### 18.2 最适合先做的四个模板
- `chapter-1_arrow_matrix_exercise`
- `chapter-2_basic_growth_exercise`
- `chapter-3_continuity_check_exercise`
- `chapter-7_basic_cstr_case`

### 18.3 为什么这样排期
- 这条路径能最快让用户感知“教程不是静态文档，而是能直接变成模型”；
- 可以最小成本验证学习闭环是否成立；
- 一旦闭环跑通，再扩展第 4、5、6、8 章的成本更低。

---

## 附录 A：建议直接建到 Jira 的 Epic / Task 名称

### Epic
- EPIC-01 Petersen Learning Entry & Templates
- EPIC-02 Learning Mode UDM Editor
- EPIC-03 Petersen Continuity Validation
- EPIC-04 Simulation Teaching Experience
- EPIC-05 Content & Quality Setup

### 任务命名示例
- FE: Add Petersen filters and badges to UDM Models
- FE: Add learning stepper to UDMModelEditorForm
- FE: Add continuity panel and row jump interaction
- BE: Extend UDM model meta with learning fields
- BE: Implement Petersen continuity check service
- BE: Extend validate response with continuity checks
- CONTENT: Prepare chapter-1/2/3/7 seed templates and hints
- QA: E2E test from template open to simulation result

---

## 附录 B：MVP 评审会建议顺序
1. 先看学习入口页与模板库原型；
2. 再看编辑器 Step 1–5 切换逻辑；
3. 再看 continuity 响应结构；
4. 最后看一键生成流程图与结果解释卡；
5. 会后按 Epic 直接拆工单。
