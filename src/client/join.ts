export {}; // a module, so its names don't clash with the other pages' scripts

// An invite link, /join#<token>: make your own account, then walk in. The token rides in the
// fragment, so it never reaches a server log or a Referer header.
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const token = location.hash.slice(1);
const form = $<HTMLFormElement>('form');
const name = $<HTMLInputElement>('name');
const password = $<HTMLInputElement>('password');
const again = $<HTMLInputElement>('again');
const submit = $<HTMLButtonElement>('submit');
const error = $('error');

function fail(msg: string) {
  $('sub').textContent = '';
  form.hidden = true;
  error.textContent = msg;
  $('login').hidden = false;
}

async function post(body: Record<string, unknown>): Promise<{ ok: boolean; body: any }> {
  const res = await fetch('/api/join', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, ...body }) });
  return { ok: res.ok, body: await res.json().catch(() => ({})) };
}

async function peek() {
  if (!token) return fail('Bu bağlantıda davet kodu eksik. Gönderenden bağlantının tamamını iste.');
  try {
    const r = await post({ peek: true });
    if (!r.ok) return fail(r.body.error ?? 'Bu davet bağlantısı çalışmıyor.');
    const { name: invited, role, by, project } = r.body as { name?: string; role: string; by: string; project: string };
    $('title').textContent = `${project} ofisine katıl`;
    const sub = $('sub');
    sub.replaceChildren(`${by} seni ${role === 'admin' ? '' : 'davet etti.'}`);
    if (role === 'admin') {
      const pill = document.createElement('span');
      pill.className = 'role';
      pill.textContent = 'yönetici';
      sub.append(pill, ' olarak davet etti.');
    }
    sub.append(' İçeri girmek için kendi hesabını oluştur.');
    if (invited) {
      name.value = invited;
      name.readOnly = true;
      name.title = 'Davet edildiğin ad';
    }
    form.hidden = false;
    (invited ? password : name).focus();
  } catch {
    fail('Sunucuya ulaşılamıyor.');
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  error.textContent = '';
  if (password.value !== again.value) {
    error.textContent = 'Şifreler uyuşmuyor';
    again.select();
    return;
  }
  submit.disabled = true;
  try {
    const r = await post({ name: name.value.trim(), password: password.value });
    if (!r.ok) {
      error.textContent = r.body.error ?? 'Hesabın oluşturulamadı';
      return;
    }
    try {
      localStorage.setItem('agent-office.login-name', r.body.name);
    } catch {
      // storage blocked
    }
    location.replace('/');
  } catch {
    error.textContent = 'Sunucuya ulaşılamıyor';
  } finally {
    submit.disabled = false;
  }
});

void peek();
