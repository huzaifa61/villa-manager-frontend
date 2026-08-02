export const EGYPT_REGIONS = [
  'Cairo', 'Giza', 'Alexandria', 'Aswan', 'Asyut', 'Beheira', 'Beni Suef',
  'Dakahlia', 'Damietta', 'Faiyum', 'Gharbia', 'Ismailia', 'Kafr El Sheikh',
  'Luxor', 'Matruh', 'Minya', 'Monufia', 'New Valley', 'North Sinai',
  'Port Said', 'Qalyubia', 'Qena', 'Red Sea', 'Sharqia', 'Sohag', 'South Sinai', 'Suez',
];

export const CAIRO_GOVERNORATE = 'Cairo';

export const formatCairoAreaRegion = (areaName: string) => `${CAIRO_GOVERNORATE} — ${areaName}`;

export const isCairoRegionValue = (value: string) =>
  value === CAIRO_GOVERNORATE || value.startsWith(`${CAIRO_GOVERNORATE} —`);

export const OTHER_EGYPT_REGIONS = EGYPT_REGIONS.filter((r) => r !== CAIRO_GOVERNORATE);
