# metadata-parser

An express server capable of downloading all the project Gutenberg titles, parsing their metadata, and storing them in MongoDB.

## Usage
1. Execute `npm run start` to start the server.
2. Execute `npm run client` to initiate the processing request.
* Note: `npm run client` would run with the specified host and port only, change them in `package.json` if necessary.

## Linting
This module uses `eslint` for linting. Run `npm run lint` to check the code for linting errors.


## Documentation
This module uses JsDoc for documentation.

## Notes
* The timeouts have been chosen to comply with the developer's machine specs. Update the timeout environment variable if necessary.

## TODO
* Improve the DB instance initialization in the Manager.
* Update MongoDB in chunks instead of individual updates.
* Complete the testing coverage for the module.

## Benchmark
Windows 10 Pro x64 - Intel Core i5 - 6 Gb RAM
```text
  metadata-extractor:server Starting feed file download. +2ms
  metadata-extractor:server Finished feed file download. +4m
  metadata-extractor:server Starting decompressing zip file. +0ms
  metadata-extractor:server Finished decompressing zip file. +27s
  metadata-extractor:server Starting decompressing tar file. +7ms
  metadata-extractor:server Finished decompressing tar file. +4m
  metadata-extractor:server Starting processing 62228 files. +21s
  metadata-extractor:server Finished processing files. +17m

  GET / 200 1540589.864 ms - 21
```
