import com.ancun.netsign.client.NetSignClient;
import org.junit.Before;

public class BaseTests {

    // 测试环境 接入者配置
    //测试只需改下appid。有问题联系爱签技术
    private static final String appId = "***";
    private static final String privateKey = "MIIBUwIBADANBgkqhkiG9w0BAQEFAASCAT0wggE5AgEAAkEAmt2jO6Z5uwRFM+bdRBXoHcjpdWpUDvwI05py3kZvfcg7ahUJkz4cQvCUaLVMFvH4LyefiA5ER2q7S87653yYMQIDAQABAkBzD4Eb7JA89utDqJ902qHen0t1RU6242LbdMErjEGBvXjzOvLpigUaB8gSR+o1r+damPQJdZWbR4+8EBvK1FORAiEA9EgQVjzmhFXEjsCLo/gWlbnjQhyByV7ZEotosBlm/bsCIQCiS32HTC4AwvBT1gzyr11zWmjxizYtYwV6NryvUE1tAwIgQjh+5UHhI6K0hBZCRJLuXGxl5PghXtttcQ+Fs6dPOh0CIGAq/10WpQPKf4IOCmobw/JAloLajOXkETDUEoaHvPllAiAsYPUVC4fmNW53YeDJiCcQ9yl/WbH6mktfzVl011KBcA==";

    NetSignClient netSignClient = null;

    @Before
    public void initClient() {
        //测试地址
        netSignClient = new NetSignClient("https://prev.asign.cn/",appId, privateKey);
    }
}