# API 文档索引

## 📖 完整文档

- **[小程序API完整文档](./小程序API完整文档.md)** - 🌟 推荐！包含所有API的完整说明

## 🚀 新手入门

- [快速开始指南](./快速开始指南.md) - 5分钟快速上手小程序API

## 📢 最新更新

- [更新日志](./更新日志.md) - 查看最新的功能更新和改进

## 📚 小程序相关API（分类文档）

### 简历管理
- [小程序简历创建API使用说明](./小程序简历创建API使用说明.md)
  - 创建简历的完整指南
  - 包含所有字段说明和示例
  - 幂等性支持和错误处理
  - **最新更新**: 添加月嫂档位、培训意向等新字段

- [小程序简历查询更新API使用说明](./小程序简历查询更新API使用说明.md)
  - 获取简历详情
  - 更新简历信息
  - 小程序端集成示例
  - **最新更新**: 支持月嫂档位等新字段的查询和更新

### 文件上传
- [修复-小程序删除照片问题](./修复-小程序删除照片问题.md)
  - 照片删除功能说明
  - 问题修复记录

## 🔑 核心功能

### 简历字段说明

#### 必填字段
- `name` - 姓名
- `phone` - 手机号码
- `gender` - 性别
- `age` - 年龄
- `jobType` - 工种
- `education` - 学历

#### 重要可选字段
- `maternityNurseLevel` - 月嫂档位（仅月嫂工种）
- `expectedSalary` - 期望薪资
- `selfIntroduction` - 自我介绍
- `skills` - 技能列表
- `serviceArea` - 服务区域
- `workExperiences` - 工作经历

#### 个人信息字段
- `nativePlace` - 籍贯
- `wechat` - 微信号
- `currentAddress` - 现居地址
- `hukouAddress` - 户口地址
- `birthDate` - 出生日期
- `idNumber` - 身份证号
- `ethnicity` - 民族
- `zodiac` - 生肖
- `zodiacSign` - 星座
- `maritalStatus` - 婚姻状况
- `religion` - 宗教信仰

#### 联系人信息
- `emergencyContactName` - 紧急联系人姓名
- `emergencyContactPhone` - 紧急联系人电话

#### 培训相关
- `learningIntention` - 培训意向
- `currentStage` - 当前阶段

#### 工作状态
- `orderStatus` - 接单状态
- `experienceYears` - 工作经验年限

#### 体检信息
- `medicalExamDate` - 体检日期

## 🎯 工种类型 (jobType)

| 值 | 说明 |
|---|---|
| `yuexin` | 月嫂 |
| `zhujia-yuer` | 住家育儿嫂 |
| `baiban-yuer` | 白班育儿嫂 |
| `baojie` | 保洁 |
| `baiban-baomu` | 白班保姆 |
| `zhujia-baomu` | 住家保姆 |
| `yangchong` | 养宠 |
| `xiaoshi` | 小时工 |
| `zhujia-hulao` | 住家护老 |

## 🏅 月嫂档位 (maternityNurseLevel)

**仅当 jobType 为 "yuexin" (月嫂) 时使用**

| 值 | 说明 |
|---|---|
| `junior` | 初级月嫂 |
| `silver` | 银牌月嫂 |
| `gold` | 金牌月嫂 |
| `platinum` | 铂金月嫂 |
| `diamond` | 钻石月嫂 |
| `crown` | 皇冠月嫂 |

## 📋 接单状态 (orderStatus)

| 值 | 说明 |
|---|---|
| `available` | 可接单 |
| `busy` | 忙碌中 |
| `unavailable` | 暂不接单 |

## 💍 婚姻状况 (maritalStatus)

| 值 | 说明 |
|---|---|
| `single` | 未婚 |
| `married` | 已婚 |
| `divorced` | 离异 |
| `widowed` | 丧偶 |

## 📖 培训意向 (learningIntention)

| 值 | 说明 |
|---|---|
| `yes` | 有意向 |
| `no` | 无意向 |
| `considering` | 考虑中 |

## 🎓 当前阶段 (currentStage)

| 值 | 说明 |
|---|---|
| `training` | 培训中 |
| `working` | 工作中 |
| `resting` | 休息中 |
| `seeking` | 求职中 |

## 🔗 快速链接

- 生产环境API地址: `https://crm.andejiazheng.com/api`
- 开发环境API地址: `http://localhost:3000/api`

## 📞 技术支持

如有问题，请联系技术团队。

