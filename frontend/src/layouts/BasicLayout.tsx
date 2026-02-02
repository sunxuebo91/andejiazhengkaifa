import { ProLayout } from '@ant-design/pro-components';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import { DashboardOutlined, TeamOutlined, FileAddOutlined, UnorderedListOutlined, UserOutlined, SettingOutlined, LogoutOutlined, ContactsOutlined, FileTextOutlined, VideoCameraOutlined, QrcodeOutlined, InboxOutlined, SwapOutlined, HistoryOutlined, SafetyOutlined, AppstoreOutlined, PictureOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { Avatar, Dropdown, MenuProps, Space } from 'antd';
import { useMemo, useEffect } from 'react';
import NotificationBell from '../components/NotificationBell';
import notificationSocketService from '../services/notification-socket.service';

// 定义菜单项类型
interface MenuRoute {
  path: string;
  name: string;
  icon?: React.ReactNode;
  routes?: MenuRoute[];
  // 外部/占位菜单：不走 react-router 的 Link
  placeholder?: boolean;
}

const BasicLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasRole, hasPermission } = useAuth();

  // 初始化WebSocket连接
  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('token');
      if (token) {
        notificationSocketService.connect(token);
      }
    }

    return () => {
      notificationSocketService.disconnect();
    };
  }, [user]);

  // 根据用户权限过滤菜单
  const getAuthorizedMenus = useMemo((): MenuRoute[] => {
    // 基础菜单项 - 所有用户都可见
    const baseMenus: MenuRoute[] = [
      {
        path: '/dashboard',
        name: '首页驾驶舱',
        icon: <DashboardOutlined />,
      }
    ];

    // 阿姨管理菜单 - 需要简历查看或创建权限
    if (hasPermission('resume:view') || hasPermission('resume:create')) {
      const resumeMenu: MenuRoute = {
        path: '/aunt',
        name: '阿姨管理',
        icon: <TeamOutlined />,
        routes: [],
      };

      // 简历列表 - 需要简历查看权限
      if (hasPermission('resume:view')) {
        resumeMenu.routes!.push({
          path: '/aunt/list',
          name: '简历列表',
          icon: <UnorderedListOutlined />,
        });
      }

      // 创建简历 - 需要简历创建权限
      if (hasPermission('resume:create')) {
        resumeMenu.routes!.push({
          path: '/aunt/create-resume',
          name: '创建简历',
          icon: <FileAddOutlined />,
        });
      }

      baseMenus.push(resumeMenu);
    }

    // 客户管理菜单 - 需要客户相关权限  
    if (true || hasPermission('customer:view') || hasPermission('customer:create')) {
      const customerMenu: MenuRoute = {
        path: '/customers',
        name: '客户管理',
        icon: <ContactsOutlined />,
        routes: [],
      };

      // 客户列表 - 需要客户查看权限
      if (true || hasPermission('customer:view')) {
        customerMenu.routes!.push({
          path: '/customers/list',
          name: '客户列表',
          icon: <UnorderedListOutlined />,
        });
      }

      // 线索公海
      if (true || hasPermission('customer:view')) {
        customerMenu.routes!.push({
          path: '/customers/public-pool',
          name: '线索公海',
          icon: <InboxOutlined />,
        });
      }

      // 创建客户 - 需要客户创建权限
      if (true || hasPermission('customer:create')) {
        customerMenu.routes!.push({
          path: '/customers/create',
          name: '创建客户',
          icon: <FileAddOutlined />,
        });
      }

      // 线索流转规则 - 仅管理员可见
      if (hasRole('admin')) {
        customerMenu.routes!.push({
          path: '/customers/lead-transfer-rules',
          name: '线索流转规则',
          icon: <SwapOutlined />,
        });
      }

      // 线索流转记录 - 所有人可见
      customerMenu.routes!.push({
        path: '/customers/lead-transfer-records',
        name: '流转记录',
        icon: <HistoryOutlined />,
      });

      baseMenus.push(customerMenu);
    }

    // 合同管理菜单 - 需要合同相关权限
    if (true || hasPermission('contract:view') || hasPermission('contract:create')) {
      const contractMenu: MenuRoute = {
        path: '/contracts',
        name: '合同管理',
        icon: <FileTextOutlined />,
        routes: [],
      };

      // 合同列表 - 需要合同查看权限
      if (true || hasPermission('contract:view')) {
        contractMenu.routes!.push({
          path: '/contracts/list',
          name: '合同列表',
          icon: <UnorderedListOutlined />,
        });
      }

      // 创建合同 - 需要合同创建权限
      if (true || hasPermission('contract:create')) {
        contractMenu.routes!.push({
          path: '/contracts/create',
          name: '创建合同',
          icon: <FileAddOutlined />,
        });
      }

      baseMenus.push(contractMenu);
    }

    // 保险管理菜单 - 需要保险相关权限
    if (true || hasPermission('insurance:view') || hasPermission('insurance:create')) {
      const insuranceMenu: MenuRoute = {
        path: '/insurance',
        name: '保险管理',
        icon: <SafetyOutlined />,
        routes: [],
      };

      // 保单列表 - 需要保险查看权限
      if (true || hasPermission('insurance:view')) {
        insuranceMenu.routes!.push({
          path: '/insurance/list',
          name: '保单列表',
          icon: <UnorderedListOutlined />,
        });
      }

      // 新建投保 - 需要保险创建权限
      if (true || hasPermission('insurance:create')) {
        insuranceMenu.routes!.push({
          path: '/insurance/create',
          name: '新建投保',
          icon: <FileAddOutlined />,
        });
      }

      baseMenus.push(insuranceMenu);
    }

    // 视频面试菜单 - 所有用户可见
    const interviewMenu: MenuRoute = {
      path: '/interview',
      name: '视频面试',
      icon: <VideoCameraOutlined />,
      routes: [
        {
          path: '/interview/rooms',
          name: '面试间列表',
          icon: <UnorderedListOutlined />,
        },
        // 🔴 PC端面试菜单（已注释，使用小程序H5代替）
        // {
        //   path: '/interview/video',
        //   name: 'PC端面试',
        //   icon: <DesktopOutlined />,
        // },
        {
          path: '/interview/miniprogram',
          name: '小程序视频面试',
          icon: <QrcodeOutlined />,
        },
        {
          path: '/interview/miniprogram-config',
          name: '小程序配置',
          icon: <SettingOutlined />,
        },
      ],
    };
    baseMenus.push(interviewMenu);

    // 褓贝后台菜单 - 管理员和经理可见
    if (hasRole('admin') || hasRole('manager')) {
      const baobeiMenu: MenuRoute = {
        path: '/baobei',
        name: '褓贝后台',
        icon: <AppstoreOutlined />,
        routes: [
          {
            path: '/baobei/banner',
            name: 'Banner管理',
            icon: <PictureOutlined />,
          },
          {
            path: '/baobei/articles',
            name: '文章管理',
            icon: <FileTextOutlined />,
          },
          {
            path: '/baobei/miniprogram-users',
            name: '小程序用户管理',
            icon: <UserOutlined />,
          },
        ],
      };
      baseMenus.push(baobeiMenu);
    }

    // 用户管理菜单 - 仅管理员可见
    if (hasRole('admin')) {
      baseMenus.push({
        path: '/users',
        name: '员工管理',
        icon: <UserOutlined />,
        routes: [
          {
            path: '/users/list',
            name: '员工列表',
          },
          {
            path: '/users/create',
            name: '创建员工',
          }
        ],
      });

      // 系统设置菜单 - 仅管理员可见
      baseMenus.push({
        path: '/roles',
        name: '角色管理',
        icon: <SettingOutlined />,
        routes: [
          {
            path: '/roles/list',
            name: '角色列表',
          }
        ],
      });
    }

    return baseMenus;
  }, [hasPermission, hasRole]);

  // 用户下拉菜单项
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息',
      onClick: () => navigate('/profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '账户设置',
      onClick: () => navigate('/settings/account'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: async () => {
        try {
          await logout();
        } catch (error) {
          console.error('Logout failed:', error);
        }
      },
    },
  ];

  return (
    <ProLayout
      title="安得家政CRM"
      logo={null}
      location={location}
      route={{
        path: '/',
        routes: getAuthorizedMenus,
      }}
      menuItemRender={(item, dom) => {
        // 🎯 小程序视频面试在新标签页打开
        if (item.path === '/interview/miniprogram') {
          return (
            <a
              href={item.path}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.preventDefault();
                window.open(item.path, '_blank');
              }}
            >
              {dom}
            </a>
          );
        }

        // 占位菜单：先不跳转（后续可改为外链/同域名独立系统）
        if ((item as any)?.placeholder) {
          return (
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
              }}
            >
              {dom}
            </a>
          );
        }

        // 其他菜单项正常跳转
        return <Link to={item.path || '/'}>{dom}</Link>;
      }}
      menuProps={{
        style: { background: '#fff' }
      }}
      onMenuHeaderClick={() => navigate('/')}
      style={{
        height: '100vh',
        background: '#fff'
      }}
      siderWidth={220}
      layout="side"
      navTheme="light"
      fixedHeader
      fixSiderbar
      // 全局右侧内容区域：设置微边距（10px），统一所有业务页面的外圈留白
      contentStyle={{
        margin: 0,
        padding: 10,
      }}
      rightContentRender={() => (
        user && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Space size="large">
              {/* 用户菜单 */}
              <Dropdown
                menu={{ items: userMenuItems }}
                placement="bottomRight"
                trigger={['click']}  // 改为点击触发，而非悬停
                arrow
              >
                <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <Avatar
                    style={{ marginRight: 8, backgroundColor: '#5DBFB3' }}
                    icon={<UserOutlined />}
                  />
                  <span>{String(user?.name ?? user?.username ?? '')}</span>
                </div>
              </Dropdown>

              {/* 通知铃铛 */}
              <NotificationBell />
            </Space>
          </div>
        )
      )}
    >
      <Outlet />
    </ProLayout>
  );
};

export default BasicLayout;