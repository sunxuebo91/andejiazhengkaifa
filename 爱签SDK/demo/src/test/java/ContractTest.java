import com.alibaba.fastjson.JSONObject;
import com.ancun.netsign.model.*;
import org.apache.commons.codec.digest.DigestUtils;
import org.junit.Test;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;


/**
 * 合同测试
 */
public class ContractTest extends BaseTests {
    public static void main(String[] args) {
        System.out.println(DigestUtils.md5Hex(DigestUtils.md5Hex("123456") + "account001"));
        System.out.println(DigestUtils.md5Hex(DigestUtils.md5Hex("123456") + "256"));
    }
    @Test
    public void createContract() {
        //上传待签署文件
        String contractNo = System.currentTimeMillis() + "";
        ContractInput contractInput = new ContractInput();
        contractInput.setContractNo(contractNo);
        contractInput.setContractName("测试junit");
        contractInput.setValidityTime(10);
        contractInput.setSignOrder(1); // 签约方式，1：无序签约 2：顺序签约

//        // 合同附件
//        List<FileDto> files = new ArrayList<>();
//        FileDto fileDto = new FileDto();
//        try{
//            fileDto.setFileName("合同附件11.docx");
//        }catch (Exception e){
//            throw new RuntimeException(e);
//        }
//        fileDto.setFilePath("C:\\Users\\ancun\\Desktop\\合同附件11.docx");
//        files.add(fileDto);
//        contractInput.setContractFiles(files);

        // 合同模板列表
        List<ContractInput.Template> templates = new ArrayList<>();
        ContractInput.Template template = new ContractInput.Template();
        template.setTemplateNo("1204");
        Map<String, String> map = new HashMap<>(5);
        map.put("key1", "爱你一万年");
        map.put("key3", "爱你一万年3");
        template.setFillData(map);
//        template.setContractNo("template003"); //合同编号（此处可传已完成签署的合同编号，实现追加签章的场景)
        templates.add(template);
        contractInput.setTemplates(templates);


        System.out.println(JSONObject.toJSONString(netSignClient.createContract(contractInput)));
    }

    @Test
    public void addSignerTest() {
        String contractNo = "2002";
        List<ContractUserInput> userInputList = new ArrayList<>();
        ContractUserInput contractUserInput = new ContractUserInput();
        contractUserInput.setContractNo(contractNo);
        contractUserInput.setAccount("account001");
        //  2-无感知签章 3-有感知签章
        contractUserInput.setSignType(3);
//        contractUserInput.setSealNo("印章编号"); //若不传值，则由当前主体的默认印章进行签署

        contractUserInput.setNoticeMobile("通知手机号（用于接收合同签署链接的通知短信）");
        contractUserInput.setSignOrder(1);
        contractUserInput.setIsNotice(1); //是否接收合同签署链接的短信通知，优先级高于添加用户接口同名参数：0 - 否（默认），1 - 是

        // 1:短信验证码签约 2：签约密码签约
        contractUserInput.setValidateType(2);
        contractUserInput.setIsNoticeComplete(0);
//        contractUserInput.setWaterMark(1);
        userInputList.add(contractUserInput);
        List<UserSignStrategyInput> strategyInputs = new ArrayList<>(5);
        contractUserInput.setSignStrategyList(strategyInputs);
        UserSignStrategyInput userSignStrategyInput = new UserSignStrategyInput();
        userSignStrategyInput.setAttachNo(1);
        // 定位方式，2-坐标签章 3-关键字签章 4：模板坐标签章（该方式仅支持模板文件）
        userSignStrategyInput.setLocationMode(2);
        userSignStrategyInput.setSignPage(1);
        userSignStrategyInput.setSignX(0.15);
        userSignStrategyInput.setSignY(0.25);
        strategyInputs.add(userSignStrategyInput);
//
//        UserSignStrategyInput userSignStrategyInput1_3 = new UserSignStrategyInput();
//        userSignStrategyInput1_3.setAttachNo(1);
//        // 定位方式，2-坐标签章 3-关键字签章 4：模板坐标签章（该方式仅支持模板文件）
//        userSignStrategyInput1_3.setLocationMode(2);
//        userSignStrategyInput1_3.setSignPage(1);
//        userSignStrategyInput1_3.setSignX(0.45);
//        userSignStrategyInput1_3.setSignY(0.55);
//        strategyInputs.add(userSignStrategyInput1_3);

//        // 策略2
//        UserSignStrategyInput userSignStrategyInput2 = new UserSignStrategyInput();
//        userSignStrategyInput2.setAttachNo(1);
//        // 定位方式，2-坐标签章 3-关键字签章 4：模板坐标签章（该方式仅支持模板文件）
//        userSignStrategyInput2.setLocationMode(3);
//        userSignStrategyInput2.setSignKey("爱你一万年");
//        strategyInputs.add(userSignStrategyInput2);
//
//
//        ContractUserInput contractUserInput2 = new ContractUserInput();
//        contractUserInput2.setContractNo(contractNo);
//        contractUserInput2.setAccount("111");
//        contractUserInput2.setIsNoticeComplete(1);
//        contractUserInput2.setSignOrder(2);
//        //  2-无感知签章 3-有感知签章
//        contractUserInput2.setSignType(2);
//        // 1:短信验证码签约 2：签约密码签约
//        contractUserInput2.setValidateType(1);
//
//        List<UserSignStrategyInput> strategyInputs1 = new ArrayList<>(5);
//        contractUserInput2.setSignStrategyList(strategyInputs1);
//        UserSignStrategyInput userSignStrategyInput1 = new UserSignStrategyInput();
//        userSignStrategyInput1.setAttachNo(1);
//        // 定位方式，2-坐标签章 3-关键字签章 4：模板坐标签章（该方式仅支持模板文件）
//        userSignStrategyInput1.setLocationMode(2);
//        userSignStrategyInput1.setSignPage(1);
//        userSignStrategyInput1.setSignX(0.25);
//        userSignStrategyInput1.setSignY(0.75);
//        strategyInputs1.add(userSignStrategyInput1);
//
//        // 策略2
//        UserSignStrategyInput userSignStrategyInput3 = new UserSignStrategyInput();
//        userSignStrategyInput3.setAttachNo(1);
//        // 定位方式，2-坐标签章 3-关键字签章 4：模板坐标签章（该方式仅支持模板文件）
//        userSignStrategyInput3.setLocationMode(3);
//        userSignStrategyInput3.setSignKey("爱你一万年3");
//        strategyInputs1.add(userSignStrategyInput3);
//        userInputList.add(contractUserInput2);
        System.out.println(JSONObject.toJSONString(netSignClient.addSigner(userInputList)));
    }

    @Test
    public void downloadContract() {
        String contractNo = "1211";
        //原下载合同接口兼容
//        ApiRespBody<DownloadContractOutput> list = netSignClient.downloadContract(contractNo,"D:\\contract1.pdf");
        //单文件返回pdf文件
        //多文件下载zip，1: 合同pdf文件 2：合同单个png文件（保留pdf文件） 3：分页png压缩文件 （保留pdf文件）4：单张图片（不保留pdf文件）5：所有的分页图片（不保留pdf文件）
        ApiRespBody<DownloadContractOutput> list = netSignClient.downloadContract(contractNo, 1,"D:\\contract1.pdf");
        System.out.println(JSONObject.toJSONString(list));
    }

    @Test
    public void downloadWithCert() {
        String contractNo = "2002";
        ApiRespBody<DownloadContractOutput> list = netSignClient.downloadWithCert(
                "", "1478997888708632576507", "D:\\contract1.zip");
        System.out.println(JSONObject.toJSONString(list));
    }

    @Test
    public void getContractStatus() {
        String contractNo = "test006";
        ApiRespBody<ContractOutput> contractStatus = netSignClient.getContractStatus(contractNo);
        System.out.println(JSONObject.toJSONString(contractStatus));
    }


    @Test
    public void getContractInfo() {
        String contractNo = "template011";
        ApiRespBody<ContractOutput> contractStatus = netSignClient.getContractInfo(contractNo);
        System.out.println(JSONObject.toJSONString(contractStatus));
    }

    @Test
    public void uploadTemplate(){
        TemplateInput templateInput = new TemplateInput();
        templateInput.setTemplateNo("1204");
        templateInput.setTemplateName("爱你test119");
        MuiltFile muiltFile = new MuiltFile();
        FileDto fileDto = new FileDto();
        fileDto.setFileName("template.pdf");
        fileDto.setFilePath("D:\\模板.pdf");
        muiltFile.setFileDto(fileDto);
        templateInput.setTemplateFile(muiltFile);
        ApiRespBody contractStatus = netSignClient.uploadTemplate(templateInput);
        System.out.println(JSONObject.toJSONString(contractStatus));
    }

    @Test
    public void downloadTemplate() {
        TemplateInput templateInput = new TemplateInput();
        templateInput.setTemplateNo("110");
        ApiRespBody contractStatus = netSignClient.downloadTemplate(templateInput.getTemplateNo(), "D:\\test.pdf");
        System.out.println(JSONObject.toJSONString(contractStatus));
    }

    @Test
    public void previewContractTest() {
        String contractNo = "test161";
        List<ContractUserInput> userInputList = new ArrayList<>();
        ContractUserInput contractUserInput = new ContractUserInput();
        contractUserInput.setContractNo(contractNo);
        contractUserInput.setAccount("account001");
        //个人用户是否使用手写章（默认为0）1：是，0：否
        contractUserInput.setIsWrite(1);

        List<UserSignStrategyInput> strategyInputs = new ArrayList<>(5);
        contractUserInput.setSignStrategyList(strategyInputs);
        UserSignStrategyInput userSignStrategyInput = new UserSignStrategyInput();
        userSignStrategyInput.setAttachNo(1);
        // 定位方式，2-坐标签章 (仅支持坐标签章预览)
        userSignStrategyInput.setLocationMode(2);
        userSignStrategyInput.setSignPage(1);
        userSignStrategyInput.setSignX(0.35);
        userSignStrategyInput.setSignY(0.65);
        strategyInputs.add(userSignStrategyInput);

        UserSignStrategyInput userSignStrategyInput1_3 = new UserSignStrategyInput();
        userSignStrategyInput1_3.setAttachNo(1);
        // 定位方式，2-坐标签章 3-关键字签章(仅支持坐标签章预览) 4：模板坐标签章（该方式仅支持模板文件）
        userSignStrategyInput1_3.setLocationMode(2);
        userSignStrategyInput1_3.setSignPage(1);
        userSignStrategyInput1_3.setSignX(0.45);
        userSignStrategyInput1_3.setSignY(0.55);
        strategyInputs.add(userSignStrategyInput1_3);
        userInputList.add(contractUserInput);

        ContractUserInput contractUserInput2 = new ContractUserInput();
        contractUserInput2.setContractNo(contractNo);
        contractUserInput2.setAccount("111");

        List<UserSignStrategyInput> strategyInputs1 = new ArrayList<>(5);
        contractUserInput2.setSignStrategyList(strategyInputs1);
        UserSignStrategyInput userSignStrategyInput1 = new UserSignStrategyInput();
        userSignStrategyInput1.setAttachNo(2);
        // 定位方式，2-坐标签章 3-关键字签章 4：模板坐标签章（该方式仅支持模板文件）
        userSignStrategyInput1.setLocationMode(2);
        userSignStrategyInput1.setSignPage(1);
        userSignStrategyInput1.setSignX(0.25);
        userSignStrategyInput1.setSignY(0.75);
        strategyInputs1.add(userSignStrategyInput1);

        userInputList.add(contractUserInput2);
        System.out.println(JSONObject.toJSONString(netSignClient.previewContract(userInputList)));
    }
}
