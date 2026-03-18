// const DEFAULT_API_ORIGIN = "https://api.vanannek.blog";
const DEFAULT_API_ORIGIN = "http://localhost:8000";

export function getApiOrigin() {
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
