// 不再使用高德地图辅助函数
// import { initAmapAutocomplete } from '@/utils/amapHelper';

const CreateResumePage = () => {
  const [address, setAddress] = useState('');
  const [sdkStatus, setSdkStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const addressAutocompleteRef = useRef<{destroy: () => void} | null>(null);
  
  useEffect(() => {
    // 初始化网络状态检测
    // initNetworkDetection();
    
    // 监听网络状态变化
    const handleNetworkChange = (e: Event) => {
      const online = (e as CustomEvent).detail?.online ?? navigator.onLine;
      setIsOnline(online);
      if (!online) {
        form.setFields([{
          name: 'serviceArea',
          errors: ['网络已断开，请检查连接']
        }]);
      }
    };
    
    // window.addEventListener('amap-network-change', handleNetworkChange);
    
    // 组件卸载时执行清理
    return () => {
      if (addressAutocompleteRef.current) {
        addressAutocompleteRef.current.destroy();
      }
      // 执行全局清理
      // cleanupAmapInstances();
      
      // 移除事件监听器
      // window.removeEventListener('amap-network-change', handleNetworkChange);
    };
  }, []);

  return (
    <div className="resume-form">
      {/* 在表单中添加简历ID字段 */}
      {resumeId && (
        <div className="resume-id">
          <label>简历ID:</label>
          <span>{resumeId}</span>
        </div>
      )}
      
      <input 
        id="addressInput"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="请输入服务地址"
      />
      <ul id="suggestionList" className="suggestion-list"></ul>
      {/* 网络状态提示 */}
      {!isOnline && (
        <div className="network-status error">
          警告：当前处于离线状态
        </div>
      )}
      {/* SDK加载状态提示 */}
      {sdkStatus === 'loading' && (
        <div className="sdk-status">正在加载地图服务...</div>
      )}
      {sdkStatus === 'error' && (
        <div className="sdk-status error">
          地图服务加载失败，请检查网络连接
        </div>
      )}
      {/* 其他表单字段 */}
    </div>
  );
};
