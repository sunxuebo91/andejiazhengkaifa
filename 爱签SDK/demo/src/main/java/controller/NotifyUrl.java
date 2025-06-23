package controller;

import com.alibaba.fastjson.JSONObject;
import com.alibaba.fastjson.serializer.SerializerFeature;
import com.ancun.netsign.utils.RsaEncrypt;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.commons.codec.binary.Base64;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestMapping;

import javax.servlet.http.HttpServletRequest;
import java.io.BufferedReader;
import java.net.URLDecoder;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HashMap;
import java.util.Map;


/**
 * 回调示例
 *
 */
@RestController
@RequestMapping("/test")
public class NotifyUrl {

    final static String publicKey = "MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBALwxjHOCmoY9N5h+uhWYdmES4920yTvWUERtkz+ac8KZF2dVgC5QaWZhmEz/nw27Ln6AP90ZCMPi+iNF1m9mhNECAwEAAQ==";
    /**
     * 合同全部签署完收到回调 POST 请求JSON格式
     *
     */
    @PostMapping("/notify")
    public String notify(HttpServletRequest request) {
        String action = request.getParameter("action");
        String sign = request.getParameter("sign");
        String contractNo = request.getParameter("contractNo");
        String status = request.getParameter("status");
        String signTime = request.getParameter("signTime");
        String timestamp = request.getParameter("timestamp");
        String validityTime = request.getParameter("validityTime");
        String remark = request.getParameter("remark");
        Map<String, String> map = new HashMap();
        map.put("action", action);
        map.put("contractNo", contractNo);
        map.put("status", status);
        map.put("signTime", signTime);
        map.put("timestamp", timestamp);
        map.put("validityTime", validityTime);

        RsaEncrypt rsaEncrypt = new RsaEncrypt();
        String body = JSONObject.toJSONString(map, SerializerFeature.MapSortField);

        try {
            rsaEncrypt.loadPublicKey(publicKey);
            Boolean result = rsaEncrypt.doCheck(body,new Base64().decode(sign), rsaEncrypt.getPublicKey());
            if (result) {
                System.out.println("验签成功");
            } else {
                System.out.println("验签失败");
            }
            map.put("remark", remark); // 不参与签名
        } catch (Exception e) {
        }

        return "ok";
    }

    /**
     * 实名认证回调 POST请求JSON格式
     * @param request
     * @return
     * @throws Exception
     */
    @PostMapping("/notify1")
    public String notify1(HttpServletRequest request) throws Exception {
        StringBuilder sb = new StringBuilder();
        BufferedReader reader = request.getReader();
        String line;
        while ((line = reader.readLine()) != null) {
            sb.append(line);
        }
        String jsonInputString = sb.toString();

        ObjectMapper objectMapper = new ObjectMapper();
        Map<String, Object> requestMap = objectMapper.readValue(jsonInputString, Map.class);

        String sign = requestMap.get("sign").toString();
        Integer result = Integer.valueOf(requestMap.get("result").toString());
        String serialNo = requestMap.get("serialNo").toString();
        String name = URLDecoder.decode(requestMap.get("name").toString(), "UTF-8");
        String idCard = URLDecoder.decode(requestMap.get("idNo").toString(), "UTF-8");

        String  md5  =  getMd5(name + idCard);
        RsaEncrypt rsaEncrypt = new RsaEncrypt();


        byte[] signBytes = null;
        try {
            rsaEncrypt.loadPublicKey(publicKey);
            signBytes = java.util.Base64.getDecoder().decode(URLDecoder.decode(sign,"UTF-8"));

        } catch (Exception e) {
        }
        String  signString = md5 + serialNo + result;
        Boolean  result1 = rsaEncrypt.doCheck(signString, signBytes, rsaEncrypt.getPublicKey());
        System.out.println(result1);

        return "ok";
    }

    public static String getMd5(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] hashInBytes = md.digest(input.getBytes());

            // 字节数组转换为十六进制字符串
            StringBuilder sb = new StringBuilder();
            for (byte b : hashInBytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("Error while generating MD5 hash", e);
        }
    }

}
