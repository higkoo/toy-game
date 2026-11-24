/* 糖豆快吃 — 12 个原创关卡
 * 坐标固定 720×1080；goal 是糖豆嘴的位置。
 */
(function (root) {
  'use strict';
  const LEVELS = [
    {
      id: 1, name: '第一口', hint: '按住并划过绳索',
      candy: { x: 360, y: 330 },
      anchors: [{ x: 360, y: 180, length: 160 }],
      stars: [{ x: 360, y: 470 }, { x: 360, y: 590 }, { x: 360, y: 710 }],
      goal: { x: 360, y: 930 },
    },
    {
      id: 2, name: '荡起来', hint: '先切左边，等糖果荡到右边再切右边',
      candy: { x: 360, y: 400 },
      anchors: [{ x: 170, y: 180 }, { x: 550, y: 180 }],
      stars: [{ x: 470, y: 490 }, { x: 570, y: 610 }, { x: 645, y: 735 }],
      goal: { x: 650, y: 930 },
    },
    {
      id: 3, name: '泡泡升空', hint: '切断绳子，让糖果落进泡泡；升到高处再点破',
      candy: { x: 360, y: 320 },
      anchors: [{ x: 360, y: 170, length: 160 }],
      bubbles: [{ x: 360, y: 620, r: 58, drift: 1.45, lift: 2.2 }],
      stars: [{ x: 360, y: 480 }, { x: 440, y: 520 }, { x: 520, y: 360 }],
      goal: { x: 560, y: 930 },
    },
    {
      id: 4, name: '蘑菇弹弓', hint: '让糖果落在蘑菇上，借力弹到右边',
      candy: { x: 220, y: 300 },
      anchors: [{ x: 220, y: 170, length: 150 }],
      pads: [{ x: 250, y: 810, w: 200, angle: -18, power: 0.9 }],
      stars: [{ x: 330, y: 540 }, { x: 435, y: 505 }, { x: 535, y: 710 }],
      goal: { x: 600, y: 930 },
    },
    {
      id: 5, name: '尖刺走廊', hint: '中间有尖刺，先切一边，荡过去再切另一边',
      candy: { x: 360, y: 390 },
      anchors: [{ x: 170, y: 180 }, { x: 550, y: 180 }],
      spikes: [{ x: 360, y: 800, r: 44 }],
      stars: [{ x: 480, y: 520 }, { x: 580, y: 650 }, { x: 620, y: 735 }],
      goal: { x: 650, y: 930 },
    },
    {
      id: 6, name: '三重绳', hint: '先切左右两根，最后再切中间',
      candy: { x: 360, y: 390 },
      anchors: [{ x: 170, y: 180 }, { x: 360, y: 160 }, { x: 550, y: 180 }],
      stars: [{ x: 360, y: 510 }, { x: 360, y: 660 }, { x: 360, y: 800 }],
      goal: { x: 360, y: 930 },
    },
    {
      id: 7, name: '旋转挂点', hint: '挂点会转，等糖果转到右边再切',
      candy: { x: 360, y: 430 },
      anchors: [{ x: 460, y: 230, orbit: { cx: 360, cy: 230, r: 100, speed: 0.5, phase: 0 } }],
      stars: [{ x: 460, y: 530 }, { x: 560, y: 650 }, { x: 600, y: 720 }],
      goal: { x: 610, y: 930 },
    },
    {
      id: 8, name: '泡泡过刺', hint: '泡泡会向右飘，躲开下面的尖刺再点破',
      candy: { x: 320, y: 320 },
      anchors: [{ x: 320, y: 170, length: 160 }],
      bubbles: [{ x: 320, y: 680, r: 58, drift: 1.45, lift: 2.2 }],
      spikes: [{ x: 360, y: 855, r: 48 }],
      stars: [{ x: 320, y: 480 }, { x: 390, y: 545 }, { x: 430, y: 455 }],
      goal: { x: 540, y: 930 },
    },
    {
      id: 9, name: '节奏尖刺', hint: '等尖刺滑到旁边，再切绳子',
      candy: { x: 360, y: 320 },
      anchors: [{ x: 360, y: 170, length: 160 }],
      spikes: [{ x: 360, y: 780, r: 42, move: { x: 130, y: 0, speed: 1.35, phase: 0 } }],
      stars: [{ x: 360, y: 480 }, { x: 360, y: 620 }, { x: 360, y: 700 }],
      goal: { x: 360, y: 930 },
    },
    {
      id: 10, name: '弹跳高台', hint: '切绳后让糖果落在斜蘑菇上，弹向右边高台',
      candy: { x: 240, y: 300 },
      anchors: [{ x: 240, y: 170, length: 150 }],
      pads: [{ x: 270, y: 790, w: 210, angle: -25, power: 0.85 }],
      spikes: [{ x: 380, y: 940, r: 46 }],
      stars: [{ x: 317, y: 633 }, { x: 451, y: 536 }, { x: 581, y: 686 }],
      goal: { x: 650, y: 930 },
    },
    {
      id: 11, name: '窄门', hint: '两颗尖刺中间只有一条缝，切绳时别偏',
      candy: { x: 360, y: 320 },
      anchors: [{ x: 360, y: 170, length: 160 }],
      spikes: [{ x: 295, y: 760, r: 42 }, { x: 425, y: 760, r: 42 }],
      stars: [{ x: 360, y: 470 }, { x: 360, y: 570 }, { x: 360, y: 660 }],
      goal: { x: 360, y: 930 },
    },
    {
      id: 12, name: '最后一颗', hint: '三根绳、一颗刺；先荡开，再切中间',
      candy: { x: 360, y: 390 },
      anchors: [{ x: 170, y: 180 }, { x: 360, y: 150 }, { x: 550, y: 180 }],
      spikes: [{ x: 360, y: 790, r: 46 }],
      stars: [{ x: 470, y: 520 }, { x: 527, y: 643 }, { x: 558, y: 740 }],
      goal: { x: 560, y: 930 },
    },
  ];
  if (typeof module !== 'undefined' && module.exports) module.exports = LEVELS;
  root.TANGDOU_LEVELS = LEVELS;
})(typeof globalThis !== 'undefined' ? globalThis : this);
