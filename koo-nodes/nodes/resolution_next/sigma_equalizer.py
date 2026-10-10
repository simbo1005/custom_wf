import json
import math

import torch


MODES = ("Auto", "TXT2IMG", "IMG2IMG", "Manual")
PROFILES = (
    "Balanced TXT2IMG",
    "Photoreal TXT2IMG",
    "Creative TXT2IMG",
    "Balanced IMG2IMG",
    "Conservative Enhance",
    "Skin Detail Enhance",
    "Architectural Materials",
    "Identity Preservation",
    "Reference / Bypass",
    "Custom",
)
INTERPOLATION_TYPES = ("Smoothstep", "Linear", "Cosine", "Exponential", "Sigmoid")
INPUT_CROPPED_STATES = ("Auto", "Yes", "No")


PROFILE_DEFAULTS = {
    "Balanced TXT2IMG": {
        "mode": "TXT2IMG",
        "structure": 55,
        "materials": 52,
        "microdetail": 50,
        "cleanup": 48,
        "curve_strength": 70,
        "reference_blend": 70,
        "smoothness": 35,
    },
    "Photoreal TXT2IMG": {
        "mode": "TXT2IMG",
        "structure": 48,
        "materials": 62,
        "microdetail": 66,
        "cleanup": 56,
        "curve_strength": 74,
        "reference_blend": 84,
        "smoothness": 45,
    },
    "Creative TXT2IMG": {
        "mode": "TXT2IMG",
        "structure": 72,
        "materials": 46,
        "microdetail": 44,
        "cleanup": 40,
        "curve_strength": 82,
        "reference_blend": 100,
        "smoothness": 28,
    },
    "Balanced IMG2IMG": {
        "mode": "IMG2IMG",
        "denoise_active_range": 0.55,
        "structure": 30,
        "materials": 56,
        "microdetail": 62,
        "cleanup": 58,
        "curve_strength": 58,
        "reference_blend": 75,
        "smoothness": 45,
    },
    "Conservative Enhance": {
        "mode": "IMG2IMG",
        "denoise_active_range": 0.20,
        "structure": 18,
        "materials": 50,
        "microdetail": 58,
        "cleanup": 68,
        "curve_strength": 42,
        "reference_blend": 55,
        "smoothness": 55,
    },
    "Skin Detail Enhance": {
        "mode": "IMG2IMG",
        "denoise_active_range": 0.28,
        "structure": 20,
        "materials": 45,
        "microdetail": 72,
        "cleanup": 62,
        "curve_strength": 55,
        "reference_blend": 65,
        "smoothness": 60,
    },
    "Architectural Materials": {
        "mode": "Universal",
        "denoise_active_range": 0.35,
        "structure": 42,
        "materials": 76,
        "microdetail": 62,
        "cleanup": 52,
        "curve_strength": 68,
        "reference_blend": 82,
        "smoothness": 38,
    },
    "Identity Preservation": {
        "mode": "IMG2IMG",
        "denoise_active_range": 0.18,
        "structure": 12,
        "materials": 42,
        "microdetail": 52,
        "cleanup": 68,
        "curve_strength": 38,
        "reference_blend": 45,
        "smoothness": 58,
    },
    "Reference / Bypass": {
        "mode": "Universal",
        "structure": 50,
        "materials": 50,
        "microdetail": 50,
        "cleanup": 50,
        "curve_strength": 50,
        "reference_blend": 0,
        "smoothness": 35,
    },
}


def _safe_float(value, default=0.0):
    try:
        result = float(value)
    except Exception:
        return default
    return result if math.isfinite(result) else default


def _safe_int(value, default=1):
    try:
        return int(round(float(value)))
    except Exception:
        return default


def _clamp(value, low, high):
    return max(low, min(high, _safe_float(value, low)))


def _load_json_object(text, fallback=None):
    if fallback is None:
        fallback = {}
    if not text:
        return dict(fallback)
    try:
        data = json.loads(text)
    except Exception:
        return dict(fallback)
    return data if isinstance(data, dict) else dict(fallback)


def _sanitize_sigmas(sigmas):
    if sigmas is None:
        return None, "missing reference"

    try:
        values = sigmas.detach().flatten().to(dtype=torch.float64, device="cpu").tolist()
    except Exception:
        try:
            values = torch.as_tensor(sigmas, dtype=torch.float64).flatten().cpu().tolist()
        except Exception:
            return None, "invalid reference"

    clean = []
    dropped = 0
    for value in values:
        value = _safe_float(value, float("nan"))
        if not math.isfinite(value):
            dropped += 1
            continue
        clean.append(max(0.0, value))

    if not clean:
        return None, "empty reference"

    repaired = False
    for index in range(1, len(clean)):
        if clean[index] > clean[index - 1]:
            repaired = True
            break
    if repaired:
        clean = sorted(clean, reverse=True)

    if len(clean) == 1:
        clean.append(0.0)
        repaired = True

    note = []
    if dropped:
        note.append(f"dropped {dropped} invalid")
    if repaired:
        note.append("sorted/repaired")
    return clean, ", ".join(note) if note else "ok"


def _generated_reference(steps, max_sigma):
    count = max(2, _safe_int(steps, 30) + 1)
    max_sigma = _clamp(max_sigma, 0.01, 500.0)
    values = []
    for index in range(count):
        progress = index / (count - 1)
        if index == count - 1:
            values.append(0.0)
        else:
            values.append(max_sigma * ((1.0 - progress) ** 2.35))
    return values


def _terminal_zero(values):
    return bool(values) and abs(float(values[-1])) <= 1e-8


def _resolve_already_cropped(values, source_type, mode, denoise_active_range, input_already_cropped):
    state = input_already_cropped if input_already_cropped in INPUT_CROPPED_STATES else "Auto"
    if mode != "IMG2IMG" or source_type != "reference":
        return False, "not applicable"
    if state == "Yes":
        return True, "forced yes"
    if state == "No":
        return False, "forced no"

    denoise = _clamp(denoise_active_range, 0.0, 1.0)
    if denoise >= 0.995:
        return False, "auto unchanged at denoise 1"
    if len(values) <= 2:
        return True, "auto short active schedule"
    if denoise <= 0.35 and max(0, len(values) - 1) <= 12:
        return True, "auto short low-denoise active schedule"

    positive = [value for value in values if value > 1e-8]
    if len(positive) <= 2:
        return True, "auto tiny active schedule"

    ratios = []
    for left, right in zip(positive[:-1], positive[1:]):
        if left > 0 and right > 0:
            ratios.append(right / left)
    if ratios:
        average_ratio = sum(ratios) / len(ratios)
        if values[0] < 2.0 and denoise <= 0.5 and average_ratio > 0.62:
            return True, "auto likely already cropped"

    return False, "auto treated as full source"


def _active_schedule(source_values, source_type, mode, denoise_active_range, input_already_cropped):
    values = list(source_values)
    transitions = max(len(values) - 1, 0)
    if not values:
        return [0.0], {
            "denoise": 0.0,
            "crop_index": 0,
            "cropped_internally": False,
            "treated_already_cropped": False,
            "already_cropped_resolution": "empty",
        }

    denoise = 1.0 if mode == "TXT2IMG" else _clamp(denoise_active_range, 0.0, 1.0)
    treated_already_cropped, resolution = _resolve_already_cropped(values, source_type, mode, denoise, input_already_cropped)
    if mode != "IMG2IMG" or treated_already_cropped:
        return values, {
            "denoise": denoise,
            "crop_index": 0,
            "cropped_internally": False,
            "treated_already_cropped": treated_already_cropped,
            "already_cropped_resolution": resolution,
        }

    active_transitions = max(1, int(math.ceil(transitions * denoise))) if transitions else 0
    crop_index = max(0, transitions - active_transitions)
    cropped = values[crop_index:]
    if len(cropped) == 1:
        cropped.append(0.0)
    return cropped, {
        "denoise": denoise,
        "crop_index": crop_index,
        "cropped_internally": crop_index > 0,
        "treated_already_cropped": False,
        "already_cropped_resolution": resolution,
    }


def _resample_descending(values, count):
    if count <= 1:
        return [float(values[0])] if values else [0.0]
    if not values:
        return [0.0] * count
    if len(values) == count:
        return [float(v) for v in values]
    if len(values) == 1:
        return [float(values[0])] * count

    out = []
    source_last = len(values) - 1
    target_last = count - 1
    for index in range(count):
        pos = (index / target_last) * source_last
        left = int(math.floor(pos))
        right = min(source_last, left + 1)
        amount = pos - left
        out.append(float(values[left]) * (1.0 - amount) + float(values[right]) * amount)
    return out


def _ease(value, interpolation):
    t = _clamp(value, 0.0, 1.0)
    if interpolation == "Linear":
        return t
    if interpolation == "Cosine":
        return 0.5 - 0.5 * math.cos(math.pi * t)
    if interpolation == "Exponential":
        return t**1.65
    if interpolation == "Sigmoid":
        return 1.0 / (1.0 + math.exp(-10.0 * (t - 0.5)))
    return t * t * (3.0 - 2.0 * t)


def _control_weight(value, curve_strength):
    centered = (_clamp(value, 0.0, 100.0) - 50.0) / 50.0
    strength = _clamp(curve_strength, 0.0, 100.0) / 100.0
    return max(0.12, 1.0 + centered * 1.35 * strength)


def _generated_curve(
    count,
    structure,
    materials,
    microdetail,
    cleanup,
    curve_strength,
    interpolation,
    high_mid_boundary,
    mid_low_boundary,
    tail_length,
):
    count = max(2, _safe_int(count, 2))
    high_mid = _clamp(high_mid_boundary, 0.2, 0.92)
    mid_low = _clamp(mid_low_boundary, 0.04, high_mid - 0.02)
    tail = _clamp(tail_length, 0.01, mid_low - 0.005)

    bands = [
        (1.0, high_mid, _control_weight(structure, curve_strength)),
        (high_mid, mid_low, _control_weight(materials, curve_strength)),
        (mid_low, tail, _control_weight(microdetail, curve_strength)),
        (tail, 0.0, _control_weight(cleanup, curve_strength)),
    ]
    weighted = [abs(start - end) * weight for start, end, weight in bands]
    total = sum(weighted) or 1.0
    cumulative = []
    cursor = 0.0
    for amount in weighted:
        cursor += amount / total
        cumulative.append(cursor)

    values = []
    for index in range(count):
        progress = index / (count - 1)
        lower = 0.0
        chosen = len(bands) - 1
        for band_index, upper in enumerate(cumulative):
            if progress <= upper or band_index == len(bands) - 1:
                chosen = band_index
                break
            lower = upper
        upper = cumulative[chosen]
        local = 0.0 if upper <= lower else (progress - lower) / (upper - lower)
        local = _ease(local, interpolation)
        start, end, _weight = bands[chosen]
        values.append(start + (end - start) * local)
    values[0] = 1.0
    values[-1] = 0.0
    return values


def _normalize_manual_points(text):
    fallback = [{"x": 0.0, "y": 1.0}, {"x": 1.0, "y": 0.0}]
    try:
        data = json.loads(text or "[]")
    except Exception:
        data = fallback
    if not isinstance(data, list):
        data = fallback

    points = []
    for item in data:
        if isinstance(item, dict):
            x = item.get("x")
            y = item.get("y")
        elif isinstance(item, (list, tuple)) and len(item) >= 2:
            x, y = item[0], item[1]
        else:
            continue
        x = _clamp(x, 0.0, 1.0)
        y = _clamp(y, 0.0, 1.0)
        points.append({"x": x, "y": y})

    points.append({"x": 0.0, "y": 1.0})
    points.append({"x": 1.0, "y": 0.0})
    points.sort(key=lambda point: point["x"])

    merged = []
    for point in points:
        if merged and abs(point["x"] - merged[-1]["x"]) < 1e-5:
            if point["x"] < 1e-5:
                merged[-1]["y"] = 1.0
            elif point["x"] > 1.0 - 1e-5:
                merged[-1]["y"] = 0.0
            else:
                merged[-1]["y"] = point["y"]
        else:
            merged.append(point)

    merged[0] = {"x": 0.0, "y": 1.0}
    merged[-1] = {"x": 1.0, "y": 0.0}

    previous = 1.0
    for point in merged:
        point["y"] = min(previous, point["y"])
        previous = point["y"]
    for index in range(len(merged) - 2, -1, -1):
        merged[index]["y"] = max(merged[index]["y"], merged[index + 1]["y"])

    return merged


def _manual_curve(points, count, interpolation):
    values = []
    point_index = 0
    for index in range(count):
        x = index / (count - 1)
        while point_index < len(points) - 2 and x > points[point_index + 1]["x"]:
            point_index += 1
        left = points[point_index]
        right = points[min(point_index + 1, len(points) - 1)]
        width = right["x"] - left["x"]
        local = 0.0 if width <= 1e-8 else (x - left["x"]) / width
        local = _ease(local, interpolation)
        values.append(left["y"] + (right["y"] - left["y"]) * local)
    values[0] = 1.0
    values[-1] = 0.0
    return values


def _smooth(values, amount):
    passes = int(round(_clamp(amount, 0.0, 100.0) / 22.0))
    out = list(values)
    for _ in range(passes):
        next_values = [out[0]]
        for index in range(1, len(out) - 1):
            next_values.append(out[index] * 0.5 + (out[index - 1] + out[index + 1]) * 0.25)
        next_values.append(out[-1])
        out = next_values
    return out


def _apply_safety(values, reference, safety):
    out = [max(0.0, _safe_float(value, 0.0)) for value in values]
    if not out:
        return [0.0], {"clamped": False, "deduped": False, "monotonic": True}

    clamped = False
    if safety.get("clamp_to_input_range", True) and reference:
        allow_expansion = safety.get("allow_sigma_expansion", False)
        maximum = max(reference) if allow_expansion else reference[0]
        minimum = min(reference)
        next_out = []
        for value in out:
            clamped_value = _clamp(value, minimum, maximum)
            clamped = clamped or abs(clamped_value - value) > 1e-9
            next_out.append(clamped_value)
        out = next_out

    if safety.get("normalize_endpoints", True):
        if reference:
            out[0] = reference[0] if not safety.get("allow_sigma_expansion", False) else min(max(reference), out[0])
        out[-1] = 0.0 if safety.get("preserve_final_zero", True) else out[-1]

    monotonic = True
    if safety.get("lock_monotonic", True):
        for index in range(1, len(out)):
            if out[index] > out[index - 1]:
                out[index] = out[index - 1]
                clamped = True
            if out[index] > out[index - 1] + 1e-9:
                monotonic = False

    deduped = False
    if safety.get("prevent_duplicate_sigmas", True):
        epsilon = 1e-7
        for index in range(1, len(out) - 1):
            if out[index] >= out[index - 1]:
                out[index] = max(0.0, out[index - 1] - epsilon)
                deduped = True
            if out[index] <= out[index + 1]:
                high = out[index - 1] if index > 0 else out[index]
                low = out[index + 1]
                out[index] = max(low + epsilon, min(high - epsilon, out[index]))
                deduped = True
        if safety.get("preserve_final_zero", True):
            out[-1] = 0.0

    return out, {"clamped": clamped, "deduped": deduped, "monotonic": monotonic}


def _blend_log(reference, generated, amount, preserve_final_zero=True):
    blend = _clamp(amount, 0.0, 100.0) / 100.0
    if blend <= 0.0:
        return list(reference)
    if blend >= 1.0:
        return list(generated)

    count = len(generated)
    ref = _resample_descending(reference, count)
    epsilon = 1e-8
    out = []
    for left, right in zip(ref, generated):
        if left <= epsilon or right <= epsilon:
            out.append(left * (1.0 - blend) + right * blend)
        else:
            out.append(math.exp(math.log(left) * (1.0 - blend) + math.log(right) * blend))
    out[0] = ref[0] * (1.0 - blend) + generated[0] * blend
    if preserve_final_zero and ref[-1] == 0.0:
        out[-1] = 0.0
    return out


def _allocation(values, high_mid, mid_low):
    if len(values) < 2:
        return (0, 0, 0)
    maximum = max(values[0], 1e-8)
    high = mid = low = 0
    for value in values[:-1]:
        normalized = value / maximum
        if normalized >= high_mid:
            high += 1
        elif normalized >= mid_low:
            mid += 1
        else:
            low += 1
    total = max(1, high + mid + low)
    return (round(high * 100 / total), round(mid * 100 / total), round(low * 100 / total))


class KoOSigmaEqualizer:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "mode": (MODES, {"default": "Auto"}),
                "profile": (PROFILES, {"default": "Balanced TXT2IMG"}),
                "structure_creativity": ("FLOAT", {"default": 55.0, "min": 0.0, "max": 100.0, "step": 1.0}),
                "shapes_materials": ("FLOAT", {"default": 52.0, "min": 0.0, "max": 100.0, "step": 1.0}),
                "microdetail": ("FLOAT", {"default": 50.0, "min": 0.0, "max": 100.0, "step": 1.0}),
                "final_cleanup": ("FLOAT", {"default": 48.0, "min": 0.0, "max": 100.0, "step": 1.0}),
                "curve_strength": ("FLOAT", {"default": 70.0, "min": 0.0, "max": 100.0, "step": 1.0}),
                "reference_blend": ("FLOAT", {"default": 100.0, "min": 0.0, "max": 100.0, "step": 1.0}),
                "smoothness": ("FLOAT", {"default": 35.0, "min": 0.0, "max": 100.0, "step": 1.0}),
                "steps": ("INT", {"default": 30, "min": 1, "max": 10000, "step": 1}),
                "max_sigma": ("FLOAT", {"default": 14.6, "min": 0.01, "max": 500.0, "step": 0.01}),
                "interpolation_type": (INTERPOLATION_TYPES, {"default": "Smoothstep"}),
                "high_to_mid_boundary": ("FLOAT", {"default": 0.66, "min": 0.05, "max": 0.95, "step": 0.01}),
                "mid_to_low_boundary": ("FLOAT", {"default": 0.22, "min": 0.01, "max": 0.90, "step": 0.01}),
                "tail_length": ("FLOAT", {"default": 0.055, "min": 0.001, "max": 0.40, "step": 0.001}),
                "curve_gamma": ("FLOAT", {"default": 1.0, "min": 0.10, "max": 5.0, "step": 0.01}),
                "tail_exponent": ("FLOAT", {"default": 1.0, "min": 0.10, "max": 5.0, "step": 0.01}),
                "txt2img_settings": ("STRING", {"default": "{}", "multiline": False}),
                "img2img_settings": ("STRING", {"default": "{}", "multiline": False}),
                "auto_settings": ("STRING", {"default": "{}", "multiline": False}),
                "manual_curve_points": (
                    "STRING",
                    {"default": '[{"x":0,"y":1},{"x":1,"y":0}]', "multiline": False},
                ),
                "normalized_manual_points": ("STRING", {"default": "", "multiline": False}),
                "lock_monotonic_curve": ("BOOLEAN", {"default": True}),
                "prevent_duplicate_sigmas": ("BOOLEAN", {"default": True}),
                "normalize_endpoints": ("BOOLEAN", {"default": True}),
                "clamp_to_input_range": ("BOOLEAN", {"default": True}),
                "preserve_final_zero": ("BOOLEAN", {"default": True}),
                "allow_sigma_expansion": ("BOOLEAN", {"default": False}),
                "include_appearance_in_preset": ("BOOLEAN", {"default": False}),
                "denoise_active_range": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 1.0, "step": 0.01}),
                "input_already_cropped": (INPUT_CROPPED_STATES, {"default": "Auto"}),
                "output_steps_override_enabled": ("BOOLEAN", {"default": False}),
                "output_steps_override": ("INT", {"default": 0, "min": 0, "max": 10000, "step": 1}),
            },
            "optional": {
                "reference_sigmas": ("SIGMAS",),
                "denoise": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 1.0, "step": 0.01}),
                "external_strength": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 2.0, "step": 0.01}),
                "external_reference_blend": ("FLOAT", {"default": -1.0, "min": -1.0, "max": 100.0, "step": 1.0}),
            },
        }

    RETURN_TYPES = ("SIGMAS", "STRING")
    RETURN_NAMES = ("sigmas", "sigma_info")
    FUNCTION = "equalize"
    CATEGORY = "KoO Tools / Sampling"

    def equalize(
        self,
        mode,
        profile,
        structure_creativity,
        shapes_materials,
        microdetail,
        final_cleanup,
        curve_strength,
        reference_blend,
        smoothness,
        steps,
        max_sigma,
        interpolation_type,
        high_to_mid_boundary,
        mid_to_low_boundary,
        tail_length,
        curve_gamma,
        tail_exponent,
        txt2img_settings,
        img2img_settings,
        auto_settings,
        manual_curve_points,
        normalized_manual_points,
        lock_monotonic_curve,
        prevent_duplicate_sigmas,
        normalize_endpoints,
        clamp_to_input_range,
        preserve_final_zero,
        allow_sigma_expansion,
        include_appearance_in_preset,
        denoise_active_range=1.0,
        input_already_cropped="Auto",
        output_steps_override_enabled=False,
        output_steps_override=0,
        reference_sigmas=None,
        denoise=1.0,
        external_strength=1.0,
        external_reference_blend=-1.0,
    ):
        reference, reference_note = _sanitize_sigmas(reference_sigmas)
        source = "reference"
        if reference is None:
            reference = _generated_reference(steps, max_sigma)
            source = "generated"

        source_transitions = max(len(reference) - 1, 0)
        source_tensor_length = len(reference)
        source_max_sigma = reference[0]
        source_min_sigma = reference[-1]

        requested_mode = mode if mode in MODES else "Auto"
        resolved_mode = requested_mode
        if requested_mode == "Auto":
            active_max = reference[0] if reference else max_sigma
            denoise_value = _clamp(denoise_active_range, 0.0, 1.0)
            max_sigma_value = max(_safe_float(max_sigma, 14.6), 1e-8)
            if source == "reference" and (denoise_value < 0.999 or active_max < max_sigma_value * 0.72):
                resolved_mode = "IMG2IMG"
            else:
                resolved_mode = "TXT2IMG"

        active_range_mode = "IMG2IMG" if requested_mode == "Manual" and _clamp(denoise_active_range, 0.0, 1.0) < 0.999 else resolved_mode
        active_reference, active_meta = _active_schedule(
            reference,
            source,
            active_range_mode,
            denoise_active_range,
            input_already_cropped,
        )
        active_transitions = max(len(active_reference) - 1, 0)
        active_tensor_length = len(active_reference)
        active_max_sigma = active_reference[0]
        active_min_sigma = active_reference[-1]

        override_enabled = bool(output_steps_override_enabled) and _safe_int(output_steps_override, 0) > 0
        if override_enabled:
            count = max(2, _safe_int(output_steps_override, active_transitions) + 1)
        elif source == "reference":
            count = len(active_reference)
        else:
            count = max(2, _safe_int(steps, max(1, len(active_reference) - 1)) + 1)

        strength = _clamp(curve_strength * _clamp(external_strength, 0.0, 2.0), 0.0, 100.0)
        blend = reference_blend if _safe_float(external_reference_blend, -1.0) < 0 else external_reference_blend

        if resolved_mode == "IMG2IMG":
            structure_creativity = min(structure_creativity, 50.0)
            shapes_materials = max(shapes_materials, 45.0)
            microdetail = max(microdetail, 48.0)

        if requested_mode == "Manual":
            points_text = normalized_manual_points or manual_curve_points
            points = _normalize_manual_points(points_text)
            normalized = _manual_curve(points, count, interpolation_type)
        else:
            normalized = _generated_curve(
                count,
                structure_creativity,
                shapes_materials,
                microdetail,
                final_cleanup,
                strength,
                interpolation_type,
                high_to_mid_boundary,
                mid_to_low_boundary,
                tail_length,
            )

        gamma = _clamp(curve_gamma, 0.10, 5.0)
        tail_exp = _clamp(tail_exponent, 0.10, 5.0)
        normalized = [value**gamma for value in normalized]
        tail_cutoff = _clamp(tail_length, 0.001, 0.40)
        normalized = [value if value > tail_cutoff else tail_cutoff * ((value / tail_cutoff) ** tail_exp) for value in normalized]
        normalized[0] = 1.0
        normalized[-1] = 0.0

        normalized = _smooth(normalized, smoothness)
        maximum = active_reference[0] if active_reference else _clamp(max_sigma, 0.01, 500.0)
        minimum = 0.0 if preserve_final_zero else min(active_reference)
        generated = [minimum + (maximum - minimum) * value for value in normalized]
        generated[0] = maximum
        if preserve_final_zero:
            generated[-1] = 0.0

        safety = {
            "lock_monotonic": bool(lock_monotonic_curve),
            "prevent_duplicate_sigmas": bool(prevent_duplicate_sigmas),
            "normalize_endpoints": bool(normalize_endpoints),
            "clamp_to_input_range": bool(clamp_to_input_range),
            "preserve_final_zero": bool(preserve_final_zero),
            "allow_sigma_expansion": bool(allow_sigma_expansion),
        }

        generated, safety_report = _apply_safety(generated, active_reference, safety)
        output = _blend_log(active_reference, generated, blend, preserve_final_zero)
        output, blend_safety = _apply_safety(output, active_reference, safety)

        device = reference_sigmas.device if hasattr(reference_sigmas, "device") else torch.device("cpu")
        dtype = reference_sigmas.dtype if hasattr(reference_sigmas, "dtype") else torch.float32
        tensor = torch.tensor(output, dtype=dtype, device=device)

        high, mid, low = _allocation(output, _clamp(high_to_mid_boundary, 0.2, 0.92), _clamp(mid_to_low_boundary, 0.04, 0.9))
        monotonic = all(float(tensor[i]) >= float(tensor[i + 1]) for i in range(max(0, tensor.numel() - 1)))
        finite = bool(torch.isfinite(tensor).all().item())
        endpoint = "zero" if tensor.numel() and float(tensor[-1]) == 0.0 else f"{float(tensor[-1]):.6g}"
        final_zero = bool(tensor.numel() and abs(float(tensor[-1])) <= 1e-8)
        expansion = bool(tensor.numel() and float(tensor[0]) > active_max_sigma + 1e-8)
        info = (
            f"KoO Sigma Equalizer | selected mode {requested_mode} | resolved mode {resolved_mode} | "
            f"schedule source {source} ({reference_note}) | source transitions {source_transitions} | "
            f"source tensor length {source_tensor_length} | source sigma {source_max_sigma:.6g}->{source_min_sigma:.6g} | "
            f"denoise/active range {active_meta['denoise']:.3f} | crop index {active_meta['crop_index']} | "
            f"active range mode {active_range_mode} | active transitions {active_transitions} | active tensor length {active_tensor_length} | "
            f"active sigma {active_max_sigma:.6g}->{active_min_sigma:.6g} | output transitions {max(0, tensor.numel() - 1)} | "
            f"output tensor length {tensor.numel()} | output sigma {float(tensor[0]):.6g}->{endpoint} | "
            f"transitions {max(0, tensor.numel() - 1)} | allocation H/M/L {high}/{mid}/{low}% | "
            f"interpolation {interpolation_type} | reference blend {_clamp(blend, 0, 100):.0f}% | "
            f"monotonic {monotonic} | finite {finite} | final zero {final_zero} | sigma expansion {expansion} | "
            f"cropped internally {active_meta['cropped_internally']} | treated already cropped {active_meta['treated_already_cropped']} | "
            f"already-cropped resolution {active_meta['already_cropped_resolution']} | fallback generated {source == 'generated'} | "
            f"step override applied {override_enabled} | manual controlling output {requested_mode == 'Manual'} | "
            f"safety clamped {safety_report['clamped'] or blend_safety['clamped']} deduped {safety_report['deduped'] or blend_safety['deduped']}"
        )
        return (tensor, info)


NODE_CLASS_MAPPINGS = {
    "KoOSigmaEqualizer": KoOSigmaEqualizer,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "KoOSigmaEqualizer": "KoO Sigma Equalizer",
}
