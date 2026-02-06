# 大树保保险系统第三方公共接口

## 用户签字 (Users' Signature)

| 部门 (Dept.) | 确认人签名 (Signed by) | 确认日期 (Signed Date) |
|-------------|---------------------|---------------------|
|             |                     |                     |
|             |                     |                     |
|             |                     |                     |

## 文档修订记录

| 版本编号 | 说明 | 日期 | 变更人 | 批准日期 | 批准人 |
|---------|------|------|--------|---------|--------|
| V1.0 | 初始版本 | 2016-04-01 | chenfy | | |
| V1.1 | 增加安联电子发票接口 | 2017-07-04 | chenfy | | |
| V1.1.9 | 增加批改接口 | 2021-04-14 | liujh | | |
| V1.2 | 增加实名认证接口和出单接口 | 2021-07-28 | Lige | | |
| V1.2.1 | 保单确认接口增加航意险相关字段 | 2021-12-29 | Chenzhong | | |
| V1.2.2 | 保单查询接口修改返回报文 | 2022-01-04 | Chenzhong | | |
| V1.2.3 | 新增航意险字段，增加航意险投保demo | 2022-01-05 | Ruanchaoxiong | | |
| V1.2.4 | 1.投保确认接口，航意险相关字段修改为非必填，增加说明；<br>2.增加1.2.3 测试和生产环境接口地址说明 | 2022-01-06 | Chenzhong | | |
| V1.2.5 | 修改生产环境接口地址 | 2022-02-24 | Chenzhong | | |
| V1.3.0 | 为泰康航延航意组合险添加报文字段 | 2022-06-21 | 陈中 | | |
| V1.3.4 | 新增生效后退保接口 | 2023-07-07 | 龚施豪 | | |
| V1.3.5 | 修正接口文档错误 | 2023-08-01 | 龚施豪 | | |
| V1.4.0 | 新增返佣信息参数节点 | 2023-08-24 | 龚施豪 | | |
| V1.4.1 | 新增返佣信息回调接口 | 2023-09-19 | 龚施豪 | | |
| V1.4.2 | 新增返佣信息查询接口 | 2023-09-26 | 龚施豪 | | |

## 目录

- [1.1. 第三方公共接口](#11-第三方公共接口)
  - [1.1.1. 接口列表](#111-接口列表)
  - [1.1.2. 报文格式](#112-报文格式)
  - [1.1.3. 投保确认](#113-投保确认)
  - [1.1.4. 保单注销](#114-保单注销)
  - [1.1.5. 保单查询](#115-保单查询)
  - [1.1.6. 保单打印](#116-保单打印)
  - [1.1.7. 电子发票](#117-电子发票)
  - [1.1.8. 支付订单](#118-支付订单)
  - [1.1.9. 批改接口](#119-批改接口)
  - [1.1.10. 批增接口](#1110-批增接口)
  - [1.1.11. 出单接口](#1111-出单接口)
  - [1.1.12. 保单生效后退保](#1112-保单生效后退保)
  - [1.1.13. 返佣通知回调接口](#1113-返佣通知回调接口)
  - [1.1.14. 系统环境](#1114-系统环境)

---

## 1.1. 第三方公共接口-Common Interface for Third Party System(s)

提供标准的 https 服务，接口为 XML 标准格式。第三方通过如下的标准格式，提供标准的 XML 报文。大树保的 https 服务，通过进行校验，返回相应的 XML 报文。如果返回成功的 XML 报文，则第三方系统的流程继续。如果返回失败的报文。没有收到大树保返回成功的报文，第三方不能自行生成保单或者批单。

针对审计需求，系统需要在第三方用户访问大树保服务的时候，记录用户的 IP 地址，并对用户权限进行验证，通过后记录请求报文信息。大树保服务处理完成用户请求后，也同样记录返回的报文信息。

### 1.1.1. 接口列表-InterfaceList

所有新单环节的接口需要在第一阶段完成。批改环节可以在后续阶段完成。

| 环节 | 请求类型 | 名称 | 描述 |
|-----|---------|------|------|
| 新单环节 | 0002 | 投保确认 | 渠道把确认好的保单信息传送给大树保平台，平台对保单数据进行校验，如果信息不符合要求，则平台返回相应的错误信息给到渠道。如果一切信息符合要求，那么针对非见费出单，系统直接生成保单，则返回保单号和保单已激活状态。 |
| | 0004 | 保单注销 | 保单生效前，渠道传送保单号信息给到大树保服务平台，大树保平台进行必要校验后，注销该张保单并返回信息给到渠道。（失败时返回相应的错误信息） |
| | 0005 | 保单查询 | 渠道根据请求大树保的流水号查询保单信息 |
| | 0006 | 保单打印 | 渠道传送保单号码给到大树保平台，大树保平台生成 PDF 文件，并返回该文件的 URL 地址给到渠道。（失败时返回相应的错误信息） |
| 新增 | 0008 | 电子发票 | 根据保单号获取电子发票，目前仅支持安联保险的产品获取电子发票！ |
| 支付订单 | 0022 | 支付订单 | 创建支付订单 |
| 批改接口 | 0007 | 批改接口 | 修改被保人信息 |
| | | 批增接口 | 添加被保人信息 |
| 出单接口 | | 出单接口 | 实名认证通过后，支付后，进行出单 |
| 退保接口 | 0014 | 退保接口 | 生效后退保接口 |

### 1.1.2. 报文格式-XML Message Format

#### 1.1.2.1. 返回报文-Response Message

返回报文按照平台处理结果，分为成功时的返回报文和失败时的报文。它们的报文头的格式相同，不同的是具体的值。另外，失败的时候，是没有报文体的。

**报文头块的格式：**

| 序号 | 字段名称 | 类型 | 大小 | 说明 |
|-----|---------|------|------|------|
| 1 | Success | 布尔 | 5 | true -成功，false -不成功 |
| 2 | Message | 字符 | 2000 | 错误说明 |
| 3 | OrderId | 字符 | 11 | 订单的 ID 号 |
| 4 | PolicyNo | 字符 | 64 | 保单号码 |
| 5 | PolicyPdfUrl | 字符 | 256 | 电子保单 URL |
| 6 | AgencyPolicyRef | 字符 | 50 | 渠道流水号 |
| 7 | TotalPremium | 数值 | | 保单保费 |

**返回成功时的报文格式范例：**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ResultInfo>
    <Success>true</Success>
    <PolicyNo>xxxxxxxx</PolicyNo>
    <PolicyPdfUrl>http://test.dasurebao.com.cn/static/pdf/xxxxxxxx.pdf</PolicyPdfUrl>
    <OrderId>0</OrderId>
    <AgencyPolicyRef>20161123103000749</AgencyPolicyRef>
    <TotalPremium>45.00</TotalPremium>
</ResultInfo>
```

**返回失败时的报文格式范例：**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ResultInfo>
    <Success>false</Success>
    <Message>被保险人年龄不在承保范围内</Message>
    <OrderId>0</OrderId>
</ResultInfo>
```

**XML 中的数据类型：**

| 类型 | 描述 |
|-----|------|
| 字符 | 文本信息，标明最大的长度。该长度是按单字节进行计算的，对于汉字字节数据按照长度为 3 为计。 |
| 数值 | 有正负符号的整数和小数两种：1、整数，标明最大的位数。2、小数，标明 p 精度（位数）和 s 等级（小数点后位数）。如：(3,2)表明[-9.99, +9.99]。 |
| 日期 | 泛指日期（Date）和时间（Time），根据使用的情况可以仅包含日期部分，也可能包含小时、分钟等部分；格式为：年月日时分秒，yyyyMMddHHmmss，中间不用连接符号。 |
| 布尔 | 代表了一个两价逻辑值（真或者假）。用 0，代表假或否；用 1，代表真或是 |
| 货币 | 以元为单位，默认对应数值类型（14,2），即精确到分；默认币种为人民币。用正负号代表指定的含义，如：用正值代表收款，负值代表付款。 |
| 枚举 | 枚举是字符的扩展类型，通常用于限制元素的取值。枚举型数据类型可以分为开放式枚举（Open Enum）和封闭式枚举（Close Enum）。<br>1.开放式枚举是指对一些有效的枚举值进行了定义，同时允许本标准的用户进行扩展。<br>2.封闭式枚举型是指已经对所有有效的枚举值进行了定义的枚举类型。任何未包含在定义范围内的值都是无效的。<br>——如果未加特别说明，本规范中的枚举默认代表封闭式枚举。 |
| 对象 | 当在XML 格式中嵌套一个或多个含有复杂属性的标签时，使用对象名称进行说明。如：重复投保提示中包含险种信息，而险种信息又包含险种代码；这时，在描述重复投保提示的险种信息时，可以使用对象的引用进行描述。参见 DTD 的属性定义方式。 |

#### 1.1.2.2. 测试和生产环境接口地址

| 环境 | 地址 |
|-----|------|
| 测试环境 | http://fx.test.dasurebao.com.cn/remoting/ws |
| 生产环境 | https://api.dasurebao.com.cn/remoting/ws |

### 1.1.3. 投保确认-Policy Confirmation

#### 1.1.3.1. 请求报文-Request Message

请求报文的报文头部分是固定的，格式如下：

| 序号 | 字段名称 | 类型 | 大小 | 必传 | 说明 |
|-----|---------|------|------|------|------|
| 1 | RequestType | 枚举 | 4 | Y | 请求的接口类型代码 |
| 2 | User | 字符 | 30 | Y | 用户名 |
| 3 | Password | 字符 | 200 | Y | 密码 |

而报文的报文体部分因具体的接口类型不同，而不同。

**请求报文的报文格式范例：**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Packet type="REQUEST" version="1.0">
    <Head>
        <RequestType>0002</RequestType>
        <User>4001002003</User>
        <Password>3825ed7c-e848-42a9-a6ab-7a02177924a4</Password>
    </Head>
    <Body>
        ……
    </Body>
</Packet>
```

#### 1.1.3.2. 请求报文-Request Message

##### 1.1.3.2.1. 保单基本信息-Basic Policy Information

**保单基本信息-Policy**

| 序号 | 字段名称 | 类型 | 大小 | 必传 | 说明 |
|-----|---------|------|------|------|------|
| 1 | AgencyPolicyRef | 字符 | 50 | Y | 渠道流水号（请仔细阅读接口列表中投保确认的红色字体部分，避免重复保单的情况发生） |
| 2 | ProductCode | 字符 | 50 | N | 保险产品代码 |
| 3 | PlanCode | 字符 | 50 | Y | 保险计划代码 |
| 4 | IssueDate | 日期 | | Y | 出单日期yyyyMMddHHmmss |
| 5 | EffectiveDate | 日期 | | Y | 保单生效日期yyyyMMddHHmmss |
| 6 | ExpireDate | 日期 | | Y | 保单结束日期yyyyMMddHHmmss |
| 7 | Destination | 字符 | 100 | N | 目的地信息 |
| 8 | GroupSize | 数值 | | Y | 被保险人个数 |
| 9 | Remark | 字符 | 2000 | N | 备注说明 |
| 10 | PremiumCalType | 枚举 | 1 | N | 保费计算方式，同计划类型<br>1-普通<br>2-双人<br>3-家庭 |
| 11 | TotalPremium | 数值 | | Y | |
| 12 | FlightNumber | 字符 | 256 | N | 航班号，某些特殊产品要求必填，如泰康航联版航意险 |
| 13 | DepartureTime | 日期 | | N | 起飞时间 |
| 14 | TicketNo | 字符 | 256 | N | 客票号，某些特殊产品要求必填，如泰康航联版航意险 |
| 15 | Departure | 字符 | 64 | N | 起始地，某些特殊产品要求必填，如泰康航联版航意险 |
| 16 | ArriveStationName | 字符 | 64 | N | 目的地，某些特殊产品要求必填，如泰康航联版航意险 |
| 17 | ArrivalTime | 日期 | | N | 到达时间，某些特殊产品要求必填，如泰康航联版航意险 |
| 18 | OrderId | 订单编号 | | N | 订单编号，工单险必传 |
| 19 | ServiceAddress | 服务地址 | 500 | N | 服务地址，工单险必传 |

##### 1.1.3.2.2. 渠道信息-Channel Information

##### 1.1.3.2.3. 投保人信息-Policy Holder

**投保人-Policy Holder**

| 序号 | 字段名称 | 类型 | 大小 | 必传 | 说明 |
|-----|---------|------|------|------|------|
| 1 | PolicyHolderType | 枚举 | 1 | Y | 投保人类型<br>I-个人(Individual)<br>C-企业或者机构 |
| 2 | PolicyHolderName | 字符 | 200 | Y | 名称 |
| 3 | PHIdType | 枚举 | 1 | Y | 证件类型，如果为个人则必填<br>1-身份证<br>2-护照<br>3-其他<br>4-军人证<br>6-港澳台居民居住证<br>7-外国人永久居留证<br>8-港澳居民来往内地通行证<br>9-台湾居民来往大陆通行证<br>11-组织机构代码证<br>14-统一社会信用代码 |
| 4 | PHIdNumber | 字符 | 30 | Y | 证件号码，如果为个人则必填 |
| 5 | PHBirthDate | 日期 | | N | 出生日期 |
| 6 | Gender | 枚举 | 2 | N | 性别：<br>M-男、F-女和 O(Other)-其他 |
| 7 | PHTelephone | 字符 | 30 | N | 联系电话 |
| 8 | PHAddress | 字符 | 200 | N | 具体联系地址 |
| 9 | PHPostCode | 字符 | 6 | N | 邮政编码 |
| 10 | PHEmail | 字符 | 100 | N | 电子邮件 |
| 11 | ReqFaPiao | 字符 | 1 | Y | 是否打印发票，默认不需要<br>1-需要<br>0-不需要 |
| 12 | ReqMail | 字符 | 1 | Y | 是否邮寄发票，默认不需要<br>1-需要<br>0-不需要 |
| 13 | MailType | 枚举 | 1 | N | 如果需要邮寄，则该信息必须<br>1-平邮<br>2-快递，客户需要自己支付快递费用 |
| 14 | PHProvinceCode | 字符 | 6 | N | 投保人所在地省级编码<br>为工单险必传 |
| 15 | PHCityCode | 字符 | 6 | N | 投保人所在地市级编码<br>为工单险必传 |
| 16 | PHDistrictCode | 字符 | 6 | N | 投保人所在地区级编码<br>为工单险必传 |

##### 1.1.3.2.4. 被保险人清单-Insured List

**被保险人-Insured**

| 序号 | 字段名称 | 类型 | 大小 | 必传 | 说明 |
|-----|---------|------|------|------|------|
| 1 | InsuredId | 数值 | | N | 被保险人唯一 Id，用来确认该保单下被保险人的唯一性 |
| 2 | InsuredName | 字符 | 100 | Y | 被保险人姓名 |
| 3 | InsuredType | 枚举 | 5 | Y | 被保险人类型<br>1-成人（18-65 周岁）<br>2-儿童（18 周岁以下）<br>3-老人（65 周岁以上） |
| 4 | IdType | 枚举 | 2 | Y | 证件类型<br>1-身份证<br>2-护照<br>3-其他<br>4-军人证<br>6-港澳台居民居住证<br>7-外国人永久居留证<br>8-港澳居民来往内地通行证<br>9-台湾居民来往大陆通行证 |
| 5 | IdNumber | 字符 | 30 | Y | 证件号码 |
| 6 | BirthDate | 日期 | | Y | 出生日期 |
| 7 | Mobile | 字符 | 30 | N | 联系电话 |
| 8 | Email | 字符 | 100 | N | 电子邮件 |
| 9 | Gender | 枚举 | 2 | Y | 性别：<br>M-男、F-女和 O(Other)-其他 |
| 10 | InsuredOccupationCode | 字符 | 64 | N | 职业类别代码，部分产品必须 |
| 11 | InsuredOccupationName | 字符 | 64 | N | 职业类别名称，部分产品必须 |
| 12 | BeneficialType | 枚举 | 1 | N | 受益类型<br>1-法定<br>2-顺位<br>3-均分<br>4-比例 |
| 13 | BeneficiaryList | 对象 | | N | 参考受益人信息，可多个 |
| 14 | EmergencyContact | 对象 | | N | 参考紧急联系人信息,可多个 |
| 15 | RelationShip | 与投保人关系 | 2 | N | 01-本人<br>40-子女 |

##### 1.1.3.2.5. 受益人清单-Beneficiary List

**受益人-Beneficiary**

| 序号 | 字段名称 | 类型 | 大小 | 必传 | 说明 |
|-----|---------|------|------|------|------|
| 1 | BeneficiaryName | 字符 | 30 | N | 受益人姓名 |
| 2 | IdType | 枚举 | 2 | N | 证件类型<br>1-身份证<br>2-护照<br>3-其他<br>4-军人证<br>6-港澳台居民居住证<br>7-外国人永久居留证<br>8-港澳居民来往内地通行证<br>9-台湾居民来往大陆通行证 |
| 3 | IdNumber | 字符 | 30 | N | 证件号码 |
| 4 | RelationShip | 枚举 | 1 | N | 受益人与被保险人关系<br>1-配偶<br>2-子女<br>3-父母<br>4-其他 |
| 5 | Percentage | 数值 | | N | 受益人所占比例，总比例和为 100 |
| 6 | Mobile | 字符 | 30 | N | 联系电话 |
| 7 | Email | 字符 | 100 | N | 电子邮件 |

##### 1.1.3.2.6. 紧急联系人信息-Emergency Contact

**紧急联系人-Emergency Contact**

| 序号 | 字段名称 | 类型 | 大小 | 必传 | 说明 |
|-----|---------|------|------|------|------|
| 1 | ContactName | 字符 | 30 | N | 紧急联系人姓名 |
| 2 | IdType | 枚举 | 2 | N | 证件类型<br>1-身份证<br>2-护照<br>3-其他<br>4-军人证<br>6-港澳台居民居住证<br>7-外国人永久居留证<br>8-港澳居民来往内地通行证<br>9-台湾居民来往大陆通行证 |
| 3 | IdNumber | 字符 | 30 | N | 证件号码 |
| 5 | Mobile | 字符 | 30 | N | 联系电话 |
| 6 | Email | 字符 | 100 | N | 电子邮件 |

##### 1.1.3.2.7. 返佣信息-RebateInfo

返佣相关才需要传

**返佣信息-RebateInfo（需要返佣时必传）**

| 序号 | 字段名称 | 类型 | 大小 | 必传 | 说明 |
|-----|---------|------|------|------|------|
| 1 | RebateRate | 数值 | 30 | Y | 返佣比例，小数格式，如返佣10%传值为0.1 |
| 2 | RebateCusName | 字符 | 50 | Y | 返佣客户姓名 |
| 3 | RebateCusIdNo | 字符 | 30 | Y | 返佣客户身份证号 |
| 4 | RebateAccountNo | 字符 | 50 | Y | 返佣客户银行卡号 |
| 5 | RebateBankKeepMobile | 字符 | 20 | Y | 返佣客户银行卡留存手机号 |
| 6 | RebateDelayDays | 数值 | 10 | N | 返佣延迟天数，数值必须大于等于1，此字段传值后，设字段值为X，当前时间为T，则实际返佣日期为T+X，未传值的情况下，返佣日期默认T+1 |

#### 1.1.3.3. 报文范例-Message Examples

##### 1.1.3.3.1. 请求数据-Request Data

**基本示例：**

```xml
<Packet type="REQUEST" version="1.0">
    <Head>
        <RequestType>0002</RequestType>
        <User>xxx</User>
        <Password>xxx</Password>
    </Head>
    <Body>
        <Policy>
            <AgencyPolicyRef>14090923493624</AgencyPolicyRef>
            <ProductCode>020933</ProductCode>
            <PlanCode>ITASIL</PlanCode>
            <IssueDate>20140910000000</IssueDate>
            <EffectiveDate>20140910000000</EffectiveDate>
            <ExpireDate>20140910235959</ExpireDate>
            <GroupSize>1</GroupSize>
            <PremiumCalType>1</PremiumCalType>
            <TotalPremium>105</TotalPremium>
            <OrderId>1234567890</OrderId>
            <ServiceAddress>服务省服务区服务小区服务1号楼服务101室</ServiceAddress>
        </Policy>
        <PolicyHolder>
            <PolicyHolderType>I</PolicyHolderType>
            <PolicyHolderName>ysbian</PolicyHolderName>
            <PHIdType>2</PHIdType>
            <PHIdNumber>423432432</PHIdNumber>
            <PHBirthDate>19960101000000</PHBirthDate>
            <PHPostCode>000000</PHPostCode>
            <ReqFaPiao>0</ReqFaPiao>
            <ReqMail>0</ReqMail>
            <PHProvinceCode>340000</PHProvinceCode>
            <PHCityCode>340100</PHCityCode>
            <PHDistrictCode>340103</PHDistrictCode>
        </PolicyHolder>
        <InsuredList>
            <Insured>
                <InsuredId>0</InsuredId>
                <InsuredName>zhangsan</InsuredName>
                <InsuredType>1</InsuredType>
                <IdType>2</IdType>
                <IdNumber>423432432</IdNumber>
                <BirthDate>19960101000000</BirthDate>
                <Gender>M</Gender>
                <RelationShip>01</RelationShip>
                <BeneficialType>1</BeneficialType>
                <BeneficiaryList />
            </Insured>
        </InsuredList>
    </Body>
</Packet>
```

**工单险示例：**

```xml
<?xml version="1.0"?>
<Packet type="REQUEST" version="1.0">
    <Head>
        <RequestType>0002</RequestType>
        <User>XXXX</User>
        <Password>XXXX</Password>
    </Head>
    <Body>
        <Policy>
            <AgencyPolicyRef>agentTest20230626152755019</AgencyPolicyRef>
            <ProductCode>MP10000788</ProductCode>
            <PlanCode>PK00069992</PlanCode>
            <IssueDate>20230626152755</IssueDate>
            <EffectiveDate>20230627162755</EffectiveDate>
            <ExpireDate>20230627182755</ExpireDate>
            <GroupSize>1</GroupSize>
            <PremiumCalType>1</PremiumCalType>
            <TotalPremium>1</TotalPremium>
            <OrderId>test20230626152755019</OrderId>
            <ServiceAddress>江苏省兰州市榆次区百官街115号复华城市花园</ServiceAddress>
        </Policy>
        <PolicyHolder>
            <PolicyHolderName>合肥明秀家政服务有限公司</PolicyHolderName>
            <PHIdType>1</PHIdType>
            <PHIdNumber>91340103MA2RYKJA8K</PHIdNumber>
            <PHAddress>北一环南国花园1幢101</PHAddress>
            <PHProvinceCode>340000</PHProvinceCode>
            <PHCityCode>340100</PHCityCode>
            <PHDistrictCode>340103</PHDistrictCode>
        </PolicyHolder>
        <InsuredList>
            <Insured>
                <InsuredName>索欣德</InsuredName>
                <IdType>1</IdType>
                <IdNumber>350212198908312948</IdNumber>
                <BirthDate>19890831000000</BirthDate>
                <Gender>F</Gender>
            </Insured>
        </InsuredList>
    </Body>
</Packet>
```

**新增返佣信息报文示例：**

```xml
<?xml version="1.0"?>
<Packet type="REQUEST" version="1.0">
    <Head>
        <RequestType>0002</RequestType>
        <User>XXXX</User>
        <Password>XXXX</Password>
    </Head>
    <Body>
        <Policy>
            <AgencyPolicyRef>2308251349067961122o211120</AgencyPolicyRef>
            <ProductCode/>
            <PlanCode>13C00098</PlanCode>
            <IssueDate>20230825134918</IssueDate>
            <TotalPremium>50.00</TotalPremium>
            <EffectiveDate>20230825220500</EffectiveDate>
            <ExpireDate>20230903235959</ExpireDate>
            <GroupSize>1</GroupSize>
            <SeatNumber>330327201508227470</SeatNumber>
            <FlightNumber/>
            <flightDepCode>8L9898</flightDepCode>
        </Policy>
        <PolicyHolder>
            <PolicyHolderType>C</PolicyHolderType>
            <PolicyHolderName>四川海岛印象旅行社有限公司</PolicyHolderName>
            <PHIdType>14</PHIdType>
            <PHIdNumber>915101063940108334</PHIdNumber>
            <PHEmail/>
            <PHBirthDate>19800101000000</PHBirthDate>
            <PHTelephone>18780060525</PHTelephone>
            <ReqFaPiao>0</ReqFaPiao>
            <Gender>M</Gender>
            <ReqMail>0</ReqMail>
        </PolicyHolder>
        <InsuredList>
            <Insured>
                <RelationShip>99</RelationShip>
                <InsuredId>2308251349067961122o211120</InsuredId>
                <InsuredName>肖昌楠</InsuredName>
                <InsuredType>1</InsuredType>
                <IdType>1</IdType>
                <IdNumber>330327201508227470</IdNumber>
                <BirthDate>20150822000000</BirthDate>
                <Mobile/>
                <Gender>M</Gender>
            </Insured>
        </InsuredList>
        <RebateInfo>
            <RebateRate>0.1</RebateRate>
            <RebateCusName>测试</RebateCusName>
            <RebateCusIdNo>330327201508227470</RebateCusIdNo>
            <RebateAccountNo>3227001358745896310</RebateAccountNo>
            <RebateBankKeepMobile>15978795898</RebateBankKeepMobile>
            <RebateDelayDays>3</RebateDelayDays>
        </RebateInfo>
    </Body>
</Packet>
```

##### 1.1.3.3.2. 返回数据-Response Data

**成功报文示例1：**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ResultInfo>
    <Success>true</Success>
    <OrderId>3155911</OrderId>
    <AgencyPolicyRef>16274652343928557</AgencyPolicyRef>
    <AuthUrl>https://xxx.com</AuthUrl>
</ResultInfo>
```

**成功报文示例2（工单险）：**

```xml
<?xml version="1.0"?>
<ResultInfo>
    <Success>true</Success>
    <PolicyNo>10103003900179739404</PolicyNo>
    <OrderId>6785792</OrderId>
    <AgencyPolicyRef>agentTest20230626152755019</AgencyPolicyRef>
    <TotalPremium>1.00</TotalPremium>
</ResultInfo>
```

**失败报文示例1：**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ResultInfo>
    <Success>false</Success>
    <OrderId>3155911</OrderId>
    <AgencyPolicyRef>16274652343928557</AgencyPolicyRef>
    <AuthUrl></AuthUrl>
</ResultInfo>
```

**失败报文示例2（工单险）：**

```xml
<?xml version="1.0"?>
<ResultInfo>
    <Success>false</Success>
    <OrderId>6785804</OrderId>
    <AgencyPolicyRef>202306260893</AgencyPolicyRef>
    <Message>报错信息：XXXX</Message>
</ResultInfo>
```

**实名认证成功后通知，通知地址要大树保系统设定：**

```json
{
    "id":1, 
    "no":"32132141513531651277"
}
```

### 1.1.4. 保单注销-Policy Cancellation

#### 1.1.4.1. 请求报文-Request Message

##### 1.1.4.1.1. 保单信息-Policy Information

| 序号 | 字段名称 | 类型 | 大小 | 必传 | 说明 |
|-----|---------|------|------|------|------|
| 1 | PolicyRef | 字符 | 30 | Y | 大树保保单号码 |

#### 1.1.4.2. 返回报文-Response Message

返回报文只有报文头。如果成功，则返回成功，失败则返回相应的提示信息。例如保单已经生效不能注销等。

#### 1.1.4.3. 报文范例-Message Examples

##### 1.1.4.3.1. 请求数据-Request Data

##### 1.1.4.3.2. 返回数据-Response Data

### 1.1.5. 保单查询-Policy Query

#### 1.1.5.1. 请求报文-Request Message

##### 1.1.5.1.1. 保单信息-Policy Information

| 序号 | 字段名称 | 类型 | 大小 | 必传 | 说明 |
|-----|---------|------|------|------|------|
| 1 | AgencyPolicyRef | 字符 | 30 | Y | 渠道流水号 |

#### 1.1.5.2. 返回报文-Response Message

返回报文只有报文头。如果成功，则返回成功，失败则返回相应的提示信息。

#### 1.1.5.3. 报文范例-Message Examples

##### 1.1.5.3.1. 请求数据-Request Data

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Packet type="REQUEST" version="1.0">
    <Head>
        <RequestType>0005</RequestType>
        <User>xxx</User>
        <Password>xxxx</Password>
    </Head>
    <Body>
        <Policy>
            <AgencyPolicyRef>2016121400000006</AgencyPolicyRef>
        </Policy>
    </Body>
</Packet>
```

##### 1.1.5.3.2. 返回数据-Response Data

**成功返回：**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ResultInfo>
    <Policy>
        <OrderId>3157634</OrderId>
        <AgencyPolicyRef>2112281344129724693o923036</AgencyPolicyRef>
        <TotalPremium>10.00</TotalPremium>
        <PolicyNo>T220104000000100133319</PolicyNo>
        <Status>1</Status>
        <EffectiveDate>20220105080000</EffectiveDate>
        <ExpireDate>20220106075959</ExpireDate>
        <InsuredList>
            <Insured>
                <InsuredName>陈晟捷</InsuredName>
                <IdNumber>632521199302235307</IdNumber>
                <IdType>1</IdType>
                <Gender>F</Gender>
                <BirthDate>19930223000000</BirthDate>
            </Insured>
        </InsuredList>
        <PolicyHolder>
            <PolicyHolderName>陈晟捷</PolicyHolderName>
            <PHIdNumber>632521199302235307</PHIdNumber>
            <PHIdType>1</PHIdType>
            <Gender>F</Gender>
            <PHBirthDate>19930223000000</PHBirthDate>
        </PolicyHolder>
    </Policy>
</ResultInfo>
```

**失败返回：**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ResultInfo>
    <Success>false</Success>
    <OrderId>0</OrderId>
    <Message>流水号未查到相关信息!</Message>
</ResultInfo>
```

### 1.1.6. 保单打印-Policy Printing

#### 1.1.6.1. 请求报文-Request Message

##### 1.1.6.1.1. 保单信息-Policy Information

| 序号 | 字段名称 | 类型 | 大小 | 必传 | 说明 |
|-----|---------|------|------|------|------|
| 1 | PolicyRef | 字符 | 30 | Y | 保单号码 |
| 2 | ReasonRemark | 字符 | 200 | N | 某些保司产品必传，如泰康航延航意组合险 |

#### 1.1.6.2. 返回报文-Response Message

##### 1.1.6.2.1. 保单文件-Policy PDF

**说明：**

系统返回数据流，第三方可以通过自己的开发语言，把数据流转换为 PDF 文件。

#### 1.1.6.3. 报文范例-Message Examples

##### 1.1.6.3.1. 请求数据-Request Data

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Packet type="REQUEST" version="1.0">
    <Head>
        <RequestType>0006</RequestType>
        <User>xxx</User>
        <Password>xxx</Password>
    </Head>
    <Body>
        <Policy>
            <PolicyRef>102-1-593-13-000429-000-00</PolicyRef><!-- 保单号 -->
        </Policy>
    </Body>
</Packet>
```

##### 1.1.6.3.2. 返回数据-Response Data

系统返回数据流，第三方可以通过自己的开发语言，把数据流转换为 PDF 文件。

### 1.1.7. 电子发票-Policy Invoice

#### 1.1.7.1. 请求报文-Request Message

##### 1.1.7.1.1. 保单信息-Policy Information

| 序号 | 字段名称 | 类型 | 大小 | 必传 | 说明 |
|-----|---------|------|------|------|------|
| 1 | PolicyRef | 字符 | 255 | Y | 保单号码 |
| 2 | Amount | 数值 | 20,2 | Y | 开票金额 |
| 3 | Phone | 字符 | 50 | N | 手机号码<br>(支持多手机号发送，以;号隔开) |
| 4 | Mail | 字符 | 300 | N | 邮箱<br>(支持多邮箱发送，以;号隔开) |
| 5 | Invoice_Head | 字符 | 256 | N | 发票抬头<br>(默认投保人，企业抬头不能为空) |
| 6 | Invoice_HeadType | 字符 | 2 | Y | 发票抬头类型<br>01：个人<br>02：公司/企业<br>03：政府机构、非企业性事业单位、国外企业 |
| 7 | Invoice_TaxpayerId | 字符 | 32 | N | 购买方纳税识别号/统一社会信用代码 |

**说明：**
- 手机或者邮箱必须填写一个。
- 抬头类型公司必传纳税识别号/统一社会信用代码。

#### 1.1.7.2. 返回报文-Response Message

返回报文只有报文头。如果成功，则返回成功，失败则返回相应的提示信息。例如保单已经生效不能注销等。

#### 1.1.7.3. 报文范例-Message Examples

##### 1.1.7.3.1. 请求数据-Request Data

##### 1.1.7.3.2. 返回数据-Response Data

**计划短期费率信息**

| 序号 | 字段名称 | 类型 | 大小 | 必传 | 说明 |
|-----|---------|------|------|------|------|
| 1 | PolicyNo | 字符 | 50 | Y | 保单号 |
| 2 | Invoice_Code | 字符 | 50 | N | 发票代码 |
| 3 | Invoice_no | 字符 | 32 | N | 发票号码 |
| 4 | Invoice_amount | 数值 | 20,2 | N | 开票金额 |
| 5 | ErrorCode | 字符 | 4 | Y | 错误代码 |
| 6 | Message | 字符 | 2000 | Y | 错误说明 |
| 7 | Success | 字符 | 10 | Y | 请求状态 |

**说明：**

若已经开具电子发票，按报文更新接收人手机号与邮箱，获取有效短链接，重发电子发票。因短链接只有 7 天有效期，返回报文不再回传该值。

**错误代码**

| 代码 | 说明 | 返回短语 |
|-----|------|---------|
| 0000 | 已成功申请重发送电子发票 | 您已开具电子发票了，2 小时内将重新发送电子发票短链接到您预留的电子邮算或手机号码，请留意查收。 |
| 0001 | 申请开票成功，发票开具中 | 您的电子发票将在 2 小时内发送到您预留的电子邮箱或手机号码，请留意查收。 |
| 1001 | 保单号不存在 | 您输入的保单号码不存在，请核对后重新输入。 |
| 1002 | 手机号码或邮箱不能为空 | 请您输入接收电子发票短链接的手机号码或电子邮箱地址 |
| 1003 | 不是见费出单业务(取消控制) | |
| 1004 | 保单已开具纸质发票,不允许申请电子发票 | 抱歉，您的保单已开具纸质发票，如需要开具为电子发票，请您联系我司客服人员，谢谢！ |
| 1005 | 保单已注销 | 抱歉，您的保单已注销，不能开具电子发票，请查证后再重新提交申请 |
| 1006 | 保单不在开具业务范围内<br>(支持开具业务：旅游险，个人意外险，家财险,车险) | 抱歉，您的保单不能开具电子发票，请联系客服人员。谢谢！ |
| 1007 | 开票金额不正确 | 您输入的开票金额不正确，请核对后重新输入。 |
| 1008 | 没有开具该保单电子发票权限 | 抱歉，您没有开具该保单电子发票的权限。 |
| 1009 | 该保单不满足电子发票开具条件，请与客服联系（检查后台数据完整性，需要个别检查） | 该保单不满足电子发票开具条件，请与客服联系 |
| 1010 | 5 月 1 日前生效的保单已交营业税，不允许开具增值税发票，请与客服联系 | 5 月 1 日前生效的保单已交营业税，不允许开具增值税发票，请与客服联系 |
| 1011 | 车险发票抬头要与投保人一致 | 抱歉，发票抬头必须与投保人名称一致 |
| 1012 | 开具企业发票，纳税识别号不能为空 | 根据国家税务总局的要求，自 2017 年 7 月 1 日起，购买方为企业的，应在"购买方纳税人识别号"栏填写购买方的纳税人识别号或统一社会信用代码。 |

### 1.1.8. 支付订单-Pay Order

#### 1.1.8.1. 请求报文-Request Message

##### 1.1.8.1.1. 请求数据-Request Data

```xml
<?xml version="1.0" encoding="utf-8"?>
<Packet type="REQUEST" version="1.0">
    <Head>
        <RequestType>0022</RequestType>
        <User>xxx</User>
        <Password>xxx</Password>
    </Head>
    <Body>
        <PayInfo>
            <Target>WeChat</Target>
            <!--TradeType包括：APP（APP支付场景），MINI（小程序支付场景），OPEN（公众号支付场景），MWEB（H5支付场景），NATIVE（二维码支付场景）-->
            <TradeType>APP</TradeType>
            <!--TradeType为MINI，OPEN时必传openId-->
            <OpenId>xxxx</OpenId>
            <!--微信支付成功后，且出单后回调地址-->
            <NotifyUrl>http://fx.test.dasurebao.com.cn/xxx/createOrder</NotifyUrl>
        </PayInfo>
        <Policy>
            <AgencyPolicyRef>ad111mi13nsingl23111111</AgencyPolicyRef>
            <ProductCode>MP10450164</ProductCode>
            <PlanCode>PK00038868</PlanCode>
            <EffectiveDate>20210917000000</EffectiveDate>
            <ExpireDate>20211016235959</ExpireDate>
            <GroupSize>1</GroupSize>
            <TotalPremium>205</TotalPremium>
            <!--
            保单类型SplitType：0:（1单多人，团单）；1：（1人1单，个人） 
            对于个人投保，需要实名认证的产品只能支持0团单方式。
            -->
            <SplitType>0</SplitType>
        </Policy>
        <PolicyHolder>
            <PolicyHolderName>大树保</PolicyHolderName>
            <PHIdType>3</PHIdType>
            <PHIdNumber>330203000159508</PHIdNumber>
            <PHAddress>上海市</PHAddress>
            <PHProvinceCode>330000</PHProvinceCode>
            <PHCityCode>330200</PHCityCode>
            <PHDistrictCode>330203</PHDistrictCode>
        </PolicyHolder>
        <InsuredList>
            <Insured>
                <InsuredName>被保人</InsuredName>
                <IdType>1</IdType>
                <IdNumber>330227196312211785</IdNumber>
                <BirthDate>19631221000000</BirthDate>
                <Gender>F</Gender>
            </Insured>
        </InsuredList>
    </Body>
</Packet>
```

**1. TradeType为APP，MINI，OPEN时返回的报文**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ResultInfo>
    <Success>true</Success>
    <OrderId>3153980</OrderId>
    <AgencyPolicyRef>ad11mi1nsingl23111111</AgencyPolicyRef>
    <WeChatAppId>wx4c8e1d184aece9e9</WeChatAppId>
    <WeChatTimeStamp>1606871697</WeChatTimeStamp>
    <WeChatNonceStr>ZaUVc2rqILdb9S9a</WeChatNonceStr>
    <WeChatPackageValue>Sign=WXPay</WeChatPackageValue>
    <WeChatSign>6384CC2C8A21F9FD5F18F69F1D4D407B</WeChatSign>
    <WeChatPrepayId>wx02091456656433ad9ed715e01db0d40000</WeChatPrepayId>
    <AuthUrl>http://www.com</AuthUrl><!--需要实名认证的URL，目前只有易安保险产品，个人投保才需要实名认证-->
</ResultInfo>
```

**2. TradeType为MWEB，NATIVE时返回的报文**

```xml
<?xml version="1.0" encoding="utf-8"?>
<ResultInfo>
    <Success>true</Success>
    <OrderId>3156113</OrderId><!-订单号->
    <AgencyPolicyRef>WD205416071065494008</AgencyPolicyRef><!-流水号->
    <WeChatWebUrl>https://wx.tenpay.com/cgi-bin/mmpayweb-bin/</WeChatWebUrl><!-唤起微信支付URL->
</ResultInfo>
```

**3. 支付成功后回调通知参数：**

```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<ResultInfo>
    <OrderId>3156287</OrderId>
    <AgencyPolicyRef>323222322338682936</AgencyPolicyRef>
    <PolicyList>
        <Policy>
            <OrderId>3156288</OrderId>
            <Success>true</Success>
            <PolicyNo>14527003900176210470</PolicyNo>
            <EffectiveDate>20210909000000</EffectiveDate>
            <ExpireDate>20220908235959</ExpireDate>
            <InsuredList>
                <Insured>
                    <InsuredName>赵东</InsuredName>
                    <IdNumber>420102198203070520</IdNumber>
                    <IdType>1</IdType>
                    <Gender>F</Gender>
                    <BirthDate>19820307000000</BirthDate>
                </Insured>
            </InsuredList>
            <PolicyHolder>
                <PolicyHolderName>姚伟</PolicyHolderName>
                <PHIdNumber>420102198203077327</PHIdNumber>
                <PHIdType>1</PHIdType>
                <Gender>F</Gender>
                <PHBirthDate>19820307000000</PHBirthDate>
            </PolicyHolder>
        </Policy>
        <Policy>
            <OrderId>3156287</OrderId>
            <Success>true</Success>
            <PolicyNo>14527003900176210471</PolicyNo>
            <EffectiveDate>20210909000000</EffectiveDate>
            <ExpireDate>20220908235959</ExpireDate>
            <InsuredList>
                <Insured>
                    <InsuredName>李明</InsuredName>
                    <IdNumber>420102198203079461</IdNumber>
                </Insured>
            </InsuredList>
        </Policy>
    </PolicyList>
</ResultInfo>
```

### 个人投保实名认证流程

5. 回调第三方接口参数：no 创建订单的业务流水号
   - (1) http://www.xxx.com?id=12&no=738
8. 投保成功返回信息

### 1.1.9. 批改接口-UPDATE

#### 1.1.9.1. 入参信息

**保单信息-Policy**

| 序号 | 字段名称 | 类型 | 大小 | 必传 | 说明 |
|-----|---------|------|------|------|------|
| 1 | PolicyRef | 字符 | 30 | Y | 大树保保单号码 |

**被保人信息-Insured**

| 序号 | 字段名称 | 类型 | 大小 | 必传 | 说明 |
|-----|---------|------|------|------|------|
| 1 | type | 字符 | 30 | Y | 类型（old 原被保人，new 新被保人） |
| 2 | InsuredName | 字符 | 100 | Y | 被保险人姓名 |
| 3 | IdType | 枚举 | 2 | Y | 证件类型<br>1-身份证<br>2-护照<br>3-其他<br>4-军人证<br>5-驾驶证<br>6-港澳台同胞证 |
| 4 | IdNumber | 字符 | 30 | Y | 证件号码 |
| 5 | BirthDate | 日期 | | Y | 出生日期 |
| 6 | Gender | 枚举 | 2 | | 性别：<br>M-男、F-女和 O(Other)-其他 |

#### 1.1.9.2. 请求报文-Request Message

#### 1.1.9.3. 返回报文-Response Message

### 1.1.10. 批增接口

#### 1.1.10.1. 入参信息

**请求头-Head**

| 序号 | 字段名称 | 类型 | 大小 | 必传 | 说明 |
|-----|---------|------|------|------|------|
| 1 | type | 字符 | 30 | Y | type="3" 批增 |

**保单信息-Policy**

| 序号 | 字段名称 | 类型 | 大小 | 必传 | 说明 |
|-----|---------|------|------|------|------|
| 1 | PolicyRef | 字符 | 30 | Y | 大树保保单号码 |
| 2 | TotalPremium | 数值 | | | 保单保费 |

**被保人信息-Insured**

| 序号 | 字段名称 | 类型 | 大小 | 必传 | 说明 |
|-----|---------|------|------|------|------|
| 2 | InsuredName | 字符 | 100 | Y | 被保险人姓名 |
| 3 | IdType | 枚举 | 2 | Y | 证件类型<br>1-身份证<br>2-护照<br>3-其他<br>4-军人证<br>5-驾驶证<br>6-港澳台同胞证 |
| 4 | IdNumber | 字符 | 30 | Y | 证件号码 |
| 5 | BirthDate | 日期 | | Y | 出生日期 |
| 6 | Gender | 枚举 | 2 | | 性别：<br>M-男、F-女和 O(Other)-其他 |

#### 1.1.10.2. 请求报文-Request Message

#### 1.1.10.3. 返回报文-Response Message

### 1.1.11. 出单接口

#### 1.1.11.1. 入参信息

实名认证后且支付成功后调用出单接口

POST：http://fx.test.dasurebao.com.cn/remoting/authInsurance

#### 1.1.11.2. 实名认证后且支付成功后调用出单接口，请求参数

#### 1.1.11.3. 返回报文-Response Message

**成功报文：**

```json
{
    "holder":{
        "address":"详细地址张哈哈",
        "birthDate":"19890811000000",
        "creator":"daiyanren",
        "gender":"M",
        "gmtModified":1627457285000,
        "id":2676332,
        "idNumber":"440782198908112813",
        "idType":"1",
        "modifier":"daiyanren",
        "name":"测试哈哈哈",
        "policyId":3155906,
        "telephone":"13800138000",
        "type":"I"
    },
    "insuredArray":[
        {
            "beneficialType":"",
            "birthDate":"19770307000000",
            "creator":"daiyanren",
            "email":"",
            "gender":"M",
            "gmtCreate":1627457285000,
            "gmtModified":1627457285000,
            "idNumber":"110101197703071016",
            "idType":"1",
            "insuredId":0,
            "modifier":"daiyanren",
            "name":"测试被保人",
            "policyId":3155906,
            "policyNo":"54e55c15-2f71-46f9-8380-e0690db0cfda",
            "relationship":"",
            "type":""
        }
    ],
    "policy":{
        "agencyPolicyRef":"16274572504226746",
        "companyCode":30,
        "creator":"daiyanren",
        "customerId":1778,
        "departure":"POST3155906",
        "effectiveDate":1627488000000
    }
}
```

### 1.1.12. 保单生效后退保-Policy Surrender

#### 1.1.12.1. 请求报文-Request Message

##### 1.1.12.1.1. 保单信息-Policy Information

| 序号 | 字段名称 | 类型 | 大小 | 必传 | 说明 |
|-----|---------|------|------|------|------|
| 1 | PolicyNo | 字符 | 30 | Y | 大树保保单号码 |
| 2 | RemoveReason | 字符 | 2 | Y | 退保原因<br>13-退票退保<br>14-航班取消<br>15-航班改签 |

#### 1.1.12.2. 返回报文-Response Message

返回报文只有报文头。如果成功，则返回成功，失败则返回相应的提示信息。

#### 1.1.12.3. 报文范例-Message Examples

##### 1.1.12.3.1. 请求数据-Request Data

##### 1.1.12.3.2. 返回数据-Response Data

### 1.1.13. 返佣通知回调接口-rebateInform

#### 1.1.13.1. 请求参数

##### 1.1.13.1.1. 请求体信息-noticeBody

| 序号 | 字段名称 | 类型 | 大小 | 必传 | 说明 |
|-----|---------|------|------|------|------|
| 1 | noticeType | String | 50 | Y | 通知类型，固定值：rebateInform |
| 2 | body | String | 50 | Y | 加密内容 |

**请求体解密内容，加密方式为AES加密加解密请参考如下文件：**

| 序号 | 字段名称 | 类型 | 大小 | 必传 | 说明 |
|-----|---------|------|------|------|------|
| 1 | traceId | String | 50 | Y | 交易流水号 |
| 2 | policyNo | String | 30 | Y | 保单号 |
| 3 | rebateRate | String | 2 | N | 返佣比例 |
| 4 | rebateCusName | String | 50 | N | 返佣客户姓名 |
| 5 | rebateCusIdNo | String | 20 | N | 返佣客户身份证号 |
| 6 | rebateAccountNo | String | 30 | N | 返佣客户银行卡号（目前只支持银行卡返佣） |
| 7 | rebateBankKeepMobile | String | 20 | N | 返佣客户银行留存手机号 |
| 8 | rebateDelayDays | String | 20 | N | 返佣延迟天数 |
| 9 | executeDate | String | | N | 返佣执行日期，格式yyyy-MM-dd |
| 10 | rebateMoney | String | 30 | N | 返佣金额，保留两位小数 |
| 11 | taskState | String | 20 | N | 返佣任务状态<br>INIT-初始<br>NO_SIGN-客户未签约<br>SIGN_FAILED-签约失败<br>INSUFFICIENT_FUND-资金不足<br>PAY_APPLY-已申请付款<br>PAY_FAILED-付款失败<br>PAY_SUCCESS-付款成功<br>RETRY_OVER-重试超限制次数<br>TERMINATE-终止返佣 |
| 12 | errorMsg | String | 200 | N | 错误信息 |

#### 1.1.13.2. 返回参数

正常处理完返佣通知回调信息后，必须输出success

未正常处理完返佣通知回调信息，输出fail

#### 1.1.13.3. 报文范例-Message Examples

##### 1.1.13.3.1. 请求数据-Request Data

##### 1.1.13.3.2. 返回数据-Response Data

**正常处理返回：**
```
success
```

**异常处理返回：**
```
fail
```

### 1.1.14. 返佣信息查询接口-RebateInfo Query

#### 1.1.14.1. 请求报文-Request Message

##### 1.1.14.1.1. 保单信息-Policy Information

| 序号 | 字段名称 | 类型 | 大小 | 必传 | 说明 |
|-----|---------|------|------|------|------|
| 1 | PolicyNo | 字符 | 30 | Y | 大树保保单号码 |

#### 1.1.14.2. 返回报文-Response Message

返回报文只有报文头。如果成功，则返回成功，失败则返回相应的提示信息。

#### 1.1.14.3. 报文范例-Message Examples

##### 1.1.14.3.1. 请求数据-Request Data

##### 1.1.14.3.2. 返回数据-Response Data

### 1.1.15. 系统环境-System Environment

#### 1.1.15.1. 系统地址

| 环境 | 地址 |
|-----|------|
| 测试环境 | http://fx.test.dasurebao.com.cn/remoting/ws |

访问上述地址时，如果得到反馈（0 1111 错误的请求）则可视为已经可以访问。

#### 1.1.15.2. 测试用户

| 机构 | 用户名 | 密码 |
|-----|--------|------|
| 测试出单 | | |
| 测试地址 | http://fx.test.dasurebao.com.cn/remoting/ws | |

#### 1.1.15.3. 测试方法

航意险测试 dome

---

**文档结束**