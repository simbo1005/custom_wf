from __future__ import annotations

from .cache import cache_source_image


class KoOFinisher:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE",),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
            },
        }

    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("image",)
    FUNCTION = "cache"
    OUTPUT_NODE = True
    CATEGORY = "KoO/Post Processing"
    DESCRIPTION = "Standalone interactive finisher with cached source preview and direct image save."

    def cache(self, image, unique_id=None):
        info = cache_source_image(image, unique_id)
        return {
            "ui": {
                "koo_finisher": [info],
            },
            "result": (image,),
        }


NODE_CLASS_MAPPINGS = {
    "KoOFinisher": KoOFinisher,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "KoOFinisher": "KoO Finisher",
}
