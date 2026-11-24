// Live password checks on the client registration form; the server validates again on submit.
(() => {
  const form = document.querySelector('form[action="/registro"]'); if (!form) return;
  const pw = form.elements.password, pw2 = form.elements.password2;
  const ayuda = document.getElementById('password-ayuda'), ayuda2 = document.getElementById('password2-ayuda');
  const tocado = new Set();
  function marcar(input, nota, mensaje, ok) {
    input.setCustomValidity(mensaje && !ok ? mensaje : '');
    input.classList.toggle('is-invalid', !!mensaje && !ok);
    input.classList.toggle('is-valid', !!ok);
    input.setAttribute('aria-invalid', String(!!mensaje && !ok));
    nota.textContent = mensaje || ''; nota.hidden = !mensaje;
    nota.classList.toggle('is-ok', !!ok);
  }
  function revisar() {
    const corta = pw.value.length > 0 && pw.value.length < 8;
    const larga = new TextEncoder().encode(pw.value).length > 72;
    marcar(pw, ayuda, tocado.has('password') && (corta ? 'Usa al menos 8 caracteres.' : larga ? 'La contraseña es demasiado larga.' : ''), false);
    if (!pw2.value) return marcar(pw2, ayuda2, '', false);
    if (pw2.value !== pw.value) return marcar(pw2, ayuda2, tocado.has('password2') || pw2.value.length >= pw.value.length ? 'Las contraseñas no coinciden.' : '', false);
    marcar(pw2, ayuda2, corta || larga ? '' : 'Las contraseñas coinciden.', !(corta || larga));
  }
  for (const input of [pw, pw2]) {
    input.addEventListener('input', revisar);
    input.addEventListener('blur', () => { if (input.value) tocado.add(input.name); revisar(); });
  }
  form.addEventListener('submit', e => {
    tocado.add('password'); tocado.add('password2'); revisar();
    if (pw2.value !== pw.value) { pw2.setCustomValidity('Las contraseñas no coinciden.'); }
    if (!form.checkValidity()) { e.preventDefault(); e.stopImmediatePropagation(); (form.querySelector('.is-invalid') || form.querySelector(':invalid'))?.focus(); }
  }, true);
})();
