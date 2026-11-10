import { api, errorMessage } from './api.js';

const PAGE_SIZE = 12;
const SEARCH_DELAY_MS = 250;
const UNASSIGNED = '__unassigned__';

const STATUSES = {
  pending: { label: 'Bekliyor', icon: 'clock', tint: 'bg-amber-50 text-amber-800' },
  'in-progress': { label: 'Devam ediyor', icon: 'arrow', tint: 'bg-sky-50 text-sky-800' },
  completed: { label: 'Tamamlandı', icon: 'check', tint: 'bg-emerald-50 text-emerald-800' },
};

const PRIORITIES = {
  high: { label: 'Yüksek', badge: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
  medium: { label: 'Orta', badge: 'bg-amber-50 text-amber-800', dot: 'bg-amber-500' },
  low: { label: 'Düşük', badge: 'bg-sky-50 text-sky-800', dot: 'bg-sky-500' },
};

const ICONS = {
  list: 'M4 6h16M4 12h16M4 18h10',
  clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  arrow: 'M13 5l7 7-7 7M4 12h15',
  check: 'M5 13l4 4L19 7',
  edit: 'M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
};

const AVATAR_COLORS = [
  'bg-emerald-100 text-emerald-800',
  'bg-sky-100 text-sky-800',
  'bg-violet-100 text-violet-800',
  'bg-amber-100 text-amber-800',
  'bg-rose-100 text-rose-800',
];

const dateFormat = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' });
const todayFormat = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'full' });
const $ = (id) => document.getElementById(id);

const filters = { keyword: '', status: '', priority: '', assignee: '', sort: '-createdAt' };
let page = 1;
let tasks = [];
let summary = null;
let editingId = null;
let deletingId = null;
let latestRequest = 0;
let searchTimer;

function escapeHtml(value) {
  const replacements = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value).replace(/[&<>"']/g, (char) => replacements[char]);
}

function icon(name, size = 'size-5') {
  return `<svg class="${size} shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONS[name]}" /></svg>`;
}

function avatar(name) {
  if (!name) return '<span class="grid size-7 shrink-0 place-items-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-500">?</span>';

  const total = [...name].reduce((sum, char) => sum + char.codePointAt(0), 0);
  const color = AVATAR_COLORS[total % AVATAR_COLORS.length];
  const initial = [...name][0].toLocaleUpperCase('tr');
  return `<span class="grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${color}">${escapeHtml(initial)}</span>`;
}

function showToast(message, isError = false) {
  const toast = document.createElement('div');
  toast.className = `max-w-sm rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${
    isError ? 'bg-red-600 text-white' : 'bg-emerald-700 text-white'
  }`;
  toast.textContent = message;
  $('toasts').append(toast);
  setTimeout(() => toast.remove(), 4000);
}

function statCard(label, value, iconName, tint, extra = '') {
  return `
    <div class="card p-5">
      <div class="flex items-center justify-between gap-3">
        <p class="text-sm font-medium text-neutral-600">${label}</p>
        <span class="grid size-9 place-items-center rounded-xl ${tint}">${icon(iconName, 'size-4.5')}</span>
      </div>
      <p class="mt-2 text-3xl font-extrabold tracking-tight tabular-nums">${value}</p>
      ${extra}
    </div>`;
}

function renderStats() {
  const { total, byStatus, completionRate } = summary;
  const progress = `
    <div class="mt-3 flex items-center gap-3">
      <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
        <div class="h-full rounded-full bg-emerald-500" style="width: ${completionRate}%"></div>
      </div>
      <span class="text-xs font-semibold text-neutral-600 tabular-nums">%${completionRate}</span>
    </div>`;

  $('stats').innerHTML = [
    statCard('Toplam görev', total, 'list', 'bg-neutral-100 text-neutral-700'),
    statCard('Bekliyor', byStatus.pending, 'clock', STATUSES.pending.tint),
    statCard('Devam ediyor', byStatus['in-progress'], 'arrow', STATUSES['in-progress'].tint),
    statCard('Tamamlandı', byStatus.completed, 'check', STATUSES.completed.tint, progress),
  ].join('');
}

function navItem(attribute, value, active, leading, label, count) {
  return `
    <button type="button" ${attribute}="${escapeHtml(value)}" aria-current="${active}" class="nav-item">
      ${leading}
      <span class="min-w-0 flex-1 truncate">${label}</span>
      <span class="text-xs font-semibold tabular-nums opacity-70">${count}</span>
    </button>`;
}

function renderNav() {
  if (!summary) return;

  $('nav-status').innerHTML = [
    navItem('data-nav-status', '', filters.status === '', icon('list'), 'Tüm görevler', summary.total),
    ...Object.entries(STATUSES).map(([value, status]) =>
      navItem('data-nav-status', value, filters.status === value, icon(status.icon), status.label, summary.byStatus[value]),
    ),
  ].join('');

  $('nav-team').innerHTML = [
    navItem('data-nav-assignee', '', filters.assignee === '', avatar('Tümü'), 'Tüm kişiler', summary.total),
    ...summary.byAssignee.map(({ assignee, total }) =>
      navItem('data-nav-assignee', assignee, filters.assignee === assignee, avatar(assignee), escapeHtml(assignee), total),
    ),
    navItem('data-nav-assignee', UNASSIGNED, filters.assignee === UNASSIGNED, avatar(null), 'Atanmamış', summary.unassigned),
  ].join('');
}

function renderAssigneeOptions() {
  const select = $('filter-assignee');
  const people = summary.byAssignee.map(
    ({ assignee }) => `<option value="${escapeHtml(assignee)}">${escapeHtml(assignee)}</option>`,
  );

  select.innerHTML = [
    '<option value="">Tüm kişiler</option>',
    ...people,
    `<option value="${UNASSIGNED}">Atanmamış</option>`,
  ].join('');

  // Seçili kişinin son görevi silinmiş olabilir; o durumda tüm kişilere döner.
  select.value = filters.assignee;
  if (select.selectedIndex === -1) {
    select.value = '';
    filters.assignee = '';
    loadTasks();
  }
}

function taskCard(task) {
  const priority = PRIORITIES[task.priority];
  const status = STATUSES[task.status];
  const isDone = task.status === 'completed';
  const statusOptions = Object.entries(STATUSES)
    .map(([value, { label }]) => `<option value="${value}" ${value === task.status ? 'selected' : ''}>${label}</option>`)
    .join('');

  return `
    <article class="card flex flex-col p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transform-none">
      <div class="flex items-start justify-between gap-3">
        <h2 class="min-w-0 leading-snug font-bold break-words ${isDone ? 'text-neutral-500 line-through' : ''}">${escapeHtml(task.title)}</h2>
        <span class="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${priority.badge}">
          <span class="size-1.5 rounded-full ${priority.dot}"></span>${priority.label}
        </span>
      </div>
      <p class="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed break-words text-neutral-600">${escapeHtml(task.description) || '<span class="text-neutral-500">Açıklama yok</span>'}</p>
      <div class="mt-4 flex items-center gap-2 text-xs text-neutral-600">
        ${avatar(task.assignee)}
        <span class="min-w-0 flex-1 truncate font-medium">${task.assignee ? escapeHtml(task.assignee) : 'Atanmamış'}</span>
        <time class="shrink-0 text-neutral-500" datetime="${task.createdAt}">${dateFormat.format(new Date(task.createdAt))}</time>
      </div>
      <div class="mt-4 flex items-center gap-1 border-t border-neutral-100 pt-3">
        <label class="mr-1 min-w-0 flex-1">
          <span class="sr-only">Durumu değiştir</span>
          <select data-status="${task.id}" class="status-select ${status.tint}">${statusOptions}</select>
        </label>
        <button type="button" data-edit="${task.id}" aria-label="Düzenle" title="Düzenle" class="icon-btn">${icon('edit', 'size-4.5')}</button>
        <button type="button" data-delete="${task.id}" aria-label="Sil" title="Sil" class="icon-btn icon-btn-danger">${icon('trash', 'size-4.5')}</button>
      </div>
    </article>`;
}

function hasActiveFilters() {
  return Boolean(filters.keyword || filters.status || filters.priority || filters.assignee);
}

function renderMessage(title, description, action = '') {
  $('task-list').innerHTML = `
    <div class="col-span-full rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-6 py-20 text-center">
      <span class="mx-auto grid size-12 place-items-center rounded-2xl bg-neutral-100 text-neutral-600">${icon('list')}</span>
      <p class="mt-4 font-bold">${title}</p>
      <p class="mt-1 text-sm text-neutral-600">${description}</p>
      ${action}
    </div>`;
  $('pagination').innerHTML = '';
}

function renderListHeading(total) {
  $('list-title').textContent = filters.keyword ? 'Arama sonuçları' : (STATUSES[filters.status]?.label ?? 'Tüm görevler');
  $('list-count').textContent = total;
}

function renderTasks(pagination) {
  renderListHeading(pagination.total);

  if (tasks.length === 0) {
    if (hasActiveFilters()) {
      renderMessage(
        'Eşleşen görev bulunamadı',
        'Aramayı değiştirin veya filtreleri temizleyin.',
        '<button type="button" data-clear-filters class="btn btn-ghost mt-5">Filtreleri temizle</button>',
      );
    } else {
      renderMessage('Henüz görev yok', 'İlk görevinizi oluşturarak başlayın.');
    }
    return;
  }

  $('task-list').innerHTML = tasks.map(taskCard).join('');
  renderPagination(pagination);
}

function renderPagination({ page: current, total, totalPages }) {
  if (totalPages <= 1) {
    $('pagination').innerHTML = '';
    return;
  }

  $('pagination').innerHTML = `
    <button type="button" data-page="${current - 1}" class="btn btn-ghost" ${current === 1 ? 'disabled' : ''}>Önceki</button>
    <span class="text-sm text-neutral-600">Sayfa ${current} / ${totalPages} · ${total} görev</span>
    <button type="button" data-page="${current + 1}" class="btn btn-ghost" ${current === totalPages ? 'disabled' : ''}>Sonraki</button>`;
}

function listPath() {
  const params = new URLSearchParams({ sort: filters.sort, page, limit: PAGE_SIZE });
  if (filters.keyword) params.set('keyword', filters.keyword);
  if (filters.status) params.set('status', filters.status);
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.assignee) params.set('assignee', filters.assignee === UNASSIGNED ? '' : filters.assignee);

  return `/tasks${filters.keyword ? '/search' : ''}?${params}`;
}

async function loadTasks() {
  const request = ++latestRequest;

  try {
    const { data, pagination } = await api(listPath());
    // Daha yeni bir istek başladıysa bu yanıt eskimiştir.
    if (request !== latestRequest) return;

    if (data.length === 0 && pagination.totalPages > 0) {
      page = pagination.totalPages;
      return loadTasks();
    }

    tasks = data;
    renderTasks(pagination);
  } catch (error) {
    if (request !== latestRequest) return;

    tasks = [];
    renderListHeading(0);
    renderMessage(
      'Görevler yüklenemedi',
      escapeHtml(errorMessage(error)),
      '<button type="button" data-retry class="btn btn-ghost mt-5">Tekrar dene</button>',
    );
  }
}

async function loadStats() {
  try {
    summary = await api('/reports/summary');
    renderStats();
    renderAssigneeOptions();
    renderNav();
  } catch {
    $('stats').innerHTML = '';
  }
}

function refresh() {
  return Promise.all([loadTasks(), loadStats()]);
}

function applyFilters() {
  page = 1;
  renderNav();
  loadTasks();
}

function setFilter(name, value) {
  filters[name] = value;
  $(`filter-${name}`).value = value;
  applyFilters();
}

function openTaskDialog(task) {
  const form = $('task-form');
  form.reset();
  $('form-error').classList.add('hidden');
  editingId = task?.id ?? null;
  $('dialog-title').textContent = task ? 'Görevi düzenle' : 'Yeni görev';

  form.elements.title.value = task?.title ?? '';
  form.elements.description.value = task?.description ?? '';
  form.elements.status.value = task?.status ?? 'pending';
  form.elements.priority.value = task?.priority ?? 'medium';
  form.elements.assignee.value = task?.assignee ?? '';

  $('task-dialog').showModal();
}

function openDeleteDialog(task) {
  deletingId = task.id;
  $('delete-text').textContent = `"${task.title}" kalıcı olarak silinecek.`;
  $('delete-dialog').showModal();
}

async function handleSubmit(event) {
  event.preventDefault();

  const body = Object.fromEntries(new FormData(event.target));
  $('form-submit').disabled = true;

  try {
    if (editingId) await api(`/tasks/${editingId}`, 'PUT', body);
    else await api('/tasks', 'POST', body);

    showToast(editingId ? 'Görev güncellendi' : 'Görev oluşturuldu');
    if (!editingId) page = 1;
    $('task-dialog').close();
    await refresh();
  } catch (error) {
    $('form-error').textContent = errorMessage(error);
    $('form-error').classList.remove('hidden');
  } finally {
    $('form-submit').disabled = false;
  }
}

async function handleDelete() {
  $('delete-confirm').disabled = true;

  try {
    await api(`/tasks/${deletingId}`, 'DELETE');
    showToast('Görev silindi');
  } catch (error) {
    showToast(errorMessage(error), true);
  } finally {
    $('delete-confirm').disabled = false;
    $('delete-dialog').close();
    await refresh();
  }
}

async function handleStatusChange(select) {
  try {
    await api(`/tasks/${select.dataset.status}`, 'PATCH', { status: select.value });
    showToast('Durum güncellendi');
  } catch (error) {
    showToast(errorMessage(error), true);
  }
  await refresh();
}

function clearFilters() {
  Object.assign(filters, { keyword: '', status: '', priority: '', assignee: '' });
  $('search').value = '';
  $('filter-status').value = '';
  $('filter-priority').value = '';
  $('filter-assignee').value = '';
  applyFilters();
}

function findTask(id) {
  return tasks.find((task) => task.id === id);
}

$('today').textContent = todayFormat.format(new Date());
$('new-task').addEventListener('click', () => openTaskDialog());
$('task-form').addEventListener('submit', handleSubmit);
$('delete-confirm').addEventListener('click', handleDelete);

$('search').addEventListener('input', (event) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    filters.keyword = event.target.value.trim();
    applyFilters();
  }, SEARCH_DELAY_MS);
});

for (const [id, name] of [
  ['filter-status', 'status'],
  ['filter-priority', 'priority'],
  ['filter-assignee', 'assignee'],
  ['sort', 'sort'],
]) {
  $(id).addEventListener('change', (event) => {
    filters[name] = event.target.value;
    applyFilters();
  });
}

$('sidebar').addEventListener('click', ({ target }) => {
  const button = target.closest('button');
  if (!button) return;

  if ('navStatus' in button.dataset) setFilter('status', button.dataset.navStatus);
  if ('navAssignee' in button.dataset) setFilter('assignee', button.dataset.navAssignee);
});

$('task-list').addEventListener('click', ({ target }) => {
  const button = target.closest('button');
  if (!button) return;

  if (button.dataset.edit) openTaskDialog(findTask(button.dataset.edit));
  if (button.dataset.delete) openDeleteDialog(findTask(button.dataset.delete));
  if ('clearFilters' in button.dataset) clearFilters();
  if ('retry' in button.dataset) refresh();
});

$('task-list').addEventListener('change', ({ target }) => {
  if (target.dataset.status) handleStatusChange(target);
});

$('pagination').addEventListener('click', ({ target }) => {
  const button = target.closest('[data-page]');
  if (!button) return;

  page = Number(button.dataset.page);
  loadTasks();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

for (const dialog of document.querySelectorAll('dialog')) {
  dialog.addEventListener('click', ({ target }) => {
    if (target === dialog || 'close' in target.dataset) dialog.close();
  });
}

refresh();
