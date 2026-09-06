import { useState } from 'react';
import { CalendarDays, MessageSquare, CheckSquare, MoreHorizontal } from 'lucide-react';
export default function TaskViews({
  view,
  tasks,
  project,
  data,
  openTask,
  newTask,
  commit,
  editable,
  selected,
  setSelected,
  groupBy,
  sort,
  setSort,
}) {
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const toggle = (id) =>
    setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  function move(id, status) {
    if (editable)
      commit(
        (d) => {
          const t = d.tasks.find((t) => t.id === id);
          if (t) t.status = status;
        },
        'Task moved',
        true,
        false,
        id,
        'status',
      );
  }
  function card(t) {
    const user = data.users.find((u) => u.id === t.assignee);
    return (
      <article
        className="task-card"
        key={t.id}
        draggable={editable}
        onDragStart={(e) => e.dataTransfer.setData('text/task', t.id)}
      >
        <div className="row between">
          <div className="tags">
            {t.labels.filter(Boolean).map((l) => (
              <span
                key={l}
                className={
                  'tag tag-' + (l === 'Design' ? 'purple' : l === 'Development' ? 'blue' : 'orange')
                }
              >
                {l}
              </span>
            ))}
          </div>
          <input
            aria-label={'Select ' + t.title}
            type="checkbox"
            checked={selected.includes(t.id)}
            onChange={() => toggle(t.id)}
          />
        </div>
        <button className="task-title" onClick={() => openTask(t)}>
          {t.title}
        </button>
        <p className="task-description">{t.description}</p>
        <div className={'priority priority-' + t.priority.toLowerCase()}>
          <i /> {t.priority}
        </div>
        <footer>
          <span
            className={
              t.dueDate &&
              t.dueDate < new Date().toISOString().slice(0, 10) &&
              t.status !== project.columns.at(-1)
                ? 'overdue'
                : ''
            }
          >
            <CalendarDays size={13} />
            {t.dueDate
              ? new Date(t.dueDate + 'T12:00:00').toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })
              : 'No date'}
          </span>
          <span className="card-meta">
            {!!t.comments.length && (
              <>
                <MessageSquare size={13} />
                {t.comments.length}
              </>
            )}
            {!!t.subtasks.length && (
              <>
                <CheckSquare size={13} />
                {t.subtasks.filter((s) => s.done).length}/{t.subtasks.length}
              </>
            )}
            <b className="avatar" title={user?.name || 'Unassigned'}>
              {user?.avatar || '–'}
            </b>
          </span>
        </footer>
      </article>
    );
  }
  if (view === 'Board')
    return (
      <div className="board">
        {project.columns.map((status, index) => (
          <section
            className="column"
            key={status}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              move(e.dataTransfer.getData('text/task'), status);
            }}
          >
            <header>
              <span className={'status-dot dot-' + index} />
              <h3>{status}</h3>
              <span className="count">{tasks.filter((t) => t.status === status).length}</span>
              <button
                className="icon-button"
                title="Add task"
                onClick={() => newTask(status)}
                disabled={!editable}
              >
                +
              </button>
            </header>
            {tasks.filter((t) => t.status === status).map(card)}
            <button className="add-card" onClick={() => newTask(status)} disabled={!editable}>
              + Add task
            </button>
          </section>
        ))}
      </div>
    );
  if (view === 'Calendar') {
    const start = new Date(month.getFullYear(), month.getMonth(), 1).getDay(),
      days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return (
      <section className="calendar">
        <div className="row between">
          <h3>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h3>
          <div className="row">
            <button
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            >
              ←
            </button>
            <button
              onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
            >
              Today
            </button>
            <button
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            >
              →
            </button>
          </div>
        </div>
        <div className="calendar-grid">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <strong key={d}>{d}</strong>
          ))}
          {Array.from({ length: start }, (_, i) => (
            <div className="calendar-day empty-day" key={'blank' + i} />
          ))}
          {Array.from({ length: days }, (_, i) => {
            const date = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
            return (
              <div className="calendar-day" key={date}>
                <span>{i + 1}</span>
                {tasks
                  .filter((t) => t.dueDate === date)
                  .map((t) => (
                    <button key={t.id} onClick={() => openTask(t)}>
                      {t.title}
                    </button>
                  ))}
              </div>
            );
          })}
        </div>
        {tasks.some((t) => !t.dueDate) && (
          <p className="muted">
            {tasks.filter((t) => !t.dueDate).length} tasks have no due date. Set a date to show them
            here.
          </p>
        )}
      </section>
    );
  }
  const groups =
    groupBy === 'none'
      ? ['All tasks']
      : [
          ...new Set(
            tasks.flatMap((t) =>
              groupBy === 'labels'
                ? t.labels.length
                  ? t.labels
                  : ['Unlabeled']
                : [t[groupBy] || 'Unassigned'],
            ),
          ),
        ];
  return (
    <div className="list-view">
      {groups.map((g) => (
        <section key={g}>
          <h3>{groupBy === 'assignee' ? data.users.find((u) => u.id === g)?.name || g : g}</h3>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      aria-label="Select all visible tasks"
                      checked={!!tasks.length && tasks.every((t) => selected.includes(t.id))}
                      onChange={(e) => setSelected(e.target.checked ? tasks.map((t) => t.id) : [])}
                    />
                  </th>
                  {[
                    ['title', 'Task name'],
                    ['status', 'Status'],
                    ['priority', 'Priority'],
                    ['assignee', 'Assignee'],
                    ['dueDate', 'Due date'],
                  ].map(([key, label]) => (
                    <th key={key}>
                      <button className="text-button" onClick={() => setSort(key)}>
                        {label}
                        {sort === key ? ' ↓' : ''}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks
                  .filter(
                    (t) =>
                      groupBy === 'none' ||
                      (groupBy === 'labels'
                        ? (t.labels.length ? t.labels : ['Unlabeled']).includes(g)
                        : (t[groupBy] || 'Unassigned') === g),
                  )
                  .map((t) => (
                    <tr key={t.id}>
                      <td>
                        <input
                          aria-label={'Select ' + t.title}
                          type="checkbox"
                          checked={selected.includes(t.id)}
                          onChange={() => toggle(t.id)}
                        />
                      </td>
                      <td>
                        <button className="task-title" onClick={() => openTask(t)}>
                          {t.title}
                        </button>
                      </td>
                      <td>
                        <select
                          aria-label="Task status"
                          disabled={!editable}
                          value={t.status}
                          onChange={(e) => move(t.id, e.target.value)}
                        >
                          {project.columns.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <span className={'priority priority-' + t.priority.toLowerCase()}>
                          {t.priority}
                        </span>
                      </td>
                      <td>{data.users.find((u) => u.id === t.assignee)?.name || 'Unassigned'}</td>
                      <td>{t.dueDate || '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
