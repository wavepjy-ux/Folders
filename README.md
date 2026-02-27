# YouTube Trim Downloader (Chrome Extension)

유튜브 URL을 입력하고 **화질 선택 + 구간(Trim) 지정** 후 다운로드를 요청하는 크롬 확장프로그램입니다.

> ⚠️ 참고: 크롬 확장프로그램만으로는 유튜브 스트림 처리/병합/트리밍을 직접 수행하기 어렵습니다.
> 본 프로젝트는 확장프로그램 UI + 로컬 백엔드(yt-dlp + ffmpeg) 구조를 사용합니다.

## 기능

- YouTube URL 입력
- 영상 화질(포맷) 목록 조회
- 시작/종료 시간(분:초 또는 시:분:초) 기반 Trim
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

#### Windows 빠른 설치 (PowerShell)

```powershell
winget install --id Gyan.FFmpeg -e
winget install --id yt-dlp.yt-dlp -e
```


#### macOS 빠른 설치 (Terminal)

```bash
brew install ffmpeg yt-dlp deno
```

설치 확인:

```bash
ffmpeg -version
yt-dlp --version
```

Windows 설치 후 새 PowerShell 창을 열고 아래로 확인하세요.

```powershell
ffmpeg -version
yt-dlp --version
```


#### Windows 원클릭 실행

프로젝트 루트에서 아래 파일을 더블클릭하면 백엔드가 자동 실행됩니다.

- `start_backend.bat` : venv 생성/의존성 설치 후 백엔드 실행
- `stop_backend.bat` : 8787 포트를 점유한 백엔드 프로세스 종료

> 처음 실행은 의존성 설치로 시간이 조금 걸릴 수 있습니다.


#### macOS 원클릭 실행

프로젝트 루트에서 아래 파일을 더블클릭하면 백엔드가 자동 실행됩니다.

- `start_backend_mac.command` : venv 생성/의존성 설치 후 백엔드 실행
- `stop_backend_mac.command` : 8787 포트를 점유한 백엔드 프로세스 종료

처음 실행에서 macOS 보안 경고가 뜨면 Terminal에서 1회 권한 부여 후 실행하세요.

```bash
cd /path/to/Folders
chmod +x start_backend_mac.command stop_backend_mac.command
xattr -dr com.apple.quarantine start_backend_mac.command stop_backend_mac.command
```


### 2) 크롬 확장프로그램 로드

1. `chrome://extensions` 이동
2. 우측 상단 개발자 모드 ON
3. `압축해제된 확장 프로그램 로드` → `extension/` 선택

### 3) 사용

1. 확장 팝업 열기
2. 유튜브 URL 입력 후 **화질 불러오기** 클릭
3. 원하는 화질 선택
4. (선택) 다운로드 폴더 절대 경로 입력 (예: `C:\\Users\\me\\Downloads\\YT`)
5. 시작/종료 시간 입력 (예: `16:00` ~ `18:30`)
6. **다운로드** 클릭

팝업은 포커스를 잃으면 닫히지만, 입력값/상태는 저장되어 다시 열면 복원됩니다.
다운로드 폴더를 비워두면 서버 실행 위치의 `downloads/` 폴더에 저장됩니다.

## API

- `POST /api/formats`
  - body: `{ "url": "https://www.youtube.com/watch?v=..." }`
- `POST /api/download`
  - body: `{ "url": "...", "format_id": "...", "start": 960, "end": 1110, "download_dir": "C:\\Users\\me\\Downloads\\YT" }`

## 주의사항

- YouTube 이용약관 및 저작권을 준수해 주세요.
- 본 코드는 개인 학습/테스트용 예시입니다.

## 문제 해결

- 오류: `You have requested downloading the video partially, but ffmpeg is not installed`
  - 원인: Trim(구간 다운로드)에는 ffmpeg가 필수입니다.
  - 해결: 위의 Windows 설치 명령으로 ffmpeg를 설치한 뒤, PowerShell을 다시 열고 백엔드를 재시작하세요.


- 오류: `Requested format is not available` 또는 `Signature solving failed`
  - 원인: YouTube 측 포맷/시그니처 보호 로직 변경으로 선택한 포맷이 사라질 수 있습니다.
  - 해결:
    1. `yt-dlp -U` 로 업데이트
    2. macOS는 `brew install deno` 설치
    3. 다시 화질 불러오기 후 재시도
  - 참고: 서버에서 해당 오류가 나오면 자동으로 `bv*+ba/b` 포맷으로 1회 재시도합니다.
