# 고기 선별 앱 설계 초안

## 1. 설계 목표

이 설계는 MVP를 실제 모바일 앱으로 구현하기 위한 초기 구조를 정의한다.

MVP의 목표는 다음과 같다.

- 사용자가 매장에서 30초 안에 후보 고기를 비교할 수 있게 한다.
- 사진 기반 분석 결과를 신뢰 가능한 방식으로 설명한다.
- 사용자의 취향과 구매 후 피드백을 저장해 다음 추천에 반영한다.
- 향후 돼지고기, 야채, 과일 등으로 확장 가능한 구조를 만든다.

## 2. 제품 구조

앱은 네 개의 주요 탭으로 구성한다.

1. 촬영
2. 비교함
3. 기록
4. 취향

### 2.1 촬영 탭

사용자가 가장 먼저 진입하는 화면이다.

주요 기능:

- 고기 종류 선택
- 용도 선택
- 후보 사진 촬영
- 사진 품질 안내
- 후보 추가
- 분석 시작

첫 화면은 설명 페이지가 아니라 바로 촬영 가능한 화면이어야 한다.

### 2.2 비교함 탭

촬영한 후보들을 확인하고 분석 결과를 보는 화면이다.

주요 기능:

- 후보 목록
- 추천 순위
- 후보별 품질 요소 점수
- 추천 이유
- 주의 신호
- "이걸로 구매" 버튼

### 2.3 기록 탭

사용자의 구매 이력과 만족도를 저장한다.

주요 기능:

- 과거 구매 기록
- 선택한 후보 사진
- 추천 당시 이유
- 구매 후 평가
- 재구매 의향

### 2.4 취향 탭

개인화 추천을 위한 사용자 선호 정보를 관리한다.

주요 기능:

- 지방 선호도
- 식감 선호도
- 가격 민감도
- 자주 먹는 조리 방식
- 선호 부위

## 3. 핵심 화면 설계

### 3.1 촬영 화면

화면 구성:

- 상단: 현재 모드 표시
  - 예: 소고기 구이용
- 중앙: 카메라 프리뷰
- 하단: 촬영 버튼
- 보조 버튼:
  - 후보 추가
  - 분석하기
  - 용도 변경

촬영 가이드:

```text
고기 전체가 보이게 찍어주세요.
비닐 반사를 피하고 라벨이 보이면 함께 담아주세요.
```

사진 품질 경고:

- 너무 어두움
- 흔들림
- 반사 심함
- 고기 영역이 너무 작음
- 후보 간 촬영 조건 차이가 큼

### 3.2 취향 선택 화면

분석 전 또는 첫 실행 시 간단히 선택한다.

필수 선택:

- 용도: 구이, 스테이크

선택 옵션:

- 담백한 고기
- 고소한 지방감
- 부드러운 식감
- 가성비 우선

초기에는 건너뛰기를 허용한다.

### 3.3 분석 중 화면

사용자가 매장에 있으므로 분석은 짧게 끝나야 한다.

표시 정보:

- 후보 사진 썸네일
- 분석 진행 상태
- 너무 긴 설명 없이 간결한 로딩 문구

목표 응답 시간:

- 5~10초 이내

### 3.4 결과 화면

결과 화면은 빠른 결론과 근거를 함께 제공한다.

구성:

1. 최종 추천
2. 추천 이유 요약
3. 후보별 순위
4. 요소별 평가
5. 주의 신호
6. 구매 버튼
7. 다른 후보 추가

예시:

```text
추천: 2번 후보

구이용으로는 2번이 가장 균형이 좋아 보여요.
마블링이 고르게 퍼져 있고 색이 안정적입니다.

주의:
사진 반사가 조금 있어 색 판단 신뢰도는 보통입니다.
유통기한과 포장 상태를 함께 확인해 주세요.
```

### 3.5 구매 후 평가 화면

식사 후 간단히 입력할 수 있어야 한다.

질문:

- 맛은 만족스러웠나요?
- 부드러웠나요?
- 기름졌나요?
- 질겼나요?
- 다음에도 비슷한 고기를 추천할까요?

입력 방식:

- 5점 척도
- 빠른 태그 선택
- 선택형 피드백

## 4. 데이터 모델

### 4.1 UserPreference

```json
{
  "userId": "string",
  "fatPreference": "lean | balanced | rich",
  "texturePreference": "firm | balanced | tender",
  "priceSensitivity": "low | medium | high",
  "favoriteUseCases": ["grill", "steak"],
  "favoriteCuts": ["sirloin", "striploin"],
  "updatedAt": "datetime"
}
```

### 4.2 SelectionSession

```json
{
  "sessionId": "string",
  "userId": "string",
  "meatType": "beef",
  "cut": "sirloin | striploin | unknown",
  "useCase": "grill | steak",
  "preferenceMode": "lean | rich | tender | value",
  "candidateIds": ["string"],
  "recommendedCandidateId": "string",
  "confidence": 0.82,
  "createdAt": "datetime"
}
```

### 4.3 MeatCandidate

```json
{
  "candidateId": "string",
  "sessionId": "string",
  "imageUrl": "string",
  "labelImageUrl": "string",
  "detectedCut": "string",
  "price": 21000,
  "pricePer100g": 9800,
  "weightGram": 214,
  "visualScores": {
    "marblingAmount": 0.78,
    "marblingEvenness": 0.84,
    "leanColor": 0.72,
    "fatDistribution": 0.81,
    "surfaceCondition": 0.69,
    "packagingSignal": 0.74
  },
  "warnings": ["glare_detected"],
  "analysisConfidence": 0.76
}
```

### 4.4 RecommendationResult

```json
{
  "resultId": "string",
  "sessionId": "string",
  "ranking": [
    {
      "candidateId": "string",
      "rank": 1,
      "score": 86,
      "summary": "마블링이 고르게 퍼져 있고 색이 안정적입니다.",
      "pros": ["마블링 균일", "지방 쏠림 적음"],
      "cons": ["포장 반사 약간 있음"]
    }
  ],
  "finalMessage": "사진 기준으로는 2번 후보가 가장 좋아 보입니다.",
  "safetyNotice": "유통기한, 냄새, 포장 팽창 여부는 직접 확인해 주세요."
}
```

### 4.5 PurchaseFeedback

```json
{
  "feedbackId": "string",
  "sessionId": "string",
  "candidateId": "string",
  "tasteRating": 5,
  "tendernessRating": 4,
  "fattyRating": 3,
  "valueRating": 4,
  "repurchaseIntent": true,
  "tags": ["soft", "good_value"],
  "createdAt": "datetime"
}
```

## 5. AI 분석 파이프라인

### 5.1 입력

- 고기 후보 이미지 2~5장
- 선택한 용도
- 선택한 취향
- 사용자 과거 피드백
- OCR로 추출한 라벨 정보

### 5.2 전처리

- 이미지 흐림 감지
- 조명 밝기 평가
- 비닐 반사 감지
- 고기 영역 탐지
- 색상 보정 가능 여부 판단

### 5.3 시각 분석

분석 항목:

- 마블링 양
- 마블링 균일성
- 지방/살코기 비율
- 살코기 색
- 표면 상태
- 핏물 고임
- 변색 의심
- 포장 상태

초기 구현은 멀티모달 AI와 규칙 기반 점수화를 혼합한다.

### 5.4 OCR 분석

라벨에서 다음 정보를 추출한다.

- 부위명
- 등급
- 원산지
- 중량
- 가격
- 100g당 가격
- 유통기한
- 할인율

MVP에서는 OCR을 선택 기능으로 두고, 이후 가성비 추천의 핵심 입력으로 확장한다.

### 5.5 추천 점수 산정

기본 점수:

```text
visualQualityScore =
  marblingAmount * w1 +
  marblingEvenness * w2 +
  leanColor * w3 +
  fatDistribution * w4 +
  surfaceCondition * w5 +
  packagingSignal * w6
```

취향 보정:

- 담백함: 지방량 가중치 낮춤
- 고소함: 마블링과 지방량 가중치 높임
- 부드러움: 마블링 균일성과 결 가중치 높임
- 가성비: 가격 대비 품질 점수 반영

최종 점수:

```text
finalScore =
  visualQualityScore +
  preferenceAdjustment +
  valueAdjustment -
  warningPenalty
```

## 6. 추천 응답 정책

AI 응답은 다음 구조를 따른다.

```json
{
  "recommendedCandidate": "candidate-2",
  "confidence": "medium",
  "shortReason": "마블링이 고르게 퍼져 있고 지방 쏠림이 적습니다.",
  "comparison": [
    {
      "candidate": "candidate-1",
      "reason": "색은 좋지만 지방이 한쪽에 몰려 있습니다."
    },
    {
      "candidate": "candidate-2",
      "reason": "균형이 가장 좋고 구이용으로 적합해 보입니다."
    }
  ],
  "notice": "사진 기준 참고용 분석입니다."
}
```

응답 금지 표현:

- 상하지 않았습니다.
- 반드시 맛있습니다.
- 신선도가 보장됩니다.
- 공식 등급입니다.

권장 표현:

- 사진 기준으로는 좋아 보입니다.
- 구이용으로 적합할 가능성이 높습니다.
- 색 판단 신뢰도는 보통입니다.
- 구매 전 유통기한과 포장 상태를 확인해 주세요.

## 7. 초기 기술 아키텍처

### 7.1 클라이언트

추천 선택지:

- React Native 또는 Flutter
- 카메라 촬영
- 후보 비교 UI
- 로컬 임시 저장
- 푸시 또는 알림 기반 구매 후 피드백 요청

### 7.2 백엔드

추천 구성:

- API 서버
- 이미지 업로드 스토리지
- 분석 요청 큐
- AI 분석 서비스
- 사용자/세션/피드백 DB

### 7.3 AI 서비스

초기:

- 멀티모달 AI API
- 이미지 품질 체크 모듈
- OCR 모듈
- 규칙 기반 점수 산정

고도화:

- 전문가 라벨 데이터 기반 전용 모델
- 마블링 세그멘테이션
- 색상 보정 모델
- 개인화 추천 모델

## 8. API 초안

### 8.1 세션 생성

```http
POST /selection-sessions
```

요청:

```json
{
  "meatType": "beef",
  "cut": "sirloin",
  "useCase": "grill",
  "preferenceMode": "tender"
}
```

### 8.2 후보 이미지 업로드

```http
POST /selection-sessions/{sessionId}/candidates
```

요청:

```json
{
  "image": "multipart-file",
  "labelImage": "multipart-file"
}
```

### 8.3 분석 요청

```http
POST /selection-sessions/{sessionId}/analyze
```

응답:

```json
{
  "resultId": "result-1",
  "status": "completed",
  "recommendedCandidateId": "candidate-2",
  "confidence": 0.82
}
```

### 8.4 결과 조회

```http
GET /selection-sessions/{sessionId}/result
```

### 8.5 구매 후 피드백

```http
POST /selection-sessions/{sessionId}/feedback
```

요청:

```json
{
  "candidateId": "candidate-2",
  "tasteRating": 5,
  "tendernessRating": 4,
  "fattyRating": 3,
  "valueRating": 4,
  "repurchaseIntent": true
}
```

## 9. 검증 계획

### 9.1 수동 추천 실험

앱 개발 전 고기 사진 후보를 받아 사람이 추천한다.

검증 항목:

- 사용자가 실제 구매에 도움을 느끼는가
- 추천 이유가 납득되는가
- 사진 촬영이 번거롭지 않은가

### 9.2 전문가 일치도 실험

- 고기 사진 300~500장 수집
- 전문가 3~5명에게 후보 비교 요청
- 전문가 간 일치율 측정
- AI 추천과 전문가 추천 비교

### 9.3 실제 구매 만족도 실험

- 사용자 30~50명 대상
- 앱 추천 기반 구매
- 구매 후 만족도 수집
- 직접 선택 대비 만족도 비교

## 10. 구현 우선순위

### P0

- 후보 사진 2~5장 등록
- 용도/취향 선택
- AI 후보 비교
- 추천 결과와 이유 표시
- 구매 후 피드백 입력

### P1

- 사진 품질 감지
- 구매 기록
- 취향 프로필
- 라벨 OCR
- 가격 대비 추천

### P2

- 개인화 추천
- 전문가 데이터셋 관리
- 커뮤니티 추천
- 매장/정육점 지도
- 야채/과일 확장

## 11. 다음 설계 과제

다음 단계에서는 아래 항목을 구체화한다.

- MVP 화면 와이어프레임
- 모바일 앱 기술 스택 확정
- AI 프롬프트 및 점수 산정 규칙
- 데이터베이스 스키마
- 프로토타입 구현 범위
- 사용자 테스트 시나리오

