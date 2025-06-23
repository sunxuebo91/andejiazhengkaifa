FROM openjdk:11-jre-slim

WORKDIR /app

# 安装必要工具
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# 复制项目文件
COPY target/*.jar app.jar
COPY lib/*.jar libs/

# 设置Java运行参数
ENV JAVA_OPTS="-Xmx512m -Xms256m"

# 暴露端口
EXPOSE 8080

# 健康检查端点
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# 启动应用
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -Djava.security.egd=file:/dev/./urandom -jar app.jar"] 