import argparse
from pathlib import Path

from sumo_matrix_pipeline import (
    PROCESS_NAME_DEFAULT,
    build_process_catalog,
    build_slice_component_order,
    build_matrix_df,
    load_decomposition_profile,
    read_source_table,
    resolve_default_path,
    run_pipeline_exports,
    write_new_workbook,
    write_to_template,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert SUMO Petersen matrices into AutoWaterSimu-compatible matrix workbooks."
    )
    parser.add_argument("--source", required=True, help="SUMO matrix file path, supports csv/xlsx")
    parser.add_argument("--source-sheet", default="Sheet1", help="Worksheet name when source is xlsx")
    parser.add_argument("--template", default="", help="Optional xlsx template path")
    parser.add_argument("--template-sheet", default="matrix", help="Worksheet name inside template")
    parser.add_argument("--output", default="", help="Single-workbook output path for legacy mode")
    parser.add_argument("--output-dir", default="", help="Pipeline output directory for catalog/slices/reports")
    parser.add_argument(
        "--component-alias-map",
        default=str(resolve_default_path("component_alias_registry.json")),
        help="Component alias registry JSON path",
    )
    parser.add_argument(
        "--decomposition-profile",
        default=str(resolve_default_path("decomposition_profile.json")),
        help="Decomposition profile JSON path",
    )
    parser.add_argument(
        "--process-name-mode",
        choices=["symbol", "name", "name_slug"],
        default=PROCESS_NAME_DEFAULT,
    )
    parser.add_argument("--emit-catalog", action="store_true", help="Emit catalog.json in pipeline mode")
    parser.add_argument("--emit-markdown", action="store_true", help="Emit markdown reports in pipeline mode")
    parser.add_argument(
        "--full-replica",
        action="store_true",
        help="Use the full canonical component set instead of slice-active components only",
    )
    return parser.parse_args()


def run_single_output_mode(
    *,
    output_path: Path,
    template_path: Path | None,
    template_sheet: str,
    source_path: Path,
    source_sheet: str,
    process_name_mode: str,
    alias_map_path: Path | None,
    full_replica: bool,
) -> None:
    df = read_source_table(source_path, source_sheet)
    catalog = build_process_catalog(
        df,
        source_path=source_path,
        source_sheet=source_sheet,
        process_name_mode=process_name_mode,
        alias_config_path=alias_map_path,
    )
    component_order = build_slice_component_order(
        catalog.processes,
        catalog.component_alias_registry,
        component_mode="full_replica" if full_replica else "active_only",
        full_replica=full_replica,
    )
    matrix_df = build_matrix_df(catalog.processes, component_order)
    if template_path:
        write_to_template(
            template_path,
            output_path,
            matrix_df,
            template_sheet,
            rewrite_header=full_replica,
        )
    else:
        write_new_workbook(output_path, matrix_df, template_sheet)
    print(f"rows={len(matrix_df)}")
    print(f"components={len(component_order)}")
    print(f"output={output_path}")


def run_pipeline_mode(
    *,
    output_dir: Path,
    template_path: Path | None,
    template_sheet: str,
    source_path: Path,
    source_sheet: str,
    process_name_mode: str,
    alias_map_path: Path | None,
    decomposition_profile_path: Path | None,
    emit_catalog: bool,
    emit_markdown: bool,
    full_replica: bool,
) -> None:
    df = read_source_table(source_path, source_sheet)
    catalog = build_process_catalog(
        df,
        source_path=source_path,
        source_sheet=source_sheet,
        process_name_mode=process_name_mode,
        alias_config_path=alias_map_path,
    )
    slice_definitions = load_decomposition_profile(decomposition_profile_path)
    if not slice_definitions:
        raise ValueError("Pipeline mode requires at least one slice definition in the decomposition profile")
    manifest = run_pipeline_exports(
        catalog=catalog,
        slice_definitions=slice_definitions,
        output_dir=output_dir,
        template_path=template_path,
        template_sheet=template_sheet,
        emit_catalog=emit_catalog,
        emit_markdown=emit_markdown,
        full_replica=full_replica,
    )
    print(f"processes={len(catalog.processes)}")
    print(f"slices={len(manifest['slices'])}")
    print(f"output_dir={output_dir}")


def main() -> None:
    args = parse_args()
    source_path = Path(args.source)
    template_path = Path(args.template) if args.template else None
    alias_map_path = Path(args.component_alias_map) if args.component_alias_map else None
    decomposition_profile_path = (
        Path(args.decomposition_profile) if args.decomposition_profile else None
    )

    if args.output_dir:
        run_pipeline_mode(
            output_dir=Path(args.output_dir),
            template_path=template_path,
            template_sheet=args.template_sheet,
            source_path=source_path,
            source_sheet=args.source_sheet,
            process_name_mode=args.process_name_mode,
            alias_map_path=alias_map_path,
            decomposition_profile_path=decomposition_profile_path,
            emit_catalog=args.emit_catalog,
            emit_markdown=args.emit_markdown,
            full_replica=args.full_replica,
        )
        return

    if not args.output:
        raise ValueError("Either --output or --output-dir is required")

    run_single_output_mode(
        output_path=Path(args.output),
        template_path=template_path,
        template_sheet=args.template_sheet,
        source_path=source_path,
        source_sheet=args.source_sheet,
        process_name_mode=args.process_name_mode,
        alias_map_path=alias_map_path,
        full_replica=args.full_replica,
    )


if __name__ == "__main__":
    main()
