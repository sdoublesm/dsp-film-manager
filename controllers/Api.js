'use strict';

const link = require('./link.js');
const writer = require('../utils/writer.js');

module.exports.getFilmManager = function getFilmManager(req, res, next) {
  const filmManager = link.getFilmManager();
  writer.writeJson(res, filmManager, 200);
};

