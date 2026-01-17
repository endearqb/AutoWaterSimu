"""物料平衡数据模型

物料平衡计算的数据结构定义。

该模块定义了物料平衡计算所需的所有数据模型：
- 节点数据模型（NodeData）
- 边数据模型（EdgeData）
- 计算参数模型（CalculationParameters）
- 输入数据模型（MaterialBalanceInput）
- 结果数据模型（MaterialBalanceResult）
"""

from typing import List, Dict, Optional, Any, Union
from pydantic import BaseModel, Field, validator
import torch


class NodeData(BaseModel):
    """流程图中单个节点的数据模型。
    
    定义了节点的基本属性，包括体积、浓度、入口/出口标识等。
    每个节点代表系统中的一个物理单元（如反应器、储罐等）。
    """
    node_id: str
    initial_volume: float = Field(ge=1e-6, description="Initial volume (>=1e-6)")
    initial_concentrations: List[float] = Field(description="Initial concentrations for each component")
    is_inlet: bool = False
    is_outlet: bool = False
    
    @validator('initial_concentrations')
    def validate_concentrations(cls, v):
        """验证初始浓度数据的有效性。
        
        确保浓度值非负且至少包含一个组分。
        """
        if not v:
            raise ValueError("At least one concentration value is required")
        if any(c < 0 for c in v):
            raise ValueError("Concentrations must be non-negative")
        return v


class EdgeData(BaseModel):
    """流程图中单条边（连接）的数据模型。
    
    定义了节点之间的连接关系，包括流量、浓度变化因子等。
    每条边代表物料从一个节点流向另一个节点的过程。
    """
    edge_id: str
    from_node: str
    to_node: str
    flow_rate: float = Field(ge=0, description="Flow rate (>=0)")
    concentration_factors_a: List[float] = Field(description="Concentration multiplication factors")
    concentration_factors_b: List[float] = Field(default_factory=list, description="Concentration addition factors")
    
    @validator('concentration_factors_a')
    def validate_factors_a(cls, v):
        """验证浓度乘法因子的有效性。
        
        确保至少包含一个浓度因子。
        """
        if not v:
            raise ValueError("At least one concentration factor is required")
        return v
    
    @validator('concentration_factors_b')
    def validate_factors_b(cls, v, values):
        """验证浓度加法因子的有效性。
        
        确保加法因子与乘法因子的长度一致。
        """
        if v and 'concentration_factors_a' in values:
            if len(v) != len(values['concentration_factors_a']):
                raise ValueError("Factors A and B must have the same length")
        return v


class CalculationParameters(BaseModel):
    """物料平衡计算的参数配置。
    
    定义了计算过程中的各种参数，包括时间范围、步长、
    求解器类型、精度要求等。
    """
    hours: float = Field(gt=0, description="Simulation time in hours")
    steps_per_hour: int = Field(gt=0, description="Number of time steps per hour")
    solver_method: str = Field(default="scipy_solver", description="ODE solver method")
    tolerance: float = Field(default=1e-3, description="Solver tolerance")
    max_iterations: int = Field(default=1000, description="Maximum solver iterations")
    sampling_interval_hours: Optional[float] = Field(default=None, description="Sampling interval in hours for data storage optimization")
    
    @validator('solver_method')
    def validate_solver(cls, v):
        """验证求解器方法的有效性。
        
        确保选择的求解器方法在支持的列表中。
        """
        allowed_methods = ['scipy_solver', 'rk4', 'euler', 'adaptive_heun']
        if v not in allowed_methods:
            raise ValueError(f"Solver method must be one of {allowed_methods}")
        return v


class MaterialBalanceInput(BaseModel):
    """物料平衡计算的输入数据模型。
    
    包含了完整的计算输入，包括节点列表、边列表和计算参数。
    该模型会验证数据的完整性和一致性。
    """
    nodes: List[NodeData]
    edges: List[EdgeData]
    parameters: CalculationParameters
    original_flowchart_data: Optional[Dict[str, Any]] = Field(default=None, description="Original flowchart data for preserving parameter names")
    
    @validator('nodes')
    def validate_nodes(cls, v):
        """验证节点数据的有效性。
        
        检查节点数量、ID唯一性和组分数量一致性。
        """
        if len(v) < 2:
            raise ValueError("At least 2 nodes are required")
        
        node_ids = [node.node_id for node in v]
        if len(node_ids) != len(set(node_ids)):
            raise ValueError("Node IDs must be unique")
        
        # Check component consistency
        component_counts = [len(node.initial_concentrations) for node in v]
        if len(set(component_counts)) > 1:
            raise ValueError("All nodes must have the same number of components")
        
        return v
    
    @validator('edges')
    def validate_edges(cls, v, values):
        """验证边数据的有效性。
        
        检查边的数量、ID唯一性和节点引用的有效性。
        """
        if not v:
            raise ValueError("At least one edge is required")
        
        if 'nodes' in values:
            node_ids = {node.node_id for node in values['nodes']}
            for edge in v:
                if edge.from_node not in node_ids:
                    raise ValueError(f"Edge references unknown from_node: {edge.from_node}")
                if edge.to_node not in node_ids:
                    raise ValueError(f"Edge references unknown to_node: {edge.to_node}")
        
        edge_ids = [edge.edge_id for edge in v]
        if len(edge_ids) != len(set(edge_ids)):
            raise ValueError("Edge IDs must be unique")
        
        return v


class TimeSeriesData(BaseModel):
    """单个实体（节点或边）的时间序列数据模型。
    
    用于存储随时间变化的参数值，如浓度、体积、流量等。
    """
    entity_id: str
    timestamps: List[float]
    values: Dict[str, List[float]]  # parameter_name -> list of values


class MaterialBalanceResult(BaseModel):
    """物料平衡计算的结果数据模型。
    
    包含了完整的计算结果，包括时间序列数据、节点状态、
    边状态、计算摘要和错误信息等。
    """
    job_id: str
    status: str = Field(description="Calculation status: success, failed, running")
    timestamps: List[float] = Field(description="Time points array")
    node_data: Dict[str, Dict[str, Union[str, List[float]]]] = Field(
        description="Node data: {node_id: {parameter: [values] or label: string}}"
    )
    edge_data: Dict[str, Dict[str, List[float]]] = Field(
        description="Edge data: {edge_id: {parameter: [values]}}"
    )
    summary: Dict[str, Any] = Field(
        description="Calculation summary (total_time, steps, convergence_status, etc.)"
    )
    error_message: Optional[str] = None
    
    class Config:
        schema_extra = {
            "example": {
                "job_id": "calc_123",
                "status": "success",
                "timestamps": [0.0, 0.0167, 0.0333, 0.05],
                "node_data": {
                    "node_1": {
                        "volume": [1.0, 1.1, 1.2, 1.3],
                        "concentration_0": [2.0, 1.9, 1.8, 1.7],
                        "concentration_1": [1.0, 1.1, 1.2, 1.3]
                    }
                },
                "edge_data": {
                    "edge_1": {
                        "flow_rate": [2.0, 2.0, 2.0, 2.0]
                    }
                },
                "summary": {
                    "total_time": 4.0,
                    "total_steps": 241,
                    "convergence_status": "converged",
                    "final_mass_balance_error": 1e-8
                }
            }
        }