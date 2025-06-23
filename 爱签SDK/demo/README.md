*maven项目，配置改为您自己的

**lib下的sdk包可能没依赖上请检查下，project structure -》libraries  

*** 调用前请修改appid, demo中的私钥对应测试环境开放平台中默认的公钥，如修改请使用对应的公私钥

**** 调用地址：
测试环境：https://prev.asign.cn/
正式环境：https://oapi.asign.cn/

***** 接口传参请参考文档 https://preweb.asign.cn/platform/openDoc/docDetail

****** Process是一般流程示例

*** 以下是接口对应的sdk方法，缺少的可在sdk中的NetSignClient.java文件中查找

| 接口名              | 接口地址                                  | sdk方法                                    |
| ---------------- | ------------------------------------- | ---------------------------------------- |
| 个人实名认证网页版        | https://{host}/auth/person/identifyUrl | getPersonIdentifyUrl(AuthInput input)    |
| 个人运营商三要素认证       | https://{host}/auth/person/mobile3   | personAuthMobile3(AuthInput input)       |
| 个人银行卡四要素认证       | https://{host}/auth/person/bankCard4 | personAuthBankCard4(AuthInput input)     |
| 个人银行卡四要素认证[定制版]  | https://{host}/auth/person/bank4Custom | personAuthBank4Custom(AuthInput input)   |
| 个人人脸活体认证         | https://{host}/auth/person/face     | personAuthFace(AuthInput input)          |
| 个人意愿核身认证（双录）     | https://{host}/auth/person/willFace | personAuthWillFace(AuthInput input)      |
| 企业实名认证网页版        | https://{host}/auth/company/identifyUrl | getCompanyIdentifyUrl(AuthInput input)   |
| 企业法人运营商三要素认证     | https://{host}/auth/company/mobile3 | companyAuthMobile3(AuthInput input)      |
| 企业法人银行卡四要素认证     | https://{host}/auth/company/bankCard4 | companyAuthBankCard4(AuthInput input)    |
| 企业法人人脸活体认证       | https://{host}/auth/company/face    | companyAuthFace(AuthInput input)         |
| 企业核身认证           | https://{host}/verify/company/ent3  | companyVerifyEnt3(AuthInput input)       |
| 发起打款认证           | https://{host}/auth/company/transfer | companyPublicTransfer(AuthInput input)   |
| 查询打款进度           | https://{host}/auth/company/transferProcess | transferProcess(AuthInput input)         |
| 打款金额校验           | https://{host}/auth/company/verifyTransferAmount | companyVerifyTransferAmount(AuthInput input) |
| 发起反向打款           | https://{host}/auth/company/reverseTransfer | reverseTransfer(AuthInput input)         |
| 查询反向打款进度         | https://{host}/auth/company/reverseTransferProcess | reverseTransferProcess(AuthInput input)  |
| 法人核身             | https://{host}/auth/company/authorization | companyAuthorization(AuthInput input)    |
| 获取签署链接           | https://{host}/auth/company/authorizationUrl | companyAuthorizationUrl(AuthInput input) |
| 查询认证结果           | https://{host}/auth/company/authorizationResult | companyAuthorizationResult(AuthInput input) |
| 重新发送认证验证码        | https://{host}/auth/captcha/resend  | resendAuthCaptcha(String serialNo)       |
| 认证验证码校验          | https://{host}/auth/captcha/verify  | verifyCaptcha(String serialNo, String captcha) |
| 实名认证流水号查询        | https://{host}/auth/getSerialNo     | getSerialNo(AuthInput input)             |
| 个人身份证二要素比对       | https://{host}/verify/person/idcard2 | personVerifyIdcard2(AuthInput input)     |
| 个人手机号二要素比对       | https://{host}/verify/person/mobile2 | personVerifyMobile2(AuthInput input)     |
| 个人银行卡三要素比对       | https://{host}/verify/person/bank3  | personalBank3(AuthInput userInput)       |
| 个人银行卡三要素比对[详版]   | https://{host}/verify/person/bank3/detail | personalBank3Detail(AuthInput userInput) |
| 个人运营商三要素比对       | https://{host}/verify/person/mobile3 | personVerifyMobile3(AuthInput input)     |
| 个人银行卡四要素比对       | https://{host}/verify/person/bank4  | personVerifyBank4(AuthInput input)       |
| 个人银行卡四要素比对[详版]   | https://{host}/verify/person/bank4s | personalBank4sVerify(AuthInput userInput) |
| 个人银行卡四要素比对[定制版]  | https://{host}/verify/person/bank4Custom | personVerifyBank4Custom(AuthInput input) |
| 个人活体人脸比对         | https://{host}/verify/person/live/face/compare | liveFaceCompare(ApiFaceLiveInput faceLiveInput) |
| 个人人脸三要素比对        | https://{host}/verify/person/face3  | personFace3(AuthInput input)             |
| 企业工商信息比对         | https://{host}/verify/company/bizInfo | companyVerifyBizInfo(AuthInput input)    |
| 企业四要素比对          | https://{host}/verify/company/ent4  | companyVerifyEnt4(AuthInput input)       |
| 企业工商数据查询         | https://{host}/user/enterprise/info | queryEnterpriseInfo(UserInput input)     |
| 企业三要素比对详版        | https://{host}/verify/company/ent3/detail | companyVerifyEnt3Detail(AuthInput input) |
| OCR身份证识别         | https://{host}/user/ocrIdentify     | ocrIdentify(UserInput userInput)         |
| OCR银行卡识别         | https://{host}/ocr/bank             | ocrBankIdentify(UserInput userInput)     |
| OCR营业执照识别        | https://{host}/ocr/business         | ocrBusinessIdentify(UserInput userInput) |
| 添加个人用户（V2）       | https://{host}/v2/user/addPersonalUser | addPersonalUserV2(UserInput input)       |
| 添加企业用户（V2）       | https://{host}/v2/user/addEnterpriseUser | addEnterpriseUserV2(UserInput input)     |
| 添加陌生用户（V2）       | https://{host}/v2/user/addStranger  | addStrangerV2(AddStrangerInput dto)      |
| 查询用户信息           | https://{host}/user/getUser         | getUser(String account)                  |
| 发送验证码（修改用户绑定手机号) | https://{host}/user/sendCode        | sendCode(UserInput userInput)            |
| 修改手机号（验证码方式）     | https://{host}/user/modifyMobileByCode | modifyMobileByCode(ModifyMobileInput modifyMobileInput) |
| 修改手机号（运营商三要素校验)  | https://{host}/user/modifyMobile    | modifyMobile(UserInput userInput)        |
| 修改用户签约密码         | https://{host}/user/signPasswd      | signPasswd(UserInput userInput)          |
| 修改企业信息           | https://{host}/user/modifyCompanyInfo | modifyCompanyInfo(UserInput userInput)   |
| 修改个人信息           | https://{host}/v2/user/modifyUserName | modifyUserName(UserInput userInput)      |
| 用户重新认证           | https://{host}/v2/user/reAuthUser   | reAuthUser(UserInput userInput)          |
| 用户删除             | https://{host}/user/remove          | removeUser(UserInput userInput )         |
| 制作企业印章（V2）       | https://{host}/seal/makeCompanySeal | makeCompanySeal(MakeSealInput input)     |
| 制作个人印章（V2）       | https://{host}/seal/makePersonSeal  | makePersonSeal(MakeSealInput input)      |
| 查询印章             | https://{host}/user/getUserSeals    | getUserSeals(UserSealInput userSealInput) |
| 印章授权（验证码校验）      | https://{host}/seal/captchaAuth     | captchaSealAuth(SealAuthInput input)     |
| 印章授权验证码校验        | https://{host}/seal/captchaAuthVerify | captchaAuthVerify(SealAuthInput input)   |
| 文件上传方式一          | https://{host}/get/upload/url       | getUploadFileUrl(FileUploadInput uploadInput) |
| 文件上传方式二          | https://{host}/upload/file/by/url   | uploadFileByUrl(FileUrlInput urlInput)   |
| 创建待签署文件          | https://{host}/contract/createContract | createContractNew(ContractInput contractInput) |
| 添加签署方            | https://{host}/contract/addSigner   | addSigner(ListContractUserInput contractUserInputs) |
| 查询合同信息           | https://{host}/contract/getContract | getContractInfo(String contractNo)       |
| 下载合同             | https://{host}/contract/downloadContract | downloadContract(String contractNo, int downloadFileType, String outfile) |
| 下载指定合同附件         | https://{host}/contract/downloadByAttachName | downloadByTemplateNos(String contractNo, ListString templateNos, |
| 合同撤销             | https://{host}/contract/withdraw    | withdrawContract(ContractWithdrawInput withdrawInput) |
| 本地模板上传           | https://{host}/contract/uploadTemplate | uploadTemplate(TemplateInput templateInput) |
| 模板文件上传接口         | https://{host}/template/upload      | uploadTemplateFile(TemplateEditInput input) |
| 新增/编辑模板          | https://{host}/template/open        | getTemplateEditUrl(TemplateEditInput input) |
| 同步模板             | https://{host}/template/sync        | templateSync(TemplateEditInput input)    |
| 撤销同步模板           | https://{host}/template/sync/cancel | templateSyncCancel(TemplateEditInput input) |
| 下载存证报告           | https://{host}/v2/contract/downloadChainReport | downloadChainReportV2(String contractNo,Integer type, String outfile) |
| 申请验签报告           | https://{host}/signature/report/apply | applySignatureReport(ContractInput contractInput) |
| 查询验签报告           | https://{host}/signature/report/view | querySignatureReport(ContractInput contractInput) |
| 下载验签报告           | https://{host}/signature/report/download | downloadSignatureReport(ContractInput contractInput, String outfile) |
| 核验合同文件签名有效性      | https://{host}/signature/file/verify | signatureFileVerify(ContractFileVerifyInput contractFileVerifyInput) |
| 文件Hash上链         | https://{host}/mix/chain/push       | pushMixChain(InputStream stream, EnumFileAlgorithm algorithm) |
|                  |                                       |                                          |