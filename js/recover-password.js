'use strict'

const app = {
  err: document.getElementById('error'),
  alias: document.forms.recover.alias,
  pwrd: document.forms.recover.password,
  go: document.forms.recover.go,
  getReason(n) {
    if (typeof n === 'string') return n;
    switch (n) {
      case 1: return 'Псевдоним может состоять только из цифр, русских или английских слов';
      case 2: return 'Пароль может состоять только из цифр, русских, английских букв, ' +
      'символов нижнего подчеркивания или дефиса';
      case 3: return 'Пароль должен содержать не меньше 6-ти символов';
      case 4: return 'Безопасность – это замечательно, но придумайте пароль короче';
      case 5: return 'Придумайте другой пароль';
      case 6: return 'Проверьте правильность введённых данных';
      case 7: return 'Ошибка сервера';
      case 8: return 'Запрос весит более одного мбайта, поэтому был отклонён'
      case 9: return 'Это действие запрещено'
      default: return 'Неизвестная ошибка';
    }
  },
  displayError(text) {
    this.go.style.display = 'none';
    this.err.style.display = 'block';
    this.err.textContent = `Персонаж не восстановлен. ${this.getReason(text)}.`;
    this.alias.addEventListener('input', () => this.hideError(), {once: true});
    this.pwrd.addEventListener('input', () => this.hideError(), {once: true});
  },
  hideError() {
    this.err.style.display = 'none';
    this.go.style.display = 'block';
  },
  save() {
    const alias = this.alias.value.match(/[а-яёa-z\d]+/ig),
          pwrd = this.pwrd.value.match(/[а-яёa-z\d_-]+/ig);
    if (!alias || alias.join(' ') !== this.alias.value) return this.displayError(1);
    if (!pwrd || pwrd.length > 1 || pwrd.join('') != this.pwrd.value) return this.displayError(2);
    if (pwrd[0].length < 6) return this.displayError(3);
    if (pwrd[0].length > 64) return this.displayError(4);
    post('/changeAliasAndPassword', {alias: this.alias.value, password: this.pwrd.value, token: this.query.token}).then(res => {
      switch (res.code) {
        case 0: this.displayError(res.reason); break;
        case 1:
          this.go.style.display = 'none';
          this.err.style.color = '';
          this.err.textContent = 'Персонаж восстановлен! Через несколько секунд страница будет автоматически перенаправлена.'
          this.err.style.display = 'block';
          setTimeout(() => window.location.assign('/'), 5000);
      }
    });
  },
  parseQuery() {
    this.query = {};
    const s = window.location.search,
          queryArray = s.match(/[a-z0-9-_.~]+/ig);
    for (let i = 0; i < queryArray.length; i++)
      if (i % 2 === 0) this.query[queryArray[i]] = queryArray[i + 1];
  }
}

app.parseQuery();

async function post(url, body, options = {}) {
  options.body = JSON.stringify(body);
  options.method = 'POST';
  const res = await fetch(url, options);
  return await res.json();
}
