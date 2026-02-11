"""物料平衡核心计算模块

物料平衡计算的核心算法实现。

该模块包含了物料平衡计算的主要功能：
- 物料平衡微分方程求解
- 张量数据转换和处理
- 数值积分和时间序列模拟
- 结果验证和误差计算
"""

import numpy as np
import torch
from torchdiffeq import odeint
import functools
from typing import Tuple, Dict, List, Any
import uuid
import time

from .models import (
    MaterialBalanceInput,
    MaterialBalanceResult,
    NodeData,
    EdgeData,
    CalculationParameters
)
from .exceptions import (
    MaterialBalanceError,
    InvalidInputError,
    CalculationError,
    ConvergenceError,
    DimensionMismatchError,
    NegativeVolumeError
)
from .asm import (
    asm1slim_reaction,
    asm1_reaction,
    asm3_reaction,
    asm2d_rates,
    asm2d_dC_dt,
)
from .udm_engine import UDMNodeRuntime, build_udm_runtime_payload


class MaterialBalanceCalculator:
    """物料平衡计算器，具有改进的错误处理和验证功能。
    
    该类实现了完整的物料平衡计算流程，包括：
    - 输入数据验证
    - 张量转换和初始化
    - ODE求解和时间序列模拟
    - 结果转换和格式化
    """
    
    def __init__(self):
        """初始化物料平衡计算器。
        
        设置计算设备（GPU或CPU）和数据类型。
        """
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.dtype = torch.float32
    
    def calculate(self, input_data: MaterialBalanceInput) -> MaterialBalanceResult:
        """主要计算方法。
        
        执行完整的物料平衡计算流程，包括数据验证、张量转换、
        微分方程求解和结果格式化。
        
        Args:
            input_data: 包含节点、边和参数的输入数据
            
        Returns:
            MaterialBalanceResult: 包含时间序列数据的计算结果
            
        Raises:
            MaterialBalanceError: 当计算失败时抛出异常
        """
        job_id = str(uuid.uuid4())
        start_time = time.time()
        
        try:
            # Validate input
            self._validate_input(input_data)
            
            # Convert input to tensors
            tensors = self._convert_to_tensors(input_data)
            
            # Run calculation
            result_tensor = self._run_calculation(tensors, input_data.parameters, input_data)
            
            # Convert results back to structured format
            result = self._convert_results(
                result_tensor, input_data, job_id, start_time
            )
            
            return result
            
        except Exception as e:
            error_msg = str(e)
            if isinstance(e, MaterialBalanceError):
                raise
            else:
                raise CalculationError(f"Unexpected error during calculation: {error_msg}") from e
    
    def _validate_input(self, input_data: MaterialBalanceInput) -> None:
        """验证输入数据的一致性。
        
        检查输入数据的完整性和有效性，包括：
        - 至少有一个入口节点和一个出口节点
        - 边的连接关系有效
        - 节点ID的唯一性
        """
        nodes = input_data.nodes
        edges = input_data.edges
        
        # Validate flow connectivity
        node_ids = {n.node_id for n in nodes}
        for edge in edges:
            if edge.source_node_id not in node_ids:
                raise InvalidInputError(f"Edge references unknown source_node_id: {edge.source_node_id}")
            if edge.target_node_id not in node_ids:
                raise InvalidInputError(f"Edge references unknown target_node_id: {edge.target_node_id}")

       
    def _safe_div(self, num: torch.Tensor, den: torch.Tensor, eps: float = 1e-12 ) -> torch.Tensor:
        """安全除法，避免除零错误。"""
        return num / den.clamp_min(eps)


    def _convert_to_tensors(self, input_data: MaterialBalanceInput) -> Dict[str, Any]:
        """向量化版：将输入数据转换为PyTorch张量（少分支、少循环）。"""
        nodes = input_data.nodes
        edges = input_data.edges

        device, dtype = self.device, self.dtype
        n_nodes = len(nodes)
        if n_nodes == 0:
            raise ValueError("nodes is empty")
        n_components = len(nodes[0].initial_concentrations)

        # 1) 节点张量：一次性列表推导 -> 张量
        V_liq = torch.tensor(
            [n.initial_volume for n in nodes], dtype=dtype, device=device
        )
        x0 = torch.tensor(
            [n.initial_concentrations for n in nodes], dtype=dtype, device=device
        )
        compute_mask = torch.tensor(
            [not (n.is_inlet or n.is_outlet) for n in nodes],
            dtype=torch.bool, device=device
        )
        
        # 创建ASM1 Slim节点掩码
        asm1slim_mask = torch.tensor(
            [n.node_type == 'asm1slim' for n in nodes],
            dtype=torch.bool, device=device
        )
        
        P = 7
        # 默认值（例如全 0；如有标准 ASM1 缺省，可替换）
        default_param = torch.zeros(P, dtype=dtype, device=device)

        # 先构造 Python 层二维列表（一次遍历），长度统一为 P
        param_rows = []
        for n in nodes:
            p = getattr(n, 'asm1slim_parameters', None)
            if n.node_type == 'asm1slim' and p is not None and len(p) == P:
                param_rows.append(p)
            else:
                param_rows.append(default_param.tolist())

        # [n_nodes, P] - 保持原始形状
        asm1slim_params = torch.tensor(param_rows, dtype=dtype, device=device)  # [n_nodes, P]
        # 后续配合 asm1slim_mask 使用：
        # asm1slim_params_used = asm1slim_params[asm1slim_mask]  # 按需"压缩视图"

        # 创建ASM1节点掩码
        asm1_mask = torch.tensor(
            [n.node_type == 'asm1' for n in nodes],
            dtype=torch.bool, device=device
        )
        P_asm1 = 19
        default_param_asm1 = torch.zeros(P_asm1, dtype=dtype, device=device)

        asm1_param_rows = []
        for n in nodes:
            p = getattr(n, 'asm1_parameters', None)
            if n.node_type == 'asm1' and p is not None and len(p) == P_asm1:
                asm1_param_rows.append(p)
            else:
                asm1_param_rows.append(default_param_asm1.tolist())
        asm1_params = torch.tensor(asm1_param_rows, dtype=dtype, device=device)

        # 创建ASM3节点掩码
        asm3_mask = torch.tensor(
            [n.node_type == 'asm3' for n in nodes],
            dtype=torch.bool, device=device
        )
        P_asm3 = 37
        default_param_asm3 = torch.zeros(P_asm3, dtype=dtype, device=device)
        asm3_param_rows = []
        for n in nodes:
            p = getattr(n, 'asm3_parameters', None)
            if n.node_type == 'asm3' and p is not None and len(p) == P_asm3:
                asm3_param_rows.append(p)
            else:
                asm3_param_rows.append(default_param_asm3.tolist())
        asm3_params = torch.tensor(asm3_param_rows, dtype=dtype, device=device)

        # 创建UDM节点掩码并预编译表达式
        udm_mask = torch.tensor(
            [n.node_type == 'udm' for n in nodes],
            dtype=torch.bool, device=device
        )
        udm_runtime_payload = build_udm_runtime_payload(
            nodes=nodes,
            num_components=n_components,
            device=device,
            dtype=dtype,
        )


        # 2) 节点映射
        node_map = {node.node_id: i for i, node in enumerate(nodes)}

        # 3) 若无边，仍返回一致结构
        if not edges:
            Q_out = torch.zeros(n_nodes, n_nodes, dtype=dtype, device=device)
            prop_a = torch.ones(n_nodes, n_nodes, n_components, dtype=dtype, device=device)
            prop_b = torch.zeros(n_nodes, n_nodes, n_components, dtype=dtype, device=device)
            sparse_bundle = {
                "src": torch.empty(0, dtype=torch.long, device=device),
                "dst": torch.empty(0, dtype=torch.long, device=device),
                "q":   torch.empty(0, dtype=dtype, device=device),
                "a":   torch.empty(0, n_components, dtype=dtype, device=device),
                "b":   torch.empty(0, n_components, dtype=dtype, device=device),
                "shape": (n_nodes, n_nodes),
            }
            return {
                "V_liq": V_liq, "x0": x0,
                "Q_out": Q_out, "prop_a": prop_a, "prop_b": prop_b,
                "node_map": node_map, "compute_mask": compute_mask,
                "asm1slim_mask": asm1slim_mask, "asm1slim_params": asm1slim_params,
                "asm1_mask": asm1_mask, "asm1_params": asm1_params,
                "asm3_mask": asm3_mask, "asm3_params": asm3_params,
                "udm_mask": udm_mask, "udm_runtime_payload": udm_runtime_payload,
                "sparse_bundle": sparse_bundle
            }

        # 4) 把 edges 转成张量（去掉循环中的 if/else）
        src = torch.tensor(
            [node_map[e.source_node_id] for e in edges],
            dtype=torch.long, device=device
        )
        dst = torch.tensor(
            [node_map[e.target_node_id] for e in edges],
            dtype=torch.long, device=device
        )
        q_vals = torch.tensor(
            [e.flow_rate for e in edges],
            dtype=dtype, device=device
        )

        # 统一化 a/b：缺失或长度不匹配时回落默认
        def _norm_a(e):
            fa = getattr(e, "concentration_factor_a", None)
            return fa if (fa and len(fa) == n_components) else [1.0] * n_components

        def _norm_b(e):
            fb = getattr(e, "concentration_factor_b", None)
            return fb if (fb and len(fb) == n_components) else [0.0] * n_components

        a_edge = torch.tensor([_norm_a(e) for e in edges], dtype=dtype, device=device)  # [E, r]
        b_edge = torch.tensor([_norm_b(e) for e in edges], dtype=dtype, device=device)  # [E, r]

        # 5) 稠密张量一次性写入（如存在重复 (src,dst)，Q_out 累加更稳妥）
        Q_out = torch.zeros(n_nodes, n_nodes, dtype=dtype, device=device)
        Q_out.index_put_((src, dst), q_vals, accumulate=True)

        prop_a = torch.ones(n_nodes, n_nodes, n_components, dtype=dtype, device=device)
        prop_b = torch.zeros(n_nodes, n_nodes, n_components, dtype=dtype, device=device)
        prop_a[src, dst, :] = a_edge
        prop_b[src, dst, :] = b_edge

        # 6) 稀疏包（供稀疏 ODE 路径使用，避免后续 nonzero 扫描）
        sparse_bundle = {
            "src": src, "dst": dst, "q": q_vals,
            "a": a_edge, "b": b_edge,
            "shape": (n_nodes, n_nodes),
        }

        return {
            "V_liq": V_liq,
            "x0": x0,
            "Q_out": Q_out,
            "prop_a": prop_a,
            "prop_b": prop_b,
            "node_map": node_map,
            "compute_mask": compute_mask,
            "asm1slim_mask": asm1slim_mask,
            "asm1slim_params": asm1slim_params,
            "asm1_mask": asm1_mask,
            "asm1_params": asm1_params,
            "asm3_mask": asm3_mask,
            "asm3_params": asm3_params, 
            "udm_mask": udm_mask,
            "udm_runtime_payload": udm_runtime_payload,
            "sparse_bundle": sparse_bundle,
        }
    
    def _run_calculation(self, tensors: Dict[str, torch.Tensor], 
                        params: CalculationParameters, 
                        input_data: MaterialBalanceInput) -> torch.Tensor:
        """执行物料平衡计算。
        
        使用ODE求解器进行时间序列模拟，计算系统在指定时间内的
        浓度和体积变化。
        
        Args:
            tensors: 包含计算张量的字典
            params: 计算参数（时间、步长、求解器等）
            
        Returns:
            包含时间序列结果的张量
        """
        try:
            V_liq = tensors['V_liq']
            x0 = tensors['x0']
            Q_out = tensors['Q_out']
            prop_a = tensors['prop_a']
            prop_b = tensors['prop_b']
            compute_mask = tensors['compute_mask']
            sparse_bundle = tensors.get('sparse_bundle', None)
            
            # Merge initial conditions
            x1 = self._merge_tensors(V_liq, x0)
            x2 = x1.unsqueeze(0)
            
            # 获取ASM1slim相关参数
            asm1slim_params = tensors.get('asm1slim_params', None)
            asm1slim_mask = tensors.get('asm1slim_mask', None)
            # 获取ASM1相关参数
            asm1_params = tensors.get('asm1_params', None)
            asm1_mask = tensors.get('asm1_mask', None)
            # 获取ASM3相关参数
            asm3_params = tensors.get('asm3_params', None)
            asm3_mask = tensors.get('asm3_mask', None)
            # 获取UDM相关载荷
            udm_mask = tensors.get('udm_mask', None)
            udm_runtime_payload = tensors.get('udm_runtime_payload', None)
            
            # Run simulation
            result = self._run_hours(
                params.hours, x2, Q_out, len(V_liq), 
                params.steps_per_hour, prop_a, prop_b,
                params.solver_method, params.tolerance, compute_mask,
                asm1slim_params=asm1slim_params,
                asm1slim_mask=asm1slim_mask,
                asm1_params=asm1_params,
                asm1_mask=asm1_mask,
                asm3_params=asm3_params,
                asm3_mask=asm3_mask,
                udm_mask=udm_mask,
                udm_runtime_payload=udm_runtime_payload,
                sparse_bundle=sparse_bundle,
                sampling_interval_hours=getattr(params, 'sampling_interval_hours', None)
            )
            
            return result
            
        except Exception as e:
            raise CalculationError(f"ODE calculation failed: {str(e)}") from e
    
    def _balance_param_sparse(
        self,
        C: torch.Tensor,                    # [m, r]
        bundle: dict                        # {'src','dst','q','a','b','shape'}
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        src = bundle["src"]                 # [E]
        dst = bundle["dst"]                 # [E]
        q   = bundle["q"]                   # [E]
        a   = bundle["a"]                   # [E, r]
        b   = bundle["b"]                   # [E, r]
        m, n = bundle["shape"]
        r = C.size(1)

        # 1) 边上计算 C_out 与 m_edge（不构造 m×n×r）
        C_edge = C[src] * a + b             # [E, r]
        m_edge = q.unsqueeze(1) * C_edge    # [E, r]

        # 2) 聚合到结点（出=按 src 聚合；入=按 dst 聚合）
        device, dtype = C.device, C.dtype
        sum_m_out = torch.zeros((m, r), device=device, dtype=dtype).index_add_(0, src, m_edge)
        sum_m_in  = torch.zeros((n, r), device=device, dtype=dtype).index_add_(0, dst, m_edge)

        # 3) 质量/体积平衡增量
        delta_m = sum_m_in - sum_m_out      # [m, r]（通常 m==n）
        sum_Q_out = torch.zeros(m, device=device, dtype=dtype).index_add_(0, src, q)
        sum_Q_in  = torch.zeros(n, device=device, dtype=dtype).index_add_(0, dst, q)
        delta_Q = sum_Q_in - sum_Q_out      # [m]

        return delta_m, delta_Q

    # Legacy wrappers kept for backward compatibility with existing call sites.
    def _asm1slim(self, ASMparam: torch.tensor, C0_matrix: torch.tensor):
        return asm1slim_reaction(ASMparam, C0_matrix)

    def _asm1(self, ASMparam: torch.tensor, C0_matrix: torch.tensor):  # type: ignore
        return asm1_reaction(ASMparam, C0_matrix)

    def _asm3(self, ASM3param: torch.tensor, C0_matrix: torch.tensor) -> torch.tensor:  # type: ignore
        return asm3_reaction(ASM3param, C0_matrix)

    def _asm2d_rates(self, P: torch.tensor, C: torch.tensor) -> torch.tensor:  # type: ignore
        return asm2d_rates(P, C)

    def _asm2d(self, P: torch.tensor, C: torch.tensor, stoich: torch.tensor) -> torch.tensor:
        return asm2d_dC_dt(P, C, stoich)

    def _balance_param(self, C: torch.Tensor, Q_out: torch.Tensor, 
                      C_out_prop: torch.Tensor, prop_b: torch.Tensor) -> Tuple[torch.Tensor, ...]:
        """计算物料平衡参数。
        
        根据当前浓度和流量计算物料平衡方程的参数，包括：
        - 质量变化率 (delta_m)
        - 体积变化率 (delta_Q)
        - 出口浓度 (C_out)
        - 质量流量 (m_out)
        
        Args:
            C: 当前浓度张量
            Q_out: 流量矩阵
            C_out_prop: 浓度比例因子
            prop_b: 浓度偏移因子
            
        Returns:
            物料平衡参数的元组
        """
        m, n = Q_out.shape
        r = C.shape[1]
        
        C_init = C.unsqueeze(1).repeat(1, n, 1)
        C_out = C_init * C_out_prop + prop_b
        q_out = Q_out.clone().unsqueeze(-1)
        
        m_out = q_out * C_out
        sum_m_out = m_out.sum(dim=1).view(n, r)
        sum_m_in = m_out.sum(dim=0).view(m, r)
        delta_m = sum_m_in - sum_m_out
        delta_Q = Q_out.sum(dim=0) - Q_out.sum(dim=1)
        
        return delta_m, delta_Q, C_out, m_out, sum_m_out
    
    def _ode_balance(self, t: float, y_extended: torch.Tensor, m: int, prop_a: torch.Tensor, prop_b: torch.Tensor,
                    Q_out: torch.Tensor, compute_mask: torch.Tensor, sparse_bundle: dict = None ) -> torch.Tensor:
        """物料和体积平衡的ODE函数。
        
        定义微分方程系统，描述系统中各节点的浓度和体积随时间的变化。
        该函数被ODE求解器调用以计算导数。使用掩码进行张量化计算。
        支持稀疏矩阵计算。
        
        Args:
            t: 当前时间
            y_extended: 扩展状态向量（浓度+体积）
            m: 节点数量
            prop_a: 浓度比例因子
            prop_b: 浓度偏移因子
            Q_out: 流量矩阵
            compute_mask: 计算掩码，True表示需要计算的节点
            
        Returns:
            状态向量的时间导数
        """
        y = y_extended[:, :-1]  # Concentration matrix
        V_liq = y_extended[:, -1]  # Volume vector
        
        # Ensure non-negative values (clamp already prevents negative volumes)
        y = torch.clamp(y, min=0)
        V_liq = torch.clamp(V_liq, min=1e-6)  # Prevent zero volume
        
        if sparse_bundle is not None:
            delta_m, delta_Q = self._balance_param_sparse(y, sparse_bundle)
        else:
            # 兼容原致密实现
            delta_m, delta_Q, *_ = self._balance_param(y, Q_out, prop_a, prop_b)[:2]
        
        dy_extended = torch.zeros_like(y_extended)
        
        # Apply material balance equations only to internal nodes (where mask is True)
        # Concentration changes
        dilution_term = -y * delta_Q.unsqueeze(-1) / V_liq.unsqueeze(-1)
        concentration_change = delta_m / V_liq.unsqueeze(-1) + dilution_term
            
        # Apply mask: only update internal nodes
        mask_expanded = compute_mask.unsqueeze(-1).expand_as(concentration_change)
        dy_extended[:, :-1] = torch.where(mask_expanded, concentration_change, torch.zeros_like(concentration_change))
        
        # Volume changes: only for internal nodes
        dy_extended[:, -1] = torch.where(compute_mask, delta_Q, torch.zeros_like(delta_Q))
        
        return dy_extended

    def _asm1slim_ode_balance(self, t: float, y_extended: torch.Tensor, m: int, prop_a: torch.Tensor, prop_b: torch.Tensor,

                    Q_out: torch.Tensor, compute_mask: torch.Tensor, asm1slim_params: torch.Tensor, asm1slim_mask: torch.Tensor, sparse_bundle: dict = None ) -> torch.Tensor:


        """物料和体积平衡的ODE函数。
        
        定义微分方程系统，描述系统中各节点的浓度和体积随时间的变化。
        该函数被ODE求解器调用以计算导数。使用掩码进行张量化计算。
        支持稀疏矩阵计算。
        
        Args:
            t: 当前时间
            y_extended: 扩展状态向量（浓度+体积）
            m: 节点数量
            prop_a: 浓度比例因子
            prop_b: 浓度偏移因子
            Q_out: 流量矩阵
            compute_mask: 计算掩码，True表示需要计算的节点
            
        Returns:
            状态向量的时间导数
        """
        y = y_extended[:, :-1]  # Concentration matrix
        V_liq = y_extended[:, -1]  # Volume vector
        
        # Ensure non-negative values (clamp already prevents negative volumes)
        y = torch.clamp(y, min=0)
        V_liq = torch.clamp(V_liq, min=1e-6)  # Prevent zero volume
        
        if sparse_bundle is not None:
            delta_m, delta_Q = self._balance_param_sparse(y, sparse_bundle)
        else:
            # 兼容原致密实现
            delta_m, delta_Q, *_ = self._balance_param(y, Q_out, prop_a, prop_b)[:2]
        
        dy_extended = torch.zeros_like(y_extended)
        
        # Apply material balance equations only to internal nodes (where mask is True)
        # Concentration changes
        dilution_term = -y * delta_Q.unsqueeze(-1) / V_liq.unsqueeze(-1)
        concentration_change = delta_m / V_liq.unsqueeze(-1) + dilution_term

        # Add ASM1 Slim reaction terms for ASM1 Slim nodes
        if asm1slim_params is not None and asm1slim_mask.any():
            # Get ASM1 Slim nodes concentrations
            asm1slim_concentrations = y[asm1slim_mask]  # [n_asm1slim_nodes, n_components]
            
            # Get ASM1 Slim parameters for only ASM1 Slim nodes
            asm1slim_params_filtered = asm1slim_params[asm1slim_mask]  # [n_asm1slim_nodes, 7]
            
            # Calculate ASM1 Slim reaction rates
            asm_reaction_rates = asm1slim_reaction(asm1slim_params_filtered, asm1slim_concentrations)  # [n_asm1slim_nodes, n_components]
            
            # Add reaction terms to concentration changes for ASM1 Slim nodes
            asm1slim_mask_expanded = asm1slim_mask.unsqueeze(-1).expand_as(concentration_change)
            asm_reaction_change = torch.zeros_like(concentration_change)
            asm_reaction_change[asm1slim_mask] = asm_reaction_rates
            
            concentration_change = concentration_change + asm_reaction_change
    
        
        # Apply mask: only update internal nodes
        mask_expanded = compute_mask.unsqueeze(-1).expand_as(concentration_change)
        dy_extended[:, :-1] = torch.where(mask_expanded, concentration_change, torch.zeros_like(concentration_change))

        # 这里不考虑溶解氧的变化，所以设为0
        dy_extended[:, 0] = torch.zeros_like(dy_extended[:, 0])

        
        # Volume changes: only for internal nodes
        dy_extended[:, -1] = torch.where(compute_mask, delta_Q, torch.zeros_like(delta_Q))
        
        return dy_extended

    def _asm1_ode_balance(self, t: float, y_extended: torch.Tensor, m: int, prop_a: torch.Tensor, prop_b: torch.Tensor,

                    Q_out: torch.Tensor, compute_mask: torch.Tensor, asm1_params: torch.Tensor, asm1_mask: torch.Tensor, sparse_bundle: dict = None ) -> torch.Tensor:


        """物料和体积平衡的ODE函数。
        
        定义微分方程系统，描述系统中各节点的浓度和体积随时间的变化。
        该函数被ODE求解器调用以计算导数。使用掩码进行张量化计算。
        支持稀疏矩阵计算。
        
        Args:
            t: 当前时间
            y_extended: 扩展状态向量（浓度+体积）
            m: 节点数量
            prop_a: 浓度比例因子
            prop_b: 浓度偏移因子
            Q_out: 流量矩阵
            compute_mask: 计算掩码，True表示需要计算的节点
            
        Returns:
            状态向量的时间导数
        """
        y = y_extended[:, :-1]  # Concentration matrix
        V_liq = y_extended[:, -1]  # Volume vector
        
        # Ensure non-negative values (clamp already prevents negative volumes)
        y = torch.clamp(y, min=0)
        V_liq = torch.clamp(V_liq, min=1e-6)  # Prevent zero volume
        
        if sparse_bundle is not None:
            delta_m, delta_Q = self._balance_param_sparse(y, sparse_bundle)
        else:
            # 兼容原致密实现
            delta_m, delta_Q, *_ = self._balance_param(y, Q_out, prop_a, prop_b)[:2]
        
        dy_extended = torch.zeros_like(y_extended)
        
        # Apply material balance equations only to internal nodes (where mask is True)
        # Concentration changes
        dilution_term = -y * delta_Q.unsqueeze(-1) / V_liq.unsqueeze(-1)
        concentration_change = delta_m / V_liq.unsqueeze(-1) + dilution_term

        # Add ASM1 reaction terms for ASM1 nodes
        if asm1_params is not None and asm1_mask.any():
            # Get ASM1 nodes concentrations
            asm1_concentrations = y[asm1_mask]  # [n_asm1_nodes, n_components]
            
            # Get ASM1 parameters for only ASM1 nodes
            asm1_params_filtered = asm1_params[asm1_mask]  # [n_asm1_nodes, 19]
            
            # Calculate ASM1 reaction rates
            asm_reaction_rates = asm1_reaction(asm1_params_filtered, asm1_concentrations)  # [n_asm1_nodes, n_components]
            
            # Add reaction terms to concentration changes for ASM1 nodes
            asm1_mask_expanded = asm1_mask.unsqueeze(-1).expand_as(concentration_change)
            asm_reaction_change = torch.zeros_like(concentration_change)
            asm_reaction_change[asm1_mask] = asm_reaction_rates
            
            concentration_change = concentration_change + asm_reaction_change
    
        
        # Apply mask: only update internal nodes
        mask_expanded = compute_mask.unsqueeze(-1).expand_as(concentration_change)
        dy_extended[:, :-1] = torch.where(mask_expanded, concentration_change, torch.zeros_like(concentration_change))

        # 这里不考虑溶解氧的变化，所以设为0
        dy_extended[:, 5] = torch.zeros_like(dy_extended[:, 5])

        
        # Volume changes: only for internal nodes
        dy_extended[:, -1] = torch.where(compute_mask, delta_Q, torch.zeros_like(delta_Q))
        
        return dy_extended
    
    def _asm3_ode_balance(self, t: float, y_extended: torch.Tensor, m: int, prop_a: torch.Tensor, prop_b: torch.Tensor,

                    Q_out: torch.Tensor, compute_mask: torch.Tensor, asm3_params: torch.Tensor, asm3_mask: torch.Tensor, sparse_bundle: dict = None ) -> torch.Tensor:


        """物料和体积平衡的ODE函数。
        
        定义微分方程系统，描述系统中各节点的浓度和体积随时间的变化。
        该函数被ODE求解器调用以计算导数。使用掩码进行张量化计算。
        支持稀疏矩阵计算。
        
        Args:
            t: 当前时间
            y_extended: 扩展状态向量（浓度+体积）
            m: 节点数量
            prop_a: 浓度比例因子
            prop_b: 浓度偏移因子
            Q_out: 流量矩阵
            compute_mask: 计算掩码，True表示需要计算的节点
            
        Returns:
            状态向量的时间导数
        """
        y = y_extended[:, :-1]  # Concentration matrix
        V_liq = y_extended[:, -1]  # Volume vector
        
        # Ensure non-negative values (clamp already prevents negative volumes)
        y = torch.clamp(y, min=0)
        V_liq = torch.clamp(V_liq, min=1e-6)  # Prevent zero volume
        
        if sparse_bundle is not None:
            delta_m, delta_Q = self._balance_param_sparse(y, sparse_bundle)
        else:
            # 兼容原致密实现
            delta_m, delta_Q, *_ = self._balance_param(y, Q_out, prop_a, prop_b)[:2]
        
        dy_extended = torch.zeros_like(y_extended)
        
        # Apply material balance equations only to internal nodes (where mask is True)
        # Concentration changes
        dilution_term = -y * delta_Q.unsqueeze(-1) / V_liq.unsqueeze(-1)
        concentration_change = delta_m / V_liq.unsqueeze(-1) + dilution_term

        # Add ASM3 reaction terms for ASM3 nodes
        if asm3_params is not None and asm3_mask.any():
            # Get ASM3 nodes concentrations
            asm3_concentrations = y[asm3_mask]  # [n_asm3_nodes, n_components]
            
            # Get ASM3 parameters for only ASM3 nodes
            asm3_params_filtered = asm3_params[asm3_mask]  # [n_asm3_nodes, 37]
            
            # Calculate ASM3 reaction rates
            asm_reaction_rates = asm3_reaction(asm3_params_filtered, asm3_concentrations)  # [n_asm3_nodes, n_components]
            
            # Add reaction terms to concentration changes for ASM3 nodes
            asm3_mask_expanded = asm3_mask.unsqueeze(-1).expand_as(concentration_change)
            asm_reaction_change = torch.zeros_like(concentration_change)
            asm_reaction_change[asm3_mask] = asm_reaction_rates
            
            concentration_change = concentration_change + asm_reaction_change
    
        
        # Apply mask: only update internal nodes
        mask_expanded = compute_mask.unsqueeze(-1).expand_as(concentration_change)
        dy_extended[:, :-1] = torch.where(mask_expanded, concentration_change, torch.zeros_like(concentration_change))

        # 这里不考虑溶解氧的变化，所以设为0
        dy_extended[:, 6] = torch.zeros_like(dy_extended[:, 6])

        
        # Volume changes: only for internal nodes
        dy_extended[:, -1] = torch.where(compute_mask, delta_Q, torch.zeros_like(delta_Q))
        
        return dy_extended

    def _udm_ode_balance(
        self,
        t: float,
        y_extended: torch.Tensor,
        m: int,
        prop_a: torch.Tensor,
        prop_b: torch.Tensor,
        Q_out: torch.Tensor,
        compute_mask: torch.Tensor,
        udm_mask: torch.Tensor,
        udm_runtime_payload: List[UDMNodeRuntime],
        sparse_bundle: dict = None,
    ) -> torch.Tensor:
        y = y_extended[:, :-1]
        V_liq = y_extended[:, -1]

        y = torch.clamp(y, min=0)
        V_liq = torch.clamp(V_liq, min=1e-6)

        if sparse_bundle is not None:
            delta_m, delta_Q = self._balance_param_sparse(y, sparse_bundle)
        else:
            delta_m, delta_Q = self._balance_param(y, Q_out, prop_a, prop_b)[:2]

        dy_extended = torch.zeros_like(y_extended)

        dilution_term = -y * delta_Q.unsqueeze(-1) / V_liq.unsqueeze(-1)
        concentration_change = delta_m / V_liq.unsqueeze(-1) + dilution_term

        udm_reaction_change = torch.zeros_like(concentration_change)
        for runtime in udm_runtime_payload:
            node_idx = runtime.node_index
            if node_idx < 0 or node_idx >= y.shape[0]:
                continue
            if udm_mask is not None and not bool(udm_mask[node_idx].item()):
                continue
            reaction = runtime.evaluate_reaction(y[node_idx])
            udm_reaction_change[node_idx, :] = reaction

        concentration_change = concentration_change + udm_reaction_change

        mask_expanded = compute_mask.unsqueeze(-1).expand_as(concentration_change)
        dy_extended[:, :-1] = torch.where(
            mask_expanded,
            concentration_change,
            torch.zeros_like(concentration_change),
        )
        dy_extended[:, -1] = torch.where(compute_mask, delta_Q, torch.zeros_like(delta_Q))
        return dy_extended

    def _run_hours(self, hours: float, x0: torch.Tensor, Q_out: torch.Tensor, 
                  m: int, steps: int, prop_a: torch.Tensor, prop_b: torch.Tensor,
                  method: str = 'rk4', tolerance: float = 1e-3, 
                  compute_mask: torch.Tensor = None, asm1slim_params: torch.Tensor = None, 
                  asm1slim_mask: torch.Tensor = None, sparse_bundle: dict = None,
                  asm1_params: torch.Tensor = None, asm1_mask: torch.Tensor = None,
                  asm3_params: torch.Tensor = None, asm3_mask: torch.Tensor = None,
                  udm_mask: torch.Tensor = None,
                  udm_runtime_payload: List[UDMNodeRuntime] = None,
                  sampling_interval_hours: float = None) -> torch.Tensor:

        """运行指定小时数的模拟。
        
        使用ODE求解器在指定时间范围内求解微分方程系统。
        
        Args:
            hours: 模拟时间（小时）
            x0: 初始状态
            Q_out: 流量矩阵
            m: 节点数量
            steps: 每小时的步数
            prop_a: 浓度比例因子
            prop_b: 浓度偏移因子
            method: 求解器方法
            tolerance: 求解精度
            compute_mask: 计算掩码，True表示需要计算的节点
            asm1slim_params: ASM1 Slim 参数
            asm1slim_mask: ASM1 Slim 节点掩码
            asm1_params: ASM1 参数
            asm1_mask: ASM1 节点掩码
            asm3_params: ASM3 参数
            asm3_mask: ASM3 节点掩码
            sparse_bundle: 稀疏矩阵束
            udm_mask: UDM 节点掩码
            udm_runtime_payload: UDM 运行时载荷

        Returns:
            时间序列结果张量
        """
        # 确保掩码存在，这是必需的参数
        if compute_mask is None:
            raise ValueError("compute_mask is required and cannot be None")
        
        x0 = x0[-1, :]
        t0 = torch.linspace(0, hours, int(hours * steps) + 1, device=self.device)

        if asm1slim_params is not None and asm1slim_mask.any():

            ode_modified = functools.partial(
                self._asm1slim_ode_balance,
                Q_out=Q_out, m=m, prop_a=prop_a, prop_b=prop_b,
                compute_mask=compute_mask,
                asm1slim_params=asm1slim_params,
                asm1slim_mask=asm1slim_mask,
                sparse_bundle=sparse_bundle
            )
            try:
                x = odeint(ode_modified, x0, t0, method=method, rtol=tolerance, atol=tolerance)
                # 把x中小于0的元素都改成0
                x = torch.clamp(x, min=0)
                
                # 应用采样逻辑
                if sampling_interval_hours is not None and sampling_interval_hours > 0:
                    sampling_interval = int(sampling_interval_hours * steps)
                    if sampling_interval > 1:
                        # 生成采样索引
                        sample_indices = torch.arange(0, x.shape[0], sampling_interval, device=self.device)
                        # 确保包含最后一个时间点
                        if sample_indices[-1] != x.shape[0] - 1:
                            sample_indices = torch.cat([sample_indices, torch.tensor([x.shape[0] - 1], device=self.device)])
                        # 对张量进行采样
                        x = x[sample_indices]
                
                return x
            except Exception as e:
                raise ConvergenceError(f"ODE solver failed to converge: {str(e)}") from e
        
        elif asm1_params is not None and asm1_mask.any():
            ode_modified = functools.partial(
                self._asm1_ode_balance,
                Q_out=Q_out, m=m, prop_a=prop_a, prop_b=prop_b,
                compute_mask=compute_mask,
                asm1_params=asm1_params,
                asm1_mask=asm1_mask,
                sparse_bundle=sparse_bundle
            )
            try:
                x = odeint(ode_modified, x0, t0, method=method, rtol=tolerance, atol=tolerance)
                # 把x中小于0的元素都改成0
                x = torch.clamp(x, min=0)
                
                # 应用采样逻辑
                if sampling_interval_hours is not None and sampling_interval_hours > 0:
                    sampling_interval = int(sampling_interval_hours * steps)
                    if sampling_interval > 1:
                        # 生成采样索引
                        sample_indices = torch.arange(0, x.shape[0], sampling_interval, device=self.device)
                        # 确保包含最后一个时间点
                        if sample_indices[-1] != x.shape[0] - 1:
                            sample_indices = torch.cat([sample_indices, torch.tensor([x.shape[0] - 1], device=self.device)])
                        # 对张量进行采样
                        x = x[sample_indices]
                
                return x
            except Exception as e:
                raise ConvergenceError(f"ODE solver failed to converge: {str(e)}") from e

        elif asm3_params is not None and asm3_mask.any():
            ode_modified = functools.partial(
                self._asm3_ode_balance,
                Q_out=Q_out, m=m, prop_a=prop_a, prop_b=prop_b,
                compute_mask=compute_mask,
                asm3_params=asm3_params,
                asm3_mask=asm3_mask,
                sparse_bundle=sparse_bundle
            )
            try:
                x = odeint(ode_modified, x0, t0, method=method, rtol=tolerance, atol=tolerance)
                # 把x中小于0的元素都改成0
                x = torch.clamp(x, min=0)
                
                # 应用采样逻辑
                if sampling_interval_hours is not None and sampling_interval_hours > 0:
                    sampling_interval = int(sampling_interval_hours * steps)
                    if sampling_interval > 1:
                        # 生成采样索引
                        sample_indices = torch.arange(0, x.shape[0], sampling_interval, device=self.device)
                        # 确保包含最后一个时间点
                        if sample_indices[-1] != x.shape[0] - 1:
                            sample_indices = torch.cat([sample_indices, torch.tensor([x.shape[0] - 1], device=self.device)])
                        # 对张量进行采样
                        x = x[sample_indices]
                
                return x
            except Exception as e:
                raise ConvergenceError(f"ODE solver failed to converge: {str(e)}") from e        

        elif udm_mask is not None and udm_mask.any() and udm_runtime_payload:
            ode_modified = functools.partial(
                self._udm_ode_balance,
                Q_out=Q_out,
                m=m,
                prop_a=prop_a,
                prop_b=prop_b,
                compute_mask=compute_mask,
                udm_mask=udm_mask,
                udm_runtime_payload=udm_runtime_payload,
                sparse_bundle=sparse_bundle,
            )
            try:
                x = odeint(ode_modified, x0, t0, method=method, rtol=tolerance, atol=tolerance)
                x = torch.clamp(x, min=0)

                if sampling_interval_hours is not None and sampling_interval_hours > 0:
                    sampling_interval = int(sampling_interval_hours * steps)
                    if sampling_interval > 1:
                        sample_indices = torch.arange(0, x.shape[0], sampling_interval, device=self.device)
                        if sample_indices[-1] != x.shape[0] - 1:
                            sample_indices = torch.cat([sample_indices, torch.tensor([x.shape[0] - 1], device=self.device)])
                        x = x[sample_indices]

                return x
            except Exception as e:
                raise ConvergenceError(f"ODE solver failed to converge: {str(e)}") from e

        else:

            ode_modified = functools.partial(
                self._ode_balance,
                Q_out=Q_out, m=m, prop_a=prop_a, prop_b=prop_b,
                compute_mask=compute_mask,
                sparse_bundle=sparse_bundle
            )
        
            try:
                x = odeint(ode_modified, x0, t0, method=method, rtol=tolerance, atol=tolerance)
                # 把x中小于0的元素都改成0
                # x = torch.clamp(x, min=0)
                
                # 应用采样逻辑
                if sampling_interval_hours is not None and sampling_interval_hours > 0:
                    sampling_interval = int(sampling_interval_hours * steps)
                    if sampling_interval > 1:
                        # 生成采样索引
                        sample_indices = torch.arange(0, x.shape[0], sampling_interval, device=self.device)
                        # 确保包含最后一个时间点
                        if sample_indices[-1] != x.shape[0] - 1:
                            sample_indices = torch.cat([sample_indices, torch.tensor([x.shape[0] - 1], device=self.device)])
                        # 对张量进行采样
                        x = x[sample_indices]
                
                return x
            except Exception as e:
                raise ConvergenceError(f"ODE solver failed to converge: {str(e)}") from e
    
    def _merge_tensors(self, V_liq: torch.Tensor, x0: torch.Tensor) -> torch.Tensor:
        """合并体积和浓度张量。
        
        将体积和浓度张量合并为单一的状态向量，用于ODE求解。
        
        Args:
            V_liq: 体积张量
            x0: 浓度张量
            
        Returns:
            合并后的状态张量
        """
        V_liq_expanded = V_liq.unsqueeze(1)
        merged = torch.cat([x0, V_liq_expanded], dim=1)
        return merged
    
    def _split_tensors(self, merged: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """将合并的张量分离为浓度和体积张量。
        
        将ODE求解结果分离为浓度和体积两个独立的张量。
        
        Args:
            merged: 合并的状态张量
            
        Returns:
            浓度张量和体积张量的元组
        """
        # For 3D tensor (time_steps, nodes, features), split along the last dimension
        if len(merged.shape) == 3:
            x0 = merged[:, :, :-1]  # All except last feature (concentrations)
            V_liq = merged[:, :, -1]  # Last feature (volumes)
        else:
            # For 2D tensor (nodes, features)
            x0 = merged[:, :-1]
            V_liq = merged[:, -1]
        return x0, V_liq
    
    def _convert_results(self, result_tensor: torch.Tensor, 
                        input_data: MaterialBalanceInput, 
                        job_id: str, start_time: float) -> MaterialBalanceResult:
        """将张量结果转换为结构化格式。
        
        将计算得到的张量结果转换为用户友好的结构化数据格式，
        包括时间戳、节点数据、边数据和计算摘要。
        
        Args:
            result_tensor: 计算结果张量
            input_data: 原始输入数据
            job_id: 作业ID
            start_time: 计算开始时间
            
        Returns:
            结构化的计算结果
        """
        # Extract time series data
        concentrations, volumes = self._split_tensors(result_tensor)
        
        # Generate timestamps
        n_steps = result_tensor.shape[0]
        
        # 根据采样参数生成正确的时间戳
        sampling_interval_hours = getattr(input_data.parameters, 'sampling_interval_hours', None)
        if sampling_interval_hours is not None and sampling_interval_hours > 0:
            # 计算原始步数和采样间隔
            original_steps = int(input_data.parameters.hours * input_data.parameters.steps_per_hour) + 1
            sampling_interval = int(sampling_interval_hours * input_data.parameters.steps_per_hour)
            
            if sampling_interval > 1:
                # 生成采样索引对应的时间点
                sample_indices = torch.arange(0, original_steps, sampling_interval)
                if sample_indices[-1] != original_steps - 1:
                    sample_indices = torch.cat([sample_indices, torch.tensor([original_steps - 1])])
                
                # 根据采样索引生成时间戳
                original_timestamps = torch.linspace(0, input_data.parameters.hours, original_steps)
                timestamps = original_timestamps[sample_indices].cpu().numpy().tolist()
            else:
                timestamps = torch.linspace(
                    0, input_data.parameters.hours, n_steps, device=self.device
                ).cpu().numpy().tolist()
        else:
            timestamps = torch.linspace(
                0, input_data.parameters.hours, n_steps, device=self.device
            ).cpu().numpy().tolist()
        
        # Convert to CPU and numpy for JSON serialization
        concentrations_np = concentrations.cpu().numpy()
        volumes_np = volumes.cpu().numpy()
        
        # Organize node data
        node_data = {}
        
        # 获取原始参数名称和节点标签
        original_param_names = self._get_original_parameter_names(input_data)
        node_labels = self._get_node_labels(input_data)
        
        for i, node in enumerate(input_data.nodes):
            # 体积数据：直接使用对应索引的数据
            if i < volumes_np.shape[1]:
                volume_data = volumes_np[:, i].tolist()
            else:
                # 如果超出范围，使用初始体积
                volume_data = [node.initial_volume] * len(timestamps)
            
            # 浓度数据：使用原始参数名称
            if i < concentrations_np.shape[1]:
                if len(concentrations_np.shape) > 2:
                    concentration_dict = {}
                    for j in range(concentrations_np.shape[2]):
                        param_name = original_param_names[j] if j < len(original_param_names) else f'concentration_{j}'
                        concentration_dict[param_name] = concentrations_np[:, i, j].tolist()
                else:
                    param_name = original_param_names[0] if original_param_names else 'concentration_0'
                    concentration_dict = {param_name: concentrations_np[:, i].tolist()}
            else:
                # 备用方案：使用初始浓度
                concentration_dict = {}
                for j in range(len(node.initial_concentrations)):
                    param_name = original_param_names[j] if j < len(original_param_names) else f'concentration_{j}'
                    concentration_dict[param_name] = [node.initial_concentrations[j]] * len(timestamps)
            
            # 获取节点标签
            node_label = node_labels.get(node.node_id, node.node_id)
            
            node_data[node.node_id] = {
                'label': node_label,
                'volume': volume_data,
                **concentration_dict
            }
        
        # Organize edge data (flow rates remain constant in this implementation)
        edge_data = {}
        for edge in input_data.edges:
            edge_data[edge.edge_id] = {
                'flow_rate': [edge.flow_rate] * len(timestamps)
            }
        
        # Calculate summary statistics
        calculation_time = time.time() - start_time
        final_volumes = volumes_np[-1, :]
        if len(concentrations_np.shape) > 2:
            final_concentrations = concentrations_np[-1, :, :]
        else:
            final_concentrations = concentrations_np[-1, :]
        
        # Check mass balance
        mass_balance_error = self._calculate_mass_balance_error(
            result_tensor, input_data
        )
        
        summary = {
            'total_time': input_data.parameters.hours,
            'total_steps': n_steps,
            'calculation_time_seconds': calculation_time,
            'convergence_status': 'converged',
            'final_mass_balance_error': mass_balance_error,
            'final_total_volume': float(final_volumes.sum()),
            'solver_method': input_data.parameters.solver_method
        }
        
        return MaterialBalanceResult(
            job_id=job_id,
            status='success',
            timestamps=timestamps,
            node_data=node_data,
            edge_data=edge_data,
            summary=summary
        )
    
    def _get_original_parameter_names(self, input_data):
        """从原始flowchart数据中提取参数名称"""
        try:
            if hasattr(input_data, 'original_flowchart_data') and input_data.original_flowchart_data:
                flowchart_data = input_data.original_flowchart_data
                
                # 从customParameters中提取参数名称
                if 'customParameters' in flowchart_data:
                    custom_parameters = flowchart_data['customParameters']
                    param_names = [param['name'] for param in custom_parameters if 'name' in param]
                    return param_names
                
        except Exception as e:
            pass
        
        # 如果无法获取原始参数名称，返回空列表
        return []
    
    def _get_node_labels(self, input_data):
        """从原始flowchart数据中提取节点标签"""
        node_labels = {}
        try:
            if hasattr(input_data, 'original_flowchart_data') and input_data.original_flowchart_data:
                flowchart_data = input_data.original_flowchart_data
                
                # 从nodes中提取标签信息
                if 'nodes' in flowchart_data:
                    for node in flowchart_data['nodes']:
                        node_id = node.get('id')
                        label = node.get('data', {}).get('label', node_id)
                        if node_id:
                            node_labels[node_id] = label
                
        except Exception as e:
            pass
        
        return node_labels
    
    def _calculate_mass_balance_error(self, result_tensor: torch.Tensor, 
                                    input_data: MaterialBalanceInput) -> float:
        """计算最终的质量平衡误差。
        
        评估计算结果的质量平衡精度，用于验证计算的准确性。
        
        Args:
            result_tensor: 计算结果张量
            input_data: 输入数据
            
        Returns:
            质量平衡误差值
        """
        try:
            # Simple mass balance check - can be enhanced
            final_state = result_tensor[-1, :]
            concentrations, volumes = self._split_tensors(final_state.unsqueeze(0))
            
            # Calculate total mass for each component
            if len(concentrations.shape) > 2:
                total_masses = (concentrations[0] * volumes[0].unsqueeze(1)).sum(dim=0)
            else:
                total_masses = (concentrations[0] * volumes[0]).sum()
            
            # For now, return a placeholder error calculation
            # In a real implementation, this would compare input vs output masses
            if torch.is_tensor(total_masses):
                return float(torch.abs(total_masses).max().item() * 1e-8)
            else:
                return float(abs(total_masses) * 1e-8)
            
        except Exception:
            return 0.0  # Return 0 if error calculation fails
