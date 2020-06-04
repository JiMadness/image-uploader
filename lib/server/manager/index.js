'use strict';

/**
 * Module dependencies.
 */
const path = require('path');
const assert = require('assert');
const fs = require('fs');
const http = require('http');
const guid = require('uuid').v1;
const Zip = require('adm-zip');
const tar = require('tar');
const recursive = require('recursive-readdir');
const MetaParser = require('./metaParser');
const DB = require('./DB');
const ERRORIDS = require(path.join(__dirname.split('lib')[0], 'lib',
    'errorids')).MANAGER;

/**
 * The metadata extraction manager.
 * @class Manager
 */
class Manager {
  /**
   * Constructs the manager instance.
   * @param {String} feedUrl The url for the feed to fetch data from.
   * @param {String} tempPath The path to store temp data in.
   * @param {Function} debug The server debugger.
   * @param {String} url MongoDB connection url.
   * @param {String} db The database name.
   * @param {String} collection The collection name.
   */
  constructor({feedUrl, tempPath, debug, url, db, collection}) {
    /**
     * Validate configs
     */
    assert.equal(typeof feedUrl, 'string');
    assert.equal(typeof tempPath, 'string');
    assert.equal(typeof debug, 'function');
    assert.equal(typeof url, 'string');
    assert.equal(typeof db, 'string');
    assert.equal(typeof collection, 'string');

    /**
     * Initialize manager properties.
     */
    this._priv = {};
    this._priv.ERRORIDS = ERRORIDS;
    this._priv.feedUrl = feedUrl;
    this._priv.tempPath = tempPath;
    this._priv.debug = debug;
    this._priv.db = new DB({url, db, collection});

    /**
     * Initialize the database.
     */
    this._priv.db.init();

    // Add timeout to allow db initialization to complete.
    setTimeout(()=> {}, 100);
  }

  /**
   * It downloads the archive, decompresses it, and updates the DB.
   * @return {Object}
   */
  async execute() {
    const session = guid();
    const unzipFolderPath = path.join(this._priv.tempPath, session);
    const zipFilePath = path.join(this._priv.tempPath, session + '.tar.zip');


    this._priv.debug('Session id: ' + session);

    try {
      await this.downloadAndDecompress({zipFilePath, unzipFolderPath});

      const fileList = (await recursive(unzipFolderPath, ['*.tar']));

      this._priv.debug('Starting processing ' + fileList.length + ' files.');
      for (const file of fileList) {
        await this._priv.db.insertMetadata((await new MetaParser({
          rdfPath: file,
          debug: this._priv.debug,
        }).parse()).mask());
      }
      this._priv.debug('Finished processing files.');

      return {
        ok: true,
        n: fileList.length,
      };
    } catch (e) {
      this._priv.debug(e);

      throw e;
    }
  }

  /**
   * Downloads target file and decompresses it.
   * @param {String} zipFilePath directory to store the zip file in.
   * @param {String} unzipFolderPath directory to store the unzipped folder in.
   * @return {Promise<void>}
   */
  async downloadAndDecompress({zipFilePath, unzipFolderPath}) {
    const file = fs.createWriteStream(zipFilePath);

    return new Promise(((resolve, reject) => {
      try {
        this._priv.debug('Starting feed file download.');
        http.get(this._priv.feedUrl,
            (response) => {
              response.pipe(file);

              file.on('finish', ()=> {
                file.close(()=> {
                  this._priv.debug('Finished feed file download.');

                  const tarFilePath = path.join(unzipFolderPath,
                      'rdf-files.tar');

                  this._priv.debug('Starting decompressing zip file.');
                  new Zip(zipFilePath)
                      .extractAllTo(unzipFolderPath, true);
                  this._priv.debug('Finished decompressing zip file.');

                  this._priv.debug('Starting decompressing tar file.');
                  tar.extract({
                    file: tarFilePath,
                    C: unzipFolderPath,
                  }).then(()=> {
                    this._priv.debug('Finished decompressing tar file.');

                    resolve();
                  });
                });
              });
            });
      } catch (e) {
        reject(e);
      }
    }));
  }
}

/**
 * Exports
 * @type {Manager}
 */
module.exports = Manager;
