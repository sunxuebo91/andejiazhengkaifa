#!/bin/bash
LOGIN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['access_token'])")
echo "Token OK"

REC=$(curl -s --max-time 35 -X POST "http://localhost:3000/api/resumes/miniprogram/69c62a85ebecfb8660be52bd/recommendation" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "$REC" | python3 -c "
import sys,json
d=json.load(sys.stdin)
rec=d['data']['recommendation']
print('AI输出:')
print(rec)
print('字数:', len(rec))
import re
if re.search(r'[A-Fa-f0-9]{6}', rec):
    print('⚠️  仍含有疑似编号')
else:
    print('✅ 无编号')
" 2>/dev/null || echo "$REC"

