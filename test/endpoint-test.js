'use strict';

const helpers = require('yeoman-test');
const assert = require('yeoman-assert');
const path = require('path');
const fs = require('fs-extra');
const ejs = require('ejs');

//
//  Helpers
//

function runGenerator(prompts, done) {
    const deps = [
        [helpers.createDummyGenerator(), '@testlio/lambda-tools:lambda']
    ];

    helpers.run(path.join(__dirname, '../generators/endpoint'))
        .inTmpDir(function(dir) {
            // Make sure there's a stub api.json file in place
            fs.copySync(path.join(__dirname, '../generators/app/templates'), dir, {
                clobber: true
            });
        })
        .withPrompts(prompts)
        .withOptions({
            force: true
        })
        .withGenerators(deps)
        .on('end', done);
}

function validatePathEntry(actualPath, templateValues) {
    const contents = JSON.parse(fs.readFileSync('api.json'));
    const templatePath = path.join(__dirname, '../generators/endpoint/templates/api.json');
    const comparison = JSON.parse(ejs.render(fs.readFileSync(templatePath, 'utf8'), templateValues));
    assert.deepStrictEqual(contents.paths[actualPath], comparison);
}

//
//  Tests
//
describe('@testlio/lambda-tools:endpoint', function() {
    describe('With no parameters', function() {
        before(function(done) {
            this.prompts = {
                path: '/',
                name: 'test-function',
                method: 'get'
            };

            runGenerator(this.prompts, done);
        });

        it('creates entry in api.json', function() {
            // Should be relatively redundant, but nevertheless
            assert.file('api.json');

            // Actual validation of the entry in api.json
            validatePathEntry('/', {
                lambdaName: 'TestFunction',
                method: this.prompts.method,
                parameters: [],
                requestParameters: {},
                requestTemplate: JSON.stringify({ path: '$context.resourcePath' })
            });
        });
    });

    describe('With URL parameters', function() {
        before(function(done) {
            this.prompts = {
                path: '/{parameter}/{testing}',
                name: 'test-function',
                method: 'get',
                'required.parameter': true,
                'required.testing': false
            };

            runGenerator(this.prompts, done);
        });

        it('creates entry in api.json', function() {
            // Should be relatively redundant, but nevertheless
            assert.file('api.json');

            // Actual validation of the entry in api.json
            validatePathEntry('/{parameter}/{testing}', {
                lambdaName: 'TestFunction',
                method: this.prompts.method,
                parameters: [{
                    name: 'parameter',
                    in: 'path',
                    type: 'string',
                    required: true
                },
                {
                    name: 'testing',
                    in: 'path',
                    type: 'string',
                    required: false
                }],
                requestParameters: {},
                requestTemplate: JSON.stringify({
                    path: '$context.resourcePath',
                    parameter: '$util.urlDecode($input.params(\'parameter\'))',
                    testing: '$util.urlDecode($input.params(\'testing\'))'
                })
            });
        });
    });

    describe('With header parameters', function() {
        before(function(done) {
            this.prompts = {
                path: '/',
                name: 'test-function',
                method: 'get',
                mapHeader: true,
                requestHeader: 'Authorization',
                integrationHeader: 'x-authorization'
            };

            runGenerator(this.prompts, done);
        });

        it('creates entry in api.json', function() {
            // Should be relatively redundant, but nevertheless
            assert.file('api.json');

            // Actual validation of the entry in api.json
            validatePathEntry('/', {
                lambdaName: 'TestFunction',
                method: this.prompts.method,
                parameters: [],
                requestParameters: {
                    'integration.request.header.x-authorization': 'method.request.header.Authorization'
                },
                requestTemplate: JSON.stringify({
                    path: '$context.resourcePath',
                    authorization: '$input.params(\'Authorization\')'
                })
            });
        });
    });

    describe('With both URL and header parameters', function() {
        before(function(done) {
            this.prompts = {
                path: '/{parameter}/{testing}',
                name: 'test-function',
                method: 'get',
                'required.parameter': true,
                'required.testing': false,
                mapHeader: true,
                requestHeader: 'Authorization',
                integrationHeader: 'x-authorization'
            };

            runGenerator(this.prompts, done);
        });

        it('creates entry in api.json', function() {
            // Should be relatively redundant, but nevertheless
            assert.file('api.json');

            // Actual validation of the entry in api.json
            validatePathEntry('/{parameter}/{testing}', {
                lambdaName: 'TestFunction',
                method: this.prompts.method,
                parameters: [{
                    name: 'parameter',
                    in: 'path',
                    type: 'string',
                    required: true
                },
                {
                    name: 'testing',
                    in: 'path',
                    type: 'string',
                    required: false
                }],
                requestParameters: {
                    'integration.request.header.x-authorization': 'method.request.header.Authorization'
                },
                requestTemplate: JSON.stringify({
                    path: '$context.resourcePath',
                    authorization: '$input.params(\'Authorization\')',
                    parameter: '$util.urlDecode($input.params(\'parameter\'))',
                    testing: '$util.urlDecode($input.params(\'testing\'))'
                })
            });
        });
    });

    describe('Request that may have body', function() {
        describe('With body mapping', function() {
            before(function(done) {
                this.prompts = {
                    path: '/',
                    name: 'test-function',
                    method: 'post',
                    mapHeader: true,
                    requestHeader: 'Authorization',
                    integrationHeader: 'x-authorization',
                    requestBodyName: 'request'
                };

                runGenerator(this.prompts, done);
            });

            it('creates entry in api.json', function() {
                // Should be relatively redundant, but nevertheless
                assert.file('api.json');

                // Actual validation of the entry in api.json
                validatePathEntry('/', {
                    lambdaName: 'TestFunction',
                    method: this.prompts.method,
                    parameters: [],
                    requestParameters: {
                        'integration.request.header.x-authorization': 'method.request.header.Authorization'
                    },
                    requestTemplate: '{"path":"$context.resourcePath","authorization":"$input.params(\'Authorization\')","request":$input.json(\'$\')}'
                });
            });
        });

        describe('Without body mapping', function() {
            before(function(done) {
                this.prompts = {
                    path: '/',
                    name: 'test-function',
                    method: 'post',
                    mapHeader: true,
                    requestHeader: 'Authorization',
                    integrationHeader: 'x-authorization'
                };

                runGenerator(this.prompts, done);
            });

            it('creates entry in api.json', function() {
                // Should be relatively redundant, but nevertheless
                assert.file('api.json');

                // Actual validation of the entry in api.json
                validatePathEntry('/', {
                    lambdaName: 'TestFunction',
                    method: this.prompts.method,
                    parameters: [],
                    requestParameters: {
                        'integration.request.header.x-authorization': 'method.request.header.Authorization'
                    },
                    requestTemplate: '{"path":"$context.resourcePath","authorization":"$input.params(\'Authorization\')"}'
                });
            });
        });
    });
});
