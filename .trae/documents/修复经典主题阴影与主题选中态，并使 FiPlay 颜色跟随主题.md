## 根因与目标
- 经典主题阴影：`applyClassicThemeForModel` 未清零 `--chakra-glass-classic-glass`，在 `glass.ts` 中先命中“透明玻璃”分支，导致阴影仍存在（`frontend/src/components/Flow/nodes/utils/glass.ts:118–139`）。
- 主题按钮无选中态：`SimulationActionPlate.tsx` 预设按钮始终传入 `getToggleButtonStyles(false)`，未依据当前模式标志计算选中态（`frontend/src/components/Flow/inspectorbar/SimulationActionPlate.tsx:1003–1023`）。
- FiPlay 颜色未跟随主题：在经典/透明玻璃模式下，调色板变化时 `applyPalette` 不再更新 outline/tint（`frontend/src/stores/themePaletteStore.ts:64–82`），而播放图标颜色取自 `accentOutlineColor`（`frontend/src/components/Flow/inspectorbar/SimulationActionPlate.tsx:221–223`），因此不会随 `--chakra-colors-classic-text` 的变更而更新。

## 变更方案
### 1) 修复经典主题阴影重叠
- 文件：`frontend/src/stores/themePaletteStore.ts`
- 位置与改动：
  - 在 `applyClassicThemeForModel(modelKey)` 中，`root.style.setProperty('--chakra-glass-classic','1')` 之后追加：`root.style.setProperty('--chakra-glass-classic-glass','0')`（参考 `frontend/src/stores/themePaletteStore.ts:129`）。
  - 保持既有逻辑：白底、细边框、禁用模糊、`tint` 透明、`outline` 用主色、文本色写入 `--chakra-colors-classic-text`（`frontend/src/stores/themePaletteStore.ts:130–139`）。
- 预期：切换“经典主题”时不再出现玻璃阴影；“透明玻璃”与“玻璃”模式保持原行为（`frontend/src/stores/themePaletteStore.ts:159–170`, `171–184`）。

### 2) 主题选择按钮选中态
- 文件：`frontend/src/components/Flow/inspectorbar/SimulationActionPlate.tsx`
- 读取模式标志：
  - `const isClassic = getComputedStyle(document.documentElement).getPropertyValue('--chakra-glass-classic').trim() === '1'`
  - `const isClassicGlass = getComputedStyle(document.documentElement).getPropertyValue('--chakra-glass-classic-glass').trim() === '1'`
- 计算三态：
  - `activeClassic = isClassic`
  - `activeClassicGlass = isClassicGlass`
  - `activeDefaultGlass = !isClassic && !isClassicGlass`
- 应用到按钮：将预设主题按钮的样式分别改为：
  - “经典主题”：`{...getToggleButtonStyles(activeClassic)}`（`frontend/src/components/Flow/inspectorbar/SimulationActionPlate.tsx:1003–1012`）
  - “透明玻璃”：`{...getToggleButtonStyles(activeClassicGlass)}`（`1013–1022`）
  - “玻璃”：`{...getToggleButtonStyles(activeDefaultGlass)}`（`1023`）
  - “关闭”按钮保持不变。

### 3) FiPlay 图标颜色跟随主题（新增）
- 文件：`frontend/src/components/Flow/inspectorbar/SimulationActionPlate.tsx`
- 改动要点：
  - 读取 `--chakra-colors-classic-text`：`const classicText = getComputedStyle(document.documentElement).getPropertyValue('--chakra-colors-classic-text').trim()`。
  - 调整播放图标颜色：
    - `const playIconColor = isStartDisabled ? 'rgba(255,255,255,0.65)' : (isClassic || isClassicGlass) ? (classicText || accentOutlineColor) : accentOutlineColor`（替换原 `playIconColor` 赋值，参考 `frontend/src/components/Flow/inspectorbar/SimulationActionPlate.tsx:221–223`）。
  - 保持按钮边框与渐变仍基于 `accentColor`/`accentOutlineColor`，不影响默认玻璃模式下的视觉一致性（`219–221`）。
- 预期：
  - 在“经典主题”和“透明玻璃”下，FiPlay 随 `--chakra-colors-classic-text` 变化而变色；在默认玻璃模式下仍使用 `accentOutlineColor`。

### 4) 连接线标签字体（仅位置说明）
- 文件：`frontend/src/components/Flow/edges/EditableEdge.tsx`
- 修改位置：
  - 标签显示字体：`EdgeLabelRenderer` 的 `Box` → `fontSize="6px"`（`frontend/src/components/Flow/edges/EditableEdge.tsx:72`）。
  - 编辑输入框字体：`Input` → `fontSize="12px"`（`94`）。
- 如需统一字体大小，可将上述两处改为同一值（例如 `10px` 或 `sm`）。

## 验证
- 类型检查：`cd frontend; npx tsc --noEmit`。
- 交互与视觉：
  - 切换“经典主题”：节点白底细边框无阴影；FiPlay 颜色与 `--chakra-colors-classic-text` 同步；按钮选中态为“经典主题”。
  - 切换“透明玻璃”：白玻璃透明、有玻璃阴影；FiPlay 颜色与 `--chakra-colors-classic-text` 同步；按钮选中态为“透明玻璃”。
  - 点击“玻璃”：回到默认彩色玻璃；FiPlay 使用 `accentOutlineColor`；按钮选中态为“玻璃”。

## 回滚
- 去除 `applyClassicThemeForModel` 中对 `--chakra-glass-classic-glass` 的清零。
- 恢复预设主题按钮固定样式（移除选中态逻辑）。
- 播放图标颜色回退为始终使用 `accentOutlineColor`。

## 代码引用
- `frontend/src/stores/themePaletteStore.ts:129–139`, `159–170`, `171–184`
- `frontend/src/components/Flow/inspectorbar/SimulationActionPlate.tsx:139–176`, `219–223`, `748–777`, `782`, `1003–1025`
- `frontend/src/components/Flow/nodes/utils/glass.ts:118–139`, `140–159`, `261–266`
- `frontend/src/components/Flow/edges/EditableEdge.tsx:72`, `94`