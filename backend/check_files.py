import json

with open('temp/uploads/file_metadata.json', 'r', encoding='utf-8') as f:
    metadata = json.load(f)
    print('当前存在的文件ID:')
    for file_id, info in metadata.items():
        print(f'  {file_id}: {info["original_filename"]}')