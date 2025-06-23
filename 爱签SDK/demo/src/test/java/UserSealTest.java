import com.alibaba.fastjson.JSONObject;
import com.ancun.netsign.model.*;
import org.junit.Test;

import java.util.ArrayList;
import java.util.List;


/**
 * 印章相关接口测试
 */
public class UserSealTest extends BaseTests {

    @Test
    public void createSeal() {
        UserSealInput userSealInput = new UserSealInput();
        userSealInput.setAccount("account001");
        userSealInput.setSealName("财务专用章");
        userSealInput.setSealNo(System.currentTimeMillis() + "");
        userSealInput.setIsDefault(1);
        List<FileDto> files = new ArrayList<>();
        FileDto fileDto = new FileDto();
        fileDto.setFileName("印章");
        fileDto.setFilePath("C:\\Users\\ancun\\Downloads\\85.png");
        files.add(fileDto);
        MuiltFile muiltFile = new MuiltFile();
        muiltFile.setFileDtoList(files);
        muiltFile.setParamFileName("image");
        userSealInput.setImage(muiltFile);
        System.out.println(userSealInput.getSealNo());
        System.out.println(JSONObject.toJSONString(netSignClient.createSeal(userSealInput)));
    }


    @Test
    public void modifySeal() {
        UserSealInput userSealInput = new UserSealInput();
        userSealInput.setAccount("account001");
        userSealInput.setSealName("财务专用章2");
        userSealInput.setSealNo("1569744384132");
        userSealInput.setIsDefault(1);
        List<FileDto> files = new ArrayList<>();
        FileDto fileDto = new FileDto();
        fileDto.setFileName("印章");
        fileDto.setFilePath("F:\\ceshi.png");
        files.add(fileDto);
        MuiltFile muiltFile = new MuiltFile();
        muiltFile.setFileDtoList(files);
        muiltFile.setParamFileName("image");
        userSealInput.setImage(muiltFile);
        System.out.println(JSONObject.toJSONString(netSignClient.modifySeal(userSealInput)));
    }

    @Test
    public void getUserSeals() {
        UserSealInput userSealInput = new UserSealInput();
        userSealInput.setAccount("account001");
        System.out.println(JSONObject.toJSONString(netSignClient.getUserSeals(userSealInput)));
    }


    @Test
    public void removeUserSeals() {
        UserSealInput userSealInput = new UserSealInput();
        userSealInput.setAccount("account001");
        userSealInput.setSealNo("S003");
        System.out.println(JSONObject.toJSONString(netSignClient.removeSeal(userSealInput)));
    }

    @Test
    public void setDefaultSeal() {
        UserSealInput userSealInput = new UserSealInput();
        userSealInput.setAccount("111");
        userSealInput.setSealNo("12000");
        System.out.println(JSONObject.toJSONString(netSignClient.setDefaultSeal(userSealInput)));
    }


    @Test
    public void signPasswd() {
        UserInput userInput = new UserInput();
        userInput.setAccount("account001");
        userInput.setOldSignPwd("456");
        userInput.setSignPwd("123");
        System.out.println(JSONObject.toJSONString(netSignClient.signPasswd(userInput)));
    }
}
