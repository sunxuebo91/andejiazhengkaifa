import { ProLayout } from '@ant-design/pro-components';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import { DashboardOutlined, TeamOutlined, FileAddOutlined, UnorderedListOutlined, UserOutlined, SettingOutlined, LogoutOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { message, Avatar, Dropdown, MenuProps, App } from 'antd';
import { useMemo } from 'react';

const BasicLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, permissions, logout, hasRole, hasPermission } = useAuth();
  const { message } = App.useApp();

  // 根据用户权限过滤菜单
  const getAuthorizedMenus = useMemo(() => {
    // 基础菜单项 - 所有用户都可见
    const baseMenus = [
      {
        path: '/dashboard',
        name: '首页驾驶舱',
        icon: <DashboardOutlined />,
      }
    ];

    // 阿姨管理菜单 - 需要简历查看或创建权限
    if (hasPermission('resume:view') || hasPermission('resume:create')) {
      const resumeMenu = {
        path: '/aunt',
        name: '阿姨管理',
        icon: <TeamOutlined />,
        routes: [] as any[],
      };

      // 简历列表 - 需要简历查看权限
      if (hasPermission('resume:view')) {
        resumeMenu.routes.push({
          path: '/aunt/list',
          name: '简历列表',
          icon: <UnorderedListOutlined />,
        });
      }

      // 创建简历 - 需要简历创建权限
      if (hasPermission('resume:create')) {
        resumeMenu.routes.push({
          path: '/aunt/create-resume',
          name: '创建简历',
          icon: <FileAddOutlined />,
        });
      }

      baseMenus.push(resumeMenu);
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
          message.success('已退出登录');
        } catch (error) {
          message.error('退出登录失败');
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
                <span>{user.name || user.username}</span>
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