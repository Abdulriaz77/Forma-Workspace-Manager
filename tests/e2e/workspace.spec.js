import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign in', exact: false }).first().click();
  await expect(page.getByRole('heading', { name: 'Website redesign' })).toBeVisible();
});
test('create, reload, edit, undo, and switch views', async ({ page }) => {
  await page.getByRole('button', { name: 'New task', exact: true }).click();
  await page.getByLabel('Task title').fill('Browser-tested task');
  await page.getByLabel('Due date', { exact: true }).fill('2026-09-10');
  await page.getByRole('button', { name: 'Save task', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Browser-tested task', exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Browser-tested task', exact: true }).click();
  await page.getByLabel('Task title').fill('Renamed browser task');
  await page.getByRole('button', { name: 'Save task', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Renamed browser task', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Undo (Ctrl+Z)', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Browser-tested task', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'List', exact: true }).click();
  await expect(page.locator('table')).toBeVisible();
  await page.getByRole('button', { name: 'Calendar', exact: true }).click();
  await expect(page.locator('.calendar-grid')).toBeVisible();
});
test('viewer restrictions, search, and mobile layout', async ({ page }) => {
  await page.getByLabel('Switch mock user').selectOption('u4');
  await expect(page.getByRole('button', { name: 'New task', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Design the new dashboard', exact: true }).click();
  await expect(page.getByLabel('Task title')).toBeDisabled();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.keyboard.press('Control+k');
  await page.getByLabel('Search workspaces, projects and tasks').fill('dashboard');
  await expect(page.locator('.command-results')).toContainText('Design the new dashboard');
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel('Toggle navigation')).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
});
test('simulated failure restores the task', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings & members', exact: true }).click();
  await page.getByLabel('Fail the next task edit (test rollback)').check();
  await page.locator('nav').getByRole('button', { name: 'Website redesign' }).click();
  await page.getByRole('button', { name: 'Design the new dashboard', exact: true }).click();
  await page.getByLabel('Task title').fill('This must roll back');
  await page.getByRole('button', { name: 'Save task', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('rolled back');
  await expect(
    page.getByRole('button', { name: 'Design the new dashboard', exact: true }),
  ).toBeVisible();
});
