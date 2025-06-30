/**
 * 爱签合同查看链接集成示例
 * 
 * 这个文件展示了如何在您的系统中集成爱签的合同查看功能
 * 包括获取查看链接、在前端展示、以及用户体验优化
 */

const axios = require('axios');

// 爱签配置 - 请替换为您的真实配置
const ESIGN_CONFIG = {
  baseUrl: 'https://openapi.esign.cn',
  appId: process.env.ESIGN_APP_ID || 'your-real-app-id',
  appSecret: process.env.ESIGN_APP_SECRET || 'your-real-app-secret'
};

/**
 * 爱签合同查看链接服务类
 */
class EsignViewService {
  constructor(config) {
    this.config = config;
    this.token = null;
    this.tokenExpiry = null;
  }

  /**
   * 获取访问token（带缓存）
   */
  async getToken() {
    // 如果token还没过期，直接返回
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    try {
      const response = await axios.post(`${this.config.baseUrl}/v1/oauth2/access_token`, {
        appId: this.config.appId,
        secret: this.config.appSecret,
        grantType: 'client_credentials',
        scope: 'get_identity'
      });

      if (response.data.code === 0) {
        this.token = response.data.data.token;
        // 设置token过期时间（通常是1小时，这里设为55分钟以确保提前刷新）
        this.tokenExpiry = Date.now() + (55 * 60 * 1000);
        return this.token;
      } else {
        throw new Error(`获取token失败: ${response.data.message}`);
      }
    } catch (error) {
      console.error('获取爱签token失败:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 获取合同查看链接
   * @param {string} contractNo - 合同编号
   * @returns {Promise<{success: boolean, data?: any, message: string}>}
   */
  async getContractViewUrl(contractNo) {
    try {
      const token = await this.getToken();
      
      const response = await axios.post(`${this.config.baseUrl}/contract/getViewUrl`, {
        contractNo: contractNo
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-Tsign-Open-App-Id': this.config.appId,
          'X-Tsign-Open-Token': token
        }
      });

      if (response.data.code === 0) {
        return {
          success: true,
          data: {
            viewUrl: response.data.data.viewUrl,
            contractNo: contractNo
          },
          message: '获取查看链接成功'
        };
      } else {
        return {
          success: false,
          message: `获取查看链接失败: ${response.data.message}`,
          errorCode: response.data.code
        };
      }
    } catch (error) {
      console.error('获取合同查看链接失败:', error.response?.data || error.message);
      return {
        success: false,
        message: '获取合同查看链接失败',
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * 获取合同详细信息
   * @param {string} contractNo - 合同编号
   * @returns {Promise<{success: boolean, data?: any, message: string}>}
   */
  async getContractDetails(contractNo) {
    try {
      const token = await this.getToken();
      
      const response = await axios.post(`${this.config.baseUrl}/v1/contracts/detail`, {
        contractNo: contractNo
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-Tsign-Open-App-Id': this.config.appId,
          'X-Tsign-Open-Token': token
        }
      });

      if (response.data.code === 0) {
        return {
          success: true,
          data: response.data.data,
          message: '获取合同详情成功'
        };
      } else {
        return {
          success: false,
          message: `获取合同详情失败: ${response.data.message}`,
          errorCode: response.data.code
        };
      }
    } catch (error) {
      console.error('获取合同详情失败:', error.response?.data || error.message);
      return {
        success: false,
        message: '获取合同详情失败',
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * 批量获取合同查看链接
   * @param {string[]} contractNumbers - 合同编号数组
   * @returns {Promise<Array>}
   */
  async batchGetViewUrls(contractNumbers) {
    const results = [];
    
    for (const contractNo of contractNumbers) {
      try {
        const result = await this.getContractViewUrl(contractNo);
        results.push({
          contractNo,
          ...result
        });
        
        // 延迟避免API限制
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        results.push({
          contractNo,
          success: false,
          message: '请求失败',
          error: error.message
        });
      }
    }
    
    return results;
  }
}

/**
 * 后端API路由示例 - 集成到您的Express应用中
 */
function createEsignRoutes(app) {
  const esignService = new EsignViewService(ESIGN_CONFIG);

  // 获取合同查看链接
  app.get('/api/contracts/:contractNo/view-url', async (req, res) => {
    try {
      const { contractNo } = req.params;
      const result = await esignService.getContractViewUrl(contractNo);
      
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '服务器错误',
        error: error.message
      });
    }
  });

  // 获取合同详情和查看链接
  app.get('/api/contracts/:contractNo/full-info', async (req, res) => {
    try {
      const { contractNo } = req.params;
      
      // 并行获取合同详情和查看链接
      const [detailsResult, viewUrlResult] = await Promise.all([
        esignService.getContractDetails(contractNo),
        esignService.getContractViewUrl(contractNo)
      ]);

      res.json({
        success: true,
        data: {
          contractDetails: detailsResult.success ? detailsResult.data : null,
          viewUrl: viewUrlResult.success ? viewUrlResult.data.viewUrl : null,
          detailsError: detailsResult.success ? null : detailsResult.message,
          viewUrlError: viewUrlResult.success ? null : viewUrlResult.message
        },
        message: '获取合同信息成功'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '服务器错误',
        error: error.message
      });
    }
  });

  // 批量获取查看链接
  app.post('/api/contracts/batch-view-urls', async (req, res) => {
    try {
      const { contractNumbers } = req.body;
      
      if (!Array.isArray(contractNumbers)) {
        return res.status(400).json({
          success: false,
          message: '合同编号列表格式错误'
        });
      }

      const results = await esignService.batchGetViewUrls(contractNumbers);
      
      res.json({
        success: true,
        data: results,
        message: '批量获取查看链接完成'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '服务器错误',
        error: error.message
      });
    }
  });
}

/**
 * 测试函数
 */
async function testIntegration() {
  console.log('=== 爱签合同查看链接集成测试 ===');
  
  const esignService = new EsignViewService(ESIGN_CONFIG);
  
  // 测试合同编号
  const testContractNo = 'HT2024010001';
  
  console.log(`\n测试合同编号: ${testContractNo}`);
  
  try {
    // 测试获取查看链接
    console.log('\n1. 测试获取查看链接...');
    const viewUrlResult = await esignService.getContractViewUrl(testContractNo);
    console.log('查看链接结果:', JSON.stringify(viewUrlResult, null, 2));
    
    // 测试获取合同详情
    console.log('\n2. 测试获取合同详情...');
    const detailsResult = await esignService.getContractDetails(testContractNo);
    console.log('合同详情结果:', JSON.stringify(detailsResult, null, 2));
    
  } catch (error) {
    console.error('测试失败:', error.message);
  }
  
  // 输出集成指南
  console.log('\n=== 爱签合同查看链接集成指南 ===');
  console.log(`
1. 配置爱签API
   - 设置正确的 appId 和 appSecret
   - 确保应用有获取合同查看链接的权限

2. 后端集成
   - 将 EsignViewService 类集成到您的后端服务中
   - 添加相应的API路由
   - 实现token缓存机制以提高性能

3. 前端集成
   - 在合同列表和详情页添加"查看合同"按钮
   - 使用新窗口打开查看链接，避免影响当前页面
   - 添加加载状态和错误处理

4. 用户体验优化
   - 查看链接在新窗口打开，尺寸适中
   - 提供清晰的加载反馈
   - 处理各种错误情况（网络错误、权限错误等）

5. 安全考虑
   - 查看链接通常需要登录验证
   - 确保只有授权用户可以获取查看链接
   - 考虑添加访问日志记录

6. 性能优化
   - 实现token缓存，避免频繁获取
   - 批量获取多个合同的查看链接
   - 添加请求限制，避免API限制

7. 错误处理
   - 合同不存在的情况
   - API权限不足的情况
   - 网络连接问题
   - 爱签服务不可用的情况

8. 监控和日志
   - 记录API调用情况
   - 监控成功率和响应时间
   - 设置告警机制
  `);
  
  // 输出前端代码示例
  console.log('\n=== 前端集成代码示例 ===');
  console.log(`
// 前端服务代码示例 (TypeScript)
class ContractViewService {
  // 获取合同查看链接
  static async getViewUrl(contractNo: string): Promise<{
    success: boolean;
    viewUrl?: string;
    message: string;
  }> {
    try {
      const response = await fetch('/api/contracts/' + contractNo + '/view-url');
      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: '获取查看链接失败'
      };
    }
  }

  // 在新窗口中打开合同查看页面
  static async openContractView(contractNo: string): Promise<void> {
    const result = await this.getViewUrl(contractNo);
    
    if (result.success && result.viewUrl) {
      // 在新窗口中打开查看链接
      window.open(result.viewUrl, '_blank', 'width=1200,height=800,scrollbars=yes');
    } else {
      alert(result.message || '获取合同查看链接失败');
    }
  }
}

// React组件示例
const ContractViewButton: React.FC<{ contractNo: string }> = ({ contractNo }) => {
  const [loading, setLoading] = useState(false);

  const handleViewContract = async () => {
    setLoading(true);
    try {
      await ContractViewService.openContractView(contractNo);
    } catch (error) {
      message.error('打开合同查看失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      type="primary" 
      icon={<EyeOutlined />}
      loading={loading}
      onClick={handleViewContract}
    >
      查看合同
    </Button>
  );
};
  `);
}

// 如果直接运行此脚本
if (require.main === module) {
  testIntegration().catch(error => {
    console.error('运行测试失败:', error);
  });
}

module.exports = {
  EsignViewService,
  createEsignRoutes,
  ESIGN_CONFIG
}; 