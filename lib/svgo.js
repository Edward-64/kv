'use strict';

class SVGOptimizer {
  constructor(fs) {
    this.fs = fs;
    this.svgo = new (require('svgo'))({plugins: [{removeViewBox: false}]});
  }
  optimize(data) {
    return this.svgo.optimize(data);
  }
  optimizeFile(path, f = a => a) {
    path = `${__dirname}/${path}.svg`;
    this.fs.readFile(path, 'utf8', (err, data) => {
      if (err) return console.log(err), f(true);
      this.optimize(data).then(result => {
        this.fs.writeFile(path, result.data, err => {
          if (err) return console.log(err), f(true);
          f();
        });
      });
    });
  }

  static include(fs) {
    return new SVGOptimizer(fs);
  }
}

module.exports = SVGOptimizer;
