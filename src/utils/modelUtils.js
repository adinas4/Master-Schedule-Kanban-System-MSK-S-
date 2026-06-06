export const MODEL_DELIMITERS = /[,;|]+/;

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

export const formatModelCodes = (modelMap, codes) => {
  if (!codes || codes.length === 0) return '';
  return codes
    .map((code) => {
      if (!code) return '';
      const model = modelMap?.get?.(code);
      return model ? `${code} (${model.name})` : code;
    })
    .filter(Boolean)
    .join(' • ');
};
