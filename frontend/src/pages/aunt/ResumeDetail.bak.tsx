import { PageContainer } from '@ant-design/pro-components';
import { Card, Descriptions, Button, Spin, message, Image, Tag, Modal, Form, Input, Select, DatePicker } from 'antd';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { EditOutlined, SaveOutlined, ArrowLeftOutlined, FilePdfOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
// 添加dayjs插件
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import customParseFormat from 'dayjs/plugin/customParseFormat';

// 注册插件
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(customParseFormat);

const { Option } = Select;

// 教育程度映射
const educationMap = {
  no: '无学历',
  primary: '小学',
  middle: '初中',
  secondary: '中专',
  vocational: '职高',
  high: '高中',
  college: '大专',
  bachelor: '本科',
  graduate: '研究生及以上'
};

// 婚姻状况映射
const maritalStatusMap = {
  single: '未婚',
  married: '已婚',
  divorced: '离异',
  widowed: '丧偶'
};

// 宗教信仰映射
const religionMap = {
  none: '无',
  buddhism: '佛教',
  christianity: '基督教',
  islam: '伊斯兰教',
  catholicism: '天主教',
  hinduism: '印度教',
  taoism: '道教',
  protestantism: '新教',
  orthodoxy: '东正教'
};

// 性别映射
const genderMap = {
  male: '男',
  female: '女'
};

// 生肖映射
const zodiacMap = {
  rat: '鼠',
  ox: '牛',
  tiger: '虎',
  rabbit: '兔',
  dragon: '龙',
  snake: '蛇',
  horse: '马',
  goat: '羊',
  monkey: '猴',
  rooster: '鸡',
  dog: '狗',
  pig: '猪'
};

// 星座映射
const zodiacSignMap = {
  capricorn: '摩羯座',
  aquarius: '水瓶座',
  pisces: '双鱼座',
  aries: '白羊座',
  taurus: '金牛座',
  gemini: '双子座',
  cancer: '巨蟹座',
  leo: '狮子座',
  virgo: '处女座',
  libra: '天秤座',
  scorpio: '天蝎座',
  sagittarius: '射手座'
};

// 工种映射
const jobTypeMap = {
  yuexin: '月嫂',
  'zhujia-yuer': '住家育儿嫂',
  'baiban-yuer': '白班育儿',
  baojie: '保洁',
  'baiban-baomu': '白班保姆',
  'zhujia-baomu': '住家保姆',
  yangchong: '养宠',
  xiaoshi: '小时工'
};

// 接单状态映射
const orderStatusMap = {
  accepting: '想接单',
  'not-accepting': '不接单',
  'on-service': '已上户'
};

// 技能标签映射
const skillsMap = {
  chanhou: '产后修复',
  'teshu-yinger': '特殊婴儿护理',
  yiliaobackground: '医疗背景',
  yuying: '育婴师',
  zaojiao: '早教',
  fushi: '辅食',
  ertui: '儿推',
  waiyu: '外语',
  zhongcan: '中餐',
  xican: '西餐',
  mianshi: '面食',
  jiashi: '驾驶',
  shouyi: '整理收纳'
};

// 线索来源映射
const leadSourceMap = {
  referral: '转介绍',
  'paid-lead': '付费线索',
  community: '社群线索',
  'door-to-door': '地推',
  'shared-order': '合单',
  other: '其他'
};

const ResumeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [resume, setResume] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [form] = Form.useForm();

  // 获取简历详情
  const fetchResumeDetail = async () => {
    setLoading(true);
    try {
      console.log('正在获取简历详情，ID:', id);
      // 使用相对路径，让Vite代理处理
      const response = await axios.get(`/api/resumes/${id}`);
      console.log('原始API响应:', response);
      
      // 确保简历ID是8位数字
      const formattedId = id && id.length === 24 ? 
        parseInt(id.substring(id.length - 8), 16).toString().padStart(8, '0') : 
        '00000000';
      
      // 检查响应是否包含错误消息
      if (response.data && response.data.message) {
        console.warn('API返回错误消息:', response.data.message);
        message.warning(response.data.message || '获取简历数据失败');
        
        // 如果数据包含错误消息，但仍需显示基本信息
        const emptyResumeData = {
          formattedId,
          id,
          name: '(未找到简历数据)',
          phone: '未找到',
          workExperience: []
        };
        setResume(emptyResumeData);
        return;
      }
      
      // 检查返回的数据是否为空对象或只包含有限字段
      if (!response.data || Object.keys(response.data).length <= 2) {
        console.warn('API返回的数据不完整:', response.data);
        message.warning('获取到的简历数据不完整，请确认该简历ID是否有效');
        
        // 如果数据为空，但需要显示一些基本信息
        const emptyResumeData = {
          formattedId,
          id,
          name: '(数据不完整)',
          phone: '未找到',
          workExperience: []
        };
        setResume(emptyResumeData);
        return;
      }
      
      // 获取返回的简历数据
      const resumeData = response.data;
      
      // 确保简历对象有工作经验字段
      if (!resumeData.workExperience) {
        resumeData.workExperience = [];
      }
      
      // 确保工作经验包含正确的日期格式
      const formattedWorkExperience = resumeData.workExperience?.map(exp => {
        return {
          ...exp,
          // 确保有效的日期并处理空值情况
          startDate: exp.startDate && typeof exp.startDate === 'string' && exp.startDate.trim() !== '' 
            ? dayjs(exp.startDate) 
            : undefined,
          endDate: exp.endDate && typeof exp.endDate === 'string' && exp.endDate.trim() !== '' 
            ? dayjs(exp.endDate) 
            : undefined,
        };
      }) || [];

      // 使用更新后的工作经验数据
      resumeData.workExperience = formattedWorkExperience;
      
      // 显示处理后的数据
      console.log('处理后的简历数据:', resumeData);
      
      // 更新状态并设置表单初始值
      setResume({
        ...resumeData
      });
      form.setFieldsValue({
        ...resumeData
      });
    } catch (error) {
      console.error('获取简历详情失败:', error);
      if (error.response) {
        console.error('错误响应:', error.response.status, error.response.data);
        message.error(`获取简历详情失败: ${error.response.status} - ${error.response.data.message || '未知错误'}`);
      } else if (error.request) {
        console.error('请求未得到响应:', error.request);
        message.error('获取简历详情失败: 服务器未响应');
      } else {
        console.error('请求配置错误:', error.message);
        message.error(`获取简历详情失败: ${error.message}`);
      }
      
      // 设置一个空的简历对象，避免UI显示错误
      setResume({
        formattedId: id && id.length === 24 ? 
          parseInt(id.substring(id.length - 8), 16).toString().padStart(8, '0') : 
          '00000000',
        workExperience: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchResumeDetail();
    }
  }, [id]);

  // 处理编辑
  const handleEdit = () => {
    setIsEditing(true);
    setEditModalVisible(true);
    form.setFieldsValue({
      ...resume,
      birthDate: resume.birthDate ? dayjs(resume.birthDate) : undefined,
      // 如果有workExperience，确保日期字段正确格式化
      workExperience: resume.workExperience ? resume.workExperience.map((exp: any) => ({
        ...exp,
        startDate: exp.startDate ? dayjs(exp.startDate) : undefined,
        endDate: exp.endDate ? dayjs(exp.endDate) : undefined,
      })) : []
    });
  };

  // 处理保存
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      console.log('验证通过，表单数据:', values);
      
      // 准备提交数据：处理日期字段
      const formData = {
        ...values,
        // 处理工作经验的日期格式化
        workExperience: values.workExperience?.map(item => ({
          ...item,
          startDate: item.startDate ? item.startDate.format('YYYY-MM') : '',
          endDate: item.endDate ? item.endDate.format('YYYY-MM') : '',
        })) || [],
      };
      
      // 提交更新的简历数据
      await axios.put(`/api/resumes/${id}`, formData);
      message.success('简历更新成功');
      
      // 刷新数据
      fetchResumeDetail();
      setIsEditing(false);
    } catch (error) {
      console.error('保存失败:', error);
      message.error('保存失败，请检查表单填写是否正确');
    }
  };

  // 处理取消编辑
  const handleCancel = () => {
    setIsEditing(false);
    setEditModalVisible(false);
    form.resetFields();
  };

  // 处理图片预览
  const handlePreview = (url: string) => {
    setPreviewImage(url);
    setPreviewVisible(true);
  };

  // 渲染文件预览
  const renderFilePreview = (url: string, index: number) => {
    if (!url) return null;

    console.log(`渲染文件预览，URL: ${url}, 索引: ${index}`);
    const isPdf = url.toLowerCase().endsWith('.pdf');
    
    return (
      <div key={index} style={{ display: 'inline-block', margin: '0 8px 8px 0' }}>
        {isPdf ? (
          <div style={{ 
            width: 100, 
            height: 100, 
            border: '1px solid #d9d9d9', 
            borderRadius: 2, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            background: '#f5f5f5'
          }}>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <FilePdfOutlined style={{ fontSize: 32, color: '#ff4d4f' }} />
            </a>
          </div>
        ) : (
          <div style={{ 
            width: 100, 
            height: 100, 
            border: '1px solid #d9d9d9', 
            borderRadius: 2, 
            overflow: 'hidden',
            position: 'relative'
          }}>
            <img 
              src={url} 
              alt={`文件 ${index}`} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
            <div 
              style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                width: '100%', 
                height: '100%', 
                background: 'rgba(0, 0, 0, 0.5)', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                opacity: 0,
                transition: 'opacity 0.3s',
                cursor: 'pointer'
              }}
              onClick={() => handlePreview(url)}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
            >
              <EyeOutlined style={{ color: '#fff', fontSize: 24 }} />
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <PageContainer
        header={{
          title: '简历详情',
          breadcrumb: {
            routes: [
              { path: '/aunt/resume-list', breadcrumbName: '阿姨简历库' },
              { breadcrumbName: '简历详情' },
            ],
          },
          extra: [
            <Button 
              key="back" 
              icon={<ArrowLeftOutlined />} 
              onClick={() => navigate('/aunt/resume-list')}
            >
              返回列表
            </Button>,
            !isEditing ? (
              <Button 
                key="edit" 
                type="primary" 
                icon={<EditOutlined />} 
                onClick={() => setIsEditing(true)}
              >
                编辑
              </Button>
            ) : (
              <Button 
                key="save" 
                type="primary" 
                icon={<SaveOutlined />} 
                onClick={handleSave}
              >
                保存
              </Button>
            )
          ],
        }}
      >
        <div className="loading-container" style={{ textAlign: 'center', padding: '50px' }}>
          <Spin tip="加载中..." size="large" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      header={{
        title: '简历详情',
        breadcrumb: {
          routes: [
            { path: '/aunt/resume-list', breadcrumbName: '阿姨简历库' },
            { breadcrumbName: '简历详情' },
          ],
        },
        extra: [
          <Button 
            key="back" 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/aunt/resume-list')}
          >
            返回列表
          </Button>,
          !isEditing ? (
            <Button 
              key="edit" 
              type="primary" 
              icon={<EditOutlined />} 
              onClick={() => setIsEditing(true)}
            >
              编辑
            </Button>
          ) : (
            <Button 
              key="save" 
              type="primary" 
              icon={<SaveOutlined />} 
              onClick={handleSave}
            >
              保存
            </Button>
          )
        ],
      }}
    >
      <Card title="基本信息" style={{ marginBottom: 24 }}>
        <Descriptions bordered column={3}>
          <Descriptions.Item label="简历ID">{resume?.formattedId || '-'}</Descriptions.Item>
          <Descriptions.Item label="姓名">{resume?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="年龄">{resume?.age || '-'}</Descriptions.Item>
          <Descriptions.Item label="手机号">{resume?.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="微信号">{resume?.wechat || '-'}</Descriptions.Item>
          <Descriptions.Item label="身份证号">{resume?.idNumber || '-'}</Descriptions.Item>
          <Descriptions.Item label="学历">{resume?.education ? educationMap[resume.education] : '-'}</Descriptions.Item>
          <Descriptions.Item label="婚姻状况">{resume?.maritalStatus ? maritalStatusMap[resume.maritalStatus] : '-'}</Descriptions.Item>
          <Descriptions.Item label="宗教信仰">{resume?.religion ? religionMap[resume.religion] : '-'}</Descriptions.Item>
          <Descriptions.Item label="现居住地址">{resume?.currentAddress || '-'}</Descriptions.Item>
          <Descriptions.Item label="籍贯">{resume?.nativePlace || '-'}</Descriptions.Item>
          <Descriptions.Item label="户籍地址">{resume?.hukouAddress || '-'}</Descriptions.Item>
          <Descriptions.Item label="生日">{resume?.birthDate || '-'}</Descriptions.Item>
          <Descriptions.Item label="民族">{resume?.ethnicity || '-'}</Descriptions.Item>
          <Descriptions.Item label="性别">{resume?.gender ? genderMap[resume.gender] : '-'}</Descriptions.Item>
          <Descriptions.Item label="生肖">{resume?.zodiac ? zodiacMap[resume.zodiac] : '-'}</Descriptions.Item>
          <Descriptions.Item label="星座">{resume?.zodiacSign ? zodiacSignMap[resume.zodiacSign] : '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="工作信息" style={{ marginBottom: 24 }}>
        <Descriptions bordered column={3}>
          <Descriptions.Item label="工种">{resume?.jobType ? jobTypeMap[resume.jobType] : '-'}</Descriptions.Item>
          <Descriptions.Item label="期望薪资">
            {resume?.expectedSalary ? `¥ ${resume.expectedSalary}` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="接单地址">{resume?.serviceArea || '-'}</Descriptions.Item>
          <Descriptions.Item label="接单状态">
            {resume?.orderStatus ? (
              <Tag color={orderStatusMap[resume.orderStatus]?.color || 'default'}>
                {orderStatusMap[resume.orderStatus]?.text || resume.orderStatus}
              </Tag>
            ) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="工作经验">
            {resume?.experienceYears ? `${resume.experienceYears}年` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="线索来源">
            {resume?.leadSource ? leadSourceMap[resume.leadSource] : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="技能标签" span={3}>
            {resume?.skills?.length > 0 ? (
              resume.skills.map((skill: string) => (
                <Tag key={skill}>{skillsMap[skill] || skill}</Tag>
              ))
            ) : '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 工作经历展示区 */}
      <Card title="工作经历" style={{ marginBottom: 24 }}>
        {resume?.workExperience?.length > 0 ? (
          resume.workExperience.map((exp: any, index: number) => (
            <Card 
              key={index} 
              type="inner" 
              title={`工作经历 ${index + 1}`} 
              style={{ marginBottom: 16 }}
            >
              <Descriptions bordered column={2}>
                <Descriptions.Item label="开始时间">{exp.startDate || '-'}</Descriptions.Item>
                <Descriptions.Item label="结束时间">{exp.endDate || '-'}</Descriptions.Item>
                <Descriptions.Item label="工作简介" span={2}>
                  {exp.description || '-'}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>暂无工作经历</div>
        )}
      </Card>

      <Card title="身份证照片" style={{ marginBottom: 24 }}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="身份证正面" span={1}>
            {resume?.idCardFrontUrl ? renderFilePreview(resume.idCardFrontUrl, 1) : '未上传'}
          </Descriptions.Item>
          <Descriptions.Item label="身份证反面" span={1}>
            {resume?.idCardBackUrl ? renderFilePreview(resume.idCardBackUrl, 2) : '未上传'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="个人照片" style={{ marginBottom: 24 }}>
        {resume?.photoUrls?.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {resume.photoUrls.map((url: string, index: number) => renderFilePreview(url, index))}
          </div>
        ) : (
          '未上传'
        )}
      </Card>

      <Card title="证书照片" style={{ marginBottom: 24 }}>
        {resume?.certificateUrls?.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {resume.certificateUrls.map((url: string, index: number) => renderFilePreview(url, index))}
          </div>
        ) : (
          '未上传'
        )}
      </Card>

      <Card title="体检报告" style={{ marginBottom: 24 }}>
        {resume?.medicalReportUrls?.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {resume.medicalReportUrls.map((url: string, index: number) => renderFilePreview(url, index))}
          </div>
        ) : (
          '未上传'
        )}
      </Card>

      <Modal
        open={previewVisible}
        title={previewImage ? '图片预览' : ''}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
      >
        <img alt="预览" style={{ width: '100%' }} src={previewImage} />
      </Modal>

      <Modal
        title="编辑简历"
        open={editModalVisible}
        onOk={handleSave}
        onCancel={handleCancel}
        width={800}
        footer={[
          <Button key="back" onClick={handleCancel}>
            取消
          </Button>,
          <Button key="submit" type="primary" icon={<SaveOutlined />} onClick={handleSave}>
            保存
          </Button>,
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={resume}
        >
          <h3>基本信息</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
              <Input placeholder="请输入姓名" />
            </Form.Item>
            <Form.Item name="age" label="年龄" rules={[{ required: true, message: '请输入年龄' }]}>
              <Input type="number" placeholder="请输入年龄" />
            </Form.Item>
            <Form.Item name="phone" label="手机号" rules={[{ required: true, message: '请输入手机号' }]}>
              <Input placeholder="请输入手机号" />
            </Form.Item>
            <Form.Item name="wechat" label="微信号">
              <Input placeholder="请输入微信号" />
            </Form.Item>
            <Form.Item name="idNumber" label="身份证号">
              <Input placeholder="请输入身份证号" />
            </Form.Item>
            <Form.Item name="education" label="学历" rules={[{ required: true, message: '请选择学历' }]}>
              <Select placeholder="请选择学历">
                <Option value="no">无学历</Option>
                <Option value="primary">小学</Option>
                <Option value="middle">初中</Option>
                <Option value="secondary">中专</Option>
                <Option value="vocational">职高</Option>
                <Option value="high">高中</Option>
                <Option value="college">大专</Option>
                <Option value="bachelor">本科</Option>
                <Option value="graduate">研究生及以上</Option>
              </Select>
            </Form.Item>
            <Form.Item name="maritalStatus" label="婚姻状况">
              <Select placeholder="请选择婚姻状况">
                <Option value="single">未婚</Option>
                <Option value="married">已婚</Option>
                <Option value="divorced">离异</Option>
                <Option value="widowed">丧偶</Option>
              </Select>
            </Form.Item>
            <Form.Item name="religion" label="宗教信仰">
              <Select placeholder="请选择宗教信仰">
                <Option value="none">无</Option>
                <Option value="buddhism">佛教</Option>
                <Option value="christianity">基督教</Option>
                <Option value="islam">伊斯兰教</Option>
                <Option value="catholicism">天主教</Option>
                <Option value="hinduism">印度教</Option>
                <Option value="taoism">道教</Option>
                <Option value="protestantism">新教</Option>
                <Option value="orthodoxy">东正教</Option>
              </Select>
            </Form.Item>
            <Form.Item name="currentAddress" label="现居住地址">
              <Input placeholder="请输入现居住地址" />
            </Form.Item>
            <Form.Item name="nativePlace" label="籍贯" rules={[{ required: true, message: '请输入籍贯' }]}>
              <Input placeholder="请输入籍贯" />
            </Form.Item>
            <Form.Item name="hukouAddress" label="户籍地址">
              <Input placeholder="请输入户籍地址" />
            </Form.Item>
            <Form.Item name="birthDate" label="生日">
              <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="ethnicity" label="民族">
              <Input placeholder="请输入民族" />
            </Form.Item>
            <Form.Item name="gender" label="性别">
              <Select placeholder="请选择性别">
                <Option value="male">男</Option>
                <Option value="female">女</Option>
              </Select>
            </Form.Item>
            <Form.Item name="zodiac" label="生肖">
              <Select placeholder="请选择生肖">
                <Option value="rat">鼠</Option>
                <Option value="ox">牛</Option>
                <Option value="tiger">虎</Option>
                <Option value="rabbit">兔</Option>
                <Option value="dragon">龙</Option>
                <Option value="snake">蛇</Option>
                <Option value="horse">马</Option>
                <Option value="goat">羊</Option>
                <Option value="monkey">猴</Option>
                <Option value="rooster">鸡</Option>
                <Option value="dog">狗</Option>
                <Option value="pig">猪</Option>
              </Select>
            </Form.Item>
            <Form.Item name="zodiacSign" label="星座">
              <Select placeholder="请选择星座">
                <Option value="capricorn">摩羯座</Option>
                <Option value="aquarius">水瓶座</Option>
                <Option value="pisces">双鱼座</Option>
                <Option value="aries">白羊座</Option>
                <Option value="taurus">金牛座</Option>
                <Option value="gemini">双子座</Option>
                <Option value="cancer">巨蟹座</Option>
                <Option value="leo">狮子座</Option>
                <Option value="virgo">处女座</Option>
                <Option value="libra">天秤座</Option>
                <Option value="scorpio">天蝎座</Option>
                <Option value="sagittarius">射手座</Option>
              </Select>
            </Form.Item>
          </div>
          
          <h3 style={{ marginTop: 24 }}>工作信息</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item name="jobType" label="工种" rules={[{ required: true, message: '请选择工种' }]}>
              <Select placeholder="请选择工种">
                <Option value="yuexin">月嫂</Option>
                <Option value="zhujia-yuer">住家育儿嫂</Option>
                <Option value="baiban-yuer">白班育儿</Option>
                <Option value="baojie">保洁</Option>
                <Option value="baiban-baomu">白班保姆</Option>
                <Option value="zhujia-baomu">住家保姆</Option>
                <Option value="yangchong">养宠</Option>
                <Option value="xiaoshi">小时工</Option>
              </Select>
            </Form.Item>
            <Form.Item name="expectedSalary" label="期望薪资" rules={[{ required: true, message: '请输入期望薪资' }]}>
              <Input type="number" placeholder="请输入期望薪资" />
            </Form.Item>
            <Form.Item name="serviceArea" label="接单地址">
              <Input placeholder="请输入接单地址" />
            </Form.Item>
            <Form.Item name="orderStatus" label="接单状态">
              <Select placeholder="请选择接单状态">
                <Option value="accepting">想接单</Option>
                <Option value="not-accepting">不接单</Option>
                <Option value="on-service">已上户</Option>
              </Select>
            </Form.Item>
            <Form.Item name="experienceYears" label="工作经验（年）" rules={[{ required: true, message: '请输入工作经验年数' }]}>
              <Input type="number" placeholder="请输入工作经验年数" />
            </Form.Item>
            <Form.Item name="leadSource" label="线索来源">
              <Select placeholder="请选择线索来源">
                <Option value="referral">转介绍</Option>
                <Option value="paid-lead">付费线索</Option>
                <Option value="community">社群线索</Option>
                <Option value="door-to-door">地推</Option>
                <Option value="shared-order">合单</Option>
                <Option value="other">其他</Option>
              </Select>
            </Form.Item>
            <Form.Item name="skills" label="技能标签" style={{ gridColumn: 'span 2' }}>
              <Select mode="multiple" placeholder="请选择技能标签">
                <Option value="chanhou">产后修复</Option>
                <Option value="teshu-yinger">特殊婴儿护理</Option>
                <Option value="yiliaobackground">医疗背景</Option>
                <Option value="yuying">育婴师</Option>
                <Option value="zaojiao">早教</Option>
                <Option value="fushi">辅食</Option>
                <Option value="ertui">儿推</Option>
                <Option value="waiyu">外语</Option>
                <Option value="zhongcan">中餐</Option>
                <Option value="xican">西餐</Option>
                <Option value="mianshi">面食</Option>
                <Option value="jiashi">驾驶</Option>
                <Option value="shouyi">整理收纳</Option>
              </Select>
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default ResumeDetail; 