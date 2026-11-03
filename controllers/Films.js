'use strict';

const FilmsService = require('../service/FilmsService.js');
const validators = require('./validators.js');
const link = require('./link.js');
const writer = require('../utils/writer.js');

module.exports.createFilm = function createFilm(req, res, next) {
  if (!req.body || typeof req.body !== 'object') {
    return writer.writeJson(res, { error: 'Invalid film data' }, 400);
  }

  const filmToValidate = {
    id: req.body.id !== undefined ? req.body.id : 1,
    owner: req.body.owner !== undefined ? req.body.owner : req.user.id,
    ...req.body
  };

  if (!validators.validateFilm(filmToValidate)) {
    return writer.writeJson(res, { error: 'Invalid film data', errors: validators.validateFilm.errors }, 400);
  }

  FilmsService.createFilm(req.body, req.user.id)
    .then(createdFilm => {
      writer.writeJson(res, link.addToFilm(createdFilm), 201);
    })
    .catch(err => {
      writer.writeJson(res, { error: err.message || err }, 500);
    });
};

module.exports.getPublicFilms = function getPublicFilms(req, res, next) {
  let pageNo = req.query.pageNo;
  if (pageNo !== undefined) {
    pageNo = parseInt(pageNo);
    if (isNaN(pageNo) || pageNo < 1) {
      return writer.writeJson(res, { error: 'Invalid page number' }, 400);
    }
  } else {
    pageNo = 1;
  }

  Promise.all([
    FilmsService.getPublicFilmsTotal(),
    FilmsService.getPublicFilms(pageNo)
  ])
    .then(([total, films]) => {
      if (!films || films.length === 0) {
        return writer.writeJson(res, { error: 'No public films found' }, 404);
      }
      const paginated = link.createPagination('/api/films/public', pageNo, total, link.addToFilm(films), 'films');
      writer.writeJson(res, paginated, 200);
    })
    .catch(err => {
      writer.writeJson(res, { error: err.message || err }, 500);
    });
};

module.exports.getPrivateFilms = function getPrivateFilms(req, res, next) {
  let pageNo = req.query.pageNo;
  if (pageNo !== undefined) {
    pageNo = parseInt(pageNo);
    if (isNaN(pageNo) || pageNo < 1) {
      return writer.writeJson(res, { error: 'Invalid page number' }, 400);
    }
  } else {
    pageNo = 1;
  }

  Promise.all([
    FilmsService.getPrivateFilmsTotal(req.user.id),
    FilmsService.getPrivateFilms(req.user.id, pageNo)
  ])
    .then(([total, films]) => {
      if (!films || films.length === 0) {
        return writer.writeJson(res, { error: 'No private films found' }, 404);
      }
      const paginated = link.createPagination('/api/films/private', pageNo, total, link.addToFilm(films), 'films');
      writer.writeJson(res, paginated, 200);
    })
    .catch(err => {
      writer.writeJson(res, { error: err.message || err }, 500);
    });
};

module.exports.getInvitedFilms = function getInvitedFilms(req, res, next) {
  let pageNo = req.query.pageNo;
  if (pageNo !== undefined) {
    pageNo = parseInt(pageNo);
    if (isNaN(pageNo) || pageNo < 1) {
      return writer.writeJson(res, { error: 'Invalid page number' }, 400);
    }
  } else {
    pageNo = 1;
  }

  Promise.all([
    FilmsService.getInvitedFilmsTotal(req.user.id),
    FilmsService.getInvitedFilms(req.user.id, pageNo)
  ])
    .then(([total, films]) => {
      if (!films || films.length === 0) {
        return writer.writeJson(res, { error: 'No invited films found' }, 404);
      }
      const paginated = link.createPagination('/api/films/public/invited', pageNo, total, link.addToFilm(films), 'films');
      writer.writeJson(res, paginated, 200);
    })
    .catch(err => {
      writer.writeJson(res, { error: err.message || err }, 500);
    });
};

module.exports.getSinglePublicFilm = function getSinglePublicFilm(req, res, next) {
  const filmId = parseInt(req.params.filmId);
  if (isNaN(filmId) || filmId < 1) {
    return writer.writeJson(res, { error: 'Invalid filmId parameter' }, 400);
  }

  FilmsService.getSinglePublicFilm(filmId)
    .then(film => {
      writer.writeJson(res, link.addToFilm(film), 200);
    })
    .catch(err => {
      if (err === 'NO_FILMS' || err === 'NO_PUBLIC_FILM') {
        writer.writeJson(res, { error: 'Film not found or not public' }, 404);
      } else {
        writer.writeJson(res, { error: err.message || err }, 500);
      }
    });
};

module.exports.updateSinglePublicFilm = function updateSinglePublicFilm(req, res, next) {
  const filmId = parseInt(req.params.filmId);
  if (isNaN(filmId) || filmId < 1) {
    return writer.writeJson(res, { error: 'Invalid filmId parameter' }, 400);
  }
  if (!req.body || typeof req.body !== 'object') {
    return writer.writeJson(res, { error: 'Invalid film data' }, 400);
  }
  if (req.body.id !== undefined && parseInt(req.body.id) !== filmId) {
    return writer.writeJson(res, { error: 'Inconsistent film ID' }, 400);
  }
  if (req.body.private !== undefined && req.body.private !== false) {
    return writer.writeJson(res, { error: 'Cannot change visibility of a public film' }, 403);
  }

  const filmToValidate = {
    id: filmId,
    owner: req.user.id,
    ...req.body,
    private: false
  };

  if (!validators.validateFilm(filmToValidate)) {
    return writer.writeJson(res, { error: 'Invalid film data', errors: validators.validateFilm.errors }, 400);
  }

  FilmsService.updateSinglePublicFilm(req.body, filmId, req.user.id)
    .then(() => {
      res.status(204).send();
    })
    .catch(err => {
      if (err === 'NO_FILMS' || err === 'NO_PUBLIC_FILM') {
        writer.writeJson(res, { error: 'Film not found or not public' }, 404);
      } else if (err === 'USER_NOT_OWNER') {
        writer.writeJson(res, { error: 'User is not the owner' }, 403);
      } else {
        writer.writeJson(res, { error: err.message || err }, 500);
      }
    });
};

module.exports.deleteSinglePublicFilm = function deleteSinglePublicFilm(req, res, next) {
  const filmId = parseInt(req.params.filmId);
  if (isNaN(filmId) || filmId < 1) {
    return writer.writeJson(res, { error: 'Invalid filmId parameter' }, 400);
  }

  FilmsService.deleteSinglePublicFilm(filmId, req.user.id)
    .then(() => {
      res.status(204).send();
    })
    .catch(err => {
      if (err === 'NO_FILMS' || err === 'NO_PUBLIC_FILM') {
        writer.writeJson(res, { error: 'Film not found or not public' }, 404);
      } else if (err === 'USER_NOT_OWNER') {
        writer.writeJson(res, { error: 'User is not the owner' }, 403);
      } else {
        writer.writeJson(res, { error: err.message || err }, 500);
      }
    });
};

module.exports.getSinglePrivateFilm = function getSinglePrivateFilm(req, res, next) {
  const filmId = parseInt(req.params.filmId);
  if (isNaN(filmId) || filmId < 1) {
    return writer.writeJson(res, { error: 'Invalid filmId parameter' }, 400);
  }

  FilmsService.getSinglePrivateFilm(filmId, req.user.id)
    .then(film => {
      writer.writeJson(res, link.addToFilm(film), 200);
    })
    .catch(err => {
      if (err === 'NO_FILMS' || err === 'NO_PRIVATE_FILM') {
        writer.writeJson(res, { error: 'Film not found or not private' }, 404);
      } else if (err === 'USER_NOT_OWNER') {
        writer.writeJson(res, { error: 'User is not the owner' }, 403);
      } else {
        writer.writeJson(res, { error: err.message || err }, 500);
      }
    });
};

module.exports.updateSinglePrivateFilm = function updateSinglePrivateFilm(req, res, next) {
  const filmId = parseInt(req.params.filmId);
  if (isNaN(filmId) || filmId < 1) {
    return writer.writeJson(res, { error: 'Invalid filmId parameter' }, 400);
  }
  if (!req.body || typeof req.body !== 'object') {
    return writer.writeJson(res, { error: 'Invalid film data' }, 400);
  }
  if (req.body.id !== undefined && parseInt(req.body.id) !== filmId) {
    return writer.writeJson(res, { error: 'Inconsistent film ID' }, 400);
  }
  if (req.body.private !== undefined && req.body.private !== true) {
    return writer.writeJson(res, { error: 'Cannot change visibility of a private film' }, 403);
  }

  const filmToValidate = {
    id: filmId,
    owner: req.user.id,
    ...req.body,
    private: true
  };

  if (!validators.validateFilm(filmToValidate)) {
    return writer.writeJson(res, { error: 'Invalid film data', errors: validators.validateFilm.errors }, 400);
  }

  FilmsService.updateSinglePrivateFilm(req.body, filmId, req.user.id)
    .then(() => {
      res.status(204).send();
    })
    .catch(err => {
      if (err === 'NO_FILMS' || err === 'NO_PRIVATE_FILM') {
        writer.writeJson(res, { error: 'Film not found or not private' }, 404);
      } else if (err === 'USER_NOT_OWNER') {
        writer.writeJson(res, { error: 'User is not the owner' }, 403);
      } else {
        writer.writeJson(res, { error: err.message || err }, 500);
      }
    });
};

module.exports.deleteSinglePrivateFilm = function deleteSinglePrivateFilm(req, res, next) {
  const filmId = parseInt(req.params.filmId);
  if (isNaN(filmId) || filmId < 1) {
    return writer.writeJson(res, { error: 'Invalid filmId parameter' }, 400);
  }

  FilmsService.deleteSinglePrivateFilm(filmId, req.user.id)
    .then(() => {
      res.status(204).send();
    })
    .catch(err => {
      if (err === 'NO_FILMS') {
        writer.writeJson(res, { error: 'Film not found or not private' }, 404);
      } else if (err === 'USER_NOT_OWNER') {
        writer.writeJson(res, { error: 'User is not the owner' }, 403);
      } else {
        writer.writeJson(res, { error: err.message || err }, 500);
      }
    });
};

