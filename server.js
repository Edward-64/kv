'use strict'

const http = require('http'),
      url = require('url'),
      {db, game, fs, cache} = require('./db/boot.js'),
      svgo = require('./lib/svgo.js').include(fs),
      mail = require ('./lib/mail.js').include(fs),
      templtr = require('./lib/templater.js').include(fs),
      cookie = require('./lib/cookie.js').include(db, game),
      validator = require('./lib/validator.js').include(db),
      skins = require('./lib/skins.js').include(fs),
      kv = {
        mime: {
          json: 'application/json',
          text: 'text/plain',
          css: 'text/css',
          js: 'application/javascript',
          svg: 'image/svg+xml',
          icon: 'image/vnd.microsoft.icon'
        },
        posts: new Set(['/createCharacter', '/activeCharacter', '/changeAliasAndPassword',
                        '/editLocation', '/uploadFile'])
      };

process.on('SIGTERM', () => {
  db.editor.saveAll(process.exit);
});

const server = http.createServer(async (req, res) => {
  const u = url.parse(req.url, true),
        c = await cookie.auth(req);
  let client;
  if (c > 0) {
    await db.editor.getCat(c, (err, cat) => {
      if (err) return;
      cat.changeLastOnline({site: true});
      client = cat;
    });
    if (!client) return error500(res);
  }
  if (req.method == 'GET') {
    if (cache.set(res, u.pathname, req.headers['if-none-match'])) return;
    switch (u.pathname) {
      case '/': sendHTML(res); break;
      case '/createCharacter':
        if (c < 0) {
          db.editor.getCat(-c, (err, cat) => {
            if (err) return sendJSON(res);
            sendJSON(res, {code:2, name: cat.game.name})
          });
        } else if (c > 0) {
          sendJSON(res, {code:3});
        } else {
          templtr.getDinamicContent('create-character', (err, html) => {
            if (err) return sendJSON(res);
            sendJSON(res, {code: 1, html, js: 'create-character'});
          });
        } break;
      case '/deactiveCharacter':
        cookie.set(res, [{ name: 'auth', value: 0}]);
        sendJSON(res, {code: 1}); break;
      case '/activeCharacter':
        if (c)
          db.editor.getCat(c > 0 ? c : -c, (err, cat) => {
            if (err) return sendJSON(res);
            cookie.set(res, [{ name: 'auth', value: 1}]);
            sendJSON(res, {code: c > 0 ? 2 : 3, name: cat.game.name});
          })
        else
          templtr.getDinamicContent('activation', (err, html) => {
            if (err) return sendJSON(res);
            sendJSON(res, {code: 1, js: 'activation', html});
          });
        break;
      case '/play':
        if (c > 0) {
          if (u.query.from === 'cmd') {
            if (client.main.tmp.dontCreateSkin) {
              templtr.getDinamicContent('create-skin', (err, html) => {
                if (err) return sendJSON(res);
                sendJSON(res, {code: 3, html, js: 'create-skin'});
              });
            } else sendJSON(res, {code: 1});
          } else {
            if (client.main.tmp.dontCreateSkin) {
              sendHTML(res, {
                path: 'error',
                title: 'КВ | Недоступно',
                error: 'Открытый мир пока что недоступен, потому что Вы не закончили создание персонажа. Вернитесь на <a href="/">главную страницу</a> и мяукните «играть».'
              });
            } else sendHTML(res, templtr.game);
          }
        } else {
          if (u.query.from === 'cmd') sendJSON(res, {code: 2})
          else {
            res.statusCode = 403;
            sendHTML(res);
          }
        } break;
      case '/getCookie':
        if (c > 0) sendJSON(res, {code: 1, headers: req.headers})
        else sendJSON(res); break;
      case '/createSkin':
        if (c > 0) {
          const result = validator.createSkin(u.query);
          if (result) {
            skins.catSkin((err, key) => {
              if (err) return sendJSON(res);
              if (typeof result.name === 'string' && result.name.length < 45) {
                client.game.name = result.name;
                db.editor.getKnowledge(client.id, client.game.parents[0], (err, kn) => {
                  if (err || kn === null) return;
                  kn.name = result.name;
                  db.editor.setKnowledge(client.id, client.game.parents[0], kn);
                });
              }
              client.game.skin = key;
              client.game.sex = u.query.sex ? 0 : 1;
              delete client.main.tmp.dontCreateSkin;
              client.save();
              sendJSON(res, {code: 1});
            }, result)
          } else sendJSON(res, {code: 0, reason: 6});
        } else sendJSON(res);
        break;
      case '/parseAnotherMeow':
        const query = decodeURI(u.query.meow);
        if (/(созда(й|ть)|конструктор|редакт(ировать|ор)) локаци(й|ю|и)/.test(u.query.meow)) {
          if (client && client.checkRights(3)) {
            sendJSON(res, {code: 3, url: '/locedit'});
          } else sendJSON(res, {code: 0, reason: 'Это действие пока что недоступно... но это пока что :)'})
          break;
        }
        let p = query.match(/.*([усп]{1}|установи|установить|снять|сними|проверь|проверить) прав[ао]? (admin|админ|cmd|кмд|коммандер|\d|).*(\d).*/i);
        if (p) {
          let n = query.match(/\d+/g);
          if (p.length === 4 && n && n.length < 3) {
            n = n.map(a => +a);
            let rights, id;
            if (n.length === 2) {
              if (n[0] > 30) return sendJSON(res, {code: 0, reason: 'Бит состояния не должен превышать 30-ти'});
              rights = n[0];
              id = n[1];
            } else {
              rights = p[2];
              id = n[0];
            }
            db.editor.getCat(id, (err, cat) => {
              if (err)
                if (err.code === 'ENOENT') return sendJSON(res, {code: 1, msg: 'Игрока с таким ID не существует'})
                else return sendJSON(res);
              if (rights === 'коммандер') rights = 'cmd';
              switch (p[1]) {
                case 'у': case 'установи': case 'установить':
                if (client && client.checkRights('admin')) {
                  if (rights !== '') {
                    cat.setRights(rights);
                    sendJSON(res, {code: 1, msg: 'Права установлены'});
                  } else sendJSON(res, {code: 0, reason: 'Вы где-то ошиблись. Может, не указали права или ID?'});
                } else sendJSON(res, {code: 0, reason: 10});
                break;
                case 'с': case 'снять': case 'сними':
                if (client && client.checkRights('admin')) {
                  if (rights !== '') {
                    cat.cutRights(rights);
                    sendJSON(res, {code: 1, msg: 'Права сняты'});
                  } else sendJSON(res, {code: 0, reason: 'Вы где-то ошиблись. Может, не указали права или ID?'});
                } else sendJSON(res, {code: 0, reason: 10});
                break;
                case 'п': case '': case 'проверь': case 'проверить':
                  sendJSON(res, {
                    code: 1,
                    msg: (p[2] === '' ? '' : `${cat.checkRights(rights) ? 'Имеет право' : 'Не имеет право'}. `) +
                         `Состояние: ${cat.main.rights.toString(2)}`
                  });
                break;
              }
            });
          } else sendJSON(res, {code: 0, reason: 12});
          return;
        }
        sendJSON(res, {code: 0, reason: 11});
        break;
      case '/password':
        if (c) return sendJSON(res);
        if (u.query.token) {
          mail.checkToken(u.query.token, err => {
            if (err) {
              sendHTML(res, {
                path: 'error',
                title: 'КВ | Недоступно',
                error: err === 3 ? 'Ссылка устарела. Запросите восстановление повторно.' : 'Восстановление по этой ссылке невозможно.'
              });
              if (err !== 2) mail.deleteToken(u.query.token);
            } else
              sendHTML(res, {
                path: 'main',
                styles: ['site'],
                scripts: ['recover-password'],
                title: 'КВ | Восстановление персонажа',
                body: 'recover-password'
              });
          });
        } else if (u.query.mail) {
          db.editor.findCat('auth', (err, cat) => {
            if (err) return;
            if ((cat.auth || cat).mail === u.query.mail) return true;
          }).then(id => {
            if (id)
              mail.createToken(id, (err, token) => {
                if (err) return sendJSON(res);
                db.editor.getCat(id, (err, cat) => {
                  if (err) return sendJSON(res);
                  cat.auth.recoveryToken = token;
                  mail.send({to: u.query.mail, token}, error => {
                    switch (error) {
                      case null: sendJSON(res, {code: 1}); break;
                      case 1: sendJSON(res, {code: 0, reason: 14}); break;
                      case 2: sendJSON(res, {code: 0, reason: 15}); break;
                      case 3: sendJSON(res); break;
                    }
                  })
                });
              })
            else
              sendJSON(res, {code: 0, reason: 13});
          });
        } else sendJSON(res);
        break;
      case '/locedit':
        let body = 'locedit-no-creater';
        if (u.query.get == 'startset') {
          db.editor.getAreaNames((err, areas) => {
            if (err) return sendJSON(res);
            db.editor.getInterfaceNumbers((err, interfaces) => {
              if (err) return sendJSON(res);
              sendJSON(res, {code: 1, data: {
                landscapes: db.other.numberOfLandscapes,
                clientID: client ? client.id : undefined,
                interfaces,
                areas
              }});
            })
          });
          //поток останавливается break`ами
          break;
        }
        if (client && client.checkRights(3)) {
          body = 'locedit';
          if (u.query.get == 'location') {
            let id = u.query.id ? +u.query.id : await db.editor.findLocation('cached', (err, loc) => {
                if (err) return;
                if (loc.name === u.query.name) return true;
              });
            if (id === undefined) return sendJSON(res, {code: 0, reason: 'Локация не найдена'});
            db.editor.getLocation(id, (err, loc) => {
              if (err) {
                if (err === -2) sendJSON(res, {code: 0, reason: 'Локация не найдена'})
                else sendJSON(res);
                return;
              }
              db.editor.getLocation(id, 'landscape', (err, landscape) => {
                if (err) return sendJSON(res);
                const interfaces = [];
                loc.interface.forEach(a => interfaces.push(a.toSave()));
                sendJSON(res, {
                  code: 1,
                  data: {
                    id,
                    landscape,
                    interface: interfaces,
                    area: loc.area,
                    name: loc.name
                  }
                });
              }, true);
            });
            break;
          }
          if (u.query.savetmp) {
            const id = ++db.other.numberOfLandscapes;
            fs.rename(`${__dirname}/tmp/${client.id}.svg`, `${__dirname}/img/play/landscape/${id}.svg`, err => {
              if (err) {
                if (err.code === 'ENOENT') sendJSON(res, { code: 0, reason: 'Объект не загружен на сервер'});
                else rsendJSON(res);
                return;
              }
              sendJSON(res, { code: 1 });
            });
            break;
          }
        }
        sendHTML(res, {
          path: 'main',
          styles: ['play'],
          scripts: ['locedit'],
          title: 'КВ | Редактор локаций',
          body
        });
        break;
      case '/js/cmd.js': sendStatic(res, '/js/cmd.js', 'js'); break;
      case '/js/play.js': sendStatic(res, '/js/play.js', 'js'); break;
      case '/js/md.js': sendStatic(res, '/js/md.js', 'js'); break;
      case '/js/activation.js': sendStatic(res, '/js/activation.js', 'js'); break;
      case '/js/create-character.js': sendStatic(res, '/js/create-character.js', 'js'); break;
      case '/js/create-skin.js': sendStatic(res, '/js/create-skin.js', 'js'); break;
      case '/js/recover-password.js': sendStatic(res, '/js/recover-password.js', 'js'); break;
      case '/js/locedit.js':
        if (client && client.checkRights(3)) sendStatic(res, '/js/locedit.js', 'js');
        else sendStatic(res, '/js/locedit-no-creater.js', 'js');
        break;
      case '/css/site.css': sendStatic(res, '/css/site.css', 'css'); break;
      case '/css/play.css': sendStatic(res, '/css/play.css', 'css'); break;
      case '/favicon.ico': sendStatic(res, '/img/favicon.ico', 'icon'); break;
      case '/temp': sendStatic(res, '/img/template.svg', 'svg'); break;
      case '/img/skin':
        if (validator.isCorrectReq(u.query.r)) sendStatic(res, `/img/skin/${u.query.r}.svg`, 'svg');
        else error400(res); break;
        case '/img/play':
        if (validator.isCorrectReq(u.query.r)) sendStatic(res, `/img/play/${u.query.r}.svg`, 'svg');
        else error400(res); break;
      case '/img/play/area':
        if (validator.isCorrectReq(u.query.r)) sendStatic(res, `/img/play/area/${u.query.r}.svg`, 'svg');
        else error400(res); break;
      case '/img/play/landscape':
        if (validator.isCorrectReq(u.query.r)) sendStatic(res, `/img/play/landscape/${u.query.r}.svg`, 'svg');
        else error400(res); break;
      case '/img/site':
        if (validator.isCorrectReq(u.query.r)) sendStatic(res, `/img/site/${u.query.r}.svg`, 'svg');
        else error400(res); break;
      case '/tmp':
        if (validator.isCorrectReq(u.query.r)) sendStatic(res, `/tmp/${u.query.r}.svg`, 'svg');
        else error400(res); break;
      case '/img/head.svg': sendStatic(res, '/img/head.svg', 'svg'); break;
      case '/img/left_vine.svg': sendStatic(res, '/img/left_vine.svg', 'svg'); break;
      case '/img/right_vine.svg': sendStatic(res, '/img/right_vine.svg', 'svg'); break;
      case '/img/stick.svg': sendStatic(res, '/img/stick.svg', 'svg'); break;
      case '/img/vertical_vine.svg': sendStatic(res, '/img/vertical_vine.svg', 'svg'); break;
      default: error404(res);
    }
  } else if (req.method == 'POST' && kv.posts.has(u.pathname)) {
    let body = '', stop = false;
  	if (+req.headers['content-length'] > 2097152) return sendJSON(res, { code: 0, reason: 8 });
  	req.on('data', chunk => {
      if (stop) return;
  		body += chunk;
  		if (body.length > 2097152) {
        stop = true;
        sendJSON(res, { code: 0, reason: 8 });
      }
  	});
  	req.on('end', async () => {
      if (stop) return;
  		try {
        if (/image\/svg\+xml/.test(body))
          body = {
            type: 'svg',
            data: (await svgo.optimize(body.replace(/\n/g, '').match(/<svg.*svg>/)[0])).data
          };
        else body = JSON.parse(body);
  			switch (u.pathname) {
  				case '/createCharacter':
            if (c) return sendJSON(res, {code: 0, reason: 9});
            validator.aliasAndPassword(body, error => {
              if (error) return sendJSON(res, {code: 0, reason: error});
              const id = ++db.cats.total;
              fs.mkdir(__dirname + `/db/cats/${id}`, err => {
                if (err && err.code != 'EEXIST') return console.log(err), sendJSON(res);
                fs.mkdir(__dirname + `/db/cats/${id}/knowledge`, err => {
                if (err && err.code != 'EEXIST') return console.log(err), sendJSON(res);
                const auth = {
                  alias: body.alias,
                  password: body.password,
                  devices: [cookie.computeDevice(req)] || []
                }
                if (validator.email(body.mail)) auth.mail = body.mail;
                cookie.generate(result => {
                  auth.cookie = result;
                  fs.writeFile(__dirname + `/db/cats/${id}/auth.json`, JSON.stringify(auth), err => {
                    if (err) return console.log(err), sendJSON(res);
                    fs.writeFile(__dirname + `/db/cats/${id}/main.json`, '{}', err => {
                      if (err) return console.log(err), sendJSON(res);
                      fs.writeFile(__dirname + `/db/cats/${id}/game.json`, '{}', err => {
                        if (err) return console.log(err), sendJSON(res);
                        db.editor.initCat(id, (err, cat) => {
                          if (err) return sendJSON(res);
                          cat.main.tmp.dontCreateSkin = true;
                          cookie.login(req, res, cat);
                          templtr.getDinamicContent('create-skin', (err, html) => {
                            if (err) return sendJSON(res);
                            sendJSON(res, {code: 1, html, js: 'create-skin'});
                          });
                          cat.save();
                          db.editor.saveCatsInfo();
                        });
                      });
                    });
                  });
                });
              });
            });
          }); break;
          case '/activeCharacter':
            if (c > 0) return sendJSON(res);
            db.editor.findCat('auth', (err, cat) => {
              if (err) return;
              if ((cat.alias || cat.auth.alias) === body.alias &&
                  (cat.password || cat.auth.password) === body.password) return true;
            }).then(id => {
              if (id)
                db.editor.initCat(id, (err, cat) => {
                  if (err) return sendJSON(res);
                  cookie.login(req, res, cat);
                  sendJSON(res, {code: 1});
                })
              else {
              //temp
                db.editor.findLost(body.alias, body.password, (err, cat) => {
                  if (err) return sendJSON(res);
                  if (cat) {
                    const id = ++db.cats.total;
                    fs.mkdir(__dirname + `/db/cats/${id}`, err => {
                      if (err && err.code != 'EEXIST') return console.log(err), sendJSON(res);
                      fs.mkdir(__dirname + `/db/cats/${id}/knowledge`, err => {
                        if (err && err.code != 'EEXIST') return console.log(err), sendJSON(res);
                        cat.data.auth.devices = [cookie.computeDevice(req)] || [];
                        cookie.generate(result => {
                          cat.data.auth.cookie = result;
                          fs.writeFile(__dirname + `/db/cats/${id}/auth.json`, JSON.stringify(cat.data.auth), err => {
                            if (err) return console.log(err), sendJSON(res);
                            fs.writeFile(__dirname + `/db/cats/${id}/main.json`, JSON.stringify(cat.data.main), err => {
                              if (err) return console.log(err), sendJSON(res);
                              fs.writeFile(__dirname + `/db/cats/${id}/game.json`, JSON.stringify(cat.data.game), err => {
                                if (err) return console.log(err), sendJSON(res);
                                db.editor.initCat(id, (err, recoverCat) => {
                                  if (err) return sendJSON(res);
                                  recoverCat.main.tmp.dontCreateSkin = true;
                                  cookie.login(req, res, recoverCat);
                                  sendJSON(res, {code: 1});
                                  cat.deleteLost();
                                  recoverCat.save();
                                  db.editor.saveCatsInfo();
                                });
                              });
                            });
                          });
                        });
                      });
                    });

                    //temp

                  } else sendJSON(res, {code: 0, reason: 6});
                });
              }
            });
            break;
          case '/changeAliasAndPassword':
            if (c) return sendJSON(res, {code: 0, reason: 9});
            validator.aliasAndPassword(body, error => {
              if (error || typeof body.token !== 'string') return sendJSON(res, {code: 0, reason: error});
              mail.checkToken(body.token, (err, id) => {
                switch (err) {
                  case null:
                    db.editor.getCat(id, (err, cat) => {
                      if (err) return sendJSON(res);
                      delete cat.auth.recoveryToken;
                      cat.auth.alias = body.alias;
                      cat.auth.password = body.password;
                      cookie.login(req, res, cat);
                      sendJSON(res, {code: 1});
                    });
                    break;
                  case 1: sendJSON(res); break;
                  case 2: sendJSON(res, {code: 0, reason: 'Восстановление по этой ссылке невозможно'}); break;
                  case 3: sendJSON(res, {code: 0, reason: 'Ссылка устарела. Запросите восстановление повторно'}); break;
                }
                mail.deleteToken(body.token);
              });
            });
            break;
          case '/uploadFile':
            if (client)
              switch (body.type) {
                case 'svg':
                  switch (u.query.target) {
                    case 'landscape':
                      if (client.checkRights(3)) {
                        fs.writeFile(`${__dirname}/tmp/${client.id}.svg`, body.data, err => {
                          if (err) return sendJSON(res);
                          sendJSON(res, { code: 1 });
                        });
                      }
                      break;
                  }
                  break;
              }
            break;
          case '/editLocation':
            if (client && client.checkRights(3)) {
              if (validator.editLocation(body)) return sendJSON(res);
              const newLandscape = [], newInterfaces = [];
              for (let i = 0; i < body.newInterfaces.length; i++) {
                const result = await validator.interface(body.newInterfaces[i]);
                if (result) newInterfaces.push(result)
                else return sendJSON(res);
              }
              for (let i = 0; i < body.newLandscape.length; i++) {
                const result = validator.landscape(body.newLandscape[i]);
                if (result) newLandscape.push(result)
                else return sendJSON(res);
              }
              if (body.state) {
                //new location
                const id = ++db.locs.total,
                      path = `${__dirname}/db/locs/${id}`;
                fs.mkdir(path, err => {
                  if (err && err.code !== 'EEXIST') return console.log(err), sendJSON(res);
                  fs.writeFile(path + '/cached.json', JSON.stringify({
                    name: body.name,
                    area: body.area,
                    interface: newInterfaces
                  }), err => {
                    if (err && err.code !== 'EEXIST') return console.log(err), sendJSON(res);
                    fs.writeFile(path + '/landscape.json', JSON.stringify(newLandscape), err => {
                      if (err && err.code !== 'EEXIST') return console.log(err), sendJSON(res);
                      sendJSON(res, {code: 1});
                      db.editor.saveLocsInfo();
                    });
                  });
                });
              } else {
                db.editor.getLocation(body.id, (err, loc) => {
                  if (err) return sendJSON(res);
                  db.editor.getLocation(body.id, 'landscape', (err, land) => {
                    if (err) return sendJSON(res);
                    while (body.removedLandscape.length) {
                      const elem = body.removedLandscape[0],
                            i = land.findIndex(a =>
                              elem.x === a.place[0] &&
                              elem.y === a.place[1] &&
                              elem.z === a.z &&
                              elem.size === a.size &&
                              elem.skin === a.skin
                            );
                      if (i !== -1) land.splice(i, 1);
                      body.removedLandscape.shift();
                    }
                    while (body.removedInterfaces.length) {
                      const elem = body.removedInterfaces[0];
                      for (let a of loc.interface)
                        if (a[1].game.place[0] == elem.x &&
                            a[1].game.place[1] == elem.y) {
                              a[1].delete();
                              break;
                            }
                      body.removedInterfaces.shift();
                    }
                    while (newLandscape.length) {
                      land.push(newLandscape[0]);
                      newLandscape.shift();
                    }
                    while (newInterfaces.length) {
                      game.Interface.create(newInterfaces[0]).move(loc.id);
                      newInterfaces.shift();
                    }
                    if (body.name) loc.name = body.name;
                    if (body.area) loc.area = body.area;
                    db.editor.setPartOfLocation(body.id, 'landscape', land, err => {
                      if (err) sendJSON(res);
                      sendJSON(res, {code: 1});
                    });
                  });
                });
              }
            } else sendJSON(res, {code: 0, reason: 10});
  			}
  		} catch(err) {
  			console.log(err);
  		}
  	});
  }
}).listen(8080, () => console.log('server is running'));

const WebSocket = require('ws'),
      wss = new WebSocket.Server({ server }),
      playClients = [];

wss.on('connection', (ws, req) => {
  switch (req.headers['sec-websocket-protocol']) {
    case 'play': {
      ws.on('message', async m => {
        try {
          const {code, msg} = JSON.parse(m);
          if (code == 100) {
            const result = msg ? await cookie.auth({headers: msg}) : 0;
            if (result > 0) {
              return db.editor.getCat(result, async (err, cat) => {
                if (err || cat.main.tmp.dontCreateSkin) return ws.close(4000);
                ws.cat = cat;
                ws.id = cat.id;
                playClients.push(ws);
                updateLinks(playClients, cat.id);
                cat.changeLastOnline({game: true});
                cat.wakeup();
                db.editor.getLocation(cat.game.place[2], async (err, loc) => {
                  if (err) return ws.close(4000);
                  loc.in(cat);
                  ws.place = cat.game.place[2];
                  sendWS('one', {
                    code: 100,
                    msg: {
                      id: result,
                      loc: await loc.toClient(),
                      time: db.time.getDate(),
                      stack: cat.game.stack,
                      name: cat.game.name,
                      clan: game.Game.getClanAsText(cat.game.clan)
                    }
                  }, ws.links);
                  sendWS('loc', {code: 107, msg: cat.toClient()}, cat.game.place[2]);
                });
              });
            } else return ws.close(4000);
          }
          //console.log(`[${code}]: \n`, msg);

          if (!ws.cat) {
            await db.editor.getCat(ws.id, (err, cat) => {
              if (err) return ws.close(4000);
              ws.cat = cat;
              ws.place = cat.game.place[2];
            });
          }

          if (validator.play(code, msg, ws)) return;
          ws.cat.changeLastOnline({game: true});
          const id = ws.id;
          switch (code) {
            case 101:
              if (parseCmd(msg, ws)) return;
              sendWS('loc', {code, msg: {text: msg, id}}, ws.cat.game.place[2]);
              break;
            case 102:
              const result = await ws.cat.walk(msg.place);
              if (await ws.cat.walk(msg.place))
                return sendWS('loc', {
                    code: 114,
                    msg: { id, dir: ws.cat.game.dir }
                  }, ws.cat.game.place[2]);
              sendWS('loc', {
                code: 104,
                msg: {
                  id,
                  place: msg.place,
                  speed: ws.cat.getDinamic('speed'),
                  dir: ws.cat.game.dir
                }
              }, ws.cat.game.place[2]);
              if (msg.path) {
                ws.cat.needMoving = async () => {
                  const pastPlace = ws.cat.game.place[2],
                        result = await ws.cat.move(msg.path);
                  if (result) {
                    const nowPlace = ws.cat.game.place[2];
                    ws.links.forEach(a => {
                      a.place = nowPlace;
                    });
                    sendWS('one', {code: 105, msg: result}, ws.links);
                    if (ws.cat.checkAction(5)) {
                      switch (game.Game.id(ws.cat.eating)) {
                        case 1:
                          db.editor.getCat(ws.cat.eating, (err, cat) => {
                            if (err) return;
                            const aWS = getWS(playClients, cat.id);
                            aWS.forEach(a => {
                              a.place = nowPlace;
                            });
                            sendWS('one', {code: 105, msg: result}, aWS);
                            sendWS('loc', {code: 106, msg: [id, cat.id]}, pastPlace);
                            sendWS('loc', {code: 107, msg: [ws.cat.toClient(), cat.toClient()]}, nowPlace);
                          });
                          break;
                        case 2:
                          break;
                        case 3:
                          break;
                      }
                    } else {
                      sendWS('loc', {code: 106, msg: id}, pastPlace);
                      sendWS('loc', {code: 107, msg: ws.cat.toClient()}, nowPlace);
                    }
                  }
                }
              }
              break;
            case 104:
              sendWS('one', {code:108, msg: db.time.getDate()}, ws.links)
              break;
            case 107:
              if (msg) ws.cat.wakeup()
              else ws.cat.sleep();
              break;
            case 108:
              if (msg) ws.cat.sitdown()
              else ws.cat.standup();
              break;
            case 103:
              ws.cat.getKnowledge(msg, (err, kn) => {
                if (err) return;
                sendWS('one', {code: 115, msg: {id: msg, kn}}, ws.links);
              });
              break;
            case 111:
              ws.cat.eat(msg, ws.links);
              break;
            case 112:
              ws.cat.spitout();
              break;
            case 109:
              if (db.cats.cache.has(msg)) {
                db.editor.getCat(msg, (err, cat) => {
                  if (err) return sendWS('one', {code: 103}, ws.links);
                  if (cat.game.place[2] != ws.cat.game.place[2]) return;
                  const stack = cat.game.stack.find(a => {
                    if (a.id == id && a.type === 0) return true;
                  });
                  if (stack) {
                    if (cat.game.sex) sendWS('one', {code: 102, msg: `Я уже спрашивал${ws.cat.game.sex ? '': 'а'}, но он мне пока что не ответил.`}, ws.links)
                    else sendWS('one', {code: 102, msg: `Я уже спрашивал${ws.cat.game.sex ? '': 'а'}, но она мне пока что не ответила.`}, ws.links);
                    return;
                  }
                  if (cat.range(ws.cat)) sendWS('one', {code: 116, msg: id}, getWS(playClients, cat.id))
                  else return sendWS('one', {code: 102, msg: `Нужно подойти ближе.`}, ws.links);
                  cat.game.stack.push({id, type: 0});
                })
              } else sendWS('one', {code: 102, msg: `cat=${msg} спит. Не стоит тревожить.`}, ws.links);
              break;
            case 110: {
              const stack = ws.cat.game.stack.findIndex(a => {
                if (a.id === msg.id && a.type === 0) return true;
              });
              if (stack !== -1) {
                if (db.cats.cache.has(msg.id))
                  db.editor.getCat(msg.id, (err, cat) => {
                    if (err) return sendWS('one', { code: 103 }, ws.links);
                    if (cat.game.place[2] !== ws.cat.game.place[2]) {
                      sendWS('one', {
                        code: 102,
                        msg: `cat=${msg.id} слишком далеко от меня. Ответить не получится.`
                      }, ws.links);
                      return ws.cat.game.stack.splice(stack, 1);
                    }
                    if (msg.responses === undefined || Object.keys(msg.responses).every(a => msg.responses[a] === ''))
                      sendWS('one', {
                        code: 102,
                        msg: `cat=${id} не хочет рассказывать о себе.`
                      }, getWS(playClients, msg.id));
                    else
                      cat.getKnowledge(id, (err, kn) => {
                        if (err) return;
                        if (kn === null) kn = {};
                        if (msg.responses.name) kn.name = msg.responses.name;
                        if (msg.responses.clan) kn.clan = msg.responses.clan;
                        cat.setKnowledge(id, kn);
                        sendWS('one', {
                          code: 117,
                          msg: { id, responses: msg.responses}
                        }, getWS(playClients, msg.id));
                      });
                    ws.cat.game.stack.splice(stack, 1);
                  })
                else {
                  sendWS('one', {
                    code: 102,
                    msg: `cat=${msg.id} спит. Ответить не получится.`
                  }, ws.links);
                  ws.cat.game.stack.splice(stack, 1);
                }
              }
              break;
            }
          }
        } catch (err) {
          console.log(err);
          sendJSON(res);
        }
      });
      ws.on('close', code => {
        const time = Date.now();
        if (ws.cat)
          if (code == 1001)
            setTimeout(() => {
              if (!playClients.some(e => e.cat == ws.cat)) ws.cat.sleep();
            }, 5000)
          else ws.cat.sleep();
        let a = playClients.indexOf(ws);
        if (a != -1) {
          const remove = playClients.splice(a, 1)[0].links;
          a = remove.indexOf(ws);
          if (a != -1) delete remove.splice(a, 1)[0];
        }
      }); break;
    }
  }
});

function rus(word) {
  try {
    return word
    .replace(/.*сайт.*/, 'main')
    .replace(/.*игра.*/, 'game')
  } catch (err) {
    console.log(err);
  }
}

function parseCmd(msg, ws) {
  try {
    if (msg.startsWith('=') && ws.cat.checkRights('cmd')) {
      const result = { code: 102 },
            enoent = { code: 103, msg: 'Игрока с таким ID не существует'};
      msg = msg.match(/[а-яё\d]+/ig);
      switch (msg[0]) {
        case 'клиенты':
          if (/п/.test(msg[1]))
            result.msg = playClients.map(a => ({
              id: a.cat.id,
              readyState: a.readyState,
              lastOnline: {
                cache: new Date(a.cat.lastOnline).toString(),
                site: new Date(a.cat.main.lastOnline).toString(),
                game: new Date(a.cat.game.lastOnline).toString()
              }
            }))
          else result.msg = playClients.length;
          sendWS('one', result, ws.links);
          break;
        case 'игрок':
          if (msg[2] == undefined) {
              db.editor.getCat(+msg[1], (err, cat) => {
                if (err) {
                  if (err.code == 'ENOENT') sendWS('one', enoent, ws.links);
                  return;
                }
                result.msg = {
                  game: cat.game,
                  main: cat.main
                }
                sendWS('one', result, ws.links);
              });
          } else {
            const query = rus(msg[2]);
            if (query == msg[2]) return sendWS('one', {code:103, msg:`Неизвестный раздел ${msg[2]}`}, ws.cat.links);
            db.editor.getCat(+msg[1], query, (err, cat) => {
              if (err) {
                if (err.code == 'ENOENT') sendWS('one', enoent, ws.links);
                return;
              }
              if (cat instanceof game.Cat) result.msg = cat[query]
              else result.msg = cat;
              sendWS('one', result, ws.links);
            });
          }
          break;
        case 'локация':
          db.editor.getLocation(+msg[1], (err, loc) => {
            if (err) {
              if (err.code == 'ENOENT') {
                result.code = 103;
                result.msg = 'Локации с таким ID не существует';
                sendWS('one', result, ws.links);
              }
              return console.log(err);
            }
            result.msg = loc;
            sendWS('one', result, ws.links);
          });
          break;
        default:
          result.code = 103;
          result.msg = `Неизвестная команда "${msg.join(' ')}"`;
          sendWS('one', result, ws.links);
      }
      return true;
    }
  } catch(err) {
    console.log(err);
  }
}

db.playClients = playClients;
function getWS(where, id) {
  const ws = where.find(e => e.id == id);
  if (ws) return ws.links;
  return [];
}
db.getWS = getWS;

function updateLinks(where, id) {
  const all = where.filter(e => {
    if (e.id == id) return true;
  });
  all.forEach(a => {
    if (a.cat) {
      delete a.links;
      a.links = all;
    }
  });
}

function sendWS(type, data, ws) {
  switch (type) {
    case 'one':
      (ws || []).forEach(a => {
        if (a.readyState == WebSocket.OPEN) a.send(JSON.stringify(data));
      }); break;
    case 'loc':
      playClients.forEach(a => {
        if (a.readyState == WebSocket.OPEN &&
            a.place == ws) a.send(JSON.stringify(data));
      });
      break;
    case 'all':
      break;
  }
}
db.sendWS = sendWS;

/////////////////////////////

function error400(res) {
  res.statusCode = 400;
  res.end();
}

function error404(res, msg) {
  res.statusCode = 404;
  res.setHeader('content-type', `${kv.mime.text};charset=utf-8`);
  res.end(msg || 'Не найдено');
}

function error500(res, msg = 'произошла ошибка на стороне сервера') {
	res.statusCode = 500;
	res.setHeader('content-type', 'text/plain; charset=utf-8');
	res.end(msg);
}

function sendHTML(res, o) {
  templtr.render(o, (err, html) => {
    if (err) return error500(res);
    res.setHeader('content-type', 'text/html;charset=utf-8');
    res.end(html);
  });
}

function sendStatic(res, path, ct) {
  fs.readFile(__dirname + path, (err, data) => {
    if (err) return error500(res);
    res.setHeader('content-type', `${kv.mime[ct]};charset=utf-8`);
    res.end(data);
  });
}

function sendJSON(res, json = {code:0,reason:7}) {
  res.setHeader('content-type', 'application/json;charset=utf-8');
	res.end(JSON.stringify(json));
}
