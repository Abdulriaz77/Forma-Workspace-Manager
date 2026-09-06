export const uid = () => globalThis.crypto.randomUUID();
export const statuses = ['Backlog', 'In progress', 'In review', 'Done'];
export const priorities = ['Urgent', 'High', 'Medium', 'Low'];
export const templates = {
  Blank: [],
  'Product launch': [
    'Define launch goals',
    'Design landing page',
    'Build the first release',
    'Run quality checks',
    'Share with the world',
  ],
  'Sprint planning': [
    'Plan sprint scope',
    'Refine backlog',
    'Implement sprint work',
    'Sprint retrospective',
  ],
};
export function seed() {
  const now = new Date().toISOString();
  const due = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const users = [
    { id: 'u1', name: 'Alex Morgan', email: 'alex@demo.com', password: 'demo123', avatar: 'AM' },
    { id: 'u2', name: 'Sam Wilson', email: 'sam@demo.com', password: 'demo123', avatar: 'SW' },
    { id: 'u3', name: 'Jamie Chen', email: 'jamie@demo.com', password: 'demo123', avatar: 'JC' },
    { id: 'u4', name: 'Taylor Reed', email: 'taylor@demo.com', password: 'demo123', avatar: 'TR' },
  ];
  const titles = [
    'Explore onboarding patterns',
    'Map the customer journey',
    'Design the new dashboard',
    'Build reusable components',
    'Polish mobile navigation',
    'Review accessibility',
    'Write release notes',
    'Set up the project foundation',
  ];
  return {
    version: 1,
    users,
    session: null,
    workspaceId: 'w1',
    projectId: 'p1',
    workspaces: [
      {
        id: 'w1',
        name: 'Acme Studio',
        icon: 'A',
        color: '#7763e8',
        defaultView: 'Board',
        members: users.map((u, i) => ({
          userId: u.id,
          role: ['owner', 'admin', 'member', 'viewer'][i],
        })),
      },
    ],
    projects: [
      {
        id: 'p1',
        workspaceId: 'w1',
        name: 'Website redesign',
        description: 'A fresh look. A better experience. Let’s build something great.',
        color: '#8b72e8',
        icon: '✦',
        members: ['u1', 'u2', 'u3'],
        columns: statuses,
        view: 'Board',
        archived: false,
      },
      {
        id: 'p2',
        workspaceId: 'w1',
        name: 'Mobile app',
        description: 'Thoughtful experiences on the go.',
        color: '#50a999',
        icon: '◈',
        members: ['u1', 'u2'],
        columns: statuses,
        view: 'Board',
        archived: false,
      },
    ],
    tasks: titles.map((title, i) => ({
      id: 't' + i,
      projectId: 'p1',
      title,
      description: [
        'Gather inspiration and document opportunities for a simpler experience.',
        'Align on the details and share your progress with the team.',
      ][i % 2],
      status: statuses[Math.floor(i / 2)],
      priority: priorities[(i + 1) % 4],
      dueDate: due(i - 2),
      assignee: users[i % 3].id,
      labels: [['Research', 'Design', 'Development'][i % 3]],
      subtasks: [],
      attachments: [],
      comments: [],
      createdAt: now,
    })),
    activities: [],
    notifications: [],
    presets: [],
    preferences: {
      theme: 'light',
      defaultView: 'Board',
      assigned: true,
      mentioned: true,
      due: true,
      live: false,
      failNext: false,
    },
  };
}
export function roleFor(data) {
  return data.workspaces
    .find((w) => w.id === data.workspaceId)
    ?.members.find((m) => m.userId === data.session)?.role;
}
export const canEdit = (data) => ['owner', 'admin', 'member'].includes(roleFor(data));
export const canManage = (data) => ['owner', 'admin'].includes(roleFor(data));
export function validateImport(value) {
  if (
    !value ||
    value.version !== 1 ||
    !['users', 'workspaces', 'projects', 'tasks', 'activities', 'notifications', 'presets'].every(
      (k) => Array.isArray(value[k]),
    ) ||
    !value.preferences
  )
    throw new Error('Invalid workspace file: expected a version 1 Forma export.');
  for (const key of ['users', 'workspaces', 'projects', 'tasks']) {
    const ids = new Set();
    for (const item of value[key]) {
      if (!item || typeof item.id !== 'string' || ids.has(item.id))
        throw new Error('Invalid or duplicate IDs.');
      ids.add(item.id);
    }
  }
  if (
    value.users.some((u) => !u.name || !u.email || typeof u.password !== 'string') ||
    value.workspaces.some(
      (w) =>
        !w.name ||
        !Array.isArray(w.members) ||
        w.members.some(
          (m) =>
            !value.users.some((u) => u.id === m.userId) ||
            !['owner', 'admin', 'member', 'viewer'].includes(m.role),
        ) ||
        !w.members.some((m) => m.role === 'owner'),
    ) ||
    value.projects.some(
      (p) =>
        !p.name ||
        !value.workspaces.some((w) => w.id === p.workspaceId) ||
        !Array.isArray(p.members) ||
        !Array.isArray(p.columns) ||
        !p.columns.length,
    ) ||
    value.tasks.some(
      (t) =>
        !t.title ||
        !value.projects.some((p) => p.id === t.projectId && p.columns.includes(t.status)) ||
        !Array.isArray(t.labels) ||
        !Array.isArray(t.comments) ||
        !Array.isArray(t.subtasks) ||
        !Array.isArray(t.attachments),
    )
  )
    throw new Error('Invalid data relationships or missing fields.');
  const text = (v) => typeof v === 'string';
  if (
    value.users.some((u) => !text(u.avatar)) ||
    value.workspaces.some((w) => !text(w.icon) || !/^#[0-9a-f]{6}$/i.test(w.color)) ||
    value.projects.some(
      (p) =>
        !text(p.description) ||
        !text(p.icon) ||
        !/^#[0-9a-f]{6}$/i.test(p.color) ||
        new Set(p.columns).size !== p.columns.length ||
        p.columns.some((c) => !text(c) || !c.trim()) ||
        p.members.some(
          (id) =>
            !value.workspaces
              .find((w) => w.id === p.workspaceId)
              .members.some((m) => m.userId === id),
        ),
    ) ||
    value.tasks.some(
      (t) =>
        !text(t.description) ||
        !text(t.createdAt) ||
        !priorities.includes(t.priority) ||
        !text(t.dueDate) ||
        !text(t.assignee) ||
        (t.assignee &&
          !value.projects.find((p) => p.id === t.projectId).members.includes(t.assignee)) ||
        t.labels.some((l) => !text(l)) ||
        (() => {
          const ids = new Set();
          return t.subtasks.some(
            (s) =>
              !text(s.id) ||
              ids.has(s.id) ||
              (ids.add(s.id) && (!text(s.title) || !s.title.trim())) ||
              typeof s.done !== 'boolean',
          );
        })() ||
        t.comments.some(
          (c) =>
            !text(c.id) ||
            !text(c.text) ||
            !text(c.createdAt) ||
            !value.users.some((u) => u.id === c.userId),
        ) ||
        t.attachments.some(
          (a) =>
            !text(a.id) ||
            !text(a.name) ||
            !text(a.url) ||
            !/^data:[^,]*;base64,[A-Za-z0-9+/=]*$/.test(a.url),
        ),
    )
  )
    throw new Error('Invalid field values or attachments.');
  if (
    !['light', 'dark'].includes(value.preferences.theme) ||
    !['Board', 'List', 'Calendar'].includes(value.preferences.defaultView) ||
    value.presets.some(
      (p) =>
        !text(p.id) ||
        !text(p.name) ||
        !p.filters ||
        Object.values(p.filters).some((v) => !text(v)),
    ) ||
    value.notifications.some((n) => !text(n.id) || !text(n.text) || !text(n.userId)) ||
    value.activities.some((a) => !text(a.id) || !text(a.text) || !text(a.at))
  )
    throw new Error('Invalid preferences, notifications, or activity.');
  return value;
}
