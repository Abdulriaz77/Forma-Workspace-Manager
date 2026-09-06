import { useState } from 'react';
import Modal from '../../components/Modal';
import { uid, templates, statuses, canManage, seed, validateImport } from '../../lib/data';
import { exportData } from '../../lib/persistence';
export function EntityForm({ kind, data, commit, onClose, entity }) {
  const isProject = kind === 'project';
  function submit(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    commit(
      (d) => {
        if (entity) {
          Object.assign(
            (isProject ? d.projects : d.workspaces).find((x) => x.id === entity.id),
            {
              name: f.name,
              description: f.description || '',
              color: f.color,
              icon: f.icon,
              defaultView: f.view,
            },
          );
        } else if (isProject) {
          const id = uid();
          d.projects.push({
            id,
            workspaceId: d.workspaceId,
            name: f.name,
            description: f.description,
            color: f.color,
            icon: f.icon,
            columns: [...statuses],
            members: d.workspaces.find((w) => w.id === d.workspaceId).members.map((m) => m.userId),
            view: f.view,
            archived: false,
          });
          for (const title of templates[f.template])
            d.tasks.push({
              id: uid(),
              projectId: id,
              title,
              description: '',
              status: statuses[0],
              priority: 'Medium',
              assignee: '',
              dueDate: '',
              labels: [],
              subtasks: [],
              attachments: [],
              comments: [],
              createdAt: new Date().toISOString(),
            });
          d.projectId = id;
        } else {
          const id = uid();
          d.workspaces.push({
            id,
            name: f.name,
            icon: f.icon,
            color: f.color,
            defaultView: f.view,
            members: [{ userId: d.session, role: 'owner' }],
          });
          d.workspaceId = id;
          d.projectId = null;
        }
      },
      entity ? 'Settings updated' : `${isProject ? 'Project' : 'Workspace'} created`,
      true,
      !isProject && !entity,
    );
    onClose();
  }
  return (
    <Modal title={`${entity ? 'Edit' : 'New'} ${kind}`} onClose={onClose}>
      <form onSubmit={submit}>
        <label>
          Name
          <input name="name" defaultValue={entity?.name} required maxLength={60} />
        </label>
        {isProject && (
          <label>
            Description
            <textarea name="description" defaultValue={entity?.description} rows={3} />
          </label>
        )}
        <div className="form-grid">
          <label>
            Icon
            <input name="icon" defaultValue={entity?.icon || '✦'} maxLength={2} />
          </label>
          <label>
            Color
            <input type="color" name="color" defaultValue={entity?.color || '#7763e8'} />
          </label>
        </div>
        <label>
          Default view
          <select
            name="view"
            defaultValue={entity?.view || entity?.defaultView || data.preferences.defaultView}
          >
            {['Board', 'List', 'Calendar'].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        {isProject && !entity && (
          <label>
            Start from a template
            <select name="template">
              {Object.keys(templates).map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
        )}
        <button className="primary">{entity ? 'Save changes' : 'Create ' + kind}</button>
      </form>
    </Modal>
  );
}
export default function Settings({ data, commit, editEntity, confirmAction }) {
  const [tab, setTab] = useState('General'),
    [error, setError] = useState('');
  const w = data.workspaces.find((w) => w.id === data.workspaceId),
    p = data.projects.find((p) => p.id === data.projectId),
    user = data.users.find((u) => u.id === data.session),
    manager = canManage(data);
  function preference(key, value) {
    commit(
      (d) => {
        d.preferences[key] = value;
      },
      'Preference saved',
      false,
      true,
    );
  }
  async function importFile(e) {
    try {
      const f = e.target.files[0];
      if (!f) return;
      if (f.size > 8000000) throw new Error('Import file must be under 8 MB.');
      const value = validateImport(JSON.parse(await f.text()));
      confirmAction('Replace all local data with this import?', () =>
        commit(
          (d) => {
            Object.keys(d).forEach((k) => delete d[k]);
            Object.assign(d, value);
            d.session = null;
          },
          'Import complete. Sign in to continue.',
          false,
          true,
        ),
      );
    } catch (err) {
      setError(err.message);
    }
    e.target.value = '';
  }
  return (
    <section className="settings">
      <div className="tabs">
        {['General', 'Profile', 'Workspace', 'Project', 'Data'].map((t) => (
          <button className={tab === t ? 'active' : ''} key={t} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      <div className="settings-card">
        {tab === 'General' && (
          <>
            <h2>Make yourself at home</h2>
            <p className="muted">A workspace that works the way you do.</p>
            <label>
              Appearance
              <select
                value={data.preferences.theme}
                onChange={(e) => preference('theme', e.target.value)}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <label>
              Default view
              <select
                value={data.preferences.defaultView}
                onChange={(e) => preference('defaultView', e.target.value)}
              >
                {['Board', 'List', 'Calendar'].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <h3>Notifications</h3>
            {[
              ['assigned', 'Task assignments'],
              ['mentioned', 'Mentions in comments'],
              ['due', 'Approaching due dates'],
              ['live', 'Simulated live collaboration'],
              ['failNext', 'Fail the next task edit (test rollback)'],
            ].map(([k, title]) => (
              <label className="toggle" key={k}>
                <span>{title}</span>
                <input
                  type="checkbox"
                  checked={data.preferences[k]}
                  onChange={(e) => preference(k, e.target.checked)}
                />
              </label>
            ))}
          </>
        )}
        {tab === 'Profile' && (
          <>
            <h2>Your profile</h2>
            <form
              key={user.id}
              onSubmit={(e) => {
                e.preventDefault();
                const f = Object.fromEntries(new FormData(e.target));
                if (
                  data.users.some(
                    (u) => u.id !== user.id && u.email.toLowerCase() === f.email.toLowerCase(),
                  )
                )
                  return setError('Email already in use.');
                commit(
                  (d) =>
                    Object.assign(
                      d.users.find((u) => u.id === user.id),
                      f,
                    ),
                  'Profile saved',
                  false,
                  true,
                );
                setError('');
              }}
            >
              <label>
                Name
                <input name="name" defaultValue={user.name} required maxLength={60} />
              </label>
              <label>
                Email
                <input type="email" name="email" defaultValue={user.email} required />
              </label>
              <label>
                Avatar (initials or emoji)
                <input name="avatar" defaultValue={user.avatar} maxLength={4} required />
              </label>
              <button className="primary">Save profile</button>
            </form>
            <p className="muted">Use the user menu in the sidebar to switch mock profiles.</p>
          </>
        )}
        {tab === 'Workspace' && w && (
          <>
            <div className="row between">
              <h2>{w.name}</h2>
              <button disabled={!manager} onClick={() => editEntity('workspace', w)}>
                Edit workspace
              </button>
            </div>
            <h3>People & permissions</h3>
            {w.members.map((m) => {
              const u = data.users.find((u) => u.id === m.userId);
              return (
                <div className="member" key={m.userId}>
                  <b className="avatar">{u?.avatar}</b>
                  <div>
                    <strong>{u?.name}</strong>
                    <small>{u?.email}</small>
                  </div>
                  <select
                    aria-label={'Role for ' + u?.name}
                    value={m.role}
                    disabled={!manager || m.role === 'owner'}
                    onChange={(e) =>
                      commit((d) => {
                        d.workspaces
                          .find((x) => x.id === w.id)
                          .members.find((x) => x.userId === m.userId).role = e.target.value;
                      }, 'Role updated')
                    }
                  >
                    <option value="owner" disabled>
                      Owner
                    </option>
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
              );
            })}
            {manager && (
              <form
                className="invite-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = Object.fromEntries(new FormData(e.target));
                  commit((d) => {
                    let u = d.users.find((u) => u.email.toLowerCase() === f.email.toLowerCase());
                    if (!u) {
                      u = {
                        id: uid(),
                        email: f.email.toLowerCase(),
                        name: f.name,
                        password: 'demo123',
                        avatar: f.name.slice(0, 2).toUpperCase(),
                      };
                      d.users.push(u);
                    }
                    const ws = d.workspaces.find((x) => x.id === w.id);
                    if (!ws.members.some((m) => m.userId === u.id))
                      ws.members.push({ userId: u.id, role: 'member' });
                  }, 'Mock member invited');
                  e.target.reset();
                }}
              >
                <h3>Invite a mock member</h3>
                <label>
                  Name
                  <input name="name" required maxLength={60} />
                </label>
                <label>
                  Email
                  <input name="email" type="email" required />
                </label>
                <button className="primary">Add member</button>
                <small>No email is sent. New mock users use password demo123.</small>
              </form>
            )}
            <div className="danger-zone">
              <h3>Danger zone</h3>
              <button
                className="danger"
                disabled={w.members.find((m) => m.userId === data.session)?.role !== 'owner'}
                onClick={() =>
                  confirmAction('Delete this workspace and all its projects and tasks?', () =>
                    commit((d) => {
                      const ids = d.projects.filter((p) => p.workspaceId === w.id).map((p) => p.id);
                      d.tasks = d.tasks.filter((t) => !ids.includes(t.projectId));
                      d.projects = d.projects.filter((p) => p.workspaceId !== w.id);
                      d.workspaces = d.workspaces.filter((x) => x.id !== w.id);
                      d.workspaceId = d.workspaces.find((x) =>
                        x.members.some((m) => m.userId === d.session),
                      )?.id;
                      d.projectId = d.projects.find((p) => p.workspaceId === d.workspaceId)?.id;
                    }, 'Workspace deleted'),
                  )
                }
              >
                Delete workspace
              </button>
            </div>
          </>
        )}
        {tab === 'Project' &&
          (p ? (
            <>
              <div className="row between">
                <h2>{p.name}</h2>
                <button disabled={!manager} onClick={() => editEntity('project', p)}>
                  Edit project
                </button>
              </div>
              <h3>Project members</h3>
              {w.members.map((m) => {
                const u = data.users.find((u) => u.id === m.userId);
                return (
                  <label className="toggle" key={m.userId}>
                    <span>{u?.name}</span>
                    <input
                      type="checkbox"
                      disabled={!manager}
                      checked={p.members.includes(m.userId)}
                      onChange={(e) =>
                        commit((d) => {
                          const pr = d.projects.find((x) => x.id === p.id);
                          pr.members = e.target.checked
                            ? [...pr.members, m.userId]
                            : pr.members.filter((id) => id !== m.userId);
                          if (!e.target.checked)
                            d.tasks
                              .filter((t) => t.projectId === p.id && t.assignee === m.userId)
                              .forEach((t) => {
                                t.assignee = '';
                              });
                        }, 'Project members updated')
                      }
                    />
                  </label>
                );
              })}
              <h3>Board columns</h3>
              {p.columns.map((s, i) => (
                <div className="row column-setting" key={s}>
                  <strong>{s}</strong>
                  <button
                    disabled={!manager || i === 0}
                    onClick={() =>
                      commit((d) => {
                        const c = d.projects.find((x) => x.id === p.id).columns;
                        [c[i - 1], c[i]] = [c[i], c[i - 1]];
                      }, 'Columns reordered')
                    }
                  >
                    ↑
                  </button>
                  <button
                    disabled={!manager || i === p.columns.length - 1}
                    onClick={() =>
                      commit((d) => {
                        const c = d.projects.find((x) => x.id === p.id).columns;
                        [c[i + 1], c[i]] = [c[i], c[i + 1]];
                      }, 'Columns reordered')
                    }
                  >
                    ↓
                  </button>
                  <button
                    disabled={!manager}
                    onClick={() => {
                      const name = window.prompt('Column name', s)?.trim();
                      if (name && !p.columns.includes(name))
                        commit((d) => {
                          d.projects.find((x) => x.id === p.id).columns[i] = name;
                          d.tasks
                            .filter((t) => t.projectId === p.id && t.status === s)
                            .forEach((t) => {
                              t.status = name;
                            });
                        }, 'Column renamed');
                    }}
                  >
                    Rename
                  </button>
                  <button
                    disabled={!manager || p.columns.length === 1}
                    onClick={() =>
                      confirmAction(
                        'Remove column? Tasks will move to the first remaining column.',
                        () =>
                          commit((d) => {
                            const pr = d.projects.find((x) => x.id === p.id);
                            pr.columns = pr.columns.filter((c) => c !== s);
                            d.tasks
                              .filter((t) => t.projectId === p.id && t.status === s)
                              .forEach((t) => {
                                t.status = pr.columns[0];
                              });
                          }, 'Column removed'),
                      )
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                disabled={!manager}
                onClick={() => {
                  const name = window.prompt('New column name')?.trim();
                  if (name && !p.columns.includes(name))
                    commit(
                      (d) => d.projects.find((x) => x.id === p.id).columns.push(name),
                      'Column added',
                    );
                }}
              >
                + Add column
              </button>
              <p className="muted">The last column represents completed work.</p>
              <div className="danger-zone">
                <button
                  disabled={!manager}
                  onClick={() =>
                    commit(
                      (d) => {
                        const pr = d.projects.find((x) => x.id === p.id);
                        pr.archived = !pr.archived;
                      },
                      p.archived ? 'Project restored' : 'Project archived',
                    )
                  }
                >
                  {p.archived ? 'Restore' : 'Archive'} project
                </button>
                <button
                  className="danger"
                  disabled={!manager}
                  onClick={() =>
                    confirmAction('Delete this project and all its tasks?', () =>
                      commit((d) => {
                        d.projects = d.projects.filter((x) => x.id !== p.id);
                        d.tasks = d.tasks.filter((t) => t.projectId !== p.id);
                        d.projectId = d.projects.find((x) => x.workspaceId === w.id)?.id;
                      }, 'Project deleted'),
                    )
                  }
                >
                  Delete project
                </button>
              </div>
            </>
          ) : (
            <p>No project selected.</p>
          ))}
        {tab === 'Data' && (
          <>
            <h2>Your work stays with you</h2>
            <p className="muted">
              Data is stored in this browser. Export a backup before clearing browser storage.
              Exports include mock account credentials and local attachments.
            </p>
            <button onClick={() => exportData(data)}>Export workspace data</button>
            <label>
              Import a Forma JSON backup
              <input
                type="file"
                accept="application/json,.json"
                disabled={!manager}
                onChange={importFile}
              />
            </label>
            <div className="danger-zone">
              <h3>Reset everything</h3>
              <p>This replaces all local work with the original demo.</p>
              <button
                disabled={!manager}
                className="danger"
                onClick={() =>
                  confirmAction('Reset all local data? Export a backup first.', () =>
                    commit(
                      (d) => {
                        Object.assign(d, seed());
                      },
                      'Demo reset',
                      false,
                      true,
                    ),
                  )
                }
              >
                Reset all data
              </button>
            </div>
          </>
        )}
        {!manager && ['Workspace', 'Project', 'Data'].includes(tab) && (
          <p className="notice">Access restricted: an owner or admin manages these settings.</p>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
