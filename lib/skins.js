'use strict'

const mapOfToken = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

class Skins {
  constructor(fs) {
    this.fs = fs;
    /*
    <div data-color="6" data-hex="#7d5240" onclick="app.creatingSkin.eyeColor(this)"></div>
  </div>
  */
    this.furs = new Map([
        [209, {maxS: 20, skin: 238, maxSkinS: 16}],
        [21, {maxS: 65, skin: 353, maxSkinS: 50}],
        [12, {maxS:40, skin: 29, maxSkinS: 40}]
      ]);
    this.eyes = new Map([
      [1, '#e4a560'],
      [2, '#548948'],
      [3, '#9dc4e1'],
      [4, '#589bcf'],
      [5, '#d49326'],
      [6, '#7d5240']
    ]);
  }
  preparePlace(f = a => a) {
    let key = '';
    for (let i = 0; i < 16; i++) {
      let index = Math.floor(Math.random() * mapOfToken.length);
   		key += mapOfToken[index];
  	}
    const path = `${__dirname}/../img/skin/${key}.svg`;
    this.fs.access(path, err => {
      if (err)
        this.fs.writeFile(path, '', err => {
          if (err) console.log(err);
          f(err, key);
        })
      else
        this.preparePlace(f);
    });
  }
  hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      const r = Math.round(255 * color).toString(16);
      if (r.length === 1) return '0' + r
      else return r;
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }
  catSkin(f = a => a, color) {
    this.preparePlace((err, key) => {
      if (err) return f(err);
      this.fs.readFile(__dirname + '/../img/skin/default.svg', 'utf8', (err, svg) => {
        if (err) return console.log(err), f(err);
        color.eye = this.eyes.has(color.eye) ? this.eyes.get(color.eye) : this.eyes.get(5);
        color.fur = this.furs.has(color.fur) ? color.fur : 209;
        const d = this.furs.get(color.fur),
              dark = color.l - 10,
              s = Math.floor(d.maxS * color.s / 100);
        color.shadow = this.hslToHex(color.fur, s, (dark < 0 ? 0 : dark));
        color.fur = this.hslToHex(color.fur, s, color.l);
        color.skin = this.hslToHex(d.skin, Math.floor(d.maxSkinS * color.s / 100), color.l > 70 ? 80 : color.l + 10);
        svg = svg.replace(/#73808c/ig, color.fur)
                 .replace(/#5c6670/ig, color.shadow)
                 .replace(/#d49326/ig, color.eye)
                 .replace(/#928ea1/ig, color.skin);
        this.fs.writeFile(`${__dirname}/../img/skin/${key}.svg`, svg, err => {
          if (err) return console.log(err), f(err);
          f(null, key);
        });
      });
    });
  }
  static include(fs) {
    return new Skins(fs);
  }
}

module.exports = Skins;
