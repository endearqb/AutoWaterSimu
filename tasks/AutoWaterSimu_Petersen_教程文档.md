# AutoWaterSimu Petersen 教程文档

## 1. 使用前准备

开始学习前，建议先明确以下前提：

- 当前教程入口是 `/petersen-tutorial`
- 当前已落地章节为 `chapter-1`、`chapter-2`、`chapter-3`、`chapter-7`
- 教程模型会通过 `lessonKey` 进入 `/udmModelEditor`
- Chapter 7 完整仿真链路会进入 `/udm`

如果你是第一次进入教程，建议严格按照以下顺序进行：

`chapter-1` → `chapter-2` → `chapter-3` → `chapter-7`

---

## 2. 如何进入 Petersen 教程页并恢复学习进度

### 学习目标

- 找到当前真实教程入口
- 理解章节卡片、先修锁定和继续学习机制
- 知道如何恢复已创建的教程模型

### 对应页面与入口

- 首页：`/petersen-tutorial`

### 具体操作步骤

1. 从侧边栏进入 `Petersen Tutorial`。
2. 在教程首页先阅读总览区，了解当前入口、页面职责和学习闭环。
3. 查看章节卡片列表。
4. 如果某章节未解锁，先完成它的前置章节。
5. 如果已有进行中的章节，直接点击“继续学习”。
6. 如果是第一次进入某章，点击“开始学习”。

### 页面上会看到什么

- 顶部会显示教程总览说明
- 中部会显示当前真实路由入口和学习闭环说明
- 下方会显示章节卡片
- 卡片上会显示：
  - 章节标题
  - 难度
  - 类型
  - 时长
  - 章节摘要
  - 先修锁定提示
  - 当前步骤进度

### 预期结果

- 成功进入对应章节的 `/udmModelEditor?lessonKey=...`
- 如果此前已创建过教程模型，会恢复到原模型而不是重复创建

### 常见错误与修正

- 问题：点开章节后发现不是教程上下文
  - 修正：确认 URL 中是否带有 `lessonKey`
- 问题：章节按钮灰掉
  - 修正：先完成前置章节
- 问题：看不到“继续学习”
  - 修正：说明当前没有未完成的活动章节，直接从章节卡片进入即可

---

## 3. Chapter 1：箭头矩阵直觉与 Components/Processes 初识

### 学习目标

- 认识 Components 和 Processes 的基本角色
- 在不写公式的前提下读懂矩阵方向
- 建立“谁增加、谁减少”的第一层直觉

### 对应页面与入口

- `/udmModelEditor?lessonKey=chapter-1`

### 具体操作步骤

1. 进入 Chapter 1 后，保持在 guided mode。
2. 先看页面顶部的 stepper，确认当前重点是前两步。
3. 阅读悬浮 GuidePanel 中的章节摘要和目标。
4. 在 Step 1 中先看 Components 和 Processes 区域。
5. 不要急着修改公式，先理解每一列代表什么组分、每一行代表什么过程。
6. 观察箭头矩阵视图，判断每个过程中哪些组分被消耗、哪些被生成。

### 页面上会看到什么

- 顶部有 guided/expert 切换和 stepper
- 右上角可展开教程 GuidePanel
- Step 1 会显示箭头矩阵
- 公式区、参数区、校验区更多是预览，不是本章重点

### 预期结果

- 能够不用数字，仅凭方向判断一个过程的基本含义
- 能说清楚“组分是列、过程是行”

### 常见错误与修正

- 错误：一上来就想补完整公式
  - 修正：Chapter 1 的重点不是公式，而是方向直觉
- 错误：把过程理解成组分，把组分理解成过程
  - 修正：把过程当成“发生什么反应”，把组分当成“反应影响了什么物质”
- 错误：看箭头矩阵时只盯一个单元格
  - 修正：先看整行，理解整个过程在讲什么故事

---

## 4. Chapter 2：从 stoich 到 rate expression，再到参数抽取与 validate

### 学习目标

- 完整经历一次真实矩阵编辑链路
- 学会在 Step 2-4 中分别处理 stoich、rate expression 和 parameters
- 通过一次 validate

### 对应页面与入口

- `/udmModelEditor?lessonKey=chapter-2`

### 具体操作步骤

1. 进入 Chapter 2 后保持 guided mode。
2. 在 Step 1 先确认哪一行代表目标过程。
3. 切到 Step 2，开始查看和编辑 `stoich`。
4. 保持以下原则：
   - 被消耗写负
   - 被生成写正
   - `Y_H` 这类质量关系优先写进 stoich，而不是只藏在速率公式里
5. 切到 Step 3，开始查看和编辑 `rate expression`。
6. 如果不会完整输入公式，优先使用 recipe bar 插入 Monod 项或开关项。
7. 切到 Step 4，把 `mu_H`、`K_S`、`K_OH`、`Y_H` 等常量放进参数区。
8. 切到 Step 5，执行 validate。
9. 如果报错，直接点击校验结果跳转到对应区域修正。

### 页面上会看到什么

- Step 2 后 `stoich` 区域正式可见
- Step 3 会开放 `rate expression` 区和 recipe bar
- Step 4 会显示参数表
- Step 5 会显示 validation 区

### 预期结果

- 模型可以被正确校验
- 参数可以从表达式中抽出，不再全部写死在公式里

### 常见错误与修正

- 错误：`stoich` 符号方向写反
  - 修正：先按“消耗为负、生成为正”重查
- 错误：`Y_H` 只出现在速率公式里
  - 修正：检查是否遗漏了质量关系对应的 `stoich`
- 错误：参数未定义
  - 修正：在 Step 4 将表达式中使用的常量补到参数区
- 错误：遇到校验问题时在大表里手动寻找
  - 修正：优先使用 validation 跳转

---

## 5. Chapter 3：连续性检查、COD/N 对账、错误跳转与修正思路

### 学习目标

- 理解 continuity panel 在教程中的用途
- 学会围绕 `COD` 和 `N` 两个维度做对账
- 从 continuity warning 跳回对应过程进行修正

### 对应页面与入口

- `/udmModelEditor?lessonKey=chapter-3`

### 具体操作步骤

1. 进入 Chapter 3，先在 Step 1-4 中确认过程含义、stoich、公式和参数。
2. 到 Step 5 后执行 validate。
3. 观察 continuity panel。
4. 本章优先关注两个维度：
   - `COD`
   - `N`
5. 查看每个过程对应的 `balance value`。
6. 如果某过程存在 warning 或 error，点击过程名跳回矩阵对应行。
7. 结合过程含义检查：
   - 氨氮与硝酸盐的符号是否写反
   - 缺氧过程是否仍被氧项激活
   - 某个守恒维度是否缺少必要组分

### 页面上会看到什么

- continuity panel 会按维度分组显示结果
- 每条结果会显示：
  - 过程名
  - 维度
  - 状态
  - `balance value`
  - explanation / suggestion
- 点击过程名后，编辑器会跳回对应行

### 预期结果

- 能够读懂 `COD/N` 的 continuity 结果
- 能够根据 panel 结果把错误定位到具体过程

### 常见错误与修正

- 错误：只看“通过/失败”，不看具体维度
  - 修正：优先看当前课程启用的 `COD` 与 `N`
- 错误：`balance value` 不接近 0 但不知道怎么看
  - 修正：从 explanation 和 suggestion 入手，再回到过程定义检查符号方向
- 错误：看到 continuity warning 就以为是仿真器错误
  - 修正：先把它视为矩阵守恒关系未配平的教学反馈

---

## 6. Chapter 7：保存模型、一键生成流程图、运行仿真、查看推荐曲线和解释卡

### 学习目标

- 把教程模型真正转成可运行流程图
- 理解默认 flow preset 的作用
- 在 `/udm` 中查看推荐曲线、解释卡和排错提示

### 对应页面与入口

- 编辑：`/udmModelEditor?lessonKey=chapter-7`
- 仿真：`/udm?lessonKey=chapter-7&flowchartId=...`

### 具体操作步骤

1. 在 Chapter 7 中先完成一次 validate。
2. 点击 `Save & Generate Flowchart`。
3. 系统会创建默认流程图，并跳转到 `/udm`。
4. 默认生成的流程图结构是：
   - `Input`
   - `UDM Reactor`
   - `Output`
5. 进入 `/udm` 后，先打开 Simulation 面板。
6. 直接运行仿真，不需要手工重新配置教程 preset。
7. 仿真完成后，切换到教程结果 tab。
8. 查看以下内容：
   - 推荐变量曲线
   - 结果解释卡
   - 爆炸曲线排错清单（如触发）

### 页面上会看到什么

- Chapter 7 的 flow preset 会自动覆盖默认进水、反应器体积和 solver 参数
- `/udm` 页会带着 `lessonKey`
- 教程结果 tab 中会显示：
  - `RecommendedChartsPanel`
  - `ResultInterpretationCard`
  - `ExplosionDebugChecklist`

### 预期结果

- 成功从矩阵编辑器跳到仿真页
- 能看到至少一组教程推荐曲线
- 能将曲线变化与前面学过的过程联系起来

### 常见错误与修正

- 错误：没有先 validate 就直接生成流程图
  - 修正：先保证模型校验通过，避免把名称或表达式错误带进仿真
- 错误：仿真结果异常但只回头盯着矩阵看
  - 修正：先检查 continuity、preset 参数和爆炸曲线排错清单
- 错误：刷新 `/udm` 后丢失上下文
  - 修正：确保 URL 中保留 `flowchartId` 与 `lessonKey`

---

## 7. 常见问题与排错

### 7.1 参数未定义

现象：

- validate 报未定义参数

修正：

- 回到 Step 4，把表达式里实际使用到的常量补到参数区

### 7.2 符号写反

现象：

- `stoich` 含义与过程描述对不上
- continuity 结果异常

修正：

- 重新按“消耗为负、生成为正”检查整行，而不是只看单个单元格

### 7.3 连续性 warning

现象：

- continuity panel 出现 warning

修正：

- 先看维度
- 再看过程
- 再看 `balance value`
- 最后根据 suggestion 跳回对应过程修正

### 7.4 爆炸曲线

现象：

- 结果曲线出现 `NaN`、`Infinity`、极端值或剧烈跳变

修正：

- 打开教程结果 tab 中的 `ExplosionDebugChecklist`
- 优先检查：
  - 初值是否合理
  - `stoich` 是否写反
  - 速率公式是否过激
  - 体积/流量设置是否异常
  - 时间步长是否过大

---

## 8. 本教程与参考文档的关系

本教程文档基于以下事实来源整理：

- 当前仓库中的真实教程页与教程组件
- 当前已落地的 4 个 lesson
- 当前编辑器与仿真页面的实际行为

参考文档如：

- `tasks/AutoWaterSimu_Flow_UDM_Tutorial.md`
- `tasks/udm_petersen_tutorial_dev_plan_v2.md`

主要用于补充叙事与规划背景，但当前使用说明应始终以现有实现为准。

---

## 9. 结语

如果你完成了 Chapter 1、2、3、7 这四章，说明你已经经历了当前 Petersen 教程的完整最小闭环：

- 看懂矩阵
- 编辑矩阵
- 校验矩阵
- 生成流程图
- 运行仿真
- 解释结果

这就是当前项目中 Petersen 教程真正已经可以交付给用户的核心能力。
