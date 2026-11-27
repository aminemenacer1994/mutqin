#!/usr/bin/env python3
"""
Experimental HisnLabs Tajweed v2 phoneme CLI for Mutqin acoustic pipeline.

Requires (not bundled):
  - pip install onnxruntime numpy
  - Download Hisnlabs/tajweed-v2 ONNX weights to MUTQIN_HISNLABS_ONNX_PATH

This script never fabricates phoneme output when the runtime or weights are missing.
"""
from __future__ import annotations

import argparse
import json
import os
import sys


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio", required=True)
    parser.add_argument("--qiraat", default="hafs")
    parser.add_argument("--text", default="")
    args = parser.parse_args()

    model_path = os.environ.get("MUTQIN_HISNLABS_ONNX_PATH", "")
    if not model_path or not os.path.isfile(model_path):
        print(json.dumps({
            "status": "unavailable",
            "reason": "hisnlabs_onnx_not_configured",
            "model_version": None,
        }))
        return 0

    try:
        import onnxruntime  # noqa: F401
    except ImportError:
        print(json.dumps({
            "status": "unavailable",
            "reason": "onnxruntime_not_installed",
            "model_version": None,
        }))
        return 0

    # Full inference wiring is intentionally deferred until ops validates ONNX in staging.
    print(json.dumps({
        "status": "unavailable",
        "reason": "inference_not_wired",
        "model_version": "hisnlabs-tajweed-v2-stub",
    }))
    return 0


if __name__ == "__main__":
    sys.exit(main())