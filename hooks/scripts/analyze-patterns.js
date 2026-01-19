#!/usr/bin/env node

/**
 * Prompt Pattern Plugin - Pattern Analyzer
 *
 * 저장된 프롬프트를 분석하여 반복 패턴을 찾는다.
 * Jaccard 유사도 기반 클러스터링 사용.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// 설정
const DATA_DIR = path.join(os.homedir(), '.prompt-pattern');
const PROMPTS_FILE = path.join(DATA_DIR, 'prompts.json');
const SIMILARITY_THRESHOLD = 0.4;  // 40% 이상 유사하면 같은 패턴
const MIN_PATTERN_COUNT = 3;       // 최소 3번 반복해야 패턴
const DAYS_TO_ANALYZE = 14;        // 최근 14일 분석

/**
 * 메인 분석 함수
 */
function analyzePatterns() {
  // 데이터 로드
  if (!fs.existsSync(PROMPTS_FILE)) {
    return { patterns: [], stats: { totalPrompts: 0, analyzedPrompts: 0 } };
  }

  const data = JSON.parse(fs.readFileSync(PROMPTS_FILE, 'utf8'));
  const dismissed = new Set(data.dismissed || []);

  // 최근 N일 프롬프트만 필터링
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DAYS_TO_ANALYZE);

  const recentPrompts = data.prompts.filter(p => {
    const promptDate = new Date(p.timestamp);
    return promptDate >= cutoffDate;
  });

  if (recentPrompts.length < MIN_PATTERN_COUNT) {
    return {
      patterns: [],
      stats: {
        totalPrompts: data.prompts.length,
        analyzedPrompts: recentPrompts.length
      }
    };
  }

  // 클러스터링
  const clusters = clusterPrompts(recentPrompts);

  // 패턴 추출 (MIN_PATTERN_COUNT 이상, dismissed 제외)
  const patterns = clusters
    .filter(cluster => cluster.length >= MIN_PATTERN_COUNT)
    .map(cluster => {
      // 클러스터 대표 프롬프트 (가장 짧은 것 = 가장 핵심적)
      const sorted = [...cluster].sort((a, b) => a.prompt.length - b.prompt.length);
      const representative = sorted[0];

      // 패턴 ID 생성 (대표 프롬프트 기반)
      const patternId = generatePatternId(representative.prompt);

      // dismissed 체크
      if (dismissed.has(patternId)) {
        return null;
      }

      // 공통 키워드 추출
      const keywords = extractCommonKeywords(cluster);

      // 제안 Skill 이름
      const suggestedName = suggestSkillName(keywords, representative.prompt);

      return {
        id: patternId,
        count: cluster.length,
        representative: representative.prompt,
        examples: cluster.slice(0, 5).map(p => p.prompt),
        keywords,
        suggestedName,
        firstSeen: cluster[cluster.length - 1].timestamp,
        lastSeen: cluster[0].timestamp,
        projects: [...new Set(cluster.map(p => path.basename(p.project || 'unknown')))]
      };
    })
    .filter(p => p !== null)
    .sort((a, b) => b.count - a.count);  // 빈도순 정렬

  return {
    patterns,
    stats: {
      totalPrompts: data.prompts.length,
      analyzedPrompts: recentPrompts.length,
      clustersFound: clusters.length,
      patternsFound: patterns.length
    }
  };
}

/**
 * Jaccard 유사도 기반 클러스터링
 */
function clusterPrompts(prompts) {
  const clusters = [];
  const assigned = new Set();

  // 최신 순으로 정렬
  const sorted = [...prompts].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  for (let i = 0; i < sorted.length; i++) {
    if (assigned.has(i)) continue;

    const cluster = [sorted[i]];
    assigned.add(i);

    for (let j = i + 1; j < sorted.length; j++) {
      if (assigned.has(j)) continue;

      const similarity = jaccardSimilarity(
        sorted[i].tokens || [],
        sorted[j].tokens || []
      );

      if (similarity >= SIMILARITY_THRESHOLD) {
        cluster.push(sorted[j]);
        assigned.add(j);
      }
    }

    if (cluster.length >= 2) {
      clusters.push(cluster);
    }
  }

  return clusters;
}

/**
 * Jaccard 유사도 계산
 */
function jaccardSimilarity(tokens1, tokens2) {
  if (tokens1.length === 0 || tokens2.length === 0) return 0;

  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

/**
 * 패턴 ID 생성
 */
function generatePatternId(prompt) {
  // 간단한 해시
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) {
    const char = prompt.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'pattern_' + Math.abs(hash).toString(36);
}

/**
 * 클러스터에서 공통 키워드 추출
 */
function extractCommonKeywords(cluster) {
  const tokenCounts = {};

  cluster.forEach(p => {
    const tokens = p.tokens || [];
    tokens.forEach(t => {
      tokenCounts[t] = (tokenCounts[t] || 0) + 1;
    });
  });

  // 클러스터 크기의 50% 이상에서 등장하는 키워드
  const threshold = cluster.length * 0.5;
  return Object.entries(tokenCounts)
    .filter(([_, count]) => count >= threshold)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([token]) => token);
}

/**
 * Skill 이름 제안
 */
function suggestSkillName(keywords, representative) {
  // 키워드 기반 이름 생성
  const actionWords = {
    'commit': 'commit',
    '커밋': 'commit',
    'test': 'test',
    '테스트': 'test',
    'lint': 'lint',
    'format': 'format',
    'build': 'build',
    '빌드': 'build',
    'deploy': 'deploy',
    '배포': 'deploy',
    'review': 'review',
    '리뷰': 'review',
    'refactor': 'refactor',
    '리팩토링': 'refactor',
    'fix': 'fix',
    '수정': 'fix',
    'add': 'add',
    '추가': 'add',
    'delete': 'delete',
    '삭제': 'delete',
    'update': 'update',
    '업데이트': 'update',
    'pr': 'pr',
    'push': 'push'
  };

  for (const keyword of keywords) {
    if (actionWords[keyword]) {
      return actionWords[keyword];
    }
  }

  // 첫 번째 키워드 사용
  if (keywords.length > 0) {
    return keywords[0].replace(/[^a-z0-9]/gi, '-').toLowerCase();
  }

  // 폴백: 랜덤
  return 'quick-action-' + Date.now().toString(36).slice(-4);
}

/**
 * CLI 출력
 */
function main() {
  const result = analyzePatterns();

  // JSON 형식으로 출력 (다른 스크립트에서 사용)
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // 사람이 읽기 좋은 형식
  console.log('\n🔍 Prompt Pattern Analysis');
  console.log('═'.repeat(50));
  console.log(`📊 Stats: ${result.stats.analyzedPrompts} prompts analyzed (last ${DAYS_TO_ANALYZE} days)`);
  console.log();

  if (result.patterns.length === 0) {
    console.log('No patterns found yet. Keep using Claude Code!');
    return;
  }

  result.patterns.forEach((pattern, i) => {
    console.log(`${i + 1}. "${pattern.representative.substring(0, 50)}${pattern.representative.length > 50 ? '...' : ''}"`);
    console.log(`   Count: ${pattern.count} times | Keywords: ${pattern.keywords.join(', ')}`);
    console.log(`   Suggested: /${pattern.suggestedName}`);
    console.log();
  });
}

// 직접 실행 시
if (require.main === module) {
  main();
}

// 모듈로 사용 시
module.exports = { analyzePatterns };
