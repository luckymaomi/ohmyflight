from __future__ import annotations

import argparse
import json
import re
import unicodedata
import zipfile
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET


WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
NS = {"w": WORD_NS}
STRONG_END = re.compile(r"(?<=[。！？!?；;])")
HEADING_NUMBER = re.compile(r"^(?:第[一二三四五六七八九十百\d]+[章节条]|\d+(?:\.\d+){1,6})$")


def normalize(text: str) -> str:
    value = unicodedata.normalize("NFKC", text).lower()
    return re.sub(r"[^0-9a-z\u4e00-\u9fff]+", "", value)


def clean_text(text: str) -> str:
    return re.sub(r"\s+", " ", text.replace("\u3000", " ").replace("\xa0", " ")).strip()


def word_units(path: Path) -> list[dict[str, Any]]:
    with zipfile.ZipFile(path) as archive:
        root = ET.fromstring(archive.read("word/document.xml"))
    body = root.find("w:body", NS)
    if body is None:
        return []
    units: list[dict[str, Any]] = []
    for element in list(body):
        tag = element.tag.rsplit("}", 1)[-1]
        if tag == "p":
            text = clean_text("".join(node.text or "" for node in element.findall(".//w:t", NS)))
            if not text:
                continue
            style_node = element.find("./w:pPr/w:pStyle", NS)
            style = style_node.get(f"{{{WORD_NS}}}val") if style_node is not None else ""
            units.append(make_unit(len(units) + 1, "paragraph", text, style=style))
        elif tag == "tbl":
            for row in element.findall("./w:tr", NS):
                cells = [
                    clean_text("".join(node.text or "" for node in cell.findall(".//w:t", NS)))
                    for cell in row.findall("./w:tc", NS)
                ]
                text = " | ".join(value for value in cells if value)
                if text:
                    units.append(make_unit(len(units) + 1, "table-row", text))
    return units


def pdf_line_records(path: Path) -> tuple[list[list[dict[str, Any]]], int]:
    try:
        import fitz
    except ImportError as error:
        raise RuntimeError("Reading PDF requires PyMuPDF: pip install pymupdf") from error

    document = fitz.open(path)
    pages: list[list[dict[str, Any]]] = []
    for page_index, page in enumerate(document):
        page_lines: list[dict[str, Any]] = []
        height = max(float(page.rect.height), 1.0)
        data = page.get_text("dict")
        for block_index, block in enumerate(data.get("blocks", [])):
            if block.get("type") != 0:
                continue
            for line_index, line in enumerate(block.get("lines", [])):
                text = clean_text("".join(str(span.get("text", "")) for span in line.get("spans", [])))
                if not text:
                    continue
                bbox = line.get("bbox", [0, 0, 0, 0])
                page_lines.append({
                    "page": page_index + 1,
                    "block": block_index,
                    "line": line_index,
                    "text": text,
                    "top_ratio": float(bbox[1]) / height,
                    "bottom_ratio": float(bbox[3]) / height,
                })
        pages.append(page_lines)
    return pages, document.page_count


def repeated_margin_signatures(pages: list[list[dict[str, Any]]]) -> set[str]:
    page_occurrences: dict[str, set[int]] = defaultdict(set)
    for page_index, lines in enumerate(pages):
        for line in lines:
            if line["top_ratio"] > 0.14 and line["bottom_ratio"] < 0.88:
                continue
            signature = normalize(str(line["text"]))
            if signature:
                page_occurrences[signature].add(page_index)
    threshold = max(3, (len(pages) + 3) // 4)
    return {signature for signature, page_indexes in page_occurrences.items() if len(page_indexes) >= threshold}


def pdf_units(path: Path) -> tuple[list[dict[str, Any]], int]:
    pages, page_count = pdf_line_records(path)
    repeated = repeated_margin_signatures(pages)
    units: list[dict[str, Any]] = []
    for page_lines in pages:
        groups: list[list[dict[str, Any]]] = []
        for line in page_lines:
            signature = normalize(str(line["text"]))
            if signature in repeated:
                continue
            if re.fullmatch(r"\d{1,4}", str(line["text"])) and (
                line["top_ratio"] < 0.14 or line["bottom_ratio"] > 0.88
            ):
                continue
            if not groups or groups[-1][-1]["block"] != line["block"]:
                groups.append([line])
            else:
                groups[-1].append(line)
        for group in groups:
            text = join_pdf_lines([str(line["text"]) for line in group])
            if text:
                units.append(make_unit(
                    len(units) + 1,
                    "pdf-block",
                    text,
                    page=int(group[0]["page"]),
                ))
    return units, page_count


def join_pdf_lines(lines: list[str]) -> str:
    result = ""
    for line in lines:
        value = clean_text(line)
        if not value:
            continue
        if not result:
            result = value
            continue
        if re.search(r"[A-Za-z0-9]$", result) and re.match(r"^[A-Za-z0-9]", value):
            result += " " + value
        else:
            result += value
    return result


def make_unit(index: int, kind: str, text: str, **extra: Any) -> dict[str, Any]:
    return {"index": index, "kind": kind, "text": text, "normalized": normalize(text), **extra}


def slices_for(units: list[dict[str, Any]], document_id: str) -> list[dict[str, Any]]:
    slices: list[dict[str, Any]] = []
    for unit in units:
        parts = [part.strip() for part in STRONG_END.split(str(unit["text"])) if part.strip()]
        if not parts:
            parts = [str(unit["text"])]
        merged: list[str] = []
        for part in parts:
            normalized = normalize(part)
            if merged and len(normalized) < 8 and not HEADING_NUMBER.fullmatch(part):
                merged[-1] += part
            else:
                merged.append(part)
        for part in merged:
            normalized = normalize(part)
            if not normalized or (len(normalized) < 4 and not HEADING_NUMBER.fullmatch(part)):
                continue
            slices.append({
                "id": f"{document_id}-slice-{len(slices) + 1}",
                "index": len(slices),
                "unit_index": unit["index"],
                "kind": unit["kind"],
                "page": unit.get("page"),
                "style": unit.get("style", ""),
                "text": part,
                "normalized": normalized,
            })
    return slices


def unique_exact_anchors(left: list[dict[str, Any]], right: list[dict[str, Any]]) -> list[dict[str, int]]:
    left_positions: dict[str, list[int]] = defaultdict(list)
    right_positions: dict[str, list[int]] = defaultdict(list)
    for index, item in enumerate(left):
        if len(item["normalized"]) >= 12:
            left_positions[item["normalized"]].append(index)
    for index, item in enumerate(right):
        if len(item["normalized"]) >= 12:
            right_positions[item["normalized"]].append(index)
    candidates = sorted(
        (positions[0], right_positions[value][0])
        for value, positions in left_positions.items()
        if len(positions) == 1 and len(right_positions.get(value, [])) == 1
    )
    return longest_increasing_pairs(candidates)


def longest_increasing_pairs(pairs: list[tuple[int, int]]) -> list[dict[str, int]]:
    tails: list[int] = []
    tail_pair_indexes: list[int] = []
    previous = [-1] * len(pairs)
    for pair_index, (_left, right) in enumerate(pairs):
        low, high = 0, len(tails)
        while low < high:
            middle = (low + high) // 2
            if tails[middle] < right:
                low = middle + 1
            else:
                high = middle
        if low == len(tails):
            tails.append(right)
            tail_pair_indexes.append(pair_index)
        else:
            tails[low] = right
            tail_pair_indexes[low] = pair_index
        if low:
            previous[pair_index] = tail_pair_indexes[low - 1]
    if not tail_pair_indexes:
        return []
    chain: list[dict[str, int]] = []
    cursor = tail_pair_indexes[-1]
    while cursor >= 0:
        left, right = pairs[cursor]
        chain.append({"my_index": left, "reference_index": right})
        cursor = previous[cursor]
    return list(reversed(chain))


def anchor_gaps(
    left: list[dict[str, Any]],
    right: list[dict[str, Any]],
    anchors: list[dict[str, int]],
) -> list[dict[str, Any]]:
    boundaries = [
        {"my_index": -1, "reference_index": -1},
        *anchors,
        {"my_index": len(left), "reference_index": len(right)},
    ]
    gaps: list[dict[str, Any]] = []
    for start, end in zip(boundaries, boundaries[1:]):
        my_items = left[start["my_index"] + 1:end["my_index"]]
        reference_items = right[start["reference_index"] + 1:end["reference_index"]]
        if not my_items and not reference_items:
            continue
        gaps.append({
            "index": len(gaps) + 1,
            "before_anchor": None if start["my_index"] < 0 else start,
            "after_anchor": None if end["my_index"] >= len(left) else end,
            "my_slices": my_items,
            "reference_slices": reference_items,
        })
    return gaps


def read_document(path: Path, document_id: str) -> dict[str, Any]:
    suffix = path.suffix.lower()
    if suffix == ".docx":
        units = word_units(path)
        page_count = None
    elif suffix == ".pdf":
        units, page_count = pdf_units(path)
    else:
        raise ValueError(f"Unsupported file type: {path.suffix}")
    slices = slices_for(units, document_id)
    if not slices:
        raise ValueError(f"No readable text found in {path}")
    return {
        "id": document_id,
        "name": path.name,
        "format": suffix[1:],
        "page_count": page_count,
        "unit_count": len(units),
        "slice_count": len(slices),
        "character_count": sum(len(str(unit["text"])) for unit in units),
        "units": units,
        "slices": slices,
    }


def build_evidence(my_path: Path, reference_path: Path) -> dict[str, Any]:
    my_document = read_document(my_path, "my")
    reference_document = read_document(reference_path, "reference")
    anchors = unique_exact_anchors(my_document["slices"], reference_document["slices"])
    gaps = anchor_gaps(my_document["slices"], reference_document["slices"], anchors)
    return {
        "schema_version": 1,
        "direction": {"my": my_document["name"], "reference": reference_document["name"]},
        "summary": {
            "exact_anchor_count": len(anchors),
            "gap_count": len(gaps),
            "my_slice_count": my_document["slice_count"],
            "reference_slice_count": reference_document["slice_count"],
        },
        "documents": {"my": my_document, "reference": reference_document},
        "exact_anchors": anchors,
        "gaps": gaps,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extract ordered evidence for manual comparison.")
    parser.add_argument("--my", required=True, type=Path, help="Manual being maintained.")
    parser.add_argument("--reference", required=True, type=Path, help="Reference manual.")
    parser.add_argument("--output", required=True, type=Path, help="Output JSON path.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    evidence = build_evidence(args.my, args.reference)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(evidence, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(evidence["summary"], ensure_ascii=True))


if __name__ == "__main__":
    main()
