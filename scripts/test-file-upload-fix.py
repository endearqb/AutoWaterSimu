#!/usr/bin/env python3
"""
测试文件上传修复脚本
验证修复后的文件读取功能是否正常工作
"""

import io
import sys
import pandas as pd
from pathlib import Path

# 添加backend路径到sys.path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from app.services.data_analysis.analysis.io.files import read_tabular_file

def test_scalar_values_fix():
    """测试标量值DataFrame创建修复"""
    print("🧪 测试标量值DataFrame创建修复...")
    
    # 测试1: 创建包含标量值的CSV数据
    csv_data = "value\n42\n"
    csv_buffer = io.BytesIO(csv_data.encode('utf-8'))
    
    try:
        df = read_tabular_file(csv_buffer)
        print(f"✅ 测试1通过: 单个标量值CSV - shape: {df.shape}")
        print(f"   数据: {df.to_dict()}")
    except Exception as e:
        print(f"❌ 测试1失败: {str(e)}")
        return False
    
    # 测试2: 创建包含多个标量值的CSV数据
    csv_data2 = "col1,col2,col3\n1,2,3\n"
    csv_buffer2 = io.BytesIO(csv_data2.encode('utf-8'))
    
    try:
        df2 = read_tabular_file(csv_buffer2)
        print(f"✅ 测试2通过: 多个标量值CSV - shape: {df2.shape}")
        print(f"   数据: {df2.to_dict()}")
    except Exception as e:
        print(f"❌ 测试2失败: {str(e)}")
        return False
    
    # 测试3: 创建空数据的情况
    csv_data3 = "col1,col2\n"
    csv_buffer3 = io.BytesIO(csv_data3.encode('utf-8'))
    
    try:
        df3 = read_tabular_file(csv_buffer3)
        print(f"✅ 测试3通过: 空数据CSV - shape: {df3.shape}")
        print(f"   数据: {df3.to_dict()}")
    except Exception as e:
        print(f"⚠️  测试3预期失败 (空数据): {str(e)}")
    
    # 测试4: 创建包含混合数据类型的CSV
    csv_data4 = "name,age,score\nAlice,25,95.5\nBob,30,87.2\n"
    csv_buffer4 = io.BytesIO(csv_data4.encode('utf-8'))
    
    try:
        df4 = read_tabular_file(csv_buffer4)
        print(f"✅ 测试4通过: 混合数据类型CSV - shape: {df4.shape}")
        print(f"   列类型: {df4.dtypes.to_dict()}")
    except Exception as e:
        print(f"❌ 测试4失败: {str(e)}")
        return False
    
    return True

def test_error_handling():
    """测试错误处理改进"""
    print("\n🧪 测试错误处理改进...")
    
    # 测试1: 无效的CSV数据
    invalid_csv = "col1,col2\n1,2,3,4,5\n"  # 列数不匹配
    invalid_buffer = io.BytesIO(invalid_csv.encode('utf-8'))
    
    try:
        df = read_tabular_file(invalid_buffer)
        print(f"✅ 测试1通过: 处理无效CSV - shape: {df.shape}")
    except Exception as e:
        print(f"⚠️  测试1预期可能失败: {str(e)}")
    
    # 测试2: 非UTF-8编码
    gb2312_data = "姓名,年龄\n张三,25\n李四,30\n".encode('gb2312')
    gb2312_buffer = io.BytesIO(gb2312_data)
    
    try:
        df = read_tabular_file(gb2312_buffer)
        print(f"✅ 测试2通过: GB2312编码 - shape: {df.shape}")
        print(f"   数据: {df.to_dict()}")
    except Exception as e:
        print(f"❌ 测试2失败: {str(e)}")
        return False
    
    return True

def main():
    """主测试函数"""
    print("🚀 开始测试文件上传修复...")
    print("=" * 50)
    
    success = True
    
    # 运行测试
    if not test_scalar_values_fix():
        success = False
    
    if not test_error_handling():
        success = False
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 所有测试通过！文件上传修复成功。")
    else:
        print("❌ 部分测试失败，需要进一步检查。")
    
    return success

if __name__ == "__main__":
    main()