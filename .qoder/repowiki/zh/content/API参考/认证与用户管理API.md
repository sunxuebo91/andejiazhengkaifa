# 认证与用户管理API

<cite>
**本文档引用的文件**
- [auth.controller.ts](file://backend/src/modules/auth/auth.controller.ts)
- [auth.service.ts](file://backend/src/modules/auth/auth.service.ts)
- [jwt.strategy.ts](file://backend/src/modules/auth/jwt.strategy.ts)
- [jwt-auth.guard.ts](file://backend/src/modules/auth/guards/jwt-auth.guard.ts)
- [roles.guard.ts](file://backend/src/modules/auth/guards/roles.guard.ts)
- [roles.decorator.ts](file://backend/src/modules/auth/decorators/roles.decorator.ts)
- [public.decorator.ts](file://backend/src/modules/auth/decorators/public.decorator.ts)
- [users.controller.ts](file://backend/src/modules/users/users.controller.ts)
- [users.service.ts](file://backend/src/modules/users/users.service.ts)
- [user.entity.ts](file://backend/src/modules/users/models/user.entity.ts)
- [login-log.entity.ts](file://backend/src/modules/auth/models/login-log.entity.ts)
- [auth.module.ts](file://backend/src/modules/auth/auth.module.ts)
- [production.config.js](file://backend/src/config/production.config.js)
</cite>

## 目录
1. [简介](#简介)
2. [核心认证流程](#核心认证流程)
3. [JWT令牌机制](#jwt令牌机制)
4. [基于角色的访问控制](#基于角色的访问控制)
5. [用户管理API](#用户管理api)
6. [安全机制](#安全机制)
7. [完整API调用流程示例](#完整api调用流程示例)

## 简介
本API参考文档详细说明了系统中的认证与用户管理功能。文档涵盖了用户登录认证、JWT令牌生成与验证、基于角色的访问控制（RBAC）以及用户管理CRUD操作的实现细节。通过本指南，开发者可以了解如何使用认证API获取访问令牌，以及如何在后续请求中使用该令牌访问受保护的资源。

**Section sources**
- [auth.controller.ts](file://backend/src/modules/auth/auth.controller.ts#L1-L38)
- [users.controller.ts](file://backend/src/modules/users/users.controller.ts#L1-L154)

## 核心认证流程

### 登录认证接口
系统提供`POST /auth/login`接口用于用户身份验证。客户端需要提供用户名和密码，服务器验证成功后返回JWT令牌。

```mermaid
sequenceDiagram
participant 客户端 as "客户端"
participant 控制器 as "AuthController"
participant 服务 as "AuthService"
participant 用户服务 as "UsersService"
participant 数据库 as "数据库"
客户端->>控制器 : POST /auth/login<br/>username=admin<br/>password=admin123
控制器->>服务 : login(username, password, ip, userAgent)
服务->>服务 : validateUser(username, password)
服务->>用户服务 : findByUsername(username)
用户服务->>数据库 : 查询用户
数据库-->>用户服务 : 返回用户数据
用户服务-->>服务 : 返回用户对象
服务->>服务 : bcrypt.compare(password, hashedPassword)
服务->>服务 : jwtService.sign(payload)
服务-->>控制器 : 返回token和用户信息
控制器-->>客户端 : 200 OK<br/>{token, user}
```

**Diagram sources**
- [auth.controller.ts](file://backend/src/modules/auth/auth.controller.ts#L1-L38)
- [auth.service.ts](file://backend/src/modules/auth/auth.service.ts#L35-L154)

**Section sources**
- [auth.controller.ts](file://backend/src/modules/auth/auth.controller.ts#L1-L38)
- [auth.service.ts](file://backend/src/modules/auth/auth.service.ts#L35-L154)

### 登录接口实现
`AuthController`中的`login`方法处理登录请求：

```typescript
@Post('login')
@HttpCode(HttpStatus.OK)
async login(
  @Body('username') username: string,
  @Body('password') password: string,
  @Req() req,
) {
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];
  return this.authService.login(username, password, ip, userAgent);
}
```

该方法从请求体中提取用户名和密码，并获取客户端IP和User-Agent信息用于安全审计。

**Section sources**
- [auth.controller.ts](file://backend/src/modules/auth/auth.controller.ts#L1-L38)

## JWT令牌机制

### JWT令牌生成
`AuthService`的`login`方法在验证用户凭据后生成JWT令牌：

```typescript
async login(username: string, password: string, ip: string, userAgent: string) {
  const user = await this.validateUser(username, password, ip, userAgent);
  if (!user) {
    throw new UnauthorizedException('用户名或密码错误');
  }
  
  const payload = { username: user.username, sub: user._id };
  const token = this.jwtService.sign(payload);
  
  return {
    token,
    user: {
      id: user._id,
      username: user.username,
      role: user.role,
      permissions: user.permissions,
      name: user.name
    },
  };
}
```

令牌的载荷（payload）包含用户名和用户ID（sub字段）。

**Section sources**
- [auth.service.ts](file://backend/src/modules/auth/auth.service.ts#L94-L114)

### JWT策略实现
`JwtStrategy`类定义了JWT令牌的验证规则：

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'andejiazheng-secret-key',
    });
  }

  async validate(payload: any) {
    return {
      userId: payload.sub,
      username: payload.username,
    };
  }
}
```

关键配置：
- **jwtFromRequest**: 从Authorization头的Bearer令牌中提取JWT
- **ignoreExpiration**: 不忽略令牌过期时间
- **secretOrKey**: 使用环境变量JWT_SECRET或默认密钥进行签名验证

**Section sources**
- [jwt.strategy.ts](file://backend/src/modules/auth/jwt.strategy.ts#L1-L20)

### JWT认证守卫
`JwtAuthGuard`确保只有持有有效JWT令牌的请求才能访问受保护的路由：

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }
}
```

该守卫使用`@Public`装饰器来标记公开路由，允许未认证的访问。

**Section sources**
- [jwt-auth.guard.ts](file://backend/src/modules/auth/guards/jwt-auth.guard.ts#L1-L21)

## 基于角色的访问控制

### 角色守卫实现
`RolesGuard`实现了基于角色的访问控制，确保用户具有执行特定操作所需的权限：

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!roles) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    return roles.includes(user.role);
  }
}
```

该守卫检查请求处理程序上定义的角色元数据，并验证当前用户的角色是否在允许的角色列表中。

**Section sources**
- [roles.guard.ts](file://backend/src/modules/auth/guards/roles.guard.ts#L1-L16)

### 角色装饰器
`Roles`装饰器用于在控制器方法上声明所需的角色：

```typescript
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
```

使用示例：
```typescript
@Get('admin-data')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'manager')
findAll() {
  return this.service.findAll();
}
```

**Section sources**
- [roles.decorator.ts](file://backend/src/modules/auth/decorators/roles.decorator.ts#L1-L3)

### 公共路由装饰器
`Public`装饰器用于标记不需要认证的公开路由：

```typescript
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

使用示例：
```typescript
@Post('login')
@Public()
login() {
  // 无需认证即可访问
}
```

**Section sources**
- [public.decorator.ts](file://backend/src/modules/auth/decorators/public.decorator.ts#L1-L4)

### 角色与权限映射
系统定义了不同角色的默认权限：

```typescript
private getDefaultPermissions(role: string): string[] {
  switch (role) {
    case 'admin':
      return ['*']; // 管理员拥有所有权限
    case 'manager':
      return ['resume:all', 'customer:all', 'user:view'];
    case 'employee':
      return ['resume:view', 'resume:create', 'customer:view', 'customer:create'];
    default:
      return ['resume:view', 'customer:view'];
  }
}
```

**Section sources**
- [users.service.ts](file://backend/src/modules/users/users.service.ts#L120-L131)

## 用户管理API

### 用户管理接口
用户管理API提供完整的CRUD操作，所有接口都需要JWT认证。

```mermaid
classDiagram
class UsersController {
+create(createUserDto : CreateUserDto)
+findAll(page, pageSize, search)
+findOne(id : string)
+update(id : string, updateUserDto : UpdateUserDto)
+remove(id : string)
}
class UsersService {
+create(createUserDto : CreateUserDto)
+findAll(page, pageSize, search)
+findById(id : string)
+update(id : string, updateUserDto : UpdateUserDto)
+remove(id : string)
}
class UserEntity {
+_id : string
+username : string
+name : string
+phone : string
+email : string
+role : string
+permissions : string[]
+active : boolean
+createdAt : Date
+updatedAt : Date
}
UsersController --> UsersService : "依赖"
UsersService --> UserEntity : "操作"
```

**Diagram sources**
- [users.controller.ts](file://backend/src/modules/users/users.controller.ts#L1-L154)
- [users.service.ts](file://backend/src/modules/users/users.service.ts#L1-L131)
- [user.entity.ts](file://backend/src/modules/users/models/user.entity.ts#L1-L21)

**Section sources**
- [users.controller.ts](file://backend/src/modules/users/users.controller.ts#L1-L154)
- [users.service.ts](file://backend/src/modules/users/users.service.ts#L1-L131)

### 创建用户
`POST /users`接口用于创建新用户：

```typescript
@Post()
async create(@Body() createUserDto: CreateUserDto) {
  const user = await this.usersService.create(createUserDto);
  return {
    success: true,
    data: user,
    message: '用户创建成功'
  };
}
```

请求体包含`CreateUserDto`，系统会自动为新用户生成基于角色的默认权限。

**Section sources**
- [users.controller.ts](file://backend/src/modules/users/users.controller.ts#L20-L44)
- [users.service.ts](file://backend/src/modules/users/users.service.ts#L45-L65)

### 获取用户列表
`GET /users`接口支持分页和搜索功能：

```typescript
async findAll(page: number = 1, pageSize: number = 10, search?: string) {
  const query = search 
    ? {
        $or: [
          { username: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      }
    : {};

  const skip = (page - 1) * pageSize;
  const [users, total] = await Promise.all([
    this.userModel
      .find(query)
      .select('-password')
      .lean()
      .skip(skip)
      .limit(pageSize)
      .sort({ createdAt: -1 })
      .exec(),
    this.userModel.countDocuments(query)
  ]);

  return {
    items: users as UserWithoutPassword[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  };
}
```

**Section sources**
- [users.service.ts](file://backend/src/modules/users/users.service.ts#L67-L100)

## 安全机制

### 登录尝试限制
系统实现了登录尝试次数限制，防止暴力破解攻击：

```typescript
private loginAttempts: Map<string, { count: number; lastAttempt: Date }> = new Map();
private readonly MAX_LOGIN_ATTEMPTS = 5;
private readonly LOGIN_ATTEMPT_WINDOW = 15 * 60 * 1000; // 15分钟

async validateUser(username: string, password: string, ip: string, userAgent: string) {
  const attempts = this.loginAttempts.get(username) || { count: 0, lastAttempt: new Date() };
  if (attempts.count >= this.MAX_LOGIN_ATTEMPTS) {
    const timeSinceLastAttempt = Date.now() - attempts.lastAttempt.getTime();
    if (timeSinceLastAttempt < this.LOGIN_ATTEMPT_WINDOW) {
      await this.logLoginAttempt(null, ip, userAgent, 'failed');
      throw new UnauthorizedException('登录尝试次数过多，请稍后再试');
    }
    // 重置尝试次数
    this.loginAttempts.delete(username);
  }
  // ... 验证逻辑
}
```

**Section sources**
- [auth.service.ts](file://backend/src/modules/auth/auth.service.ts#L20-L65)

### 登录审计日志
系统记录所有登录尝试，包括成功和失败的登录：

```typescript
@Schema({ timestamps: true })
export class LoginLog extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  timestamp: Date;

  @Prop({ required: true })
  ip: string;

  @Prop({ required: true })
  userAgent: string;

  @Prop({ required: true, enum: ['success', 'failed'] })
  status: 'success' | 'failed';
}
```

**Section sources**
- [login-log.entity.ts](file://backend/src/modules/auth/models/login-log.entity.ts#L1-L21)

### JWT配置
JWT令牌的配置在`auth.module.ts`和`production.config.js`中定义：

```typescript
// auth.module.ts
JwtModule.register({
  secret: process.env.JWT_SECRET || 'andejiazheng-secret-key',
  signOptions: { 
    expiresIn: '24h',
    algorithm: 'HS256'
  },
}),

// production.config.js
jwt: {
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  issuer: 'andejiazheng-crm',
  audience: 'crm-users'
}
```

**Section sources**
- [auth.module.ts](file://backend/src/modules/auth/auth.module.ts#L1-L29)
- [production.config.js](file://backend/src/config/production.config.js#L0-L42)

## 完整API调用流程示例

### 1. 用户登录获取JWT令牌
**请求:**
```http
POST /auth/login HTTP/1.1
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**响应:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluIiwic3ViIjoiNjYyYzRjZjM3ZjM4ZjMwMDFlNzY0YjU0IiwiaWF0IjoxNzE0MTIzNDU2LCJleHAiOjE3MTQyMDk4NTZ9.5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5",
  "user": {
    "id": "662c4cf37f38f3001e764b54",
    "username": "admin",
    "role": "admin",
    "permissions": ["*"],
    "name": "系统管理员"
  }
}
```

### 2. 使用JWT令牌访问受保护的API
**请求:**
```http
GET /users HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluIiwic3ViIjoiNjYyYzRjZjM3ZjM4ZjMwMDFlNzY0YjU0IiwiaWF0IjoxNzE0MTIzNDU2LCJleHAiOjE3MTQyMDk4NTZ9.5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5
```

**响应:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "_id": "662c4cf37f38f3001e764b54",
        "username": "admin",
        "name": "系统管理员",
        "role": "admin",
        "permissions": ["*"],
        "active": true,
        "createdAt": "2024-04-25T10:30:11.000Z",
        "updatedAt": "2024-04-25T10:30:11.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  },
  "message": "获取用户列表成功"
}
```

### 3. 令牌过期处理
当JWT令牌过期时，服务器返回401状态码：

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

客户端应引导用户重新登录，或使用刷新令牌机制（如果实现）。

**Section sources**
- [auth.controller.ts](file://backend/src/modules/auth/auth.controller.ts#L1-L38)
- [auth.service.ts](file://backend/src/modules/auth/auth.service.ts#L94-L154)
- [users.controller.ts](file://backend/src/modules/users/users.controller.ts#L46-L154)