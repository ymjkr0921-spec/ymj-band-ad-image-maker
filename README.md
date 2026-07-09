# ymj-band-ad-image-maker

네이버 밴드에 올릴 건설현장 구인 광고 이미지와 게시글을 빠르게 만드는 모바일 우선 React 서비스입니다. 긴 광고 문구를 그대로 붙여넣고 전화번호만 바꾸면 이미지, 전화 링크, 문자 링크가 함께 갱신됩니다.

## 실행 방법

Node.js 20.19 이상을 권장합니다.

```bash
npm install
npm run dev
```

터미널에 표시되는 로컬 주소를 브라우저에서 엽니다.

배포용 파일 생성:

```bash
npm run build
npm run preview
```

`npm run build` 결과는 `dist` 폴더에 생성됩니다.

## 주요 기능

- 상단 강조문구, 광고 제목, 긴 광고 본문, 전화번호, 문자 자동문구, 하단 안내문구 입력
- 입력 즉시 4:5 세로형 광고 이미지 미리보기 반영
- 본문의 줄바꿈 유지 및 내용 길이에 따른 글자 크기 자동 축소
- 2배 해상도 PNG 이미지 다운로드
- 밴드 게시글 자동 생성 및 클립보드 복사
- Upstash Redis에 광고를 저장하고 `/ad/광고ID` 형식의 짧은 공유 링크 생성
- 현재 전화번호를 사용하는 `tel:` 전화하기 링크
- 현재 전화번호와 자동문구를 사용하는 `sms:` 문자보내기 링크
- 모든 입력값을 `localStorage`에 자동 저장하고 새로고침 시 복원
- 모바일 우선 반응형 화면

이미지 안의 전화·문자 버튼은 디자인 요소입니다. 실제 전화하기와 문자보내기는 미리보기 아래의 버튼을 사용합니다.

## 다음 확장 기능

- 광고 색상과 글꼴 테마 선택
- 여러 광고 시안 저장 및 불러오기
- 회사 로고와 현장 사진 업로드
- 이미지 비율 및 출력 해상도 선택
- 자주 쓰는 광고 문구 템플릿
- 밴드 공유 기능과 광고 이력 관리
- PWA 설치 및 오프라인 사용 지원

## GitHub에 올리기

GitHub에서 빈 저장소를 만든 뒤 프로젝트 폴더에서 아래 명령을 실행합니다.

```bash
git add .
git commit -m "Initial release"
git branch -M main
git remote add origin https://github.com/사용자명/저장소명.git
git push -u origin main
```

이미 `origin` 원격 저장소가 등록되어 있다면 `git remote add origin` 명령은 생략합니다. `node_modules`와 `dist`는 `.gitignore`에 포함되어 GitHub에 업로드되지 않습니다.

## Vercel 배포

1. [Vercel](https://vercel.com)에 로그인하고 **Add New → Project**를 선택합니다.
2. 위에서 만든 GitHub 저장소를 Import합니다.
3. Framework Preset이 **Vite**인지 확인합니다.
4. Build Command는 `npm run build`, Output Directory는 `dist`로 설정합니다.
5. **Deploy**를 선택합니다.

기본 이미지 생성 기능에는 환경 변수가 필요하지 않지만, 짧은 공유 링크 기능에는 아래 Upstash Redis 연결이 필요합니다. 이후 `main` 브랜치에 변경사항을 push하면 Vercel이 자동으로 다시 배포합니다.

### 짧은 공유 링크 저장소 연결

짧은 링크는 다른 기기에서도 광고 내용을 불러와야 하므로 서버 저장소가 필요합니다. 이 프로젝트는 Vercel Functions와 Upstash Redis를 사용합니다.

1. Vercel 프로젝트에서 **Storage 또는 Marketplace**를 엽니다.
2. **Upstash Redis**를 선택하고 무료 데이터베이스를 생성합니다.
3. `ymj-band-ad-image-maker` 프로젝트에 데이터베이스를 연결합니다.
4. `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` 환경 변수가 추가됐는지 확인합니다.
5. Production을 Redeploy합니다.

연결 후 광고 만들기 화면의 **짧은 링크 만들기** 또는 **밴드글 복사**를 누르면 광고가 저장되고 `/ad/8자리ID` 링크가 생성됩니다. 기존 `/ad?data=...` 링크도 계속 열립니다.

### 공유 링크와 배포 주소

공유 링크는 코드에 도메인을 고정하지 않고 현재 접속 중인 `window.location.origin`을 기준으로 생성됩니다.
Production 빌드에서는 `.env.production`의 `VITE_PUBLIC_SITE_URL`을 우선 사용하므로, Preview 또는 개별 Deployment URL에서 접속해도 공개 Production URL로 공유 링크가 생성됩니다.

- 로컬 네트워크 접속: `http://192.168.x.x:5173/ad?data=...`
- Vercel 배포 후: `https://배포주소.vercel.app/ad?data=...`

`vercel.json`에는 `/ad`와 `/share` 경로를 `index.html`로 연결하는 rewrite가 설정되어 있습니다. 따라서 공유 링크를 직접 열거나 새로고침해도 광고 상세페이지가 정상적으로 표시됩니다.

### 배포 전 확인

```bash
npm install
npm run build
```

빌드가 성공하면 GitHub에 push한 뒤 Vercel에서 배포합니다. Vercel 설정은 Framework Preset `Vite`, Build Command `npm run build`, Output Directory `dist`를 사용합니다.
