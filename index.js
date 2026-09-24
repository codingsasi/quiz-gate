const http = require('node:http');
const fs = require('node:fs');

const password = process.env.QUIZ_PASSWORD;
const roster = fs.readFileSync('/app/students.csv', 'utf8').trim().split(/\n/).slice(1)
  .map((line) => {
    const [email, studentId] = line.split(',').map((value) => value.trim());
    return { email, studentId, key: `${email.toLowerCase()}+${studentId}` };
  });
const logPath = '/data/requests.jsonl';

function log(req, status, event, fields = {}) {
  const forwardedIp = req.headers['x-forwarded-for'];
  const entry = {
    time: new Date().toISOString(),
    event,
    method: req.method,
    path: new URL(req.url, 'http://localhost').pathname,
    status,
    ip: (forwardedIp || req.socket.remoteAddress || '').toString().split(',')[0].trim(),
    userAgent: req.headers['user-agent'] || null,
    referer: req.headers.referer || null,
    origin: req.headers.origin || null,
    acceptLanguage: req.headers['accept-language'] || null,
    accept: req.headers.accept || null,
    contentType: req.headers['content-type'] || null,
    contentLength: req.headers['content-length'] || null,
    fetchSite: req.headers['sec-fetch-site'] || null,
    fetchMode: req.headers['sec-fetch-mode'] || null,
    ...fields,
  };
  fs.appendFileSync(logPath, `${JSON.stringify(entry)}\n`);
}

function reply(req, res, content, status = 200, event = 'request', fields = {}) {
  log(req, status, event, fields);
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(content);
}

const server = http.createServer((req, res) => {
  req.on('aborted', () => log(req, 400, 'request_aborted'));
  if (new URL(req.url, 'http://localhost').pathname !== '/') {
    return reply(req, res, 'Not found', 404, 'route_rejected');
  }
  if (!['GET', 'POST'].includes(req.method)) {
    return reply(req, res, 'Method not allowed', 405, 'method_rejected');
  }

  if (req.method === 'GET') {
    return reply(req, res, `<!doctype html><html lang="en"><meta charset="utf-8"><title>Quiz access</title><body>
      <h1>Quiz access</h1>
      <form method="post"><label>Algoma University Email <input name="email" type="email" required></label>
      <label>Student ID <input name="studentId" type="number" required></label><button>Get quiz password</button></form>
    </body></html>`, 200, 'page_view');
  }

  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });
  req.on('end', () => {
    const form = new URLSearchParams(body);
    const email = (form.get('email') || '').trim();
    const studentId = (form.get('studentId') || '').trim();
    const student = roster.find((row) => row.key === `${email.toLowerCase()}+${studentId}`);
    if (!student) return reply(req, res, 'Email and student ID not found.', 403, 'roster_mismatch', { email, studentId });

    if (form.get('action') === 'copied') {
      return reply(req, res, 'Copy recorded', 200, 'password_copied', { email, studentId });
    }

    return reply(req, res, `
      <!doctype html>
      <html lang="en">
      <meta charset="utf-8">
      <title>Quiz password</title>
      <body>
      <h1>Quiz password</h1><code id="quiz-password">${password}</code>
      <form id="copy-form" method="post"><input type="hidden" name="action" value="copied">
      <input type="hidden" name="email" value="${student.email}">
      <input type="hidden" name="studentId" value="${student.studentId}">
      <button id="copy-button" type="button">Copy password</button></form>
      <p id="copy-status" aria-live="polite"></p>
      <script>
        const form = document.getElementById('copy-form');
        const status = document.getElementById('copy-status');
        document.getElementById('copy-button').addEventListener('click', async () => {
          const text = document.getElementById('quiz-password').textContent;
          try {
            if (navigator.clipboard && window.isSecureContext) {
              await navigator.clipboard.writeText(text);
            } else {
              const field = document.createElement('textarea');
              field.value = text;
              document.body.appendChild(field);
              field.select();
              const copied = document.execCommand('copy');
              field.remove();
              if (!copied) throw new Error('Copy failed');
            }
            const response = await fetch('/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams(new FormData(form)),
            });
            if (!response.ok) throw new Error('Confirmation failed');
            status.textContent = 'Copied and recorded. The password is still shown above.';
          } catch {
            status.textContent = 'Could not copy. Select and copy the password manually.';
          }
        });
      </script></body></html>`, 200, 'password_issued', { email, studentId });
  });
});

server.listen(3000, '0.0.0.0');
