import { ProLayout } from '@ant-design/pro-components';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import { DashboardOutlined, TeamOutlined, FileAddOutlined, UnorderedListOutlined, UserOutlined, SettingOutlined, LogoutOutlined, ContactsOutlined, FileTextOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { Avatar, Dropdown, MenuProps } from 'antd';
import { useMemo } from 'react';

// 定义菜单项类型
interface MenuRoute {
  path: string;
  name: string;
  icon?: React.ReactNode;
  routes?: MenuRoute[];
}

const BasicLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasRole, hasPermission } = useAuth();

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

      // 创建客户 - 需要客户创建权限
      if (true || hasPermission('customer:create')) {
        customerMenu.routes!.push({
          path: '/customers/create',
          name: '创建客户',
          icon: <FileAddOutlined />,
        });
      }

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

    // 视频面试菜单 - 所有用户可见
    baseMenus.push({
      path: '/interview/video',
      name: '视频面试',
      icon: <VideoCameraOutlined />,
    });

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
      menuItemRender={(item, dom) => (
        <Link to={item.path || '/'}>{dom}</Link>
      )}
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
      rightContentRender={() => (
        user && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Dropdown 
              menu={{ items: userMenuItems }}
              placement="bottomRight" 
              trigger={['click']}  // 改为点击触发，而非悬停
              arrow
            >
              <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <Avatar
                  style={{ marginRight: 8, backgroundColor: '#1890ff' }}
                  icon={<UserOutlined />}
                />
                <span>{String(user?.name ?? user?.username ?? '')}</span>
              </div>
            </Dropdown>
          </div>
        )
      )}
    >
      <Outlet />
    </ProLayout>
  );
};

export default BasicLayout;