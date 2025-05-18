// 测试数据创建脚本
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

// 连接信息
const uri = `mongodb://${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '27017'}`;
const dbName = process.env.DB_NAME || 'housekeeping';

async function createTestData() {
  console.log('开始创建测试数据...');
  let client;
  
  try {
    // 连接到MongoDB
    client = new MongoClient(uri);
    await client.connect();
    console.log('成功连接到MongoDB');
    
    const db = client.db(dbName);
    const resumesCollection = db.collection('resumes');
    
    // 创建示例简历数据
    const sampleResumes = [
      {
        id: new ObjectId().toString(),
        name: '张三',
        phone: '13800138001',
        age: 28,
        wechat: 'zhangsan123',
        idNumber: '440103199201010101',
        education: '高中',
        nativePlace: '广东省广州市',
        experienceYears: 3,
        maritalStatus: '已婚',
        religion: '',
        currentAddress: '广东省广州市天河区天河路123号',
        hukouAddress: '广东省广州市白云区',
        birthDate: '1992-01-01',
        ethnicity: '汉族',
        gender: '男',
        zodiac: '猴',
        zodiacSign: '摩羯座',
        jobType: '住家保姆',
        expectedSalary: 6000,
        serviceArea: '广州市',
        orderStatus: '待分配',
        skills: ['烹饪', '保洁', '照顾老人'],
        leadSource: '微信推广',
        workExperience: [
          { 
            startDate: '2018-01-01', 
            endDate: '2020-01-01', 
            description: '在广州市某家政公司担任保姆，负责日常家务和老人照顾'
          },
          { 
            startDate: '2020-02-01', 
            endDate: '2022-01-01', 
            description: '在深圳市某家庭担任住家保姆，负责全家四口的日常生活照料'
          }
        ],
        idCardFrontUrl: 'https://example.com/id-card-front.jpg',
        idCardBackUrl: 'https://example.com/id-card-back.jpg',
        photoUrls: ['https://example.com/photo1.jpg'],
        certificateUrls: ['https://example.com/certificate1.jpg'],
        medicalReportUrls: ['https://example.com/medical1.jpg'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: new ObjectId().toString(),
        name: '李四',
        phone: '13800138002',
        age: 35,
        wechat: 'lisi456',
        idNumber: '440103198501010102',
        education: '初中',
        nativePlace: '湖南省长沙市',
        experienceYears: 5,
        maritalStatus: '已婚',
        religion: '',
        currentAddress: '广东省广州市海珠区滨江路456号',
        hukouAddress: '湖南省长沙市',
        birthDate: '1985-01-01',
        ethnicity: '汉族',
        gender: '女',
        zodiac: '牛',
        zodiacSign: '摩羯座',
        jobType: '月嫂',
        expectedSalary: 8000,
        serviceArea: '广州市',
        orderStatus: '待分配',
        skills: ['产妇护理', '新生儿护理', '月子餐制作'],
        leadSource: '朋友介绍',
        workExperience: [
          { 
            startDate: '2017-01-01', 
            endDate: '2022-01-01', 
            description: '在广州市某月子中心担任月嫂，已服务超过30位产妇'
          }
        ],
        idCardFrontUrl: 'https://example.com/id-card-front2.jpg',
        idCardBackUrl: 'https://example.com/id-card-back2.jpg',
        photoUrls: ['https://example.com/photo2.jpg'],
        certificateUrls: ['https://example.com/certificate2.jpg'],
        medicalReportUrls: ['https://example.com/medical2.jpg'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: new ObjectId().toString(),
        name: '王五',
        phone: '13800138003',
        age: 42,
        wechat: 'wangwu789',
        idNumber: '440103198001010103',
        education: '高中',
        nativePlace: '广西壮族自治区南宁市',
        experienceYears: 8,
        maritalStatus: '已婚',
        religion: '',
        currentAddress: '广东省广州市番禺区市桥大道789号',
        hukouAddress: '广西南宁市',
        birthDate: '1980-01-01',
        ethnicity: '壮族',
        gender: '女',
        zodiac: '猴',
        zodiacSign: '摩羯座',
        jobType: '保姆',
        expectedSalary: 5500,
        serviceArea: '广州市',
        orderStatus: '已分配',
        skills: ['烹饪', '保洁', '照顾儿童'],
        leadSource: '网站注册',
        workExperience: [
          { 
            startDate: '2014-01-01', 
            endDate: '2023-01-01', 
            description: '在多个家庭担任保姆，擅长照顾儿童和做家务'
          }
        ],
        idCardFrontUrl: 'https://example.com/id-card-front3.jpg',
        idCardBackUrl: 'https://example.com/id-card-back3.jpg',
        photoUrls: ['https://example.com/photo3.jpg'],
        certificateUrls: ['https://example.com/certificate3.jpg'],
        medicalReportUrls: ['https://example.com/medical3.jpg'],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    // 检查已有数据数量
    const existingCount = await resumesCollection.countDocuments();
    console.log(`当前resumes集合中有 ${existingCount} 条记录`);
    
    if (existingCount < 3) {
      // 插入示例数据
      const result = await resumesCollection.insertMany(sampleResumes);
      console.log(`成功插入 ${result.insertedCount} 条测试数据`);
    } else {
      console.log('已存在足够的测试数据，跳过创建步骤');
    }
    
    // 查询并打印当前数据
    const allResumes = await resumesCollection.find({}).toArray();
    console.log(`当前共有 ${allResumes.length} 条简历记录`);
    console.log('简历ID列表:');
    allResumes.forEach((resume, index) => {
      console.log(`[${index}] ${resume.name}: ${resume.id}`);
    });
    
    console.log('测试数据创建完成');
  } catch (err) {
    console.error('创建测试数据时出错:', err);
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB连接已关闭');
    }
  }
}

// 执行创建
createTestData().catch(console.error); 