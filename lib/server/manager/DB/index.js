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
   */
  constructor({url, db, collection}) {
    /**
     * Initialize server properties.
     */
    this._priv = {};
    this._priv.ERRORIDS = ERRORIDS;
    this._priv.url = url;
    this._priv.dbName = db;
    this._priv.collectionName = collection;
    this._priv.ready = false;
  }

  /**
   * Initializes the MongoDB connection.
   * @return {Promise<void>}
   */
  async init() {
    return new Promise(((resolve, reject) => {
      MongoClient.connect(this._priv.url, async (error, client)=> {
        if (error) {
          reject(error);
        } else {
          this._priv.db = client.db(this._priv.dbName);
          this._priv.collection = this._priv.db
              .collection(this._priv.collectionName);

          await createIndexes(this);

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
}

/**
 * Creates necessary indexes if they don't exist.
 * @param {DB} db The database instance.
 * @return {Promise<void>}
 */
async function createIndexes(db) {
  assert.strictEqual(db._priv.collection instanceof
    mongodb.Collection, true);

  await db._priv.collection.ensureIndex({id: 1});
  await db._priv.collection.ensureIndex({title: 1});
  await db._priv.collection.ensureIndex({authors: 1});
  await db._priv.collection.ensureIndex({publicationDate: 1});
}

/**
 * Exports
 * @type {DB}
 */
module.exports = DB;
