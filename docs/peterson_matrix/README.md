# 目录说明：docs/peterson_matrix

## 1. 目录职责

本目录保存 Petersen/SUMO matrix conversion research assets。

本目录负责：

- SUMO Petersen matrix source workbooks and converted tutorial templates。
- Matrix conversion scripts and decomposition/alias configs。
- Design notes and generated equation markdown used for UDM tutorial work。

本目录不负责：

- Production backend runtime。
- Frontend UI source。
- Contract canonical examples。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `sumo_matrix_pipeline.py` | reusable SUMO matrix conversion pipeline |
| `sumo_matrix_to_platform_xlsx.py` | CLI wrapper for workbook export |
| `component_alias_registry.json` | component alias normalization config |
| `decomposition_profile.json` | default slice/profile config |
| `DESIGN.md` | design notes |
| `*.xlsx`、`*.csv`、`*.md` | source and derived matrix assets |

## 3. 维护约定

1. Large workbook assets are research/reference inputs; avoid rewriting them unless task explicitly requires it.
2. Pipeline behavior changes need targeted tests under `docs/peterson_matrix/tests` if present or equivalent validation command.
3. Generated downstream assets should be written to `tmp/` unless they are intentional source fixtures.

## 4. 对外接口

本目录为 UDM tutorial, Petersen import work and matrix conversion tasks 提供 reference assets and scripts。

## 5. 依赖边界

Scripts may depend on spreadsheet libraries; they should not import frontend or backend runtime by default。

## 6. 测试与验证

```powershell
python -m compileall docs\peterson_matrix\sumo_matrix_pipeline.py docs\peterson_matrix\sumo_matrix_to_platform_xlsx.py
```

## 7. AI 操作提示

Before changing source workbooks, confirm whether the change is data correction, regenerated output, or temporary experiment。
