'use strict'

const computeAll = /[^;\s]+/ig,
      computeOne = /[^=]+/g,
      deleteVersions = /[\d]*\.[\d\.]*/g,
      mapOfToken = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
      computeDevice = /\((.*?)\)/;

class Cookie {
  constructor(db, game) {
    this.db = db;
    this.game = game;
  }

  parse(raw) {
    try {
      if (raw) {
        raw = raw;
        const all = raw.match(computeAll);
        if (all) {
          const result = {}
          all.forEach(a => {
            a = a.match(computeOne);
            if (a) {
              if (a.length > 2) result[a[0]] = a.slice(1).join('=')
              else result[a[0]] = a[1];
            }
          });
          if (Object.keys(result).length) return result;
        }
      }
      return {}
    } catch (err) {
      console.log(err);
      return {}
    }
  }

  set(res, arr) {
    res.setHeader('set-cookie', arr.map(i => {
      return `${i.name}=${i.value || 0};expires=${i.expires || new Date(Date.UTC(new Date().getFullYear() + 5, 0, 0, 0, 0, 0)).toUTCString()};` +
             `Httponly=${i.httponly || false};SameSite=${i.samesite || 'Lax'}`;
    }));
  }

  computeDevice(req) {
    	const h = req.headers['user-agent'];
      if (h) {
        const d = h.match(computeDevice);
        if (d) return d[0].replace(deleteVersions, '');
      }
  }

  login(req, res, cat) {
    const device = this.computeDevice(req);
    if (device && !cat.auth.devices.some(a => a === device)) cat.auth.devices.push(device);
    this.set(res, [
      { name: 'token', value: cat.auth.cookie, httponly: true },
      { name: 'auth', value: 1 }
    ]);
  }

  generate(f = a => a) {
    let key = 'cwGame-';
    for(let i = 0; i < 32; i++) {
        	let index = Math.floor(Math.random() * mapOfToken.length);
       		key += mapOfToken[index];
  	}
    this.db.editor.findCat('auth', (err, cat) => {
      if (err) return;
      if (cat instanceof this.game.Cat) {
        if (cat.auth.cookie == key) return true;
      } else if (cat.cookie == key) return true;
    }, this.db.cats.total - 1).then(is => {
      if (is) this.generate(f)
      else f(key);
    });
  }

  // undefined нет печенек
  // < 0 (id игрока) есть, но не авторизован
  // > 0 (id игрока) есть и авторизован
  auth(req) {
    return new Promise((resolve, reject) => {
      const cookie = this.parse(req.headers.cookie),
            device = this.computeDevice(req);
      for (let i of this.db.cats.cache.values()) {
        if (i.auth.cookie == cookie.token && i.auth.devices.includes(device)) {
          if (cookie.auth == 1) return resolve(i.id)
          else return resolve(-i.id);
        }
      }
      this.db.editor.findCat('auth', (err, cat) => {
        if (err) return;
        if ((cat.cookie || cat.auth.cookie) == cookie.token &&
            (cat.devices || cat.auth.devices).includes(device)) return true;
      }).then(id => {
        if (cookie.auth == 1) resolve(id)
        else resolve(-id || undefined);
        //if id returns undefined, f(-id) will be NaN,
        //but we agree that the function returns undefined in same instance
      });
    });
  }

  static include(db, game) {
    return new Cookie(db, game);
  }
}

module.exports = Cookie;
