## 目标
- 将 ASM1/ASM3/ASMslim 三个节点的左侧装饰条长度与标准节点一致，避免略短的视觉差异。

## 标准对齐
- 标准（参考 `DefaultNode/InputNode/OutputNode`）：
  - `left: '6px'`、`top: '8px'`、`bottom: '8px'`、`width: '3px'`、`borderRadius: 'full'`

## 修改范围
- 文件：
  - `frontend/src/components/Flow/nodes/ASM1Node.tsx`
  - `frontend/src/components/Flow/nodes/ASM3Node.tsx`
  - `frontend/src/components/Flow/nodes/ASMslimNode.tsx`
- 将三者的装饰条 `Box` 的 `top/bottom` 从 `10px` 改为 `8px`，保留其他属性不变

## 验证
- TypeScript 检查：`cd frontend; npx tsc --noEmit`
- 预览核对：打开 ASM1/ASM3/ASM1Slim 页面，比较左侧装饰条与默认节点、输入/输出节点是否一致长度。

## 回滚
- 如需回滚，只需将上述三文件的 `top/bottom` 恢复为原来的 `10px` 即可。