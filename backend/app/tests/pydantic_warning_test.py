import subprocess
import sys


def test_models_import_without_protected_namespace_warnings() -> None:
    script = """
import warnings
with warnings.catch_warnings(record=True) as caught:
    warnings.simplefilter("always")
    import app.models  # noqa: F401
protected = [item for item in caught if "protected namespace" in str(item.message)]
if protected:
    for item in protected:
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
