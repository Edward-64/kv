'use strict'

let X, Y, W, H, ID, isMobile;


class Time {
  constructor() {
    this.one = 1800;
  }
  updateTime(newTime) {
    clearInterval(this.interval);
    this.nw = newTime.slice(0, -1);
    setTimeout(() =>
      this.interval = setInterval(() => this.upOne(), this.one * 1000),
      (Math.floor(this.nw[0] / this.one) + 1) * this.one - this.nw[0]);
  }
  upOne() {
    if (this.nw[4] < 3) this.nw[4]++
    else {
      if (this.nw[3] < 29) this.nw[3]++
      else {
        if (this.nw[2] < 11) this.nw[2]++
        else {
          this.nw[1]++;
          this.nw[2] = 0;
        }
        this.nw[3] = 0;
      }
      this.nw[4] = 0;
    }
  }
  getSeason() {
    switch (this.nw[2]) {
      case 11: case 0: case 1: return 0;
      case 2: return 1;
      case 3: case 4: return 2;
      case 5: case 6: case 7: return 3;
      case 8: return 4;
      case 9: case 10: return 5;
    }
  }
  getMoonPhase() {
    const phase = this.nw[3] / 29;
    if (phase == 0) return 0;
    if (phase < 0.14) return 1;
    if (phase < 0.48) return 2;
    if (phase < 0.52) return 3;
    if (phase < 0.96) return 4;
    return 5;
  }
  getDateAsString() {
    let string = (() => {
      let s = this.nw[2];
      s = s <= 2 ? s :
          s <= 5 ? s - 3 :
          s <= 8 ? s - 6 : s - 9;
      s /= 3;
      if (s < 0.1) return 'Начало';
      if (s < 0.5) return 'Первая половина';
      if (s < 0.9) return 'Вторая половина';
      return 'Конец'
    })();
    switch (this.getSeason()) {
      case 0: string += ' сезона Голых Деревьев, '; break;
      case 1: case 2: string += ' сезона Юных Листьев, '; break;
      case 3: string += ' сезона Зелёных Деревьев, '; break;
      case 4: case 5: string += ' листопада, '; break;
    }
    switch (this.getMoonPhase()) {
      case 0: return string += 'новолуние';
      case 1: return string += 'растущая луна';
      case 2: return string += 'первая половина луны';
      case 3: return string += 'половина луны';
      case 4: return string += 'вторая половина луны';
      case 5: return string += 'полнолуние';
    }
  }
}

class Game {
  constructor() {
    this.host = location.origin.replace(/^http/, 'ws');
    this.reloads = 0;
    this.time = new Time();
    this.canvas = {
      range: document.getElementById('range').getContext('2d')
    }
    this.layers = {
			area: document.getElementById('area'),
			sky: document.getElementById('sky'),
      interface: document.getElementById('interface'),
      other: document.getElementById('other'),
			animals: document.getElementById('animals'),
      placers: document.getElementById('placers'),
      meow: document.getElementById('meowing'),
      stack: document.getElementById('stack'),
      scroll: document.getElementById('scroll')
		}
    this.moreContentTrigger = 0;
    this.kn = new Map();
		this.cats = new Map();
    this.spaces = new Set();
    this.among = new Set();
  }
  reconnection(byPlayer) {
    this.openConnection(() => {
      game.cats.get(ID).unsetBlock(2);
      document.getElementById('connection-lost').style.display = 'none';
    });
    if (byPlayer) {
      let n = 30;
      const sec = document.getElementById('timeout'),
            str = document.getElementById('string-timeout'),
            wait = document.getElementById('waitreconnection'),
            button = document.getElementById('reconnection');
      button.style.display = 'none';
      wait.style.display = 'inline';
      sec.textContent = n;
      str.textContent = '';
      const timer = setInterval(() => {
        if (n == 1 || this.ws.readyState === WebSocket.OPEN) {
          clearInterval(timer);
          button.style.display = 'block';
          wait.style.display = 'none';
          return;
        }
        sec.textContent = --n;
        if (10 < n && n < 20) return str.textContent = '';
        switch (n % 10) {
          case 1:
            str.textContent = 'у';
            break;
          case 2: case 3: case 4:
            str.textContent = 'ы';
            break;
          default:
            str.textContent = '';
        }
      }, 1000);
    } else {
      if (this.connectionTimer) return;
      game.cats.get(ID).setBlock(2);
      this.connectionTimer = setInterval(() => {
        if (this.ws.readyState === WebSocket.OPEN) {
          clearInterval(this.connectionTimer);
          delete this.connectionTimer;
          return;
        }
        this.reconnection();
      }, 20000);
    }
  }
  wakeup() {
    send(107, true);
  }
  vectorLength(a, b) {
    return [
      b[0] - a[0],
      b[1] - a[1],
      Math.floor(Math.sqrt(Math.pow(b[0] - a[0], 2) + Math.pow(b[1] - a[1], 2)))
    ];
  }
  init() {
		W = document.documentElement.clientWidth;
		H = document.documentElement.clientHeight;
    if (W/H > 1.8 || W/H < 1.5) {
      isMobile = true;
      if (W < 1366) {
        W = 1280;
        H = 720;
      } else if (W < 1600) {
        W = 1366;
        H = 768;
      } else if (W < 1920) {
        W = 1600;
        H = 900;
      } else {
        W = 1920;
        H = 1080;
      }
    }
    let context = document.getElementById('ratio').style;

    context.width = W + 'px';

    context = game.layers.sky.style;
    context.height = H * 0.8 + 'px';

    context = document.getElementById('empty-space').style;
    context.height = H * 0.5 + 'px';

    context = game.layers.area.style;
    context.height = H * 0.3 + 'px';
    context = document.getElementById('notification');
    context.classList.add(isMobile ? 'simply-notification-mobile' : 'simply-notification');
    context = document.getElementById('knowledge');
    context.classList.add(isMobile ? 'simply-notification-mobile' : 'simply-notification');

		X = W / 160;
		Y = H * 0.3 / 27;
	}
  turnSit() {
    const cat = game.cats.get(ID);
    if (cat.checkAction(2)) send(108)
    else send(108, true);
  }
  sendMeow() {
    let t = this.layers.meow.value;
    if (t.length > 120) t = t.substring(0, 120);
    if (send(101, t)) this.layers.meow.value = '';
  }
  checkMeow(e) {
    if (e.key == 'Enter') game.sendMeow();
    //if string length > 200 change class to red (danger!!!)
  }
  range(active, passive) {
    //if (!active || !passive) return;
    const e = passive.ellipse,
          a = active.place,
          b = passive.place;

    return Math.pow(a[0] - b[0], 2) / Math.pow(e[0], 2) +
           Math.pow(a[1] - b[1], 2) / Math.pow(e[1], 2) <= 1;
  }

  strictRange(active, passive) {
    //if (!active || !passive) return;
    const e = passive.ellipse,
          a = active.place,
          b = passive.place;

    return Math.pow(a[0] - b[0], 2) / Math.pow(e[0], 2) +
           Math.pow(a[1] - b[1], 2) / Math.pow(e[1], 2) <= 1 &&
           Math.pow(b[0] - a[0], 2) / Math.pow(e[1], 2) +
           Math.pow(b[1] - a[1], 2) / Math.pow(e[0], 2) <= 1;
  }
  simplyNotification(text) {
    this.parseRawString(text, result => {
      document.getElementById('notification-content').textContent = result;
      document.getElementById('notification').style.display = 'block';
    });
  }
  checkAmong(any) {
    if (any.hiden || any.deleted) return;
    if (any.id === ID) {
      this.cats.forEach(v => {
        if (v.id === ID) return;
        this.checkAmong(v);
      });
    } else {
      if (game.range(any, game.cats.get(ID))) this.addAmong(any, true)
      else this.deleteAmong(any);
    }
  }
  addAmong(any, alredyCheck) {
    game.getPlacer(ID, 5000).then(player => {
      if (this.among.has(any) || any.checkBlock(3) || any.id === ID) return;
      if (alredyCheck || game.range(any, player)) {
        any.setBlock(3);
        this.getKnowledge(any.id, kn => {
          let localTrigger = 1;
          document.getElementById('empty-among').style.display = 'none';

          const b = document.createElement('button'),
          name = this.knowledgeName(kn),
          content = document.createElement('div');

          let e = document.createElement('p');
          if (kn) {
            if (!kn.name) e.textContent += 'Имя неизвестно. ';
            if (kn.clan) e.textContent += `${any.sex ? 'Его' : 'Её'} принадлежность — ${kn.clan}.`
            else if (any.sex) e.textContent += `${name} не рассказал, откуда он. `
            else e.textContent += `${name} не рассказала, откуда она. `;
            if (kn.relation) e.textContent += `Он${any.sex ? '' : 'a'} ${kn.relation}.`;
          } else {
            e.textContent = 'Я не знаю этого котика... или не помню.'
            content.appendChild(e);
            e = document.createElement('button');
            e.textContent = 'Спросить о чем-нибудь';
            e.onclick = () => send(109, any.id);
          }
          content.appendChild(e);

          b.textContent = name;
          b.onmousemove = () => {
            if (any.keepRenderingOfRange) return;
            any.drawRange();
            any.keepRenderingOfRange = true;
          }
          b.onmouseout = () => {
            delete any.keepRenderingOfRange;
            game.canvas.range.clearRect(0, 0, W, H);
          }
          b.onclick = () => {
            if (localTrigger || this.moreContentTrigger !== any.id) {
              this.moreContentTrigger = any.id;
              game.displayMore({
                head: name,
                edit: () => console.log('working'),
                content
              })
            } else {
              game.displayMore({hide: true});
            }
            localTrigger ^= 1;
          }
          any.amongHTML = among.appendChild(b);

          any.lift = document.createElement('button');
          if (any.eatenBy && any.eatenBy.id === ID) {
            any.lift.textContent = 'Опустить';
            b.textContent += ' ↑';
          } else any.lift.textContent = 'Поднять';
          any.lift.onclick = () => {
            if (any.eatenBy && any.eatenBy.id === ID) {
              send(112);
              b.textContent = name;
            } else {
              if (player.eatenBy) return game.simplyNotification('Не могу никого поднять, меня самого подняли!');
              send(111, any.id);
            }
          }
          content.appendChild(any.lift);

          this.among.add(any);
          any.unsetBlock(3);
        });
      }
    });
  }
  deleteAmong(any) {
    if (any.amongHTML) {
      any.amongHTML.onmouseout();
      any.amongHTML.remove();
      delete any.keepRenderingOfRange;
    }
    this.among.delete(any);

    if (this.among.size === 0) document.getElementById('empty-among').style.display = 'block';
  }
  getKnowledge(id, f = a => a) {
    if (this.kn.has(id)) f(this.kn.get(id))
    else {
      let counter = 0;
      send(103, id);
      const interval = setInterval(() => {
        if (counter > 100) this.kn.set(id, null);
        if (this.kn.has(id)) {
          clearInterval(interval);
          f(this.kn.get(id));
        }
        counter += 1;
      }, 100);
    }
  }
  displayMore(options = {}) {
    const more = document.getElementById('more'),
          head = document.getElementById('more-head'),
          edit = document.getElementById('more-edit'),
          content = document.getElementById('more-content');

    if (options.hide) {
      more.style.display = 'none';
    } else {
      more.style.display = 'block';
      head.textContent = options.head || 'Подробнее';
      if (options.edit) {
        edit.style.display = 'inline';
        edit.onclick = options.edit;
      } else edit.style.display = 'none';
      if (content.children.length) content.children[0].remove();
      content.appendChild(options.content);
    }
  }
  knowledgeName(kn) {
    if (kn)
      if (kn.name) return kn.name
      else return 'Котик'
    else return 'Неизвестный котик';
  }
  parseRawString(string, f = a => a) {
    const replaced = string.match(/cat=[\dia]+/g);
    if (!replaced) return f(string);
    const ids = replaced.map(cat => cat.match(/[\dia]+/)[0]),
          finish = Math.pow(2, replaced.length) - 1;
    let process = 0;
    replaced.forEach((cat, i) => {
      const id = ids[i];
      this.getKnowledge(+id ? +id : id, kn => {
        string = string.replace(new RegExp(cat), this.knowledgeName(kn));
        process |= Math.pow(2, i);
      });
    });
    const interval = setInterval(() => {
      if (process === finish) {
        clearInterval(interval);
        f(string);
      }
    }, 110);
  }
  addStack(id, type) {
    const container = document.createElement('div'),
          text = document.createElement('div'),
          buttons = document.createElement('div');
    //container.dataset.id = id;
    container.classList.add('rectangle');
    container.classList.add('main-text-color');
    switch (type) {
      case 0: {
        text.textContent = 'Котик о чем-то спрашивает меня';
        let b = document.createElement('button');
        b.textContent = 'Ответить';
        b.onclick = () => {
          document.getElementById('knowledge').style.display = 'block';
          this.dataKnowledge = {
            html: container,
            data: {
              id,
              responses: {}
            }
          }
        };
        buttons.appendChild(b);
        b = document.createElement('button');
        b.textContent = 'Не отвечать';
        b.onclick = () => {
          send(110, {id});
          container.remove();
        };
        buttons.appendChild(b);
        container.appendChild(text);
        container.appendChild(buttons);
        game.layers.stack.appendChild(container);

        if (game.layers.stack.children.length > 3) text.textContent = 'Кто-то о чем-то спрашивает меня'
        else this.getKnowledge(id, kn => {
          text.textContent = `${this.knowledgeName(kn)} о чем-то спрашивает меня`;
        });
        break;
      }
    }
  }
  clearHide() {
    if (this.cats.size > 100) {
      this.cats.forEach(any => {
        //10 min
        if (any.hiden && Date.now() - any.hiden > 600000) any.delete();
      });
    } else if (this.cats.size > 300) {
      this.cats.forEach(any => {
        if (any.hiden) any.delete();
      });
    }
  }
  sendKnowledge(res) {
    this.dataKnowledge.html.remove();
    document.getElementById('knowledge').style.display = 'none';
    if (res) {
      const form = document.forms.knowledge,
            responses = this.dataKnowledge.data.responses;
      responses.name = form.name.value;
      responses.clan = form.clan.value;
      send(110, this.dataKnowledge.data);
    } else {
      send(110, {id: this.dataKnowledge.data.id});
    }
  }
  //waiting is wait for timeout in ms
  getPlacer(id, waiting) {
    if (waiting) return new Promise(resolve => {
      if (typeof id === 'object') return resolve();
      if (this.cats.has(id)) return resolve(this.cats.get(id));
      let process = 0;
      const i = setInterval(() => {
        if (this.cats.has(id)) {
          clearInterval(i);
          resolve(this.cats.get(id));
        }
        process += 50;
        if (process > waiting) {
          clearInterval(i);
          resolve();
        }
      }, 50);
    })
    else return this.cats.get(id);
  }
  openConnection(f = a => a) {
    this.reloads += 1;
    if (this.reloads > 10) window.location.reload();
    if (this.ws && this.ws.readyState == WebSocket.OPEN) return f();
    this.ws = new WebSocket(this.host, 'play');
    this.ws.onopen = () => {
        get('/getCookie').then(res => {
          if (res.code == 1) send(100, res.headers)
          else console.log('Ошибка авторизации');
        });
    }
    this.ws.onmessage = e => {
      const {code, msg} = JSON.parse(e.data);
      console.log({code,msg});
      switch (code) {
        case 100: {
          ID = msg.id;
          game.time.updateTime(msg.time);
          if (game.location) {
            game.location.clear(msg.loc);
            this.ws.onmessage({
            	data: JSON.stringify({
              		code: 111,
              		msg: {
                			id: ID,
                			speed: game.cats.get(ID).speed
                		}
                	})
                });
          } else {
            game.location = new Location(msg.loc);
            const im = document.forms.knowledge;
            im.name.value = msg.name;
            im.clan.value = msg.clan;
            msg.stack.reverse();
            msg.stack.forEach(a => game.addStack(a.id, a.type));
          }
          f();
          break;
        }
        case 101:
          game.cats.get(msg.id).addMsg(msg.text);
          break;
        case 104: {
          const cat = game.cats.get(msg.id);
          if (cat) {
            cat.speed = msg.speed;
            cat.endDir = msg.dir;
            cat.unsetBlock(1);
            cat.walk(msg.place);
          }
          break;
        }
        case 114: {
          const cat = game.cats.get(msg.id);
          cat.dir = msg.dir;
          cat.html.style.backgroundPositionY = -(cat.dir ? 0 : cat.h) + 'px';
          cat.checkEating();
          break;
        }
        case 105:
          game.location.clear(msg);
          break;
        case 106:
          if (Array.isArray(msg)) {
            msg.forEach(id => {
              game.cats.get(id).hide();
            });
          } else {
            game.cats.get(msg).hide();
          }
          break;
        case 107:
          if (Array.isArray(msg)) {
            msg.forEach(cat => {
              if (game.cats.has(cat.id)) game.getPlacer(cat.id).update(cat)
              else new Cat(cat);
            });
          } else {
            if (game.cats.has(msg.id)) game.getPlacer(msg.id).update(msg)
            else new Cat(msg);
          }
          break;
        case 118: {
          const active = game.cats.get(msg.active),
                passive = game.cats.get(msg.passive);
          active.eat(passive);
          break;
        }
        case 119: {
          const any = game.cats.get(msg.id);
          any.place = msg.place;
          if (any.eatenBy) any.beFree()
          else any.updateChunk();
          break;
        }
        case 115:
          game.kn.set(msg.id, msg.kn);
          break;
        case 116:
          game.addStack(msg, 0);
          break;
        case 117: {
          game.kn.set(msg.id, msg.responses);
          const cat = game.cats.get(msg.id);
          game.deleteAmong(cat);
          game.addAmong(cat);
          game.simplyNotification('"' + (msg.responses.name ? `Меня зовут ${msg.responses.name}. ` :
          'Я желаю утаить своё имя. ') + (msg.responses.clan ? `Моя принадлежность — ${msg.responses.clan}` :
          'О своей принадлежности я говорить не хочу') + '", ответил' + (cat.sex ? ' ' : 'а ') +
          game.knowledgeName(game.kn.get(msg.id)));
          break;
        }
        case 102:
          if (typeof msg == 'string') game.simplyNotification(msg)
          else console.log(msg);
          break;
        case 108:
          game.time.updateTime(msg);
          break;
        case 111: {
          const cat = game.cats.get(msg.id);
          if (!cat) return;
          if (msg.id == ID) {
            if (msg.speed) {
              document.getElementById('sleep').style.display = 'none';
              cat.speed = msg.speed;
            } else {
              cat.html.style.zIndex = 40000;
              document.getElementById('sleep').style.display = 'block';
            }
          }
          const f = () => {
            if (msg.speed) {
              cat.unsetAction(1);
              cat.unsetBlock(1);
              cat.updateChunk();
              cat.changeSkinPosition(0);
            } else {
              if (cat.eating) cat.eating.beFree();
              cat.setAction(1);
              cat.changeSkinPosition(2);
              cat.setBlock(1);
            }
          }
          if (cat.checkAction(4)) cat.doItWhenYouAreFree = f
          else f();
          break;
        }
        case 112:
          const cat = game.cats.get(msg.id || msg); //all is ok
          if (msg.speed) {
            cat.speed = msg.speed;
            cat.standup();
          } else cat.sitdown();
      }
    }
    this.ws.onclose = e => {
      setTimeout(() => {
        if (game.cats.get(ID).checkBlock(2)) return;
        document.getElementById('connection-lost').style.display = 'block';
        if (e.code !== 4000) this.reconnection();
      }, 2000);
    }
  }
}

var game = new Game();

class Placer {
  constructor(raw = {}) {
  }
  drawRange() {
    const x = this.ellipse[0] * X,
          y = this.ellipse[1] * Y,
          b = game.canvas.range,
          a = b.canvas;

    let scaleX, scaleY, invScaleX, invScaleY, grad;


    if (x >= y) {
      scaleX = 1;
      invScaleX = 1;
      scaleY = y/x;
      invScaleY = x/y;
      grad = b.createRadialGradient(x, y*invScaleY, 0, x, y*invScaleY, x);
    }
    else {
      scaleY = 1;
      invScaleY = 1;
      scaleX = x/y;
      invScaleX = y/x;
      grad = b.createRadialGradient(x*invScaleX, y, 0, x*invScaleX, y, y);
    }

    a.width = x*2;
    a.height = y*2;

    b.fillStyle = grad;
    grad.addColorStop(0,'#ffffff55');
    grad.addColorStop(1, '#ffffff00');

    b.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    b.fillRect(0, 0, x*2*invScaleX, y*2*invScaleY);

    a.style.left = this.place[0] * X - x + 'px';
    a.style.bottom = this.place[1] * Y - y + 'px';

    //thank http://rectangleworld.com/blog/archives/169 for it
  }
}

class Animal extends Placer {
  constructor(raw = {}) {
    super();
    this.blocks = 0;
  }
  addMsg(msg) {
    const out = this.chat.appendChild(document.createElement('div'));
    out.classList.add('msg');
    const m = out.appendChild(document.createElement('div'));
    m.classList.add('rectangle');
    m.classList.add('msg-inside');
    m.style.fontSize = `${Math.round(8.8 + 4 * this.size)}pt`
    //this.chat.corner.style.display = 'block';
    m.textContent = msg;

    if (this.chat.children.length > 2) this.chat.children[0].remove();

    setTimeout(() => {
      //if (this.chat.children.length == 2) this.chat.corner.style.display = 'none';
      if (out.remove) out.remove();
    }, 15000);
  }
  updateChunk() {
    this.html.style.left = this.place[0] * X - this.mediumW + 'px';
    this.html.style.bottom = this.place[1] * Y + 'px';
    this.html.style.zIndex = 3000 - Math.floor(this.place[1] * 100);
    if (this.keepRenderingOfRange) this.drawRange();
    if (this.eating) {
      if (this.eating.keepRenderingOfRange) this.eating.drawRange();
    }
  }
  setBlock(bit) {
    return this.blocks |= Math.pow(2, bit);
  }
  unsetBlock(bit) {
    return this.blocks &= ~Math.pow(2, bit);
  }
  checkBlock(bit) {
    return this.blocks & Math.pow(2, bit);
  }
}

class Cat extends Animal {
	constructor(raw = {}) {
    super();
    this.id = raw.id;
    this.sex = raw.sex;
		this.size = raw.size;
    this.speed = raw.speed;
    this.place = raw.place;
    this.dir = raw.dir;
    this.eatSprite = 12;
    this.computeSizes(raw.size);
    //присваивать дефолтную картинку, а потом подгружать новую
    this.createSkin(raw.skin);

    this.actions = raw.actions;
    this.parseRawActions(raw);

    game.addAmong(this);
		game.cats.set(raw.id, this);
	}
  parseRawActions(raw) {
    if (!this.checkAction(4)) {
      this.place = raw.place;
      if (this.eatenBy) this.beFree()
      else this.updateChunk();
      if (this.checkAction(1)) this.changeSkinPosition(2)
      else if (this.checkAction(2)) this.sitdown()
      else this.standup();
      if (this.checkAction(5))
        game.getPlacer(raw.eating, 5000).then(any => {
          if (any) this.eat(any);
        });
    }
    if (this.checkAction(1)) {
      if (this.id == ID) {
        this.html.style.zIndex = 40000;
        document.getElementById('sleep').style.display = 'block';
      }
    }
  }
  computeSizes(size) {
    this.w = 27.5 * X * size;
    this.h = 17.5 * X * size;
    this.mediumW = 27.5 * X * size / 2;
    this.maxW = 27.5 * X * 13 * size;
    this.ellipse = [30, 5].map(e => Math.floor(e * (size + (1 - size) * 0.4)));
    this.eatenAnimation = [13 * X * size, X * size];
    this.eatAnimation = [
                        [ //left direction
                          [5.5 * X * size, 4.5 * X * size],
                          [8.625 * X * size, 4.875 * X * size],
                          null,
                          [3.625 * X * size, 8 * X * size],
                          [3.375 * X * size, 8.25 * X * size],
                          [3.25 * X * size, 8.5 * X * size],
                          [3 * X * size, 8.75 * X * size],
                          [3.125 * X * size, 8.625 * X * size],
                          [3.25 * X * size, 8.5 * X * size],
                          [3.5 * X * size, 8.25 * X * size],
                          [3.75 * X * size, 8.125 * X * size],
                          [3.75 * X * size, 8.125 * X * size]
                        ],
                        [ //right
                          [23 * X * size, 4.625 * X * size],
                          [19.75 * X * size, 4.875 * X * size],
                          null,
                          [24.875 * X * size, 8.125 * X * size],
                          [25 * X * size, 8.375 * X * size],
                          [25.125 * X * size, 8.625 * X * size],
                          [25.25 * X * size, 8.875 * X * size],
                          [25.25 * X * size, 8.75 * X * size],
                          [25 * X * size, 8.625 * X * size],
                          [24.875 * X * size, 8.375 * X * size],
                          [24.625 * X * size, 8.25 * X * size],
                          [24.625 * X * size, 8.25 * X * size]
                        ]
                      ]
  }
  update(raw) {
    this.dir = raw.dir;
    this.speed = raw.speed;
    if (raw.size > this.size + 0.01) {
      this.computeSizes(raw.size);
      this.size = raw.size;
      this.html.style.background = `url(/img/skin?r=${raw.skin}) no-repeat 0px -${this.dir ? 0 : this.h}px/${this.maxW}px ${2 * this.h}px`;
      this.html.style.width = this.w + 'px';
      this.html.style.height = this.h + 'px';
      const plus = (1 - this.size) * 78;
      this.chat.style.maxWidth = Math.round(this.w + plus) + 'px';
      this.chat.style.width = this.chat.style.maxWidth;
      this.chat.style.left = Math.round(-plus/2) + 'px';
      this.chat.style.bottom = this.h + 'px';
    }
    this.actions = raw.actions;
    this.parseRawActions(raw);
    this.unhide();
    this.html.style.backgroundPositionY = -(this.dir ? 0 : this.h) + 'px';
  }
  checkAction(bit) {
    return this.actions & Math.pow(2, bit);
  }
  setAction(bit) {
    return this.actions |= Math.pow(2, bit);
  }
  unsetAction(bit) {
    return this.actions &= ~Math.pow(2, bit);
  }
  sitdown() {
    this.setBlock(1);
    this.setAction(2);
    this.changeSkinPosition(1);
    this.checkEating();
  }
  standup() {
    this.unsetBlock(1);
    this.unsetAction(2);
    this.changeSkinPosition(0);
    this.checkEating();
  }
  changeSkinPosition(position) {
    this.html.style.backgroundPosition = `-${position * this.w}px -${this.dir ? 0 : this.h}px`;
  }
  createSkin(skin) {
    const html = this.html = document.createElement('div');
    html.classList.add('placer');
    html.style.background = `url(/img/skin?r=${skin}) no-repeat 0px -${this.dir ? 0 : this.h}px/${this.maxW}px ${2 * this.h}px`;
    html.style.width = this.w + 'px';
    html.style.height = this.h + 'px';
    const chat = this.chat = html.appendChild(document.createElement('div')),
          plus = (1 - this.size) * 78;
    chat.style.maxWidth = Math.round(this.w + plus) + 'px';
    chat.style.width = chat.style.maxWidth;
    chat.style.left = Math.round(-plus/2) + 'px';
    chat.style.textAlign = 'center';
    chat.style.position = 'absolute';
    chat.style.bottom = this.h + 'px';
    this.updateChunk();
    if (!this.checkAction(4)) game.layers.animals.appendChild(this.html);
  }
  hide() {
    this.hiden = Date.now();
    if (this.eating) this.eating.hide();
    this.html.style.display = 'none';
    game.deleteAmong(this);
    game.clearHide();
  }
  unhide() {
    delete this.hiden;
    this.html.style.display = 'block';
    game.checkAmong(this);
  }
  delete() {
    this.deleted = true;
    if (this.eating) this.eating.delete();
    this.html.remove();
    game.cats.delete(this.id);
  }
  checkEating(sprite = 0) {
    if (this.checkAction(2)) sprite = 1;
    if (this.eating) {
      const html = this.eating.html.style,
            move = this.eatAnimation[this.dir][sprite];
      html.left = move[0] - this.eating.eatenAnimation[0] + 'px';
      html.top = move[1] - this.eating.eatenAnimation[1] + 'px';
    }
  }
	walkAnimation() {
    if (this.walkAnimationInterval) return;
    let sprite = 3;
    this.walkAnimationInterval = setInterval(() => {
      if (this.actions & 0b10110) return this.stopWalkAnimation();
			if (sprite == 11) sprite = 3
			else sprite += 1;
      this.changeSkinPosition(sprite);
      this.checkEating(sprite);
		}, 120);
	}
	stopWalkAnimation() {
    clearInterval(this.walkAnimationInterval);
    if (!(this.actions & 0b10110)) this.changeSkinPosition(0);
    if (this.endDir !== undefined) {
      //endDir нужен для синхронизации свойствa с сервером, ибо на сервере оно
      //обновляется с меньшей частотой, чем на клиенте
      this.dir = this.endDir;
      this.html.style.backgroundPositionY = -(this.dir ? 0 : this.h) + 'px';
      delete this.endDir;
    }
    this.checkEating();
    delete this.walkAnimationInterval;
	}
	walk(to) {
		clearInterval(this.walkInterval);
		this.walkAnimation();
    this.setAction(3);
		const v = game.vectorLength(this.place, to),
		      speed = this.speed / 1000 * 40,
		      t = v[2] / speed,
			    speedX = v[0] / t, speedY = v[1] / t;
		let gone = 0;
    if (v[0] < 0) this.dir = 0
    else if (v[0] > 0) this.dir = 1;
		this.walkInterval = setInterval(() => {
			gone += speed;
			if (v[2] <= gone || this.checkBlock(1) || this.eatenBy) return this.stopWalk();
			this.place[0] += speedX;
			this.place[1] += speedY;
      this.updateChunk();
		}, 40);
	}
  stopWalk() {
    clearInterval(this.walkInterval);
    this.stopWalkAnimation();
    this.unsetAction(3);
    game.checkAmong(this);
    if (this.eating) game.checkAmong(this.eating);
  }
  eat(animal) {
    animal.setAction(4);
    this.setAction(5);
    if (this.id === ID && animal.lift) {
      if (animal.amongHTML && !animal.amongHTML.textContent.includes('↑')) animal.amongHTML.textContent += ' ↑';
      animal.lift.textContent = 'Опустить';
    }
    animal.eatenBy = this;
    this.eating = animal;
    animal.place = this.place;
    this.html.appendChild(animal.html);
    const html = animal.html.style;
    let move;
    if (this.checkAction(2)) move = this.eatAnimation[this.dir][1]
    else if (this.checkAction(3)) move = this.eatAnimation[this.dir][3]
         else move = this.eatAnimation[this.dir][0];
    html.left = move[0] - animal.eatenAnimation[0] + 'px';
    html.top = move[1] - animal.eatenAnimation[1] + 'px';
    html.bottom = '';
    html.zIndex = 'inherit';
    animal.changeSkinPosition(animal.eatSprite);
  }
  beFree() {
    if (this.lift) {
      this.lift.textContent = 'Поднять';
      if (this.amongHTML.textContent.includes('↑')) this.amongHTML.textContent = this.amongHTML.textContent.slice(0, -2);
    }
    this.eatenBy.unsetAction(5);
    this.unsetAction(4);
    delete this.eatenBy.eating;
    delete this.eatenBy;
    game.layers.animals.appendChild(this.html);
    this.html.style.top = '';
    this.updateChunk();
    if (this.checkAction(1)) {
      this.changeSkinPosition(2);
      if (this.id === ID) this.html.style.zIndex = 40000;
    } else this.changeSkinPosition(0);
    if (this.doItWhenYouAreFree) {
      this.doItWhenYouAreFree();
      delete this.doItWhenYouAreFree;
    }
  }
}

class Location {
  constructor(raw = {}) {
    this.interfaces = [];
    this.clear(raw);
  }
  area(area) {
    if (area > 0)
      game.layers.area.style.backgroundImage = `url(/img/play/area?r=${area}s${game.time.getSeason()})`
    else
      game.layers.area.style.backgroundImage = `url(/img/play/area?r=${Math.abs(area)})`;
  }
  fill(raw = []) {
    raw.forEach(a => {
      const cat = game.getPlacer(a.id);
      if (cat) cat.update(a)
      else new Cat(a);
    });
  }
  createLandscape(raw) {
    const l = document.createElement('div'),
          size = Math.floor(raw.size * X),
          z = raw.z ? raw.z : 3000 - Math.floor(raw.place[1] * 100);
    l.classList.add('placer');
    l.style.width = size + 'px';
    l.style.height = size + 'px';
    l.style.left = raw.place[0] * X - size/2 + 'px';
    l.style.bottom = raw.place[1] * Y + 'px';
    l.style.zIndex = z > 30000 ? 30000 : z;
    if (raw.seasonable)
      l.style.background = `url(/img/play/landscape?r=${raw.skin}) -` +
                           `${Math.floor(game.time.getSeason() * size)
                           }px 0px / ${Math.floor(size * 9)}px ${size}px`;
    else
      l.style.background = `url(/img/play/landscape?r=${raw.skin}) ` +
      `0px 0px / ${Math.floor(size * 4)}px ${size}px`
    return l;
  }
  createPath(raw) {
    let p = document.createElement('img');
    p.classList.add('placer');
    p.src = '/img/play?r=path';
    p.width = 6 * X;
    p.style.left = raw.place[0] * X - 3 * X + 'px';
    p.style.bottom = raw.place[1] * Y - 3 * X + 'px';
    p = {
      html: p,
      click: place => { send102(place, raw.id) },
      zone: [raw.place[0] - 3, raw.place[1] + 3,
             raw.place[0] + 3, raw.place[1] - 3]
    }
    game.spaces.add(p);
    return p;
  }
  interface(raw) {
    if (this.interfaces.length > 0) {
      const s = game.spaces;
      this.interfaces.forEach(i => {
        s.delete(i);
        //i.html.remove();
      });
      delete this.interfaces;
    }
    const p = game.layers.placers;
    this.interfaces = [];
    raw.forEach(i => {
      let res;
      switch (i.type) {
        case 0:
          res = this.createPath(i);
          p.appendChild(res.html);
          break;
      }
      this.interfaces.push(res);
    });
  }
  clear(raw) {
    game.cats.forEach(cat => {
      cat.hide();
    });
    this.area(raw.area);
    this.fill(raw.fill);
    let p = game.layers.placers.childNodes;
    while (p.length) p[0].remove();
    this.interface(raw.interface);
    p = game.layers.placers;
    if (raw.landscape)
      JSON.parse(raw.landscape).forEach(i => {
        p.appendChild(this.createLandscape(i));
      });
  }
}

async function get(url, options = {}) {
  const res = await fetch(url, options);
  if (options.text) return await res.text()
  else return await res.json();
}

function send(code, msg) {
  if (game.ws.readyState === WebSocket.OPEN) {
    game.ws.send(JSON.stringify({ code, msg }));
    return true;
  }
}

function send102(place, path) {
  const cat = game.cats.get(ID);
  if (cat.checkBlock(0)) return;
  cat.setBlock(0);
  send(102, {place, path});
  setTimeout(() => cat.unsetBlock(0), 200);
}

function loadImage(path, f = a => a) {
  const img = new Image();
  img.src = path;
  img.onload = () => f(img);
}

/*
game.computeVectorsStart = msg => {
  if (msg.t - Date.now() <= 0) return msg.to;
  const full = game.computeVector(msg.from, msg.to),
        larger = Math.abs(Math.abs(full[0]) > Math.abs(full[1]) ? full[0] : full[1]),
        stepX = full[0] / larger, stepY = full[1] / larger;
  for (let i = 0, x = msg.to[0] - stepX, y = msg.to[1] - stepY; i <= larger; i++, x -= stepX, y-= stepY) {
    if (game.computeVector([x, y], msg.to)[2] / 16 * 1000 > msg.t - Date.now()) return [x, y];
  }
}
*/


game.openConnection();
game.init();
game.layers.area.onclick = e => {
  const cat = game.cats.get(ID),
        client = document.documentElement.clientWidth,
        p = [(client <= W ? game.layers.scroll.scrollLeft + e.pageX : e.pageX - (client - W)/2) / X,
             (H * 0.8 - e.pageY) / Y];
  if (p[0] > 160 || p[0] < 0 || p[1] > 27 || p[1] < 0) return;
  game.spaces.forEach(v => {
    const c = v.zone;
    if (c[0] <= p[0] && c[2] >= p[0] &&
        c[1] >= p[1] && c[3] <= p[1]) v.click(p);
  });
  send102(p);
}
game.layers.meow.onkeydown = game.checkMeow;
