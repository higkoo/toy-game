/* 九宫 · 数独界面与交互 */
(function () {
  'use strict';

  const core = window.SudokuCore;
  if (!core) throw new Error('SudokuCore 未加载');

  const STORAGE_KEY = 'jiugong-best-v1';
  const MAX_ERRORS = 3;

  const $ = (id) => document.getElementById(id);

  const dom = {
    board: $('board'),
    loading: $('loading'),
    timer: $('timer'),
    errorCount: $('errorCount'),
    errorStat: $('errorStat'),
    difficultyLabel: $('difficultyLabel'),
    difficultyBtn: $('difficultyBtn'),
    menuBtn: $('menuBtn'),
    menuSheet: $('menuSheet'),
    difficultyOptions: $('difficultyOptions'),
    modeNote: $('modeNote'),
    undoBtn: $('undoBtn'),
    excludeBtn: $('excludeBtn'),
    hintBtn: $('hintBtn'),
    revealBtn: $('revealBtn'),
    numberPad: $('numberPad'),
    bestLabel: $('bestLabel'),
    foot: $('foot'),
    footNote: $('footNote'),
    resultScreen: $('resultScreen'),
    resultKicker: $('resultKicker'),
    resultTitle: $('resultTitle'),
    resultBody: $('resultBody'),
    resultTime: $('resultTime'),
    resultErrors: $('resultErrors'),
    resultDifficulty: $('resultDifficulty'),
    resultBest: $('resultBest'),
    resultPrimary: $('resultPrimary'),
    resultSecondary: $('resultSecondary'),
    resultEmblem: $('resultEmblem'),
    confirmScreen: $('confirmScreen'),
    confirmBody: $('confirmBody'),
    confirmCancel: $('confirmCancel'),
    confirmOk: $('confirmOk'),
    helpScreen: $('helpScreen'),
    helpClose: $('helpClose'),
  };

  const state = {
    phase: 'boot',
    difficulty: 'normal',
    mode: 'normal',
    puzzle: new Uint8Array(81),
    solution: new Uint8Array(81),
    board: new Uint8Array(81),
    fixed: new Uint8Array(81),
    selected: -1,
    errors: 0,
    maxErrors: MAX_ERRORS,
    history: [],
    excluded: new Uint8Array(81),
    excludeActive: false,
    hintsUsed: 0,
    hinted: new Set(),
    elapsed: 0,
    timerStarted: false,
    timerId: null,
    startEpoch: 0,
    bests: {},
    seed: null,
    generationToken: 0,
    resultKind: null,
    firstGame: true,
  };

  const cells = [];
  const valueEls = [];
  const notesEls = [];
  let toastTimer = null;
  let numberButtons = [];
  let modeButtons = [];

  function init() {
    state.bests = loadBests();
    buildBoard();
    buildDifficultyOptions();
    bindEvents();
    newGame('normal', { first: true });
  }

  function buildBoard() {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 81; i++) {
      const row = Math.floor(i / 9);
      const col = i % 9;
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cell';
      cell.dataset.index = String(i);
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-rowindex', String(row + 1));
      cell.setAttribute('aria-colindex', String(col + 1));
      cell.setAttribute('aria-label', `第 ${row + 1} 行，第 ${col + 1} 列`);

      const value = document.createElement('span');
      value.className = 'value';
      const notes = document.createElement('span');
      notes.className = 'notes';
      notes.setAttribute('aria-hidden', 'true');
      const notesForCell = [];
      for (let n = 1; n <= 9; n++) {
        const note = document.createElement('span');
        note.className = 'note blank';
        note.textContent = String(n);
        notes.appendChild(note);
        notesForCell.push(note);
      }
      cell.appendChild(value);
      cell.appendChild(notes);
      cell.addEventListener('click', () => selectCell(i));
      fragment.appendChild(cell);
      cells.push(cell);
      valueEls.push(value);
      notesEls.push(notesForCell);
    }
    dom.board.appendChild(fragment);
  }

  function buildDifficultyOptions() {
    const fragment = document.createDocumentFragment();
    core.DIFFICULTIES.forEach((difficulty) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'diff-option';
      button.dataset.difficulty = difficulty.id;
      button.innerHTML = `<span>${difficulty.label}</span><small>${difficulty.clues} 提示</small>`;
      button.addEventListener('click', () => {
        if (state.difficulty === difficulty.id && state.phase === 'playing') {
          closeMenu();
          return;
        }
        newGame(difficulty.id);
      });
      fragment.appendChild(button);
    });
    dom.difficultyOptions.appendChild(fragment);
  }

  function bindEvents() {
    dom.difficultyBtn.addEventListener('click', openMenu);
    dom.menuBtn.addEventListener('click', openMenu);
    dom.menuSheet.addEventListener('click', (event) => {
      const close = event.target.closest('[data-close="menu"]');
      if (close) closeMenu();
    });
    dom.menuSheet.querySelectorAll('[data-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.action;
        if (action === 'restart') {
          closeMenu();
          restartCurrent();
        } else if (action === 'new') {
          closeMenu();
          newGame(state.difficulty);
        } else if (action === 'help') {
          closeMenu();
          dom.helpScreen.hidden = false;
          dom.helpClose.focus();
        } else if (action === 'reveal') {
          closeMenu();
          requestReveal();
        }
      });
    });

    dom.numberPad.querySelectorAll('[data-number]').forEach((button) => {
      numberButtons.push(button);
      button.addEventListener('click', () => inputNumber(Number(button.dataset.number)));
    });

    document.querySelectorAll('.mode-switch [data-mode]').forEach((button) => {
      modeButtons.push(button);
      button.addEventListener('click', () => setMode(button.dataset.mode));
    });

    dom.undoBtn.addEventListener('click', undo);
    dom.excludeBtn.addEventListener('click', toggleExcludeMode);
    dom.hintBtn.addEventListener('click', useHint);
    dom.revealBtn.addEventListener('click', requestReveal);

    dom.confirmCancel.addEventListener('click', () => {
      dom.confirmScreen.hidden = true;
    });
    dom.confirmOk.addEventListener('click', revealAnswer);
    dom.confirmScreen.addEventListener('click', (event) => {
      if (event.target === dom.confirmScreen) dom.confirmScreen.hidden = true;
    });

    dom.helpClose.addEventListener('click', () => {
      dom.helpScreen.hidden = true;
    });
    dom.helpScreen.addEventListener('click', (event) => {
      if (event.target === dom.helpScreen) dom.helpScreen.hidden = true;
    });

    dom.resultPrimary.addEventListener('click', () => {
      dom.resultScreen.hidden = true;
      if (state.resultKind === 'won' || state.resultKind === 'revealed') {
        newGame(state.difficulty);
      } else {
        restartCurrent();
      }
    });
    dom.resultSecondary.addEventListener('click', () => {
      if (state.resultKind === 'revealed') {
        dom.resultScreen.hidden = true;
        restartCurrent();
      } else {
        openMenu();
      }
    });

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) freezeTimer();
    });
  }

  function loadBests() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function saveBests() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.bests));
    } catch (error) {
      /* 本地存储不可用时只影响最佳成绩，不影响游戏。 */
    }
  }

  function newGame(difficultyId, options) {
    const difficulty = core.difficultyOf(difficultyId);
    const opts = options || {};
    const token = ++state.generationToken;
    state.phase = 'generating';
    state.difficulty = difficulty.id;
    state.selected = -1;
    state.errors = 0;
    state.history = [];
    state.excluded = new Uint8Array(81);
    state.excludeActive = false;
    state.hintsUsed = 0;
    state.hinted.clear();
    freezeTimer();
    state.elapsed = 0;
    closeMenu();
    dom.resultScreen.hidden = true;
    dom.confirmScreen.hidden = true;
    dom.helpScreen.hidden = true;
    dom.board.classList.remove('is-solved');
    dom.loading.hidden = false;
    updateTimerDisplay();
    updateBestLabel();
    updateDifficultySelection();
    updateModeUI();
    render();

    const seed = opts.seed || (new URLSearchParams(location.search).get('seed') || null);
    window.setTimeout(() => {
      if (token !== state.generationToken) return;
      let generated;
      try {
        generated = core.makePuzzle(difficulty.id, seed);
      } catch (error) {
        generated = null;
      }
      if (!generated || !generated.unique) {
        dom.loading.hidden = true;
        state.phase = 'playing';
        toast('生成谜题失败，请重试');
        return;
      }

      state.puzzle = Uint8Array.from(generated.puzzle);
      state.solution = Uint8Array.from(generated.solution);
      state.board = Uint8Array.from(generated.puzzle);
      state.fixed = new Uint8Array(81);
      for (let i = 0; i < 81; i++) state.fixed[i] = state.puzzle[i] ? 1 : 0;
      state.seed = generated.seed;
      state.phase = 'playing';
      state.firstGame = false;
      dom.loading.hidden = true;
      dom.board.classList.remove('is-solved');
      render();
      if (opts.first) {
        toast('点选空格 · 用数字键盘填入 1–9', 3600);
      } else {
        toast(`新一局 · ${difficulty.label} · ${generated.clues} 个提示数`, 2000);
      }
    }, opts.first ? 20 : 60);
  }

  function restartCurrent() {
    if (!state.puzzle.some((value) => value)) return;
    state.phase = 'playing';
    state.board = Uint8Array.from(state.puzzle);
    state.selected = -1;
    state.errors = 0;
    state.history = [];
    state.excluded = new Uint8Array(81);
    state.excludeActive = false;
    state.hintsUsed = 0;
    state.hinted.clear();
    freezeTimer();
    state.elapsed = 0;
    state.timerStarted = false;
    dom.resultScreen.hidden = true;
    dom.confirmScreen.hidden = true;
    dom.board.classList.remove('is-solved');
    updateTimerDisplay();
    render();
    toast('已重开本题');
  }

  function render() {
    if (!cells.length) return;
    const selected = state.selected;
    const selectedValue = selected >= 0 ? state.board[selected] : 0;
    const selectedRow = selected >= 0 ? Math.floor(selected / 9) : -1;
    const selectedCol = selected >= 0 ? selected % 9 : -1;
    const selectedBox = selected >= 0 ? boxOf(selected) : -1;
    const notesMode = state.mode === 'candidates';

    for (let i = 0; i < 81; i++) {
      const cell = cells[i];
      const value = state.board[i];
      const isFixed = Boolean(state.fixed[i]);
      const classes = ['cell'];
      if (isFixed) classes.push('given');
      if (value && !isFixed) classes.push('user');
      if (state.hinted.has(i)) classes.push('hinted');

      const isSelected = i === selected;
      if (isSelected) classes.push('selected');
      if (!isSelected && selected >= 0) {
        const row = Math.floor(i / 9);
        const col = i % 9;
        if (row === selectedRow || col === selectedCol || boxOf(i) === selectedBox) {
          classes.push('peer');
        }
        if (selectedValue && value === selectedValue) classes.push('same');
      }

      cell.className = classes.join(' ');
      valueEls[i].textContent = value ? String(value) : '';
      const ariaValue = value ? `${value}${isFixed ? '，题目数字' : ''}` : isSelected ? '当前格，空' : '空';
      cell.setAttribute('aria-label', `第 ${Math.floor(i / 9) + 1} 行，第 ${i % 9 + 1} 列，${ariaValue}`);
      cell.setAttribute('aria-selected', isSelected ? 'true' : 'false');

      const notesVisible = notesMode && !value;
      const notesWrap = notesEls[i][0].parentElement;
      notesWrap.hidden = !notesVisible;
      if (notesVisible) {
        const legal = core.candidateMask(state.board, i);
        const excluded = state.excluded[i];
        for (let n = 1; n <= 9; n++) {
          const bit = 1 << (n - 1);
          const note = notesEls[i][n - 1];
          const possible = Boolean(legal & bit);
          note.classList.toggle('blank', !possible);
          note.classList.toggle('off', possible && Boolean(excluded & bit));
        }
      }
    }

    dom.errorCount.textContent = String(state.errors);
    updateTimerDisplay();
    updateControls();
    updateBestLabel();
  }

  function updateControls() {
    const playing = state.phase === 'playing';
    dom.undoBtn.disabled = !playing || state.history.length === 0;
    dom.excludeBtn.disabled = !playing;
    dom.hintBtn.disabled = !playing;
    dom.revealBtn.disabled = !playing;
    dom.excludeBtn.classList.toggle('active', playing && state.excludeActive);
    dom.excludeBtn.setAttribute('aria-pressed', state.excludeActive ? 'true' : 'false');
    modeButtons.forEach((button) => {
      const active = button.dataset.mode === state.mode;
      button.classList.toggle('active', active);
      button.disabled = !playing;
    });

    const counts = new Uint8Array(10);
    for (let i = 0; i < 81; i++) if (state.board[i]) counts[state.board[i]]++;
    const selectedValue = state.selected >= 0 ? state.board[state.selected] : 0;
    numberButtons.forEach((button) => {
      const n = Number(button.dataset.number);
      const full = counts[n] >= 9;
      button.disabled = !playing || full;
      button.classList.toggle('used', full);
      button.classList.toggle('active-digit', selectedValue === n);
    });

    dom.menuSheet.querySelectorAll('[data-action="reveal"]').forEach((button) => {
      button.disabled = !playing;
    });
  }

  function updateTimerDisplay() {
    dom.timer.textContent = core.formatTime(state.elapsed);
  }

  function updateBestLabel() {
    const best = state.bests[state.difficulty];
    dom.bestLabel.textContent = typeof best === 'number' ? `最佳 ${core.formatTime(best)}` : '最佳 --:--';
  }

  function updateDifficultySelection() {
    dom.difficultyLabel.textContent = core.difficultyOf(state.difficulty).label;
    dom.difficultyOptions.querySelectorAll('.diff-option').forEach((button) => {
      const active = button.dataset.difficulty === state.difficulty;
      button.classList.toggle('selected', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function updateModeUI() {
    modeButtons.forEach((button) => {
      const active = button.dataset.mode === state.mode;
      button.classList.toggle('active', active);
    });
    if (state.mode === 'normal') {
      dom.modeNote.textContent = '选中空格，填入答案';
    } else if (state.excludeActive) {
      dom.modeNote.textContent = '排除模式：点数字划掉候选';
    } else {
      dom.modeNote.textContent = '候选已展开，可直接填数';
    }
  }

  function selectCell(index) {
    if (state.phase !== 'playing') return;
    state.selected = index;
    startTimer();
    render();
  }

  function inputNumber(number) {
    if (state.phase !== 'playing') return;
    if (state.selected < 0) {
      toast('先点选一个空格');
      return;
    }
    if (state.excludeActive && state.mode === 'candidates') {
      toggleCandidate(number);
      return;
    }
    if (state.fixed[state.selected]) {
      toast('这是题目数字，不能修改');
      return;
    }
    if (state.board[state.selected]) {
      toast('这一格已经填了，撤销后可修改');
      return;
    }

    startTimer();
    const index = state.selected;
    if (state.solution[index] === number) {
      placeValue(index, number);
    } else {
      registerError(index);
    }
  }

  function placeValue(index, number, options) {
    const opts = options || {};
    state.history.push({ type: 'value', index, before: state.board[index], after: number });
    state.board[index] = number;
    if (opts.hint) {
      state.hinted.add(index);
      state.hintsUsed++;
    } else {
      state.hinted.delete(index);
    }
    render();
    const cell = cells[index];
    cell.classList.add('pop');
    window.setTimeout(() => cell.classList.remove('pop'), 240);
    if (!opts.silent) {
      if (opts.hint) toast(`提示：这一格是 ${number}`, 1800);
      checkWin();
    }
  }

  function registerError(index) {
    state.errors++;
    state.excludeActive = false;
    render();
    const cell = cells[index];
    cell.classList.remove('wrong');
    // 强制重启动画
    void cell.offsetWidth;
    cell.classList.add('wrong');
    window.setTimeout(() => cell.classList.remove('wrong'), 420);
    dom.errorStat.classList.remove('pulse');
    void dom.errorStat.offsetWidth;
    dom.errorStat.classList.add('pulse');
    window.setTimeout(() => dom.errorStat.classList.remove('pulse'), 500);
    try {
      navigator.vibrate?.(30);
    } catch (error) {
      /* 部分容器不支持震动。 */
    }

    if (state.errors >= state.maxErrors) {
      finishLost();
    } else {
      toast(`这个数字不对 · 还剩 ${state.maxErrors - state.errors} 次机会`, 2200, 'bad');
    }
  }

  function clearSelected() {
    if (state.phase !== 'playing' || state.selected < 0) return;
    const index = state.selected;
    if (state.fixed[index] || !state.board[index]) return;
    state.history.push({ type: 'value', index, before: state.board[index], after: 0 });
    state.board[index] = 0;
    state.hinted.delete(index);
    render();
  }

  function undo() {
    if (state.phase !== 'playing' || !state.history.length) return;
    const move = state.history.pop();
    if (move.type === 'value') {
      state.board[move.index] = move.before;
      if (move.before === 0) state.hinted.delete(move.index);
    } else if (move.type === 'note') {
      state.excluded[move.index] = move.before;
    }
    state.selected = move.index;
    render();
  }

  function toggleExcludeMode() {
    if (state.phase !== 'playing') return;
    if (state.mode !== 'candidates') {
      setMode('candidates');
      state.excludeActive = true;
      updateModeUI();
      render();
      toast('已切到候选模式 · 点数字划掉候选', 2200);
      return;
    }
    if (state.selected < 0 || state.fixed[state.selected] || state.board[state.selected]) {
      toast('先选一个空格，再排除候选');
      return;
    }
    state.excludeActive = !state.excludeActive;
    updateModeUI();
    render();
    toast(state.excludeActive ? '排除模式已打开' : '排除模式已关闭', 1500);
  }

  function toggleCandidate(number) {
    const index = state.selected;
    if (index < 0 || state.fixed[index] || state.board[index]) {
      toast('先选一个空格');
      return;
    }
    const legal = core.candidateMask(state.board, index);
    const bit = 1 << (number - 1);
    if (!(legal & bit)) {
      toast(`候选里没有 ${number}`);
      return;
    }
    const before = state.excluded[index];
    const after = before ^ bit;
    state.history.push({ type: 'note', index, before, after });
    state.excluded[index] = after;
    render();
    toast(after & bit ? `已排除候选 ${number}` : `已恢复候选 ${number}`, 1200);
  }

  function setMode(mode) {
    if (state.phase !== 'playing') return;
    if (mode !== 'normal' && mode !== 'candidates') return;
    state.mode = mode;
    if (mode === 'normal') state.excludeActive = false;
    updateModeUI();
    render();
  }

  function useHint() {
    if (state.phase !== 'playing') return;
    let index = state.selected;
    if (index < 0 || state.fixed[index] || state.board[index]) {
      index = firstEmptyIndex();
    }
    if (index < 0) {
      checkWin();
      return;
    }
    startTimer();
    state.selected = index;
    const number = state.solution[index];
    placeValue(index, number, { hint: true, silent: false });
  }

  function firstEmptyIndex() {
    for (let i = 0; i < 81; i++) {
      if (!state.fixed[i] && !state.board[i]) return i;
    }
    return -1;
  }

  function requestReveal() {
    if (state.phase !== 'playing') return;
    dom.confirmBody.textContent = `当前难度「${core.difficultyOf(state.difficulty).label}」，本局会立即结束，并且不计入最佳成绩。`;
    dom.confirmScreen.hidden = false;
    dom.confirmOk.focus();
  }

  function revealAnswer() {
    if (state.phase !== 'playing') {
      dom.confirmScreen.hidden = true;
      return;
    }
    for (let i = 0; i < 81; i++) state.board[i] = state.solution[i];
    state.history = [];
    state.selected = -1;
    state.excludeActive = false;
    state.phase = 'revealed';
    hideToast();
    freezeTimer();
    dom.confirmScreen.hidden = true;
    render();
    showResult('revealed');
  }

  function checkWin() {
    for (let i = 0; i < 81; i++) {
      if (!state.board[i]) return false;
    }
    finishWin();
    return true;
  }

  function finishWin() {
    if (state.phase !== 'playing') return;
    hideToast();
    state.phase = 'won';
    state.selected = -1;
    freezeTimer();
    render();
    dom.board.classList.add('is-solved');

    const previous = state.bests[state.difficulty];
    const isBest = previous === undefined || state.elapsed < previous;
    if (isBest) {
      state.bests[state.difficulty] = state.elapsed;
      saveBests();
    }
    state.lastWinWasBest = isBest;
    updateBestLabel();
    window.setTimeout(() => {
      if (state.phase === 'won') showResult('won');
    }, 560);
  }

  function finishLost() {
    if (state.phase !== 'playing') return;
    hideToast();
    state.phase = 'lost';
    state.selected = -1;
    state.excludeActive = false;
    freezeTimer();
    render();
    window.setTimeout(() => {
      if (state.phase === 'lost') showResult('lost');
    }, 420);
  }

  function showResult(kind) {
    hideToast();
    state.resultKind = kind;
    dom.resultScreen.hidden = false;
    dom.resultEmblem.textContent = kind === 'lost' ? '止' : kind === 'revealed' ? '解' : '九';
    dom.resultTime.textContent = core.formatTime(state.elapsed);
    dom.resultErrors.textContent = String(state.errors);
    dom.resultDifficulty.textContent = core.difficultyOf(state.difficulty).label;

    if (kind === 'won') {
      dom.resultKicker.textContent = '本局完成';
      dom.resultTitle.textContent = '九宫归位';
      dom.resultBody.textContent = state.hintsUsed
        ? `每一格都回到了自己的位置。这一局用了 ${state.hintsUsed} 次提示。`
        : '每一格都回到了自己的位置。没有提示，也没有多余的试探。';
      const best = state.bests[state.difficulty];
      dom.resultBest.textContent = state.lastWinWasBest
        ? `新的最佳时间 · ${core.formatTime(best)}`
        : `本难度最佳 · ${core.formatTime(best)}`;
      dom.resultPrimary.textContent = '再来一局';
      dom.resultSecondary.textContent = '换个难度';
    } else if (kind === 'lost') {
      dom.resultKicker.textContent = '本局结束';
      dom.resultTitle.textContent = '这一局，先到这里';
      dom.resultBody.textContent = '三次错误已经用完。题目还在，答案也还在等你。';
      dom.resultBest.textContent = state.bests[state.difficulty]
        ? `本难度最佳 · ${core.formatTime(state.bests[state.difficulty])}`
        : '还没有完成过这一难度';
      dom.resultPrimary.textContent = '重试本题';
      dom.resultSecondary.textContent = '换个难度';
    } else {
      dom.resultKicker.textContent = '答案已展开';
      dom.resultTitle.textContent = '把下一局留给自己';
      dom.resultBody.textContent = '完整答案已经填回棋盘。这一局不计入最佳成绩。';
      dom.resultBest.textContent = state.bests[state.difficulty]
        ? `本难度最佳 · ${core.formatTime(state.bests[state.difficulty])}`
        : '还没有完成过这一难度';
      dom.resultPrimary.textContent = '换一道';
      dom.resultSecondary.textContent = '重开本题';
    }
  }

  function startTimer() {
    if (state.phase !== 'playing' || state.timerStarted) return;
    state.timerStarted = true;
    state.startEpoch = Date.now() - state.elapsed * 1000;
    state.timerId = window.setInterval(() => {
      state.elapsed = Math.floor((Date.now() - state.startEpoch) / 1000);
      updateTimerDisplay();
    }, 1000);
  }

  function freezeTimer() {
    if (state.timerStarted) {
      state.elapsed = Math.floor((Date.now() - state.startEpoch) / 1000);
    }
    if (state.timerId) {
      window.clearInterval(state.timerId);
      state.timerId = null;
    }
    state.timerStarted = false;
    updateTimerDisplay();
  }

  function openMenu() {
    if (state.phase === 'generating') return;
    hideToast();
    updateDifficultySelection();
    updateControls();
    dom.menuSheet.hidden = false;
    dom.menuSheet.querySelector('.close-btn')?.focus();
  }

  function closeMenu() {
    dom.menuSheet.hidden = true;
  }

  function onKeyDown(event) {
    if (dom.confirmScreen.hidden === false) {
      if (event.key === 'Escape') {
        dom.confirmScreen.hidden = true;
        event.preventDefault();
      }
      return;
    }
    if (dom.helpScreen.hidden === false) {
      if (event.key === 'Escape') {
        dom.helpScreen.hidden = true;
        event.preventDefault();
      }
      return;
    }
    if (!dom.menuSheet.hidden) {
      if (event.key === 'Escape') closeMenu();
      return;
    }
    if (state.phase !== 'playing') return;

    if (/^[1-9]$/.test(event.key)) {
      event.preventDefault();
      inputNumber(Number(event.key));
      return;
    }
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      clearSelected();
      return;
    }
    if (event.key === 'z' || event.key === 'Z') {
      event.preventDefault();
      undo();
      return;
    }
    if (event.key === 'h' || event.key === 'H') {
      event.preventDefault();
      useHint();
      return;
    }

    if (event.key.startsWith('Arrow')) {
      event.preventDefault();
      if (state.selected < 0) {
        selectCell(0);
        return;
      }
      let index = state.selected;
      const row = Math.floor(index / 9);
      const col = index % 9;
      if (event.key === 'ArrowUp') index = Math.max(0, (row - 1) * 9 + col);
      if (event.key === 'ArrowDown') index = Math.min(80, (row + 1) * 9 + col);
      if (event.key === 'ArrowLeft') index = Math.max(0, row * 9 + col - 1);
      if (event.key === 'ArrowRight') index = Math.min(80, row * 9 + col + 1);
      selectCell(index);
    }
  }

  function hideToast() {
    if (toastTimer) {
      window.clearTimeout(toastTimer);
      toastTimer = null;
    }
    dom.foot.classList.remove('is-message', 'is-message-bad');
    dom.footNote.textContent = '三次错误，本局结束';
  }

  function toast(message, duration, tone) {
    if (!message) return;
    if (toastTimer) window.clearTimeout(toastTimer);
    dom.footNote.textContent = message;
    dom.foot.classList.add('is-message');
    dom.foot.classList.toggle('is-message-bad', tone === 'bad');
    toastTimer = window.setTimeout(() => {
      dom.foot.classList.remove('is-message', 'is-message-bad');
      dom.footNote.textContent = '三次错误，本局结束';
      toastTimer = null;
    }, duration || 2000);
  }



  function boxOf(index) {
    const row = Math.floor(index / 9);
    const col = index % 9;
    return Math.floor(row / 3) * 3 + Math.floor(col / 3);
  }

  // 浏览器验收与回归测试用；不影响正常游玩。
  window.__SUDOKU_DEBUG__ = {
    core,
    state,
    newGame,
    restartCurrent,
    selectCell,
    inputNumber,
    clearSelected,
    undo,
    useHint,
    revealAnswer,
    checkWin,
    cellAt: (index) => cells[index],
    candidates: (index) => core.candidatesFor(state.board, index, state.excluded[index]),
    fillSolution() {
      for (let i = 0; i < 81; i++) {
        if (!state.fixed[i]) state.board[i] = state.solution[i];
      }
      render();
      checkWin();
    },
  };

  window.addEventListener('DOMContentLoaded', init);
})();
