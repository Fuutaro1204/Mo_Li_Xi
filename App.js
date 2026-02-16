// Mệnh giá (VNĐ)
const DENOMS = [1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000];

const grid = document.getElementById("grid");
const resetBtn = document.getElementById("resetBtn");
const openedCountEl = document.getElementById("openedCount");
const openedSumEl = document.getElementById("openedSum");

let state = []; // { value, revealed }

/* ================== AUDIO (không cần file) ================== */
let audioCtx = null;

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // đôi khi iOS/Chrome cần resume sau tương tác
  if (audioCtx.state === "suspended") audioCtx.resume();
}

function playTearSound() {
  ensureAudio();
  const t0 = audioCtx.currentTime;

  // noise source
  const bufferSize = audioCtx.sampleRate * 0.12; // 120ms
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    // noise với decay nhanh -> giống tiếng giấy xé
    const decay = 1 - i / bufferSize;
    data[i] = (Math.random() * 2 - 1) * decay;
  }

  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;

  const bp = audioCtx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(1800, t0);
  bp.Q.setValueAtTime(0.9, t0);

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(0.55, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12);

  noise.connect(bp).connect(gain).connect(audioCtx.destination);
  noise.start(t0);
  noise.stop(t0 + 0.13);

  // thêm 1 "snap" nhỏ cho cảm giác rách
  const osc = audioCtx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(260, t0);

  const snap = audioCtx.createGain();
  snap.gain.setValueAtTime(0.0001, t0);
  snap.gain.exponentialRampToValueAtTime(0.25, t0 + 0.01);
  snap.gain.exponentialRampToValueAtTime(0.001, t0 + 0.06);

  osc.connect(snap).connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + 0.07);
}

function playRevealDing() {
  ensureAudio();
  const t0 = audioCtx.currentTime;

  const out = audioCtx.createGain();
  out.gain.setValueAtTime(0.18, t0);
  out.gain.exponentialRampToValueAtTime(0.001, t0 + 0.7);
  out.connect(audioCtx.destination);

  // 2 tone chồng nhau tạo tiếng “ting”
  const o1 = audioCtx.createOscillator();
  o1.type = "sine";
  o1.frequency.setValueAtTime(880, t0);

  const o2 = audioCtx.createOscillator();
  o2.type = "sine";
  o2.frequency.setValueAtTime(1320, t0 + 0.02);

  const g1 = audioCtx.createGain();
  g1.gain.setValueAtTime(0.001, t0);
  g1.gain.exponentialRampToValueAtTime(1.0, t0 + 0.01);
  g1.gain.exponentialRampToValueAtTime(0.001, t0 + 0.55);

  const g2 = audioCtx.createGain();
  g2.gain.setValueAtTime(0.001, t0);
  g2.gain.exponentialRampToValueAtTime(0.8, t0 + 0.02);
  g2.gain.exponentialRampToValueAtTime(0.001, t0 + 0.6);

  o1.connect(g1).connect(out);
  o2.connect(g2).connect(out);

  o1.start(t0);
  o2.start(t0);

  o1.stop(t0 + 0.65);
  o2.stop(t0 + 0.65);
}
/* ================== END AUDIO ================== */

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function formatAmount(v) {
  return v.toLocaleString("vi-VN") + "đ";
}

function updateStats() {
  const opened = state.filter((x) => x.revealed);
  openedCountEl.textContent = opened.length;
  const sum = opened.reduce((acc, x) => acc + x.value, 0);
  openedSumEl.textContent = sum.toLocaleString("vi-VN");
}

function makeConfettiPieces(card, count = 10) {
  card.querySelectorAll(".confetti").forEach((n) => n.remove());

  for (let i = 0; i < count; i++) {
    const c = document.createElement("div");
    c.className = "confetti";

    const left = 12 + Math.random() * 76; // %
    c.style.left = left + "%";

    const dx = (Math.random() * 120 - 60).toFixed(0) + "px";
    c.style.setProperty("--dx", dx);

    const palette = ["#ffdca8", "#f6d365", "#fda085", "#ffffff", "#ffb3b3"];
    c.style.background = palette[Math.floor(Math.random() * palette.length)];

    c.style.animationDelay = (Math.random() * 120).toFixed(0) + "ms";
    card.appendChild(c);
  }
}

function render() {
  grid.innerHTML = "";

  state.forEach((item, idx) => {
    const card = document.createElement("div");
    card.className = "envelope" + (item.revealed ? " revealed" : "");
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute(
      "aria-label",
      item.revealed
        ? `Đã mở: ${item.value.toLocaleString("vi-VN")} VNĐ`
        : "Bao lì xì chưa mở"
    );

    const flap = document.createElement("div");
    flap.className = "flap";

    const tearLine = document.createElement("div");
    tearLine.className = "tear-line";

    const seal = document.createElement("div");
    seal.className = "seal";
    seal.innerHTML = "<span>福</span>";

    const label = document.createElement("div");
    label.className = "label";
    label.innerHTML = `
      <div class="title">Bao lì xì #${idx + 1}</div>
      <div class="hint">${item.revealed ? "Đã mở" : "Nhấp để xé & mở"}</div>
    `;

    const money = document.createElement("div");
    money.className = "money";
    money.innerHTML = `
      <div>
        <div class="amount">${formatAmount(item.value)}</div>
        <div class="note">Chúc mừng năm mới! 🎉</div>
      </div>
    `;

    card.appendChild(flap);
    card.appendChild(tearLine);
    card.appendChild(seal);
    card.appendChild(label);
    card.appendChild(money);

    const openWithTear = () => {
      if (state[idx].revealed) return;

      // âm thanh xé
      playTearSound();

      card.classList.add("ripping");
      makeConfettiPieces(card, 12);

      // sau một nhịp -> mở ra + ting
      setTimeout(() => {
        state[idx].revealed = true;
        updateStats();
        playRevealDing();
        render();
      }, 380);
    };

    card.addEventListener("click", openWithTear);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openWithTear();
      }
    });

    grid.appendChild(card);
  });
}

function reset() {
  const shuffled = shuffle([...DENOMS]);
  state = shuffled.map((v) => ({ value: v, revealed: false }));
  updateStats();
  render();
}

resetBtn.addEventListener("click", reset);
reset();
