/** 课程与素材索引 —— 与 benneng/src/data/videos.js 保持一致 */
export interface Collection {
  id: string;
  name: string;
  count: number;
  intro: string;
  cover: string;
}

export const TOTAL = 164;

export const COLLECTIONS: Collection[] = [
  {
    id: 'shanghan',
    name: '说白伤寒论',
    count: 20,
    intro: '以白话讲透《伤寒论》的六经、发热与发汗解肌。',
    cover: 'img/cover-shanghan.jpg',
  },
  {
    id: 'dachuancheng1',
    name: '大医传承 · 第1期',
    count: 53,
    intro: '从生命本能系统概述，到六经辨证与常见病证治。',
    cover: 'img/cover-tcm1.jpg',
  },
  {
    id: 'dachuancheng2',
    name: '大医传承 · 第2期',
    count: 43,
    intro: '进阶与答疑：案例分析、经方系列与妇儿老年证治。',
    cover: 'img/cover-tcm2.jpg',
  },
  {
    id: 'benneng',
    name: '本能系统论',
    count: 48,
    intro: '从生命本能、升降出入到方法系统论，搭起完整框架。',
    cover: 'img/cover-benneng.jpg',
  },
];

export const ASSETS = {
  hero: 'img/hero-portrait.jpg',
  icon: 'img/icon.jpg',
};

export const BRAND = {
  seal: '本',
  name: '大医传承',
  title: '郭生白',
  subtitle: '视频全集',
  eyebrow: '郭生白 · 本能系统医学',
  series: '说白伤寒论 · 大医传承 · 本能系统论',
  codaTitle: '4 个合集 · 164 集',
  codaSub: '从《伤寒论》到本能系统论，一处看完',
};
