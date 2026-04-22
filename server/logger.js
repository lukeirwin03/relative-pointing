const fs = require('fs');
const path = require('path');
const util = require('util');

// When LOG_DIR is set, tee every console.log / console.error to a rolling
// text file on the mounted volume. stdout is untouched so `docker logs` and
// the awslogs/CloudWatch driver on ECS keep receiving the same stream.
const LOG_DIR = process.env.LOG_DIR;

if (LOG_DIR) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });

    const filename = `app-${new Date().toISOString().slice(0, 10)}.log`;
    const stream = fs.createWriteStream(path.join(LOG_DIR, filename), {
      flags: 'a',
    });

    const format = (level, args) => {
      const ts = new Date().toISOString();
      const body = args
        .map((a) => (typeof a === 'string' ? a : util.inspect(a, { depth: 4 })))
        .join(' ');
      return `[${ts}] [${level}] ${body}\n`;
    };

    const origLog = console.log.bind(console);
    const origError = console.error.bind(console);
    const origWarn = console.warn.bind(console);

    console.log = (...args) => {
      origLog(...args);
      stream.write(format('INFO', args));
    };
    console.error = (...args) => {
      origError(...args);
      stream.write(format('ERROR', args));
    };
    console.warn = (...args) => {
      origWarn(...args);
      stream.write(format('WARN', args));
    };

    // Flush pending writes on shutdown so we don't lose the last few lines.
    const close = () => stream.end();
    process.once('SIGTERM', close);
    process.once('SIGINT', close);
    process.once('beforeExit', close);

    origLog(`[logger] writing to ${path.join(LOG_DIR, filename)}`);
  } catch (err) {
    // Fall back to stdout-only; a bad mount should never take the app down.
    console.error('[logger] failed to initialize file logger:', err.message);
  }
}
