const { STATUSES, PRIORITIES } = require('../constants/task');
const { AppError } = require('./errorHandler');

const EDITABLE_FIELDS = ['title', 'description', 'status', 'priority', 'assignee'];
const FILTER_FIELDS = ['status', 'priority', 'assignee'];
const SORT_FIELDS = ['createdAt', 'updatedAt', 'title', 'status', 'priority'];
const MAX_LENGTHS = { title: 200, description: 2000, assignee: 100 };
const DEFAULT_PAGE_LIMIT = 10;
const MAX_PAGE_LIMIT = 100;

// Yalnızca izin verilen alanları alır; id ve tarih alanları istemciden kabul edilmez.
function pickFields(source, names) {
  const fields = {};
  for (const name of names) {
    if (name in source) fields[name] = source[name];
  }
  return fields;
}

function throwIfInvalid(errors) {
  if (errors.length > 0) throw new AppError(400, 'Doğrulama hatası', errors);
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
  for (const [name, maxLength] of Object.entries(MAX_LENGTHS)) {
    if (typeof fields[name] === 'string' && fields[name].trim().length > maxLength) {
      errors.push(`${name} en fazla ${maxLength} karakter olabilir`);
    }
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
function validateTaskBody(req, res, next) {
  const fields = pickFields(req.body ?? {}, EDITABLE_FIELDS);
  const errors = validateFields(fields);
  if (!('title' in fields)) errors.unshift('title zorunludur');
  throwIfInvalid(errors);

  const clean = trimFields(fields);
  req.taskInput = {
    title: clean.title,
    description: clean.description ?? '',
    status: clean.status ?? 'pending',
    priority: clean.priority ?? 'medium',
    assignee: clean.assignee ?? null,
  };
  next();
}

// PATCH yalnızca gönderilen alanları değiştirir, diğerlerine dokunmaz.
function validateTaskPatch(req, res, next) {
  const fields = pickFields(req.body ?? {}, EDITABLE_FIELDS);
  const errors = validateFields(fields);
  if (Object.keys(fields).length === 0) errors.push('Güncellenecek en az bir alan gönderilmelidir');
  throwIfInvalid(errors);

  req.taskInput = trimFields(fields);
  next();
}

function parsePositiveInteger(value) {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
}

function parsePagination(query, errors) {
  if (!('page' in query) && !('limit' in query)) return null;

  const page = 'page' in query ? parsePositiveInteger(query.page) : 1;
  const limit = 'limit' in query ? parsePositiveInteger(query.limit) : DEFAULT_PAGE_LIMIT;
  if (page === null) errors.push('page pozitif bir tam sayı olmalıdır');
  if (limit === null || limit > MAX_PAGE_LIMIT) errors.push(`limit 1 ile ${MAX_PAGE_LIMIT} arasında bir tam sayı olmalıdır`);

  return { page, limit };
}

// Başına "-" konan alan azalan sıralanır: sort=-createdAt
function parseSort(query, errors) {
  if (!('sort' in query)) return null;

  const value = typeof query.sort === 'string' ? query.sort : '';
  const descending = value.startsWith('-');
  const field = descending ? value.slice(1) : value;
  if (!SORT_FIELDS.includes(field)) {
    errors.push(`sort şunlardan biri olmalıdır: ${SORT_FIELDS.join(', ')} (azalan için başına - ekleyin)`);
    return null;
  }

  return { field, descending };
}

function validateListQuery(req, res, next) {
  const filters = pickFields(req.query, FILTER_FIELDS);
  const errors = validateFields(filters);
  const pagination = parsePagination(req.query, errors);
  const sort = parseSort(req.query, errors);
  throwIfInvalid(errors);

  req.listOptions = { filters, pagination, sort };
  next();
}

function validateSearchQuery(req, res, next) {
  const { keyword } = req.query;
  if (typeof keyword !== 'string' || keyword.trim() === '') {
    throwIfInvalid(['keyword boş olmayan bir metin olmalıdır']);
  }
  next();
}

module.exports = { validateTaskBody, validateTaskPatch, validateListQuery, validateSearchQuery };
