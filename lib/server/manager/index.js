'use strict';

/**
 * Module dependencies.
 */
const Readable = require('stream').Readable;
const fs = require('fs');
const path = require('path');
const uuid = require('uuid').v1;
const assert = require('assert');
const bcrypt = require('bcryptjs');
const exif = require('exif-parser');
const jwt = require('jsonwebtoken');
const S3 = require('aws-sdk/clients/s3');
const DB = require('./DB');
const ERRORIDS = require(path.join(__dirname.split('lib')[0], 'lib',
    'errorids')).MANAGER;

/**
 * The image uploader manager.
 * @class Manager
 */
class Manager {
  /**
   * Constructs the manager instance.
   * @param {Function} debug The server debugger.
   * @param {String} url MongoDB connection url.
   * @param {String} db The database name.
   * @param {String} collection The collection name.
   * @param {String} bucket The AWS S3 bucket name.
   * @param {String} jwtSecret The JWT secret.
   */
  constructor({debug, url, db, collection, bucket, jwtSecret}) {
    /**
     * Validate configs
     */
    assert.equal(typeof debug, 'function');
    assert.equal(typeof bucket, 'string');
    assert.equal(typeof jwtSecret, 'string');

    /**
     * Initialize manager properties.
     */
    this._priv = {};
    this._priv.ERRORIDS = ERRORIDS;
    this._priv.debug = debug;
    this._priv.db = new DB({url, db, collection, debug});
    this._priv.bucket = bucket;
    this._priv.jwtSecret = jwtSecret;
    this._priv.s3 = new S3();
    this._priv.ready = false;
  }

  /**
   * Initializes the DB instance.
   * @return {Promise<void>}
   */
  async init() {
    /**
     * Initialize DB instance.
     */
    await this._priv.db.init();

    this._priv.ready = true;
  }

  /**
   * Checks whether the manager had been initialized.
   * @return {Boolean}
   */
  isReady() {
    return this._priv && this._priv.ready || false;
  }

  /**
   * Registers a new user.
   * @param {String} username
   * @param {String} password
   * @return {Promise<{jwt: string}>}
   */
  async registerUser({username, password}) {
    if (this.isReady()) {
      try {
        assert.equal(typeof password, 'string');
      } catch (e) {
        throw new Error(this._priv.ERRORIDS.INVALID_PARAMETERS);
      }

      await this._priv.db.insertUser({
        username: username,
        hashedPassword: bcrypt.hashSync(password),
      });

      return await this.loginUser({username, password});
    } else {
      throw new Error(this._priv.ERRORIDS.NOT_INITIALIZED);
    }
  }

  /**
   * Validates the user's credentials and provides jwt.
   * @param {String} username
   * @param {String} password
   * @return {Promise<{jwt: string}>}
   */
  async loginUser({username, password}) {
    let user;

    if (this.isReady()) {
      try {
        assert.equal(typeof password, 'string');
      } catch (e) {
        throw new Error(this._priv.ERRORIDS.INVALID_PARAMETERS);
      }

      user = await this._priv.db.getUser({
        username,
      });

      if (bcrypt.compareSync(password, user.hashedPassword)) {
        return {
          jwt: jwt.sign({
            username: user.username,
          }, this._priv.jwtSecret),
        };
      } else {
        throw Object.assign(new Error(
            this._priv.ERRORIDS.INVALID_CREDENTIALS), {
          statusCode: 401,
        });
      }
    } else {
      throw new Error(this._priv.ERRORIDS.NOT_INITIALIZED);
    }
  }

  /**
   * Retrieves the list of uploaded images for user.
   * @param {String} username
   * @return {Promise<{Array}>}
   */
  async getUploadedImagesForUser({username}) {
    let user;

    if (this.isReady()) {
      try {
        assert.equal(typeof username, 'string');
      } catch (e) {
        throw new Error(this._priv.ERRORIDS.INVALID_PARAMETERS);
      }

      user = await this._priv.db.getUser({
        username,
      });

      return user.images;
    } else {
      throw new Error(this._priv.ERRORIDS.NOT_INITIALIZED);
    }
  }

  /**
   * Uploads image and associated metadata to S3
   * and saves references in user object.
   * @param {String} username the username of the target user.
   * @param {Buffer} file the file buffer.
   * @param {String} path the path of the file.
   * @param {String} fileName the name of the file.
   * @param {String} mimetype the mimetype of the file.
   * @return {Promise<{metadataId: string, imageId: string}>}
   */
  async uploadImageForUser({username, file, path, fileName, mimetype}) {
    if (this.isReady()) {
      let metadata;

      try {
        assert.equal(typeof username, 'string');
        assert.equal(typeof file, 'object');
        assert.equal(typeof path, 'string');
        assert.equal(typeof fileName, 'string');
        assert.equal(typeof mimetype, 'string');
      } catch (e) {
        throw new Error(this._priv.ERRORIDS.INVALID_PARAMETERS);
      }

      try {
        metadata = exif.create(file).parse();
      } catch (e) {
        this._priv.debug(e);
      }
      const metadataStream = metadata &&
        bufferToStream(Buffer.from(JSON.stringify(metadata,
            null, 4)));
      const fileStream = fs.createReadStream(path);
      const metadataKey = metadata && uuid();
      const fileKey = uuid();

      metadata && metadataStream.on('error', function(err) {
        this._priv.debug(err);
        throw new Error(this._priv.ERRORIDS.UPLOAD_FAILED);
      }.bind(this));

      fileStream.on('error', function(err) {
        this._priv.debug(err);
        throw new Error(this._priv.ERRORIDS.UPLOAD_FAILED);
      }.bind(this));

      try {
        await Promise.all([new Promise((resolve, reject) => {
          this._priv.s3.upload({
            Bucket: this._priv.bucket,
            Body: fileStream,
            Key: fileKey,
            ContentType: mimetype,
          }, function(err, data) {
            if (err) {
              reject(err);
            } else {
              resolve(data);
            }
          });
        }), new Promise((resolve, reject) => {
          if (!metadata) {
            resolve();
          } else {
            this._priv.s3.upload({
              Bucket: this._priv.bucket,
              Body: metadataStream,
              Key: metadataKey,
              ContentType: 'application/json',
            }, function(err, data) {
              if (err) {
                reject(err);
              } else {
                resolve(data);
              }
            });
          }
        })]);
      } catch (e) {
        this._priv.debug(e);
        throw new Error(this._priv.ERRORIDS.UPLOAD_FAILED);
      }

      await this._priv.db.addImageToUser({
        username,
        imageName: fileName,
        imageId: fileKey,
        metadataId: metadataKey,
      });

      return {
        imageId: fileKey,
        metadataId: metadataKey,
      };
    } else {
      throw new Error(this._priv.ERRORIDS.NOT_INITIALIZED);
    }
  }

  /**
   * Downloads a user file from S3.
   * @param {String} username The target username.
   * @param {String} fileId The target file id.
   * @return {Promise<stream.Readable>}
   */
  async getFileForUser({username, fileId}) {
    if (this.isReady()) {
      try {
        assert.equal(typeof username, 'string');
        assert.equal(typeof fileId, 'string');
      } catch (e) {
        throw new Error(this._priv.ERRORIDS.INVALID_PARAMETERS);
      }

      const user = await this._priv.db.getUser({username});
      const fileFoundinDB = user.images.filter(function(imageObject) {
        return imageObject.imageId === fileId ||
          imageObject.metadataId === fileId;
      }).length > 0;
      const fileFoundInS3 = await new Promise((resolve) => {
        this._priv.s3.listObjects({
          Bucket: this._priv.bucket,
          Prefix: fileId,
          MaxKeys: 1,
        }, function(error, result) {
          if (error || result == null ||
            result.Contents == null ||
            result.Contents.length === 0) {
            resolve(false);
          } else {
            resolve(true);
          }
        });
      });

      if (!fileFoundinDB || !fileFoundInS3) {
        throw new Error(this._priv.ERRORIDS.FILE_NOT_FOUND);
      } else {
        try {
          return this._priv.s3.getObject({
            Bucket: this._priv.bucket,
            Key: fileId,
          }).createReadStream();
        } catch (e) {
          this._priv.debug(e);
          throw new Error(this._priv.ERRORIDS.FILE_NOT_FOUND);
        }
      }
    } else {
      throw new Error(this._priv.ERRORIDS.NOT_INITIALIZED);
    }
  }
}

/**
 * Converts a buffer to a stream.
 * @param {Buffer} buffer
 * @return {module:stream.internal.Readable}
 */
function bufferToStream(buffer) {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);

  return stream;
}

/**
 * Exports
 * @type {Manager}
 */
module.exports = Manager;
