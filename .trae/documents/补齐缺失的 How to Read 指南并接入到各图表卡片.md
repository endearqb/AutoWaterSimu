## 现状与缺口
- 指南解析入口：`frontend/src/components/DataAnalysis/visualizations/guides/guideContent.tsx:28-40` 提供 MDX 预取与解析；卡片通过 `ChartCard` 的 `howToReadSource` 触发（`frontend/src/components/DataAnalysis/common/ChartCard.tsx:260-272` 预取，`frontend/src/components/DataAnalysis/common/ChartCard.tsx:281-299` 动态加载）。
- 已有指南（MDX）：`histogram`、`boxplot`、`categorical-bar`、`categorical-pie`、`categorical-treemap`、`correlation-heatmap`、`time-distribution`、`type-distribution`、`numeric-overview`、`missing-values`、`zscore-boxplot`。
- 缺少指南的卡片（均已核对未设置 `howToReadSource`）：
  - 布尔分布类：
    - `BooleanSemicirclePiePanel.tsx:91`（半圆饼图）
    - `BooleanStackedBarPanel.tsx:100`（堆叠条形）
  - 高基数详情：
    - `HighCardinalityPanel.tsx:46`
  - 时间分布（基线卡已接入 `time-distribution`，其它均缺）：
    - `time/HourlyDistributionCard.tsx:25`
    - `time/DailyDistributionCard.tsx:29`
    - `time/WeeklyDistributionCard.tsx`（同构，位置与 `ChartCard` 首次出现行相近）
    - `time/MonthlyDistributionCard.tsx`（同构）
    - `time/GitHubDailyHeatmapCard.tsx`（日历热图）
    - `time/DailyActivityHeatmapCard.tsx`
    - `time/WeeklyActivityHeatmapCard.tsx:94`
    - `time/MonthlyActivityHeatmapCard.tsx`
    - `time/TimeHistogramCard.tsx:25`（当前禁用显示，但建议补齐指南以保持一致）

## 拟新增的指南（MDX 文件）
- 统一命名：`frontend/src/components/DataAnalysis/visualizations/guides/<id>.en.mdx`
- 新增 id 与文件：
  - `boolean-semicircle-pie.en.mdx`（半圆饼图）
  - `boolean-stacked-bar.en.mdx`（布尔堆叠条形）
  - `high-cardinality.en.mdx`（高基数详情）
  - `time-hourly.en.mdx`（按小时分布条形）
  - `time-daily.en.mdx`（按日期分布条形）
  - `time-weekly.en.mdx`（按周分布条形）
  - `time-monthly.en.mdx`（按月分布条形）
  - `time-github-daily-heatmap.en.mdx`（GitHub 风格日历热图）
  - `time-daily-activity-heatmap.en.mdx`（日活动热图）
  - `time-weekly-activity-heatmap.en.mdx`（周活动热图）
  - `time-monthly-activity-heatmap.en.mdx`（月活动热图）
  - `time-histogram.en.mdx`（时间桶直方图）

## MDX 内容结构（与现有保持一致）
- 标题：`# How to Read: <Chart Name>`
- 小节：
  - `## What it shows`（图表呈现与坐标含义）
  - `## How to interpret`（读图要点与模式识别）
  - `## Common pitfalls`（常见误解与注意事项）
  - `## Tips`（使用建议与搭配分析）
- 例子（示例要点）：
  - 布尔类：解释两类比例、总计、堆叠的累计关系与标签可读性。
  - 时间类条形：解释桶的定义（小时/日期/周/月）、x/y 轴、网格线含义、抽样/截断影响。
  - 活动热图：解释颜色分级、分位阈值/最大值、空桶显示、年份分组与日历顺序。
  - 高基数：解释唯一比率、阈值标记、重复/空值比率、Top Values 列表的意义与风险。

## 接入改动（为每张卡设置 `howToReadSource`）
- 在各 `ChartCard` 上添加：`howToReadSource={{ type: 'mdx', id: '<id>' }}`。
- 具体位置：
  - `frontend/src/components/DataAnalysis/visualizations/panels/BooleanSemicirclePiePanel.tsx:91`
    - 添加：`howToReadSource={{ type: 'mdx', id: 'boolean-semicircle-pie' }}`
  - `frontend/src/components/DataAnalysis/visualizations/panels/BooleanStackedBarPanel.tsx:100`
    - 添加：`howToReadSource={{ type: 'mdx', id: 'boolean-stacked-bar' }}`
  - `frontend/src/components/DataAnalysis/visualizations/panels/HighCardinalityPanel.tsx:46`
    - 添加：`howToReadSource={{ type: 'mdx', id: 'high-cardinality' }}`
  - 时间分布：
    - `time/HourlyDistributionCard.tsx:25` → `time-hourly`
    - `time/DailyDistributionCard.tsx:29` → `time-daily`
    - `time/WeeklyDistributionCard.tsx`（`ChartCard` 定义处）→ `time-weekly`
    - `time/MonthlyDistributionCard.tsx`（`ChartCard` 定义处）→ `time-monthly`
    - `time/GitHubDailyHeatmapCard.tsx`（`ChartCard` 定义处）→ `time-github-daily-heatmap`
    - `time/DailyActivityHeatmapCard.tsx`（`ChartCard` 定义处）→ `time-daily-activity-heatmap`
    - `time/WeeklyActivityHeatmapCard.tsx:94` → `time-weekly-activity-heatmap`
    - `time/MonthlyActivityHeatmapCard.tsx`（`ChartCard` 定义处）→ `time-monthly-activity-heatmap`
    - `time/TimeHistogramCard.tsx:25` → `time-histogram`

## 预取优化
- 在 `frontend/src/components/DataAnalysis/visualizations/guides/guideContent.tsx:28-40` 的 `PRELOAD_GUIDE_IDS` 末尾追加上述新 id，以便首页预取提升首次打开速度。

## 验证步骤
- 运行类型检查：`cd frontend; npx tsc --noEmit`
- 启动前端：`cd frontend; npm install; npm run dev`
- 打开每张卡片，点击书本图标确认弹窗显示正确的 MDX 内容；检查颜色选择器、导出功能正常。

## 交付清单
- 新增 12 个 `.en.mdx` 指南文件，内容按统一结构撰写。
- 为 12 张卡片补充 `howToReadSource` 绑定。
- 更新 `PRELOAD_GUIDE_IDS`。

如确认方案，我将按以上映射添加 MDX 文件并接入到对应卡片。