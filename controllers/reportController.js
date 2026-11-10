const taskStore = require('../data/taskStore');
const { STATUSES, PRIORITIES } = require('../constants/task');
const { normalizeText } = require('../utils/text');

function countByField(tasks, field, values) {
  return Object.fromEntries(values.map((value) => [value, tasks.filter((task) => task[field] === value).length]));
}

// Aynı kişi farklı yazılmış olsa bile (Musa / musa) tek satırda toplanır.
function summarizeAssignees(tasks) {
  const groups = new Map();

  for (const task of tasks) {
    if (!task.assignee) continue;

    const key = normalizeText(task.assignee);
    const group = groups.get(key) ?? { assignee: task.assignee, total: 0, completed: 0, open: 0 };
    group.total++;
    group[task.status === 'completed' ? 'completed' : 'open']++;
    groups.set(key, group);
  }

  return [...groups.values()];
}

async function sendStatusCount(res, status) {
  const tasks = await taskStore.findAll();
  res.json({ status, count: tasks.filter((task) => task.status === status).length });
}

function getCompletedReport(req, res) {
  return sendStatusCount(res, 'completed');
}

function getPendingReport(req, res) {
  return sendStatusCount(res, 'pending');
}

async function getSummaryReport(req, res) {
  const tasks = await taskStore.findAll();
  const byStatus = countByField(tasks, 'status', STATUSES);

  res.json({
    total: tasks.length,
    byStatus,
    byPriority: countByField(tasks, 'priority', PRIORITIES),
    byAssignee: summarizeAssignees(tasks),
    unassigned: tasks.filter((task) => !task.assignee).length,
    completionRate: tasks.length === 0 ? 0 : Math.round((byStatus.completed / tasks.length) * 100),
  });
}

module.exports = { getCompletedReport, getPendingReport, getSummaryReport };
