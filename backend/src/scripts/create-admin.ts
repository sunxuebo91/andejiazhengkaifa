import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UserService } from '../modules/user/user.service';
import { UserRole } from '../modules/user/models/user.entity';
import * as dotenv from 'dotenv';

// 确保加载环境变量
dotenv.config();

async function bootstrap() {
  console.log('开始创建管理员用户...');
  
  try {
    // 创建NestJS应用实例，但不启动HTTP服务器
    const app = await NestFactory.createApplicationContext(AppModule);
    
    // 获取UserService
    const userService = app.get(UserService);
    
    // 默认管理员信息
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
    const adminName = process.env.ADMIN_NAME || '系统管理员';
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    
    console.log(`准备创建管理员用户: ${adminUsername}`);
    
    // 检查用户是否已存在
    const existingUser = await userService.findByUsername(adminUsername);
    
    if (existingUser) {
      console.log(`管理员用户 ${adminUsername} 已存在，无需创建`);
    } else {
      // 创建管理员用户
      const admin = await userService.createUser({
        username: adminUsername,
        password: adminPassword,
        name: adminName,
        email: adminEmail,
        role: UserRole.ADMIN,
      });
      
      console.log(`管理员用户创建成功: ${admin.username} (ID: ${admin.id})`);
    }
    
    // 关闭应用
    await app.close();
    console.log('脚本执行完成');
  } catch (error) {
    console.error('创建管理员用户时出错:', error);
    process.exit(1);
  }
}

// 执行引导函数
bootstrap(); 