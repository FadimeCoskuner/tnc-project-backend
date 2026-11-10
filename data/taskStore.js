const fs = require('fs/promises');
const path = require('path');
const { AppError } = require('../middleware/errorHandler');
const { normalizeText } = require('../utils/text');

// Testler gerçek veriye dokunmamak için TASKS_FILE ile başka bir dosya kullanır.
const DATA_FILE = process.env.TASKS_FILE || path.join(__dirname, 'tasks.json');

// Dosya işlemlerini sıraya alır, böylece eşzamanlı istekler birbirinin yazdığını ezmez.
let queue = Promise.resolve();

function enqueue(operation) {
  const result = queue.then(operation);
  queue = result.catch(() => {});
  return result;
}

async function readTasks() {
  try {
    const content = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

// OneDrive gibi eşitleme araçları dosyayı Windows'ta kısa süreliğine kilitleyebilir.
async function renameWithRetry(from, to, attempts = 5) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fs.rename(from, to);
    } catch (err) {
      if (attempt >= attempts || !['EPERM', 'EBUSY', 'EACCES'].includes(err.code)) throw err;
      await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
    }
  }
}

// Önce geçici dosyaya yazar; yazma yarıda kalırsa asıl veri bozulmaz.
async function writeTasks(tasks) {
  const tempFile = `${DATA_FILE}.tmp`;
  await fs.writeFile(tempFile, `${JSON.stringify(tasks, null, 2)}\n`, 'utf-8');
  await renameWithRetry(tempFile, DATA_FILE);
}

function isOpen(task) {
  return task.status !== 'completed';
}

// Kuyruk içinde çağrılmalıdır; aksi halde eşzamanlı iki istek aynı görevi ekleyebilir.
// Tamamlanmış görevler engel sayılmaz, böylece aynı iş daha sonra yeniden eklenebilir.
function assertUnique(tasks, candidate) {
  if (!isOpen(candidate)) return;

  const title = normalizeText(candidate.title);
  const duplicate = tasks.find((task) => task.id !== candidate.id && isOpen(task) && normalizeText(task.title) === title);
  if (duplicate) {
    throw new AppError(409, 'Aynı başlıkla açık bir görev zaten var', { existingId: duplicate.id });
  }
}

function findAll() {
  return enqueue(readTasks);
}

function findById(id) {
  return enqueue(async () => {
    const tasks = await readTasks();
    return tasks.find((task) => task.id === id) ?? null;
  });
}

function create(task) {
  return enqueue(async () => {
    const tasks = await readTasks();
    assertUnique(tasks, task);
    tasks.push(task);
    await writeTasks(tasks);
    return task;
  });
}

function update(id, changes) {
  return enqueue(async () => {
    const tasks = await readTasks();
    const index = tasks.findIndex((task) => task.id === id);
    if (index === -1) return null;

    const updated = { ...tasks[index], ...changes };
    assertUnique(tasks, updated);
    tasks[index] = updated;
    await writeTasks(tasks);
    return tasks[index];
  });
}

function remove(id) {
  return enqueue(async () => {
    const tasks = await readTasks();
    const remaining = tasks.filter((task) => task.id !== id);
    if (remaining.length === tasks.length) return false;

    await writeTasks(remaining);
    return true;
  });
}

module.exports = { findAll, findById, create, update, remove };
