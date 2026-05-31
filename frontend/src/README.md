# 目录说明：frontend/src

## 1. 目录职责

本目录是 legacy React + TypeScript 前端源码入口。

本目录负责：

- React app entrypoint、TanStack Router、TanStack Query、Chakra UI provider 和 i18n provider。
- legacy flow editor、UDM 教程、模型配置、routes、stores、services、utils 和 generated clients 使用。
- 前端侧 AutoWaterSimu Next contract prototype 和 compute client 集成边界。

本目录不负责：

- Go Compute API server。
- backend Python runtime。
- Desktop Tauri runtime。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `main.tsx` | React app bootstrap |
| `routeTree.gen.ts` | TanStack Router generated route tree |
| `components/` | UI components and domain panels |
| `routes/` | route files |
| `stores/` | Zustand stores |
| `services/` | hand-written API/domain service wrappers |
| `client/` | generated API clients |
| `contracts/` | frontend contract transform prototype |
| `i18n/` | localization provider and messages |

## 3. 维护约定

1. React Flow / XYFlow import 必须符合项目固定格式。
2. Chakra UI v3 改动前先读本地 `llms-*.txt` 文档。
3. generated client 不手改，按 `frontend/README.md` 的命令重新生成。
4. `frontend/src/client/compute` 只允许 service/API wrapper 层直接使用；routes/components 不直接 import generated Compute client。
5. 前端改动完成后运行 `cd frontend; npx tsc --noEmit`。

## 4. 对外接口

本目录对 Vite build、Playwright tests 和 legacy web UI 暴露 React app。

## 5. 依赖边界

可以依赖：

- React、TanStack Router/Query、Chakra UI v3、XYFlow。
- `frontend/src/client` generated clients。

不应该依赖：

- backend internal Python modules。
- Tauri runtime APIs；Desktop UI 在 `apps/desktop`。

## 6. 测试与验证

```powershell
cd frontend; npx tsc --noEmit
cd frontend; npx vite build
```

## 7. AI 操作提示

1. 先读根协议、`frontend/README.md` 和本 README。
2. 改 Flow/UDM/tutorial 前继续读更近目录 README。
3. 不要把 Next prototype 直接接入 legacy store，除非任务明确要求并补验证。
