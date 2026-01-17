#!/usr/bin/env python3
"""
测试修复后的API端点
验证文件上传、schema获取、预览和基础统计功能
"""

import requests
import tempfile
import pandas as pd
import json
from pathlib import Path

def get_auth_headers():
    """获取认证头"""
    base_url = "http://localhost:8000/api/v1"
    
    # 使用默认超级用户凭据登录
    login_data = {
        "username": "admin@example.com",  # 默认超级用户邮箱
        "password": "changethis"  # 默认密码
    }
    
    response = requests.post(f"{base_url}/login/access-token", data=login_data)
    if response.status_code != 200:
        print(f"登录失败: {response.status_code} - {response.text}")
        return None
    
    token_data = response.json()
    access_token = token_data["access_token"]
    return {"Authorization": f"Bearer {access_token}"}

def test_api_endpoints():
    """测试API端点"""
    base_url = "http://localhost:8000/api/v1"
    
    print("开始测试API端点...")
    
    # 获取认证头
    print("1. 获取认证令牌...")
    headers = get_auth_headers()
    if not headers:
        print("   ✗ 无法获取认证令牌")
        return False
    print("   ✓ 认证成功")
    
    # 创建测试数据
    test_data = pd.DataFrame({
        'name': ['Alice', 'Bob', 'Charlie', 'David', 'Eve'],
        'age': [25, 30, 35, 28, 32],
        'salary': [50000, 60000, 70000, 55000, 65000],
        'department': ['IT', 'HR', 'Finance', 'IT', 'Marketing'],
        'active': [True, True, False, True, True]
    })
    
    # 保存为临时CSV文件
    with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8') as f:
        test_data.to_csv(f.name, index=False)
        temp_file_path = f.name
    
    try:
        print(f"2. 创建测试CSV文件: {temp_file_path}")
        
        # 测试文件上传
        print("3. 测试文件上传...")
        with open(temp_file_path, 'rb') as f:
            files = {'file': ('test_data.csv', f, 'text/csv')}
            response = requests.post(f"{base_url}/data-analysis/files/upload", files=files, headers=headers)
        
        if response.status_code != 200:
            print(f"   ✗ 文件上传失败: {response.status_code} - {response.text}")
            return False
        
        upload_result = response.json()
        file_id = upload_result['file_id']
        print(f"   ✓ 文件上传成功，文件ID: {file_id}")
        
        # 测试获取文件schema
        print("4. 测试获取文件schema...")
        response = requests.get(f"{base_url}/data-analysis/files/{file_id}/schema", headers=headers)
        
        if response.status_code != 200:
            print(f"   ✗ 获取schema失败: {response.status_code} - {response.text}")
            return False
        
        schema_result = response.json()
        print(f"   ✓ 获取schema成功，列数: {len(schema_result.get('columns', []))}")
        print(f"   列名: {[col['name'] for col in schema_result.get('columns', [])]}")
        
        # 测试文件预览
        print("5. 测试文件预览...")
        response = requests.get(f"{base_url}/data-analysis/files/{file_id}/preview?limit=3", headers=headers)
        
        if response.status_code != 200:
            print(f"   ✗ 文件预览失败: {response.status_code} - {response.text}")
            return False
        
        preview_result = response.json()
        print(f"   ✓ 文件预览成功，返回行数: {len(preview_result.get('rows', []))}")
        print(f"   总行数: {preview_result.get('total_rows', 0)}")
        
        # 测试基础统计信息
        print("6. 测试基础统计信息...")
        response = requests.get(f"{base_url}/data-analysis/files/{file_id}/basic-stats", headers=headers)
        
        if response.status_code != 200:
            print(f"   ✗ 获取基础统计失败: {response.status_code} - {response.text}")
            return False
        
        stats_result = response.json()
        print(f"   ✓ 获取基础统计成功")
        print(f"   数据形状: {stats_result.get('shape_rows', 0)} x {stats_result.get('shape_cols', 0)}")
        print(f"   数值列: {len(stats_result.get('numeric_columns', []))}")
        print(f"   分类列: {len(stats_result.get('categorical_columns', []))}")
        
        print("\n✓ 所有API端点测试通过！")
        return True
        
    except Exception as e:
        print(f"\n✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        # 清理临时文件
        import os
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
        print(f"清理临时文件: {temp_file_path}")

if __name__ == "__main__":
    import sys
    result = test_api_endpoints()
    sys.exit(0 if result else 1)