from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

REFERENCE_COMPONENTS = (
    "S_I",
    "S_S",
    "S_O",
    "S_NO",
    "S_NH",
    "S_ND",
    "S_ALK",
    "X_TSS",
)


@dataclass(frozen=True)
class SecondaryClarifierReferenceConfig:
    composite_id: str = "clarifier_1"
    area_m2: float = 1500.0
    height_m: float = 4.0
    layers: int = 10
    feed_layer: int = 5
    q_in: float = 100.0
    q_ras: float = 25.0
    q_was: float = 5.0
    takacs_parameters: dict[str, float] = field(default_factory=dict)
    initial_conditions: dict[str, float] = field(default_factory=dict)

    @property
    def q_underflow(self) -> float:
        return self.q_ras + self.q_was

    @property
    def q_effluent(self) -> float:
        return self.q_in - self.q_underflow


def build_secondary_clarifier_reference_graph(
    config: SecondaryClarifierReferenceConfig | None = None,
) -> dict[str, Any]:
    cfg = config or SecondaryClarifierReferenceConfig()
    _validate_config(cfg)

    composite_id = cfg.composite_id
    schema_id = "bsm1_clarifier_reference_8.v1"
    nodes = _boundary_nodes(cfg, schema_id) + _layer_nodes(cfg, schema_id)
    edges = (
        _boundary_hydraulic_edges(cfg)
        + _internal_hydraulic_edges(cfg)
        + _settling_edges(cfg)
    )

    return {
        "schema_version": "network_process_graph.v1",
        "network_graph_id": f"{composite_id}_reference_profile",
        "version": 1,
        "component_schemas": [
            {
                "component_schema_id": schema_id,
                "components": list(REFERENCE_COMPONENTS),
                "unit": "g/m3",
            }
        ],
        "nodes": nodes,
        "edges": edges,
        "flow_constraints": _flow_constraints(cfg),
        "signal_bindings": [],
        "composites": [
            {
                "composite_id": composite_id,
                "composite_type": "SecondaryClarifier10Layer",
                "profile": "reference",
                "geometry": {
                    "area_m2": cfg.area_m2,
                    "height_m": cfg.height_m,
                    "layers": cfg.layers,
                    "feed_layer": cfg.feed_layer,
                },
                "ports": {
                    "influent": _node_id(cfg, "influent"),
                    "effluent": _node_id(cfg, "effluent"),
                    "ras": _node_id(cfg, "ras"),
                    "was": _node_id(cfg, "was"),
                },
            }
        ],
        "validation": {"status": "valid", "errors": [], "warnings": []},
    }


def _validate_config(cfg: SecondaryClarifierReferenceConfig) -> None:
    if cfg.layers != 10:
        raise ValueError("SecondaryClarifier10Layer reference profile requires 10 layers")
    if cfg.feed_layer <= 1 or cfg.feed_layer >= cfg.layers:
        raise ValueError("feed_layer must be an internal generated layer")
    if cfg.q_effluent < 0:
        raise ValueError("q_in must be greater than or equal to q_ras + q_was")


def _layer_nodes(
    cfg: SecondaryClarifierReferenceConfig,
    schema_id: str,
) -> list[dict[str, Any]]:
    initial = {component: float(cfg.initial_conditions.get(component, 0.0)) for component in REFERENCE_COMPONENTS}
    nodes: list[dict[str, Any]] = []
    for index in range(1, cfg.layers + 1):
        ports = [
            {"port_id": "h_in", "port_kind": "hydraulic_in"},
            {"port_id": "h_out", "port_kind": "hydraulic_out"},
            {"port_id": "settling_in", "port_kind": "settling_in"},
            {"port_id": "settling_out", "port_kind": "settling_out"},
        ]
        if index == cfg.feed_layer:
            ports.append({"port_id": "influent", "port_kind": "hydraulic_in"})
        if index == 1:
            ports.append({"port_id": "effluent", "port_kind": "hydraulic_out"})
        if index == cfg.layers:
            ports.extend(
                [
                    {"port_id": "ras", "port_kind": "hydraulic_out"},
                    {"port_id": "was", "port_kind": "hydraulic_out"},
                ]
            )
        nodes.append(
            {
                "node_id": _layer_id(cfg, index),
                "node_type": "secondary_clarifier_layer",
                "process_unit_type": "settling_layer",
                "component_schema_id": schema_id,
                "initial_conditions": dict(initial),
                "ports": ports,
                "model_binding": {
                    "model_kind": "passive_udm",
                    "model_id": "secondary_clarifier_reference",
                    "model_version": "v1",
                    "reaction_enabled": False,
                },
                "parameter_binding": {},
                "unit_metadata": {
                    "composite_unit_id": cfg.composite_id,
                    "composite_type": "SecondaryClarifier10Layer",
                    "profile": "reference",
                    "layer_index": index,
                    "feed_layer": cfg.feed_layer,
                },
            }
        )
    return nodes


def _boundary_nodes(
    cfg: SecondaryClarifierReferenceConfig,
    schema_id: str,
) -> list[dict[str, Any]]:
    return [
        _boundary_node(cfg, schema_id, "influent", [{"port_id": "out", "port_kind": "hydraulic_out"}]),
        _boundary_node(cfg, schema_id, "effluent", [{"port_id": "in", "port_kind": "hydraulic_in"}]),
        _boundary_node(cfg, schema_id, "ras", [{"port_id": "in", "port_kind": "hydraulic_in"}]),
        _boundary_node(cfg, schema_id, "was", [{"port_id": "in", "port_kind": "hydraulic_in"}]),
    ]


def _boundary_node(
    cfg: SecondaryClarifierReferenceConfig,
    schema_id: str,
    role: str,
    ports: list[dict[str, str]],
) -> dict[str, Any]:
    return {
        "node_id": _node_id(cfg, role),
        "node_type": "controller",
        "process_unit_type": "boundary",
        "component_schema_id": schema_id,
        "initial_conditions": {},
        "ports": ports,
        "model_binding": {"model_kind": "controller", "reaction_enabled": False},
        "parameter_binding": {},
        "unit_metadata": {
            "composite_unit_id": cfg.composite_id,
            "boundary_role": role,
            "profile": "reference",
        },
    }


def _boundary_hydraulic_edges(cfg: SecondaryClarifierReferenceConfig) -> list[dict[str, Any]]:
    return [
        _hydraulic_edge(
            cfg,
            "influent_feed",
            _node_id(cfg, "influent"),
            "out",
            _layer_id(cfg, cfg.feed_layer),
            "influent",
            {"mode": "fixed", "value": cfg.q_in},
        ),
        _hydraulic_edge(
            cfg,
            "top_effluent",
            _layer_id(cfg, 1),
            "effluent",
            _node_id(cfg, "effluent"),
            "in",
            {"mode": "residual"},
        ),
        _hydraulic_edge(
            cfg,
            "bottom_ras",
            _layer_id(cfg, cfg.layers),
            "ras",
            _node_id(cfg, "ras"),
            "in",
            {"mode": "fixed", "value": cfg.q_ras},
        ),
        _hydraulic_edge(
            cfg,
            "bottom_was",
            _layer_id(cfg, cfg.layers),
            "was",
            _node_id(cfg, "was"),
            "in",
            {"mode": "fixed", "value": cfg.q_was},
        ),
    ]


def _internal_hydraulic_edges(cfg: SecondaryClarifierReferenceConfig) -> list[dict[str, Any]]:
    edges: list[dict[str, Any]] = []
    for upper in range(cfg.feed_layer - 1, 0, -1):
        lower = upper + 1
        edges.append(
            _hydraulic_edge(
                cfg,
                f"hyd_up_{lower:02d}_{upper:02d}",
                _layer_id(cfg, lower),
                "h_out",
                _layer_id(cfg, upper),
                "h_in",
                {"mode": "balanced"},
            )
        )
    for upper in range(cfg.feed_layer, cfg.layers):
        lower = upper + 1
        edges.append(
            _hydraulic_edge(
                cfg,
                f"hyd_down_{upper:02d}_{lower:02d}",
                _layer_id(cfg, upper),
                "h_out",
                _layer_id(cfg, lower),
                "h_in",
                {"mode": "balanced" if upper == cfg.feed_layer else "balanced"},
            )
        )
    return edges


def _settling_edges(cfg: SecondaryClarifierReferenceConfig) -> list[dict[str, Any]]:
    parameters = {"area_m2": cfg.area_m2, **cfg.takacs_parameters}
    edges: list[dict[str, Any]] = []
    for upper in range(1, cfg.layers):
        lower = upper + 1
        edges.append(
            {
                "edge_id": _edge_id(cfg, f"settling_{upper:02d}_{lower:02d}"),
                "edge_kind": "settling",
                "source_node_id": _layer_id(cfg, upper),
                "source_port": "settling_out",
                "target_node_id": _layer_id(cfg, lower),
                "target_port": "settling_in",
                "component_policy": {
                    "mode": "include",
                    "include": ["X_TSS"],
                    "exclude": [],
                },
                "stream_adapter": None,
                "transport_model": {
                    "model_id": "takacs_settling.v1",
                    "parameters": parameters,
                },
                "metadata": {
                    "composite_unit_id": cfg.composite_id,
                    "profile": "reference",
                    "upper_layer": upper,
                    "lower_layer": lower,
                },
            }
        )
    return edges


def _flow_constraints(cfg: SecondaryClarifierReferenceConfig) -> list[dict[str, Any]]:
    return [
        {
            "constraint_id": _edge_id(cfg, "feed_effluent_residual"),
            "constraint_type": "residual",
            "node_id": _layer_id(cfg, cfg.feed_layer),
            "known_outflow_edges": [_edge_id(cfg, f"hyd_down_{cfg.feed_layer:02d}_{cfg.feed_layer + 1:02d}")],
            "residual_edge_id": _edge_id(cfg, f"hyd_up_{cfg.feed_layer:02d}_{cfg.feed_layer - 1:02d}"),
        }
    ]


def _hydraulic_edge(
    cfg: SecondaryClarifierReferenceConfig,
    suffix: str,
    source_node_id: str,
    source_port: str,
    target_node_id: str,
    target_port: str,
    flow_spec: dict[str, float | str],
) -> dict[str, Any]:
    return {
        "edge_id": _edge_id(cfg, suffix),
        "edge_kind": "hydraulic",
        "source_node_id": source_node_id,
        "source_port": source_port,
        "target_node_id": target_node_id,
        "target_port": target_port,
        "component_policy": {"mode": "include", "include": list(REFERENCE_COMPONENTS), "exclude": []},
        "flow_spec": flow_spec,
        "metadata": {"composite_unit_id": cfg.composite_id, "profile": "reference"},
    }


def _layer_id(cfg: SecondaryClarifierReferenceConfig, index: int) -> str:
    return f"{cfg.composite_id}_layer_{index:02d}"


def _node_id(cfg: SecondaryClarifierReferenceConfig, role: str) -> str:
    return f"{cfg.composite_id}_{role}"


def _edge_id(cfg: SecondaryClarifierReferenceConfig, suffix: str) -> str:
    return f"{cfg.composite_id}_{suffix}"
