'use strict';

const helpers = require('yeoman-test');
const assert = require('yeoman-assert');
const path = require('path');
const fs = require('fs-extra');
const ejs = require('ejs');
const _ = require('lodash');

function validateTableResourceIndex(actualResource, scope, templateValues) {
    const contents = JSON.parse(fs.readFileSync('cf.json'));
    const templatePath = path.join(__dirname, '../generators/dynamo-index/templates/cf.json');
    const comparison = JSON.parse(ejs.render(fs.readFileSync(templatePath, 'utf8'), templateValues));
    assert.deepStrictEqual(contents.Resources[actualResource].Properties[scope], [comparison]);
}

function validateTableResourceAttributes(actualResource, expectedAttributes) {
    const contents = JSON.parse(fs.readFileSync('cf.json'));
    const attributes = contents.Resources[actualResource].Properties.AttributeDefinitions;
    assert.deepStrictEqual(_.intersectionBy(expectedAttributes, attributes, 'AttributeName'), expectedAttributes);
}

function validateTablePolicies(tableResourceName) {
    const contents = JSON.parse(fs.readFileSync('cf.json'));
    const policies = JSON.parse(fs.readFileSync('lambda_policies.json'));

    const templatePath = path.join(__dirname, '../generators/dynamo-index/templates/lambda_policies.json');
    const comparison = JSON.parse(ejs.render(fs.readFileSync(templatePath, 'utf8'), {
        tableName: JSON.stringify(contents.Resources[tableResourceName].Properties.TableName)
    }));
    assert.deepStrictEqual(_.find(policies, comparison), comparison);
}

describe('@testlio/lambda-tools:dynamo-index', function() {
    describe('Global index with a HASH key', function() {
        before(function(done) {
            this.prompts = {
                resourceName: 'TestDynamoDB',
                indexName: 'auxiliaryIndex',
                indexScope: 'GlobalSecondaryIndexes',
                hashKeyName: 'auxGuid',
                hashKeyType: 'S'
            };

            helpers.run(path.join(__dirname, '../generators/dynamo-index'))
                .inTmpDir(function(dir) {
                    // Make sure there's a stub cf.json file in place
                    fs.copySync(path.join(__dirname, 'templates/dynamo-index.json'), path.join(dir, 'cf.json'), {
                        clobber: true
                    });
                })
                .withOptions({
                    force: true
                })
                .withPrompts(this.prompts)
                .on('end', done);
        });

        it('Generates entry in cf.json', function() {
            // Should be relatively redundant, but nevertheless
            assert.file('cf.json');

            // Actual validation of the entry in api.json
            validateTableResourceIndex('TestDynamoDB', 'GlobalSecondaryIndexes', {
                resourceName: 'TestDynamoDB',
                globalIndex: true,
                indexName: 'auxiliaryIndex',
                keySchema: [{
                    AttributeName: 'auxGuid',
                    KeyType: 'HASH'
                }]
            });
        });

        it('Properly adds index attributes to table attributes', function() {
            validateTableResourceAttributes('TestDynamoDB', [
                {
                    AttributeName: 'auxGuid',
                    AttributeType: 'S'
                }
            ]);
        });

        it('Properly adds appropriate policies to lambda_policies.json', function() {
            assert.file('lambda_policies.json');
            validateTablePolicies(this.prompts.resourceName);
        });
    });

    describe('Global index with a HASH key without modifying Lambda policies', function() {
        before(function(done) {
            this.prompts = {
                resourceName: 'TestDynamoDB',
                indexName: 'auxiliaryIndex',
                indexScope: 'GlobalSecondaryIndexes',
                hashKeyName: 'auxGuid',
                hashKeyType: 'S',
                updateLambdaPolicies: false
            };

            helpers.run(path.join(__dirname, '../generators/dynamo-index'))
                .inTmpDir(function(dir) {                    
                    // Make sure there's a stub cf.json file in place
                    fs.copySync(path.join(__dirname, 'templates/dynamo-index.json'), path.join(dir, 'cf.json'), {
                        clobber: true
                    });
                })
                .withOptions({
                    force: true
                })
                .withPrompts(this.prompts)
                .on('end', done);
        });

        it('Generates entry in cf.json', function() {
            // Should be relatively redundant, but nevertheless
            assert.file('cf.json');

            // Actual validation of the entry in api.json
            validateTableResourceIndex('TestDynamoDB', 'GlobalSecondaryIndexes', {
                resourceName: 'TestDynamoDB',
                globalIndex: true,
                indexName: 'auxiliaryIndex',
                keySchema: [{
                    AttributeName: 'auxGuid',
                    KeyType: 'HASH'
                }]
            });
        });

        it('Properly adds index attributes to table attributes', function() {
            validateTableResourceAttributes('TestDynamoDB', [
                {
                    AttributeName: 'auxGuid',
                    AttributeType: 'S'
                }
            ]);
        });

        it('Skips adding appropriate policies to lambda_policies.json', function() {
            assert.noFile('lambda_policies.json');
        });
    });

    describe('Local index with a HASH key', function() {
        before(function(done) {
            this.prompts = {
                resourceName: 'TestDynamoDB',
                indexName: 'auxiliaryIndex',
                indexScope: 'LocalSecondaryIndexes',
                hashKeyName: 'auxGuid',
                hashKeyType: 'S'
            };

            helpers.run(path.join(__dirname, '../generators/dynamo-index'))
                .inTmpDir(function(dir) {
                    // Make sure there's a stub cf.json file in place
                    fs.copySync(path.join(__dirname, 'templates/dynamo-index.json'), path.join(dir, 'cf.json'), {
                        clobber: true
                    });
                })
                .withOptions({
                    force: true
                })
                .withPrompts(this.prompts)
                .on('end', done);
        });

        it('Generates entry in cf.json', function() {
            // Should be relatively redundant, but nevertheless
            assert.file('cf.json');

            // Actual validation of the entry in api.json
            validateTableResourceIndex('TestDynamoDB', 'LocalSecondaryIndexes', {
                resourceName: 'TestDynamoDB',
                globalIndex: false,
                indexName: 'auxiliaryIndex',
                keySchema: [{
                    AttributeName: 'auxGuid',
                    KeyType: 'HASH'
                }]
            });
        });

        it('Properly adds index attributes to table attributes', function() {
            validateTableResourceAttributes('TestDynamoDB', [
                {
                    AttributeName: 'auxGuid',
                    AttributeType: 'S'
                }
            ]);
        });

        it('Properly adds appropriate policies to lambda_policies.json', function() {
            assert.file('lambda_policies.json');
            validateTablePolicies(this.prompts.resourceName);
        });
    });

    describe('Global index with a RANGE key', function() {
        before(function(done) {
            this.prompts = {
                resourceName: 'TestDynamoDB',
                indexName: 'auxiliaryIndex',
                indexScope: 'GlobalSecondaryIndexes',
                keySchemaType: 'RANGE',
                hashKeyName: 'auxGuid',
                hashKeyType: 'S',
                rangeKeyName: 'auxRange',
                rangeKeyType: 'N'
            };

            helpers.run(path.join(__dirname, '../generators/dynamo-index'))
                .inTmpDir(function(dir) {
                    // Make sure there's a stub cf.json file in place
                    fs.copySync(path.join(__dirname, 'templates/dynamo-index.json'), path.join(dir, 'cf.json'), {
                        clobber: true
                    });
                })
                .withOptions({
                    force: true
                })
                .withPrompts(this.prompts)
                .on('end', done);
        });

        it('Generates entry in cf.json', function() {
            // Should be relatively redundant, but nevertheless
            assert.file('cf.json');

            // Actual validation of the entry in api.json
            validateTableResourceIndex('TestDynamoDB', 'GlobalSecondaryIndexes', {
                resourceName: 'TestDynamoDB',
                globalIndex: true,
                indexName: 'auxiliaryIndex',
                keySchema: [
                    {
                        AttributeName: 'auxGuid',
                        KeyType: 'HASH'
                    },
                    {
                        AttributeName: 'auxRange',
                        KeyType: 'RANGE'
                    }
                ]
            });
        });

        it('Properly adds index attributes to table attributes', function() {
            validateTableResourceAttributes('TestDynamoDB', [
                {
                    AttributeName: 'auxGuid',
                    AttributeType: 'S'
                },
                {
                    AttributeName: 'auxRange',
                    AttributeType: 'N'
                }
            ]);
        });

        it('Properly adds appropriate policies to lambda_policies.json', function() {
            assert.file('lambda_policies.json');
            validateTablePolicies(this.prompts.resourceName);
        });
    });

    describe('Local index with a RANGE key', function() {
        before(function(done) {
            this.prompts = {
                resourceName: 'TestDynamoDB',
                indexName: 'auxiliaryIndex',
                indexScope: 'LocalSecondaryIndexes',
                keySchemaType: 'RANGE',
                hashKeyName: 'auxGuid',
                hashKeyType: 'S',
                rangeKeyName: 'auxRange',
                rangeKeyType: 'N'
            };

            helpers.run(path.join(__dirname, '../generators/dynamo-index'))
                .inTmpDir(function(dir) {
                    // Make sure there's a stub cf.json file in place
                    fs.copySync(path.join(__dirname, 'templates/dynamo-index.json'), path.join(dir, 'cf.json'), {
                        clobber: true
                    });
                })
                .withOptions({
                    force: true
                })
                .withPrompts(this.prompts)
                .on('end', done);
        });

        it('Generates entry in cf.json', function() {
            // Should be relatively redundant, but nevertheless
            assert.file('cf.json');

            // Actual validation of the entry in api.json
            validateTableResourceIndex('TestDynamoDB', 'LocalSecondaryIndexes', {
                resourceName: 'TestDynamoDB',
                globalIndex: false,
                indexName: 'auxiliaryIndex',
                keySchema: [
                    {
                        AttributeName: 'auxGuid',
                        KeyType: 'HASH'
                    },
                    {
                        AttributeName: 'auxRange',
                        KeyType: 'RANGE'
                    }
                ]
            });
        });

        it('Properly adds index attributes to table attributes', function() {
            validateTableResourceAttributes('TestDynamoDB', [
                {
                    AttributeName: 'auxGuid',
                    AttributeType: 'S'
                },
                {
                    AttributeName: 'auxRange',
                    AttributeType: 'N'
                }
            ]);
        });

        it('Properly adds appropriate policies to lambda_policies.json', function() {
            assert.file('lambda_policies.json');
            validateTablePolicies(this.prompts.resourceName);
        });
    });
});
