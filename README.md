# image-uploader

An API to enable system users to securely upload images provided that they are authenticated.

## Usage
1. Execute `npm run start` to start the server.
2. Execute `npm run deploy` to initiate the lambda deployment.

## Linting
This module uses `eslint` for linting. Run `npm run lint` to check the code for linting errors.

## Documentation
This module uses JsDoc for documentation.

## Notes
* The server is capable of running as serverless as well as running using a normal http server. If you want to run it locally please change the environment variable `ENV` to be `dev` instead of `serverless`.
* User registration and login are supported. Only logged-in users are able to upload images.
* IMPORTANT: Only jpg/jpeg metadata extraction is currently supported due to a limitation in the `exif-parser` module.
* The server is capable of extracting metadata from jpg/jpeg files and store it in S3.

## TODO
* Complete the testing coverage for the module.

## How to test?
API Documentation: https://documenter.getpostman.com/view/5150256/TVCY4qrH
