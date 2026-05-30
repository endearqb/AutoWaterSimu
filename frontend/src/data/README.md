# 目录说明：frontend/src/data

## 1. 目录职责

本目录保存 frontend static content and tutorial data。

本目录负责：

- Tutorial lesson metadata、content、flow presets and insight definitions。
- Landing/update static content and MDX update articles。

本目录不负责：

- Runtime store state。
- Backend seed templates。
- i18n runtime provider。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `tutorialLessons.ts`、`tutorialContent.ts`、`tutorialOverview.ts` | tutorial metadata/content |
| `tutorialFlowPresets.ts` | tutorial flow preset data |
| `tutorialInsights.ts` | tutorial result interpretation data |
| `updates/` | MDX product updates |
| `stories*.ts` | landing/story content |

## 3. 维护约定

1. Tutorial data changes may require matching i18n keys and backend seed/template tests。
2. Keep static content deterministic; do not fetch runtime data here。
3. MDX update files should stay content-only and avoid app side effects。

## 4. 对外接口

本目录向 routes/components/utils 暴露 static content and tutorial data。

## 5. 依赖边界

Can depend on frontend types; should not import stores or generated clients。

## 6. 测试与验证

```powershell
cd frontend; npx tsc --noEmit
```

## 7. AI 操作提示

When adding tutorial content, update matching localization and tutorial UI references in the same change when needed。
