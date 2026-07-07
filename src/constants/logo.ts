// Villa Manager Pro - Logo and Branding Constants
export const APP_NAME = 'Villa Manager Pro';
export const APP_VERSION = '1.0.0';
export const COMPANY_NAME = 'Villa Manager';

export const LOGO_TEXT = `
╔═══════════════════════════════════════╗
║      VILLA MANAGER PRO v${APP_VERSION}      ║
║    Professional Property Management    ║
╚═══════════════════════════════════════╝
`;

export const LOGO_ASCII = `
  ╔═╦═╗╔═╗╔╗╔╔═╗
  ╠═╬═╝║ ║║║║║ ║
  ╩ ╩  ╚═╝╝╚╝╚═╝
  MANAGER PRO
`;

export const getExportHeader = (title: string, date: string = new Date().toLocaleDateString()) => {
  return `
═══════════════════════════════════════════
${APP_NAME}
═══════════════════════════════════════════
Report: ${title}
Generated: ${date}
═══════════════════════════════════════════
`;
};

export const getExportFooter = () => {
  return `
═══════════════════════════════════════════
© ${new Date().getFullYear()} ${COMPANY_NAME}. All Rights Reserved.
This is a confidential document.
═══════════════════════════════════════════
`;
};
