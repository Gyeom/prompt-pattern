/**
 * Prompt Pattern Plugin - Configuration Loader
 *
 * Loads config from ~/.prompt-pattern/config.json with defaults.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const DATA_DIR = path.join(os.homedir(), '.prompt-pattern');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

// Default configuration
const DEFAULTS = {
  minPatternCount: 3,             // Minimum 3 repetitions
  daysToAnalyze: 14,              // Analyze last 14 days
  suggestCooldownHours: 24,       // Suggest once per 24 hours
  minPromptsBeforeSuggest: 5,     // Min 5 prompts before suggesting
  maxStoredPrompts: 1000          // Max 1000 prompts stored
};

/**
 * Load configuration with defaults
 */
function loadConfig() {
  let userConfig = {};

  try {
    if (fs.existsSync(CONFIG_FILE)) {
      userConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch (e) {
    // Invalid config file, use defaults
  }

  return { ...DEFAULTS, ...userConfig };
}

/**
 * Get data directory path
 */
function getDataDir() {
  return DATA_DIR;
}

module.exports = {
  loadConfig,
  getDataDir,
  DEFAULTS
};
