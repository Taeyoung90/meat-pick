# Meat Pick

[English](README.md) | [한국어](README.ko.md)

Meat Pick은 사용자가 소고기 후보를 사진, 취향, 가격 기준으로 비교할 수 있도록 돕는 장보기 보조 MVP입니다.

현재 프로토타입은 **구이용 소고기**에 집중합니다. 사용자는 후보 사진 2-5장을 업로드하고, 가격과 중량 같은 구매 정보를 입력한 뒤, 맛 우선 추천과 가성비 추천을 따로 받을 수 있습니다.

## 현재 기능

- 소고기 후보 이미지 2-5장 업로드
- 취향 기준 선택
  - 균형
  - 담백함
  - 고소함
  - 부드러움
  - 가성비
- 후보별 구매 정보 입력
  - 가격
  - 중량
  - 등급
  - 원산지
- 100g당 가격 자동 계산
- 멀티모달 LLM 기반 후보 비교
- 추천 결과 분리 표시
  - 맛 우선 추천
  - 가성비 추천
- 후보별 상세 분석 표시
  - 지방량
  - 지방 분포
  - 색상
  - 표면/사진상 주의 신호
  - 전반적인 구이용 적합도
- 예상치 못한 API 과금을 줄이기 위한 로컬 사용량 제한
- 실제 LLM 분석 실패 시 로컬 휴리스틱 분석으로 fallback

## 프로젝트 구조

```text
docs/
  meat-selection-product-plan.md
  meat-selection-design.md
  mvp-development-spec.md

prototype/
  index.html
  styles.css
  app.js
  server.mjs
  run-dev.ps1
  .env.example

test_image/
  SOURCES.md
  sample images
```

## 로컬 실행

프로젝트 루트에서 실행합니다.

```powershell
node .\prototype\server.mjs
```

그다음 브라우저에서 아래 주소를 엽니다.

```text
http://127.0.0.1:4173/
```

Windows에서는 아래 스크립트로도 실행할 수 있습니다.

```powershell
.\prototype\run-dev.ps1
```

## API Key 보안

API key는 반드시 로컬에만 있어야 하며, 커밋하면 안 됩니다.

서버는 key를 다음 중 하나에서 읽습니다.

- 환경변수
- git에서 제외된 로컬 파일 `openai_api_key.txt`

해당 key 파일은 `.gitignore`에 포함되어 있으며, 브라우저 프론트엔드는 key를 받지 않습니다.

아래 파일들은 git에서 제외됩니다.

```text
openai_api_key.txt
prototype/server.log
prototype/usage-state.json
test_image/KakaoTalk_*.jpg
```

## 비용 제한

프로토타입에는 기본적인 실제 LLM 분석 제한이 들어 있습니다.

- 실제 분석 1회당 이미지 수: 기본 최대 3장
- 하루 실제 분석 횟수: 기본 최대 10회
- 서버로 전송하기 전 이미지 리사이즈
- 실패한 호출은 로컬 휴리스틱 분석으로 fallback

조정 가능한 설정은 아래 파일에 정리되어 있습니다.

```text
prototype/.env.example
```

## 주의 사항

이 프로토타입은 식품 안전 판정 도구가 아닙니다. 사진 기반 장보기 참고 정보를 제공할 뿐입니다. 구매 전 유통기한, 포장 상태, 냄새, 매장 보관 상태는 사용자가 직접 확인해야 합니다.

