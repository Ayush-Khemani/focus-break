const timerShell = document.querySelector('.timer-shell');
const focusPanel = document.getElementById('focusPanel');
const breakPanel = document.getElementById('breakPanel');
const focusTime = document.getElementById('focusTime');
const breakTime = document.getElementById('breakTime');
const focusState = document.getElementById('focusState');
const breakState = document.getElementById('breakState');
const focusProgress = document.getElementById('focusProgress');
const breakProgress = document.getElementById('breakProgress');
const toggleButton = document.getElementById('toggleButton');
const toggleText = document.getElementById('toggleText');
const toggleIcon = document.getElementById('toggleIcon');
const resetButton = document.getElementById('resetButton');
const settingsButton = document.getElementById('settingsButton');
const fullscreenButton = document.getElementById('fullscreenButton');
const fullscreenIcon = document.getElementById('fullscreenIcon');
const settingsDialog = document.getElementById('settingsDialog');
const settingsForm = document.getElementById('settingsForm');
const cancelSettings = document.getElementById('cancelSettings');
const focusMinutesInput = document.getElementById('focusMinutes');
const breakMinutesInput = document.getElementById('breakMinutes');
const autoStartInput = document.getElementById('autoStart');
const cycleCount = document.getElementById('cycleCount');
const fullscreenNotice = document.getElementById('fullscreenNotice');
const focusSwitch = document.getElementById('focusSwitch');
const breakSwitch = document.getElementById('breakSwitch');
const focusAddTime = document.getElementById('focusAddTime');
const breakAddTime = document.getElementById('breakAddTime');

const STORAGE_KEY = 'focus-break-state-v1';
const RING_RADIUS = 108;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const state = {
  mode: 'focus',
  running: false,
  focusMinutes: 25,
  breakMinutes: 5,
  focusRemaining: 25 * 60,
  breakRemaining: 5 * 60,
  intervalId: null,
  cycle: 1,
  autoStart: false,
  expectedEnd: null,
  history: [],
};

function currentRemaining() {
  return state.mode === 'focus' ? state.focusRemaining : state.breakRemaining;
}

function setCurrentRemaining(seconds) {
  if (state.mode === 'focus') {
    state.focusRemaining = seconds;
  } else {
    state.breakRemaining = seconds;
  }
}

function formatTime(totalSeconds) {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60).toString().padStart(2, '0');
  const seconds = (safe % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function setRingProgress(element, remaining, total) {
  if (!element) return;
  const ratio = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
  element.style.strokeDasharray = String(RING_CIRCUMFERENCE);
  element.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - ratio));
}

function addHistory(type, details = {}) {
  state.history.push({
    type,
    mode: state.mode,
    at: Date.now(),
    ...details,
  });
  if (state.history.length > 100) {
    state.history = state.history.slice(-100);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      mode: state.mode,
      running: state.running,
      focusMinutes: state.focusMinutes,
      breakMinutes: state.breakMinutes,
      focusRemaining: state.focusRemaining,
      breakRemaining: state.breakRemaining,
      cycle: state.cycle,
      autoStart: state.autoStart,
      expectedEnd: state.expectedEnd,
      history: state.history,
    }));
  } catch (_) {}
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);

    state.mode = saved.mode === 'break' ? 'break' : 'focus';
    state.focusMinutes = Number(saved.focusMinutes) > 0 ? Number(saved.focusMinutes) : 25;
    state.breakMinutes = Number(saved.breakMinutes) > 0 ? Number(saved.breakMinutes) : 5;
    state.focusRemaining = Number(saved.focusRemaining) >= 0
      ? Number(saved.focusRemaining)
      : state.focusMinutes * 60;
    state.breakRemaining = Number(saved.breakRemaining) >= 0
      ? Number(saved.breakRemaining)
      : state.breakMinutes * 60;
    state.cycle = Number(saved.cycle) > 0 ? Number(saved.cycle) : 1;
    state.autoStart = Boolean(saved.autoStart);
    state.history = Array.isArray(saved.history) ? saved.history.slice(-100) : [];

    if (saved.running && Number(saved.expectedEnd) > 0) {
      const remaining = Math.ceil((Number(saved.expectedEnd) - Date.now()) / 1000);

      if (remaining > 0) {
        setCurrentRemaining(remaining);
        state.running = true;
        state.expectedEnd = Number(saved.expectedEnd);
      } else {
        state.running = false;
        state.expectedEnd = null;

        if (state.mode === 'focus') {
          state.focusRemaining = state.focusMinutes * 60;
          state.mode = 'break';
        } else {
          state.breakRemaining = state.breakMinutes * 60;
          state.mode = 'focus';
          state.cycle += 1;
        }
      }
    }

    focusMinutesInput.value = state.focusMinutes;
    breakMinutesInput.value = state.breakMinutes;
    autoStartInput.checked = state.autoStart;
  } catch (_) {}
}

function render() {
  focusTime.textContent = formatTime(state.focusRemaining);
  breakTime.textContent = formatTime(state.breakRemaining);

  setRingProgress(focusProgress, state.focusRemaining, state.focusMinutes * 60);
  setRingProgress(breakProgress, state.breakRemaining, state.breakMinutes * 60);

  cycleCount.textContent = state.cycle;

  focusPanel.classList.toggle('is-active', state.mode === 'focus');
  breakPanel.classList.toggle('is-active', state.mode === 'break');

  focusState.textContent = state.mode === 'focus'
    ? (state.running ? 'Running' : 'Active')
    : 'Paused';

  breakState.textContent = state.mode === 'break'
    ? (state.running ? 'Running' : 'Active')
    : 'Paused';

  toggleText.textContent = state.running ? 'Pause' : 'Start';
  toggleIcon.textContent = state.running ? 'Ⅱ' : '▶';
  toggleButton.setAttribute('aria-label', state.running ? 'Pause timer' : 'Start timer');

  document.title = `${formatTime(currentRemaining())} · ${state.mode === 'focus' ? 'Focus' : 'Break'}`;
}

function beep() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 660;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.52);
  } catch (_) {}
}

function clearTimerLoop() {
  if (state.intervalId) clearInterval(state.intervalId);
  state.intervalId = null;
}

function stopInterval() {
  clearTimerLoop();
  state.running = false;
  state.expectedEnd = null;
}

function tick() {
  if (!state.running || !state.expectedEnd) return;

  const diff = Math.max(0, Math.ceil((state.expectedEnd - Date.now()) / 1000));
  setCurrentRemaining(diff);
  render();
  saveState();

  if (diff <= 0) completeSession();
}

function start() {
  if (state.running) return;

  if (currentRemaining() <= 0) {
    setCurrentRemaining((state.mode === 'focus' ? state.focusMinutes : state.breakMinutes) * 60);
  }

  state.running = true;
  state.expectedEnd = Date.now() + currentRemaining() * 1000;
  clearTimerLoop();
  state.intervalId = setInterval(tick, 250);
  addHistory('start');
  saveState();
  render();
}

function pause() {
  if (!state.running) return;
  tick();
  stopInterval();
  addHistory('pause', { remaining: currentRemaining() });
  saveState();
  render();
}

function toggle() {
  state.running ? pause() : start();
}

function switchMode(mode) {
  if (mode !== 'focus' && mode !== 'break') return;
  if (state.mode === mode) return;

  if (state.running) {
    tick();
    stopInterval();
  }

  const previousMode = state.mode;
  state.mode = mode;
  addHistory('switch', { from: previousMode, to: mode });
  saveState();
  render();
}

function addFiveMinutes(mode) {
  const extra = 5 * 60;

  if (mode === 'focus') {
    state.focusRemaining += extra;
  } else {
    state.breakRemaining += extra;
  }

  if (state.running && state.mode === mode) {
    state.expectedEnd += extra * 1000;
  }

  addHistory('add-time', { to: mode, seconds: extra });
  saveState();
  render();
}

function completeSession() {
  const completedMode = state.mode;
  stopInterval();
  beep();

  addHistory('complete', { completedMode });

  if (completedMode === 'focus') {
    state.focusRemaining = state.focusMinutes * 60;
    state.mode = 'break';
  } else {
    state.breakRemaining = state.breakMinutes * 60;
    state.mode = 'focus';
    state.cycle += 1;
  }

  saveState();
  render();

  if (state.autoStart) start();
}

function reset() {
  stopInterval();
  setCurrentRemaining((state.mode === 'focus' ? state.focusMinutes : state.breakMinutes) * 60);
  addHistory('reset');
  saveState();
  render();
}

function applySettings() {
  const focus = Math.min(120, Math.max(1, Number(focusMinutesInput.value) || 25));
  const rest = Math.min(60, Math.max(1, Number(breakMinutesInput.value) || 5));

  state.focusMinutes = focus;
  state.breakMinutes = rest;
  state.autoStart = autoStartInput.checked;

  stopInterval();
  state.focusRemaining = focus * 60;
  state.breakRemaining = rest * 60;

  addHistory('settings', { focusMinutes: focus, breakMinutes: rest, autoStart: state.autoStart });
  saveState();
  render();
}

function isFullscreenActive() {
  return Boolean(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.msFullscreenElement
  );
}

function showFullscreenNotice(message) {
  if (!fullscreenNotice) return;
  fullscreenNotice.textContent = message;
  fullscreenNotice.classList.add('is-visible');
  window.clearTimeout(showFullscreenNotice.timeoutId);
  showFullscreenNotice.timeoutId = window.setTimeout(() => {
    fullscreenNotice.classList.remove('is-visible');
  }, 5000);
}

async function toggleFullscreen() {
  try {
    if (!isFullscreenActive()) {
      if (timerShell.requestFullscreen) {
        await timerShell.requestFullscreen({ navigationUI: 'hide' });
      } else if (timerShell.webkitRequestFullscreen) {
        timerShell.webkitRequestFullscreen();
      } else if (timerShell.msRequestFullscreen) {
        timerShell.msRequestFullscreen();
      } else {
        showFullscreenNotice('This browser does not support page fullscreen. Press F11 for browser fullscreen.');
        return;
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  } catch (_) {
    const embedded = window.self !== window.top;
    showFullscreenNotice(
      embedded
        ? 'Fullscreen is blocked inside this preview. Open the GitHub Pages site directly in a browser tab, then try again.'
        : 'The browser blocked fullscreen. Try the button again or press F11 for browser fullscreen.'
    );
  }
}

function updateFullscreenButton() {
  const active = isFullscreenActive();
  fullscreenButton.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Enter fullscreen');
  fullscreenButton.title = active ? 'Exit fullscreen (F)' : 'Fullscreen (F)';
  fullscreenIcon.innerHTML = active
    ? '<path d="M9 3H7v4H3v2h6V3Zm6 0v6h6V7h-4V3h-2ZM3 15v2h4v4h2v-6H3Zm12 0v6h2v-4h4v-2h-6Z"/>'
    : '<path d="M7 3H3v4h2V5h2V3Zm14 4V3h-4v2h2v2h2ZM5 17H3v4h4v-2H5v-2Zm16 0h-2v2h-2v2h4v-4Z"/>';
}

toggleButton.addEventListener('click', toggle);
resetButton.addEventListener('click', reset);
focusSwitch.addEventListener('click', () => switchMode('focus'));
breakSwitch.addEventListener('click', () => switchMode('break'));
focusAddTime.addEventListener('click', () => addFiveMinutes('focus'));
breakAddTime.addEventListener('click', () => addFiveMinutes('break'));

settingsButton.addEventListener('click', () => settingsDialog.showModal());
fullscreenButton.addEventListener('click', toggleFullscreen);
document.addEventListener('fullscreenchange', updateFullscreenButton);
document.addEventListener('webkitfullscreenchange', updateFullscreenButton);

cancelSettings.addEventListener('click', () => settingsDialog.close());

settingsForm.addEventListener('submit', (event) => {
  event.preventDefault();
  applySettings();
  settingsDialog.close();
});

settingsDialog.addEventListener('click', (event) => {
  if (event.target === settingsDialog) settingsDialog.close();
});

document.addEventListener('keydown', (event) => {
  if (settingsDialog.open) return;

  if (event.code === 'Space') {
    event.preventDefault();
    toggle();
  }

  if (event.key.toLowerCase() === 'r') reset();
  if (event.key.toLowerCase() === 'f') toggleFullscreen();
  if (event.key === '1') switchMode('focus');
  if (event.key === '2') switchMode('break');
});

loadState();

if (state.running && state.expectedEnd) {
  state.intervalId = setInterval(tick, 250);
}

render();
saveState();
