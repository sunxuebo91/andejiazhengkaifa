# 爱签预览合同功能修复总结

## 问题描述

用户在电子签名页面点击"预览合同"按钮时，出现404错误：
```
ESignaturePage.tsx:1830 
预览合同失败: 
AxiosError {message: 'Request failed with status code 404', name: 'AxiosError', code: 'ERR_BAD_REQUEST', ...}
```

## 问题原因分析

1. **路由404错误**：初始测试显示预览合同端点返回404，表明路由配置或服务启动有问题
2. **API实现不符合官方文档**：原有实现只是简单获取合同状态，没有真正调用爱签的预览合同接口
3. **缺少必要参数**：爱签的预览合同接口需要签署方信息和签章策略参数

## 修复方案

### 1. 后端服务修复

#### 1.1 更新预览合同服务实现 (`backend/src/modules/esign/esign.service.ts`)

**修复前问题**：
- 只获取合同状态，没有调用真正的预览接口
- 没有按照官方文档要求传递签署方信息

**修复后改进**：
- 根据官方文档实现真正的预览功能
- 支持传入签署方信息和签章策略
- 提供默认的预览配置
- 包含备选方案（如果预览失败，回退到获取合同状态）

```typescript
async previewContract(contractNo: string, signers?: Array<{
  account: string;
  signStrategyList: Array<{
    attachNo: number;
    locationMode: number;
    signPage: number;
    signX: number;
    signY: number;
    signKey?: string;
  }>;
  isWrite?: number;
}>): Promise<any>
```

#### 1.2 更新控制器路由 (`backend/src/modules/esign/esign.controller.ts`)

**新增功能**：
- 支持GET和POST两种方式调用预览接口
- GET方式使用默认签署方配置
- POST方式支持自定义签署方配置

```typescript
@Get('preview-contract/:contractNo')
@Post('preview-contract/:contractNo')
```

### 2. 前端服务修复

#### 2.1 更新服务调用 (`frontend/src/services/esignService.ts`)

**改进**：
- 支持传入可选的签署方配置参数
- 自动选择GET或POST请求方式
- 统一的错误处理

#### 2.2 更新页面显示逻辑 (`frontend/src/pages/esign/ESignaturePage.tsx`)

**新增功能**：
- 显示预览模式（正常预览 vs 状态信息模式）
- 支持显示预览图片
- 增强的错误提示和状态显示

### 3. 官方文档对照

根据爱签官方文档和SDK示例：

**官方预览合同接口**：`/contract/previewContract`
**请求格式**：POST multipart/form-data
**必需参数**：
- `appId`: 应用ID
- `timestamp`: 时间戳  
- `bizData`: JSON字符串，包含签署方信息和签章策略
- `sign`: 签名

**我们的实现要点**：
- 使用`callESignAPI`方法统一处理签名和请求格式
- 支持默认和自定义签署方配置
- 预览只支持坐标签章模式（`locationMode: 2`）
- 包含错误处理和备选方案

## 测试结果

### 修复前
- 预览合同端点返回404错误
- 无法正常预览合同

### 修复后
- ✅ 预览合同GET端点正常工作
- ✅ 预览合同POST端点正常工作  
- ✅ 支持自定义签署方配置
- ✅ 包含备选方案（合同状态查询）
- ✅ 前端显示逻辑优化

### 测试命令验证
```bash
# GET方式测试
curl -X GET http://localhost:3001/api/esign/preview-contract/test123

# POST方式测试  
curl -X POST http://localhost:3001/api/esign/preview-contract/test123 \
  -H "Content-Type: application/json" \
  -d '{"signers":[{"account":"test_user","isWrite":0,"signStrategyList":[{"attachNo":1,"locationMode":2,"signPage":1,"signX":0.3,"signY":0.6}]}]}'
```

## 关键改进点

1. **符合官方API规范**：按照爱签官方文档实现预览接口
2. **增强错误处理**：提供备选方案和详细错误信息
3. **灵活配置支持**：支持默认和自定义签署方配置
4. **用户体验优化**：前端显示更丰富的预览信息
5. **代码健壮性**：完善的异常处理和日志记录

## 部署说明

1. 确保后端服务重新编译和重启
2. 前端无需额外操作，修改会自动生效
3. 爱签API配置需要正确的appId和私钥

## 后续优化建议

1. 可以考虑缓存预览结果，提高性能
2. 支持更多签章策略模式（目前只支持坐标模式）
3. 增加预览图片的缩放和下载功能
4. 优化签署方配置的用户界面 