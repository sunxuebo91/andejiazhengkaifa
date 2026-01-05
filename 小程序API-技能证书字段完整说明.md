# 小程序API - 技能证书字段完整说明

**更新日期**: 2025-12-30  
**状态**: ✅ 已更新并部署

## 📋 字段说明总结

### 1️⃣ **技能类型字段** - `skills`
**用途**: 存储阿姨具备的技能类型（多选）  
**数据类型**: `string[]`（枚举值数组）  
**示例**:
```json
{
  "skills": ["chanhou", "yuying", "zaojiao"]
}
```

**对应显示**:
- `chanhou` → 产后修复师
- `yuying` → 高级育婴师
- `zaojiao` → 早教师

---

### 2️⃣ **技能证书图片字段** - `certificates` / `certificateUrls`
**用途**: 存储技能证书的图片文件  
**数据类型**: 
- `certificates`: `FileInfo[]`（完整文件信息对象数组）
- `certificateUrls`: `string[]`（仅URL字符串数组，兼容旧版）

**示例**:
```json
{
  "certificates": [
    {
      "url": "https://xxx.com/cert1.jpg",
      "filename": "育婴师证书.jpg",
      "size": 102400,
      "mimetype": "image/jpeg"
    }
  ],
  "certificateUrls": [
    "https://xxx.com/cert1.jpg"
  ]
}
```

---

## 🎯 完整的技能类型枚举列表

### 获取枚举API
**接口**: `GET /api/resumes/enums`

**返回的 skills 数组**（共20项，按定义顺序）:

| 序号 | value | label | 分类 |
|------|-------|-------|------|
| 1 | chanhou | 产后修复师 | 母婴护理 |
| 2 | teshu-yinger | 特殊婴儿护理 | 母婴护理 |
| 3 | yiliaobackground | 医疗背景 | 专业背景 |
| 4 | yuying | 高级育婴师 | 母婴护理 |
| 5 | zaojiao | 早教师 | 教育 |
| 6 | fushi | 辅食营养师 | 营养 |
| 7 | ertui | 小儿推拿师 | 保健 |
| 8 | waiyu | 外语 | 语言 |
| 9 | zhongcan | 中餐 | 烹饪 |
| 10 | xican | 西餐 | 烹饪 |
| 11 | mianshi | 面食 | 烹饪 |
| 12 | jiashi | 驾驶 | 技能 |
| 13 | shouyi | 整理收纳 | 家务 |
| 14 | muying | 母婴护理师 | 母婴护理 |
| 15 | cuiru | 高级催乳师 | 母婴护理 |
| 16 | yuezican | 月子餐营养师 | 营养 |
| 17 | yingyang | 营养师 | 营养 |
| 18 | liliao-kangfu | 理疗康复 | 保健 |
| 19 | shuangtai-huli | 双胎护理 | 母婴护理 |
| 20 | yanglao-huli | 养老护理 | 护理 |

---

## 📱 小程序使用示例

### 1. 获取技能类型枚举选项

```javascript
// 页面加载时获取枚举
Page({
  data: {
    skillOptions: [],  // 技能类型选项
    selectedSkills: [] // 用户选择的技能
  },
  
  onLoad() {
    this.loadEnums();
  },
  
  // 加载枚举字典
  async loadEnums() {
    try {
      const res = await wx.request({
        url: 'https://crm.andejiazheng.com/api/resumes/enums',
        method: 'GET'
      });
      
      if (res.data.success) {
        this.setData({
          skillOptions: res.data.data.skills
        });
      }
    } catch (error) {
      console.error('加载枚举失败:', error);
    }
  },
  
  // 用户选择技能
  onSkillChange(e) {
    this.setData({
      selectedSkills: e.detail.value
    });
  }
});
```

### 2. 显示技能类型选项（WXML）

```xml
<!-- 多选框形式 -->
<checkbox-group bindchange="onSkillChange">
  <block wx:for="{{skillOptions}}" wx:key="value">
    <label class="skill-item">
      <checkbox value="{{item.value}}" />
      <text>{{item.label}}</text>
    </label>
  </block>
</checkbox-group>

<!-- 或者使用 picker 多选 -->
<picker 
  mode="multiSelector" 
  bindchange="onSkillChange"
  range="{{skillOptions}}"
  range-key="label">
  <view class="picker">
    请选择技能证书
  </view>
</picker>
```

### 3. 提交简历数据

```javascript
// 提交时发送选中的技能值数组
async submitResume() {
  const data = {
    name: this.data.name,
    phone: this.data.phone,
    skills: this.data.selectedSkills, // ['chanhou', 'yuying', 'zaojiao']
    // ... 其他字段
  };
  
  const res = await wx.request({
    url: 'https://crm.andejiazheng.com/api/resumes/miniprogram/create',
    method: 'POST',
    data: data,
    header: {
      'Authorization': `Bearer ${wx.getStorageSync('token')}`
    }
  });
  
  if (res.data.success) {
    wx.showToast({ title: '提交成功', icon: 'success' });
  }
}
```

### 4. 显示已选技能（回显）

```javascript
// 加载简历数据
async loadResume(resumeId) {
  const res = await wx.request({
    url: `https://crm.andejiazheng.com/api/resumes/miniprogram/${resumeId}`,
    method: 'GET',
    header: {
      'Authorization': `Bearer ${wx.getStorageSync('token')}`
    }
  });
  
  if (res.data.success) {
    const resume = res.data.data;
    
    // 回显技能选择
    this.setData({
      selectedSkills: resume.skills || [] // ['chanhou', 'yuying']
    });
    
    // 显示技能标签
    const skillLabels = resume.skills.map(skillValue => {
      const skill = this.data.skillOptions.find(s => s.value === skillValue);
      return skill ? skill.label : skillValue;
    });
    // skillLabels = ['产后修复师', '高级育婴师']
  }
}
```

---

## 🔄 更新记录

### 2025-12-30 更新内容

1. ✅ **修复技能枚举顺序**
   - 将API返回的`skills`数组顺序调整为与枚举定义一致
   - 确保所有20个技能选项完整返回

2. ✅ **添加字段注释**
   - 为证书相关字段添加清晰的注释
   - 区分完整格式（FileInfo对象）和兼容格式（URL字符串）

3. ✅ **部署验证**
   - 后端构建成功
   - 服务重启成功
   - API测试通过

---

## 📞 常见问题

### Q1: skills 和 certificates 有什么区别？
**A**: 
- `skills` = 技能**类型**（如"育婴师"、"月嫂"），是枚举值数组
- `certificates` = 技能证书**图片**，是文件对象数组

### Q2: 如何获取所有可选的技能类型？
**A**: 调用 `GET /api/resumes/enums` 接口，从返回的 `data.skills` 中获取

### Q3: 小程序如何显示技能标签？
**A**: 
```javascript
// 将 value 转换为 label
const skillLabel = skillOptions.find(s => s.value === 'chanhou')?.label;
// skillLabel = '产后修复师'
```

---

**文档版本**: v1.0  
**最后更新**: 2025-12-30  
**维护人员**: AI Assistant

