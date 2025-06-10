# 🔧 Cursor MCP 配置指南

## 📋 已配置的MCP服务器

### 1. **GitHub MCP Server** 🐙
**功能**: 代码仓库管理、PR操作、Issues处理
**提供工具**:
- 📂 浏览仓库文件和目录
- 🔍 搜索代码和Issues
- 📝 创建和管理Pull Requests
- 🐛 创建和更新Issues
- 📊 获取仓库统计信息

### 2. **FileSystem MCP Server** 📁
**功能**: 本地文件系统操作
**提供工具**:
- 📖 读取文件内容
- ✏️ 写入文件内容
- 📂 列出目录内容
- �� 搜索文件
- 📋 获取文件信息

### 3. **Sentry MCP Server** 🚨
**功能**: Bug检查和错误监控
**提供工具**:
- 🐛 查询错误和异常
- 📊 获取性能监控数据
- 🔍 分析崩溃报告和堆栈跟踪
- 📈 获取项目健康状况
- 🎯 创建和管理Issues

## 🛠️ 配置步骤

### 第一步：获取所需Token

#### GitHub Token
1. 访问 GitHub Settings → Developer settings → Personal access tokens
2. 生成新token，权限选择：
   - `repo` (完整仓库访问)
   - `read:user` (读取用户信息)
   - `read:org` (如需要组织访问)

#### Sentry Token (可选)
1. 访问 Sentry Settings → Auth Tokens
2. 创建新token，权限选择：
   - `project:read` (读取项目数据)
   - `event:read` (读取错误事件)
   - `org:read` (读取组织信息)

### 第二步：更新配置文件
编辑 `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxxxxxxxxxxxxxxxxxxx"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem"],
      "env": {
        "ALLOWED_DIRECTORIES": "/home/ubuntu/andejiazhengcrm"
      }
    },
    "sentry": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sentry"],
      "env": {
        "SENTRY_AUTH_TOKEN": "sntrys_xxxxxxxxxxxxxxxxxxxx",
        "SENTRY_ORG": "your-org-slug",
        "SENTRY_PROJECT": "andejiazheng-crm"
      }
    }
  }
}
```

### 第三步：重启Cursor
配置完成后，重启Cursor使配置生效。

## 🚀 使用示例

### GitHub操作示例
```bash
# AI可以执行的操作示例：
"帮我查看最近的PR列表"
"创建一个新的Issue来跟踪用户认证bug"
"搜索项目中所有包含'password'的代码文件"
"查看main分支的最新提交"
```

### 文件系统操作示例
```bash
# AI可以执行的操作示例：
"读取backend/src/config/database.config.ts文件"
"列出所有的.env文件"
"搜索项目中包含'JWT'的文件"
"创建一个新的API路由文件"
```

### Bug检查操作示例 🆕
```bash
# AI可以执行的Sentry操作示例：
"查看最近24小时的错误统计"
"分析最频繁的异常类型"
"获取数据库连接错误的详细信息"
"查看API响应时间性能数据"
"创建一个Issue来跟踪高频错误"
```

## 🛡️ 安全建议

### GitHub Token安全
- ✅ 设置token过期时间
- ✅ 只授予必要的最小权限
- ✅ 定期轮换token
- ❌ 不要在代码中硬编码token

### Sentry Token安全
- ✅ 使用最小权限原则
- ✅ 定期检查token使用情况
- ✅ 设置token过期时间
- ❌ 避免在公共仓库中暴露

### 文件系统安全
- ✅ 限制`ALLOWED_DIRECTORIES`到项目目录
- ✅ 不允许访问系统敏感目录
- ✅ 注意敏感文件的读写权限

## 🔍 故障排除

### 常见问题
1. **MCP服务器启动失败**
   - 检查网络连接和npm权限
   - 运行 `npx @modelcontextprotocol/server-github` 测试

2. **GitHub认证失败**
   - 验证token是否正确
   - 检查token权限设置

3. **Sentry连接失败**
   - 验证组织名和项目名是否正确
   - 检查token权限是否足够

4. **文件系统访问被拒绝**
   - 检查目录路径是否正确
   - 验证文件读写权限

### 调试命令
```bash
# 测试GitHub MCP
npx @modelcontextprotocol/server-github

# 测试FileSystem MCP  
npx @modelcontextprotocol/server-filesystem

# 测试Sentry MCP
npx @modelcontextprotocol/server-sentry

# 查看Cursor MCP状态
# Cursor Settings → MCP 查看服务器状态
```

## 📈 使用建议

### 最佳实践
1. **渐进式使用** - 先熟悉基础功能再探索高级特性
2. **明确指令** - 给AI清晰具体的任务指令
3. **安全意识** - 避免操作敏感配置文件
4. **备份习惯** - 重要操作前先备份

### Bug检查工作流程 🆕
1. **实时监控** - 让AI定期检查错误统计
2. **问题分析** - 深入分析高频错误的根本原因
3. **优先级排序** - 根据影响范围确定修复优先级
4. **跟踪修复** - 创建Issues跟踪bug修复进度

### 工作流程整合
- 🔄 **代码审查**: 让AI帮助分析PR和代码质量
- 📝 **文档生成**: 自动生成API文档和README
- 🐛 **Bug跟踪**: 快速创建和管理Issues
- 📊 **项目分析**: 获取代码统计和项目健康状况
- 🚨 **错误监控**: 实时追踪和分析生产环境问题

## 🎯 其他推荐的Bug检查工具

如果你想要更多的代码质量检查，可以考虑：

### Semgrep MCP (代码安全扫描)
```json
"semgrep": {
  "command": "npx",
  "args": ["-y", "@semgrep/mcp-server"],
  "env": {
    "SEMGREP_APP_TOKEN": "your-token"
  }
}
```

### ESLint集成 (JavaScript/TypeScript检查)
通过文件系统MCP，AI可以读取ESLint配置并分析代码质量问题。

---

💡 **提示**: 配置完成后，在Cursor的Agent模式下使用自然语言即可调用这些MCP工具！ 