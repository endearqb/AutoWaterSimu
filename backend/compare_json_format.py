import json
import sys
from typing import Dict, Any

def load_json_file(file_path: str) -> Dict[str, Any]:
    """加载JSON文件"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"加载文件失败: {e}")
        return {}

def compare_structure(data1: Dict[str, Any], data2: Dict[str, Any], path: str = "") -> None:
    """比较两个JSON结构的差异"""
    # 比较键
    keys1 = set(data1.keys()) if isinstance(data1, dict) else set()
    keys2 = set(data2.keys()) if isinstance(data2, dict) else set()
    
    missing_in_data2 = keys1 - keys2
    missing_in_data1 = keys2 - keys1
    
    if missing_in_data2:
        print(f"在前端数据中缺少的字段 {path}: {missing_in_data2}")
    if missing_in_data1:
        print(f"在本地文件中缺少的字段 {path}: {missing_in_data1}")
    
    # 比较共同的键
    common_keys = keys1 & keys2
    for key in common_keys:
        new_path = f"{path}.{key}" if path else key
        val1 = data1[key]
        val2 = data2[key]
        
        if type(val1) != type(val2):
            print(f"类型不匹配 {new_path}: 前端={type(val1).__name__}, 本地={type(val2).__name__}")
        elif isinstance(val1, dict) and isinstance(val2, dict):
            compare_structure(val1, val2, new_path)
        elif isinstance(val1, list) and isinstance(val2, list):
            if len(val1) != len(val2):
                print(f"数组长度不匹配 {new_path}: 前端={len(val1)}, 本地={len(val2)}")
            else:
                for i, (item1, item2) in enumerate(zip(val1, val2)):
                    if isinstance(item1, dict) and isinstance(item2, dict):
                        compare_structure(item1, item2, f"{new_path}[{i}]")

def analyze_edge_data_format(data: Dict[str, Any], label: str) -> None:
    """分析边数据的格式"""
    print(f"\n=== {label} 边数据格式分析 ===")
    edges = data.get('edges', [])
    if not edges:
        print("没有边数据")
        return
    
    print(f"边的数量: {len(edges)}")
    
    # 分析第一条边的数据格式
    first_edge = edges[0]
    print(f"第一条边ID: {first_edge.get('id', 'N/A')}")
    print(f"边数据字段: {list(first_edge.get('data', {}).keys())}")
    
    edge_data = first_edge.get('data', {})
    print("边数据内容:")
    for key, value in edge_data.items():
        print(f"  {key}: {value} ({type(value).__name__})")

def analyze_node_data_format(data: Dict[str, Any], label: str) -> None:
    """分析节点数据的格式"""
    print(f"\n=== {label} 节点数据格式分析 ===")
    nodes = data.get('nodes', [])
    if not nodes:
        print("没有节点数据")
        return
    
    print(f"节点数量: {len(nodes)}")
    
    # 分析第一个节点的数据格式
    first_node = nodes[0]
    print(f"第一个节点ID: {first_node.get('id', 'N/A')}")
    print(f"节点类型: {first_node.get('type', 'N/A')}")
    print(f"节点数据字段: {list(first_node.get('data', {}).keys())}")
    
    node_data = first_node.get('data', {})
    print("节点数据内容:")
    for key, value in node_data.items():
        print(f"  {key}: {value} ({type(value).__name__})")

def main():
    # 加载本地文件
    local_file_path = "d:/MyProject/my-full-stack/todos/flowchart-2025-08-06 (1).json"
    local_data = load_json_file(local_file_path)
    
    if not local_data:
        print("无法加载本地文件")
        return
    
    print("=== 本地文件结构分析 ===")
    print(f"顶级字段: {list(local_data.keys())}")
    
    # 分析本地文件格式
    analyze_node_data_format(local_data, "本地文件")
    analyze_edge_data_format(local_data, "本地文件")
    
    # 分析自定义参数
    custom_params = local_data.get('customParameters', [])
    print(f"\n=== 自定义参数 ===")
    print(f"参数数量: {len(custom_params)}")
    if custom_params:
        print("参数列表:")
        for param in custom_params:
            print(f"  {param.get('name', 'N/A')}: {param.get('label', 'N/A')}")
    
    # 分析计算参数
    calc_params = local_data.get('calculationParameters', {})
    print(f"\n=== 计算参数 ===")
    print(f"计算参数字段: {list(calc_params.keys())}")
    for key, value in calc_params.items():
        print(f"  {key}: {value} ({type(value).__name__})")
    
    print("\n=== 前端数据格式预期 ===")
    print("根据exportFlowData函数，前端发送的数据应该包含:")
    print("- nodes: 节点数组")
    print("- edges: 边数组，其中data包含flow和参数的_a、_b配置")
    print("- customParameters: 自定义参数数组")
    print("- calculationParameters: 计算参数对象")
    print("- exportedAt: 导出时间")
    print("- version: 版本号")
    
    print("\n=== 关键差异分析 ===")
    print("1. 边数据格式:")
    print("   本地文件: 边的data包含各种参数的_a和_b字段")
    print("   前端发送: 边的data应该包含flow和各参数的_a、_b配置")
    
    print("\n2. 检查本地文件边数据是否符合前端格式...")
    edges = local_data.get('edges', [])
    if edges:
        edge_data = edges[0].get('data', {})
        has_flow = 'flow' in edge_data
        has_param_configs = any(key.endswith('_a') or key.endswith('_b') for key in edge_data.keys())
        
        print(f"   包含flow字段: {has_flow}")
        print(f"   包含参数配置(_a/_b): {has_param_configs}")
        
        if has_flow and has_param_configs:
            print("   ✅ 本地文件格式与前端发送格式一致")
        else:
            print("   ❌ 本地文件格式与前端发送格式不一致")
            print("   实际边数据字段:", list(edge_data.keys()))

if __name__ == "__main__":
    main()