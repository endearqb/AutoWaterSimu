import math
import numpy as np
import torch
from typing import Any, Dict, List, Optional, Tuple

from app.models import (
    MaterialBalanceInput,
    MaterialBalanceTimeSeriesQuery,
    MaterialBalanceTimeSeriesResponse,
    NodeData,
    EdgeData,
    CalculationParameters,
)


NODETYPE_NAME_MAP = {
    'asmslim': 'asm1slim'
}


class DataConversionService:
    """
    数据转换服务：处理流程图JSON数据与PyTorch Tensor之间的转换
    """
    
    def convert_flowchart_to_material_balance_input(
        self,
        flowchart_data: Dict[str, Any],
        calculation_params: Optional[Dict[str, Any]] = None
    ) -> MaterialBalanceInput:
        """
        将前端流程图数据转换为MaterialBalanceInput格式
        
        Args:
            flowchart_data: 前端流程图数据，包含nodes, edges, customParameters等
            calculation_params: 可选的计算参数，如果不提供则使用默认值
            
        Returns:
            MaterialBalanceInput: 转换后的物料平衡输入数据
            
        Raises:
            ValueError: 当数据格式不正确或缺少必要信息时
        """
        try:
            # print("\n=== 数据转换服务开始处理 ===")
            
            # 提取数据
            nodes_data = flowchart_data.get('nodes', [])
            edges_data = flowchart_data.get('edges', [])
            custom_parameters = flowchart_data.get('customParameters', [])
            edge_parameter_configs = flowchart_data.get('edgeParameterConfigs', {})
            
            # print(f"提取到的数据: 节点{len(nodes_data)}个, 边{len(edges_data)}条, 自定义参数{len(custom_parameters)}个")
            
            if not nodes_data:
                raise ValueError("No nodes found in flowchart data")
            
            # 创建参数名称到索引的映射
            param_map = {param['name']: i for i, param in enumerate(custom_parameters)}
            num_components = len(custom_parameters) if custom_parameters else 1
            
            # print(f"参数映射: {param_map}")
            # print(f"组分数量: {num_components}")
            
            # 转换节点数据
            # print("\n=== 开始转换节点数据 ===")
            nodes = self._convert_nodes(
                nodes_data, param_map, num_components, custom_parameters
            )
            # print(f"成功转换{len(nodes)}个节点")
            
            # 转换边数据
            # print("\n=== 开始转换边数据 ===")
            edges = self._convert_edges(
                edges_data, param_map, num_components, custom_parameters
            )
            # print(f"成功转换{len(edges)}条边")
            
            # 创建计算参数 - 优先使用flowchart中的calculationParameters
            calc_params = flowchart_data.get('calculationParameters', {})
            if calculation_params:
                calc_params.update(calculation_params)
            parameters = self._create_calculation_parameters(calc_params)
            # print(f"计算参数: {parameters}")
            
            # print("\n=== 创建MaterialBalanceInput对象 ===")
            
            # 打印详细的输入数据用于调试
            # print(f"节点数据详情:")
            # for i, node in enumerate(nodes):
                # print(f"  节点{i+1}: id={node.node_id}, type={node.node_type}, is_inlet={node.is_inlet}, is_outlet={node.is_outlet}")
                # print(f"    volume={node.initial_volume}, concentrations={node.initial_concentrations}")
            
            # print(f"边数据详情:")
            # for i, edge in enumerate(edges):
                # print(f"  边{i+1}: id={edge.edge_id}, source={edge.source_node_id}, target={edge.target_node_id}")
                # print(f"    flow_rate={edge.flow_rate}, factor_a={edge.concentration_factor_a}, factor_b={edge.concentration_factor_b}")
            
            result = MaterialBalanceInput(
                nodes=nodes,
                edges=edges,
                parameters=parameters
            )
            
            # 保存原始flowchart数据以便在结果转换时使用
            result.original_flowchart_data = flowchart_data
            # print("MaterialBalanceInput对象创建成功")
            
            return result
            
        except Exception as e:
            # print(f"\n=== 数据转换失败 ===")
            # print(f"错误类型: {type(e).__name__}")
            # print(f"错误信息: {str(e)}")
            # import traceback
            # # print(f"错误堆栈: {traceback.format_exc()}")
            
            # # 如果是Pydantic验证错误，打印详细信息
            # if hasattr(e, 'errors'):
            #     # print(f"Pydantic验证错误详情:")
            #     for error in e.errors():
                    # print(f"  - 字段: {error.get('loc', 'unknown')}")
                    # print(f"    错误类型: {error.get('type', 'unknown')}")
                    # print(f"    错误信息: {error.get('msg', 'unknown')}")
                    # print(f"    输入值: {error.get('input', 'unknown')}")
            
            raise ValueError(f"Failed to convert flowchart data: {str(e)}")
    
    def _convert_nodes(
        self,
        nodes_data: List[Dict[str, Any]],
        param_map: Dict[str, int],
        num_components: int,
        custom_parameters: List[Dict[str, Any]]
    ) -> List[NodeData]:
        """
        转换节点数据
        """
        nodes = []
        
        for node_data in nodes_data:
            node_id = node_data['id']
            node_type = node_data.get('type', 'default')
            node_type = NODETYPE_NAME_MAP.get(node_type, node_type)
            data = node_data.get('data', {})
            udm_model_payload = node_data.get('udmModel') or data.get('udmModel') or {}
            udm_snapshot_payload = node_data.get('udmModelSnapshot') or data.get('udmModelSnapshot')
            udm_components_payload = node_data.get('udmComponents') or data.get('udmComponents')
            if not udm_components_payload and isinstance(udm_snapshot_payload, dict):
                udm_components_payload = udm_snapshot_payload.get('components')
            if not udm_components_payload and isinstance(udm_model_payload, dict):
                udm_components_payload = udm_model_payload.get('components')
            
            # 确定节点类型
            is_inlet = node_type == 'input'
            is_outlet = node_type == 'output'
            
            # 获取体积
            volume_str = data.get('volume', '1e-6')

            try:
                initial_volume = float(volume_str)
                # 确保体积不为负值或零
                if initial_volume <= 0:
                    initial_volume = 1e-6
            except (ValueError, TypeError):
                initial_volume = 1e-6  # 默认值
            
            # 构建初始浓度数组
            initial_concentrations = []
            
            if custom_parameters:
                for param in custom_parameters:
                    param_name = param['name']
                    # 从节点数据中获取参数值
                    param_value = data.get(param_name)
                    
                    if param_value is not None and param_value != "":
                        try:
                            concentration = float(param_value)
                        except (ValueError, TypeError):
                            concentration = float(param.get('defaultValue', 0.0))
                    else:
                        concentration = float(param.get('defaultValue', 0.0))
                    
                    initial_concentrations.append(concentration)
            else:
                # 如果没有自定义参数，使用默认的单组分系统
                if node_type == 'udm' and isinstance(udm_components_payload, list):
                    for component in udm_components_payload:
                        if not isinstance(component, dict):
                            continue
                        raw_default = component.get('default_value', component.get('defaultValue', 0.0))
                        try:
                            initial_concentrations.append(float(raw_default))
                        except (ValueError, TypeError):
                            initial_concentrations.append(0.0)
                if not initial_concentrations:
                    initial_concentrations = [1.0]
            
            # 获取节点位置信息
            position = node_data.get('position', {'x': 0, 'y': 0})
            
            # 处理ASM1 Slim参数（仅对asm1slim类型节点）
            asm1slim_parameters = None
            if node_type == 'asm1slim':
                # ASM1 Slim参数在节点根级别，不在data字段内
                asm1slim_params_data = node_data.get('asm1slimParameters', {})
                if asm1slim_params_data:
                    # ASM1 Slim参数顺序：[empiricalDenitrificationRate, empiricalNitrificationRate, empiricalCNRatio, codDenitrificationInfluence, nitrateDenitrificationInfluence, ammoniaNitrificationInfluence, aerobicCODDegradationRate]
                    param_names = [
                        'empiricalDenitrificationRate', 
                        'empiricalNitrificationRate', 
                        'empiricalCNRatio', 
                        'codDenitrificationInfluence', 
                        'nitrateDenitrificationInfluence', 
                        'ammoniaNitrificationInfluence', 
                        'aerobicCODDegradationRate'
                    ]
                    asm1slim_parameters = []
                    
                    for param_name in param_names:
                        param_value = asm1slim_params_data.get(param_name, 0.0)
                        try:
                            param_float = float(param_value)
                            asm1slim_parameters.append(param_float)
                        except (ValueError, TypeError):
                            asm1slim_parameters.append(0.0)
                    
                    # print(f"节点 {node_id} ASM1 Slim参数: {asm1slim_parameters}")
            # 处理ASM1参数（仅对asm1类型节点）
            asm1_parameters = None
            if node_type == 'asm1':
                # ASM1参数在节点根级别，不在data字段内
                asm1_params_data = node_data.get('asm1Parameters', {})
                if asm1_params_data:
                    # ASM1参数顺序：[u_H, K_S, K_OH, K_NO, n_g, b_H, u_A, K_NH, K_OA, b_A, Y_H, Y_A, i_XB, i_XP, f_P, n_h, K_a, K_h, K_x]
                    asm1_param_names = [
                        'u_H', 
                        'K_S', 
                        'K_OH', 
                        'K_NO', 
                        'n_g', 
                        'b_H', 
                        'u_A', 
                        'K_NH', 
                        'K_OA', 
                        'b_A', 
                        'Y_H', 
                        'Y_A', 
                        'i_XB', 
                        'i_XP', 
                        'f_P', 
                        'n_h', 
                        'K_a', 
                        'K_h', 
                        'K_x'
                    ]
                    asm1_parameters = []
                    
                    for asm1_param_name in asm1_param_names:
                        asm1_param_value = asm1_params_data.get(asm1_param_name, 0.0)
                        try:
                            asm1_param_float = float(asm1_param_value)
                            asm1_parameters.append(asm1_param_float)
                        except (ValueError, TypeError):
                            asm1_parameters.append(0.0)
                    # print(f"节点 {node_id} ASM1参数: {asm1_parameters}")
            
            # 处理ASM3参数（仅对asm3类型节点）
            asm3_parameters = None
            if node_type == 'asm3':
                # ASM3参数在节点根级别，不在data字段内
                asm3_params_data = node_data.get('asm3Parameters', {})
                if asm3_params_data:
                    # ASM3参数顺序：[k_H, K_X, k_STO, ny_NOX, K_O2, K_NOX, K_S, K_STO, mu_H, K_NH4, K_ALK, b_HO2, b_HNOX, b_STOO2, b_STONOX, mu_A, K_ANH4, K_AO2, K_AALK, b_AO2, b_ANOX, f_SI, Y_STOO2, Y_STONOX, Y_HO2, Y_HNOX, Y_A, f_XI, i_NSI, i_NSS, i_NXI, i_NXS, i_NBM, i_SSXI, i_SSXS, i_SSBM, i_SSSTO]
                    asm3_param_names = [
                        'k_H', 'K_X', 'k_STO', 'ny_NOX', 'K_O2', 'K_NOX', 'K_S', 'K_STO',
                        'mu_H', 'K_NH4', 'K_ALK', 'b_HO2', 'b_HNOX', 'b_STOO2', 'b_STONOX',
                        'mu_A', 'K_ANH4', 'K_AO2', 'K_AALK', 'b_AO2', 'b_ANOX', 'f_SI',
                        'Y_STOO2', 'Y_STONOX', 'Y_HO2', 'Y_HNOX', 'Y_A', 'f_XI',
                        'i_NSI', 'i_NSS', 'i_NXI', 'i_NXS', 'i_NBM',
                        'i_SSXI', 'i_SSXS', 'i_SSBM', 'i_SSSTO'
                    ]
                    asm3_parameters = []
                    
                    for asm3_param_name in asm3_param_names:
                        asm3_param_value = asm3_params_data.get(asm3_param_name, 0.0)
                        try:
                            asm3_param_float = float(asm3_param_value)
                            asm3_parameters.append(asm3_param_float)
                        except (ValueError, TypeError):
                            asm3_parameters.append(0.0)
                    # print(f"节点 {node_id} ASM3参数: {asm3_parameters}")
            
            # 澶勭悊UDM鍙傛暟锛堜粎瀵筺dm绫诲瀷鑺傜偣锛?
            udm_model_id = None
            udm_model_version = None
            udm_model_hash = None
            udm_component_names = None
            udm_processes = None
            udm_parameter_values = None
            udm_model_snapshot = None

            if node_type == 'udm':
                if isinstance(udm_model_payload, dict):
                    udm_model_id = (
                        udm_model_payload.get('id')
                        or udm_model_payload.get('modelId')
                        or node_data.get('udmModelId')
                        or data.get('udmModelId')
                    )
                    raw_version = (
                        udm_model_payload.get('version')
                        or udm_model_payload.get('currentVersion')
                        or node_data.get('udmModelVersion')
                        or data.get('udmModelVersion')
                    )
                    raw_hash = (
                        udm_model_payload.get('hash')
                        or udm_model_payload.get('contentHash')
                        or udm_model_payload.get('content_hash')
                        or node_data.get('udmModelHash')
                        or data.get('udmModelHash')
                    )
                    try:
                        if raw_version is not None and raw_version != "":
                            udm_model_version = int(raw_version)
                    except (ValueError, TypeError):
                        udm_model_version = None
                    if raw_hash is not None:
                        udm_model_hash = str(raw_hash)

                raw_component_names = node_data.get('udmComponentNames') or data.get('udmComponentNames')
                if isinstance(raw_component_names, list):
                    names = [str(item).strip() for item in raw_component_names if str(item).strip()]
                    if names:
                        udm_component_names = names

                if udm_component_names is None and isinstance(udm_components_payload, list):
                    names = []
                    for component in udm_components_payload:
                        if not isinstance(component, dict):
                            continue
                        raw_name = component.get('name')
                        if raw_name is None:
                            continue
                        name_str = str(raw_name).strip()
                        if name_str:
                            names.append(name_str)
                    if names:
                        udm_component_names = names

                raw_processes = node_data.get('udmProcesses') or data.get('udmProcesses')
                if raw_processes is None and isinstance(udm_snapshot_payload, dict):
                    raw_processes = udm_snapshot_payload.get('processes')
                if raw_processes is None and isinstance(udm_model_payload, dict):
                    raw_processes = udm_model_payload.get('processes')
                if isinstance(raw_processes, list):
                    processes = [item for item in raw_processes if isinstance(item, dict)]
                    if processes:
                        udm_processes = processes

                raw_param_values = (
                    node_data.get('udmParameters')
                    or node_data.get('udmParameterValues')
                    or data.get('udmParameters')
                    or data.get('udmParameterValues')
                )
                if raw_param_values is None and isinstance(udm_model_payload, dict):
                    raw_param_values = udm_model_payload.get('parameterValues')

                if isinstance(raw_param_values, dict):
                    normalized_params = {}
                    for key, value in raw_param_values.items():
                        try:
                            normalized_params[str(key)] = float(value)
                        except (ValueError, TypeError):
                            continue
                    if normalized_params:
                        udm_parameter_values = normalized_params

                if udm_parameter_values is None and isinstance(udm_model_payload, dict):
                    param_defs = udm_model_payload.get('parameters')
                    if isinstance(param_defs, list):
                        normalized_params = {}
                        for param in param_defs:
                            if not isinstance(param, dict):
                                continue
                            name = param.get('name')
                            if not name:
                                continue
                            raw_default = param.get('default_value', param.get('defaultValue'))
                            if raw_default is None:
                                continue
                            try:
                                normalized_params[str(name)] = float(raw_default)
                            except (ValueError, TypeError):
                                continue
                        if normalized_params:
                            udm_parameter_values = normalized_params

                if isinstance(udm_snapshot_payload, dict):
                    udm_model_snapshot = udm_snapshot_payload
                elif isinstance(udm_model_payload, dict):
                    snapshot = {}
                    for key in ('id', 'name', 'version', 'hash', 'components', 'parameters', 'processes', 'meta'):
                        if key in udm_model_payload:
                            snapshot[key] = udm_model_payload.get(key)
                    if snapshot:
                        udm_model_snapshot = snapshot

            node = NodeData(
                node_id=node_id,
                node_type=node_type,
                initial_volume=initial_volume,
                initial_concentrations=initial_concentrations,
                is_inlet=is_inlet,
                is_outlet=is_outlet,
                position=position,
                asm1slim_parameters=asm1slim_parameters,
                asm1_parameters=asm1_parameters,
                asm3_parameters=asm3_parameters,
                udm_model_id=udm_model_id,
                udm_model_version=udm_model_version,
                udm_model_hash=udm_model_hash,
                udm_component_names=udm_component_names,
                udm_processes=udm_processes,
                udm_parameter_values=udm_parameter_values,
                udm_model_snapshot=udm_model_snapshot,
            )
            nodes.append(node)
        
        return nodes
    
    def _convert_edges(
        self,
        edges_data: List[Dict[str, Any]],
        param_map: Dict[str, int],
        num_components: int,
        custom_parameters: List[Dict[str, Any]]
    ) -> List[EdgeData]:
        """
        转换边数据
        """
        edges = []
        
        for edge_data in edges_data:
            edge_id = edge_data['id']
            source_node_id = edge_data['source']
            target_node_id = edge_data['target']
            data = edge_data.get('data', {})
            
            # 获取流量 - 从data.flow字段获取
            flow_rate = data.get('flow', 1000.0)
            try:
                flow_rate = float(flow_rate)
            except (ValueError, TypeError):
                flow_rate = 1000.0  # 默认值
            
            # 构建浓度因子
            concentration_factor_a = []
            concentration_factor_b = []
            
            if custom_parameters:
                for param in custom_parameters:
                    param_name = param['name']
                    # 从边数据中获取浓度因子 - 使用param_name_a和param_name_b格式
                    param_a_key = f"{param_name}_a"
                    param_b_key = f"{param_name}_b"
                    
                    factor_a = data.get(param_a_key, 1.0)
                    factor_b = data.get(param_b_key, 0.0)
                    
                    try:
                        factor_a = float(factor_a)
                        factor_b = float(factor_b)
                    except (ValueError, TypeError):
                        factor_a = 1.0
                        factor_b = 0.0
                    
                    concentration_factor_a.append(factor_a)
                    concentration_factor_b.append(factor_b)
            else:
                # 默认单组分系统
                concentration_factor_a = [1.0]
                concentration_factor_b = [0.0]
            
            edge = EdgeData(
                edge_id=edge_id,
                source_node_id=source_node_id,
                target_node_id=target_node_id,
                flow_rate=flow_rate,
                concentration_factor_a=concentration_factor_a,
                concentration_factor_b=concentration_factor_b
            )
            edges.append(edge)
        
        return edges
    
    def _create_calculation_parameters(
        self,
        params: Optional[Dict[str, Any]] = None
    ) -> CalculationParameters:
        """
        创建计算参数
        """
        if params is None:
            params = {}
        
        return CalculationParameters(
            hours=params.get('hours', 4.0),
            steps_per_hour=params.get('steps_per_hour', 60),
            solver_method=params.get('solver_method', 'rk4'),
            tolerance=params.get('tolerance', 1e-3),
            max_iterations=params.get('max_iterations', 1000),
            max_memory_mb=params.get('max_memory_mb', 1024),
            sampling_interval_hours=params.get('sampling_interval_hours')
        )
    
    def validate_flowchart_data(
        self,
        flowchart_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        验证前端流程图数据的有效性
        
        Args:
            flowchart_data: 前端流程图数据
            
        Returns:
            Dict: 验证结果，包含is_valid, errors, warnings等
        """
        errors = []
        warnings = []
        
        try:
            # 检查基本结构
            nodes_data = flowchart_data.get('nodes', [])
            edges_data = flowchart_data.get('edges', [])
            
            if not nodes_data:
                errors.append("No nodes found in flowchart")
                return self._validation_error_response(errors)
            
            if len(nodes_data) < 2:
                errors.append("At least 2 nodes are required")
            
            # 检查节点类型
            node_types = [node.get('type', 'default') for node in nodes_data]
            has_inlet = 'input' in node_types
            has_outlet = 'output' in node_types
            
            if not has_inlet:
                warnings.append("No inlet (input) node found")
            if not has_outlet:
                warnings.append("No outlet (output) node found")
            
            # 检查节点ID唯一性
            node_ids = [node['id'] for node in nodes_data]
            if len(node_ids) != len(set(node_ids)):
                errors.append("Node IDs must be unique")
            
            # 检查边的连接
            node_id_set = set(node_ids)
            for edge in edges_data:
                source = edge.get('source')
                target = edge.get('target')
                
                if source not in node_id_set:
                    errors.append(f"Edge references unknown source node: {source}")
                if target not in node_id_set:
                    errors.append(f"Edge references unknown target node: {target}")
            
            # 检查数据完整性
            for node in nodes_data:
                data = node.get('data', {})
                if node.get('type') != 'output' and 'volume' not in data:
                    warnings.append(f"Node {node['id']} missing volume data")
            
            for edge in edges_data:
                data = edge.get('data', {})
                if 'label' not in data:
                    warnings.append(f"Edge {edge['id']} missing flow rate data")
            
            return {
                "is_valid": len(errors) == 0,
                "errors": errors,
                "warnings": warnings,
                "node_count": len(nodes_data),
                "edge_count": len(edges_data)
            }
            
        except Exception as e:
            errors.append(f"Validation error: {str(e)}")
            return self._validation_error_response(errors)
    
    def convert_input_to_calculation_format(
        self, 
        input_data: MaterialBalanceInput
    ) -> Dict[str, Any]:
        """
        将输入数据转换为计算格式
        """
        nodes = input_data.nodes
        edges = input_data.edges
        params = input_data.parameters
        
        # Create node mapping
        node_map = {node.node_id: i for i, node in enumerate(nodes)}
        num_nodes = len(nodes)
        
        # Determine number of components from first node
        num_components = len(nodes[0].initial_concentrations)
        
        # Initialize tensors
        V_liq = torch.zeros(num_nodes, dtype=torch.float32)
        x0 = torch.zeros(num_nodes, num_components, dtype=torch.float32)
        Q_out = torch.zeros(num_nodes, num_nodes, dtype=torch.float32)
        prop_a = torch.zeros(num_nodes, num_nodes, num_components, dtype=torch.float32)
        prop_b = torch.zeros(num_nodes, num_nodes, num_components, dtype=torch.float32)
        
        # Fill node data
        for i, node in enumerate(nodes):
            V_liq[i] = node.initial_volume
            
            # Ensure all nodes have the same number of components
            if len(node.initial_concentrations) != num_components:
                raise ValueError(
                    f"Node {node.node_id} has {len(node.initial_concentrations)} components, "
                    f"expected {num_components}"
                )
            
            for j, conc in enumerate(node.initial_concentrations):
                x0[i, j] = conc
        
        # Fill edge data
        for edge in edges:
            source_idx = node_map[edge.source_node_id]
            target_idx = node_map[edge.target_node_id]
            
            # Set flow rate
            Q_out[source_idx, target_idx] = edge.flow_rate
            
            # Set concentration factors
            if edge.concentration_factor_a:
                if len(edge.concentration_factor_a) != num_components:
                    raise ValueError(
                        f"Edge {edge.edge_id} concentration_factor_a has "
                        f"{len(edge.concentration_factor_a)} components, expected {num_components}"
                    )
                for j, factor in enumerate(edge.concentration_factor_a):
                    prop_a[source_idx, target_idx, j] = factor
            else:
                # Default to 1.0 for all components
                prop_a[source_idx, target_idx, :] = 1.0
            
            if edge.concentration_factor_b:
                if len(edge.concentration_factor_b) != num_components:
                    raise ValueError(
                        f"Edge {edge.edge_id} concentration_factor_b has "
                        f"{len(edge.concentration_factor_b)} components, expected {num_components}"
                    )
                for j, factor in enumerate(edge.concentration_factor_b):
                    prop_b[source_idx, target_idx, j] = factor
            # prop_b defaults to 0.0
        
        return {
            "V_liq": V_liq,
            "x0": x0,
            "Q_out": Q_out,
            "prop_a": prop_a,
            "prop_b": prop_b,
            "hours": params.hours,
            "steps_per_hour": params.steps_per_hour,
            "node_map": node_map,
            "nodes": nodes,
            "edges": edges,
            "original_flowchart_data": getattr(input_data, 'original_flowchart_data', None),
        }
    
    def convert_result_to_output_format(
        self,
        calculation_result: Dict[str, Any],
        input_data: MaterialBalanceInput,
        calculation_time: float
    ) -> Dict[str, Any]:
        """
        将计算结果转换为输出格式，使用原始参数名称
        """
        # Extract calculation results
        timestamps = calculation_result["timestamps"]
        node_data = calculation_result["node_data"]
        
        # Convert numpy arrays to lists for JSON serialization
        timestamps_list = timestamps.tolist() if hasattr(timestamps, 'tolist') else timestamps
        
        # Get original parameter names from flowchart data
        original_param_names = self._get_original_parameter_names(input_data)
        # print(f"[DEBUG] 获取到的原始参数名称: {original_param_names}")
        
        # Process node data with original parameter names
        node_data_dict = {}
        for node_id, data in node_data.items():
            node_data_dict[node_id] = {}
            for param_name, values in data.items():
                # Convert generic parameter names to original names
                original_param_name = self._convert_to_original_param_name(param_name, original_param_names)
                # print(f"[DEBUG] 参数名称转换: {param_name} -> {original_param_name}")
                
                if hasattr(values, 'tolist'):
                    node_data_dict[node_id][original_param_name] = values.tolist()
                else:
                    node_data_dict[node_id][original_param_name] = values
        
        # Calculate edge data (flow rates over time)
        edge_data_dict = self._calculate_edge_data(
            input_data.edges,
            node_data_dict,
            timestamps_list
        )
        
        # Calculate summary statistics
        summary = self._calculate_summary(
            node_data_dict,
            edge_data_dict,
            timestamps_list,
            calculation_time
        )
        
        return {
            "timestamps": timestamps_list,
            "node_data": node_data_dict,
            "edge_data": edge_data_dict,
            "summary": summary,
        }
    
    def _get_original_parameter_names(self, input_data: MaterialBalanceInput) -> List[str]:
        """
        从原始流程图数据中提取参数名称
        """
        if not input_data.original_flowchart_data:
            return []
        
        custom_parameters = input_data.original_flowchart_data.get('customParameters', [])
        return [param['name'] for param in custom_parameters]
    
    def _convert_to_original_param_name(self, generic_name: str, original_names: List[str]) -> str:
        """
        将通用参数名称转换为原始参数名称
        
        Args:
            generic_name: 通用参数名称，如 'concentration_0', 'concentration_1'
            original_names: 原始参数名称列表，如 ['C1', 'C2']
            
        Returns:
            原始参数名称，如果找不到则返回通用名称
        """
        # 如果没有原始参数名称，返回通用名称
        if not original_names:
            return generic_name
        
        # 解析通用参数名称中的索引
        if generic_name.startswith('concentration_'):
            try:
                index = int(generic_name.split('_')[1])
                if 0 <= index < len(original_names):
                    return original_names[index]
            except (ValueError, IndexError):
                pass
        
        # 如果无法转换，返回通用名称
        return generic_name
    
    def _calculate_edge_data(
        self,
        edges: List[EdgeData],
        node_data: Dict[str, Dict[str, List[float]]],
        timestamps: List[float]
    ) -> Dict[str, Dict[str, List[float]]]:
        """
        计算边的时间序列数据
        """
        edge_data = {}
        
        for edge in edges:
            edge_data[edge.edge_id] = {
                "flow_rate": [edge.flow_rate] * len(timestamps),
                "source_node": [edge.source_node_id] * len(timestamps),
                "target_node": [edge.target_node_id] * len(timestamps),
            }
            
            # Calculate mass flow rates for each component
            if edge.source_node_id in node_data:
                source_data = node_data[edge.source_node_id]
                
                # Get concentration data for source node
                for param_name, values in source_data.items():
                    if param_name.startswith("concentration_"):
                        component_idx = param_name.split("_")[-1]
                        mass_flow_key = f"mass_flow_component_{component_idx}"
                        
                        # Calculate mass flow = flow_rate * concentration
                        mass_flow = [edge.flow_rate * conc for conc in values]
                        edge_data[edge.edge_id][mass_flow_key] = mass_flow
        
        return edge_data
    
    def _calculate_summary(
        self,
        node_data: Dict[str, Dict[str, List[float]]],
        edge_data: Dict[str, Dict[str, List[float]]],
        timestamps: List[float],
        calculation_time: float
    ) -> Dict[str, Any]:
        """
        计算摘要统计信息
        """
        # Calculate total volume at final time
        final_total_volume = 0.0
        for node_id, data in node_data.items():
            if "volume" in data and data["volume"]:
                final_total_volume += data["volume"][-1]
        
        # Calculate total time points
        total_time_points = len(timestamps)
        
        # Determine convergence status
        convergence_status = "converged"  # Assume converged if calculation completed
        
        return {
            "total_time_points": total_time_points,
            "calculation_time": calculation_time,
            "final_total_volume": final_total_volume,
            "convergence_status": convergence_status,
            "simulation_duration": timestamps[-1] if timestamps else 0.0,
            "time_step": timestamps[1] - timestamps[0] if len(timestamps) > 1 else 0.0,
            "total_nodes": len(node_data),
            "total_edges": len(edge_data),
        }
    
    def extract_timeseries_data(
        self,
        result_data: Dict[str, Any],
        query: MaterialBalanceTimeSeriesQuery
    ) -> MaterialBalanceTimeSeriesResponse:
        """
        从结果数据中提取时间序列数据（支持分页）
        """
        timestamps = result_data["timestamps"]
        node_data = result_data["node_data"]
        edge_data = result_data["edge_data"]
        
        # Apply time range filter
        start_idx = 0
        end_idx = len(timestamps)
        
        if query.start_time is not None:
            start_idx = self._find_time_index(timestamps, query.start_time)
        
        if query.end_time is not None:
            end_idx = self._find_time_index(timestamps, query.end_time) + 1
        
        # Apply pagination
        total_points = end_idx - start_idx
        total_pages = math.ceil(total_points / query.page_size)
        
        page_start = start_idx + (query.page - 1) * query.page_size
        page_end = min(start_idx + query.page * query.page_size, end_idx)
        
        # Extract paginated data
        paginated_timestamps = timestamps[page_start:page_end]
        
        # Filter node data
        filtered_node_data = {}
        for node_id, data in node_data.items():
            if query.node_ids is None or node_id in query.node_ids:
                filtered_node_data[node_id] = {}
                for param_name, values in data.items():
                    filtered_node_data[node_id][param_name] = values[page_start:page_end]
        
        # Filter edge data
        filtered_edge_data = {}
        for edge_id, data in edge_data.items():
            if query.edge_ids is None or edge_id in query.edge_ids:
                filtered_edge_data[edge_id] = {}
                for param_name, values in data.items():
                    filtered_edge_data[edge_id][param_name] = values[page_start:page_end]
        
        # Pagination info
        pagination = {
            "page": query.page,
            "page_size": query.page_size,
            "total_pages": total_pages,
            "total_points": total_points,
            "has_next": query.page < total_pages,
            "has_prev": query.page > 1,
        }
        
        return MaterialBalanceTimeSeriesResponse(
            job_id="",  # Will be set by caller
            timestamps=paginated_timestamps,
            node_data=filtered_node_data,
            edge_data=filtered_edge_data,
            pagination=pagination,
        )
    
    def _find_time_index(self, timestamps: List[float], target_time: float) -> int:
        """
        找到最接近目标时间的索引
        """
        for i, t in enumerate(timestamps):
            if t >= target_time:
                return i
        return len(timestamps) - 1
    
    def validate_input_data(self, input_data: MaterialBalanceInput) -> Dict[str, Any]:
        """
        验证输入数据并估算资源需求
        """
        errors = []
        warnings = []
        
        try:
            # Basic validation (already done by Pydantic)
            nodes = input_data.nodes
            edges = input_data.edges
            params = input_data.parameters
            
            # Check node consistency
            if not nodes:
                errors.append("No nodes provided")
                return self._validation_error_response(errors)
            
            # Check component consistency
            num_components = len(nodes[0].initial_concentrations)
            for node in nodes:
                if len(node.initial_concentrations) != num_components:
                    errors.append(
                        f"Node {node.node_id} has inconsistent number of components"
                    )
            
            # Check edge references
            node_ids = {node.node_id for node in nodes}
            for edge in edges:
                if edge.source_node_id not in node_ids:
                    errors.append(f"Edge {edge.edge_id} references unknown source node")
                if edge.target_node_id not in node_ids:
                    errors.append(f"Edge {edge.edge_id} references unknown target node")
            
            # Check for inlet/outlet nodes
            has_inlet = any(node.is_inlet for node in nodes)
            has_outlet = any(node.is_outlet for node in nodes)
            
            if not has_inlet:
                warnings.append("No inlet nodes defined")
            if not has_outlet:
                warnings.append("No outlet nodes defined")
            
            # Estimate resource requirements
            num_nodes = len(nodes)
            num_time_points = int(params.hours * params.steps_per_hour) + 1
            
            # Memory estimation (rough)
            estimated_memory_mb = (
                num_nodes * num_components * num_time_points * 8  # float64
                + num_nodes * num_nodes * num_components * 8  # matrices
            ) / (1024 * 1024)
            
            # Time estimation (very rough)
            estimated_time_seconds = (
                num_time_points * num_nodes * 0.002  # 2ms per node per time step
            )
            
            if estimated_memory_mb > params.max_memory_mb:
                errors.append(
                    f"Estimated memory usage ({estimated_memory_mb:.1f} MB) "
                    f"exceeds limit ({params.max_memory_mb} MB)"
                )
            
            if estimated_time_seconds > 300:  # 5 minutes
                warnings.append(
                    f"Estimated calculation time is {estimated_time_seconds:.1f} seconds"
                )
            
            return {
                "is_valid": len(errors) == 0,
                "errors": errors,
                "warnings": warnings,
                "estimated_memory_mb": estimated_memory_mb,
                "estimated_time_seconds": estimated_time_seconds,
            }
        
        except Exception as e:
            errors.append(f"Validation error: {str(e)}")
            return self._validation_error_response(errors)
    
    def _validation_error_response(self, errors: List[str]) -> Dict[str, Any]:
        """
        返回验证错误响应
        """
        return {
            "is_valid": False,
            "errors": errors,
            "warnings": [],
            "estimated_memory_mb": 0.0,
            "estimated_time_seconds": 0.0,
        }
