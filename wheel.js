// wheel.js

// ========= CONFIG =========
const CONFIG = {
  apiEndpoint: "/api/items",
  spinDurationMs: 1800,
  extraSpins: 1, // base number of extra full rotations
  defaultStatusText: "Ready",
  noItemsMessage: "No items found for this category.",
  fontFamily: "bold 10px system-ui",
  centreRadius: 20
};
// ==========================

const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");
const refreshBtn = document.getElementById("refresh");
const spinBtn = document.getElementById("spin");
const statusEl = document.getElementById("status");
const selectedEl = document.getElementById("selected");
const categorySelect = document.getElementById("category");
const appContainer = document.querySelector(".app");

let items = [];
let currentAngle = 0;
let isSpinning = false;

// Resize canvas based on container width
function resizeCanvas() {
  const containerWidth = appContainer.clientWidth;
  const size = Math.min(containerWidth - 40, 360); // keep some padding
  canvas.width = size;
  canvas.height = size;
}

// Helper to get current category
function getCategory() {
  return categorySelect.value;
}

// Fetch items from backend
async function fetchItems() {
  const category = encodeURIComponent(getCategory());
  const url = `${CONFIG.apiEndpoint}?category=${category}`;

  setStatus(`Loading ${getCategory()}...`);
  setButtonsDisabled(true);

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error("HTTP error " + res.status);
    }

    const data = await res.json();
    items = data.items || [];

    if (!items.length) {
      setStatus(CONFIG.noItemsMessage);
    } else {
      setStatus(`Loaded ${items.length} items`);
    }

    selectedEl.textContent = "";
    currentAngle = 0;
    resizeCanvas();
    drawWheel();
  } catch (err) {
    console.error(err);
    setStatus("Failed to load items");
    items = [];
    resizeCanvas();
    drawWheel();
  } finally {
    setButtonsDisabled(false);
    resetSpinLabel();
  }
}

// Draw the wheel
function drawWheel() {
  const width = canvas.width;
  const height = canvas.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(centerX, centerY) - 6;

  ctx.clearRect(0, 0, width, height);

  if (!items.length) {
    ctx.fillStyle = "#999";
    ctx.font = CONFIG.fontFamily;
    ctx.textAlign = "center";
    ctx.fillText("No items", centerX, centerY);
    return;
  }

  const sliceAngle = (2 * Math.PI) / items.length;
  const fontSize = parseInt(CONFIG.fontFamily, 10) || 10;

  for (let i = 0; i < items.length; i++) {
    const startAngle = currentAngle + i * sliceAngle;
    const endAngle = startAngle + sliceAngle;

    const hue = (i * 360) / items.length;
    ctx.fillStyle = `hsl(${hue}, 70%, 55%)`;

    // Slice fill
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();

    // -------- label (right-aligned) --------
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(startAngle + sliceAngle / 2);

    ctx.fillStyle = "#ffffff";
    ctx.font = CONFIG.fontFamily;
    ctx.textAlign = "right";

    const label = items[i].label || "";

    // Right edge of text sits just inside outer edge
    const marginOuter = 10; // px from outer circle
    const rEnd = radius - marginOuter;

    // Left edge must stay outside centre circle + marginInner
    const marginInner = 30;
    const minInner = CONFIG.centreRadius + marginInner;

    let maxWidth = rEnd - minInner;
    maxWidth = Math.max(20, maxWidth); // never absurdly tiny

    let text = label;
    const fullWidth = ctx.measureText(text).width;

    if (fullWidth > maxWidth) {
      let truncated = false;
      while (ctx.measureText(text).width > maxWidth && text.length > 0) {
        text = text.slice(0, -1);
        truncated = true;
      }
      if (truncated && text.length > 0) {
        text = text.slice(0, -1) + "…";
      }
    }

    // y offset keeps text roughly centred vertically in the slice
    ctx.fillText(text, rEnd, fontSize / 3);
    ctx.restore();
    // -------- end label --------
  }

  // Centre circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, CONFIG.centreRadius, 0, 2 * Math.PI);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  // Pointer at top (black, tip pointing down into the wheel)
  const pointerRadius = radius;
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - pointerRadius + 8); // tip inside wheel
  ctx.lineTo(centerX - 10, centerY - pointerRadius - 8);
  ctx.lineTo(centerX + 10, centerY - pointerRadius - 8);
  ctx.closePath();
  ctx.fill();
}

// Spin logic
function spinWheel() {
  if (isSpinning || !items.length) return;

  isSpinning = true;
  setButtonsDisabled(true);
  setStatus("Spinning...");

  const sliceAngle = (2 * Math.PI) / items.length;
  const targetIndex = Math.floor(Math.random() * items.length);

  // Normalise currentAngle to avoid it growing unbounded
  const twoPi = 2 * Math.PI;
  currentAngle = ((currentAngle % twoPi) + twoPi) % twoPi;

  // Angle where the centre of the target slice sits under the pointer (top)
  const pointerAngle = -Math.PI / 2; // straight up
  const targetCentreAngle = targetIndex * sliceAngle + sliceAngle / 2;
  const baseAngle = pointerAngle - targetCentreAngle;

  // Ensure we always spin forward by several full rotations
  const rotations = CONFIG.extraSpins + 2; // tweak if you want more/less spin
  const targetAngle = baseAngle + rotations * twoPi;

  const startAngle = currentAngle;
  const totalChange = targetAngle - startAngle;
  const duration = CONFIG.spinDurationMs;
  const startTime = performance.now();

  function animate(now) {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);

    currentAngle = startAngle + totalChange * eased;
    drawWheel();

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      isSpinning = false;
      setButtonsDisabled(false);
      currentAngle = targetAngle; // lock in final angle
      const selected = items[targetIndex];
      selectedEl.textContent = selected.label || "";
      setStatus(CONFIG.defaultStatusText);
      spinBtn.textContent = "🎲 Spin Again";
    }
  }

  requestAnimationFrame(animate);
}

function setStatus(msg) {
  statusEl.textContent = msg;
}

function setButtonsDisabled(disabled) {
  refreshBtn.disabled = disabled;
  spinBtn.disabled = disabled || !items.length;
}

function resetSpinLabel() {
  spinBtn.textContent = "🎲 Spin";
}

// Events
refreshBtn.addEventListener("click", fetchItems);
spinBtn.addEventListener("click", spinWheel);
categorySelect.addEventListener("change", fetchItems);
window.addEventListener("resize", () => {
  resizeCanvas();
  drawWheel();
});

// Initial load
setStatus(CONFIG.defaultStatusText);
resizeCanvas();
resetSpinLabel();
fetchItems();
