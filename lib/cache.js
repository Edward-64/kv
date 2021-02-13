'use strict'

class CacheControl {
  constructor(fs) {
    this.fs = fs;
    this.css = JSON.parse(fs.readFileSync(__dirname + '/../db/cache/css.json', 'utf8'));
    this.js = JSON.parse(fs.readFileSync(__dirname + '/../db/cache/js.json', 'utf8'));
    this.img = JSON.parse(fs.readFileSync(__dirname + '/../db/cache/img.json', 'utf8'));
  }
  set(res, url, noneMatch) {
    if (url.startsWith('/img')) {
      res.setHeader('cache-control', 'max-age=604800');
      if (url.startsWith('/img/play')) {
        if (url.includes('landscape')) {
          if (noneMatch === this.img.play.landscape) return this.response304(res)
          else res.setHeader('etag', this.img.play.landscape)
        } else if (url.includes('area')) {
          if (noneMatch === this.img.play.area) return this.response304(res)
          else res.setHeader('etag', this.img.play.area)
        } else {
          if (noneMatch === this.img.play.other) return this.response304(res)
          else res.setHeader('etag', this.img.play.other);
        }
      } else if (url.startsWith('/img/site')) {
        if (noneMatch === this.img.site) return this.response304(res)
        else res.setHeader('etag', this.img.site);
      } else if (url.startsWith('/img/skin')) {
        if (url.includes('generator')) {
          if (noneMatch === this.img.skin.generator) return this.response304(res)
          else res.setHeader('etag', this.img.skin.generator);
        } else if (url.includes('default')) {
          if (noneMatch === this.img.skin.default) return this.response304(res)
          else res.setHeader('etag', this.img.skin.default);
        } else {
          if (noneMatch === this.img.skin.other) return this.response304(res)
          else res.setHeader('etag', this.img.skin.other);
        }
      } else {
        if (noneMatch === this.img.other) return this.response304(res)
        else res.setHeader('etag', this.img.other);
      }
    } else if (url.startsWith('/js')) {
      res.setHeader('cache-control', 'max-age=10800');
      if (url === '/js/cmd.js') {
        if (noneMatch === this.js.cmd) return this.response304(res)
        else res.setHeader('etag', this.js.cmd);
      } else if (url === 'play.js') {
        if (noneMatch === this.js.play) return this.response304(res)
        else res.setHeader('etag', this.js.play);
      } else if (url === '/js/create-skin.js') {
        if (noneMatch === this.js.createSkin) return this.response304(res)
        else res.setHeader('etag', this.js.createSkin);
      } else if (url === '/js/md.js') {
        res.setHeader('cache-control', 'max-age=604800');
        if (noneMatch === this.js.md) return this.response304(res)
        else res.setHeader('etag', this.js.md);
      } else {
        if (noneMatch === this.js.other) return this.response304(res)
        else res.setHeader('etag', this.js.other);
      }
    } else if (url.startsWith('/css')) {
      res.setHeader('cache-control', 'max-age=86400');
      if (url === '/css/play.css') {
        if (noneMatch === this.css.play) return this.response304(res)
        else res.setHeader('etag', this.css.play);
      } else if (url === '/css/site.css') {
        if (noneMatch === this.css.site) return this.response304(res)
        else res.setHeader('etag', this.css.site);
      }
    } else res.setHeader('cache-control', 'no-store');
  }
  response304(res) {
  	res.statusCode = 304;
  	res.end();
    return true;
  }
  static include(fs) {
    return new CacheControl(fs);
  }
}

module.exports = CacheControl;
