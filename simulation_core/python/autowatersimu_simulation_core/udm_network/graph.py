from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class EdgeKind(str, Enum):
    HYDRAULIC = "hydraulic"
    PUMP = "pump"
    SETTLING = "settling"
    SIGNAL = "signal"


class UDMNetworkCompileError(ValueError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


@dataclass(frozen=True)
class ComponentSchema:
    component_schema_id: str
    components: tuple[str, ...]
    unit: str


@dataclass(frozen=True)
class Port:
    port_id: str
    port_kind: str
    inferred: bool = False


@dataclass
class RuntimeNode:
    node_id: str
    node_type: str
    process_unit_type: str
    component_schema_id: str
    component_names: tuple[str, ...]
    initial_conditions: dict[str, float]
    model_binding: dict[str, Any]
    parameter_binding: dict[str, Any]
    ports: dict[str, Port] = field(default_factory=dict)
    explicit_ports: bool = False


@dataclass(frozen=True)
class RuntimeEdge:
    edge_id: str
    edge_kind: EdgeKind
    source_node_id: str
    source_port: str
    target_node_id: str
    target_port: str
    component_names: tuple[str, ...]
    component_policy: dict[str, Any]
    flow_spec: dict[str, Any] | None
    stream_adapter: dict[str, Any] | None
    transport_model: dict[str, Any] | None
    pump: dict[str, Any] | None
    signal_spec: dict[str, Any] | None

    @property
    def is_static(self) -> bool:
        if self.edge_kind not in {EdgeKind.HYDRAULIC, EdgeKind.PUMP}:
            return False
        flow_spec = self.flow_spec or {}
        return flow_spec.get("mode", "fixed") == "fixed"
