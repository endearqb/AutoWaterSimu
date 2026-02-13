#!/usr/bin/env python3
"""
物料平衡模块功能验证的简单测试脚本。

该脚本创建一个简单的4节点系统来测试物料平衡计算的核心功能，
验证模块是否能正确处理基本的物料流动和浓度变化计算。
"""

import sys
import os

# 将app目录添加到Python路径
app_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, app_dir)

import torch
from material_balance.models import (
    MaterialBalanceInput, NodeData, EdgeData, CalculationParameters
)
from material_balance.core import MaterialBalanceCalculator

def run_simple_case():
    """使用简单的4节点系统进行测试，匹配原始示例。
    
    创建一个包含入口节点、两个储罐节点和出口节点的系统，
    测试物料平衡计算的基本功能和数据结构处理。
    
    Returns:
        bool: 测试是否成功
    """
    print("Testing simple 4-node system...")
    
    # 创建与原始示例匹配的节点
    nodes = [
        NodeData(
            node_id="node0",
            initial_volume=0.0,  # inlet
            initial_concentrations=[2.0, 1.0],
            is_inlet=True
        ),
        NodeData(
            node_id="node1",
            initial_volume=1.0,
            initial_concentrations=[1.0, 1.0]
        ),
        NodeData(
            node_id="node2",
            initial_volume=1.0,
            initial_concentrations=[1.0, 1.0]
        ),
        NodeData(
            node_id="node3",
            initial_volume=0.0,  # outlet
            initial_concentrations=[0.0, 0.0],
            is_outlet=True
        )
    ]
    
    # 创建与原始Q_out矩阵匹配的边
    edges = [
        EdgeData(
            edge_id="e01",
            from_node="node0",
            to_node="node1",
            flow_rate=2.0,
            concentration_factors_a=[1.0, 1.0]
        ),
        EdgeData(
            edge_id="e02",
            from_node="node0",
            to_node="node2",
            flow_rate=1.0,
            concentration_factors_a=[0.5, 1.0]
        ),
        EdgeData(
            edge_id="e13",
            from_node="node1",
            to_node="node3",
            flow_rate=1.0,
            concentration_factors_a=[0.0, 1.0]
        ),
        EdgeData(
            edge_id="e23",
            from_node="node2",
            to_node="node3",
            flow_rate=1.0,
            concentration_factors_a=[1.0, 1.0]
        )
    ]
    
    parameters = CalculationParameters(
        hours=4.0,
        steps_per_hour=60
    )
    
    input_data = MaterialBalanceInput(
        nodes=nodes,
        edges=edges,
        parameters=parameters
    )
    
    # 运行计算
    calculator = MaterialBalanceCalculator()
    
    try:
        result = calculator.calculate(input_data)
        print(f"✓ Calculation successful!")
        print(f"  Job ID: {result.job_id}")
        print(f"  Status: {result.status}")
        print(f"  Time points: {len(result.timestamps)}")
        print(f"  Final time: {result.timestamps[-1]:.2f} hours")
        
        # 打印最终浓度
        print("\nFinal concentrations:")
        for node_id, node_data in result.node_data.items():
            volume = node_data['volume'][-1]
            conc0 = node_data['concentration_0'][-1]
            conc1 = node_data['concentration_1'][-1]
            print(f"  {node_id}: V={volume:.4f}, C0={conc0:.4f}, C1={conc1:.4f}")
        
        return True
        
    except Exception as e:
        print(f"✗ Calculation failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("Material Balance Simple Test")
    print("=============================")
    
    success = run_simple_case()
    
    if success:
        print("\n✓ All tests passed!")
    else:
        print("\n✗ Tests failed!")
        sys.exit(1)
