'use strict';

const ReviewsService = require('../service/ReviewsService.js');
const validators = require('./validators.js');
const link = require('./link.js');
const writer = require('../utils/writer.js');

module.exports.getFilmReviews = function getFilmReviews(req, res, next) {
  const filmId = parseInt(req.params.filmId);
  if (isNaN(filmId) || filmId < 1) {
    return writer.writeJson(res, { error: 'Invalid filmId parameter' }, 400);
  }

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
    ReviewsService.getFilmReviewsTotal(filmId),
    ReviewsService.getFilmReviews(pageNo, filmId)
  ])
    .then(([total, reviews]) => {
      if (!reviews || reviews.length === 0) {
        return writer.writeJson(res, { error: 'No reviews found' }, 404);
      }
      const paginated = link.createPagination(
        `/api/films/public/${filmId}/reviews`,
        pageNo,
        total,
        link.addToReview(reviews),
        'reviews'
      );
      writer.writeJson(res, paginated, 200);
    })
    .catch(err => {
      writer.writeJson(res, { error: err.message || err }, 500);
    });
};

module.exports.issueFilmReview = function issueFilmReview(req, res, next) {
  const filmId = parseInt(req.params.filmId);
  if (isNaN(filmId) || filmId < 1) {
    return writer.writeJson(res, { error: 'Invalid filmId parameter' }, 400);
  }

  if (!Array.isArray(req.body) || req.body.length === 0) {
    return writer.writeJson(res, { error: 'Body must be a non-empty array of review invitations' }, 400);
  }

  for (let i = 0; i < req.body.length; i++) {
    const inv = req.body[i];
    if (!inv || typeof inv !== 'object' || inv.reviewerId === undefined) {
      return writer.writeJson(res, { error: 'Invalid review invitation data' }, 400);
    }
    inv.filmId = filmId;
    inv.completed = false;
    if (!validators.validateReview(inv)) {
      return writer.writeJson(res, { error: 'Invalid review invitation data', errors: validators.validateReview.errors }, 400);
    }
  }

  ReviewsService.issueFilmReview(req.body, req.user.id)
    .then(createdReviews => {
      writer.writeJson(res, link.addToReview(createdReviews), 201);
    })
    .catch(err => {
      if (err === 'NO_FILMS' || err === 'PRIVATE_FILM') {
        writer.writeJson(res, { error: 'Film not found or private' }, 404);
      } else if (err === 'USER_NOT_OWNER') {
        writer.writeJson(res, { error: 'User is not the owner' }, 403);
      } else if (err === 'REVIEWER_ID_IS_NOT_USER') {
        writer.writeJson(res, { error: 'One or more invited users do not exist' }, 404);
      } else if (err === 'EXISTING_REVIEW') {
        writer.writeJson(res, { error: 'Review invitation already exists' }, 409);
      } else {
        writer.writeJson(res, { error: err.message || err }, 500);
      }
    });
};

module.exports.getSingleReview = function getSingleReview(req, res, next) {
  const filmId = parseInt(req.params.filmId);
  const reviewerId = parseInt(req.params.reviewerId);
  if (isNaN(filmId) || filmId < 1 || isNaN(reviewerId) || reviewerId < 1) {
    return writer.writeJson(res, { error: 'Invalid parameter(s)' }, 400);
  }

  ReviewsService.getSingleReview(filmId, reviewerId)
    .then(review => {
      writer.writeJson(res, link.addToReview(review), 200);
    })
    .catch(err => {
      if (err === 'NO_REVIEWS') {
        writer.writeJson(res, { error: 'Review not found' }, 404);
      } else {
        writer.writeJson(res, { error: err.message || err }, 500);
      }
    });
};

module.exports.updateSingleReview = function updateSingleReview(req, res, next) {
  const filmId = parseInt(req.params.filmId);
  const reviewerId = parseInt(req.params.reviewerId);
  if (isNaN(filmId) || filmId < 1 || isNaN(reviewerId) || reviewerId < 1) {
    return writer.writeJson(res, { error: 'Invalid parameter(s)' }, 400);
  }

  if (req.user.id !== reviewerId) {
    return writer.writeJson(res, { error: 'User is not the invited reviewer' }, 403);
  }

  if (!req.body || typeof req.body !== 'object') {
    return writer.writeJson(res, { error: 'Invalid review data' }, 400);
  }

  if (req.body.filmId !== undefined && parseInt(req.body.filmId) !== filmId) {
    return writer.writeJson(res, { error: 'Inconsistent filmId' }, 400);
  }
  if (req.body.reviewerId !== undefined && parseInt(req.body.reviewerId) !== reviewerId) {
    return writer.writeJson(res, { error: 'Inconsistent reviewerId' }, 400);
  }
  if (req.body.completed !== true) {
    return writer.writeJson(res, { error: 'completed must be true' }, 400);
  }

  const reviewToValidate = {
    ...req.body,
    filmId: filmId,
    reviewerId: reviewerId,
    completed: true
  };

  if (!validators.validateReview(reviewToValidate)) {
    return writer.writeJson(res, { error: 'Invalid review data', errors: validators.validateReview.errors }, 400);
  }

  ReviewsService.updateSingleReview(reviewToValidate, filmId, reviewerId)
    .then(() => {
      res.status(204).send();
    })
    .catch(err => {
      if (err === 'NO_REVIEWS') {
        writer.writeJson(res, { error: 'Review not found' }, 404);
      } else if (err === 'USER_NOT_REVIEWER') {
        writer.writeJson(res, { error: 'User is not the invited reviewer' }, 403);
      } else {
        writer.writeJson(res, { error: err.message || err }, 500);
      }
    });
};

module.exports.deleteSingleReview = function deleteSingleReview(req, res, next) {
  const filmId = parseInt(req.params.filmId);
  const reviewerId = parseInt(req.params.reviewerId);
  if (isNaN(filmId) || filmId < 1 || isNaN(reviewerId) || reviewerId < 1) {
    return writer.writeJson(res, { error: 'Invalid parameter(s)' }, 400);
  }

  ReviewsService.deleteSingleReview(filmId, reviewerId, req.user.id)
    .then(() => {
      res.status(204).send();
    })
    .catch(err => {
      if (err === 'NO_REVIEWS') {
        writer.writeJson(res, { error: 'Review invitation not found' }, 404);
      } else if (err === 'USER_NOT_OWNER') {
        writer.writeJson(res, { error: 'User is not the owner' }, 403);
      } else if (err === 'ALREADY_COMPLETED') {
        writer.writeJson(res, { error: 'Review already completed, cannot delete invitation' }, 409);
      } else {
        writer.writeJson(res, { error: err.message || err }, 500);
      }
    });
};

module.exports.assignReviewInvitations = function assignReviewInvitations(req, res, next) {
  res.status(204).send();
};

