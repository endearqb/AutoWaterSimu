import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional
from enum import Enum

from pydantic import EmailStr, Field as PydanticField, validator
from sqlmodel import Field, Relationship, SQLModel, Column, JSON


# User type enumeration
class UserType(str, Enum):
    """用户类型枚举"""
    basic = "basic"
    pro = "pro"
    ultra = "ultra"
    enterprise = "enterprise"


# Shared properties
class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)
    user_type: UserType = Field(default=UserType.basic, description="用户类型级别")


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=40)


class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=40)
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on update, all are optional
class UserUpdate(UserBase):
    email: EmailStr | None = Field(default=None, max_length=255)  # type: ignore
    password: str | None = Field(default=None, min_length=8, max_length=40)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)
    user_type: UserType | None = Field(default=None, description="用户类型级别")


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=40)
    new_password: str = Field(min_length=8, max_length=40)


# Database model, database table inferred from class name
class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.now, description="用户创建时间")
    updated_at: datetime = Field(default_factory=datetime.now, description="用户信息最后更新时间")
    items: list["Item"] = Relationship(back_populates="owner", cascade_delete=True)
    flowcharts: list["FlowChart"] = Relationship(back_populates="owner", cascade_delete=True)
    # ASM1slim相关关系
    asm1slim_flowcharts: list["ASM1SlimFlowChart"] = Relationship(back_populates="owner", cascade_delete=True)
    asm1slim_jobs: list["ASM1SlimJob"] = Relationship(back_populates="owner", cascade_delete=True)
    # ASM1相关关系
    asm1_flowcharts: list["ASM1FlowChart"] = Relationship(back_populates="owner", cascade_delete=True)
    asm1_jobs: list["ASM1Job"] = Relationship(back_populates="owner", cascade_delete=True)
    # ASM3相关关系
    asm3_flowcharts: list["ASM3FlowChart"] = Relationship(back_populates="owner", cascade_delete=True)
    asm3_jobs: list["ASM3Job"] = Relationship(back_populates="owner", cascade_delete=True)
    material_balance_jobs: list["MaterialBalanceJob"] = Relationship(back_populates="owner", cascade_delete=True)
    # UDM相关关系
    udm_models: list["UDMModel"] = Relationship(back_populates="owner", cascade_delete=True)
    udm_model_versions: list["UDMModelVersion"] = Relationship(back_populates="owner", cascade_delete=True)
    udm_flowcharts: list["UDMFlowChart"] = Relationship(back_populates="owner", cascade_delete=True)
    udm_jobs: list["UDMJob"] = Relationship(back_populates="owner", cascade_delete=True)


# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


# Shared properties
class ItemBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


# Properties to receive on item creation
class ItemCreate(ItemBase):
    pass


# Properties to receive on item update
class ItemUpdate(ItemBase):
    title: str | None = Field(default=None, min_length=1, max_length=255)  # type: ignore


# Database model, database table inferred from class name
class Item(ItemBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: User | None = Relationship(back_populates="items")


# Properties to return via API, id is always required
class ItemPublic(ItemBase):
    id: uuid.UUID
    owner_id: uuid.UUID


class ItemsPublic(SQLModel):
    data: list[ItemPublic]
    count: int


# Generic message
class Message(SQLModel):
    message: str


# JSON payload containing access token
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    sub: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=40)


# Shared properties for FlowChart
class FlowChartBase(SQLModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=1000)


# Properties to receive on flowchart creation
class FlowChartCreate(FlowChartBase):
    flow_data: dict = Field(description="Complete flow chart data including nodes, edges, and configurations")


# Properties to receive on flowchart update
class FlowChartUpdate(FlowChartBase):
    name: str | None = Field(default=None, min_length=1, max_length=255)  # type: ignore
    flow_data: dict | None = Field(default=None, description="Complete flow chart data including nodes, edges, and configurations")


# Database model, database table inferred from class name
class FlowChart(FlowChartBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    flow_data: dict = Field(sa_column=Column(JSON), description="Complete flow chart data stored as JSON")
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: User | None = Relationship(back_populates="flowcharts")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


# Properties to return via API, id is always required
class FlowChartPublic(FlowChartBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    flow_data: dict


class FlowChartsPublic(SQLModel):
    data: list[FlowChartPublic]
    count: int


# Material Balance Models

# Enums for Material Balance
class MaterialBalanceJobStatus(str, Enum):
    """物料平衡计算任务状态"""
    pending = "pending"
    running = "running"
    success = "success"
    failed = "failed"
    cancelled = "cancelled"


class SolverMethod(str, Enum):
    """ODE求解器方法"""
    scipy_solver = "scipy_solver"
    euler = "euler"
    rk4 = "rk4"
    adaptive_heun = "adaptive_heun"


# Node and Edge data structures for Material Balance
class NodeData(SQLModel):
    """流程图节点数据"""
    node_id: str = Field(description="节点唯一标识符")
    node_type: str = Field(description="节点类型 (inlet, outlet, default, asm1slim, asm1等)")
    is_inlet: bool = Field(default=False, description="是否为入口节点")
    is_outlet: bool = Field(default=False, description="是否为出口节点")
    initial_volume: float = Field(ge=1e-6, description="初始体积 (m³)，最小值为1e-6")
    initial_concentrations: List[float] = Field(description="初始浓度列表 (g/m³)")
    position: Dict[str, float] = Field(default_factory=dict, description="节点在流程图中的位置")
    asm1slim_parameters: Optional[List[float]] = Field(default=None, description="ASM1 Slim模型参数 [dSNOmax, dSNHmax, CNRatio, K_S, K_NO, n_g, K_NH]")
    asm1_parameters: Optional[List[float]] = Field(default=None, description="ASM1模型参数 [u_H, K_S, K_OH, K_NO, n_g, b_H, u_A, K_NH, K_OA, b_A, Y_H, Y_A, i_XB, i_XP, f_P, n_h, K_a, K_h, K_x]")
    asm3_parameters: Optional[List[float]] = Field(default=None, description="ASM3模型参数 [k_H, K_X, k_STO, ny_NOX, K_O2, K_NOX, K_S, K_STO, mu_H, K_NH4, K_ALK, b_HO2, b_HNOX, b_STOO2, b_STONOX, mu_A, K_ANH4, K_AO2, K_AALK, b_AO2, b_ANOX, f_SI, Y_STOO2, Y_STONOX, Y_HO2, Y_HNOX, Y_A, f_XI, i_NSI, i_NSS, i_NXI, i_NXS, i_NBM, i_SSXI, i_SSXS, i_SSBM, i_SSSTO]")
    udm_model_id: Optional[str] = Field(default=None, description="UDM模型ID")
    udm_model_version: Optional[int] = Field(default=None, description="UDM模型版本")
    udm_model_hash: Optional[str] = Field(default=None, description="UDM模型内容哈希")
    udm_component_names: Optional[List[str]] = Field(default=None, description="UDM状态组分名称列表")
    udm_processes: Optional[List[Dict[str, Any]]] = Field(default=None, description="UDM过程定义列表，包含rate_expr与stoich")
    udm_parameter_values: Optional[Dict[str, float]] = Field(default=None, description="UDM参数值映射")
    udm_model_snapshot: Optional[Dict[str, Any]] = Field(default=None, description="UDM模型快照，用于任务可复现")
    
    @validator('initial_concentrations')
    def validate_concentrations(cls, v):
        if not all(c >= 0 for c in v):
            raise ValueError("Concentrations must be non-negative")
        return v
    
    @validator('asm1slim_parameters')
    def validate_asm1slim_parameters(cls, v, values):
        if v is not None:
            if len(v) != 7:
                raise ValueError("ASM1 Slim parameters must contain exactly 7 values: [dSNOmax, dSNHmax, CNRatio, K_S, K_NO, n_g, K_NH]")
            if not all(param >= 0 for param in v):
                raise ValueError("ASM1 Slim parameters must be non-negative")
        return v
    
    @validator('asm1_parameters')
    def validate_asm1_parameters(cls, v, values):
        if v is not None:
            if len(v) != 19:
                raise ValueError("ASM1 parameters must contain exactly 19 values: [u_H, K_S, K_OH, K_NO, n_g, b_H, u_A, K_NH, K_OA, b_A, Y_H, Y_A, i_XB, i_XP, f_P, n_h, K_a, K_h, K_x]")
            if not all(param >= 0 for param in v):
                raise ValueError("ASM1 parameters must be non-negative")
        return v
    
    @validator('asm3_parameters')
    def validate_asm3_parameters(cls, v, values):
        if v is not None:
            if len(v) != 37:
                raise ValueError("ASM3 parameters must contain exactly 37 values: [k_H, K_X, k_STO, ny_NOX, K_O2, K_NOX, K_S, K_STO, mu_H, K_NH4, K_ALK, b_HO2, b_HNOX, b_STOO2, b_STONOX, mu_A, K_ANH4, K_AO2, K_AALK, b_AO2, b_ANOX, f_SI, Y_STOO2, Y_STONOX, Y_HO2, Y_HNOX, Y_A, f_XI, i_NSI, i_NSS, i_NXI, i_NXS, i_NBM, i_SSXI, i_SSXS, i_SSBM, i_SSSTO]")
            if not all(param >= 0 for param in v):
                raise ValueError("ASM3 parameters must be non-negative")
        return v

    @validator('udm_component_names')
    def validate_udm_component_names(cls, v):
        if v is None:
            return v
        if len(v) == 0:
            raise ValueError("UDM component names cannot be empty")
        if len(v) != len(set(v)):
            raise ValueError("UDM component names must be unique")
        return v


class EdgeData(SQLModel):
    """流程图边数据"""
    edge_id: str = Field(description="边唯一标识符")
    source_node_id: str = Field(description="源节点ID")
    target_node_id: str = Field(description="目标节点ID")
    flow_rate: float = Field(description="流量 (m³/h)")
    concentration_factor_a: List[float] = Field(default_factory=list, description="浓度比例因子")
    concentration_factor_b: List[float] = Field(default_factory=list, description="浓度偏移因子")


class CalculationParameters(SQLModel):
    """计算参数"""
    hours: float = Field(gt=0, le=1000, default=4.0, description="模拟时间 (小时)")
    steps_per_hour: int = Field(gt=0, le=1000, default=60, description="每小时步数")
    solver_method: SolverMethod = Field(default=SolverMethod.scipy_solver, description="ODE求解器方法")
    tolerance: float = Field(gt=0, le=1e-3, default=1e-6, description="求解精度")
    max_iterations: int = Field(gt=0, le=100000, default=1000, description="最大迭代次数")
    max_memory_mb: int = Field(gt=0, le=10000, default=1000, description="最大内存使用 (MB)")
    sampling_interval_hours: Optional[float] = Field(default=None, description="采样间隔 (小时)，用于数据存储优化")


# Input model for Material Balance calculation
class MaterialBalanceInput(SQLModel):
    """物料平衡计算输入数据模型"""
    nodes: List[NodeData] = Field(description="节点数据列表")
    edges: List[EdgeData] = Field(description="边数据列表")
    parameters: CalculationParameters = Field(description="计算参数")
    original_flowchart_data: Optional[Dict[str, Any]] = Field(default=None, description="原始流程图数据，用于保留原始参数名称")
    
    @validator('nodes')
    def validate_nodes(cls, v):
        if len(v) < 2:
            raise ValueError("At least 2 nodes are required")
        
        # Check for at least one inlet
        if not any(node.is_inlet for node in v):
            raise ValueError("At least one inlet node is required")
        
        # Check for unique node IDs
        node_ids = [node.node_id for node in v]
        if len(node_ids) != len(set(node_ids)):
            raise ValueError("Node IDs must be unique")
        
        return v
    
    @validator('edges')
    def validate_edges(cls, v, values):
        if 'nodes' not in values:
            return v
        
        nodes = values['nodes']
        node_ids = {node.node_id for node in nodes}
        
        # Check edge references
        for edge in v:
            if edge.source_node_id not in node_ids:
                raise ValueError(f"Edge {edge.edge_id} references unknown source node {edge.source_node_id}")
            if edge.target_node_id not in node_ids:
                raise ValueError(f"Edge {edge.edge_id} references unknown target node {edge.target_node_id}")
        
        # Check for unique edge IDs
        edge_ids = [edge.edge_id for edge in v]
        if len(edge_ids) != len(set(edge_ids)):
            raise ValueError("Edge IDs must be unique")
        
        return v


# Result models for Material Balance calculation
class MaterialBalanceResult(SQLModel):
    """物料平衡计算结果"""
    job_id: str = Field(description="计算任务ID")
    status: MaterialBalanceJobStatus = Field(description="计算状态")
    timestamps: List[float] = Field(description="时间点数组 (小时)")
    node_data: Dict[str, Dict[str, List[float]]] = Field(
        description="节点时间序列数据 {node_id: {parameter: [values]}}"
    )
    edge_data: Dict[str, Dict[str, List[float]]] = Field(
        description="边时间序列数据 {edge_id: {parameter: [values]}}"
    )
    summary: Dict[str, Any] = Field(description="计算摘要信息")
    error_message: Optional[str] = Field(default=None, description="错误信息")


class MaterialBalanceResultSummary(SQLModel):
    """物料平衡计算结果摘要"""
    job_id: str = Field(description="计算任务ID")
    status: MaterialBalanceJobStatus = Field(description="计算状态")
    total_time: Optional[float] = Field(default=None, description="总模拟时间 (小时)")
    total_steps: int = Field(description="总步数")
    calculation_time_seconds: float = Field(description="计算耗时 (秒)")
    convergence_status: str = Field(description="收敛状态")
    final_mass_balance_error: Optional[float] = Field(default=None, description="最终质量平衡误差")
    final_total_volume: float = Field(description="最终总体积")
    solver_method: Optional[str] = Field(default=None, description="求解器方法")
    error_message: Optional[str] = Field(default=None, description="错误信息")


class MaterialBalanceTimeSeriesQuery(SQLModel):
    """时间序列数据查询参数"""
    start_time: Optional[float] = Field(default=None, description="开始时间 (小时)")
    end_time: Optional[float] = Field(default=None, description="结束时间 (小时)")
    page: int = Field(default=1, ge=1, description="页码")
    page_size: int = Field(default=100, ge=1, le=1000, description="每页数据量")
    node_ids: Optional[List[str]] = Field(default=None, description="指定节点ID列表")
    edge_ids: Optional[List[str]] = Field(default=None, description="指定边ID列表")


class MaterialBalanceTimeSeriesResponse(SQLModel):
    """时间序列数据响应"""
    job_id: str = Field(description="计算任务ID")
    timestamps: List[float] = Field(description="当前页时间点数组")
    node_data: Dict[str, Dict[str, List[float]]] = Field(description="节点时间序列数据")
    edge_data: Dict[str, Dict[str, List[float]]] = Field(description="边时间序列数据")
    pagination: Dict[str, Any] = Field(description="分页信息")


# Database model for Material Balance Job
class MaterialBalanceJob(SQLModel, table=True):
    """物料平衡计算任务数据库模型"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    job_id: str = Field(unique=True, index=True, description="任务唯一标识符")
    job_name: str = Field(description="任务名称，格式：流程图名称+年月日时分")
    status: MaterialBalanceJobStatus = Field(default=MaterialBalanceJobStatus.pending, description="任务状态")
    input_data: dict = Field(sa_column=Column(JSON), description="输入数据")
    result_data: Optional[dict] = Field(default=None, sa_column=Column(JSON), description="计算结果")
    summary_data: Optional[dict] = Field(default=None, sa_column=Column(JSON), description="计算摘要数据，用于快速查询和显示")
    error_message: Optional[str] = Field(default=None, description="错误信息")
    created_at: datetime = Field(default_factory=datetime.now, description="创建时间")
    started_at: Optional[datetime] = Field(default=None, description="开始计算时间")
    completed_at: Optional[datetime] = Field(default=None, description="完成时间")
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: User | None = Relationship(back_populates="material_balance_jobs")


# Public models for API responses
class MaterialBalanceJobPublic(SQLModel):
    """物料平衡任务公开信息"""
    id: uuid.UUID
    job_id: str
    job_name: str
    status: MaterialBalanceJobStatus
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    error_message: Optional[str]


class MaterialBalanceJobsPublic(SQLModel):
    """物料平衡任务列表"""
    data: List[MaterialBalanceJobPublic]
    count: int


# Validation request model
class MaterialBalanceValidationRequest(SQLModel):
    """物料平衡参数验证请求"""
    input_data: MaterialBalanceInput = Field(description="待验证的输入数据")


class MaterialBalanceValidationResponse(SQLModel):
    """物料平衡参数验证响应"""
    is_valid: bool = Field(description="是否有效")
    errors: List[str] = Field(default_factory=list, description="验证错误列表")
    warnings: List[str] = Field(default_factory=list, description="警告信息列表")
    estimated_memory_mb: float = Field(description="预估内存使用 (MB)")
    estimated_time_seconds: float = Field(description="预估计算时间 (秒)")


class MaterialBalanceJobInputDataResponse(SQLModel):
    """物料平衡任务输入数据响应"""
    job_id: str = Field(description="计算任务ID")
    input_data: Dict[str, Any] = Field(description="输入数据")
    result_data: Dict[str, Any] = Field(description="计算结果数据")
    status: MaterialBalanceJobStatus = Field(description="任务状态")


# ============================================================================
# ASM1slim 相关模型 - 复用物料平衡的数据模型，只定义任务状态枚举
# ============================================================================

# ASM1slim复用MaterialBalanceJobStatus枚举，不再定义独立的状态枚举


# ASM1slim复用物料平衡的数据模型：
# - NodeData (包含asm1slim_parameters字段)
# - EdgeData 
# - CalculationParameters
# - MaterialBalanceInput (作为ASM1SlimInput)
# - MaterialBalanceResult (作为ASM1SlimResult)
# - MaterialBalanceResultSummary (作为ASM1SlimResultSummary)
# - MaterialBalanceTimeSeriesQuery (作为ASM1SlimTimeSeriesQuery)
# - MaterialBalanceTimeSeriesResponse (作为ASM1SlimTimeSeriesResponse)


# ============================================================================
# ASM1slim 数据库表模型
# ============================================================================

# ASM1slim流程图数据表
class ASM1SlimFlowChart(SQLModel, table=True):
    """ASM1slim流程图数据表"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(min_length=1, max_length=255, description="流程图名称")
    description: Optional[str] = Field(default=None, max_length=1000, description="流程图描述")
    flow_data: dict = Field(sa_column=Column(JSON), description="完整的流程图数据，包括节点、边和配置")
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: User | None = Relationship(back_populates="asm1slim_flowcharts")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


# ASM1slim计算任务表
class ASM1SlimJob(SQLModel, table=True):
    """ASM1slim计算任务表"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    job_id: str = Field(unique=True, index=True, description="任务唯一标识符")
    job_name: str = Field(description="任务名称，格式：流程图名称+年月日时分")
    status: MaterialBalanceJobStatus = Field(default=MaterialBalanceJobStatus.pending, description="任务状态")
    input_data: dict = Field(sa_column=Column(JSON), description="输入数据")
    result_data: Optional[dict] = Field(default=None, sa_column=Column(JSON), description="计算结果")
    summary_data: Optional[dict] = Field(default=None, sa_column=Column(JSON), description="计算摘要数据，用于快速查询和显示")
    error_message: Optional[str] = Field(default=None, description="错误信息")
    created_at: datetime = Field(default_factory=datetime.now, description="创建时间")
    started_at: Optional[datetime] = Field(default=None, description="开始计算时间")
    completed_at: Optional[datetime] = Field(default=None, description="完成时间")
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: User | None = Relationship(back_populates="asm1slim_jobs")


# ============================================================================
# ASM1slim 公开模型和API响应模型
# ============================================================================

# ASM1slim流程图公开模型
class ASM1SlimFlowChartBase(SQLModel):
    """ASM1slim流程图基础模型"""
    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=1000)


class ASM1SlimFlowChartCreate(ASM1SlimFlowChartBase):
    """创建ASM1slim流程图请求"""
    flow_data: dict = Field(description="完整的流程图数据")


class ASM1SlimFlowChartUpdate(ASM1SlimFlowChartBase):
    """更新ASM1slim流程图请求"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    flow_data: Optional[dict] = Field(default=None, description="完整的流程图数据")


class ASM1SlimFlowChartPublic(ASM1SlimFlowChartBase):
    """ASM1slim流程图公开信息"""
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    flow_data: dict


class ASM1SlimFlowChartsPublic(SQLModel):
    """ASM1slim流程图列表"""
    data: List[ASM1SlimFlowChartPublic]
    count: int


# ASM1slim任务公开模型
class ASM1SlimJobPublic(SQLModel):
    """ASM1slim任务公开信息"""
    id: uuid.UUID
    job_id: str
    job_name: str
    status: MaterialBalanceJobStatus
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    error_message: Optional[str]
    result_data: Optional[Dict[str, Any]] = Field(default=None, description="计算结果数据")


class ASM1SlimJobsPublic(SQLModel):
    """ASM1slim任务列表"""
    data: List[ASM1SlimJobPublic]
    count: int


# ASM1slim验证请求 - 复用物料平衡的输入模型
class ASM1SlimValidationRequest(SQLModel):
    """ASM1slim输入数据验证请求"""
    input_data: MaterialBalanceInput = Field(description="待验证的输入数据")


class ASM1SlimValidationResponse(SQLModel):
    """ASM1slim参数验证响应"""
    is_valid: bool = Field(description="是否有效")
    errors: List[str] = Field(default_factory=list, description="验证错误列表")
    warnings: List[str] = Field(default_factory=list, description="警告信息列表")
    estimated_memory_mb: float = Field(description="预估内存使用 (MB)")
    estimated_time_seconds: float = Field(description="预估计算时间 (秒)")


class ASM1SlimJobInputDataResponse(SQLModel):
    """ASM1slim任务输入数据响应"""
    job_id: str = Field(description="计算任务ID")
    input_data: Dict[str, Any] = Field(description="输入数据")
    result_data: Dict[str, Any] = Field(description="计算结果数据")
    status: MaterialBalanceJobStatus = Field(description="任务状态")

# ============================================================================
# ASM1 相关模型 - 复用物料平衡的数据模型，只定义任务状态枚举
# ============================================================================

# ASM1复用MaterialBalanceJobStatus枚举，不再定义独立的状态枚举


# ASM1复用物料平衡的数据模型：
# - NodeData (包含asm1_parameters字段)
# - EdgeData 
# - CalculationParameters
# - MaterialBalanceInput (作为ASM1Input)
# - MaterialBalanceResult (作为ASM1Result)
# - MaterialBalanceResultSummary (作为ASM1ResultSummary)
# - MaterialBalanceTimeSeriesQuery (作为ASM1TimeSeriesQuery)
# - MaterialBalanceTimeSeriesResponse (作为ASM1TimeSeriesResponse)

# ============================================================================
# ASM1 数据库表模型
# ============================================================================

# ASM1流程图数据表
class ASM1FlowChart(SQLModel, table=True):
    """ASM1流程图数据表"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(min_length=1, max_length=255, description="流程图名称")
    description: Optional[str] = Field(default=None, max_length=1000, description="流程图描述")
    flow_data: dict = Field(sa_column=Column(JSON), description="完整的流程图数据，包括节点、边和配置")
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: User | None = Relationship(back_populates="asm1_flowcharts")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


# ASM1计算任务表
class ASM1Job(SQLModel, table=True):
    """ASM1计算任务表"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    job_id: str = Field(unique=True, index=True, description="任务唯一标识符")
    job_name: str = Field(description="任务名称，格式：流程图名称+年月日时分")
    status: MaterialBalanceJobStatus = Field(default=MaterialBalanceJobStatus.pending, description="任务状态")
    input_data: dict = Field(sa_column=Column(JSON), description="输入数据")
    result_data: Optional[dict] = Field(default=None, sa_column=Column(JSON), description="计算结果")
    summary_data: Optional[dict] = Field(default=None, sa_column=Column(JSON), description="计算摘要数据，用于快速查询和显示")
    error_message: Optional[str] = Field(default=None, description="错误信息")
    created_at: datetime = Field(default_factory=datetime.now, description="创建时间")
    started_at: Optional[datetime] = Field(default=None, description="开始计算时间")
    completed_at: Optional[datetime] = Field(default=None, description="完成时间")
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: User | None = Relationship(back_populates="asm1_jobs")


# ============================================================================
# ASM1 公开模型和API响应模型
# ============================================================================

# ASM1流程图公开模型
class ASM1FlowChartBase(SQLModel):
    """ASM1流程图基础模型"""
    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=1000)


class ASM1FlowChartCreate(ASM1FlowChartBase):
    """创建ASM1流程图请求"""
    flow_data: dict = Field(description="完整的流程图数据")


class ASM1FlowChartUpdate(ASM1FlowChartBase):
    """更新ASM1流程图请求"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=1000)
    flow_data: Optional[dict] = Field(default=None, description="完整的流程图数据")


class ASM1FlowChartPublic(ASM1FlowChartBase):
    """ASM1流程图公开信息"""
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    flow_data: dict


class ASM1FlowChartsPublic(SQLModel):
    """ASM1流程图列表"""
    data: List[ASM1FlowChartPublic] = Field(default_factory=list)
    count: int


# ASM1任务公开模型
class ASM1JobPublic(SQLModel):
    """ASM1任务公开信息"""
    id: uuid.UUID
    job_id: str
    job_name: str
    status: MaterialBalanceJobStatus
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    error_message: Optional[str]
    result_data: Optional[Dict[str, Any]] = Field(default=None, description="计算结果数据")


class ASM1JobsPublic(SQLModel):
    """ASM1任务列表"""
    data: List[ASM1JobPublic]
    count: int


# ASM1验证请求 - 复用物料平衡的输入模型
class ASM1ValidationRequest(SQLModel):
    """ASM1输入数据验证请求"""
    input_data: MaterialBalanceInput = Field(description="待验证的输入数据")


class ASM1ValidationResponse(SQLModel):
    """ASM1参数验证响应"""
    is_valid: bool = Field(description="是否有效")
    errors: List[str] = Field(default_factory=list, description="验证错误列表")
    warnings: List[str] = Field(default_factory=list, description="警告信息列表")
    estimated_memory_mb: float = Field(description="预估内存使用 (MB)")
    estimated_time_seconds: float = Field(description="预估计算时间 (秒)")


class ASM1JobInputDataResponse(SQLModel):
    """ASM1任务输入数据响应"""
    job_id: str = Field(description="计算任务ID")
    input_data: Dict[str, Any] = Field(description="输入数据")
    result_data: Dict[str, Any] = Field(description="计算结果数据")
    status: MaterialBalanceJobStatus = Field(description="任务状态")


# ============ ASM3 Models ============

# ASM3流程图模型
class ASM3FlowChart(SQLModel, table=True):
    """ASM3流程图数据库模型"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(min_length=1, max_length=255, description="流程图名称")
    description: Optional[str] = Field(default=None, max_length=1000, description="流程图描述")
    flow_data: dict = Field(sa_column=Column(JSON), description="完整的流程图数据，包括节点、边和配置")
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: User | None = Relationship(back_populates="asm3_flowcharts")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


# ASM3任务模型
class ASM3Job(SQLModel, table=True):
    """ASM3计算任务数据库模型"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    job_id: str = Field(unique=True, index=True, description="任务唯一标识符")
    job_name: str = Field(description="任务名称，格式：流程图名称+年月日时分")
    status: MaterialBalanceJobStatus = Field(default=MaterialBalanceJobStatus.pending, description="任务状态")
    input_data: dict = Field(sa_column=Column(JSON), description="输入数据")
    result_data: Optional[dict] = Field(default=None, sa_column=Column(JSON), description="计算结果")
    summary_data: Optional[dict] = Field(default=None, sa_column=Column(JSON), description="计算摘要数据，用于快速查询和显示")
    error_message: Optional[str] = Field(default=None, description="错误信息")
    created_at: datetime = Field(default_factory=datetime.now, description="创建时间")
    started_at: Optional[datetime] = Field(default=None, description="开始计算时间")
    completed_at: Optional[datetime] = Field(default=None, description="完成时间")
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: User | None = Relationship(back_populates="asm3_jobs")


# ASM3流程图基础模型
class ASM3FlowChartBase(SQLModel):
    """ASM3流程图基础模型"""
    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=1000)


class ASM3FlowChartCreate(ASM3FlowChartBase):
    """ASM3流程图创建模型"""
    flow_data: dict = Field(description="完整的流程图数据")


class ASM3FlowChartUpdate(ASM3FlowChartBase):
    """ASM3流程图更新模型"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=1000)
    flow_data: Optional[dict] = Field(default=None, description="完整的流程图数据")


class ASM3FlowChartPublic(ASM3FlowChartBase):
    """ASM3流程图公开模型"""
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    flow_data: dict


class ASM3FlowChartsPublic(SQLModel):
    """ASM3流程图列表"""
    data: List[ASM3FlowChartPublic] = Field(default_factory=list)
    count: int


# ASM3任务公开模型
class ASM3JobPublic(SQLModel):
    """ASM3任务公开模型"""
    id: uuid.UUID
    job_id: str
    job_name: str
    status: MaterialBalanceJobStatus
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    error_message: Optional[str]
    result_data: Optional[Dict[str, Any]] = Field(default=None, description="计算结果数据")


class ASM3JobsPublic(SQLModel):
    """ASM3任务列表"""
    data: List[ASM3JobPublic]
    count: int


# ASM3验证请求 - 复用物料平衡的输入模型
class ASM3ValidationRequest(SQLModel):
    """ASM3输入数据验证请求"""
    input_data: MaterialBalanceInput = Field(description="待验证的输入数据")


class ASM3ValidationResponse(SQLModel):
    """ASM3参数验证响应"""
    is_valid: bool = Field(description="是否有效")
    errors: List[str] = Field(default_factory=list, description="验证错误列表")
    warnings: List[str] = Field(default_factory=list, description="警告信息列表")
    estimated_memory_mb: float = Field(description="预估内存使用 (MB)")
    estimated_time_seconds: float = Field(description="预估计算时间 (秒)")


class ASM3JobInputDataResponse(SQLModel):
    """ASM3任务输入数据响应"""
    job_id: str = Field(description="计算任务ID")
    input_data: Dict[str, Any] = Field(description="输入数据")
    result_data: Dict[str, Any] = Field(description="计算结果数据")
    status: MaterialBalanceJobStatus = Field(description="任务状态")


# ============================================================================
# UDM 相关模型
# ============================================================================


class UDMScaleType(str, Enum):
    """UDM参数缩放类型"""
    lin = "lin"
    log = "log"


class UDMComponentDefinition(SQLModel):
    """UDM组分定义"""
    name: str = Field(min_length=1, max_length=120, description="组分唯一标识")
    label: Optional[str] = Field(default=None, max_length=120, description="组分显示名称")
    unit: Optional[str] = Field(default=None, max_length=60, description="组分单位")
    default_value: Optional[float] = Field(default=None, description="组分默认初值")
    is_fixed: bool = Field(default=False, description="是否冻结该组分变化（dC/dt=0）")


class UDMParameterDefinition(SQLModel):
    """UDM参数定义"""
    name: str = Field(min_length=1, max_length=120, description="参数唯一标识")
    unit: Optional[str] = Field(default=None, max_length=60, description="参数单位")
    default_value: Optional[float] = Field(default=None, description="参数默认值")
    min_value: Optional[float] = Field(default=None, description="参数最小值")
    max_value: Optional[float] = Field(default=None, description="参数最大值")
    scale: UDMScaleType = Field(default=UDMScaleType.lin, description="参数缩放类型")
    note: Optional[str] = Field(default=None, max_length=500, description="参数备注")


class UDMProcessDefinition(SQLModel):
    """UDM过程定义"""
    name: str = Field(min_length=1, max_length=120, description="过程名称")
    rate_expr: str = Field(min_length=1, description="过程速率表达式")
    stoich_expr: Dict[str, str] = Field(default_factory=dict, description="计量系数表达式映射，key=component.name")
    stoich: Dict[str, float] = Field(default_factory=dict, description="计量系数映射，key=component.name")
    note: Optional[str] = Field(default=None, max_length=500, description="过程备注")


class UDMModelBase(SQLModel):
    """UDM模型基础信息"""
    name: str = Field(min_length=1, max_length=255, description="模型名称")
    description: Optional[str] = Field(default=None, max_length=2000, description="模型描述")
    tags: List[str] = Field(default_factory=list, description="模型标签")


class UDMModelDefinitionDraft(UDMModelBase):
    """UDM模型草稿定义"""
    components: List[UDMComponentDefinition] = Field(default_factory=list, description="组分定义")
    parameters: List[UDMParameterDefinition] = Field(default_factory=list, description="参数定义")
    processes: List[UDMProcessDefinition] = Field(default_factory=list, description="过程定义")
    meta: Optional[Dict[str, Any]] = Field(default=None, description="扩展元信息")


class UDMModelCreate(UDMModelDefinitionDraft):
    """创建UDM模型请求"""
    seed_source: Optional[str] = Field(default=None, max_length=60, description="模板来源")


class UDMModelUpdate(SQLModel):
    """更新UDM模型请求"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=2000)
    tags: Optional[List[str]] = Field(default=None)
    components: Optional[List[UDMComponentDefinition]] = Field(default=None)
    parameters: Optional[List[UDMParameterDefinition]] = Field(default=None)
    processes: Optional[List[UDMProcessDefinition]] = Field(default=None)
    meta: Optional[Dict[str, Any]] = Field(default=None)
    is_published: Optional[bool] = Field(default=None, description="是否发布")


class UDMModelCreateFromTemplate(SQLModel):
    """通过模板创建UDM模型请求"""
    template_key: str = Field(min_length=1, max_length=60, description="模板标识")
    name: Optional[str] = Field(default=None, max_length=255, description="可选覆盖模型名")
    description: Optional[str] = Field(default=None, max_length=2000, description="可选覆盖模型描述")


class UDMValidationIssue(SQLModel):
    """UDM校验项"""
    code: str = Field(description="错误/警告编码")
    message: str = Field(description="错误/警告消息")
    process: Optional[str] = Field(default=None, description="关联过程")


class UDMValidationResponse(SQLModel):
    """UDM模型定义校验响应"""
    ok: bool = Field(description="是否通过校验")
    errors: List[UDMValidationIssue] = Field(default_factory=list, description="错误列表")
    warnings: List[UDMValidationIssue] = Field(default_factory=list, description="警告列表")
    extracted_parameters: List[str] = Field(default_factory=list, description="从表达式提取的参数名")


class UDMModel(SQLModel, table=True):
    """UDM模型主表（稳定ID）"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(min_length=1, max_length=255, description="模型名称")
    description: Optional[str] = Field(default=None, max_length=2000, description="模型描述")
    tags: List[str] = Field(default_factory=list, sa_column=Column(JSON), description="模型标签")
    current_version: int = Field(default=1, ge=1, description="当前版本号")
    is_published: bool = Field(default=False, description="是否发布")
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: User | None = Relationship(back_populates="udm_models")
    versions: List["UDMModelVersion"] = Relationship(back_populates="model", cascade_delete=True)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class UDMModelVersion(SQLModel, table=True):
    """UDM模型版本表（可复现快照）"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    model_id: uuid.UUID = Field(
        foreign_key="udmmodel.id", nullable=False, ondelete="CASCADE"
    )
    version: int = Field(ge=1, description="版本号")
    content_hash: str = Field(max_length=128, index=True, description="内容哈希")
    components: List[Dict[str, Any]] = Field(default_factory=list, sa_column=Column(JSON), description="组分快照")
    parameters: List[Dict[str, Any]] = Field(default_factory=list, sa_column=Column(JSON), description="参数快照")
    processes: List[Dict[str, Any]] = Field(default_factory=list, sa_column=Column(JSON), description="过程快照")
    meta: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON), description="元信息快照")
    validation_ok: bool = Field(default=True, description="是否通过校验")
    validation_errors: List[Dict[str, Any]] = Field(default_factory=list, sa_column=Column(JSON), description="校验错误")
    seed_source: Optional[str] = Field(default=None, max_length=60, description="模板来源")
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: User | None = Relationship(back_populates="udm_model_versions")
    model: UDMModel | None = Relationship(back_populates="versions")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class UDMModelPublic(UDMModelBase):
    """UDM模型公开信息"""
    id: uuid.UUID
    current_version: int
    is_published: bool
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class UDMModelsPublic(SQLModel):
    """UDM模型列表响应"""
    data: List[UDMModelPublic] = Field(default_factory=list)
    count: int


class UDMModelVersionPublic(SQLModel):
    """UDM模型版本公开信息"""
    id: uuid.UUID
    model_id: uuid.UUID
    version: int
    content_hash: str
    components: List[Dict[str, Any]] = Field(default_factory=list)
    parameters: List[Dict[str, Any]] = Field(default_factory=list)
    processes: List[Dict[str, Any]] = Field(default_factory=list)
    meta: Optional[Dict[str, Any]] = Field(default=None)
    validation_ok: bool
    validation_errors: List[Dict[str, Any]] = Field(default_factory=list)
    seed_source: Optional[str]
    created_at: datetime
    updated_at: datetime


class UDMModelDetailPublic(UDMModelPublic):
    """UDM模型详情响应"""
    latest_version: Optional[UDMModelVersionPublic] = Field(default=None)
    versions: List[UDMModelVersionPublic] = Field(default_factory=list)


class UDMFlowChart(SQLModel, table=True):
    """UDM流程图数据库模型"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(min_length=1, max_length=255, description="流程图名称")
    description: Optional[str] = Field(default=None, max_length=1000, description="流程图描述")
    flow_data: dict = Field(sa_column=Column(JSON), description="完整的流程图数据，包括节点、边和配置")
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: User | None = Relationship(back_populates="udm_flowcharts")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class UDMFlowChartBase(SQLModel):
    """UDM流程图基础模型"""
    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=1000)


class UDMFlowChartCreate(UDMFlowChartBase):
    """创建UDM流程图请求"""
    flow_data: dict = Field(description="完整的流程图数据")


class UDMFlowChartUpdate(UDMFlowChartBase):
    """更新UDM流程图请求"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=1000)
    flow_data: Optional[dict] = Field(default=None, description="完整的流程图数据")


class UDMFlowChartPublic(UDMFlowChartBase):
    """UDM流程图公开信息"""
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    flow_data: dict


class UDMFlowChartsPublic(SQLModel):
    """UDM流程图列表响应"""
    data: List[UDMFlowChartPublic] = Field(default_factory=list)
    count: int


class UDMJob(SQLModel, table=True):
    """UDM计算任务数据库模型"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    job_id: str = Field(unique=True, index=True, description="任务唯一标识符")
    job_name: str = Field(description="任务名称，格式：流程图名称+年月日时分")
    status: MaterialBalanceJobStatus = Field(default=MaterialBalanceJobStatus.pending, description="任务状态")
    input_data: dict = Field(sa_column=Column(JSON), description="输入数据")
    result_data: Optional[dict] = Field(default=None, sa_column=Column(JSON), description="计算结果")
    summary_data: Optional[dict] = Field(default=None, sa_column=Column(JSON), description="计算摘要数据")
    error_message: Optional[str] = Field(default=None, description="错误信息")
    created_at: datetime = Field(default_factory=datetime.now, description="创建时间")
    started_at: Optional[datetime] = Field(default=None, description="开始计算时间")
    completed_at: Optional[datetime] = Field(default=None, description="完成时间")
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: User | None = Relationship(back_populates="udm_jobs")


class UDMJobPublic(SQLModel):
    """UDM任务公开信息"""
    id: uuid.UUID
    job_id: str
    job_name: str
    status: MaterialBalanceJobStatus
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    error_message: Optional[str]
    result_data: Optional[Dict[str, Any]] = Field(default=None, description="计算结果数据")


class UDMJobsPublic(SQLModel):
    """UDM任务列表"""
    data: List[UDMJobPublic]
    count: int


class UDMJobInputDataResponse(SQLModel):
    """UDM任务输入数据响应"""
    job_id: str = Field(description="计算任务ID")
    input_data: Dict[str, Any] = Field(description="输入数据")
    result_data: Dict[str, Any] = Field(description="计算结果数据")
    status: MaterialBalanceJobStatus = Field(description="任务状态")



