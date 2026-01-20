#!/usr/bin/env node

/**
 * Prompt Pattern Plugin - Capture Prompt Hook
 *
 * UserPromptSubmit hook에서 실행되어 모든 프롬프트를 저장한다.
 * stdin으로 Claude Code 컨텍스트를 받고, JSON 파일에 저장한다.
 */

const fs = require('fs');
const path = require('path');
const { loadConfig, getDataDir } = require('./config.js');

// 설정 로드
const config = loadConfig();
const DATA_DIR = getDataDir();
const PROMPTS_FILE = path.join(DATA_DIR, 'prompts.json');
const MAX_PROMPTS = config.maxStoredPrompts;

// 데이터 디렉토리 생성
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 기존 프롬프트 로드
function loadPrompts() {
  try {
    if (fs.existsSync(PROMPTS_FILE)) {
      return JSON.parse(fs.readFileSync(PROMPTS_FILE, 'utf8'));
    }
  } catch (e) {
    // 파일 손상 시 새로 시작
  }
  return { prompts: [], dismissed: [] };
}

// 프롬프트 저장
function savePrompts(data) {
  fs.writeFileSync(PROMPTS_FILE, JSON.stringify(data, null, 2));
}

// stdin에서 입력 읽기
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const context = JSON.parse(input);

    // 프롬프트 추출
    const prompt = context.prompt || '';

    // 빈 프롬프트 무시
    if (!prompt.trim()) {
      process.exit(0);
    }

    // 슬래시 명령어는 저장하지 않음 (이미 자동화된 것)
    if (prompt.trim().startsWith('/')) {
      process.exit(0);
    }

    // 데이터 로드
    const data = loadPrompts();

    // 새 프롬프트 추가 (LLM이 직접 분석하므로 토큰화 불필요)
    data.prompts.push({
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      prompt: prompt.trim(),
      timestamp: new Date().toISOString(),
      sessionId: context.sessionId || 'unknown',
      project: context.cwd || process.cwd()
    });

    // 최대 개수 유지 (오래된 것 삭제)
    if (data.prompts.length > MAX_PROMPTS) {
      data.prompts = data.prompts.slice(-MAX_PROMPTS);
    }

    // 저장
    savePrompts(data);

    // exit 0: 정상 통과 (Claude에게 프롬프트 전달)
    process.exit(0);
  } catch (e) {
    // 에러 발생해도 사용자 경험 방해 금지
    // 디버그용 로그
    const logFile = path.join(DATA_DIR, 'error.log');
    fs.appendFileSync(logFile, `${new Date().toISOString()} - capture error: ${e.message}\n`);
    process.exit(0);
  }
});

