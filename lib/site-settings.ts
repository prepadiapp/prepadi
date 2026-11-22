export const SITE_SETTING_KEYS = {
  CONTACT_PHONE: 'contactPhone',
  CONTACT_EMAIL: 'contactEmail',
} as const;

// Shown until the admin saves real values in /admin/settings.
export const SITE_SETTING_DEFAULTS: Record<string, string> = {
  [SITE_SETTING_KEYS.CONTACT_PHONE]: '+234 800 000 0000',
  [SITE_SETTING_KEYS.CONTACT_EMAIL]: 'support@prepadi.com',
};
