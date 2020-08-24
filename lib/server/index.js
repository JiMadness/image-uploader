'use strict';

/**
 * Module dependencies.
 */
const assert = require('assert');
const path = require('path');
const express = require('express');
const jwtMiddleware = require('express-jwt');
const logger = require('morgan');
const http = require('http');
const Router = require('./router');
const Manager = require('./manager');
const ERRORIDS = require(path.join(__dirname.split('lib')[0], 'lib',
    'errorids')).SERVER;

/**
 * The image uploader server.
 * @class Server
 */
class Server {
  /**
   * Constructs the server instance.
   * @param {String|Number} port The HTTP server port.
   * @param {String} env The environment name.
   * @param {Number} timeout The HTTP server timeout.
   * @param {String} url MongoDB connection url.
   * @param {String} db The database name.
   * @param {String} collection The db collection name.
   * @param {String} bucket The AWS S3 bucket name.
   * @param {String} jwtSecret The JWT secret.
   * @param {String} jwtExcluded Routes excluded from JWT validation.
   */
  constructor({port, env, timeout, url, db, collection,
    bucket, jwtSecret, jwtExcluded}) {
    /**
     * Validate configs
     */
    assert.equal(typeof port === 'string' || typeof port === 'number', true);
    assert.equal(typeof env, 'string');
    assert.equal(typeof timeout, 'number');
    assert.equal(typeof jwtSecret, 'string');
    assert.equal(typeof jwtExcluded, 'string');

    /**
     * Initialize instance properties.
     */
    this._priv = {};
    this._priv.env = env;
    this._priv.timeout = timeout;
    this._priv.port = normalizePort(port);
    this._priv.debug = require('debug')('image-uploader:server');
    this._priv.ERRORIDS = ERRORIDS;
    this._priv.ready = false;

    /**
     * Initialize express app.
     */
    this._priv.express = express();
    this._priv.manager = new Manager({
      url,
      db,
      collection,
      bucket,
      jwtSecret,
      debug: this._priv.debug,
    });

    /**
     * Initialize middleware.
     */
    this._priv.express.use(logger('dev'));
    this._priv.router = new Router({manager: this._priv.manager});
    this._priv.express.use(express.json());
    this._priv.express.use(express.urlencoded({extended: false}));
    this._priv.express.use(jwtMiddleware({secret: jwtSecret,
      algorithms: ['HS256']})
        .unless({path: jwtExcluded.split(/,/g)}));
    this._priv.express.use(this._priv.router.getExpressRouter());
    this._priv.express.use(function(err, req, res, next) {
      this._priv.debug(err);

      if (err.name === 'UnauthorizedError') {
        res.sendStatus(401);
      } else {
        res.status(err.statusCode || 500).json({error: err.message});
      }
    }.bind(this));
  }

  /**
   * Initializes the manager instance.
   */
  async init() {
    /**
     * Initialize manager instance.
     */
    await this._priv.manager.init();

    /**
     * Set the instance as ready.
     */
    this._priv.ready = true;
  }

  /**
   * Checks whether the server had been initialized.
   * @return {Boolean}
   */
  isReady() {
    return this._priv && this._priv.ready || false;
  }

  /**
   * Starts the HTTP server
   * @throws {Error}
   */
  start() {
    if (this.isReady()) {
      /**
       * Initialize HTTP server.
       */
      this._priv.server = http.createServer(this._priv.express);
      this._priv.server.timeout = this._priv.timeout;
      this._priv.server.on('error', onError.bind(null, this));
      this._priv.server.on('listening', onListening.bind(null, this));

      /**
       * Listen on port.
       */
      this._priv.server.listen(this._priv.port);
    } else {
      throw new Error(this._priv.ERRORIDS.NOT_INITIALIZED);
    }
  }

  /**
   * Returns the express app.
   * @return {app}
   */
  getExpressApp() {
    if (this.isReady()) {
      return this._priv.express;
    } else {
      throw new Error(this._priv.ERRORIDS.NOT_INITIALIZED);
    }
  }
}

/**
 * Normalize a port into a number, string, or false.
 * @param {String|Number} val The port value.
 * @return {Number} The normalized port value.
 * @return {Boolean} false in case normalizing the port failed.
 */
function normalizePort(val) {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 * @param {Server} server The server instance.
 * @param {Error} error HTTP error.
 * @throws {Error} HTTP error.
 */
function onError(server, error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error('Port ' + server._priv.port +
        ' requires elevated privileges.');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error('Port ' + server._priv.port + ' is already in use.');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 * @param {Server} server The server instance.
 */
function onListening(server) {
  const addr = server._priv.server.address();
  const bind = typeof addr === 'string' ?
    'pipe ' + addr :
    'port ' + addr.port;
  server._priv.debug('Listening on ' + bind);
}

/**
 * Exports
 * @type {Server}
 */
module.exports = Server;
