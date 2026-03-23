export function cloneData(data) {
  return JSON.parse(JSON.stringify(data));
}

export function getCollectionItems(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
}

export function getSingleItem(payload) {
  return payload?.data || payload || null;
}

export function buildPaginationFromMeta(meta = {}, fallbackCount = 0, params = {}) {
  const requestedPage = Number(params.page || 1);
  const requestedPerPage = Number(
    params.per_page || meta.per_page || fallbackCount || 15,
  );

  return {
    page: Number(meta.current_page || requestedPage),
    lastPage: Number(meta.last_page || (fallbackCount > 0 ? 1 : requestedPage)),
    perPage: Number(meta.per_page || requestedPerPage),
    total: Number(meta.total || fallbackCount),
  };
}

export function buildQueryPath(basePath, paramEntries = []) {
  const searchParams = new URLSearchParams();

  paramEntries.forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}