/* 九宫 · 数独核心
 * 原创实现：生成完整解、挖空并校验唯一解、候选计算。
 * 不依赖 DOM，既可在浏览器运行，也可被 Node 测试直接 require。
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SudokuCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SIZE = 9;
  const CELLS = 81;
  const ALL = 0x1ff;

  const DIFFICULTIES = [
    { id: 'easy', label: '简单', clues: 40, tagline: '轻松热身' },
    { id: 'normal', label: '一般', clues: 34, tagline: '刚刚好' },
    { id: 'hard', label: '困难', clues: 30, tagline: '需要一点耐心' },
    { id: 'expert', label: '特难', clues: 27, tagline: '步步为营' },
    { id: 'hell', label: '地狱', clues: 24, tagline: '留给深夜' },
  ];

  const BY_ID = Object.fromEntries(DIFFICULTIES.map((d) => [d.id, d]));

  function difficultyOf(id) {
    return BY_ID[id] || BY_ID.normal;
  }

  function makeRng(seed) {
    if (seed === undefined || seed === null || seed === '') return Math.random;
    let h = 2166136261 >>> 0;
    const text = String(seed);
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return function rng() {
      h += 0x6d2b79f5;
      let t = h;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(list, rng) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = list[i];
      list[i] = list[j];
      list[j] = tmp;
    }
    return list;
  }

  function popcount(mask) {
    let count = 0;
    while (mask) {
      mask &= mask - 1;
      count++;
    }
    return count;
  }

  function boxOf(index) {
    const row = Math.floor(index / SIZE);
    const col = index % SIZE;
    return Math.floor(row / 3) * 3 + Math.floor(col / 3);
  }

  function maskNumbers(mask) {
    const nums = [];
    for (let n = 1; n <= 9; n++) {
      if (mask & (1 << (n - 1))) nums.push(n);
    }
    return nums;
  }

  function normalizeBoard(board) {
    if (board instanceof Uint8Array && board.length === CELLS) return Uint8Array.from(board);
    const out = new Uint8Array(CELLS);
    if (Array.isArray(board) && board.length === CELLS) {
      for (let i = 0; i < CELLS; i++) out[i] = Number(board[i]) || 0;
      return out;
    }
    if (Array.isArray(board) && board.length === SIZE) {
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) out[r * SIZE + c] = Number(board[r][c]) || 0;
      }
      return out;
    }
    if (board && typeof board === 'object' && typeof board.length === 'number') {
      for (let i = 0; i < Math.min(CELLS, board.length); i++) out[i] = Number(board[i]) || 0;
    }
    return out;
  }

  function buildMasks(board) {
    const rows = new Uint16Array(SIZE);
    const cols = new Uint16Array(SIZE);
    const boxes = new Uint16Array(SIZE);
    for (let i = 0; i < CELLS; i++) {
      const value = board[i];
      if (!value) continue;
      if (value < 1 || value > 9) return null;
      const bit = 1 << (value - 1);
      const row = Math.floor(i / SIZE);
      const col = i % SIZE;
      const box = boxOf(i);
      if ((rows[row] | cols[col] | boxes[box]) & bit) return null;
      rows[row] |= bit;
      cols[col] |= bit;
      boxes[box] |= bit;
    }
    return { rows, cols, boxes };
  }

  function generateSolution(rng) {
    const board = new Uint8Array(CELLS);
    const rows = new Uint16Array(SIZE);
    const cols = new Uint16Array(SIZE);
    const boxes = new Uint16Array(SIZE);

    function solve() {
      let bestIndex = -1;
      let bestMask = 0;
      let bestCount = 10;
      for (let i = 0; i < CELLS; i++) {
        if (board[i] !== 0) continue;
        const row = Math.floor(i / SIZE);
        const col = i % SIZE;
        const box = boxOf(i);
        const mask = ALL & ~(rows[row] | cols[col] | boxes[box]);
        const count = popcount(mask);
        if (count === 0) return false;
        if (count < bestCount) {
          bestIndex = i;
          bestMask = mask;
          bestCount = count;
          if (count === 1) break;
        }
      }
      if (bestIndex < 0) return true;

      const nums = shuffle(maskNumbers(bestMask), rng);
      const row = Math.floor(bestIndex / SIZE);
      const col = bestIndex % SIZE;
      const box = boxOf(bestIndex);
      for (const num of nums) {
        const bit = 1 << (num - 1);
        board[bestIndex] = num;
        rows[row] |= bit;
        cols[col] |= bit;
        boxes[box] |= bit;
        if (solve()) return true;
        board[bestIndex] = 0;
        rows[row] &= ~bit;
        cols[col] &= ~bit;
        boxes[box] &= ~bit;
      }
      return false;
    }

    return solve() ? board : new Uint8Array(CELLS);
  }

  function countSolutions(inputBoard, limit) {
    const board = normalizeBoard(inputBoard);
    const masks = buildMasks(board);
    if (!masks) return 0;
    const { rows, cols, boxes } = masks;
    const max = limit === undefined ? 2 : Math.max(1, Number(limit) || 1);
    let count = 0;

    function search() {
      if (count >= max) return;
      let bestIndex = -1;
      let bestMask = 0;
      let bestCount = 10;
      for (let i = 0; i < CELLS; i++) {
        if (board[i] !== 0) continue;
        const row = Math.floor(i / SIZE);
        const col = i % SIZE;
        const box = boxOf(i);
        const mask = ALL & ~(rows[row] | cols[col] | boxes[box]);
        const n = popcount(mask);
        if (n === 0) return;
        if (n < bestCount) {
          bestIndex = i;
          bestMask = mask;
          bestCount = n;
          if (n === 1) break;
        }
      }
      if (bestIndex < 0) {
        count++;
        return;
      }
      const row = Math.floor(bestIndex / SIZE);
      const col = bestIndex % SIZE;
      const box = boxOf(bestIndex);
      for (const num of maskNumbers(bestMask)) {
        const bit = 1 << (num - 1);
        board[bestIndex] = num;
        rows[row] |= bit;
        cols[col] |= bit;
        boxes[box] |= bit;
        search();
        board[bestIndex] = 0;
        rows[row] &= ~bit;
        cols[col] &= ~bit;
        boxes[box] &= ~bit;
        if (count >= max) return;
      }
    }

    search();
    return count;
  }

  function makePuzzle(difficultyId, seed) {
    const difficulty = difficultyOf(difficultyId);
    let best = null;

    // 24 个提示数已经接近唯一解的下限，单次挖空有时会停在 25-26。
    // 多试几次并保留提示数最少的一版；每次生成通常在 10ms 内。
    for (let attempt = 0; attempt < 8; attempt++) {
      const rng = makeRng(seed === undefined || seed === null || seed === '' ? null : `${seed}#${attempt}`);
      const solution = generateSolution(rng);
      const puzzle = Uint8Array.from(solution);
      let clues = CELLS;
      const order = shuffle(Array.from({ length: CELLS }, (_, i) => i), rng);

      for (const index of order) {
        if (clues <= difficulty.clues) break;
        const previous = puzzle[index];
        if (!previous) continue;
        puzzle[index] = 0;
        if (countSolutions(puzzle, 2) !== 1) {
          puzzle[index] = previous;
        } else {
          clues--;
        }
      }

      const unique = countSolutions(puzzle, 2) === 1;
      const candidate = {
        difficulty: difficulty.id,
        label: difficulty.label,
        targetClues: difficulty.clues,
        clues,
        puzzle: Array.from(puzzle),
        solution: Array.from(solution),
        unique,
        seed: seed === undefined || seed === null || seed === '' ? null : String(seed),
      };
      if (!best || clues < best.clues) best = candidate;
      if (clues <= difficulty.clues) break;
    }

    return best;
  }

  function candidateMask(board, index) {
    const value = board[index];
    if (value) return 0;
    const row = Math.floor(index / SIZE);
    const col = index % SIZE;
    const box = boxOf(index);
    let used = 0;
    for (let c = 0; c < SIZE; c++) {
      const v = board[row * SIZE + c];
      if (v) used |= 1 << (v - 1);
    }
    for (let r = 0; r < SIZE; r++) {
      const v = board[r * SIZE + col];
      if (v) used |= 1 << (v - 1);
    }
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const v = board[(br + r) * SIZE + bc + c];
        if (v) used |= 1 << (v - 1);
      }
    }
    return ALL & ~used;
  }

  function candidatesFor(board, index, excludedMask) {
    return maskNumbers(candidateMask(board, index) & ~(excludedMask || 0));
  }

  function validateSolution(board) {
    const normalized = normalizeBoard(board);
    const masks = buildMasks(normalized);
    if (!masks) return false;
    for (let i = 0; i < CELLS; i++) if (!normalized[i]) return false;
    for (let i = 0; i < SIZE; i++) {
      if (popcount(masks.rows[i]) !== 9 || popcount(masks.cols[i]) !== 9 || popcount(masks.boxes[i]) !== 9) {
        return false;
      }
    }
    return true;
  }

  function formatTime(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const minutes = Math.floor(total / 60);
    const secs = total % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  return {
    SIZE,
    CELLS,
    DIFFICULTIES,
    difficultyOf,
    makeRng,
    generateSolution,
    countSolutions,
    makePuzzle,
    candidateMask,
    candidatesFor,
    validateSolution,
    normalizeBoard,
    formatTime,
  };
});
