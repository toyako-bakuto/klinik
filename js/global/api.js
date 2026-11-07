/* =========================================================
   API FETCH FACTORY
   ========================================================= */
export function makeApi(base) {
  return async function apiFetch(path, opts = {}) {
    const res = await fetch(base + path, {
      credentials: 'same-origin',
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...opts.headers,
      },
    });

    // Periksa unauthorized sebelum membaca response
    if (res.status === 401) {
      window.location.href = '../index.html';
      throw new Error('Unauthorized');
    }

    // Ambil response sebagai text
    const text = await res.text();

    // Ubah JSON text menjadi object JavaScript
    let data = null;

    try {
      data = JSON.parse(text);
    } catch {
      console.error(
        '[apiFetch] response bukan JSON:',
        text.substring(0, 500)
      );

      throw new Error('Response server bukan JSON (cek error PHP).');
    }

    // Periksa status HTTP dan respons aplikasi
    if (!res.ok || data.success === false) {
      throw new Error(data.message || `HTTP ${res.status}`);
    }

    return data;
  };
}