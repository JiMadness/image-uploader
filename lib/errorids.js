'use strict';

/**
 * Exports
 * @type {Object}
 */
module.exports = {
  SERVER: {
    NOT_INITIALIZED: 'The server has not been initialized.',
    INVALID_PORT: 'An invalid port had been provided.',
  },
  MANAGER: {
  },
  META_PARSER: {
    NOT_INITIALIZED: 'The metaparser has not been initialized.',
    PARSED_XML_NOT_FOUND: 'The parsed XML was not found.' +
      ' Please make sure to call `metaParser.parse()` first.',
  },
  DB: {
    NOT_INITIALIZED: 'The db has not been initialized.',
  },
};
