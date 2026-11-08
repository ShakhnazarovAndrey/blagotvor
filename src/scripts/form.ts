/**
 * Отправка формы.
 * Сейчас — заглушка (форма только свёрстана). Чтобы подключить реальную отправку,
 * замените тело submitForm(): например, fetch на свой обработчик, Telegram-бота или сервис форм.
 */
export async function submitForm(data: Record<string, string>): Promise<void> {
  console.info('[форма] данные для отправки:', data);
  await new Promise((r) => setTimeout(r, 700));
}

function phoneMask(input: HTMLInputElement) {
  input.addEventListener('input', () => {
    let d = input.value.replace(/\D/g, '');
    if (!d) {
      input.value = '';
      return;
    }
    if (d[0] === '8') d = '7' + d.slice(1);
    if (d[0] !== '7') d = '7' + d;
    d = d.slice(0, 11);
    let out = '+7';
    if (d.length > 1) out += ' (' + d.slice(1, 4);
    if (d.length >= 4) out += ') ' + d.slice(4, 7);
    if (d.length >= 7) out += '-' + d.slice(7, 9);
    if (d.length >= 9) out += '-' + d.slice(9, 11);
    input.value = out;
  });
}

export function initForms(signal: AbortSignal) {
  document.querySelectorAll<HTMLFormElement>('[data-form]').forEach((form) => {
    form.querySelectorAll<HTMLInputElement>('[data-phone]').forEach(phoneMask);

    const validate = () => {
      let ok = true;
      const set = (el: Element | null, bad: boolean) => {
        el?.classList.toggle('is-invalid', bad);
        if (bad) ok = false;
      };
      const name = form.elements.namedItem('name') as HTMLInputElement;
      const phone = form.elements.namedItem('phone') as HTMLInputElement;
      const email = form.elements.namedItem('email') as HTMLInputElement | null;
      const consent = form.elements.namedItem('consent') as HTMLInputElement;
      set(name.closest('.field'), name.value.trim().length < 2);
      set(phone.closest('.field'), phone.value.replace(/\D/g, '').length !== 11);
      if (email) set(email.closest('.field'), !!email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value));
      set(consent.closest('.check'), !consent.checked);
      return ok;
    };

    form.addEventListener(
      'input',
      (e) => {
        const f = (e.target as HTMLElement).closest('.is-invalid');
        if (f) f.classList.remove('is-invalid');
      },
      { signal },
    );

    form.addEventListener(
      'submit',
      async (e) => {
        e.preventDefault();
        if (!validate()) {
          form.querySelector<HTMLElement>('.is-invalid input, .is-invalid textarea')?.focus();
          return;
        }
        const btn = form.querySelector<HTMLButtonElement>('[type=submit]');
        if (btn) btn.disabled = true;
        const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
        try {
          await submitForm(data);
          form.classList.add('is-done');
          form.reset();
          setTimeout(() => form.classList.remove('is-done'), 6000);
        } finally {
          if (btn) btn.disabled = false;
        }
      },
      { signal },
    );
  });
}
