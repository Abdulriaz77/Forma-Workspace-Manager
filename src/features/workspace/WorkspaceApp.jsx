import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Bell,
  Search,
  Settings as SettingsIcon,
  LayoutGrid,
  List,
  CalendarDays,
  Plus,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  PanelLeftClose,
  Menu,
  Sun,
  Moon,
  Undo2,
  Redo2,
  SlidersHorizontal,
  Activity,
  RefreshCw,
  Check,
  LogOut,
  Command,
  Folder,
  WifiOff,
} from 'lucide-react';
import { store, hydrate, replace, undo, redo } from '../../store/store';
import { uid, canEdit, canManage, priorities } from '../../lib/data';
import { readData, saveData } from '../../lib/persistence';
import Auth from '../auth/Auth';
import TaskViews from '../tasks/TaskViews';
import TaskDetail from '../tasks/TaskDetail';
import Settings, { EntityForm } from './Settings';
import Modal from '../../components/Modal';
const emptyFilters = { assignee: '', status: '', priority: '', label: '', from: '', to: '' };
export default function WorkspaceApp() {
  const data = useSelector((s) => s.data),
    past = useSelector((s) => s.past),
    future = useSelector((s) => s.future),
    dispatch = useDispatch();
  const [ready, setReady] = useState(false),
    [page, setPage] = useState('project'),
    [modal, setModal] = useState(null),
    [toast, setToast] = useState(null),
    [search, setSearch] = useState(''),
    [filters, setFilters] = useState(emptyFilters),
    [showFilters, setShowFilters] = useState(false),
    [sort, setSort] = useState('createdAt'),
    [groupBy, setGroupBy] = useState('none'),
    [selected, setSelected] = useState([]),
    [collapsed, setCollapsed] = useState(false),
    [online, setOnline] = useState(true),
    [busy, setBusy] = useState(false),
    [activityUser, setActivityUser] = useState(''),
    [activityType, setActivityType] = useState('');
  const pending = useRef(false),
    timer = useRef(null);
  const notify = useCallback((text, undoable = false) => {
    setToast({ text, undoable });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 5500);
  }, []);
  useEffect(() => {
    try {
      const saved = readData();
      if (saved) dispatch(hydrate(saved));
    } catch {
      notify('Saved data could not be read. Original storage is retained until your next change.');
    }
    setReady(true);
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      clearTimeout(timer.current);
    };
  }, [dispatch, notify]);
  const commit = useCallback(
    (
      mutate,
      message = 'Updated',
      history = true,
      bypass = false,
      taskId = null,
      action = 'edited',
    ) => {
      if (pending.current) {
        notify('Please wait for the current change to finish.');
        return false;
      }
      const before = store.getState().data;
      if (!bypass && !canEdit(before)) {
        notify('Access denied. Your workspace role does not allow editing.');
        return false;
      }
      const next = structuredClone(before);
      mutate(next);
      if (history) {
        next.activities.push({
          id: uid(),
          projectId: before.projectId,
          taskId,
          userId: before.session,
          text: message,
          action,
          at: new Date().toISOString(),
        });
        if (next.preferences.assigned)
          for (const t of next.tasks) {
            const old = before.tasks.find((x) => x.id === t.id);
            if (t.assignee && t.assignee !== before.session && t.assignee !== old?.assignee)
              next.notifications.push({
                id: uid(),
                userId: t.assignee,
                taskId: t.id,
                text: `You were assigned: ${t.title}`,
                read: false,
              });
          }
      }
      const fail = history && !!taskId && before.preferences.failNext;
      next.preferences.failNext = fail ? false : next.preferences.failNext;
      try {
        saveData(next);
      } catch {
        notify(
          'Storage is full or unavailable. Export your data and remove large attachments. Change was not saved.',
        );
        return false;
      }
      dispatch(replace({ data: next, history }));
      notify(message, history);
      if (fail) {
        pending.current = true;
        setBusy(true);
        setTimeout(() => {
          const restored = structuredClone(before);
          restored.preferences.failNext = false;
          try {
            saveData(restored);
          } catch {
            /* retain in-memory rollback */
          }
          dispatch(hydrate(restored));
          pending.current = false;
          setBusy(false);
          notify('Simulated network failure. Your change was rolled back.');
        }, 900);
      }
      return true;
    },
    [dispatch, notify],
  );
  function historyAction(action) {
    if (pending.current) return;
    const state = store.getState(),
      target = action === 'undo' ? state.past.at(-1) : state.future.at(-1);
    if (!target || !canEdit(state.data)) return;
    try {
      saveData(target);
      dispatch(action === 'undo' ? undo() : redo());
      notify(action === 'undo' ? 'Change undone' : 'Change restored');
    } catch {
      notify('Could not save history change.');
    }
  }
  const w = data.workspaces.find((w) => w.id === data.workspaceId),
    project = data.projects.find((p) => p.id === data.projectId && p.workspaceId === w?.id),
    user = data.users.find((u) => u.id === data.session),
    editable = canEdit(data),
    manager = canManage(data),
    view = project?.view || w?.defaultView || data.preferences.defaultView;
  function navigate(p) {
    commit(
      (d) => {
        d.projectId = p.id;
        d.workspaceId = p.workspaceId;
      },
      '',
      false,
      true,
    );
    setPage('project');
    setSelected([]);
    setFilters(emptyFilters);
    setModal(null);
  }
  function newTask(status) {
    if (!editable || !project) return notify('Choose a project with edit access first.');
    setModal({
      type: 'task',
      task: {
        id: uid(),
        projectId: project.id,
        title: '',
        description: '',
        status: status || project.columns[0],
        priority: 'Medium',
        dueDate: '',
        assignee: '',
        labels: [],
        subtasks: [],
        comments: [],
        attachments: [],
        createdAt: new Date().toISOString(),
      },
    });
  }
  function changeView(v) {
    if (project)
      commit(
        (d) => {
          d.projects.find((p) => p.id === project.id).view = v;
        },
        '',
        false,
        true,
      );
  }
  const confirmAction = (title, run) => setModal({ type: 'confirm', title, run });
  function removeTasks(ids) {
    confirmAction(`Delete ${ids.length} task${ids.length === 1 ? '' : 's'}?`, () => {
      commit(
        (d) => {
          d.tasks = d.tasks.filter((t) => !ids.includes(t.id));
        },
        'Task deleted',
        true,
        false,
        ids[0],
        'deleted',
      );
      setSelected([]);
    });
  }
  useEffect(() => {
    function keyboard(e) {
      const input =
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setModal((m) => (m?.type === 'search' ? null : { type: 'search' }));
        setSearch('');
      }
      if (input || modal) return;
      if (e.key === 'n') {
        e.preventDefault();
        newTask();
      }
      if (['1', '2', '3'].includes(e.key))
        changeView(['Board', 'List', 'Calendar'][Number(e.key) - 1]);
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        historyAction(e.shiftKey ? 'redo' : 'undo');
      }
    }
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  });
  useEffect(() => {
    if (!ready || !data.session || !data.preferences.live) return;
    const id = setInterval(() => {
      if (pending.current) return;
      const current = store.getState().data;
      const task = current.tasks.find((t) => t.projectId === current.projectId);
      const actor = current.users.find((u) => u.id !== current.session);
      if (task && actor)
        commit(
          (d) => {
            d.tasks
              .find((t) => t.id === task.id)
              .comments.push({
                id: uid(),
                userId: actor.id,
                text: 'Simulated update: I’m reviewing this with the team.',
                createdAt: new Date().toISOString(),
              });
            d.activities.push({
              id: uid(),
              projectId: task.projectId,
              taskId: task.id,
              userId: actor.id,
              text: 'Shared a simulated update',
              action: 'commented',
              at: new Date().toISOString(),
            });
          },
          'New simulated team update',
          false,
          true,
        );
    }, 30000);
    return () => clearInterval(id);
  }, [ready, data.session, data.preferences.live, commit]);
  useEffect(() => {
    if (!ready || !data.session || !data.preferences.due) return;
    const today = new Date().toISOString().slice(0, 10),
      soon = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
    const due = data.tasks.filter(
      (t) =>
        t.assignee === data.session &&
        t.dueDate >= today &&
        t.dueDate <= soon &&
        t.status !== data.projects.find((p) => p.id === t.projectId)?.columns.at(-1) &&
        !data.notifications.some(
          (n) => n.dueKey === `${t.id}:${t.dueDate}` && n.userId === data.session,
        ),
    );
    if (due.length)
      commit(
        (d) => {
          for (const t of due)
            d.notifications.push({
              id: uid(),
              userId: d.session,
              taskId: t.id,
              dueKey: `${t.id}:${t.dueDate}`,
              text: `Due soon: ${t.title}`,
              read: false,
            });
        },
        '',
        false,
        true,
      );
  }, [
    ready,
    data.session,
    data.tasks,
    data.notifications,
    data.preferences.due,
    data.projects,
    commit,
  ]);
  if (!ready)
    return (
      <div className="loading" aria-label="Loading workspace">
        <div className="skeleton" />
        <div className="skeleton" />
        <div className="skeleton" />
        <p>Making room for your work…</p>
      </div>
    );
  if (!user)
    return (
      <>
        <Auth data={data} commit={commit} />
        {toast?.text && (
          <div className="toast" role="status">
            {toast.text}
          </div>
        )}
      </>
    );
  const projects = data.projects.filter((p) => p.workspaceId === w?.id),
    allTasks = data.tasks.filter((t) => t.projectId === project?.id),
    done = allTasks.filter((t) => t.status === project?.columns.at(-1)).length;
  const tasks = allTasks
    .filter(
      (t) =>
        (!filters.assignee || t.assignee === filters.assignee) &&
        (!filters.status || t.status === filters.status) &&
        (!filters.priority || t.priority === filters.priority) &&
        (!filters.label || t.labels.includes(filters.label)) &&
        (!filters.from || t.dueDate >= filters.from) &&
        (!filters.to || (!!t.dueDate && t.dueDate <= filters.to)),
    )
    .sort((a, b) =>
      sort === 'priority'
        ? priorities.indexOf(a.priority) - priorities.indexOf(b.priority)
        : String(a[sort] || '').localeCompare(String(b[sort] || '')),
    );
  const notifications = data.notifications.filter((n) => n.userId === data.session),
    unread = notifications.filter((n) => !n.read).length;
  const accessibleWs = data.workspaces.filter((w) =>
    w.members.some((m) => m.userId === data.session),
  );
  const allowedProjects = data.projects.filter((p) =>
    accessibleWs.some((w) => w.id === p.workspaceId),
  );
  const results = [
    ...accessibleWs.map((x) => ({ ...x, type: 'workspace', title: x.name })),
    ...allowedProjects.map((x) => ({ ...x, type: 'project', title: x.name })),
    ...data.tasks
      .filter((t) => allowedProjects.some((p) => p.id === t.projectId))
      .map((x) => ({ ...x, type: 'task' })),
  ].filter((x) => x.title.toLowerCase().includes(search.toLowerCase()));
  return (
    <div
      className={
        'app ' +
        (data.preferences.theme === 'dark' ? 'dark ' : '') +
        (collapsed ? 'sidebar-collapsed' : '')
      }
    >
      <aside className="sidebar">
        <div className="brand">
          ◈ <span className="brand-word">forma</span>
          <button
            className="icon-button collapse"
            aria-label="Collapse sidebar"
            onClick={() => setCollapsed(!collapsed)}
          >
            <PanelLeftClose size={17} />
          </button>
        </div>
        <div className="workspace-switch">
          <span style={{ background: w?.color }} className="workspace-icon">
            {w?.icon || 'F'}
          </span>
          <select
            aria-label="Switch workspace"
            value={w?.id || ''}
            onChange={(e) => {
              if (e.target.value === 'new') setModal({ type: 'entity', kind: 'workspace' });
              else {
                commit(
                  (d) => {
                    d.workspaceId = e.target.value;
                    d.projectId = d.projects.find((p) => p.workspaceId === e.target.value)?.id;
                  },
                  '',
                  false,
                  true,
                );
                setFilters(emptyFilters);
                setSelected([]);
                setPage('project');
              }
            }}
          >
            <option disabled value="">
              Select workspace
            </option>
            {accessibleWs.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
            <option value="new">+ New workspace</option>
          </select>
        </div>
        <button
          className="search-trigger"
          onClick={() => {
            setSearch('');
            setModal({ type: 'search' });
          }}
        >
          <Search size={16} />
          <span>Search anything</span>
          <kbd>⌘ K</kbd>
        </button>
        <nav>
          <button
            className={page === 'overview' ? 'active' : ''}
            onClick={() => setPage('overview')}
          >
            <LayoutGrid size={17} />
            <span>Overview</span>
          </button>
          <button
            className={page === 'notifications' ? 'active' : ''}
            onClick={() => setPage('notifications')}
          >
            <Bell size={17} />
            <span>Inbox</span>
            {unread > 0 && <b className="nav-count">{unread}</b>}
          </button>
          <button
            className={page === 'activity' ? 'active' : ''}
            onClick={() => setPage('activity')}
          >
            <Activity size={17} />
            <span>Activity</span>
          </button>
        </nav>
        <div className="sidebar-label">
          <span>WORKSPACE PROJECTS</span>
          <button
            aria-label="Create project"
            className="icon-button"
            disabled={!manager}
            onClick={() => setModal({ type: 'entity', kind: 'project' })}
          >
            <Plus size={15} />
          </button>
        </div>
        <nav>
          {projects
            .filter((p) => !p.archived)
            .map((p) => (
              <button
                className={
                  page === 'project' && project?.id === p.id ? 'active project-active' : ''
                }
                key={p.id}
                onClick={() => navigate(p)}
              >
                <span className="project-dot" style={{ background: p.color }} />
                <span>{p.name}</span>
                <ChevronRight size={14} />
              </button>
            ))}
          {!projects.length && <p className="muted sidebar-empty">Your next idea starts here.</p>}
        </nav>
        {projects.some((p) => p.archived) && (
          <details className="archived">
            <summary>Archived projects</summary>
            {projects
              .filter((p) => p.archived)
              .map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    navigate(p);
                    setPage('settings');
                  }}
                >
                  {p.name}
                </button>
              ))}
          </details>
        )}
        <div className="sidebar-bottom">
          <div className="workspace-note">
            <span>✧ A little clarity goes a long way.</span>
            <p>Make space for your best work.</p>
          </div>
          <nav>
            <button
              className={page === 'settings' ? 'active' : ''}
              onClick={() => setPage('settings')}
            >
              <SettingsIcon size={17} />
              <span>Settings & members</span>
            </button>
            <button
              onClick={() =>
                commit(
                  (d) => {
                    d.preferences.theme = d.preferences.theme === 'dark' ? 'light' : 'dark';
                  },
                  '',
                  false,
                  true,
                )
              }
            >
              {data.preferences.theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
              <span>{data.preferences.theme === 'dark' ? 'Light' : 'Dark'} appearance</span>
            </button>
          </nav>
          <div className="user-menu">
            <b className="avatar">{user.avatar}</b>
            <select
              aria-label="Switch mock user"
              value={user.id}
              onChange={(e) => {
                commit(
                  (d) => {
                    d.session = e.target.value;
                    const next = d.workspaces.find((w) =>
                      w.members.some((m) => m.userId === d.session),
                    );
                    d.workspaceId = next?.id;
                    d.projectId = d.projects.find((p) => p.workspaceId === next?.id)?.id;
                  },
                  'Profile switched',
                  false,
                  true,
                );
                dispatch(hydrate(store.getState().data));
                setModal(null);
                setSelected([]);
              }}
            >
              {data.users.map((u) => (
                <option value={u.id} key={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <button
              className="icon-button"
              title="Log out"
              onClick={() => {
                commit(
                  (d) => {
                    d.session = null;
                  },
                  'Signed out',
                  false,
                  true,
                );
                dispatch(hydrate(store.getState().data));
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="Toggle navigation"
            onClick={() => setCollapsed(!collapsed)}
          >
            <Menu size={20} />
          </button>
          <div className="breadcrumbs">
            <Folder size={15} />
            <span>{w?.name || 'Workspace'}</span>
            <ChevronRight size={13} />
            <strong>
              {page === 'project'
                ? project?.name || 'Projects'
                : page[0].toUpperCase() + page.slice(1)}
            </strong>
          </div>
          <div className="top-actions">
            <span className={'sync-status ' + (!online ? 'offline' : '')}>
              {online ? <i /> : <WifiOff size={13} />}{' '}
              {busy ? 'Saving…' : online ? 'All changes saved' : 'Offline · saved locally'}
            </span>
            <button
              className="icon-button"
              aria-label="Sync local changes"
              disabled={busy}
              onClick={() => {
                if (!online) return notify('You are offline. Changes remain saved locally.');
                setBusy(true);
                setTimeout(() => {
                  setBusy(false);
                  notify('Local changes reconciled (simulated sync).');
                }, 800);
              }}
            >
              <RefreshCw size={16} />
            </button>
            <button
              className="icon-button bell"
              aria-label={`Notifications, ${unread} unread`}
              onClick={() => setPage('notifications')}
            >
              <Bell size={18} />
              {unread > 0 && <i />}
            </button>
          </div>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {page === 'project' ? 'MAKE SOMETHING GREAT' : 'YOUR WORK, CONNECTED'}
              </div>
              <h1>
                {page === 'project' ? (
                  <>
                    <span className="heading-icon" style={{ color: project?.color }}>
                      {project?.icon || '✦'}
                    </span>
                    {project?.name || 'Your next big idea'}
                  </>
                ) : (
                  {
                    overview: 'A little perspective.',
                    notifications: 'Your inbox',
                    activity: 'The latest, together.',
                    settings: 'Settings & members',
                  }[page]
                )}
              </h1>
              <p>
                {page === 'project'
                  ? project?.description || 'Create a workspace and project to get started.'
                  : {
                      overview: 'A clear view of what’s moving, and what’s next.',
                      notifications: 'Stay in the loop without losing your focus.',
                      activity: 'Every small step adds up to meaningful progress.',
                      settings: 'A few thoughtful details to make this space yours.',
                    }[page]}
              </p>
            </div>
            <div className="heading-actions">
              {w && (
                <div className="avatar-stack">
                  {w.members.slice(0, 4).map((m) => (
                    <b
                      key={m.userId}
                      title={data.users.find((u) => u.id === m.userId)?.name}
                      className="avatar"
                    >
                      {data.users.find((u) => u.id === m.userId)?.avatar}
                    </b>
                  ))}
                </div>
              )}
              {page === 'project' && project && (
                <button
                  className="primary"
                  disabled={!editable || project.archived}
                  onClick={() => newTask()}
                >
                  <Plus size={17} /> New task
                </button>
              )}
            </div>
          </div>
          {page === 'project' && project && !project.archived && (
            <>
              <div className="project-summary">
                <span>
                  <i className="green-dot" /> Project in motion
                </span>
                <div className="summary-progress">
                  <div className="progress">
                    <i
                      style={{ width: `${allTasks.length ? (done / allTasks.length) * 100 : 0}%` }}
                    />
                  </div>
                  <strong>
                    {done}/{allTasks.length}
                  </strong>{' '}
                  tasks completed
                </div>
                <div className="history">
                  <button
                    className="icon-button"
                    disabled={!past.length || !editable || busy}
                    title="Undo (Ctrl+Z)"
                    onClick={() => historyAction('undo')}
                  >
                    <Undo2 size={16} />
                  </button>
                  <button
                    className="icon-button"
                    disabled={!future.length || !editable || busy}
                    title="Redo (Ctrl+Shift+Z)"
                    onClick={() => historyAction('redo')}
                  >
                    <Redo2 size={16} />
                  </button>
                </div>
              </div>
              <div className="view-toolbar">
                <div className="tabs">
                  {[
                    [LayoutGrid, 'Board'],
                    [List, 'List'],
                    [CalendarDays, 'Calendar'],
                  ].map(([Icon, v]) => (
                    <button
                      key={v}
                      className={view === v ? 'active' : ''}
                      onClick={() => changeView(v)}
                    >
                      <Icon size={15} />
                      {v}
                    </button>
                  ))}
                </div>
                <div className="row">
                  <button
                    className={showFilters ? 'filter-active' : ''}
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <SlidersHorizontal size={14} /> Filter{' '}
                    {Object.values(filters).filter(Boolean).length || ''}
                  </button>
                  <select
                    aria-label="Sort tasks"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="createdAt">Created date</option>
                    <option value="dueDate">Due date</option>
                    <option value="priority">Priority</option>
                    <option value="title">Alphabetical</option>
                  </select>
                  {view === 'List' && (
                    <select
                      aria-label="Group tasks"
                      value={groupBy}
                      onChange={(e) => setGroupBy(e.target.value)}
                    >
                      <option value="none">No grouping</option>
                      <option value="status">Status</option>
                      <option value="assignee">Assignee</option>
                      <option value="priority">Priority</option>
                      <option value="labels">Label</option>
                    </select>
                  )}
                </div>
              </div>
              {showFilters && (
                <div className="filter-panel">
                  {[
                    ['status', project.columns],
                    ['priority', priorities],
                    ['label', [...new Set(allTasks.flatMap((t) => t.labels))]],
                  ].map(([key, options]) => (
                    <label key={key}>
                      {key}
                      <select
                        value={filters[key]}
                        onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}
                      >
                        <option value="">All</option>
                        {options.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                  <label>
                    Assignee
                    <select
                      value={filters.assignee}
                      onChange={(e) => setFilters({ ...filters, assignee: e.target.value })}
                    >
                      <option value="">Everyone</option>
                      {data.users
                        .filter((u) => project.members.includes(u.id))
                        .map((u) => (
                          <option value={u.id} key={u.id}>
                            {u.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    From
                    <input
                      type="date"
                      value={filters.from}
                      onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                    />
                  </label>
                  <label>
                    To
                    <input
                      type="date"
                      value={filters.to}
                      onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                    />
                  </label>
                  <button onClick={() => setFilters(emptyFilters)}>Clear</button>
                  <button
                    onClick={() => {
                      const name = window.prompt('Preset name')?.trim();
                      if (name)
                        commit(
                          (d) =>
                            d.presets.push({ id: uid(), name, filters, projectId: project.id }),
                          'Filter preset saved',
                          false,
                          true,
                        );
                    }}
                  >
                    Save preset
                  </button>
                  <select
                    aria-label="Saved filters"
                    value=""
                    onChange={(e) => {
                      const p = data.presets.find((x) => x.id === e.target.value);
                      if (p) setFilters(p.filters);
                    }}
                  >
                    <option value="">Saved filters</option>
                    {data.presets
                      .filter((p) => p.projectId === project.id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}
              {selected.length > 0 && (
                <div className="bulk-bar">
                  <strong>{selected.length} selected</strong>
                  <select
                    aria-label="Bulk status"
                    disabled={!editable}
                    value=""
                    onChange={(e) =>
                      commit(
                        (d) =>
                          d.tasks
                            .filter((t) => selected.includes(t.id))
                            .forEach((t) => {
                              t.status = e.target.value;
                            }),
                        'Tasks updated',
                        true,
                        false,
                        selected[0],
                        'status',
                      )
                    }
                  >
                    <option value="">Set status</option>
                    {project.columns.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  <select
                    aria-label="Bulk assignee"
                    disabled={!editable}
                    value=""
                    onChange={(e) =>
                      commit(
                        (d) =>
                          d.tasks
                            .filter((t) => selected.includes(t.id))
                            .forEach((t) => {
                              t.assignee = e.target.value === 'none' ? '' : e.target.value;
                            }),
                        'Tasks assigned',
                        true,
                        false,
                        selected[0],
                      )
                    }
                  >
                    <option value="">Assign to…</option>
                    <option value="none">Unassigned</option>
                    {data.users
                      .filter((u) => project.members.includes(u.id))
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                  </select>
                  <button
                    disabled={!editable}
                    className="danger"
                    onClick={() => removeTasks(selected)}
                  >
                    Delete
                  </button>
                  <button onClick={() => setSelected([])}>Clear selection</button>
                </div>
              )}
              {tasks.length === 0 && (
                <div className="empty-state">
                  <Search size={30} />
                  <h3>
                    {allTasks.length
                      ? 'Nothing matches these filters'
                      : 'Good things start with a first task.'}
                  </h3>
                  <p>
                    {allTasks.length
                      ? 'Try clearing your filters to see more work.'
                      : 'Add a task and give your next idea a place to grow.'}
                  </p>
                  <button onClick={() => (allTasks.length ? setFilters(emptyFilters) : newTask())}>
                    {allTasks.length ? 'Clear filters' : '+ Create first task'}
                  </button>
                </div>
              )}
              <TaskViews
                {...{
                  view,
                  tasks,
                  project,
                  data,
                  commit,
                  editable,
                  selected,
                  setSelected,
                  groupBy,
                  sort,
                  setSort,
                  newTask,
                }}
                openTask={(task) => setModal({ type: 'task', task })}
              />
              <div className="board-footnote">
                <span>
                  {tasks.length} tasks · {project.members.length} team members
                </span>
                <span>Small steps. Meaningful progress. ✧</span>
              </div>
            </>
          )}
          {page === 'project' && (!project || project.archived) && (
            <div className="empty-state">
              <Folder size={36} />
              <h2>
                {project?.archived ? 'This project is archived' : 'A fresh space for your ideas'}
              </h2>
              <p>
                {project?.archived
                  ? 'Restore the project from settings to continue working.'
                  : 'Create your first project or start with a ready-made template.'}
              </p>
              <button
                className="primary"
                disabled={!!w && !manager}
                onClick={() =>
                  project?.archived
                    ? setPage('settings')
                    : setModal({ type: 'entity', kind: w ? 'project' : 'workspace' })
                }
              >
                {project?.archived
                  ? 'Open settings'
                  : w
                    ? 'Create a project'
                    : 'Create a workspace'}
              </button>
            </div>
          )}
          {page === 'overview' && (
            <>
              <div className="stats">
                {[
                  ['Active projects', projects.filter((p) => !p.archived).length],
                  [
                    'Total tasks',
                    data.tasks.filter((t) => projects.some((p) => p.id === t.projectId)).length,
                  ],
                  [
                    'Completed',
                    data.tasks.filter((t) =>
                      projects.some((p) => p.id === t.projectId && t.status === p.columns.at(-1)),
                    ).length,
                  ],
                  ['Team members', w?.members.length || 0],
                ].map(([label, n]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{n}</strong>
                    <small>In your workspace</small>
                  </div>
                ))}
              </div>
              <div className="row between">
                <h2>Your projects</h2>
                <button
                  disabled={!manager}
                  onClick={() => setModal({ type: 'entity', kind: 'project' })}
                >
                  + New project
                </button>
              </div>
              <div className="project-grid">
                {projects
                  .filter((p) => !p.archived)
                  .map((p) => (
                    <button key={p.id} className="project-card" onClick={() => navigate(p)}>
                      <span style={{ color: p.color }}>{p.icon}</span>
                      <ArrowUpRight size={18} />
                      <h3>{p.name}</h3>
                      <p>{p.description}</p>
                      <small>
                        {data.tasks.filter((t) => t.projectId === p.id).length} tasks ·{' '}
                        {p.members.length} members
                      </small>
                    </button>
                  ))}
              </div>
              {!projects.length && (
                <p className="empty-state">
                  No projects yet. Create a workspace or your first project.
                </p>
              )}
            </>
          )}
          {page === 'notifications' && (
            <section className="feed">
              <div className="row between">
                <h3>{unread} unread updates</h3>
                <button
                  onClick={() =>
                    commit(
                      (d) =>
                        d.notifications
                          .filter((n) => n.userId === d.session)
                          .forEach((n) => {
                            n.read = true;
                          }),
                      'All notifications read',
                      false,
                      true,
                    )
                  }
                >
                  Mark all as read
                </button>
              </div>
              {notifications
                .slice()
                .reverse()
                .map((n) => (
                  <article className={'notification ' + (!n.read ? 'unread' : '')} key={n.id}>
                    <Bell size={18} />
                    <button
                      className="text-button"
                      onClick={() => {
                        commit(
                          (d) => {
                            d.notifications.find((x) => x.id === n.id).read = true;
                          },
                          '',
                          false,
                          true,
                        );
                        const t = data.tasks.find((t) => t.id === n.taskId);
                        if (t) {
                          const p = allowedProjects.find((p) => p.id === t.projectId);
                          if (p) {
                            navigate(p);
                            setModal({ type: 'task', task: t });
                          }
                        }
                      }}
                    >
                      {n.text}
                    </button>
                    {!n.read && (
                      <button
                        aria-label="Mark read"
                        className="icon-button"
                        onClick={() =>
                          commit(
                            (d) => {
                              d.notifications.find((x) => x.id === n.id).read = true;
                            },
                            '',
                            false,
                            true,
                          )
                        }
                      >
                        <Check size={16} />
                      </button>
                    )}
                  </article>
                ))}
              {!notifications.length && (
                <div className="empty-state">
                  <Bell size={32} />
                  <h3>You’re all caught up.</h3>
                  <p>Assignments, mentions, and due dates will appear here.</p>
                </div>
              )}
            </section>
          )}
          {page === 'activity' && (
            <section className="feed">
              <div className="row">
                <select
                  aria-label="Activity user"
                  value={activityUser}
                  onChange={(e) => setActivityUser(e.target.value)}
                >
                  <option value="">All people</option>
                  {data.users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Activity type"
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value)}
                >
                  <option value="">All activity</option>
                  {['created', 'edited', 'status', 'deleted', 'commented'].map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
                <span className="muted">{project?.name || 'Current workspace'}</span>
              </div>
              {data.activities
                .filter(
                  (a) =>
                    a.projectId === project?.id &&
                    (!activityUser || a.userId === activityUser) &&
                    (!activityType || a.action === activityType),
                )
                .slice()
                .reverse()
                .map((a) => (
                  <article className="activity-entry" key={a.id}>
                    <b className="avatar">{data.users.find((u) => u.id === a.userId)?.avatar}</b>
                    <div>
                      <strong>{data.users.find((u) => u.id === a.userId)?.name}</strong> {a.text}
                      <small>{new Date(a.at).toLocaleString()}</small>
                    </div>
                  </article>
                ))}
              {!data.activities.some((a) => a.projectId === project?.id) && (
                <div className="empty-state">
                  <Activity size={32} />
                  <h3>Your story starts here.</h3>
                  <p>Task changes and team conversations will appear in this feed.</p>
                </div>
              )}
            </section>
          )}
          {page === 'settings' && (
            <Settings
              {...{ data, commit, confirmAction }}
              editEntity={(kind, entity) => setModal({ type: 'entity', kind, entity })}
            />
          )}
        </div>
      </main>
      {modal?.type === 'task' && project && (
        <TaskDetail
          key={modal.task.id}
          task={modal.task}
          {...{ project, data, commit, editable }}
          onClose={() => setModal(null)}
          removeTask={(id) => removeTasks([id])}
        />
      )}
      {modal?.type === 'entity' && (
        <EntityForm
          kind={modal.kind}
          entity={modal.entity}
          {...{ data, commit }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'confirm' && (
        <Modal title="Just checking" onClose={() => setModal(null)}>
          <p>{modal.title}</p>
          <div className="modal-actions">
            <button onClick={() => setModal(null)}>Cancel</button>
            <button
              className="primary danger-fill"
              onClick={() => {
                modal.run();
                setModal(null);
              }}
            >
              Confirm
            </button>
          </div>
        </Modal>
      )}
      {modal?.type === 'search' && (
        <Modal title="Find your next move" onClose={() => setModal(null)}>
          <div className="palette-search">
            <Search size={18} />
            <input
              autoFocus
              aria-label="Search workspaces, projects and tasks"
              placeholder="Search tasks, projects, workspaces…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="command-results">
            {!search && (
              <>
                <button
                  onClick={() => {
                    setModal(null);
                    newTask();
                  }}
                >
                  <Plus size={17} /> Create task <kbd>N</kbd>
                </button>
                <button
                  onClick={() => {
                    setModal(null);
                    setPage('settings');
                  }}
                >
                  <SettingsIcon size={17} /> Open settings
                </button>
              </>
            )}
            {results.slice(0, 30).map((r) => (
              <button
                key={r.type + r.id}
                onClick={() => {
                  if (r.type === 'workspace') {
                    commit(
                      (d) => {
                        d.workspaceId = r.id;
                        d.projectId = d.projects.find((p) => p.workspaceId === r.id)?.id;
                      },
                      '',
                      false,
                      true,
                    );
                    setPage('overview');
                    setModal(null);
                  } else if (r.type === 'project') navigate(r);
                  else {
                    const p = data.projects.find((p) => p.id === r.projectId);
                    navigate(p);
                    setModal({ type: 'task', task: r });
                  }
                }}
              >
                <span className="result-type">{r.type}</span>
                <span>{r.title}</span>
                <ArrowUpRight size={14} />
              </button>
            ))}
            {!results.length && <p className="empty-state">No results for “{search}”.</p>}
          </div>
          <small className="muted">
            ⌘ / Ctrl K · Search &nbsp; N · New task &nbsp; 1 / 2 / 3 · Change view
          </small>
        </Modal>
      )}
      {toast?.text && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast.text}
          {toast.undoable && past.length > 0 && (
            <button onClick={() => historyAction('undo')}>Undo</button>
          )}
          <button aria-label="Dismiss notification" onClick={() => setToast(null)}>
            ×
          </button>
        </div>
      )}
    </div>
  );
}
