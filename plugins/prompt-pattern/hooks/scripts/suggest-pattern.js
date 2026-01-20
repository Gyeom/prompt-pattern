#!/usr/bin/env node

/**
 * Prompt Pattern Plugin - Session Start Suggestion
 *
 * SessionStart hook에서 실행되어 패턴 분석을 Claude에게 요청한다.
 * stdout으로 출력하면 Claude가 컨텍스트로 받아서 사용자에게 전달한다.
 */

const fs = require('fs');
const path = require('path');
const { loadConfig, getDataDir } = require('./config.js');

// 설정 로드
const config = loadConfig();
const DATA_DIR = getDataDir();
const PROMPTS_FILE = path.join(DATA_DIR, 'prompts.json');
const LAST_SUGGEST_FILE = path.join(DATA_DIR, 'last-suggest.json');

const MIN_PROMPTS_BEFORE_SUGGEST = config.minPromptsBeforeSuggest;
const SUGGEST_COOLDOWN_HOURS = config.suggestCooldownHours;
const DAYS_TO_ANALYZE = config.daysToAnalyze;

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
 * 최근 프롬프트 가져오기
 */
function getRecentPrompts() {
  if (!fs.existsSync(PROMPTS_FILE)) {
    return null;
  }

  const data = JSON.parse(fs.readFileSync(PROMPTS_FILE, 'utf8'));

  if (data.prompts.length < MIN_PROMPTS_BEFORE_SUGGEST) {
    return null;
  }

  // 최근 N일 프롬프트만 필터링
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DAYS_TO_ANALYZE);

  const recentPrompts = data.prompts.filter(p => {
    const promptDate = new Date(p.timestamp);
    return promptDate >= cutoffDate;
  });

  if (recentPrompts.length < MIN_PROMPTS_BEFORE_SUGGEST) {
    return null;
  }

  return recentPrompts;
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

    // 최근 프롬프트 가져오기
    const prompts = getRecentPrompts();

    if (!prompts) {
      process.exit(0);
    }

    // 제안 시간 기록
    recordSuggestion();

    // 최근 20개 프롬프트만 Claude에게 전달 (컨텍스트 절약)
    const recentSample = prompts
      .slice(-20)
      .map(p => p.prompt)
      .join('\n- ');

    // stdout으로 Claude에게 컨텍스트 전달
    const suggestion = `
<pattern-suggestion>
[Prompt Pattern] 최근 ${prompts.length}개의 프롬프트를 분석해주세요.

최근 프롬프트 샘플:
- ${recentSample}

위 프롬프트들 중 반복되는 패턴이 있다면:
1. 한 문장으로 간단히 알려주세요 (예: "커밋 관련 요청이 자주 보이네요!")
2. /patterns 명령어로 자세히 볼 수 있다고 안내하세요
3. 강요하지 말고 자연스럽게 언급만 하세요

반복 패턴이 없다면 아무 말도 하지 마세요.
</pattern-suggestion>
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
