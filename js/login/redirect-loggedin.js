export async function redirectIfLoggedIn() {
    try {
        const res = await fetch('api/login/cek-login.php', {
            credentials: 'same-origin'
        });

        if (!res.ok) {
            throw new Error('Gagal memeriksa session');
        }

        const data = await res.json();

        if (data.logged_in && data.redirect) {
            window.location.replace(data.redirect);
        }

    } catch (err) {
        console.warn('Gagal cek login:', err);
    }
}
