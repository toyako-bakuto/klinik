export function initTogglePassword() {
    const passwordInput = document.getElementById('password');
    const passwordToggle = document.getElementById('passwordToggle');

    if (!passwordInput || !passwordToggle) return;

    passwordToggle.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';

        passwordInput.type = isPassword ? 'text' : 'password';
        passwordToggle.textContent = isPassword ? 'SEMBUNYI' : 'LIHAT';

        passwordToggle.setAttribute(
            'aria-label',
            isPassword ? 'Sembunyikan password' : 'Tampilkan password'
        );
    });
}
