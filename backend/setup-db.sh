#!/bin/bash

# MongoDB管理脚本

echo "安德佳政后端 - MongoDB管理脚本"
echo "=============================="

# 检查MongoDB服务
check_mongodb() {
  if systemctl is-active --quiet mongod; then
    echo "MongoDB服务正在运行"
    return 0
  else
    echo "MongoDB服务未运行"
    return 1
  fi
}

# 启动MongoDB
start_mongodb() {
  echo "正在启动MongoDB服务..."
  sudo systemctl start mongod
  
  if check_mongodb; then
    echo "MongoDB启动成功!"
  else
    echo "MongoDB启动失败，请检查配置"
    exit 1
  fi
}

# 创建数据库
setup_database() {
  echo "正在设置数据库..."
  
  # 执行MongoDB命令
  mongo --eval "
    use housekeeping;
    
    // 创建索引
    db.resumes.createIndex({ 'phone': 1 }, { unique: true });
    db.resumes.createIndex({ 'idNumber': 1 }, { unique: true });
    db.users.createIndex({ 'username': 1 }, { unique: true });
    db.users.createIndex({ 'email': 1 }, { unique: true });
    
    print('数据库初始化完成');
  "
}

# 主函数
main() {
  echo "1. 检查MongoDB服务"
  echo "2. 启动MongoDB服务"
  echo "3. 初始化数据库"
  echo "4. 退出"
  
  read -p "请选择操作 [1-4]: " choice
  
  case $choice in
    1)
      check_mongodb
      ;;
    2)
      start_mongodb
      ;;
    3)
      setup_database
      ;;
    4)
      exit 0
      ;;
    *)
      echo "无效选择"
      ;;
  esac
}

# 执行主函数
main 