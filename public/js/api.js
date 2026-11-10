export async function api(path, method = 'GET', body) {
  const response = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204) return null;

  const data = await response.json();
  if (!response.ok) {
    throw Object.assign(new Error(data.error.message), { status: response.status, details: data.error.details });
  }
  return data;
}

// Doğrulama hatalarında API alan bazlı mesaj listesi döndürür.
export function errorMessage(error) {
  if (error instanceof TypeError) return "API'ye ulaşılamadı. Sunucunun çalıştığından emin olun.";
  return Array.isArray(error.details) ? error.details.join(', ') : error.message;
}
