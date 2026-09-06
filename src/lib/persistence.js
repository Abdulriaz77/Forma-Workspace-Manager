import { validateImport } from './data';
const KEY = 'forma-workspace-v1';
export function readData() {
  const raw = localStorage.getItem(KEY);
  return raw ? validateImport(JSON.parse(raw)) : null;
}
export function saveData(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}
export function exportData(data) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = 'forma-workspace.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
