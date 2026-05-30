import subprocess
import sys


def test_models_import_without_pydantic_namespace_or_validator_warnings() -> None:
    script = """
import warnings
with warnings.catch_warnings(record=True) as caught:
    warnings.simplefilter("always")
    import app.models  # noqa: F401
unexpected = [
    item
    for item in caught
    if "protected namespace" in str(item.message)
    or "Pydantic V1 style" in str(item.message)
]
if unexpected:
    for item in unexpected:
        print(item.message)
    raise SystemExit(1)
"""

    result = subprocess.run(
        [sys.executable, "-c", script],
        capture_output=True,
        check=False,
        text=True,
    )

    assert result.returncode == 0, result.stdout + result.stderr
