(function() {
  'use strict'

  if (app.creatingSkin) return app.creatingSkin.aliveHTML();

  class CreatingSkin {
    constructor() {
      this.addValues = new Map([
        [209, {maxS: 20, skin: 238, maxSkinS: 16}],
        [21, {maxS: 65, skin: 353, maxSkinS: 50}],
        [12, {maxS:40, skin: 29, maxSkinS: 40}]
      ]);
    }
    getSVGObject() {
      return new Promise(resolve => {
        const svg = document.getElementById('svg-object'),
              wait = () => {
                try {
                  if (svg.contentDocument.documentElement.nodeName === 'svg') {
                    resolve(svg.contentDocument.documentElement);
                    return true;
                  }
                } catch (err) {
                  if (this.error > 50) {
                    alert('Ошибка!');
                    window.location.reload();
                  } else {
                    this.error++;
                    console.log(err);
                  }
                }
              }
              if (!wait()) {
                const interval = setInterval(() => {
                  if (wait()) clearInterval(interval);
                }, 30);
              }
      });
    }
    moveSptite(sprite, direction) {
      this.svg.attributes.width.value = this.w;
      this.svg.attributes.height.value = this.h;
	    this.svg.attributes.viewBox.value = `${59*this.sprite} ${37*this.direction} 59 37`
    }
    turnDirection(el) {
      if (this.direction) el.textContent = '→'
      else el.textContent = '←';
      this.direction ^= 1;
      this.moveSptite();
    }
    flowSprite(el) {
      this.sprite++;
      if (this.sprite > 2) this.sprite = 0;
      switch (this.sprite) {
        case 0: el.textContent = 'Стоит'; break;
        case 1: el.textContent = 'Сидит'; break;
        case 2: el.textContent = 'Спит'; break;
      }
      this.moveSptite();
    }
    resizeSVG(n) {
      const w = this.w * n;
      if (w > app.dc.clientWidth || w < 50) return;
      this.w = w;
      this.h *= n;
      this.moveSptite();
    }
    serveFurColor(el) {
      const v = +el.dataset.h;
      this.skin.fur[0] = v;
      this.skin.skin[0] = this.addValues.get(v).skin;
      this.serveFurS(true);
      this.serveFurL(true);
      this.changeFur();
    }
    serveFurS(stopChandingFur) {
      const v = this.sFur.value,
            d = this.addValues.get(this.skin.fur[0]);
      this.skin.fur[1] = Math.floor(d.maxS * v / 100);
      this.skin.skin[1] = Math.floor(d.maxSkinS * v / 100);
      if (stopChandingFur !== true) this.changeFur();
    }
    serveFurL(stopChandingFur) {
      const v = +this.lFur.value;
      this.skin.fur[2] = v;
      this.skin.skin[2] = v > 70 ? 80 : v + 10;
      if (stopChandingFur !== true) this.changeFur();
    }
    changeFur() {
      const lightNodes = this.svg.querySelectorAll('[fill="#73808c"]'),
            darkNodes = this.svg.querySelectorAll('[fill="#5c6670"]'),
            skinNodes = this.svg.querySelectorAll('[fill="#928ea1"]');
      let   darkColor = this.skin.fur[2] - 10;
      if (darkColor < 0) darkColor = 0;
      for (let i = 0; i < lightNodes.length; i++)
        lightNodes[i].style.fill = `hsl(${this.skin.fur[0]}, ${this.skin.fur[1]}%, ${this.skin.fur[2]}%)`;
      for (let i = 0; i < darkNodes.length; i++)
        darkNodes[i].style.fill = `hsl(${this.skin.fur[0]}, ${this.skin.fur[1]}%, ${darkColor}%)`;
      for (let i = 0; i < skinNodes.length; i++)
        skinNodes[i].style.fill = `hsl(${this.skin.skin[0]}, ${this.skin.skin[1]}%, ${this.skin.skin[2]}%)`;
    }
    eyeColor(el) {
      this.skin.eye = +el.dataset.color;
      const nodes = this.svg.querySelectorAll('[fill="#d49326"]'),
            color = el.dataset.hex;
      for (let i = 0; i < nodes.length; i++) nodes[i].style.fill = color;
    }
    displayError(text) {
      const error = document.getElementById('create-skin-error'),
            button = document.getElementById('save-and-play'),
            name = document.getElementById('characterName');
      error.textContent = text;
      button.style.display = 'none';
      error.style.display = 'block';
      name.addEventListener('input', () => {
        error.style.display = 'none';
        button.style.display = 'block';
      }, {once: true});
    }
    save() {
      const eye = this.skin.eye,
            fur = this.skin.fur[0],
            s = this.sFur.value,
            l = this.lFur.value,
            sex = document.getElementById('create-sex').checked,
            name = document.getElementById('characterName').value;
      if (name.startsWith(' '))
        return this.displayError('Имя не может начинаться с пробела');
      let check = name.match(/ /g);
      if (check && check.length > 1)
        return this.displayError('Имя персонажа может быть словосочетанием, но не более чем из двух слов. Например, Песчаная Буря.');
      check = name.match(/[а-яё]{2,}/ig);
      if (check) {
        if (check.join(' ') !== name)
          return this.displayError('Недопустимое имя персонажа. Возможно, слово (или одно из слов) состоит из одной буквы, что недопустимо.');
      } else return this.displayError('Недопустимое имя персонажа');
      if (name.length > 45) return this.displayError('Слишком длинное имя. Допустимо не более 45-ти букв.');
      get(`/createSkin?eye=${eye}&fur=${fur}&s=${s}&l=${l}&name=${name}${sex ? '&sex=1' : ''}`, {clearInput: false}).then(res => {
        switch (res.code) {
          case 0: this.displayError(app.getReason(res.reason)); break;
          case 1: window.location.assign('/play');
        }
      });
    }
    aliveHTML() {
      this.getSVGObject().then(svg => {
        this.svg = svg;
      });
      this.skin = {
        fur: [
          209,
          10,
          50
        ],
        skin: [
          238,
          30,
          70
        ],
        eye: 1
      };
      this.sFur = document.getElementById('sValue');
      this.lFur = document.getElementById('lValue');
      this.direction = 0;
      this.sprite = 0;
      this.w = 220;
      this.h = 140;
    }
  }

  app.creatingSkin = new CreatingSkin();
  app.creatingSkin.aliveHTML();

})()
