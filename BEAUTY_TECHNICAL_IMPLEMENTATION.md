# 🎨 美颜功能技术实现文档

## 📋 概述

本文档详细说明视频面试系统中美颜功能的技术实现，包括架构设计、代码实现、权限控制等。

---

## 🏗️ 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    用户界面层                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  美颜按钮     │  │  美颜面板     │  │  参数滑块     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    状态管理层                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ beautyEnabled │  │ beautyParams  │  │ zegoInstance  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    业务逻辑层                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ toggleBeauty  │  │ adjustParam   │  │ applyPreset   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    ZEGO SDK 层                            │
│  ┌──────────────────────────────────────────────────┐   │
│  │  zegoInstance.setBeautyEffect(enabled, params)   │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    视频流处理                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  原始视频流   │  →  │  美颜处理     │  →  │  输出视频流   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 💻 代码实现

### 1. 状态管理

**文件**：`frontend/src/pages/interview/VideoInterview.tsx`

```typescript
// 🎨 美颜相关状态
const [beautyDrawerVisible, setBeautyDrawerVisible] = useState(false);
const [beautyEnabled, setBeautyEnabled] = useState(false);
const [beautyParams, setBeautyParams] = useState({
  whitening: 50,    // 美白 (0-100)
  smoothing: 60,    // 磨皮 (0-100)
  sharpening: 30,   // 锐化 (0-100)
  rosiness: 40      // 红润 (0-100)
});
```

**说明**：
- `beautyDrawerVisible`：控制美颜设置面板的显示/隐藏
- `beautyEnabled`：美颜功能的开启/关闭状态
- `beautyParams`：美颜参数对象，包含四个核心参数

---

### 2. 美颜控制函数

#### 开启/关闭美颜

```typescript
const toggleBeauty = () => {
  if (!zegoInstanceRef.current) {
    message.error('请先加入房间');
    return;
  }

  try {
    const newState = !beautyEnabled;
    
    if (newState) {
      // 开启美颜
      zegoInstanceRef.current.setBeautyEffect(true, beautyParams);
      message.success('美颜已开启');
    } else {
      // 关闭美颜
      zegoInstanceRef.current.setBeautyEffect(false);
      message.success('美颜已关闭');
    }
    
    setBeautyEnabled(newState);
  } catch (error) {
    console.error('美颜设置失败:', error);
    message.error('美颜设置失败');
  }
};
```

**关键点**：
- 检查 ZEGO 实例是否存在
- 使用 `setBeautyEffect` API 控制美颜
- 提供用户反馈（成功/失败消息）
- 更新状态

---

#### 调整美颜参数

```typescript
const adjustBeautyParam = (param: keyof typeof beautyParams, value: number) => {
  const newParams = { ...beautyParams, [param]: value };
  setBeautyParams(newParams);

  // 如果美颜已开启，实时更新
  if (beautyEnabled && zegoInstanceRef.current) {
    try {
      zegoInstanceRef.current.setBeautyEffect(true, newParams);
    } catch (error) {
      console.error('更新美颜参数失败:', error);
    }
  }
};
```

**关键点**：
- 使用 TypeScript 类型安全
- 实时更新参数（如果美颜已开启）
- 错误处理

---

#### 打开美颜设置面板

```typescript
const openBeautySettings = () => {
  setBeautyDrawerVisible(true);
};
```

---

### 3. UI 组件

#### 美颜按钮

```typescript
<Button
  size="large"
  onClick={openBeautySettings}
  style={{
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    background: beautyEnabled ? '#52c41a' : undefined,
    color: beautyEnabled ? '#fff' : undefined,
    borderColor: beautyEnabled ? '#52c41a' : undefined,
  }}
>
  🎨 美颜 {beautyEnabled ? '✓' : ''}
</Button>
```

**特点**：
- 动态样式（开启时显示绿色）
- 视觉反馈（显示勾号）
- 圆角和阴影效果

---

#### 美颜设置面板

```typescript
<Drawer
  title="🎨 美颜设置"
  placement="right"
  width={400}
  onClose={() => setBeautyDrawerVisible(false)}
  open={beautyDrawerVisible}
>
  <Space direction="vertical" size="large" style={{ width: '100%' }}>
    {/* 美颜开关 */}
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 16, fontWeight: 500 }}>美颜效果</span>
        <Button
          type={beautyEnabled ? 'primary' : 'default'}
          onClick={toggleBeauty}
          size="large"
        >
          {beautyEnabled ? '✅ 已开启' : '关闭'}
        </Button>
      </div>
    </div>

    {/* 美颜参数调整 */}
    {beautyEnabled && (
      <>
        {/* 美白 */}
        <div>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>
            美白: {beautyParams.whitening}
          </div>
          <Slider
            min={0}
            max={100}
            value={beautyParams.whitening}
            onChange={(value) => adjustBeautyParam('whitening', value)}
            marks={{
              0: '自然',
              50: '中等',
              100: '最强',
            }}
          />
        </div>

        {/* 磨皮、锐化、红润 - 类似结构 */}
      </>
    )}

    {/* 快速预设 */}
    <div>
      <div style={{ marginBottom: 8, fontWeight: 500 }}>快速预设:</div>
      <Space wrap>
        <Button onClick={() => applyPreset('natural')}>自然</Button>
        <Button onClick={() => applyPreset('standard')}>标准</Button>
        <Button onClick={() => applyPreset('enhanced')}>增强</Button>
      </Space>
    </div>
  </Space>
</Drawer>
```

**特点**：
- 抽屉式面板（右侧滑出）
- 条件渲染（只在美颜开启时显示参数）
- 滑块控件（直观的参数调整）
- 快速预设按钮

---

### 4. 快速预设实现

```typescript
const applyPreset = (preset: 'natural' | 'standard' | 'enhanced') => {
  let newParams;
  
  switch (preset) {
    case 'natural':
      newParams = { whitening: 30, smoothing: 40, sharpening: 20, rosiness: 30 };
      break;
    case 'standard':
      newParams = { whitening: 50, smoothing: 60, sharpening: 30, rosiness: 40 };
      break;
    case 'enhanced':
      newParams = { whitening: 70, smoothing: 80, sharpening: 40, rosiness: 60 };
      break;
  }
  
  setBeautyParams(newParams);
  
  if (beautyEnabled && zegoInstanceRef.current) {
    zegoInstanceRef.current.setBeautyEffect(true, newParams);
  }
};
```

---

### 5. ZEGO 配置

```typescript
const config = {
  container: meetingContainerRef.current,
  scenario: {
    mode: ZegoUIKitPrebuilt.GroupCall,
  },
  // ... 其他配置
  showAudioVideoSettingsButton: true, // 显示音视频设置按钮
  // 美颜功能通过音视频设置按钮访问
};
```

---

## 🔐 权限控制

### 方案：UI 层权限控制

**实现方式**：
- HR 端：显示自定义美颜控制面板
- 访客端：只显示 ZEGO 内置美颜按钮

**代码示例**：

```typescript
// VideoInterview.tsx (HR 端)
<Button onClick={openBeautySettings}>
  🎨 美颜 {beautyEnabled ? '✓' : ''}
</Button>

// JoinInterview.tsx (访客端)
// 不显示自定义美颜按钮，只通过 ZEGO 内置功能访问
const config = {
  showAudioVideoSettingsButton: true, // 访客也可以使用美颜
};
```

---

## 📱 多端适配

### PC 端（VideoInterview.tsx）

**特点**：
- 完整的自定义美颜控制面板
- 实时参数调整
- 快速预设方案

**配置**：
```typescript
showAudioVideoSettingsButton: true,
```

---

### 移动端（JoinInterviewMobile.tsx）

**特点**：
- ZEGO 内置美颜
- 通过设置按钮访问

**配置**：
```typescript
showAudioVideoSettingsButton: true, // 移动端也显示音视频设置
```

---

### 访客端（JoinInterview.tsx）

**特点**：
- ZEGO 内置美颜
- 通过设置按钮访问

**配置**：
```typescript
showAudioVideoSettingsButton: true, // 访客也可以使用美颜
```

---

## 🔧 ZEGO API 说明

### setBeautyEffect

**语法**：
```typescript
zegoInstance.setBeautyEffect(enabled: boolean, params?: BeautyParams): void
```

**参数**：
- `enabled`：是否开启美颜
- `params`：美颜参数对象（可选）
  - `whitening`：美白 (0-100)
  - `smoothing`：磨皮 (0-100)
  - `sharpening`：锐化 (0-100)
  - `rosiness`：红润 (0-100)

**示例**：
```typescript
// 开启美颜
zegoInstance.setBeautyEffect(true, {
  whitening: 50,
  smoothing: 60,
  sharpening: 30,
  rosiness: 40
});

// 关闭美颜
zegoInstance.setBeautyEffect(false);
```

---

## 🎯 最佳实践

### 1. 错误处理

```typescript
try {
  zegoInstanceRef.current.setBeautyEffect(true, beautyParams);
  message.success('美颜已开启');
} catch (error) {
  console.error('美颜设置失败:', error);
  message.error('美颜设置失败');
}
```

### 2. 状态同步

```typescript
// 确保状态与实际效果同步
const toggleBeauty = () => {
  const newState = !beautyEnabled;
  
  if (newState) {
    zegoInstanceRef.current.setBeautyEffect(true, beautyParams);
  } else {
    zegoInstanceRef.current.setBeautyEffect(false);
  }
  
  setBeautyEnabled(newState); // 更新状态
};
```

### 3. 实时更新

```typescript
// 参数调整时实时更新
const adjustBeautyParam = (param, value) => {
  const newParams = { ...beautyParams, [param]: value };
  setBeautyParams(newParams);
  
  // 如果美颜已开启，立即应用新参数
  if (beautyEnabled && zegoInstanceRef.current) {
    zegoInstanceRef.current.setBeautyEffect(true, newParams);
  }
};
```

---

## 📊 性能优化

### 1. 防抖处理

对于频繁的参数调整，可以使用防抖：

```typescript
import { debounce } from 'lodash';

const debouncedAdjustBeauty = debounce((params) => {
  if (zegoInstanceRef.current) {
    zegoInstanceRef.current.setBeautyEffect(true, params);
  }
}, 100);

const adjustBeautyParam = (param, value) => {
  const newParams = { ...beautyParams, [param]: value };
  setBeautyParams(newParams);
  
  if (beautyEnabled) {
    debouncedAdjustBeauty(newParams);
  }
};
```

### 2. 条件渲染

只在美颜开启时渲染参数控件：

```typescript
{beautyEnabled && (
  <>
    {/* 参数控件 */}
  </>
)}
```

---

## 🐛 调试技巧

### 1. 日志输出

```typescript
console.log('美颜状态:', beautyEnabled);
console.log('美颜参数:', beautyParams);
console.log('ZEGO 实例:', zegoInstanceRef.current);
```

### 2. 错误捕获

```typescript
try {
  zegoInstanceRef.current.setBeautyEffect(true, beautyParams);
} catch (error) {
  console.error('美颜设置失败:', error);
  console.error('错误堆栈:', error.stack);
}
```

---

## 📝 总结

美颜功能的技术实现包括：

✅ **状态管理**：使用 React Hooks 管理美颜状态
✅ **业务逻辑**：封装美颜控制函数
✅ **UI 组件**：提供直观的用户界面
✅ **权限控制**：区分 HR 和访客权限
✅ **多端适配**：支持 PC、移动端、小程序
✅ **性能优化**：防抖、条件渲染等优化手段

**关键技术**：
- React Hooks（useState, useRef）
- TypeScript 类型安全
- Ant Design 组件库
- ZEGO UIKit Prebuilt SDK

---

**更新日期**：2025-11-07
**版本**：v1.0.0

