# 小程序API文档对比报告

> **生成时间**: 2026-01-16  
> **对比范围**: 后端实际接口 vs 小程序API文档

---

## 📊 执行摘要

本报告对比了后端实际实现的小程序接口与现有小程序API文档的覆盖情况，发现了**多个新增接口未添加到文档**中。

### 关键发现
- ✅ **已记录接口**: 约 15 个
- ❌ **缺失接口**: 约 20+ 个
- 📝 **主要文档**: `backend/docs/小程序API完整文档.md`

---

## 🔍 详细对比结果

### 1️⃣ 简历管理模块 (Resume)

#### ✅ 已在文档中的接口
| 接口 | 路径 | 方法 | 文档位置 |
|------|------|------|---------|
| 自助注册 | `/api/resumes/miniprogram/self-register` | POST | ✅ 已记录 |
| 创建简历 | `/api/resumes/miniprogram/create` | POST | ✅ 已记录 |
| 获取简历详情 | `/api/resumes/miniprogram/:id` | GET | ✅ 已记录 |
| 更新简历 | `/api/resumes/miniprogram/:id` | PATCH | ✅ 已记录 |
| 上传单个文件 | `/api/resumes/miniprogram/:id/upload-file` | POST | ✅ 已记录 |
| 批量上传文件 | `/api/resumes/miniprogram/:id/upload-files` | POST | ✅ 已记录 |
| 删除文件 | `/api/resumes/miniprogram/:id/delete-file` | DELETE | ✅ 已记录 |

#### ❌ 缺失的接口（未在文档中）
| 接口 | 路径 | 方法 | 认证 | 说明 |
|------|------|------|------|------|
| 数据验证 | `/api/resumes/miniprogram/validate` | POST | 需要 | 验证手机号、身份证是否重复 |
| 统计信息 | `/api/resumes/miniprogram/stats` | GET | 需要 | 获取简历统计数据 |
| 公开简历列表 | `/api/resumes/public/list` | GET | 无需 | 获取公开简历列表（不脱敏） |
| 公开简历详情 | `/api/resumes/public/:id` | GET | 无需 | 获取公开简历详情（不脱敏） |
| 生成分享链接 | `/api/resumes/:id/share` | POST | 需要 | 生成简历分享链接 |
| 获取分享简历 | `/api/resumes/shared/:token` | GET | 无需 | 通过token获取分享的简历 |
| 搜索服务人员 | `/api/resumes/search-workers` | GET | 无需 | 按姓名或手机号搜索 |
| 获取枚举字典 | `/api/resumes/enums` | GET | 无需 | 获取所有枚举值 |

---

### 2️⃣ 客户管理模块 (Customers)

#### ❌ 完全缺失（文档中未提及）
| 接口 | 路径 | 方法 | 认证 | 说明 |
|------|------|------|------|------|
| 客户统计 | `/api/customers/miniprogram/statistics` | GET | 需要 | 基于角色的客户统计 |
| 客户列表 | `/api/customers/miniprogram/list` | GET | 需要 | 基于权限的客户列表 |
| 创建客户 | `/api/customers/miniprogram/create` | POST | 需要 | 小程序创建客户（支持幂等性） |
| 客户详情 | `/api/customers/miniprogram/:id` | GET | 需要 | 获取客户详情（权限控制） |
| 更新客户 | `/api/customers/miniprogram/:id` | PATCH | 需要 | 更新客户信息（权限控制） |
| 分配客户 | `/api/customers/miniprogram/:id/assign` | PATCH | 需要 | 分配客户给员工 |
| 新增跟进 | `/api/customers/miniprogram/:id/follow-ups` | POST | 需要 | 添加客户跟进记录 |
| 跟进列表 | `/api/customers/miniprogram/:id/follow-ups` | GET | 需要 | 获取客户跟进记录 |
| 分配日志 | `/api/customers/miniprogram/:id/assignment-logs` | GET | 需要 | 获取客户分配历史 |
| 员工列表 | `/api/customers/miniprogram/employees/list` | GET | 需要 | 获取可分配的员工列表 |

---

### 3️⃣ Banner轮播图模块

#### ✅ 已在文档中的接口
| 接口 | 路径 | 方法 | 文档位置 |
|------|------|------|---------|
| 获取Banner列表 | `/api/banners/miniprogram/active` | GET | ✅ 已记录 |

---

### 4️⃣ 文章管理模块 (Articles)

#### ✅ 已在文档中的接口
| 接口 | 路径 | 方法 | 文档位置 |
|------|------|------|---------|
| 文章列表 | `/api/articles/miniprogram/list` | GET | ✅ 已记录（单独文档） |
| 文章详情 | `/api/articles/miniprogram/:id` | GET | ✅ 已记录（单独文档） |

**注**: 文章接口有单独的文档 `docs/小程序调用文章API指南.md`，但未整合到主文档中。

---

### 5️⃣ 视频面试模块 (Interview)

#### ❌ 完全缺失（文档中未提及）
| 接口 | 路径 | 方法 | 认证 | 说明 |
|------|------|------|------|------|
| 创建面试间 | `/api/interview/rooms` | POST | 需要 | 创建视频面试间 |
| 简化创建 | `/api/interview/create-room` | POST | 需要 | 简化版创建（H5用） |
| 获取面试间 | `/api/interview/room/:roomId` | GET | 需要 | 获取面试间信息 |
| 结束面试 | `/api/interview/room/:roomId/end` | POST | 需要 | 结束面试间 |
| 面试间列表 | `/api/interview/rooms` | GET | 需要 | 获取面试间列表 |
| 最新面试间 | `/api/interview/latest-room` | GET | 需要 | 获取最新活跃面试间 |
| 访客加入 | `/api/interview/guest/join` | POST | 无需 | 访客加入面试间 |
| 访客离开 | `/api/interview/guest/leave` | POST | 无需 | 访客离开面试间 |

---

### 6️⃣ ZEGO视频服务模块

#### ❌ 完全缺失（文档中未提及）
| 接口 | 路径 | 方法 | 认证 | 说明 |
|------|------|------|------|------|
| 生成Token | `/api/zego/generate-token` | POST | 需要 | 生成ZEGO视频通话Token |
| 访客Token | `/api/zego/generate-guest-token` | POST | 无需 | 生成访客Token（无需认证） |

---

### 7️⃣ 微信服务模块 (WeChat)

#### ❌ 完全缺失（文档中未提及）
| 接口 | 路径 | 方法 | 认证 | 说明 |
|------|------|------|------|------|
| 生成绑定码 | `/api/wechat/bind-qrcode/:userId` | GET | 需要 | 生成员工绑定二维码 |
| 微信验证 | `/api/wechat/event` | GET | 无需 | 微信服务器验证 |
| 微信事件 | `/api/wechat/event` | POST | 无需 | 处理微信事件推送 |
| 测试消息 | `/api/wechat/test-message` | POST | 需要 | 测试发送微信消息 |

---

### 8️⃣ OCR识别模块

#### ✅ 已在文档中的接口
| 接口 | 路径 | 方法 | 文档位置 |
|------|------|------|---------|
| 身份证识别 | `/api/ocr/idcard` | POST | ✅ 已记录 |

#### ❌ 缺失的接口
| 接口 | 路径 | 方法 | 认证 | 说明 |
|------|------|------|------|------|
| 健康检查 | `/api/ocr/health` | GET | 需要 | OCR服务健康检查 |
| 服务指标 | `/api/ocr/metrics` | GET | 需要 | 获取OCR服务指标 |

---

### 9️⃣ 认证模块 (Auth)

#### ❌ 缺失的接口
| 接口 | 路径 | 方法 | 认证 | 说明 |
|------|------|------|------|------|
| 小程序登录 | `/api/auth/miniprogram-login` | POST | 无需 | 小程序微信登录 |

---

### 🔟 日志模块

#### ❌ 完全缺失（文档中未提及）
| 接口 | 路径 | 方法 | 认证 | 说明 |
|------|------|------|------|------|
| 访问日志 | `/api/miniprogram-access-log` | POST | 无需 | 记录小程序H5页面访问日志 |

---

## 📝 建议的文档更新

### 优先级1：核心业务接口（必须添加）
1. **客户管理模块** - 10个接口完全缺失
2. **简历公开接口** - 4个公开查询接口
3. **视频面试模块** - 8个面试相关接口
4. **认证模块** - 小程序登录接口

### 优先级2：辅助功能接口（建议添加）
1. **简历验证和统计** - 2个辅助接口
2. **ZEGO视频服务** - 2个Token生成接口
3. **微信服务** - 4个微信集成接口

### 优先级3：监控和日志（可选）
1. **OCR监控** - 2个监控接口
2. **访问日志** - 1个日志记录接口

---

## 📚 现有文档清单

### 主要文档
1. `backend/docs/小程序API完整文档.md` - 主文档（需要大幅更新）
2. `docs/小程序端-接口快速参考.md` - 快速参考（仅4个接口）
3. `docs/小程序调用文章API指南.md` - 文章接口专项文档
4. `MINIPROGRAM_BACKEND_API.md` - 视频面试接口文档（独立）

### 建议
- 将所有小程序接口整合到 `backend/docs/小程序API完整文档.md`
- 或创建模块化文档结构，按功能模块分文档
- 更新 `docs/小程序端-接口快速参考.md` 的接口列表

---

## ✅ 下一步行动

1. **立即更新**: 添加客户管理模块的10个接口到文档
2. **补充完善**: 添加简历公开接口和验证接口
3. **整合文档**: 将视频面试接口整合到主文档
4. **统一格式**: 确保所有接口文档格式一致
5. **添加示例**: 为新接口添加调用示例代码

---

**报告生成完毕** 🎉

