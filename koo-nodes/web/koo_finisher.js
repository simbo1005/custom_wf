import { app } from "../../../scripts/app.js";

const SHOULD_REGISTER_KOO_FINISHER = !globalThis.__KOO_FINISHER_EXTENSION_REGISTERED__;
if (SHOULD_REGISTER_KOO_FINISHER) {
  globalThis.__KOO_FINISHER_EXTENSION_REGISTERED__ = true;
  console.log("[KOO FINISHER] Frontend loaded from: koo-nodes/web/koo_finisher.js");
} else {
  console.log("[KOO FINISHER] Integrated frontend skipped because another KoO Finisher frontend is active.");
}

const NODE_NAME = "KoOFinisher";
const ACCENT = "#FF4FA3";
const FONT = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";
const MIN_WIDTH = 760;
const MIN_HEIGHT = 1084;
const DEFAULT_SIZE = [780, 1084];
const SIDE_PAD = 18;
const TOKENS = {
  background: "#15161A",
  surface: "#22242A",
  surfaceRaised: "#2D3037",
  surfaceHover: "#383B44",
  surfacePressed: "#1D1F25",
  text: "#FFFFFF",
  textSecondary: "#CED1D8",
  textMuted: "#8D929C",
  border: "#444852",
  borderStrong: "#5A5F6B",
};

const CONTROLS = [
  { name: "exposure", label: "Exposure", min: -5, max: 5, step: 0.05, digits: 2, section: "LIGHT" },
  { name: "contrast", label: "Contrast", min: -100, max: 100, step: 1, section: "LIGHT" },
  { name: "highlights", label: "Highlights", min: -100, max: 100, step: 1, section: "LIGHT" },
  { name: "shadows", label: "Shadows", min: -100, max: 100, step: 1, section: "LIGHT" },
  { name: "temperature", label: "Temperature", min: -100, max: 100, step: 1, section: "COLOR" },
  { name: "tint", label: "Tint", min: -100, max: 100, step: 1, section: "COLOR" },
  { name: "vibrance", label: "Vibrance", min: -100, max: 100, step: 1, section: "COLOR" },
  { name: "saturation", label: "Saturation", min: -100, max: 100, step: 1, section: "COLOR" },
  { name: "clarity", label: "Clarity", min: -100, max: 100, step: 1, section: "DETAIL" },
  { name: "sharpen", label: "Sharpen", min: 0, max: 100, step: 1, section: "DETAIL" },
  { name: "vignette", label: "Vignette", min: 0, max: 100, step: 1, section: "EFFECTS" },
  { name: "grain", label: "Grain", min: 0, max: 100, step: 1, section: "EFFECTS" },
];

const CONTROL_BY_NAME = Object.fromEntries(CONTROLS.map((control) => [control.name, control]));

function defaultState() {
  const state = {
    cacheId: "",
    sourceWidth: 0,
    sourceHeight: 0,
    lut: "",
    lutStrength: 100,
    bypass: false,
    outputFolder: "",
    filenamePrefix: "KoO_Finisher",
    format: "PNG",
    quality: 95,
  };
  for (const control of CONTROLS) state[control.name] = 0;
  return state;
}

function getState(node) {
  node._kooFinisherState ||= defaultState();
  return node._kooFinisherState;
}

function restoreState(node, saved) {
  node._kooFinisherState = { ...defaultState(), ...(saved || {}) };
}

function activeOutputFolder(node) {
  const state = getState(node);
  return state.outputFolder || node._kooFinisherDefaultOutputFolder || "ComfyUI/output";
}

function previewSettings(state) {
  return {
    lut: state.lut,
    lut_strength: state.lutStrength,
    exposure: state.exposure,
    contrast: state.contrast,
    highlights: state.highlights,
    shadows: state.shadows,
    temperature: state.temperature,
    tint: state.tint,
    vibrance: state.vibrance,
    saturation: state.saturation,
    clarity: state.clarity,
    sharpen: state.sharpen,
    vignette: state.vignette,
    grain: state.grain,
    bypass: state.bypass,
  };
}

function roundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawRound(ctx, box, fill, stroke, lineWidth = 1, radius = 7) {
  roundedRect(ctx, box.x, box.y, box.w, box.h, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function drawText(ctx, text, x, y, size, color, weight = "500", align = "left") {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(String(text ?? ""), x, y);
}

function ellipsize(ctx, value, maxWidth) {
  let text = String(value ?? "");
  if (ctx.measureText(text).width <= maxWidth) return text;
  while (text.length > 3 && ctx.measureText(`${text.slice(0, -1)}...`).width > maxWidth) text = text.slice(0, -1);
  return `${text}...`;
}

function hitKey(item) {
  return item ? `${item.kind}:${item.name || ""}` : "";
}

function addHit(hitboxes, kind, box, name = null) {
  hitboxes.push({ kind, name, ...box, key: `${kind}:${name || ""}` });
}

function layout(node) {
  const requestedWidth = node.size?.[0] || DEFAULT_SIZE[0];
  const requestedHeight = node.size?.[1] || DEFAULT_SIZE[1];
  const width = Math.max(MIN_WIDTH, requestedWidth);
  const height = Math.max(MIN_HEIGHT, requestedHeight);
  const extraH = height - MIN_HEIGHT;
  const x = SIDE_PAD;
  const right = width - x;
  const hitboxes = [];
  const rows = [];
  const sections = [];
  const preview = { x, y: 58, w: right - x, h: 390 + extraH };
  const lutBox = { x, y: preview.y + preview.h + 20, w: right - x, h: 142 };
  const setFolder = { x: lutBox.x + 12, y: lutBox.y + 40, w: 112, h: 26 };
  const refresh = { x: setFolder.x + setFolder.w + 8, y: setFolder.y, w: 88, h: 26 };
  const lutButton = { x: lutBox.x + 12, y: lutBox.y + 92, w: Math.min(360, lutBox.w - 24), h: 26 };
  const lutStrengthValue = { x: lutBox.x + lutBox.w - 58, y: lutButton.y - 22, w: 46, h: 22 };
  const lutTrack = { x: lutButton.x + lutButton.w + 28, y: lutButton.y + 9, w: lutStrengthValue.x - (lutButton.x + lutButton.w + 28), h: 8 };
  addHit(hitboxes, "button", setFolder, "lutSetFolder");
  addHit(hitboxes, "button", refresh, "refresh");
  addHit(hitboxes, "button", lutButton, "lut");
  addHit(hitboxes, "slider", { x: lutTrack.x - 8, y: lutTrack.y - 10, w: lutTrack.w + 16, h: 28 }, "lutStrength");
  addHit(hitboxes, "value", lutStrengthValue, "lutStrength");

  const gap = 12;
  const colW = (right - x - gap) / 2;
  const positions = {
    LIGHT: { x, y: lutBox.y + lutBox.h + 20, w: colW },
    COLOR: { x: x + colW + gap, y: lutBox.y + lutBox.h + 20, w: colW },
    DETAIL: { x, y: lutBox.y + lutBox.h + 174, w: colW },
    EFFECTS: { x: x + colW + gap, y: lutBox.y + lutBox.h + 174, w: colW },
  };
  for (const section of ["LIGHT", "COLOR", "DETAIL", "EFFECTS"]) {
    const controls = CONTROLS.filter((control) => control.section === section);
    const pos = positions[section];
    const box = { x: pos.x, y: pos.y, w: pos.w, h: 28 + controls.length * 28 + 10 };
    sections.push({ name: section, ...box });
    let rowY = box.y + 28;
    for (const control of controls) {
      const valueBox = { x: box.x + box.w - 58, y: rowY + 2, w: 46, h: 22 };
      const track = { x: box.x + 112, y: rowY + 11, w: Math.max(72, valueBox.x - (box.x + 112) - 12), h: 6 };
      const row = { control, x: box.x + 12, y: rowY, w: box.w - 24, h: 26, track, valueBox };
      rows.push(row);
      addHit(hitboxes, "slider", { x: track.x - 8, y: rowY, w: track.w + 16, h: 26 }, control.name);
      addHit(hitboxes, "value", valueBox, control.name);
      rowY += 28;
    }
  }

  const controlsBottom = Math.max(...sections.map((section) => section.y + section.h));
  const exportBox = { x, y: controlsBottom + 14, w: right - x, h: height - controlsBottom - 36 };
  const outputPath = { x: exportBox.x + 12, y: exportBox.y + 43, w: exportBox.w - 24, h: 22 };
  const outputSet = { x: exportBox.x + 12, y: exportBox.y + 68, w: 100, h: 26 };
  const outputOpen = { x: outputSet.x + outputSet.w + 8, y: outputSet.y, w: 102, h: 26 };
  const prefix = { x: exportBox.x + 12, y: exportBox.y + 108, w: 260, h: 28 };
  const format = { x: prefix.x + prefix.w + 12, y: prefix.y, w: 84, h: 28 };
  const qualityValue = { x: exportBox.x + exportBox.w - 58, y: format.y - 20, w: 46, h: 22 };
  const quality = { x: format.x + format.w + 32, y: format.y + 10, w: Math.max(92, qualityValue.x - (format.x + format.w + 32) - 12), h: 8 };
  const reset = { x: exportBox.x + 12, y: exportBox.y + exportBox.h - 38, w: 86, h: 28 };
  const bypass = { x: reset.x + reset.w + 8, y: reset.y, w: 92, h: 28 };
  const save = { x: exportBox.x + exportBox.w - 138, y: reset.y, w: 126, h: 28 };
  addHit(hitboxes, "button", outputSet, "outputSet");
  addHit(hitboxes, "button", outputOpen, "outputOpen");
  addHit(hitboxes, "field", prefix, "prefix");
  addHit(hitboxes, "button", format, "format");
  addHit(hitboxes, "slider", { x: quality.x - 8, y: quality.y - 10, w: quality.w + 16, h: 28 }, "quality");
  addHit(hitboxes, "value", qualityValue, "quality");
  addHit(hitboxes, "button", reset, "reset");
  addHit(hitboxes, "button", bypass, "bypass");
  addHit(hitboxes, "button", save, "save");
  return { width, height, hitboxes, preview, lutBox, setFolder, refresh, lutButton, lutTrack, lutStrengthValue, sections, rows, exportBox, outputPath, outputSet, outputOpen, prefix, format, quality, qualityValue, reset, bypass, save };
}

function buttonState(node, name) {
  const key = `button:${name}`;
  return {
    hover: node._kooFinisherHoverKey === key,
    pressed: node._kooFinisherPressedKey === key,
  };
}

function drawButton(ctx, node, box, label, name, active = false, primary = false) {
  const state = buttonState(node, name);
  const y = box.y + (state.pressed ? 1 : 0);
  const fill = active
    ? state.pressed
      ? "rgba(255,79,163,0.28)"
      : "rgba(255,79,163,0.2)"
    : state.pressed
      ? TOKENS.surfacePressed
      : state.hover
        ? TOKENS.surfaceHover
        : TOKENS.surfaceRaised;
  const stroke = active || state.hover || primary ? ACCENT : TOKENS.border;
  const lineWidth = active || primary ? 1.5 : 1;
  ctx.save();
  if ((state.hover || active || primary) && !state.pressed) {
    ctx.shadowColor = "rgba(255,79,163,0.22)";
    ctx.shadowBlur = 8;
  }
  drawRound(ctx, { ...box, y }, fill, stroke, lineWidth, 5);
  ctx.restore();
  drawText(ctx, label, box.x + box.w / 2, y + box.h / 2 + 1, 12, active || primary ? TOKENS.text : TOKENS.textSecondary, "750", "center");
}

function drawPreview(ctx, box, image) {
  drawRound(ctx, box, "#111216", TOKENS.border, 1, 7);
  if (!image) return;
  const inner = { x: box.x + 8, y: box.y + 8, w: box.w - 16, h: box.h - 16 };
  const scale = Math.min(inner.w / image.width, inner.h / image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  const x = inner.x + (inner.w - w) / 2;
  const y = inner.y + (inner.h - h) / 2;
  ctx.save();
  roundedRect(ctx, box.x, box.y, box.w, box.h, 7);
  ctx.clip();
  ctx.drawImage(image, x, y, w, h);
  ctx.restore();
}

function numericConfig(name) {
  if (name === "lutStrength") return { name, label: "Strength", min: 0, max: 100, step: 1, digits: 0, suffix: "%" };
  if (name === "quality") return { name, label: "Quality", min: 1, max: 100, step: 1, digits: 0, suffix: "" };
  return { ...CONTROL_BY_NAME[name], suffix: "" };
}

function formatValue(control, value) {
  const text = control.digits ? Number(value).toFixed(control.digits) : String(Math.round(Number(value)));
  return `${text}${control.suffix || ""}`;
}

function drawValue(ctx, node, box, name, value, active) {
  const config = numericConfig(name);
  const isHover = node._kooFinisherHoverKey === `value:${name}`;
  if (isHover || node._kooFinisherEditingName === name) {
    drawRound(ctx, box, isHover ? "rgba(255,79,163,0.08)" : TOKENS.background, isHover ? ACCENT : TOKENS.border, 1, 4);
  }
  drawText(ctx, formatValue(config, value), box.x + box.w - 5, box.y + box.h / 2 + 1, 12, active ? TOKENS.text : TOKENS.textMuted, active ? "800" : "600", "right");
}

function drawSlider(ctx, node, row, value) {
  const control = row.control;
  const zeroPos = (0 - control.min) / (control.max - control.min);
  const valuePos = (value - control.min) / (control.max - control.min);
  const active = Math.abs(value) > 0.0001;
  drawText(ctx, control.label, row.x, row.y + row.h / 2, 12, TOKENS.textSecondary, "650");
  drawValue(ctx, node, row.valueBox, control.name, value, active);
  drawRound(ctx, row.track, TOKENS.background, TOKENS.border, 1, 3);
  const zx = row.track.x + row.track.w * zeroPos;
  const vx = row.track.x + row.track.w * valuePos;
  const fill = { x: Math.min(zx, vx), y: row.track.y, w: Math.abs(vx - zx), h: row.track.h };
  if (fill.w > 0.5) drawRound(ctx, fill, ACCENT, null, 0, 3);
  ctx.beginPath();
  ctx.arc(vx, row.track.y + row.track.h / 2, 5.5, 0, Math.PI * 2);
  ctx.fillStyle = active ? TOKENS.text : TOKENS.textMuted;
  ctx.fill();
  ctx.strokeStyle = active ? ACCENT : TOKENS.borderStrong;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawUI(node, ctx) {
  const state = getState(node);
  const data = node._kooFinisherLuts || { lut_folder: "", luts: [], status: "Loading LUTs..." };
  const l = layout(node);
  if (!node.size || node.size[0] < MIN_WIDTH || node.size[1] < MIN_HEIGHT) node.size = [l.width, l.height];

  drawRound(ctx, { x: 8, y: 8, w: l.width - 16, h: l.height - 16 }, TOKENS.background, TOKENS.borderStrong, 1.5, 12);
  drawText(ctx, "KoO Finisher", 20, 31, 22, TOKENS.text, "900");
  drawText(ctx, "image finishing", l.width - 20, 32, 12, TOKENS.textMuted, "650", "right");
  drawText(ctx, "PREVIEW", l.preview.x + 12, l.preview.y - 10, 12, TOKENS.textMuted, "850");
  drawPreview(ctx, l.preview, node._kooFinisherPreviewImage);
  if (!node._kooFinisherPreviewImage) {
    drawText(ctx, state.cacheId ? "Rendering preview..." : "Run workflow to load source image", l.preview.x + l.preview.w / 2, l.preview.y + l.preview.h / 2, 13, TOKENS.textMuted, "650", "center");
  }

  drawRound(ctx, l.lutBox, TOKENS.surface, TOKENS.border, 1, 7);
  drawText(ctx, "LUT", l.lutBox.x + 12, l.lutBox.y + 15, 12, TOKENS.textMuted, "850");
  drawText(ctx, ellipsize(ctx, `Folder: ${data.lut_folder || "not set"}`, l.lutBox.w - 250), l.lutBox.x + 12, l.lutBox.y + 30, 12, data.lut_folder ? TOKENS.textSecondary : TOKENS.textMuted, "550");
  drawButton(ctx, node, l.setFolder, "Set Folder", "lutSetFolder");
  drawButton(ctx, node, l.refresh, "Refresh", "refresh");
  drawText(ctx, ellipsize(ctx, data.status || "", l.lutBox.w - 250), l.refresh.x + l.refresh.w + 10, l.refresh.y + 13, 11, TOKENS.textMuted, "550");
  drawText(ctx, "LUT", l.lutButton.x, l.lutButton.y - 11, 11, TOKENS.textMuted, "750");
  drawButton(ctx, node, l.lutButton, "", "lut");
  drawText(ctx, ellipsize(ctx, state.lut || "None", l.lutButton.w - 34), l.lutButton.x + 10, l.lutButton.y + l.lutButton.h / 2 + 1, 13, state.lut ? TOKENS.text : TOKENS.textMuted, "650");
  drawText(ctx, "v", l.lutButton.x + l.lutButton.w - 16, l.lutButton.y + l.lutButton.h / 2, 13, ACCENT, "900", "center");
  drawText(ctx, "Strength", l.lutTrack.x, l.lutTrack.y - 15, 12, TOKENS.textSecondary, "650");
  drawValue(ctx, node, l.lutStrengthValue, "lutStrength", state.lutStrength, true);
  drawRound(ctx, l.lutTrack, TOKENS.background, TOKENS.border, 1, 4);
  drawRound(ctx, { x: l.lutTrack.x, y: l.lutTrack.y, w: l.lutTrack.w * state.lutStrength / 100, h: l.lutTrack.h }, ACCENT, null, 0, 4);

  for (const section of l.sections) {
    drawRound(ctx, section, TOKENS.surface, TOKENS.border, 1, 7);
    drawText(ctx, section.name, section.x + 12, section.y + 15, 12, TOKENS.textMuted, "850");
  }
  for (const row of l.rows) drawSlider(ctx, node, row, Number(state[row.control.name]));

  drawRound(ctx, l.exportBox, TOKENS.surface, TOKENS.border, 1, 7);
  drawText(ctx, "EXPORT", l.exportBox.x + 12, l.exportBox.y + 15, 12, TOKENS.textMuted, "850");
  drawText(ctx, "Output Folder", l.exportBox.x + 12, l.exportBox.y + 32, 11, TOKENS.textMuted, "750");
  drawRound(ctx, l.outputPath, TOKENS.background, TOKENS.border, 1, 5);
  drawText(ctx, ellipsize(ctx, activeOutputFolder(node), l.outputPath.w - 18), l.outputPath.x + 9, l.outputPath.y + l.outputPath.h / 2 + 1, 12, TOKENS.textSecondary, "600");
  drawButton(ctx, node, l.outputSet, "Set Folder", "outputSet");
  drawButton(ctx, node, l.outputOpen, "Open Folder", "outputOpen");
  drawText(ctx, "Filename Prefix", l.prefix.x, l.prefix.y - 10, 11, TOKENS.textMuted, "750");
  drawRound(ctx, l.prefix, TOKENS.background, TOKENS.border, 1, 5);
  drawText(ctx, ellipsize(ctx, state.filenamePrefix, l.prefix.w - 18), l.prefix.x + 9, l.prefix.y + l.prefix.h / 2 + 1, 12, TOKENS.textSecondary, "650");
  drawText(ctx, "Format", l.format.x, l.format.y - 10, 11, TOKENS.textMuted, "750");
  drawButton(ctx, node, l.format, state.format, "format");
  drawText(ctx, "Quality", l.quality.x, l.quality.y - 15, 11, state.format === "PNG" ? TOKENS.textMuted : TOKENS.textSecondary, "750");
  drawValue(ctx, node, l.qualityValue, "quality", state.quality, state.format !== "PNG");
  drawRound(ctx, l.quality, TOKENS.background, TOKENS.border, 1, 3);
  if (state.format !== "PNG") drawRound(ctx, { x: l.quality.x, y: l.quality.y, w: l.quality.w * (state.quality - 1) / 99, h: l.quality.h }, ACCENT, null, 0, 3);
  drawButton(ctx, node, l.reset, "Reset", "reset");
  drawButton(ctx, node, l.bypass, "Bypass", "bypass", state.bypass);
  drawButton(ctx, node, l.save, node._kooFinisherSaving ? "Saving..." : "SAVE IMAGE", "save", false, true);
  drawText(ctx, node._kooFinisherStatus || "Ready", l.exportBox.x + l.exportBox.w - 150, l.save.y + l.save.h / 2 + 1, 12, TOKENS.textMuted, "650", "right");
  positionNumericEditor(node);
}

async function loadLuts(node, route = "/koo/finisher/luts") {
  node._kooFinisherLuts = node._kooFinisherLuts || { lut_folder: "", exists: false, luts: [], status: "Loading LUTs..." };
  try {
    const response = await fetch(route, { cache: "no-store" });
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || "Could not load LUTs");
    node._kooFinisherLuts = data;
    node._kooFinisherDefaultOutputFolder = data.default_output_folder || node._kooFinisherDefaultOutputFolder;
  } catch (error) {
    node._kooFinisherLuts = { lut_folder: "", exists: false, luts: [], status: error.message || "Could not load LUTs" };
  }
  node.setDirtyCanvas(true, true);
}

async function saveFolder(node) {
  const current = node._kooFinisherLuts?.lut_folder || "";
  const answer = prompt("LUT folder", current);
  if (answer === null) return;
  node._kooFinisherLuts = { ...(node._kooFinisherLuts || {}), status: "Saving LUT folder..." };
  node.setDirtyCanvas(true, true);
  try {
    const response = await fetch("/koo/finisher/lut_config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lut_folder: answer }),
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || "Could not save LUT folder");
    node._kooFinisherLuts = data;
  } catch (error) {
    node._kooFinisherLuts = { ...(node._kooFinisherLuts || {}), status: error.message || "Could not save LUT folder" };
  }
  node.setDirtyCanvas(true, true);
}

function schedulePreview(node, delay = 100) {
  clearTimeout(node._kooFinisherPreviewTimer);
  if (!getState(node).cacheId) return;
  node._kooFinisherStatus = "Previewing...";
  node._kooFinisherPreviewTimer = setTimeout(() => requestPreview(node), delay);
  node.setDirtyCanvas(true, true);
}

async function requestPreview(node) {
  const state = getState(node);
  if (!state.cacheId) return;
  const requestId = (node._kooFinisherPreviewRequestId || 0) + 1;
  node._kooFinisherPreviewRequestId = requestId;
  if (node._kooFinisherAbort) node._kooFinisherAbort.abort();
  node._kooFinisherAbort = new AbortController();
  try {
    const response = await fetch("/koo/finisher/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: node._kooFinisherAbort.signal,
      body: JSON.stringify({ cache_id: state.cacheId, settings: previewSettings(state), max_size: 1200 }),
    });
    if (!response.ok) {
      let error = "Preview failed";
      try {
        error = (await response.json()).error || error;
      } catch (_) {}
      throw new Error(error);
    }
    const blob = await response.blob();
    if (requestId !== node._kooFinisherPreviewRequestId) return;
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      if (requestId !== node._kooFinisherPreviewRequestId) {
        URL.revokeObjectURL(url);
        return;
      }
      if (node._kooFinisherPreviewUrl) URL.revokeObjectURL(node._kooFinisherPreviewUrl);
      node._kooFinisherPreviewUrl = url;
      node._kooFinisherPreviewImage = img;
      node._kooFinisherStatus = "Ready";
      node.setDirtyCanvas(true, true);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      node._kooFinisherStatus = "Preview failed";
      node.setDirtyCanvas(true, true);
    };
    img.src = url;
  } catch (error) {
    if (error?.name === "AbortError") return;
    node._kooFinisherStatus = "Preview failed";
    console.warn("[KOO FINISHER] Preview failed", error);
    node.setDirtyCanvas(true, true);
  }
}

function setState(node, name, value) {
  getState(node)[name] = value;
  schedulePreview(node);
}

function setExportState(node, name, value) {
  getState(node)[name] = value;
  node.setDirtyCanvas(true, true);
}

function showLutMenu(node, event) {
  const luts = node._kooFinisherLuts?.luts || [];
  if (!luts.length) return;
  const options = ["None", ...luts.map((item) => item.name)];
  const applyChoice = (choice) => setState(node, "lut", choice === "None" ? "" : choice);
  if (window.LiteGraph?.ContextMenu) {
    new LiteGraph.ContextMenu(options, { event, callback: applyChoice });
    return;
  }
  const answer = prompt(`Choose LUT:\n${options.map((name, i) => `${i}. ${name}`).join("\n")}`, "0");
  const index = Number(answer);
  if (Number.isInteger(index) && index >= 0 && index < options.length) applyChoice(options[index]);
}

function clampStep(value, control) {
  const clamped = Math.max(control.min, Math.min(control.max, value));
  const stepped = Math.round((clamped - control.min) / control.step) * control.step + control.min;
  return control.digits ? Number(stepped.toFixed(control.digits)) : Math.round(stepped);
}

function valueForName(node, name) {
  return Number(getState(node)[name]);
}

function applyNumericValue(node, name, rawValue) {
  const config = numericConfig(name);
  if (!config) return false;
  const normalized = String(rawValue ?? "").trim().replace("%", "").replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return false;
  const value = clampStep(parsed, config);
  if (name === "quality") {
    setExportState(node, "quality", value);
  } else if (name === "lutStrength") {
    setState(node, "lutStrength", value);
  } else {
    setState(node, name, value);
  }
  return true;
}

function localBoxToClientRect(node, box) {
  const canvas = app.canvas?.canvas || app.canvasEl || document.querySelector("canvas");
  const graphPosA = [node.pos[0] + box.x, node.pos[1] + box.y];
  const graphPosB = [node.pos[0] + box.x + box.w, node.pos[1] + box.y + box.h];
  if (app.canvasPosToClientPos) {
    const a = app.canvasPosToClientPos(graphPosA);
    const b = app.canvasPosToClientPos(graphPosB);
    return { left: Math.min(a[0], b[0]), top: Math.min(a[1], b[1]), width: Math.abs(b[0] - a[0]), height: Math.abs(b[1] - a[1]) };
  }
  const rect = canvas?.getBoundingClientRect?.() || { left: 0, top: 0 };
  const ds = app.canvas?.ds || { scale: 1, offset: [0, 0] };
  return {
    left: rect.left + (graphPosA[0] + ds.offset[0]) * ds.scale,
    top: rect.top + (graphPosA[1] + ds.offset[1]) * ds.scale,
    width: box.w * ds.scale,
    height: box.h * ds.scale,
  };
}

function positionNumericEditor(node) {
  const editor = node._kooFinisherNumericEditor;
  if (!editor?.input?.isConnected) return;
  const l = layout(node);
  const box = editor.name === "lutStrength"
    ? l.lutStrengthValue
    : editor.name === "quality"
      ? l.qualityValue
      : l.rows.find((row) => row.control.name === editor.name)?.valueBox;
  if (!box) return;
  editor.box = box;
  const rect = localBoxToClientRect(node, box);
  Object.assign(editor.input.style, {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${Math.max(34, rect.width)}px`,
    height: `${Math.max(20, rect.height)}px`,
    fontSize: `${Math.max(11, Math.min(16, rect.height * 0.56))}px`,
  });
}

function closeNumericEditor(node, commit) {
  const editor = node._kooFinisherNumericEditor;
  if (!editor) return;
  node._kooFinisherNumericEditor = null;
  node._kooFinisherEditingName = "";
  if (editor.outsideHandler) document.removeEventListener("pointerdown", editor.outsideHandler, true);
  if (commit) {
    const ok = applyNumericValue(node, editor.name, editor.input.value);
    if (!ok) getState(node)[editor.name] = editor.previous;
  } else {
    getState(node)[editor.name] = editor.previous;
  }
  editor.input.remove();
  node.setDirtyCanvas(true, true);
}

function beginNumericEdit(node, name) {
  closeNumericEditor(node, true);
  const config = numericConfig(name);
  if (!config) return;
  const previous = valueForName(node, name);
  const input = document.createElement("input");
  input.type = "text";
  input.value = config.digits ? Number(previous).toFixed(config.digits) : String(Math.round(previous));
  input.autocomplete = "off";
  input.spellcheck = false;
  Object.assign(input.style, {
    position: "fixed",
    zIndex: 10000,
    boxSizing: "border-box",
    padding: "0 5px",
    margin: "0",
    borderRadius: "4px",
    border: `1px solid ${ACCENT}`,
    outline: "none",
    background: TOKENS.background,
    color: TOKENS.text,
    fontFamily: FONT,
    fontWeight: "800",
    textAlign: "right",
    boxShadow: "0 0 0 2px rgba(255,79,163,0.16)",
    pointerEvents: "auto",
  });
  input.addEventListener("pointerdown", (event) => event.stopPropagation());
  input.addEventListener("mousedown", (event) => event.stopPropagation());
  input.addEventListener("click", (event) => event.stopPropagation());
  const outsideHandler = (event) => {
    if (event.target !== input) closeNumericEditor(node, true);
  };
  node._kooFinisherNumericEditor = { input, name, previous, outsideHandler };
  node._kooFinisherEditingName = name;
  document.body.appendChild(input);
  positionNumericEditor(node);
  requestAnimationFrame(() => {
    input.focus();
    input.select();
    setTimeout(() => document.addEventListener("pointerdown", outsideHandler, true), 0);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      closeNumericEditor(node, true);
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeNumericEditor(node, false);
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const current = Number(String(input.value).replace(",", ".").replace("%", ""));
      const base = Number.isFinite(current) ? current : previous;
      const direction = event.key === "ArrowUp" ? 1 : -1;
      const next = clampStep(base + direction * config.step, config);
      input.value = config.digits ? next.toFixed(config.digits) : String(Math.round(next));
      input.select();
    }
  });
  input.addEventListener("blur", () => closeNumericEditor(node, true));
  node.setDirtyCanvas(true, true);
}

function updateSlider(node, name, pos) {
  const state = getState(node);
  const l = layout(node);
  if (name === "lutStrength") {
    setState(node, "lutStrength", Math.round(Math.max(0, Math.min(1, (pos[0] - l.lutTrack.x) / l.lutTrack.w)) * 100));
    return;
  }
  if (name === "quality") {
    setExportState(node, "quality", Math.round(1 + Math.max(0, Math.min(1, (pos[0] - l.quality.x) / l.quality.w)) * 99));
    return;
  }
  const control = CONTROLS.find((item) => item.name === name);
  const row = l.rows.find((item) => item.control.name === name);
  if (!control || !row) return;
  const pct = Math.max(0, Math.min(1, (pos[0] - row.track.x) / row.track.w));
  setState(node, name, clampStep(control.min + pct * (control.max - control.min), control));
}

function resetNode(node) {
  const state = getState(node);
  const retained = { cacheId: state.cacheId, sourceWidth: state.sourceWidth, sourceHeight: state.sourceHeight, outputFolder: state.outputFolder, filenamePrefix: state.filenamePrefix, format: state.format, quality: state.quality };
  node._kooFinisherState = { ...defaultState(), ...retained };
  node._kooFinisherStatus = "Reset";
  schedulePreview(node);
}

function editPrefix(node) {
  const state = getState(node);
  const answer = prompt("Filename Prefix", state.filenamePrefix);
  if (answer === null) return;
  setExportState(node, "filenamePrefix", answer.trim() || "KoO_Finisher");
}

function cycleFormat(node) {
  const formats = ["PNG", "JPG", "WEBP"];
  const state = getState(node);
  setExportState(node, "format", formats[(formats.indexOf(state.format) + 1) % formats.length]);
}

async function setOutputFolder(node) {
  node._kooFinisherStatus = "Selecting folder...";
  node.setDirtyCanvas(true, true);
  try {
    const response = await fetch("/koo/finisher/select_folder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ output_folder: activeOutputFolder(node) }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || "Could not select folder");
    if (data.cancelled) {
      node._kooFinisherStatus = "Ready";
      return;
    }
    setExportState(node, "outputFolder", data.output_folder || "");
    node._kooFinisherStatus = "Output folder updated";
  } catch (error) {
    console.warn("[KOO FINISHER] Native folder picker failed, falling back to prompt", error);
    const answer = prompt("Output Folder", activeOutputFolder(node));
    if (answer === null) {
      node._kooFinisherStatus = "Ready";
      node.setDirtyCanvas(true, true);
      return;
    }
    setExportState(node, "outputFolder", answer.trim());
    node._kooFinisherStatus = "Output folder updated";
  } finally {
    node.setDirtyCanvas(true, true);
  }
}

async function openOutputFolder(node) {
  node._kooFinisherStatus = "Opening folder...";
  node.setDirtyCanvas(true, true);
  try {
    const response = await fetch("/koo/finisher/open_folder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ output_folder: getState(node).outputFolder }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || "Could not open folder");
    if (!getState(node).outputFolder) node._kooFinisherDefaultOutputFolder = data.output_folder || node._kooFinisherDefaultOutputFolder;
    node._kooFinisherStatus = "Folder opened";
  } catch (error) {
    node._kooFinisherStatus = "Open folder failed";
    console.warn("[KOO FINISHER] Open folder failed", error);
  } finally {
    node.setDirtyCanvas(true, true);
  }
}

async function saveImage(node) {
  const state = getState(node);
  if (!state.cacheId || node._kooFinisherSaving) {
    node._kooFinisherStatus = state.cacheId ? "Saving..." : "Run workflow to load source image";
    node.setDirtyCanvas(true, true);
    return;
  }
  node._kooFinisherSaving = true;
  node._kooFinisherStatus = "Saving...";
  node.setDirtyCanvas(true, true);
  try {
    const response = await fetch("/koo/finisher/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cache_id: state.cacheId,
        settings: previewSettings(state),
        output_folder: state.outputFolder,
        filename_prefix: state.filenamePrefix,
        format: state.format,
        quality: state.quality,
      }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || "Save failed");
    node._kooFinisherStatus = data.files?.[0]?.filename ? `Saved: ${data.files[0].filename}` : "Saved";
  } catch (error) {
    node._kooFinisherStatus = "Save failed";
    console.warn("[KOO FINISHER] Save failed", error);
  } finally {
    node._kooFinisherSaving = false;
    node.setDirtyCanvas(true, true);
  }
}

function hit(node, pos) {
  const matches = layout(node).hitboxes.filter((box) => pos[0] >= box.x && pos[0] <= box.x + box.w && pos[1] >= box.y && pos[1] <= box.y + box.h);
  return matches.find((box) => box.kind === "value") || matches.find((box) => box.kind === "field") || matches.find((box) => box.kind === "button") || matches[0];
}

function applyExecutionPayload(node, message) {
  const data = message?.message || message;
  const payload = Array.isArray(data?.koo_finisher) ? data.koo_finisher[0] : data?.koo_finisher;
  if (!payload?.cache_id) return;
  const state = getState(node);
  state.cacheId = payload.cache_id;
  state.sourceWidth = Number(payload.width || 0);
  state.sourceHeight = Number(payload.height || 0);
  node._kooFinisherPreviewImage = null;
  node._kooFinisherStatus = state.sourceWidth && state.sourceHeight ? `Source cached: ${state.sourceWidth} x ${state.sourceHeight}` : "Source cached";
  schedulePreview(node, 10);
}

if (SHOULD_REGISTER_KOO_FINISHER) app.registerExtension({
  name: "KoO.StandaloneFinisher",
  beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name !== NODE_NAME) return;

    const onNodeCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function () {
      const result = onNodeCreated?.apply(this, arguments);
      getState(this);
      this.size = this.size || [...DEFAULT_SIZE];
      this.resizable = true;
      this.min_width = MIN_WIDTH;
      this.min_height = MIN_HEIGHT;
      this.min_size = [MIN_WIDTH, MIN_HEIGHT];
      loadLuts(this, "/koo/finisher/lut_config");
      return result;
    };

    const onConfigure = nodeType.prototype.onConfigure;
    nodeType.prototype.onConfigure = function (info) {
      const result = onConfigure?.apply(this, arguments);
      restoreState(this, info?.properties?.koo_finisher_state);
      loadLuts(this, "/koo/finisher/lut_config");
      return result;
    };

    const serialize = nodeType.prototype.serialize;
    nodeType.prototype.serialize = function () {
      const data = serialize?.apply(this, arguments) || {};
      data.properties ||= {};
      const state = { ...getState(this), cacheId: "", sourceWidth: 0, sourceHeight: 0 };
      data.properties.koo_finisher_state = state;
      return data;
    };

    const onExecuted = nodeType.prototype.onExecuted;
    nodeType.prototype.onExecuted = function (message) {
      const result = onExecuted?.apply(this, arguments);
      applyExecutionPayload(this, message);
      return result;
    };

    nodeType.prototype.onDrawForeground = function (ctx) {
      drawUI(this, ctx);
    };

    const onMouseDown = nodeType.prototype.onMouseDown;
    nodeType.prototype.onMouseDown = function (event, pos) {
      const item = hit(this, pos);
      if (this._kooFinisherNumericEditor && item?.kind !== "value") closeNumericEditor(this, true);
      if (!item) return onMouseDown?.apply(this, arguments);
      event?.preventDefault?.();
      event?.stopPropagation?.();
      this._kooFinisherPressedKey = item.kind === "button" ? item.key : "";
      if (item.kind === "value") {
        this._kooFinisherPressedKey = "";
        this._kooFinisherDragging = null;
        beginNumericEdit(this, item.name);
        this.setDirtyCanvas(true, true);
        return true;
      }
      if (item.kind === "field" && item.name === "prefix") editPrefix(this);
      if (item.kind === "button" && item.name === "lutSetFolder") saveFolder(this);
      if (item.kind === "button" && item.name === "refresh") loadLuts(this);
      if (item.kind === "button" && item.name === "lut") showLutMenu(this, event);
      if (item.kind === "button" && item.name === "outputSet") setOutputFolder(this);
      if (item.kind === "button" && item.name === "outputOpen") openOutputFolder(this);
      if (item.kind === "button" && item.name === "format") cycleFormat(this);
      if (item.kind === "button" && item.name === "reset") resetNode(this);
      if (item.kind === "button" && item.name === "bypass") setState(this, "bypass", !getState(this).bypass);
      if (item.kind === "button" && item.name === "save") saveImage(this);
      if (item.kind === "slider") {
        this._kooFinisherDragging = item.name || item.kind;
        updateSlider(this, this._kooFinisherDragging, pos);
      }
      this.setDirtyCanvas(true, true);
      return true;
    };

    const onMouseMove = nodeType.prototype.onMouseMove;
    nodeType.prototype.onMouseMove = function (event, pos) {
      if (this._kooFinisherDragging) {
        updateSlider(this, this._kooFinisherDragging, pos);
        return true;
      }
      const item = hit(this, pos);
      const key = hitKey(item);
      if (this._kooFinisherHoverKey !== key) {
        this._kooFinisherHoverKey = key;
        this.setDirtyCanvas(true, true);
      }
      const canvas = app.canvas?.canvas || app.canvasEl;
      if (canvas) canvas.style.cursor = item ? (item.kind === "value" ? "text" : item.kind === "slider" ? "ew-resize" : "pointer") : "";
      return onMouseMove?.apply(this, arguments);
    };

    const onMouseUp = nodeType.prototype.onMouseUp;
    nodeType.prototype.onMouseUp = function () {
      this._kooFinisherDragging = null;
      this._kooFinisherPressedKey = "";
      this.setDirtyCanvas(true, true);
      return onMouseUp?.apply(this, arguments);
    };

    const onResize = nodeType.prototype.onResize;
    nodeType.prototype.onResize = function (size) {
      if (this.size) {
        this.size[0] = Math.max(MIN_WIDTH, this.size[0]);
        this.size[1] = Math.max(MIN_HEIGHT, this.size[1]);
      }
      positionNumericEditor(this);
      return onResize?.apply(this, arguments);
    };

    const onRemoved = nodeType.prototype.onRemoved;
    nodeType.prototype.onRemoved = function () {
      closeNumericEditor(this, false);
      return onRemoved?.apply(this, arguments);
    };
  },
});
