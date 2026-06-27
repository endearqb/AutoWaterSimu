from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class V1V2ParityCase:
    model_family: str
    v1_job_type: str
    v1_fixture: str
    v1_golden_case_id: str
    v2_target: str
    v2_required_evidence: str
    v2_parity_status: str
    blocking_reason: str

    @property
    def ready_for_cutover(self) -> bool:
        return self.v2_parity_status == "passed"


@dataclass(frozen=True)
class V1MigrationGate:
    gate_id: str
    cases: tuple[V1V2ParityCase, ...]

    @property
    def ready_for_v2_cutover(self) -> bool:
        return all(case.ready_for_cutover for case in self.cases)

    @property
    def blocking_reasons(self) -> tuple[str, ...]:
        return tuple(
            f"{case.model_family}: {case.blocking_reason}"
            for case in self.cases
            if not case.ready_for_cutover
        )

    def as_dict(self) -> dict[str, object]:
        return {
            "gate_id": self.gate_id,
            "ready_for_v2_cutover": self.ready_for_v2_cutover,
            "blocking_reasons": list(self.blocking_reasons),
            "cases": [
                {
                    "model_family": case.model_family,
                    "v1_job_type": case.v1_job_type,
                    "v1_fixture": case.v1_fixture,
                    "v1_golden_case_id": case.v1_golden_case_id,
                    "v2_target": case.v2_target,
                    "v2_required_evidence": case.v2_required_evidence,
                    "v2_parity_status": case.v2_parity_status,
                    "ready_for_cutover": case.ready_for_cutover,
                    "blocking_reason": case.blocking_reason,
                }
                for case in self.cases
            ],
        }


def build_v1_migration_gate() -> V1MigrationGate:
    return V1MigrationGate(
        gate_id="udm_network_v2_five_model_parity.v1",
        cases=(
            V1V2ParityCase(
                model_family="material_balance",
                v1_job_type="simulation.material_balance.v1",
                v1_fixture="contracts/examples/valid/material_balance_minimal.simulation_input.v1.json",
                v1_golden_case_id="material_balance_minimal",
                v2_target="passive_udm_network",
                v2_required_evidence="v1 material_balance vs v2 passive UDM L2 parity",
                v2_parity_status="pending",
                blocking_reason="v2 passive UDM RHS assembly is not wired yet",
            ),
            V1V2ParityCase(
                model_family="udm",
                v1_job_type="simulation.udm.v1",
                v1_fixture="contracts/examples/valid/udm_independent.simulation_input.v1.json",
                v1_golden_case_id="udm_independent",
                v2_target="udm_reaction_network",
                v2_required_evidence="v1 UDM vs v2 UDM reaction L2 parity",
                v2_parity_status="partial",
                blocking_reason="only single-node reaction parity smoke exists; full v1 UDM job parity is not wired",
            ),
            V1V2ParityCase(
                model_family="asm1slim",
                v1_job_type="simulation.asm1slim.v1",
                v1_fixture="contracts/examples/valid/asm1slim_independent.simulation_input.v1.json",
                v1_golden_case_id="asm1slim_independent",
                v2_target="asm1slim_seed_catalog",
                v2_required_evidence="v1 ASM1Slim vs v2 seed catalog L2 parity",
                v2_parity_status="pending",
                blocking_reason="ASM1Slim seed catalog RHS parity is not wired",
            ),
            V1V2ParityCase(
                model_family="asm1",
                v1_job_type="simulation.asm1.v1",
                v1_fixture="contracts/examples/valid/asm1_independent.simulation_input.v1.json",
                v1_golden_case_id="asm1_independent",
                v2_target="asm1_seed_catalog",
                v2_required_evidence="v1 ASM1 vs v2 seed catalog L2 parity",
                v2_parity_status="pending",
                blocking_reason="ASM1 seed catalog RHS parity is not wired",
            ),
            V1V2ParityCase(
                model_family="asm3",
                v1_job_type="simulation.asm3.v1",
                v1_fixture="contracts/examples/valid/asm3_independent.simulation_input.v1.json",
                v1_golden_case_id="asm3_independent",
                v2_target="asm3_seed_catalog",
                v2_required_evidence="v1 ASM3 vs v2 seed catalog L2 parity",
                v2_parity_status="pending",
                blocking_reason="ASM3 seed catalog RHS parity is not wired",
            ),
        ),
    )
