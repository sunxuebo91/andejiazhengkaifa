# coding=utf-8
import base64
import os

import HttpUtils
import time


def authPersonMobile3():
    print("---个人运营商三要素认证开始---")
    # 组装参数
    reqBodyData = {"realName": "真实姓名", "idCardNo": "身份证号", "mobile": "手机号码"}
    # 请求地址
    url = "/auth/person/mobile3"
    Result = HttpUtils.HttpUtils.doPOST(url, reqBodyData)
    print("---个人运营商三要素认证结果：" + Result)
    return Result


def authCompanyMobile3():
    print("---企业法人运营商三要素认证开始---")
    # 组装参数
    reqBodyData = {"companyName": "企业名称", "creditCode": "社会统一信用代码", "realName": "法人姓名",
                   "idCardNo": "法人身份证号", "mobile": "法人手机号"}
    # 请求地址
    url = "/auth/company/mobile3"
    Result = HttpUtils.HttpUtils.doPOST(url, reqBodyData)
    print("---企业法人运营商三要素认证结果：" + Result)
    return Result


def authCaptchaVerify():
    print("---认证验证码校验开始---")
    # 组装参数
    reqBodyData = {"serialNo": "认证流水号", "captcha": "短信验证码"}
    # 请求地址
    url = "/auth/captcha/verify"
    Result = HttpUtils.HttpUtils.doPOST(url, reqBodyData)
    print("---认证验证码校验结果：" + Result)
    return Result


def addPersonalUser():
    print("---创建个人账户开始---")
    # 组装参数
    reqBodyData = {"account": "用户唯一识别码", "serialNo": "实名认证流水号", "name": "用户姓名",
                   "idCard": "个人身份证", "idCardType": 1,
                   "mobile": "手机号码", "isNotice": 1}
    # 请求地址
    url = "/user/addPersonalUser"
    Result = HttpUtils.HttpUtils.doPOST(url, reqBodyData)
    print("---创建个人账户结果：" + Result)
    return Result


def addEnterpriseUser():
    print("---创建企业账户开始---")
    # 组装参数
    reqBodyData = {"account": "用户唯一识别码", "serialNo": "实名认证流水号", "companyName": "企业名称",
                   "creditCode": "企业证件号", "creditType": 1,
                   "name": "企业法人姓名", "idCard": "法人身份证", "idCardType": 1, "mobile": "签约手机",
                   "isNotice": 1}
    # 请求地址
    url = "/v2/user/addEnterpriseUser"
    Result = HttpUtils.HttpUtils.doPOST(url, reqBodyData)
    print("---创建企业账户结果：" + Result)
    return Result


def getUser():
    reqBodyData = {"account": "用户唯一识别码"}
    url = "/user/getUser"
    Result = HttpUtils.HttpUtils.doPOST(url, reqBodyData)
    print("---获取用户结果：" + Result)
    return Result


def userCreateSeal():
    print("---创建印章开始---")
    # 组装参数
    reqBodyData = {"account": "用户唯一识别码", "isDefault": 1, "sealName": "印章抬头文字", "sealNo": "印章唯一编号"}
    # 请求地址
    url = "/user/createSeal"
    Result = HttpUtils.HttpUtils.doPOST(url, reqBodyData)
    print("---创建印章结果：" + Result)
    return Result


# 创建合同
def createContract():
    contract_no = "contract001"
    reqBodyData = {"contractNo": contract_no, "contractName": "合同名字",
                   "validityTime": 10, "signOrder": 1}
    url = "/contract/createContract"
    pathstr = r'C:\Users\PC\Desktop\新模板.pdf'
    # contractFile是关键字，不能修改
    file_key = 'contractFiles'
    file_name = '合同名字.pdf'
    Result = HttpUtils.HttpUtils.doPOST(url, reqBodyData, pathstr, file_key, file_name)
    print("创建合同结果：" + Result)
    return Result


# 发起签署合同
def addSigner():
    account = "account_001"
    contract_no = "C001"
    reqBodyData = [{"account": account, "contractNo": contract_no,
                    "noticeMobile": "通知手机号",
                    "signOrder": 1, "signType": 2, "validateType": 1,
                    "signStrategyList": [
                        {"attachNo": 1, "locationMode": 2, "signPage": 1, "signX": 0.25, "signY": 0.55}]
                    }]
    url = "/contract/addSigner"
    Result1 = HttpUtils.HttpUtils.doPOST(url, reqBodyData, None)
    print("发起签署合同结果：" + Result1)
    return Result1


def downloadContract():
    reqBodyData = {"contractNo": "合同唯一编码", "force": 1,
                    "downloadFileType": 1
                    }
    url = "/contract/downloadContract"
    Result1 = HttpUtils.HttpUtils.doPOST(url, reqBodyData, None)
    print("下载合同结果：" + Result1)
    # writeToDisk(Result1,outPath)
    return Result1

# 下载到本地
def writeToDisk(bytes, outPath):
    if not os.path.exists(outPath):
        with open(outPath, 'wb') as file:
            file.write(base64.b64decode(bytes))
            file.close()
            pass
    else:
        print("文件已存在")



# 上传模板
def uploadTemplate():
    t = time.time()
    _timestamp = str(round(t * 1000) + 1000 * 60)
    template_no = "t_" + _timestamp
    reqBodyData = {"templateName": "模板名字", "templateNo": template_no}
    url = "/contract/uploadTemplate"
    pathstr = '/root/pythonsource/test.pdf'
    file_key = 'templateFile'
    file_name = 'templateFile.pdf'
    Result1 = HttpUtils.HttpUtils.doPOST(url, reqBodyData, pathstr, file_key, file_name)
    print("上传文件结果：" + Result1)
    return Result1
