"""UDM Network v2 graph compiler."""

from .compiler import compile_network
from .composites import (
    REFERENCE_COMPONENTS,
    SecondaryClarifierReferenceConfig,
    build_secondary_clarifier_reference_graph,
)
from .flow_balance import FlowBalanceError, FlowBalanceResult, solve_flow_balance
from .graph import EdgeKind, UDMNetworkCompileError
from .parity import V1MigrationGate, V1V2ParityCase, build_v1_migration_gate
from .results import CompiledNetworkSystem, StateSlice
from .rhs import RHSAssemblyResult, UDMNetworkRHSError, assemble_rhs
from .udm_reaction import (
    UDMProcess,
    UDMReactionError,
    UDMReactionModel,
    build_node_reaction_model,
    build_reaction_model,
    evaluate_reaction,
)
from .udm_transport import (
    ComponentPolicy,
    TransportEvaluation,
    UDMTransportError,
    UDMTransportModel,
    build_transport_model,
    evaluate_transport,
)

__all__ = [
    "ComponentPolicy",
    "CompiledNetworkSystem",
    "EdgeKind",
    "FlowBalanceError",
    "FlowBalanceResult",
    "REFERENCE_COMPONENTS",
    "RHSAssemblyResult",
    "SecondaryClarifierReferenceConfig",
    "StateSlice",
    "TransportEvaluation",
    "UDMNetworkCompileError",
    "UDMNetworkRHSError",
    "UDMProcess",
    "UDMReactionError",
    "UDMReactionModel",
    "UDMTransportError",
    "UDMTransportModel",
    "V1MigrationGate",
    "V1V2ParityCase",
    "build_node_reaction_model",
    "build_reaction_model",
    "build_secondary_clarifier_reference_graph",
    "build_transport_model",
    "build_v1_migration_gate",
    "compile_network",
    "assemble_rhs",
    "evaluate_reaction",
    "evaluate_transport",
    "solve_flow_balance",
]
