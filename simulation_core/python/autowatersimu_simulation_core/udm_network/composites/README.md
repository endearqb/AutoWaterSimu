# 目录说明：udm_network/composites

> 类型：contract
> Canonical sources：
> - `docs/rebuild/AutoWaterSimu_UDM_v2_Docs/02_技术规格说明.md`
> - `docs/rebuild/AutoWaterSimu_UDM_v2_Docs/03_开发路线与实施计划.md`
> - `simulation_core/python/autowatersimu_simulation_core/udm_network/README.md`

## 1. 目录职责

本目录负责：

- UDM Network v2 composite-to-primitive graph expansion helpers。
- SecondaryClarifier10Layer reference profile graph generation。
- BSM1 reference oracle provenance manifest for future P8 conformance。

本目录不负责：

- ODE/RHS execution。
- Worker job lifecycle。
- BSM1 full plant benchmark conformance。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `secondary_clarifier_10_layer.py` | SecondaryClarifier10Layer reference profile primitive graph generator |
| `bsm1_reference_oracle_manifest.v1.json` | Provenance-only manifest for future BSM1 oracle/conformance evidence |

## 3. 维护约定

1. Composite generators must output primitive `network_process_graph.v1` payloads accepted by `compile_network()`。
2. Reference clarifier profile uses 10 layers and 8 states/layer: `S_I`, `S_S`, `S_O`, `S_NO`, `S_NH`, `S_ND`, `S_ALK`, `X_TSS`。
3. Reference profile nodes must keep `reaction_enabled=false`。
4. SecondaryClarifier layer nodes must include `volume=area_m2*height_m/layers`; hydraulic `flow_spec` must declare `unit=m3/d`。
5. BSM1 manifest is provenance-only until official oracle outputs/checksums and P8 conformance tests exist。

## 4. 对外接口

本目录通过 `autowatersimu_simulation_core.udm_network.composites` 暴露 composite graph generation helpers。

## 5. 依赖边界

可以依赖：

- `autowatersimu_simulation_core.udm_network` 内部合同常量和 dataclasses。

不应该依赖：

- FastAPI / SQLModel / worker CLI。
- Frontend UI state。

## 6. 测试与验证

```powershell
backend\.venv\Scripts\python -m pytest simulation_core\tests\test_udm_network_secondary_clarifier.py -q
```

## 7. AI 操作提示

新增 composite profile 前先确认生成图能通过 `compile_network()`，并保持 state registry、flow balance 和 no-reaction tests green。
