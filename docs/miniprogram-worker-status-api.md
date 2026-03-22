# 小程序：劳动者保险与背调状态接口

## 接口用途
用于合同详情页展示该劳动者（阿姨）的最新保险和背调状态。

## 接口一：按简历ID查询（推荐）

**GET** `/resumes/miniprogram/:resumeId/check-status`

**请求头**：需携带 JWT Token（`Authorization: Bearer <token>`）

**路径参数**：
- `resumeId`：简历的 MongoDB ObjectId

**成功响应示例**：
```json
{
  "success": true,
  "message": "查询成功",
  "data": {
    "hasInsurance": true,
    "hasBackgroundCheck": true,
    "latestInsurance": {
      "_id": "...",
      "policyNo": "14527...",
      "status": "active",
      "insuredList": [{ "name": "张三", "idNumber": "110..." }],
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "latestBackgroundCheck": {
      "_id": "...",
      "name": "张三",
      "idNo": "110...",
      "status": 4,
      "reportId": "...",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

## 接口二：按身份证号查询

**POST** `/resumes/miniprogram/check-status-by-idcard`

**请求体**：
```json
{ "idCard": "110101199001011234" }
```

**响应格式同上。**

## 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `hasInsurance` | boolean | 是否有有效（active）保险 |
| `hasBackgroundCheck` | boolean | 是否有背调记录 |
| `latestInsurance` | object \| null | 最新一条有效保单详情；无则为 null |
| `latestBackgroundCheck` | object \| null | 最新一条背调记录详情；无则为 null |

## 权限说明
- 需要 `resume:view` 权限（所有已登录的 admin/manager/employee 均具备）
- 查询结果**不限于**当前登录用户创建的记录，显示该劳动者的所有记录
