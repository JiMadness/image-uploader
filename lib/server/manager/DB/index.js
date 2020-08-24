'use strict';

/**
 * Module dependencies.
 */
const path = require('path');
const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;
const assert = require('assert');
const ERRORIDS = require(path.join(__dirname.split('lib')[0], 'lib',
    'errorids')).DB;

/**
 * The database manager.
 * @class DB
 */
class DB {
  /**
   * Constructs the database instance.
   * @param {String} url MongoDB connection url.
   * @param {String} db The database name.
   * @param {String} collection The collection name.
   * @param {Function} debug The server debugger.
   */
  constructor({url, db, collection, debug}) {
    /**
     * Initialize instance properties.
     */
    this._priv = {};
    this._priv.ERRORIDS = ERRORIDS;
    this._priv.url = url;
    this._priv.dbName = db;
    this._priv.collectionName = collection;
    this._priv.debug = debug;
    this._priv.ready = false;
  }

  /**
   * Initializes the MongoDB connection.
   * @return {Promise<void>}
   */
  async init() {
    return new Promise(((resolve, reject) => {
      MongoClient.connect(this._priv.url, {
        useUnifiedTopology: true,
      }, async (error, client)=> {
        if (error) {
          reject(error);
        } else {
          this._priv.db = client.db(this._priv.dbName);
          this._priv.collection = this._priv.db
              .collection(this._priv.collectionName);

          try {
            await createIndexes(this);
          } catch (e) {
            reject(e);
          }

          /**
           * Set the instance as ready.
           */
          this._priv.ready = true;

          resolve();
        }
      });
    }));
  }

  /**
   * Checks whether the db had been initialized.
   * @return {Boolean}
   */
  isReady() {
    return this._priv && this._priv.ready || false;
  }

  /**
   * Inserts metadata if doesn't exist.
   * @param {MaskedMetadata} metadata
   * @return {Promise<void>}
   */
  async insertMetadata(metadata) {
    if (this.isReady()) {
      assert.strictEqual(metadata.id == null, false);

      await this._priv.collection.update({
        id: metadata.id,
      },
      metadata,
      {
        upsert: true,
      });
    } else {
      throw new Error(this._priv.ERRORIDS.NOT_INITIALIZED);
    }
  }

  /**
   * Inserts a new user in the database.
   * @param {String} username
   * @param {String} hashedPassword
   * @return {Promise<Object>}
   */
  async insertUser({username, hashedPassword}) {
    if (this.isReady()) {
      try {
        assert.equal(typeof username, 'string');
        assert.equal(typeof hashedPassword, 'string');
      } catch (e) {
        throw new Error(this._priv.ERRORIDS.INVALID_PARAMETERS);
      }

      try {
        return await this._priv.collection.insert({
          username: username,
          hashedPassword: hashedPassword,
          images: [],
        });
      } catch (e) {
        if (e.code === 11000) {
          throw new Error(this._priv.ERRORIDS.USERNAME_TAKEN);
        } else {
          throw new Error(this._priv.ERRORIDS.DB_ERROR);
        }
      }
    } else {
      throw new Error(this._priv.ERRORIDS.NOT_INITIALIZED);
    }
  }

  /**
   * Gets the user record by username.
   * @param {String} username
   * @return {Promise<Object>}
   */
  async getUser({username}) {
    let user;

    if (this.isReady()) {
      try {
        assert.equal(typeof username, 'string');
      } catch (e) {
        throw new Error(this._priv.ERRORIDS.INVALID_PARAMETERS);
      }

      try {
        user = await this._priv.collection.findOne({
          username,
        });
      } catch (e) {
        throw new Error(this._priv.ERRORIDS.DB_ERROR);
      }

      if (user == null) {
        throw new Error(this._priv.ERRORIDS.USER_NOT_FOUND);
      } else {
        return user;
      }
    } else {
      throw new Error(this._priv.ERRORIDS.NOT_INITIALIZED);
    }
  }

  /**
   * Adds an uploaded image to the user's list of uploaded images.
   * @param {String} username The username of the target user.
   * @param {String} imageId The id of the target image.
   * @param {String} imageName The name of the target image.
   * @param {String} metadataId The id of the extracted metadata (optional).
   * @return {Promise<{ok: boolean}>}
   */
  async addImageToUser({username, imageName, imageId, metadataId}) {
    let updateResult;

    if (this.isReady()) {
      try {
        assert.equal(typeof username, 'string');
        assert.equal(typeof imageId, 'string');
        assert.equal(typeof metadataId === 'string' ||
          typeof metadataId === 'undefined', true);
      } catch (e) {
        throw new Error(this._priv.ERRORIDS.INVALID_PARAMETERS);
      }

      try {
        updateResult = await this._priv.collection.updateOne({
          username: username,
        }, {
          $push: {
            images: {
              imageName: imageName,
              imageId: imageId,
              metadataId: metadataId,
            },
          },
        });
      } catch (e) {
        this._priv.debug(e);
        throw new Error(this._priv.ERRORIDS.DB_ERROR);
      }

      if (updateResult.modifiedCount < 1) {
        throw new Error(this._priv.USER_NOT_FOUND);
      } else {
        return {ok: true};
      }
    } else {
      throw new Error(this._priv.ERRORIDS.NOT_INITIALIZED);
    }
  }
}

/**
 * Creates necessary indexes if they don't exist.
 * @param {DB} db The database instance.
 * @return {Promise<void>}
 */
async function createIndexes(db) {
  assert.strictEqual(db._priv.collection instanceof
    mongodb.Collection, true);

  /**
   * Create any required indexes here.
   */
  await db._priv.collection.createIndex({username: 1}, {unique: true});
}

/**
 * Exports
 * @type {DB}
 */
module.exports = DB;
