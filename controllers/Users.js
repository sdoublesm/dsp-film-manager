'use strict';

const UsersService = require('../service/UsersService.js');
const link = require('./link.js');
const writer = require('../utils/writer.js');

module.exports.authenticateUser = function authenticateUser(req, res, next) {
  if (
    !req.body ||
    typeof req.body !== 'object' ||
    !req.body.email ||
    !req.body.password ||
    typeof req.body.email !== 'string' ||
    typeof req.body.password !== 'string' ||
    req.body.password.length < 6 ||
    req.body.password.length > 20
  ) {
    return writer.writeJson(res, { error: 'Invalid credentials data' }, 400);
  }

  UsersService.authenticateUser(req, res, next)
    .then(user => {
      writer.writeJson(res, link.addToUser(user), 200);
    })
    .catch(err => {
      if (err === 'NO_USER' || err === 'Unauthorized access.' || (err && err.message === 'Unauthorized access.')) {
        writer.writeJson(res, { error: 'Wrong email or password' }, 401);
      } else {
        writer.writeJson(res, { error: err.message || err }, 500);
      }
    });
};

module.exports.logoutUser = function logoutUser(req, res, next) {
  UsersService.logoutUser(res, req)
    .then(() => {
      res.status(204).send();
    })
    .catch(err => {
      if (err === 'NO_USER') {
        writer.writeJson(res, { error: 'User not authenticated' }, 401);
      } else {
        writer.writeJson(res, { error: err.message || err }, 500);
      }
    });
};

module.exports.getUsers = function getUsers(req, res, next) {
  UsersService.getUsers()
    .then(users => {
      if (!users || users.length === 0) {
        writer.writeJson(res, { error: 'No user found' }, 404);
      } else {
        writer.writeJson(res, link.addToUser(users), 200);
      }
    })
    .catch(err => {
      writer.writeJson(res, { error: err.message || err }, 500);
    });
};

module.exports.getUserById = function getUserById(req, res, next) {
  const userId = parseInt(req.params.userId);
  if (isNaN(userId) || userId < 1) {
    return writer.writeJson(res, { error: 'Invalid userId parameter' }, 400);
  }

  UsersService.getUserById(userId)
    .then(user => {
      if (!user) {
        writer.writeJson(res, { error: 'User not found' }, 404);
      } else {
        writer.writeJson(res, link.addToUser(user), 200);
      }
    })
    .catch(err => {
      writer.writeJson(res, { error: err.message || err }, 500);
    });
};

