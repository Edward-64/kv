(function() {
'use strict'

if (app.creatingCharacter) return app.creatingCharacter.aliveHTML();

class CreatingCharacter {
  eye() {
    if (this.eyeState) {
      this.pwrd.type = 'password';
      this.eyeOpen.style.display = 'none';
      this.eyeClose.style.display = 'block';
      this.eyeState ^= 1;
    } else {
      this.pwrd.type = '';
      this.eyeOpen.style.display = 'block';
      this.eyeClose.style.display = 'none';
      this.eyeState ^= 1;
    }
  }
  hideError() {
    app.creatingCharacter.f.go.style.display = 'block';
    app.creatingCharacter.error.style.display = 'none';
  }
  create() {
    post('/createCharacter', {
      alias: this.alias.value,
      password: this.pwrd.value,
      mail: this.mail.value || undefined
    }, {clearInput: false}).then(res => {
      switch (res.code) {
        case 0:
          this.f.go.style.display = 'none';
          this.error.textContent = `Персонаж не создан. ${app.getReason(res.reason)}.`;
          this.error.style.display = 'block';
          this.alias.addEventListener('input', this.hideError, {once: true});
          this.pwrd.addEventListener('input', this.hideError, {once: true});
          break;
        case 1:
          app.dc.innerHTML = res.html;
          app.runJS(res.js);
      }
    });
  }
  aliveHTML() {
    this.error = document.getElementById('create-error');
    this.eyeOpen = document.getElementById('create-character-eye-open');
    this.eyeClose = document.getElementById('create-character-eye-close');
    this.eyeState = 1;
    this.f = document.forms['create-character'];
    this.alias = this.f['create-alias'];
    this.pwrd = this.f['create-password'];
    this.mail = this.f.mail;
    this.f.go.onclick = () => this.create();
  }
}

app.creatingCharacter = new CreatingCharacter();
app.creatingCharacter.aliveHTML();

})();
