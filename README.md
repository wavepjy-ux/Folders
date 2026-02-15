# YouTube Trim Downloader (Chrome Extension)

유튜브 URL을 입력하고 **화질 선택 + 구간(Trim) 지정** 후 다운로드를 요청하는 크롬 확장프로그램입니다.

> ⚠️ 참고: 크롬 확장프로그램만으로는 유튜브 스트림 처리/병합/트리밍을 직접 수행하기 어렵습니다.
> 본 프로젝트는 확장프로그램 UI + 로컬 백엔드(yt-dlp + ffmpeg) 구조를 사용합니다.

## 기능

- YouTube URL 입력
- 영상 화질(포맷) 목록 조회
- 시작/종료 시간(초) 기반 Trim
- 다운로드 요청 및 진행상태 표시

## 폴더 구조

- `extension/` : Chrome Extension (Manifest v3)
- `server/` : FastAPI 백엔드 (`yt-dlp`, `ffmpeg` 필요)

## 빠른 시작

### 1) 백엔드 실행

```bash
cd server
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8787
```

시스템에 `ffmpeg`와 `yt-dlp`가 설치되어 있어야 합니다.

### 2) 크롬 확장프로그램 로드

1. `chrome://extensions` 이동
2. 우측 상단 개발자 모드 ON
3. `압축해제된 확장 프로그램 로드` → `extension/` 선택

### 3) 사용

1. 확장 팝업 열기
2. 유튜브 URL 입력 후 **화질 불러오기** 클릭
3. 원하는 화질 선택
4. 시작/종료 시간 입력 (예: 10 ~ 35)
5. **다운로드** 클릭

다운로드 파일은 서버 실행 위치의 `downloads/` 폴더에 저장됩니다.

## API

- `POST /api/formats`
  - body: `{ "url": "https://www.youtube.com/watch?v=..." }`
- `POST /api/download`
  - body: `{ "url": "...", "format_id": "...", "start": 10, "end": 35 }`

## 주의사항

- YouTube 이용약관 및 저작권을 준수해 주세요.
- 본 코드는 개인 학습/테스트용 예시입니다.
