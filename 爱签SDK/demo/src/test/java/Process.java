import com.alibaba.fastjson.JSONObject;
import com.ancun.netsign.model.*;
import org.junit.Assert;
import org.junit.Test;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 流程示例
 */
public class Process extends BaseTests {
    /**
     * 第一步实名认证：获取认证地址进行认证
     * 认证流水号serialNo  ，添加用户的时候使用
     */
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

    /**
     * 第二部认证成功，添加用户
     *
     * 认证流水号serialNo
     */
    @Test
    public void addUserPTest() {
        UserInput input = new UserInput();
        input.setAccount(""); // 账号
        input.setSerialNo("认证流水号serialNo"); // 认证记录流水号
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

    private String contractNo1 = System.currentTimeMillis() + "";

    /**
     * 这里我写到一起，可以结合业务！！！
     * ，如需先预览，先上传待签署文件 ，确认后再添加签署方
     * 上传待签署文件
     * 添加签署方
     */
    @Test
    public void createContract1() {
        String contractNo = contractNo1;
        ContractInput contractInput = new ContractInput();
        contractInput.setNotifyUrl("http://localhost:8080/test/notify");
        //同步回调地址
//        contractInput.setRedirectUrl("http://localhost:8080/test/notify");
        contractInput.setContractNo(contractNo);
        contractInput.setContractName("测试junit");
        contractInput.setSignOrder(1);
        contractInput.setRefuseOn(1);
        contractInput.setValidityTime(10);
        Map<String, String> map = new HashMap<>(5);
        map.put("单行文本1", "姓名");
        map.put("单行文本2", "证件号");
        map.put("用工日期", "2023-08-23");
        List<ContractInput.Template> templates = new ArrayList<>();
        ContractInput.Template template = new ContractInput.Template();
        // 测试
//        template.setTemplateNo("TN6F123731C9DF4018BCBCEA879EBA00B2-1");
        template.setTemplateNo("TN8EB8CFE68B8A4D39B990FDC186B33FE6");
        template.setFillData(map);
        templates.add(template);
        contractInput.setTemplates(templates);
        System.out.println("合同编号：" + contractNo);
        System.out.println(JSONObject.toJSONString(netSignClient.createContract(contractInput)));
        addSignerTest(contractNo);
    }

    public void addSignerTest(String contractNo) {
        //String contractNo = contractNo1;
        List<ContractUserInput> userInputList = new ArrayList<>();
        ContractUserInput contractUserInput = new ContractUserInput();
        contractUserInput.setContractNo(contractNo);
        contractUserInput.setAccount("12312333333");
        contractUserInput.setSignOrder(1);
        //  2-无感知签章 3-有感知签章
        contractUserInput.setSignType(3);
        // 1:短信验证码签约 2：签约密码签约
        contractUserInput.setValidateType(17);

        userInputList.add(contractUserInput);
        contractUserInput.setIsNotice(1);


        List<UserSignStrategyInput> strategyInputs = new ArrayList<>(5);
        contractUserInput.setSignStrategyList(strategyInputs);

        UserSignStrategyInput userSignStrategyInput = new UserSignStrategyInput();
        userSignStrategyInput.setAttachNo(1);
        // 定位方式，2-坐标签章 3-关键字签章/2
        userSignStrategyInput.setLocationMode(2);
//            // 定位方式，2-坐标签章 3-关键字签章/2
//            userSignStrategyInput.setLocationMode(2);
//            userSignStrategyInput.setSignKey("全部义务");
////            userSignStrategyInput.setVersionKey(1);
////            userSignStrategyInput.setSignKey("跑腿");
        userSignStrategyInput.setSignX(0.8);
        userSignStrategyInput.setSignY(0.2);
        userSignStrategyInput.setSignPage(1);
//            userSignStrategyInput.setSignKey("second_stamp1");
        strategyInputs.add(userSignStrategyInput);


        //用户2
        ContractUserInput contractUserInput2 = new ContractUserInput();
        contractUserInput2.setContractNo(contractNo);
        contractUserInput2.setAccount("12312333333");
        contractUserInput2.setSignOrder(1);
        //  2-无感知签章 3-有感知签章
        contractUserInput2.setSignType(3);
        // 1:短信验证码签约 2：签约密码签约
        contractUserInput2.setValidateType(1);
        contractUserInput2.setIsNotice(1);
        userInputList.add(contractUserInput2);

        List<UserSignStrategyInput> strategyInputs2 = new ArrayList<>(5);
        contractUserInput2.setSignStrategyList(strategyInputs2);

        UserSignStrategyInput userSignStrategyInput2 = new UserSignStrategyInput();
        userSignStrategyInput2.setAttachNo(1);
        // 定位方式，2-坐标签章 3-关键字签章/2
        userSignStrategyInput2.setLocationMode(2);
//            // 定位方式，2-坐标签章 3-关键字签章/2
//            userSignStrategyInput.setLocationMode(2);
//            userSignStrategyInput.setSignKey("全部义务");
        userSignStrategyInput2.setSignX(0.8);
        userSignStrategyInput2.setSignY(0.2);
        userSignStrategyInput2.setSignPage(1);
//            userSignStrategyInput.setSignKey("second_stamp1");
        strategyInputs2.add(userSignStrategyInput2);


        //用户3
        ContractUserInput contractUserInput3 = new ContractUserInput();
        contractUserInput3.setContractNo(contractNo);
        contractUserInput3.setAccount("12312333333");
        contractUserInput3.setSignOrder(1);
        //  2-无感知签章 3-有感知签章
        contractUserInput3.setSignType(3);
        // 1:短信验证码签约 2：签约密码签约
        contractUserInput3.setValidateType(1);
        contractUserInput3.setIsNotice(1);
        userInputList.add(contractUserInput3);

        List<UserSignStrategyInput> strategyInputs3 = new ArrayList<>(5);
        contractUserInput3.setSignStrategyList(strategyInputs3);

        UserSignStrategyInput userSignStrategyInput3 = new UserSignStrategyInput();
        userSignStrategyInput3.setAttachNo(1);
        // 定位方式，2-坐标签章 3-关键字签章/2
        userSignStrategyInput3.setLocationMode(2);
//            // 定位方式，2-坐标签章 3-关键字签章/2
//            userSignStrategyInput.setLocationMode(2);
//            userSignStrategyInput.setSignKey("全部义务");
        userSignStrategyInput3.setSignX(0.8);
        userSignStrategyInput3.setSignY(0.2);
        userSignStrategyInput3.setSignPage(1);
        strategyInputs3.add(userSignStrategyInput3);


        System.out.println(JSONObject.toJSONString(netSignClient.addSigner(userInputList)));
    }


    /**
     * 自动返回signUrl签署链接
     * 打开签署链接地址，就可以签署文件了
     * 下载文件
     *
     */
    @Test
    public void downloadContractTest() {
        String contractNo = "1693447140520";
        ApiRespBody<DownloadContractOutput> list = netSignClient.forceDownloadContract(
                contractNo   , null, 1,"D:\\contractTest222.zip");
        System.out.println(JSONObject.toJSONString(list));
    }

    @Test
    public void getContractStatus() {
        String contractNo = "1681346671440";
        ApiRespBody<ContractOutput> contractStatus = netSignClient.getContractStatus(contractNo);
        System.out.println(JSONObject.toJSONString(contractStatus));
    }

    @Test
    public void getContractInfo() {
        String contractNo = "1190000";
        ApiRespBody<ContractOutput> contractStatus = netSignClient.getContractInfo(contractNo);
        System.out.println(JSONObject.toJSONString(contractStatus));
    }
}
