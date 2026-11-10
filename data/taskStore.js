const fs = require('fs/promises');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'tasks.json');

// Dosya işlemlerini sıraya alır, böylece eşzamanlı istekler birbirinin yazdığını ezmez.
let queue = Promise.resolve();

function enqueue(operation) {
  const result = queue.then(operation);
  queue = result.catch(() => {});
  return result;
}

async function readTasks() {
  const content = await fs.readFile(DATA_FILE, 'utf-8');
  return JSON.parse(content);
}

async function writeTasks(tasks) {
  await fs.writeFile(DATA_FILE, `${JSON.stringify(tasks, null, 2)}\n`, 'utf-8');
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

    tasks[index] = { ...tasks[index], ...changes };
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
