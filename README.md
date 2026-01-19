# Prompt Pattern Plugin

> 반복 프롬프트를 감지하고 자동화를 제안하는 Claude Code 플러그인

## 소개

Claude Code를 사용하다 보면 비슷한 요청을 반복하게 된다:
- "변경사항 커밋해줘"
- "테스트 돌려줘"
- "빌드하고 에러 확인해"

**Prompt Pattern**은 이런 반복을 감지하고, Skill로 자동화할 수 있게 도와준다.

```
💡 "커밋 관련 요청"을 12회 하셨네요!
   /commit 으로 만들면 더 빠르게 사용할 수 있어요.
```

## 설치

```bash
claude /plugin install prompt-pattern
```

또는 GitHub에서 직접:

```bash
claude /plugin install github:your-username/prompt-pattern
```

## 사용법

### 자동 감지

설치 후 아무것도 하지 않아도 된다. 플러그인이 자동으로:

1. 모든 프롬프트를 조용히 수집
2. 반복 패턴 분석
3. 세션 시작 시 제안 (하루 1회)

### /patterns 명령어

직접 패턴을 확인하고 싶다면:

```
You: /patterns

Claude:
🔍 반복 프롬프트 패턴 (최근 14일)

1. "커밋 관련 요청" - 12회
   예시: "변경사항 커밋해줘", "커밋 메시지 작성하고..."
   💡 /commit 으로 Skill 만들기?

2. "테스트 실행 요청" - 8회
   예시: "테스트 돌려줘", "npm test 실행해"
   💡 /test 로 Skill 만들기?

어떤 패턴을 Skill로 만들까요?

You: 1번 만들어줘

Claude: ✅ /commit Skill이 생성되었습니다!
        📍 위치: .claude/skills/commit.md
        🚀 사용법: /commit
```

### 제안 무시하기

관심 없는 패턴은 무시할 수 있다:

```
You: 테스트 패턴은 관심없어

Claude: 알겠습니다! 이 패턴은 더 이상 제안하지 않을게요.
```

## 작동 원리

### 데이터 수집

- **UserPromptSubmit Hook**: 모든 프롬프트를 캡처
- 저장 위치: `~/.prompt-pattern/prompts.json`
- 최대 1000개 유지 (오래된 것 자동 삭제)
- 슬래시 명령어(`/xxx`)는 저장하지 않음

### 패턴 분석

- **Jaccard 유사도**: 토큰 기반 유사도 계산
- 40% 이상 유사하면 같은 패턴으로 그룹화
- 최소 3회 이상 반복해야 패턴으로 인정
- 최근 14일 데이터만 분석

### 제안 타이밍

- **SessionStart Hook**: 세션 시작 시 제안
- 24시간에 1회만 (방해 최소화)
- 최소 10개 프롬프트 수집 후 제안 시작

## 파일 구조

```
prompt-pattern/
├── .claude-plugin/
│   └── plugin.json           # 플러그인 메타데이터
├── hooks/
│   ├── hooks.json            # 훅 설정
│   └── scripts/
│       ├── capture-prompt.js    # 프롬프트 캡처
│       ├── analyze-patterns.js  # 패턴 분석
│       └── suggest-pattern.js   # 세션 시작 제안
├── commands/
│   └── patterns.md           # /patterns 명령어
├── skills/
│   └── create-pattern-skill.md  # Skill 생성 도우미
└── README.md
```

## 데이터 & 프라이버시

- 모든 데이터는 **로컬**에만 저장 (`~/.prompt-pattern/`)
- 외부 서버로 전송하지 않음
- 언제든 삭제 가능: `rm -rf ~/.prompt-pattern`

## 설정

현재 버전에서는 하드코딩된 설정을 사용:

| 설정 | 값 | 설명 |
|------|------|------|
| `SIMILARITY_THRESHOLD` | 0.4 | 유사도 임계값 (40%) |
| `MIN_PATTERN_COUNT` | 3 | 최소 반복 횟수 |
| `DAYS_TO_ANALYZE` | 14 | 분석 기간 (일) |
| `SUGGEST_COOLDOWN_HOURS` | 24 | 제안 간격 (시간) |

향후 설정 파일 지원 예정.

## 문제 해결

### 패턴이 감지되지 않아요

- 최소 10개 프롬프트가 필요합니다
- 슬래시 명령어(`/xxx`)는 수집되지 않습니다
- `~/.prompt-pattern/prompts.json`에 데이터가 있는지 확인

### 제안이 안 나와요

- 24시간에 1회만 제안합니다
- `rm ~/.prompt-pattern/last-suggest.json`으로 쿨다운 리셋

### 에러가 발생해요

- `~/.prompt-pattern/error.log` 확인
- 이슈 리포트: [GitHub Issues](https://github.com/your-username/prompt-pattern/issues)

## 로드맵

- [ ] 설정 파일 지원 (`~/.prompt-pattern/config.json`)
- [ ] 임베딩 기반 유사도 (더 정확한 패턴 감지)
- [ ] 웹 대시보드
- [ ] 팀 공유 기능

## 라이선스

MIT

## 기여

PR 환영합니다!
