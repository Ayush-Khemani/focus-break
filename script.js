const timerShell = document.querySelector('.timer-shell');
const focusPanel = document.getElementById('focusPanel');
const breakPanel = document.getElementById('breakPanel');
const focusTime = document.getElementById('focusTime');
const breakTime = document.getElementById('breakTime');
const focusState = document.getElementById('focusState');
const breakState = document.getElementById('breakState');
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

const state = {
  mode: 'focus',
  running: false,
  focusMinutes: 25,
  breakMinutes: 5,
  remaining: 25 * 60,
  intervalId: null,
  cycle: 1,
  autoStart: false,
  expectedEnd: null,
};

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}
function render() {
  const focusSeconds = state.mode === 'focus' ? state.remaining : state.focusMinutes * 60;
  const breakSeconds = state.mode === 'break' ? state.remaining : state.breakMinutes * 60;
  focusTime.textContent = formatTime(focusSeconds);
  breakTime.textContent = formatTime(breakSeconds);
  cycleCount.textContent = state.cycle;
  focusPanel.classList.toggle('is-active', state.mode === 'focus');
  breakPanel.classList.toggle('is-active', state.mode === 'break');
  focusState.textContent = state.mode === 'focus' ? (state.running ? 'Running' : 'Active') : 'Next';
  breakState.textContent = state.mode === 'break' ? (state.running ? 'Running' : 'Active') : 'Next';
  toggleText.textContent = state.running ? 'Pause' : 'Start';
  toggleIcon.textContent = state.running ? 'Ⅱ' : '▶';
  toggleButton.setAttribute('aria-label', state.running ? 'Pause timer' : 'Start timer');
  document.title = `${formatTime(state.remaining)} · ${state.mode === 'focus' ? 'Focus' : 'Break'}`;
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
function stopInterval() {
  if (state.intervalId) clearInterval(state.intervalId);
  state.intervalId = null;
  state.running = false;
  state.expectedEnd = null;
}
function tick() {
  if (!state.running || !state.expectedEnd) return;
  const diff = Math.max(0, Math.ceil((state.expectedEnd - Date.now()) / 1000));
  state.remaining = diff;
  render();
  if (diff <= 0) completeSession();
}
function start() {
  if (state.running) return;
  state.running = true;
  state.expectedEnd = Date.now() + state.remaining * 1000;
  state.intervalId = setInterval(tick, 250);
  render();
}
function pause() {
  if (!state.running) return;
  tick();
  stopInterval();
  render();
}
function toggle() { state.running ? pause() : start(); }

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
  } catch (error) {
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
function completeSession() {
  stopInterval();
  beep();
  if (state.mode === 'focus') {
    state.mode = 'break';
    state.remaining = state.breakMinutes * 60;
  } else {
    state.mode = 'focus';
    state.cycle += 1;
    state.remaining = state.focusMinutes * 60;
  }
  render();
  if (state.autoStart) start();
}
function reset() {
  stopInterval();
  state.remaining = (state.mode === 'focus' ? state.focusMinutes : state.breakMinutes) * 60;
  render();
}
function applySettings() {
  const focus = Math.min(120, Math.max(1, Number(focusMinutesInput.value) || 25));
  const rest = Math.min(60, Math.max(1, Number(breakMinutesInput.value) || 5));
  state.focusMinutes = focus;
  state.breakMinutes = rest;
  state.autoStart = autoStartInput.checked;
  stopInterval();
  state.remaining = (state.mode === 'focus' ? focus : rest) * 60;
  render();
}
toggleButton.addEventListener('click', toggle);
resetButton.addEventListener('click', reset);
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
});
render();