'use client';
import { Provider } from 'react-redux';
import { store } from '../store/store';
import WorkspaceApp from '../features/workspace/WorkspaceApp';
export default function Page() {
  return (
    <Provider store={store}>
      <WorkspaceApp />
    </Provider>
  );
}
