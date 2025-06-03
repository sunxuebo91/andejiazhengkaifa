import sys; key_content = sys.argv[1]; open("nginx/ssl/crm.andejiazheng.com.key", "w").write(key_content); print("私钥文件已创建")
