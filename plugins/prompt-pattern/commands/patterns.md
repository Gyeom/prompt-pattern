---
description: "감지된 반복 프롬프트 패턴을 확인하고 Skill로 자동화합니다"
---

# /patterns

반복 프롬프트 패턴을 분석하고 자동화 옵션을 제안합니다.

## 실행 방법

1. 먼저 `node "$CLAUDE_PLUGIN_DIR/hooks/scripts/analyze-patterns.js" --json` 을 실행하여 패턴 분석 결과를 가져옵니다.

2. 결과를 사용자에게 보기 좋게 정리하여 표시합니다.

## 출력 형식

```
🔍 반복 프롬프트 패턴 (최근 14일)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. "커밋 관련 요청" - 12회
   예시:
   • "변경사항 커밋해줘"
   • "커밋 메시지 작성하고 커밋해"

   💡 /{suggestedName} 으로 Skill 만들기?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2. "테스트 실행 요청" - 8회
   ...
```

## 사용자 상호작용

- 사용자가 특정 패턴을 선택하면 해당 패턴을 Skill로 만듭니다.
- "1번 만들어줘", "commit 스킬 생성해줘" 같은 요청에 응답합니다.

## Skill 생성 방법

사용자가 Skill 생성을 요청하면:

1. 현재 프로젝트의 `.claude/skills/` 디렉토리에 Skill 파일을 생성합니다.
2. 파일명: `{suggestedName}.md`
3. 내용 템플릿:

```markdown
---
description: "{패턴 설명}"
---

# /{skillName}

{대표 프롬프트 내용을 기반으로 한 지시사항}

## 참고

이 Skill은 Prompt Pattern 플러그인에 의해 자동 생성되었습니다.
원본 패턴: "{representative 프롬프트}"
```

4. 생성 후 사용자에게 안내:
   - 파일 위치
   - 사용법 (/{skillName})
   - 수정이 필요하면 파일을 직접 편집하라고 안내

## 패턴 무시하기

사용자가 "무시", "관심없음", "다시 보지 않기" 등을 요청하면:

1. `~/.prompt-pattern/prompts.json` 파일의 `dismissed` 배열에 패턴 ID 추가
2. 해당 패턴은 더 이상 제안되지 않음

## 데이터 위치

- 프롬프트 데이터: `~/.prompt-pattern/prompts.json`
- 분석 스크립트: `$CLAUDE_PLUGIN_DIR/hooks/scripts/analyze-patterns.js`
