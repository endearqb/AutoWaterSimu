"""Export FastAPI OpenAPI schema to frontend/openapi.json.

Run from backend directory with virtual environment activated:
    python app/scripts/export_openapi.py
"""

import os
import json

from app.main import app


def main() -> None:
    schema = app.openapi()
    out_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "openapi.json"))
    # In project root, frontend is sibling of backend
    # Adjust if script executed from different CWD
    # Here we compute: backend/app/scripts -> backend/app -> backend -> project_root -> frontend/openapi.json
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    target = os.path.join(project_root, "frontend", "openapi.json")
    os.makedirs(os.path.dirname(target), exist_ok=True)
    with open(target, "w", encoding="utf-8") as f:
        json.dump(schema, f, ensure_ascii=False, indent=2)
    print("OpenAPI schema written to:", target)


if __name__ == "__main__":
    main()