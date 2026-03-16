const DEFAULT_API_ORIGIN = "https://api.vanannek.blog";

export function getApiOrigin() {
  const configuredOrigin = document
    .querySelector('meta[name="shop-api-base-url"]')
    ?.getAttribute("content")
    ?.trim();

  if (configuredOrigin) {
    return configuredOrigin;
  }

  if (window.location.port === "8000") {
    return window.location.origin;
  }

  return DEFAULT_API_ORIGIN;
}

function buildApiUrl(path) {
  return new URL(
    path.replace(/^\//, ""),
    `${getApiOrigin().replace(/\/$/, "")}/`,
  );
}

export async function requestJson(path, options = {}) {
  const { headers: extraHeaders, ...restOptions } = options;

  const response = await fetch(buildApiUrl(path), {
    ...restOptions,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });

  let responseData = null;
  try {
    responseData = await response.json();
  } catch {
    responseData = null;
  }

  if (!response.ok) {
    const message =
      responseData?.message || `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return responseData;
}
