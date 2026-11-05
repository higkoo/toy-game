/** 全片文案与课程数据 —— 全部取自产品源码 v1.15，不虚构功能 */

export type CoverKind =
  | 'meridian' | 'bamboo' | 'herb' | 'six'
  | 'cabinet' | 'heart' | 'case';

export interface CourseItem {
  idx: string;
  name: string;
  en: string;
  tag: string;
  desc: string;
  eps: string;
  action: string;
  kind?: CoverKind;
  /** public/img/ 下的真实课程封面文件名；缺省时回退到程序化 SVG 纹样 */
  cover?: string;
}

/** 真实素材索引：与产品源码 src/img/ 一一对应 */
export const ASSETS = {
  portrait: 'hero-portrait.jpg',
  icon: 'icon.png',
  poster: 'poster.jpg',
  tianji: 'cover-tianji.jpg',
  diji: 'diji-vista.jpg',
  zhenjiu: 'cover-zhenjiu.jpg',
  neijing: 'cover-neijing.jpg',
  bencao: 'cover-bencao.jpg',
  shanghan: 'cover-shanghan.jpg',
  jingui: 'cover-jingui.jpg',
  zhongjing: 'cover-zhongjing.jpg',
} as const;

export const TIANJI: CourseItem[] = [
  {
    idx: '天纪 · 一', name: '天机道', en: 'The Way of Heaven', tag: '易理 / 象数',
    desc: '以易经六十四卦为纲，讲阴阳消长、时位变化。',
    eps: '24 集 · 合集', action: '讲义',
  },
  {
    idx: '天纪 · 二', name: '人间道', en: 'The Way of Man', tag: '人事 / 处世',
    desc: '把易理落回人间：进退、取舍、聚散、成败。',
    eps: '24 集 · 合集', action: '讲义',
  },
  {
    idx: '天纪 · 三', name: '地脉道', en: 'The Way of Earth', tag: '山川 / 形势',
    desc: '由天及地，讲山川形势与居所格局。',
    eps: '24 集 · 合集', action: '讲义',
  },
];

export const RENJI_BASE: CourseItem[] = [
  {
    idx: '人纪 · 一', name: '针灸', en: 'Acupuncture & Moxibustion', tag: '经络 / 针法',
    desc: '十二经络、奇经八脉、穴位与手法，先建立身体的经络地图。',
    eps: '12 集 · 合集', action: '笔记', kind: 'meridian', cover: ASSETS.zhenjiu,
  },
  {
    idx: '人纪 · 二', name: '黄帝内经', en: 'The Inner Canon', tag: '医理 / 经典',
    desc: '从阴阳五行、藏象经络讲到养生与治则，是中医思维的地基。',
    eps: '12 集 · 合集', action: '笔记', kind: 'bamboo', cover: ASSETS.neijing,
  },
  {
    idx: '人纪 · 三', name: '神农本草经', en: 'The Materia Medica', tag: '本草 / 药性',
    desc: '一味一味讲药：性味、归经、主治与配伍。',
    eps: '8 集 · 合集', action: '笔记', kind: 'herb', cover: ASSETS.bencao,
  },
];

export const RENJI_FANG: CourseItem[] = [
  {
    idx: '人纪 · 四', name: '伤寒论', en: 'Treatise on Cold Damage', tag: '六经 / 辨证',
    desc: '六经辨证主体课程，逐条讲方证与传变。',
    eps: '8 集 · 合集', action: '笔记', kind: 'six', cover: ASSETS.shanghan,
  },
  {
    idx: '人纪 · 五', name: '金匮要略', en: 'The Golden Cabinet', tag: '杂病 / 方证',
    desc: '承接伤寒，专讲杂病，以病为纲、以方为目。',
    eps: '11 集 · 合集', action: '笔记', kind: 'cabinet', cover: ASSETS.jingui,
  },
  {
    idx: '人纪 · 六', name: '仲景心法', en: 'The Heart of Zhongjing', tag: '心法 / 临证',
    desc: '不逐条讲书，而讲张仲景如何看证、定方。',
    eps: '5 讲 · 合集', action: '讲义', kind: 'heart', cover: ASSETS.zhongjing,
  },
  {
    // 源码中「医案」卡片无独立封面，用 Toy 系列海报作为整套课程的收束
    idx: '人纪 · 七', name: '医案', en: 'Clinical Cases', tag: '医案 / 实录',
    desc: '以真实病例串起理论与方药，看如何落笔、转方。',
    eps: '17 集 · 合集', action: '讲义', kind: 'case', cover: ASSETS.poster,
  },
];

/** 场景 02 散落小卡用的课程名 */
export const ALL_COURSE_NAMES = [
  '天机道', '人间道', '地脉道',
  ...RENJI_BASE.map((c) => c.name),
  ...RENJI_FANG.map((c) => c.name),
  '地纪残章',
];

/** 学习路径（源码「如何开始」卡片） */
export const LEARNING_PATH = ['针灸', '黄帝内经', '神农本草经', '伤寒论', '金匮要略'];

/** 逐场概括句（保留作分镜脚本对照，成片字幕改用下方 NARRATION 逐句解说轨） */
export const SUBTITLES: Record<string, string> = {
  '01': '一套跨越命理、医道与山川的讲学全集',
  '02': '想系统学倪海厦，最难的不是听懂，是找齐',
  '03': '天纪讲天道，人纪讲医道，地纪是未写完的结尾',
  '04': '以易经为骨：卦象推演、人事进退、山川形势',
  '05': '从针灸建立身体观，再由内经立医理、本草识药性',
  '06': '伤寒、金匮入经方之门，仲景心法与医案收在最后',
  '07': '地纪只留下片段与提纲，页面也给出了一条不绕弯的顺序',
  '08': '观看与讲义双入口，App 内点开即播，打不开自动给链接',
  '09': '一页索引，重走一遍传统之学的脉络',
};

export interface Caption {
  /** 绝对帧（含） */
  from: number;
  /** 绝对帧（不含）；相邻两条严格接续，切换时前条淡出、后条淡入 */
  to: number;
  text: string;
}

/**
 * 全片解说字幕轨：24 条，跟着画面内容逐点讲解。
 * 每条 2.2–3.3 秒，单条控制在 30 字内以保证一行不溢出。
 * 文案全部对应产品源码的真实结构，不虚构功能。
 */
export const NARRATION: Caption[] = [
  // 01 · 序（0–180）
  {from: 42,  to: 100,  text: '一套跨越命理、医道与山川的讲学全集'},
  {from: 100, to: 180,  text: '天纪、人纪、地纪，收进同一页索引'},
  // 02 · 从散到聚（180–360）
  {from: 180, to: 262,  text: '想系统学倪海厦，最难的不是听懂，是找齐'},
  {from: 262, to: 360,  text: '视频散在各处，讲义与课程顺序更难凑齐'},
  // 03 · 三纪总览（360–570）
  {from: 360, to: 440,  text: '天纪讲天道，人纪讲医道，地纪是未写完的结尾'},
  {from: 440, to: 505,  text: '三大体系、十一部课程，全集完整收录'},
  {from: 505, to: 570,  text: '页面按原书脉络排布，不重新编排'},
  // 04 · 天纪（570–780）
  {from: 570, to: 645,  text: '天纪以易经为骨，从紫微斗数讲起'},
  {from: 645, to: 712,  text: '天机道讲卦象推演，人间道讲进退取舍'},
  {from: 712, to: 780,  text: '地脉道由天及地，落到山川形势'},
  // 05 · 人纪 · 筑基（780–990）
  {from: 780, to: 855,  text: '人纪从针灸入手，先建立身体的经络地图'},
  {from: 855, to: 925,  text: '黄帝内经立医理，神农本草经识药性'},
  {from: 925, to: 990,  text: '三门筑基课，每门都有观看与笔记双入口'},
  // 06 · 人纪 · 方证（990–1200）
  {from: 990,  to: 1065, text: '伤寒论、金匮要略，进入经方的方证世界'},
  {from: 1065, to: 1135, text: '仲景心法讲看证定方，医案看真实病例'},
  {from: 1135, to: 1200, text: '沿这条路由术入道，七部课一气贯通'},
  // 07 · 地纪 · 未竟（1200–1410）
  {from: 1200, to: 1275, text: '地纪只留下片段与提纲，页面如实标注未竟'},
  {from: 1275, to: 1345, text: '不补齐、不臆造，保留原讲学的样子'},
  {from: 1345, to: 1410, text: '并给出一条不绕弯的顺序：由针灸入门，一路到金匮'},
  // 08 · 交互亮点（1410–1620）
  {from: 1410, to: 1485, text: '观看与讲义双入口，点开即播'},
  {from: 1485, to: 1555, text: 'App 内原生播放，分集面板直接切换'},
  {from: 1555, to: 1620, text: '打不开自动给链接，讲义、笔记、资源包一并备好'},
  // 09 · 结语（1620–1800）
  {from: 1620, to: 1700, text: '一页索引，重走一遍传统之学的脉络'},
  {from: 1700, to: 1800, text: 'bilibili.com/toy/sanji · 仅供研习参考'},
];

export const CODA_QUOTE = '为天地立心，为生民立命，为往圣继绝学';
export const PRODUCT_URL = 'bilibili.com/toy/sanji';
export const DISCLAIMER =
  '本页仅提供检索与导航，内容涉及医学，仅供研习参考，不能替代专业诊疗；课程版权归原作者及相关平台所有。';
