'use strict';

var Promise = require('bluebird');
var lwip = require('lwip');

var getBgColor = function (color, type) {
  if (type === 'jpg') {
    return [color[0], color[1], color[2], 100];
  }
  return [color[0], color[1], color[2], color[3]];
};

var createCanvas = function (width, height, color) {
  return new Promise(function (resolve, reject) {
    lwip.create(width, height, color, function (err, image) {
      if (!err) {
        resolve(image);
      }
      else {
        reject(err);
      }
    });
  });
};

var paste = function (tile, canvas) {
  return new Promise(function (resolve, reject) {
    lwip.open(tile.contents, tile.type, function (err, img) {
      if (err) {
        reject(err);
      }
      else {
        canvas.paste(tile.x + tile.offset, tile.y + tile.offset, img, function (e) {
          if (!e) {
            resolve(canvas);
          }
          else {
            reject(e);
          }
        });
      }
    });
  });
};

var toBuffer = function (canvas, opt) {
  return new Promise(function (resolve, reject) {
    var type = opt.type || 'png';
    canvas.toBuffer(type, {}, function (err, buf) {
      if (!err) {
        resolve({
          type: type,
          mimeType: 'image/' + type,
          contents: buf,
          width: canvas.width(),
          height: canvas.height()
        });
      }
      else {
        reject(err);
      }
    });
  });
};

var scaleImage = function (base, opt) {
  return new Promise(function (resolve, reject) {
    lwip.open(base, opt.type, function (err, img) {
      if (err) {
        reject(err);
      }
      else {
        var interpolation = opt['lwip-interpolation'] ? opt['lwip-interpolation'] : 'lanczos';
        img.scale(opt.scale, interpolation, function (e, image) {
          if (!e) {
            resolve(image);
          }
          else {
            reject(e);
          }
        });
      }
    });
  });
};

module.exports = {
  create: function (tiles, opt) {
    return createCanvas(opt.width, opt.height, getBgColor(opt.bgColor, opt.type || 'png'))
      .then(function (c) {
        return Promise.map(tiles, function (tile) {
          return paste(tile, c);
        }, {concurrency: 1});
      })
      .then(function (c) {
        return toBuffer(c[0], opt);
      });
  },
  scale: function (base, opt) {
    return scaleImage(base.contents, opt)
      .then(function (image) {
        return toBuffer(image, opt);
      });
  }
};
