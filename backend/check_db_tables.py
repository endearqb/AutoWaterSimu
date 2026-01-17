from app.models import ASM1SlimFlowChart
from app.core.db import engine
from sqlmodel import SQLModel
import sqlalchemy

print('检查数据库表...')
inspector = sqlalchemy.inspect(engine)
tables = inspector.get_table_names()
print(f'现有表: {tables}')
print(f'ASM1SlimFlowChart表是否存在: {"asm1slimflowchart" in [t.lower() for t in tables]}')

# 检查表结构
if "asm1slimflowchart" in [t.lower() for t in tables]:
    columns = inspector.get_columns('asm1slimflowchart')
    print(f'ASM1SlimFlowChart表结构:')
    for col in columns:
        print(f'  {col["name"]}: {col["type"]}')
else:
    print('ASM1SlimFlowChart表不存在，可能需要运行数据库迁移')