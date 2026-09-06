import { configureStore, createSlice } from '@reduxjs/toolkit';
import { seed } from '../lib/data';
const slice = createSlice({
  name: 'workspace',
  initialState: { data: seed(), past: [], future: [] },
  reducers: {
    hydrate(state, action) {
      state.data = action.payload;
      state.past = [];
      state.future = [];
    },
    replace(state, action) {
      if (action.payload.history) {
        state.past.push(state.data);
        if (state.past.length > 30) state.past.shift();
        state.future = [];
      }
      state.data = action.payload.data;
    },
    undo(state) {
      if (state.past.length) {
        state.future.push(state.data);
        state.data = state.past.pop();
      }
    },
    redo(state) {
      if (state.future.length) {
        state.past.push(state.data);
        state.data = state.future.pop();
      }
    },
  },
});
export const { hydrate, replace, undo, redo } = slice.actions;
export const store = configureStore({ reducer: slice.reducer });
