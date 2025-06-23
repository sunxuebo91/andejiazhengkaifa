import com.alibaba.fastjson.JSONObject;
import com.ancun.netsign.model.*;
import org.junit.Assert;
import org.junit.Test;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

/**
 * 认证
 */
public class AuthTest extends BaseTests {

    // 发送短信
    @Test
    public void captchaTest() {
        String mobile = "****"; // 手机号

        ApiRespBody<Void> apiRespBody = netSignClient.sendAuthCaptcha(mobile);
        System.out.println(apiRespBody);
        Assert.assertTrue(apiRespBody.success());
    }

    @Test
    public void personalIdentify4s() {
        AuthInput userInput = new AuthInput();
        userInput.setRealName("真实姓名");
        userInput.setIdCardNo("身份证号");
        userInput.setMobile("***");
        userInput.setCaptcha("364144");
        userInput.setBankCard("****");
        System.out.println(JSONObject.toJSONString(netSignClient.personalBank4s(userInput)));
    }

    // 个人运营商三要素
    @Test
    public void personAuthOperator3Test() {
        AuthInput authInput = new AuthInput();
        authInput.setRealName(""); // 姓名
        authInput.setMobile(""); // 手机号
        authInput.setIdCardNo(""); // 身份证
        authInput.setCaptcha(""); // 验证码
        System.out.println(JSONObject.toJSONString(authInput));
        ApiRespBody<AuthOutput> apiRespBody = netSignClient.personAuthOperator3(authInput);
        Assert.assertTrue(apiRespBody.success());
    }

    // 个人银行卡四要素
    @Test
    public void personAuthBank4Test() {
        AuthInput authInput = new AuthInput();
        authInput.setRealName(""); // 姓名
        authInput.setIdCardNo(""); // 身份证号
        authInput.setBankCard(""); // 银行卡
        authInput.setMobile(""); // 手机号
        authInput.setCaptcha(""); // 验证码
        System.out.println(JSONObject.toJSONString(authInput));
        ApiRespBody<AuthOutput> apiRespBody = netSignClient.personAuthBank4(authInput);
        if (apiRespBody.success()) {
            System.out.println(apiRespBody.getData().getResult());
            System.out.println(apiRespBody.getData().getSerialNo());
        }
        Assert.assertTrue(apiRespBody.success());
    }

    // 根据流水号查询认证结果
    @Test
    public void getAuthResultTest() {
        String serialNo = ""; // 认证流水号
        ApiRespBody<AuthOutput> apiRespBody = netSignClient.getAuthResult(serialNo);
        if (apiRespBody.success()) {
            System.out.println(apiRespBody.getData().getSerialNo());
            System.out.println(apiRespBody.getData().getResult());
            System.out.println(apiRespBody.getData().getType());
        }
        Assert.assertTrue(apiRespBody.success());
    }

    // 重新发送认证验证码
    @Test
    public void resendCaptcha() {
        String serialNo = ""; // 认证流水号
        ApiRespBody<Void> apiRespBody = netSignClient.resendAuthCaptcha(serialNo);
        System.out.println(JSONObject.toJSONString(apiRespBody));
        Assert.assertTrue(apiRespBody.success());
    }

    // 认证验证码回填
    @Test
    public void verifyCaptcha() {
        String serialNo = "CA30120230227141307661458"; // 认证流水号
        String captcha = "096437"; // 短信验证码
        ApiRespBody<AuthOutput> apiRespBody = netSignClient.verifyCaptcha(serialNo, captcha);
        System.out.println(JSONObject.toJSONString(apiRespBody));
        Assert.assertTrue(apiRespBody.success());
    }

    // 个人三要素认证（新）
    @Test
    public void personAuthMobile3() {
        AuthInput input = new AuthInput();
        input.setRealName(""); // 真实姓名
        input.setIdCardNo(""); // 身份证号
        input.setMobile(""); // 手机号
        System.out.println(JSONObject.toJSONString(input));
        ApiRespBody<AuthOutput> apiRespBody = netSignClient.personAuthMobile3(input);
        System.out.println(JSONObject.toJSONString(apiRespBody));
        Assert.assertTrue(apiRespBody.success());
    }

    // 个人银行卡四要素认证（新）
    @Test
    public void personAuthBankCard4() {
        AuthInput input = new AuthInput();
        input.setRealName(""); // 姓名
        input.setIdCardNo(""); // 身份证
        input.setBankCard(""); // 银行卡
        input.setMobile(""); // 手机号
        System.out.println(JSONObject.toJSONString(input));
        ApiRespBody<AuthOutput> apiRespBody = netSignClient.personAuthBankCard4(input);
        System.out.println(JSONObject.toJSONString(apiRespBody));
        if (apiRespBody.success()) {
            System.out.println(apiRespBody.getData().getSerialNo());
            System.out.println(apiRespBody.getData().getType());
            System.out.println(apiRespBody.getData().getResult());
        }
        Assert.assertTrue(apiRespBody.success());
    }


    @Test
    public void personAuthFace() {
        AuthInput input = new AuthInput();
        input.setRealName("");
        input.setIdCardNo("");
        input.setRedirectUrl(" ");
        input.setFaceAuthMode(2); // 1.支付宝，2.H5，3.微信 4.小程序 5.支付宝小程序
        input.setShowResult(1);
        input.setBizId("");
        System.out.println(JSONObject.toJSONString(input));
        ApiRespBody<AuthOutput> apiRespBody = netSignClient.personAuthFace(input);
        System.out.println(JSONObject.toJSONString(apiRespBody));
        if (apiRespBody.success()) {
            System.out.println(apiRespBody.getData().getSerialNo());
            System.out.println(apiRespBody.getData().getType());
            System.out.println(apiRespBody.getData().getResult());
            System.out.println(apiRespBody.getData().getFaceUrl());
        }
        Assert.assertTrue(apiRespBody.success());
    }

    @Test
    public void companyAuthMobile3() {
        AuthInput input = new AuthInput();
        input.setCompanyName(""); // 企业名称
        input.setCreditCode(""); // 社会统一信用代码
        input.setRealName(""); // 法人名称
        input.setIdCardNo(""); // 法人身份证号
        input.setMobile(""); // 法人手机号
        System.out.println(JSONObject.toJSONString(input));
        ApiRespBody<AuthOutput> apiRespBody = netSignClient.companyAuthMobile3(input);
        System.out.println(JSONObject.toJSONString(apiRespBody));
        if (apiRespBody.success()) {
            System.out.println(apiRespBody.getData().getSerialNo());
            System.out.println(apiRespBody.getData().getType());
            System.out.println(apiRespBody.getData().getResult());
            System.out.println(apiRespBody.getData().getFaceUrl());
        }
        Assert.assertTrue(apiRespBody.success());
    }

    @Test
    public void companyAuthBankCard4() {
        AuthInput input = new AuthInput();
        input.setCompanyName(""); // 企业名称
        input.setCreditCode(""); // 社会统一信用代码
        input.setRealName(""); // 法人名称
        input.setIdCardNo(""); // 法人身份证号
        input.setMobile(""); // 法人手机号
        input.setBankCard(""); // 法人银行卡号
        System.out.println(JSONObject.toJSONString(input));
        ApiRespBody<AuthOutput> apiRespBody = netSignClient.companyAuthBankCard4(input);
        System.out.println(JSONObject.toJSONString(apiRespBody));
        if (apiRespBody.success()) {
            System.out.println(apiRespBody.getData().getSerialNo());
            System.out.println(apiRespBody.getData().getType());
            System.out.println(apiRespBody.getData().getResult());
            System.out.println(apiRespBody.getData().getFaceUrl());
        }
        Assert.assertTrue(apiRespBody.success());
    }

    @Test
    public void companyAuthFaceTest() {
        AuthInput input = new AuthInput();
        input.setCompanyName(""); // 企业名称
        input.setCreditCode(""); // 社会统一信用代码
        input.setRealName(""); // 法人名称
        input.setIdCardNo(""); // 法人身份证号
        input.setRedirectUrl(""); // 同步跳转地址
        input.setFaceAuthMode(2);
        input.setBizId("");
        System.out.println(JSONObject.toJSONString(input));
        ApiRespBody<AuthOutput> apiRespBody = netSignClient.companyAuthFace(input);
        System.out.println(JSONObject.toJSONString(apiRespBody));
        if (apiRespBody.success()) {
            System.out.println(apiRespBody.getData().getSerialNo());
            System.out.println(apiRespBody.getData().getType());
            System.out.println(apiRespBody.getData().getResult());
            System.out.println(apiRespBody.getData().getFaceUrl());
        }
        Assert.assertTrue(apiRespBody.success());
    }

    @Test
    public void addCustomerTest() {
        UserInput input = new UserInput();
        input.setAccount(""); // 账号
        input.setSerialNo(""); // 认证记录流水号
        input.setName(""); // 姓名
        input.setIdCardType(1); // 证件类型
        input.setIdCard(""); // 证件号码
        input.setMobile(""); // 手机号
        input.setBankCard(""); // 银行卡号
        input.setSignPwd(""); // 签约密码明文
        input.setIsSignPwdNotice(0); // 是否将签署密码短信通知用户
        input.setIsNotice(0); // 签署时是否发送短信
        System.out.println(JSONObject.toJSONString(input));
        ApiRespBody<UserSeal> apiRespBody = netSignClient.addPersonalUserV2(input);
        if (apiRespBody.success()) {
            System.out.println(JSONObject.toJSONString(apiRespBody.getData()));
        }
        Assert.assertTrue(apiRespBody.success());
    }

    @Test
    public void addBusinessTest() {
        UserInput input = new UserInput();
        input.setAccount(""); // 账号
        input.setSerialNo(""); // 认证记录流水号
        input.setCompanyName(""); // 企业名称
        input.setCreditCode(""); // 社会统一信用代码
        input.setName(""); // 法人名称
        input.setIdCardType(2); // 证件类型
        input.setIdCard(""); // 法人证件号
        input.setMobile(""); // 联系手机
        input.setContactName(""); // 联系人姓名
        input.setContactIdCard(""); // 联系人身份证
        input.setSignPwd(""); // 签约密码
        input.setIsSignPwdNotice(0);
        input.setIsNotice(0);
        System.out.println(JSONObject.toJSONString(input));
        ApiRespBody<UserSeal> apiRespBody = netSignClient.addEnterpriseUserV2(input);
        if (apiRespBody.success()) {
            System.out.println(JSONObject.toJSONString(apiRespBody.getData()));
        }
        Assert.assertTrue(apiRespBody.success());
    }

    @Test
    public void getIdentifyUrl() {
        AuthInput input = new AuthInput();
        List<Integer> authTypeList = new ArrayList<>();
        authTypeList.add(151);
        authTypeList.add(152);
        authTypeList.add(153);
        input.setAuthTypeList(authTypeList);
        input.setRealName(""); // 姓名
        input.setIdCardNo(""); // 身份证
//        input.setMobile("18058173591"); // 手机号
        input.setBankCard(""); // 银行卡号
        input.setRedirectUrl("https://www.baidu.com");
        input.setNotifyUrl("https://www.baidu.com");
//        input.setMobileRequired(1);
//        input.setBizId("yr20240407004");
        input.setMobileRequired(1);
//        input.setNeedSignPwd(1);
        input.setShowResult(1);
        System.out.println(JSONObject.toJSONString(input));
        ApiRespBody<AuthOutput> apiRespBody = netSignClient.getPersonIdentifyUrl(input);
        if (apiRespBody.success()) {
            System.out.println(JSONObject.toJSONString(apiRespBody.getData()));
        }
        Assert.assertTrue(apiRespBody.success());
    }

    @Test
    public void companyVerifyEnt3Test() {
        AuthInput input = new AuthInput();
        input.setCompanyName("***");
        input.setCreditCode("***");
        input.setRealName("***");
        input.setAgentName("");
        input.setAgentIdCardNo("");
        System.out.println(JSONObject.toJSONString(input));
        ApiRespBody<AuthOutput> apiRespBody = netSignClient.companyVerifyEnt3(input);
        System.out.println(JSONObject.toJSONString(apiRespBody));
        System.out.println(apiRespBody.getData().getSerialNo());
        System.out.println(apiRespBody.getData().getResult());
    }

    @Test
    public void companyPublicTransfer() {
        AuthInput input = new AuthInput();
        input.setSerialNo("CV40324100758823817");
        input.setBank("招商银行");
        input.setBankCard("****");
        input.setProvince("***");
        input.setCnaps("");
        input.setCity("深圳市");
        input.setSubbranch("招商银圳分行");
        input.setMobile("***");
        System.out.println(JSONObject.toJSONString(input));
        ApiRespBody<AuthOutput> apiRespBody = netSignClient.companyPublicTransfer(input);
        System.out.println(JSONObject.toJSONString(apiRespBody));
    }

    @Test
    public void transferProcess() {
        AuthInput authInput = new AuthInput();
        authInput.setSerialNo("CA3042023383410");
        System.out.println(JSONObject.toJSONString(authInput));
        ApiRespBody<AuthOutput> apiRespBody = netSignClient.transferProcess(authInput);
        System.out.println(JSONObject.toJSONString(apiRespBody));
    }

    @Test
    public void verifyTransferAmount() {
        AuthInput authInput = new AuthInput();
        authInput.setSerialNo("CA30420230404102411383410");
        authInput.setAmount("0.02");
        System.out.println(JSONObject.toJSONString(authInput));
        ApiRespBody<Void> apiRespBody = netSignClient.companyVerifyTransferAmount(authInput);
        System.out.println(JSONObject.toJSONString(apiRespBody));
    }

    @Test
    public void reverseTransfer() {
        AuthInput input = new AuthInput();
        input.setSerialNo("CV40320240618164108894389");
        System.out.println(JSONObject.toJSONString(input));
        ApiRespBody<PublicAccountOutput> apiRespBody = netSignClient.reverseTransfer(input);
        System.out.println(JSONObject.toJSONString(apiRespBody));
    }

    @Test
    public void reverseTransferProcess() {
        AuthInput input = new AuthInput();
        input.setSerialNo("CA30520230404112247264662");
        System.out.println(JSONObject.toJSONString(input));
        ApiRespBody<AuthOutput> apiRespBody = netSignClient.reverseTransferProcess(input);
        System.out.println(JSONObject.toJSONString(apiRespBody));
    }

    @Test
    public void companyH5Test() {
        AuthInput input = new AuthInput();
        input.setAgentAuthFlag(1); // 是否需要办理人认证，1.需要，0.不需要
        input.setAddUserFlag(0); // 认证完成是否自动添加用户，1.是，0.否
//        input.setMobileRequired(1);
        input.setBizId("");
        input.setShowResult(1);
//        List<Integer> authTypeList = Arrays.asList(151,152,153);
//        input.setAuthTypeList(authTypeList);
//
//        List<Integer> companyAuthTypeList = Arrays.asList(351, 354, 355);
//        input.setCompanyAuthTypeList(companyAuthTypeList);

//        input.setCompanyName("***");
//        input.setCreditCode("***");
//        input.setLegalPersonName("何雪琴");
//        input.setLegalPersonIdCardNo("***");
//        input.setAgentName("***");
//        input.setAgentIdCardNo("***");

//        List<String> immutableInfoList = Arrays.asList("companyName", "creditCode");
//        input.setImmutableInfoList(immutableInfoList);

        input.setRedirectUrl("https://www.baidu.com");
        input.setNotifyUrl("https://www.baidu.com");

        System.out.println(JSONObject.toJSONString(input));
        ApiRespBody<AuthOutput> companyIdentifyUrl = netSignClient.getCompanyIdentifyUrl(input);
        System.out.println(JSONObject.toJSONString(companyIdentifyUrl));
    }

    @Test
    public void companyAuthorization() {
        AuthInput authInput = new AuthInput();
        authInput.setSerialNo("CV4032023050829268496");
        authInput.setIdCardNo("");
        authInput.setRedirectUrl("https://www.baidu.com");
        authInput.setNotifyUrl("https://www.baidu.com");
        System.out.println(JSONObject.toJSONString(authInput));
        ApiRespBody<AuthOutput> apiRespBody = netSignClient.companyAuthorization(authInput);
        System.out.println(JSONObject.toJSONString(apiRespBody));
    }

    @Test
    public void companyAuthorizationUrl() {
        AuthInput authInput = new AuthInput();
        authInput.setSerialNo("CA3062023050821651902");
        System.out.println(JSONObject.toJSONString(authInput));
        ApiRespBody<AuthOutput> apiRespBody = netSignClient.companyAuthorizationUrl(authInput);
        System.out.println(JSONObject.toJSONString(apiRespBody));
    }

    @Test
    public void companyAuthorizationResult() {
        AuthInput authInput = new AuthInput();
        authInput.setSerialNo("CA30620230508121651902");
        System.out.println(JSONObject.toJSONString(authInput));
        ApiRespBody<AuthOutput> apiRespBody = netSignClient.companyAuthorizationResult(authInput);
        System.out.println(JSONObject.toJSONString(apiRespBody));
    }

    @Test
    public void getAuthRecordInfo() {
        String serialNo = "CA350202305161046440676";
        AuthInput authInput = new AuthInput();
        authInput.setSerialNo(serialNo);
        ApiRespBody<AuthInfoOutput> authRecordInfo = netSignClient.getAuthRecordInfo(authInput);
        System.out.println(JSONObject.toJSONString(authRecordInfo));
    }

    @Test
    public void userFace() {
        UserInput userInput = new UserInput();
        userInput.setIdCard("");
        userInput.setName("");
        userInput.setNotifyUrl("https://www.baidu.com");
        userInput.setFaceAuthMode(2);
        userInput.setShowResult(1);
//        userInput.setLiveType(2);
        System.out.println(JSONObject.toJSONString(netSignClient.faceIdentify(userInput)));
    }

    @Test
    public void userWillFace() {
        AuthInput input = new AuthInput();
        input.setRealName("");
        input.setIdCardNo("");
        input.setQuestion("您好，为确保您本人操作，此次签约全程录音录像。请问您本次业务是本人自愿办理吗？请回答：我确认或是的");
        input.setAnswer("我确认|是的");
        input.setRedirectUrl("https://www.baidu.com");
        System.out.println(JSONObject.toJSONString(input));
        ApiRespBody<AuthOutput> apiRespBody = netSignClient.personAuthWillFace(input);
        System.out.println(JSONObject.toJSONString(apiRespBody));
        if (apiRespBody.success()) {
            System.out.println(apiRespBody.getData().getFaceUrl());
        }
    }


    @Test
    public void identifyH5Test() {
        UserInput input = new UserInput();
        input.setName("");
        input.setIdCard("");
        input.setNeedIdentifyTwo(0);
        input.setIdentifyType(4);
        input.setFaceAuthMode(2);
        ApiRespBody apiRespBody = netSignClient.personalIdentifyH5(input);
        System.out.println(JSONObject.toJSONString(apiRespBody));
    }

    @Test
    public void face3() throws IOException {
        AuthInput input = new AuthInput();
        input.setRealName("");
        input.setIdCardNo("");
//        FileDto file = new FileDto();
//        file.setFileName("face");
//        file.setFilePath("D:/TestFile/face.jpg");
//        input.setImage(file);
        File file = new File("D:/TestFile/face.jpg");
        FileInputStream imageInFile = new FileInputStream(file);
        byte[] imageData = new byte[(int) file.length()];
        imageInFile.read(imageData);
        String base64 = Base64.getEncoder().encodeToString(imageData);
        input.setBase64(base64);
        ApiRespBody<FaceEnt3Output> resp = netSignClient.personFace3(input);
        System.out.println(JSONObject.toJSONString(resp));
        imageInFile.close();
    }

    @Test
    public void companyDetails() {
        AuthInput authInput = new AuthInput();
        authInput.setCompanyName("浙有限公司");
        ApiRespBody<CompanyDetailsOutput> resp = netSignClient.companyDetails(authInput);
        System.out.println(JSONObject.toJSONString(resp));
    }
}
