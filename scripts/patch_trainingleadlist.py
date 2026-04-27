#!/usr/bin/env python3
"""Apply mobile (H5) responsive patches to TrainingLeadList.tsx."""
import sys

P = 'frontend/src/pages/training-leads/TrainingLeadList.tsx'
src = open(P, encoding='utf-8').read()
orig = src

# 1) Add Grid, List, Pagination imports + useBreakpoint
old1 = "  Upload\n} from 'antd';\nimport type { UploadProps } from 'antd';"
new1 = ("  Upload,\n  Grid,\n  List,\n  Pagination\n} from 'antd';\n"
        "import type { UploadProps } from 'antd';\n\n"
        "const { useBreakpoint } = Grid;")
if old1 not in src:
    print('FAIL: import block not found'); sys.exit(1)
src = src.replace(old1, new1, 1)

# 2) Add isMobile after const navigate
old2 = ("  const navigate = useNavigate();\n"
        "  const { hasPermission, user } = useAuth();\n"
        "  const isAdmin")
new2 = ("  const navigate = useNavigate();\n"
        "  const { hasPermission, user } = useAuth();\n"
        "  const screens = useBreakpoint();\n"
        "  const isMobile = !screens.md;\n"
        "  const isAdmin")
if old2 not in src:
    print('FAIL: navigate block not found'); sys.exit(1)
src = src.replace(old2, new2, 1)

# 3) Wrap outer container padding
old3 = "<div style={{ padding: '24px' }}>\n      <Card>"
new3 = ("<div style={{ padding: isMobile ? '12px' : '24px' }}>\n"
        "      <Card bodyStyle={{ padding: isMobile ? 12 : 24 }}>")
src = src.replace(old3, new3, 1)

if src == orig:
    print('NO CHANGES'); sys.exit(2)
open(P, 'w', encoding='utf-8').write(src)
print('OK')
