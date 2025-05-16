import { createSlice } from '@reduxjs/toolkit';

interface GlobalState {
  isLoading: boolean;
  theme: 'light' | 'dark';
  userInfo: {
    name: string;
    email: string;
  } | null;
}

const initialState: GlobalState = {
  isLoading: false,
  theme: 'light',
  userInfo: null,
};

const globalSlice = createSlice({
  name: 'global',
  initialState,
  reducers: {
    setLoading: (state, action: { payload: boolean }) => {
      state.isLoading = action.payload;
    },
    setTheme: (state, action: { payload: 'light' | 'dark' }) => {
      state.theme = action.payload;
    },
    setUserInfo: (state, action: { payload: GlobalState['userInfo'] }) => {
      state.userInfo = action.payload;
    },
  },
});

export const { setLoading, setTheme, setUserInfo } = globalSlice.actions;

export default globalSlice.reducer;
