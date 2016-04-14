'use strict';

const helpers = require('yeoman-test');
const assert = require('yeoman-assert');
const path = require('path');
const fs = require('fs-extra');
const ejs = require('ejs');
const _ = require('lodash');

function validateTableResourceStreamSpecification(actualResource, expectedSpecification) {
    const contents = JSON.parse(fs.readFileSync('cf.json'));
    assert.deepStrictEqual(contents.Resources[actualResource].Properties.StreamSpecification,
        expectedSpecification);
}

function validateStreamResource(actualResource, templateValues) {
    const contents = JSON.parse(fs.readFileSync('cf.json'));
    const templatePath = path.join(__dirname, '../generators/dynamo-stream/templates/cf.json');
    const comparison = JSON.parse(ejs.render(fs.readFileSync(templatePath, 'utf8'), templateValues));
    assert.deepStrictEqual(contents.Resources[actualResource], comparison);
}

function validateLambdaPermissions(tableResourceName) {
    const resources = JSON.parse(fs.readFileSync('cf.json')).Resources;

    const contents = JSON.parse(fs.readFileSync('lambda_policies.json'));
    const templatePath = path.join(__dirname, '../generators/dynamo-stream/templates/lambda_policies.json');
    const comparison = JSON.parse(ejs.render(fs.readFileSync(templatePath, 'utf8'), {
        tableName: resources[tableResourceName].Properties.TableName
    }));
    assert.deepStrictEqual(_.find(contents, comparison), comparison);
}

describe('lambda-tools:dynamo-stream', function() {
    describe('Using a simple/default setup', function() {
        before(function(done) {
            this.prompts = {
                lambdaName: 'stream-test',
                resourceName: 'TestDynamoDB',
                batchSize: 100,
                enabled: true,
                startingPosition: 'TRIM_HORIZON',
                streamViewType: 'NEW_IMAGE'
            };

            helpers.run(path.join(__dirname, '../generators/dynamo-stream'))
                .inTmpDir(function(dir) {
                    fs.copySync(path.join(__dirname, 'templates/dynamo-stream.json'), path.join(dir, 'cf.json'), {
                        clobber: true
                    });
                })
                .withOptions({
                    force: true
                })
                .withPrompts(this.prompts)
                .on('end', done);
        });

        it('Generates an entry for the stream in cf.json', function() {
            // Should be relatively redundant, but nevertheless
            assert.file('cf.json');

            let name = _.camelCase(this.prompts.lambdaName);
            name = name.charAt(0).toUpperCase() + name.substring(1);

            validateStreamResource('TestDynamoDBStream', {
                lambdaName: name,
                resourceName: this.prompts.resourceName,
                stream: {
                    batchSize: this.prompts.batchSize,
                    enabled: this.prompts.enabled,
                    startingPosition: this.prompts.startingPosition
                }
            });
        });

        it('Properly modifies the stream view type on the table', function() {
            validateTableResourceStreamSpecification(this.prompts.resourceName, {
                StreamViewType: this.prompts.streamViewType
            });
        });

        it('Properly adds necessary permissions to lambda_policies.json', function() {
            // Should be relatively redundant, but nevertheless
            assert.file('lambda_policies.json');
            validateLambdaPermissions('TestDynamoDB');
        });
    });

    describe('Using modified setup', function() {
        before(function(done) {
            this.prompts = {
                lambdaName: 'longer-not-so-default-lambda-name',
                resourceName: 'TestDynamoDB',
                batchSize: 10,
                enabled: false,
                startingPosition: 'LATEST',
                streamViewType: 'KEYS_ONLY',
                streamName: 'CustomStream'
            };

            helpers.run(path.join(__dirname, '../generators/dynamo-stream'))
                .inTmpDir(function(dir) {
                    fs.copySync(path.join(__dirname, 'templates/dynamo-stream.json'), path.join(dir, 'cf.json'), {
                        clobber: true
                    });
                })
                .withOptions({
                    force: true
                })
                .withPrompts(this.prompts)
                .on('end', done);
        });

        it('Generates an entry for the stream in cf.json', function() {
            // Should be relatively redundant, but nevertheless
            assert.file('cf.json');

            let name = _.camelCase(this.prompts.lambdaName);
            name = name.charAt(0).toUpperCase() + name.substring(1);

            validateStreamResource(this.prompts.streamName, {
                lambdaName: name,
                resourceName: this.prompts.resourceName,
                stream: {
                    batchSize: this.prompts.batchSize,
                    enabled: this.prompts.enabled,
                    startingPosition: this.prompts.startingPosition
                }
            });
        });

        it('Properly modifies the stream view type on the table', function() {
            validateTableResourceStreamSpecification(this.prompts.resourceName, {
                StreamViewType: this.prompts.streamViewType
            });
        });

        it('Properly adds necessary permissions to lambda_policies.json', function() {
            // Should be relatively redundant, but nevertheless
            assert.file('lambda_policies.json');
            validateLambdaPermissions(this.prompts.resourceName);
        });
    });
});
