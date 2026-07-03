from __future__ import annotations

import argparse
import http.server
import os
import socketserver
import subprocess
import sys
import webbrowser
from functools import partial
from pathlib import Path


PORT = 4567
URL = f"http://localhost:{PORT}/index.html"


def build_dist(project_root: Path) -> None:
    npm_command = "npm.cmd" if os.name == "nt" else "npm"
    print("[ohmyflight] Building dist and source archive...")
    subprocess.run([npm_command, "run", "build"], cwd=project_root, check=True)


def open_browser(url: str) -> None:
    print("[ohmyflight] Opening local site...")
    if os.name == "nt":
        try:
            subprocess.Popen(["cmd", "/c", "start", "", "msedge", "--inprivate", url])
            return
        except OSError:
            pass
    webbrowser.open(url)


def serve(directory: Path, port: int) -> None:
    handler = partial(http.server.SimpleHTTPRequestHandler, directory=str(directory))
    with socketserver.TCPServer(("", port), handler) as server:
        print(f"[ohmyflight] Serving {directory} at http://localhost:{port}/")
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\n[ohmyflight] Server stopped.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build and serve ohmyflight locally.")
    parser.add_argument("--port", type=int, default=PORT, help="Local HTTP port.")
    parser.add_argument("--no-build", action="store_true", help="Skip npm build.")
    parser.add_argument("--no-open", action="store_true", help="Do not open browser.")
    parser.add_argument("--check", action="store_true", help="Validate paths and exit.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    project_root = Path(__file__).resolve().parent
    dist_dir = project_root / "dist"

    if args.check:
        if not (project_root / "package.json").exists():
            print("[ohmyflight] package.json not found.", file=sys.stderr)
            return 1
        print("[ohmyflight] start_index.py check passed.")
        return 0

    try:
        if not args.no_build:
            build_dist(project_root)
        if not dist_dir.exists():
            print("[ohmyflight] dist directory not found. Run without --no-build first.", file=sys.stderr)
            return 1
        if not args.no_open:
            open_browser(f"http://localhost:{args.port}/index.html")
        serve(dist_dir, args.port)
        return 0
    except subprocess.CalledProcessError as error:
        print(f"[ohmyflight] Build failed: {error}", file=sys.stderr)
        return error.returncode or 1
    except OSError as error:
        print(f"[ohmyflight] Failed to start server: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
