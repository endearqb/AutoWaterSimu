import torch


def safe_div(num: torch.Tensor, den: torch.Tensor, eps: float = 1e-12) -> torch.Tensor:
    return num / den.clamp_min(eps)


def monod(S: torch.Tensor, K: torch.Tensor) -> torch.Tensor:
    return safe_div(S, K + S)


def inhibition(S: torch.Tensor, K: torch.Tensor) -> torch.Tensor:
    return safe_div(K, K + S)
