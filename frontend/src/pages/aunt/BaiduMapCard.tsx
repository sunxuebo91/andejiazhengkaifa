import React, { useEffect, useState, useRef, memo } from 'react';
import { Input, Spin, message } from 'antd';
import styles from './BaiduMapCard.module.css';

// 调试模式开关，生产环境设为false
const DEBUG_MODE = false;

// 调试日志函数
function debugLog(...args) {
  if (DEBUG_MODE) console.log(...args);
}

// BMap和全局变量声明
declare global {
  interface Window {
    BMap: any;
    BMapGL: any;
    BMap_INITIAL_CALLBACK: () => void;
    _AMapSecurityConfig: any;
  }
}

// 百度地图组件属性定义
interface BaiduMapCardProps {
  value?: string;
  onChange?: (value: string) => void;
}

// 使用React.memo减少不必要的重渲染
const BaiduMapCard = memo(({ value, onChange }: BaiduMapCardProps) => {
  const [address, setAddress] = useState<string>(value || '');
  const [loading, setLoading] = useState<boolean>(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // 使用Ref保存实例，避免重复创建
  const mapInstanceRef = useRef<any>(null);
  const autocompleteRef = useRef<any>(null);
  const scriptLoadedRef = useRef<boolean>(false);

  // 判断百度地图API是否已加载
  const isBaiduMapLoaded = () => {
    return typeof window.BMap !== 'undefined' || typeof window.BMapGL !== 'undefined';
  };

  // 加载百度地图API
  const loadBaiduMapScript = () => {
    if (isBaiduMapLoaded() || document.getElementById('baidu-map-script')) {
      debugLog('百度地图API已加载，直接初始化');
      scriptLoadedRef.current = true;
      initializeMapAfterAPILoaded();
      return;
    }

    debugLog('开始加载百度地图API...');
    setLoading(true);

    // 设置回调函数
    window.BMap_INITIAL_CALLBACK = () => {
      debugLog('百度地图API加载完成，回调触发');
      scriptLoadedRef.current = true;
      initializeMapAfterAPILoaded();
    };

    // 创建script元素
    const script = document.createElement('script');
    script.id = 'baidu-map-script';
    script.type = 'text/javascript';
    script.src = `https://api.map.baidu.com/api?v=3.0&ak=1noeQpvwS9oKOXjTDlbXb0pSEWnM6lAy&callback=BMap_INITIAL_CALLBACK`;
    
    // 添加错误处理
    script.onerror = () => {
      debugLog('百度地图API加载失败');
      setLoading(false);
      message.error('地图服务加载失败，请刷新页面重试');
    };
    
    document.head.appendChild(script);
    debugLog('百度地图API脚本已添加到页面');
  };

  // API加载后初始化地图
  const initializeMapAfterAPILoaded = () => {
    setLoading(false);
    
    // 确保DOM已渲染
    setTimeout(() => {
      initializeMap();
    }, 100);
  };

  // 初始化地图
  const initializeMap = () => {
    if (!mapContainerRef.current || !isBaiduMapLoaded()) {
      return;
    }
    
    try {
      debugLog('开始初始化地图组件...');
      
      // 避免重复创建地图实例
      if (mapInstanceRef.current) {
        return;
      }
      
      // 创建地图实例
      debugLog('创建百度地图实例');
      const map = new window.BMap.Map(mapContainerRef.current);
      
      // 初始化地图
      const point = new window.BMap.Point(116.404, 39.915);
      map.centerAndZoom(point, 15);
      map.addControl(new window.BMap.ScaleControl());
      map.addControl(new window.BMap.NavigationControl());
      map.enableScrollWheelZoom();
      
      // 保存实例
      mapInstanceRef.current = map;
      debugLog('地图实例已创建并保存');
      
      // 初始化地址自动完成
      initializeAutocomplete();
      
      // 如果已有地址，进行地理编码
      if (address) {
        searchLocation(address);
      }
    } catch (error) {
      console.error('初始化地图失败:', error);
      message.error('地图初始化失败，请刷新页面重试');
    }
  };

  // 初始化地址自动完成
  const initializeAutocomplete = () => {
    if (!isBaiduMapLoaded() || !inputRef.current) {
      return;
    }
    
    // 如果已有实例，先清理
    if (autocompleteRef.current) {
      try {
        autocompleteRef.current.dispose();
      } catch (error) {
        debugLog('清理旧自动完成实例出错:', error);
      }
    }
    
    try {
      debugLog('开始初始化地址自动完成...');
      
      // 确保输入框元素存在
      const inputElement = inputRef.current;
      if (!inputElement) {
        debugLog('未找到输入框元素');
        return;
      }
      
      debugLog('找到输入框元素，创建自动完成实例');
      const autocomplete = new window.BMap.Autocomplete({
        input: inputElement,
        location: mapInstanceRef.current,
        onSearchComplete: function(results) {
          // 可以在这里添加搜索完成后的操作
        }
      });
      
      // 保存自动完成实例
      autocompleteRef.current = autocomplete;
      debugLog('自动完成实例已创建');
      
      // 选中地址事件
      autocomplete.addEventListener('onconfirm', function(e) {
        const item = e.item;
        debugLog('地址自动完成选择事件触发:', e);
        
        const selectedAddress = item.value.business + item.value.province + item.value.city + item.value.district + item.value.street + item.value.streetNumber;
        debugLog('选择的地址:', selectedAddress);
        
        // 更新地址状态并触发onChange
        setAddress(selectedAddress);
        if (onChange) {
          onChange(selectedAddress);
        }
        
        // 搜索选择的地址
        searchLocation(selectedAddress);
      });
      
      debugLog('地址自动完成初始化完成');
    } catch (error) {
      console.error('初始化地址自动完成失败:', error);
    }
  };

  // 搜索地址并定位
  const searchLocation = (addressToSearch: string) => {
    if (!isBaiduMapLoaded() || !mapInstanceRef.current) {
      return;
    }
    
    try {
      debugLog('开始搜索地址:', addressToSearch);
      const geocoder = new window.BMap.Geocoder();
      
      geocoder.getPoint(addressToSearch, function(point) {
        if (point) {
          debugLog('地址解析成功，坐标:', point);
          mapInstanceRef.current.clearOverlays();
          const marker = new window.BMap.Marker(point);
          mapInstanceRef.current.addOverlay(marker);
          mapInstanceRef.current.centerAndZoom(point, 15);
          
          // 打开信息窗口
          const infoWindow = new window.BMap.InfoWindow(addressToSearch, {
            width: 200,
            height: 60,
            title: '所选位置'
          });
          marker.openInfoWindow(infoWindow);
        } else {
          debugLog('无法找到该地址的坐标');
        }
      });
    } catch (error) {
      console.error('地址搜索失败:', error);
    }
  };

  // 地址输入框变化处理
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAddress = e.target.value;
    debugLog('输入框值变化:', newAddress);
    setAddress(newAddress);
    
    if (onChange) {
      onChange(newAddress);
    }
  };

  // 组件挂载时加载地图API
  useEffect(() => {
    // 检查是否已加载API
    if (!window.BMap && !document.getElementById('baidu-map-script')) {
      loadBaiduMapScript();
    } else if (window.BMap) {
      initializeMap();
    }
    
    // 组件卸载时清理
    return () => {
      debugLog('组件卸载，执行清理');
      
      // 清理地图实例
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.clearOverlays();
          mapInstanceRef.current.destroy();
        } catch (error) {
          debugLog('清理地图实例出错:', error);
        }
        mapInstanceRef.current = null;
      }
      
      // 清理自动完成实例
      if (autocompleteRef.current) {
        try {
          autocompleteRef.current.dispose();
        } catch (error) {
          debugLog('清理自动完成实例出错:', error);
        }
        autocompleteRef.current = null;
      }
      
      // 清理全局回调
      window.BMap_INITIAL_CALLBACK = undefined;
    };
  }, []);

  // 地址值变化时更新
  useEffect(() => {
    if (value !== undefined && value !== address) {
      setAddress(value);
      // 如果输入框已经存在，也要更新输入框的值
      if (inputRef.current) {
        inputRef.current.value = value;
      }
    }
  }, [value, address]);

  // 移除重复的初始化useEffect，因为useState已经处理了初始值
  useEffect(() => {
    if (value) {
      setAddress(value);
    }
  }, []);

  // API加载完成后，二次确认初始化
  useEffect(() => {
    if (scriptLoadedRef.current && !mapInstanceRef.current && mapContainerRef.current) {
      debugLog('尝试二次初始化自动完成组件...');
      initializeMap();
    }
  }, [scriptLoadedRef.current, mapContainerRef.current]);

  return (
    <div className={styles.baiduMapCard}>
      <div className={styles.mapSearch}>
        <Input
          ref={inputRef}
          placeholder="输入服务区域地址"
          value={address}
          onChange={handleAddressChange}
          className={styles.searchInput}
        />
      </div>
      <div 
        ref={mapContainerRef} 
        className={styles.mapContainer}
        style={{ position: 'relative', height: '400px', marginTop: '10px' }}
      >
        {loading && (
          <div className={styles.loadingContainer}>
            <Spin size="large">
              <div style={{ padding: '50px', background: 'rgba(0, 0, 0, 0.05)' }}>
                地图加载中...
              </div>
            </Spin>
          </div>
        )}
      </div>
    </div>
  );
});

// 为了保持向后兼容性，添加displayName
BaiduMapCard.displayName = 'BaiduMapCard';

export default BaiduMapCard;