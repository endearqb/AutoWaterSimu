"""物料平衡工具函数

物料平衡计算的工具函数，包括数据转换、验证和辅助操作。

该模块提供以下功能：
- 张量维度验证
- 流程图JSON数据转换
- 计算结果格式化
- 时间序列数据分页
- 计算参数验证
- 内存使用估算
- 示例数据创建
"""

import torch
import numpy as np
from typing import Dict, List, Any, Tuple, Optional
import json

from .models import (
    MaterialBalanceInput,
    MaterialBalanceResult,
    NodeData,
    EdgeData,
    CalculationParameters
)
from .exceptions import InvalidInputError, DimensionMismatchError


def validate_tensor_dimensions(tensors: Dict[str, torch.Tensor]) -> None:
    """验证所有张量具有一致的维度。
    
    检查输入张量的维度是否符合物料平衡计算的要求，
    确保节点数量、组分数量等维度的一致性。
    
    Args:
        tensors: 需要验证的张量字典
        
    Raises:
        DimensionMismatchError: 当维度不一致时抛出
    """
    if 'V_liq' not in tensors or 'x0' not in tensors:
        raise DimensionMismatchError("Missing required tensors: V_liq, x0")
    
    n_nodes = tensors['V_liq'].shape[0]
    
    # Check x0 dimensions
    if tensors['x0'].shape[0] != n_nodes:
        raise DimensionMismatchError(
            f"x0 first dimension ({tensors['x0'].shape[0]}) doesn't match number of nodes ({n_nodes})"
        )
    
    # Check Q_out dimensions
    if 'Q_out' in tensors:
        if tensors['Q_out'].shape != (n_nodes, n_nodes):
            raise DimensionMismatchError(
                f"Q_out shape {tensors['Q_out'].shape} doesn't match expected ({n_nodes}, {n_nodes})"
            )
    
    # Check prop_a and prop_b dimensions
    n_components = tensors['x0'].shape[1]
    for prop_name in ['prop_a', 'prop_b']:
        if prop_name in tensors:
            expected_shape = (n_nodes, n_nodes, n_components)
            if tensors[prop_name].shape != expected_shape:
                raise DimensionMismatchError(
                    f"{prop_name} shape {tensors[prop_name].shape} doesn't match expected {expected_shape}"
                )


def convert_flowchart_json_to_input(flowchart_data: Dict[str, Any]) -> MaterialBalanceInput:
    """将流程图JSON数据转换为MaterialBalanceInput格式。
    
    将前端传来的流程图数据转换为物料平衡计算所需的
    结构化输入数据格式。
    
    Args:
        flowchart_data: 来自前端的流程图数据
        
    Returns:
        MaterialBalanceInput: 结构化的输入数据
        
    Raises:
        InvalidInputError: 当转换失败时抛出
    """
    try:
        nodes_data = flowchart_data.get('nodes', [])
        edges_data = flowchart_data.get('edges', [])
        params_data = flowchart_data.get('parameters', {})
        
        # Convert nodes
        nodes = []
        for node_data in nodes_data:
            node = NodeData(
                node_id=node_data['id'],
                initial_volume=node_data.get('data', {}).get('volume', 1.0),
                initial_concentrations=node_data.get('data', {}).get('concentrations', [1.0]),
                is_inlet=node_data.get('data', {}).get('is_inlet', False),
                is_outlet=node_data.get('data', {}).get('is_outlet', False)
            )
            nodes.append(node)
        
        # Convert edges
        edges = []
        for edge_data in edges_data:
            edge = EdgeData(
                edge_id=edge_data['id'],
                from_node=edge_data['source'],
                to_node=edge_data['target'],
                flow_rate=edge_data.get('data', {}).get('flow_rate', 1.0),
                concentration_factors_a=edge_data.get('data', {}).get('factors_a', [1.0]),
                concentration_factors_b=edge_data.get('data', {}).get('factors_b', [0.0])
            )
            edges.append(edge)
        
        # Convert parameters
        parameters = CalculationParameters(
            hours=params_data.get('hours', 4.0),
            steps_per_hour=params_data.get('steps_per_hour', 60),
            solver_method=params_data.get('solver_method', 'scipy_solver'),
            tolerance=params_data.get('tolerance', 1e-6),
            max_iterations=params_data.get('max_iterations', 1000)
        )
        
        return MaterialBalanceInput(
            nodes=nodes,
            edges=edges,
            parameters=parameters
        )
        
    except Exception as e:
        raise InvalidInputError(f"Failed to convert flowchart data: {str(e)}") from e


def convert_result_to_json(result: MaterialBalanceResult) -> Dict[str, Any]:
    """将MaterialBalanceResult转换为JSON可序列化格式。
    
    将计算结果转换为可以通过API传输的JSON格式。
    
    Args:
        result: 计算结果
        
    Returns:
        Dict: JSON可序列化的结果数据
    """
    return {
        'job_id': result.job_id,
        'status': result.status,
        'timestamps': result.timestamps,
        'node_data': result.node_data,
        'edge_data': result.edge_data,
        'summary': result.summary,
        'error_message': result.error_message
    }


def paginate_timeseries_data(
    result: MaterialBalanceResult,
    start_time: Optional[float] = None,
    end_time: Optional[float] = None,
    page: int = 1,
    page_size: int = 100,
    node_ids: Optional[List[str]] = None,
    edge_ids: Optional[List[str]] = None
) -> Dict[str, Any]:
    """对时间序列数据进行分页处理以提高传输效率。
    
    将大量的时间序列数据分页返回，支持时间范围过滤
    和节点/边的选择性返回。
    
    Args:
        result: 完整的计算结果
        start_time: 开始时间过滤器
        end_time: 结束时间过滤器
        page: 页码（从1开始）
        page_size: 每页的时间点数量
        node_ids: 特定节点的过滤器
        edge_ids: 特定边的过滤器
        
    Returns:
        Dict: 包含元数据的分页数据
    """
    timestamps = result.timestamps
    
    # Apply time filters
    start_idx = 0
    end_idx = len(timestamps)
    
    if start_time is not None:
        start_idx = next((i for i, t in enumerate(timestamps) if t >= start_time), 0)
    
    if end_time is not None:
        end_idx = next((i for i, t in enumerate(timestamps) if t > end_time), len(timestamps))
    
    # Apply pagination
    total_points = end_idx - start_idx
    total_pages = (total_points + page_size - 1) // page_size
    
    page_start = start_idx + (page - 1) * page_size
    page_end = min(start_idx + page * page_size, end_idx)
    
    # Extract paginated data
    paginated_timestamps = timestamps[page_start:page_end]
    
    # Filter and paginate node data
    paginated_node_data = {}
    for node_id, node_values in result.node_data.items():
        if node_ids is None or node_id in node_ids:
            paginated_node_data[node_id] = {
                param: values[page_start:page_end]
                for param, values in node_values.items()
            }
    
    # Filter and paginate edge data
    paginated_edge_data = {}
    for edge_id, edge_values in result.edge_data.items():
        if edge_ids is None or edge_id in edge_ids:
            paginated_edge_data[edge_id] = {
                param: values[page_start:page_end]
                for param, values in edge_values.items()
            }
    
    return {
        'job_id': result.job_id,
        'timestamps': paginated_timestamps,
        'node_data': paginated_node_data,
        'edge_data': paginated_edge_data,
        'pagination': {
            'page': page,
            'page_size': page_size,
            'total_pages': total_pages,
            'total_points': total_points,
            'has_next': page < total_pages,
            'has_previous': page > 1
        },
        'filters': {
            'start_time': start_time,
            'end_time': end_time,
            'node_ids': node_ids,
            'edge_ids': edge_ids
        }
    }


def validate_calculation_parameters(params: CalculationParameters) -> None:
    """验证计算参数的可行性。
    
    检查计算参数是否在合理范围内，避免过长的模拟时间
    或过多的时间步数导致计算资源耗尽。
    
    Args:
        params: 计算参数
        
    Raises:
        InvalidInputError: 当参数无效时抛出
    """
    # Check for reasonable simulation time
    if params.hours > 1000:
        raise InvalidInputError("Simulation time too long (>1000 hours)")
    
    # Check for reasonable step count
    total_steps = params.hours * params.steps_per_hour
    if total_steps > 100000:
        raise InvalidInputError(
            f"Too many time steps ({total_steps}). Consider reducing hours or steps_per_hour."
        )
    
    # Check tolerance
    if params.tolerance <= 0 or params.tolerance > 1e-3:
        raise InvalidInputError("Tolerance must be between 0 and 1e-3")


def estimate_memory_usage(input_data: MaterialBalanceInput) -> Dict[str, float]:
    """估算计算所需的内存使用量。
    
    根据节点数量、组分数量和时间步数估算计算过程中
    需要的内存大小，帮助判断计算的可行性。
    
    Args:
        input_data: 输入数据
        
    Returns:
        Dict: 以MB为单位的内存使用估算
    """
    n_nodes = len(input_data.nodes)
    n_components = len(input_data.nodes[0].initial_concentrations)
    n_steps = int(input_data.parameters.hours * input_data.parameters.steps_per_hour) + 1
    
    # Estimate tensor sizes (float32 = 4 bytes)
    bytes_per_float = 4
    
    # Input tensors
    input_memory = (
        n_nodes * bytes_per_float +  # V_liq
        n_nodes * n_components * bytes_per_float +  # x0
        n_nodes * n_nodes * bytes_per_float +  # Q_out
        2 * n_nodes * n_nodes * n_components * bytes_per_float  # prop_a, prop_b
    )
    
    # Result tensor
    result_memory = n_steps * n_nodes * (n_components + 1) * bytes_per_float
    
    # Convert to MB
    input_mb = input_memory / (1024 * 1024)
    result_mb = result_memory / (1024 * 1024)
    total_mb = input_mb + result_mb
    
    return {
        'input_tensors_mb': input_mb,
        'result_tensor_mb': result_mb,
        'total_estimated_mb': total_mb,
        'n_nodes': n_nodes,
        'n_components': n_components,
        'n_steps': n_steps
    }


def create_example_input() -> MaterialBalanceInput:
    """创建用于测试的示例输入数据。
    
    生成一个包含4个节点（入口、两个储罐、出口）的
    简单物料平衡系统，用于功能测试和演示。
    
    Returns:
        MaterialBalanceInput: 示例输入数据
    """
    nodes = [
        NodeData(
            node_id="inlet",
            initial_volume=0.0,
            initial_concentrations=[2.0, 1.0],
            is_inlet=True
        ),
        NodeData(
            node_id="tank1",
            initial_volume=1.0,
            initial_concentrations=[1.0, 1.0]
        ),
        NodeData(
            node_id="tank2",
            initial_volume=1.0,
            initial_concentrations=[1.0, 1.0]
        ),
        NodeData(
            node_id="outlet",
            initial_volume=0.0,
            initial_concentrations=[0.0, 0.0],
            is_outlet=True
        )
    ]
    
    edges = [
        EdgeData(
            edge_id="e1",
            from_node="inlet",
            to_node="tank1",
            flow_rate=2.0,
            concentration_factors_a=[1.0, 1.0]
        ),
        EdgeData(
            edge_id="e2",
            from_node="inlet",
            to_node="tank2",
            flow_rate=1.0,
            concentration_factors_a=[0.5, 1.0]
        ),
        EdgeData(
            edge_id="e3",
            from_node="tank1",
            to_node="outlet",
            flow_rate=1.0,
            concentration_factors_a=[1.0, 1.0]
        ),
        EdgeData(
            edge_id="e4",
            from_node="tank2",
            to_node="outlet",
            flow_rate=1.0,
            concentration_factors_a=[1.0, 1.0]
        )
    ]
    
    parameters = CalculationParameters(
        hours=4.0,
        steps_per_hour=60
    )
    
    return MaterialBalanceInput(
        nodes=nodes,
        edges=edges,
        parameters=parameters
    )