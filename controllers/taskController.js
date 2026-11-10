const { randomUUID } = require('crypto');
const taskStore = require('../data/taskStore');
const { AppError } = require('../middleware/errorHandler');

const STATUSES = ['pending', 'in-progress', 'completed'];
const PRIORITIES = ['low', 'medium', 'high'];
const EDITABLE_FIELDS = ['title', 'description', 'status', 'priority', 'assignee'];

// Yalnızca izin verilen alanları alır; id ve tarih alanları istemciden kabul edilmez.
function pickEditableFields(body) {
  const source = body ?? {};
  const fields = {};
  for (const name of EDITABLE_FIELDS) {
    if (name in source) fields[name] = source[name];
  }
  return fields;
}

function validateFields(fields) {
  const errors = [];

  if ('title' in fields && (typeof fields.title !== 'string' || fields.title.trim() === '')) {
    errors.push('title boş olmayan bir metin olmalıdır');
  }
  if ('description' in fields && typeof fields.description !== 'string') {
    errors.push('description metin olmalıdır');
  }
  if ('status' in fields && !STATUSES.includes(fields.status)) {
    errors.push(`status şunlardan biri olmalıdır: ${STATUSES.join(', ')}`);
  }
  if ('priority' in fields && !PRIORITIES.includes(fields.priority)) {
    errors.push(`priority şunlardan biri olmalıdır: ${PRIORITIES.join(', ')}`);
  }
  if ('assignee' in fields && fields.assignee !== null && typeof fields.assignee !== 'string') {
    errors.push('assignee metin veya null olmalıdır');
  }

  return errors;
}

// Gövdeyi doğrular ve eksik alanları varsayılanlarla tamamlar; POST ve PUT aynı kuralları kullanır.
function parseTaskBody(body) {
  const fields = pickEditableFields(body);
  const errors = validateFields(fields);
  if (!('title' in fields)) errors.unshift('title zorunludur');
  if (errors.length > 0) throw new AppError(400, 'Doğrulama hatası', errors);

  return {
    title: fields.title,
    description: fields.description ?? '',
    status: fields.status ?? 'pending',
    priority: fields.priority ?? 'medium',
    assignee: fields.assignee ?? null,
  };
}

async function createTask(req, res) {
  const now = new Date().toISOString();
  const task = await taskStore.create({
    id: randomUUID(),
    ...parseTaskBody(req.body),
    createdAt: now,
    updatedAt: now,
  });

  res.status(201).json(task);
}

async function getTasks(req, res) {
  res.json(await taskStore.findAll());
}

async function getTaskById(req, res) {
  const task = await taskStore.findById(req.params.id);
  if (!task) throw new AppError(404, 'Görev bulunamadı');

  res.json(task);
}

async function updateTask(req, res) {
  const task = await taskStore.update(req.params.id, {
    ...parseTaskBody(req.body),
    updatedAt: new Date().toISOString(),
  });
  if (!task) throw new AppError(404, 'Görev bulunamadı');

  res.json(task);
}

async function deleteTask(req, res) {
  const deleted = await taskStore.remove(req.params.id);
  if (!deleted) throw new AppError(404, 'Görev bulunamadı');

  res.status(204).end();
}

module.exports = { createTask, getTasks, getTaskById, updateTask, deleteTask };
