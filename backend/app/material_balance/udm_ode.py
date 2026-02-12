from typing import Any, Callable, List

import torch

from .udm_engine import UDMNodeRuntime


def udm_ode_balance(
    t: float,
    y_extended: torch.Tensor,
    m: int,
    prop_a: torch.Tensor,
    prop_b: torch.Tensor,
    Q_out: torch.Tensor,
    compute_mask: torch.Tensor,
    udm_mask: torch.Tensor,
    udm_runtime_payload: List[UDMNodeRuntime],
    sparse_bundle: dict | None = None,
    *,
    balance_param: Callable[[torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor], Any],
    balance_param_sparse: Callable[[torch.Tensor, dict], Any],
) -> torch.Tensor:
    _ = t
    _ = m

    y = y_extended[:, :-1]
    V_liq = y_extended[:, -1]

    y = torch.clamp(y, min=0)
    V_liq = torch.clamp(V_liq, min=1e-6)

    if sparse_bundle is not None:
        delta_m, delta_Q = balance_param_sparse(y, sparse_bundle)
    else:
        delta_m, delta_Q = balance_param(y, Q_out, prop_a, prop_b)[:2]

    dy_extended = torch.zeros_like(y_extended)

    dilution_term = -y * delta_Q.unsqueeze(-1) / V_liq.unsqueeze(-1)
    concentration_change = delta_m / V_liq.unsqueeze(-1) + dilution_term

    udm_reaction_change = torch.zeros_like(concentration_change)
    for runtime in udm_runtime_payload:
        node_idx = runtime.node_index
        if node_idx < 0 or node_idx >= y.shape[0]:
            continue
        if udm_mask is not None and not bool(udm_mask[node_idx].item()):
            continue
        reaction = runtime.evaluate_reaction(y[node_idx])
        udm_reaction_change[node_idx, :] = reaction

    concentration_change = concentration_change + udm_reaction_change

    # Freeze configured component rows by forcing dC/dt = 0.
    for runtime in udm_runtime_payload:
        node_idx = runtime.node_index
        if node_idx < 0 or node_idx >= concentration_change.shape[0]:
            continue
        if udm_mask is not None and not bool(udm_mask[node_idx].item()):
            continue
        fixed_mask = runtime.fixed_component_mask
        if fixed_mask is None or fixed_mask.numel() == 0:
            continue
        if bool(fixed_mask.any().item()):
            concentration_change[node_idx, fixed_mask] = 0.0

    mask_expanded = compute_mask.unsqueeze(-1).expand_as(concentration_change)
    dy_extended[:, :-1] = torch.where(
        mask_expanded,
        concentration_change,
        torch.zeros_like(concentration_change),
    )
    dy_extended[:, -1] = torch.where(compute_mask, delta_Q, torch.zeros_like(delta_Q))
    return dy_extended
