from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .graph import ComponentSchema, RuntimeEdge, RuntimeNode


@dataclass(frozen=True)
class StateSlice:
    node_id: str
    component_schema_id: str
    start: int
    stop: int
    component_names: tuple[str, ...]

    @property
    def size(self) -> int:
        return self.stop - self.start


@dataclass(frozen=True)
class EdgeBundles:
    static_edges: tuple[RuntimeEdge, ...]
    dynamic_edges: tuple[RuntimeEdge, ...]


@dataclass(frozen=True)
class CompiledNetworkSystem:
    schema_version: str
    network_graph_id: str
    version: int
    component_schemas: dict[str, ComponentSchema]
    nodes: tuple[RuntimeNode, ...]
    edges: tuple[RuntimeEdge, ...]
    state_slices: dict[str, StateSlice]
    edge_bundles: EdgeBundles
    flow_constraints: tuple[dict[str, Any], ...]
    signal_bindings: tuple[dict[str, Any], ...]

    @property
    def state_size(self) -> int:
        return max((state_slice.stop for state_slice in self.state_slices.values()), default=0)

    @property
    def node_by_id(self) -> dict[str, RuntimeNode]:
        return {node.node_id: node for node in self.nodes}

    @property
    def edge_by_id(self) -> dict[str, RuntimeEdge]:
        return {edge.edge_id: edge for edge in self.edges}

    def initial_state_vector(self) -> tuple[float, ...]:
        values = [0.0] * self.state_size
        for node in self.nodes:
            state_slice = self.state_slices[node.node_id]
            for offset, component in enumerate(state_slice.component_names):
                values[state_slice.start + offset] = float(node.initial_conditions.get(component, 0.0))
        return tuple(values)

