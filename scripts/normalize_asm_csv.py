#!/usr/bin/env python3
"""
Normalize ASM CSV files (parameters.csv, Model.csv, CalculateVarriables.csv) per spec.

Outputs normalized copies under todos/05_data/process/asm-csv-normalized/.
"""
import csv
import os
import re
import sys
from typing import List, Dict


def ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)


def read_csv(path: str) -> List[List[str]]:
    # Try a few encodings to read raw content robustly
    for enc in ("utf-8", "utf-8-sig", "gb18030", "cp1252", "latin-1"):
        try:
            with open(path, "r", encoding=enc, newline="") as f:
                return list(csv.reader(f))
        except Exception:
            continue
    # Fallback binary -> decode latin-1
    with open(path, "rb") as f:
        data = f.read().decode("latin-1", errors="replace")
    return list(csv.reader(data.splitlines()))


def write_csv(path: str, rows: List[List[str]]):
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        for r in rows:
            w.writerow(r)


def canonical_token(token: str) -> str:
    t = token.strip().strip('"').strip("'")
    if not t:
        return t
    # Replace commas with underscores
    t = t.replace(",", "_")
    # Replace spaces and slashes with underscores (safer for codegen)
    t = re.sub(r"[\s/]+", "_", t)
    # If startswith '?' assume Greek mu (maximum specific rate)
    if t.startswith("?"):
        t = "mu_" + t[1:]
    return t


def canonicalize_cell(cell: str) -> str:
    if cell is None:
        return cell
    s = cell
    # Replace tokens with commas into underscore form within the string
    def repl(m):
        parts = m.group(0).split(",")
        return "_".join(parts)

    s = re.sub(r"\b[A-Za-z][A-Za-z0-9]*,[A-Za-z][A-Za-z0-9,]*\b", repl, s)
    # Normalize BigNumber/SmallNumber
    s = s.replace("BigNumber", "inf").replace("SmallNumber", "1e-12")
    # Unitless placeholders
    s = s.replace("-", "unitless") if s.strip() == "-" else s
    return s


def normalize_parameters(rows: List[List[str]]) -> List[List[str]]:
    out = []
    # Preserve section header rows and blank rows as is, but normalize tokens
    for i, r in enumerate(rows):
        if not r:
            out.append(r)
            continue
        # Header line (contains Symbol,Name,...)
        if i == 1 or (len(r) >= 2 and r[0] == "Symbol" and r[1] == "Name"):
            out.append(["Category","Type","Symbol","Name","Default","Low limit","High limit","Unit","Decimals","Rule","Principle/comment"])  # enforce spec header once
            continue
        # Section titles or separators
        if r[0] == "" and len(r) > 1 and r[1] and ("Type(" in r[1] or ",Type(" in ",".join(r[:2])):
            # Convert like ',Ordinary...,Type(Kinetic),,,,,,' into a Category/Type marker row in comment style
            out.append(["#", r[1], r[2] if len(r) > 2 else ""])
            continue
        # Data row
        if len(r) >= 8 and r[0] and r[1]:
            sym = canonical_token(r[0])
            name = r[1].strip()
            default = canonicalize_cell(r[2] if len(r) > 2 else "")
            low = canonicalize_cell(r[3] if len(r) > 3 else "")
            high = canonicalize_cell(r[4] if len(r) > 4 else "")
            unit = canonicalize_cell(r[5] if len(r) > 5 else "") or "unitless"
            decimals = canonicalize_cell(r[6] if len(r) > 6 else "") or "0"
            rule = r[7] if len(r) > 7 else ""
            comment = r[8] if len(r) > 8 else ""
            out.append(["", "", sym, name, default, low, high, unit, decimals, rule, comment])
        else:
            out.append([canonicalize_cell(c) for c in r])
    return out


def normalize_model(rows: List[List[str]]) -> List[List[str]]:
    out = []
    if not rows:
        return out
    header = rows[0]
    new_header = []
    for h in header:
        ch = canonical_token(h)
        if ch == "Rate":
            ch = "RateExpression"
        new_header.append(ch)
    out.append(new_header)

    # Regex to convert MsatVAR,PARAMS -> Msat(VAR;PARAMS_underscore)
    pattern = re.compile(r"\b(Msat|Minh)([A-Za-z0-9_]+),([A-Za-z0-9_,]+)")

    def convert_rate(rate: str) -> str:
        if not rate:
            return rate
        s = canonicalize_cell(rate)
        def sub_fn(m):
            fn = m.group(1)
            var = m.group(2)
            params = m.group(3).replace(",", "_")
            return f"{fn}({var};{params})"
        s = pattern.sub(sub_fn, s)
        return s

    for r in rows[1:]:
        nr = []
        for i, c in enumerate(r):
            if i < len(new_header) and new_header[i] == "RateExpression":
                nr.append(convert_rate(c))
            else:
                nr.append(canonicalize_cell(c))
        out.append(nr)
    return out


def normalize_calculated(rows: List[List[str]]) -> List[List[str]]:
    out = []
    for i, r in enumerate(rows):
        if i == 1 or (len(r) >= 3 and r[0] == "Symbol" and r[2] == "Expression"):
            out.append(["Category","Type","Symbol","Name","Expression","Value","Unit","Decimals","Rule","Principle/comment"])  # enforce header
            continue
        if len(r) >= 3 and r[0] and r[1]:
            sym = canonical_token(r[0])
            name = r[1].strip()
            expr = canonicalize_cell(r[2])
            val = canonicalize_cell(r[3] if len(r) > 3 else "")
            unit = canonicalize_cell(r[4] if len(r) > 4 else "")
            decimals = canonicalize_cell(r[5] if len(r) > 5 else "")
            rule = r[6] if len(r) > 6 else ""
            comment = r[7] if len(r) > 7 else ""
            out.append(["", "", sym, name, expr, val, unit, decimals, rule, comment])
        else:
            out.append([canonicalize_cell(c) for c in r])
    return out


def main():
    base = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    todos = os.path.join(base, "todos")
    out_dir = os.path.join(todos, "05_data", "process", "asm-csv-normalized")
    ensure_dir(out_dir)

    files = {
        "parameters": os.path.join(todos, "parameters.csv"),
        "model": os.path.join(todos, "Model.csv"),
        "calculated": os.path.join(todos, "CalculateVarriables.csv"),
    }

    # Normalize each file
    # parameters.csv
    p_rows = read_csv(files["parameters"])
    p_norm = normalize_parameters(p_rows)
    write_csv(os.path.join(out_dir, "parameters.normalized.csv"), p_norm)

    # Model.csv
    m_rows = read_csv(files["model"])
    m_norm = normalize_model(m_rows)
    write_csv(os.path.join(out_dir, "Model.normalized.csv"), m_norm)

    # CalculateVarriables.csv
    c_rows = read_csv(files["calculated"])
    c_norm = normalize_calculated(c_rows)
    write_csv(os.path.join(out_dir, "CalculateVarriables.normalized.csv"), c_norm)

    print("Normalized CSVs written to:")
    for fn in ("parameters.normalized.csv", "Model.normalized.csv", "CalculateVarriables.normalized.csv"):
        print("-", os.path.join(out_dir, fn))


if __name__ == "__main__":
    sys.exit(main())