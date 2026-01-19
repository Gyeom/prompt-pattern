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
const MIN_PROMPTS_BEFORE_SUGGEST = 10;  // 최소 10개 프롬프트 후 제안
const SUGGEST_COOLDOWN_HOURS = 24;      // 24시간에 한 번만 제안
const MIN_PATTERN_COUNT = 3;

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
 * 패턴 분석 (analyze-patterns.js 로직 간소화)
 */
function getTopPattern() {
  if (!fs.existsSync(PROMPTS_FILE)) {
    return null;
  }

  const data = JSON.parse(fs.readFileSync(PROMPTS_FILE, 'utf8'));
  const dismissed = new Set(data.dismissed || []);

  if (data.prompts.length < MIN_PROMPTS_BEFORE_SUGGEST) {
    return null;
  }

  // 최근 7일
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 7);

  const recentPrompts = data.prompts.filter(p =>
    new Date(p.timestamp) >= cutoffDate
  );

  if (recentPrompts.length < MIN_PATTERN_COUNT) {
    return null;
  }

  // 간단한 패턴 찾기: 토큰 기반 그룹핑
  const groups = {};

  recentPrompts.forEach(p => {
    const key = (p.tokens || []).sort().join('|');
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(p);
  });

  // 가장 큰 그룹 찾기
  let topGroup = null;
  let maxCount = 0;

  Object.values(groups).forEach(group => {
    if (group.length > maxCount && group.length >= MIN_PATTERN_COUNT) {
      // dismissed 체크
      const patternId = 'pattern_' + Math.abs(hashCode(group[0].prompt)).toString(36);
      if (!dismissed.has(patternId)) {
        maxCount = group.length;
        topGroup = group;
      }
    }
  });

  if (!topGroup) {
    return null;
  }

  // 패턴 정보 구성
  const representative = topGroup.sort((a, b) =>
    a.prompt.length - b.prompt.length
  )[0];

  const keywords = extractKeywords(topGroup);
  const suggestedName = suggestName(keywords);

  return {
    count: topGroup.length,
    prompt: representative.prompt,
    suggestedName,
    keywords
  };
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return hash;
}

function extractKeywords(group) {
  const counts = {};
  group.forEach(p => {
    (p.tokens || []).forEach(t => {
      counts[t] = (counts[t] || 0) + 1;
    });
  });

  return Object.entries(counts)
    .filter(([_, c]) => c >= group.length * 0.5)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => t);
}

function suggestName(keywords) {
  const mapping = {
    'commit': 'commit', '커밋': 'commit',
    'test': 'test', '테스트': 'test',
    'build': 'build', '빌드': 'build',
    'deploy': 'deploy', '배포': 'deploy',
    'lint': 'lint', 'format': 'format',
    'pr': 'pr', 'push': 'push',
    'review': 'review', '리뷰': 'review'
  };

  for (const k of keywords) {
    if (mapping[k]) return mapping[k];
  }
  return keywords[0] || 'quick-action';
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
