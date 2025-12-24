#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将 .doc 文件转换为 Markdown 格式
"""
import subprocess
import sys
import os

doc_file = "携保api/携保产品接入文档_20250911.doc"
output_file = "携保api/携保产品接入文档.md"

# 尝试使用 textutil (macOS) 或 antiword (Linux)
try:
    # 先尝试 antiword
    result = subprocess.run(
        ['antiword', doc_file],
        capture_output=True,
        text=True,
        timeout=30
    )
    
    if result.returncode == 0:
        content = result.stdout
        
        # 简单格式化为 Markdown
        lines = content.split('\n')
        markdown_lines = []
        
        for line in lines:
            line = line.strip()
            if not line:
                markdown_lines.append('')
                continue
            
            # 检测标题（全大写或特定格式）
            if len(line) < 50 and (line.isupper() or line.startswith('第') or '、' in line[:10]):
                markdown_lines.append(f'\n## {line}\n')
            else:
                markdown_lines.append(line)
        
        # 写入文件
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(markdown_lines))
        
        print(f"✅ 转换成功！输出文件: {output_file}")
        print(f"📄 文件大小: {len(markdown_lines)} 行")
        
    else:
        print(f"❌ antiword 转换失败: {result.stderr}")
        sys.exit(1)
        
except FileNotFoundError:
    print("❌ 未找到 antiword 工具，请先安装: sudo apt-get install antiword")
    sys.exit(1)
except Exception as e:
    print(f"❌ 转换失败: {e}")
    sys.exit(1)

