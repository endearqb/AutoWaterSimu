# syntax=docker/dockerfile:1.7
FROM python:3.11-slim

WORKDIR /workspace

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/workspace/simulation_core/python:/workspace/contracts/python:/workspace/services/simulation-worker

COPY simulation_core/python /workspace/simulation_core/python
COPY contracts/python /workspace/contracts/python
COPY contracts/examples /workspace/contracts/examples
COPY contracts/*.json /workspace/contracts/
COPY services/simulation-worker /workspace/services/simulation-worker

RUN --mount=type=cache,target=/root/.cache/pip \
    python -m pip install --root-user-action=ignore \
    pydantic \
    numpy \
    scipy \
    torch \
    torchdiffeq \
    jsonschema

ENTRYPOINT ["python", "/workspace/services/simulation-worker/simulation_worker/cli.py"]
