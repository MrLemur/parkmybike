const API_BASE =
  (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || "")
    .replace(/\/$/, "");

function buildUrl(path, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    query.set(key, String(value));
  });
  const queryString = query.toString();
  const basePath = `${API_BASE}${path}`;
  return queryString ? `${basePath}?${queryString}` : basePath;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(
      (payload && payload.error) || response.statusText || "Request failed"
    );
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export function searchParkingByQuery(query) {
  return fetchJson(buildUrl("/api/v1.0/parking/search", { query }));
}

export function searchParkingByCoordinates(lat, lon) {
  return fetchJson(buildUrl("/api/v1.0/parking/search", { lat, lon }));
}

export function fetchParkingDetails(id) {
  const encodedId = encodeURIComponent(id);
  return fetchJson(buildUrl(`/api/v1.0/parking/details/${encodedId}`));
}
