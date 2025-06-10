const fs = require('fs');
const path = require('path');

async function testDeleteButtonRemoval() {
  try {
    console.log('🧪 测试客户列表删除按钮移除...\n');

    // 1. 检查CustomerList.tsx文件内容
    console.log('1. 检查CustomerList.tsx文件内容...');
    const customerListPath = path.join(__dirname, 'frontend/src/pages/customers/CustomerList.tsx');
    
    if (!fs.existsSync(customerListPath)) {
      console.log('❌ CustomerList.tsx文件不存在');
      return false;
    }

    const content = fs.readFileSync(customerListPath, 'utf8');
    
    // 2. 检查删除相关代码是否已移除
    console.log('\n2. 检查删除相关代码是否已移除...');
    const checks = [
      {
        name: 'handleDelete函数',
        pattern: /const handleDelete\s*=/,
        shouldExist: false,
        description: '删除处理函数应该被移除'
      },
      {
        name: 'DeleteOutlined导入',
        pattern: /DeleteOutlined/,
        shouldExist: false,
        description: '删除图标导入应该被移除'
      },
      {
        name: 'Popconfirm导入',
        pattern: /Popconfirm/,
        shouldExist: false,
        description: 'Popconfirm组件导入应该被移除'
      },
      {
        name: '删除按钮',
        pattern: /<Button[^>]*danger[^>]*>/,
        shouldExist: false,
        description: '危险样式的删除按钮应该被移除'
      },
      {
        name: 'Popconfirm组件',
        pattern: /<Popconfirm[^>]*>/,
        shouldExist: false,
        description: 'Popconfirm确认弹窗应该被移除'
      },
      {
        name: '查看按钮',
        pattern: /查看/,
        shouldExist: true,
        description: '查看按钮应该保留'
      },
      {
        name: '操作列',
        pattern: /title:\s*['"]操作['"]/,
        shouldExist: true,
        description: '操作列应该保留但简化'
      }
    ];

    const results = [];
    
    checks.forEach(check => {
      const found = check.pattern.test(content);
      const passed = found === check.shouldExist;
      
      results.push({
        name: check.name,
        passed,
        description: check.description,
        status: passed ? '✅ 通过' : '❌ 失败',
        detail: found ? '找到相关代码' : '未找到相关代码'
      });
      
      console.log(`   ${passed ? '✅' : '❌'} ${check.name}: ${check.description}`);
      if (!passed) {
        console.log(`      实际: ${found ? '存在' : '不存在'}, 期望: ${check.shouldExist ? '存在' : '不存在'}`);
      }
    });

    // 3. 检查操作列宽度是否优化
    console.log('\n3. 检查操作列宽度优化...');
    const widthPattern = /width:\s*80/;
    const widthOptimized = widthPattern.test(content);
    
    results.push({
      name: '操作列宽度优化',
      passed: widthOptimized,
      description: '操作列宽度应该从120调整为80',
      status: widthOptimized ? '✅ 通过' : '❌ 失败',
      detail: widthOptimized ? '宽度已优化为80' : '宽度未优化'
    });

    console.log(`   ${widthOptimized ? '✅' : '❌'} 操作列宽度优化: ${widthOptimized ? '已优化为80' : '未优化'}`);

    // 4. 检查customerService中deleteCustomer方法（提醒信息）
    console.log('\n4. 检查customerService删除方法状态...');
    const customerServicePath = path.join(__dirname, 'frontend/src/services/customerService.ts');
    
    if (fs.existsSync(customerServicePath)) {
      const serviceContent = fs.readFileSync(customerServicePath, 'utf8');
      const hasDeleteMethod = /deleteCustomer/.test(serviceContent);
      
      console.log(`   ℹ️  customerService.deleteCustomer方法: ${hasDeleteMethod ? '仍存在' : '不存在'}`);
      console.log('   💡 说明: 保留后端删除方法是正常的，只是前端不再调用');
    }

    // 5. 验证结果总结
    console.log('\n🔍 测试结果总结:');
    results.forEach(result => {
      console.log(`   ${result.status} ${result.name}: ${result.description}`);
    });

    const criticalChecks = results.filter(r => 
      r.name.includes('handleDelete') || 
      r.name.includes('删除按钮') || 
      r.name.includes('Popconfirm组件') ||
      r.name.includes('查看按钮')
    );
    
    const allCriticalPassed = criticalChecks.every(r => r.passed);
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;

    console.log('\n📊 详细统计:');
    console.log(`   ✅ 通过检查: ${passedCount}/${totalCount}`);
    console.log(`   🎯 关键检查: ${criticalChecks.filter(r => r.passed).length}/${criticalChecks.length} 通过`);

    console.log('\n📋 修改说明:');
    console.log('   🚫 移除内容: handleDelete函数、删除按钮、Popconfirm确认弹窗');
    console.log('   ✅ 保留内容: 查看按钮、操作列（简化后）');
    console.log('   🎯 安全原则: 客户数据只能通过数据库管理员删除');
    console.log('   💡 用户体验: 界面更简洁，避免误删风险');

    // 6. 总结
    console.log('\n📊 总结:');
    if (allCriticalPassed) {
      console.log('   🎉 删除按钮移除成功！客户列表现在更安全，只支持查看操作');
      console.log('   🛡️  数据安全: 客户信息现在只能通过数据库直接管理');
    } else {
      console.log('   ⚠️  部分检查未通过，可能需要进一步调整');
    }

    return allCriticalPassed;

  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message);
    return false;
  }
}

// 运行测试
testDeleteButtonRemoval()
  .then((success) => {
    console.log(`\n🏁 测试${success ? '成功' : '失败'}`);
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('测试执行失败:', error);
    process.exit(1);
  }); 