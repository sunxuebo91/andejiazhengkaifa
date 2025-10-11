// 小程序客户创建页面
// 文件: pages/customer/create.js

const miniprogramCustomerService = require('../../services/miniprogramCustomerService.js');
const { validateCustomerForm, formatCustomerFormData, handleApiError } = require('../../utils/miniprogramUtils.js');

Page({
  data: {
    // 表单数据
    formData: {
      name: '',
      phone: '',
      wechatId: '',
      leadSource: '',
      serviceCategory: '',
      contractStatus: '匹配中',
      leadLevel: '',
      salaryBudget: '',
      expectedStartDate: '',
      homeArea: '',
      familySize: '',
      restSchedule: '',
      address: '',
      remarks: ''
    },
    
    // 表单验证错误
    errors: {},
    
    // 页面状态
    submitting: false,
    
    // 选项数据
    options: {
      leadSource: [
        { label: '美团', value: '美团' },
        { label: '抖音', value: '抖音' },
        { label: '快手', value: '快手' },
        { label: '小红书', value: '小红书' },
        { label: '转介绍', value: '转介绍' },
        { label: '其他', value: '其他' }
      ],
      serviceCategory: [
        { label: '月嫂', value: '月嫂' },
        { label: '育儿嫂', value: '育儿嫂' },
        { label: '保姆', value: '保姆' },
        { label: '护工', value: '护工' },
        { label: '钟点工', value: '钟点工' }
      ],
      contractStatus: [
        { label: '匹配中', value: '匹配中' },
        { label: '已签约', value: '已签约' },
        { label: '待定', value: '待定' }
      ],
      leadLevel: [
        { label: 'A类', value: 'A类' },
        { label: 'B类', value: 'B类' },
        { label: 'C类', value: 'C类' },
        { label: 'D类', value: 'D类' }
      ],
      restSchedule: [
        { label: '单休', value: '单休' },
        { label: '双休', value: '双休' },
        { label: '不休', value: '不休' }
      ]
    }
  },

  onLoad(options) {
    console.log('客户创建页面加载', options);
    
    // 设置导航栏标题
    wx.setNavigationBarTitle({
      title: '创建客户'
    });
  },

  // 表单输入处理
  onInputChange(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    this.setData({
      [`formData.${field}`]: value,
      [`errors.${field}`]: '' // 清除该字段的错误信息
    });
  },

  // 选择器变更处理
  onPickerChange(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    const options = this.data.options[field];
    
    if (options && options[value]) {
      this.setData({
        [`formData.${field}`]: options[value].value,
        [`errors.${field}`]: ''
      });
    }
  },

  // 日期选择处理
  onDateChange(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    this.setData({
      [`formData.${field}`]: value,
      [`errors.${field}`]: ''
    });
  },

  // 表单验证
  validateForm() {
    const errors = validateCustomerForm(this.data.formData);
    const errorMap = {};
    
    errors.forEach(error => {
      errorMap[error.field] = error.message;
    });
    
    this.setData({ errors: errorMap });
    
    return errors.length === 0;
  },

  // 提交表单
  async onSubmit() {
    if (this.data.submitting) return;
    
    // 表单验证
    if (!this.validateForm()) {
      wx.showToast({
        title: '请检查表单信息',
        icon: 'error'
      });
      return;
    }
    
    this.setData({ submitting: true });
    
    try {
      // 格式化表单数据
      const formattedData = formatCustomerFormData(this.data.formData);
      
      // 生成幂等性键和请求ID
      const idempotencyKey = miniprogramCustomerService.generateIdempotencyKey();
      const requestId = miniprogramCustomerService.generateRequestId();
      
      console.log('提交客户创建:', {
        data: formattedData,
        idempotencyKey,
        requestId
      });
      
      // 调用API创建客户
      const result = await miniprogramCustomerService.createCustomer(formattedData, {
        idempotencyKey,
        apiVersion: 'v1',
        requestId
      });
      
      console.log('客户创建成功:', result);
      
      // 显示成功提示
      wx.showToast({
        title: '客户创建成功',
        icon: 'success',
        duration: 2000
      });
      
      // 延迟返回上一页
      setTimeout(() => {
        wx.navigateBack({
          delta: 1
        });
      }, 2000);
      
    } catch (error) {
      console.error('客户创建失败:', error);
      
      const errorMessage = handleApiError(error);
      
      wx.showModal({
        title: '创建失败',
        content: errorMessage,
        showCancel: false,
        confirmText: '确定'
      });
      
      this.setData({ submitting: false });
    }
  },

  // 重置表单
  onReset() {
    wx.showModal({
      title: '确认重置',
      content: '确定要清空所有表单数据吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            formData: {
              name: '',
              phone: '',
              wechatId: '',
              leadSource: '',
              serviceCategory: '',
              contractStatus: '匹配中',
              leadLevel: '',
              salaryBudget: '',
              expectedStartDate: '',
              homeArea: '',
              familySize: '',
              restSchedule: '',
              address: '',
              remarks: ''
            },
            errors: {}
          });
          
          wx.showToast({
            title: '表单已重置',
            icon: 'success'
          });
        }
      }
    });
  },

  // 返回上一页
  onBack() {
    // 检查是否有未保存的数据
    const hasData = Object.values(this.data.formData).some(value => 
      value && value.toString().trim() !== ''
    );
    
    if (hasData) {
      wx.showModal({
        title: '确认离开',
        content: '表单数据尚未保存，确定要离开吗？',
        success: (res) => {
          if (res.confirm) {
            wx.navigateBack({
              delta: 1
            });
          }
        }
      });
    } else {
      wx.navigateBack({
        delta: 1
      });
    }
  },

  // 获取当前日期（用于日期选择器的默认值）
  getCurrentDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 获取选择器的当前索引
  getPickerIndex(field, value) {
    const options = this.data.options[field];
    if (!options || !value) return 0;

    const index = options.findIndex(option => option.value === value);
    return index >= 0 ? index : 0;
  },

  // 扫码输入（可选功能）
  onScanCode() {
    wx.scanCode({
      success: (res) => {
        // 假设扫码结果是客户信息的JSON格式
        try {
          const customerInfo = JSON.parse(res.result);
          if (customerInfo.name && customerInfo.phone) {
            this.setData({
              'formData.name': customerInfo.name,
              'formData.phone': customerInfo.phone,
              'formData.address': customerInfo.address || ''
            });

            wx.showToast({
              title: '信息导入成功',
              icon: 'success'
            });
          }
        } catch (error) {
          wx.showToast({
            title: '扫码格式错误',
            icon: 'error'
          });
        }
      },
      fail: (error) => {
        console.error('扫码失败:', error);
      }
    });
  }
});
