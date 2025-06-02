import React, { useState, useEffect, useRef } from 'react';
import { Card, Input, Form, Spin, App } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

// 百度地图AK
const BAIDU_MAP_AK = 'VTbVdzUtKzhAgCxMvonJkfOJROIAZ4VX';

// 定义全局类型
declare global {
  interface Window {
    BMap: any;
    BMapGL: any;
    BMap_Autocomplete: any;
    BMAP_STATUS_SUCCESS: any;
    initBMap?: () => void;
  }
}

interface BaiduMapCardProps {
  value?: string;
  onChange?: (value: string) => void;
}

const BaiduMapCard: React.FC<BaiduMapCardProps> = ({ value, onChange }) => {
  // 状态
  const [address, setAddress] = useState<string>(value || '');
  const [loading, setLoading] = useState<boolean>(false);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [mapError, setMapError] = useState<string>('');
  
  // 引用
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const autoCompleteRef = useRef<any>(null);
  const inputRef = useRef<any>(null);
  
  // 使用App.useApp()获取message
  const { message: messageApi } = App.useApp();
  
  // 加载百度地图API
  useEffect(() => {
    console.log('开始加载百度地图API...');
    setLoading(true);
    
    // 检查是否已加载
    if (window.BMap) {
      console.log('百度地图API已加载，直接初始化');
      setMapLoaded(true);
      setLoading(false);
      setTimeout(initMap, 100); // 略微延迟初始化，确保DOM已准备好
      return;
    }
    
    // 定义回调函数
    window.initBMap = () => {
      console.log('百度地图API加载完成，回调触发');
      setMapLoaded(true);
      setLoading(false);
      setTimeout(initMap, 100); // 略微延迟初始化，确保DOM已准备好
    };
    
    // 加载脚本
    try {
      const script = document.createElement('script');
      script.src = `https://api.map.baidu.com/api?v=3.0&ak=${BAIDU_MAP_AK}&callback=initBMap`;
      script.async = true;
      
      // 错误处理
      script.onerror = (e) => {
        console.error('百度地图API加载失败:', e);
        setLoading(false);
        setMapError('百度地图加载失败，请检查网络连接或API密钥');
        messageApi.error('百度地图加载失败');
      };
      
      document.body.appendChild(script);
      console.log('百度地图API脚本已添加到页面');
      
      return () => {
        // 清理
        if (script.parentNode) {
          document.body.removeChild(script);
        }
        delete window.initBMap;
        console.log('百度地图API脚本已清理');
      };
    } catch (error) {
      console.error('添加百度地图脚本出错:', error);
      setLoading(false);
      setMapError('添加百度地图脚本出错');
      messageApi.error('百度地图初始化失败');
    }
  }, []);
  
  // 初始化地图
  const initMap = () => {
    console.log('开始初始化地图组件...');
    if (!mapContainerRef.current) {
      console.error('地图容器引用不存在');
      return;
    }
    
    if (!window.BMap) {
      console.error('BMap对象不存在，百度地图SDK未正确加载');
      setMapError('百度地图未正确加载，请刷新页面重试');
      return;
    }
    
    try {
      // 创建地图实例
      console.log('创建百度地图实例');
      const map = new window.BMap.Map(mapContainerRef.current);
      
      // 初始中心点设置为北京
      const point = new window.BMap.Point(116.404, 39.915);
      map.centerAndZoom(point, 15);
      
      // 添加控件
      map.addControl(new window.BMap.NavigationControl());
      map.addControl(new window.BMap.ScaleControl());
      map.enableScrollWheelZoom();
      
      // 保存地图实例
      mapInstanceRef.current = map;
      console.log('地图实例已创建并保存');
      
      // 如果有初始地址，则搜索并标记
      if (address) {
        searchAddress(address);
      }
      
      // 初始化地址自动完成
      setTimeout(initAutoComplete, 200); // 确保输入框已渲染
    } catch (error) {
      console.error('地图初始化错误:', error);
      setMapError('地图初始化失败，请刷新页面重试');
      messageApi.error('地图初始化失败');
    }
  };
  
  // 初始化地址自动完成
  const initAutoComplete = () => {
    try {
      console.log('开始初始化地址自动完成...');
      // 获取输入框元素
      const inputElement = document.getElementById('serviceArea');
      if (!inputElement) {
        console.error('找不到ID为serviceArea的输入元素');
        return;
      }
      
      console.log('找到输入框元素，创建自动完成实例');
      
      // 创建自动完成实例
      const autoComplete = new window.BMap.Autocomplete({
        input: 'serviceArea',
        location: mapInstanceRef.current
      });
      
      console.log('自动完成实例已创建');
      
      // 监听选择事件
      autoComplete.addEventListener('onconfirm', (e: any) => {
        console.log('地址自动完成选择事件触发:', e);
        const _value = e.item.value;
        const addressValue = _value.province + _value.city + _value.district + _value.street + _value.business;
        
        console.log('选择的地址:', addressValue);
        
        // 更新输入框
        setAddress(addressValue);
        messageApi.success('已选择地址: ' + addressValue);
        
        // 触发表单变化
        if (onChange) {
          onChange(addressValue);
        }
        
        // 搜索并标记地图
        searchAddress(addressValue);
      });
      
      // 保存引用
      autoCompleteRef.current = autoComplete;
      console.log('地址自动完成初始化完成');
    } catch (error) {
      console.error('自动完成初始化错误:', error);
      messageApi.error('地址自动完成功能初始化失败');
    }
  };
  
  // 搜索地址并在地图上标记
  const searchAddress = (address: string) => {
    if (!mapInstanceRef.current || !address) {
      console.error('地图实例不存在或地址为空');
      return;
    }
    
    console.log('开始搜索地址:', address);
    
    // 创建地址解析器实例
    const geoCoder = new window.BMap.Geocoder();
    
    // 将地址解析结果显示在地图上，并调整地图视野
    geoCoder.getPoint(address, (point: any) => {
      if (point) {
        console.log('地址解析成功，坐标:', point);
        mapInstanceRef.current.clearOverlays();
        mapInstanceRef.current.centerAndZoom(point, 16);
        const marker = new window.BMap.Marker(point);
        mapInstanceRef.current.addOverlay(marker);
        
        // 添加信息窗口
        const infoWindow = new window.BMap.InfoWindow(`<div style="padding: 8px; font-size: 14px;">${address}</div>`, {
          width: 250,
          title: '服务区域',
          enableMessage: false
        });
        
        marker.addEventListener('click', () => {
          marker.openInfoWindow(infoWindow);
        });
        
        // 立即打开信息窗口
        marker.openInfoWindow(infoWindow);
      } else {
        console.log('地址未找到');
        messageApi.warning('无法在地图上找到该地址');
      }
    }, '全国');
  };
  
  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAddress(value);
    console.log('输入框值变化:', value);
    
    // 触发表单变化
    if (onChange) {
      onChange(value);
    }
  };
  
  // 处理搜索按钮点击
  const handleSearch = () => {
    if (address) {
      console.log('搜索按钮点击，地址:', address);
      searchAddress(address);
    } else {
      messageApi.warning('请先输入地址');
    }
  };

  // 手动触发自动完成初始化 - 组件完全渲染后尝试再次初始化
  useEffect(() => {
    if (mapLoaded && !autoCompleteRef.current) {
      console.log('尝试二次初始化自动完成组件...');
      const timer = setTimeout(() => {
        initAutoComplete();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [mapLoaded]);
  
  return (
    <Card 
      title="接单地址" 
      style={{ marginBottom: 24 }}
    >
      <Form.Item
        label="服务区域"
        name="serviceArea"
        rules={[]}
      >
        <Input
          id="serviceArea"
          ref={inputRef}
          placeholder="请输入服务区域，支持地址联想"
          value={address}
          onChange={handleInputChange}
          onPressEnter={handleSearch}
          suffix={
            <SearchOutlined
              style={{ cursor: 'pointer' }}
              onClick={handleSearch}
            />
          }
        />
      </Form.Item>
      
      {/* 百度地图容器 */}
      <div style={{ position: 'relative', height: 400, marginTop: 16 }}>
        {loading && (
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: 'rgba(255, 255, 255, 0.7)', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            zIndex: 10 
          }}>
            <Spin size="large" />
          </div>
        )}
        
        {mapError && (
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: '#f5f5f5', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            zIndex: 5 
          }}>
            <div>{mapError}</div>
          </div>
        )}
        
        <div 
          ref={mapContainerRef} 
          style={{ height: '100%', width: '100%' }}
          id="baiduMapContainer"
        />
      </div>
    </Card>
  );
};

export default BaiduMapCard; 