# Forma — Workspace Manager

A frontend workspace demo based on the supplied capstone feature list, using Next.js App Router, React, Redux Toolkit, Tailwind CSS, and Lucide icons. No backend is required.

## Run

Requires Node.js 20.9+ (tested on Node 24).

```powershell
cd client
npm.cmd install
npm.cmd run dev
```

Open http://localhost:3000. Use `npm` on macOS/Linux.

Demo login: **alex@demo.com / demo123** (owner). Other profiles: **sam@demo.com** (admin), **jamie@demo.com** (member), **taylor@demo.com** (viewer), all with password **demo123**. Switch mock profiles in the sidebar. New signups start with an empty workspace area.

## Structure

```text
client/
  public/                  Static assets
  src/
    app/                   Next.js page, layout, global styles
    components/            Shared accessible modal
    features/
      auth/                Login and signup
      tasks/               Task detail, board, list, calendar
      workspace/           Shell, navigation, management, settings
    lib/                   Seed data, permissions, validation, persistence
    store/                 Redux state, undo/redo
  tests/                   Data and permission tests
    e2e/                   Browser workflow tests
  postcss.config.mjs       Tailwind integration
  playwright.config.js
  eslint.config.js
```

The root `server/` is reserved and unused; the specification requires frontend-only operation.

## Completed Feature Checklist

This project implements the requested frontend-only workspace manager. The backend is intentionally not used; mock data, Redux Toolkit, localStorage, browser events, and simulated delays provide the application behavior.

### 1. Authentication and User Profiles

- Login and signup screens with mock credential validation.
- Persisted login session using localStorage.
- Editable user name, email, and avatar.
- Four mock profiles for multi-user simulation.
- Profile switching from the sidebar.
- Logout and session clearing.

### 2. Workspaces

- Create, rename, and delete workspaces.
- Switch between multiple workspaces.
- Workspace icon, color, and default-view settings.
- Workspace member list.
- Invite mock members without sending email.
- Assign owner, admin, member, or viewer roles.

### 3. Projects

- Create, rename, archive, restore, and delete projects.
- Project icon, color, and description.
- Assign workspace members to projects.
- Project templates for product launches and sprint planning.
- Project-specific board columns and default view.

### 4. Tasks and Subtasks

- Create, edit, delete, and duplicate tasks.
- Task title, description, status, priority, due date, assignee, and labels.
- One-level checklist subtasks with completion tracking.
- Convert subtasks into full tasks.
- Convert tasks into subtasks.
- Attach local files as base64 data.
- Bulk task selection, status changes, assignee changes, and deletion.
- Task detail modal with editable expanded information.

### 5. Views

- Kanban board with drag-and-drop task movement.
- Custom project columns with reorder, rename, add, and remove actions.
- Sortable table/list view.
- Calendar view grouped by due date.
- Per-project view persistence.
- List grouping by status, assignee, priority, or label.

### 6. Search, Filters, and Sorting

- Global search across workspaces, projects, and tasks.
- Filters for assignee, label, priority, status, and due-date range.
- Sorting by created date, due date, priority, and alphabetical title.
- Saved filter presets.
- Command palette search with `Ctrl/Cmd+K`.

### 7. Roles and Permissions

- Owner, admin, member, and viewer roles.
- Viewers cannot edit, create, or delete workspace content.
- Admin and owner-only workspace/project management controls.
- Disabled controls and access-denied notifications for restricted actions.

### 8. Activity and Collaboration

- Activity records for task creation, editing, deletion, movement, and comments.
- Task activity feed.
- Project activity aggregation.
- Acting user and timestamp on activity entries.
- Activity filtering by user and action type.
- Comment threads on tasks.
- Mock @mention notifications.
- Edit and delete own comments.
- Optional simulated live comments using an interval.

### 9. Undo, Redo, and Optimistic UX

- Undo and redo history for task and workspace changes.
- Keyboard shortcuts for undo and redo.
- Toast notifications for actions.
- Inline undo support for undoable actions.
- Simulated network delay and rollback testing.
- Optional “Fail the next task edit” setting for demonstrating rollback.

### 10. Notifications

- Notification bell with unread count.
- Assignment notifications.
- Mention notifications.
- Approaching due-date notifications.
- Mark one notification as read.
- Mark all notifications as read.
- Notification preference toggles.

### 11. Persistence and Offline Support

- Full application state saved in localStorage.
- State rehydration after reload.
- Offline and online browser status indicator.
- Manual simulated sync action.
- JSON workspace export.
- Validated JSON workspace import.
- Reset all local demo data.
- Import validation for relationships, roles, priorities, attachments, and subtasks.

### 12. UI and UX Utilities

- Light and dark themes with persistence.
- Responsive desktop and mobile layout.
- Mobile navigation drawer.
- Collapsible sidebar.
- Loading states and skeleton UI.
- Empty states for projects, tasks, and search results.
- Confirmation dialogs for destructive actions.
- Keyboard shortcuts for new task and view switching.
- Lucide icons and accessible labels.

### 13. Settings

- App-wide theme and default-view preferences.
- Notification preferences.
- Editable profile settings.
- Workspace member and role management.
- Project member management.
- Project column management.
- Workspace and project danger zones.
- Import, export, and reset controls.

### 14. Quality Checks

- Production build passes with Next.js.
- ESLint passes.
- Unit/data tests cover permissions, imports, relationships, and malformed subtasks.
- Playwright browser workflows cover login, task creation, reload persistence, editing, undo, view switching, viewer restrictions, search, mobile layout, and rollback behavior.

## Known Demo Limitations

- There is no real backend or database.
- Authentication is simulated and mock passwords are stored locally.
- Role permissions are client-side demonstrations, not security controls.
- Live collaboration and sync are simulated locally.
- Attachments are stored in browser storage and limited to five files of 500 KB each.
- Subtasks currently support one nesting level.

## Shortcuts

`Ctrl/Cmd+K`: command palette. `N`: new task. `1`, `2`, `3`: board, list, calendar. `Ctrl/Cmd+Z`: undo; add Shift to redo. Shortcuts respect text inputs.

## Checks

```powershell
npm.cmd run build
npm.cmd run lint
npm.cmd test
npx.cmd playwright test
```

Browser tests use installed Microsoft Edge. Change the Playwright browser channel if needed.

## Demo behavior and limits

All workspace data lives in this browser's localStorage. Mock passwords are stored as plain text; use demo credentials only. JSON backups include accounts and attachments. Export regularly to preserve work. Storage quota errors reject the change and show a message. Attachments are limited to five per task and 500 KB each. The final board column represents completion. Subtasks are one level; converting a task to a subtask preserves its title and completion state. Undo history is in memory, limited to 30 changes, and cleared on sign-out/profile switch/import or simulated rollback. Role checks demonstrate client-side behavior, not a security boundary. Live collaboration adds a clearly labeled mock comment every 30 seconds when enabled. Sync does not contact a server. Enable “Fail the next task edit” in settings to exercise delayed rollback. No environment secrets are needed.
"# Forma-Workspace-Manager" 
"# Forma-Workspace-Manager" 
