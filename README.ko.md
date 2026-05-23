# Fresh Pick

[English](README.md) | [한국어](README.ko.md)

Fresh Pick은 마트에서 신선식품 후보를 사진으로 비교하고, 사진상 가장 구매 후보로 좋아 보이는 상품을 고를 수 있도록 돕는 웹 MVP입니다.

처음에는 소고기 선별 MVP로 시작했지만, 현재 프로토타입은 카테고리 기반 신선식품 비교 앱으로 확장되었습니다.

현재 지원 카테고리:

- 소고기 구이용
- 잎채소
- 토마토

사용자는 후보 사진 2-5장을 업로드하고, 분석할 상품 영역을 확인/수정한 뒤, 필요하면 가격표 OCR을 통해 가격 정보를 읽고, 사진 기반 추천 결과와 가성비 추천을 확인할 수 있습니다.

## 현재 기능

- 상품 종류 선택
  - 소고기 구이용
  - 잎채소
  - 토마토
- 후보 이미지 2-5장 업로드
- 모바일 촬영 시 후면 카메라 사용 힌트
- 상품 영역 자동 지정 및 수동 조정
- 가격표가 없는 경우 `가격표 없음` 선택
- 가격표/라벨 영역 OCR
- OCR 신뢰도, 읽은 항목, 주의 문구 표시
- 후보별 구매 정보 입력
  - 가격
  - 중량
  - 등급 또는 상품 메모
  - 원산지
  - 품목/부위
  - 할인
  - 포장일/소비기한
- 100g당 가격 자동 계산
- 멀티모달 LLM 기반 후보 비교
- 실제 LLM 분석 실패 시 카테고리별 로컬 휴리스틱 분석으로 fallback
- 결과 화면 고도화
  - BEST PICK 카드
  - 신선도/맛 우선 추천
  - 가성비 추천
  - 후보 간 핵심 차이 요약
  - 사진 품질 경고
  - 이미지 분석 태그
- 최근 분석 히스토리 저장
- 원본 이미지는 저장하지 않고 작은 썸네일과 분석 텍스트 중심으로 저장
- 저장된 히스토리 결과 다시 보기
- 마지막 상품 종류와 카테고리별 취향 기준 기억
- 예상치 못한 API 과금을 줄이기 위한 사용량 제한

## 프로젝트 구조

```text
docs/
  fresh-pick-product-spec.md
  meat-selection-product-plan.md
  meat-selection-design.md
  mvp-development-spec.md

prototype/
  index.html
  styles.css
  app.js
  server.mjs
  smoke-test.mjs
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

## 스모크 테스트

가벼운 정적 스모크 테스트를 실행할 수 있습니다.

```powershell
node .\prototype\smoke-test.mjs
```

이 테스트는 카테고리 모드, 주요 프론트 함수, 백엔드 프롬프트 헬퍼, 사용량 제한 보호 로직이 존재하는지 확인합니다.

## 기획/설계 문서

현재 제품 방향은 아래 문서에 정리되어 있습니다.

```text
docs/fresh-pick-product-spec.md
```

기존 소고기 MVP 문서는 초기 아이디어와 의사결정 기록으로 남겨두었습니다.

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
- 하루 라벨 읽기 횟수: 기본 최대 15회
- 서버로 전송하기 전 이미지 리사이즈
- 동시 요청으로 제한이 새지 않도록 분석/OCR 사용량 예약을 서버 프로세스 내에서 직렬화
- 실패한 분석 호출은 로컬 휴리스틱 분석으로 fallback

조정 가능한 설정은 아래 파일에 정리되어 있습니다.

```text
prototype/.env.example
```

## 주의 사항

Fresh Pick은 식품 안전 판정, 신선도 보증, 공식 등급 판정 도구가 아닙니다. 사진 기반 장보기 참고 정보를 제공할 뿐입니다. 구매 전 유통기한, 포장 상태, 냄새, 눈에 보이는 손상, 매장 보관 상태는 사용자가 직접 확인해야 합니다.
