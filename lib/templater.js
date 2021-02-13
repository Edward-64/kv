'use strict'

class TemplaterHTML {
  constructor(fs) {
    this.fs = fs;
    this.deleteExcess = /[{}#]+/g;
    this.computeVars = /{{[^#](.*?)}}/g;
    this.computeLoaps = /{{#([\s\S]+?)}}/g;
    this.getNameOfProp = /[a-zA-Z0-9_\$]+/;
    this.getJavaScript = /(.*\s?)([\s\S]*)(}})/;
    this.root = {
      path: 'main',
      styles: ['site'],
      scripts: ['cmd'],
      title: 'КВ | Коты-Воители',
      body: 'index'
    }
    this.game = {
      path: 'main',
      styles: ['play'],
      scripts: ['play'],
      title: 'КВ | Открытый мир',
      body: 'play'
    }
  }
  getDinamicContent(name, f = a => a) {
    this.fs.readFile(`${__dirname}/../html/${name}.html`, 'utf8', (err, data) => {
      if (err) return console.log(err), f(err);
      f(null, data);
    });
  }
  render(obj = this.root, func = a => a) {
    if (obj === this.root || obj === this.game) obj = Object.assign({}, obj);
    this.fs.readFile(`${__dirname}/../html/${obj.path}.templtr`, 'utf8', (err, data) => {
      if (err) return func(err), console.log(err);
      this.fs.readFile(`${__dirname}/../html/${obj.body || 'empty-body'}.html`, 'utf8', (err, body) => {
        if (err) return func(err), console.log(err);
        if (obj.body) obj.body = body;
        try {
          const vars = data.match(this.computeVars),
                loaps = data.match(this.computeLoaps);
          if (vars) {
            vars.forEach(a => {
              data = data.replace(new RegExp(a), obj[a.replace(this.deleteExcess, '')] || '');
            });
          }
          if (loaps) {
            loaps.forEach(a => {
              const p = a.match(this.getNameOfProp)[0],
                    js = eval(`${p} => {` + a.replace(this.getJavaScript, '$2') + '}');
              data = data.replace(new RegExp(`({{#${p}[\\s\\S]*?)}}`), js(obj[p] || []) || '');
            });
          }
          func(err, data);
        } catch (error) {
          console.log(error);
          return func(error);
        }
      });
    });
  }
  static include(fs) {
    return new TemplaterHTML(fs);
  }
}

module.exports = TemplaterHTML;
