// wheel.js

// ========= CONFIG =========
const CONFIG = {
  apiEndpoint: "/api/items",
  spinDurationMs: 3000,
  extraSpins: 5,
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

  for (let i = 0; i < items.length; i++) {
    const startAngle = currentAngle + i * sliceAngle;
    const endAngle = startAngle + sliceAngle;

    const hue = (i * 360) / items.length;
    ctx.fillStyle = `hsl(${hue}, 70%, 55%)`;

    // Slice fill (no borders)
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();

    // Label
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(startAngle + sliceAngle / 2);

    ctx.fillStyle = "#ffffff";
    ctx.font = CONFIG.fontFamily;
    ctx.textAlign = "left";

    const label = items[i].label || "";

    // Margin so text sits inside the coloured segment
    const inner = CONFIG.centreRadius + 20; // start a bit away from centre
    const outer = radius - 16;             // leave margin before edge
    const maxWidth = outer - inner;

    let text = label;
    let truncated = false;

    if (maxWidth > 0) {
      // Truncate with ellipsis if needed
      while (ctx.measureText(text).width > maxWidth && text.length > 0) {
        text = text.slice(0, -1);
        truncated = true;
      }
      if (truncated && text.length > 0) {
        text = text.slice(0, -1) + "…";
      }
    }

    ctx.fillText(text, inner, 4);
    ctx.restore();
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
  // Tip slightly inside the wheel
  ctx.moveTo(centerX, centerY - pointerRadius + 8);
  // Base slightly outside the wheel
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

  // We want the centre of the target slice to end at the pointer angle (top)
  const pointerAngle = -Math.PI / 2; // straight up
  const extraSpins = CONFIG.extraSpins;

  const targetAngle =
    2 * Math.PI * extraSpins +
    (pointerAngle - (targetIndex * sliceAngle + sliceAngle / 2));

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
      const selected = items[targetIndex];
      selectedEl.textContent = selected.label || "";
      setStatus(CONFIG.defaultStatusText);
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
fetchItems();
