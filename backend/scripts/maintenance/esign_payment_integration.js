const express = require('express');
const router = express.Router();
const axios = require('axios');

// 爱签配置
const ESIGN_CONFIG = {
  baseUrl: 'https://openapi.esign.cn',
  appId: process.env.ESIGN_APP_ID,
  appSecret: process.env.ESIGN_APP_SECRET,
  redirectBaseUrl: process.env.FRONTEND_BASE_URL || 'http://localhost:5173'
};

// 支付配置（示例）
const PAYMENT_CONFIG = {
  wechat: {
    appId: process.env.WECHAT_APP_ID,
    mchId: process.env.WECHAT_MCH_ID,
    apiKey: process.env.WECHAT_API_KEY
  },
  alipay: {
    appId: process.env.ALIPAY_APP_ID,
    privateKey: process.env.ALIPAY_PRIVATE_KEY,
    publicKey: process.env.ALIPAY_PUBLIC_KEY
  }
};

/**
 * 创建爱签合同并设置支付跳转链接
 * 这是关键：在创建合同时就设置好支付页面的跳转链接
 */
router.post('/create-contract-with-payment', async (req, res) => {
  try {
    const { customerId, contractData, serviceFee } = req.body;

    // 1. 创建爱签合同
    const contractResponse = await createEsignContract({
      ...contractData,
      // 关键：设置签约完成后的跳转链接
      redirectUrl: `${ESIGN_CONFIG.redirectBaseUrl}/payment-guide/${customerId}?contractId=PLACEHOLDER`,
      // 设置回调通知URL
      notifyUrl: `${process.env.BACKEND_BASE_URL}/api/esign/contract-callback`
    });

    if (contractResponse.success) {
      const contractId = contractResponse.data.contractId;
      
      // 2. 将合同信息保存到数据库
      await saveContractToDatabase({
        contractId,
        customerId,
        serviceFee,
        status: '待签约',
        esignFlowId: contractResponse.data.flowId
      });

      // 3. 更新跳转链接中的合同ID
      const finalRedirectUrl = `${ESIGN_CONFIG.redirectBaseUrl}/payment-guide/${contractId}`;
      await updateEsignContractRedirectUrl(contractResponse.data.flowId, finalRedirectUrl);

      res.json({
        success: true,
        data: {
          contractId,
          signUrl: contractResponse.data.signUrl,
          message: '合同创建成功，签约完成后将自动跳转到支付页面'
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: '创建合同失败',
        error: contractResponse.error
      });
    }
  } catch (error) {
    console.error('创建合同失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
});

/**
 * 爱签合同状态回调
 * 当合同状态变化时，爱签会调用这个接口
 */
router.post('/esign/contract-callback', async (req, res) => {
  try {
    const { flowId, status, contractId } = req.body;

    console.log('收到爱签回调:', { flowId, status, contractId });

    // 验证回调签名（实际项目中必须验证）
    if (!verifyEsignCallback(req)) {
      return res.status(401).json({ success: false, message: '签名验证失败' });
    }

    // 更新数据库中的合同状态
    await updateContractStatus(contractId, {
      esignStatus: status,
      contractStatus: status === '2' ? '已签约' : '签约中',
      signedAt: status === '2' ? new Date() : null
    });

    // 如果签约完成，可以发送通知或执行其他逻辑
    if (status === '2') {
      console.log(`合同 ${contractId} 签约完成，用户将被引导到支付页面`);
      
      // 可以在这里发送短信通知客户
      // await sendSMSNotification(contractId, '合同签约完成，请及时完成支付');
    }

    res.json({ success: true });
  } catch (error) {
    console.error('处理爱签回调失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 获取合同支付信息
 */
router.get('/contracts/:contractId/payment-info', async (req, res) => {
  try {
    const { contractId } = req.params;
    
    const contract = await getContractFromDatabase(contractId);
    if (!contract) {
      return res.status(404).json({
        success: false,
        message: '合同不存在'
      });
    }

    // 检查合同是否已签约
    if (contract.contractStatus !== '已签约') {
      return res.status(400).json({
        success: false,
        message: '合同尚未签约，无法支付'
      });
    }

    res.json({
      success: true,
      data: {
        contractId: contract.contractId,
        customerName: contract.customerName,
        serviceFee: contract.serviceFee,
        paymentStatus: contract.paymentStatus || 'pending'
      }
    });
  } catch (error) {
    console.error('获取支付信息失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
});

/**
 * 创建支付订单
 */
router.post('/payments/create', async (req, res) => {
  try {
    const { contractId, amount, paymentMethod, returnUrl, notifyUrl } = req.body;

    // 验证合同状态
    const contract = await getContractFromDatabase(contractId);
    if (!contract || contract.contractStatus !== '已签约') {
      return res.status(400).json({
        success: false,
        message: '合同状态异常，无法支付'
      });
    }

    // 生成支付订单
    const paymentId = generatePaymentId();
    const paymentData = {
      paymentId,
      contractId,
      amount: parseFloat(amount),
      paymentMethod,
      status: 'pending',
      createdAt: new Date(),
      returnUrl,
      notifyUrl
    };

    // 保存支付订单到数据库
    await savePaymentToDatabase(paymentData);

    let paymentResponse;

    switch (paymentMethod) {
      case 'wechat':
        paymentResponse = await createWechatPayment(paymentData);
        break;
      case 'alipay':
        paymentResponse = await createAlipayPayment(paymentData);
        break;
      case 'bank':
        paymentResponse = await createBankPayment(paymentData);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: '不支持的支付方式'
        });
    }

    res.json({
      success: true,
      data: {
        paymentId,
        qrCodeUrl: paymentResponse.qrCodeUrl,
        paymentUrl: paymentResponse.paymentUrl
      }
    });
  } catch (error) {
    console.error('创建支付订单失败:', error);
    res.status(500).json({
      success: false,
      message: '创建支付订单失败',
      error: error.message
    });
  }
});

/**
 * 查询支付状态
 */
router.get('/payments/:paymentId/status', async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const payment = await getPaymentFromDatabase(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: '支付订单不存在'
      });
    }

    // 如果支付状态还是pending，查询第三方支付平台状态
    if (payment.status === 'pending') {
      const actualStatus = await queryPaymentStatusFromProvider(payment);
      if (actualStatus !== payment.status) {
        await updatePaymentStatus(paymentId, actualStatus);
        payment.status = actualStatus;
      }
    }

    res.json({
      success: true,
      data: {
        paymentId,
        status: payment.status,
        amount: payment.amount,
        paidAt: payment.paidAt
      }
    });
  } catch (error) {
    console.error('查询支付状态失败:', error);
    res.status(500).json({
      success: false,
      message: '查询支付状态失败',
      error: error.message
    });
  }
});

/**
 * 支付成功回调
 */
router.post('/payments/notify', async (req, res) => {
  try {
    const { paymentId, status, transactionId } = req.body;

    // 验证回调签名（实际项目中必须验证）
    if (!verifyPaymentCallback(req)) {
      return res.status(401).json({ success: false, message: '签名验证失败' });
    }

    if (status === 'paid') {
      // 更新支付状态
      await updatePaymentStatus(paymentId, 'paid', {
        transactionId,
        paidAt: new Date()
      });

      // 获取关联的合同信息
      const payment = await getPaymentFromDatabase(paymentId);
      if (payment) {
        // 更新合同支付状态
        await updateContractPaymentStatus(payment.contractId, 'paid');
        
        console.log(`合同 ${payment.contractId} 支付完成，金额: ${payment.amount}`);
        
        // 可以在这里触发后续业务逻辑
        // 例如：分配服务人员、发送确认短信等
        // await assignServiceWorker(payment.contractId);
        // await sendPaymentConfirmationSMS(payment.contractId);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('处理支付回调失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== 辅助函数 ==========

async function createEsignContract(contractData) {
  // 这里是调用爱签API创建合同的逻辑
  // 实际实现需要根据爱签API文档
  try {
    const response = await axios.post(`${ESIGN_CONFIG.baseUrl}/v1/contracts/createFlow`, {
      ...contractData,
      appId: ESIGN_CONFIG.appId
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Tsign-Open-App-Id': ESIGN_CONFIG.appId,
        'X-Tsign-Open-Token': await getEsignToken()
      }
    });

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

async function getEsignToken() {
  // 获取爱签访问token的逻辑
  // 实际实现需要根据爱签API文档
  return 'your-esign-token';
}

function verifyEsignCallback(req) {
  // 验证爱签回调签名的逻辑
  // 实际实现需要根据爱签API文档
  return true;
}

function verifyPaymentCallback(req) {
  // 验证支付回调签名的逻辑
  // 实际实现需要根据支付平台API文档
  return true;
}

async function createWechatPayment(paymentData) {
  // 创建微信支付订单的逻辑
  return {
    qrCodeUrl: `weixin://wxpay/bizpayurl?pr=${paymentData.paymentId}`,
    paymentUrl: null
  };
}

async function createAlipayPayment(paymentData) {
  // 创建支付宝支付订单的逻辑
  return {
    qrCodeUrl: `https://qr.alipay.com/${paymentData.paymentId}`,
    paymentUrl: null
  };
}

async function createBankPayment(paymentData) {
  // 创建银行卡支付订单的逻辑
  return {
    qrCodeUrl: null,
    paymentUrl: `https://payment.bank.com/pay?orderId=${paymentData.paymentId}`
  };
}

function generatePaymentId() {
  return 'PAY' + Date.now() + Math.random().toString(36).substr(2, 9);
}

// 数据库操作函数（需要根据实际数据库实现）
async function saveContractToDatabase(contractData) {
  // 保存合同到数据库的逻辑
  console.log('保存合同到数据库:', contractData);
}

async function getContractFromDatabase(contractId) {
  // 从数据库获取合同信息的逻辑
  console.log('从数据库获取合同:', contractId);
  return {
    contractId,
    customerName: '示例客户',
    serviceFee: 1000,
    contractStatus: '已签约',
    paymentStatus: 'pending'
  };
}

async function updateContractStatus(contractId, statusData) {
  // 更新合同状态的逻辑
  console.log('更新合同状态:', contractId, statusData);
}

async function savePaymentToDatabase(paymentData) {
  // 保存支付订单到数据库的逻辑
  console.log('保存支付订单到数据库:', paymentData);
}

async function getPaymentFromDatabase(paymentId) {
  // 从数据库获取支付订单的逻辑
  console.log('从数据库获取支付订单:', paymentId);
  return {
    paymentId,
    contractId: 'CONTRACT123',
    amount: 1000,
    status: 'pending',
    paymentMethod: 'wechat',
    createdAt: new Date()
  };
}

async function updatePaymentStatus(paymentId, status, extraData = {}) {
  // 更新支付状态的逻辑
  console.log('更新支付状态:', paymentId, status, extraData);
}

async function updateContractPaymentStatus(contractId, paymentStatus) {
  // 更新合同支付状态的逻辑
  console.log('更新合同支付状态:', contractId, paymentStatus);
}

async function queryPaymentStatusFromProvider(payment) {
  // 从第三方支付平台查询支付状态的逻辑
  console.log('查询第三方支付状态:', payment.paymentId);
  return payment.status; // 返回实际状态
}

async function updateEsignContractRedirectUrl(flowId, redirectUrl) {
  // 更新爱签合同跳转链接的逻辑
  console.log('更新爱签跳转链接:', flowId, redirectUrl);
}

module.exports = router; 