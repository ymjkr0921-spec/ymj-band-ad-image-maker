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
- 광고별 밴드 카드 제목·설명과 Open Graph/Twitter 메타태그 생성
- 짧은 링크 저장 시 선택한 템플릿 미리보기를 카드 이미지로 함께 저장
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

밴드와 메신저의 링크 미리보기는 `/ad` 서버 응답에 포함된 광고별 제목, 설명, 이미지 메타태그를 사용합니다. 이전 미리보기 캐시가 남아 있으면 새 광고 링크로 다시 테스트해야 할 수 있습니다.

### 공유 링크와 배포 주소

공유 링크는 Production에서 `https://ymj-people.vercel.app`을 기준으로 생성됩니다. Preview 또는 이전 배포 주소로 접속해도 새 Production 도메인이 사용됩니다. localhost와 사설 IP(`192.168.x.x` 등)에서는 현재 로컬 origin을 유지합니다.

- 로컬 네트워크 접속: `http://192.168.x.x:5173/ad?data=...`
- Vercel 배포 후: `https://ymj-people.vercel.app/ad?data=...`

`vercel.json`에는 `/ad`와 `/share` 경로를 `index.html`로 연결하는 rewrite가 설정되어 있습니다. 따라서 공유 링크를 직접 열거나 새로고침해도 광고 상세페이지가 정상적으로 표시됩니다.

### 배포 전 확인

```bash
npm install
npm run build
```

빌드가 성공하면 GitHub에 push한 뒤 Vercel에서 배포합니다. Vercel 설정은 Framework Preset `Vite`, Build Command `npm run build`, Output Directory `dist`를 사용합니다.
## 긴 공유 링크를 짧은 링크로 쓰는 정식 저장소 연결

이 프로젝트는 기본적으로 광고 데이터를 서버 저장소에 저장한 뒤 아래 형식의 짧은 링크를 생성합니다.

```text
https://ymj-people.vercel.app/ad/8자리ID
```

저장소가 연결되지 않았거나 저장에 실패하면 기존 호환 방식인 `/ad?data=...` 긴 링크로 자동 fallback 됩니다. 따라서 앱 사용은 막히지 않지만, 밴드에 깔끔하게 올리려면 저장소 연결이 필요합니다.

### 추천 저장소 옵션

1. Upstash Redis Free 플랜 — 가장 쉽고 현재 코드와 바로 호환됩니다.
2. Supabase Free 플랜 — 무료 DB는 좋지만 API 코드를 별도로 바꿔야 합니다.
3. GitHub Gist/파일 저장 — 운영용으로는 권장하지 않습니다. 속도와 보안, 토큰 관리가 애매합니다.

현재 앱은 Vercel Redis 유료 플랜을 쓰지 않고, Upstash Redis REST API 환경변수만 있으면 동작합니다.

### Upstash Redis Free 연결 방법

1. [Upstash](https://upstash.com)에 가입합니다.
2. Redis Database를 생성합니다. Free 플랜으로 충분합니다.
3. Database 상세 화면에서 REST URL과 REST TOKEN을 복사합니다.
4. Vercel 프로젝트 `ymj-people`의 Settings → Environment Variables에 아래 값을 추가합니다.

```text
UPSTASH_REDIS_REST_URL=Upstash REST URL
UPSTASH_REDIS_REST_TOKEN=Upstash REST TOKEN
```

5. Production 환경에 적용되도록 저장한 뒤 Vercel에서 Redeploy 합니다.
6. 광고 만들기 화면에서 **밴드글 복사** 또는 **짧은 링크 만들기**를 누르면 `/ad/8자리ID` 링크가 생성됩니다.

저장되는 데이터에는 광고 제목, 본문, 전화번호, 문자문구, 선택 템플릿, 본문 위치/글씨크기/줄간격, 밴드카드 제목/설명, 향후 색상 커스텀 값이 포함됩니다.
