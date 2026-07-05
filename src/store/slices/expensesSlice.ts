import { createSlice } from '@reduxjs/toolkit';

const expensesSlice = createSlice({
  name: 'expenses',
  initialState: { items: [], totalExpenses: 0, isLoading: false, error: null },
  reducers: {},
});

export default expensesSlice.reducer;
