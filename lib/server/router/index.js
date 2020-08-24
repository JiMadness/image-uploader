'use strict';

/**
 * Module dependencies.
 */
const path = require('path');
const os = require('os');
const fs = require('fs');
const multer = require('multer');
const ExpressRouter = require('express').Router;
const ERRORIDS = require(path.join(__dirname.split('lib')[0], 'lib',
    'errorids')).ROUTER;

/**
 * The express application router.
 * @class Router
 */
class Router {
  /**
   * Constructs the router instance.
   * @param {Manager} The image uploader manager.
   */
  constructor({manager}) {
    /**
     * Initialize router properties.
     */
    this._priv = {};
    this._priv.manager = manager;
    this._priv.router = new ExpressRouter();

    /**
     * Initialize routes.
     */
    initializeRoutes(this._priv.router, this._priv.manager);
  }

  /**
   * Returns the express router.
   * @return {ExpressRouter}
   */
  getExpressRouter() {
    return this._priv.router;
  }
}

/**
 * Initializes the routes for a router instance.
 * @param {ExpressRouter} router The target express router.
 * @param {Manager} manager The metadata extraction manager.
 */
function initializeRoutes(router, manager) {
  router.get('/echo', async function(req, res) {
    res.json({
      ok: true,
      timestamp: Date.now(),
    });
  });

  router.post('/users/registration', async function(req, res, next) {
    try {
      const result = await manager.registerUser({
        username: req.body.username,
        password: req.body.password,
      });
      res.json(result);
    } catch (e) {
      next(e);
    }
  });

  router.post('/users/login', async function(req, res, next) {
    try {
      const result = await manager.loginUser({
        username: req.body.username,
        password: req.body.password,
      });
      res.json(result);
    } catch (e) {
      next(e);
    }
  });

  router.get('/images', async function(req, res, next) {
    try {
      const result = await manager.getUploadedImagesForUser({
        username: req.user.username,
      });
      res.json(result);
    } catch (e) {
      next(e);
    }
  });

  router.post('/images', multer({
    dest: os.tmpdir(),
    limits: {
      fileSize: 10000000,
    },
  }).single('image'), async function(req, res, next) {
    try {
      if (!req.file) {
        throw new Error(ERRORIDS.NO_FILE_PROVIDED);
      }

      if (!req.file.mimetype.includes('image')) {
        throw new Error(ERRORIDS.FILE_NOT_SUPPORTED);
      }

      const fileBuffer = fs.readFileSync(req.file.path);

      const result = await manager.uploadImageForUser({
        username: req.user.username,
        file: fileBuffer,
        path: req.file.path,
        fileName: req.file.originalname,
        mimetype: req.file.mimetype,
      });

      res.json(result);
    } catch (e) {
      next(e);
    }
  });

  router.get('/images/:fileId', async function(req, res, next) {
    try {
      const stream = await manager.getFileForUser({username: req.user.username,
        fileId: req.params.fileId});
      stream.pipe(res);
    } catch (e) {
      next(e);
    }
  });
}

/**
 * Exports
 * @type {Router}
 */
module.exports = Router;
