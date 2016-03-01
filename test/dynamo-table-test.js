'use strict';

const helpers = require('yeoman-test');
const assert = require('yeoman-assert');
const path = require('path');
const fs = require('fs-extra');
const ejs = require('ejs');

function validateTableResource(actualResource, templateValues) {
    const contents = JSON.parse(fs.readFileSync('cf.json'));
    const templatePath = path.join(__dirname, '../generators/dynamo-table/templates/cf.json');
    const comparison = JSON.parse(ejs.render(fs.readFileSync(templatePath, 'utf8'), templateValues));
    assert.deepStrictEqual(contents.Resources[actualResource], comparison[actualResource]);
}

describe('@testlio/lambda-tools:dynamo-table', function() {
    describe('With a HASH key', function() {
        before(function(done) {
            this.prompts = {
                tableName: 'tests',
                hashKeyName: 'guid',
                hashKeyType: 'S'
            };

            helpers.run(path.join(__dirname, '../generators/dynamo-table'))
                .inTmpDir(function(dir) {
                    // Make sure there's a stub cf.json file in place
                    fs.copySync(path.join(__dirname, '../generators/app/templates'), dir, {
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
            validateTableResource('TestsDynamoDB', {
                resourceName: 'TestsDynamoDB',
                tableName: 'tests',
                attributes: [{
                    AttributeName: 'guid',
                    AttributeType: 'S'
                }],
                keySchema: [{
                    AttributeName: 'guid',
                    KeyType: 'HASH'
                }],
                globalIndices: []
            });
        });
    });

    describe('With a RANGE key', function() {
        before(function(done) {
            this.prompts = {
                tableName: 'tests',
                keySchemaType: 'RANGE',
                hashKeyName: 'guid',
                hashKeyType: 'S',
                rangeKeyName: 'date',
                rangeKeyType: 'N'
            };

            helpers.run(path.join(__dirname, '../generators/dynamo-table'))
                .inTmpDir(function(dir) {
                    // Make sure there's a stub cf.json file in place
                    fs.copySync(path.join(__dirname, '../generators/app/templates'), dir, {
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
            validateTableResource('TestsDynamoDB', {
                resourceName: 'TestsDynamoDB',
                tableName: 'tests',
                attributes: [
                    {
                        AttributeName: 'guid',
                        AttributeType: 'S'
                    },
                    {
                        AttributeName: 'date',
                        AttributeType: 'N'
                    }
                ],
                keySchema: [
                    {
                        AttributeName: 'guid',
                        KeyType: 'HASH'
                    },
                    {
                        AttributeName: 'date',
                        KeyType: 'RANGE'
                    }
                ],
                globalIndices: []
            });
        });
    });
});
