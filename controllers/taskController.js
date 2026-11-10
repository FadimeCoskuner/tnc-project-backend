const { randomUUID } = require('crypto');
const taskStore = require('../data/taskStore');
const { AppError } = require('../middleware/errorHandler');

const STATUSES = ['pending', 'in-progress', 'completed'];
const PRIORITIES = ['low', 'medium', 'high'];
const EDITABLE_FIELDS = ['title', 'description', 'status', 'priority', 'assignee'];
const FILTER_FIELDS = ['status', 'priority', 'assignee'];

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

// Doğrulanmış metin alanlarını kırpar; boş assignee atanmamış (null) sayılır.
function trimFields(fields) {
  const trimmed = { ...fields };
  if ('title' in trimmed) trimmed.title = trimmed.title.trim();
  if ('description' in trimmed) trimmed.description = trimmed.description.trim();
  if ('assignee' in trimmed) trimmed.assignee = trimmed.assignee?.trim() || null;
  return trimmed;
}

// Gövdeyi doğrular ve eksik alanları varsayılanlarla tamamlar; POST ve PUT aynı kuralları kullanır.
function parseTaskBody(body) {
  const fields = pickEditableFields(body);
  const errors = validateFields(fields);
  if (!('title' in fields)) errors.unshift('title zorunludur');
  if (errors.length > 0) throw new AppError(400, 'Doğrulama hatası', errors);

  const clean = trimFields(fields);
  return {
    title: clean.title,
    description: clean.description ?? '',
    status: clean.status ?? 'pending',
    priority: clean.priority ?? 'medium',
    assignee: clean.assignee ?? null,
  };
}

// PATCH yalnızca gönderilen alanları değiştirir, diğerlerine dokunmaz.
function parsePartialBody(body) {
  const fields = pickEditableFields(body);
  const errors = validateFields(fields);
  if (Object.keys(fields).length === 0) errors.push('Güncellenecek en az bir alan gönderilmelidir');
  if (errors.length > 0) throw new AppError(400, 'Doğrulama hatası', errors);

  return trimFields(fields);
}

function parseFilters(query) {
  const filters = {};
  for (const name of FILTER_FIELDS) {
    if (name in query) filters[name] = query[name];
  }
  const errors = validateFields(filters);
  if (errors.length > 0) throw new AppError(400, 'Doğrulama hatası', errors);

  return filters;
}

function foldCase(value) {
  return (value ?? '').trim().toLocaleLowerCase('tr');
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
  const filters = Object.entries(parseFilters(req.query));
  const tasks = await taskStore.findAll();

  res.json(tasks.filter((task) => filters.every(([name, value]) => foldCase(task[name]) === foldCase(value))));
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

async function patchTask(req, res) {
  const task = await taskStore.update(req.params.id, {
    ...parsePartialBody(req.body),
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

module.exports = { createTask, getTasks, getTaskById, updateTask, patchTask, deleteTask };
