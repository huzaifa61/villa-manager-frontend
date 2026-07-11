import { apiService } from '../services/api';

export const findVillaName = (villas: any[], villaId?: number | null) => {
  if (!villaId) return '';
  return villas.find((villa) => villa.id === villaId)?.name || '';
};

export const getActiveVillaName = async (villaId?: number | null) => {
  if (!villaId) return '';
  const villas = await apiService.getVillas().catch(() => []);
  return findVillaName(Array.isArray(villas) ? villas : [], villaId);
};
