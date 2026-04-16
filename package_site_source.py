from __future__ import annotations

from pathlib import Path
import os
import zipfile


PROJECT_ROOT = Path(__file__).resolve().parent
OUTPUT_PATH = PROJECT_ROOT / "public" / "downloads" / "ohmyflight-source.zip"

EXCLUDED_DIR_NAMES = {
    ".git",
    "node_modules",
    "dist",
    "coverage",
    ".vite",
    ".vitest",
    "__pycache__",
    "REF",
}

EXCLUDED_RELATIVE_DIRS = {
    Path("public") / "downloads",
}

EXCLUDED_FILE_SUFFIXES = {
    ".pyc",
    ".pyo",
    ".log",
}


def should_skip_dir(path: Path) -> bool:
    if path.name in EXCLUDED_DIR_NAMES:
        return True

    try:
        relative = path.relative_to(PROJECT_ROOT)
    except ValueError:
        return True

    return relative in EXCLUDED_RELATIVE_DIRS


def should_skip_file(path: Path) -> bool:
    if path.suffix.lower() in EXCLUDED_FILE_SUFFIXES:
        return True

    if path == OUTPUT_PATH:
        return True

    return any(part in EXCLUDED_DIR_NAMES for part in path.relative_to(PROJECT_ROOT).parts)


def collect_files() -> list[Path]:
    files: list[Path] = []

    for current_root, dir_names, file_names in os.walk(PROJECT_ROOT, topdown=True):
        current_path = Path(current_root)
        dir_names[:] = [name for name in dir_names if not should_skip_dir(current_path / name)]

        for file_name in file_names:
            file_path = current_path / file_name
            if should_skip_file(file_path):
                continue

            files.append(file_path)

    return sorted(files)


def package_source_archive() -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    source_files = collect_files()

    with zipfile.ZipFile(OUTPUT_PATH, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for file_path in source_files:
            archive.write(file_path, file_path.relative_to(PROJECT_ROOT))

    print(f"[ohmyflight] Packaged source archive: {OUTPUT_PATH} ({len(source_files)} files)")


if __name__ == "__main__":
    package_source_archive()
