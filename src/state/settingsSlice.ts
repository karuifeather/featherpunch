import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ThemeMode = 'dark' | 'light' | 'system';

interface SettingsState {
  theme: ThemeMode;
}

const initialState: SettingsState = {
  theme: 'dark',
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<ThemeMode>) => {
      state.theme = action.payload;
    },
  },
});

export const { setTheme } = settingsSlice.actions;
export default settingsSlice.reducer;
