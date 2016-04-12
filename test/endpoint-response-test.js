'use strict';

const helpers = require('yeoman-test');
const assert = require('yeoman-assert');
const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');

//
//  Helpers
//

function runGenerator(prompts, done) {
    helpers.run(path.join(__dirname, '../generators/endpoint-response'))
        .inTmpDir(function(dir) {
            // Make sure there's a stub api.json file in place
            fs.copySync(path.join(__dirname, 'templates/endpoint-response.json'), path.join(dir, 'api.json'), {
                clobber: true
            });
        })
        .withPrompts(prompts)
        .withOptions({
            force: true
        })
        .on('end', done);
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
describe('lambda-tools:endpoint-response', function() {
    describe('With default options', function() {
        before(function(done) {
            this.prompts = {
                path: '/foo',
                method: 'post',
                statusCodeCommon: '400',
                responseId: '400.*',
                responseDescription: 'Bad Request',
                responseTemplateEmpty: false,
                responseTemplate: '{ \"message\": \"Bad Request\" }'
            };

            runGenerator(this.prompts, done);
        });

        it('updates appropriate method entry in api.json', function() {
            assert.file('api.json');

            const expectedResponses = {
                '200': {
                    description: 'Default response',
                    schema: {
                        type: 'object',
                        properties: {},
                        additionalProperties: true
                    }
                },
                '400': {
                    description: this.prompts.responseDescription,
                    headers: {},
                    schema: {
                        type: 'object'
                    }
                }
            };

            const expectedAmazonResponses = {
                default: {
                    statusCode: '200',
                    responseTemplates: {
                        'application/json': ''
                    }
                },
                '400.*': {
                    statusCode: this.prompts.statusCodeCommon,
                    responseParameters: {},
                    responseTemplates: {
                        'application/json': this.prompts.responseTemplate
                    }
                }
            };

            validateUpdatedPathEntry('/foo', [this.prompts.method],
                expectedResponses, expectedAmazonResponses);
        });
    });

    describe('With empty response template', function() {
        before(function(done) {
            this.prompts = {
                path: '/foo',
                method: 'post',
                statusCodeCommon: '400',
                responseId: '400.*',
                responseDescription: 'Bad Request',
                hasResponseTemplate: false
            };

            runGenerator(this.prompts, done);
        });

        it('updates appropriate method entry in api.json', function() {
            assert.file('api.json');

            const expectedResponses = {
                '200': {
                    description: 'Default response',
                    schema: {
                        type: 'object',
                        properties: {},
                        additionalProperties: true
                    }
                },
                '400': {
                    description: this.prompts.responseDescription,
                    headers: {},
                    schema: {
                        type: 'object'
                    }
                }
            };

            const expectedAmazonResponses = {
                default: {
                    statusCode: '200',
                    responseTemplates: {
                        'application/json': ''
                    }
                },
                '400.*': {
                    statusCode: this.prompts.statusCodeCommon,
                    responseParameters: {},
                    responseTemplates: {
                        'application/json': ''
                    }
                }
            };

            validateUpdatedPathEntry('/foo', [this.prompts.method],
                expectedResponses, expectedAmazonResponses);
        });
    });

    describe('With modified response template and ID', function() {
        before(function(done) {
            this.prompts = {
                path: '/foo',
                method: 'post',
                statusCodeCommon: '400',
                responseId: 'BAD REQUEST.*',
                responseDescription: 'Bad Request',
                hasResponseTemplate: true,
                responseTemplate: '{ "message": "Bad Request", "added": "foo" }'
            };

            runGenerator(this.prompts, done);
        });

        it('updates appropriate method entry in api.json', function() {
            assert.file('api.json');

            const expectedResponses = {
                '200': {
                    description: 'Default response',
                    schema: {
                        type: 'object',
                        properties: {},
                        additionalProperties: true
                    }
                },
                '400': {
                    description: this.prompts.responseDescription,
                    headers: {},
                    schema: {
                        type: 'object'
                    }
                }
            };

            const expectedAmazonResponses = {
                default: {
                    statusCode: '200',
                    responseTemplates: {
                        'application/json': ''
                    }
                },
                'BAD REQUEST.*': {
                    statusCode: this.prompts.statusCodeCommon,
                    responseParameters: {},
                    responseTemplates: {
                        'application/json': this.prompts.responseTemplate
                    }
                }
            };

            validateUpdatedPathEntry('/foo', [this.prompts.method],
                expectedResponses, expectedAmazonResponses);
        });
    });

    describe('With multiple HTTP methods', function() {
        before(function(done) {
            this.prompts = {
                path: '/',
                method: 'get',
                statusCodeCommon: '404',
                responseId: '404.*',
                responseDescription: 'Not Found',
                hasResponseTemplate: true,
                responseTemplate: '{ "message": "Not Found" }'
            };

            runGenerator(this.prompts, done);
        });

        it('updates appropriate method entry in api.json', function() {
            assert.file('api.json');

            const expectedResponses = {
                '200': {
                    description: 'Default response',
                    schema: {
                        type: 'object',
                        properties: {},
                        additionalProperties: true
                    }
                },
                '404': {
                    description: this.prompts.responseDescription,
                    headers: {},
                    schema: {
                        type: 'object'
                    }
                }
            };

            const expectedAmazonResponses = {
                default: {
                    statusCode: '200',
                    responseTemplates: {
                        'application/json': ''
                    }
                },
                '404.*': {
                    statusCode: this.prompts.statusCodeCommon,
                    responseParameters: {},
                    responseTemplates: {
                        'application/json': this.prompts.responseTemplate
                    }
                }
            };

            validateUpdatedPathEntry('/', [this.prompts.method],
                expectedResponses, expectedAmazonResponses);
        });
    });

    describe('With additional header (body)', function() {
        before(function(done) {
            this.prompts = {
                path: '/foo',
                method: 'post',
                statusCodeCommon: '400',
                responseId: '400.*',
                responseDescription: 'Bad Request',
                hasResponseTemplate: true,
                responseTemplate: '{ \"message\": \"Bad Request\" }',
                mapHeader: true,
                responseHeader: 'method.response.header.Authorization',
                integrationSource: 'body',
                integrationKeyPath: 'integration.request.body.authorization'
            };

            runGenerator(this.prompts, done);
        });

        it('updates appropriate method entry in api.json', function() {
            assert.file('api.json');

            const expectedResponses = {
                '200': {
                    description: 'Default response',
                    schema: {
                        type: 'object',
                        properties: {},
                        additionalProperties: true
                    }
                },
                '400': {
                    description: this.prompts.responseDescription,
                    headers: {
                        Authorization: {
                            type: 'string'
                        }
                    },
                    schema: {
                        type: 'object'
                    }
                }
            };

            const expectedAmazonResponses = {
                default: {
                    statusCode: '200',
                    responseTemplates: {
                        'application/json': ''
                    }
                },
                '400.*': {
                    statusCode: this.prompts.statusCodeCommon,
                    responseParameters: {
                        'method.response.header.Authorization': this.prompts.integrationKeyPath
                    },
                    responseTemplates: {
                        'application/json': this.prompts.responseTemplate
                    }
                }
            };

            validateUpdatedPathEntry('/foo', [this.prompts.method],
                expectedResponses, expectedAmazonResponses);
        });
    });

    describe('With additional header (header)', function() {
        before(function(done) {
            this.prompts = {
                path: '/foo',
                method: 'post',
                statusCodeCommon: '400',
                responseId: '400.*',
                responseDescription: 'Bad Request',
                hasResponseTemplate: true,
                responseTemplate: '{ \"message\": \"Bad Request\" }',
                mapHeader: true,
                responseHeader: 'method.response.header.Authorization',
                integrationSource: 'header',
                integrationKeyPath: 'integration.request.header.authorization'
            };

            runGenerator(this.prompts, done);
        });

        it('updates appropriate method entry in api.json', function() {
            assert.file('api.json');

            const expectedResponses = {
                '200': {
                    description: 'Default response',
                    schema: {
                        type: 'object',
                        properties: {},
                        additionalProperties: true
                    }
                },
                '400': {
                    description: this.prompts.responseDescription,
                    headers: {
                        Authorization: {
                            type: 'string'
                        }
                    },
                    schema: {
                        type: 'object'
                    }
                }
            };

            const expectedAmazonResponses = {
                default: {
                    statusCode: '200',
                    responseTemplates: {
                        'application/json': ''
                    }
                },
                '400.*': {
                    statusCode: this.prompts.statusCodeCommon,
                    responseParameters: {
                        'method.response.header.Authorization': this.prompts.integrationKeyPath
                    },
                    responseTemplates: {
                        'application/json': this.prompts.responseTemplate
                    }
                }
            };

            validateUpdatedPathEntry('/foo', [this.prompts.method],
                expectedResponses, expectedAmazonResponses);
        });
    });
});
