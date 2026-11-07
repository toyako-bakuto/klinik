export function initLoginForm() {
    const form = document.getElementById('loginForm');
    const username = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const submitBtn = document.getElementById('submitBtn');
    const alertBox = document.getElementById('formAlert');

    if (!form || !username || !passwordInput || !submitBtn || !alertBox) {
        return;
    }

    function setInvalid(input, invalid) {
        input.setAttribute('aria-invalid', invalid ? 'true' : 'false');
    }

    function hideAlert() {
        alertBox.classList.remove('show');
        alertBox.textContent = '';
    }

    function showAlert(msg) {
        alertBox.textContent = msg;
        alertBox.classList.add('show');
    }

    function validate() {
        let ok = true;

        if (!username.value.trim()) {
            setInvalid(username, true);
            ok = false;
        } else {
            setInvalid(username, false);
        }

        if (!passwordInput.value.trim()) {
            setInvalid(passwordInput, true);
            ok = false;
        } else {
            setInvalid(passwordInput, false);
        }

        return ok;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlert();

        if (!validate()) return;

        submitBtn.disabled = true;
        submitBtn.textContent = 'Memproses…';

        try {
            const response = await fetch('/portofolio/server/ulang/baru/api/login/proses-login.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    username: username.value.trim(),
                    password: passwordInput.value,
                    remember: form.querySelector('input[name="remember"]')?.checked ?? false
                })
            });

            const result = await response.json();

            if (!response.ok) {
                showAlert(result.message || 'Login gagal.');
                return;
            }
            
            if (result.success) {
                window.location.assign(result.redirect);
                return;
            }

            showAlert(result.message || 'Login gagal.');

        } catch (err) {
            showAlert('Terjadi kesalahan jaringan. Coba lagi.');
            console.error(err);

        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Masuk';
        }
    });
}