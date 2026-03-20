function normalizeStorageKey(key) {
  return String(key || "").trim();
}

export function readJsonStorageValue(storage, key, fallbackValue = null) {
  if (!storage || typeof storage.getItem !== "function") {
    return fallbackValue;
  }

  const normalizedKey = normalizeStorageKey(key);
  if (!normalizedKey) {
    return fallbackValue;
  }

  try {
    const rawValue = storage.getItem(normalizedKey);
    if (!rawValue) {
      return fallbackValue;
    }

    return JSON.parse(rawValue);
  } catch {
    return fallbackValue;
  }
}

export function writeJsonStorageValue(storage, key, value) {
  if (!storage || typeof storage.setItem !== "function") {
    return;
  }

  const normalizedKey = normalizeStorageKey(key);
  if (!normalizedKey) {
    return;
  }

  storage.setItem(normalizedKey, JSON.stringify(value));
}

export function normalizeCartStorageItems(
  items,
  { allowProductIdFallback = false } = {},
) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      const rawId = allowProductIdFallback
        ? item?.id || item?.product_id || ""
        : item?.id || "";

      return {
        id: String(rawId).trim(),
        quantity: Math.max(1, Number(item?.quantity) || 1),
        color: item?.color ?? null,
        size: item?.size ?? null,
      };
    })
    .filter((item) => item.id);
}

export function getStoredCartItems(storageKey, options = {}) {
  const parsedValue = readJsonStorageValue(localStorage, storageKey, []);
  return normalizeCartStorageItems(parsedValue, options);
}

export function persistStoredCartItems(storageKey, items) {
  const serializableItems = normalizeCartStorageItems(items);
  writeJsonStorageValue(localStorage, storageKey, serializableItems);
}