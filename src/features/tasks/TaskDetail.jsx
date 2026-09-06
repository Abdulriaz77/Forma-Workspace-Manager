import { useState } from 'react';
import Modal from '../../components/Modal';
import { uid, priorities } from '../../lib/data';
export default function TaskDetail({ task, project, data, onClose, commit, editable, removeTask }) {
  const [draft, setDraft] = useState(task),
    [comment, setComment] = useState(''),
    [error, setError] = useState('');
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  function save(e) {
    e.preventDefault();
    if (!draft.title.trim()) return;
    const saved = commit(
      (d) => {
        const i = d.tasks.findIndex((t) => t.id === task.id);
        if (i < 0) d.tasks.push(draft);
        else d.tasks[i] = { ...draft, comments: d.tasks[i].comments };
      },
      data.tasks.some((t) => t.id === task.id) ? 'Task saved' : 'Task created',
      true,
      false,
      task.id,
      data.tasks.some((t) => t.id === task.id) ? 'edited' : 'created',
    );
    if (saved) onClose();
  }
  async function attach(e) {
    const files = [...e.target.files];
    if (files.some((f) => f.size > 500000) || draft.attachments.length + files.length > 5)
      return setError('Use up to 5 files, each under 500 KB.');
    try {
      const attachments = await Promise.all(
        files.map(
          (f) =>
            new Promise((resolve, reject) => {
              const r = new FileReader();
              r.onload = () => resolve({ id: uid(), name: f.name, url: r.result });
              r.onerror = reject;
              r.readAsDataURL(f);
            }),
        ),
      );
      set('attachments', [...draft.attachments, ...attachments]);
    } catch {
      setError('Could not read the file.');
    }
  }
  function sendComment(e) {
    e.preventDefault();
    if (!comment.trim()) return;
    commit(
      (d) => {
        const t = d.tasks.find((t) => t.id === task.id);
        if (!t) return;
        t.comments.push({
          id: uid(),
          userId: data.session,
          text: comment,
          createdAt: new Date().toISOString(),
        });
        if (d.preferences.mentioned)
          for (const u of d.users) {
            if (comment.includes('@' + u.name) && u.id !== d.session)
              d.notifications.push({
                id: uid(),
                userId: u.id,
                taskId: t.id,
                text: `You were mentioned in ${t.title}`,
                read: false,
              });
          }
      },
      'Comment added',
      true,
      false,
      task.id,
      'commented',
    );
    setComment('');
  }
  const persisted = data.tasks.find((t) => t.id === task.id);
  return (
    <Modal title={persisted ? 'Task details' : 'Create a task'} onClose={onClose} wide>
      <form onSubmit={save}>
        <fieldset disabled={!editable}>
          <label>
            Task title
            <input
              autoFocus
              value={draft.title}
              onChange={(e) => set('title', e.target.value)}
              required
              maxLength={160}
              placeholder="What needs to happen?"
            />
          </label>
          <label>
            Description
            <textarea
              value={draft.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              placeholder="Add a little context…"
            />
          </label>
          <div className="form-grid">
            <label>
              Status
              <select value={draft.status} onChange={(e) => set('status', e.target.value)}>
                {project.columns.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Priority
              <select value={draft.priority} onChange={(e) => set('priority', e.target.value)}>
                {priorities.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Assignee
              <select value={draft.assignee} onChange={(e) => set('assignee', e.target.value)}>
                <option value="">Unassigned</option>
                {data.users
                  .filter((u) => project.members.includes(u.id))
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Due date
              <input
                type="date"
                value={draft.dueDate}
                onChange={(e) => set('dueDate', e.target.value)}
              />
            </label>
          </div>
          <label>
            Labels (comma separated)
            <input
              value={draft.labels.join(', ')}
              onChange={(e) =>
                set(
                  'labels',
                  e.target.value.split(',').map((s) => s.trim()),
                )
              }
            />
          </label>
          <h3>
            Subtasks{' '}
            <span className="muted">
              {draft.subtasks.filter((s) => s.done).length}/{draft.subtasks.length}
            </span>
          </h3>
          {draft.subtasks.map((s) => (
            <div className="subtask" key={s.id}>
              <input
                aria-label="Complete subtask"
                type="checkbox"
                checked={s.done}
                onChange={(e) =>
                  set(
                    'subtasks',
                    draft.subtasks.map((x) =>
                      x.id === s.id ? { ...x, done: e.target.checked } : x,
                    ),
                  )
                }
              />
              <input
                aria-label="Subtask title"
                value={s.title}
                onChange={(e) =>
                  set(
                    'subtasks',
                    draft.subtasks.map((x) =>
                      x.id === s.id ? { ...x, title: e.target.value } : x,
                    ),
                  )
                }
              />
              <button
                type="button"
                title="Convert to task"
                onClick={() => {
                  commit((d) => {
                    d.tasks.push({
                      ...draft,
                      id: uid(),
                      title: s.title,
                      status: s.done ? project.columns.at(-1) : project.columns[0],
                      subtasks: [],
                      attachments: [],
                      comments: [],
                    });
                    const parent = d.tasks.find((t) => t.id === task.id);
                    if (parent) parent.subtasks = parent.subtasks.filter((x) => x.id !== s.id);
                  }, 'Subtask promoted');
                  set(
                    'subtasks',
                    draft.subtasks.filter((x) => x.id !== s.id),
                  );
                }}
              >
                ↗
              </button>
              <button
                type="button"
                aria-label="Remove subtask"
                onClick={() =>
                  set(
                    'subtasks',
                    draft.subtasks.filter((x) => x.id !== s.id),
                  )
                }
              >
                ×
              </button>
            </div>
          ))}
          <button
            className="text-button"
            type="button"
            onClick={() =>
              set('subtasks', [...draft.subtasks, { id: uid(), title: 'New subtask', done: false }])
            }
          >
            + Add subtask
          </button>
          <label>
            Attachments <small>Up to 5 files · 500 KB each · stored locally</small>
            <input type="file" multiple onChange={attach} />
          </label>
          {draft.attachments.map((a) => (
            <div className="row" key={a.id}>
              <a href={a.url} download={a.name}>
                {a.name}
              </a>
              <button
                type="button"
                onClick={() =>
                  set(
                    'attachments',
                    draft.attachments.filter((x) => x.id !== a.id),
                  )
                }
              >
                Remove
              </button>
            </div>
          ))}
          {error && <p className="error">{error}</p>}
          <div className="modal-actions">
            {persisted && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    commit(
                      (d) =>
                        d.tasks.push({
                          ...draft,
                          id: uid(),
                          title: draft.title + ' (copy)',
                          comments: [],
                          createdAt: new Date().toISOString(),
                        }),
                      'Task duplicated',
                    );
                    onClose();
                  }}
                >
                  Duplicate
                </button>
                <select
                  aria-label="Convert task to subtask"
                  defaultValue=""
                  onChange={(e) => {
                    const id = e.target.value;
                    if (!id) return;
                    commit((d) => {
                      d.tasks
                        .find((t) => t.id === id)
                        .subtasks.push({
                          id: uid(),
                          title: draft.title,
                          done: draft.status === project.columns.at(-1),
                        });
                      d.tasks = d.tasks.filter((t) => t.id !== task.id);
                    }, 'Converted to subtask');
                    onClose();
                  }}
                >
                  <option value="">Move into task…</option>
                  {data.tasks
                    .filter((t) => t.projectId === project.id && t.id !== task.id)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                </select>
                <button className="danger" type="button" onClick={() => removeTask(task.id)}>
                  Delete
                </button>
              </>
            )}
            <button className="primary">Save task</button>
          </div>
        </fieldset>
      </form>
      {!editable && <p className="notice">Viewer access — task editing is restricted.</p>}
      {persisted && (
        <>
          <div className="section-divider" />
          <h3>Conversation</h3>
          {persisted.comments.map((c) => (
            <article className="comment" key={c.id}>
              <strong>{data.users.find((u) => u.id === c.userId)?.name}</strong>
              <small>{new Date(c.createdAt).toLocaleString()}</small>
              <p>{c.text}</p>
              {c.userId === data.session && editable && (
                <div className="row">
                  <button
                    className="text-button"
                    onClick={() => {
                      const text = window.prompt('Edit comment', c.text);
                      if (text?.trim())
                        commit(
                          (d) => {
                            d.tasks
                              .find((t) => t.id === task.id)
                              .comments.find((x) => x.id === c.id).text = text;
                          },
                          'Comment edited',
                          true,
                          false,
                          task.id,
                          'commented',
                        );
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="text-button danger"
                    onClick={() => {
                      if (window.confirm('Delete this comment?'))
                        commit(
                          (d) => {
                            const t = d.tasks.find((t) => t.id === task.id);
                            t.comments = t.comments.filter((x) => x.id !== c.id);
                          },
                          'Comment deleted',
                          true,
                          false,
                          task.id,
                          'commented',
                        );
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </article>
          ))}
          {!persisted.comments.length && (
            <p className="muted">Start the conversation. Keep everyone in the loop.</p>
          )}
          {editable && (
            <form onSubmit={sendComment}>
              <label className="sr-only" htmlFor="comment">
                Comment
              </label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write a comment… use @ to mention someone"
                required
              />
              {comment.includes('@') && (
                <div className="mention-list">
                  {data.users
                    .filter(
                      (u) =>
                        project.members.includes(u.id) &&
                        u.name.toLowerCase().startsWith(comment.split('@').at(-1).toLowerCase()),
                    )
                    .map((u) => (
                      <button
                        type="button"
                        key={u.id}
                        onClick={() =>
                          setComment(
                            comment.slice(0, comment.lastIndexOf('@')) + '@' + u.name + ' ',
                          )
                        }
                      >
                        {u.name}
                      </button>
                    ))}
                </div>
              )}
              <button className="primary small">Post comment</button>
            </form>
          )}
          <h3>Activity</h3>
          {data.activities
            .filter((a) => a.taskId === task.id)
            .slice()
            .reverse()
            .map((a) => (
              <p className="activity-entry" key={a.id}>
                {data.users.find((u) => u.id === a.userId)?.name} · {a.text}
                <small>{new Date(a.at).toLocaleString()}</small>
              </p>
            ))}
        </>
      )}
    </Modal>
  );
}
