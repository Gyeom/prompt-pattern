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

    // 새 프롬프트 추가
    data.prompts.push({
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      prompt: prompt.trim(),
      timestamp: new Date().toISOString(),
      sessionId: context.sessionId || 'unknown',
      project: context.cwd || process.cwd(),
      // 토큰화된 단어들 (간단한 유사도 계산용)
      tokens: tokenize(prompt)
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

/**
 * 간단한 토큰화 (유사도 계산용)
 */
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s]/g, ' ')  // 특수문자 제거
    .split(/\s+/)
    .filter(t => t.length > 1)  // 1글자 제거
    .filter(t => !isStopWord(t));  // 불용어 제거
}

/**
 * 불용어 체크
 */
function isStopWord(word) {
  const stopWords = new Set([
    // 영어
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
    'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
    'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither',
    'not', 'only', 'own', 'same', 'than', 'too', 'very', 'just',
    'this', 'that', 'these', 'those', 'it', 'its',
    'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves',
    'you', 'your', 'yours', 'yourself', 'yourselves',
    'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself',
    'they', 'them', 'their', 'theirs', 'themselves',
    'what', 'which', 'who', 'whom', 'when', 'where', 'why', 'how',
    // 한국어
    '이', '그', '저', '것', '수', '등', '들', '및', '에', '의', '가', '를',
    '은', '는', '이다', '있다', '하다', '되다', '않다', '없다', '같다',
    '위해', '대해', '통해', '따라', '관해', '해서', '해줘', '줘', '좀'
  ]);
  return stopWords.has(word);
}
