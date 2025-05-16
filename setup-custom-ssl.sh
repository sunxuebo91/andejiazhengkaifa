#!/bin/bash

# 显示执行的命令
set -x

# 如果命令失败就退出脚本
set -e

echo "开始配置自定义SSL证书..."

# 设置域名
DOMAIN="crm.andejiazheng.com"

# 创建证书目录
SSL_DIR="/etc/nginx/ssl"
sudo mkdir -p $SSL_DIR

# 写入私钥
cat > /tmp/private.key << "EOF"
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEAtq7Wd3YvO6bS3KyfUBBWaQjICLG+nvz4b4VMafjmuGQqSqXX
Tc0O3RZ3UKy5j1kkKm5by94CAg4g97J4QUh7SxarpYfzr2jiQ6ctZc3RZhbrZAdS
DHWAwpWr/NWcX5C0hWzHWFN764f2nhIfJkTq4lf2Cc4C3rnveOC6/xkaaoXIf/MA
b9Fk2G0NmsVj6W3v/N2jSLPo22GlXcKVK4HP4mjYNPf47hwmcdpDwXGXidMpyv1V
RvyP1oS/Yj4H93qpb5FeFDBYRK0M6beZc+XE4b7xP0YRr5InZYp6CVUrViHnXTK9
O09XYTbo9sIUZKKxhM9VZdq385se+eJ9bM3lhwIDAQABAoIBAE93Jlu40TsFilvr
yzEsqinuY/VEPEM0j20TcvX2C4bSK4NlOI7jUD/j8erp953fjNfYQZ4g6Ia0Vqro
u17KhLdZGTlcNihrW2FKa3kJWrkp5yMP/CTnSCdcq//De84mSCBx/RTy28jMz/5a
q6od+H6U/LWvI5h3ETBnsXAeH1uOMkgCMdYO/seBV7H6bhNIn9UjQtfJGuWRQC4p
oACxuchN4jlJbl+jlBSb3L+bIQWlwj2SGsgcMpRhPo9LvolMCIqmmRclOUsRUpgo
tnQyEZVnVStF+j50dLGb40gwSLFfj+JMkh0ORre0cZRi1USzyK+YIuhtE6rs8ZVA
9XxYpWECgYEA1B+D4Vh5HIqaps+tzKQz2BTzg5sp3gfBijYBP/kQtGvbbaEpgkOO
b8A0ImlYhU1m50IuZ50ELmX+RpU+Oj1jcCAw5Q2pPzZSerJjpmlbNO3JRa4wJj68
HvEhgka9KlQ5XIKKPjvcvGwjpapw+Qxj486oMyDKQa85wnW1xXGcNwUCgYEA3Hhj
ZSHl1alhVVeptkD20tozizrrd+1FUjm8GuDjdBhEHgozeRAwXFqm31QTdk0sJOgZ
rJfpafKFOWXH98eSzqPnWozGYm/+/y7tzlvlEGgdqWNeEZ6cB8DzJJ+KPR9J1nLP
ZLnU62+Ifk6KRrQ58SJMwVpvyslHIqpxOpwPOBsCgYBEQIuvk0cMzvAp4kLayK7B
xSQBYYicH0S/0taeHeapFtc4tBVmC5SmEmLz+492/Muyd1H1FsmEoF6rmVO3a482
QbVZzgZ6B2GMhx+XKOkm46fSWtS1SZRAJHgSse4l04nNYVdX5O0GV4k0wd2t1LXD
U/g80z0g21+rWTKOgBqyfQKBgQDFvGgRPXzgzADTRUOehdeaN0ABgP/N2Q3SeJvA
U7FM37LAao/N5fop6tg99y9ZbE/Kbi0QwlMDxhM87o+SKPn/wbtvWFFZ2m8POmzp
JzxkIa1wzgGBtgrlXWX1k+2tclGMN/7QrWdNHgSCnDiiv2Q0ZHoI9O7NJwdZDRtu
4Kc5vwKBgQCkxWfigjCsSaXxrHMgtjFK9dBoNCHodnQtxas8l4CmKO0wMghCG/JL
BNnGi5B5uydFsti6lvRmWC5zoDInsSPEl71oP8kJeK8T8AmrsLyAdyJc9IzqsAVx
S1A2RYhmppBsZ15w5ZJXlnDSNrE12r2sQzlWH+kcJRXKa8uKcXzdeQ==
-----END RSA PRIVATE KEY-----
EOF
sudo mv /tmp/private.key $SSL_DIR/$DOMAIN.key

# 写入证书
cat > /tmp/certificate.pem << "EOF"
-----BEGIN CERTIFICATE-----
MIIG8jCCBNqgAwIBAgIQDPK3uFFWTlRyEvp2Z4KSKjANBgkqhkiG9w0BAQsFADBb
MQswCQYDVQQGEwJDTjElMCMGA1UEChMcVHJ1c3RBc2lhIFRlY2hub2xvZ2llcywg
SW5jLjElMCMGA1UEAxMcVHJ1c3RBc2lhIERWIFRMUyBSU0EgQ0EgMjAyNTAeFw0y
NTA1MTUwMDAwMDBaFw0yNTA4MTIyMzU5NTlaMBsxGTAXBgNVBAMTEGFuZGVqaWF6
aGVuZy5jb20wggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC2rtZ3di87
ptLcrJ9QEFZpCMgIsb6e/PhvhUxp+Oa4ZCpKpddNzQ7dFndQrLmPWSQqblvL3gIC
DiD3snhBSHtLFqulh/OvaOJDpy1lzdFmFutkB1IMdYDClav81ZxfkLSFbMdYU3vr
h/aeEh8mROriV/YJzgLeue944Lr/GRpqhch/8wBv0WTYbQ2axWPpbe/83aNIs+jb
YaVdwpUrgc/iaNg09/juHCZx2kPBcZeJ0ynK/VVG/I/WhL9iPgf3eqlvkV4UMFhE
rQzpt5lz5cThvvE/RhGvkidlinoJVStWIeddMr07T1dhNuj2whRkorGEz1Vl2rfz
mx754n1szeWHAgMBAAGjggLwMIIC7DAfBgNVHSMEGDAWgBS0EiiltMAdnylxaTzZ
EZZKdWlQwDAdBgNVHQ4EFgQUaP3zepWuWhlTNdu2abHMU46GddMwMQYDVR0RBCow
KIIQYW5kZWppYXpoZW5nLmNvbYIUd3d3LmFuZGVqaWF6aGVuZy5jb20wPgYDVR0g
BDcwNTAzBgZngQwBAgEwKTAnBggrBgEFBQcCARYbaHR0cDovL3d3dy5kaWdpY2Vy
dC5jb20vQ1BTMA4GA1UdDwEB/wQEAwIFoDAdBgNVHSUEFjAUBggrBgEFBQcDAQYI
KwYBBQUHAwIweQYIKwYBBQUHAQEEbTBrMCQGCCsGAQUFBzABhhhodHRwOi8vb2Nz
cC5kaWdpY2VydC5jb20wQwYIKwYBBQUHMAKGN2h0dHA6Ly9jYWNlcnRzLmRpZ2lj
ZXJ0LmNvbS9UcnVzdEFzaWFEVlRMU1JTQUNBMjAyNS5jcnQwDAYDVR0TAQH/BAIw
ADCCAX0GCisGAQQB1nkCBAIEggFtBIIBaQFnAHYAEvFONL1TckyEBhnDjz96E/jn
tWKHiJxtMAWE6+WGJjoAAAGW07K9gQAABAMARzBFAiEAgwJZlehAtukOUeK7ebgx
bskQPpxix7ux70PPoIoLyfwCIEmSvSbWyPkggQPRp35MNJYGk6CuLv9fuFHEoIcE
hylEAHUA7TxL1ugGwqSiAFfbyyTiOAHfUS/txIbFcA8g3bc+P+AAAAGW07K9sgAA
BAMARjBEAiBlf/pMTbQutDZVqNfIWHQ8v9MoDFdyRRpwH+u3YCKKRwIgXqQAUSlw
ek36lmGYFG2YaQSDGZgDblSTxJ1s5jiTdSsAdgDM+w9qhXEJZf6Vm1PO6bJ8IumF
XA2XjbapflTA/kwNsAAAAZbTsr2+AAAEAwBHMEUCIQDANcyMjorQvav5azNUabus
DbzkOa2TMbi41aMa+iQH5wIgObeNxQNadIRe0Hij15H43j30LVfmE+ICMvV/B5bE
onkwDQYJKoZIhvcNAQELBQADggIBADUGrfhQOJ7kENcLb8lzL8GpEccjy33aLUwi
r91eUL88eU2e7C5yaCtOX3vCzsfc9cI8IMeUyx7zUVJT2Jf9gr77I15FMpiqBxOO
ZbU62bKP5kcFJd5f+GY4d6Om6uszVz7mW+KNfamdkrNMlsR0pHJXYMD+y1hQqR33
z4ZHOMvXkb2f0rGc/g6jyG6gACqR8sucME4hFyuwq7bfa29r1jEbtCB/R/iTKU4M
JdMJrnqRe0t52Rl/7KATcz4hrHgX15WyqaDP0xOaU5LHfrm4MglZZRQrrs72/84U
Vzh7NjXxN9Z4PscaraBrrlkJ4990A9jeUw8CCavG1LY1mHbBL745ASDYMgKpGVLs
ZUzFIUyGScF8XyHXoGNiLSVoWbzQFqicBslmeNK+KKGnoFvqjQF9K6MhdKV/U3V8
eo2FXonF+k79CrcpHAis7ckSdxZK42UB0MtOlzBLXSTFUCH3/nE2571Zo/2Bt0lQ
V+8uKskb7qr76gHtC+Bv1WU7mOVTZwNtRkX1dw/jonky56sq0bFlcG0CiHH3QpfK
t2+DzPsQadZk0jsudf25Hr9M+L4ywSrs+A0qfOtEVH4toZorCNuZKJDE9xJhO8Lc
65JurX4E76f48Mk9/9wMAvSeFdteLTj/UMgyyju9sTgbhcRjND0k3/G29R47mF0K
skosuhvy
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
MIIFnjCCBIagAwIBAgIQCSYyO0lk42hGFRLe8aXVLDANBgkqhkiG9w0BAQsFADBh
MQswCQYDVQQGEwJVUzEVMBMGA1UEChMMRGlnaUNlcnQgSW5jMRkwFwYDVQQLExB3
d3cuZGlnaWNlcnQuY29tMSAwHgYDVQQDExdEaWdpQ2VydCBHbG9iYWwgUm9vdCBH
MjAeFw0yNTAxMDgwMDAwMDBaFw0zNTAxMDcyMzU5NTlaMFsxCzAJBgNVBAYTAkNO
MSUwIwYDVQQKExxUcnVzdEFzaWEgVGVjaG5vbG9naWVzLCBJbmMuMSUwIwYDVQQD
ExxUcnVzdEFzaWEgRFYgVExTIFJTQSBDQSAyMDI1MIICIjANBgkqhkiG9w0BAQEF
AAOCAg8AMIICCgKCAgEA0fuEmuBIsN6ZZVq+gRobMorOGIilTCIfQrxNpR8FUZ9R
/GfbiekbiIKphQXEZ7N1uBnn6tXUuZ32zl6jPkZpHzN/Bmgk1BWSIzVc0npMzrWq
/hrbk5+KddXJdsNpeG1+Q8lc8uVMBrztnxaPb7Rh7yQCsMrcO4hgVaqLJWkVvEfW
ULtoCHQnNaj4IroG6VxQf1oArQ8bPbwpI02lieSahRa78FQuXdoGVeQcrkhtVjZs
ON98vq5fPWZX2LFv7e5J6P9IHbzvOl8yyQjv+2/IOwhNSkaXX3bI+//bqF9XW/p7
+gsUmHiK5YsvLjmXcvDmoDEGrXMzgX31Zl2nJ+umpRbLjwP8rxYIUsKoEwEdFoto
Aid59UEBJyw/GibwXQ5xTyKD/N6C8SFkr1+myOo4oe1UB+YgvRu6qSxIABo5kYdX
FodLP4IgoVJdeUFs1Usa6bxYEO6EgMf5lCWt9hGZszvXYZwvyZGq3ogNXM7eKyi2
20WzJXYMmi9TYFq2Fa95aZe4wki6YhDhhOO1g0sjITGVaB73G+JOCI9yJhv6+REN
D40ZpboUHE8JNgMVWbG1isAMVCXqiADgXtuC+tmJWPEH9cR6OuJLEpwOzPfgAbnn
2MRu7Tsdr8jPjTPbD0FxblX1ydW3RG30vwLF5lkTTRkHG9epMgpPMdYP7nY/08MC
AwEAAaOCAVYwggFSMBIGA1UdEwEB/wQIMAYBAf8CAQAwHQYDVR0OBBYEFLQSKKW0
wB2fKXFpPNkRlkp1aVDAMB8GA1UdIwQYMBaAFE4iVCAYlebjbuYP+vq5Eu0GF485
MA4GA1UdDwEB/wQEAwIBhjAdBgNVHSUEFjAUBggrBgEFBQcDAQYIKwYBBQUHAwIw
dgYIKwYBBQUHAQEEajBoMCQGCCsGAQUFBzABhhhodHRwOi8vb2NzcC5kaWdpY2Vy
dC5jb20wQAYIKwYBBQUHMAKGNGh0dHA6Ly9jYWNlcnRzLmRpZ2ljZXJ0LmNvbS9E
aWdpQ2VydEdsb2JhbFJvb3RHMi5jcnQwQgYDVR0fBDswOTA3oDWgM4YxaHR0cDov
L2NybDMuZGlnaWNlcnQuY29tL0RpZ2lDZXJ0R2xvYmFsUm9vdEcyLmNybDARBgNV
HSAECjAIMAYGBFUdIAAwDQYJKoZIhvcNAQELBQADggEBAJ4a3svh316GY2+Z7EYx
mBIsOwjJSnyoEfzx2T699ctLLrvuzS79Mg3pPjxSLlUgyM8UzrFc5tgVU3dZ1sFQ
I4RM+ysJdvIAX/7Yx1QbooVdKhkdi9X7QN7yVkjqwM3fY3WfQkRTzhIkM7mYIQbR
r+y2Vkju61BLqh7OCRpPMiudjEpP1kEtRyGs2g0aQpEIqKBzxgitCXSayO1hoO6/
71ts801OzYlqYW9OQQQ2GCJyFbD6XHDjdpn+bWUxTKWaMY0qedSCbHE3Kl2QEF0C
ynZ7SbC03yR+gKZQDeTXrNP1kk5Qhe7jSXgw+nhbspe0q/M1ZcNCz+sPxeOwdCcC
gJE=
-----END CERTIFICATE-----
EOF
sudo mv /tmp/certificate.pem $SSL_DIR/$DOMAIN.pem

# 设置文件权限
sudo chmod 600 $SSL_DIR/$DOMAIN.key
sudo chmod 644 $SSL_DIR/$DOMAIN.pem

# 更新Nginx配置
sudo tee /etc/nginx/sites-available/$DOMAIN.conf > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    # 将HTTP重定向到HTTPS
    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name $DOMAIN;
    
    # SSL证书配置
    ssl_certificate $SSL_DIR/$DOMAIN.pem;
    ssl_certificate_key $SSL_DIR/$DOMAIN.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # 前端配置
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # 后端API配置
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # 静态文件配置
    location /uploads {
        alias /home/ubuntu/andejiazhengcrm/backend/uploads;
        expires 30d;
    }
}
EOF

# 启用配置
sudo ln -sf /etc/nginx/sites-available/$DOMAIN.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 测试Nginx配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx

echo "自定义SSL证书配置完成!"
echo "您的网站现在可通过 https://$DOMAIN 安全访问" 