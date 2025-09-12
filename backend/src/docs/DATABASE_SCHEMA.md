# 安得家政CRM系统 数据库结构规范

## MongoDB 数据模型

本系统采用MongoDB作为数据库，使用TypeORM进行对象关系映射。

### 简历（Resume）集合

```typescript
@Entity('resumes')
export class Resume {
  @PrimaryColumn()
  id: string;

  // 基本信息
  @Column()
  name: string; // 姓名

  @Column()
  phone: string; // 手机号

  @Column()
  age: number; // 年龄

  @Column({ nullable: true })
  wechat?: string; // 微信号

  @Column({ nullable: true })
  idNumber?: string; // 身份证号

  @Column()
  education: string; // 学历

  @Column()
  nativePlace: string; // 籍贯

  @Column()
  experienceYears: number; // 工作年限

  @Column({ nullable: true })
  maritalStatus?: string; // 婚姻状况

  @Column({ nullable: true })
  religion?: string; // 宗教信仰

  @Column({ nullable: true })
  currentAddress?: string; // 当前住址

  @Column({ nullable: true })
  hukouAddress?: string; // 户口所在地

  @Column({ nullable: true })
  birthDate?: string; // 出生日期

  @Column({ nullable: true })
  ethnicity?: string; // 民族

  @Column({ nullable: true })
  gender?: string; // 性别

  @Column({ nullable: true })
  zodiac?: string; // 生肖

  @Column({ nullable: true })
  zodiacSign?: string; // 星座

  // 工作信息
  @Column()
  jobType: string; // 工种

  @Column({ nullable: true })
  expectedSalary?: number; // 期望薪资

  @Column({ nullable: true })
  serviceArea?: string; // 服务区域

  @Column({ nullable: true })
  orderStatus?: string; // 接单状态

  @Column('simple-array', { nullable: true })
  skills?: string[]; // 技能标签

  @Column({ nullable: true })
  leadSource?: string; // 线索来源

  @Column('json', { nullable: true })
  workExperience?: { 
    startDate: string; 
    endDate: string; 
    description: string 
  }[]; // 工作经历

  // 文件信息
  @Column({ nullable: true })
  idCardFrontUrl?: string; // 身份证正面照片URL

  @Column({ nullable: true })
  idCardBackUrl?: string; // 身份证背面照片URL

  @Column('simple-array', { nullable: true })
  photoUrls?: string[]; // 个人照片URL数组

  @Column('simple-array', { nullable: true })
  certificateUrls?: string[]; // 证书照片URL数组

  @Column('simple-array', { nullable: true })
  medicalReportUrls?: string[]; // 体检报告URL数组

  // 时间戳
  @Column()
  createdAt: Date; // 创建时间

  @Column()
  updatedAt: Date; // 更新时间
}
```

### 用户（User）集合

```typescript
@Entity('users')
export class User {
  @PrimaryColumn()
  id: string;

  @Column({ unique: true })
  username: string; // 用户名

  @Column()
  password: string; // 密码（加密存储）

  @Column()
  name: string; // 姓名

  @Column({ nullable: true })
  email?: string; // 邮箱

  @Column({ nullable: true })
  phone?: string; // 手机号

  @Column()
  role: string; // 角色 (admin, manager, employee)

  @Column('simple-array')
  permissions: string[]; // 权限列表

  @Column()
  createdAt: Date; // 创建时间

  @Column()
  updatedAt: Date; // 更新时间

  @Column({ default: true })
  active: boolean; // 账户是否激活
}
```

## 枚举值标准

### 婚姻状况 (maritalStatus)
- `single`: 未婚
- `married`: 已婚
- `divorced`: 离异
- `widowed`: 丧偶

### 宗教信仰 (religion)
- `none`: 无
- `buddhism`: 佛教
- `christianity`: 基督教
- `islam`: 伊斯兰教
- `catholicism`: 天主教
- `hinduism`: 印度教
- `taoism`: 道教
- `protestantism`: 新教
- `orthodoxy`: 东正教

### 性别 (gender)
- `male`: 男
- `female`: 女

### 生肖 (zodiac)
- `rat`: 鼠
- `ox`: 牛
- `tiger`: 虎
- `rabbit`: 兔
- `dragon`: 龙
- `snake`: 蛇
- `horse`: 马
- `goat`: 羊
- `monkey`: 猴
- `rooster`: 鸡
- `dog`: 狗
- `pig`: 猪

### 星座 (zodiacSign)
- `capricorn`: 摩羯座
- `aquarius`: 水瓶座
- `pisces`: 双鱼座
- `aries`: 白羊座
- `taurus`: 金牛座
- `gemini`: 双子座
- `cancer`: 巨蟹座
- `leo`: 狮子座
- `virgo`: 处女座
- `libra`: 天秤座
- `scorpio`: 天蝎座
- `sagittarius`: 射手座

### 工种 (jobType)
- `yuexin`: 月嫂
- `zhujia-yuer`: 住家育儿嫂
- `baiban-yuer`: 白班育儿
- `baojie`: 保洁
- `baiban-baomu`: 白班保姆
- `zhujia-baomu`: 住家保姆
- `yangchong`: 养宠
- `xiaoshi`: 小时工

### 接单状态 (orderStatus)
- `accepting`: 想接单
- `not-accepting`: 不接单
- `on-service`: 已上户

### 技能标签 (skills)
- `muying`: 母婴护理师
- `cuiru`: 高级催乳师
- `yuezican`: 月子餐营养师
- `chanhou`: 产后修复师
- `teshu-yinger`: 特殊婴儿护理
- `yiliaobackground`: 医疗背景
- `yuying`: 高级育婴师
- `zaojiao`: 早教师
- `fushi`: 辅食营养师
- `ertui`: 小儿推拿师
- `waiyu`: 外语
- `zhongcan`: 中餐
- `xican`: 西餐
- `mianshi`: 面食
- `jiashi`: 驾驶
- `shouyi`: 整理收纳

### 线索来源 (leadSource)
- `referral`: 转介绍
- `paid-lead`: 付费线索
- `community`: 社群线索
- `door-to-door`: 地推
- `shared-order`: 合单
- `other`: 其他

### 用户角色 (role)
- `admin`: 管理员
- `manager`: 经理
- `employee`: 员工 