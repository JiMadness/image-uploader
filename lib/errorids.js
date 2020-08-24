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
    NOT_INITIALIZED: 'The manager has not been initialized.',
    INVALID_PARAMETERS: 'The provided parameters are invalid.',
    INVALID_CREDENTIALS: 'The provided credentials are invalid.',
    UPLOAD_FAILED: 'Failed to upload file.',
    FILE_NOT_FOUND: 'The requested file is not found.',
  },
  DB: {
    NOT_INITIALIZED: 'The db has not been initialized.',
    INVALID_PARAMETERS: 'The provided parameters are invalid.',
    USERNAME_TAKEN: 'The provided username is already taken.',
    USER_NOT_FOUND: 'The target user was not found in the database.',
    DB_ERROR: 'An internal DB error has occurred.',
  },
  ROUTER: {
    FILE_NOT_SUPPORTED: 'This file type is not supported.',
    NO_FILE_PROVIDED: 'No file was provided.',
  },
};
