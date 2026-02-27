from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="YouTube Trim Downloader API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent.parent
DOWNLOAD_DIR = BASE_DIR / "downloads"
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)


class FormatsRequest(BaseModel):
    url: str = Field(..., min_length=5)


class DownloadRequest(BaseModel):
    url: str = Field(..., min_length=5)
    format_id: str = Field(..., min_length=1)
    start: Optional[int] = Field(default=None, ge=0)
    end: Optional[int] = Field(default=None, ge=0)
    download_dir: Optional[str] = Field(default=None, min_length=1)


def run_cmd(cmd: list[str]) -> str:
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True)
    except FileNotFoundError as exc:
        missing = Path(str(exc.filename)).name if exc.filename else "required binary"
        raise HTTPException(
            status_code=500,
            detail=(
                f"'{missing}' 실행 파일을 찾을 수 없습니다. "
                "ffmpeg/yt-dlp 설치 후 PATH 설정을 확인해 주세요."
            ),
        ) from exc

    if proc.returncode != 0:
        stderr = proc.stderr.strip() or "command failed"
        lower = stderr.lower()
        if "ffmpeg is not installed" in lower:
            raise HTTPException(
                status_code=400,
                detail="ffmpeg가 설치되어 있지 않아 구간(Trim) 다운로드를 진행할 수 없습니다.",
            )
        if "signature solving failed" in lower or "n challenge solving failed" in lower:
            raise HTTPException(
                status_code=400,
                detail=(
                    "YouTube 보호 로직으로 일부 포맷 조회가 실패했습니다. "
                    "yt-dlp를 최신으로 업데이트하고(yt-dlp -U), macOS에서는 deno 설치를 권장합니다."
                ),
            )
        raise HTTPException(status_code=400, detail=stderr)
    return proc.stdout


def sanitize(name: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_.-]+", "_", name)[:120]


def parse_height(label: str) -> int:
    match = re.match(r"(\d+)", label)
    return int(match.group(1)) if match else 0


def resolve_download_dir(raw_dir: Optional[str]) -> Path:
    if not raw_dir:
        return DOWNLOAD_DIR

    path = Path(raw_dir).expanduser()
    if not path.is_absolute():
        raise HTTPException(status_code=400, detail="download_dir는 절대 경로여야 합니다.")

    path.mkdir(parents=True, exist_ok=True)
    return path


def build_download_cmd(url: str, format_selector: str, out_template: str, start: Optional[int], end: Optional[int]) -> list[str]:
    cmd = [
        "yt-dlp",
        url,
        "-f",
        format_selector,
        "--merge-output-format",
        "mp4",
        "-o",
        out_template,
    ]

    if start is not None or end is not None:
        section_start = start or 0
        section_end = end if end is not None else "inf"
        section = f"*{section_start}-{section_end}"
        cmd.extend(["--download-sections", section, "--force-keyframes-at-cuts"])

    return cmd


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/formats")
def get_formats(req: FormatsRequest) -> dict:
    output = run_cmd(["yt-dlp", "-J", req.url])
    data = json.loads(output)
    raw_formats = data.get("formats", [])

    results = []
    for fmt in raw_formats:
        if fmt.get("vcodec") == "none":
            continue

        format_id = str(fmt.get("format_id", ""))
        if not format_id:
            continue

        ext = fmt.get("ext", "mp4")
        height = fmt.get("height")
        fps = fmt.get("fps")
        note = fmt.get("format_note") or ""

        label = f"{height or '?'}p"
        if fps:
            label += f" {fps}fps"
        if note:
            label += f" {note}"

        results.append({"format_id": format_id, "ext": ext, "label": label.strip()})

    deduped = {item["format_id"]: item for item in results}
    sorted_formats = sorted(deduped.values(), key=lambda x: parse_height(x["label"]), reverse=True)
    return {"formats": sorted_formats}


@app.post("/api/download")
def download(req: DownloadRequest) -> dict:
    if req.start is not None and req.end is not None and req.end <= req.start:
        raise HTTPException(status_code=400, detail="end must be greater than start")

    title_output = run_cmd(["yt-dlp", "--print", "%(title)s", req.url]).strip()
    title = sanitize(title_output or "youtube_video")
    target_dir = resolve_download_dir(req.download_dir)
    out_template = str(target_dir / f"{title}.%(ext)s")

    primary_cmd = build_download_cmd(req.url, req.format_id, out_template, req.start, req.end)

    try:
        run_cmd(primary_cmd)
    except HTTPException as exc:
        detail = str(exc.detail).lower()
        if "requested format is not available" not in detail:
            raise

        fallback_selector = "bv*+ba/b"
        fallback_cmd = build_download_cmd(req.url, fallback_selector, out_template, req.start, req.end)
        run_cmd(fallback_cmd)

    files = sorted(target_dir.glob(f"{title}*"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not files:
        raise HTTPException(status_code=500, detail="file was not generated")

    return {
        "message": "download completed",
        "file_name": files[0].name,
        "saved_to": str(files[0]),
    }
