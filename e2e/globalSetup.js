const path = require('path');

// Project-local test DB path — kept separate from the dev DB at server/app.db
// so test runs never touch dev data. The server (server/db.js) ensures the
// parent directory exists when DB_PATH is set.
// Note: this file is not a traditional Playwright globalSetup (which runs
// AFTER webServer starts — too late for DB path setup). It's imported by
// playwright.config.js purely to share TEST_DB_PATH with the webServer env.
const TEST_DB_DIR = path.join(__dirname, '..', '.test-tmp');
const TEST_DB_PATH = path.join(TEST_DB_DIR, 'relative-pointing-test.db');

module.exports.TEST_DB_PATH = TEST_DB_PATH;
