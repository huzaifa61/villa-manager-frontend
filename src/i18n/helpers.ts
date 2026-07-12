export const enumKey = (prefix: string, value: string) =>
  `${prefix}_${String(value).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`;

export const translateEnum = (
  t: (key: string) => string,
  prefix: string,
  value: string,
  fallback?: string,
) => {
  const key = enumKey(prefix, value);
  const translated = t(key);
  return translated !== key ? translated : (fallback || value);
};

export const formatT = (template: string, vars: Record<string, string | number>) =>
  Object.entries(vars).reduce(
    (text, [name, val]) => text.replace(new RegExp(`\\{${name}\\}`, 'g'), String(val)),
    template,
  );

export const translateExpenseCategory = (
  t: (key: string) => string,
  category: string,
) => translateEnum(t, 'exp_cat', category, category);
