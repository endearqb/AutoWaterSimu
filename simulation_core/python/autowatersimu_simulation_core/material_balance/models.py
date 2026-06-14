from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class NodeData(BaseModel):
    """Runtime node data for material balance calculations."""

    model_config = ConfigDict(extra="forbid")

    node_id: str
    node_type: str = "default"
    is_inlet: bool = False
    is_outlet: bool = False
    initial_volume: float = Field(ge=1e-6)
    initial_concentrations: list[float]
    position: dict[str, float] = Field(default_factory=dict)
    asm1slim_parameters: list[float] | None = None
    asm1_parameters: list[float] | None = None
    asm3_parameters: list[float] | None = None
    udm_model_id: str | None = None
    udm_model_version: int | None = None
    udm_model_hash: str | None = None
    udm_component_names: list[str] | None = None
    udm_processes: list[dict[str, Any]] | None = None
    udm_parameter_values: dict[str, float] | None = None
    udm_model_snapshot: dict[str, Any] | None = None
    udm_variable_bindings: list[dict[str, str]] | None = None

    @field_validator("initial_concentrations")
    @classmethod
    def validate_concentrations(cls, value: list[float]) -> list[float]:
        if not value:
            raise ValueError("initial_concentrations must not be empty")
        if not all(concentration >= 0 for concentration in value):
            raise ValueError("Concentrations must be non-negative")
        return value

    @field_validator("asm1slim_parameters")
    @classmethod
    def validate_asm1slim_parameters(cls, value: list[float] | None) -> list[float] | None:
        if value is not None:
            if len(value) != 7:
                raise ValueError("ASM1 Slim parameters must contain exactly 7 values")
            if not all(parameter >= 0 for parameter in value):
                raise ValueError("ASM1 Slim parameters must be non-negative")
        return value

    @field_validator("asm1_parameters")
    @classmethod
    def validate_asm1_parameters(cls, value: list[float] | None) -> list[float] | None:
        if value is not None:
            if len(value) != 19:
                raise ValueError("ASM1 parameters must contain exactly 19 values")
            if not all(parameter >= 0 for parameter in value):
                raise ValueError("ASM1 parameters must be non-negative")
        return value

    @field_validator("asm3_parameters")
    @classmethod
    def validate_asm3_parameters(cls, value: list[float] | None) -> list[float] | None:
        if value is not None:
            if len(value) != 37:
                raise ValueError("ASM3 parameters must contain exactly 37 values")
            if not all(parameter >= 0 for parameter in value):
                raise ValueError("ASM3 parameters must be non-negative")
        return value

    @field_validator("udm_component_names")
    @classmethod
    def validate_udm_component_names(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return value
        if not value:
            raise ValueError("UDM component names cannot be empty")
        if len(value) != len(set(value)):
            raise ValueError("UDM component names must be unique")
        return value


class EdgeData(BaseModel):
    """Runtime edge data for material balance calculations."""

    model_config = ConfigDict(extra="forbid")

    edge_id: str
    source_node_id: str
    target_node_id: str
    flow_rate: float = Field(ge=0)
    concentration_factor_a: list[float] = Field(default_factory=list)
    concentration_factor_b: list[float] = Field(default_factory=list)


class SegmentFactorAB(BaseModel):
    a: float | None = None
    b: float | None = None


class SegmentEdgeOverride(BaseModel):
    flow: float | None = Field(default=None, ge=0)
    factors: dict[str, SegmentFactorAB] = Field(default_factory=dict)


class TimeSegment(BaseModel):
    id: str
    start_hour: float = Field(ge=0)
    end_hour: float = Field(gt=0)
    edge_overrides: dict[str, SegmentEdgeOverride] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_end_after_start(self) -> "TimeSegment":
        if self.end_hour <= self.start_hour:
            raise ValueError("end_hour must be greater than start_hour")
        return self


class CalculationParameters(BaseModel):
    hours: float = Field(default=4.0, gt=0, le=1000)
    steps_per_hour: int = Field(default=60, gt=0, le=1000)
    solver_method: str = "scipy_solver"
    tolerance: float = Field(default=1e-6, gt=0, le=1e-3)
    max_iterations: int = Field(
        default=1000,
        gt=0,
        le=100000,
        description="Deprecated compatibility field; accepted but not enforced by simulation_core solvers.",
        json_schema_extra={"deprecated": True},
    )
    max_memory_mb: int = Field(
        default=1000,
        gt=0,
        le=10000,
        description="Deprecated compatibility field; accepted but not enforced by simulation_core solvers.",
        json_schema_extra={"deprecated": True},
    )
    sampling_interval_hours: float | None = None

    @field_validator("solver_method")
    @classmethod
    def validate_solver_method(cls, value: str) -> str:
        allowed = {"scipy_solver", "euler", "rk4", "adaptive_heun"}
        if value not in allowed:
            raise ValueError(f"solver_method must be one of {sorted(allowed)}")
        return value


class MaterialBalanceInput(BaseModel):
    nodes: list[NodeData]
    edges: list[EdgeData]
    parameters: CalculationParameters
    time_segments: list[TimeSegment] = Field(default_factory=list)
    hybrid_config: dict[str, Any] | None = None
    original_flowchart_data: dict[str, Any] | None = None
    contract_warnings: list[dict[str, Any]] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_graph(self) -> "MaterialBalanceInput":
        if len(self.nodes) < 2:
            raise ValueError("At least 2 nodes are required")
        if not any(node.is_inlet for node in self.nodes):
            raise ValueError("At least one inlet node is required")

        node_ids = [node.node_id for node in self.nodes]
        if len(node_ids) != len(set(node_ids)):
            raise ValueError("Node IDs must be unique")

        node_id_set = set(node_ids)
        edge_ids = [edge.edge_id for edge in self.edges]
        if len(edge_ids) != len(set(edge_ids)):
            raise ValueError("Edge IDs must be unique")

        for edge in self.edges:
            if edge.source_node_id not in node_id_set:
                raise ValueError(
                    f"Edge {edge.edge_id} references unknown source node {edge.source_node_id}"
                )
            if edge.target_node_id not in node_id_set:
                raise ValueError(
                    f"Edge {edge.edge_id} references unknown target node {edge.target_node_id}"
                )

        return self


class MaterialBalanceResult(BaseModel):
    job_id: str
    status: str
    timestamps: list[float]
    node_data: dict[str, dict[str, Any]]
    edge_data: dict[str, dict[str, Any]]
    segment_markers: list[float] | None = None
    parameter_change_events: list[dict[str, Any]] | None = None
    summary: dict[str, Any]
    error_message: str | None = None
