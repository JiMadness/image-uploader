'use strict';

/**
 * Module dependencies.
 */
const ExpressRouter = require('express').Router;

/**
 * The express application router.
 * @class Router
 */
class Router {
  /**
   * Constructs the router instance.
   * @param {Manager} The metadata extraction manager.
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
  router.get('/', async function(req, res) {
    try {
      res.json(await manager.execute());
    } catch (e) {
      res.status(500).json(e);
    }
  });
}

/**
 * Exports
 * @type {Router}
 */
module.exports = Router;
