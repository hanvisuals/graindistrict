import worker from '../worker/worker.js';

class FlakyD1 {
  constructor(failures) {
    this.failures = failures;
    this.attempts = 0;
    this.rows = new Map();
  }

  prepare(sql) {
    const database = this;
    let params = [];
    return {
      bind(...values) { params = values; return this; },
      async run() {
        if (/CREATE TABLE/i.test(sql)) return {success: true};
        if (/INSERT INTO gd_store/i.test(sql)) {
          database.rows.set(params[0], params[1]);
          return {success: true};
        }
        return {success: true};
      },
      async first() {
        database.attempts++;
        if (database.attempts <= database.failures) {
          throw new Error('D1_ERROR: internal error; reference = diagnostic-test');
        }
        const value = database.rows.get(params[0]);
        return value == null ? null : {v: value};
      },
      async all() { return {results: []};
      }
    };
  }
}

function loginRequest() {
  return new Request('https://example.test/api/login', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email: 'missing@example.test', password: 'not-the-password'})
  });
}

const ok = (name, condition, detail) => {
  console.log((condition ? 'PASS' : 'FAIL') + ' - ' + name +
    (!condition && detail !== undefined ? ' ' + JSON.stringify(detail) : ''));
  if (!condition) process.exitCode = 1;
};

const recovers = new FlakyD1(2);
const recoveredResponse = await worker.fetch(loginRequest(), {GD_KV: recovers});
const recoveredBody = await recoveredResponse.json();
ok('a transient D1 internal error is retried before login fails',
  recoveredResponse.status === 401 && recovers.attempts === 3 && /E-posta/.test(recoveredBody.error),
  {status: recoveredResponse.status, attempts: recovers.attempts, body: recoveredBody});

const unavailable = new FlakyD1(99);
const unavailableResponse = await worker.fetch(loginRequest(), {GD_KV: unavailable});
const unavailableBody = await unavailableResponse.json();
ok('an exhausted D1 outage returns a friendly retryable service response',
  unavailableResponse.status === 503 && unavailable.attempts === 4 &&
    /sifrenizle ilgili degil/.test(unavailableBody.error) && !/reference/.test(unavailableBody.error),
  {status: unavailableResponse.status, attempts: unavailable.attempts, body: unavailableBody});
