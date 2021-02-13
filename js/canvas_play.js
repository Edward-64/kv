'use strict'

let ws, x, y, w, h, ID, stopRendering = false;


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
      case 2: case 3: case 4: return 0;
      case 5: case 6: case 7: return 1;
      case 8: case 9: case 10: return 2;
      case 11: case 0: case 1: return 3;
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
      case 1: string += ' сезона Юных Листьев, '; break;
      case 2: string += ' сезона Зелёных Деревьев, '; break;
      case 3: string += ' листопада, '; break;
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

class AdditionToCanvas {
  rotateHorizontally(img) {
    const d = img.data;
    for (let i = 0; i < img.height; i++) {
      for (let j = 0; j < img.width / 2; j++) {
        const p0 = i * img.width * 4 + j * 4,
              p1 = i * img.width * 4 + (img.width - j) * 4;
        for (let k = 0; k < 4; k++) {
          const t = d[p0 + k];
          d[p0 + k] = d[p1 + k];
          d[p1 + k] = t;
        }
      }
    }
    return img;
  }
}

class Game {
  constructor() {
    //super();
    this.host = location.origin.replace(/^http/, 'ws');
    this.time = new Time();
    this.layer = [
			document.getElementById('zero-layer').getContext('2d'),
			document.getElementById('first-layer').getContext('2d'),
      document.getElementById('under-layer').getContext('2d'),
      document.getElementById('tmp').getContext('2d')
		]
    this.canvas = new AdditionToCanvas();
    this.scale = 1;
    this.nowl = 0;
    this.area = {
      type: 0,
      react: (X, Y) => {
        send(102, [X / x, (Y - h * 0.55) / y]);
      }
    }
    this.colorOfInterface = {
      main: '#9b6c40',
      text: '#000000'
    }
		this.all = [];
		this.cats = new Map();
    this.spaces = new Set([this.area]);
  }
  cookSpace(data, f = a => a) {
    data.react = f;
    this.spaces.add(data);
    return data;
  }
  deleteSpace(link) {
    return this.spaces.delete(link);
  }
  computeVector(A, B) {
    return [
      B[0] - A[0],
      B[1] - A[1],
      Math.round(Math.sqrt(Math.pow(B[0] - A[0], 2) + Math.pow(B[1] - A[1], 2)))
    ];
  }
  serveText(text, maxTextLength = 1) {
    maxTextLength = Math.floor(maxTextLength * 40);
  	const result = [''], max = Math.floor(maxTextLength / 2);
  	text = text.match(/\s*[\S]+\s*/g);
  	for (let i = 0; i < text.length; i++) {
      const s = text[i];
  		if (s.length > max) {
        text.splice(i + 1, 0, s.slice(0, max), s.slice(max + 1));
        continue;
      }
      if (result[result.length - 1].length + s.length > maxTextLength) {
        result.push(s);
      } else result[result.length - 1] += s;
    }
  	return result;
  }
  initCanvas() {
		w = document.documentElement.clientWidth * this.scale;
		h = document.documentElement.clientHeight * this.scale;
		let zero = this.layer[0],
        first = this.layer[1],
        under = this.layer[2],
        totalHight = h * 0.85; //0.3 + 0.55
		zero.canvas.width = w;
		zero.canvas.height = totalHight;
		first.canvas.width = w;
		first.canvas.height = totalHight;
    under.canvas.width = w;
		under.canvas.height = totalHight;

    this.area.range = [0,h*0.55,w,totalHight]

		x = w / 160;
		y = h * 0.3 / 27;
	}
  async render() {
    console.time('render')
    if (stopRendering) return requestAnimationFrame(game.render);
    //при изменениее game.scale:
    //1) перерисовать under-layer
    //2) пересчитать параметры
    const l = game.layer[game.nowl],
          areaHight = h * 0.55;
    game.all.sort((a,b) => a.place[1] - b.place[1]);
    game.all.forEach(i => {
      const placeX = Math.floor(i.place[0] * x),
            placeY = Math.floor(areaHight + i.place[1] * y);
			l.drawImage(i.skin, i.sprite, i.dir ? 0 : i.h,
						i.w, i.h, placeX - i.out,
						placeY - i.hsc,
						i.wsc, i.hsc);
    //  if (i.paintedMsg)
    //    l.drawImage(i.paintedMsg, Math.floor(i.place[0] * x - i.paintedMsg.width/2/*- i.out*/),
      //            Math.floor(areaHight + i.place[1] * y - i.hsc - i.paintedMsg.height));
      if (i.msg) {
        for (let j = 0, p = 0; j < i.msg.length; j++) {
          console.log(i.msg[j])
          l.drawImage(i.msg[j].image, placeX, placeY - i.hsc - p);
          p += i.msg[j].height;
        }
      }
		});
		game.nowl ^= 1;
		game.layer[game.nowl].clearRect(0, 0, w, h);
    requestAnimationFrame(game.render);
    stopRendering = true;
      console.timeEnd('render')
	}
  space(s = {}, X, Y) {
    switch (s.type) {
      case 0:
        s = s.range;
        if (X >= s[0] && X <= s[2] &&
            Y >= s[1] && Y <= s[3]) return true;
        break;
    }
  }
  openConnection() {
    //if a connection already exists, try to close the connection
    if (ws) ws.close();
    ws = new WebSocket(this.host, 'play');
    ws.onopen = () => {
        get('/getCookie').then(res => {
          if (res.code == 1) send(100, res.headers)
          else console.log('Ошибка авторизации');
        });
    }
    ws.onmessage = e => {
      const {code, msg} = JSON.parse(e.data);
      console.log({code,msg});
      switch (code) {
        case 100:
          game.time.updateTime(msg.time);
          game.location = new Location(msg.loc);
          ID = msg.id;
          requestAnimationFrame(game.render);
          break;
        case 101:
          game.cats.get(msg.id).addMsg(msg.text);
          break;
        case 104:
          game.cats.get(msg.id).walk(msg.msg);
          break;
        case 105:
          game.location.clear();
          game.location.fill(msg.fill);
          break;
        case 107:
          if (game.cats.get(msg.id)) return;
          new Cat(msg);
          break;
        case 108:
          game.time.updateTime(msg);
          break;
      }
    }
  }
}

var game = new Game();

class Animal {
  constructor(raw = {}) {
    this.msg = [];
  }
  roundedRect(c, x, y, width, height, radius, t) {
    c.beginPath();
    c.moveTo(x,y+radius);
    c.lineTo(x,y+height-radius);
    c.quadraticCurveTo(x,y+height,x+radius,y+height);
    if (t) {
      c.lineTo(x+width/2-4,y+height);
    	c.lineTo(x+width/2,y+height+7);
    	c.lineTo(x+width/2+4,y+height);
    }
  	c.lineTo(x+width-radius,y+height);
    c.quadraticCurveTo(x+width,y+height,x+width,y+height-radius);
    c.lineTo(x+width,y+radius);
    c.quadraticCurveTo(x+width,y,x+width-radius,y);
    c.lineTo(x+radius,y);
    c.quadraticCurveTo(x,y,x,y+radius);
    c.stroke();
  }
  deleteMsg(link) {
    for (let i = 1; i < 10; i++) {
      setTimeout(() => {
        if (i == 9) {
          this.msg.pop();
          link.killed = true;
        } else link.sprite[0] = link.width * i;
      }, i * 100);
    }
  }
  addMsg(msg) {
    if (this.msg.length > 2) this.deleteMsg(this.msg[this.msg.length - 1]);
    const m = {}
    m.text = game.serveText(msg, this.size + this.customTextSize);
    m.sprite = [];
    this.msg.unshift(m);
    setTimeout(() => {
      if (m.killed) return;
      this.deleteMsg(m);
    }, 10000);
  }
  renderMsg(m) {
    /*
      tmp.fillStyle = game.colorOfInterface.text;
      tmp.font = `${14 * m.k}px monospace`;
      m.text.forEach((b, j) => tmp.fillText(b,5,13*m.k+interval*j));
      tmp.getImageData(0,0,4+m.rectWidth,m.height);
      m.image = document.createElement('img');
      m.image.src = tmp.canvas.toDataURL();
      m.image.onload = () => stopRendering = false;
    } */
    console.time('draw')
    const tmp = game.layer[3],
          k = 0.8 + 0.2 * this.size + this.customTextSize,
          interval = 12 * k,
          rectHeight = m.text.length * interval + 4 * k,
          rectWidth = m.text[0].length * 9 * k,
          height = rectHeight + 4,
          width = rectWidth + 4,
          canvasHeight = height * 2 + 7,
          last = width * 6;
    console.log(m.text)
    tmp.canvas.height = canvasHeight;
    tmp.canvas.width = last;
    for (let i = 0; i < 2; i++) {
      tmp.fillStyle = game.colorOfInterface.main;
      tmp.lineWidth = 3;
      this.roundedRect(tmp, 2, (i ? 2 : 9 + height), rectWidth, rectHeight, 5, i);
      tmp.fill();
      tmp.fillStyle = game.colorOfInterface.text;
      tmp.font = `${14 * k}px monospace`;
      m.text.forEach((b, j) => tmp.fillText(b, 5, 13 * k + interval * j + (i ? 0 : 7 + height), rectWidth));
    }
    for (let i = width, alpha = 0.7; i < last; i += width, alpha *= 0.6) {
      const result = tmp.getImageData(0, 0, width, canvasHeight),
            r = result.data;
      for (let j = 3; j < r.length; j += 4) {
        r[j] *= alpha;
      }
      tmp.putImageData(result, i, 0);
    }
    console.timeEnd('draw')
    return tmp.canvas;
  }
  /*
  extMsg(link) {
    for (let i = 1; i < 10; i++) {
      setTimeout(() => {
        console.log(link.alpha + ': ' + link.text[0]);
        if (i == 9) {
          this.msg.pop();
          link.killed = true;
        } else {
          link.alpha = 1.0 - i * i / 81;
          this.shiftAlphaMsg(link);
        }
      }, i * 100);
    }
  }
  addMsg(msg) {
    if (this.msg.length > 2) this.extMsg(this.msg[this.msg.length-1]);
    const m = {}
    //m.alpha = 1.0;
    m.text = game.serveText(msg);
    this.drawMsg(m, 1);
    if (this.msg[0]) this.drawMsg(this.msg[0]);
    this.msg.unshift(m);
    setTimeout(() => {
      if (m.killed) return;
      this.extMsg(m);
    }, 10000);
    //this.drawMsg();
  } */ /*
  shiftAlphaMsg(m) {
    const tmp = game.layer[3];
    tmp.canvas.height = m.height;
    tmp.canvas.width = 4 + m.rectWidth;
    tmp.globalAlpha = m.alpha;
    const image = document.createElement('img');
    image.src = tmp.canvas.toDataURL();
    image.onload = () => {
      m.image = image;
      stopRendering = false;
    }
  } */
  /*
  drawMsg(m, newMsg) {
    console.log(m)
    if (newMsg) m.k = 0.8 + 0.2 * this.size + this.customTextSize;
    const tmp = game.layer[3],
          interval = 12 * m.k;
    if (newMsg) {
      m.rectHeight = m.text.length * interval + 3,
      m.rectWidth = m.text[0].length * 9 * m.k;
    }
    m.height = m.rectHeight + (newMsg ? 11 : 4);
    tmp.canvas.height = m.height;
    tmp.canvas.width = 4 + m.rectWidth;
    tmp.fillStyle = game.colorOfInterface.main;
    tmp.lineWidth = 3;
    this.roundedRect(tmp,2,2,m.rectWidth,m.rectHeight,5,(newMsg ? true : false));
    tmp.fill();
    tmp.fillStyle = game.colorOfInterface.text;
    tmp.font = `${14 * m.k}px monospace`;
    m.text.forEach((b, j) => tmp.fillText(b,5,13*m.k+interval*j));
    tmp.getImageData(0,0,4+m.rectWidth,m.height);
    m.image = document.createElement('img');
    m.image.src = tmp.canvas.toDataURL();
    m.image.onload = () => stopRendering = false;
  } */
  /*
  drawMsg() {
    if (this.msg.length == 0) {
      delete this.paintedMsg;
      stopRendering = false;
      return;
    }
    console.time('draw')
    const k = 0.8 + 0.2 * this.size + this.customTextSize,
          tmp = game.layer[3];
    let interval = 12 * k,
        s = 0,
        largestWidth = 14;

    this.msg.forEach((a, i) => {
      const rectHeight = a.text.length * interval + 3,
            rectWidth = a.text[0].length * 9 * k;
      a.height = rectHeight + 4 + (i ? 0 : 7);
      s += a.height;
      tmp.canvas.height = a.height;
      tmp.canvas.width = 4 + rectWidth;
      if (tmp.canvas.width > largestWidth) largestWidth = tmp.canvas.width;
      tmp.globalAlpha = a.alpha;
      tmp.fillStyle = game.colorOfInterface.main;
      tmp.lineWidth = 3;
      this.roundedRect(tmp,2,2,rectWidth,rectHeight,5,(i ? undefined : true));
      tmp.fill();
      tmp.fillStyle = game.colorOfInterface.text;
      tmp.font = `${14 * k}px monospace`;
      a.text.forEach((b, j) => tmp.fillText(b,5,13*k+interval*j));
      a.image = tmp.getImageData(0,0,4 + rectWidth,a.height);
    });
    tmp.canvas.height = s;
    tmp.canvas.width = largestWidth;
    for (let i = 0; i < this.msg.length; i++) {
      s -= this.msg[i].height;
      tmp.putImageData(this.msg[i].image,(largestWidth-this.msg[i].image.width)/2,s);
    }
    const image = document.createElement('img');
    image.src = tmp.canvas.toDataURL();
    image.onload = () => {
      //resolve(image);
      this.paintedMsg = image;
      stopRendering = false;
      //context.drawImage(image, X, Y - image.height);
      console.timeEnd('draw')
    };
    //return image;
  }
  */
}

class Cat extends Animal {
	constructor(raw = {}) {
    super();
    this.id = raw.id;
		this.sprite = 0;
    this.speed = raw.speed;
		this.place = raw.place;
		this.size = raw.size;
		this.h = 140;
		this.w = 220;
    this.out = Math.floor(this.w / 2 * this.size);
    this.wsc = Math.floor(this.w * this.size);
    this.hsc = Math.floor(this.h * this.size);
    this.customTextSize = 0;
    this.dir = raw.dir;
    //присвоивать дефолтную картинку, а потом подгружать новую
    this.skin = new Image();
    loadImage(`/img/players?r=${raw.skin}`, async a => {
      this.skin = await this.combineSkin(a);
      stopRendering = false;
    });
		game.cats.set(raw.id, this);
		game.all.push(this);
	}
  delete() {
    const i = game.all.findIndex(a => a == this);
    if (i != -1) game.all.splice(i, 1);
    game.cats.delete(this.id);
  }
  combineSkin(img, bits = 0) {
    return new Promise(resolve => {
    let image = document.createElement('img');
    const raw = document.createElement('canvas').getContext('2d'),
          result = document.createElement('canvas').getContext('2d'),
          tmp = document.createElement('canvas').getContext('2d'),
          end = () => {
            image = document.createElement('img');
            image.src = result.canvas.toDataURL('image/png');
            image.onload = () => resolve(image);
          };
    result.canvas.width = 2640;
    result.canvas.height = 280;
    raw.canvas.width = 2640;
    raw.canvas.height = 700;
    raw.drawImage(img,0,0);
    let body = raw.getImageData(0,0,2640,140);
    result.putImageData(body,0,0);
    for (let i = 0; i <= 2420; i += 220)
        result.putImageData(game.canvas.rotateHorizontally(raw.getImageData(i,0,220,140)), i, 140);

    tmp.canvas.width = 2640;
    tmp.canvas.height = 280;
    tmp.putImageData(raw.getImageData(0, 140, 2640, 140),0,0);
    for (let i = 0; i <= 2420; i += 220) {
      tmp.putImageData(game.canvas.rotateHorizontally(raw.getImageData(i,
      (bits & 1 ? 280 : 140),220,140)),i,140);
    }
    image.src = tmp.canvas.toDataURL('image/png');
    image.onload = () => {
      result.drawImage(image,0,0);

      if (bits & 2) {
        tmp.clearRect(0,0,2640,280);
        tmp.putImageData(raw.getImageData(0, 320, 2640, 140),0,0);
        for (let i = 0; i <= 2420; i += 220)
            tmp.putImageData(game.canvas.rotateHorizontally(raw.getImageData(i,0,220,140)), i, 140);
        image = document.createElement('img');
        image.src = tmp.canvas.toDataURL('image/png');
        image.onload = () => {
          result.drawImage(image,0,0);
          end();
        }
      } else end();
    }

    });
  }

	walkAnimation() {
    if (this.walkAnimationInterval) return;
		this.sprite = 880;
		this.walkAnimationInterval = setInterval(() => {
			if (this.sprite >= 2420) this.sprite = 880
			else this.sprite += 220;
		}, 120);
	}
	stopWalkAnimation() {
		this.sprite = 0;
		clearInterval(this.walkAnimationInterval);
    delete this.walkAnimationInterval;
	}
	walk(to) {
		clearInterval(this.walkInterval);
		this.walkAnimation();
		const v = game.computeVector(this.place, to),
		      speed = this.speed / 1000 * 40,
		      t = v[2] / speed,
			    speedX = v[0] / t, speedY = v[1] / t;
		let gone = 0;
    if (v[0] < 0) this.dir = 0
    else this.dir = 1;
		this.walkInterval = setInterval(() => {
      stopRendering = false;
			gone += speed;
			if (v[2] <= gone) {
				this.stopWalk();
				this.stopWalkAnimation();
				return;
			}
			this.place[0] += speedX;
			this.place[1] += speedY;
		}, 40);
	}
  stopWalk() {
    clearInterval(this.walkInterval)
  }
}

class Location {
  constructor(raw = {}) {
    this.area = new Image();
    loadImage(`/img/area?r=${raw.area}`, img => {
      this.area = img;
      this.drawArea();
    });
    this.fill(raw.fill);
  }
  fill(raw = []) {
    raw.forEach(a => new Cat(a));
  }
  drawArea() {
    const l = game.layer[2],
          p = l.createPattern(this.area, 'repeat');
    l.fillStyle = p;
    l.fillRect(0, h * 0.55, w, h);
  }
  clear() {
    game.cats.forEach(cat => {
      cat.delete();
    });
    stopRendering = false;
  }
}

async function get(url, options = {}) {
  const res = await fetch(url, options);
  if (options.text) return await res.text()
  else return await res.json();
}

function send(code, msg) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ code, msg }));
    return true;
  }
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
game.initCanvas();
document.body.onclick = e => {
  game.spaces.forEach(s => {
    if (game.space(s, e.clientX, e.clientY)) s.react(e.clientX, e.clientY);
  });
}
