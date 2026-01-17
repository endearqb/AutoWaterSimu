# 页面迁移计划：从 Next.js 项目到 Vite 项目

本文档用于跟踪将旧 Next.js 项目的页面功能迁移到新的 Vite + TanStack Router 项目的进度。

## 总体原则

- **UI 组件**: 统一使用新项目的 UI 组件库，不再使用旧项目中的 `ui` 文件。
- **国际化 (i18n)**: 迁移过程中移除所有国际化相关功能。
- **数据请求**: 使用新项目提供的 OpenAPI `sdk` 替代旧项目中的 `axios` 请求。

## 迁移清单

### 阶段一：准备工作

- [ ] 分析旧项目 (`page.overview.tsx`, `layout.tsx`) 的结构和依赖。
- [ ] 安装 `recharts` 依赖: `npm install recharts @types/recharts`
- [ ] 创建此 `migration-plan.md` 文件。

### 阶段二：迁移 "Overview" 页面

- [ ] 在 `src/routes/_layout/` 目录下创建 `overview.tsx` 文件。
- [ ] 将 `page.overview.tsx` 的核心 JSX (主要是 `recharts` 图表) 迁移到 `overview.tsx`。
- [ ] 迁移数据获取逻辑：
    - [ ] 将 `useQuery` hooks 迁移过来。
    - [ ] 将 `axios.get('/water-plants/1')` 替换为 `sdk.waterPlants.getWaterPlant()`。
    - [ ] 将 `axios.get('/production/data/1')` 替换为 `sdk.production.getProductionData()`。
    - [ ] 将 `axios.get('/simulation/results/1')` 替换为 `sdk.simulation.getSimulationResults()`。
    - [ ] 将 `fetch('/chlorine/states/1')` 替换为 `sdk.chlorine.getChlorineStates()`。
- [ ] 移除所有 `next-intl` ( `useTranslations`, `t()` ) 相关代码。
- [ ] 移除 `isMobile` 状态和相关的 `useEffect`。
- [ ] 调整数据处理逻辑以匹配 `sdk` 返回的数据结构。
- [ ] 确保图表在新布局中正确渲染。

### 阶段三：迁移 "Chlorine Chart" 页面

- [ ] 分析旧项目的 `page.chlorine-chart.tsx`。
- [ ] 在 `src/routes/_layout/` 目录下创建 `chlorine-chart.tsx`。
- [ ] 重复阶段二的步骤，迁移组件和数据逻辑。

### 阶段四：迁移其他页面

- [ ] **Water Production**: 遵循相同流程进行迁移。
- [ ] **Water Quality**: 遵循相同流程进行迁移。
- [ ] **ASM Simulation**: 遵循相同流程进行迁移。
- [ ] **PHREEQC**: 遵循相同流程进行迁移。

### 阶段五：更新导航

- [ ] 分析旧项目的 `d:/Desktop/My Project/frontend/src/config/navigation.ts`。
- [ ] 分析新项目的 `d:/MyProject/my-full-stack/frontend/src/components/Common/SidebarItems.tsx`。
- [ ] 在 `SidebarItems.tsx` 中为所有新迁移的页面添加入口。

### 阶段六：收尾

- [ ] 全面审查所有迁移的代码，确保没有遗留的旧项目依赖。
- [ ] 删除迁移过程中产生的不再需要的临时文件或代码。
- [ ] 对所有新页面进行功能测试，确保其正常工作。