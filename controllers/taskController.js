const { randomUUID } = require('crypto');
const taskStore = require('../data/taskStore');
const { AppError } = require('../middleware/errorHandler');
const { STATUSES, PRIORITIES } = require('../constants/task');
const { normalizeText } = require('../utils/text');

// Bu alanlar alfabetik değil, anlamlarına göre sıralanır (low < medium < high).
const RANKED_VALUES = { status: STATUSES, priority: PRIORITIES };

function compareTasks({ field, descending }) {
  const ranks = RANKED_VALUES[field];
  const compare = ranks
    ? (a, b) => ranks.indexOf(a[field]) - ranks.indexOf(b[field])
    : (a, b) => a[field].localeCompare(b[field], 'tr');

  return descending ? (a, b) => compare(b, a) : compare;
}

function sendTaskList(res, tasks, { filters, sort, pagination }) {
  const conditions = Object.entries(filters);
  const result = tasks.filter((task) =>
    conditions.every(([name, value]) => normalizeText(task[name]) === normalizeText(value)),
  );
  if (sort) result.sort(compareTasks(sort));

  if (!pagination) return res.json(result);

  const { page, limit } = pagination;
  const start = (page - 1) * limit;
  res.json({
    data: result.slice(start, start + limit),
    pagination: { page, limit, total: result.length, totalPages: Math.ceil(result.length / limit) },
  });
}

async function createTask(req, res) {
  const now = new Date().toISOString();
  const task = await taskStore.create({
    id: randomUUID(),
    ...req.taskInput,
    createdAt: now,
    updatedAt: now,
  });

  res.status(201).json(task);
}

async function getTasks(req, res) {
  sendTaskList(res, await taskStore.findAll(), req.listOptions);
}

async function searchTasks(req, res) {
  const keyword = normalizeText(req.query.keyword);
  const tasks = await taskStore.findAll();
  const matches = tasks.filter(
    (task) => normalizeText(task.title).includes(keyword) || normalizeText(task.description).includes(keyword),
  );

  sendTaskList(res, matches, req.listOptions);
}

async function getTasksByAssignee(req, res) {
  const { filters } = req.listOptions;

  sendTaskList(res, await taskStore.findAll(), {
    ...req.listOptions,
    filters: { ...filters, assignee: req.params.assignee },
  });
}

async function getTaskById(req, res) {
  const task = await taskStore.findById(req.params.id);
  if (!task) throw new AppError(404, 'Görev bulunamadı');

  res.json(task);
}

// PUT ve PATCH arasındaki fark, req.taskInput'u hazırlayan doğrulama middleware'indedir.
async function updateTask(req, res) {
  const task = await taskStore.update(req.params.id, {
    ...req.taskInput,
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

module.exports = { createTask, getTasks, searchTasks, getTasksByAssignee, getTaskById, updateTask, deleteTask };
