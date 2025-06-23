import com.alibaba.fastjson.JSONObject;
import com.ancun.netsign.model.AuthInput;
import com.ancun.netsign.model.ModifyMobileInput;
import com.ancun.netsign.model.UserInput;
import org.apache.commons.codec.digest.DigestUtils;
import org.junit.Test;


/**
 * 用户测试
 */
public class UserTest extends BaseTests {

    @Test
    public void addPersonalUserV2Test1() {
        // 无实名认证流水号（serialNo），平台方自行认证，添加个人用户
        String name = "姓名";
        String mobile = "手机号";
        String idCard = "个人身份证、台胞证等证件号";
        UserInput userInput = new UserInput();
        userInput.setAccount("account001");
        userInput.setName(name);
        userInput.setIdCard(idCard);
        userInput.setIdCardType(1); // 证件类型，不传默认为1
        userInput.setMobile(mobile);
        userInput.setSignPwd("ac1234");
        userInput.setIsSignPwdNotice(0);
        userInput.setIsNotice(1);
        System.out.println(JSONObject.toJSONString(netSignClient.addPersonalUserV2(userInput)));
    }

    @Test
    public void addPersonalUserV2Test2() {
        // 实名认证流水号（serialNo），爱签认证，添加个人用户
        String name = "姓名";
        String mobile = "手机号";
        String idCard = "个人身份证、台胞证等证件号";
        String serialNo = "实名认证流水号";
        UserInput userInput = new UserInput();
        userInput.setAccount("account002");
        userInput.setSerialNo(serialNo);
        userInput.setIdCard(idCard);
        userInput.setIdCardType(1); // 证件类型，不传默认为1
        userInput.setMobile(mobile); // 建议传
        userInput.setSignPwd("ac1234");
        userInput.setIsSignPwdNotice(0);
        userInput.setIsNotice(1);
        System.out.println(JSONObject.toJSONString(netSignClient.addPersonalUserV2(userInput)));
    }

    public static void main(String[] args) {
        String passwd = DigestUtils.md5Hex(DigestUtils.md5Hex("ac123456") + "account001");
        System.out.println(passwd);
    }

    @Test
    public void addUserEnterpriseV2Test1() {
        //用例1：新增企业用户 无实名认证流水号（serialNo）
        String companyName = "公司名";
        String name = "企业法人姓名";
        String idNo = "法人身份证";
        String mobile = "手机号";
        UserInput addUserRequest = new UserInput();
        addUserRequest.setAccount("accountxql");
        addUserRequest.setCompanyName(companyName);
        addUserRequest.setCreditCode("企业信用代码");
        addUserRequest.setName(name);
        addUserRequest.setIdCardType(1);
        addUserRequest.setIdCard(idNo);
        addUserRequest.setMobile(mobile);
        addUserRequest.setSignPwd("ac1234");
        addUserRequest.setIsSignPwdNotice(0);
        addUserRequest.setIsNotice(1);
        System.out.println(JSONObject.toJSONString(netSignClient.addEnterpriseUserV2(addUserRequest)));
    }

    @Test
    public void addUserEnterpriseV2Test2() {
        //用例1：新增企业用户 实名认证流水号（serialNo）
        String companyName = "公司名";
        String name = "企业法人姓名";
        String idNo = "法人身份证";
        String mobile = "手机号";
        UserInput addUserRequest = new UserInput();
        addUserRequest.setAccount("accountxql");
        addUserRequest.setSerialNo("实名认证流水号");
        addUserRequest.setCompanyName(companyName);
        addUserRequest.setCreditCode("企业信用代码");
        addUserRequest.setName(name);
        addUserRequest.setIdCardType(1);
        addUserRequest.setIdCard(idNo);
        addUserRequest.setMobile(mobile);
        addUserRequest.setSignPwd("ac1234");
        addUserRequest.setIsSignPwdNotice(0);
        addUserRequest.setIsNotice(1);
        System.out.println(JSONObject.toJSONString(netSignClient.addEnterpriseUserV2(addUserRequest)));
    }

    @Test
    public void getUser() {
        //用例1：新增个人用户
        long start = System.currentTimeMillis();
        UserInput addUserRequest = new UserInput();
        addUserRequest.setAccount("account001");
        System.out.println(JSONObject.toJSONString(netSignClient.getUser("account001")));
        long end = System.currentTimeMillis();
        System.out.println("耗时：" + (end - start));
    }

    @Test
    public void personalIdentifyUrl() {
        // 个人实名认证网页版,至少传一个参数
        AuthInput userInput = new AuthInput();
        userInput.setRealName("用户姓名");
        userInput.setIdCardNo("身份证号");
        userInput.setBizId("用户自定义业务编号，在异步通知时会发送回业务方");
        System.out.println(JSONObject.toJSONString(netSignClient.getPersonIdentifyUrl(userInput)));
    }

    @Test
    public void getCompanyIdentifyUrl(){
        // 企业实名认证网页版,至少传一个参数
        AuthInput authInput = new AuthInput();
        authInput.setBizId("用户自定义业务编号，在异步通知时会发送回业务方");
        System.out.println(JSONObject.toJSONString(netSignClient.getCompanyIdentifyUrl(authInput)));
    }

    @Test
    public void personAuthMobile3() {
        // 个人运营商三要素认证
        AuthInput authInput = new AuthInput();
        authInput.setRealName("真实姓名");
        authInput.setIdCardNo("身份证号");
        authInput.setMobile("手机号码");
        System.out.println(JSONObject.toJSONString(netSignClient.personAuthMobile3(authInput)));
    }

    @Test
    public void companyAuthMobile3(){
        // 个人运营商三要素认证
        AuthInput authInput = new AuthInput();
        authInput.setCompanyName("企业名称");
        authInput.setCreditCode("社会统一信用代码");
        authInput.setRealName("真实姓名");
        authInput.setIdCardNo("身份证号");
        authInput.setMobile("手机号码");
        System.out.println(JSONObject.toJSONString(netSignClient.companyAuthMobile3(authInput)));
    }

    @Test
    public void verifyCaptcha() {
        // 认证验证码校验
        String serialNo = "认证流水号";
        String captcha = "短信验证码";
        System.out.println(JSONObject.toJSONString(netSignClient.verifyCaptcha(serialNo,captcha)));
    }

    @Test
    public void sendVerifyCode() {
        //重新发送认证验证码
        String serialNo = "认证流水号";
        System.out.println(JSONObject.toJSONString(netSignClient.resendAuthCaptcha(serialNo)));
    }

    @Test
    public void modifyMobile() {
        //修改手机号（运营商三要素校验）
        UserInput userInput = new UserInput();
        userInput.setAccount("123321323");
        userInput.setName("熊大");
        userInput.setMobile("13888888256");
        userInput.setIdCard("3622088666666876");
        System.out.println(JSONObject.toJSONString(netSignClient.modifyMobile(userInput)));
    }


    @Test
    public void updateMobile() {
        //修改手机号
        UserInput userInput = new UserInput();
        userInput.setAccount("account001");
        userInput.setMobile("13888888256");
        userInput.setIdCard("3622088666666876");
        System.out.println(JSONObject.toJSONString(netSignClient.updateMobile(userInput)));
    }

    @Test
    public void sendCode() {
        //发送验证码（修改用户绑定手机号）
        UserInput userInput = new UserInput();
        userInput.setAccount("account001");
        System.out.println(JSONObject.toJSONString(netSignClient.sendCode(userInput)));
    }


    @Test
    public void modifyMobileByCode() {
        //修改手机号（验证码方式）
        ModifyMobileInput userInput = new ModifyMobileInput();
        userInput.setAccount("account001");
        userInput.setCode("439359");
        userInput.setMobile("13888888256");
        userInput.setCtoken("yTskTkfYj6gp9QwsARcrLiTxKGMRst7r5uGHa3eeLBw+Ka6NQbYJ8Q==");
        System.out.println(JSONObject.toJSONString(netSignClient.modifyMobileByCode(userInput)));
    }


    @Test
    public void personAuthFace() {
        // 个人人脸活体认证
        AuthInput authInput = new AuthInput();
        authInput.setRealName("真实姓名");
        authInput.setIdCardNo("身份证号");
        authInput.setBizId("接入商自定义业务ID，最长32位，可用以查询活体认证结果");
        System.out.println(JSONObject.toJSONString(netSignClient.personAuthFace(authInput)));
    }


    @Test
    public void startModSignPasswd() {
        //初始化签约密码
        UserInput userInput = new UserInput();
        userInput.setAccount("account001");
        System.out.println(JSONObject.toJSONString(netSignClient.startModSignPasswd(userInput)));
    }
}
