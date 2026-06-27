# AutoWaterSimu Next

AutoWaterSimu Next is a contract-first water and wastewater process simulation platform.

Current mainline:

- `main`: AutoWaterSimu Next canonical trunk
- `legacy/fastapi-frozen`: frozen FastAPI + React legacy oracle
- `codex/udm-network-v2`: first short branch for UDM Network v2 work

Core surfaces:

- `contracts/`: shared JSON Schema integration contracts
- `simulation_core/`: Python simulation runtime core
- `services/simulation-worker/`: Python worker sidecar/runtime
- `apps/api/`: Go Compute API
- `apps/desktop/`: Tauri/Rust + React desktop shell
- `frontend/`: React UI shared by legacy and standalone/Next runtime modes
- `backend/`: legacy FastAPI oracle and migration reference

Start here:

- [Root README](../README.md)
- [中文 README](../README_zh.md)
- [Architecture docs](../docs/architecture/README.md)
- [Mainline decision](../.ai/decisions/0019-mainline-cutover-to-autowatersimu-next.md)

Near-term roadmap:

- Freeze UDM-v2 ADRs and network contracts for `simulation.udm_network.v1`.
- Add typed edges: `hydraulic`, `pump`, `settling`, and `signal`.
- Build strict flow balance plus UDM Network compiler/solver.
- Pass v1 five-model parity before switching standalone defaults.
- Add `SecondaryClarifier10Layer`, Takacs settling, and BSM1 reference evidence.
- Retire v1/FastAPI compute paths only after parity, migration, BSM1, and release gates pass.

GitHub automation in this directory only orchestrates repository scripts and evidence gates. Keep long CI logic in `scripts/`, not inline workflow YAML.
