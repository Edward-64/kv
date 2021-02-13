'use strict'

let X, Y, W, H, ID, isMobile;

class Game {
  constructor() {
    this.layers = {
			area: document.getElementById('area'),
			sky: document.getElementById('sky'),
      interface: document.getElementById('interface'),
      other: document.getElementById('other'),
			animals: document.getElementById('animals'),
      placers: document.getElementById('placers'),
      scroll: document.getElementById('scroll'),
      list: document.getElementById('list')
		};
    this.flow = {
      html: document.getElementById('flow-notification'),
      list: document.getElementById('flow-notification-content-list-of-object'),
      x: 20,
      y: 20
    }
    this.buttons = {
      createObject: document.getElementById('create-object'),
      editObject: document.getElementById('edit-object'),
      createPath: document.getElementById('create-path')
    };
    this.inputs = {
      to: document.getElementById('input-to')
    }
    this.errors = 0;
    this.preloader = document.getElementById('preloader');
    this.forComputingSeasonable = document.getElementById('object');
    this.displayedAreaName = document.getElementById('area-skin-name');
    this.help = document.getElementById('help');
    this.view = document.getElementById('view-img').style;
    this.isInterface = document.getElementById('object-type-is-interface').style;
    this.season = 3;
    this.currentObject = null;
    this.objs = {
      landscape: {
        old: [],
        new: [],
        removed: []
      },
      path: {
        old: [],
        new: [],
        removed: []
      },
      tmp: {
        old: [],
        new: []
      }
    };
  }
  listObj(where) {
    if (this.blockListingObjects) return;
    this.currentObject.skin += where;
    if (this.currentObject.skin < 1 || this.currentObject.skin > this.maxObjListPosition)
      return this.currentObject.skin -= where;
    this.uploadObject(`/img/play/landscape?r=${this.currentObject.skin}`, seasonable => {
      if (seasonable) this.currentObject.seasonable = 1
      else delete this.currentObject.seasonable;
      this.updateObject('skin');
    });
  }
  listArea(where) {
    const n = this.area + where;
    if (n < 1 || n > this.areas.map.size) return;
    this.setArea(n);
  }
  hideButtonsFromObj() {
    this.buttons.createObject.style.display = 'none';
    this.buttons.editObject.style.display = 'none';
    this.buttons.createPath.style.display = 'none';
  }
  listSeason() {
    if (this.season == 5) this.changeSeason(0)
    else this.changeSeason(this.season + 1);
  }
  showPreloader(where) {
    where.appendChild(this.preloader);
    this.preloader.style.display = 'block';
  }
  hidePreloader() {
    this.preloader.style.display = 'none';
  }
  floor() {
    if (this.currentObject) {
        const keys = Object.keys(this.currentObject);
        keys.forEach(key => {
          if (typeof this.currentObject[key] === 'number')
            this.currentObject[key] = Math.floor(this.currentObject[key]);
        });
    }
  }
  resetInputs(values) {
    this.inputs.x.value = values.x;
    this.inputs.y.value = values.y;
    switch (values.mode) {
      case 'tmp':
      case 'landscape':
        this.inputs.z.value = values.z || 'auto';
        this.inputs.size.value = values.size;
        break;
      case 'path':
        this.inputs.to.value = `${values.to.n} ${values.to.x} ${values.to.y}`;
        break;
    }
  }
  getReason(code) {
    if (typeof code === 'string') return code;
    switch (code) {
      case 7: return 'Ошибка сервера';
      case 8: return 'Запрос весит более 2-х мбайт, поэтому был отклонён';
      case 10: return 'Вы не можете это сделать';
      default: return 'Неизвестная ошибка';
    }
  }
  buttonsFromServer(mode) {
    document.getElementById('button-save-location').style.display = mode;
    document.getElementById('button-upload-file').style.display = mode;
  }
  showUploadingFile() {
    this.buttonsFromServer('none');
    document.getElementById('upload-file').style.display = 'block';
  }
  uploadFile() {
    if (this.recoverStateSavingObjectOnServer) this.recoverStateSavingObjectOnServer();
    const htmlForm = document.getElementById('upload-file'),
          form = new FormData(htmlForm);
    this.showPreloader(document.getElementById('server-part'));
    post('/uploadFile?target=landscape', form).then(res => {
      switch (res.code) {
        case 0:
          alert(`Загрузка не удалась. ${this.getReason(res.reason)}.`);
          break;
        case 1:
          htmlForm.style.display = 'none';
          this.buttonsFromServer('block');
          this.hidePreloader();
          this.createNewObject('tmp');
      }
    });
  }
  uploadLocation() {
    if (this.blockUploadLocation) return;
    const v = document.getElementById('choosing-location').value;
    if (v !== '') {
      this.blockUploadLocation = true;
      this.showPreloader(document.getElementById('choosed-mode-is-edit'));
      let q;
      if (/Локация №[\d]+\n/i.test(v + '\n')) q = `id=${+v.match(/[\d]+/)[0]}`
      else q = `${Number.isNaN(+v) ? 'name' : 'id'}=${v}`;
      get(`/locedit?get=location&${q}`).then(res => {
        switch (res.code) {
          case 0:
            const error = document.getElementById('choosing-location-error');
            error.textContent = this.getReason(res.reason);
            error.style.display = 'block';
            break;
          case 1:
            document.getElementById('choosing-mode').remove();
            res.data.landscape = JSON.parse(res.data.landscape);
            res.data.landscape.forEach(o => {
              const newObject = {
                mode: 'landscape',
                x: o.place[0],
                y: o.place[1],
                size: o.size,
                skin: o.skin
              }
              if (o.seasonable) newObject.seasonable = 1;
              if (o.z) newObject.z = o.z;
              this.objs.landscape.old.push(newObject);
              this.createHTMLObject(newObject);
            });
            res.data.interface.forEach(o => {
              const newObject = {};
              switch (o.type) {
                case 0:
                  newObject.mode = 'path';
                  newObject.size = 6;
                  newObject.x = o.place[0];
                  newObject.y = o.place[1];
                  newObject.to = {
                      x: o.place[3],
                      y: o.place[4],
                      n: o.place[2]
                    }
                  this.objs.path.old.push(newObject);
                  break;
              }
              this.createHTMLObject(newObject);
            });
            this.context();
            this.setArea(Math.abs(res.data.area));
            this.id = res.data.id;
            document.getElementById('name-of-loc-input').value = res.data.name ?
                                                                 res.data.name :
                                                                 `Локация №${this.id}`;
            this.dataFromServer = res.data;
            break;
        }
        document.getElementById('block-interfaces-before-choosing-mode').remove();
        delete this.blockUploadLocation;
        this.hidePreloader();
      });
    }
  }
  uploadObject(url, f = a => a) {
    clearInterval(this.interval);
    this.forComputingSeasonable.onload = () => {
      const wait = () => {
        try {
          if (this.forComputingSeasonable.contentDocument.documentElement.nodeName === 'svg') {
            const attrs = this.forComputingSeasonable.contentDocument.documentElement.attributes;
            if (attrs.width.value.startsWith(2250)) f(1)
            else f();
            return true;
          }
        } catch(err) {
          if (this.errors > 100) {
            alert(err);
            window.location.reload();
          }
          this.errors++;
        }
      };
      if (!wait())
        this.interval = setInterval(() => {
          if (wait()) clearInterval(this.interval);
        }, 30);
    }
    this.forComputingSeasonable.data = url;
  }
  createNewObject(mode) {
    const obj = { mode, x: 80, y: 13.5, size: 30 };
    this.hideButtonsFromObj();
    switch (mode) {
      case 'landscape':
        obj.skin = 1;
        this.blockListingObjects = true;
        this.showPreloader(document.getElementById('part-object'));
        this.uploadObject(`/img/play/landscape?r=${obj.skin}`, seasonable => {
          if (seasonable) obj.seasonable = 1;
          this.hidePreloader();
          document.getElementById('object-view').style.display = 'block';
          this.objs.landscape.new.push(obj);
          this.createHTMLObject(obj);
          delete this.blockListingObjects;
        });
        break;
      case 'path':
        obj.x = 3; obj.size = 6;
        obj.to = { x: 157, y: 13.5, n: 1 };
        document.getElementById('path-view').style.display = 'block';
        this.objs.path.new.push(obj);
        this.createHTMLObject(obj);
        break;
      case 'tmp':
      this.uploadObject(`/tmp?r=${this.clientID}`, seasonable => {
        if (seasonable) obj.seasonable = 1;
        const view = document.getElementById('tmp-object-view');
        document.getElementById('tmp-object-view').style.display = 'block';
        this.objs.tmp.new.push(obj);
        this.createHTMLObject(obj);
      });
    }
  }
  createHTMLObject(obj, context) {
    let trigger = 1;
    const list = {
            shell: document.createElement('div'),
            view: document.createElement('div'),
            hideButton: document.createElement('button'),
            deleteButton: document.createElement('button'),
            chooseButton: document.createElement('button'),
            tmp: document.createElement('code')
          };
    obj.html = document.createElement('div');

    list.shell.classList.add('centered-flex');
    list.shell.classList.add('darker-on-rectangle');
    list.view.style.width = '45px';
    list.view.style.height = '45px';
    list.shell.appendChild(list.view);
    list.tmp.style.width = '200px';
    list.tmp.style.padding = '0px 20px';

    switch (obj.mode) {
      case 'tmp':
      case 'landscape':
        list.tmp.innerHTML = '{<span>80</span>; <span>13</span>; <span>auto</span>}';
        list.x = list.tmp.children[0];
        list.y = list.tmp.children[1];
        list.z = list.tmp.children[2];
        break;
      case 'path':
        list.tmp.innerHTML = '{<span>80</span>; <span>13</span>} ведет в локацию №<span>1</span>';
        list.x = list.tmp.children[0];
        list.y = list.tmp.children[1];
        list.n = list.tmp.children[2];
        break;
    }

    list.shell.appendChild(list.tmp);
    list.tmp = document.createElement('div');
    list.hideButton.textContent = 'Скрыть';
    list.deleteButton.textContent = 'X';
    list.chooseButton.textContent = '»';
    list.tmp.appendChild(list.hideButton);
    list.tmp.appendChild(list.deleteButton);
    list.tmp.appendChild(list.chooseButton);
    list.tmp.style.width = '80px';
    list.shell.appendChild(list.tmp);
    delete list.tmp;
    obj.list = list;
    this.flow.list.appendChild(list.shell);

    this.context(obj);

    switch (obj.mode) {
      case 'tmp':
      case 'landscape':
        ['x', 'y', 'z', 'size', 'skin'].forEach(option => this.updateObject(option, obj));
        break;
      case 'path':
        obj.html.style.background = 'url(/img/play?r=path)';
        obj.list.view.style.background = 'url(/img/play?r=path)';
        obj.html.style.width = Math.floor(obj.size * X) + 'px';
        obj.html.style.height = obj.html.style.width;
        ['x', 'y', 'to'].forEach(option => this.updateObject(option, obj));
        break;
    }

    obj.html.classList.add('placer');
    this.layers.placers.appendChild(obj.html);

    list.shell.addEventListener('mouseover', () => {
      obj.html.classList.add('focus-object');
    });
    obj.html.addEventListener('mouseover', () => {
      obj.html.classList.add('focus-object');
    });
    list.shell.addEventListener('mouseout', () => {
      obj.html.classList.remove('focus-object');
    });
    obj.html.addEventListener('mouseout', () => {
      obj.html.classList.remove('focus-object');
    });
    list.deleteButton.onclick = () => {
      const last = this.currentObject;
      if (last === obj) {
        this.removeObject({hideView: true, showButtons: true})
      } else {
        this.currentObject = obj;
        this.removeObject();
        this.currentObject = last;
      }
    }
    list.hideButton.onclick = () => {
      if (trigger) {
        obj.html.style.display = 'none';
        list.hideButton.textContent = 'Показать';
      } else {
        obj.html.style.display = 'block';
        list.hideButton.textContent = 'Скрыть';
      }
      trigger ^= 1;
    }
    obj.html.onclick = () => {
      if (this.objsCanBeClicked) {
        this.removeObject({hideChoosing: true});
        this.context(obj);
        const mode = {};

        switch (obj.mode) {
          case 'tmp':
            mode.updateList = ['x', 'y', 'z', 'size', 'skin'];
            mode.view = 'tmp-object-view';
            break;
          case 'landscape':
            mode.updateList = ['x', 'y', 'z', 'size', 'skin'];
            mode.remove = () => {
              return {
                mode: 'landscape',
                seasonable: obj.seasonable,
                size: obj.size,
                skin: obj.skin,
                x: obj.x, y: obj.y
              }
            };
            mode.view = 'object-view';
            break;
          case 'path':
            mode.updateList = ['x', 'y', 'to'];
            mode.remove = () => {
              return {
                mode: 'path',
                x: obj.x, y: obj.y,
                to: {
                  x: obj.to.x,
                  y: obj.to.y,
                  n: obj.to.n
                }
              }
            };
            mode.view = 'path-view';
        }

        mode.updateList.forEach(option => this.updateObject(option));
        let i = this.objs[obj.mode].old.indexOf(obj);
        if (i != -1) {
          this.objs[obj.mode].old.splice(i, 1);
          this.objs[obj.mode].removed.push(mode.remove());
          this.objs[obj.mode].new.push(obj);
        }
        document.getElementById(mode.view).style.display = 'block';

        this.layers.placers.appendChild(obj.html);
        delete this.objsCanBeClicked;
      }
    }
    list.chooseButton.onclick = () => {
      if (this.currentObject && this.currentObject.mode !== obj.mode) {
        switch (this.currentObject.mode) {
          case 'landscape':
            document.getElementById('object-view').style.display = 'none';
            break;
          case 'path':
            document.getElementById('path-view').style.display = 'none';
            break;
          case 'tmp':
            document.getElementById('tmp-object-view').style.display = 'none';
            break;
        }
      } else this.hideButtonsFromObj();
      this.context();
      this.objsCanBeClicked = true;
      obj.html.onclick();
    }
  }
  editObject() {
    this.objsCanBeClicked = true;
    this.layers.area.style.cursor = 'crosshair';
    this.hideButtonsFromObj();
    document.getElementById('choose-object').style.display = 'block';
  }
  removeObject(options = {}) {
    if (this.currentObject) {
      const m = this.currentObject.mode, mode = {};
      switch (m) {
        case 'landscape':
          mode.remove = () => {
            return {
              mode: 'landscape',
              seasonable: this.currentObject.seasonable,
              size: this.currentObject.size,
              skin: this.currentObject.skin,
              x: this.currentObject.x, y: this.currentObject.y
            }
          }
          break;
        case 'path':
          mode.remove = () => {
            return {
              mode: 'path',
              x: this.currentObject.x, y: this.currentObject.y,
              to: {
                x: this.currentObject.to.x,
                y: this.currentObject.to.y,
                n: this.currentObject.to.n
              }
            }
          }
          break;
      }

      let i = this.objs[m].new.indexOf(this.currentObject);
      if (i != -1) this.objs[m].new.splice(i, 1)
      else {
        i = this.objs[m].old.indexOf(this.currentObject);
        if (i != -1) {
          const o = this.objs[m].old[i];
          this.objs[m].removed.push(mode.remove());
          this.objs[m].old.splice(i, 1);
        }
      }

      this.currentObject.html.remove();
      this.currentObject.list.shell.remove();
      this.currentObject = null;
    }
    if (options.showButtons) {
      this.buttons.createObject.style.display = 'inline';
      this.buttons.editObject.style.display = 'inline';
      this.buttons.createPath.style.display = 'inline';
    }
    if (options.hideView) {
      document.getElementById('object-view').style.display = 'none';
      document.getElementById('path-view').style.display = 'none';
      document.getElementById('tmp-object-view').style.display = 'none';
    }
    if (options.hideChoosing) {
      document.getElementById('choose-object').style.display = 'none';
      if (this.manualCtrlKey) this.layers.area.style.cursor = 'grab'
      else this.layers.area.style.cursor = '';
    }
  }
  checkInterval(mode, x, y) {
    switch (mode) {
      case 'landscape':
        if (x !== null && (Number.isNaN(x) || x < -80 || x > 240)) return true;
        if (y  !== null && (Number.isNaN(y) || y > 30)) return true;
        break;
      case 'path':
        if (x !== null && (Number.isNaN(x) || x < 3 || x > 157)) return true;
        if (y !== null && (Number.isNaN(y) || y > 24 || y < 3)) return true;
        break;
    }
  }
  updateObject(option, obj = this.currentObject) {
    if (obj === null) return;
    let check;
    switch (option) {
      case 'x':
        check = +this.inputs.x.value;
        if (this.checkInterval(obj.mode, check)) this.inputs.x.classList.add('error-input')
        else {
          this.inputs.x.classList.remove('error-input');
          obj.x = check;
          obj.html.style.left = Math.floor(obj.x * X - obj.size * X / 2) + 'px';
          obj.list.x.textContent = obj.x.toFixed(2);
        }
        break;
      case 'y':
        check = +this.inputs.y.value;
        if (this.checkInterval(obj.mode, null, check)) return this.inputs.y.classList.add('error-input')
        this.inputs.y.classList.remove('error-input');
        obj.y = check;
        obj.list.y.textContent = obj.y.toFixed(2);
        if (obj.mode === 'path') {
          obj.html.style.bottom = Math.floor(obj.y * Y - obj.size * X / 2) + 'px';
          break;
        }
        obj.html.style.bottom = Math.floor(obj.y * Y) + 'px';
      case 'z':
        if (option === 'z') {
          check = this.inputs.z.value;
          if (check === 'auto') {
            delete obj.z;
          } else {
            check = +check;
            if (Number.isNaN(check) || check > 9999 || check < 0) return this.inputs.z.classList.add('error-input')
            else obj.z = check;
          }
          this.inputs.z.classList.remove('error-input');
        }
        const z = obj.z ? obj.z : 3000 - Math.floor(obj.y * 100);
        obj.html.style.zIndex = z > 30000 ? 30000 : z;
        obj.list.z.textContent = obj.z ? obj.html.style.zIndex : 'auto';
        break;
      case 'size':
        check = +this.inputs.size.value;
        if (check > 0) {
          this.inputs.size.classList.remove('error-input');
          obj.size = check;
          check = Math.floor(check * X);
          obj.html.style.width = check + 'px';
          obj.html.style.height = check + 'px';
          obj.html.style.left = obj.x * X - check / 2 + 'px';
        } else return this.inputs.size.classList.add('error-input');
      case 'skin':
        if (check === undefined) check = Math.floor(this.inputs.size.value * X);
        let path;
        if (obj.mode === 'tmp') {
          path = `url(/tmp?r=${this.clientID})`;
        } else {
          path = `url(/img/play/landscape?r=${obj.skin})`;
          if (this.interfaces.has(this.currentObject.skin)) this.isInterface.display = 'block'
          else this.isInterface.display = 'none';
        }
        if (obj.seasonable) {
          this.view.background = `${path} no-repeat -${Math.floor(game.season * 192)}px 0px / 1730px 192px`;
          obj.list.view.style.background = `${path} no-repeat -${Math.floor(game.season * 45)}px 0px / 405px 45px`;
          obj.html.style.background = `${path} -${Math.floor(game.season * check)}px 0px / ${Math.floor(check * 9)}px ${check}px`;
        } else {
          this.view.background = `${path} no-repeat 0px 0px / 769px 192px`;
          obj.list.view.style.background = `${path} no-repeat 0px 0px / 180px 45px`;
          obj.html.style.background = `${path} 0px 0px / ${Math.floor(check * 4)}px ${check}px`;
        }
        break;
      case 'to':
        try {
          check = this.inputs.to.value.match(/[\d.,]+/g).map(a => +a.replace(/,/g, '.'));
          if (this.checkInterval(obj.mode, check[1], check[2]) || Number.isNaN(check[0])) throw '';
          this.inputs.to.classList.remove('error-input');
          obj.to.n = check[0];
          obj.to.x = check[1];
          obj.to.y = check[2];
          obj.list.n.textContent = obj.to.n;
        } catch(err) {
          console.log(err);
          this.inputs.to.classList.add('error-input')
        }
        break;
    }
  }
  setArea(area) {
    this.displayedAreaName.textContent = this.areas.map.get(area);
    this.area = area;
    if (this.areas.seasonable.has(area)) {
      this['+-area'] = 1;
      this.layers.area.style.backgroundImage = `url(/img/play/area?r=${area}s${this.season})`;
    } else {
      this['+-area'] = -1;
      this.layers.area.style.backgroundImage = `url(/img/play/area?r=${area})`;
    }
  }
  context(obj = 'reset') {
    if (this.currentObject) {
      this.currentObject.list.shell.classList.remove('focus-object');
    }
    if (obj === 'reset') return this.currentObject = null;
    if (this.currentObject === null || this.currentObject.mode !== obj.mode)
      switch (obj.mode) {
        case 'landscape':
          this.inputs.x = document.getElementById('input-x-landscape');
          this.inputs.y = document.getElementById('input-y-landscape');
          this.inputs.z = document.getElementById('input-z');
          this.inputs.size = document.getElementById('input-size');
          break;
        case 'path':
          this.inputs.x = document.getElementById('input-x-path');
          this.inputs.y = document.getElementById('input-y-path');
          break;
        case 'tmp':
          this.inputs.x = document.getElementById('input-x-tmp');
          this.inputs.y = document.getElementById('input-y-tmp');
          this.inputs.z = document.getElementById('input-z-tmp');
          this.inputs.size = document.getElementById('input-size-tmp');
          break;
      }
    this.currentObject = obj;
    this.resetInputs(obj);
    obj.list.shell.classList.add('focus-object');
  }
  movingHandler(e) {
    const y = game.currentObject.y - (e.pageY - game.startY) / Y,
          x = game.currentObject.x + (e.pageX - game.startX) / X;
    if (game.checkInterval(game.currentObject.mode, x, y)) return;
    game.inputs.x.value = x;
    game.inputs.y.value = y;
    game.updateObject('x');
    game.updateObject('y');
    game.startX = e.pageX;
    game.startY = e.pageY;
  }
  flowotificationHandler(e) {
    game.flow.x += e.pageX - game.flow.startX;
    game.flow.y += e.pageY - game.flow.startY;
    game.flow.html.style.top = game.flow.y + 'px';
    game.flow.html.style.left = game.flow.x + 'px';
    game.flow.startX = e.pageX;
    game.flow.startY = e.pageY;
  }
  vectorLength(a, b) {
    return [
      b[0] - a[0],
      b[1] - a[1],
      Math.floor(Math.sqrt(Math.pow(b[0] - a[0], 2) + Math.pow(b[1] - a[1], 2)))
    ];
  }
  init(f = a => a) {
    get('/locedit?get=startset').then(res => {
      if (res.code) {
        this.clientID = res.data.clientID;
        this.maxObjListPosition = res.data.landscapes;
        for (let i = 1; i <= this.maxObjListPosition; i++) {
          const shell = document.createElement('div'),
                img = document.createElement('img'),
                path = `/img/play/landscape?r=${i}`;
          img.src = path;
          shell.classList.add('list-object');
          shell.appendChild(img);
          this.layers.list.appendChild(shell);
          shell.addEventListener('mouseover', () => {
            shell.classList.add('focus-gradient');
          });
          shell.addEventListener('mouseout', () => {
            shell.classList.remove('focus-gradient');
          });
          shell.addEventListener('click', () => {
            this.layers.list.parentNode.style.display = 'none';
            this.uploadObject(path, seasonable => {
              this.currentObject.seasonable = seasonable ? 1 : undefined;
              this.currentObject.skin = i;
              this.updateObject('skin');
            });
          });
        }
        this.areas = JSON.parse(res.data.areas);
        this.areas.map = new Map(this.areas.map);
        this.areas.seasonable = new Set(this.areas.seasonable);
        this.interfaces = new Set(JSON.parse(res.data.interfaces));
        W = document.documentElement.clientWidth;
        H = document.documentElement.clientHeight;

        if (W/H < 1.5) {
          isMobile = true;
        }
        if (W/H > 2.1 || isMobile) {
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
        document.getElementById('notification').classList.add(isMobile ? 'simply-notification-mobile' : 'simply-notification');
        document.getElementById('choosing-mode').classList.add(isMobile ? 'simply-notification-mobile' : 'simply-notification');
        context = document.getElementById('flow-notification');
        context.classList.add(isMobile ? 'simply-notification-mobile' : 'simply-notification');
        this.flow.x = 100; this.flow.y = 20;
        context.style.top = '20px';
        context.style.left = '100px';

        X = W / 160;
        Y = H * 0.3 / 27;
        f();
      }
    });
	}
  saveObjectOnServer(button) {
    const error = document.getElementById('error-saving-object-on-server'),
          obj = this.currentObject;
    error.style.display = 'none';
    button.style.display = 'none';
    this.showPreloader(button.parentNode);
    get('/locedit?savetmp=1').then(res => {
      this.hidePreloader();
      switch (res.code) {
        case 0:
          button.style.display = 'block';
          error.textContent = `Объект не добавлен. ${this.getReason(res.reason)}.`;
          error.style.display = 'block';
          break;
        case 1:
          this.context();
          this.maxObjListPosition++;
          const i = this.objs.tmp.new.indexOf(obj);
          this.objs.tmp.new.splice(i, 1);
          this.objs.landscape.new.push(obj);
          obj.mode = 'landscape';
          obj.skin = this.maxObjListPosition;
          this.context(obj);
          this.updateObject('skin');
          const warning = document.getElementById('warning-saving-object-on-server')
          warning.textContent = 'Объект добавлен в коллекцию';
          this.recoverStateSavingObjectOnServer = () => {
            warning.textContent = 'Не добавленные в коллекцию объекты не появятся на локации после её сохранения.';
            button.style.display = 'block';
            delete this.recoverStateSavingObjectOnServer;
          }
      }
    });
  }
  save() {
    if (!confirm('Уверен, что хочешь сохранить локацию?')) return;
    const cleanup = a => {
        switch (a.mode) {
          case 'landscape':
            return {
              x: a.x, y: a.y, z: a.z === 'auto' || a.z === '' ? undefined : a.z,
              size: a.size,
              skin: a.skin,
              seasonable: a.seasonable
            }
          case 'path':
            return {
              type: 0,
              x: a.x, y: a.y,
              to: {
                x: a.to.x,
                y: a.to.y,
                n: a.to.n
              }
            }
        }
      },
      toServer = {
        name: document.getElementById('name-of-loc-input').value || undefined,
        newLandscape: this.objs.landscape.new.map(cleanup),
        newInterfaces: this.objs.path.new.map(cleanup),
        id: this.id
      },
      area = this.area * this['+-area'];
    if (game.id === undefined) {
      toServer.area = this.area * this['+-area'];
      toServer.state = 1;
    } else {
      if (area !== this.dataFromServer.area) toServer.area = area;
      if (toServer.name === this.dataFromServer.name ||
          /Локация №[\d]+\n/i.test(toServer.name + '\n')) delete toServer.name;
      toServer.removedLandscape = this.objs.landscape.removed.map(cleanup);
      toServer.removedInterfaces = this.objs.path.removed.map(cleanup);
    }
    post('/editLocation', toServer).then(res => {
      switch (res.code) {
        case 0:
          alert(`Локация не сохранена. ${this.getReason(res.reason)}.`);
          break;
        case 1:
          alert('Локация сохранена!');
          window.location.reload();
      }
    });
  }
  changeSeason(mode) {
    if (this.season === mode) return;
    this.season = mode;
    const last = this.currentObject;
    [this.objs.landscape.new, this.objs.landscape.old].forEach(ctx => {
      ctx.forEach(o => {
        this.currentObject = o;
        this.updateObject('skin');
      });
    });
    this.setArea(this.area);
    this.currentObject = last;
    this.updateObject('skin');
  }
  chooseMode(mode) {
    const elem = document.getElementById('choosing-mode');
    switch (mode) {
      case 'new':
        this.setArea(1);
        elem.remove();
        document.getElementById('block-interfaces-before-choosing-mode').remove();
        break;
      case 'edit':
        document.getElementById('process-choosing-mode').style.display = 'none';
        document.getElementById('choosed-mode-is-edit').style.display = 'block';
    }
  }
  displayingElement(element) {
    if (element.style.display == 'none') element.style.display = 'block'
    else element.style.display = 'none';
  }
  turnMoving() {
    if (game.objsCanBeClicked) return;
    if (this.manualCtrlKey) {
      if (this.layers.area.style.cursor == 'grab') this.layers.area.style.cursor = '';
      this.manualCtrlKey = false;
    } else {
      this.layers.area.style.cursor = 'grab';
      this.manualCtrlKey = true;
    }
  }
  simplyNotification(text) {
    document.getElementById('notification-content').innerHTML = text;
    document.getElementById('notification').style.display = 'block';
  }
}

var game = new Game();

class Placer {
}

class Animal extends Placer {
  constructor(raw = {}) {
    super();
    this.blocks = 0;
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
	constructor() {
    super();
		this.size = 1;
    this.speed = 16;
    this.place = [80, 13.5];
    this.direction = 0;
    this.eatSprite = 12;
    this.computeSizes(this.size);
    this.createSkin('default');
    this.actions = 0;
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
    this.direction = raw.dir;
    this.speed = raw.speed;
    if (raw.size > this.size + 0.01) {
      this.computeSizes(raw.size);
      this.size = raw.size;
      this.html.style.background = `url(/img/skin?r=${raw.skin}) no-repeat 0px -${this.direction ? 0 : this.h}px/${this.maxW}px ${2 * this.h}px`;
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
    this.html.style.backgroundPositionY = -(this.direction ? 0 : this.h) + 'px';
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
    this.setAction(2);
    this.changeSkinPosition(1);
    this.setBlock(1);
  }
  standup() {
    this.unsetAction(2);
    this.unsetBlock(1);
    this.changeSkinPosition(0);
  }
  changeSkinPosition(position) {
    this.html.style.backgroundPosition = `-${position * this.w}px -${this.direction ? 0 : this.h}px`;
  }
  createSkin(skin) {
    const html = this.html = document.createElement('div');
    html.classList.add('placer');
    html.style.background = `url(/img/skin?r=${skin}) no-repeat 0px -${this.direction ? 0 : this.h}px/${this.maxW}px ${2 * this.h}px`;
    html.style.width = this.w + 'px';
    html.style.height = this.h + 'px';
    this.updateChunk();
    game.layers.animals.appendChild(this.html);
  }
	walkAnimation() {
    if (this.walkAnimationInterval) return;
    let sprite = 3;
    this.walkAnimationInterval = setInterval(() => {
			if (sprite == 11) sprite = 3
			else sprite += 1;
      if (this.checkBlock(1)) return this.stopWalkAnimation();
      this.changeSkinPosition(sprite);
		}, 120);
	}
	stopWalkAnimation() {
    clearInterval(this.walkAnimationInterval);
    if (!this.checkBlock(1)) this.changeSkinPosition(0);
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
    if (v[0] < 0) this.direction = 0
    else this.direction = 1;
		this.walkInterval = setInterval(() => {
			gone += speed;
			if (v[2] <= gone || this.checkBlock(1)) return this.stopWalk();
			this.place[0] += speedX;
			this.place[1] += speedY;
      this.updateChunk();
		}, 40);
	}
  stopWalk() {
    clearInterval(this.walkInterval);
    this.stopWalkAnimation();
    this.unsetAction(3);
  }
}

async function get(url, options = {}) {
  const res = await fetch(url, options);
  if (options.text) return await res.text()
  else return await res.json();
}

async function post(url, body, options = {}) {
  if (body instanceof FormData) options.body = body;
  else options.body = JSON.stringify(body);
  options.method = 'POST';
  const res = await fetch(url, options);
  return await res.json();
}

game.init(() => {
  var cat = new Cat();
  game.layers.scroll.addEventListener('mousedown', e => {
    if (game.objsCanBeClicked) return;
    const client = document.documentElement.clientWidth;
    if (game.currentObject && (e.ctrlKey || e.metaKey || game.manualCtrlKey)) {
      game.layers.area.style.cursor = 'grabbing';
      game.startX = e.pageX; game.startY = e.pageY;
      game.layers.scroll.addEventListener('mousemove', game.movingHandler);
      game.layers.scroll.addEventListener('mouseup', e => {
        game.floor();
        game.layers.scroll.removeEventListener('mousemove', game.movingHandler);
        if (game.manualCtrlKey) game.layers.area.style.cursor = 'grab'
        else game.layers.area.style.cursor = '';
      }, {once: true});
    } else {
      const p = [(client <= W ? game.layers.scroll.scrollLeft + e.pageX : e.pageX - (client - W)/2) / X,
                (H * 0.8 - e.pageY) / Y];
      if (p[0] <= 160 && p[0] >= 0 && p[1] <= 27 && p[1] >= 0) cat.walk(p);
    }
    /*
    game.spaces.forEach(v => {
      const c = v.zone;
      if (c[0] <= p[0] && c[2] >= p[0] &&
        c[1] >= p[1] && c[3] <= p[1]) v.click(p);
      });
    */
  });
  document.addEventListener('keydown', e => {
    if (game.manualCtrlKey || game.objsCanBeClicked) return;
    if (e.key == 'Control') game.layers.area.style.cursor = 'grab';
  });
  document.addEventListener('keyup', e => {
    if (game.manualCtrlKey || game.objsCanBeClicked) return;
    if (e.key == 'Control' && game.layers.area.style.cursor == 'grab') game.layers.area.style.cursor = '';
  });
  game.flow.html.addEventListener('mousedown', e => {
    document.documentElement.style.cursor = 'grabbing';
    game.flow.startX = e.pageX;
    game.flow.startY = e.pageY;
    document.documentElement.addEventListener('mousemove', game.flowotificationHandler);
    document.documentElement.addEventListener('mouseup', e => {
      document.documentElement.removeEventListener('mousemove', game.flowotificationHandler);
      document.documentElement.style.cursor = '';
    }, {once: true});
  });
});
