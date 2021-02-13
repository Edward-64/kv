'use strict'

let isMobile;

const app = {
  cmder: document.getElementById('cmder'),
  res: document.getElementById('response'),
  dc: document.getElementById('dinamic-content'),
  reqs: {
    list: document.getElementById('saved-request'),
    shell: document.getElementById('shell-saved-request'),
    input: document.getElementById('input-saved-request')
  },
  /*
  md: new showdown.Converter({
		noHeaderId: true,
		simplifiedAutoLink: true,
		tables: true,
		simpleLineBreaks: true, //replace \n to <br> without needing 2 spaces at the end of the line
		literalMidWordUnderscores: true, //ignore __underscores__
		strikethrough: true, //turn on ~~syntax~~ (зачеркивание)
    disableForced4SpacesIndentedSublists: true, //вложенные списки с помощью 2-3 пробелов вместо 4
    openLinksInNewWindow: true
	}), */
  stackPosition: -1,
  init() {
    const w = document.documentElement.clientWidth,
		      h = document.documentElement.clientHeight;
    if (w/h > 1.8 || w/h < 1.5) {
      isMobile = true;
      let nodelist = document.querySelectorAll('.head-vertical-img');
      for (let i = 0; i < 2; i++) {
        nodelist[i].style.backgroundImage = 'url(/img/site?r=vertical-vine-mobile)';
        nodelist[i].style.width = '54px';
      }
      nodelist = document.querySelectorAll('.head-left-vertical-img');
      nodelist[0].style.left = '-32px';
      nodelist = document.querySelectorAll('.head-right-vertical-img');
      nodelist[0].style.right = '-22px';
    }
    try {
      this.stack = JSON.parse(localStorage.getItem('meowingHistory')) || [];
      this.savedRequests = JSON.parse(localStorage.getItem('savedRequests')) || [
        { name: 'играть', pts: 2 },
        { name: 'создать персонажа', pts: 1 },
        { name: 'активировать персонажа', pts: 0 }
      ];
      this.localStorageAccess = true;
    } catch {
      this.stack = [];
      this.savedRequests = [{name:'играть',pts:2},{name:'создать персонажа',pts:1},{name:'активировать персонажа',pts:0}];
    }
    this.savedRequests.sort((a, b) => b.pts - a.pts);
    this.savedRequests.forEach(a => this.addRequestToHTML(a.name, a.pts));
  },
  turnSavedRequests() {
    if (this.reqs.shell.style.display === 'none') this.displaySavedRequests()
    else this.hideSavedRequests();
  },
  displaySavedRequests() {
    this.reqs.shell.style.display = 'block';
    this.cmder.addEventListener('click', () => this.hideSavedRequests(), {once: true});
    this.dc.addEventListener('click', () => this.hideSavedRequests(), {once: true});
    if (this.reqs.list.clientHeight > 250) this.reqs.list.style.overflowY = 'scroll';
  },
  hideSavedRequests() {
    this.reqs.shell.style.display = 'none';
  },
  addRequest(name) {
    if (name === '') return;
    if (this.savedRequests.length > 30) {
      this.hideSavedRequests();
      this.displayResponse('Слишком много мяу. Чтобы добавить новое мяу в список, удалите что-нибудь.');
      return;
    }
    name = name.toLowerCase();
    const i = this.savedRequests.findIndex(a => a.name === name);
    if (i === -1) {
      this.savedRequests.push({ name, pts: 0 });
      this.addRequestToHTML(name);
      if (this.localStorageAccess) localStorage.setItem('savedRequests', JSON.stringify(this.savedRequests));
    } else {
      this.hideSavedRequests();
      this.displayResponse('Такое мяу уже существует в списке');
    }
    if (this.reqs.list.clientHeight > 250) {
      const el = this.reqs.list;
      el.scrollTo(el.scrollHeight, el.scrollWidth);
    }
  },
  addRequestToHTML(name) {
    app.reqs.input.value = '';
    const shell = document.createElement('div'),
          request = document.createElement('div'),
          button = document.createElement('button');
    shell.classList.add('centered-flex');
    request.style.width = '80%';
    request.style.marginRight = '10px';
    request.textContent = name;
    button.textContent = 'X';
    button.addEventListener('click', () => {
      const i = this.savedRequests.findIndex(a => a.name === name);
      if (i !== -1) {
        this.savedRequests.splice(i, 1);
        if (this.localStorageAccess) localStorage.setItem('savedRequests', JSON.stringify(this.savedRequests));
      }
      shell.remove();
    }, {once: true});
    shell.addEventListener('mouseover', () => {
      request.classList.add('focus-element');
    });
    shell.addEventListener('mouseout', () => {
      request.classList.remove('focus-element');
    });
    request.addEventListener('click', () => {
      this.hideSavedRequests();
      this.parseMeow(name);
    });
    shell.appendChild(request);
    shell.appendChild(button);
    this.reqs.list.appendChild(shell);
  },
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
      case 10: return 'Вы не можете это сделать'
      case 11: return 'Попробуйте что-нибудь другое'
      case 12: return 'Да, такая команда есть. Но она как-то неправильно сформулирована... Возможно, Вы где-то ошиблись'
      case 13: return 'Персонаж с такой почтой не найден'
      case 14: return 'Некорректный адрес электронной почты'
      case 15: return 'Не удалось отправить сообщение. Попробуйте завтра.'
      default: return 'Неизвестная ошибка';
    }
  },
  clearInput() {
    app.cmder.value = '';
  },
  activeInput() {
    const input = document.getElementById('input');
    setInterval(() => {
      input.textContent = '>';
      setTimeout(() => {
        input.textContent = '';
      }, 500);
    }, 1000);
  },
  saveMeowingHistory() {
    if (this.localStorageAccess) localStorage.setItem('meowingHistory', JSON.stringify(app.stack.slice(0,10)));
  },
  parseMeowOnSubmit() {
    const r = app.cmder.value;
    app.stack.unshift(r);
    app.saveMeowingHistory();
    app.parseMeow(r);
  },
  parseMeow(v) {
    app.stackPosition = -1;
    const low = v.toLowerCase();
    if (low == 'да' && app.waitingYes) {
      app.waitingYes();
      delete app.waitingYes;
      delete app.waitingNo;
      return;
    } else if (low == 'нет' && app.waitingNo) {
      app.waitingNo();
      delete app.waitingYes;
      delete app.waitingNo;
      return;
    }
    delete app.waitingYes;
    delete app.waitingNo;
    if (low == 'сп' || /(созда|рег[еи]{1}стр).*персонаж|рег[ие]{1}стр/i.test(v)) {
      get('/createCharacter').then(res => {
        switch (res.code) {
          case 0: app.displayResponse(app.getReason(res.reason)); break;
          case 1:
            app.dc.innerHTML = res.html;
            app.runJS(res.js);
            break;
          case 2:
            app.displayResponse(`У вас уже есть персонаж ${res.name}. Активировать его?`);
            app.waitingYes = () => {
              get('/activeCharacter').then(res => {
                switch (res.code) {
                  case 0: app.displayResponse(app.getReason(res.reason)); break;
                  case 3: app.displayResponse(`Персонаж ${res.name} активирован`);
                }
              });
            }
            app.waitingNo = () => {
              app.displayResponse('Хорошо, не активируем. Но нового Вы создать тоже не можете.');
              app.clearInput();
            }
            break;
          case 3: app.displayResponse('Вы уже создали персонажа'); break;
        }
      });
    } else if (low == 'дп' || /деактив.*персонаж|выйти|выход/i.test(v)) {
      get('/deactiveCharacter').then(res => {
        if (res.code) app.displayResponse('Персонаж деактивирован');
      });
    } else if (low == 'ап' || /активир.*персонаж|войти|вход/i.test(v)) {
      get('/activeCharacter').then(res => {
        switch (res.code) {
          case 0: app.displayResponse('Персонаж не активирован. ' + app.getReason(res.reason)); break;
          case 1:
            app.dc.innerHTML = res.html;
            app.runJS(res.js);
            break;
          case 2: app.displayResponse(`Ваш персонаж ${res.name} уже активирован`); break;
          case 3: app.displayResponse(`Персонаж ${res.name} активирован`);
        }
      });
    } else if (low == 'и' || low == 'b' || /играть|открытый мир|игров/i.test(v)) {
      get('/play?from=cmd').then(res => {
        switch (res.code) {
          case 0: app.displayResponse(app.getReason(res.reason)); break;
          case 1: window.location.assign('/play'); break;
          case 2: app.displayResponse('Перед началом игры нужно создать персонажа и активировать его. ' +
                                      'Чтобы это сделать, мяукните «создать персонажа» или «активировать ' +
                                      'персонажа», если он уже создан. Увидимся!'); break;
          case 3:
            app.dc.innerHTML = res.html;
            app.runJS(res.js);
        }
      });
    } else {
      get(`/parseAnotherMeow?meow=${encodeURI(v)}`).then(res => {
        switch (res.code) {
          case 0: app.displayResponse(app.getReason(res.reason)); break;
          case 1: app.displayResponse(res.msg); break;
          case 2:
            app.dc.innerHTML = res.html;
            app.runJS(res.js);
            break;
          case 3: window.location.assign(res.url);
        }
      });
    }
    app.cmder.addEventListener('input', () => {app.res.style.display = 'none'}, {once: true});
  },
  /*
  createCharacter(name, mail, password) {
    post('/createCharacter', {name, mail, password}).then(res => {
      switch (res.code) {
        case 0: console.log(`Персонаж не создан. ${app.getReason(res.reason)}`); break;
        case 1: console.log('Персонаж создан!'); break;
      }
    })
  }, */
  displayResponse(text) {
    app.res.textContent = text;
    app.res.style.display = 'block';
  },
  runJS(path) {
    const script = document.createElement('script');
	  script.src = `/js/${path}.js`;
		document.body.appendChild(script);
  }
}

async function get(url, options = {}) {
  const res = await fetch(url, options);
  if (options.clearInput !== false) app.clearInput();
  return await res.json();
}

async function post(url, body, options = {}) {
  options.body = JSON.stringify(body);
  options.method = 'POST';
  const res = await fetch(url, options);
  if (options.clearInput !== false) app.clearInput();
  return await res.json();
}

app.activeInput();
app.init();
app.res.onclick = () => app.res.style.display = 'none';
app.cmder.onkeydown = e => {
  if (e.key === 'ArrowUp') {
    app.stackPosition++;
    if (app.stackPosition >= app.stack.length) return app.stackPosition = app.stack.length - 1;
    app.cmder.value = app.stack[app.stackPosition];
  }
    if (e.key === 'ArrowDown') {
      app.stackPosition--;
      if (app.stackPosition < 0) return app.stackPosition = 0;
      app.cmder.value = app.stack[app.stackPosition];
    }
  if (e.key === 'Home') {
    app.cmder.value = app.stack[0];
    app.stackPosition = 0;
  }
  if (e.key === 'End') {
    app.cmder.value = app.stack[app.stack.length - 1];
    app.stackPosition = app.stack.length - 1;
  }
}
