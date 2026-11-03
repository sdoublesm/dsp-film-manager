'use strict';

const constants = require('../utils/constants.js');

/**
 * Replace every /change/me placeholder with the URI of the corresponding
 * operation defined in the OpenAPI document.
 */
module.exports.getFilmManager = function getFilmManager() {
  return {
    films: '/api/films',
    privateFilms: '/api/films/private',
    publicFilms: '/api/films/public',
    invitedPublicFilms: '/api/films/public/invited',
    reviewAssignments: '/api/films/public/reviews/assignments',
    users: '/api/users',
    usersAuthenticator: '/api/users/authenticator'
  };
};

/**
 * These functions can be used on the response of a controller to add the self link or the link to other resources according to the HATEOAS principles.
 */
const addLinksToSingleFilm = function (film) {
  if (!film) return film;
  if (film.private) {
    film.self = `/api/films/private/${film.id}`;
  } else {
    film.self = `/api/films/public/${film.id}`;
    film.reviews = `/api/films/public/${film.id}/reviews`;
  }
  return film;
};

module.exports.addToFilm = function addToFilm(response) {
  if (!response) return response;
  if (Array.isArray(response)) {
    return response.map(film => addLinksToSingleFilm(film));
  }
  return addLinksToSingleFilm(response);
};

const addLinksToSingleUser = function (user) {
  if (!user) return user;
  delete user.hash;
  user.self = `/api/users/${user.id}`;
  return user;
};

module.exports.addToUser = function addToUser(response) {
  if (!response) return response;
  if (Array.isArray(response)) {
    return response.map(user => addLinksToSingleUser(user));
  }
  return addLinksToSingleUser(response);
};

const addLinksToSingleReview = function (review) {
  if (!review) return review;
  review.self = `/api/films/public/${review.filmId}/reviews/${review.reviewerId}`;
  return review;
};

module.exports.addToReview = function addToReview(response) {
  if (!response) return response;
  if (Array.isArray(response)) {
    return response.map(review => addLinksToSingleReview(review));
  }
  return addLinksToSingleReview(response);
};

/**
 * Helper to construct paginated collection representations according to HATEOAS
 */
module.exports.createPagination = function (baseUri, pageNo, totalItems, items, itemsKey = 'films') {
  const pageSize = parseInt(constants.ELEMENTS_IN_PAGE) || 2;
  const totalPages = Math.ceil(totalItems / pageSize) || 0;
  const currentPage = parseInt(pageNo) || 1;

  const result = {
    totalPages: totalPages,
    currentPage: currentPage,
    totalItems: totalItems,
    [itemsKey]: items,
    self: `${baseUri}?pageNo=${currentPage}`,
    first: `${baseUri}?pageNo=1`,
    last: `${baseUri}?pageNo=${Math.max(totalPages, 1)}`
  };

  if (currentPage > 1) {
    result.prev = `${baseUri}?pageNo=${currentPage - 1}`;
  }
  if (currentPage < totalPages) {
    result.next = `${baseUri}?pageNo=${currentPage + 1}`;
  }

  return result;
};
