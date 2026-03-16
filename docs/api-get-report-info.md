# 获取报告数据 API

## 简要描述

获取报告数据

## 请求 URL

```
/platform_report_api/get_report_info
```

## 请求方式

POST

## Content-Type

`application/x-www-form-urlencoded`

---

## 请求参数

| 参数名 | 必选 | 类型 | 说明 |
|--------|------|------|------|
| reportId | 是 | string | 报告 Id |
| userId | 是 | string | 用户 id |

---

## 返回示例

```json
{
  "code": 200,
  "data": {
    "creditReportDigest": {
      "reportId": "2202410110532642759",
      "name": "*",
      "idNo": "*",
      "mobile": "15312128081",
      "sex": "女",
      "nation": null,
      "householdAddr": "江苏省连云港市",
      "birthday": 58291200000,
      "reviewStatus": 1,
      "identityRiskLevel": "无风险",
      "mobileOperatorsRiskLevel": null,
      "socialRiskLevel": "无风险",
      "fraudRiskLevel": null,
      "financeRiskLevel": "无风险",
      "courtRiskLevel": "无风险",
      "busiInfoRiskLevel": null,
      "finaSupervisionRiskLevel": null,
      "eduOccupationRiskLevel": null,
      "globalDatabaseRiskLevel": null,
      "referenceRiskLevel": null,
      "faceCheckRiskLevel": null,
      "healthRiskLevel": null,
      "otherRiskLevel": null,
      "mediaLibraryRiskLevel": null,
      "occupationRiskLevel": null,
      "riskScore": 94,
      "failNum": 1,
      "failItemNum": 1,
      "addressCheckRiskLevel": null,
      "penaltyRiskLevel": null,
      "eduRiskLevel": null,
      "qualificationsRiskLevel": null,
      "litigationRiskLevel": null,
      "resumeRiskLevel": null,
      "performanceRiskLevel": null,
      "resumeAndPerformanceRiskLevel": null,
      "resumeComparisonRiskLevel": null,
      "riskLevel": "无风险",
      "createTime": 1728621786000
    },
    "summary": "无风险",
    "outline": {
      "highestEducational": null,
      "highestEducationalSchool": null
    },
    "digestMap": {
      "digestMapInfo": {
        "realNamCheck": true
      },
      "digestListInfo": [
        {
          "result": "已查得",
          "level": "noData",
          "name": "身份风险",
          "risk": "无风险",
          "remark": "核实候选人身份信息真实性"
        },
        {
          "result": "未查得",
          "level": "yes",
          "name": "社会风险",
          "risk": "无风险",
          "remark": "核实候选人社会治安风险记录"
        },
        {
          "result": "未查得",
          "level": "yes",
          "name": "诉讼及处罚风险",
          "risk": "无风险",
          "remark": "核实候选人法院诉讼、失信、执行及其他行政处罚记录"
        },
        {
          "result": "未查得",
          "level": "yes",
          "name": "金融信用风险",
          "risk": "无风险",
          "remark": "核实候选人金融违约欺诈记录"
        }
      ]
    },
    "spiderDetail": null,
    "employerRefereeInfoList": null,
    "reportDeclare": "应*的委托，为了降低企业招聘人才的风险，就*的工作背景做细致的调查，本次调查结果获取途径合法，内容真实有效。本报告不得用于法律诉讼依据，仅供招聘决策参考之用。在任何情况下，对由于使用本报告所造成的损失，本公司不承担任何责任。且未经本公司许可，本报告内容不得向包括候选人在内的任何第三方透露。",
    "reportInfo": {
      "birthday": "19711107",
      "orgName": "*",
      "riskLevel": "无风险",
      "completeTime": 1728621785000,
      "userId": "201812280020829637",
      "isEffective": 1,
      "orgNameEn": null,
      "modifyTime": null,
      "tplName": "*定制套餐",
      "createTime": 1728621785000,
      "objectiveStatus": 4,
      "id": "2202410110532642759",
      "tplId": "201812280020838560",
      "sendAuthName": null,
      "isContainOffline": 0,
      "status": 4
    },
    "detail": {
      "102": {
        "itemCode": "102",
        "busiCateId": "201808300000108220",
        "displayFormat": "1",
        "busiCateName": "身份风险",
        "remark": "根据提供的身份证号，解析候选人的身份基本信息",
        "source": null,
        "sort": 2,
        "cateName": "查询类",
        "cateCode": "02",
        "queryCost": 0.1,
        "itemId": "1170330211338038028",
        "itemName": "户籍信息核实",
        "itemData": [
          {
            "itemPropLabel": "原始发证地",
            "itemPropName": "nativePlace",
            "itemPropValue": "江苏省连云港市赣榆县",
            "set": false
          },
          {
            "itemPropLabel": "出生日期",
            "itemPropName": "birthday",
            "itemPropValue": "1971-11-7",
            "set": false
          },
          {
            "itemPropLabel": "性别",
            "itemPropName": "gender",
            "itemPropValue": "女",
            "set": false
          },
          {
            "itemPropLabel": "年龄",
            "itemPropName": "age",
            "itemPropValue": 52,
            "set": false
          },
          {
            "itemPropLabel": "身份证号",
            "itemPropName": "idNo",
            "itemPropValue": "*",
            "set": false
          }
        ]
      }
    }
  }
}
```

---

## 返回字段说明

### creditReportDigest（报告摘要）

| 字段 | 类型 | 说明 |
|------|------|------|
| reportId | string | 报告 ID |
| name | string | 姓名 |
| idNo | string | 身份证号 |
| mobile | string | 手机号 |
| sex | string | 性别 |
| nation | string | 民族 |
| householdAddr | string | 户籍地址 |
| birthday | long | 出生日期（时间戳） |
| reviewStatus | int | 审核状态 |
| identityRiskLevel | string | 身份风险等级 |
| socialRiskLevel | string | 社会风险等级 |
| financeRiskLevel | string | 金融信用风险等级 |
| courtRiskLevel | string | 法院诉讼风险等级 |
| riskScore | int | 风险评分 |
| riskLevel | string | 综合风险等级 |
| createTime | long | 创建时间 |

### digestMap（风险明细）

| 字段 | 类型 | 说明 |
|------|------|------|
| digestMapInfo | object | 核验信息 |
| digestListInfo | array | 风险列表 |

### digestListInfo 数组项

| 字段 | 类型 | 说明 |
|------|------|------|
| name | string | 风险名称 |
| result | string | 查得/未查得 |
| level | string | 风险级别 |
| risk | string | 风险等级 |
| remark | string | 备注说明 |

### reportInfo（报告信息）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 报告 ID |
| userId | string | 用户 ID |
| orgName | string | 委托企业名称 |
| tplName | string | 套餐模板名称 |
| riskLevel | string | 风险等级 |
| status | int | 报告状态 |
| isEffective | int | 是否有效 |
| createTime | long | 创建时间 |
| completeTime | long | 完成时间 |

### detail（详细数据）

| 字段 | 类型 | 说明 |
|------|------|------|
| itemCode | string | 项目代码 |
| busiCateName | string | 业务分类名称 |
| itemName | string | 项目名称 |
| itemData | array | 项目数据列表 |

---

## 备注

- 本报告用于降低企业招聘人才的风险
- 调查结果获取途径合法，内容真实有效
- 本报告不得用于法律诉讼依据，仅供招聘决策参考之用
- 未经许可，报告内容不得向第三方透露
