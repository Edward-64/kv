(function() {
'use strict'

if (app.activation) return app.activation.aliveHTML();;

class ActivationCharacter {
  activeCharacter() {
    const alias = this.alias.value.match(/[а-яёa-z\d]+/ig),
          pwrd = this.pwrd.value.match(/[а-яёa-z\d_-]+/ig);
    if (!alias || alias.join(' ') !== this.alias.value) return this.displayError();
    if (!pwrd || pwrd.length > 1 || pwrd.join('') != this.pwrd.value) return this.displayError();
    if (pwrd[0].length < 6) return this.displayError();
    if (pwrd[0].length > 64) return this.displayError();
    post('/activeCharacter', {alias: this.alias.value, password: this.pwrd.value}).then(res => {
      switch (res.code) {
        case 0: this.displayError(app.getReason(res.reason)); break;
        case 1: app.dc.innerHTML = 'Персонаж активирован. Теперь доступно больше функций на сайте и, главное, можно начать играть! Мяукните «играть».'; break;
      }
    });
  }
  displayError(text = 'Проверьте правильность введённых данных') {
    this.go.style.display = 'none';
    this.err.style.display = 'block';
    this.errMsg.textContent = `Персонаж не активирован. ${text}.`;
    this.alias.addEventListener('input', () => this.hideError(), {once: true});
    this.pwrd.addEventListener('input', () => this.hideError(), {once: true});
  }
  hideError() {
    this.err.style.display = 'none';
    this.go.style.display = 'block';
  }
  recoverPassword() {
    const mail = this.rInput.value;
    if (!mail) {
      this.rPwrdResult.style.color = '#800808';
      this.rPwrdResult.textContent = 'Вы не ввели адрес электронной почты';
      return;
    }
    if (!mail.includes('@')) {
      this.rPwrdResult.style.color = '#800808';
      this.rPwrdResult.textContent = 'Некорректный адрес электронной почты';
      return;
    }
    this.preloader.style.display = 'block';
    get(`/password?mail=${mail}`).then(res => {
      this.preloader.style.display = 'none';
      switch (res.code) {
        case 0:
          this.rPwrdResult.style.color = '#800808';
          this.rPwrdResult.textContent = app.getReason(res.reason);
          break;
        case 1:
          this.rPwrdResult.style.color = '';
          this.rPwrdResult.textContent = 'Сообщение на почту отправлено! Откройте его и следуйте указанной в нем инструкции. Если сообщение не пришло, попробуйте проверить папку «спам».';
          document.getElementById('activation-recover-pwrd-button').remove();
          this.rInput.remove();
      }
    })
  }
  aliveHTML() {
    this.err = document.getElementById('activation-error');
    this.errMsg = document.getElementById('activation-error-msg');
    this.rInput = document.getElementById('activation-recover-pwrd-input');
    this.rPwrdResult = document.getElementById('activation-recover-pwrd-result');
    this.go = document.getElementById('activation-go');
    this.preloader = document.getElementById('activation-preloader');
    this.f = document.forms.activation;
    this.alias = this.f.alias;
    this.pwrd = this.f.password;
  }
}

app.activation = new ActivationCharacter();
app.activation.aliveHTML();

})();
