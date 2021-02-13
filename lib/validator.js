'use strict'

class Validator {
  constructor(db) {
    this.db = db;
  }
  play(c, m, ws) {
    if (ws.cat === undefined) return true;
    try {
      const f = text => `code ${c}: ${text}\nsender: ${ws.cat.id}\nmsg: ${JSON.stringify(m || null)}`;
      switch (c) {
        case 101:
          if (typeof m !== 'string') throw f('msg isn`t string');
          if (m.length > 120) throw f('length of msg over 120 symbols');
          break;
        case 102:
          if (typeof m !== 'object') throw f('msg isn`t object');
          if (m.path !== undefined && typeof m.path !== 'number' && typeof m.path !== 'string') throw f('msg.path ist`n undefined, number or string');
          if (Array.isArray(m.place)) {
            if (typeof m.place[0] !== 'number' || m.place[0] < 0 || m.place[0] > 160) throw f('invalid msg.place[0]');
            if (typeof m.place[1] !== 'number' || m.place[1] < 0 || m.place[1] > 27) throw f('invalid msg.place[1]');
          } else throw f('msg.place isn`t array');
          break;
        case 103: case 109: case 111:
          if (typeof m !== 'number' && typeof m !== 'string') throw f('msg ist`n number or string');
          break;
        case 110:
          if (typeof m === 'object') {
            if (typeof m.id !== 'number' && typeof m.id !== 'string') throw f('invalid msg.id');
            if (typeof m.responses === 'object') {
              const keys = Object.keys(m.responses);
              if (!keys.every(name => typeof m.responses[name] === 'string')) throw f('no all msg.responses are string');
              if (keys.some(name => m.responses[name].length > 45)) throw f('one of responses has length over 45');
            } else if (m.responses !== undefined) throw f('msg.responses isn`t object or undefined');
          } else throw f('msg ist`n object');
          break;
      }
    } catch (err) {
      console.log(err);
      return true;
    }
  }
  createSkin(query) {
    const result = {
                  eye: +query.eye,
                  fur: +query.fur,
                  s: +query.s,
                  l: +query.l
                };
    let name = query.name;
    if (name) {
      if (name.startsWith(' ')) return;
      let check = name.match(/ /g);
      if (check && check.length > 1) return;
      check = name.match(/[а-яё]{2,}/ig);
      if (check) {
        if (check.join(' ') !== name) return;
      } else return;
      result.name = name[0].toUpperCase() + name.slice(1).toLowerCase();
    };
    if (typeof result.s === 'number') {
      if (result.s > 100 || result.s < 0) result.s = 50;
    } else result.s = 50;
    if (typeof result.l === 'number') {
      if (result.l > 100 || result.l < 0) result.l = 50;
    } else result.l = 50;
    return result;
  }
  isCorrectReq(r) {
    if (r) {
      r = r.match(/[\w\d-]+/ig);
      if (r && r.length == 1) return true;
    }
  }
  aliasAndPassword(body, f = a => a) {
    if (typeof body.alias !== 'string' || typeof body.password !== 'string') return f(7);
    const alias = body.alias.match(/[а-яёa-z\d]+/ig),
          password = body.password.match(/[а-яёa-z\d_-]+/ig);
    if (!alias || alias.join(' ') != body.alias) return f(1);
    if (!password || password.length > 1 || password.join('') != body.password) return f(2);
    if (password[0].length < 6) return f(3);
    if (password[0].length > 64) return f(4);
    this.db.editor.findCat('auth', (err, cat) => {
      if (err) return;
      if ((cat.auth || cat).password == body.password) return true;
    }).then(result => {
      if (result) f(5)
      else f(null);
    });
  }
  email(mail) {
    try {
      if (typeof mail !== 'string') return;
      const m = mail.match(/@/g);
      if (m) {
        if (m.length > 1) return;
      } else return;
      if (!/.+@.+\..+/.test(mail)) return;
      return true;
    } catch (err) {
      return;
    }
  }
  editLocation(body) {
    try {
      const f = text => `${text}:\n${JSON.stringify(body)}`
      if (!Array.isArray(body.newLandscape)) throw f('body.newLandscape isn`t array');
      if (!Array.isArray(body.newInterfaces)) throw f('body.newInterfaces isn`t array');
      if (!body.state) {
        if (!Array.isArray(body.removedLandscape)) throw f('body.removedLandscape isn`t array');
        if (!Array.isArray(body.removedLandscape)) throw f('body.removedLandscape isn`t array');
      }
      if (body.name && typeof body.name !== 'string') throw f('body.name isn`t string');
      if (body.area && typeof body.area !== 'number') throw f('body.area isn`t number');
    } catch(err) {
      console.log(err);
      return true;
    }
  }
  interface(raw) {
    return new Promise(resolve => {
      try {
          console.log(raw);
          if (typeof raw !== 'object') return resolve();
          const o = {};
          switch (raw.type) {
            case 0:
              if (typeof raw.x !== 'number' || raw.x < 3 || raw.x > 157 ||
                  typeof raw.y !== 'number' || raw.y > 24 || raw.y < 3 ||
                  typeof raw.to !== 'object' ||
                  typeof raw.to.x !== 'number' || raw.to.x < 3 || raw.to.x > 157 ||
                  typeof raw.to.y !== 'number' || raw.to.y > 24 || raw.to.y < 3 ||
                  typeof raw.to.n !== 'number') return resolve();
              this.db.editor.isEmptyLocation(raw.to.n, result => {
                if (result) return resolve();
                o.type = raw.type;
                o.place = [raw.x, raw.y, raw.to.n, raw.to.x, raw.to.y];
                resolve(o);
              });
              break;
            default: resolve();
          }
      } catch(err) {
        resolve();
        console.log(err);
      }
    });
  }
  landscape(raw) {
    try {
      if (typeof raw === 'object') {
        const o = {};
        if (typeof raw.x !== 'number' || raw.x < -80 || raw.x > 240 ||
            typeof raw.y !== 'number' || raw.y > 30 ||
            typeof raw.size !== 'number' ||
            typeof raw.skin !== 'number') return;
        if (raw.z) {
          if (typeof raw.z !== 'number') return;
          o.z = raw.z;
        }
        if (raw.seasonable) {
          if (raw.seasonable !== 1) return;
          o.seasonable = 1;
        }
        o.place = [raw.x, raw.y];
        o.size = raw.size;
        o.skin = raw.skin;
        return o;
      }
    } catch(err) {
      console.log(err);
    }
  }
  static include(db) {
    return new Validator(db);
  }
}

module.exports = Validator;
