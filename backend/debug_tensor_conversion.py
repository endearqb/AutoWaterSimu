#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
调试张量转换过程中的ASM1slim参数处理
"""

import json
from app.services.data_conversion_service import DataConversionService

def main():
    # 加载ASM1slim JSON文件
    with open('../todos/ASMslim1.json', 'r', encoding='utf-8') as f:
        flowchart_data = json.load(f)
    
    print("=== 调试张量转换过程 ===")
    
    # 创建数据转换服务
    conversion_service = DataConversionService()
    
    # 转换数据
    material_balance_input = conversion_service.convert_flowchart_to_material_balance_input(flowchart_data)
    
    print(f"\n节点总数: {len(material_balance_input.nodes)}")
    
    # 检查每个节点的ASM1slim参数
    asm1slim_count = 0
    for i, node in enumerate(material_balance_input.nodes):
        if node.node_type == 'asm1slim':
            asm1slim_count += 1
            print(f"\nASM1slim节点 {asm1slim_count}: {node.node_id}")
            print(f"  是否有asm1slim_parameters属性: {hasattr(node, 'asm1slim_parameters')}")
            
            if hasattr(node, 'asm1slim_parameters'):
                asm1slim_params = getattr(node, 'asm1slim_parameters', None)
                print(f"  asm1slim_parameters值: {asm1slim_params}")
                print(f"  asm1slim_parameters类型: {type(asm1slim_params)}")
                if asm1slim_params is not None:
                    print(f"  参数长度: {len(asm1slim_params)}")
                    print(f"  参数详情: {asm1slim_params}")
                else:
                    print(f"  asm1slim_parameters为None!")
            else:
                print(f"  没有asm1slim_parameters属性!")
    
    print(f"\n总共找到 {asm1slim_count} 个ASM1slim节点")

if __name__ == "__main__":
    main()