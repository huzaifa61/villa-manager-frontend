export const roles = {
  GENERAL_MANAGER: 'GENERAL_MANAGER',
  VILLA_MANAGER: 'VILLA_MANAGER',
  VIEWER: 'VIEWER',
} as const;

export const roleLabel = (role?: string, t?: (key: string) => string) => {
  if (role === roles.GENERAL_MANAGER) return t?.('roleGeneralManager') || 'General Manager';
  if (role === roles.VILLA_MANAGER) return t?.('roleVillaManager') || 'Villa Manager';
  return t?.('roleViewer') || 'Viewer';
};

export const canDeleteMember = (
  currentUser: { id?: number; role?: string; villaId?: number | null } | null | undefined,
  member: { id?: number; role?: string; villaId?: number | null },
  villaId: number,
) => {
  const permissions = permissionsFor(currentUser);
  if (member.id && currentUser?.id === member.id) return false;
  if (permissions.isGeneralManager) return true;
  if (permissions.isVillaManager) {
    return member.role === roles.VIEWER && member.villaId === villaId;
  }
  return false;
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
    canCreateServiceRequests: isGeneralManager || isVillaManager || isViewer,
  };
};
