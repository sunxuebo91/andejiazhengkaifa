# L爱签技术文档

本手册详细介绍了爱签开放平台（Asign）的完整技术架构、接入准备、接口规范及核心 API 参考，旨在为开发者提供全方位的集成指导。

---

## 1. 接入流程与准备 (Onboarding & Preparation)

在正式开始开发集成前，需按照以下步骤完成平台端的配置：

### 1.1 开发者入驻
1.  **账号注册**：访问[爱签开放平台](https://www.asign.cn)注册企业账号。
2.  **企业认证**：提交营业执照、法人信息及开户许可进行实名认证。认证通过后方可开启 API 权限。

### 1.2 应用配置 (AppId & AppSecret)
1.  **创建应用**：在管理后台“应用管理”中创建应用，系统将分配唯一的 `AppId`。
2.  **获取密钥**：获取 `AppSecret`，用于获取 OAuth2 的 `access_token`。

### 1.3 证书秘钥管理 (RSA Key)
爱签采用 RSA 非对称加密确保请求不可抵赖。
1.  **秘钥对生成**：开发者需生成 2048 位 RSA 秘钥对（推荐使用 OpenSSL 或爱签提供的工具）。
2.  **上传公钥**：将开发者的 **RSA 公钥**（Public Key）上传至爱签后台。
3.  **获取平台公钥**：在后台下载爱签官方的 **RSA 公钥**，用于验证爱签推送的异步通知签名。

### 1.4 安全加固 (IP Whitelist)
- **IP 白名单**：在应用设置中配置请求来源服务器的公网 IP 列表，防止秘钥泄露后的非法调用。

---

## 2. 环境与域名 (Environment & Host)

| 环境类型 | API 域名 | 适用场景 |
| :--- | :--- | :--- |
| **沙箱测试环境** | `https://prev.asign.cn` | 开发调试、功能联调（不具法律效力，不消耗余额）。 |
| **生产正式环境** | `https://oapi.asign.cn` | 业务上线、正式签署（具备法律效力，消耗套餐余额）。 |

---

## 3. 技术规范 (Technical Specifications)

### 3.1 通讯协议
- **协议**：全站强制使用 HTTPS。
- **端口**：443。
- **请求方式**：统一使用 `POST`。
- **字符编码**：所有报文均使用 `UTF-8` 编码。

### 3.2 报文格式 (Content-Type)
1.  **普通数据接口**：使用 `application/json; charset=UTF-8`。
2.  **文件处理接口**：涉及 PDF、图片上传时，使用 `multipart/form-data; charset=UTF-8`。

### 3.3 接口响应标准
所有 API 响应均包含以下通用字段：
- `code`: 状态码（`0` 表示成功，非 `0` 表示异常）。
- `message`: 错误或成功描述。
- `data`: 业务结果对象。
- `timestamp`: 服务器响应时间戳。

---

## 4. 认证鉴权体系 (Authentication)

爱签支持两种互补的鉴权模式，开发者需根据接口定义选择：

### 4.1 签名鉴权模式 (Sign Mode)
主要用于后端 API 直接调用。通过在 Header 中携带 `sign` 字段进行身份验证。

### 4.2 OAuth2 令牌模式 (Token Mode)
主要用于前端 H5 页面集成或特定高级 API。
- **获取 Token**：调用 `/v1/oauth2/access_token` 接口。
- **Header 字段**：`X-Tsign-Open-Token: {token}`。
- **缓存策略**：Token 有效期 2 小时，建议提前 10 分钟自动刷新。

---

## 5. 核心：签名算法详解 (Signature Mechanism)

签名（Sign）是保证接口安全的核心。开发者必须严格按照以下步骤生成签名。

### 5.1 第一步：业务参数 (bizData) 排序与序列化
1.  **参数清理**：移除所有值为 `null` 的字段。
2.  **递归排序**：对 `bizData` 对象内的所有 Key 按 ASCII 码从小到大排序。如果 Value 是对象或数组，也必须内部排序。
3.  **序列化**：将排序后的对象转为 JSON 字符串。
    *   *禁忌：* 不得包含多余的空格或换行符。
    *   *编码：* 确保中文字符不被转义（必须是原始 UTF-8 字符）。

### 5.2 第二步：待签名原串拼接 (String to Sign)
拼接公式：
`CanonicalString = bizDataString + MD5(bizDataString) + appId + timestamp`

- `bizDataString`：第一步生成的 JSON 字符串。
- `MD5(bizDataString)`：对该字符串进行 32 位小写 MD5 摘要计算。
- `appId`: 应用 ID。
- `timestamp`: 毫秒级时间戳。

### 5.3 第三步：RSA 执行签名
1.  **哈希算法**：使用 `SHA1`。
2.  **私钥加密**：使用开发者的 RSA 私钥对 `CanonicalString` 的哈希值进行加密。
3.  **编码输出**：将加密后的二进制流进行 Base64 编码，即得到 `sign`。

---

## 6. 公共参数定义 (Public Parameters)

### 6.1 请求头 (Headers)
| 字段 | 必填 | 说明 |
| :--- | :--- | :--- |
| `sign` | 是 | 按照第 5 节生成的 RSA 签名。 |
| `Content-Type` | 是 | 根据 3.2 节选择。 |

### 6.2 请求参数 (Request Params)
| 字段 | 必填 | 说明 |
| :--- | :--- | :--- |
| `appId` | 是 | 应用唯一标识。 |
| `timestamp` | 是 | 发起请求时的毫秒时间戳。 |
| `bizData` | 是 | 业务逻辑参数（JSON 字符串）。 |

---

## 7. 核心 API 模块概览

### 7.1 实名认证模块
- **个人三要素认证** (`/auth/person/mobile3`): 姓名+身份证+手机号校验。
- **企业三要素认证** (`/auth/company/mobile3`): 企业名+信用代码+法人名校验。
- **人脸核身** (`/auth/person/face`): 活体检测及人脸对比。
- **认证链接获取** (`/auth/person/identifyUrl`): 获取带 UI 的实名引导页面。

### 7.2 签署流程模块
- **上传合同文件** (`/contract/uploadContract`): 将本地 PDF 上传至云端。
- **创建签署流程** (`/contract/createContract`): 初始化一个合同签署任务。
- **添加签署节点** (`/contract/addSigner`): 设定签署人、位置（坐标或关键字）、通知方式。
- **获取签署链接** (`/contract/getSignUrl`): 获取跳转签署页面的 URL。

#### 7.2.1 创建待签署文件详细说明

**接口地址**: `https://{host}/contract/createContract`

**接口描述**: 可以通过本接口创建待签署文件，支持基于已上传的文件、直传本地文件或合同模板关联3种方式。

**添加待签文件3种方式**：
1. 直传本地文件，可通过接口参数 `contractFiles` 将文本上传到爱签平台
2. 基于已上传的文件，可通过接口参数 `fileIds` 关联上通过文件上传接口提前上传的文件
3. 关联合同模板，可通过接口参数 `templates` 关联上已添加的模板文件

**支持格式**: .doc, .docx, .pdf, .xls, .xlsx, .png, .jpg, .jpeg, .ofd

**请求参数**:

| 参数名 | 数据类型 | 必选 | 说明 |
|--------|----------|------|------|
| contractNo | String | 是 | 合同ID，合同唯一编号（40位以内） |
| contractName | String | 是 | 合同名称（120位以内，不可包含特殊字符：*":/\<>|？及emoji） |
| validityTime | Integer | 否 | 合同签署剩余天数（与validityDate必传其一） |
| validityDate | String | 否 | 合同有效截止日期，格式：yyyy-MM-dd HH:mm:ss |
| signOrder | Integer | 是 | 签约方式：1=无序签约（默认），2=顺序签约 |
| fileIds | List{String} | 否 | 上传文件的唯一标识（与模板、附件必传其一） |
| contractFiles | List{MultipartFile} | 否 | 合同附件（与模板、fileIds必传其一） |
| templates | List{Object} | 否 | 合同模板列表（与附件、fileIds必传其一） |

**templates 参数详细说明**:

| 参数名 | 数据类型 | 必选 | 说明 |
|--------|----------|------|------|
| templateNo | String | 否 | 合同模板编号 |
| fileName | String | 否 | 文件名称（自定义模板文件的展示名称，不包含后缀） |
| contractNo | String | 否 | 合同编号（可传已完成签署的合同编号，实现追加签章） |
| fillData | Map | 否 | 单行文本、多行文本、日期、身份证类型参数填充（key为dataKey，value为填充值） |
| componentData | List{Object} | 否 | 单选、复选、勾选、下拉选择、图片类型参数填充 |
| tableDatas | List{Object} | 否 | 表格填充数据 |

**componentData 参数详细说明**:

| 参数名 | 数据类型 | 必选 | 说明 |
|--------|----------|------|------|
| type | Integer | 是 | 组件类型：2=单选，3=勾选，9=复选（多选），11=图片，16=下拉选择 |
| keyword | String | 是 | 参数名称（对应模板中的dataKey） |
| defaultValue | String | 否 | 当type=3（勾选）时填写：Yes=选中，Off=不选中 |
| options | List{Object} | 否 | **多选组件（type=9）的选项内容** |
| options.index | Integer | 是 | 下标：从0开始（选项在模板中的位置） |
| options.selected | Boolean | 是 | 选中标记（true为选中） |
| imageByte | byte[] | 否 | 图片资源（与imageBase64二选一） |
| imageBase64 | String | 否 | 图片资源（与imageByte二选一） |

**⭐ 重要说明 - 多选组件（type=9）的正确格式**:

多选组件必须使用 `options` 数组，每个选项包含 `index`（选项在模板中的索引）和 `selected`（是否选中）：

```json
{
  "type": 9,
  "keyword": "多选6",
  "options": [
    {"index": 0, "selected": true},
    {"index": 1, "selected": false},
    {"index": 2, "selected": true}
  ]
}
```

**处理流程**：
1. 先调用 `/template/data` 接口获取模板控件信息
2. 从返回的 `options` 数组中获取每个选项的 `label` 和 `index`
3. 根据用户选择的文本匹配对应的 `index`
4. 构建 `componentData` 时使用 `{index, selected}` 格式

**请求示例**:
```json
{
  "validityTime": 30,
  "contractNo": "contract_001",
  "contractName": "测试合同",
  "signOrder": 1,
  "templates": [{
    "templateNo": "TNA79D982752BB4F7CA54CDF5CD1E36A68",
    "fillData": {
      "客户姓名": "张三",
      "客户电话": "13800138000"
    },
    "componentData": [{
      "type": 9,
      "keyword": "多选6",
      "options": [
        {"index": 0, "selected": true},
        {"index": 1, "selected": false},
        {"index": 2, "selected": true}
      ]
    }, {
      "type": 3,
      "keyword": "同意协议",
      "defaultValue": "Yes"
    }]
  }]
}
```

**响应示例**:
```json
{
  "code": 100000,
  "msg": "成功",
  "data": {
    "previewUrl": "{合同预览链接}",
    "contractFiles": "[{\"fileName\":\"1.pdf\",\"attachNo\":1,\"page\":3}]"
  }
}
```

### 7.3 印章与存证模块
- **生成印章** (`/user/createSeal`): 为个人或企业创建合法电子印章。
- **原文存证** (`/record/save`): 对合同原始摘要进行司法存证。

### 7.4 模板管理模块
- **获取模板控件信息** (`/template/data`): 获取模板中定义的所有控件信息。
- **查询模板列表** (`/template/list`): 查询模板列表。
- **获取已同步的模板控件信息** (`/template/getTemplateData`): 获取已同步的模板控件信息。

---

## 7.5 获取模板控件信息详细说明

### 接口地址
`https://{host}/template/data`

### 请求参数
| 参数名 | 数据类型 | 必选 | 说明 |
|--------|----------|------|------|
| templateIdent | String | 是 | 模板编号 |

### 响应参数
| 参数名 | 数据类型 | 必选 | 说明 |
|--------|----------|------|------|
| code | int | 是 | 响应码，100000表示成功，其他表示异常 |
| msg | String | 是 | 响应信息 |
| data | List | 否 | 控件信息列表 |

### data 控件信息字段说明
| 参数名 | 数据类型 | 必选 | 说明 |
|--------|----------|------|------|
| dataType | Integer | 是 | 参数类型：<br>1：单行文本<br>2：单选<br>3：勾选<br>4：身份证<br>5：日期<br>6：签署区<br>7：签署时间<br>8：多行文本<br>9：多选<br>11：图片<br>12：表格<br>15：备注签署区<br>16：下拉控件 |
| dataKey | String | 是 | 参数填充标识 |
| fillType | Integer | 否 | 填充方：0=发起方，1=接收方 |
| autoScale | Integer | 是 | 是否自动缩放填充框（只限单行文本）：0=不缩放，1=自动缩放 |
| required | Integer | 否 | 是否必填：0=否，1=是 |
| options | List | 否 | 选项（当类型为单选、多选时返回） |
| options.label | String | 是 | 选项文本内容 |
| options.selected | Boolean | 是 | 是否选中 |
| options.index | Integer | 是 | 选项序号，下标 |

### 请求示例
```json
{
    "templateIdent": "TN3CD3DE6D6A654E62B3E6EF9F46F6E867"
}
```

### 响应示例
```json
{
    "code": 100000,
    "msg": "成功",
    "data": [{
        "dataType": 2,
        "dataKey": "单选1",
        "fillType": 1,
        "options": [{
            "label": "选项一",
            "selected": false,
            "index": 0
        }, {
            "label": "选项二",
            "selected": false,
            "index": 1
        }]
    }, {
        "dataType": 3,
        "fillType": 0,
        "dataKey": "勾选1"
    }, {
        "dataType": 1,
        "fillType": 1,
        "dataKey": "单行文本1"
    }, {
        "autoScale": 0,
        "dataKey": "多行文本1",
        "dataType": 8,
        "fillType": 0,
        "page": 1,
        "required": 1
    }]
}
```

---

## 8. 异步回调规范 (Webhook)

当合同签署完成、拒绝或实名成功时，爱签会主动推送消息。

### 8.1 验签流程
- 开发者必须使用 **爱签平台公钥** 对回调 Body 进行验签，确认来源合法性。

### 8.2 响应约定
- 接收成功必须返回 `SUCCESS`（或 code=0 结构），否则爱签会启动阶梯式重试（重试次数通常为 6-12 次）。

---

## 8.3 创建合同接口错误码

| 错误码 | 错误描述 |
|--------|----------|
| -1 | 未知错误，请联系管理员 |
| 0 | 参数错误/图片错误/图片格式错误/文件转换失败/系统繁忙 |
| 100039 | 合同仅支持pdf格式 |
| 100050 | 模板不存在 |
| 100055 | 参数错误，合同编号重复 |
| 100061 | 合同信息异常，请联系管理员 |
| 100564 | 参数错误，表格数据与模板设置行数不匹配 |
| 100565 | 参数错误，表格组件ID不存在 |
| 100566 | 参数错误，表格数据与模板设置列数不匹配 |
| 100577 | 参数错误，{param}长度超过限制:{length} |
| 100579 | 参数错误，{param}不能为空 |
| 100580 | 参数错误，{param1}、{param2}不能同时为空 |
| 100581 | 参数错误，签约顺序（1或者2） |
| 100604 | 参数错误，{param}长度小于{length} |
| 100605 | 合同截止日期格式错误 |
| 100606 | 合同大小不能超过10M |
| 100616 | 参数错误，refuseOn（0或者1） |
| 100626 | 参数错误，缺少模板必填参数 |
| 100640 | 参数错误，强制阅读时间不能为空 |

---

## 9. 常用枚举值 (Data Dictionary)

### 9.1 证件类型代码
- `1`: 身份证
- `2`: 护照
- `11`: 统一社会信用代码
- `12`: 工商注册号

### 9.2 签署状态 (Sign Status)
- `0`: 待签署
- `1`: 签署中
- `2`: 已完成
- `3`: 已撤销
- `4`: 已拒签
- `5`: 已过期

---

## 10. 错误代码与调试建议

| 错误码 | 类型 | 处理建议 |
| :--- | :--- | :--- |
| **0** | **失败/异常** | ⚠️ 注意：code=0 表示失败，需要查看 msg 字段获取详细错误信息 |
| **100000** | **成功** | 正常执行后续逻辑 |
| **100004** | **请求参数异常** | 检查请求参数格式、必填字段、字段类型是否正确 |
| **1001 - 1999** | **系统级错误** | 检查 appId、签名算法、IP 白名单及证书路径 |
| **2001 - 2999** | **认证类错误** | 提示用户身份信息不一致或实名不通过 |
| **3001 - 3999** | **签署类错误** | 检查合同编号、签署位置及套餐余额 |

### 10.1 重要提示
- ⚠️ **爱签API的响应码规则**：
  - `code = 100000` 表示成功
  - `code = 0` 表示失败/异常（不是成功！）
  - 其他非100000的code都表示异常
- 应该根据 `code` 来判断错误情况，不应该依赖 `msg` 匹配，因为 `msg` 可能会调整

### 10.2 调试建议
1.  **使用 Postman**：导入 SDK 中的 `asign-api.postman_collection_v2.1.json`，配置好变量即可一键调用。
2.  **查看日志**：爱签管理后台 -> 开发者中心 -> 接口调用日志。
3.  **时间同步**：确保服务器时间与北京时间同步。

---
*文档版本：V1.5.0 (全量深度集成版)*
*更新日期：2026-02-01*
