'use strict'

const fs = require('fs'),
      db = {
        cats: JSON.parse(fs.readFileSync(__dirname + '/cats/info.json', 'utf8')),
        locs: JSON.parse(fs.readFileSync(__dirname + '/locs/info.json', 'utf8')),
        other: JSON.parse(fs.readFileSync(__dirname + '/other.json', 'utf8'))
      },
      game = require('../lib/game.js').include(db, fs),
      cache = require('../lib/cache.js').include(fs),
      timeout = 1800000; //30 минут

{
  const dirs = fs.readdirSync(`${__dirname}/../img/play/landscape`);
  db.other.numberOfLandscapes = dirs.filter(a => /\d.svg/.test(a)).length;
}

db.time = new game.Time(db.other.time);
delete db.other.time;

class editorDB extends Map {
  constructor() {
    super();
    db.cats.cache = new Map();
    db.locs.cache = new Map();
    db.animals = new Map();
    db.placers = new Map();
  }

  isEmptyLocation(id, f = a => a) {
    if (id > db.locs.total) return f(-1);
    if (db.locs.cache.has(id)) return f(0);
    fs.access(`${__dirname}/locs/${id}/deleted.json`, 'utf8', err => {
      if (err) f(0)
      else f(1);
    });
  }

  getAreaNames(f = a => a) {
    fs.readFile(`${__dirname}/locs/areas.json`, 'utf8', (err, data) => {
      if (err) console.log(err);
      f(err, data);
    });
  }

  getInterfaceNumbers(f = a => a) {
    fs.readFile(`${__dirname}/locs/interfaces.json`, 'utf8', (err, data) => {
      if (err) console.log(err);
      f(err, data);
    });
  }

  //temp

  async findLost(alias, password, f = a => a) {
    const path = __dirname + '/lost';
    fs.readdir(path, async (err, dirs) => {
      if (err) return f(true), console.log(err);
      for (let i = 0; i < dirs.length; i++) {
        const result = await new Promise(resolve => {
          const localPath = path + '/' + dirs[i];
          fs.readFile(localPath, 'utf8', (err, data) => {
            if (err) return resolve(), console.log(err);
            try {
              data = JSON.parse(data);
              if (data.auth.alias === alias && data.auth.password === password) {
                resolve({data, deleteLost: () => {
                  fs.unlink(localPath, err => {
                    if (err) console.log(err);
                  });
                }});
              } else resolve();
            } catch (err) {
              resolve();
              console.log(err);
            }
          });
        });
        if (result) {
          f(null, result);
          return;
        }
      }
      f(null, null);
    });
  }

  //temp

  initCat(id, f = a => a) {
    if (db.cats.cache.has(id)) {
      db.cats.cache.get(id).changeLastOnline({cache:true});
      return f(null, db.cats.cache.get(id));
    }
    const raw = {},
          startPath = __dirname + `/cats/${id}/`;
    fs.readFile(startPath + 'auth.json', 'utf8', (err, data) => {
      try {
        if (err) return f(true);
        raw.auth = JSON.parse(data);
        fs.readFile(startPath + 'main.json', 'utf8', (err, data) => {
          try {
            if (err) return f(true);
            raw.main = JSON.parse(data);
            fs.readFile(startPath + 'game.json', 'utf8', (err, data) => {
              try {
                if (err) return f(true);
                raw.game = JSON.parse(data);
                f(null, new game.Player(id, raw));
              } catch(err) {
                f(true);
                console.log(err)
              }
            });
          } catch(err) {
            f(true);
            console.log(err)
          }
        });
      } catch(err) {
        f(true);
        console.log(err)
      }
    });
  }

  getCat(id, path, f) {
    return new Promise(resolve => {
      path = path ? path : a => a;
      if (db.cats.cache.has(id)) {
        db.cats.cache.get(id).changeLastOnline({cache:true});
        if (typeof path == 'string') resolve(f(null, db.cats.cache.get(id)))
        else resolve(path(null, db.cats.cache.get(id)));
        return;
      }
      if (typeof path == 'string') {
        f = f ? f : a => a;
        fs.readFile(__dirname + `/cats/${id}/${path}.json`, 'utf8', (err, data) => {
          if (err) return console.log(err), resolve(f(err));
          resolve(f(null, JSON.parse(data)));
        });
      } else {
        f = path;
        this.initCat(id, (err, cat) => {
          if (err) return resolve(f(err));
          cat.changeLastOnline({cache:true});
          resolve(f(null, cat));
        });
      }
    });
  }

  getLocation(id, path, f, dontParseAsJSON) {
    return new Promise(resolve => {
      path = path ? path : a => a;
      if (typeof path === 'string') {
        f = f ? f : a => a;
        if (path === 'cached' && !dontParseAsJSON && db.locs.cache.has(id)) return resolve(f(null, db.locs.cache.get(id)));
        path = `${__dirname}/locs/${id}/${path}.json`;
        fs.access(path, err => {
          if (err) return resolve(f(-2)), console.log(err);
          fs.readFile(path, 'utf8', (err, data) => {
            try {
              if (err) throw err;
              resolve(dontParseAsJSON ? f(null, data) : f(null, JSON.parse(data)));
            } catch (err) { console.log(err); resolve(f(true)) }
          });
        });
      } else {
        f = path;
        if (db.locs.cache.has(id)) return resolve(f(null, db.locs.cache.get(id)));
        path = `${__dirname}/locs/${id}/cached.json`;
        fs.access(path, err => {
          if (err) return resolve(f(-2)), console.log(err);
          fs.readFile(path, 'utf8', (err, data) => {
            try {
              if (err) throw err;
              resolve(f(null, new game.Location(id, JSON.parse(data))));
            } catch (err) { console.log(err); resolve(f(true)) }
          });
        });
      }
    });
  }

  setPartOfLocation(id, path, data, f = a => a) {
    try {
      fs.writeFile(`${__dirname}/locs/${id}/${path}.json`, JSON.stringify(data), f);
    } catch (err) {
      console.log(err);
      f(true);
    }
  }

  //проверь, что выполнение останавливается после того, как найдется элемент
  async findCat(path, f, start = db.cats.total) {
    for (let id = start; id > 0; id--) {
      if (await this.getCat(id, path, f)) return id;
    }
  }

  async findLocation(path, f, start = db.locs.total) {
    for (let id = start; id > 0; id--) {
      if (await this.getLocation(id, path, f)) return id;
    }
  }

  getKnowledge(activeID, passiveID, f = a => a) {
    const path = __dirname + `/cats/${passiveID}/knowledge/${activeID}.json`;
    fs.access(path, err => {
      if (err) return f(null, null);
      fs.readFile(path, 'utf8', (err, data) => {
        if (err) return console.log(err), f(err);
        try {
          f(null, JSON.parse(data));
        } catch (err) {
          console.log(err);
          f(err);
        }
      });
    });
  }

  setKnowledge(activeID, passiveID, data = {}) {
    try {
      const path = __dirname + `/cats/${passiveID}/knowledge/${activeID}.json`;
      fs.writeFile(path, JSON.stringify(data), err => {
        if (err) return console.log(err);
      });
    } catch (err) {
      console.log(err);
    }
  }
  clear() {
    for (let cat of db.cats.cache.values()) {
      if (Date.now() - cat.lastOnline > timeout &&
          Date.now() - cat.main.lastOnline > timeout &&
          Date.now() - cat.game.lastOnline > timeout) {
            cat.delete();
            cat.save();
      }
    }
  }
  saveCatsInfo() {
    return new Promise(resolve => {
      fs.writeFile(__dirname + '/cats/info.json', JSON.stringify(db.cats), err => {
        if (err) console.log(err);
        resolve();
      });
    });
  }
  saveLocsInfo() {
    return new Promise(resolve => {
      fs.writeFile(__dirname + '/locs/info.json', JSON.stringify(db.locs), err => {
        if (err) console.log(err);
        resolve();
      });
    });
  }
  saveOtherInfo() {
    return new Promise(resolve => {
      fs.writeFile(__dirname + '/other.json', JSON.stringify({time: db.time.now()}), err => {
        if (err) console.log(err);
        resolve();
      });
    });
  }
  async saveAll(f = a => a) {
    for (let cat of db.cats.cache.values()) await cat.save();
    for (let loc of db.locs.cache.values()) await loc.save();
    await this.saveLocsInfo();
    await this.saveCatsInfo();
    await this.saveOtherInfo();
    f();
  }
}

db.editor = new editorDB();
setInterval(db.editor.clear, 2700000); //45 минут

module.exports = {db, game, fs, cache}
