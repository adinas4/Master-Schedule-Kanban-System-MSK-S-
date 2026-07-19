export const MODEL_DELIMITERS = /\s*(?:[,;|]|&)\s*/;

export const parseModelCodes = (value) => {
  if (!value) return [];
  return String(value)
    .split(MODEL_DELIMITERS)
    .map((segment) => segment.trim())
    .filter(Boolean);
};

export const joinModelCodes = (codes) => {
  if (!Array.isArray(codes)) return '';
  return codes.map((code) => code?.trim()).filter(Boolean).join(', ');
};

export const buildModelMap = (models) => {
  const map = new Map();
  (models || []).forEach((model) => {
    if (model && model.code) {
      map.set(model.code, model);
    }
  });
  return map;
};

export const normalizeModelCode = (modelMap, value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const direct = modelMap?.get?.(raw);
  if (direct?.code) return String(direct.code).trim();

  const rawLower = raw.toLowerCase();
  const models = Array.from(modelMap?.values?.() || []);
  const matched = models.find((model) => {
    const code = String(model?.code || '').trim();
    const name = String(model?.name || '').trim();
    if (!code) return false;
    const codeLower = code.toLowerCase();
    const nameLower = name.toLowerCase();
    return rawLower === codeLower
      || (nameLower && rawLower === nameLower)
      || (nameLower && rawLower === `${codeLower} - ${nameLower}`)
      || (nameLower && rawLower === `${codeLower}-${nameLower}`)
      || (nameLower && rawLower === `${codeLower} ${nameLower}`)
      || (nameLower && rawLower === `${nameLower} ${codeLower}`)
      || rawLower.startsWith(`${codeLower} -`)
      || rawLower.startsWith(`${codeLower}-`)
      || rawLower.startsWith(`${codeLower} `)
      || (nameLower && rawLower.endsWith(` ${codeLower}`));
  });
  if (matched?.code) return String(matched.code).trim();

  return raw.split(' - ')[0].trim();
};

export const formatModelCodes = (modelMap, codes) => {
  if (!codes || codes.length === 0) return '';
  const seen = new Set();
  return codes
    .map((code) => String(code || '').trim())
    .filter(Boolean)
    .map((code) => {
      const normalized = normalizeModelCode(modelMap, code);
      const key = normalized.toLowerCase();
      if (!normalized || seen.has(key)) return '';
      seen.add(key);
      return normalized;
    })
    .filter(Boolean)
    .join(', ');
};
