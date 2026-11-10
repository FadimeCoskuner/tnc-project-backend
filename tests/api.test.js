const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('child_process');
const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taskflow-test-'));
const dataFile = path.join(tempDir, 'tasks.json');
let baseUrl;
let server;
let serverOutput = '';

function findFreePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.on('error', reject);
    probe.listen(0, () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      return await fetch(baseUrl);
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  throw new Error('Sunucu başlamadı');
}

async function send(method, url, body) {
  const res = await fetch(`${baseUrl}${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function create(body) {
  const res = await send('POST', '/tasks', body);
  assert.equal(res.status, 201);
  return res.body;
}

before(async () => {
  const port = await findFreePort();
  baseUrl = `http://localhost:${port}`;
  server = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(port), TASKS_FILE: dataFile, CORS_ORIGINS: 'https://app.example.com' },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  server.stdout.on('data', (chunk) => {
    serverOutput += chunk;
  });
  await waitForServer();
});

after(() => {
  server.kill();
  fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

// Her test boş veriyle başlar; dosya yoksa API boş liste kabul eder.
beforeEach(() => {
  fs.rmSync(dataFile, { force: true });
});

test('CRUD: görev eklenir, listelenir, güncellenir ve silinir', async () => {
  const created = await create({ title: 'Rapor yaz', description: 'Aylık', priority: 'high', assignee: 'Musa' });
  assert.equal(created.status, 'pending');
  assert.ok(created.id && created.createdAt && created.updatedAt);

  assert.deepEqual((await send('GET', '/tasks')).body, [created]);
  assert.deepEqual((await send('GET', `/tasks/${created.id}`)).body, created);

  const updated = await send('PUT', `/tasks/${created.id}`, { title: 'Rapor bitir', status: 'in-progress' });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.title, 'Rapor bitir');
  assert.equal(updated.body.assignee, null);
  assert.equal(updated.body.createdAt, created.createdAt);

  assert.equal((await send('DELETE', `/tasks/${created.id}`)).status, 204);
  assert.equal((await send('GET', `/tasks/${created.id}`)).status, 404);
  assert.equal((await send('DELETE', `/tasks/${created.id}`)).status, 404);
});

test('PATCH yalnızca gönderilen alanları değiştirir', async () => {
  const created = await create({ title: 'Kısmi', description: 'Kalsın', assignee: 'Musa' });
  const patched = await send('PATCH', `/tasks/${created.id}`, { status: 'completed' });

  assert.equal(patched.status, 200);
  assert.equal(patched.body.status, 'completed');
  assert.equal(patched.body.description, 'Kalsın');
  assert.equal(patched.body.assignee, 'Musa');
  assert.equal((await send('PATCH', '/tasks/yok', { status: 'pending' })).status, 404);
});

test('logger yöntem, adres ve zaman damgası yazar', async () => {
  await send('GET', '/tasks?status=pending');
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.match(serverOutput, /\[\d{4}-\d{2}-\d{2}T[\d:.]+Z\] GET \/tasks\?status=pending/);
});

test('doğrulama geçersiz veride 400 döndürür', async () => {
  const invalidBodies = [
    {},
    { title: '   ' },
    { title: 5 },
    { title: 'a'.repeat(201) },
    { title: 'x', description: 5 },
    { title: 'x', description: 'a'.repeat(2001) },
    { title: 'x', status: 'bitti' },
    { title: 'x', priority: 'acil' },
    { title: 'x', assignee: 5 },
    { title: 'x', assignee: 'a'.repeat(101) },
  ];

  for (const body of invalidBodies) {
    const res = await send('POST', '/tasks', body);
    assert.equal(res.status, 400, JSON.stringify(body).slice(0, 60));
    assert.equal(res.body.error.message, 'Doğrulama hatası');
    assert.ok(res.body.error.details.length > 0);
  }

  const created = await create({ title: 'Geçerli' });
  assert.equal((await send('PATCH', `/tasks/${created.id}`, {})).status, 400);
  assert.equal((await send('PATCH', `/tasks/${created.id}`, { id: 'x' })).status, 400);
  assert.equal((await send('PUT', `/tasks/${created.id}`, { status: 'completed' })).status, 400);
  assert.deepEqual((await send('GET', '/tasks')).body, [created]);
});

test('geçersiz JSON 400 döndürür', async () => {
  const res = await fetch(`${baseUrl}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{ bozuk',
  });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error.message, 'İstek gövdesi geçerli JSON değil');
});

test('sunucu alanları istemciden kabul edilmez, metinler kırpılır', async () => {
  const created = await create({ id: 'x', createdAt: 'dün', title: '  Kırp  ', description: ' d ', assignee: '   ' });

  assert.notEqual(created.id, 'x');
  assert.notEqual(created.createdAt, 'dün');
  assert.equal(created.title, 'Kırp');
  assert.equal(created.description, 'd');
  assert.equal(created.assignee, null);
});

test('aynı başlıkla açık görev eklenemez', async () => {
  const first = await create({ title: 'İlk görev', assignee: 'Musa' });

  for (const body of [
    { title: 'İlk görev', assignee: 'Musa' },
    { title: '  ilk   GÖREV ' },
    { title: 'İlk görev', assignee: 'Ayşe', priority: 'low', description: 'Başka' },
    { title: 'İlk görev', status: 'in-progress' },
  ]) {
    const res = await send('POST', '/tasks', body);
    assert.equal(res.status, 409);
    assert.equal(res.body.error.details.existingId, first.id);
  }
});

test('tamamlanan görev engel olmaz, yeniden açarken çakışma kontrol edilir', async () => {
  const done = await create({ title: 'Tekrar', status: 'completed' });
  const open = await create({ title: 'Tekrar' });
  await create({ title: 'Tekrar', status: 'completed' });

  assert.equal((await send('PATCH', `/tasks/${done.id}`, { status: 'pending' })).status, 409);
  assert.equal((await send('PATCH', `/tasks/${open.id}`, { status: 'completed' })).status, 200);
  assert.equal((await send('PATCH', `/tasks/${done.id}`, { status: 'pending' })).status, 200);
});

test('PUT görevin kendisiyle çakışmaz, başka görevle çakışır', async () => {
  const first = await create({ title: 'Bir' });
  const second = await create({ title: 'İki' });

  assert.equal((await send('PUT', `/tasks/${first.id}`, { title: 'Bir', priority: 'high' })).status, 200);
  assert.equal((await send('PUT', `/tasks/${second.id}`, { title: 'Bir' })).status, 409);
  assert.equal((await send('PATCH', `/tasks/${second.id}`, { title: 'bir' })).status, 409);
});

test('eşzamanlı aynı isteklerden yalnızca biri kabul edilir', async () => {
  const results = await Promise.all(Array.from({ length: 20 }, () => send('POST', '/tasks', { title: 'Yarış' })));

  assert.equal(results.filter((res) => res.status === 201).length, 1);
  assert.equal(results.filter((res) => res.status === 409).length, 19);
  assert.equal((await send('GET', '/tasks')).body.length, 1);
});

test('durum, öncelik ve kişiye göre filtreler', async () => {
  const a = await create({ title: 'A', status: 'completed', priority: 'high', assignee: 'Musa' });
  const b = await create({ title: 'B', priority: 'high', assignee: 'Ayşe' });
  const c = await create({ title: 'C', priority: 'low' });
  const ids = (res) => res.body.map((task) => task.id);

  assert.deepEqual(ids(await send('GET', '/tasks?status=completed')), [a.id]);
  assert.deepEqual(ids(await send('GET', '/tasks?priority=high')), [a.id, b.id]);
  assert.deepEqual(ids(await send('GET', '/tasks?priority=high&assignee=MUSA')), [a.id]);
  assert.deepEqual(ids(await send('GET', '/tasks?assignee=')), [c.id]);

  assert.equal((await send('GET', '/tasks?status=bitti')).status, 400);
  assert.equal((await send('GET', '/tasks?priority=acil')).status, 400);
  assert.equal((await send('GET', '/tasks?assignee=a&assignee=b')).status, 400);
});

test('başlık ve açıklamada arar', async () => {
  const title = await create({ title: 'Backend geliştirme' });
  const description = await create({ title: 'Toplantı', description: 'BACKEND ekibi' });
  await create({ title: 'Tasarım' });
  const ids = (res) => res.body.map((task) => task.id);

  assert.deepEqual(ids(await send('GET', '/tasks/search?keyword=backend')), [title.id, description.id]);
  assert.deepEqual((await send('GET', '/tasks/search?keyword=yok')).body, []);
  assert.deepEqual(ids(await send('GET', '/tasks/search?keyword=backend&sort=-title')), [description.id, title.id]);

  assert.equal((await send('GET', '/tasks/search')).status, 400);
  assert.equal((await send('GET', '/tasks/search?keyword=%20')).status, 400);
});

test('kullanıcıya göre listeler', async () => {
  const first = await create({ title: 'Bir', assignee: 'Musa' });
  await create({ title: 'İki', assignee: 'Ayşe' });
  const third = await create({ title: 'Üç', assignee: 'musa', status: 'completed' });

  assert.deepEqual((await send('GET', '/tasks/assignee/musa')).body.map((task) => task.id), [first.id, third.id]);
  assert.deepEqual((await send('GET', '/tasks/assignee/MUSA?status=completed')).body.map((task) => task.id), [third.id]);
  assert.deepEqual((await send('GET', '/tasks/assignee/kimse')).body, []);
});

test('sayfalar', async () => {
  for (const number of [1, 2, 3, 4, 5]) await create({ title: `Görev ${number}` });

  const second = await send('GET', '/tasks?page=2&limit=2');
  assert.deepEqual(second.body.data.map((task) => task.title), ['Görev 3', 'Görev 4']);
  assert.deepEqual(second.body.pagination, { page: 2, limit: 2, total: 5, totalPages: 3 });

  assert.equal((await send('GET', '/tasks?page=1')).body.pagination.limit, 10);
  assert.deepEqual((await send('GET', '/tasks?page=9&limit=2')).body.data, []);
  assert.ok(Array.isArray((await send('GET', '/tasks')).body));

  for (const query of ['page=0', 'page=abc', 'page=1.5', 'limit=0', 'limit=101', 'page=99999999999999999999']) {
    assert.equal((await send('GET', `/tasks?${query}`)).status, 400, query);
  }
});

test('sıralar, öncelik ve durumu anlamına göre sıralar', async () => {
  await create({ title: 'Zeytin', priority: 'medium' });
  await create({ title: 'Çay', priority: 'high', status: 'completed' });
  await create({ title: 'Ceviz', priority: 'low', status: 'in-progress' });
  const titles = (res) => res.body.map((task) => task.title);

  assert.deepEqual(titles(await send('GET', '/tasks?sort=title')), ['Ceviz', 'Çay', 'Zeytin']);
  assert.deepEqual(titles(await send('GET', '/tasks?sort=priority')), ['Ceviz', 'Zeytin', 'Çay']);
  assert.deepEqual(titles(await send('GET', '/tasks?sort=-priority')), ['Çay', 'Zeytin', 'Ceviz']);
  assert.deepEqual(titles(await send('GET', '/tasks?sort=status')), ['Zeytin', 'Ceviz', 'Çay']);
  assert.deepEqual(titles(await send('GET', '/tasks?sort=createdAt')), ['Zeytin', 'Çay', 'Ceviz']);

  assert.equal((await send('GET', '/tasks?sort=id')).status, 400);
  assert.equal((await send('GET', '/tasks?sort=-')).status, 400);
});

test('filtre, sıralama ve sayfalama birlikte çalışır', async () => {
  await create({ title: 'C', priority: 'high' });
  await create({ title: 'A', priority: 'high' });
  await create({ title: 'B', priority: 'low' });

  const res = await send('GET', '/tasks?priority=high&sort=title&page=1&limit=1');
  assert.deepEqual(res.body.data.map((task) => task.title), ['A']);
  assert.deepEqual(res.body.pagination, { page: 1, limit: 1, total: 2, totalPages: 2 });
});

test('raporlar doğru sayar', async () => {
  await create({ title: 'A', status: 'completed', priority: 'high', assignee: 'Musa' });
  await create({ title: 'B', status: 'in-progress', priority: 'high', assignee: 'musa' });
  await create({ title: 'C', priority: 'low', assignee: 'Ayşe' });
  await create({ title: 'D' });

  assert.deepEqual((await send('GET', '/reports/completed')).body, { status: 'completed', count: 1 });
  assert.deepEqual((await send('GET', '/reports/pending')).body, { status: 'pending', count: 2 });
  assert.deepEqual((await send('GET', '/reports/summary')).body, {
    total: 4,
    byStatus: { pending: 2, 'in-progress': 1, completed: 1 },
    byPriority: { low: 1, medium: 1, high: 2 },
    byAssignee: [
      { assignee: 'Musa', total: 2, completed: 1, open: 1 },
      { assignee: 'Ayşe', total: 1, completed: 0, open: 1 },
    ],
    unassigned: 1,
    completionRate: 25,
  });
});

test('boş veride raporlar sıfır döndürür', async () => {
  const summary = (await send('GET', '/reports/summary')).body;

  assert.equal(summary.total, 0);
  assert.equal(summary.completionRate, 0);
  assert.deepEqual(summary.byAssignee, []);
  assert.equal((await send('GET', '/reports/completed')).body.count, 0);
});

test('bilinmeyen adresler 404, kök adres arayüzü döndürür', async () => {
  assert.equal((await send('GET', '/yok')).status, 404);
  assert.equal((await send('GET', '/reports/yok')).status, 404);

  const root = await fetch(baseUrl);
  assert.equal(root.status, 200);
  assert.match(root.headers.get('content-type'), /text\/html/);
  assert.match(await root.text(), /<title>TaskFlow<\/title>/);

  for (const asset of ['/styles.css', '/js/main.js', '/js/api.js']) {
    assert.equal((await fetch(`${baseUrl}${asset}`)).status, 200, asset);
  }
});

test('CORS izin verilen adreslere başlık ekler', async () => {
  const origin = async (value, method = 'GET') =>
    fetch(`${baseUrl}/tasks`, { method, headers: { Origin: value } });

  const preflight = await origin('http://localhost:5173', 'OPTIONS');
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  assert.match(preflight.headers.get('access-control-allow-methods'), /PATCH/);

  const allowed = await origin('https://app.example.com');
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://app.example.com');

  const blocked = await origin('https://baska.example.com');
  assert.equal(blocked.headers.get('access-control-allow-origin'), null);
});

test('yazma sonrası geçici dosya kalmaz ve veri geçerli JSON olur', async () => {
  await create({ title: 'Kalıcı' });

  assert.deepEqual(fs.readdirSync(tempDir), ['tasks.json']);
  assert.equal(JSON.parse(fs.readFileSync(dataFile, 'utf-8'))[0].title, 'Kalıcı');
});
