// 小程序客户列表页面
// 文件: pages/customer/list.js

const miniprogramCustomerService = require('../../services/miniprogramCustomerService.js');
const { formatDate, formatRelativeTime, getCustomerStatusStyle, debounce } = require('../../utils/miniprogramUtils.js');

Page({
  data: {
    // 列表数据
    customers: [],
    total: 0,
    hasMore: true,
    
    // 页面状态
    loading: false,
    refreshing: false,
    loadingMore: false,
    error: null,
    
    // 查询参数
    query: {
      page: 1,
      limit: 20,
      search: '',
      contractStatus: '',
      leadSource: '',
      serviceCategory: '',
      leadLevel: ''
    },
    
    // 筛选选项
    filterOptions: {
      contractStatus: [
        { label: '全部', value: '' },
        { label: '已签约', value: '已签约' },
        { label: '匹配中', value: '匹配中' },
        { label: '流失客户', value: '流失客户' },
        { label: '已退款', value: '已退款' },
        { label: '退款中', value: '退款中' },
        { label: '待定', value: '待定' }
      ],
      leadSource: [
        { label: '全部', value: '' },
        { label: '美团', value: '美团' },
        { label: '抖音', value: '抖音' },
        { label: '快手', value: '快手' },
        { label: '小红书', value: '小红书' },
        { label: '转介绍', value: '转介绍' },
        { label: '其他', value: '其他' }
      ]
    },
    
    // 用户权限
    userPermissions: {
      canCreate: true,
      canEdit: false,
      canAssign: false,
      canViewAll: false
    },
    
    // UI状态
    showFilter: false,
    searchFocused: false
  },

  onLoad(options) {
    console.log('客户列表页面加载', options);
    
    // 获取用户权限信息
    this.getUserPermissions();
    
    // 加载客户列表
    this.loadCustomers();
  },

  onShow() {
    // 页面显示时刷新数据
    if (this.data.customers.length > 0) {
      this.refreshCustomers();
    }
  },

  onPullDownRefresh() {
    this.refreshCustomers();
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadMoreCustomers();
    }
  },

  // 获取用户权限
  getUserPermissions() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.role) {
      const permissions = {
        canCreate: ['系统管理员', '经理', '普通员工'].includes(userInfo.role),
        canEdit: ['系统管理员', '经理'].includes(userInfo.role),
        canAssign: ['系统管理员', '经理'].includes(userInfo.role),
        canViewAll: ['系统管理员', '经理'].includes(userInfo.role)
      };
      
      this.setData({ userPermissions: permissions });
    }
  },

  // 加载客户列表
  async loadCustomers() {
    if (this.data.loading) return;
    
    this.setData({ loading: true, error: null });
    
    try {
      const response = await miniprogramCustomerService.getCustomers(this.data.query);
      
      this.setData({
        customers: response.customers,
        total: response.total,
        hasMore: response.hasMore,
        loading: false
      });
      
      console.log('客户列表加载成功:', response);
    } catch (error) {
      console.error('加载客户列表失败:', error);
      this.setData({
        loading: false,
        error: error.message || '加载失败，请重试'
      });
      
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'error'
      });
    }
  },

  // 刷新客户列表
  async refreshCustomers() {
    this.setData({
      refreshing: true,
      'query.page': 1
    });
    
    try {
      const response = await miniprogramCustomerService.getCustomers(this.data.query);
      
      this.setData({
        customers: response.customers,
        total: response.total,
        hasMore: response.hasMore,
        refreshing: false
      });
      
      wx.stopPullDownRefresh();
      
      wx.showToast({
        title: '刷新成功',
        icon: 'success',
        duration: 1000
      });
    } catch (error) {
      console.error('刷新客户列表失败:', error);
      this.setData({ refreshing: false });
      wx.stopPullDownRefresh();
      
      wx.showToast({
        title: '刷新失败',
        icon: 'error'
      });
    }
  },

  // 加载更多客户
  async loadMoreCustomers() {
    if (this.data.loadingMore) return;
    
    this.setData({ loadingMore: true });
    
    const nextPage = this.data.query.page + 1;
    const query = { ...this.data.query, page: nextPage };
    
    try {
      const response = await miniprogramCustomerService.getCustomers(query);
      
      const newCustomers = [...this.data.customers, ...response.customers];
      
      this.setData({
        customers: newCustomers,
        hasMore: response.hasMore,
        loadingMore: false,
        'query.page': nextPage
      });
    } catch (error) {
      console.error('加载更多失败:', error);
      this.setData({ loadingMore: false });
      
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
  },

  // 搜索客户
  onSearchInput: debounce(function(e) {
    const value = e.detail.value;
    this.setData({
      'query.search': value,
      'query.page': 1
    });
    
    this.loadCustomers();
  }, 500),

  // 搜索框获得焦点
  onSearchFocus() {
    this.setData({ searchFocused: true });
  },

  // 搜索框失去焦点
  onSearchBlur() {
    this.setData({ searchFocused: false });
  },

  // 清空搜索
  onSearchClear() {
    this.setData({
      'query.search': '',
      'query.page': 1
    });
    this.loadCustomers();
  },

  // 显示/隐藏筛选
  toggleFilter() {
    this.setData({ showFilter: !this.data.showFilter });
  },

  // 筛选状态变更
  onFilterChange(e) {
    const { type, value } = e.currentTarget.dataset;
    
    this.setData({
      [`query.${type}`]: value,
      'query.page': 1,
      showFilter: false
    });
    
    this.loadCustomers();
  },

  // 重置筛选
  resetFilter() {
    this.setData({
      'query.contractStatus': '',
      'query.leadSource': '',
      'query.serviceCategory': '',
      'query.leadLevel': '',
      'query.page': 1,
      showFilter: false
    });
    
    this.loadCustomers();
  },

  // 点击客户项
  onCustomerTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/customer/detail?id=${id}`
    });
  },

  // 创建客户
  onCreateCustomer() {
    if (!this.data.userPermissions.canCreate) {
      wx.showToast({
        title: '无权限创建客户',
        icon: 'error'
      });
      return;
    }
    
    wx.navigateTo({
      url: '/pages/customer/create'
    });
  },

  // 编辑客户
  onEditCustomer(e) {
    const { id } = e.currentTarget.dataset;
    
    if (!this.data.userPermissions.canEdit) {
      wx.showToast({
        title: '无权限编辑客户',
        icon: 'error'
      });
      return;
    }
    
    wx.navigateTo({
      url: `/pages/customer/edit?id=${id}`
    });
  },

  // 分配客户
  onAssignCustomer(e) {
    const { id } = e.currentTarget.dataset;
    
    if (!this.data.userPermissions.canAssign) {
      wx.showToast({
        title: '无权限分配客户',
        icon: 'error'
      });
      return;
    }
    
    wx.navigateTo({
      url: `/pages/customer/assign?id=${id}`
    });
  },

  // 联系客户
  onContactCustomer(e) {
    const { phone } = e.currentTarget.dataset;
    
    wx.showActionSheet({
      itemList: ['拨打电话', '发送短信'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.makePhoneCall({
            phoneNumber: phone,
            fail: (err) => {
              console.error('拨打电话失败:', err);
              wx.showToast({
                title: '拨打失败',
                icon: 'error'
              });
            }
          });
        } else if (res.tapIndex === 1) {
          // 发送短信功能（小程序暂不支持直接发送短信）
          wx.setClipboardData({
            data: phone,
            success: () => {
              wx.showToast({
                title: '号码已复制',
                icon: 'success'
              });
            }
          });
        }
      }
    });
  },

  // 重试加载
  onRetry() {
    this.loadCustomers();
  },

  // 格式化日期
  formatDate,
  formatRelativeTime,
  getCustomerStatusStyle
});
