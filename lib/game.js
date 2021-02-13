'use strict'

let db, fs,
    placerID = 0n,
    animalID = 0n;

const queens = [
    [[2,6]], //0 гроза
    [[3,10]], //1 река
    [[4,8]], //2 ветер
    [[1,7]], //3 тени
    [[5,9]], //4 одиночки
    [[5,9]], //5 домашки
  ],
  mediumSpeed = 16;

function random(from, to) {
	return from + Math.floor(Math.random() * (to + 1 - from));
}

class Time {
  constructor(savedTime) {
    this.oneQuarter = 1800;
    this.oneDay = 7200;
    this.oneMoon = 216000;
    this.oneYear = 2592000;
    this.nw = new Array(5);
    this.nw[0] = savedTime;
    this.nw[1] = Math.floor(savedTime / this.oneYear);
    let filler = savedTime - this.oneYear * this.nw[1];
    this.nw[2] = Math.floor(filler / this.oneMoon);
    this.nw[3] = Math.floor((filler -= this.oneMoon * this.nw[2]) / this.oneDay);
    this.nw[4] = Math.floor((filler -= this.oneDay * this.nw[3]) / this.oneQuarter)
    this.dayListeners = new Set();
    this.seasonListeners = new Set();
    setInterval(() => this.nw[0]++, 1000);
    setTimeout(() =>
      setInterval(() => this.upQuarter(), this.oneQuarter * 1000),
      (Math.floor(savedTime / this.oneQuarter) + 1) * this.oneQuarter - savedTime);
  }
  upQuarter() {
    this.quarterWasChanged();
    if (this.nw[4] < 3) this.nw[4]++
    else {
      if (this.nw[3] < 29) this.nw[3]++
      else {
        const lastSeason = this.getSeason();
        if (this.nw[2] < 11) this.nw[2]++
        else {
          this.nw[1]++;
          this.nw[2] = 0;
        }
        this.nw[3] = 0;
        if (this.getSeason() != lastSeason) this.seasonWasChanged();
      }
      this.nw[4] = 0;
    }
  }
  seasonWasChanged() {
    this.seasonListeners.forEach(any => {
      any.season(this.getSeason());
    });
  }
  quarterWasChanged() {
    this.dayListeners.forEach(any => {
      any.season(this.getSeason());
    });
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
  getDate() {
    return this.nw.concat(this.getMoonPhase());
  }
  now() {
    return this.nw[0];
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
  addListener(name, l) {
    switch (name) {
      case 'day': this.dayListeners.add(l); break;
      case 'season': this.seasonListeners.add(l); break;
    }
  }
  deleteListener(name, l) {
    switch (name) {
      case 'day': this.dayListeners.delete(l); break;
      case 'season': this.seasonListeners.delete(l); break;
    }
  }
}

class Game {
  listen(name) {
    switch (name) {
      case 'day': db.time.addListener('day', this); break;
      case 'season': db.time.addListener('season', this); break;
    }
  }
  unlisten(name) {
    switch (name) {
      case 'day': db.time.deleteListener('day', this); break;
      case 'season': db.time.deleteListener('season', this); break;
    }
  }
  static getClanAsText(clan) {
    switch (clan) {
      case 0: return 'Грозовое племя';
      case 1: return 'Речное племя';
      case 2: return 'племя Ветра';
      case 3: return 'племя Теней';
      case 4: return 'одиночки';
      default: return 'домашние';
    }
  }
  static id(id) {
    if (id) {
      if (typeof id === 'string') {
        if (id.includes('i')) {
          //is Inteface
          return 2;
        } else if (id.includes('a')) {
          //is Animal
          return 3;
        }
      } else return 1; //is Player
    }
  }
}

class Location extends Game {
  constructor(id, raw) {
    super();
    this.id = id;
    this.fill = new Set(raw.fill);
    this.forbidden = raw.forbidden || {};
    this.interface = new Map();
    if (raw.interface)
      raw.interface.forEach(a => {
        a.place.push(this.id);
        a = Interface.create(a);
        this.interface.set(a.id, a);
      });
    this.area = raw.area || 1;
    db.locs.cache.set(id, this);
  }
  isForbidden(x, y) {
    return this.forbidden[x] >> y & 1;
  }
  async toClient() {
    const all = {
      fill: Array.from(this.fill),
      interface: [],
      landscape: await db.editor.getLocation(this.id, 'landscape', (err, land) => land, true),
      area: this.area
    }
    for (let i = 0; i < all.fill.length; i++) {
      let cat = await db.editor.getCat(all.fill[i], 'game', (err, player) => player);
      if (cat) {
        if (cat instanceof Cat) all.fill[i] = cat.toClient()
        else {
          cat = new Player(all.fill[i], { game: cat }, true);
          all.fill[i] = cat.toClient();
        }
      }
    }
    this.interface.forEach(e => all.interface.push(e.toClient()));
    return all;
  }
  in(animal) {
    return this.fill.add(animal.id);
  }
  out(animal) {
    return this.fill.delete(animal.id);
  }
  save() {
    return new Promise(resolve => {
      try {
        const s = {
          fill: Array.from(this.fill),
          interface: [],
          area: this.area
        }
        this.interface.forEach(e => s.interface.push(e.toSave()));
        fs.writeFile(`${__dirname}/../db/locs/${this.id}/cached.json`, JSON.stringify(s), err => {
          if (err) console.log(err), resolve(true);
          resolve();
        });
      } catch(err) {
        resolve(true);
        console.log(err);
      }
    });
  }
}

class Placer extends Game {
  constructor(raw = {}) {
    super();
    this.game = {};
  }
  season(season) {
    //console.log(`${this.game.name} отреагировал на ${season}`);
  }
  getDinamic(name, arg) {
    switch (name) {
      case 'moon': {
        let moonAsFloat = (db.time.now() - this.game.birth) / db.time.oneMoon;
        if (moonAsFloat < 0) return 0;
        if (arg) {
          const moonAsInteger = Math.floor(moonAsFloat),
                pie = moonAsFloat - moonAsInteger,
                end = m => {
                  m %= 100;
                  if (m >= 10 && m <= 20) return 'лун';
                  m %= 10;
                  if (m == 1) return 'луна';
                  if (m == 2 || m == 3 || m == 4) return 'луны';
                  return 'лун';
              };
          if (moonAsInteger == 0) return 'меньше одной луны'
          else if (pie == 0) {
            const a = end(moonAsInteger);
            return `${moonAsInteger} ${a == 'луна' ? 'полная' : 'полных'} ${a}`
          } else if (pie <= 1/4) return `четверть ${moonAsInteger + 1}-ой луны`
          else if (pie <= 1/3) return `треть ${moonAsInteger + 1}-ой луны`
          else if (pie <= 1/1.5) return `половина ${moonAsInteger + 1}-ой луны`
          else return `почти ${moonAsInteger + 1} ${end(moonAsInteger + 1)}`;
        }
        return moonAsFloat;
      }
      case 'size': {
        const g = this.growing;
        if (g) {
          const m = this.getDinamic('moon');
          if (m <= g.fast) {
            return g.percentStart + Math.sqrt(m / g.fast) * g.percentFast;
          } else {
            return 1 - g.percentStart + Math.sqrt(m / (this.maxMoons - g.fast)) * g.percentStart;
          }
        }
        return 1;
      }
      case 'ellipse': {
        if (this.ellipse) {
          const s = this.getDinamic('size');
          return this.ellipse.map(e => Math.floor(e * (s + (1 - s) * 0.4)));
        }
        return [0, 0];
      }
      case 'speed': {
        const m = this.getDinamic('moon'),
              g = this.growing,
              f = this.game.feel;
        let speed = mediumSpeed;
        if (g && m <= g.fast) speed *= g.percentStart * 2 + Math.sqrt(m / g.fast) * (1 - g.percentStart * 2);
        return speed * f.energy / 65535;
      }
      case 'wide': {
        const s = this.getDinamic('size');
        return this.wide * s;
      }
    }
  }
  //находится ли этот объект в диапазоне объекта it
  range(it) {
    const e = it.getDinamic('ellipse'),
          a = this.game.place,
          b = it.game.place;

    return Math.pow(a[0] - b[0], 2) / Math.pow(e[0], 2) +
           Math.pow(a[1] - b[1], 2) / Math.pow(e[1], 2) <= 1;
  }
  strictRange(it) {
    const e = it.getDinamic('ellipse'),
          a = this.game.place,
          b = it.game.place;

    return Math.pow(a[0] - b[0], 2) / Math.pow(e[0], 2) +
           Math.pow(a[1] - b[1], 2) / Math.pow(e[1], 2) <= 1 &&
           Math.pow(b[0] - a[0], 2) / Math.pow(e[1], 2) +
           Math.pow(b[1] - a[1], 2) / Math.pow(e[0], 2) <= 1;
  }
}

class Interface extends Placer {
  constructor() {
    super();
    this.id = (placerID += 1n) + 'i';
  }
  static create(raw) {
    switch (raw.type) {
      case 0: return new Path(raw);
    }
  }
  toSave() {
    return {
      type: this.type,
      place: this.game.place
    }
  }
}

class Path extends Interface {
  constructor(raw = {}) {
    super();
    this.type = 0;
    this.ellipse = raw.ellipse || [3, 3];
    this.game.place = raw.place; //[x, y, to, x`, y`, location]
    this.liftable = false;
  }
  move(id) {
    this.delete();
    db.editor.getLocation(id, (err, loc) => {
      if (err) return;
      if (!loc.interface.has(this.id)) loc.interface.set(this.id, this);
      this.game.place[5] = id;
    });
  }
  delete() {
    if (this.game.place[5])
      db.editor.getLocation(this.game.place[5], (err, loc) => {
        if (err) return;
        loc.interface.delete(this.id);
        delete this.game.place[5];
      });
  }
  toClient() {
    return {
      id: this.id,
      type: 0,
      place: this.game.place.slice(0, 2)
    }
  }
}

class Animal extends Placer {
  constructor(raw = {}) {
    super();
    this.blocks = 0;
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
  eat(id, links) {
    if (this.game.actions & 18 || id === this.id || this.eating === id) return;
    this.spitout().then(() => {
      switch (Game.id(id)) {
        case 1:
        db.editor.getCat(id, (err, cat) => {
          if (err || cat.game.place[2] != this.game.place[2] || cat.checkAction(4)) return;
          if (this.getDinamic('wide') * .65 > cat.getDinamic('wide')) {
            if (cat.range(this)) {
              if (cat.checkAction(5)) cat.spitout();
              if (!cat.checkAction(1)) cat.resetActions();
              cat.setBlock(0);
              cat.setAction(4);
              this.setAction(5);
              cat.game.place = this.game.place;
              cat.game.eatenBy = this.id;
              this.eating = id;
              db.sendWS('loc', {
                code: 118,
                msg: {
                  passive: id,
                  active: this.id
                }
              }, this.game.place[2]);
            } else {
              db.sendWS('one', {code: 102, msg: 'Нужно подойти ближе'}, links);
            }
          } else {
            db.sendWS('one', {code: 102, msg: 'Не могу поднять. Тяжело.'}, links);
          }
        });
        break;
        case 2:
        //interface
        break;
        case 4:
        //animal
        break;
      }
    });
  }
  spitout() {
    return new Promise(resolve => {
      if (this.checkAction(5)) {
        switch (Game.id(this.eating)) {
          case 1:
            //if (type & 1) return;
            db.editor.getCat(this.eating, (err, cat) => {
              if (err) return resolve();
              if (!cat.checkAction(1)) cat.unsetBlock(0);
              delete cat.game.eatenBy;
              delete this.eating;
              const ellipseX = this.getDinamic('ellipse')[0];
              cat.game.place = [this.game.place[0] + (this.game.dir ? ellipseX : -ellipseX) * 0.3,
                                this.game.place[1], cat.game.place[2]];
              cat.unsetAction(4);
              this.unsetAction(5);
              db.sendWS('loc', {
                code: 119,
                msg: {
                  id: cat.id,
                  place: cat.game.place
                }
              }, this.game.place[2]);
              resolve();
            });
            break;
          case 2:
            //if (type & 2) return;
            //interface
            break;
          case 4:
            //if (type & 4) return;
            //animal
            break;
        }
      } else resolve();
    });
  }
  async walk(to) {
    const place = this.game.place;
//    if (await db.editor.initLocation(place[2])) return true;
    let disX = to[0] - place[0],
        disY = to[1] - place[1];

    //if disX == 0 dont do anything
    if (disX < 0) this.game.dir = 0
    else if (disX > 0) this.game.dir = 1;
    if (this.checkBlock(0)) return true;


//  let larger = Math.abs(disX) > Math.abs(disY) ? Math.abs(disX) : Math.abs(disY),
/*
    for (let i = 0, x = place[0], y = place[1]; i <= larger; i++, x += disX / larger, y += disY / larger) {
      if (db.locs.cache.get(place[2]).isForbidden(Math.floor(x), Math.floor(y))) {
        to[0] = x - disX / larger;
        to[1] = y - disY / larger;
        disX = x - place[0];
        disY = y - place[1];
        break;
      }
    }
*/
    let gone = 0;
    const s = Math.round(Math.sqrt(Math.pow(disX, 2) + Math.pow(disY, 2)));
    if (s === 0) return this.game.dir;

    const feel = this.game.feel,
          speed = this.getDinamic('speed') / 2,
          t = s / speed,
          speedX = disX / t, speedY = disY / t,
          interval = () => {
            if (this.checkBlock(0)) return this.stand();
            gone += speed;
            if (s <= gone) {
              place[0] = to[0];
              place[1] = to[1];
              return this.stand();
            }
            feel.energy -= 8;
            place[0] += speedX;
            place[1] += speedY;
          };

    this.resetActions();
    this.setAction(3);


    this.walking = {
      timer: setInterval(interval, 500),
      to,
      t: t * 1000 + Date.now()
    };

    feel.energy -= 8;
  }
  stand() {
    if (this.checkAction(3)) {
      clearInterval(this.walking.timer);
      delete this.walking;
      this.unsetAction(3);
      if (this.needMoving) {
        this.needMoving();
        delete this.needMoving;
      }
    }
  }
  sleep() {
    if (this.checkAction(1)) return;
    this.resetActions();
    this.spitout();
    this.setBlock(0);
    this.setAction(1);
    this.game.sleeping = Date.now();
    db.sendWS('loc', {
      code: 111,
      msg: {
        id: this.id
      }
    }, this.game.place[2]);
  }
  wakeup(reason) {
    if (this.checkAction(1)) {
      if (!this.checkAction(4)) {
        this.unsetBlock(0);
      }
      this.unsetAction(1);
      const a = Math.round((Date.now() - (this.game.sleeping || Date.now())) / 1000 * 32),
            f = this.game.feel;
      if (f.energy + a >= 65535) f.energy = 65535
      else f.energy += a;
      delete this.game.sleeping;
      db.sendWS('loc', {
        code: 111,
        msg: {
          id: this.id,
          speed: this.getDinamic('speed')
        }
      }, this.game.place[2]);
    }
  }
  sitdown() {
    if (this.checkAction(2)) return;
    this.resetActions();
    this.setBlock(0);
    this.setAction(2);
    this.game.sitting = Date.now();
    db.sendWS('loc', {
      code: 112,
      msg: this.id
    }, this.game.place[2]);
  }
  standup() {
    if (this.checkAction(2)) {
      this.unsetBlock(0);
      this.unsetAction(2);
      const a = Math.round((Date.now() - (this.game.sitting || Date.now())) / 1000 * 8),
            f = this.game.feel;
      if (f.energy + a >= 65535) f.energy = 65535
      else f.energy += a;
      delete this.game.sitting;
      db.sendWS('loc', {
        code: 112,
        msg: {
          id: this.id,
          speed: this.getDinamic('speed')
        }
      }, this.game.place[2]);
    }
  }
  resetActions() {
    const action = this.game.actions;
    if (this.checkAction(1)) {
      this.wakeup();
    }
    if (this.checkAction(2)) {
      this.standup();
    }
    if (this.checkAction(3)) {
      this.stand();
    }
  }
  checkAction(bit) {
    return this.game.actions & Math.pow(2, bit);
  }
  setAction(bit) {
    return this.game.actions |= Math.pow(2, bit);
  }
  unsetAction(bit) {
    return this.game.actions &= ~Math.pow(2, bit);
  }
  move(to) {
    if (this.game.eatenBy) return;
    return new Promise(resolve => {
      db.editor.getLocation(this.game.place[2], (err, loc1) => {
        if (err) return resolve();
        if (loc1.interface.has(to)) {
          let place = loc1.interface.get(to);
          if (this.range(place)) {
            place = place.game.place;
            db.editor.getLocation(place[2], (err, loc2) => {
              if (err) return resolve();
              if (this.checkAction(5)) {
                switch (Game.id(this.eating)) {
                  case 1:
                    //player
                    db.editor.getCat(this.eating, (err, cat) => {
                      if (err) return resolve();
                      loc1.out(this);
                      loc1.out(cat);
                      loc2.in(this);
                      loc2.in(cat);
                      const animalPlace = this.game.place;
                      animalPlace[0] = place[3];
                      animalPlace[1] = place[4];
                      animalPlace[2] = place[2];
                      resolve(loc2.toClient());
                    });
                    break;
                  case 2:
                    resolve();
                    break;
                  case 4:
                    //animal
                    resolve();
                    break;
                }
              } else {
                loc1.out(this);
                loc2.in(this, place);
                const animalPlace = this.game.place;
                animalPlace[0] = place[3];
                animalPlace[1] = place[4];
                animalPlace[2] = place[2];
                resolve(loc2.toClient());
              }
            });
          } else resolve();
        } else resolve();
      });
    });
  }
}

//max x = 160
//max y = 27

class Cat extends Animal {
  constructor(raw = {}) {
    super();
    this.id = (animalID += 1n) + 'a';
    this.maxMoons = 200;
    this.growing = {
      percentStart: .25,
      percentFast: .55,
      fast: 12
    };
    this.ellipse = [30, 5];
    this.wide = 1024;
  }
  toClient() {
    const res = {
      place: this.game.place,
      walking: this.walking,
      id: this.id,
      size: this.getDinamic('size'),
      moon: this.getDinamic('moon', true),
      skin: this.game.skin,
      speed: this.getDinamic('speed'),
      dir: this.game.dir,
      actions: this.game.actions,
      sex: this.game.sex,
      eating: this.eating,
      eatenBy: this.game.eatenBy
    }
    if (res.walking) res.walking = {
      to: res.walking.to,
      t: res.walking.t
    }
    return res;
  }
}


class Player extends Cat {
  constructor(id, raw, stop) {
    super();
    this.id = id;
    this.game.skin = raw.game.skin || 'default';
    this.game.sex = raw.game.sex || 0;
    this.game.place = raw.game.place || [random(0, 160), random(0, 27), 1];
    this.game.birth = raw.game.birth || db.time.now();
    this.game.feel = raw.game.fill || {
      energy: 65535
    };
    this.game.actions = 0;
    if (raw.game.actions) {
      if (raw.game.actions & 2) {
        this.game.sleeping = raw.game.sleeping;
        this.game.actions |= 2;
      }
      if (raw.game.actions & 4) {
        this.game.sitting = raw.game.sitting;
        this.game.actions |= 4;
      }
      if (raw.game.actions & 16) {
        switch (Game.id(raw.game.eatenBy)) {
          case 1:
            db.editor.getCat(raw.game.eatenBy, (err, cat) => {
              if (cat.eating === this.id && !err) {
                this.blocks |= 1;
                this.game.place = cat.game.place;
                this.game.eatenBy = cat.id;
                cat.game.actions |= 32;
                this.game.actions |= 16;
              }
            });
            break;
          case 4:
            //animal
            break;
        }
      }
    }
    this.game.dir = raw.game.dir || 0;

    if (stop) return;

    this.lastOnline = Date.now();
    this.game.lastOnline = raw.game.lastOnline || Date.now();
    this.game.name = raw.game.name || (raw.game.sex ? 'Безымянный' : 'Безымянная');
    this.game.clan = raw.game.clan || random(0, 5);
    if (raw.game.parents) this.game.parents = raw.game.parents
    else Player.setParents(this);
    if (raw.game.die) this.game.die = raw.game.die
    else Player.setDateOfDeath(this);
    this.game.stack = raw.game.stack || [];

    this.main = {};
    this.main.tmp = raw.main.tmp || {};
    this.main.lastOnline = raw.main.lastOnline || Date.now();
    this.main.rights = raw.main.rights || 0;
    this.main.dateOfReg = raw.main.dateOfReg || Date.now();

    this.auth = {};
    this.auth.cookie = raw.auth.cookie;
    this.auth.devices = raw.auth.devices;
    this.auth.password = raw.auth.password;
    this.auth.alias = raw.auth.alias;
    if (raw.auth.mail) this.auth.mail = raw.auth.mail;

    db.cats.cache.set(id, this);
  }
  static setParents(player) {
    const clan = player.game.clan,
          parents = queens[clan][random(0, queens[clan].length - 1)];
    player.setKnowledge(parents[0], {
      relation: 'моя мама'
    });
    db.editor.setKnowledge(player.id, parents[0], {
      relation: 'мой котёнок',
      clan: Game.getClanAsText(clan)
    });
    player.game.parents = parents;
  }
  static setDateOfDeath(player) {
    if (random(0, 20) == 7) return player.game.die = db.time.now() + random(150, 200) * db.time.oneMoon;
    db.editor.getCat(player.game.parents[0], 'game', (err, cat) => {
      let s = 0;
      if (err) s += random(120, 150) * db.time.oneMoon
      else s += (cat.game || cat).die - (cat.game || cat).birth;
      db.editor.getCat(player.game.parents[1], (err, cat) => {
        if (err) s += random(120, 150) * db.time.oneMoon
        else s += (cat.game || cat).die - (cat.game || cat).birth;
        player.game.die = db.time.now() + s / 2;
      });
    });
  }
  changeLastOnline(type = {}) {
    if (type.cache) this.lastOnline = Date.now();
    if (type.site) this.main.lastOnline = Date.now();
    if (type.game) this.game.lastOnline = Date.now();
  }
  checkRights(bit) {
    if (typeof bit == 'string') {
        if (bit == 'admin' || bit == 'админ') return this.main.rights == 2147483647;
        if (bit == 'cmd' || bit == 'кмд') return this.main.rights & 7;
        return;
    }
    return this.main.rights & Math.pow(2, bit);
  }
  setRights(bit) {
    if (typeof bit == 'string') {
        if (bit == 'admin' || bit == 'админ') return this.main.rights = 2147483647;
        if (bit == 'cmd' || bit == 'кмд') return this.main.rights = this.main.rights | 7;
        return;
    }
    return this.main.rights = this.main.rights | Math.pow(2, bit);
  }
  cutRights(bit) {
    if (typeof bit == 'string') {
      if (bit == 'admin' || bit == 'админ') return this.main.rights = 0;
      if (bit == 'cmd' || bit == 'кмд') return this.main.rights=  this.main.rights & -8;
      return;
    }
    return this.main.rights = this.main.rights & ~Math.pow(2, bit);
  }
  getKnowledge(id, f = a => a) {
    db.editor.getKnowledge(id, this.id, f);
  }
  setKnowledge(id, data) {
    db.editor.setKnowledge(id, this.id, data);
  }
  save() {
    return new Promise(resolve => {
      const pathStartsWith = __dirname + `/../db/cats/${this.id}/`;
      fs.writeFile(pathStartsWith + 'main.json', JSON.stringify(this.main), err => {
        if (err) return console.log(err), resolve(err);
        fs.writeFile(pathStartsWith + 'game.json', JSON.stringify(this.game), err => {
          if (err) return console.log(err), resolve(err);
          fs.writeFile(pathStartsWith + 'auth.json', JSON.stringify(this.auth), err => {
            if (err) return console.log(err), resolve(err);
            resolve();
          });
        });
      });
    });
  }
  delete() {
    this.sleep();
    this.deleted = true;
    db.getWS(db.playClients, this.id).forEach(ws => {
      delete ws.cat;
    });
    return db.cats.cache.delete(this.id);
  }
}

module.exports = {
  include(database, fylesystem) {
    db = database;
    fs = fylesystem;
    return {Game, Placer, Animal, Cat, Player, Location, Time, Interface}
  }
}
