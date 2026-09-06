import test from 'node:test';
import assert from 'node:assert/strict';
import { seed, validateImport, canEdit, canManage } from '../src/lib/data.js';
test('seed data survives export and import with valid relationships', () => {
  assert.equal(validateImport(JSON.parse(JSON.stringify(seed()))).version, 1);
});
test('viewer cannot edit or manage; member can edit only', () => {
  const d = seed();
  d.session = 'u4';
  assert.equal(canEdit(d), false);
  assert.equal(canManage(d), false);
  d.session = 'u3';
  assert.equal(canEdit(d), true);
  assert.equal(canManage(d), false);
  d.session = 'u1';
  assert.equal(canManage(d), true);
});
test('import rejects orphan tasks and duplicate IDs', () => {
  const d = seed();
  d.tasks[0].projectId = 'missing';
  assert.throws(() => validateImport(d));
  const e = seed();
  e.tasks.push(e.tasks[0]);
  assert.throws(() => validateImport(e));
});
test('import rejects invalid roles and absent task collections', () => {
  const d = seed();
  d.workspaces[0].members[0].role = 'superuser';
  assert.throws(() => validateImport(d));
  const e = seed();
  delete e.tasks[0].comments;
  assert.throws(() => validateImport(e));
});
test('import rejects malformed or duplicate subtasks', () => {
  const duplicate = seed();
  duplicate.tasks[0].subtasks = [
    { id: 's1', title: 'First', done: false },
    { id: 's1', title: 'Second', done: false },
  ];
  assert.throws(() => validateImport(duplicate));

  const empty = seed();
  empty.tasks[0].subtasks = [{ id: 's1', title: '  ', done: false }];
  assert.throws(() => validateImport(empty));

  const invalidType = seed();
  invalidType.tasks[0].subtasks = [{ id: 's1', title: null, done: false }];
  assert.throws(() => validateImport(invalidType));
});
