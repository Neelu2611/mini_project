"""Serve the exported dashboard and verified Python inference from one origin."""
import hashlib
import json
import os
from pathlib import Path
import sys
from urllib.parse import urlsplit
from urllib.request import urlopen

import uvicorn
from fastapi.staticfiles import StaticFiles

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root))

from backend.app.main import app
from backend.app.services.short_prediction import load_short_model

if __name__ == "__main__":
    destination = root / "artifacts/diabetes-short-v1.ubj"
    if not destination.exists():
        url = os.environ.get("READMISSION_SHORT_MODEL_URL", "")
        if urlsplit(url).scheme != "https":
            raise SystemExit("Configure the private HTTPS download URL for the trained model.")
        try:
            with urlopen(url, timeout=60) as response:
                data = response.read(4_000_001)
        except Exception:
            raise SystemExit("Could not download the short model. Check the private URL.") from None
        meta = json.loads((root / "docs/diabetes-short-v1.json").read_text())
        if hashlib.sha256(data).hexdigest() != meta["model_sha256"]:
            raise SystemExit("Downloaded model did not match the recorded SHA-256.")
        destination.write_bytes(data)
    load_short_model()
    app.mount("/", StaticFiles(directory=root / "website", html=True), name="website")
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "10000")), access_log=False)
