import { redirectIfLoggedIn } from './redirect-loggedin.js';
import { initLoginForm } from './submit.js';
import { initTogglePassword } from './toggle-password.js';

redirectIfLoggedIn();
initLoginForm();
initTogglePassword();