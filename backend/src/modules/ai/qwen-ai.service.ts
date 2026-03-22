import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

// 简历解析结果接口 - 与系统 Resume 实体字段对齐
export interface ParsedResume {
  // 基本信息
  name?: string;
  age?: number;
  gender?: 'male' | 'female';
  height?: number;      // 身高(cm)
  weight?: number;      // 体重(斤)
  nativePlace?: string; // 籍贯省份（如"湖南"）
  ethnicity?: string;   // 民族

  // 学历 - 对应系统枚举
  education?: 'no' | 'primary' | 'middle' | 'secondary' | 'vocational' | 'high' | 'college' | 'bachelor' | 'graduate';

  // 婚姻状况 - 对应系统枚举
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed';

  // 生肖（中国十二属相）- 对应系统枚举
  zodiac?: 'rat' | 'ox' | 'tiger' | 'rabbit' | 'dragon' | 'snake' | 'horse' | 'goat' | 'monkey' | 'rooster' | 'dog' | 'pig';

  // 西方星座 - 对应系统枚举（字段名改为 constellation）
  constellation?: 'aries' | 'taurus' | 'gemini' | 'cancer' | 'leo' | 'virgo' | 'libra' | 'scorpio' | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces';

  // 宗教信仰 - 对应系统枚举
  religion?: 'none' | 'buddhism' | 'taoism' | 'christianity' | 'islam';

  // 工作类型 - 对应系统枚举
  jobType?: 'yuesao' | 'zhujia-yuer' | 'baiban-yuer' | 'baojie' | 'baiban-baomu' | 'zhujia-baomu' | 'yangchong' | 'xiaoshi' | 'zhujia-hulao';

  // 技能证书 - 对应系统枚举
  skills?: Array<'muying' | 'cuiru' | 'yuezican' | 'chanhou' | 'yuying' | 'zaojiao' | 'fushi' | 'ertui' | 'zhongcan' | 'xican' | 'mianshi' | 'jiashi' | 'shouyi' | 'waiyu' | 'yingyang' | 'teshu-yinger' | 'yiliaobackground' | 'shuangtai-huli' | 'yanglao-huli' | 'liliao-kangfu'>;

  // 联系方式
  phone?: string;

  // 工作经验
  experienceYears?: number; // 工作年限
  workExperiences?: Array<{
    startDate?: string;   // 格式: YYYY-MM
    endDate?: string;     // 格式: YYYY-MM
    description?: string; // 工作内容
    district?: string;    // 区域
  }>;

  // 期望薪资
  expectedSalary?: number;

  // 证书（文字描述）
  certificatesText?: string;

  // 自我介绍
  selfIntroduction?: string;

  // 家庭情况
  familySituation?: string;
}

// 客户解析结果接口
export interface ParsedCustomer {
  name?: string;           // 客户姓名
  phone?: string;          // 电话
  wechatId?: string;       // 微信号
  address?: string;        // 地址
  serviceCategory?: string; // 服务类别（中文：育儿嫂、月嫂、保姆等）
  leadSource?: string;     // 来源（美团/抖音/小红书/转介绍等）
  expectedStartDate?: string; // 期望上户时间 YYYY-MM-DD
  salaryBudget?: string;   // 薪资预算（如"8000-10000"）
  remarks?: string;        // 备注
}

// 通义千问 API 响应
interface QwenResponse {
  choices: Array<{
    message: {
      content: string;
      reasoning_content?: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

@Injectable()
export class QwenAIService {
  private readonly logger = new Logger(QwenAIService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  private readonly model = 'qwen3.5-flash';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('QWEN_API_KEY', '');
  }

  /**
   * 检查 API 是否配置
   */
  isConfigured(): boolean {
    return !!(this.apiKey && this.apiKey.startsWith('sk-'));
  }

  /**
   * 解析简历文本
   */
  async parseResume(resumeText: string): Promise<ParsedResume> {
    if (!this.isConfigured()) {
      this.logger.warn('通义千问 API 未配置');
      throw new Error('AI 服务未配置');
    }

    try {
      const systemPrompt = `你是家政公司CRM系统的简历解析助手。请从简历文本中提取信息，返回符合系统字段定义的JSON。

【重要】只返回纯JSON，不要markdown代码块，不要解释文字。

【字段映射规则】

1. gender（性别）: "female"=女, "male"=男

2. education（学历）必须是以下之一，⚠️简历中没有明确写学历信息则返回空字符串"":
   - "no"=无/文盲, "primary"=小学, "middle"=初中, "high"=高中
   - "secondary"=中专, "vocational"=职高, "college"=大专
   - "bachelor"=本科, "graduate"=研究生及以上
   - 例：简历写"初中"→"middle"；简历未提学历→""（不要猜测，不要默认"no"）

3. maritalStatus（婚姻）必须是以下之一:
   - "single"=未婚, "married"=已婚, "divorced"=离异, "widowed"=丧偶

4. zodiac（中国生肖/属相）：
   - 若简历明确写了属相/生肖，从以下返回对应值：
     "rat"=鼠, "ox"=牛, "tiger"=虎, "rabbit"=兔, "dragon"=龙, "snake"=蛇
     "horse"=马, "goat"=羊, "monkey"=猴, "rooster"=鸡, "dog"=狗, "pig"=猪
   - 若简历没写属相但有年龄，按出生年份推算（当前年2026年，年龄减法得出生年）：
     生肖12年一循环：鼠1984/1996/2008，牛1985/1997/2009，虎1986/1998/2010
     兔1987/1999/2011，龙1988/2000/2012，蛇1989/2001/2013，马1990/2002/2014
     羊1991/2003/2015，猴1992/2004/2016，鸡1993/2005/2017，狗1994/2006/2018，猪1995/2007/2019
     例：年龄40→出生年1986（2026-40）→虎年→"tiger"
   - ⚠️ "星座：金牛/白羊"是西方星座，不是生肖，不要用于zodiac字段

4b. constellation（西方星座）必须是以下之一（若无法确定返回空字符串""）:
   - "aries"=白羊座(3/21-4/19), "taurus"=金牛座(4/20-5/20), "gemini"=双子座(5/21-6/21)
   - "cancer"=巨蟹座(6/22-7/22), "leo"=狮子座(7/23-8/22), "virgo"=处女座(8/23-9/22)
   - "libra"=天秤座(9/23-10/23), "scorpio"=天蝎座(10/24-11/22), "sagittarius"=射手座(11/23-12/21)
   - "capricorn"=摩羯座(12/22-1/19), "aquarius"=水瓶座(1/20-2/18), "pisces"=双鱼座(2/19-3/20)
   - ⚠️重要：简历中"星座：金牛"→"taurus"；"星座：白羊"→"aries"；仅提及生肖不代表星座
   - 例："星座：金牛"→"taurus", "星座：天蝎"→"scorpio"。未提及则返回""

5. religion（宗教信仰）必须是以下之一:
   - "none"=无/未提及, "buddhism"=佛教, "taoism"=道教
   - "christianity"=基督教/天主教, "islam"=伊斯兰教/回族

6. jobType（工种）根据工作内容推断，必须是以下之一:
   - "yuesao"=月嫂（带新生儿、月子护理）
   - "zhujia-yuer"=住家育儿嫂（住家带宝宝）
   - "baiban-yuer"=白班育儿（白班带宝宝）
   - "zhujia-baomu"=住家保姆（住家做饭家务）
   - "baiban-baomu"=白班保姆（白班做饭家务）
   - "zhujia-hulao"=住家护老（照顾老人）
   - "baojie"=保洁, "xiaoshi"=小时工, "yangchong"=养宠

7. skills（技能证书）根据证书和擅长技能描述，从以下选择匹配的，返回数组:
   【证书名称→技能映射】
   - "muying"=母婴护理师/母婴护理证
   - "cuiru"=高级催乳师/催乳师证/催乳证/通乳
   - "yuezican"=月子餐营养师/月子餐证/会做月子餐
   - "chanhou"=产后修复师/产后护理师/产后恢复师
   - "yuying"=高级育婴师/育婴师证/育婴证（注意：育婴师=高级育婴师）
   - "zaojiao"=早教师/早教证/亲子教育/读绘本讲故事
   - "fushi"=辅食营养师/辅食添加师/会做辅食/宝宝辅食
   - "ertui"=小儿推拿师/儿推师/小儿按摩/儿童推拿
   - "yingyang"=营养师/营养证/营养搭配
   【特殊技能→技能映射】
   - "teshu-yinger"=特殊婴儿护理/早产儿护理/黄疸护理/低体重儿
   - "yiliaobackground"=医疗背景/护士/医护经验/在医院工作过
   - "shuangtai-huli"=双胎护理/带过双胞胎/双胎经验
   - "yanglao-huli"=养老护理师/护理员证/照顾老人/护理老人
   - "liliao-kangfu"=理疗康复师/康复师/康复护理
   【烹饪技能→技能映射】
   - "zhongcan"=中餐烹饪/会做饭/做菜/炒菜/红烧/煲汤/川菜/湘菜/粤菜/家常菜
   - "xican"=西餐烹饪/西餐/牛排/意面/沙拉/烘焙/蛋糕
   - "mianshi"=面食制作/面食/包子/饺子/面条/馒头/花卷
   【其他技能→技能映射】
   - "jiashi"=驾驶/驾照/会开车/有驾照
   - "shouyi"=整理收纳/收纳师/会收纳/整理
   - "waiyu"=外语/英语/日语/会说外语

8. weight（体重）: 返回斤为单位的数字。如原文是kg需×2转换

9. workExperiences（工作经历）数组:
   - startDate: "YYYY-MM"格式（如"2020-01"）
   - endDate: "YYYY-MM"格式，"至今"转为当前年月
   - description: 工作内容描述
   - district: 工作区域（如"朝阳区"、"海淀区"）

10. experienceYears（工作年限）: 计算总工作年数，返回数字

11. expectedSalary（期望薪资）: 提取数字，如"8000"。若有范围取中间值

12. selfIntroduction: 综合性格特点、擅长技能，生成50-100字的自我介绍

13. familySituation: 家庭情况描述（如"老公在家开货车，儿子上班"）

【行业术语理解】
- "下户"=离开客户家/工作结束
- "上户"=开始在客户家工作
- "主带"=主要负责照顾
- "辅带"=辅助照顾
- "白班"=白天工作不住家
- "住家"=住在客户家

【返回JSON格式】
{
  "name": "姓名",
  "age": 数字,
  "gender": "female或male",
  "height": 数字(cm),
  "weight": 数字(斤),
  "nativePlace": "籍贯省份如湖南",
  "ethnicity": "民族",
  "education": "枚举值或空字符串（简历未明确写学历则返回空字符串）",
  "maritalStatus": "枚举值",
  "zodiac": "生肖枚举值或空字符串（无属相信息时根据年龄推算）",
  "constellation": "西方星座枚举值或空字符串",
  "religion": "枚举值",
  "jobType": "枚举值",
  "skills": ["枚举值数组"],
  "experienceYears": 数字,
  "expectedSalary": 数字,
  "certificatesText": "证书列表文字",
  "workExperiences": [
    {"startDate":"YYYY-MM","endDate":"YYYY-MM","description":"内容","district":"区域"}
  ],
  "selfIntroduction": "综合介绍",
  "familySituation": "家庭情况"
}`;

      const response = await axios.post<QwenResponse>(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `请解析这份简历：\n\n${resumeText}` },
          ],
          max_tokens: 2000,
          temperature: 0.1,
          // 关闭深度思考模式，加快响应速度（qwen3.5-flash 默认开启思考模式）
          enable_thinking: false,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 100000,
        },
      );

      const content = response.data.choices[0]?.message?.content || '';
      this.logger.log(`通义千问响应长度: ${content.length}`);

      // 提取 JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as ParsedResume;
        this.logger.log(`简历解析成功: ${parsed.name}`);
        return parsed;
      }

      throw new Error('无法解析 AI 返回的内容');
    } catch (error) {
      this.logger.error('通义千问 API 调用失败:', error.message);
      throw error;
    }
  }

  /**
   * 解析客户需求文本
   * @param customerText 线索文本
   * @param channel 渠道名称（可选，直接用作 leadSource）
   */
  async parseCustomer(customerText: string, channel?: string): Promise<ParsedCustomer> {
    if (!this.isConfigured()) {
      this.logger.warn('通义千问 API 未配置');
      throw new Error('AI 服务未配置');
    }

    const leadSourceInstruction = channel
      ? `leadSource 固定返回"${channel}"，不要从文本中推断。`
      : `leadSource 识别规则：在文本中匹配以下平台名称或别名（含错别字/简称），返回对应的标准名称：
   - 杭州同馨：同馨、同新、杭州同新、杭州同馨
   - 莲心：莲心、连心、莲馨
   - 犀牛：犀牛、西牛
   - 幼亲舒：幼亲舒、幼亲书
   - 天机鹿：天机鹿、天机录
   - 鲸推：鲸推、鲸推平台
   - 星星：星星、星星平台
   - 握个手：握个手、握手
   - 美家：美家、美家平台
   - 孕妈联盟：孕妈联盟、孕妈
   - 高阁：高阁
   - 妈妈网：妈妈网
   - 宝宝树：宝宝树
   - 美团：美团
   - 抖音：抖音
   - 快手：快手
   - 小红书：小红书、红书
   - 58同城：58同城、58
   - 百度：百度
   - 转介绍：转介绍、介绍
   - 如果都没匹配到，返回"其他"
   - 平台名称/别名可能出现在文本任意位置，包括末尾`;

    try {
      const systemPrompt = `你是家政公司CRM系统的客户线索解析助手。请从线索文本中提取信息，返回JSON。

【重要】只返回纯JSON，不要markdown代码块，不要解释文字。

【字段解析规则】

1. name（客户姓名）:
   - 文本中明确出现的中文姓名或"X女士/先生"，提取出来
   - 如"武"、"黄女士"、"高"等单字/称谓也算
   - 未提及则返回""

2. phone（手机号）:
   - 提取11位纯数字手机号（以1开头）
   - 如果备注"微信同号"，则wechatId也填同一个号码
   - 未提及则返回""

3. wechatId（微信号）:
   - 文本中标注"微信"或"备注：微信"后面跟着的字符串
   - 非11位数字的字母数字串（如 swallow349、yeyi999999、wxid_xxx、lehuo315、Estelle__ying、dqz616592961、xuanyuanhsc）通常是微信号
   - 若文本只有一个联系方式且明确标注是微信，则放入wechatId，phone留空
   - 若"微信同号"，则phone和wechatId填同一个手机号

4. address（地址）:
   - 提取城市+区域，如"北京市朝阳区"、"北京海淀"、"北京通州"
   - 格式如"北京-北京-朝阳"→提取"北京朝阳"
   - 详细街道/小区也保留

5. serviceCategory（服务类别）统一归类为以下中文：
   - 育儿嫂：育儿嫂/住家育儿嫂/白班育儿嫂/育婴师/育儿/带娃
   - 月嫂：月嫂/坐月子
   - 保姆：保姆/住家保姆/住家阿姨/阿姨（无其他明确类型时）
   - 小时工：钟点工/小时工/按时计费
   - 保洁：保洁/打扫卫生
   - 护老：护老/照顾老人/老人护理

6. ${leadSourceInstruction}

7. expectedStartDate（上户时间）:
   - 提取明确的日期，格式"YYYY-MM-DD"，当前年份2026年
   - 如"3月15日"→"2026-03-15"，"5月份"→"2026-05-01"
   - 未提及则返回""

8. salaryBudget（薪资预算）:
   - 提取金额范围如"8000-10000"或单值"9000"
   - 未提及则返回""

9. remarks（备注需求）:
   - 提取关键需求：住家/白班、年龄要求、经验要求、特殊需求等
   - 忽略开头的纯数字编号（如"29"、"补24"、"3014"、"3期编号2"等流水号）
   - 较短的文本不需要截取，较长文本提炼核心需求（100字以内）
   - 未提及则返回""

【返回JSON格式】
{
  "name": "",
  "phone": "",
  "wechatId": "",
  "address": "",
  "serviceCategory": "",
  "leadSource": "",
  "expectedStartDate": "",
  "salaryBudget": "",
  "remarks": ""
}`;

      const response = await axios.post<QwenResponse>(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `请解析这段客户需求：\n\n${customerText}` },
          ],
          max_tokens: 1000,
          temperature: 0.1,
          enable_thinking: false,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      const content = response.data.choices[0]?.message?.content || '';
      this.logger.log(`客户解析响应长度: ${content.length}`);

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as ParsedCustomer;
        this.logger.log(`客户解析成功: ${parsed.name || '未知'}`);
        return parsed;
      }

      throw new Error('无法解析 AI 返回的内容');
    } catch (error) {
      this.logger.error('客户解析 API 调用失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取 API 状态
   */
  getStatus() {
    return {
      configured: this.isConfigured(),
      provider: '阿里云通义千问',
      model: this.model,
    };
  }
}

