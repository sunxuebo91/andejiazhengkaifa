import { ProLayout } from '@ant-design/pro-components';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import { DashboardOutlined, TeamOutlined, FileAddOutlined, UnorderedListOutlined, UserOutlined, SettingOutlined, LogoutOutlined, ContactsOutlined, FileTextOutlined, VideoCameraOutlined, QrcodeOutlined, InboxOutlined, SwapOutlined, HistoryOutlined, SafetyOutlined, AppstoreOutlined, PictureOutlined, BookOutlined, FormOutlined, SearchOutlined, GiftOutlined, AuditOutlined, ProfileOutlined, SolutionOutlined, ShoppingOutlined } from '@ant-design/icons';
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

    // 阿姨管理菜单 - 需要简历查看或创建权限，或黑名单查看权限
    if (hasPermission('resume:view') || hasPermission('resume:create') || hasPermission('blacklist:view')) {
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

      // 阿姨黑名单 - 需要黑名单查看权限
      if (hasPermission('blacklist:view')) {
        resumeMenu.routes!.push({
          path: '/aunt/blacklist',
          name: '阿姨黑名单',
          icon: <SafetyOutlined />,
        });
      }

      baseMenus.push(resumeMenu);
    }

    // 客户管理菜单 - 需要客户相关权限  
    if (hasPermission('customer:view') || hasPermission('customer:create')) {
      const customerMenu: MenuRoute = {
        path: '/customers',
        name: '客户管理',
        icon: <ContactsOutlined />,
        routes: [],
      };

      // 客户列表 - 需要客户查看权限
      if (hasPermission('customer:view')) {
        customerMenu.routes!.push({
          path: '/customers/list',
          name: '客户列表',
          icon: <UnorderedListOutlined />,
        });
      }

      // 线索公海
      if (hasPermission('customer:view')) {
        customerMenu.routes!.push({
          path: '/customers/public-pool',
          name: '线索公海',
          icon: <InboxOutlined />,
        });
      }

      // 创建客户 - 需要客户创建权限
      if (hasPermission('customer:create')) {
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
    if (hasPermission('contract:view') || hasPermission('contract:create')) {
      const contractMenu: MenuRoute = {
        path: '/contracts',
        name: '合同管理',
        icon: <FileTextOutlined />,
        routes: [],
      };

      // 合同列表 - 需要合同查看权限
      if (hasPermission('contract:view')) {
        contractMenu.routes!.push({
          path: '/contracts/list',
          name: '合同列表',
          icon: <UnorderedListOutlined />,
        });
      }

      // 创建合同 - 需要合同创建权限
      if (hasPermission('contract:create')) {
        contractMenu.routes!.push({
          path: '/contracts/create',
          name: '创建合同',
          icon: <FileAddOutlined />,
        });
      }

      // 小程序合同 - 所有人可见
      contractMenu.routes!.push({
        path: '/contracts/miniprogram',
        name: '小程序合同',
        icon: <QrcodeOutlined />,
      });

      baseMenus.push(contractMenu);
    }

    // 保险管理菜单 - 需要保险相关权限
    if (hasPermission('insurance:view') || hasPermission('insurance:create')) {
      const insuranceMenu: MenuRoute = {
        path: '/insurance',
        name: '保险管理',
        icon: <SafetyOutlined />,
        routes: [],
      };

      // 保单列表 - 需要保险查看权限
      if (hasPermission('insurance:view')) {
        insuranceMenu.routes!.push({
          path: '/insurance/list',
          name: '保单列表',
          icon: <UnorderedListOutlined />,
        });
      }

      // 新建投保 - 需要保险创建权限
      if (hasPermission('insurance:create')) {
        insuranceMenu.routes!.push({
          path: '/insurance/create',
          name: '新建投保',
          icon: <FileAddOutlined />,
        });
      }

      baseMenus.push(insuranceMenu);
    }

    // 培训线索管理菜单 - 需要职培管理权限
    if (hasPermission('training-lead:view') || hasPermission('training-lead:create')) {
      const trainingLeadMenu: MenuRoute = {
        path: '/training-leads',
        name: '职培管理',
        icon: <BookOutlined />,
        routes: [
          {
            path: '/training-leads',
            name: '学员线索',
            icon: <UnorderedListOutlined />,
          },
          {
            path: '/training-leads/public-pool',
            name: '学员线索公海',
            icon: <InboxOutlined />,
          },
          {
            path: '/forms/submissions',
            name: '表单列表',
            icon: <UnorderedListOutlined />,
          },
          {
            path: '/forms',
            name: '表单管理',
            icon: <FormOutlined />,
          },
        ],
      };

      trainingLeadMenu.routes!.push({
        path: '/training-leads/transfer-rules',
        name: '线索流转规则',
        icon: <SwapOutlined />,
      });

      baseMenus.push(trainingLeadMenu);
    }

    // 职培订单菜单 - 所有登录用户可见
    const trainingOrderMenu: MenuRoute = {
      path: '/training-orders',
      name: '职培订单',
      icon: <ShoppingOutlined />,
      routes: [
        {
          path: '/training-orders/create',
          name: '创建订单',
          icon: <FileAddOutlined />,
        },
        {
          path: '/training-orders/list',
          name: '订单列表',
          icon: <UnorderedListOutlined />,
        },
      ],
    };
    baseMenus.push(trainingOrderMenu);

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

    // 背调管理菜单
    if (hasPermission('background-check:view')) {
      baseMenus.push({
        path: '/background-check',
        name: '背调管理',
        icon: <SearchOutlined />,
      });
    }

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

    // 推荐返费系统菜单（管理员/运营看全部，员工看自己名下）
    {
      const referralMenu: MenuRoute = {
        path: '/referral',
        name: '推荐管理',
        icon: <GiftOutlined />,
        routes: [
          { path: '/referral/resume-review', name: '推荐简历审核', icon: <AuditOutlined /> },
          { path: '/referral/referrers', name: '推荐人列表', icon: <SolutionOutlined /> },
          { path: '/referral/manage', name: '全量推荐管理', icon: <UnorderedListOutlined /> },
        ],
      };
      baseMenus.push(referralMenu);
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
