'use strict';

const helpers = require('yeoman-test');
const assert = require('yeoman-assert');
const path = require('path');
const fs = require('fs-extra');
const ejs = require('ejs');
const _ = require('lodash');

//
//  Helpers
//

function runGenerator(prompts, done) {
    helpers.run(path.join(__dirname, '../generators/endpoint-cors'))
        .inTmpDir(function(dir) {
            // Make sure there's a stub api.json file in place
            fs.copySync(path.join(__dirname, 'templates/endpoint-cors.json'), path.join(dir, 'api.json'), {
                clobber: true
            });
        })
        .withPrompts(prompts)
        .withOptions({
            force: true
        })
        .on('end', done);
}

function validateOptionsEntry(actualPath, templateValues) {
    const contents = JSON.parse(fs.readFileSync('api.json'));
    const templatePath = path.join(__dirname, '../generators/endpoint-cors/templates/api.json');
    const comparison = JSON.parse(ejs.render(fs.readFileSync(templatePath, 'utf8'), templateValues));

    assert.deepStrictEqual(contents.paths[actualPath].options, comparison);
}

function validateUpdatedPathEntry(actualPath, methods, expectedResponses, expectedAmazonResponses) {
    const contents = JSON.parse(fs.readFileSync('api.json'));
    const comparison = contents.paths[actualPath];

    methods = methods.map(_.lowerCase);
    const allMethods = _.keys(comparison);
    allMethods.forEach(function(method) {
        const specificMethod = comparison[method];

        if (methods.indexOf(method) === -1) {
            assert.notDeepStrictEqual(specificMethod.responses, expectedResponses);
            assert.notDeepStrictEqual(specificMethod['x-amazon-apigateway-integration'].responses, expectedAmazonResponses);
        } else {
            assert.deepStrictEqual(specificMethod.responses, expectedResponses);
            assert.deepStrictEqual(specificMethod['x-amazon-apigateway-integration'].responses, expectedAmazonResponses);
        }
    });
}


//
//  Tests
//
describe('@testlio/lambda-tools:endpoint-cors', function() {
    describe('With all methods and headers', function() {
        before(function(done) {
            this.prompts = {
                path: '/',
                allowMethods: ['PUT', 'GET'],
                allowHeaders: ['Content-Type', 'X-Amz-Date', 'X-Api-Key', 'Authorization', 'X-Page']
            };

            runGenerator(this.prompts, done);
        });

        it('adds options entry to api.json', function() {
            // Should be relatively redundant, but nevertheless
            assert.file('api.json');

            // Actual validation of the entry in api.json
            validateOptionsEntry('/', {
                responseParameters: {
                    'method.response.header.Access-Control-Allow-Origin': '\'*\'',
                    'method.response.header.Access-Control-Allow-Headers': '\'Content-Type,X-Amz-Date,X-Api-Key,Authorization,X-Page\'',
                    'method.response.header.Access-Control-Allow-Methods': '\'PUT,GET,OPTIONS\''
                }
            });
        });

        it('updates existing method entries in api.json', function() {
            // Should be relatively redundant, but nevertheless
            assert.file('api.json');

            const expectedResponses = {
                '200': {
                    allOf: [
                        {
                            description: 'Default response',
                            schema: {
                                type: 'object',
                                properties: {},
                                additionalProperties: true
                            }
                        },
                        {
                            '$ref': '#/responses/CORSHeaders'
                        }
                    ]
                }
            };

            const expectedAmazonResponses = {
                default: {
                    statusCode: '200',
                    responseTemplates: {
                        'application/json': ''
                    },
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': '\'*\'',
                        'method.response.header.Access-Control-Allow-Headers': '\'Content-Type,X-Amz-Date,X-Api-Key,Authorization,X-Page\'',
                        'method.response.header.Access-Control-Allow-Methods': '\'PUT,GET,OPTIONS\''
                    }
                }
            };

            validateUpdatedPathEntry('/', this.prompts.allowMethods,
                expectedResponses, expectedAmazonResponses);
        });
    });

    describe('With some methods and all headers', function() {
        before(function(done) {
            this.prompts = {
                path: '/',
                allowMethods: ['PUT'],
                allowHeaders: ['Content-Type', 'X-Amz-Date', 'X-Api-Key', 'Authorization', 'X-Page']
            };

            runGenerator(this.prompts, done);
        });

        it('adds options entry to api.json', function() {
            // Should be relatively redundant, but nevertheless
            assert.file('api.json');

            // Actual validation of the entry in api.json
            validateOptionsEntry('/', {
                responseParameters: {
                    'method.response.header.Access-Control-Allow-Origin': '\'*\'',
                    'method.response.header.Access-Control-Allow-Headers': '\'Content-Type,X-Amz-Date,X-Api-Key,Authorization,X-Page\'',
                    'method.response.header.Access-Control-Allow-Methods': '\'PUT,OPTIONS\''
                }
            });
        });

        it('updates existing method entries in api.json', function() {
            // Should be relatively redundant, but nevertheless
            assert.file('api.json');

            const expectedResponses = {
                '200': {
                    allOf: [
                        {
                            description: 'Default response',
                            schema: {
                                type: 'object',
                                properties: {},
                                additionalProperties: true
                            }
                        },
                        {
                            '$ref': '#/responses/CORSHeaders'
                        }
                    ]
                }
            };

            const expectedAmazonResponses = {
                default: {
                    statusCode: '200',
                    responseTemplates: {
                        'application/json': ''
                    },
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': '\'*\'',
                        'method.response.header.Access-Control-Allow-Headers': '\'Content-Type,X-Amz-Date,X-Api-Key,Authorization,X-Page\'',
                        'method.response.header.Access-Control-Allow-Methods': '\'PUT,OPTIONS\''
                    }
                }
            };

            validateUpdatedPathEntry('/', this.prompts.allowMethods,
                expectedResponses, expectedAmazonResponses);
        });
    });

    describe('With some methods and some headers', function() {
        before(function(done) {
            this.prompts = {
                path: '/',
                allowMethods: ['GET'],
                allowHeaders: ['Content-Type', 'Authorization']
            };

            runGenerator(this.prompts, done);
        });

        it('adds options entry to api.json', function() {
            // Should be relatively redundant, but nevertheless
            assert.file('api.json');

            // Actual validation of the entry in api.json
            validateOptionsEntry('/', {
                responseParameters: {
                    'method.response.header.Access-Control-Allow-Origin': '\'*\'',
                    'method.response.header.Access-Control-Allow-Headers': '\'Content-Type,Authorization\'',
                    'method.response.header.Access-Control-Allow-Methods': '\'GET,OPTIONS\''
                }
            });
        });

        it('updates existing method entries in api.json', function() {
            // Should be relatively redundant, but nevertheless
            assert.file('api.json');

            const expectedResponses = {
                '200': {
                    allOf: [
                        {
                            'description': 'Default response',
                            'schema': {
                                'type': 'object',
                                'properties': {},
                                'additionalProperties': true
                            }
                        },
                        {
                            '$ref': '#/responses/CORSHeaders'
                        }
                    ]
                }
            };

            const expectedAmazonResponses = {
                default: {
                    statusCode: '200',
                    responseTemplates: {
                        'application/json': ''
                    },
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': '\'*\'',
                        'method.response.header.Access-Control-Allow-Headers': '\'Content-Type,Authorization\'',
                        'method.response.header.Access-Control-Allow-Methods': '\'GET,OPTIONS\''
                    }
                }
            };

            validateUpdatedPathEntry('/', this.prompts.allowMethods,
                expectedResponses, expectedAmazonResponses);
        });
    });

    describe('With custom origin, methods and headers', function() {
        before(function(done) {
            this.prompts = {
                path: '/',
                allowOrigin: 'http://test.com',
                allowMethods: ['GET'],
                allowHeaders: ['Authorization']
            };

            runGenerator(this.prompts, done);
        });

        it('adds options entry to api.json', function() {
            // Should be relatively redundant, but nevertheless
            assert.file('api.json');

            // Actual validation of the entry in api.json
            validateOptionsEntry('/', {
                responseParameters: {
                    'method.response.header.Access-Control-Allow-Origin': '\'http://test.com\'',
                    'method.response.header.Access-Control-Allow-Headers': '\'Authorization\'',
                    'method.response.header.Access-Control-Allow-Methods': '\'GET,OPTIONS\''
                }
            });
        });

        it('updates existing method entries in api.json', function() {
            // Should be relatively redundant, but nevertheless
            assert.file('api.json');

            const expectedResponses = {
                '200': {
                    allOf: [
                        {
                            'description': 'Default response',
                            'schema': {
                                'type': 'object',
                                'properties': {},
                                'additionalProperties': true
                            }
                        },
                        {
                            '$ref': '#/responses/CORSHeaders'
                        }
                    ]
                }
            };

            const expectedAmazonResponses = {
                default: {
                    statusCode: '200',
                    responseTemplates: {
                        'application/json': ''
                    },
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': '\'http://test.com\'',
                        'method.response.header.Access-Control-Allow-Headers': '\'Authorization\'',
                        'method.response.header.Access-Control-Allow-Methods': '\'GET,OPTIONS\''
                    }
                }
            };

            validateUpdatedPathEntry('/', this.prompts.allowMethods,
                expectedResponses, expectedAmazonResponses);
        });
    });
});
