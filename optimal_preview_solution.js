/**
 * 爱签合同预览最佳实践解决方案
 * 基于官方API文档的标准实现
 */

const axios = require('axios');
const crypto = require('crypto');

class OptimalESignPreviewService {
  constructor(config) {
    this.config = {
      appId: config.appId,
      host: config.host,
      privateKey: config.privateKey
    };
  }

  /**
   * 🎯 方案1：创建合同时保存预览链接（推荐）
   * 这是最官方、最可靠的预览方式
   */
  async createContractWithPreview(contractData) {
    try {
      console.log('🚀 创建合同并获取官方预览链接...');
      
      const bizData = JSON.stringify({
        contractNo: contractData.contractNo,
        contractName: contractData.contractName,
        templates: contractData.templates,
        validityTime: contractData.validityTime || 30,
        signOrder: contractData.signOrder || 1,
        // 🔥 关键：设置重定向URL，用于签约完成后跳转
        redirectUrl: contractData.redirectUrl,
        notifyUrl: contractData.notifyUrl
      });

      const timestamp = Date.now() + 600 * 1000;
      const signature = this.generateSignature(bizData, timestamp);

      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('appId', this.config.appId);
      formData.append('timestamp', timestamp.toString());
      formData.append('bizData', bizData);

      const response = await axios.post(
        `${this.config.host}/contract/createContract`,
        formData,
        {
          headers: {
            'sign': signature,
            ...formData.getHeaders()
          },
          timeout: 30000
        }
      );

      if (response.data.code === 100000) {
        const result = {
          success: true,
          contractNo: contractData.contractNo,
          // 🎯 官方预览链接 - 这是最权威的预览方式
          previewUrl: response.data.data.previewUrl,
          contractFiles: response.data.data.contractFiles,
          message: '合同创建成功，获得官方预览链接'
        };

        console.log('✅ 合同创建成功:');
        console.log('📄 合同编号:', contractData.contractNo);
        console.log('🔗 官方预览链接:', result.previewUrl);
        
        // 🔥 重要：将预览链接保存到数据库
        await this.savePreviewUrlToDatabase(contractData.contractNo, result.previewUrl);
        
        return result;
      } else {
        throw new Error(`创建合同失败: ${response.data.msg}`);
      }
    } catch (error) {
      console.error('❌ 创建合同失败:', error.message);
      throw error;
    }
  }

  /**
   * 🎯 方案2：从数据库获取预览链接（最快）
   * 如果合同已创建，直接从数据库获取保存的预览链接
   */
  async getPreviewUrlFromDatabase(contractNo) {
    try {
      console.log('📋 从数据库获取预览链接...');
      
      // 这里应该是您的数据库查询逻辑
      const contract = await this.findContractInDatabase(contractNo);
      
      if (contract && contract.esignPreviewUrl) {
        console.log('✅ 找到保存的预览链接:', contract.esignPreviewUrl);
        return {
          success: true,
          previewUrl: contract.esignPreviewUrl,
          source: 'database',
          message: '从数据库获取预览链接成功'
        };
      } else {
        console.log('⚠️ 数据库中未找到预览链接');
        return null;
      }
    } catch (error) {
      console.error('❌ 数据库查询失败:', error.message);
      return null;
    }
  }

  /**
   * 🎯 方案3：通过合同信息获取签约链接（备用）
   * 当没有官方预览链接时的备用方案
   */
  async getSignUrlAsPreview(contractNo) {
    try {
      console.log('🔄 获取签约链接作为预览...');
      
      const contractInfo = await this.getContractInfo(contractNo);
      
      if (contractInfo && contractInfo.signUser && contractInfo.signUser.length > 0) {
        const firstSigner = contractInfo.signUser[0];
        if (firstSigner.signUrl) {
          console.log('✅ 找到签约链接:', firstSigner.signUrl);
          return {
            success: true,
            previewUrl: firstSigner.signUrl,
            source: 'signUrl',
            signerInfo: {
              name: firstSigner.name,
              account: firstSigner.account,
              status: firstSigner.signStatus
            },
            message: '使用签约链接作为预览'
          };
        }
      }
      
      throw new Error('未找到可用的签约链接');
    } catch (error) {
      console.error('❌ 获取签约链接失败:', error.message);
      throw error;
    }
  }

  /**
   * 🎯 方案4：调用预览API（最后备用）
   * 爱签专门的预览API
   */
  async callPreviewAPI(contractNo) {
    try {
      console.log('🔍 调用爱签预览API...');
      
      const bizData = JSON.stringify({
        contractNo: contractNo
      });

      const timestamp = Date.now() + 600 * 1000;
      const signature = this.generateSignature(bizData, timestamp);

      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('appId', this.config.appId);
      formData.append('timestamp', timestamp.toString());
      formData.append('bizData', bizData);

      const response = await axios.post(
        `${this.config.host}/contract/previewContract`,
        formData,
        {
          headers: {
            'sign': signature,
            ...formData.getHeaders()
          },
          timeout: 30000
        }
      );

      if (response.data.code === 100000) {
        console.log('✅ 预览API调用成功:', response.data.data);
        return {
          success: true,
          previewUrl: response.data.data,
          source: 'previewAPI',
          message: '通过预览API获取链接成功'
        };
      } else {
        throw new Error(`预览API失败: ${response.data.msg}`);
      }
    } catch (error) {
      console.error('❌ 预览API调用失败:', error.message);
      throw error;
    }
  }

  /**
   * 🎯 智能预览链接获取（综合方案）
   * 按优先级依次尝试不同的预览方式
   */
  async getOptimalPreviewUrl(contractNo) {
    console.log(`🎯 开始获取合同 ${contractNo} 的最优预览链接...`);
    
    const methods = [
      { name: '数据库预览链接', method: () => this.getPreviewUrlFromDatabase(contractNo) },
      { name: '签约链接预览', method: () => this.getSignUrlAsPreview(contractNo) },
      { name: '预览API', method: () => this.callPreviewAPI(contractNo) }
    ];

    for (const { name, method } of methods) {
      try {
        console.log(`\n🔍 尝试方式: ${name}`);
        const result = await method();
        
        if (result && result.success && result.previewUrl) {
          console.log(`✅ ${name} 成功获取预览链接`);
          console.log(`🔗 预览链接: ${result.previewUrl}`);
          
          return {
            success: true,
            previewUrl: result.previewUrl,
            method: name,
            source: result.source,
            contractNo: contractNo,
            signerInfo: result.signerInfo,
            message: `通过${name}获取预览链接成功`
          };
        }
      } catch (error) {
        console.log(`❌ ${name} 失败: ${error.message}`);
        continue;
      }
    }

    // 所有方法都失败
    console.error('💥 所有预览方式都失败了');
    return {
      success: false,
      contractNo: contractNo,
      message: '无法获取合同预览链接，请检查合同状态',
      recommendation: '请确保合同已正确创建并添加了签约人'
    };
  }

  /**
   * 🎯 前端集成示例
   * 展示如何在前端使用预览功能
   */
  generateFrontendCode() {
    return `
// 前端预览合同的最佳实践
class ContractPreviewManager {
  // 预览合同
  static async previewContract(contractNo) {
    try {
      // 调用后端API获取预览链接
      const response = await fetch('/api/contracts/preview/' + contractNo);
      const result = await response.json();
      
      if (result.success && result.previewUrl) {
        // 🎯 在新窗口打开预览链接
        const previewWindow = window.open(
          result.previewUrl,
          '_blank',
          'width=1200,height=800,scrollbars=yes,resizable=yes'
        );
        
        if (!previewWindow) {
          alert('请允许弹出窗口以查看合同预览');
        } else {
          // 可选：监听窗口关闭事件
          const checkClosed = setInterval(() => {
            if (previewWindow.closed) {
              clearInterval(checkClosed);
              console.log('预览窗口已关闭');
            }
          }, 1000);
        }
      } else {
        alert(result.message || '获取预览链接失败');
      }
    } catch (error) {
      console.error('预览合同失败:', error);
      alert('预览合同失败，请稍后重试');
    }
  }

  // React组件示例
  static PreviewButton({ contractNo, children = '预览合同' }) {
    const [loading, setLoading] = useState(false);
    
    const handlePreview = async () => {
      setLoading(true);
      try {
        await ContractPreviewManager.previewContract(contractNo);
      } finally {
        setLoading(false);
      }
    };
    
    return (
      <Button 
        type="primary" 
        icon={<EyeOutlined />}
        loading={loading}
        onClick={handlePreview}
      >
        {children}
      </Button>
    );
  }
}
    `;
  }

  /**
   * 辅助方法：生成签名
   */
  generateSignature(bizData, timestamp) {
    const { appId, privateKey } = this.config;
    const md5Hash = crypto.createHash('md5').update(bizData).digest('hex');
    const signStr = bizData + md5Hash + appId + timestamp;
    
    const signer = crypto.createSign('sha1');
    signer.update(signStr);
    signer.end();
    
    const privateKeyBase64 = privateKey.replace(/\s/g, '');
    const privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----`;
    
    return signer.sign({ key: privateKeyPem, format: 'pem' }, 'base64');
  }

  /**
   * 辅助方法：保存预览链接到数据库
   */
  async savePreviewUrlToDatabase(contractNo, previewUrl) {
    // 这里应该是您的数据库保存逻辑
    console.log(`💾 保存预览链接到数据库: ${contractNo} -> ${previewUrl}`);
    // 示例SQL: UPDATE contracts SET esignPreviewUrl = ? WHERE esignContractNo = ?
  }

  /**
   * 辅助方法：从数据库查找合同
   */
  async findContractInDatabase(contractNo) {
    // 这里应该是您的数据库查询逻辑
    console.log(`🔍 从数据库查找合同: ${contractNo}`);
    // 示例SQL: SELECT * FROM contracts WHERE esignContractNo = ?
    return null; // 返回合同对象
  }

  /**
   * 辅助方法：获取合同信息
   */
  async getContractInfo(contractNo) {
    const bizData = JSON.stringify({ contractNo });
    const timestamp = Date.now() + 600 * 1000;
    const signature = this.generateSignature(bizData, timestamp);

    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('appId', this.config.appId);
    formData.append('timestamp', timestamp.toString());
    formData.append('bizData', bizData);

    const response = await axios.post(
      `${this.config.host}/contract/getContract`,
      formData,
      {
        headers: {
          'sign': signature,
          ...formData.getHeaders()
        },
        timeout: 30000
      }
    );

    if (response.data.code === 100000) {
      return response.data.data;
    } else {
      throw new Error(`获取合同信息失败: ${response.data.msg}`);
    }
  }
}

/**
 * 🎯 使用示例
 */
async function example() {
  const previewService = new OptimalESignPreviewService({
    appId: '141496759',
    host: 'https://prev.asign.cn',
    privateKey: 'YOUR_PRIVATE_KEY'
  });

  // 示例1：创建合同时获取预览链接
  const contractResult = await previewService.createContractWithPreview({
    contractNo: 'CONTRACT_' + Date.now(),
    contractName: '测试合同',
    templates: [{ templateNo: 'TNF606E6D81E2D49C99CC983F4D0412276-3387' }],
    validityTime: 30,
    redirectUrl: 'https://yoursite.com/payment-guide',
    notifyUrl: 'https://yoursite.com/api/esign/callback'
  });

  // 示例2：获取现有合同的预览链接
  const previewResult = await previewService.getOptimalPreviewUrl('EXISTING_CONTRACT_NO');
  
  console.log('预览结果:', previewResult);
}

module.exports = { OptimalESignPreviewService };

/**
 * 📋 总结：爱签合同预览的最佳实践
 * 
 * 1. 🥇 优先方案：创建合同时保存官方previewUrl
 *    - 最权威、最稳定的预览方式
 *    - 爱签官方直接提供的预览链接
 *    - 需要在创建合同时就保存到数据库
 * 
 * 2. 🥈 备用方案：使用签约人的签约链接
 *    - 当没有保存官方预览链接时使用
 *    - 签约链接本身就包含预览功能
 *    - 通过getContract API获取
 * 
 * 3. 🥉 最后方案：调用预览API
 *    - 专门的预览API接口
 *    - 当其他方式都不可用时使用
 * 
 * 4. 🎯 前端展示：
 *    - 在新窗口打开预览链接
 *    - 窗口尺寸：1200x800
 *    - 允许滚动和调整大小
 * 
 * 5. 🔄 用户体验：
 *    - 显示加载状态
 *    - 处理弹窗拦截
 *    - 提供错误反馈
 *    - 支持重试机制
 */ 