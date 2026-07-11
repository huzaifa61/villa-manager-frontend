export const roles = {
  GENERAL_MANAGER: 'GENERAL_MANAGER',
  VILLA_MANAGER: 'VILLA_MANAGER',
  VIEWER: 'VIEWER',
} as const;

export const roleLabel = (role?: string) => {
  if (role === roles.GENERAL_MANAGER) return 'General Manager';
  if (role === roles.VILLA_MANAGER) return 'Villa Manager';
  return 'Viewer';
};

export const permissionsFor = (user?: { role?: string } | null) => {
  const role = user?.role || roles.VIEWER;
  const isGeneralManager = role === roles.GENERAL_MANAGER;
  const isVillaManager = role === roles.VILLA_MANAGER;
  const isViewer = role === roles.VIEWER;
  return {
    role,
    isGeneralManager,
    isVillaManager,
    isViewer,
    canManageVilla: isGeneralManager || isVillaManager,
    canManageFinancials: isGeneralManager || isVillaManager,
    canManageVendors: isGeneralManager || isVillaManager,
    canManageUsers: isGeneralManager || isVillaManager,
    canInviteRole: (nextRole: string) => isGeneralManager || (isVillaManager && nextRole === roles.VIEWER),
    canManageServiceRequests: isGeneralManager || isVillaManager,
    canCreateServiceRequests: isGeneralManager || isVillaManager,
  };
};
