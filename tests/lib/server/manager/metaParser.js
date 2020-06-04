'use strict';

const sinon = require('sinon');
const path = require('path');
const assert = require('assert');
const MetaParser = require(path
    .join(__dirname.replace('tests', ''), 'metaParser'));
const xml2js = require('xml2js');
const fs = require('fs');


describe('Server - Manager - MetaParser:', function() {
  const parsedXmlPath = path.join(__dirname, 'parsedXml.json');
  let fakeConfigs;

  beforeEach(function() {
    fakeConfigs = {
      rdfPath: '/fake/path',
      debug: function() {},
    };
  });

  describe('Constructor:', function() {
    describe('Failures:', function() {
      it('should fail if `rdfPath` is not a string.', function() {
        fakeConfigs.rdfPath = null;
        assert.throws(()=> {
          new MetaParser(fakeConfigs);
        });
      });

      it('should fail if `debug` is not a function.', function() {
        fakeConfigs.debug = null;
        assert.throws(()=> {
          new MetaParser(fakeConfigs);
        });
      });
    });

    describe('Success:', function() {
      it('should initialize the private properties.', function() {
        const parser = new MetaParser(fakeConfigs);
        assert.strictEqual(parser._priv.rdfPath, fakeConfigs.rdfPath);
        assert.strictEqual(parser._priv.debug, fakeConfigs.debug);
        assert.strictEqual(parser._priv.parser instanceof xml2js.Parser, true);
      });
    });
  });

  describe('Public methods:', function() {
    let metaParser;

    beforeEach(function() {
      metaParser = new MetaParser(fakeConfigs);
    });

    describe('Parse:', function() {
      describe('Failures:', function() {
        it('should throw an exception if `parser.parseStringPromise` fails.',
            async function() {
              const fakeError = new Error();

              sinon.stub(fs, 'readFileSync').throws(fakeError);

              metaParser.parse().catch((err)=> {
                assert.equal(err, fakeError);
              });

              fs.readFileSync.restore();
            });

        it('should throw an exception if `parser.parseStringPromise` fails.',
            async function() {
              const fakeError = new Error();

              sinon.stub(fs, 'readFileSync').returns('fake file contents');
              sinon.stub(metaParser._priv.parser, 'parseStringPromise')
                  .throws(fakeError);

              metaParser.parse().catch((err)=> {
                assert.equal(err, fakeError);
              });

              fs.readFileSync.restore();
              metaParser._priv.parser.parseStringPromise.restore();
            });
      });

      describe('Success', function() {
        it('should add the parsed metadata to the instance properties.',
            async function() {
              const fakeParsedJson = 'fake parsed json';

              sinon.stub(fs, 'readFileSync').returns('fake file contents');
              sinon.stub(metaParser._priv.parser, 'parseStringPromise')
                  .returns(fakeParsedJson);

              metaParser.parse().then((result)=> {
                assert.deepStrictEqual(result, metaParser);
                assert.deepStrictEqual(metaParser._priv.parsedXml,
                    fakeParsedJson);
              });

              fs.readFileSync.restore();
              metaParser._priv.parser.parseStringPromise.restore();
            });
      });
    });

    describe('Mask:', function() {
      describe('Failures:', function() {
        it('should return null if the parsed xml does not exist' +
          ' in the instance.', function() {
          metaParser._priv.parsedXml = null;

          assert.equal(metaParser.mask(), null);
        });
      });

      describe('Success:', function() {
        it('should return the masked properties', function() {
          metaParser._priv.parsedXml = JSON.
              parse(fs.readFileSync(parsedXmlPath, 'utf8'));

          assert.deepStrictEqual(metaParser.mask(), {
            id: 10,
            language: 'en',
            title: 'The King James Version of the Bible',
            subjects: ['Bible', 'BS'],
            authors: [],
            rights: ['Public domain in the USA.'],
            publicationDate: new Date(Date.parse('1989-08-01')),
            publisher: 'Project Gutenberg',
          });
        });
      });
    });
  });
});
