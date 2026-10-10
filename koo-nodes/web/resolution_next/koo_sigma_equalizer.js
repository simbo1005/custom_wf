import { app } from "../../../scripts/app.js";
import {
  DEFAULT_ACCENT,
  THEMES,
  SWATCHES,
  THEME_TOKENS,
  activeFill,
  activeForeground,
  buildAccentPalette,
  drawPaletteIcon,
  drawRound,
  drawText,
  ellipsize,
  hexToRgba,
  normalizeHex,
  roundedRect,
} from "./koo_ui_shared.js";

const NODE_NAME = "KoOSigmaEqualizer";
const STORAGE_KEY = "koo.sigmaEqualizer.presets.v1";
const MODES = ["Auto", "TXT2IMG", "IMG2IMG", "Manual"];
const INTERPOLATIONS = ["Smoothstep", "Linear", "Cosine", "Exponential", "Sigmoid"];
const BACKEND_WIDGET_NAMES = [
  "mode",
  "profile",
  "structure_creativity",
  "shapes_materials",
  "microdetail",
  "final_cleanup",
  "curve_strength",
  "reference_blend",
  "smoothness",
  "steps",
  "max_sigma",
  "interpolation_type",
  "high_to_mid_boundary",
  "mid_to_low_boundary",
  "tail_length",
  "curve_gamma",
  "tail_exponent",
  "txt2img_settings",
  "img2img_settings",
  "auto_settings",
  "manual_curve_points",
  "normalized_manual_points",
  "lock_monotonic_curve",
  "prevent_duplicate_sigmas",
  "normalize_endpoints",
  "clamp_to_input_range",
  "preserve_final_zero",
  "allow_sigma_expansion",
  "include_appearance_in_preset",
  "denoise_active_range",
  "input_already_cropped",
  "output_steps_override_enabled",
  "output_steps_override",
  "denoise",
  "external_strength",
  "external_reference_blend",
];

const SLIDERS = [
  ["structure_creativity", "Structure / Creativity"],
  ["shapes_materials", "Material Definition"],
  ["microdetail", "Microdetail"],
  ["final_cleanup", "Final Cleanup"],
  ["curve_strength", "Curve Strength"],
  ["reference_blend", "Reference Blend"],
  ["smoothness", "Smoothness"],
];

const IMG2IMG_SLIDER = ["denoise_active_range", "Denoise / Active Range"];

const SAFETY = [
  ["lock_monotonic_curve", "Lock Monotonic Curve"],
  ["prevent_duplicate_sigmas", "Prevent Duplicate Sigmas"],
  ["normalize_endpoints", "Normalize Endpoints"],
  ["clamp_to_input_range", "Clamp to Input Range"],
  ["preserve_final_zero", "Preserve Final Zero"],
  ["allow_sigma_expansion", "Allow Sigma Expansion"],
];

const BUILT_INS = {
  "Balanced TXT2IMG": { category: "Built-in TXT2IMG", mode: "TXT2IMG", structure_creativity: 55, shapes_materials: 52, microdetail: 50, final_cleanup: 48, curve_strength: 70, reference_blend: 70, smoothness: 35, interpolation_type: "Smoothstep", high_to_mid_boundary: 0.66, mid_to_low_boundary: 0.22, tail_length: 0.055, curve_gamma: 1.0, tail_exponent: 1.0 },
  "Photoreal TXT2IMG": { category: "Built-in TXT2IMG", mode: "TXT2IMG", structure_creativity: 48, shapes_materials: 62, microdetail: 66, final_cleanup: 56, curve_strength: 74, reference_blend: 84, smoothness: 45, interpolation_type: "Cosine", high_to_mid_boundary: 0.62, mid_to_low_boundary: 0.20, tail_length: 0.052, curve_gamma: 1.08, tail_exponent: 1.05 },
  "Creative TXT2IMG": { category: "Built-in TXT2IMG", mode: "TXT2IMG", structure_creativity: 72, shapes_materials: 46, microdetail: 44, final_cleanup: 40, curve_strength: 82, reference_blend: 100, smoothness: 28, interpolation_type: "Smoothstep", high_to_mid_boundary: 0.72, mid_to_low_boundary: 0.24, tail_length: 0.06, curve_gamma: 0.9, tail_exponent: 0.95 },
  "Balanced IMG2IMG": { category: "Built-in IMG2IMG", mode: "IMG2IMG", denoise_active_range: 0.55, structure_creativity: 30, shapes_materials: 56, microdetail: 62, final_cleanup: 58, curve_strength: 58, reference_blend: 75, smoothness: 45, interpolation_type: "Smoothstep", high_to_mid_boundary: 0.58, mid_to_low_boundary: 0.19, tail_length: 0.05, curve_gamma: 1.0, tail_exponent: 1.0 },
  "Conservative Enhance": { category: "Built-in IMG2IMG", mode: "IMG2IMG", denoise_active_range: 0.20, structure_creativity: 18, shapes_materials: 50, microdetail: 58, final_cleanup: 68, curve_strength: 42, reference_blend: 55, smoothness: 55, interpolation_type: "Smoothstep", high_to_mid_boundary: 0.52, mid_to_low_boundary: 0.18, tail_length: 0.045, curve_gamma: 1.1, tail_exponent: 1.2 },
  "Skin Detail Enhance": { category: "Built-in IMG2IMG", mode: "IMG2IMG", denoise_active_range: 0.28, structure_creativity: 20, shapes_materials: 45, microdetail: 72, final_cleanup: 62, curve_strength: 55, reference_blend: 65, smoothness: 60, interpolation_type: "Cosine", high_to_mid_boundary: 0.50, mid_to_low_boundary: 0.17, tail_length: 0.044, curve_gamma: 1.05, tail_exponent: 1.1 },
  "Architectural Materials": { category: "Universal", mode: "Auto", denoise_active_range: 0.35, structure_creativity: 42, shapes_materials: 76, microdetail: 62, final_cleanup: 52, curve_strength: 68, reference_blend: 82, smoothness: 38, interpolation_type: "Smoothstep", high_to_mid_boundary: 0.60, mid_to_low_boundary: 0.21, tail_length: 0.05, curve_gamma: 1.12, tail_exponent: 1.0 },
  "Identity Preservation": { category: "Built-in IMG2IMG", mode: "IMG2IMG", denoise_active_range: 0.18, structure_creativity: 12, shapes_materials: 42, microdetail: 52, final_cleanup: 68, curve_strength: 38, reference_blend: 45, smoothness: 58, interpolation_type: "Smoothstep", high_to_mid_boundary: 0.48, mid_to_low_boundary: 0.16, tail_length: 0.042, curve_gamma: 1.15, tail_exponent: 1.18 },
  "Reference / Bypass": { category: "Universal", mode: "Auto", structure_creativity: 50, shapes_materials: 50, microdetail: 50, final_cleanup: 50, curve_strength: 50, reference_blend: 0, smoothness: 35, interpolation_type: "Smoothstep", high_to_mid_boundary: 0.66, mid_to_low_boundary: 0.22, tail_length: 0.055, curve_gamma: 1.0, tail_exponent: 1.0 },
};

const CONFIG_LABELS = {
  "Balanced TXT2IMG": "Balanced",
  "Photoreal TXT2IMG": "Photoreal",
  "Creative TXT2IMG": "Creative",
  "Balanced IMG2IMG": "Balanced",
  "Conservative Enhance": "Conservative",
  "Skin Detail Enhance": "Skin Detail",
  "Architectural Materials": "Architectural",
  "Identity Preservation": "Identity",
  "Reference / Bypass": "Bypass",
};

const BUILT_IN_CONFIG_FIELDS = Object.freeze([
  "mode",
  "structure_creativity",
  "shapes_materials",
  "microdetail",
  "final_cleanup",
  "curve_strength",
  "reference_blend",
  "smoothness",
  "interpolation_type",
  "high_to_mid_boundary",
  "mid_to_low_boundary",
  "tail_length",
  "curve_gamma",
  "tail_exponent",
  "denoise_active_range",
  "input_already_cropped",
  "lock_monotonic_curve",
  "prevent_duplicate_sigmas",
  "normalize_endpoints",
  "clamp_to_input_range",
  "preserve_final_zero",
  "allow_sigma_expansion",
]);

const PARAM_FIELDS = [
  "structure_creativity",
  "shapes_materials",
  "microdetail",
  "final_cleanup",
  "curve_strength",
  "reference_blend",
  "smoothness",
  "steps",
  "max_sigma",
  "interpolation_type",
  "high_to_mid_boundary",
  "mid_to_low_boundary",
  "tail_length",
  "curve_gamma",
  "tail_exponent",
  "denoise_active_range",
  "input_already_cropped",
  "output_steps_override_enabled",
  "output_steps_override",
  "profile",
];

function clamp(value, low, high) {
  const number = Number(value);
  return Math.max(low, Math.min(high, Number.isFinite(number) ? number : low));
}

function metrics(width) {
  const compact = width < 620;
  return {
    compact,
    pad: compact ? 12 : 14,
    gap: compact ? 8 : 10,
    sectionGap: compact ? 9 : 12,
    headerH: 86,
    sectionHeaderH: 44,
    rowH: compact ? 32 : 34,
    buttonH: compact ? 26 : 28,
    smallButtonH: 24,
    labelSize: 12,
    valueSize: 13,
    outputSafeW: compact ? 96 : 112,
  };
}

function displayMode(node) {
  const mode = getValue(node, "mode", "Auto");
  if (mode === "Manual") {
    return clamp(getValue(node, "denoise_active_range", 1), 0, 1) < 0.999 ? "IMG2IMG" : "TXT2IMG";
  }
  return mode;
}

function builtInConfigsForMode(node) {
  const mode = displayMode(node);
  return Object.entries(BUILT_INS)
    .filter(([, config]) => {
      if (mode === "TXT2IMG") return config.mode === "TXT2IMG" || config.category === "Universal";
      if (mode === "IMG2IMG") return config.mode === "IMG2IMG" || config.category === "Universal";
      return true;
    })
    .map(([name, config]) => ({ name, label: CONFIG_LABELS[name] || name, config, user: false }));
}

function userConfigs() {
  return Object.keys(readPresets().presets).sort().map((name) => ({ name, label: name, user: true }));
}

function wrapButtons(items, areaX, startY, areaW, buttonH, gap, minW = 78, maxW = 158) {
  const boxes = [];
  let x = areaX;
  let y = startY;
  for (const item of items) {
    const desired = Math.min(maxW, Math.max(minW, String(item.label).length * 7 + 24));
    const w = Math.min(areaW, desired);
    if (x > areaX && x + w > areaX + areaW) {
      x = areaX;
      y += buttonH + gap;
    }
    boxes.push({ ...item, x, y, w, h: buttonH });
    x += w + gap;
  }
  return { boxes, height: boxes.length ? boxes[boxes.length - 1].y + buttonH - startY : 0 };
}

function backendWidgets(node) {
  if (node.widgets?.length) {
    return node.widgets;
  }
  if (node._kooSigmaWidgets?.length) {
    return node._kooSigmaWidgets;
  }
  return [];
}

function widget(node, name) {
  return backendWidgets(node).find((item) => item?.name === name);
}

function getValue(node, name, fallback) {
  const item = widget(node, name);
  return item ? item.value : fallback;
}

function setValue(node, name, value, store = true) {
  const item = widget(node, name);
  if (!item) {
    return;
  }
  item.value = value;
  if (typeof item.callback === "function" && !node._kooSigmaSuppressWidgetCallbacks) {
    try {
      item.callback(value, app.canvas, node, app.canvas?.graph_mouse);
    } catch {
      node.properties = node.properties || {};
      node.properties.kooSigmaStatus = `Warning: ${name} callback failed`;
    }
  }
  if (store) {
    if (!node._kooSigmaRestoring && !node._kooSigmaApplyingConfiguration) {
      updateSelectedConfigurationFromValues(node);
    }
    storeActiveMode(node);
  }
  node.setDirtyCanvas(true, true);
}

function detachNativeWidgets(node, values) {
  const current = node.widgets || [];
  const byName = new Map();
  for (const item of [...(node._kooSigmaWidgets || []), ...current]) {
    if (item?.name && BACKEND_WIDGET_NAMES.includes(item.name) && !byName.has(item.name)) {
      byName.set(item.name, item);
    }
  }
  node._kooSigmaWidgets = BACKEND_WIDGET_NAMES.map((name) => byName.get(name)).filter(Boolean);
  if (Array.isArray(values)) {
    BACKEND_WIDGET_NAMES.forEach((name, index) => {
      const item = widget(node, name);
      if (item && values[index] !== undefined) {
        item.value = values[index];
      }
    });
  }
  for (const item of node._kooSigmaWidgets) {
    item.hidden = true;
    item.type = "hidden";
    item.serialize = item.serialize === false ? true : item.serialize;
    item.draw = () => {};
    item.computeSize = () => [0, 0];
  }
  node.widgets = node._kooSigmaWidgets;
}

function ensureProperties(node) {
  node.properties = node.properties || {};
  const appearance = node.properties.kooSigmaAppearance || {};
  const firstRun = node.properties.kooSigmaUiSchemaVersion == null;
  node.properties.kooSigmaAppearance = {
    schema_version: 1,
    theme: THEMES.includes(appearance.theme || node.properties.kooSigmaTheme) ? (appearance.theme || node.properties.kooSigmaTheme) : "Dark",
    accent: normalizeHex(appearance.accent || node.properties.kooSigmaAccent) || DEFAULT_ACCENT,
    contrast: Boolean(appearance.contrast ?? node.properties.kooContrastMode),
    open: firstRun ? false : appearance.open !== false,
  };
  node.properties.kooSigmaManualOpen = firstRun ? false : node.properties.kooSigmaManualOpen === true;
  node.properties.kooSigmaAdvancedOpen = firstRun ? false : node.properties.kooSigmaAdvancedOpen === true;
  node.properties.kooSigmaPresetsOpen = firstRun ? false : node.properties.kooSigmaPresetsOpen === true;
  node.properties.kooSigmaAppearanceOpen = node.properties.kooSigmaAppearance.open !== false;
  node.properties.kooSigmaPresetName = node.properties.kooSigmaPresetName || "Balanced TXT2IMG";
  node.properties.kooSigmaStatus = node.properties.kooSigmaStatus || "Ready";
  node.properties.kooSigmaUiSchemaVersion = 2;
}

function palette(node) {
  ensureProperties(node);
  const appearance = node.properties.kooSigmaAppearance;
  const cache = node._kooSigmaPalette;
  if (!cache || cache.sourceAccent !== appearance.accent || cache.sourceContrast !== appearance.contrast) {
    node._kooSigmaPalette = {
      sourceAccent: appearance.accent,
      sourceContrast: appearance.contrast,
      ...buildAccentPalette(appearance.accent, appearance.contrast),
    };
  }
  return node._kooSigmaPalette;
}

function tokens(node) {
  ensureProperties(node);
  return THEME_TOKENS[node.properties.kooSigmaAppearance.theme] || THEME_TOKENS.Dark;
}

function snapshot(node) {
  const data = {};
  for (const name of PARAM_FIELDS) {
    data[name] = getValue(node, name, "");
  }
  data.manual_curve_points = getValue(node, "manual_curve_points", '[{"x":0,"y":1},{"x":1,"y":0}]');
  data.normalized_manual_points = getValue(node, "normalized_manual_points", "");
  for (const [name] of SAFETY) {
    data[name] = Boolean(getValue(node, name, true));
  }
  return data;
}

function applySnapshot(node, data, store = false) {
  if (!data || typeof data !== "object") {
    return;
  }
  for (const [key, value] of Object.entries(data)) {
    if (BACKEND_WIDGET_NAMES.includes(key)) {
      setValue(node, key, value, store);
    }
  }
}

function storeActiveMode(node) {
  const mode = getValue(node, "mode", "Auto");
  const key = mode === "TXT2IMG" ? "txt2img_settings" : mode === "IMG2IMG" ? "img2img_settings" : mode === "Auto" ? "auto_settings" : null;
  if (!key || node._kooSigmaRestoring) {
    return;
  }
  const item = widget(node, key);
  if (item) {
    item.value = JSON.stringify({ schema_version: 1, ...snapshot(node) });
  }
}

function loadModeSettings(node, mode) {
  const key = mode === "TXT2IMG" ? "txt2img_settings" : mode === "IMG2IMG" ? "img2img_settings" : mode === "Auto" ? "auto_settings" : null;
  if (!key) {
    return;
  }
  let data = null;
  try {
    data = JSON.parse(getValue(node, key, "{}") || "{}");
  } catch {
    data = null;
  }
  if (!data || Object.keys(data).length <= 1) {
    return;
  }
  node._kooSigmaRestoring = true;
  applySnapshot(node, data, false);
  node._kooSigmaRestoring = false;
}

function switchMode(node, nextMode) {
  storeActiveMode(node);
  setValue(node, "mode", nextMode, false);
  loadModeSettings(node, nextMode);
  storeActiveMode(node);
}

function readPresets() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"schema_version":1,"presets":{}}');
    if (data?.schema_version > 1) {
      return { schema_version: 1, presets: {}, warning: "Preset schema is newer than this node" };
    }
    return { schema_version: 1, presets: data.presets && typeof data.presets === "object" ? data.presets : {} };
  } catch {
    return { schema_version: 1, presets: {}, warning: "Preset storage was unreadable" };
  }
}

function writePresets(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schema_version: 1, presets: data.presets || {} }));
    return true;
  } catch {
    return false;
  }
}

function currentPresetPayload(node, name) {
  return {
    schema_version: 1,
    preset_name: name,
    selected_operating_mode: getValue(node, "mode", "Auto"),
    txt2img_parameter_set: safeJson(getValue(node, "txt2img_settings", "{}"), {}),
    img2img_parameter_set: safeJson(getValue(node, "img2img_settings", "{}"), {}),
    auto_settings: safeJson(getValue(node, "auto_settings", "{}"), {}),
    manual_curve_points: points(node),
    interpolation_type: getValue(node, "interpolation_type", "Smoothstep"),
    curve_strength: Number(getValue(node, "curve_strength", 70)),
    reference_blend: Number(getValue(node, "reference_blend", 100)),
    smoothness: Number(getValue(node, "smoothness", 35)),
    denoise_active_range: Number(getValue(node, "denoise_active_range", 1)),
    steps: Number(getValue(node, "steps", 30)),
    maximum_sigma: Number(getValue(node, "max_sigma", 14.6)),
    input_already_cropped: getValue(node, "input_already_cropped", "Auto"),
    output_steps_override_enabled: Boolean(getValue(node, "output_steps_override_enabled", false)),
    output_steps_override: Number(getValue(node, "output_steps_override", 0)),
    sigma_band_boundaries: {
      high_to_mid: Number(getValue(node, "high_to_mid_boundary", 0.66)),
      mid_to_low: Number(getValue(node, "mid_to_low_boundary", 0.22)),
    },
    cleanup_tail_settings: {
      final_cleanup: Number(getValue(node, "final_cleanup", 48)),
      tail_length: Number(getValue(node, "tail_length", 0.055)),
      tail_exponent: Number(getValue(node, "tail_exponent", 1)),
    },
    perceptual_controls: {
      structure_creativity: Number(getValue(node, "structure_creativity", 55)),
      shapes_materials: Number(getValue(node, "shapes_materials", 52)),
      microdetail: Number(getValue(node, "microdetail", 50)),
      final_cleanup: Number(getValue(node, "final_cleanup", 48)),
    },
    safety_settings: Object.fromEntries(SAFETY.map(([key]) => [key, Boolean(getValue(node, key, true))])),
    include_appearance_in_preset: Boolean(getValue(node, "include_appearance_in_preset", false)),
    appearance: Boolean(getValue(node, "include_appearance_in_preset", false)) ? { ...node.properties.kooSigmaAppearance } : null,
    metadata: { created_by: "KoO Sigma Equalizer", storage_key: STORAGE_KEY },
  };
}

function safeJson(text, fallback) {
  try {
    const data = JSON.parse(text || "");
    return data && typeof data === "object" ? data : fallback;
  } catch {
    return fallback;
  }
}

function applyPresetPayload(node, payload) {
  if (!payload || typeof payload !== "object") {
    node.properties.kooSigmaStatus = "Preset rejected: invalid JSON";
    return false;
  }
  if (payload.schema_version > 1) {
    node.properties.kooSigmaStatus = "Preset rejected: newer schema";
    return false;
  }
  const direct = {
    mode: payload.selected_operating_mode,
    interpolation_type: payload.interpolation_type,
    curve_strength: payload.curve_strength,
    reference_blend: payload.reference_blend,
    smoothness: payload.smoothness,
    denoise_active_range: payload.denoise_active_range ?? payload.active_range ?? 1,
    steps: payload.steps,
    max_sigma: payload.maximum_sigma,
    input_already_cropped: payload.input_already_cropped || "Auto",
    output_steps_override_enabled: Boolean(payload.output_steps_override_enabled),
    output_steps_override: payload.output_steps_override || 0,
    high_to_mid_boundary: payload.sigma_band_boundaries?.high_to_mid,
    mid_to_low_boundary: payload.sigma_band_boundaries?.mid_to_low,
    tail_length: payload.cleanup_tail_settings?.tail_length,
    tail_exponent: payload.cleanup_tail_settings?.tail_exponent,
    final_cleanup: payload.cleanup_tail_settings?.final_cleanup,
    manual_curve_points: JSON.stringify(payload.manual_curve_points || [{ x: 0, y: 1 }, { x: 1, y: 0 }]),
    txt2img_settings: JSON.stringify(payload.txt2img_parameter_set || {}),
    img2img_settings: JSON.stringify(payload.img2img_parameter_set || {}),
    auto_settings: JSON.stringify(payload.auto_settings || {}),
  };
  Object.assign(direct, payload.perceptual_controls || {}, payload.safety_settings || {});
  node._kooSigmaRestoring = true;
  applySnapshot(node, direct, false);
  for (const [key, value] of Object.entries(direct)) {
    if (value !== undefined && BACKEND_WIDGET_NAMES.includes(key)) {
      setValue(node, key, value, false);
    }
  }
  node._kooSigmaRestoring = false;
  if (payload.appearance && payload.include_appearance_in_preset) {
    node.properties.kooSigmaAppearance = {
      schema_version: 1,
      theme: THEMES.includes(payload.appearance.theme) ? payload.appearance.theme : "Dark",
      accent: normalizeHex(payload.appearance.accent) || DEFAULT_ACCENT,
      contrast: Boolean(payload.appearance.contrast),
      open: payload.appearance.open !== false,
    };
    node.properties.kooSigmaAppearanceOpen = node.properties.kooSigmaAppearance.open;
  }
  node.properties.kooSigmaPresetName = payload.preset_name || "Imported Preset";
  storeActiveMode(node);
  node.properties.kooSigmaStatus = `Loaded preset: ${node.properties.kooSigmaPresetName}`;
  return true;
}

function loadPresetByName(node, name) {
  if (BUILT_INS[name]) {
    applyBuiltInConfiguration(node, name);
    return;
  }
  const userPreset = readPresets().presets[name];
  if (userPreset) {
    applyPresetPayload(node, userPreset);
  }
}

function applyConfiguration(node, name) {
  loadPresetByName(node, name);
}

function applyBuiltInConfiguration(node, name) {
  const config = BUILT_INS[name];
  if (!config) return;
  const beforeMode = getValue(node, "mode", "Auto");
  const mode = config.category === "Universal" && (beforeMode === "TXT2IMG" || beforeMode === "IMG2IMG") ? beforeMode : config.mode || "Auto";
  const previousCallbacks = node._kooSigmaSuppressWidgetCallbacks;
  node._kooSigmaApplyingConfiguration = true;
  node._kooSigmaRestoring = true;
  node._kooSigmaSuppressWidgetCallbacks = true;
  for (const field of BUILT_IN_CONFIG_FIELDS) {
    let value = config[field];
    if (field === "mode") value = mode;
    if (value !== undefined && BACKEND_WIDGET_NAMES.includes(field)) {
      setValue(node, field, value, false);
    }
  }
  setValue(node, "profile", name, false);
  node._kooSigmaSuppressWidgetCallbacks = previousCallbacks;
  node._kooSigmaRestoring = false;
  node._kooSigmaApplyingConfiguration = false;
  node.properties.kooSigmaPresetName = name;
  updateSelectedConfigurationFromValues(node);
  storeActiveMode(node);
  const blend = Number(getValue(node, "reference_blend", 100));
  node.properties.kooSigmaStatus = blend <= 0
    ? `${name}: Reference Blend 0% - final output is preserving the reference schedule`
    : `${name}: applied ${config.category}`;
  node.setDirtyCanvas(true, true);
}

function valuesMatchConfig(node, config) {
  const currentMode = getValue(node, "mode", "Auto");
  for (const field of BUILT_IN_CONFIG_FIELDS) {
    if (field === "mode") {
      if (config.category !== "Universal" && config.mode && currentMode !== config.mode) return false;
      continue;
    }
    if (config[field] === undefined) continue;
    const actual = getValue(node, field, null);
    const expected = config[field];
    if (typeof expected === "number") {
      if (Math.abs(Number(actual) - expected) > 0.0005) return false;
    } else if (actual !== expected) {
      return false;
    }
  }
  return true;
}

function updateSelectedConfigurationFromValues(node) {
  const match = Object.entries(BUILT_INS).find(([, config]) => valuesMatchConfig(node, config));
  if (match) {
    setValue(node, "profile", match[0], false);
    node.properties.kooSigmaPresetName = match[0];
  } else {
    setValue(node, "profile", "Custom", false);
    node.properties.kooSigmaPresetName = "Custom";
    node.properties.kooSigmaStatus = Number(getValue(node, "reference_blend", 100)) <= 0
      ? "Custom: Reference Blend 0% - final output is preserving the reference schedule"
      : "Custom";
  }
}

function savePreset(node, name) {
  const clean = String(name || "").trim();
  if (!clean) {
    return false;
  }
  const data = readPresets();
  data.presets[clean] = currentPresetPayload(node, clean);
  if (!writePresets(data)) {
    node.properties.kooSigmaStatus = "Preset save failed: local storage unavailable";
    return false;
  }
  node.properties.kooSigmaPresetName = clean;
  node.properties.kooSigmaStatus = `Saved preset: ${clean}`;
  return true;
}

function points(node) {
  const parsed = safeJson(getValue(node, "manual_curve_points", "[]"), []);
  const base = Array.isArray(parsed) ? parsed : [];
  const cleaned = base
    .map((point) => ({ x: clamp(point.x, 0, 1), y: clamp(point.y, 0, 1) }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  cleaned.push({ x: 0, y: 1 }, { x: 1, y: 0 });
  cleaned.sort((a, b) => a.x - b.x);
  const merged = [];
  for (const point of cleaned) {
    if (merged.length && Math.abs(point.x - merged[merged.length - 1].x) < 0.0001) {
      merged[merged.length - 1] = point;
    } else {
      merged.push(point);
    }
  }
  merged[0] = { x: 0, y: 1 };
  merged[merged.length - 1] = { x: 1, y: 0 };
  let previous = 1;
  for (const point of merged) {
    point.y = Math.min(previous, point.y);
    previous = point.y;
  }
  return merged;
}

function writePoints(node, nextPoints) {
  pushUndo(node);
  const text = JSON.stringify(nextPoints.map((point) => ({ x: Number(point.x.toFixed(4)), y: Number(point.y.toFixed(4)) })));
  setValue(node, "manual_curve_points", text);
  setValue(node, "normalized_manual_points", text);
}

function pushUndo(node) {
  node._kooSigmaUndo = node._kooSigmaUndo || [];
  node._kooSigmaRedo = [];
  node._kooSigmaUndo.push(getValue(node, "manual_curve_points", '[{"x":0,"y":1},{"x":1,"y":0}]'));
  if (node._kooSigmaUndo.length > 50) {
    node._kooSigmaUndo.shift();
  }
}

function generatedNormalized(node, count = 80) {
  const strength = clamp(getValue(node, "curve_strength", 70), 0, 100);
  const highMid = clamp(getValue(node, "high_to_mid_boundary", 0.66), 0.2, 0.92);
  const midLow = clamp(getValue(node, "mid_to_low_boundary", 0.22), 0.04, highMid - 0.02);
  const tail = clamp(getValue(node, "tail_length", 0.055), 0.01, midLow - 0.005);
  const controls = [
    [1, highMid, weight(getValue(node, "structure_creativity", 55), strength)],
    [highMid, midLow, weight(getValue(node, "shapes_materials", 52), strength)],
    [midLow, tail, weight(getValue(node, "microdetail", 50), strength)],
    [tail, 0, weight(getValue(node, "final_cleanup", 48), strength)],
  ];
  const spans = controls.map(([a, b, w]) => Math.abs(a - b) * w);
  const total = spans.reduce((a, b) => a + b, 0) || 1;
  const cumulative = [];
  spans.reduce((sum, value) => {
    const next = sum + value / total;
    cumulative.push(next);
    return next;
  }, 0);
  const result = [];
  for (let i = 0; i < count; i++) {
    const progress = i / (count - 1);
    let lower = 0;
    let band = controls.length - 1;
    for (let j = 0; j < cumulative.length; j++) {
      if (progress <= cumulative[j] || j === cumulative.length - 1) {
        band = j;
        break;
      }
      lower = cumulative[j];
    }
    const upper = cumulative[band];
    const local = ease(upper <= lower ? 0 : (progress - lower) / (upper - lower), getValue(node, "interpolation_type", "Smoothstep"));
    result.push(controls[band][0] + (controls[band][1] - controls[band][0]) * local);
  }
  result[0] = 1;
  result[result.length - 1] = 0;
  const gamma = clamp(getValue(node, "curve_gamma", 1), 0.1, 5);
  const tailExponent = clamp(getValue(node, "tail_exponent", 1), 0.1, 5);
  const shapedTail = clamp(getValue(node, "tail_length", 0.055), 0.001, 0.4);
  let shaped = result.map((value) => value ** gamma);
  shaped = shaped.map((value) => value > shapedTail ? value : shapedTail * ((value / shapedTail) ** tailExponent));
  shaped[0] = 1;
  shaped[shaped.length - 1] = 0;
  return smoothValues(shaped, getValue(node, "smoothness", 35));
}

function smoothValues(values, amount) {
  let out = [...values];
  const passes = Math.round(clamp(amount, 0, 100) / 22);
  for (let pass = 0; pass < passes; pass++) {
    const next = [out[0]];
    for (let index = 1; index < out.length - 1; index++) {
      next.push(out[index] * 0.5 + (out[index - 1] + out[index + 1]) * 0.25);
    }
    next.push(out[out.length - 1]);
    out = next;
  }
  return out;
}

function sourceSchedulePreview(node) {
  const transitions = Math.max(1, Math.round(Number(getValue(node, "steps", 30)) || 30));
  const maxSigma = Math.max(0.01, Number(getValue(node, "max_sigma", 14.6)) || 14.6);
  const values = [];
  for (let i = 0; i <= transitions; i++) {
    const progress = i / transitions;
    values.push(i === transitions ? 0 : maxSigma * ((1 - progress) ** 2.35));
  }
  return values;
}

function activeSchedulePreview(node) {
  const source = sourceSchedulePreview(node);
  const selectedMode = getValue(node, "mode", "Auto");
  const requestedDenoise = clamp(getValue(node, "denoise_active_range", 1), 0, 1);
  const mode = selectedMode === "Auto" && requestedDenoise < 0.999 ? "IMG2IMG" : selectedMode;
  const denoise = mode === "TXT2IMG" ? 1 : requestedDenoise;
  const already = getValue(node, "input_already_cropped", "Auto");
  const autoAlready = already === "Auto" && denoise <= 0.35 && Math.max(0, source.length - 1) <= 12;
  if ((mode !== "IMG2IMG" && !(mode === "Manual" && denoise < 0.999)) || already === "Yes" || autoAlready) {
    return { source, active: source, cropIndex: 0, denoise, alreadyCropped: already === "Yes" || autoAlready };
  }
  const transitions = Math.max(0, source.length - 1);
  const activeTransitions = transitions ? Math.max(1, Math.ceil(transitions * denoise)) : 0;
  const cropIndex = Math.max(0, transitions - activeTransitions);
  return { source, active: source.slice(cropIndex), cropIndex, denoise, alreadyCropped: false };
}

function outputSchedulePreview(node) {
  const activeInfo = activeSchedulePreview(node);
  const override = Boolean(getValue(node, "output_steps_override_enabled", false));
  const overrideSteps = Math.max(0, Math.round(Number(getValue(node, "output_steps_override", 0)) || 0));
  const count = override && overrideSteps > 0 ? overrideSteps + 1 : activeInfo.active.length;
  const normalized = getValue(node, "mode", "Auto") === "Manual" ? manualNormalizedValues(node, count) : generatedNormalized(node, count);
  const maxSigma = activeInfo.active[0] ?? 0;
  const minSigma = Boolean(getValue(node, "preserve_final_zero", true)) ? 0 : activeInfo.active[activeInfo.active.length - 1] ?? 0;
  const generated = normalized.map((value) => minSigma + (maxSigma - minSigma) * value);
  if (generated.length) {
    generated[0] = maxSigma;
    if (Boolean(getValue(node, "preserve_final_zero", true))) generated[generated.length - 1] = 0;
  }
  const blend = clamp(getValue(node, "reference_blend", 100), 0, 100) / 100;
  const ref = resample(activeInfo.active, generated.length);
  const output = generated.map((value, index) => blendSigma(ref[index], value, blend));
  if (output.length && Boolean(getValue(node, "preserve_final_zero", true))) output[output.length - 1] = 0;
  return { ...activeInfo, generated, output, override, blend };
}

function blendSigma(reference, generated, blend) {
  const epsilon = 1e-8;
  if (blend <= 0) return reference;
  if (blend >= 1) return generated;
  if (reference <= epsilon || generated <= epsilon) {
    return reference * (1 - blend) + generated * blend;
  }
  return Math.exp(Math.log(reference) * (1 - blend) + Math.log(generated) * blend);
}

function manualNormalizedValues(node, count) {
  const manual = points(node);
  const values = [];
  let p = 0;
  for (let i = 0; i < count; i++) {
    const x = count <= 1 ? 0 : i / (count - 1);
    while (p < manual.length - 2 && x > manual[p + 1].x) p++;
    const left = manual[p];
    const right = manual[Math.min(p + 1, manual.length - 1)];
    const local = ease((x - left.x) / Math.max(0.0001, right.x - left.x), getValue(node, "interpolation_type", "Smoothstep"));
    values.push(left.y + (right.y - left.y) * local);
  }
  return values;
}

function resample(values, count) {
  if (!values.length) return Array(count).fill(0);
  if (values.length === count) return [...values];
  if (count <= 1) return [values[0]];
  const out = [];
  for (let i = 0; i < count; i++) {
    const pos = (i / (count - 1)) * (values.length - 1);
    const left = Math.floor(pos);
    const right = Math.min(values.length - 1, left + 1);
    const amount = pos - left;
    out.push(values[left] * (1 - amount) + values[right] * amount);
  }
  return out;
}

function weight(value, strength) {
  return Math.max(0.12, 1 + ((clamp(value, 0, 100) - 50) / 50) * 1.35 * (strength / 100));
}

function ease(value, type) {
  const t = clamp(value, 0, 1);
  if (type === "Linear") return t;
  if (type === "Cosine") return 0.5 - 0.5 * Math.cos(Math.PI * t);
  if (type === "Exponential") return t ** 1.65;
  if (type === "Sigmoid") return 1 / (1 + Math.exp(-10 * (t - 0.5)));
  return t * t * (3 - 2 * t);
}

function graphValues(node, count = 100) {
  const preview = outputSchedulePreview(node);
  const maxValue = Math.max(preview.output[0] || 1, 1e-8);
  return resample(preview.output, count).map((value) => clamp(value / maxValue, 0, 1));
}

function makeLayout(node) {
  const minWidth = 540;
  const width = Math.max(minWidth, node.size?.[0] || 680);
  const m = metrics(width);
  const compact = m.compact;
  const x = compact ? 14 : 18;
  const right = width - x;
  let y = compact ? 14 : 18;
  const gap = m.gap;
  const sectionGap = m.sectionGap;
  const hitboxes = [];
  const addHit = (kind, box, value) => hitboxes.push({ kind, value, ...box });
  const full = (height) => {
    const box = { x, y, w: right - x, h: height };
    y += height + sectionGap;
    return box;
  };

  const header = full(m.headerH);
  const pillW = (header.w - 28 - gap * 3) / 4;
  MODES.forEach((mode, index) => {
    addHit("mode", { x: header.x + 14 + index * (pillW + gap), y: header.y + 50, w: pillW, h: m.buttonH }, mode);
  });

  const configItems = builtInConfigsForMode(node);
  const userItems = userConfigs();
  const configAreaW = right - x - m.pad * 2;
  const configBuilt = wrapButtons(configItems, x + m.pad, y + 34, configAreaW, m.buttonH, 7);
  const hasUsers = userItems.length > 0;
  const userStartY = y + 34 + configBuilt.height + (hasUsers ? 24 : 0);
  const configUsers = hasUsers ? wrapButtons(userItems.slice(0, 6), x + m.pad, userStartY, configAreaW - 86, m.buttonH, 7, 72, 132) : { boxes: [], height: 0 };
  const configHeight = 42 + configBuilt.height + (hasUsers ? 24 + Math.max(configUsers.height, m.buttonH) : 0) + m.pad;
  const profile = full(configHeight);
  for (const box of configBuilt.boxes) addHit("config", box, box.name);
  for (const box of configUsers.boxes) addHit("config", box, box.name);
  if (hasUsers) addHit("presetsToggle", { x: profile.x + profile.w - m.pad - 78, y: userStartY, w: 78, h: m.buttonH }, null);

  const graph = full(compact ? 178 : 190);
  const graphPlot = { x: graph.x + 14, y: graph.y + 34, w: graph.w - 28, h: graph.h - 50 };
  addHit("graph", graphPlot, null);

  const visibleSliders = [...SLIDERS];
  if (getValue(node, "mode", "Auto") !== "TXT2IMG") visibleSliders.unshift(IMG2IMG_SLIDER);
  const sliderRows = Math.ceil(visibleSliders.length / (compact ? 1 : 2));
  const sliders = full(34 + sliderRows * 36 + 46);
  const sliderBoxes = [];
  const cols = compact ? 1 : 2;
  const rowH = 36;
  const colW = (sliders.w - 28 - gap * (cols - 1)) / cols;
  visibleSliders.forEach(([name, label], index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const box = { x: sliders.x + 14 + col * (colW + gap), y: sliders.y + 34 + row * rowH, w: colW, h: 28 };
    sliderBoxes.push({ name, label, ...box });
    addHit("slider", box, name);
  });
  const stepBox = { x: sliders.x + 14, y: sliders.y + sliders.h - 42, w: (sliders.w - 38) / 2, h: 28 };
  const sigmaBox = { x: stepBox.x + stepBox.w + 10, y: stepBox.y, w: stepBox.w, h: 28 };
  addHit("number", stepBox, "steps");
  addHit("number", sigmaBox, "max_sigma");

  const manualOpen = node.properties?.kooSigmaManualOpen === true;
  const manual = full(manualOpen ? 118 : 44);
  addHit("manualToggle", { x: manual.x + manual.w - 38, y: manual.y + 9, w: 28, h: 28 }, null);
  const manualButtons = ["Undo", "Redo", "Reset", "Smooth Curve", "Simplify Points", "Convert to Manual", "Restore Reference"];
  let bx = manual.x + 14;
  let by = manual.y + 34;
  if (manualOpen) {
    for (const label of manualButtons) {
      const bw = label.length > 14 ? 126 : label.length > 8 ? 96 : 58;
      if (bx + bw > manual.x + manual.w - 14) {
        bx = manual.x + 14;
        by += 30;
      }
      const box = { x: bx, y: by, w: bw, h: 24 };
      addHit("manualAction", box, label);
      bx += bw + 7;
    }
  }
  const selectedX = { x: manual.x + manual.w - 150, y: manual.y + 8, w: 62, h: 22 };
  const selectedY = { x: manual.x + manual.w - 82, y: manual.y + 8, w: 68, h: 22 };
  if (manualOpen && node._kooSigmaSelectedPoint != null) {
    addHit("selectedNumeric", selectedX, "x");
    addHit("selectedNumeric", selectedY, "y");
  }

  const advancedOpen = node.properties?.kooSigmaAdvancedOpen === true;
  const overrideOn = Boolean(getValue(node, "output_steps_override_enabled", false));
  const advancedFieldCount = 7;
  const advancedFieldRows = Math.ceil(advancedFieldCount / 3);
  const safetyRows = Math.ceil((SAFETY.length + 1) / 3);
  const advancedHeight = advancedOpen
    ? 40 + advancedFieldRows * 34 + (overrideOn ? 34 : 0) + 30 + safetyRows * 28 + 14
    : 44;
  const advanced = full(advancedHeight);
  addHit("advancedToggle", { x: advanced.x + advanced.w - 38, y: advanced.y + 9, w: 28, h: 28 }, null);
  const advancedFields = [];
  if (advancedOpen) {
    const fields = [
      ["interpolation_type", "Interpolation"],
      ["high_to_mid_boundary", "High to Mid"],
      ["mid_to_low_boundary", "Mid to Low"],
      ["tail_length", "Tail Length"],
      ["curve_gamma", "Curve Gamma"],
      ["tail_exponent", "Tail Exponent"],
      ["input_already_cropped", "Input Cropped"],
    ];
    fields.forEach(([name, label], index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const box = { x: advanced.x + 14 + col * ((advanced.w - 28 - gap * 2) / 3 + gap), y: advanced.y + 40 + row * 34, w: (advanced.w - 28 - gap * 2) / 3, h: 26 };
      advancedFields.push({ name, label, ...box });
      addHit(name === "interpolation_type" ? "interpolation" : name === "input_already_cropped" ? "croppedState" : "number", box, name);
    });
    const overrideY = advanced.y + 40 + advancedFieldRows * 34;
    const overrideToggle = { x: advanced.x + 14, y: overrideY, w: (advanced.w - 28 - gap * 2) / 3, h: 22 };
    addHit("safety", overrideToggle, "output_steps_override_enabled");
    if (overrideOn) {
      const outputSteps = { x: advanced.x + 14 + ((advanced.w - 28 - gap * 2) / 3 + gap), y: overrideY - 2, w: (advanced.w - 28 - gap * 2) / 3, h: 26 };
      advancedFields.push({ name: "output_steps_override", label: "Output Steps", ...outputSteps });
      addHit("number", outputSteps, "output_steps_override");
    }
    SAFETY.forEach(([name, label], index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const box = { x: advanced.x + 14 + col * ((advanced.w - 28 - gap * 2) / 3 + gap), y: overrideY + 30 + (overrideOn ? 34 : 0) + row * 28, w: (advanced.w - 28 - gap * 2) / 3, h: 22 };
      addHit("safety", box, name);
    });
  }

  const presetsOpen = node.properties?.kooSigmaPresetsOpen === true;
  const presetButtons = ["Save", "Save As", "Rename", "Duplicate", "Delete", "Import JSON", "Export JSON"];
  const presetButtonItems = presetButtons.map((label) => ({ name: label, label }));
  const presetWrapped = presetsOpen ? wrapButtons(presetButtonItems, x + m.pad, y + 42, right - x - m.pad * 2, m.smallButtonH, 7, 58, 96) : { boxes: [], height: 0 };
  const presets = full(presetsOpen ? 56 + presetWrapped.height + 34 : 44);
  addHit("presetsToggle", { x: presets.x + presets.w - 38, y: presets.y + 9, w: 28, h: 28 }, null);
  if (presetsOpen) {
    for (const box of presetWrapped.boxes) {
      addHit("presetAction", box, box.name);
    }
  }
  const includeAppearance = { x: presets.x + 14, y: presets.y + 48 + presetWrapped.height, w: 176, h: 24 };
  if (presetsOpen) addHit("includeAppearance", includeAppearance, null);

  const appearanceOpen = node.properties?.kooSigmaAppearanceOpen === true;
  const appearance = full(appearanceOpen ? 132 : 44);
  addHit("appearanceToggle", { x: appearance.x + appearance.w - 38, y: appearance.y + 9, w: 28, h: 28 }, null);
  const themeButtons = [];
  const swatches = [];
  if (appearanceOpen) {
    THEMES.forEach((name, index) => {
      const box = { x: appearance.x + 78 + index * 66, y: appearance.y + 42, w: 60, h: 28 };
      themeButtons.push({ name, ...box });
      addHit("theme", box, name);
    });
    addHit("contrast", { x: appearance.x + 280, y: appearance.y + 42, w: 96, h: 28 }, null);
    SWATCHES.forEach((color, index) => {
      const box = { x: appearance.x + 78 + index * 28, y: appearance.y + 86, w: 20, h: 20 };
      swatches.push({ color, ...box });
      addHit("accent", box, color);
    });
    addHit("customAccent", { x: appearance.x + appearance.w - 158, y: appearance.y + 87, w: 50, h: 18 }, null);
    addHit("resetAccent", { x: appearance.x + appearance.w - 98, y: appearance.y + 87, w: 84, h: 18 }, null);
  }

  const footer = { x, y: y - 4, w: right - x, h: 18 };
  const desiredHeight = Math.max(520, footer.y + footer.h + 14);
  return { width, compact, desiredHeight, hitboxes, header, profile, configBuilt: configBuilt.boxes, configUsers: configUsers.boxes, graph, graphPlot, sliders, sliderBoxes, stepBox, sigmaBox, manual, selectedX, selectedY, advanced, advancedFields, presets, includeAppearance, appearance, themeButtons, swatches, footer };
}

function drawSlider(ctx, node, box, name, label, tokensValue, paletteValue) {
  const isUnit = name === "denoise_active_range";
  const value = isUnit ? clamp(getValue(node, name, 1), 0, 1) * 100 : clamp(getValue(node, name, 50), 0, 100);
  drawText(ctx, label, box.x, box.y + 8, 12, tokensValue.textMuted, "800");
  drawText(ctx, isUnit ? valueToDenoiseText(value / 100) : `${Math.round(value)}%`, box.x + box.w, box.y + 8, 12, tokensValue.textSecondary, "750", "right");
  const track = { x: box.x, y: box.y + 17, w: box.w, h: 9 };
  drawRound(ctx, track, tokensValue.background, tokensValue.border, 1, 5);
  drawRound(ctx, { ...track, w: Math.max(8, track.w * value / 100) }, activeFill(paletteValue, 0.22), paletteValue.accentBorder, 1, 5);
}

function valueToDenoiseText(value) {
  return `${Number(value).toFixed(2)} (${Math.round(value * 100)}%)`;
}

function graphPlotBox(box) {
  const gutter = Math.min(118, Math.max(82, box.w * 0.24));
  return { x: box.x + gutter, y: box.y + 4, w: Math.max(80, box.w - gutter - 8), h: Math.max(60, box.h - 26) };
}

function drawGraph(ctx, node, box, tokensValue, paletteValue) {
  drawRound(ctx, box, tokensValue.background, tokensValue.border, 1, 7);
  const plot = graphPlotBox(box);
  ctx.save();
  roundedRect(ctx, box.x, box.y, box.w, box.h, 7);
  ctx.clip();
  const highMid = clamp(getValue(node, "high_to_mid_boundary", 0.66), 0.2, 0.92);
  const midLow = clamp(getValue(node, "mid_to_low_boundary", 0.22), 0.04, highMid - 0.02);
  const tail = clamp(getValue(node, "tail_length", 0.055), 0.01, midLow - 0.005);
  const bands = [
    ["HIGH / STRUCTURE", 1, highMid],
    ["MID / MATERIALS", highMid, midLow],
    ["LOW / DETAIL", midLow, tail],
    ["TAIL / CLEANUP", tail, 0],
  ];
  const labelPositions = [];
  bands.forEach(([label, top, bottom], index) => {
    const y = plot.y + (1 - top) * plot.h;
    const h = Math.max(1, (top - bottom) * plot.h);
    ctx.fillStyle = hexToRgba(paletteValue.accentSolid, index % 2 ? 0.035 : 0.06);
    ctx.fillRect(box.x, y, box.w, h);
    labelPositions.push({ label, y: y + h / 2 });
  });
  const minLabelGap = 14;
  for (let index = 1; index < labelPositions.length; index++) {
    if (labelPositions[index].y - labelPositions[index - 1].y < minLabelGap) {
      labelPositions[index].y = labelPositions[index - 1].y + minLabelGap;
    }
  }
  for (let index = labelPositions.length - 2; index >= 0; index--) {
    if (labelPositions[index + 1].y > box.y + box.h - 12) {
      labelPositions[index + 1].y = plot.y + plot.h - 10;
    }
    if (labelPositions[index + 1].y - labelPositions[index].y < minLabelGap) {
      labelPositions[index].y = labelPositions[index + 1].y - minLabelGap;
    }
  }
  for (const item of labelPositions) {
    drawText(ctx, ellipsize(ctx, item.label, plot.x - box.x - 14), box.x + 8, clamp(item.y, plot.y + 12, plot.y + plot.h - 10), 9, tokensValue.textMuted, "800");
  }
  ctx.strokeStyle = hexToRgba(paletteValue.accentSolid, 0.08);
  ctx.lineWidth = 1;
  for (let gx = plot.x; gx <= plot.x + plot.w; gx += plot.w / 5) {
    ctx.beginPath();
    ctx.moveTo(gx, box.y);
    ctx.lineTo(gx, plot.y + plot.h);
    ctx.stroke();
  }
  for (let gy = plot.y; gy <= plot.y + plot.h; gy += plot.h / 4) {
    ctx.beginPath();
    ctx.moveTo(plot.x, gy);
    ctx.lineTo(plot.x + plot.w, gy);
    ctx.stroke();
  }
  const preview = outputSchedulePreview(node);
  const maxValue = Math.max(preview.output[0] || 1, 1e-8);
  const referenceValues = resample(preview.active, Math.min(160, Math.max(2, preview.active.length)));
  ctx.beginPath();
  referenceValues.forEach((value, index) => {
    const x = plot.x + (index / Math.max(1, referenceValues.length - 1)) * plot.w;
    const y = plot.y + (1 - clamp(value / maxValue, 0, 1)) * plot.h;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = tokensValue.textMuted;
  ctx.globalAlpha = 0.55;
  ctx.stroke();
  ctx.globalAlpha = 1;

  const generatedValues = preview.generated || [];
  ctx.beginPath();
  generatedValues.forEach((value, index) => {
    const x = plot.x + (index / Math.max(1, generatedValues.length - 1)) * plot.w;
    const y = plot.y + (1 - clamp(value / maxValue, 0, 1)) * plot.h;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.save();
  ctx.setLineDash([5, 4]);
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = hexToRgba(paletteValue.accentSolid, 0.58);
  ctx.stroke();
  ctx.restore();

  const values = graphValues(node, 160);
  ctx.beginPath();
  values.forEach((value, index) => {
    const x = plot.x + (index / (values.length - 1)) * plot.w;
    const y = plot.y + (1 - value) * plot.h;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.lineWidth = 3;
  ctx.strokeStyle = paletteValue.accentSolid;
  ctx.stroke();
  drawText(ctx, "Reference", plot.x + 8, plot.y + 12, 9, tokensValue.textMuted, "650");
  drawText(ctx, "Generated", plot.x + 74, plot.y + 12, 9, hexToRgba(paletteValue.accentSolid, 0.78), "650");
  drawText(ctx, "Final", plot.x + 146, plot.y + 12, 9, paletteValue.accentSolid, "850");
  const pointValues = preview.output;
  const stride = pointValues.length > 80 ? Math.ceil(pointValues.length / 60) : 1;
  node._kooSigmaGraphPoints = [];
  pointValues.forEach((value, index) => {
    if (index % stride !== 0 && index !== pointValues.length - 1) return;
    const x = plot.x + (index / Math.max(1, pointValues.length - 1)) * plot.w;
    const y = plot.y + (1 - clamp(value / maxValue, 0, 1)) * plot.h;
    node._kooSigmaGraphPoints.push({ x, y, index, sigma: value, total: Math.max(0, pointValues.length - 1), region: regionName(node, value / maxValue) });
    ctx.beginPath();
    ctx.arc(x, y, pointValues.length > 80 ? 2 : 3, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(paletteValue.accentSolid, 0.82);
    ctx.fill();
  });
  if (getValue(node, "mode", "Auto") === "Manual") {
    const manual = points(node);
    manual.forEach((point, index) => {
      const x = plot.x + point.x * plot.w;
      const y = plot.y + (1 - point.y) * plot.h;
      ctx.beginPath();
      ctx.arc(x, y, index === node._kooSigmaSelectedPoint ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = index === node._kooSigmaSelectedPoint ? activeForeground(paletteValue, tokensValue.text) : tokensValue.textSecondary;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = paletteValue.accentSolid;
      ctx.stroke();
    });
  }
  drawText(ctx, "Sampling Progression", plot.x + plot.w / 2, box.y + box.h - 10, 10, tokensValue.textMuted, "700", "center");
  drawText(ctx, "Sigma", plot.x + 4, box.y + 12, 10, tokensValue.textMuted, "700");
  if (node._kooSigmaHoverPoint) {
    const hp = node._kooSigmaHoverPoint;
    const tipW = 118;
    const tipH = 48;
    const tipX = Math.min(box.x + box.w - tipW - 6, Math.max(box.x + 6, hp.x + 10));
    const tipY = Math.min(box.y + box.h - tipH - 6, Math.max(box.y + 6, hp.y - tipH - 6));
    drawRound(ctx, { x: tipX, y: tipY, w: tipW, h: tipH }, tokensValue.surfaceRaised, tokensValue.borderStrong, 1, 6);
    drawText(ctx, `Step ${hp.index} / ${hp.total}`, tipX + 8, tipY + 13, 11, tokensValue.text, "800");
    drawText(ctx, `Sigma: ${hp.sigma.toFixed(4)}`, tipX + 8, tipY + 28, 10, tokensValue.textSecondary, "650");
    drawText(ctx, hp.region, tipX + 8, tipY + 41, 10, paletteValue.accentSolid, "750");
  }
  ctx.restore();
}

function regionName(node, normalizedSigma) {
  const value = clamp(normalizedSigma, 0, 1);
  const highMid = clamp(getValue(node, "high_to_mid_boundary", 0.66), 0.2, 0.92);
  const midLow = clamp(getValue(node, "mid_to_low_boundary", 0.22), 0.04, highMid - 0.02);
  const tail = clamp(getValue(node, "tail_length", 0.055), 0.01, midLow - 0.005);
  if (value >= highMid) return "Structure";
  if (value >= midLow) return "Materials";
  if (value >= tail) return "Detail";
  return "Cleanup";
}

function drawUI(node, ctx) {
  ensureProperties(node);
  detachNativeWidgets(node);
  const t = tokens(node);
  const p = palette(node);
  const layout = makeLayout(node);
  node._kooSigmaHitboxes = layout.hitboxes;
  node._kooSigmaGraphBox = graphPlotBox(layout.graphPlot);
  if (!node.size || Math.abs(node.size[1] - layout.desiredHeight) > 2) {
    node.size = [layout.width, layout.desiredHeight];
  }
  drawRound(ctx, { x: 8, y: 8, w: layout.width - 16, h: layout.desiredHeight - 16 }, t.background, t.borderStrong, 1.5, 12);

  const preview = outputSchedulePreview(node);
  const outputTransitions = Math.max(0, preview.output.length - 1);
  const sourceTransitions = Math.max(0, preview.source.length - 1);
  const activeTransitions = Math.max(0, preview.active.length - 1);
  const activeMax = preview.active[0] ?? 0;
  const outputMax = preview.output[0] ?? 0;
  const outputMin = preview.output[preview.output.length - 1] ?? 0;
  const m = metrics(layout.width);
  const headerTextW = Math.max(120, layout.header.w - m.pad * 2 - m.outputSafeW);
  const primaryStatus = `${getValue(node, "mode", "Auto")} - ${outputTransitions} active steps - sigma ${outputMax.toFixed(4)} -> ${outputMin.toFixed(4)} - ${getValue(node, "interpolation_type", "Smoothstep")}`;
  const secondaryStatus = `Source: ${sourceTransitions} steps - sigma max ${(preview.source[0] ?? 0).toFixed(4)} - Active: ${activeTransitions} steps - sigma max ${activeMax.toFixed(4)}`;
  node._kooSigmaHeaderTooltip = { primary: primaryStatus, secondary: secondaryStatus };
  drawText(ctx, ellipsize(ctx, primaryStatus, headerTextW), layout.header.x + m.pad, layout.header.y + 17, 13, t.text, "850");
  drawText(ctx, ellipsize(ctx, secondaryStatus, headerTextW), layout.header.x + m.pad, layout.header.y + 36, 11, t.textMuted, "600");
  for (const box of layout.hitboxes.filter((item) => item.kind === "mode")) {
    const active = getValue(node, "mode", "Auto") === box.value;
    drawRound(ctx, box, active ? activeFill(p, 0.2) : t.surface, active ? p.accentBorder : t.border, active ? 2 : 1, 6);
    drawText(ctx, box.value, box.x + box.w / 2, box.y + box.h / 2 + 1, 13, active ? activeForeground(p, t.text) : t.textSecondary, active ? "850" : "650", "center");
  }

  drawRound(ctx, layout.profile, t.surface, t.border, 1, 7);
  drawText(ctx, "CONFIGURATION", layout.profile.x + 14, layout.profile.y + 18, 12, t.textMuted, "850");
  const presetName = node.properties.kooSigmaPresetName || getValue(node, "profile", "Balanced TXT2IMG");
  drawText(ctx, modeConfigCaption(node), layout.profile.x + layout.profile.w - 14, layout.profile.y + 18, 11, t.textMuted, "650", "right");
  for (const box of layout.configBuilt) {
    const active = presetName === box.name || getValue(node, "profile", "") === box.name;
    drawConfigButton(ctx, box, active, t, p, node._kooSigmaHoverKind === "config" && node._kooSigmaHoverValue === box.name, node._kooSigmaPressedKind === "config" && node._kooSigmaPressedValue === box.name);
  }
  if (layout.configUsers.length) {
    drawText(ctx, "USER", layout.profile.x + 14, layout.configUsers[0].y - 13, 10, t.textMuted, "850");
    for (const box of layout.configUsers) {
      const active = presetName === box.name;
      drawConfigButton(ctx, box, active, t, p, node._kooSigmaHoverKind === "config" && node._kooSigmaHoverValue === box.name, node._kooSigmaPressedKind === "config" && node._kooSigmaPressedValue === box.name);
    }
    const manage = layout.hitboxes.find((item) => item.kind === "presetsToggle" && item.y >= layout.profile.y && item.y <= layout.profile.y + layout.profile.h);
    if (manage) {
      drawButton(ctx, manage, "Manage", true, t, p, node._kooSigmaHoverKind === "presetsToggle" && manage === node._kooSigmaHoverBox, false);
    }
  }

  drawRound(ctx, layout.graph, t.surface, t.border, 1, 7);
  drawText(ctx, "SIGMA SCHEDULE", layout.graph.x + 14, layout.graph.y + 18, 12, t.textMuted, "850");
  drawText(ctx, getValue(node, "mode", "Auto") === "Manual" ? "manual curve active" : "Reference - Generated - Final", layout.graph.x + layout.graph.w - 14, layout.graph.y + 18, 12, t.textMuted, "550", "right");
  drawGraph(ctx, node, layout.graphPlot, t, p);

  drawRound(ctx, layout.sliders, t.surface, t.border, 1, 7);
  drawText(ctx, "PERCEPTUAL CONTROLS", layout.sliders.x + 14, layout.sliders.y + 18, 12, t.textMuted, "850");
  for (const slider of layout.sliderBoxes) {
    drawSlider(ctx, node, slider, slider.name, slider.label, t, p);
  }
  const sourceConnected = false;
  for (const field of [{ box: layout.stepBox, label: sourceConnected ? "Source Steps" : "Base Steps", name: "steps" }, { box: layout.sigmaBox, label: sourceConnected ? "Source Max Sigma" : "Fallback Max Sigma", name: "max_sigma" }]) {
    drawRound(ctx, field.box, t.background, t.border, 1, 5);
    drawText(ctx, field.label, field.box.x + 10, field.box.y + field.box.h / 2, 12, t.textMuted, "800");
    drawText(ctx, String(getValue(node, field.name, "")), field.box.x + field.box.w - 10, field.box.y + field.box.h / 2 + 1, 14, t.text, "750", "right");
  }

  drawSectionHeader(ctx, layout.manual, "MANUAL CURVE", node.properties.kooSigmaManualOpen === true, t);
  if (node.properties.kooSigmaManualOpen === true) {
    const hasSelection = node._kooSigmaSelectedPoint != null && points(node)[node._kooSigmaSelectedPoint];
    drawText(ctx, hasSelection ? "Selected point" : "Selected point: none", layout.manual.x + 132, layout.manual.y + 18, 11, t.textMuted, "650");
    if (hasSelection) {
      drawText(ctx, `Position ${selectedCoord(node, "x")}`, layout.selectedX.x + 8, layout.selectedX.y + 11, 11, t.textSecondary, "750");
      drawText(ctx, `Sigma ${selectedCoord(node, "y")}`, layout.selectedY.x + 8, layout.selectedY.y + 11, 11, t.textSecondary, "750");
    }
    for (const box of layout.hitboxes.filter((item) => item.kind === "manualAction")) {
      drawButton(ctx, box, box.value, manualActionEnabled(node, box.value), t, p, node._kooSigmaHoverKind === "manualAction" && node._kooSigmaHoverValue === box.value, node._kooSigmaPressedKind === "manualAction" && node._kooSigmaPressedValue === box.value);
    }
  }

  drawSectionHeader(ctx, layout.advanced, "ADVANCED", node.properties.kooSigmaAdvancedOpen === true, t);
  if (node.properties.kooSigmaAdvancedOpen === true) {
    for (const field of layout.advancedFields) {
      drawRound(ctx, field, t.background, t.border, 1, 5);
      drawText(ctx, ellipsize(ctx, field.label, field.w * 0.55), field.x + 8, field.y + field.h / 2, 11, t.textMuted, "800");
      drawText(ctx, ellipsize(ctx, String(getValue(node, field.name, "")), field.w * 0.38), field.x + field.w - 8, field.y + field.h / 2 + 1, 12, t.textSecondary, "750", "right");
    }
    for (const box of layout.hitboxes.filter((item) => item.kind === "safety")) {
      const active = Boolean(getValue(node, box.value, true));
      drawToggle(ctx, box, active, safetyLabel(box.value), t, p);
    }
  }

  drawSectionHeader(ctx, layout.presets, "USER PRESETS", node.properties.kooSigmaPresetsOpen === true, t);
  if (node.properties.kooSigmaPresetsOpen === true) {
  for (const box of layout.hitboxes.filter((item) => item.kind === "presetAction")) {
    drawButton(ctx, box, box.value, true, t, p, node._kooSigmaHoverKind === "presetAction" && node._kooSigmaHoverValue === box.value, node._kooSigmaPressedKind === "presetAction" && node._kooSigmaPressedValue === box.value);
  }
  drawToggle(ctx, layout.includeAppearance, Boolean(getValue(node, "include_appearance_in_preset", false)), "Include Appearance", t, p);
  }

  drawAppearance(ctx, node, layout, t, p);
  const footerStatus = Number(getValue(node, "reference_blend", 100)) <= 0
    ? "Reference Blend 0% - final output is preserving the reference schedule"
    : node.properties.kooSigmaStatus || "Ready";
  drawText(ctx, ellipsize(ctx, footerStatus, layout.footer.w - 4), layout.footer.x + 2, layout.footer.y + 8, 12, t.textMuted, "500");
}

function selectedCoord(node, key) {
  const list = points(node);
  const index = node._kooSigmaSelectedPoint;
  if (index == null || !list[index]) return "-";
  return list[index][key].toFixed(3);
}

function safetyLabel(name) {
  if (name === "output_steps_override_enabled") return "Output Steps Override";
  const found = SAFETY.find(([key]) => key === name);
  return found ? found[1] : name;
}

function presetCategory(name) {
  if (BUILT_INS[name]) return BUILT_INS[name].category;
  return readPresets().presets[name] ? "User Presets" : "User Presets";
}

function modeConfigCaption(node) {
  const mode = displayMode(node);
  if (mode === "TXT2IMG") return "Built-in TXT2IMG";
  if (mode === "IMG2IMG") return "Built-in IMG2IMG";
  return "Built-in + Universal";
}

function drawToggle(ctx, box, active, label, t, p) {
  drawRound(ctx, box, active ? activeFill(p, 0.16) : t.surfaceRaised, active ? p.accentBorder : t.border, active ? 2 : 1, 5);
  ctx.beginPath();
  ctx.arc(box.x + 11, box.y + box.h / 2, 4, 0, Math.PI * 2);
  ctx.fillStyle = active ? activeForeground(p, t.text) : t.textMuted;
  ctx.fill();
  drawText(ctx, ellipsize(ctx, label, box.w - 52), box.x + 22, box.y + box.h / 2 + 1, 10.5, active ? activeForeground(p, t.text) : t.textSecondary, active ? "800" : "650");
  drawText(ctx, active ? "ON" : "OFF", box.x + box.w - 8, box.y + box.h / 2 + 1, 10, active ? activeForeground(p, t.text) : t.textMuted, "850", "right");
}

function drawButton(ctx, box, label, enabled, t, p, hovered = false, pressed = false) {
  const fill = !enabled ? t.background : pressed ? activeFill(p, 0.26) : hovered ? t.surfaceHover : t.surfaceRaised;
  const stroke = !enabled ? t.border : pressed || hovered ? p.accentBorder : t.border;
  drawRound(ctx, box, fill, stroke, pressed || hovered ? 1.5 : 1, 5);
  drawText(ctx, ellipsize(ctx, label, box.w - 10), box.x + box.w / 2, box.y + box.h / 2 + 1, 11, enabled ? t.textSecondary : t.textMuted, enabled ? "750" : "550", "center");
}

function drawConfigButton(ctx, box, active, t, p, hovered = false, pressed = false) {
  const fill = active ? activeFill(p, pressed ? 0.3 : 0.2) : pressed ? activeFill(p, 0.16) : hovered ? t.surfaceHover : t.surfaceRaised;
  const stroke = active || hovered || pressed ? p.accentBorder : t.border;
  drawRound(ctx, box, fill, stroke, active || hovered || pressed ? 1.5 : 1, 5);
  drawText(ctx, ellipsize(ctx, box.label, box.w - 14), box.x + box.w / 2, box.y + box.h / 2 + 1, 11.5, active ? activeForeground(p, t.text) : t.textSecondary, active ? "850" : "700", "center");
}

function manualActionEnabled(node, action) {
  const list = points(node);
  if (action === "Undo") return Boolean(node._kooSigmaUndo?.length);
  if (action === "Redo") return Boolean(node._kooSigmaRedo?.length);
  if (action === "Smooth Curve") return list.length > 2;
  if (action === "Simplify Points") return list.length > 3;
  if (action === "Convert to Manual") return outputSchedulePreview(node).output.length > 1;
  if (action === "Restore Reference") return activeSchedulePreview(node).active.length > 1;
  if (action === "Reset") return list.length > 2 || (list[0]?.y !== 1 || list[list.length - 1]?.y !== 0);
  return true;
}

function drawSectionHeader(ctx, box, title, open, t) {
  drawRound(ctx, box, t.surface, t.border, 1, 7);
  drawText(ctx, title, box.x + 14, box.y + 22, 12, t.textMuted, "850");
  drawText(ctx, open ? "^" : "v", box.x + box.w - 24, box.y + 22, 15, t.textSecondary, "900", "center");
}

function drawAppearance(ctx, node, layout, t, p) {
  const appearance = node.properties.kooSigmaAppearance;
  drawRound(ctx, layout.appearance, t.surface, t.border, 1, 7);
  drawPaletteIcon(ctx, layout.appearance.x + 14, layout.appearance.y + 13, appearance.accent, t);
  drawText(ctx, "APPEARANCE", layout.appearance.x + 42, layout.appearance.y + 22, 13, t.textMuted, "850");
  drawText(ctx, node.properties.kooSigmaAppearanceOpen !== false ? "^" : "v", layout.appearance.x + layout.appearance.w - 24, layout.appearance.y + 22, 15, t.textSecondary, "900", "center");
  if (node.properties.kooSigmaAppearanceOpen === false) {
    return;
  }
  drawText(ctx, "THEME", layout.appearance.x + 14, layout.appearance.y + 56, 12, t.textMuted, "850");
  for (const button of layout.themeButtons) {
    const active = appearance.theme === button.name;
    drawRound(ctx, button, active ? activeFill(p, 0.16) : t.surfaceRaised, active ? p.accentBorder : t.border, active ? 2 : 1, 5);
    drawText(ctx, button.name, button.x + button.w / 2, button.y + button.h / 2 + 1, 12, active ? activeForeground(p, t.text) : t.textSecondary, active ? "850" : "650", "center");
  }
  const contrastBox = layout.hitboxes.find((item) => item.kind === "contrast");
  drawToggle(ctx, contrastBox, appearance.contrast, "Contrast", t, p);
  drawText(ctx, "ACCENT", layout.appearance.x + 14, layout.appearance.y + 97, 12, t.textMuted, "850");
  for (const swatch of layout.swatches) {
    ctx.beginPath();
    ctx.arc(swatch.x + swatch.w / 2, swatch.y + swatch.h / 2, swatch.w / 2, 0, Math.PI * 2);
    ctx.fillStyle = swatch.color;
    ctx.fill();
    if (normalizeHex(swatch.color) === normalizeHex(appearance.accent)) {
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = appearance.contrast ? p.accentForeground : t.text;
      ctx.stroke();
    }
  }
  const custom = layout.hitboxes.find((item) => item.kind === "customAccent");
  const reset = layout.hitboxes.find((item) => item.kind === "resetAccent");
  drawText(ctx, "Hex", custom.x, custom.y + 9, 11, t.textMuted, "750");
  drawText(ctx, "Reset Accent", reset.x, reset.y + 9, 11, t.textMuted, "750");
}

function hit(node, pos) {
  const hitboxes = node._kooSigmaHitboxes || makeLayout(node).hitboxes;
  return hitboxes.find((box) => pos[0] >= box.x && pos[0] <= box.x + box.w && pos[1] >= box.y && pos[1] <= box.y + box.h);
}

function updateHover(node, pos) {
  const target = hit(node, pos);
  node._kooSigmaHoverKind = target?.kind || null;
  node._kooSigmaHoverValue = target?.value ?? null;
  node._kooSigmaHoverBox = target || null;
  node._kooSigmaHoverPoint = null;
  const graphBox = node._kooSigmaGraphBox;
  if (graphBox && pos[0] >= graphBox.x && pos[0] <= graphBox.x + graphBox.w && pos[1] >= graphBox.y && pos[1] <= graphBox.y + graphBox.h) {
    let best = null;
    for (const point of node._kooSigmaGraphPoints || []) {
      const dx = point.x - pos[0];
      const dy = point.y - pos[1];
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 10 && (!best || distance < best.distance)) best = { ...point, distance };
    }
    node._kooSigmaHoverPoint = best;
  }
  node.setDirtyCanvas(true, true);
}

function handleClick(node, event, pos) {
  const target = hit(node, pos);
  if (!target) return false;
  switch (target.kind) {
    case "mode":
      switchMode(node, target.value);
      return true;
    case "config":
      node._kooSigmaPressedKind = "config";
      node._kooSigmaPressedValue = target.value;
      applyConfiguration(node, target.value);
      node.setDirtyCanvas(true, true);
      return true;
    case "slider":
      setSliderFromPos(node, target, pos[0]);
      node._kooSigmaDragSlider = target;
      return true;
    case "number":
      promptNumber(node, target.value);
      return true;
    case "interpolation": {
      const index = INTERPOLATIONS.indexOf(getValue(node, "interpolation_type", "Smoothstep"));
      setValue(node, "interpolation_type", INTERPOLATIONS[(index + 1) % INTERPOLATIONS.length]);
      return true;
    }
    case "croppedState": {
      const states = ["Auto", "Yes", "No"];
      const index = states.indexOf(getValue(node, "input_already_cropped", "Auto"));
      setValue(node, "input_already_cropped", states[(index + 1) % states.length]);
      return true;
    }
    case "safety":
      if (target.value === "output_steps_override_enabled") {
        const next = !Boolean(getValue(node, target.value, false));
        if (next && Number(getValue(node, "output_steps_override", 0)) < 1) {
          setValue(node, "output_steps_override", Math.max(1, Math.round(Number(getValue(node, "steps", 30)) || 30)), false);
        }
        setValue(node, target.value, next);
      } else {
        setValue(node, target.value, !Boolean(getValue(node, target.value, true)));
      }
      return true;
    case "manualToggle":
      node.properties.kooSigmaManualOpen = node.properties.kooSigmaManualOpen !== true;
      node.setDirtyCanvas(true, true);
      return true;
    case "advancedToggle":
      node.properties.kooSigmaAdvancedOpen = node.properties.kooSigmaAdvancedOpen !== true;
      node.setDirtyCanvas(true, true);
      return true;
    case "manualAction":
      if (!manualActionEnabled(node, target.value)) {
        node.properties.kooSigmaStatus = `${target.value} is unavailable`;
        node.setDirtyCanvas(true, true);
        return true;
      }
      node._kooSigmaPressedKind = "manualAction";
      node._kooSigmaPressedValue = target.value;
      return true;
    case "selectedNumeric":
      editSelected(node, target.value);
      return true;
    case "graph":
      graphPointerDown(node, event, target, pos);
      return true;
    case "presetAction":
      node._kooSigmaPressedKind = "presetAction";
      node._kooSigmaPressedValue = target.value;
      return true;
    case "presetsToggle":
      node.properties.kooSigmaPresetsOpen = node.properties.kooSigmaPresetsOpen !== true;
      node.setDirtyCanvas(true, true);
      return true;
    case "includeAppearance":
      setValue(node, "include_appearance_in_preset", !Boolean(getValue(node, "include_appearance_in_preset", false)));
      return true;
    case "appearanceToggle":
      node.properties.kooSigmaAppearanceOpen = node.properties.kooSigmaAppearanceOpen === false;
      node.properties.kooSigmaAppearance.open = node.properties.kooSigmaAppearanceOpen;
      node.setDirtyCanvas(true, true);
      return true;
    case "theme":
      node.properties.kooSigmaAppearance.theme = target.value;
      node.setDirtyCanvas(true, true);
      return true;
    case "contrast":
      node.properties.kooSigmaAppearance.contrast = !node.properties.kooSigmaAppearance.contrast;
      node._kooSigmaPalette = null;
      node.setDirtyCanvas(true, true);
      return true;
    case "accent":
      node.properties.kooSigmaAppearance.accent = target.value;
      node._kooSigmaPalette = null;
      node.setDirtyCanvas(true, true);
      return true;
    case "customAccent": {
      const color = normalizeHex(prompt("Accent hex color", node.properties.kooSigmaAppearance.accent || DEFAULT_ACCENT));
      if (color) {
        node.properties.kooSigmaAppearance.accent = color;
        node._kooSigmaPalette = null;
        node.setDirtyCanvas(true, true);
      }
      return true;
    }
    case "resetAccent":
      node.properties.kooSigmaAppearance.accent = DEFAULT_ACCENT;
      node._kooSigmaPalette = null;
      node.setDirtyCanvas(true, true);
      return true;
    default:
      return false;
  }
}

function setSliderFromPos(node, box, x) {
  const value = clamp(((x - box.x) / box.w) * 100, 0, 100);
  setValue(node, box.value, box.value === "denoise_active_range" ? Number((value / 100).toFixed(3)) : Math.round(value));
}

function promptNumber(node, name) {
  const current = getValue(node, name, 0);
  const answer = prompt(name.replaceAll("_", " "), String(current));
  if (answer === null) return;
  const number = Number(answer);
  if (!Number.isFinite(number)) {
    node.properties.kooSigmaStatus = `Invalid value for ${name}`;
    return;
  }
  if (name === "output_steps_override") {
    setValue(node, name, Math.max(1, Math.round(number)));
    return;
  }
  if (name === "steps") setValue(node, name, Math.max(1, Math.round(number)));
  else setValue(node, name, number);
}

function graphPointerDown(node, event, box, pos) {
  if (getValue(node, "mode", "Auto") !== "Manual") {
    switchMode(node, "Manual");
  }
  box = node._kooSigmaGraphBox || graphPlotBox(box);
  if (pos[0] < box.x || pos[0] > box.x + box.w || pos[1] < box.y || pos[1] > box.y + box.h) {
    return;
  }
  const list = points(node);
  const normalized = { x: clamp((pos[0] - box.x) / box.w, 0, 1), y: clamp(1 - (pos[1] - box.y) / box.h, 0, 1) };
  const nearest = nearestPoint(list, normalized, box);
  if (event?.shiftKey && nearest.index > 0 && nearest.index < list.length - 1 && nearest.distance < 14) {
    list.splice(nearest.index, 1);
    node._kooSigmaSelectedPoint = Math.min(nearest.index, list.length - 2);
    writePoints(node, list);
    return;
  }
  if (nearest.distance < 14) {
    node._kooSigmaSelectedPoint = nearest.index;
    if (nearest.index > 0 && nearest.index < list.length - 1) {
      pushUndo(node);
    }
    node._kooSigmaDraggingPoint = nearest.index;
    return;
  }
  list.push(normalized);
  list.sort((a, b) => a.x - b.x);
  node._kooSigmaSelectedPoint = list.findIndex((point) => point === normalized);
  node._kooSigmaDraggingPoint = node._kooSigmaSelectedPoint;
  writePoints(node, list);
}

function nearestPoint(list, point, box) {
  let best = { index: 0, distance: Infinity };
  list.forEach((candidate, index) => {
    const dx = (candidate.x - point.x) * box.w;
    const dy = (candidate.y - point.y) * box.h;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < best.distance) best = { index, distance };
  });
  return best;
}

function dragPoint(node, pos) {
  const index = node._kooSigmaDraggingPoint;
  const box = node._kooSigmaGraphBox;
  if (index == null || !box) return false;
  const list = points(node);
  if (!list[index]) return false;
  if (index === 0 || index === list.length - 1) {
    node.properties.kooSigmaStatus = "Endpoints are protected";
    return true;
  }
  list[index].x = clamp((pos[0] - box.x) / box.w, list[index - 1].x + 0.001, list[index + 1].x - 0.001);
  list[index].y = clamp(1 - (pos[1] - box.y) / box.h, 0, 1);
  if (Boolean(getValue(node, "lock_monotonic_curve", true))) {
    list[index].y = clamp(list[index].y, list[index + 1].y, list[index - 1].y);
  }
  const text = JSON.stringify(list.map((point) => ({ x: Number(point.x.toFixed(4)), y: Number(point.y.toFixed(4)) })));
  setValue(node, "manual_curve_points", text);
  setValue(node, "normalized_manual_points", text);
  return true;
}

function editSelected(node, key) {
  const list = points(node);
  const index = node._kooSigmaSelectedPoint;
  if (index == null || !list[index]) return;
  if (index === 0 || index === list.length - 1) {
    node.properties.kooSigmaStatus = "Endpoints are protected";
    return;
  }
  const answer = prompt(`Selected point ${key.toUpperCase()}`, String(list[index][key].toFixed(4)));
  if (answer === null) return;
  const number = Number(answer);
  if (!Number.isFinite(number)) return;
  list[index][key] = clamp(number, 0, 1);
  if (key === "x") list[index].x = clamp(list[index].x, list[index - 1].x + 0.001, list[index + 1].x - 0.001);
  if (key === "y" && Boolean(getValue(node, "lock_monotonic_curve", true))) list[index].y = clamp(list[index].y, list[index + 1].y, list[index - 1].y);
  writePoints(node, list);
}

function manualAction(node, action) {
  if (action === "Undo") {
    const previous = node._kooSigmaUndo?.pop();
    if (previous) {
      node._kooSigmaRedo = node._kooSigmaRedo || [];
      node._kooSigmaRedo.push(getValue(node, "manual_curve_points", "[]"));
      setValue(node, "manual_curve_points", previous);
      setValue(node, "normalized_manual_points", previous);
    }
    return;
  }
  if (action === "Redo") {
    const next = node._kooSigmaRedo?.pop();
    if (next) {
      pushUndo(node);
      setValue(node, "manual_curve_points", next);
      setValue(node, "normalized_manual_points", next);
    }
    return;
  }
  if (action === "Reset") {
    switchMode(node, "Manual");
    writePoints(node, [{ x: 0, y: 1 }, { x: 1, y: 0 }]);
    node.properties.kooSigmaStatus = "Manual curve reset";
    return;
  }
  if (action === "Smooth Curve") {
    const list = points(node);
    for (let i = 1; i < list.length - 1; i++) {
      list[i].y = list[i].y * 0.5 + (list[i - 1].y + list[i + 1].y) * 0.25;
    }
    writePoints(node, list);
    return;
  }
  if (action === "Simplify Points") {
    const list = points(node);
    const simplified = list.filter((point, index) => index === 0 || index === list.length - 1 || index % 2 === 1);
    writePoints(node, simplified);
    return;
  }
  if (action === "Convert to Manual") {
    const preview = outputSchedulePreview(node);
    const maxValue = Math.max(preview.output[0] || 1, 1e-8);
    const values = preview.output.map((value) => clamp(value / maxValue, 0, 1));
    const list = values.map((value, index) => ({ x: index / Math.max(1, values.length - 1), y: value }));
    switchMode(node, "Manual");
    writePoints(node, list);
    node.properties.kooSigmaStatus = "Converted active output curve to Manual";
    return;
  }
  if (action === "Restore Reference") {
    const active = activeSchedulePreview(node).active;
    const maxValue = Math.max(active[0] || 1, 1e-8);
    const list = active.map((value, index) => ({ x: index / Math.max(1, active.length - 1), y: clamp(value / maxValue, 0, 1) }));
    switchMode(node, "Manual");
    writePoints(node, list);
    node.properties.kooSigmaStatus = "Restored current active reference curve";
  }
}

function presetAction(node, action) {
  const current = node.properties.kooSigmaPresetName || "User Preset";
  if (action === "Save") {
    savePreset(node, BUILT_INS[current] ? prompt("Save preset as", `${current} Copy`) : current);
  } else if (action === "Save As") {
    savePreset(node, prompt("Save preset as", current));
  } else if (action === "Rename") {
    if (BUILT_INS[current]) {
      node.properties.kooSigmaStatus = "Built-in presets are read-only";
      return;
    }
    const next = prompt("Rename preset", current);
    if (!next) return;
    const data = readPresets();
    if (!data.presets[current]) return;
    data.presets[next] = { ...data.presets[current], preset_name: next };
    delete data.presets[current];
    writePresets(data);
    node.properties.kooSigmaPresetName = next;
  } else if (action === "Duplicate") {
    savePreset(node, prompt("Duplicate preset as", `${current} Copy`));
  } else if (action === "Delete") {
    if (BUILT_INS[current]) {
      node.properties.kooSigmaStatus = "Built-in presets are read-only";
      return;
    }
    if (confirm(`Delete preset "${current}"?`)) {
      const data = readPresets();
      delete data.presets[current];
      writePresets(data);
      node.properties.kooSigmaPresetName = "Balanced TXT2IMG";
      node.properties.kooSigmaStatus = `Deleted preset: ${current}`;
    }
  } else if (action === "Import JSON") {
    const text = prompt("Paste sigma preset JSON");
    if (!text) return;
    const payload = safeJson(text, null);
    if (applyPresetPayload(node, payload) && !BUILT_INS[payload.preset_name]) {
      savePreset(node, payload.preset_name || "Imported Preset");
    }
  } else if (action === "Export JSON") {
    const json = JSON.stringify(currentPresetPayload(node, current), null, 2);
    prompt("Sigma preset JSON", json);
  }
}

app.registerExtension({
  name: "KoO.SigmaEqualizer",
  beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name !== NODE_NAME) {
      return;
    }

    const onNodeCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function () {
      const result = onNodeCreated?.apply(this, arguments);
      ensureProperties(this);
      detachNativeWidgets(this);
      this.size = this.size || [680, 560];
      this.resizable = true;
      this.serialize_widgets = true;
      storeActiveMode(this);
      return result;
    };

    const onConfigure = nodeType.prototype.onConfigure;
    nodeType.prototype.onConfigure = function (info) {
      const result = onConfigure?.apply(this, arguments);
      ensureProperties(this);
      detachNativeWidgets(this, info?.widgets_values);
      return result;
    };

    const serialize = nodeType.prototype.serialize;
    nodeType.prototype.serialize = function () {
      storeActiveMode(this);
      const data = serialize?.apply(this, arguments) || {};
      data.widgets_values = BACKEND_WIDGET_NAMES.map((name) => widget(this, name)?.value);
      data.properties = { ...(data.properties || {}), ...(this.properties || {}) };
      return data;
    };

    nodeType.prototype.onDrawForeground = function (ctx) {
      drawUI(this, ctx);
    };

    const onMouseDown = nodeType.prototype.onMouseDown;
    nodeType.prototype.onMouseDown = function (event, pos, canvas) {
      if (handleClick(this, event, pos)) {
        return true;
      }
      return onMouseDown?.apply(this, arguments);
    };

    const onMouseMove = nodeType.prototype.onMouseMove;
    nodeType.prototype.onMouseMove = function (event, pos, canvas) {
      if (this._kooSigmaDragSlider) {
        setSliderFromPos(this, this._kooSigmaDragSlider, pos[0]);
        return true;
      }
      if (this._kooSigmaDraggingPoint != null && dragPoint(this, pos)) {
        return true;
      }
      updateHover(this, pos);
      return onMouseMove?.apply(this, arguments);
    };

    const onMouseUp = nodeType.prototype.onMouseUp;
    nodeType.prototype.onMouseUp = function (event, pos, canvas) {
      const target = pos ? hit(this, pos) : null;
      if (this._kooSigmaPressedKind && target?.kind === this._kooSigmaPressedKind && target?.value === this._kooSigmaPressedValue) {
        if (target.kind === "manualAction" && manualActionEnabled(this, target.value)) {
          manualAction(this, target.value);
        } else if (target.kind === "presetAction") {
          presetAction(this, target.value);
        }
      }
      this._kooSigmaDragSlider = null;
      this._kooSigmaDraggingPoint = null;
      this._kooSigmaPressedKind = null;
      this._kooSigmaPressedValue = null;
      return onMouseUp?.apply(this, arguments);
    };

    const onRemoved = nodeType.prototype.onRemoved;
    nodeType.prototype.onRemoved = function () {
      this._kooSigmaDragSlider = null;
      this._kooSigmaDraggingPoint = null;
      this._kooSigmaHitboxes = null;
      this._kooSigmaGraphPoints = null;
      this._kooSigmaHoverPoint = null;
      return onRemoved?.apply(this, arguments);
    };

    const onResize = nodeType.prototype.onResize;
    nodeType.prototype.onResize = function () {
      const result = onResize?.apply(this, arguments);
      this.setDirtyCanvas(true, true);
      return result;
    };
  },
});
