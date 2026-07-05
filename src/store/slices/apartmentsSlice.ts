import { createSlice } from '@reduxjs/toolkit';

const apartmentsSlice = createSlice({
  name: 'apartments',
  initialState: { items: [], isLoading: false, error: null },
  reducers: {},
});

export default apartmentsSlice.reducer;
