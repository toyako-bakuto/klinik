import { $, $$ } from './utils.js';

const modal      = $('#modal');
const modalTitle = $('#modal-title');
const modalBody  = $('#modal-body');

/**
 * Buka modal generik.
 * Handler submit dipasang via `onclick` (bukan clone/addEventListener)
 * sehingga klik berulang tidak menumpuk listener atau memakai handler lama.
 *
 * @param {Object}   opts
 * @param {string}   opts.title
 * @param {string}   opts.bodyHtml
 * @param {string}   [opts.submitLabel='Simpan']
 * @param {Function} opts.onSubmit  async (btn) => void
 */
export function openModal({ title, bodyHtml, submitLabel = 'Simpan', onSubmit }) {
  const btn = $('#modal-submit');

  modalTitle.textContent = title;
  modalBody.innerHTML    = bodyHtml;
  btn.textContent        = submitLabel;
  btn.disabled           = false;
  modal.classList.add('show');

  // onclick menimpa handler lama — tidak menumpuk, tidak perlu clone
  btn.onclick = async () => {
    if (btn.disabled) return;          // cegah double-submit
    btn.disabled = true;
    try {
      await onSubmit(btn);
    } catch (err) {
      showModalAlert(err.message || 'Terjadi kesalahan.');
    } finally {
      // Bisa saja modal sudah ditutup di dalam onSubmit
      if (document.body.contains(btn)) btn.disabled = false;
    }
  };

  const first = modalBody.querySelector('input, select, textarea');
  if (first) first.focus();
}

export function closeModal() {
  modal.classList.remove('show');
  modalBody.innerHTML = '';
  const btn = $('#modal-submit');
  if (btn) btn.onclick = null;         // lepas handler agar tidak menggantung
}

export function showModalAlert(msg) {
  let box = modalBody.querySelector('.modal-alert');
  if (!box) {
    box = document.createElement('div');
    box.className = 'modal-alert';
    modalBody.prepend(box);
  }
  box.textContent = msg;
  box.classList.add('show');
}

export function collectFields() {
  const fd = {};
  $$('input, select, textarea', modalBody).forEach(el => {
    if (el.name) fd[el.name] = el.value.trim();
  });
  return fd;
}

export function markRequiredErrors() {
  let ok = true;
  $$('.form-field', modalBody).forEach(field => {
    const input = field.querySelector('input[required], select[required], textarea[required]');
    if (!input) return;
    const bad = !input.value.trim();
    field.classList.toggle('has-error', bad);
    if (bad) ok = false;
  });
  return ok;
}

export function bindModalClose() {
  $$('[data-close="modal"]').forEach(b => b.addEventListener('click', closeModal));
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
}