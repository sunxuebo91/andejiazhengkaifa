# coding=utf-8
import hashlib
import json
import time
import os
import random
import requests
from collections import OrderedDict
from Crypto.PublicKey import RSA
from Crypto.Hash import MD5, SHA1, SHA256
from Crypto.Signature import PKCS1_v1_5 as Signature_PKC
import base64
from requests_toolbelt.multipart.encoder import MultipartEncoder

# 接口调用地址，
# 正式环境：https://oapi.acsign.cn 
# 沙箱环境域名：https://prev.asign.cn

host = "https://prev.asign.cn"
# 应用ID
appId = "开放平台的应用id";
# 应用密钥
appKey = '''MIIBUwIBADANBgkqhkiG9w0BAQEFAASCAT0wggE5AgEAAkEAmt2jO6Z5uwRFM+bdRBXoHcjpdWpUDvwI05py3kZvfcg7ahUJkz4cQvCUaLVMFvH4LyefiA5ER2q7S87653yYMQIDAQABAkBzD4Eb7JA89utDqJ902qHen0t1RU6242LbdMErjEGBvXjzOvLpigUaB8gSR+o1r+damPQJdZWbR4+8EBvK1FORAiEA9EgQVjzmhFXEjsCLo/gWlbnjQhyByV7ZEotosBlm/bsCIQCiS32HTC4AwvBT1gzyr11zWmjxizYtYwV6NryvUE1tAwIgQjh+5UHhI6K0hBZCRJLuXGxl5PghXtttcQ+Fs6dPOh0CIGAq/10WpQPKf4IOCmobw/JAloLajOXkETDUEoaHvPllAiAsYPUVC4fmNW53YeDJiCcQ9yl/WbH6mktfzVl011KBcA==''';


# 构建post请求
class HttpUtils(object):
    # 构建请求头
    @staticmethod
    def doPOST(url, reqBodyData, pathstr=None, file_key=None, file_name=None):
        HTTPMethod = "POST";
        accept = "*/*";
        # 请求的与实体对应的MIME信息
        # contentType = "application/x-www-form-urlencoded; charset=UTF-8"
        contentType = "multipart/form-data; charset=UTF-8"

        # 对请求的url进行签名
        accountsApiUrl = host + url;

        # 毫米时间戳获取
        t = time.time()
        # 毫秒级时间戳
        _timestamp = str(round(t * 1000) + 1000 * 60)
        # _timestamp = '1662860816977'
        # 按照阿拉伯字符排序
        jsonstr = json.dumps(reqBodyData, sort_keys=True, separators=(',', ':'), ensure_ascii=False)
        data = dict()
        data["appId"] = appId
        data["timestamp"] = _timestamp
        data["bizData"] = jsonstr

        # 计算md5值
        m = hashlib.md5()
        m.update(jsonstr.encode('utf-8'))
        # 二进制数据字符串值
        md5_str = m.hexdigest()
        sign_str = '%s%s%s%s' % (jsonstr, md5_str, appId, _timestamp)
        # 打印签名值
        private_keyBytes = base64.b64decode(appKey)
        rsakey = RSA.importKey(private_keyBytes)
        signer = Signature_PKC.new(rsakey)
        # 根据SHA256算法处理签名内容data
        sha_data = SHA1.new(sign_str.encode("utf-8"))
        # sha_data = SHA1.new(sign_str)
        # 私钥进行签名
        signature = base64.b64encode(signer.sign(sha_data))

        if (pathstr != None):
            m = MultipartEncoder(
                fields={
                    'appId': appId,
                    'bizData': jsonstr,
                    'timestamp': _timestamp,
                    'Content-Type': 'application/octet-stream',
                    'type': 'application/octet-stream',
                    # 'templateFile': ('templateFile.pdf', open('/ac/project/python/file/b.pdf', 'rb'), 'application/octet-stream')
                    file_key: (file_name, open(pathstr, 'rb'), 'application/octet-stream')
                },
                boundary='-----------------------------' + str(random.randint(int(1e28), int(1e29 - 1))))
        else:
            m = MultipartEncoder(
                fields={
                    'appId': appId,
                    'bizData': jsonstr,
                    'timestamp': _timestamp,
                    'Content-Type': 'application/octet-stream',
                    'type': 'application/octet-stream'
                },
                boundary='-----------------------------' + str(random.randint(int(1e28), int(1e29 - 1))))

        # 添加文件
        # 构建请求头
        headers = {
            'Content-Type': contentType,
            'Accept': accept,
            'sign': signature
        }

        headers['Content-Type'] = m.content_type
        # print("headers=", m)   
        print("------------------", m)
        r = requests.post(accountsApiUrl, data=m, headers=headers)
        return r.text
