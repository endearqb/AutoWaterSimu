#!/usr/bin/env python3
"""
测试修复后的文件API端点
验证文件ID处理和DataFrame序列化问题是否已解决
"""

import asyncio
import tempfile
import pandas as pd
from pathlib import Path
import sys
import os

# 添加backend目录到Python路径
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.services.data_analysis.file_handler import save_upload_file, read_data_file
from app.services.data_analysis.analysis.profiling.profile import summarise_dataframe
from app.services.data_analysis.analysis.io.files import serialize_sample

async def test_file_api_fix():
    """测试文件API修复"""
    print("开始测试文件API修复...")
    
    # 创建测试数据
    test_data = pd.DataFrame({
        'name': ['Alice', 'Bob', 'Charlie', 'David'],
        'age': [25, 30, 35, 28],
        'salary': [50000, 60000, 70000, 55000],
        'department': ['IT', 'HR', 'Finance', 'IT']
    })
    
    # 保存为临时CSV文件
    with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8') as f:
        test_data.to_csv(f.name, index=False)
        temp_file_path = f.name
    
    try:
        print(f"1. 创建测试CSV文件: {temp_file_path}")
        
        # 模拟文件上传
        class MockFile:
            def __init__(self, file_path):
                self.file_path = file_path
                self._content = None
                self._position = 0
                
            def seek(self, pos, whence=0):
                if self._content is None:
                    with open(self.file_path, 'rb') as f:
                        self._content = f.read()
                
                if whence == 0:  # SEEK_SET
                    self._position = pos
                elif whence == 1:  # SEEK_CUR
                    self._position += pos
                elif whence == 2:  # SEEK_END
                    self._position = len(self._content) + pos
                    
                self._position = max(0, min(self._position, len(self._content)))
                
            def tell(self):
                if self._content is None:
                    with open(self.file_path, 'rb') as f:
                        self._content = f.read()
                return self._position
                
            async def read(self, size=-1):
                if self._content is None:
                    with open(self.file_path, 'rb') as f:
                        self._content = f.read()
                
                if size == -1:
                    result = self._content[self._position:]
                    self._position = len(self._content)
                else:
                    result = self._content[self._position:self._position + size]
                    self._position += len(result)
                    
                return result
        
        class MockUploadFile:
            def __init__(self, file_path):
                self.filename = os.path.basename(file_path)
                self.file_path = file_path
                self.file = MockFile(file_path)
                
            async def read(self):
                return await self.file.read()
        
        mock_file = MockUploadFile(temp_file_path)
        
        # 测试文件保存
        print("2. 测试文件保存...")
        file_id, file_info = await save_upload_file(mock_file, user_id="test-user")
        print(f"   文件ID: {file_id}")
        print(f"   文件信息: {file_info}")
        
        # 测试文件读取
        print("3. 测试文件读取...")
        df = await read_data_file(file_id)
        print(f"   读取的DataFrame形状: {df.shape}")
        print(f"   列名: {list(df.columns)}")
        
        # 测试DataFrame摘要生成
        print("4. 测试DataFrame摘要生成...")
        profile = summarise_dataframe(df, sample_rows=5)
        print(f"   摘要键: {list(profile.keys())}")
        
        # 验证摘要数据的可序列化性
        print("5. 验证摘要数据可序列化性...")
        import json
        try:
            json.dumps(profile, default=str)
            print("   ✓ 摘要数据可以序列化")
        except Exception as e:
            print(f"   ✗ 摘要数据序列化失败: {e}")
            return False
        
        # 测试样本数据序列化
        print("6. 测试样本数据序列化...")
        sample_data = serialize_sample(df, n=3)
        print(f"   样本数据行数: {len(sample_data)}")
        
        try:
            json.dumps(sample_data)
            print("   ✓ 样本数据可以序列化")
        except Exception as e:
            print(f"   ✗ 样本数据序列化失败: {e}")
            return False
        
        # 测试基础统计信息生成
        print("7. 测试基础统计信息生成...")
        shape = profile.get("shape", (len(df), len(df.columns)))
        basic_stats = {
            "shape_rows": int(shape[0]),
            "shape_cols": int(shape[1]),
            "dtypes": {str(k): str(v) for k, v in (profile.get("dtypes") or {}).items()},
            "null_counts": {str(k): int(v) for k, v in (profile.get("null_counts") or {}).items()},
            "numeric_columns": [str(x) for x in (profile.get("numeric_columns") or [])],
            "categorical_columns": [str(x) for x in (profile.get("categorical_columns") or [])],
            "datetime_columns": [str(x) for x in (profile.get("datetime_columns") or [])],
            "boolean_columns": [str(x) for x in (profile.get("boolean_columns") or [])],
        }
        
        try:
            json.dumps(basic_stats)
            print("   ✓ 基础统计信息可以序列化")
        except Exception as e:
            print(f"   ✗ 基础统计信息序列化失败: {e}")
            return False
        
        print("\n✓ 所有测试通过！文件API修复成功。")
        return True
        
    except Exception as e:
        print(f"\n✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        # 清理临时文件
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
        print(f"清理临时文件: {temp_file_path}")

if __name__ == "__main__":
    result = asyncio.run(test_file_api_fix())
    sys.exit(0 if result else 1)