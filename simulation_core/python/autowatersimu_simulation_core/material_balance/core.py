"""鐗╂枡骞宠　鏍稿績璁＄畻妯″潡

鐗╂枡骞宠　璁＄畻鐨勬牳蹇冪畻娉曞疄鐜般€?

璇ユā鍧楀寘鍚簡鐗╂枡骞宠　璁＄畻鐨勪富瑕佸姛鑳斤細
- 鐗╂枡骞宠　寰垎鏂圭▼姹傝В
- 寮犻噺鏁版嵁杞崲鍜屽鐞?
- 鏁板€肩Н鍒嗗拰鏃堕棿搴忓垪妯℃嫙
- 缁撴灉楠岃瘉鍜岃宸绠?
"""

import numpy as np
import torch
from torchdiffeq import odeint
import functools
from typing import Tuple, Dict, List, Any, Optional
import uuid
import time

from .models import (
    MaterialBalanceInput,
    MaterialBalanceResult,
    NodeData,
    EdgeData,
    CalculationParameters
)
from .exceptions import (
    MaterialBalanceError,
    InvalidInputError,
    CalculationError,
    ConvergenceError,
    DimensionMismatchError,
    NegativeVolumeError
)
from .asm import (
    asm1slim_reaction,
    asm1_reaction,
    asm3_reaction,
    asm2d_rates,
    asm2d_dC_dt,
)
from .udm_engine import UDMNodeRuntime, build_udm_runtime_payload
from .udm_ode import udm_ode_balance

ASM_COMPONENT_CONTRACTS: Dict[str, Dict[str, Any]] = {
    "asm1slim": {
        "components": ("S_O", "S_S", "S_NO", "S_NH", "S_ALK"),
        "oxygen_index": 0,
    },
    "asm1": {
        "components": (
            "X_BH",
            "X_BA",
            "X_S",
            "X_i",
            "X_ND",
            "S_O",
            "S_S",
            "S_NO",
            "S_NH",
            "S_ND",
            "S_ALK",
        ),
        "oxygen_index": 5,
    },
    "asm3": {
        "components": (
            "X_H",
            "X_A",
            "X_S",
            "X_I",
            "X_ND",
            "X_STO",
            "S_O",
            "S_S",
            "S_NO",
            "S_NH",
            "S_ND",
            "S_ALK",
            "S_I",
        ),
        "oxygen_index": 6,
    },
}


class MaterialBalanceCalculator:
    """鐗╂枡骞宠　璁＄畻鍣紝鍏锋湁鏀硅繘鐨勯敊璇鐞嗗拰楠岃瘉鍔熻兘銆?

    璇ョ被瀹炵幇浜嗗畬鏁寸殑鐗╂枡骞宠　璁＄畻娴佺▼锛屽寘鎷細
    - 杈撳叆鏁版嵁楠岃瘉
    - 寮犻噺杞崲鍜屽垵濮嬪寲
    - ODE姹傝В鍜屾椂闂村簭鍒楁ā鎷?
    - 缁撴灉杞崲鍜屾牸寮忓寲
    """

    def __init__(self):
        """鍒濆鍖栫墿鏂欏钩琛¤绠楀櫒銆?

        璁剧疆璁＄畻璁惧锛圙PU鎴朇PU锛夊拰鏁版嵁绫诲瀷銆?
        """
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.dtype = torch.float32

    def calculate(self, input_data: MaterialBalanceInput) -> MaterialBalanceResult:
        """涓昏璁＄畻鏂规硶銆?

        鎵ц瀹屾暣鐨勭墿鏂欏钩琛¤绠楁祦绋嬶紝鍖呮嫭鏁版嵁楠岃瘉銆佸紶閲忚浆鎹€?
        寰垎鏂圭▼姹傝В鍜岀粨鏋滄牸寮忓寲銆?

        Args:
            input_data: 鍖呭惈鑺傜偣銆佽竟鍜屽弬鏁扮殑杈撳叆鏁版嵁

        Returns:
            MaterialBalanceResult: 鍖呭惈鏃堕棿搴忓垪鏁版嵁鐨勮绠楃粨鏋?

        Raises:
            MaterialBalanceError: 褰撹绠楀け璐ユ椂鎶涘嚭寮傚父
        """
        job_id = str(uuid.uuid4())
        start_time = time.time()

        try:
            # Validate input
            self._validate_input(input_data)

            # Convert input to tensors
            tensors = self._convert_to_tensors(input_data)

            # Run calculation
            calculation_output = self._run_calculation(
                tensors,
                input_data.parameters,
                input_data,
            )

            # Convert results back to structured format
            result = self._convert_results(
                calculation_output,
                input_data,
                job_id,
                start_time,
            )

            return result

        except Exception as e:
            error_msg = str(e)
            if isinstance(e, MaterialBalanceError):
                raise
            else:
                raise CalculationError(f"Unexpected error during calculation: {error_msg}") from e

    def _validate_input(self, input_data: MaterialBalanceInput) -> None:
        """楠岃瘉杈撳叆鏁版嵁鐨勪竴鑷存€с€?

        妫€鏌ヨ緭鍏ユ暟鎹殑瀹屾暣鎬у拰鏈夋晥鎬э紝鍖呮嫭锛?
        - 鑷冲皯鏈変竴涓叆鍙ｈ妭鐐瑰拰涓€涓嚭鍙ｈ妭鐐?
        - 杈圭殑杩炴帴鍏崇郴鏈夋晥
        - 鑺傜偣ID鐨勫敮涓€鎬?
        """
        nodes = input_data.nodes
        edges = input_data.edges

        # Validate flow connectivity
        node_ids = {n.node_id for n in nodes}
        for edge in edges:
            if edge.source_node_id not in node_ids:
                raise InvalidInputError(f"Edge references unknown source_node_id: {edge.source_node_id}")
            if edge.target_node_id not in node_ids:
                raise InvalidInputError(f"Edge references unknown target_node_id: {edge.target_node_id}")


    def _safe_div(self, num: torch.Tensor, den: torch.Tensor, eps: float = 1e-12 ) -> torch.Tensor:
        """Safe divide to avoid division by zero."""
        return num / den.clamp_min(eps)

    def _build_active_reaction_runtime(
        self,
        model_mask: torch.Tensor | None,
        compute_mask: torch.Tensor,
        params: torch.Tensor | None,
    ) -> Dict[str, torch.Tensor] | None:
        if model_mask is None or params is None:
            return None

        active_mask = model_mask & compute_mask
        active_indices = torch.nonzero(active_mask, as_tuple=False).flatten()
        if active_indices.numel() == 0:
            return None

        return {
            "mask": active_mask,
            "indices": active_indices,
            "params": params.index_select(0, active_indices),
        }

    def _resolve_active_reaction_runtime(
        self,
        runtime: Dict[str, torch.Tensor] | None,
        model_mask: torch.Tensor | None,
        compute_mask: torch.Tensor,
        params: torch.Tensor | None,
    ) -> Dict[str, torch.Tensor] | None:
        if runtime is not None:
            return runtime
        return self._build_active_reaction_runtime(model_mask, compute_mask, params)

    def _validate_asm_component_contracts(
        self,
        nodes: List[NodeData],
        parameter_names: List[str],
        declared_parameter_names: List[str],
    ) -> None:
        has_named_schema = bool(declared_parameter_names)

        for node in nodes:
            contract = ASM_COMPONENT_CONTRACTS.get(node.node_type)
            if contract is None:
                continue

            expected_components = tuple(contract["components"])
            actual_count = len(node.initial_concentrations)
            expected_count = len(expected_components)
            if actual_count < expected_count:
                raise InvalidInputError(
                    "ASM component contract mismatch for node "
                    f"{node.node_id}: node_type '{node.node_type}' requires at least "
                    f"{expected_count} components ({', '.join(expected_components)}), "
                    f"got {actual_count}"
                )

            if not has_named_schema:
                continue

            actual_prefix = tuple(parameter_names[:expected_count])
            if actual_prefix != expected_components:
                raise InvalidInputError(
                    "ASM component contract mismatch for node "
                    f"{node.node_id}: node_type '{node.node_type}' expects component "
                    f"order [{', '.join(expected_components)}], got "
                    f"[{', '.join(actual_prefix)}]"
                )

    def _apply_asm_reaction_runtime(
        self,
        concentration_change: torch.Tensor,
        y: torch.Tensor,
        runtime: Dict[str, torch.Tensor] | None,
        reaction_fn: Any,
        oxygen_index: int,
    ) -> None:
        if runtime is None:
            return

        indices = runtime["indices"]
        params = runtime["params"]
        rates = reaction_fn(params, y.index_select(0, indices))
        concentration_change.index_add_(0, indices, rates)
        if concentration_change.shape[1] > oxygen_index:
            concentration_change[indices, oxygen_index] = 0.0


    def _convert_to_tensors(self, input_data: MaterialBalanceInput) -> Dict[str, Any]:
        """Convert validated input data into tensor structures."""
        nodes = input_data.nodes
        edges = input_data.edges

        device, dtype = self.device, self.dtype
        n_nodes = len(nodes)
        if n_nodes == 0:
            raise ValueError("nodes is empty")
        n_components = len(nodes[0].initial_concentrations)
        global_component_names = self._resolve_parameter_names(
            input_data=input_data,
            n_components=n_components,
        )
        declared_component_names = self._get_original_parameter_names(input_data)
        self._validate_asm_component_contracts(
            nodes=nodes,
            parameter_names=global_component_names,
            declared_parameter_names=declared_component_names,
        )

        # 1) 鑺傜偣寮犻噺锛氫竴娆℃€у垪琛ㄦ帹瀵?-> 寮犻噺
        V_liq = torch.tensor(
            [n.initial_volume for n in nodes], dtype=dtype, device=device
        )
        x0 = torch.tensor(
            [n.initial_concentrations for n in nodes], dtype=dtype, device=device
        )
        compute_mask = torch.tensor(
            [not (n.is_inlet or n.is_outlet) for n in nodes],
            dtype=torch.bool, device=device
        )

        # 鍒涘缓ASM1 Slim鑺傜偣鎺╃爜
        asm1slim_mask = torch.tensor(
            [n.node_type == 'asm1slim' for n in nodes],
            dtype=torch.bool, device=device
        )

        P = 7
        # 榛樿鍊硷紙渚嬪鍏?0锛涘鏈夋爣鍑?ASM1 缂虹渷锛屽彲鏇挎崲锛?
        default_param = torch.zeros(P, dtype=dtype, device=device)

        # 鍏堟瀯閫?Python 灞備簩缁村垪琛紙涓€娆￠亶鍘嗭級锛岄暱搴︾粺涓€涓?P
        param_rows = []
        for n in nodes:
            p = getattr(n, 'asm1slim_parameters', None)
            if n.node_type == 'asm1slim' and p is not None and len(p) == P:
                param_rows.append(p)
            else:
                param_rows.append(default_param.tolist())

        # [n_nodes, P] - 淇濇寔鍘熷褰㈢姸
        asm1slim_params = torch.tensor(param_rows, dtype=dtype, device=device)  # [n_nodes, P]
        # 鍚庣画閰嶅悎 asm1slim_mask 浣跨敤锛?
        # asm1slim_params_used = asm1slim_params[asm1slim_mask]  # 鎸夐渶"鍘嬬缉瑙嗗浘"

        # 鍒涘缓ASM1鑺傜偣鎺╃爜
        asm1_mask = torch.tensor(
            [n.node_type == 'asm1' for n in nodes],
            dtype=torch.bool, device=device
        )
        P_asm1 = 19
        default_param_asm1 = torch.zeros(P_asm1, dtype=dtype, device=device)

        asm1_param_rows = []
        for n in nodes:
            p = getattr(n, 'asm1_parameters', None)
            if n.node_type == 'asm1' and p is not None and len(p) == P_asm1:
                asm1_param_rows.append(p)
            else:
                asm1_param_rows.append(default_param_asm1.tolist())
        asm1_params = torch.tensor(asm1_param_rows, dtype=dtype, device=device)

        # 鍒涘缓ASM3鑺傜偣鎺╃爜
        asm3_mask = torch.tensor(
            [n.node_type == 'asm3' for n in nodes],
            dtype=torch.bool, device=device
        )
        P_asm3 = 37
        default_param_asm3 = torch.zeros(P_asm3, dtype=dtype, device=device)
        asm3_param_rows = []
        for n in nodes:
            p = getattr(n, 'asm3_parameters', None)
            if n.node_type == 'asm3' and p is not None and len(p) == P_asm3:
                asm3_param_rows.append(p)
            else:
                asm3_param_rows.append(default_param_asm3.tolist())
        asm3_params = torch.tensor(asm3_param_rows, dtype=dtype, device=device)

        # Create UDM node mask and runtime payload
        udm_mask = torch.tensor(
            [n.node_type == 'udm' for n in nodes],
            dtype=torch.bool, device=device
        )
        udm_runtime_payload = build_udm_runtime_payload(
            nodes=nodes,
            global_component_names=global_component_names,
            device=device,
            dtype=dtype,
        )
        udm_active_node_indices = {
            node_index
            for node_index, node in enumerate(nodes)
            if node.node_type == 'udm'
        }
        asm1slim_reaction_runtime = self._build_active_reaction_runtime(
            asm1slim_mask,
            compute_mask,
            asm1slim_params,
        )
        asm1_reaction_runtime = self._build_active_reaction_runtime(
            asm1_mask,
            compute_mask,
            asm1_params,
        )
        asm3_reaction_runtime = self._build_active_reaction_runtime(
            asm3_mask,
            compute_mask,
            asm3_params,
        )


        # 2) 鑺傜偣鏄犲皠
        node_map = {node.node_id: i for i, node in enumerate(nodes)}

        # 3) 鑻ユ棤杈癸紝浠嶈繑鍥炰竴鑷寸粨鏋?
        if not edges:
            Q_out = torch.zeros(n_nodes, n_nodes, dtype=dtype, device=device)
            sparse_bundle = {
                "src": torch.empty(0, dtype=torch.long, device=device),
                "dst": torch.empty(0, dtype=torch.long, device=device),
                "q":   torch.empty(0, dtype=dtype, device=device),
                "a":   torch.empty(0, n_components, dtype=dtype, device=device),
                "b":   torch.empty(0, n_components, dtype=dtype, device=device),
                "shape": (n_nodes, n_nodes),
            }
            return {
                "V_liq": V_liq, "x0": x0,
                "Q_out": Q_out, "prop_a": None, "prop_b": None,
                "node_map": node_map, "compute_mask": compute_mask,
                "asm1slim_mask": asm1slim_mask, "asm1slim_params": asm1slim_params,
                "asm1_mask": asm1_mask, "asm1_params": asm1_params,
                "asm3_mask": asm3_mask, "asm3_params": asm3_params,
                "udm_mask": udm_mask, "udm_runtime_payload": udm_runtime_payload,
                "udm_active_node_indices": udm_active_node_indices,
                "asm1slim_reaction_runtime": asm1slim_reaction_runtime,
                "asm1_reaction_runtime": asm1_reaction_runtime,
                "asm3_reaction_runtime": asm3_reaction_runtime,
                "parameter_names": global_component_names,
                "n_components": n_components,
                "sparse_bundle": sparse_bundle
            }

        # 4) 鎶?edges 杞垚寮犻噺锛堝幓鎺夊惊鐜腑鐨?if/else锛?
        src = torch.tensor(
            [node_map[e.source_node_id] for e in edges],
            dtype=torch.long, device=device
        )
        dst = torch.tensor(
            [node_map[e.target_node_id] for e in edges],
            dtype=torch.long, device=device
        )
        q_vals = torch.tensor(
            [e.flow_rate for e in edges],
            dtype=dtype, device=device
        )

        # 缁熶竴鍖?a/b锛氱己澶辨垨闀垮害涓嶅尮閰嶆椂鍥炶惤榛樿
        def _norm_a(e):
            fa = getattr(e, "concentration_factor_a", None)
            return fa if (fa and len(fa) == n_components) else [1.0] * n_components

        def _norm_b(e):
            fb = getattr(e, "concentration_factor_b", None)
            return fb if (fb and len(fb) == n_components) else [0.0] * n_components

        a_edge = torch.tensor([_norm_a(e) for e in edges], dtype=dtype, device=device)  # [E, r]
        b_edge = torch.tensor([_norm_b(e) for e in edges], dtype=dtype, device=device)  # [E, r]

        Q_out = torch.zeros(n_nodes, n_nodes, dtype=dtype, device=device)
        Q_out.index_put_((src, dst), q_vals, accumulate=True)

        # 6) 绋€鐤忓寘锛堜緵绋€鐤?ODE 璺緞浣跨敤锛岄伩鍏嶅悗缁?nonzero 鎵弿锛?
        sparse_bundle = {
            "src": src, "dst": dst, "q": q_vals,
            "a": a_edge, "b": b_edge,
            "shape": (n_nodes, n_nodes),
        }

        return {
            "V_liq": V_liq,
            "x0": x0,
            "Q_out": Q_out,
            "prop_a": None,
            "prop_b": None,
            "node_map": node_map,
            "compute_mask": compute_mask,
            "asm1slim_mask": asm1slim_mask,
            "asm1slim_params": asm1slim_params,
            "asm1_mask": asm1_mask,
            "asm1_params": asm1_params,
            "asm3_mask": asm3_mask,
            "asm3_params": asm3_params,
            "udm_mask": udm_mask,
            "udm_runtime_payload": udm_runtime_payload,
            "udm_active_node_indices": udm_active_node_indices,
            "asm1slim_reaction_runtime": asm1slim_reaction_runtime,
            "asm1_reaction_runtime": asm1_reaction_runtime,
            "asm3_reaction_runtime": asm3_reaction_runtime,
            "parameter_names": global_component_names,
            "n_components": n_components,
            "sparse_bundle": sparse_bundle,
        }

    def _run_calculation(
        self,
        tensors: Dict[str, torch.Tensor],
        params: CalculationParameters,
        input_data: MaterialBalanceInput,
    ) -> Dict[str, Any]:
        """Run material balance simulation, supporting optional time segments."""
        try:
            V_liq = tensors["V_liq"]
            x0 = tensors["x0"]
            compute_mask = tensors["compute_mask"]
            sparse_bundle = tensors.get("sparse_bundle", None)

            asm1slim_params = tensors.get("asm1slim_params", None)
            asm1slim_mask = tensors.get("asm1slim_mask", None)
            asm1_params = tensors.get("asm1_params", None)
            asm1_mask = tensors.get("asm1_mask", None)
            asm3_params = tensors.get("asm3_params", None)
            asm3_mask = tensors.get("asm3_mask", None)
            udm_mask = tensors.get("udm_mask", None)
            udm_runtime_payload = tensors.get("udm_runtime_payload", None)
            udm_active_node_indices = tensors.get("udm_active_node_indices", None)
            asm1slim_reaction_runtime = tensors.get("asm1slim_reaction_runtime", None)
            asm1_reaction_runtime = tensors.get("asm1_reaction_runtime", None)
            asm3_reaction_runtime = tensors.get("asm3_reaction_runtime", None)

            base_state = self._merge_tensors(V_liq, x0).unsqueeze(0)
            segments = self._prepare_segments(input_data, params.hours)
            parameter_names = tensors.get("parameter_names")
            if parameter_names is None:
                parameter_names = self._resolve_parameter_names(
                    input_data=input_data,
                    n_components=x0.shape[1],
                )

            segment_results: List[torch.Tensor] = []
            combined_timestamps: List[float] = []
            edge_flow_series: Dict[str, List[float]] = {
                edge.edge_id: [] for edge in input_data.edges
            }
            edge_flow_interval_series: Dict[str, List[float]] = {
                edge.edge_id: [] for edge in input_data.edges
            }
            edge_factor_a_interval_series: Dict[str, List[List[float]]] = {
                edge.edge_id: [] for edge in input_data.edges
            }
            edge_factor_b_interval_series: Dict[str, List[List[float]]] = {
                edge.edge_id: [] for edge in input_data.edges
            }
            segment_markers: List[float] = []
            parameter_change_events: List[Dict[str, Any]] = []

            prev_q_vals: Optional[torch.Tensor] = None
            prev_a_edge: Optional[torch.Tensor] = None
            prev_b_edge: Optional[torch.Tensor] = None
            current_state = base_state

            for segment_index, segment in enumerate(segments):
                q_vals, a_edge, b_edge = self._resolve_segment_edge_values(
                    input_data=input_data,
                    segment=segment,
                    sparse_bundle=sparse_bundle,
                    parameter_names=parameter_names,
                )

                if (
                    prev_q_vals is not None
                    and prev_a_edge is not None
                    and prev_b_edge is not None
                ):
                    boundary_hour = float(segment["start_hour"])
                    segment_markers.append(boundary_hour)
                    parameter_change_events.extend(
                        self._build_parameter_change_events(
                            at_hour=boundary_hour,
                            input_data=input_data,
                            parameter_names=parameter_names,
                            previous_q=prev_q_vals,
                            previous_a=prev_a_edge,
                            previous_b=prev_b_edge,
                            current_q=q_vals,
                            current_a=a_edge,
                            current_b=b_edge,
                        )
                    )

                Q_out, prop_a, prop_b, runtime_sparse_bundle = (
                    self._build_runtime_edge_tensors(
                        tensors=tensors,
                        q_vals=q_vals,
                        a_edge=a_edge,
                        b_edge=b_edge,
                    )
                )

                segment_hours = float(segment["end_hour"] - segment["start_hour"])
                segment_result = self._run_hours(
                    segment_hours,
                    current_state,
                    Q_out,
                    len(V_liq),
                    params.steps_per_hour,
                    prop_a,
                    prop_b,
                    params.solver_method,
                    params.tolerance,
                    compute_mask,
                    asm1slim_params=asm1slim_params,
                    asm1slim_mask=asm1slim_mask,
                    asm1_params=asm1_params,
                    asm1_mask=asm1_mask,
                    asm3_params=asm3_params,
                    asm3_mask=asm3_mask,
                    udm_mask=udm_mask,
                    udm_runtime_payload=udm_runtime_payload,
                    udm_active_node_indices=udm_active_node_indices,
                    asm1slim_reaction_runtime=asm1slim_reaction_runtime,
                    asm1_reaction_runtime=asm1_reaction_runtime,
                    asm3_reaction_runtime=asm3_reaction_runtime,
                    sparse_bundle=runtime_sparse_bundle,
                    sampling_interval_hours=getattr(
                        params, "sampling_interval_hours", None
                    ),
                )

                segment_relative_timestamps = self._generate_segment_timestamps(
                    hours=segment_hours,
                    steps_per_hour=params.steps_per_hour,
                    sampling_interval_hours=getattr(
                        params, "sampling_interval_hours", None
                    ),
                )
                segment_absolute_timestamps = [
                    float(segment["start_hour"] + ts)
                    for ts in segment_relative_timestamps
                ]

                if segment_index > 0:
                    segment_result = segment_result[1:]
                    segment_absolute_timestamps = segment_absolute_timestamps[1:]

                if segment_result.shape[0] > 0:
                    segment_results.append(segment_result)
                    combined_timestamps.extend(segment_absolute_timestamps)
                    interval_count = len(segment_absolute_timestamps)
                    if segment_index == 0:
                        interval_count = max(0, interval_count - 1)
                    q_values = [float(value) for value in q_vals.detach().cpu().tolist()]
                    a_values = [
                        [float(component) for component in edge_values]
                        for edge_values in a_edge.detach().cpu().tolist()
                    ]
                    b_values = [
                        [float(component) for component in edge_values]
                        for edge_values in b_edge.detach().cpu().tolist()
                    ]
                    for edge_index, edge in enumerate(input_data.edges):
                        edge_flow_value = q_values[edge_index]
                        edge_flow_series[edge.edge_id].extend(
                            [edge_flow_value] * len(segment_absolute_timestamps)
                        )
                        if interval_count:
                            edge_flow_interval_series[edge.edge_id].extend(
                                [edge_flow_value] * interval_count
                            )
                            edge_factor_a_interval_series[edge.edge_id].extend(
                                [a_values[edge_index]] * interval_count
                            )
                            edge_factor_b_interval_series[edge.edge_id].extend(
                                [b_values[edge_index]] * interval_count
                            )
                    current_state = segment_result[-1:].clone()

                prev_q_vals = q_vals
                prev_a_edge = a_edge
                prev_b_edge = b_edge

            if segment_results:
                result_tensor = torch.cat(segment_results, dim=0)
            else:
                # Safety fallback for degenerate segments.
                result_tensor = self._run_hours(
                    params.hours,
                    base_state,
                    tensors["Q_out"],
                    len(V_liq),
                    params.steps_per_hour,
                    tensors["prop_a"],
                    tensors["prop_b"],
                    params.solver_method,
                    params.tolerance,
                    compute_mask,
                    asm1slim_params=asm1slim_params,
                    asm1slim_mask=asm1slim_mask,
                    asm1_params=asm1_params,
                    asm1_mask=asm1_mask,
                    asm3_params=asm3_params,
                    asm3_mask=asm3_mask,
                    udm_mask=udm_mask,
                    udm_runtime_payload=udm_runtime_payload,
                    udm_active_node_indices=udm_active_node_indices,
                    asm1slim_reaction_runtime=asm1slim_reaction_runtime,
                    asm1_reaction_runtime=asm1_reaction_runtime,
                    asm3_reaction_runtime=asm3_reaction_runtime,
                    sparse_bundle=sparse_bundle,
                    sampling_interval_hours=getattr(
                        params, "sampling_interval_hours", None
                    ),
                )
                combined_timestamps = self._generate_segment_timestamps(
                    hours=params.hours,
                    steps_per_hour=params.steps_per_hour,
                    sampling_interval_hours=getattr(
                        params, "sampling_interval_hours", None
                    ),
                )
                for edge in input_data.edges:
                    edge_flow_series[edge.edge_id] = [
                        edge.flow_rate
                    ] * len(combined_timestamps)
                    a_defaults, b_defaults = self._normalise_edge_factors(
                        edge,
                        int(tensors.get("n_components", x0.shape[1])),
                    )
                    interval_count = max(0, len(combined_timestamps) - 1)
                    edge_flow_interval_series[edge.edge_id] = [
                        float(edge.flow_rate)
                    ] * interval_count
                    edge_factor_a_interval_series[edge.edge_id] = [
                        a_defaults
                    ] * interval_count
                    edge_factor_b_interval_series[edge.edge_id] = [
                        b_defaults
                    ] * interval_count

            return {
                "result_tensor": result_tensor,
                "timestamps": combined_timestamps,
                "edge_flow_series": edge_flow_series,
                "edge_flow_interval_series": edge_flow_interval_series,
                "edge_factor_a_interval_series": edge_factor_a_interval_series,
                "edge_factor_b_interval_series": edge_factor_b_interval_series,
                "segment_markers": segment_markers,
                "parameter_change_events": parameter_change_events,
            }

        except Exception as e:
            raise CalculationError(f"ODE calculation failed: {str(e)}") from e

    def _prepare_segments(
        self, input_data: MaterialBalanceInput, total_hours: float
    ) -> List[Dict[str, Any]]:
        raw_segments = getattr(input_data, "time_segments", None) or []
        if not raw_segments:
            return [
                {
                    "id": "baseline",
                    "start_hour": 0.0,
                    "end_hour": float(total_hours),
                    "edge_overrides": {},
                }
            ]

        parsed_segments: List[Dict[str, Any]] = []
        for idx, segment in enumerate(raw_segments):
            segment_id = str(getattr(segment, "id", None) or f"seg_{idx + 1}")
            start_hour = float(getattr(segment, "start_hour", 0.0))
            end_hour = float(getattr(segment, "end_hour", 0.0))
            edge_overrides = getattr(segment, "edge_overrides", None) or {}
            parsed_segments.append(
                {
                    "id": segment_id,
                    "start_hour": start_hour,
                    "end_hour": end_hour,
                    "edge_overrides": edge_overrides,
                }
            )

        parsed_segments.sort(key=lambda item: item["start_hour"])
        if not parsed_segments:
            raise InvalidInputError("time_segments cannot be empty")

        tolerance = 1e-9
        if abs(parsed_segments[0]["start_hour"] - 0.0) > tolerance:
            raise InvalidInputError("time_segments must start at 0")

        for idx in range(1, len(parsed_segments)):
            previous = parsed_segments[idx - 1]
            current = parsed_segments[idx]
            if abs(current["start_hour"] - previous["end_hour"]) > tolerance:
                raise InvalidInputError("time_segments must be continuous")

        if abs(parsed_segments[-1]["end_hour"] - float(total_hours)) > tolerance:
            raise InvalidInputError("time_segments must cover total simulation hours")

        return parsed_segments

    def _resolve_parameter_names(
        self, input_data: MaterialBalanceInput, n_components: int
    ) -> List[str]:
        parameter_names = self._get_original_parameter_names(input_data)
        if len(parameter_names) < n_components:
            fallback_names = [
                f"concentration_{idx}" for idx in range(len(parameter_names), n_components)
            ]
            parameter_names = [*parameter_names, *fallback_names]
        return parameter_names[:n_components]

    def _resolve_segment_edge_values(
        self,
        input_data: MaterialBalanceInput,
        segment: Dict[str, Any],
        sparse_bundle: Optional[Dict[str, Any]],
        parameter_names: List[str],
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        n_edges = len(input_data.edges)
        if sparse_bundle is None or n_edges == 0:
            return (
                torch.empty(0, dtype=self.dtype, device=self.device),
                torch.empty(
                    (0, len(parameter_names)),
                    dtype=self.dtype,
                    device=self.device,
                ),
                torch.empty(
                    (0, len(parameter_names)),
                    dtype=self.dtype,
                    device=self.device,
                ),
            )

        q_vals = sparse_bundle["q"].clone()
        a_edge = sparse_bundle["a"].clone()
        b_edge = sparse_bundle["b"].clone()

        edge_overrides = segment.get("edge_overrides", {}) or {}
        if not edge_overrides:
            return sparse_bundle["q"], sparse_bundle["a"], sparse_bundle["b"]

        parameter_index_map = {name: idx for idx, name in enumerate(parameter_names)}
        for edge_index, edge in enumerate(input_data.edges):
            raw_override = edge_overrides.get(edge.edge_id)
            if raw_override is None:
                continue

            flow_override = (
                raw_override.get("flow")
                if isinstance(raw_override, dict)
                else getattr(raw_override, "flow", None)
            )
            if flow_override is not None:
                q_vals[edge_index] = float(flow_override)

            raw_factors = (
                raw_override.get("factors", {})
                if isinstance(raw_override, dict)
                else getattr(raw_override, "factors", {})
            ) or {}
            for param_name, raw_ab in raw_factors.items():
                component_index = parameter_index_map.get(str(param_name))
                if component_index is None:
                    continue
                factor_a = (
                    raw_ab.get("a")
                    if isinstance(raw_ab, dict)
                    else getattr(raw_ab, "a", None)
                )
                factor_b = (
                    raw_ab.get("b")
                    if isinstance(raw_ab, dict)
                    else getattr(raw_ab, "b", None)
                )
                if factor_a is not None:
                    a_edge[edge_index, component_index] = float(factor_a)
                if factor_b is not None:
                    b_edge[edge_index, component_index] = float(factor_b)

        return q_vals, a_edge, b_edge

    def _build_runtime_edge_tensors(
        self,
        tensors: Dict[str, torch.Tensor],
        q_vals: torch.Tensor,
        a_edge: torch.Tensor,
        b_edge: torch.Tensor,
    ) -> Tuple[torch.Tensor, Optional[torch.Tensor], Optional[torch.Tensor], Dict[str, Any]]:
        sparse_bundle = tensors.get("sparse_bundle", None)
        base_shape = tuple(tensors["Q_out"].shape)
        n_components = int(tensors.get("n_components", a_edge.shape[1] if a_edge.ndim == 2 else 0))
        if (
            sparse_bundle is not None
            and q_vals.numel() != 0
            and q_vals is sparse_bundle.get("q")
            and a_edge is sparse_bundle.get("a")
            and b_edge is sparse_bundle.get("b")
        ):
            return tensors["Q_out"], tensors["prop_a"], tensors["prop_b"], sparse_bundle

        if sparse_bundle is not None:
            runtime_sparse_bundle = {
                "src": sparse_bundle["src"],
                "dst": sparse_bundle["dst"],
                "q": q_vals,
                "a": a_edge,
                "b": b_edge,
                "shape": sparse_bundle["shape"],
            }
            return tensors["Q_out"], tensors["prop_a"], tensors["prop_b"], runtime_sparse_bundle

        if q_vals.numel() != 0:
            raise ValueError("Cannot rebuild dense edge tensors without sparse src/dst metadata")

        src = torch.empty(0, dtype=torch.long, device=self.device)
        dst = torch.empty(0, dtype=torch.long, device=self.device)
        Q_out, prop_a, prop_b = self._build_dense_transport_tensors(
            src=src,
            dst=dst,
            q_vals=q_vals,
            a_edge=a_edge,
            b_edge=b_edge,
            shape=base_shape,
            n_components=n_components,
        )

        runtime_sparse_bundle = {
            "src": src,
            "dst": dst,
            "q": q_vals,
            "a": a_edge,
            "b": b_edge,
            "shape": base_shape,
        }
        return Q_out, prop_a, prop_b, runtime_sparse_bundle

    def _build_dense_transport_tensors(
        self,
        *,
        src: torch.Tensor,
        dst: torch.Tensor,
        q_vals: torch.Tensor,
        a_edge: torch.Tensor,
        b_edge: torch.Tensor,
        shape: Tuple[int, int],
        n_components: int,
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        source_count, target_count = shape
        Q_out = torch.zeros(source_count, target_count, dtype=self.dtype, device=self.device)
        prop_a = torch.ones(
            source_count,
            target_count,
            n_components,
            dtype=self.dtype,
            device=self.device,
        )
        prop_b = torch.zeros(
            source_count,
            target_count,
            n_components,
            dtype=self.dtype,
            device=self.device,
        )

        if q_vals.numel() == 0:
            return Q_out, prop_a, prop_b

        Q_out.index_put_((src, dst), q_vals, accumulate=True)

        q_edge = q_vals.unsqueeze(1)
        weighted_a_sum = torch.zeros_like(prop_a)
        weighted_b_sum = torch.zeros_like(prop_b)
        weighted_a_sum.index_put_((src, dst), q_edge * a_edge, accumulate=True)
        weighted_b_sum.index_put_((src, dst), q_edge * b_edge, accumulate=True)

        active_pairs = Q_out != 0
        if active_pairs.any():
            q_pair = Q_out[active_pairs].unsqueeze(-1)
            prop_a[active_pairs] = weighted_a_sum[active_pairs] / q_pair
            prop_b[active_pairs] = weighted_b_sum[active_pairs] / q_pair

        return Q_out, prop_a, prop_b

    def _generate_segment_timestamps(
        self,
        hours: float,
        steps_per_hour: int,
        sampling_interval_hours: Optional[float],
    ) -> List[float]:
        total_steps = int(hours * steps_per_hour) + 1
        cpu_device = torch.device("cpu")
        full_timestamps = torch.linspace(0, hours, total_steps, device=cpu_device)
        if sampling_interval_hours is not None and sampling_interval_hours > 0:
            sampling_interval = int(sampling_interval_hours * steps_per_hour)
            if sampling_interval > 1:
                sample_indices = torch.arange(
                    0, total_steps, sampling_interval, device=cpu_device
                )
                if sample_indices[-1] != total_steps - 1:
                    sample_indices = torch.cat(
                        [
                            sample_indices,
                            torch.tensor([total_steps - 1], device=cpu_device),
                        ]
                    )
                return full_timestamps[sample_indices].cpu().numpy().tolist()
        return full_timestamps.cpu().numpy().tolist()

    def _build_parameter_change_events(
        self,
        at_hour: float,
        input_data: MaterialBalanceInput,
        parameter_names: List[str],
        previous_q: torch.Tensor,
        previous_a: torch.Tensor,
        previous_b: torch.Tensor,
        current_q: torch.Tensor,
        current_a: torch.Tensor,
        current_b: torch.Tensor,
    ) -> List[Dict[str, Any]]:
        events: List[Dict[str, Any]] = []
        tolerance = 1e-9

        for edge_index, edge in enumerate(input_data.edges):
            changed: List[str] = []
            if abs(float(previous_q[edge_index]) - float(current_q[edge_index])) > tolerance:
                changed.append("flow")

            for component_index, parameter_name in enumerate(parameter_names):
                if (
                    abs(
                        float(previous_a[edge_index, component_index])
                        - float(current_a[edge_index, component_index])
                    )
                    > tolerance
                ):
                    changed.append(f"{parameter_name}_a")
                if (
                    abs(
                        float(previous_b[edge_index, component_index])
                        - float(current_b[edge_index, component_index])
                    )
                    > tolerance
                ):
                    changed.append(f"{parameter_name}_b")

            if changed:
                events.append(
                    {
                        "atHour": float(at_hour),
                        "edgeId": edge.edge_id,
                        "changed": changed,
                    }
                )

        return events
    def _balance_param_sparse(
        self,
        C: torch.Tensor,                    # [m, r]
        bundle: dict                        # {'src','dst','q','a','b','shape'}
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        src = bundle["src"]                 # [E]
        dst = bundle["dst"]                 # [E]
        q   = bundle["q"]                   # [E]
        a   = bundle["a"]                   # [E, r]
        b   = bundle["b"]                   # [E, r]
        m, n = bundle["shape"]
        r = C.size(1)

        # 1) 杈逛笂璁＄畻 C_out 涓?m_edge锛堜笉鏋勯€?m脳n脳r锛?
        C_edge = C[src] * a + b             # [E, r]
        m_edge = q.unsqueeze(1) * C_edge    # [E, r]

        # 2) 鑱氬悎鍒扮粨鐐癸紙鍑?鎸?src 鑱氬悎锛涘叆=鎸?dst 鑱氬悎锛?
        device, dtype = C.device, C.dtype
        sum_m_out = torch.zeros((m, r), device=device, dtype=dtype).index_add_(0, src, m_edge)
        sum_m_in  = torch.zeros((n, r), device=device, dtype=dtype).index_add_(0, dst, m_edge)

        # 3) 璐ㄩ噺/浣撶Н骞宠　澧為噺
        delta_m = sum_m_in - sum_m_out      # [m, r]锛堥€氬父 m==n锛?
        sum_Q_out = torch.zeros(m, device=device, dtype=dtype).index_add_(0, src, q)
        sum_Q_in  = torch.zeros(n, device=device, dtype=dtype).index_add_(0, dst, q)
        delta_Q = sum_Q_in - sum_Q_out      # [m]

        return delta_m, delta_Q

    # Legacy wrappers kept for backward compatibility with existing call sites.
    def _asm1slim(self, ASMparam: torch.tensor, C0_matrix: torch.tensor):
        return asm1slim_reaction(ASMparam, C0_matrix)

    def _asm1(self, ASMparam: torch.tensor, C0_matrix: torch.tensor):  # type: ignore
        return asm1_reaction(ASMparam, C0_matrix)

    def _asm3(self, ASM3param: torch.tensor, C0_matrix: torch.tensor) -> torch.tensor:  # type: ignore
        return asm3_reaction(ASM3param, C0_matrix)

    def _asm2d_rates(self, P: torch.tensor, C: torch.tensor) -> torch.tensor:  # type: ignore
        return asm2d_rates(P, C)

    def _asm2d(self, P: torch.tensor, C: torch.tensor, stoich: torch.tensor) -> torch.tensor:
        return asm2d_dC_dt(P, C, stoich)

    def _balance_param(self, C: torch.Tensor, Q_out: torch.Tensor,
                      C_out_prop: torch.Tensor, prop_b: torch.Tensor) -> Tuple[torch.Tensor, ...]:
        """璁＄畻鐗╂枡骞宠　鍙傛暟銆?

        鏍规嵁褰撳墠娴撳害鍜屾祦閲忚绠楃墿鏂欏钩琛℃柟绋嬬殑鍙傛暟锛屽寘鎷細
        - 璐ㄩ噺鍙樺寲鐜?(delta_m)
        - 浣撶Н鍙樺寲鐜?(delta_Q)
        - 鍑哄彛娴撳害 (C_out)
        - 璐ㄩ噺娴侀噺 (m_out)

        Args:
            C: 褰撳墠娴撳害寮犻噺
            Q_out: 娴侀噺鐭╅樀
            C_out_prop: 娴撳害姣斾緥鍥犲瓙
            prop_b: 娴撳害鍋忕Щ鍥犲瓙

        Returns:
            鐗╂枡骞宠　鍙傛暟鐨勫厓缁?
        """
        source_count, target_count = Q_out.shape
        component_count = C.shape[1]

        if C.shape[0] != source_count:
            raise ValueError(
                "_balance_param expected C rows to match Q_out source dimension "
                f"({C.shape[0]} != {source_count})"
            )
        expected_factor_shape = (source_count, target_count, component_count)
        if tuple(C_out_prop.shape) != expected_factor_shape:
            raise ValueError(
                "_balance_param expected C_out_prop shape "
                f"{expected_factor_shape}, got {tuple(C_out_prop.shape)}"
            )
        if tuple(prop_b.shape) != expected_factor_shape:
            raise ValueError(
                "_balance_param expected prop_b shape "
                f"{expected_factor_shape}, got {tuple(prop_b.shape)}"
            )

        C_init = C.unsqueeze(1).expand(source_count, target_count, component_count)
        C_out = C_init * C_out_prop + prop_b
        q_out = Q_out.unsqueeze(-1)

        m_out = q_out * C_out
        sum_m_out = m_out.sum(dim=1).reshape(source_count, component_count)
        sum_m_in = m_out.sum(dim=0).reshape(target_count, component_count)
        if source_count != target_count:
            raise ValueError(
                "_balance_param requires square Q_out to compute node deltas "
                f"(sources={source_count}, targets={target_count})"
            )
        delta_m = sum_m_in - sum_m_out
        delta_Q = Q_out.sum(dim=0) - Q_out.sum(dim=1)

        return delta_m, delta_Q, C_out, m_out, sum_m_out

    def _ode_balance(self, t: float, y_extended: torch.Tensor, m: int, prop_a: torch.Tensor, prop_b: torch.Tensor,
                    Q_out: torch.Tensor, compute_mask: torch.Tensor, sparse_bundle: dict = None ) -> torch.Tensor:
        """鐗╂枡鍜屼綋绉钩琛＄殑ODE鍑芥暟銆?

        瀹氫箟寰垎鏂圭▼绯荤粺锛屾弿杩扮郴缁熶腑鍚勮妭鐐圭殑娴撳害鍜屼綋绉殢鏃堕棿鐨勫彉鍖栥€?
        璇ュ嚱鏁拌ODE姹傝В鍣ㄨ皟鐢ㄤ互璁＄畻瀵兼暟銆備娇鐢ㄦ帺鐮佽繘琛屽紶閲忓寲璁＄畻銆?
        鏀寔绋€鐤忕煩闃佃绠椼€?

        Args:
            t: 褰撳墠鏃堕棿
            y_extended: 鎵╁睍鐘舵€佸悜閲忥紙娴撳害+浣撶Н锛?
            m: 鑺傜偣鏁伴噺
            prop_a: 娴撳害姣斾緥鍥犲瓙
            prop_b: 娴撳害鍋忕Щ鍥犲瓙
            Q_out: 娴侀噺鐭╅樀
            compute_mask: 璁＄畻鎺╃爜锛孴rue琛ㄧず闇€瑕佽绠楃殑鑺傜偣

        Returns:
            鐘舵€佸悜閲忕殑鏃堕棿瀵兼暟
        """
        y = y_extended[:, :-1]  # Concentration matrix
        V_liq = y_extended[:, -1]  # Volume vector

        # Ensure non-negative values (clamp already prevents negative volumes)
        y = torch.clamp(y, min=0)
        V_liq = torch.clamp(V_liq, min=1e-6)  # Prevent zero volume

        if sparse_bundle is not None:
            delta_m, delta_Q = self._balance_param_sparse(y, sparse_bundle)
        else:
            # 鍏煎鍘熻嚧瀵嗗疄鐜?
            delta_m, delta_Q, *_ = self._balance_param(y, Q_out, prop_a, prop_b)[:2]

        dy_extended = torch.zeros_like(y_extended)

        # Apply material balance equations only to internal nodes (where mask is True)
        # Concentration changes
        dilution_term = -y * delta_Q.unsqueeze(-1) / V_liq.unsqueeze(-1)
        concentration_change = delta_m / V_liq.unsqueeze(-1) + dilution_term

        # Apply mask: only update internal nodes
        mask_expanded = compute_mask.unsqueeze(-1).expand_as(concentration_change)
        dy_extended[:, :-1] = torch.where(mask_expanded, concentration_change, torch.zeros_like(concentration_change))

        # Volume changes: only for internal nodes
        dy_extended[:, -1] = torch.where(compute_mask, delta_Q, torch.zeros_like(delta_Q))

        return dy_extended

    def _asm1slim_ode_balance(self, t: float, y_extended: torch.Tensor, m: int, prop_a: torch.Tensor, prop_b: torch.Tensor,

                    Q_out: torch.Tensor, compute_mask: torch.Tensor, asm1slim_params: torch.Tensor, asm1slim_mask: torch.Tensor, sparse_bundle: dict = None,
                    asm1slim_reaction_runtime: Dict[str, torch.Tensor] | None = None ) -> torch.Tensor:


        """鐗╂枡鍜屼綋绉钩琛＄殑ODE鍑芥暟銆?

        瀹氫箟寰垎鏂圭▼绯荤粺锛屾弿杩扮郴缁熶腑鍚勮妭鐐圭殑娴撳害鍜屼綋绉殢鏃堕棿鐨勫彉鍖栥€?
        璇ュ嚱鏁拌ODE姹傝В鍣ㄨ皟鐢ㄤ互璁＄畻瀵兼暟銆備娇鐢ㄦ帺鐮佽繘琛屽紶閲忓寲璁＄畻銆?
        鏀寔绋€鐤忕煩闃佃绠椼€?

        Args:
            t: 褰撳墠鏃堕棿
            y_extended: 鎵╁睍鐘舵€佸悜閲忥紙娴撳害+浣撶Н锛?
            m: 鑺傜偣鏁伴噺
            prop_a: 娴撳害姣斾緥鍥犲瓙
            prop_b: 娴撳害鍋忕Щ鍥犲瓙
            Q_out: 娴侀噺鐭╅樀
            compute_mask: 璁＄畻鎺╃爜锛孴rue琛ㄧず闇€瑕佽绠楃殑鑺傜偣

        Returns:
            鐘舵€佸悜閲忕殑鏃堕棿瀵兼暟
        """
        y = y_extended[:, :-1]  # Concentration matrix
        V_liq = y_extended[:, -1]  # Volume vector

        # Ensure non-negative values (clamp already prevents negative volumes)
        y = torch.clamp(y, min=0)
        V_liq = torch.clamp(V_liq, min=1e-6)  # Prevent zero volume

        if sparse_bundle is not None:
            delta_m, delta_Q = self._balance_param_sparse(y, sparse_bundle)
        else:
            # 鍏煎鍘熻嚧瀵嗗疄鐜?
            delta_m, delta_Q, *_ = self._balance_param(y, Q_out, prop_a, prop_b)[:2]

        dy_extended = torch.zeros_like(y_extended)

        # Apply material balance equations only to internal nodes (where mask is True)
        # Concentration changes
        dilution_term = -y * delta_Q.unsqueeze(-1) / V_liq.unsqueeze(-1)
        concentration_change = delta_m / V_liq.unsqueeze(-1) + dilution_term

        reaction_runtime = self._resolve_active_reaction_runtime(
            asm1slim_reaction_runtime,
            asm1slim_mask,
            compute_mask,
            asm1slim_params,
        )
        self._apply_asm_reaction_runtime(
            concentration_change,
            y,
            reaction_runtime,
            asm1slim_reaction,
            oxygen_index=ASM_COMPONENT_CONTRACTS["asm1slim"]["oxygen_index"],
        )


        # Apply mask: only update internal nodes
        mask_expanded = compute_mask.unsqueeze(-1).expand_as(concentration_change)
        dy_extended[:, :-1] = torch.where(mask_expanded, concentration_change, torch.zeros_like(concentration_change))

        # Volume changes: only for internal nodes
        dy_extended[:, -1] = torch.where(compute_mask, delta_Q, torch.zeros_like(delta_Q))

        return dy_extended

    def _asm1_ode_balance(self, t: float, y_extended: torch.Tensor, m: int, prop_a: torch.Tensor, prop_b: torch.Tensor,

                    Q_out: torch.Tensor, compute_mask: torch.Tensor, asm1_params: torch.Tensor, asm1_mask: torch.Tensor, sparse_bundle: dict = None,
                    asm1_reaction_runtime: Dict[str, torch.Tensor] | None = None ) -> torch.Tensor:


        """鐗╂枡鍜屼綋绉钩琛＄殑ODE鍑芥暟銆?

        瀹氫箟寰垎鏂圭▼绯荤粺锛屾弿杩扮郴缁熶腑鍚勮妭鐐圭殑娴撳害鍜屼綋绉殢鏃堕棿鐨勫彉鍖栥€?
        璇ュ嚱鏁拌ODE姹傝В鍣ㄨ皟鐢ㄤ互璁＄畻瀵兼暟銆備娇鐢ㄦ帺鐮佽繘琛屽紶閲忓寲璁＄畻銆?
        鏀寔绋€鐤忕煩闃佃绠椼€?

        Args:
            t: 褰撳墠鏃堕棿
            y_extended: 鎵╁睍鐘舵€佸悜閲忥紙娴撳害+浣撶Н锛?
            m: 鑺傜偣鏁伴噺
            prop_a: 娴撳害姣斾緥鍥犲瓙
            prop_b: 娴撳害鍋忕Щ鍥犲瓙
            Q_out: 娴侀噺鐭╅樀
            compute_mask: 璁＄畻鎺╃爜锛孴rue琛ㄧず闇€瑕佽绠楃殑鑺傜偣

        Returns:
            鐘舵€佸悜閲忕殑鏃堕棿瀵兼暟
        """
        y = y_extended[:, :-1]  # Concentration matrix
        V_liq = y_extended[:, -1]  # Volume vector

        # Ensure non-negative values (clamp already prevents negative volumes)
        y = torch.clamp(y, min=0)
        V_liq = torch.clamp(V_liq, min=1e-6)  # Prevent zero volume

        if sparse_bundle is not None:
            delta_m, delta_Q = self._balance_param_sparse(y, sparse_bundle)
        else:
            # 鍏煎鍘熻嚧瀵嗗疄鐜?
            delta_m, delta_Q, *_ = self._balance_param(y, Q_out, prop_a, prop_b)[:2]

        dy_extended = torch.zeros_like(y_extended)

        # Apply material balance equations only to internal nodes (where mask is True)
        # Concentration changes
        dilution_term = -y * delta_Q.unsqueeze(-1) / V_liq.unsqueeze(-1)
        concentration_change = delta_m / V_liq.unsqueeze(-1) + dilution_term

        reaction_runtime = self._resolve_active_reaction_runtime(
            asm1_reaction_runtime,
            asm1_mask,
            compute_mask,
            asm1_params,
        )
        self._apply_asm_reaction_runtime(
            concentration_change,
            y,
            reaction_runtime,
            asm1_reaction,
            oxygen_index=ASM_COMPONENT_CONTRACTS["asm1"]["oxygen_index"],
        )


        # Apply mask: only update internal nodes
        mask_expanded = compute_mask.unsqueeze(-1).expand_as(concentration_change)
        dy_extended[:, :-1] = torch.where(mask_expanded, concentration_change, torch.zeros_like(concentration_change))

        # Volume changes: only for internal nodes
        dy_extended[:, -1] = torch.where(compute_mask, delta_Q, torch.zeros_like(delta_Q))

        return dy_extended

    def _asm3_ode_balance(self, t: float, y_extended: torch.Tensor, m: int, prop_a: torch.Tensor, prop_b: torch.Tensor,

                    Q_out: torch.Tensor, compute_mask: torch.Tensor, asm3_params: torch.Tensor, asm3_mask: torch.Tensor, sparse_bundle: dict = None,
                    asm3_reaction_runtime: Dict[str, torch.Tensor] | None = None ) -> torch.Tensor:


        """鐗╂枡鍜屼綋绉钩琛＄殑ODE鍑芥暟銆?

        瀹氫箟寰垎鏂圭▼绯荤粺锛屾弿杩扮郴缁熶腑鍚勮妭鐐圭殑娴撳害鍜屼綋绉殢鏃堕棿鐨勫彉鍖栥€?
        璇ュ嚱鏁拌ODE姹傝В鍣ㄨ皟鐢ㄤ互璁＄畻瀵兼暟銆備娇鐢ㄦ帺鐮佽繘琛屽紶閲忓寲璁＄畻銆?
        鏀寔绋€鐤忕煩闃佃绠椼€?

        Args:
            t: 褰撳墠鏃堕棿
            y_extended: 鎵╁睍鐘舵€佸悜閲忥紙娴撳害+浣撶Н锛?
            m: 鑺傜偣鏁伴噺
            prop_a: 娴撳害姣斾緥鍥犲瓙
            prop_b: 娴撳害鍋忕Щ鍥犲瓙
            Q_out: 娴侀噺鐭╅樀
            compute_mask: 璁＄畻鎺╃爜锛孴rue琛ㄧず闇€瑕佽绠楃殑鑺傜偣

        Returns:
            鐘舵€佸悜閲忕殑鏃堕棿瀵兼暟
        """
        y = y_extended[:, :-1]  # Concentration matrix
        V_liq = y_extended[:, -1]  # Volume vector

        # Ensure non-negative values (clamp already prevents negative volumes)
        y = torch.clamp(y, min=0)
        V_liq = torch.clamp(V_liq, min=1e-6)  # Prevent zero volume

        if sparse_bundle is not None:
            delta_m, delta_Q = self._balance_param_sparse(y, sparse_bundle)
        else:
            # 鍏煎鍘熻嚧瀵嗗疄鐜?
            delta_m, delta_Q, *_ = self._balance_param(y, Q_out, prop_a, prop_b)[:2]

        dy_extended = torch.zeros_like(y_extended)

        # Apply material balance equations only to internal nodes (where mask is True)
        # Concentration changes
        dilution_term = -y * delta_Q.unsqueeze(-1) / V_liq.unsqueeze(-1)
        concentration_change = delta_m / V_liq.unsqueeze(-1) + dilution_term

        reaction_runtime = self._resolve_active_reaction_runtime(
            asm3_reaction_runtime,
            asm3_mask,
            compute_mask,
            asm3_params,
        )
        self._apply_asm_reaction_runtime(
            concentration_change,
            y,
            reaction_runtime,
            asm3_reaction,
            oxygen_index=ASM_COMPONENT_CONTRACTS["asm3"]["oxygen_index"],
        )


        # Apply mask: only update internal nodes
        mask_expanded = compute_mask.unsqueeze(-1).expand_as(concentration_change)
        dy_extended[:, :-1] = torch.where(mask_expanded, concentration_change, torch.zeros_like(concentration_change))

        # Volume changes: only for internal nodes
        dy_extended[:, -1] = torch.where(compute_mask, delta_Q, torch.zeros_like(delta_Q))

        return dy_extended

    def _combined_reaction_ode_balance(
        self,
        t: float,
        y_extended: torch.Tensor,
        m: int,
        prop_a: torch.Tensor,
        prop_b: torch.Tensor,
        Q_out: torch.Tensor,
        compute_mask: torch.Tensor,
        asm1slim_params: torch.Tensor | None = None,
        asm1slim_mask: torch.Tensor | None = None,
        asm1_params: torch.Tensor | None = None,
        asm1_mask: torch.Tensor | None = None,
        asm3_params: torch.Tensor | None = None,
        asm3_mask: torch.Tensor | None = None,
        asm1slim_reaction_runtime: Dict[str, torch.Tensor] | None = None,
        asm1_reaction_runtime: Dict[str, torch.Tensor] | None = None,
        asm3_reaction_runtime: Dict[str, torch.Tensor] | None = None,
        udm_runtime_payload: List[UDMNodeRuntime] | None = None,
        udm_active_node_indices: set[int] | None = None,
        sparse_bundle: dict | None = None,
    ) -> torch.Tensor:
        _ = t
        _ = m
        y = y_extended[:, :-1]
        V_liq = y_extended[:, -1]

        y = torch.clamp(y, min=0)
        V_liq = torch.clamp(V_liq, min=1e-6)

        if sparse_bundle is not None:
            delta_m, delta_Q = self._balance_param_sparse(y, sparse_bundle)
        else:
            delta_m, delta_Q = self._balance_param(y, Q_out, prop_a, prop_b)[:2]

        dilution_term = -y * delta_Q.unsqueeze(-1) / V_liq.unsqueeze(-1)
        concentration_change = delta_m / V_liq.unsqueeze(-1) + dilution_term

        self._apply_asm_reaction_runtime(
            concentration_change,
            y,
            self._resolve_active_reaction_runtime(
                asm1slim_reaction_runtime,
                asm1slim_mask,
                compute_mask,
                asm1slim_params,
            ),
            asm1slim_reaction,
            oxygen_index=ASM_COMPONENT_CONTRACTS["asm1slim"]["oxygen_index"],
        )
        self._apply_asm_reaction_runtime(
            concentration_change,
            y,
            self._resolve_active_reaction_runtime(
                asm1_reaction_runtime,
                asm1_mask,
                compute_mask,
                asm1_params,
            ),
            asm1_reaction,
            oxygen_index=ASM_COMPONENT_CONTRACTS["asm1"]["oxygen_index"],
        )
        self._apply_asm_reaction_runtime(
            concentration_change,
            y,
            self._resolve_active_reaction_runtime(
                asm3_reaction_runtime,
                asm3_mask,
                compute_mask,
                asm3_params,
            ),
            asm3_reaction,
            oxygen_index=ASM_COMPONENT_CONTRACTS["asm3"]["oxygen_index"],
        )

        if udm_runtime_payload:
            for runtime in udm_runtime_payload:
                node_idx = runtime.node_index
                if node_idx < 0 or node_idx >= y.shape[0]:
                    continue
                if (
                    udm_active_node_indices is not None
                    and node_idx not in udm_active_node_indices
                ):
                    continue
                reaction = runtime.evaluate_reaction(y[node_idx])
                concentration_change[node_idx, :] = (
                    concentration_change[node_idx, :] + reaction
                )

            for runtime in udm_runtime_payload:
                node_idx = runtime.node_index
                if node_idx < 0 or node_idx >= concentration_change.shape[0]:
                    continue
                if (
                    udm_active_node_indices is not None
                    and node_idx not in udm_active_node_indices
                ):
                    continue
                if runtime.has_fixed_components:
                    concentration_change[node_idx, runtime.fixed_component_indices] = 0.0

        dy_extended = torch.zeros_like(y_extended)
        mask_expanded = compute_mask.unsqueeze(-1).expand_as(concentration_change)
        dy_extended[:, :-1] = torch.where(
            mask_expanded,
            concentration_change,
            torch.zeros_like(concentration_change),
        )
        dy_extended[:, -1] = torch.where(compute_mask, delta_Q, torch.zeros_like(delta_Q))
        return dy_extended

    def _sample_solver_output(
        self,
        x: torch.Tensor,
        steps: int,
        sampling_interval_hours: float | None,
    ) -> torch.Tensor:
        if sampling_interval_hours is not None and sampling_interval_hours > 0:
            sampling_interval = int(sampling_interval_hours * steps)
            if sampling_interval > 1:
                sample_indices = list(range(0, x.shape[0], sampling_interval))
                if sample_indices[-1] != x.shape[0] - 1:
                    sample_indices.append(x.shape[0] - 1)
                sample_index_tensor = torch.tensor(
                    sample_indices,
                    dtype=torch.long,
                    device=x.device,
                )
                x = x.index_select(0, sample_index_tensor)
        return x

    def _output_sample_indices(
        self,
        hours: float,
        steps: int,
        sampling_interval_hours: float | None,
    ) -> List[int] | None:
        if sampling_interval_hours is None or sampling_interval_hours <= 0:
            return None

        sampling_interval = int(sampling_interval_hours * steps)
        if sampling_interval <= 1:
            return None

        total_points = int(hours * steps) + 1
        sample_indices = list(range(0, total_points, sampling_interval))
        if sample_indices[-1] != total_points - 1:
            sample_indices.append(total_points - 1)
        return sample_indices

    def _time_values_from_sample_indices(
        self,
        hours: float,
        steps: int,
        sample_indices: List[int],
    ) -> List[float]:
        total_intervals = int(hours * steps)
        if total_intervals <= 0:
            return [0.0]

        values = [
            float(hours) * sample_index / total_intervals
            for sample_index in sample_indices
        ]
        values[-1] = float(hours)
        return values

    def _time_grid_from_values(self, values: List[float]) -> torch.Tensor:
        return torch.tensor(values, device=self.device)

    def _full_solver_time_grid(self, hours: float, steps: int) -> torch.Tensor:
        return torch.linspace(0, hours, int(hours * steps) + 1, device=self.device)

    def _solve_sampled_rk4_output(
        self,
        ode_modified: Any,
        x0: torch.Tensor,
        hours: float,
        steps: int,
        sample_indices: List[int],
        tolerance: float,
        clamp_output: bool,
    ) -> torch.Tensor:
        sample_times = self._time_values_from_sample_indices(hours, steps, sample_indices)
        current_state = x0
        outputs = [torch.clamp(x0, min=0) if clamp_output else x0]
        previous_index = sample_indices[0]
        previous_time = sample_times[0]

        for sample_index, sample_time in zip(sample_indices[1:], sample_times[1:]):
            interval_steps = sample_index - previous_index
            if interval_steps <= 0:
                continue

            t0 = torch.linspace(
                previous_time,
                sample_time,
                interval_steps + 1,
                device=self.device,
            )
            chunk = odeint(
                ode_modified,
                current_state,
                t0,
                method="rk4",
                rtol=tolerance,
                atol=tolerance,
            )
            current_state = chunk[-1]
            outputs.append(
                torch.clamp(current_state, min=0) if clamp_output else current_state
            )
            previous_index = sample_index
            previous_time = sample_time

        return torch.stack(outputs, dim=0)

    def _solve_ode_output(
        self,
        ode_modified: Any,
        x0: torch.Tensor,
        hours: float,
        steps: int,
        method: str,
        tolerance: float,
        sampling_interval_hours: float | None,
        clamp_output: bool,
    ) -> torch.Tensor:
        sample_indices = self._output_sample_indices(
            hours,
            steps,
            sampling_interval_hours,
        )
        if sample_indices is not None and method in {
            "scipy_solver",
            "adaptive_heun",
            "dopri5",
        }:
            sample_times = self._time_values_from_sample_indices(
                hours,
                steps,
                sample_indices,
            )
            t0 = self._time_grid_from_values(sample_times)
            x = odeint(ode_modified, x0, t0, method=method, rtol=tolerance, atol=tolerance)
            return torch.clamp(x, min=0) if clamp_output else x

        if sample_indices is not None and method == "rk4":
            return self._solve_sampled_rk4_output(
                ode_modified=ode_modified,
                x0=x0,
                hours=hours,
                steps=steps,
                sample_indices=sample_indices,
                tolerance=tolerance,
                clamp_output=clamp_output,
            )

        t0 = self._full_solver_time_grid(hours, steps)
        x = odeint(ode_modified, x0, t0, method=method, rtol=tolerance, atol=tolerance)
        if clamp_output:
            x = torch.clamp(x, min=0)
        return self._sample_solver_output(x, steps, sampling_interval_hours)

    def _run_hours(self, hours: float, x0: torch.Tensor, Q_out: torch.Tensor,
                  m: int, steps: int, prop_a: torch.Tensor, prop_b: torch.Tensor,
                  method: str = 'rk4', tolerance: float = 1e-3,
                  compute_mask: torch.Tensor = None, asm1slim_params: torch.Tensor = None,
                  asm1slim_mask: torch.Tensor = None, sparse_bundle: dict = None,
                  asm1_params: torch.Tensor = None, asm1_mask: torch.Tensor = None,
                  asm3_params: torch.Tensor = None, asm3_mask: torch.Tensor = None,
                  udm_mask: torch.Tensor = None,
                  udm_runtime_payload: List[UDMNodeRuntime] = None,
                  udm_active_node_indices: set[int] = None,
                  asm1slim_reaction_runtime: Dict[str, torch.Tensor] | None = None,
                  asm1_reaction_runtime: Dict[str, torch.Tensor] | None = None,
                  asm3_reaction_runtime: Dict[str, torch.Tensor] | None = None,
                  sampling_interval_hours: float = None) -> torch.Tensor:

        """杩愯鎸囧畾灏忔椂鏁扮殑妯℃嫙銆?

        浣跨敤ODE姹傝В鍣ㄥ湪鎸囧畾鏃堕棿鑼冨洿鍐呮眰瑙ｅ井鍒嗘柟绋嬬郴缁熴€?

        Args:
            hours: 妯℃嫙鏃堕棿锛堝皬鏃讹級
            x0: 鍒濆鐘舵€?
            Q_out: 娴侀噺鐭╅樀
            m: 鑺傜偣鏁伴噺
            steps: 姣忓皬鏃剁殑姝ユ暟
            prop_a: 娴撳害姣斾緥鍥犲瓙
            prop_b: 娴撳害鍋忕Щ鍥犲瓙
            method: 姹傝В鍣ㄦ柟娉?
            tolerance: 姹傝В绮惧害
            compute_mask: 璁＄畻鎺╃爜锛孴rue琛ㄧず闇€瑕佽绠楃殑鑺傜偣
            asm1slim_params: ASM1 Slim 鍙傛暟
            asm1slim_mask: ASM1 Slim 鑺傜偣鎺╃爜
            asm1_params: ASM1 鍙傛暟
            asm1_mask: ASM1 鑺傜偣鎺╃爜
            asm3_params: ASM3 鍙傛暟
            asm3_mask: ASM3 鑺傜偣鎺╃爜
            sparse_bundle: 绋€鐤忕煩闃垫潫
            udm_mask: UDM 鑺傜偣鎺╃爜
            udm_runtime_payload: UDM 杩愯鏃惰浇鑽?
        Returns:
            鏃堕棿搴忓垪缁撴灉寮犻噺
        """
        # 纭繚鎺╃爜瀛樺湪锛岃繖鏄繀闇€鐨勫弬鏁?
        if compute_mask is None:
            raise ValueError("compute_mask is required and cannot be None")

        x0 = x0[-1, :]

        active_asm1slim_runtime = self._resolve_active_reaction_runtime(
            asm1slim_reaction_runtime,
            asm1slim_mask,
            compute_mask,
            asm1slim_params,
        )
        active_asm1_runtime = self._resolve_active_reaction_runtime(
            asm1_reaction_runtime,
            asm1_mask,
            compute_mask,
            asm1_params,
        )
        active_asm3_runtime = self._resolve_active_reaction_runtime(
            asm3_reaction_runtime,
            asm3_mask,
            compute_mask,
            asm3_params,
        )
        active_udm_node_indices: set[int] = set()
        if udm_mask is not None and udm_runtime_payload:
            active_udm_mask = udm_mask & compute_mask
            active_udm_node_indices = {
                int(index)
                for index in torch.nonzero(active_udm_mask, as_tuple=False)
                .flatten()
                .detach()
                .cpu()
                .tolist()
            }
            if udm_active_node_indices is not None:
                active_udm_node_indices &= set(udm_active_node_indices)

        active_model_count = sum(
            [
                active_asm1slim_runtime is not None,
                active_asm1_runtime is not None,
                active_asm3_runtime is not None,
                bool(active_udm_node_indices),
            ]
        )

        if active_model_count > 1:
            ode_modified = functools.partial(
                self._combined_reaction_ode_balance,
                Q_out=Q_out,
                m=m,
                prop_a=prop_a,
                prop_b=prop_b,
                compute_mask=compute_mask,
                asm1slim_params=asm1slim_params,
                asm1slim_mask=(
                    active_asm1slim_runtime["mask"]
                    if active_asm1slim_runtime is not None
                    else None
                ),
                asm1slim_reaction_runtime=active_asm1slim_runtime,
                asm1_params=asm1_params,
                asm1_mask=(
                    active_asm1_runtime["mask"]
                    if active_asm1_runtime is not None
                    else None
                ),
                asm1_reaction_runtime=active_asm1_runtime,
                asm3_params=asm3_params,
                asm3_mask=(
                    active_asm3_runtime["mask"]
                    if active_asm3_runtime is not None
                    else None
                ),
                asm3_reaction_runtime=active_asm3_runtime,
                udm_runtime_payload=udm_runtime_payload,
                udm_active_node_indices=active_udm_node_indices,
                sparse_bundle=sparse_bundle,
            )
            try:
                return self._solve_ode_output(
                    ode_modified=ode_modified,
                    x0=x0,
                    hours=hours,
                    steps=steps,
                    method=method,
                    tolerance=tolerance,
                    sampling_interval_hours=sampling_interval_hours,
                    clamp_output=True,
                )
            except Exception as e:
                raise ConvergenceError(f"ODE solver failed to converge: {str(e)}") from e

        if asm1slim_params is not None and asm1slim_mask.any():

            ode_modified = functools.partial(
                self._asm1slim_ode_balance,
                Q_out=Q_out, m=m, prop_a=prop_a, prop_b=prop_b,
                compute_mask=compute_mask,
                asm1slim_params=asm1slim_params,
                asm1slim_mask=asm1slim_mask,
                asm1slim_reaction_runtime=active_asm1slim_runtime,
                sparse_bundle=sparse_bundle
            )
            try:
                return self._solve_ode_output(
                    ode_modified=ode_modified,
                    x0=x0,
                    hours=hours,
                    steps=steps,
                    method=method,
                    tolerance=tolerance,
                    sampling_interval_hours=sampling_interval_hours,
                    clamp_output=True,
                )
            except Exception as e:
                raise ConvergenceError(f"ODE solver failed to converge: {str(e)}") from e

        elif asm1_params is not None and asm1_mask.any():
            ode_modified = functools.partial(
                self._asm1_ode_balance,
                Q_out=Q_out, m=m, prop_a=prop_a, prop_b=prop_b,
                compute_mask=compute_mask,
                asm1_params=asm1_params,
                asm1_mask=asm1_mask,
                asm1_reaction_runtime=active_asm1_runtime,
                sparse_bundle=sparse_bundle
            )
            try:
                return self._solve_ode_output(
                    ode_modified=ode_modified,
                    x0=x0,
                    hours=hours,
                    steps=steps,
                    method=method,
                    tolerance=tolerance,
                    sampling_interval_hours=sampling_interval_hours,
                    clamp_output=True,
                )
            except Exception as e:
                raise ConvergenceError(f"ODE solver failed to converge: {str(e)}") from e

        elif asm3_params is not None and asm3_mask.any():
            ode_modified = functools.partial(
                self._asm3_ode_balance,
                Q_out=Q_out, m=m, prop_a=prop_a, prop_b=prop_b,
                compute_mask=compute_mask,
                asm3_params=asm3_params,
                asm3_mask=asm3_mask,
                asm3_reaction_runtime=active_asm3_runtime,
                sparse_bundle=sparse_bundle
            )
            try:
                return self._solve_ode_output(
                    ode_modified=ode_modified,
                    x0=x0,
                    hours=hours,
                    steps=steps,
                    method=method,
                    tolerance=tolerance,
                    sampling_interval_hours=sampling_interval_hours,
                    clamp_output=True,
                )
            except Exception as e:
                raise ConvergenceError(f"ODE solver failed to converge: {str(e)}") from e

        elif udm_mask is not None and udm_mask.any() and udm_runtime_payload:
            ode_modified = functools.partial(
                udm_ode_balance,
                Q_out=Q_out,
                m=m,
                prop_a=prop_a,
                prop_b=prop_b,
                compute_mask=compute_mask,
                udm_mask=udm_mask,
                udm_runtime_payload=udm_runtime_payload,
                udm_active_node_indices=udm_active_node_indices,
                sparse_bundle=sparse_bundle,
                balance_param=self._balance_param,
                balance_param_sparse=self._balance_param_sparse,
            )
            try:
                return self._solve_ode_output(
                    ode_modified=ode_modified,
                    x0=x0,
                    hours=hours,
                    steps=steps,
                    method=method,
                    tolerance=tolerance,
                    sampling_interval_hours=sampling_interval_hours,
                    clamp_output=True,
                )
            except Exception as e:
                raise ConvergenceError(f"ODE solver failed to converge: {str(e)}") from e

        else:

            ode_modified = functools.partial(
                self._ode_balance,
                Q_out=Q_out, m=m, prop_a=prop_a, prop_b=prop_b,
                compute_mask=compute_mask,
                sparse_bundle=sparse_bundle
            )

            try:
                return self._solve_ode_output(
                    ode_modified=ode_modified,
                    x0=x0,
                    hours=hours,
                    steps=steps,
                    method=method,
                    tolerance=tolerance,
                    sampling_interval_hours=sampling_interval_hours,
                    clamp_output=False,
                )
            except Exception as e:
                raise ConvergenceError(f"ODE solver failed to converge: {str(e)}") from e

    def _merge_tensors(self, V_liq: torch.Tensor, x0: torch.Tensor) -> torch.Tensor:
        """鍚堝苟浣撶Н鍜屾祿搴﹀紶閲忋€?

        灏嗕綋绉拰娴撳害寮犻噺鍚堝苟涓哄崟涓€鐨勭姸鎬佸悜閲忥紝鐢ㄤ簬ODE姹傝В銆?

        Args:
            V_liq: 浣撶Н寮犻噺
            x0: 娴撳害寮犻噺

        Returns:
            鍚堝苟鍚庣殑鐘舵€佸紶閲?
        """
        V_liq_expanded = V_liq.unsqueeze(1)
        merged = torch.cat([x0, V_liq_expanded], dim=1)
        return merged

    def _split_tensors(self, merged: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """灏嗗悎骞剁殑寮犻噺鍒嗙涓烘祿搴﹀拰浣撶Н寮犻噺銆?

        灏哋DE姹傝В缁撴灉鍒嗙涓烘祿搴﹀拰浣撶Н涓や釜鐙珛鐨勫紶閲忋€?

        Args:
            merged: 鍚堝苟鐨勭姸鎬佸紶閲?

        Returns:
            娴撳害寮犻噺鍜屼綋绉紶閲忕殑鍏冪粍
        """
        # For 3D tensor (time_steps, nodes, features), split along the last dimension
        if len(merged.shape) == 3:
            x0 = merged[:, :, :-1]  # All except last feature (concentrations)
            V_liq = merged[:, :, -1]  # Last feature (volumes)
        else:
            # For 2D tensor (nodes, features)
            x0 = merged[:, :-1]
            V_liq = merged[:, -1]
        return x0, V_liq

    def _convert_results(
        self,
        calculation_output: Dict[str, Any],
        input_data: MaterialBalanceInput,
        job_id: str,
        start_time: float,
    ) -> MaterialBalanceResult:
        """Convert tensor results to structured output."""
        result_tensor = calculation_output["result_tensor"]

        concentrations, volumes = self._split_tensors(result_tensor)

        timestamps = calculation_output.get("timestamps")
        n_steps = result_tensor.shape[0]
        if not isinstance(timestamps, list) or len(timestamps) != n_steps:
            sampling_interval_hours = getattr(
                input_data.parameters, "sampling_interval_hours", None
            )
            if sampling_interval_hours is not None and sampling_interval_hours > 0:
                original_steps = (
                    int(input_data.parameters.hours * input_data.parameters.steps_per_hour)
                    + 1
                )
                sampling_interval = int(
                    sampling_interval_hours * input_data.parameters.steps_per_hour
                )

                if sampling_interval > 1:
                    sample_indices = torch.arange(0, original_steps, sampling_interval)
                    if sample_indices[-1] != original_steps - 1:
                        sample_indices = torch.cat(
                            [sample_indices, torch.tensor([original_steps - 1])]
                        )

                    original_timestamps = torch.linspace(
                        0, input_data.parameters.hours, original_steps
                    )
                    timestamps = original_timestamps[sample_indices].cpu().numpy().tolist()
                else:
                    timestamps = torch.linspace(
                        0, input_data.parameters.hours, n_steps, device=self.device
                    ).cpu().numpy().tolist()
            else:
                timestamps = torch.linspace(
                    0, input_data.parameters.hours, n_steps, device=self.device
                ).cpu().numpy().tolist()

        concentrations_np = concentrations.cpu().numpy()
        volumes_np = volumes.cpu().numpy()

        node_data = {}
        original_param_names = self._get_original_parameter_names(input_data)
        node_labels = self._get_node_labels(input_data)

        for i, node in enumerate(input_data.nodes):
            if i < volumes_np.shape[1]:
                volume_data = volumes_np[:, i].tolist()
            else:
                volume_data = [node.initial_volume] * len(timestamps)

            if i < concentrations_np.shape[1]:
                if len(concentrations_np.shape) > 2:
                    concentration_dict = {}
                    for j in range(concentrations_np.shape[2]):
                        param_name = (
                            original_param_names[j]
                            if j < len(original_param_names)
                            else f"concentration_{j}"
                        )
                        concentration_dict[param_name] = concentrations_np[:, i, j].tolist()
                else:
                    param_name = (
                        original_param_names[0]
                        if original_param_names
                        else "concentration_0"
                    )
                    concentration_dict = {param_name: concentrations_np[:, i].tolist()}
            else:
                concentration_dict = {}
                for j in range(len(node.initial_concentrations)):
                    param_name = (
                        original_param_names[j]
                        if j < len(original_param_names)
                        else f"concentration_{j}"
                    )
                    concentration_dict[param_name] = [
                        node.initial_concentrations[j]
                    ] * len(timestamps)

            node_label = node_labels.get(node.node_id, node.node_id)
            node_data[node.node_id] = {
                "label": node_label,
                "volume": volume_data,
                **concentration_dict,
            }

        edge_data = {}
        edge_flow_series = calculation_output.get("edge_flow_series") or {}
        for edge in input_data.edges:
            flow_series = edge_flow_series.get(edge.edge_id)
            if not isinstance(flow_series, list) or len(flow_series) != len(timestamps):
                flow_series = [edge.flow_rate] * len(timestamps)
            edge_data[edge.edge_id] = {
                "flow_rate": flow_series,
            }

        segment_markers = calculation_output.get("segment_markers") or []
        parameter_change_events = calculation_output.get("parameter_change_events") or []

        calculation_time = time.time() - start_time
        final_volumes = volumes_np[-1, :]

        mass_balance_component_errors = self._calculate_mass_balance_component_errors(
            result_tensor,
            input_data,
            timestamps=timestamps,
            edge_flow_series=edge_flow_series,
            edge_flow_interval_series=calculation_output.get("edge_flow_interval_series"),
            edge_factor_a_interval_series=calculation_output.get("edge_factor_a_interval_series"),
            edge_factor_b_interval_series=calculation_output.get("edge_factor_b_interval_series"),
        )
        mass_balance_error = max(
            (abs(value) for value in mass_balance_component_errors),
            default=0.0,
        )

        summary = {
            "total_time": input_data.parameters.hours,
            "total_steps": n_steps,
            "calculation_time_seconds": calculation_time,
            "convergence_status": "converged",
            "final_mass_balance_error": mass_balance_error,
            "mass_balance_component_errors": mass_balance_component_errors,
            "final_total_volume": float(final_volumes.sum()),
            "solver_method": input_data.parameters.solver_method,
            "segment_count": len(getattr(input_data, "time_segments", [])) or 1,
            "parameter_change_event_count": len(parameter_change_events),
        }

        return MaterialBalanceResult(
            job_id=job_id,
            status="success",
            timestamps=timestamps,
            node_data=node_data,
            edge_data=edge_data,
            segment_markers=segment_markers,
            parameter_change_events=parameter_change_events,
            summary=summary,
        )

    def _get_original_parameter_names(self, input_data):
        """Extract original parameter names from flowchart data if available."""
        try:
            if hasattr(input_data, 'original_flowchart_data') and input_data.original_flowchart_data:
                flowchart_data = input_data.original_flowchart_data

                # 浠巆ustomParameters涓彁鍙栧弬鏁板悕绉?
                if 'customParameters' in flowchart_data:
                    custom_parameters = flowchart_data['customParameters']
                    param_names = [param['name'] for param in custom_parameters if 'name' in param]
                    return param_names

        except Exception as e:
            pass

        # 濡傛灉鏃犳硶鑾峰彇鍘熷鍙傛暟鍚嶇О锛岃繑鍥炵┖鍒楄〃
        return []

    def _get_node_labels(self, input_data):
        """Extract node labels from flowchart data if available."""
        node_labels = {}
        try:
            if hasattr(input_data, 'original_flowchart_data') and input_data.original_flowchart_data:
                flowchart_data = input_data.original_flowchart_data

                # 浠巒odes涓彁鍙栨爣绛句俊鎭?
                if 'nodes' in flowchart_data:
                    for node in flowchart_data['nodes']:
                        node_id = node.get('id')
                        label = node.get('data', {}).get('label', node_id)
                        if node_id:
                            node_labels[node_id] = label

        except Exception as e:
            pass

        return node_labels

    def _normalise_edge_factors(
        self,
        edge: EdgeData,
        n_components: int,
    ) -> Tuple[List[float], List[float]]:
        factor_a = getattr(edge, "concentration_factor_a", None)
        factor_b = getattr(edge, "concentration_factor_b", None)
        a_values = (
            [float(value) for value in factor_a]
            if factor_a and len(factor_a) == n_components
            else [1.0] * n_components
        )
        b_values = (
            [float(value) for value in factor_b]
            if factor_b and len(factor_b) == n_components
            else [0.0] * n_components
        )
        return a_values, b_values

    def _calculate_mass_balance_component_errors(
        self,
        result_tensor: torch.Tensor,
        input_data: MaterialBalanceInput,
        *,
        timestamps: Optional[List[float]] = None,
        edge_flow_series: Optional[Dict[str, List[float]]] = None,
        edge_flow_interval_series: Optional[Dict[str, List[float]]] = None,
        edge_factor_a_interval_series: Optional[Dict[str, List[List[float]]]] = None,
        edge_factor_b_interval_series: Optional[Dict[str, List[List[float]]]] = None,
    ) -> List[float]:
        """Return signed component residuals: inflow - outflow - accumulation."""
        series_tensor = result_tensor.unsqueeze(0) if result_tensor.ndim == 2 else result_tensor
        if series_tensor.ndim != 3:
            raise ValueError("result_tensor must have shape [time, node, feature]")

        concentrations, volumes = self._split_tensors(series_tensor)
        n_steps = int(series_tensor.shape[0])
        n_nodes = len(input_data.nodes)
        if n_steps == 0:
            return []
        if concentrations.shape[1] != n_nodes:
            raise ValueError(
                "result_tensor node dimension does not match input nodes "
                f"({concentrations.shape[1]} != {n_nodes})"
            )

        device = concentrations.device
        dtype = concentrations.dtype
        n_components = int(concentrations.shape[-1])
        if not isinstance(timestamps, list) or len(timestamps) != n_steps:
            time_values = np.linspace(
                0.0,
                float(input_data.parameters.hours),
                n_steps,
            ).tolist()
        else:
            time_values = [float(value) for value in timestamps]

        compute_nodes = [not (node.is_inlet or node.is_outlet) for node in input_data.nodes]
        compute_indices = [idx for idx, included in enumerate(compute_nodes) if included]
        if compute_indices:
            compute_index_tensor = torch.tensor(
                compute_indices,
                dtype=torch.long,
                device=device,
            )
            control_concentrations = concentrations.index_select(1, compute_index_tensor)
            control_volumes = volumes.index_select(1, compute_index_tensor)
            control_mass = (
                control_concentrations * control_volumes.unsqueeze(-1)
            ).sum(dim=1)
            accumulation_delta = control_mass[-1] - control_mass[0]
        else:
            accumulation_delta = torch.zeros(n_components, dtype=dtype, device=device)

        interval_count = n_steps - 1
        if interval_count <= 0:
            return [
                float(value)
                for value in (-accumulation_delta).detach().cpu().tolist()
            ]

        dt_values = []
        for index in range(interval_count):
            dt_value = float(time_values[index + 1] - time_values[index])
            if dt_value < -1e-12:
                raise ValueError("timestamps must be nondecreasing")
            dt_values.append(max(0.0, dt_value))
        dt = torch.tensor(dt_values, dtype=dtype, device=device)

        def interval_flow(edge_id: str, default_value: float) -> torch.Tensor:
            raw_interval = (
                edge_flow_interval_series.get(edge_id)
                if isinstance(edge_flow_interval_series, dict)
                else None
            )
            if isinstance(raw_interval, list) and len(raw_interval) == interval_count:
                values = [float(value) for value in raw_interval]
            else:
                raw_points = (
                    edge_flow_series.get(edge_id)
                    if isinstance(edge_flow_series, dict)
                    else None
                )
                if isinstance(raw_points, list) and len(raw_points) == n_steps:
                    values = [
                        0.5 * (float(raw_points[idx]) + float(raw_points[idx + 1]))
                        for idx in range(interval_count)
                    ]
                else:
                    values = [float(default_value)] * interval_count
            return torch.tensor(values, dtype=dtype, device=device)

        def interval_factors(
            series_map: Optional[Dict[str, List[List[float]]]],
            edge_id: str,
            defaults: List[float],
        ) -> torch.Tensor:
            raw_interval = series_map.get(edge_id) if isinstance(series_map, dict) else None
            if isinstance(raw_interval, list) and len(raw_interval) == interval_count:
                rows: List[List[float]] = []
                for row in raw_interval:
                    if not isinstance(row, list) or len(row) != n_components:
                        rows = []
                        break
                    rows.append([float(value) for value in row])
                if len(rows) == interval_count:
                    return torch.tensor(rows, dtype=dtype, device=device)

            return torch.tensor(
                [defaults] * interval_count,
                dtype=dtype,
                device=device,
            )

        node_index = {node.node_id: idx for idx, node in enumerate(input_data.nodes)}
        input_integral = torch.zeros(n_components, dtype=dtype, device=device)
        output_integral = torch.zeros(n_components, dtype=dtype, device=device)

        for edge in input_data.edges:
            source_index = node_index[edge.source_node_id]
            target_index = node_index[edge.target_node_id]
            source_in_control = compute_nodes[source_index]
            target_in_control = compute_nodes[target_index]
            if source_in_control == target_in_control:
                continue

            a_defaults, b_defaults = self._normalise_edge_factors(edge, n_components)
            q_interval = interval_flow(edge.edge_id, edge.flow_rate)
            a_interval = interval_factors(
                edge_factor_a_interval_series,
                edge.edge_id,
                a_defaults,
            )
            b_interval = interval_factors(
                edge_factor_b_interval_series,
                edge.edge_id,
                b_defaults,
            )
            source_start = concentrations[:-1, source_index, :] * a_interval + b_interval
            source_end = concentrations[1:, source_index, :] * a_interval + b_interval
            flux_integral = (
                0.5
                * (source_start + source_end)
                * q_interval.unsqueeze(-1)
                * dt.unsqueeze(-1)
            ).sum(dim=0)

            if target_in_control and not source_in_control:
                input_integral = input_integral + flux_integral
            elif source_in_control and not target_in_control:
                output_integral = output_integral + flux_integral

        residual = input_integral - output_integral - accumulation_delta
        return [
            float(value)
            for value in residual.detach().cpu().tolist()
        ]

    def _calculate_mass_balance_error(
        self,
        result_tensor: torch.Tensor,
        input_data: MaterialBalanceInput,
        *,
        timestamps: Optional[List[float]] = None,
        edge_flow_series: Optional[Dict[str, List[float]]] = None,
        edge_flow_interval_series: Optional[Dict[str, List[float]]] = None,
        edge_factor_a_interval_series: Optional[Dict[str, List[List[float]]]] = None,
        edge_factor_b_interval_series: Optional[Dict[str, List[List[float]]]] = None,
    ) -> float:
        """Return max absolute component residual for the computed control volume."""
        component_errors = self._calculate_mass_balance_component_errors(
            result_tensor,
            input_data,
            timestamps=timestamps,
            edge_flow_series=edge_flow_series,
            edge_flow_interval_series=edge_flow_interval_series,
            edge_factor_a_interval_series=edge_factor_a_interval_series,
            edge_factor_b_interval_series=edge_factor_b_interval_series,
        )
        return max((abs(value) for value in component_errors), default=0.0)
