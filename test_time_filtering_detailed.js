const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/dashboard';

async function testTimeFilteringDetailed() {
  console.log('🧪 详细测试业务驾驶舱时间筛选功能\n');

  const testCases = [
    {
      name: '默认（无参数）',
      params: {}
    },
    {
      name: '2024年1月',
      params: {
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-31T23:59:59.999Z'
      }
    },
    {
      name: '2024年6月',
      params: {
        startDate: '2024-06-01T00:00:00.000Z',
        endDate: '2024-06-30T23:59:59.999Z'
      }
    },
    {
      name: '2024年7月',
      params: {
        startDate: '2024-07-01T00:00:00.000Z',
        endDate: '2024-07-31T23:59:59.999Z'
      }
    },
    {
      name: '2024年全年',
      params: {
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-12-31T23:59:59.999Z'
      }
    }
  ];

  const results = [];

  for (const testCase of testCases) {
    console.log(`📊 测试: ${testCase.name}`);
    
    try {
      const queryParams = new URLSearchParams(testCase.params);
      const url = `${BASE_URL}/stats${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      console.log(`🔗 请求URL: ${url}`);
      
      const response = await axios.get(url);
      
      if (response.data.success) {
        const { data } = response.data;
        
        const result = {
          name: testCase.name,
          customerBusiness: data.customerBusiness,
          contracts: data.contracts,
          leadQuality: data.leadQuality,
          financial: data.financial,
          efficiency: data.efficiency
        };
        
        results.push(result);
        
        console.log('✅ 请求成功');
        console.log(`📈 核心指标:`);
        console.log(`   - 客户总量: ${data.customerBusiness.totalCustomers}`);
        console.log(`   - 时间段内新增客户: ${data.customerBusiness.newTodayCustomers}`);
        console.log(`   - 合同总量: ${data.contracts.totalContracts}`);
        console.log(`   - 时间段内新签合同: ${data.contracts.newThisMonthContracts}`);
        console.log(`   - A类线索占比: ${data.leadQuality.aLevelLeadsRatio}%`);
        console.log(`   - 线索来源数量: ${Object.keys(data.leadQuality.leadSourceDistribution).length}`);
        console.log(`   - 时间段内服务费收入: ${data.financial.monthlyServiceFeeIncome}元`);
        console.log(`   - 平均匹配时长: ${data.efficiency.averageMatchingDays}天`);
      } else {
        console.log('❌ 请求失败:', response.data.message);
      }
    } catch (error) {
      console.log('❌ 请求出错:', error.response?.data?.message || error.message);
    }
    
    console.log('─'.repeat(80));
  }

  // 比较分析
  console.log('\n📊 数据比较分析:');
  
  if (results.length >= 2) {
    console.log('\n🔍 新增客户数对比:');
    results.forEach(result => {
      console.log(`   ${result.name}: ${result.customerBusiness.newTodayCustomers}个`);
    });
    
    console.log('\n🔍 新签合同数对比:');
    results.forEach(result => {
      console.log(`   ${result.name}: ${result.contracts.newThisMonthContracts}份`);
    });
    
    console.log('\n🔍 服务费收入对比:');
    results.forEach(result => {
      console.log(`   ${result.name}: ${result.financial.monthlyServiceFeeIncome}元`);
    });
    
    console.log('\n🔍 线索来源分布对比:');
    results.forEach(result => {
      const sources = Object.entries(result.leadQuality.leadSourceDistribution);
      console.log(`   ${result.name}: ${sources.map(([source, count]) => `${source}(${count})`).join(', ')}`);
    });
  }
  
  console.log('\n💡 预期结果:');
  console.log('✓ 不同时间范围应该显示不同的新增客户数');
  console.log('✓ 不同时间范围应该显示不同的新签合同数');
  console.log('✓ 不同时间范围应该显示不同的财务数据');
  console.log('✓ 不同时间范围应该显示不同的线索分布');
  
  // 验证时间筛选是否生效
  const hasVariation = results.some((result, index) => {
    if (index === 0) return false;
    const first = results[0];
    return (
      result.customerBusiness.newTodayCustomers !== first.customerBusiness.newTodayCustomers ||
      result.contracts.newThisMonthContracts !== first.contracts.newThisMonthContracts ||
      result.financial.monthlyServiceFeeIncome !== first.financial.monthlyServiceFeeIncome
    );
  });
  
  console.log(`\n${hasVariation ? '✅' : '❌'} 时间筛选功能${hasVariation ? '正常工作' : '未生效'}`);
}

testTimeFilteringDetailed().catch(console.error); 