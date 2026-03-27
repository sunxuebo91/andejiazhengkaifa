import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import sharp from 'sharp';
// 简历解析结果接口 - 与系统 Resume 实体字段对齐
export interface ParsedResume {
  // 基本信息
  name?: string;
  age?: number;
  gender?: 'male' | 'female';
  height?: number;      // 身高(cm)
  weight?: number;      // 体重(斤)
  nativePlace?: string; // 籍贯省份（如"湖南"）
  currentAddress?: string; // 现居住地址
  hukouAddress?: string;   // 户籍/老家详细地址
  birthDate?: string;      // 出生日期 YYYY-MM-DD
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
  phone?: string;        // 手机号
  idNumber?: string;     // 身份证号
  wechat?: string;       // 微信号

  // 工作经验
  experienceYears?: number; // 工作年限
  workExperiences?: Array<{
    startDate?: string;       // 格式: YYYY-MM
    endDate?: string;         // 格式: YYYY-MM
    description?: string;     // 工作内容
    district?: string;        // 区域
    customerName?: string;    // 客户称谓，如"李先生"
    customerReview?: string;  // 20-30字客户好评
  }>;

  // 期望薪资
  expectedSalary?: number;

  // 证书（文字描述）
  certificatesText?: string;

  // 自我介绍
  selfIntroduction?: string;

  // 家庭情况
  familySituation?: string;

  // 推荐理由（20-30字，用于内部推荐）
  recommendationReason?: string;
}

// 职培线索解析结果接口
export interface ParsedTrainingLead {
  name?: string;           // 姓名
  gender?: string;         // 性别：男/女/其他
  age?: number;            // 年龄（数字）
  phone?: string;          // 手机号
  wechatId?: string;       // 微信号
  leadSource?: string;     // 来源：美团/抖音/快手/小红书/转介绍/幼亲舒/BOSS/BOSS直聘/其他
  trainingType?: string;   // 培训类型：月嫂/育儿嫂/保姆/护老/师资
  consultPosition?: string; // 咨询职位：育婴师/母婴护理师/养老护理员/住家保姆/其他
  intentionLevel?: string; // 意向程度：高/中/低
  address?: string;        // 所在地区
  remarks?: string;        // 备注
  // 跟进信息（若Excel中有对应列）
  followUpPerson?: string;  // 跟进人姓名
  followUpContent?: string; // 跟进内容/跟进记录
  followUpType?: string;    // 跟进方式：电话/微信/到店/其他
  followUpTime?: string;    // 跟进时间（ISO格式，如 2026-03-01）
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

  // 豆包Seedream (火山引擎ARK平台) 配置
  private readonly arkApiKey: string;
  private readonly arkModelId: string;
  private readonly arkBaseUrl = 'https://ark.cn-beijing.volces.com/api/v3';

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('QWEN_API_KEY', '');
    this.arkApiKey = this.configService.get<string>('ARK_API_KEY', '');
    this.arkModelId = this.configService.get<string>('ARK_MODEL_ID', 'doubao-seedream-5-0-260128');
  }

  /**
   * 检查 API 是否配置
   */
  isConfigured(): boolean {
    return this.isTextAiConfigured();
  }

  isTextAiConfigured(): boolean {
    return !!(this.apiKey && this.apiKey.startsWith('sk-'));
  }

  isUniformSwapConfigured(): boolean {
    return this.isSeedreamConfigured() || this.isTextAiConfigured();
  }

  isSeedreamConfigured(): boolean {
    return !!(this.arkApiKey && this.arkModelId);
  }

  /**
   * 获取简历解析的系统提示词（文本和图片解析共用）
   */
  private getResumeParsingPrompt(): string {
    return `你是家政公司CRM系统的简历解析助手。请从简历文本/图片中提取信息，返回符合系统字段定义的JSON。

【重要】只返回纯JSON，不要markdown代码块，不要解释文字。

【文本预处理须知】
- 文本可能来自微信/短信复制，格式不规范，请尽力提取
- 忽略所有[图片]、[表情]、[语音]、[视频]等占位符标记
- "特长"、"擅长"等描述要映射到skills和selfIntroduction
- 同一信息可能用不同标签：如"姓名/名字"、"年纪/年龄"、"籍贯/老家/户籍"等
- 如果文本没有明确的标签分隔，尝试根据上下文推断字段
- 优先提取"求职标题/开头总结/求职一份/目前找..."里的目标岗位与薪资，不要被较早历史工作误导
- 工作经历常跨多行：某一行先写时间和地点，下一行再写工作内容，需合并理解
- 对数字要统一规范：身高统一转成cm整数，体重统一转成斤整数，日期统一转成YYYY-MM或YYYY-MM-DD

【字段映射规则】

1. gender（性别）: "female"=女, "male"=男。家政行业默认女性，若未提及性别返回"female"

1b. birthDate（出生日期）:
   - 仅在文本明确出现出生日期/生日时提取，格式必须为"YYYY-MM-DD"
   - 例："出生日期：1986年7月29"→"1986-07-29"
   - 只有出生年份、年龄，没有精确到日时，不要猜完整生日，返回空字符串""

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
   - "高端家务"、"高端家政"、"生活助理"、"私人助理"、"做饭家务"、"家务做饭辅带大宝"：
     若明确"白班/上午/下午/钟点"→"baiban-baomu"或"xiaoshi"；若明确"住家"→"zhujia-baomu"；未写则按家务做饭主导判断为"zhujia-baomu"
   - "护老"、"养老院"、"半自理"、"卧床"、"照顾老人"、"护理老人"→优先判断为"zhujia-hulao"
   - "主带宝宝/带宝宝/育儿/辅带宝宝"→优先判断育儿；若同时强调做饭家务且标题写"家务做饭辅带"则优先保姆
   - "小时工"、"上午小时工"、"下午小时工"、"钟点工"→"xiaoshi"
   - 如文本开头标题、求职意向与历史工作不一致，优先使用当前求职意向

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
   - "liliao-kangfu"=康复调理/运动损伤恢复/肩周炎调理/腰脱调理/理疗按摩/康复训练
   - "shouyi"=高端家务中的收纳整理、奢侈品养护、物品归类整理
   - "yingyang"=营养餐/减脂餐/营养搭配/营养配餐
   - 不要因为"健康证/身份证"把它们映射成skills

8. weight（体重）: 返回斤为单位的数字。如原文是kg需×2转换

9. workExperiences（工作经历）数组:
   - startDate: "YYYY-MM"格式（如"2020-01"）。"2021年3月"→"2021-03"
   - 若只有年份无月份，如"2015年-2018年"，开始按"2015-01"，结束按"2018-12"
   - "2017年底"可按"2017-12"，"2020年初"按"2020-01"，"2023年三月"按"2023-03"
   - endDate: "YYYY-MM"格式，"至今"转为当前年月"2026-03"
   - description: 工作内容描述，包含服务对象、工作内容、服务人数/面积等关键信息。如"在北京小红门附近从事半自理老人照护，做饭做家务，负责300平卫生"
   - district: 工作区域（如"朝阳区"、"海淀区"）。如果文本提到具体地名如"小红门""广安门"等，尝试推断对应区域
   - customerName: 根据工作经历虚构一个客户称谓，格式为"姓氏+先生/女士"，如"李先生"、"张女士"、"王先生"（随机选常见姓氏，月嫂/育儿类客户以女士为主）
   - customerReview: 根据description和工种，用第一人称客户视角写20-30字的好评，如"月嫂非常专业，照顾产妇和宝宝细心周到，强烈推荐！"
   - 相邻多行属于同一段经历时要合并，不要拆碎
   - 无法确认的经历不要编造

10. experienceYears（工作年限）:
   - 若文本明确写"工作经历：18年""从事家政服务行业11年""工作经验9年"，优先用显式值
   - 否则根据家政/护理/育儿相关工作经历估算，不把明显无关职业（如年轻时售货员、健身教练）全部算入家政年限
   - 返回数字

11. expectedSalary（期望薪资）:
   - 提取当前求职意向中的薪资数字，如"7000左右"→7000，"5000以上"→5000
   - 若有区间如"8000-9000"，优先返回较低起点8000
   - 若有条件薪资如"8000不带睡，9000带睡"：
     白班/不带睡岗位优先取8000，住家/带睡岗位优先取9000；无法判断时取前面第一个数字
   - 只从求职标题、意向描述、最新岗位说明里取，不要把历史工资误当期望薪资

12. selfIntroduction: 综合以下内容生成50-150字的自我介绍：
   - "自我评价"/"自我介绍"/"个人介绍"部分的内容
   - "特长"/"擅长"部分的描述
   - 性格特点、工作态度等描述
   ⚠️ 尽量保留原文描述，不要过度改写

13. familySituation: 家庭情况描述（如"老公在家开货车，儿子上班"、"五口人，儿子都成家了"）

17. recommendationReason: 根据阿姨的整体情况，站在内部推荐人的角度，写20-30字的推荐理由，突出最核心的亮点，如"从事育儿嫂12年，专业扎实，双胎经验丰富，沟通耐心，值得信赖"

13b. currentAddress（现居住地址）:
   - 只在文本明确出现"现住址/现居住地址/居住地/现居住在"时提取
   - 像"通州富力尚悦居"这类可能是上户地点/服务区域，若无明确现住标签，不要误填currentAddress

13c. hukouAddress（户籍地址）:
   - 若文本明确出现"户籍地址/户口所在地"则直接提取
   - 若未明确出现但"籍贯"给到省市县级详细地址，如"河北邢台""山西省吕梁市"，则可将详细地址填入hukouAddress，同时nativePlace只保留省份简称

14. phone（手机号）:
   - 提取11位纯数字手机号（以1开头）
   - 未提及则返回""

15. idNumber（身份证号）:
   - 提取18位身份证号码（17位数字+最后1位数字或X）
   - 未提及则返回""

16. wechat（微信号）:
   - 文本中标注"微信"后面跟着的字符串
   - 若"微信同号"或"微信同手机号"，则填入phone相同的号码
   - 未提及则返回""

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
  "nativePlace": "只返回省份简称，如山西运城→山西，湖南长沙→湖南，北京→北京",
  "currentAddress": "现居住地址或空字符串",
  "hukouAddress": "户籍/老家详细地址或空字符串",
  "birthDate": "YYYY-MM-DD或空字符串",
  "ethnicity": "民族",
  "education": "枚举值或空字符串（简历未明确写学历则返回空字符串）",
  "maritalStatus": "枚举值",
  "zodiac": "生肖枚举值或空字符串（无属相信息时根据年龄推算）",
  "constellation": "西方星座枚举值或空字符串",
  "religion": "枚举值",
  "jobType": "枚举值",
  "skills": ["枚举值数组"],
  "phone": "11位手机号或空字符串",
  "idNumber": "18位身份证号或空字符串",
  "wechat": "微信号或空字符串",
  "experienceYears": 数字,
  "expectedSalary": 数字,
  "certificatesText": "证书列表文字",
  "workExperiences": [
    {"startDate":"YYYY-MM","endDate":"YYYY-MM","description":"内容","district":"区域","customerName":"李先生","customerReview":"20-30字客户好评"}
  ],
  "selfIntroduction": "综合介绍",
  "familySituation": "家庭情况",
  "recommendationReason": "20-30字推荐理由"
}`;
  }

  private pad2(value: string | number): string {
    return String(value).padStart(2, '0');
  }

  private extractBirthDate(rawText: string): string {
    const match = rawText.match(/(?:出生日期|生日)[:：]?\s*(\d{4})[年\-/.](\d{1,2})[月\-/.](\d{1,2})/);
    if (!match) return '';
    return `${match[1]}-${this.pad2(match[2])}-${this.pad2(match[3])}`;
  }

  private extractCurrentAddress(rawText: string): string {
    const match = rawText.match(/(?:现住址|现居住地址|现居住在|现居|居住地)[:：]?\s*([^\n，。,；;]+)/);
    return match?.[1]?.trim() || '';
  }

  private extractHukouAddress(rawText: string): string {
    const explicit = rawText.match(/(?:户籍地址|户口所在地|户籍所在地)[:：]?\s*([^\n，。,；;]+)/);
    if (explicit?.[1]) {
      return explicit[1].trim();
    }

    const nativePlaceMatch = rawText.match(/(?:籍贯|老家|户籍)[:：]?\s*([^\n]+)/);
    if (!nativePlaceMatch?.[1]) {
      return '';
    }

    const value = nativePlaceMatch[1].trim();
    if (/省|市|区|县|州|盟/.test(value) || value.length >= 4) {
      return value;
    }
    return '';
  }

  private extractExpectedSalary(rawText: string, jobType?: ParsedResume['jobType']): number | undefined {
    const header = rawText
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .replace(/\s+/g, '');

    const conditional = header.match(/(\d{4,5})不带睡(\d{4,5})带睡/);
    if (conditional) {
      const noSleep = Number(conditional[1]);
      const withSleep = Number(conditional[2]);
      if (jobType && jobType.startsWith('baiban')) return noSleep;
      if (jobType && jobType.startsWith('zhujia')) return withSleep;
      return noSleep;
    }

    const approx = header.match(/(\d{4,5})(?:左右|以上|起|可谈|面议)/);
    if (approx) {
      return Number(approx[1]);
    }

    const range = header.match(/(?:薪资|工资|预算|求职|找工作|育儿|月嫂|保姆|护老)?(\d{4,5})[-~到至](\d{4,5})/);
    if (range) {
      return Number(range[1]);
    }

    return undefined;
  }

  private normalizeParsedResume(parsed: ParsedResume, rawText?: string): ParsedResume {
    if (!rawText) {
      return parsed;
    }

    const next: ParsedResume = { ...parsed };

    if (!next.birthDate) {
      next.birthDate = this.extractBirthDate(rawText);
    }

    if (!next.currentAddress) {
      next.currentAddress = this.extractCurrentAddress(rawText);
    }

    if (!next.hukouAddress) {
      next.hukouAddress = this.extractHukouAddress(rawText);
    }

    const expectedSalary = this.extractExpectedSalary(rawText, next.jobType);
    if (expectedSalary && (!next.expectedSalary || next.expectedSalary <= 0)) {
      next.expectedSalary = expectedSalary;
    }

    if (expectedSalary && /不带睡|带睡/.test(rawText.replace(/\s+/g, '')) && next.expectedSalary) {
      next.expectedSalary = expectedSalary;
    }

    return next;
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
      const systemPrompt = this.getResumeParsingPrompt();

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
        const parsed = this.normalizeParsedResume(JSON.parse(jsonMatch[0]) as ParsedResume, resumeText);
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
   * 从图片中识别简历信息（视觉模型）
   * @param imageBase64 图片的base64编码（不含data:前缀）
   * @param mimeType 图片MIME类型，默认 image/jpeg
   */
  async parseResumeFromImage(imageBase64: string, mimeType = 'image/jpeg'): Promise<ParsedResume> {
    if (!this.isConfigured()) {
      throw new Error('AI 服务未配置');
    }

    this.logger.log(`[图片简历解析] 开始，图片大小约 ${Math.round(imageBase64.length * 0.75 / 1024)}KB, mimeType=${mimeType}`);

    try {
      // 复用与 parseResume 相同的 systemPrompt（包含所有字段映射规则）
      const systemPrompt = this.getResumeParsingPrompt();

      const response = await axios.post<QwenResponse>(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: { url: `data:${mimeType};base64,${imageBase64}` },
                },
                { type: 'text', text: '请识别图片中的简历信息，提取所有能识别到的字段，返回JSON。' },
              ],
            },
          ],
          max_tokens: 2000,
          temperature: 0.1,
          enable_thinking: false,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 120000, // 图片识别给更长超时
        },
      );

      const content = response.data.choices[0]?.message?.content || '';
      this.logger.log(`[图片简历解析] 响应长度: ${content.length}`);

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = this.normalizeParsedResume(JSON.parse(jsonMatch[0]) as ParsedResume);
        this.logger.log(`[图片简历解析] 成功: ${parsed.name || '未知'}`);
        return parsed;
      }

      throw new Error('无法从图片中解析简历信息');
    } catch (error) {
      this.logger.error('[图片简历解析] 失败:', error.message);
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
   * 从图片中识别职培线索表格（视觉模型）
   * @param imageBase64 图片的base64编码（不含data:前缀）
   * @param mimeType 图片MIME类型，默认 image/jpeg
   */
  async parseTrainingLeadsFromImage(imageBase64: string, mimeType = 'image/jpeg'): Promise<ParsedTrainingLead[]> {
    if (!this.isConfigured()) {
      throw new Error('AI 服务未配置');
    }

    const systemPrompt = `你是职业培训CRM系统的数据录入助手。请识别图片中的职培线索表格，提取每一行人员信息。

【重要】只返回纯JSON数组，不要markdown代码块，不要解释文字。

【字段映射规则】
- name（姓名）: 表格中的姓名字段
- gender（性别）: 必须是以下之一：男、女、其他。"性别"列映射到此字段
- age（年龄）: 数字，"年龄"列映射到此字段，提取纯数字
- phone（手机号）: 11位手机号，格式验证以1开头，提取纯数字。"电话"、"电话号码"、"手机号"等列
- wechatId（微信号）: 微信号字段，非手机号的字母数字混合串。"微信"、"微信号"等列
- leadSource（来源）: 必须是以下之一：美团、抖音、快手、小红书、转介绍、幼亲舒、BOSS直聘、其他。"渠道"、"渠道来源"等列映射到此字段；"BOSS"、"boos"、"boos直聘"、"boss直聘"均映射为"BOSS直聘"
- trainingType（培训类型）: 必须是以下之一：月嫂、育儿嫂、保姆、护老、师资。⚠️只从"性质"、"培训类型"、"类型"等列取值，严禁从consultPosition的值（如"招生老师"）推断此字段
- consultPosition（咨询职位）: 必须是以下之一：育婴师、母婴护理师、养老护理员、住家保姆、其他。"咨询职位"、"职位"等列映射到此字段；"招生老师"、"招生顾问"等职位值映射为"其他"
- intentionLevel（意向程度）: 必须是以下之一：高、中、低。A/S/B=高，C=中，D/U/W=低。"类别"等列映射到此字段
- address（地区）: 所在地区或城市
- remarks（备注）: ⚠️只用于"备注"、"院校职称"、"院校"等列，严禁把"跟进记录"/"跟进内容"类的列放入此字段
- followUpPerson（跟进人/录入人）: "跟进人"、"负责人"、"招生老师"、"招生顾问"、"咨询顾问"、"顾问"、"老师"、"培训老师"、"业务员"、"销售"、"经手人"、"创建人"、"发起人"、"录入人"、"推广人"、"介绍人"等列，填写姓名字符串；若多列同时存在，优先取"跟进人"，其次取"招生老师"/"顾问"/"创建人"/"发起人"/"录入人"
- followUpContent（跟进内容）: ⚠️"跟进记录"列的内容必须放入此字段，不能放入remarks。识别列名："跟进记录"、"跟进内容"、"沟通记录"、"跟进情况"、"联系记录"、"沟通备注"、"跟进备注"等列；若表格无专用跟进列但"备注"列内容明显为跟进/联系记录（如含"已联系"、"电话沟通"、"微信"等），也映射到此字段
- followUpType（跟进方式）: 必须是以下之一：电话、微信、到店、其他。无法判断时默认"电话"
- followUpTime（跟进时间）: "跟进时间"、"联系时间"、"跟进日期"、"最近联系"等列，转为 YYYY-MM-DD 格式，无法解析则留空

【返回格式】
[
  {"name":"张三","gender":"女","age":28,"phone":"13800138000","wechatId":"","leadSource":"抖音","trainingType":"月嫂","consultPosition":"育婴师","intentionLevel":"高","address":"","remarks":"","followUpPerson":"朱小双","followUpContent":"电话沟通，感兴趣","followUpType":"电话","followUpTime":"2026-03-01"},
  ...
]
只返回有效的人员数据行，忽略表头、空行、合计行。`;

    try {
      const response = await axios.post<QwenResponse>(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: { url: `data:${mimeType};base64,${imageBase64}` },
                },
                { type: 'text', text: '请识别图片中的职培线索表格，提取所有人员信息，返回JSON数组。' },
              ],
            },
          ],
          max_tokens: 8000,
          temperature: 0.1,
          enable_thinking: false,
        },
        {
          headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
          timeout: 120000,
        },
      );

      const content = response.data.choices[0]?.message?.content || '';
      this.logger.log(`图片线索识别响应长度: ${content.length}, 预览: ${content.substring(0, 200)}`);
      const leads = this.extractLeadsFromContent(content, '图片');
      return leads;
    } catch (error) {
      this.logger.error('图片线索识别失败:', error.message);
      throw error;
    }
  }

  /**
   * 从Excel表格文本中识别职培线索（AI字段映射）
   * @param tableText 表格内容（TSV/CSV格式）
   */
  async parseTrainingLeadsFromExcelText(tableText: string): Promise<ParsedTrainingLead[]> {
    if (!this.isConfigured()) {
      throw new Error('AI 服务未配置');
    }

    const systemPrompt = `你是职业培训CRM系统的数据录入助手。请识别以下表格数据，将各列自动映射到标准字段，提取每一行的职培线索信息。

【重要】只返回纯JSON数组，不要markdown代码块，不要解释文字。

【字段映射规则】
- name（姓名）: "姓名"、"名字"、"学员"等列
- gender（性别）: 必须映射为：男、女、其他。"性别"列
- age（年龄）: 数字，"年龄"列，提取纯数字
- phone（手机号）: "手机"、"电话"、"手机号"、"联系方式"、"电话号码"等列，提取11位纯数字
- wechatId（微信号）: "微信"、"微信号"、"wechat"等列，非手机号的字符串
- leadSource（来源）: 必须映射为：美团、抖音、快手、小红书、转介绍、幼亲舒、BOSS直聘、其他。"渠道"、"来源"、"渠道来源"等列；"BOSS"、"boos"、"boos直聘"均映射为"BOSS直聘"
- trainingType（培训类型）: 必须映射为：月嫂、育儿嫂、保姆、护老、师资。⚠️只从"性质"、"培训类型"、"类型"等列取值，严禁从consultPosition的值（如"招生老师"）推断此字段
- consultPosition（咨询职位）: 必须映射为：育婴师、母婴护理师、养老护理员、住家保姆、其他。"咨询职位"、"职位"等列；"招生老师"、"招生顾问"等职位值映射为"其他"
- intentionLevel（意向程度）: 必须映射为高/中/低。A/S/B=高，C=中，D/U/W=低，"类别"、"等级"等列
- address（地区）: "地区"、"城市"、"所在地"等列
- remarks（备注）: ⚠️只用于"备注"、"说明"、"院校"等列，严禁把"跟进记录"/"跟进内容"类的列放入此字段
- followUpPerson（跟进人/录入人）: "跟进人"、"负责人"、"招生老师"、"招生顾问"、"咨询顾问"、"顾问"、"老师"、"培训老师"、"业务员"、"销售"、"经手人"、"创建人"、"发起人"、"录入人"、"推广人"、"介绍人"等列，填写姓名字符串；若多列同时存在，优先取"跟进人"，其次取"招生老师"/"顾问"/"创建人"/"发起人"/"录入人"
- followUpContent（跟进内容）: ⚠️"跟进记录"列的内容必须放入此字段，不能放入remarks。识别列名："跟进记录"、"跟进内容"、"备注记录"、"沟通记录"、"跟进情况"、"联系记录"、"沟通备注"、"跟进备注"等列；若表格无专用跟进列但"备注"列内容明显为跟进/联系记录（如含"已联系"、"电话沟通"、"微信"等），也映射到此字段
- followUpType（跟进方式）: 必须映射为：电话、微信、到店、其他。"跟进方式"、"联系方式"等列；无法判断时默认"电话"
- followUpTime（跟进时间）: "跟进时间"、"联系时间"、"跟进日期"、"最近联系"等列，转为 YYYY-MM-DD 格式，无法解析则留空

【返回格式】
[{"name":"","gender":"","age":0,"phone":"","wechatId":"","leadSource":"","trainingType":"","consultPosition":"","intentionLevel":"","address":"","remarks":"","followUpPerson":"","followUpContent":"","followUpType":"","followUpTime":""},...]
忽略表头行、空行、合计行，只返回有效数据。`;

    try {
      const response = await axios.post<QwenResponse>(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `请提取以下表格中的职培线索数据：\n\n${tableText}` },
          ],
          max_tokens: 8000,
          temperature: 0.1,
          enable_thinking: false,
        },
        {
          headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
          timeout: 120000,
        },
      );

      const content = response.data.choices[0]?.message?.content || '';
      this.logger.log(`Excel AI字段映射响应长度: ${content.length}, 预览: ${content.substring(0, 200)}`);
      const leads = this.extractLeadsFromContent(content, 'Excel');
      return leads;
    } catch (error) {
      this.logger.error('Excel AI字段映射失败:', error.message);
      throw error;
    }
  }

  /**
   * 按括号深度精确提取 JSON 数组（避免贪婪正则把数组后的文字也匹配进去）
   */
  private extractJsonArray(content: string): any[] | null {
    const start = content.indexOf('[');
    if (start === -1) return null;

    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = start; i < content.length; i++) {
      const ch = content[i];
      if (escape) { escape = false; continue; }
      if (ch === '\\' && inString) { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;

      if (ch === '[' || ch === '{') depth++;
      else if (ch === ']' || ch === '}') {
        depth--;
        if (depth === 0) {
          try {
            const parsed = JSON.parse(content.substring(start, i + 1));
            if (Array.isArray(parsed)) return parsed;
          } catch (_) {}
          break;
        }
      }
    }
    return null;
  }

  /**
   * 从 AI 响应内容中提取职培线索数组（兼容多种返回格式）
   */
  private extractLeadsFromContent(content: string, source: string): ParsedTrainingLead[] {
    // 1. 按括号深度精确提取 JSON 数组，避免贪婪正则匹配过多
    const arr = this.extractJsonArray(content);
    if (arr) {
      this.logger.log(`${source}识别到 ${arr.length} 条线索`);
      return arr as ParsedTrainingLead[];
    }

    // 2. 尝试从对象包装中提取，如 {"leads":[...]} / {"data":[...]}
    const objMatch = content.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try {
        const obj = JSON.parse(objMatch[0]);
        const nested = obj.leads ?? obj.data ?? obj.items ?? obj.results
          ?? Object.values(obj).find((v) => Array.isArray(v));
        if (Array.isArray(nested) && nested.length > 0) {
          this.logger.log(`${source}从对象包装中提取到 ${nested.length} 条线索`);
          return nested as ParsedTrainingLead[];
        }
      } catch (_) {}
    }

    // 3. 无法解析，记录原始内容并返回空数组
    this.logger.warn(`${source} AI响应未包含有效JSON，原始内容: ${content.substring(0, 500)}`);
    return [];
  }

  /**
   * FaceChain LoRA训练：上传1-10张人脸照片，训练专属LoRA模型
   * 返回 finetuned_output（即 resource_id），后续生成写真时使用
   * 训练约需5分钟，轮询最多等待600秒
   */
  async trainFaceLoRA(photoUrls: string[]): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('AI 服务未配置');
    }
    if (!photoUrls || photoUrls.length === 0) {
      throw new Error('至少需要1张人脸照片用于LoRA训练');
    }

    const trainUrl = 'https://dashscope.aliyuncs.com/api/v1/fine-tunes';
    this.logger.log(`[FaceChain-LoRA训练] 开始训练, ${photoUrls.length}张照片`);

    try {
      // 步骤1：提交训练任务
      const submitResp = await axios.post(
        trainUrl,
        {
          model: 'facechain-finetune',
          training_file_ids: photoUrls,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      const jobId = submitResp.data?.output?.job_id;
      const finetunedOutput = submitResp.data?.output?.finetuned_output;
      if (!jobId) {
        this.logger.error('[FaceChain-LoRA训练] 未返回job_id:', JSON.stringify(submitResp.data).substring(0, 500));
        throw new Error('LoRA训练任务提交失败，未返回job_id');
      }

      this.logger.log(`[FaceChain-LoRA训练] 任务已提交, job_id=${jobId}, finetuned_output=${finetunedOutput}`);

      // 步骤2：轮询等待训练完成（最多600秒，每10秒查一次）
      const maxWaitMs = 600000;
      const pollIntervalMs = 10000;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitMs) {
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));

        const pollResp = await axios.get(`${trainUrl}/${jobId}`, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        });

        const status = pollResp.data?.output?.status;
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        this.logger.debug(`[FaceChain-LoRA训练] 轮询: status=${status}, 已等待${elapsed}s`);

        if (status === 'SUCCEEDED') {
          const resourceId = pollResp.data?.output?.finetuned_output;
          this.logger.log(`[FaceChain-LoRA训练] 训练完成! resource_id=${resourceId}`);
          return resourceId;
        } else if (status === 'FAILED') {
          const errMsg = pollResp.data?.output?.message || '未知错误';
          this.logger.error(`[FaceChain-LoRA训练] 训练失败: ${errMsg}`);
          throw new Error(`LoRA训练失败: ${errMsg}`);
        } else if (status === 'CANCELED') {
          throw new Error('LoRA训练已被取消');
        }
        // PENDING / RUNNING → 继续轮询
      }

      throw new Error('LoRA训练超时（600秒）');
    } catch (error) {
      this.logger.error('[FaceChain-LoRA训练] 失败:', error.message);
      throw error;
    }
  }

  /**
   * 使用 FaceChain 生成工装写真：
   * - 如果传入 resourceId，使用 LoRA 训练模式（portrait_url_template），高保真
   * - 如果未传入 resourceId，使用免训练模式（train_free_portrait_url_template）
   * 返回合成后图片的 Buffer
   */
  async swapHeadToUniform(personalPhotoUrl: string, templateUrl: string, resourceId?: string): Promise<Buffer> {
    if (!this.isConfigured()) {
      throw new Error('AI 服务未配置');
    }

    const submitUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/album/gen_potrait';
    const taskQueryBaseUrl = 'https://dashscope.aliyuncs.com/api/v1/tasks';
    const mode = resourceId ? 'LoRA' : '免训练';

    this.logger.log(`[AI换装-FaceChain-${mode}] 开始: template=${templateUrl.substring(0, 60)}...`);

    try {
      // 步骤1：构建请求体（根据模式不同）
      let requestBody: any;
      if (resourceId) {
        // LoRA训练模式：使用resource_id + portrait_url_template
        requestBody = {
          model: 'facechain-generation',
          parameters: {
            style: 'portrait_url_template',
            n: 1,
            skin_retouch: true,
          },
          input: {
            template_url: templateUrl,
          },
          resources: [
            {
              resource_id: resourceId,
              resource_type: 'facelora',
            },
          ],
        };
      } else {
        // 免训练模式：使用user_urls + train_free_portrait_url_template
        requestBody = {
          model: 'facechain-generation',
          parameters: {
            style: 'train_free_portrait_url_template',
            n: 1,
            skin_retouch: true,
          },
          input: {
            template_url: templateUrl,
            user_urls: [personalPhotoUrl],
          },
        };
      }

      // 步骤2：提交异步任务
      const submitResp = await axios.post(
        submitUrl,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'X-DashScope-Async': 'enable',
          },
          timeout: 30000,
        },
      );

      const taskId = submitResp.data?.output?.task_id;
      if (!taskId) {
        this.logger.error(`[AI换装-FaceChain-${mode}] 提交任务未返回task_id:`, JSON.stringify(submitResp.data).substring(0, 500));
        throw new Error('FaceChain任务提交失败，未返回task_id');
      }

      this.logger.log(`[AI换装-FaceChain-${mode}] 任务已提交, task_id=${taskId}`);

      // 步骤3：轮询等待任务完成（最多等待180秒，每5秒查一次）
      const maxWaitMs = 180000;
      const pollIntervalMs = 5000;
      const startTime = Date.now();
      let taskResult: any = null;

      while (Date.now() - startTime < maxWaitMs) {
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));

        const pollResp = await axios.get(`${taskQueryBaseUrl}/${taskId}`, {
          headers: { 'Authorization': `Bearer ${this.apiKey}` },
          timeout: 15000,
        });

        const taskStatus = pollResp.data?.output?.task_status;
        this.logger.debug(`[AI换装-FaceChain-${mode}] 轮询: status=${taskStatus}`);

        if (taskStatus === 'SUCCEEDED') {
          taskResult = pollResp.data;
          break;
        } else if (taskStatus === 'FAILED') {
          const errCode = pollResp.data?.output?.code || 'Unknown';
          const errMsg = pollResp.data?.output?.message || '未知错误';
          this.logger.error(`[AI换装-FaceChain-${mode}] 任务失败: ${errCode} - ${errMsg}`);
          throw new Error(`FaceChain任务失败: ${errCode} - ${errMsg}`);
        }
        // PENDING / RUNNING → 继续轮询
      }

      if (!taskResult) {
        throw new Error('FaceChain任务超时（180秒）');
      }

      // 步骤4：从结果中获取图片URL并下载
      const results = taskResult.output?.results;
      if (!results || results.length === 0 || !results[0]?.url) {
        this.logger.error(`[AI换装-FaceChain-${mode}] 任务成功但无结果图片:`, JSON.stringify(taskResult).substring(0, 500));
        throw new Error('FaceChain任务成功但未返回图片URL');
      }

      const resultImageUrl = results[0].url;
      this.logger.log(`[AI换装-FaceChain-${mode}] 生成完成，下载结果图片...`);

      const imgResp = await axios.get(resultImageUrl, { responseType: 'arraybuffer', timeout: 60000 });
      const resultBuf = Buffer.from(imgResp.data);

      this.logger.log(`[AI换装-FaceChain-${mode}] 下载完成 ${resultBuf.length} bytes，开始脸身过渡羽化...`);

      // 步骤5：后处理 — 对脖子/下巴交界区域做高斯模糊羽化，使脸身过渡自然
      const finalBuf = await this.blendFaceNeckTransition(resultBuf);

      this.logger.log(`[AI换装-FaceChain-${mode}] 羽化完成，最终图片 ${finalBuf.length} bytes`);
      return finalBuf;
    } catch (error) {
      const statusCode = error.response?.status ?? error.status;
      const errCode = error.response?.data?.code ?? '';
      this.logger.error(`[AI换装-FaceChain-${mode}] 失败:`, error.message);
      if (statusCode === 429 || errCode === 'Throttling.RateQuota' || errCode === 'Throttling') {
        throw new Error('AI服务繁忙，请稍后重试');
      }
      throw error;
    }
  }


  /**
   * 后处理：对脸部与身体的交界区域（下巴→脖子→衣领）做局部高斯模糊羽化，
   * 让FaceChain换脸后的接缝更自然。
   *
   * 原理：在图片高度约 35%~50% 的水平带（大致对应下巴-脖子-衣领区域），
   * 用一个渐变alpha蒙版把原图和模糊版混合，使过渡带柔和而不影响脸部和衣服。
   */
  private async blendFaceNeckTransition(imageBuf: Buffer): Promise<Buffer> {
    try {
      const meta = await sharp(imageBuf).metadata();
      const w = meta.width || 768;
      const h = meta.height || 1024;

      // 过渡带：图片高度的 48%~58%（脖子到衣领区域，避开脸部）
      const bandTop = Math.round(h * 0.48);
      const bandBottom = Math.round(h * 0.58);
      const bandHeight = bandBottom - bandTop;

      if (bandHeight <= 0) return imageBuf;

      // 从原图中裁剪出过渡带区域
      const bandBuf = await sharp(imageBuf)
        .extract({ left: 0, top: bandTop, width: w, height: bandHeight })
        .toBuffer();

      // 对过渡带做高斯模糊（sigma=3，轻柔模糊）
      const blurredBand = await sharp(bandBuf)
        .blur(3)
        .toBuffer();

      // 创建渐变透明蒙版：顶部全透明(0) → 中间不透明(180) → 底部全透明(0)
      // 这样模糊只在中间最强，上下边缘平滑过渡到原图
      const gradientRows: Buffer[] = [];
      for (let y = 0; y < bandHeight; y++) {
        const t = y / bandHeight; // 0→1
        // 钟形曲线：中间最强，两端为0
        const alpha = Math.round(180 * Math.sin(t * Math.PI));
        const row = Buffer.alloc(w, alpha);
        gradientRows.push(row);
      }
      const maskBuf = Buffer.concat(gradientRows);
      const maskImage = await sharp(maskBuf, { raw: { width: w, height: bandHeight, channels: 1 } })
        .png()
        .toBuffer();

      // 把模糊带加上alpha通道（用渐变蒙版控制透明度），再composite到原图上
      // 这样模糊效果在中间最强，边缘平滑过渡到原图
      const blurredRgba = await sharp(blurredBand)
        .ensureAlpha()
        .toBuffer();

      // 用 sharp 合成：将模糊带的 alpha 通道替换为渐变蒙版
      const blurredWithAlpha = await sharp(blurredRgba)
        .composite([
          {
            input: maskImage,
            blend: 'dest-in', // 用蒙版控制目标图的透明度
          },
        ])
        .png()
        .toBuffer();

      // 将羽化后的过渡带贴回原图
      const result = await sharp(imageBuf)
        .composite([
          {
            input: blurredWithAlpha,
            top: bandTop,
            left: 0,
          },
        ])
        .jpeg({ quality: 95 })
        .toBuffer();

      this.logger.log(`[羽化处理] 完成，过渡带 y:${bandTop}~${bandBottom}, 原始${imageBuf.length}bytes → ${result.length}bytes`);
      return result;
    } catch (err) {
      this.logger.warn(`[羽化处理] 失败，返回原图: ${err.message}`);
      return imageBuf; // 失败时不影响主流程，返回原图
    }
  }

  /**
   * 使用豆包 Seedream (火山引擎ARK) 图生图-多张参考图模式生成工装照
   * 传入用户个人照片 + 工装模板，让AI生成穿工装的写真
   * 返回合成后图片的 Buffer
   */
  async swapHeadWithSeedream(personalPhotoUrl: string, templateUrl: string): Promise<Buffer> {
    if (!this.isSeedreamConfigured()) {
      throw new Error('豆包Seedream AI 服务未配置（缺少 ARK_API_KEY 或 ARK_MODEL_ID）');
    }

    const apiUrl = `${this.arkBaseUrl}/images/generations`;

    this.logger.log(`[AI换装-Seedream] 开始: personalPhoto=${personalPhotoUrl.substring(0, 60)}..., template=${templateUrl.substring(0, 60)}...`);

    try {
      // image[0]=用户照片(目标人物), image[1]=工装模板(模特)
      const requestBody = {
        model: this.arkModelId,
        prompt: '图片2这是模特，图片1这是目标人物，把目标人物的头换到模特身上，要自然，衣服、背景都不能改，不要让logo变形，保持logo的原样，不要改变目标人物容颜',
        image: [personalPhotoUrl, templateUrl],
        response_format: 'url',
        size: '2K',
        stream: false,
        watermark: false,
        use_pre_llm: true,
      };

      this.logger.debug(`[AI换装-Seedream] 请求参数: ${JSON.stringify({ ...requestBody, image: ['[用户照片]', '[工装模板]'] })}`);

      const resp = await axios.post(apiUrl, requestBody, {
        headers: {
          'Authorization': `Bearer ${this.arkApiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 120000, // 2分钟超时
      });

      this.logger.debug(`[AI换装-Seedream] 响应: ${JSON.stringify(resp.data).substring(0, 500)}`);

      // 解析响应 — OpenAI兼容格式
      const imageData = resp.data?.data?.[0];
      if (!imageData) {
        this.logger.error('[AI换装-Seedream] 响应中无图片数据:', JSON.stringify(resp.data).substring(0, 500));
        throw new Error('Seedream生成失败，响应中无图片数据');
      }

      let resultImageUrl: string;
      if (imageData.url) {
        resultImageUrl = imageData.url;
      } else if (imageData.b64_json) {
        // base64 格式直接返回 Buffer
        const buf = Buffer.from(imageData.b64_json, 'base64');
        this.logger.log(`[AI换装-Seedream] 生成完成 (base64), ${buf.length} bytes`);
        return buf;
      } else {
        throw new Error('Seedream响应格式无法识别');
      }

      // 下载结果图片
      this.logger.log(`[AI换装-Seedream] 生成完成，下载结果图片: ${resultImageUrl.substring(0, 80)}...`);
      const imgResp = await axios.get(resultImageUrl, { responseType: 'arraybuffer', timeout: 60000 });
      const resultBuf = Buffer.from(imgResp.data);

      this.logger.log(`[AI换装-Seedream] 下载完成 ${resultBuf.length} bytes`);
      return resultBuf;
    } catch (error) {
      const statusCode = error.response?.status;
      const errData = error.response?.data;
      this.logger.error(`[AI换装-Seedream] 失败: status=${statusCode}, error=${JSON.stringify(errData).substring(0, 500)}, message=${error.message}`);
      if (statusCode === 429) {
        throw new Error('AI服务繁忙，请稍后重试');
      }
      throw error;
    }
  }

  /**
   * 后处理：从原始模板中裁剪logo区域，按比例缩放后贴回AI生成的结果图上
   * 不会 resize 整张生成图，只缩放logo补丁以适配生成图的尺寸
   *
   * logo区域位置（基于百分比，适配不同尺寸模板）：
   *   左胸偏右，约 x:38%~64%, y:56%~76%
   */
  private async overlayLogoFromTemplate(resultBuf: Buffer, templateBuf: Buffer): Promise<Buffer> {
    try {
      const tplMeta = await sharp(templateBuf).metadata();
      const resMeta = await sharp(resultBuf).metadata();

      if (!tplMeta.width || !tplMeta.height || !resMeta.width || !resMeta.height) {
        this.logger.warn('[logo后处理] 无法获取图片尺寸，跳过logo覆盖');
        return resultBuf;
      }

      this.logger.log(`[logo后处理] 模板尺寸 ${tplMeta.width}x${tplMeta.height}, 生成结果尺寸 ${resMeta.width}x${resMeta.height}`);

      // logo百分比位置（基于模板）
      const pctLeft = 0.38;
      const pctTop = 0.56;
      const pctWidth = 0.26;
      const pctHeight = 0.20;

      // 羽化边距（像素），用于边缘渐变融合 - 加大范围使过渡更自然
      const feather = 20;

      // 从模板中裁剪logo区域（扩大feather像素用于羽化）
      const tplLogoLeft = Math.max(0, Math.round(tplMeta.width * pctLeft) - feather);
      const tplLogoTop = Math.max(0, Math.round(tplMeta.height * pctTop) - feather);
      const tplLogoRight = Math.min(tplMeta.width, Math.round(tplMeta.width * (pctLeft + pctWidth)) + feather);
      const tplLogoBottom = Math.min(tplMeta.height, Math.round(tplMeta.height * (pctTop + pctHeight)) + feather);
      const tplLogoW = tplLogoRight - tplLogoLeft;
      const tplLogoH = tplLogoBottom - tplLogoTop;

      let logoPatch = await sharp(templateBuf)
        .extract({ left: tplLogoLeft, top: tplLogoTop, width: tplLogoW, height: tplLogoH })
        .toBuffer();

      // 计算logo在生成结果图上的对应位置和大小
      const scaleX = resMeta.width / tplMeta.width;
      const scaleY = resMeta.height / tplMeta.height;
      const resLogoLeft = Math.round(tplLogoLeft * scaleX);
      const resLogoTop = Math.round(tplLogoTop * scaleY);
      const resLogoW = Math.round(tplLogoW * scaleX);
      const resLogoH = Math.round(tplLogoH * scaleY);

      // 如果尺寸不同，缩放logo补丁
      if (resLogoW !== tplLogoW || resLogoH !== tplLogoH) {
        this.logger.log(`[logo后处理] 缩放logo补丁 ${tplLogoW}x${tplLogoH} → ${resLogoW}x${resLogoH}`);
        logoPatch = await sharp(logoPatch)
          .resize(resLogoW, resLogoH, { fit: 'fill' })
          .toBuffer();
      }

      // 创建羽化蒙版：中心不透明，边缘渐变透明
      const featherScaled = Math.round(feather * Math.max(scaleX, scaleY));
      const maskSvg = `<svg width="${resLogoW}" height="${resLogoH}">
        <defs>
          <linearGradient id="fadeL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="black"/><stop offset="1" stop-color="white"/></linearGradient>
          <linearGradient id="fadeR" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="white"/><stop offset="1" stop-color="black"/></linearGradient>
          <linearGradient id="fadeT" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="black"/><stop offset="1" stop-color="white"/></linearGradient>
          <linearGradient id="fadeB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="white"/><stop offset="1" stop-color="black"/></linearGradient>
        </defs>
        <rect width="${resLogoW}" height="${resLogoH}" fill="white"/>
        <rect x="0" y="0" width="${featherScaled}" height="${resLogoH}" fill="url(#fadeL)"/>
        <rect x="${resLogoW - featherScaled}" y="0" width="${featherScaled}" height="${resLogoH}" fill="url(#fadeR)"/>
        <rect x="0" y="0" width="${resLogoW}" height="${featherScaled}" fill="url(#fadeT)"/>
        <rect x="0" y="${resLogoH - featherScaled}" width="${resLogoW}" height="${featherScaled}" fill="url(#fadeB)"/>
      </svg>`;

      // 给logo补丁应用羽化蒙版作为alpha通道
      const maskBuf = await sharp(Buffer.from(maskSvg))
        .resize(resLogoW, resLogoH)
        .greyscale()
        .toBuffer();

      // 手动合成RGBA：RGB来自logo补丁，A来自羽化蒙版
      const logoRgb = await sharp(logoPatch).ensureAlpha().raw().toBuffer();
      const maskRaw = await sharp(maskBuf).raw().toBuffer();
      const w = resLogoW;
      const h = resLogoH;
      const rgbaData = Buffer.alloc(w * h * 4);
      for (let i = 0; i < w * h; i++) {
        rgbaData[i * 4] = logoRgb[i * 4];       // R
        rgbaData[i * 4 + 1] = logoRgb[i * 4 + 1]; // G
        rgbaData[i * 4 + 2] = logoRgb[i * 4 + 2]; // B
        rgbaData[i * 4 + 3] = maskRaw[i];          // A from mask
      }

      const featheredPatch = await sharp(rgbaData, { raw: { width: w, height: h, channels: 4 } })
        .png()
        .toBuffer();

      // 贴到生成结果上
      const finalBuf = await sharp(resultBuf)
        .composite([{ input: featheredPatch, left: resLogoLeft, top: resLogoTop }])
        .jpeg({ quality: 95 })
        .toBuffer();

      this.logger.log(`[logo后处理] 成功（含羽化），logo区域 (${resLogoLeft},${resLogoTop}) ${resLogoW}x${resLogoH}`);
      return finalBuf;
    } catch (err) {
      this.logger.error(`[logo后处理] 失败，返回原始AI结果: ${err.message}`);
      return resultBuf;
    }
  }

  /**
   * 对单张图片进行简历照片分类
   * @returns category: 'photo'|'cooking'|'confinementMeal'|'complementaryFood'|'certificate'|'medical'|'positiveReview'
   */
  async classifyResumePhoto(
    imageBase64: string,
    mimeType: string,
    jobType?: string,
  ): Promise<{ category: string; reason: string }> {
    if (!this.isConfigured()) throw new Error('AI 服务未配置');

    const jobTypeHint = jobType ? `（该阿姨当前工种：${jobType}）` : '';
    const systemPrompt = `你是家政CRM照片分类助手。请判断这张照片属于哪个分类。${jobTypeHint}

分类规则：
- photo（个人照片）：照片中有人物/人脸，或个人形象照
- certificate（技能证书）：证书、资格证、培训证书、职业证书等文件
- medical（体检报告）：体检单、医疗报告、健康证等医疗文件
- positiveReview（好评截图）：手机截图，包含聊天对话、评价星级、好评文字
- confinementMeal（月子餐）：产后月子期间的饭菜、月子餐食物照片
- complementaryFood（辅食）：婴儿辅食、宝宝食物、儿童辅食添加照片
- cooking（烹饪）：一般家常菜、烹饪、食物照片（非月子餐、非辅食）

注意：若工种含"月嫂"，食物照片优先分为confinementMeal；若工种含"育儿"，食物照片优先分为complementaryFood；其他工种的食物照片分为cooking。

只返回纯JSON（不要代码块）：{"category":"photo","reason":"简短理由"}`;

    try {
      const response = await axios.post<QwenResponse>(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
                { type: 'text', text: '请判断这张图片的分类。' },
              ],
            },
          ],
          max_tokens: 200,
        },
      );

      const content = response.data.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[^{}]+\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const validCategories = ['photo', 'certificate', 'medical', 'positiveReview', 'confinementMeal', 'complementaryFood', 'cooking'];
        const category = validCategories.includes(parsed.category) ? parsed.category : 'photo';
        return { category, reason: parsed.reason || '' };
      }
      return { category: 'photo', reason: '无法解析分类结果' };
    } catch (error) {
      this.logger.error(`[分类] 图片分类失败: ${error.message}`);
      return { category: 'photo', reason: '分类失败，默认个人照片' };
    }
  }

  /**
   * 批量分类简历照片（并发处理，最多20张）
   */
  async classifyResumePhotos(
    files: Express.Multer.File[],
    jobType?: string,
  ): Promise<Array<{ index: number; category: string; reason: string }>> {
    const results = await Promise.all(
      files.map(async (file, index) => {
        const imageBase64 = file.buffer.toString('base64');
        const result = await this.classifyResumePhoto(imageBase64, file.mimetype, jobType);
        return { index, ...result };
      }),
    );
    return results;
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

  /**
   * 根据简历信息生成约50字推荐文案
   * 格式：【推荐理由】XXX阿姨是（工种），具备（技能），有X年经验，擅长（特长描述）
   */
  async generateRecommendation(resume: {
    name?: string;
    jobType?: string;
    skills?: string[];
    experienceYears?: number;
    workExperiences?: Array<{ description?: string; jobType?: string }>;
  }): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('AI 服务未配置');
    }

    // 工种中文映射
    const jobTypeMap: Record<string, string> = {
      'yuesao': '月嫂',
      'zhujia-yuer': '住家育儿嫂',
      'baiban-yuer': '白班育儿嫂',
      'baojie': '保洁',
      'baiban-baomu': '白班保姆',
      'zhujia-baomu': '住家保姆',
      'yangchong': '养宠师',
      'xiaoshi': '小时工',
      'zhujia-hulao': '住家护老',
    };

    // 技能中文映射
    const skillMap: Record<string, string> = {
      'chanhou': '产后修复师',
      'teshu-yinger': '特殊婴儿护理',
      'yiliaobackground': '医疗背景',
      'yuying': '高级育婴师',
      'zaojiao': '早教师',
      'fushi': '辅食营养师',
      'ertui': '小儿推拿师',
      'waiyu': '外语',
      'zhongcan': '中餐',
      'xican': '西餐',
      'mianshi': '面食',
      'jiashi': '驾驶',
      'shouyi': '整理收纳',
      'muying': '母婴护理师',
      'cuiru': '高级催乳师',
      'yuezican': '月子餐营养师',
      'yingyang': '营养搭配',
      'liliao-kangfu': '理疗康复',
      'shuangtai-huli': '双胎护理',
      'yanglao-huli': '养老护理',
    };

    const jobTypeLabel = jobTypeMap[resume.jobType || ''] || resume.jobType || '家政服务';
    const skillLabels = (resume.skills || []).map(s => skillMap[s] || s).slice(0, 4);
    const experienceYears = resume.experienceYears || 0;
    const name = resume.name || '阿姨';
    const workDescriptions = (resume.workExperiences || [])
      .map(w => w.description || '')
      .filter(Boolean)
      .slice(0, 3)
      .join('；');

    const prompt = `你是家政公司的推荐文案撰写助手，请根据以下简历信息，生成一段约50字的推荐理由文案。

格式要求：
- 必须以"【推荐理由】"开头
- 格式：【推荐理由】${name}阿姨是（工种），具备（技能/资质），有X年经验，擅长（具体特长描述）
- 总长度约50字，不超过60字
- 全程使用纯中文，严禁出现任何英文字母、英文单词
- 严禁出现任何编号、ID、数字编码、字母组合（如8F493F、ABC123等）
- 严禁出现"accepting"、"available"等任何英文状态词
- 只输出推荐文案本身，不要任何额外说明、标注或解释

简历信息：
- 姓名：${name}
- 工种：${jobTypeLabel}
- 技能/资质：${skillLabels.length > 0 ? skillLabels.join('、') : '专业家政服务'}
- 从业年限：${experienceYears}年
- 工作经历摘要：${workDescriptions || '有丰富的家政服务经验'}

请直接输出推荐文案，不要任何额外解释。`;

    try {
      const response = await axios.post<QwenResponse>(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            { role: 'user', content: prompt },
          ],
          max_tokens: 200,
          temperature: 0.7,
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

      const content = (response.data.choices[0]?.message?.content || '').trim();
      this.logger.log(`[推荐文案生成] 成功，内容长度: ${content.length}`);
      return content;
    } catch (error) {
      this.logger.error('[推荐文案生成] 失败:', error.message);
      throw error;
    }
  }
}
