#!/usr/bin/env node

/**
 * Prompt Pattern Plugin - Session Start Suggestion
 *
 * SessionStart hook에서 실행되어 패턴 제안을 출력한다.
 * stdout으로 출력하면 Claude가 컨텍스트로 받아서 사용자에게 전달한다.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const DATA_DIR = path.join(os.homedir(), '.prompt-pattern');
const PROMPTS_FILE = path.join(DATA_DIR, 'prompts.json');
const LAST_SUGGEST_FILE = path.join(DATA_DIR, 'last-suggest.json');

// 설정
const MIN_PROMPTS_BEFORE_SUGGEST = 5;   // 최소 5개 프롬프트 후 제안
const SUGGEST_COOLDOWN_HOURS = 24;      // 24시간에 한 번만 제안
const MIN_PATTERN_COUNT = 3;

// analyze-patterns.js 모듈 사용
const { analyzePatterns } = require('./analyze-patterns.js');

/**
 * 제안 쿨다운 체크
 */
function shouldSuggest() {
  try {
    if (fs.existsSync(LAST_SUGGEST_FILE)) {
      const lastSuggest = JSON.parse(fs.readFileSync(LAST_SUGGEST_FILE, 'utf8'));
      const lastTime = new Date(lastSuggest.timestamp);
      const now = new Date();
      const hoursDiff = (now - lastTime) / (1000 * 60 * 60);

      if (hoursDiff < SUGGEST_COOLDOWN_HOURS) {
        return false;
      }
    }
  } catch (e) {
    // 파일 문제 시 제안 허용
  }
  return true;
}

/**
 * 제안 시간 기록
 */
function recordSuggestion() {
  fs.writeFileSync(LAST_SUGGEST_FILE, JSON.stringify({
    timestamp: new Date().toISOString()
  }));
}

/**
 * 패턴 분석 (analyze-patterns.js 모듈 사용)
 */
function getTopPattern() {
  if (!fs.existsSync(PROMPTS_FILE)) {
    return null;
  }

  const data = JSON.parse(fs.readFileSync(PROMPTS_FILE, 'utf8'));

  if (data.prompts.length < MIN_PROMPTS_BEFORE_SUGGEST) {
    return null;
  }

  // analyze-patterns.js의 분석 결과 사용
  const result = analyzePatterns();

  if (!result.patterns || result.patterns.length === 0) {
    return null;
  }

  // 가장 빈번한 패턴 반환
  const top = result.patterns[0];

  return {
    count: top.count,
    prompt: top.representative,
    suggestedName: top.suggestedName,
    keywords: top.keywords
  };
}

/**
 * 메인
 */
function main() {
  try {
    // 쿨다운 체크
    if (!shouldSuggest()) {
      process.exit(0);
    }

    // 패턴 분석
    const pattern = getTopPattern();

    if (!pattern) {
      process.exit(0);
    }

    // 제안 시간 기록
    recordSuggestion();

    // stdout으로 Claude에게 컨텍스트 전달
    // (UserPromptSubmit와 SessionStart 훅에서 stdout은 Claude 컨텍스트로 주입됨)
    const suggestion = `
<pattern-detective-suggestion>
[Prompt Pattern] 반복 패턴을 발견했습니다.

"${pattern.prompt.substring(0, 60)}${pattern.prompt.length > 60 ? '...' : ''}"
와 비슷한 요청을 최근 ${pattern.count}회 하셨습니다.

/${pattern.suggestedName} 명령어로 만들면 더 빠르게 사용할 수 있어요.

사용자에게 간단히 알려주세요 (한 문장). 강요하지 말고, /patterns 명령어로 자세히 볼 수 있다고 안내하세요.
</pattern-detective-suggestion>
`.trim();

    console.log(suggestion);
    process.exit(0);

  } catch (e) {
    // 에러 로깅
    const logFile = path.join(DATA_DIR, 'error.log');
    fs.appendFileSync(logFile, `${new Date().toISOString()} - suggest error: ${e.message}\n`);
    process.exit(0);
  }
}

main();
