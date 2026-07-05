import { createSlice } from '@reduxjs/toolkit';

const paymentsSlice = createSlice({
  name: 'payments',
  initialState: { items: [], totalCollected: 0, isLoading: false, error: null },
  reducers: {},
});

export default paymentsSlice.reducer;
