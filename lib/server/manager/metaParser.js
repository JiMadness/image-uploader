'use strict';

/**
 * Module dependencies.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const xml2js = require('xml2js');
const ERRORIDS = require(path.join(__dirname.split('lib')[0], 'lib',
    'errorids')).META_PARSER;

/**
 * The rdf meta parser.
 * @class MetaParser
 */
class MetaParser {
  /**
   * Constructs the meta parser instance.
   * @param {String} rdfPath The path of the target rdf file.
   * @param {Function} debug The server debugger.
   */
  constructor({rdfPath, debug}) {
    /**
     * Validate configs
     */
    assert.equal(typeof rdfPath, 'string');
    assert.equal(typeof debug, 'function');


    this._priv = {};
    this._priv.rdfPath = rdfPath;
    this._priv.debug = debug;
    this._priv.parser = new xml2js.Parser();
    this._priv.ERRORIDS = ERRORIDS;
  }

  /**
   * Parses the rdf file to JSON.
   * @return {Promise<MetaParser>} Meta parser instance with the parsed JSON.
   */
  async parse() {
    try {
      const xml = fs.readFileSync(this._priv.rdfPath);
      this._priv.parsedXml = await this._priv.parser.parseStringPromise(xml);

      return this;
    } catch (e) {
      throw e;
    }
  }

  /**
   * @typedef MaskedMetadata
   * @param {Number} id The book identifier.
   * @param {String|null} language The book language.
   * @param {String|null} title The book title.
   * @param {String[]} subject The book subjects.
   * @param {String[]} authors The book authors.
   * @param {String[]} rights The book rights.
   * @param {Date|null} publicationDate The book publication date.
   * @param {String|null} publisher The book publisher.
   */

  /**
   * Returns the masked metadata.
   * @return {MaskedMetadata}
   */
  mask() {
    /**
     * Make sure the parsed xml exists.
     */
    if (this._priv.parsedXml == null) {
      this._priv.debug('Warning:',
          new Error(this._priv.ERRORIDS.PARSED_XML_NOT_FOUND),
          this._priv.rdfPath);

      return null;
    }

    /**
     * Extract properties.
     */
    const id = +_.get(this._priv.parsedXml,
        'rdf:RDF.pgterms:ebook[0].$.rdf:about').replace('ebooks/', '');
    const language = _.get(this._priv.parsedXml,
        'rdf:RDF.pgterms:ebook[0].dcterms:language[0]' +
      '.rdf:Description[0].rdf:value[0]._', null);
    const title = _.get(this._priv.parsedXml,
        'rdf:RDF.pgterms:ebook[0].dcterms:title[0]', null);
    const subjects = _.get(this._priv.parsedXml,
        'rdf:RDF.pgterms:ebook[0].dcterms:subject', [])
        .map((item) =>
          _.get(item, 'rdf:Description[0].rdf:value[0]', null),
        )
        .filter((subject) => subject);
    const authors = _.get(this._priv.parsedXml,
        'rdf:RDF.pgterms:ebook[0].dcterms:creator[0].pgterms:agent', [])
        .map((item) => _.get(item, 'pgterms:name[0]', null))
        .filter((author) => author);
    const rights = _.get(this._priv.parsedXml,
        'rdf:RDF.pgterms:ebook[0].dcterms:rights', []);
    const publicationDateString = _.get(this._priv.parsedXml,
        'rdf:RDF.pgterms:ebook[0].dcterms:issued[0]._', null);
    const publicationDate = publicationDateString != null ?
         new Date(Date.parse(publicationDateString)) : null;
    const publisher = _.get(this._priv.parsedXml,
        'rdf:RDF.pgterms:ebook[0].dcterms:publisher[0]', null);

    /**
     * Return the masked object.
     */
    return {
      id,
      language,
      title,
      subjects,
      authors,
      rights,
      publicationDate,
      publisher,
    };
  }
}

/**
 * Exports
 * @type {MetaParser}
 */
module.exports = MetaParser;
