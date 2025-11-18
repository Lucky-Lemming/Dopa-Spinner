// wheel.js

// ========= CONFIG =========
const CONFIG = {
  apiEndpoint: "/api/items",
  spinDurationMs: 3000,
  extraSpins: 5,
  defaultStatusText: "Ready",
  noItemsMessage: "No items found. Check Notion filter.",
  fontFamily: "14px system-ui",
  centreRadius: 30
};
// ==========================

const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");
const refreshBtn = document.getElementById("refresh");
const spinBtn = document.getElementById("spin");
const statusEl = document.getElementById("status");
const selectedEl = document.getElementById("selected");

let items = [];
let currentAngle = 0;
let isSpinning = false;

// Fetch items from backend
async function fetchItems() {
  setStatus("Loading items...");
  setButtonsDisabled(true);

  try {
    const res = await fetch(CONFIG.apiEndpoint);
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
    drawWheel();
  } catch (err) {
    console.error(err);
    setStatus("Failed to load items");
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
  const radius = Math.min(centerX, centerY) - 10;

  ctx.clearRect(0, 0, width, height);

  if (!items.length) {
    ctx.fillStyle = "#777";
    ctx.font = CONFIG.fontFamily;
    ctx.textAlign = "center";
    ctx.fillText("No items", centerX, centerY);
    return;
  }

  const sliceAngle = (2 * Math.PI) / items.length;

  // Slices
  for (let i = 0; i < items.length; i++) {
    const startAngle = currentAngle + i * sliceAngle;
    const endAngle = startAngle + sliceAngle;

    // Simple colour variation by hue
    const hue = (i * 360) / items.length;
    ctx.fillStyle = `hsl(${hue}, 70%, 55%)`;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();

    // Label
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(startAngle + sliceAngle / 2);
    ctx.textAlign = "right";
    ctx.fillStyle = "#ffffff";
    ctx.font = CONFIG.fontFamily;

    const label = items[i].label || "";
    ctx.fillText(label, radius - 10, 4);
    ctx.restore();
  }

  // Centre circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, CONFIG.centreRadius, 0, 2 * Math.PI);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  // Pointer at top
  ctx.fillStyle = "#e74c3c";
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - radius - 10);
  ctx.lineTo(centerX - 15, centerY - radius + 15);
  ctx.lineTo(centerX + 15, centerY - radius + 15);
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

  const extraSpins = CONFIG.extraSpins;
  const targetAngle =
    2 * Math.PI * extraSpins +
    (2 * Math.PI - (targetIndex * sliceAngle + sliceAngle / 2));

  const startAngle = currentAngle;
  const totalChange = targetAngle - startAngle;
  const duration = CONFIG.spinDurationMs;
  const startTime = performance.now();

  function animate(now) {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3); // ease out cubic

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

// Wire up events
refreshBtn.addEventListener("click", fetchItems);
spinBtn.addEventListener("click", spinWheel);

// Initial load
setStatus(CONFIG.defaultStatusText);
fetchItems();
