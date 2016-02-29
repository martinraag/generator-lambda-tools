'use strict';

const generators = require('yeoman-generator');
const path = require('path');
const _ = require('lodash');
const fs = require('fs');
const ejs = require('ejs');

const helpers = require('../../lib/helper');

//
// Helper function
//
function keySchemaPrompts(prefix) {
    const attributeTypes = [
        {
            name: 'String',
            value: 'S'
        },
        {
            name: 'Number',
            value: 'N'
        },
        {
            name: 'Binary',
            value: 'B'
        }
    ];

    const attributeNameValidator = function(value) {
        try {
            return helpers.isValidDynamoDBAttributeName(value);
        } catch (err) {
            return err.message;
        }
    };

    const rangeKeyWhen = function(answers) {
        return answers[prefix ? prefix + 'KeySchemaType' : 'keySchemaType'] === 'RANGE';
    };

    return [
        {
            type: 'list',
            name: prefix ? prefix + 'KeySchemaType' : 'keySchemaType',
            message: 'Key schema type',
            choices: [
                {
                    name: 'Hash Key',
                    value: 'HASH'
                },
                {
                    name: 'Range Key',
                    value: 'RANGE'
                }
            ],
            default: 0
        },
        {
            type: 'input',
            name: prefix ? prefix + 'HashKeyName' : 'hashKeyName',
            message: 'Hash key attribute name',
            validate: attributeNameValidator
        },
        {
            type: 'list',
            name: prefix ? prefix + 'HashKeyType' : 'hashKeyType',
            message: 'Hash key attribute type',
            choices: attributeTypes,
            default: 0
        },
        {
            type: 'input',
            name: prefix ? prefix + 'RangeKeyName' : 'rangeKeyName',
            message: 'Range key attribute name',
            when: rangeKeyWhen,
            validate: attributeNameValidator
        },
        {
            type: 'list',
            name: prefix ? prefix + 'RangeKeyType' : 'rangeKeyType',
            message: 'Hash key attribute type',
            choices: attributeTypes,
            when: rangeKeyWhen,
            default: 0
        }
    ];
}

module.exports = generators.Base.extend({
    constructor: function () {
        generators.Base.apply(this, arguments);

        // Set up some of the attributes
        this.attributes = [];
        this.globalIndices = [];
        this.keySchema = [];
    },

    prompting: {
        basics: function() {
            const prompts = [
                {
                    type: 'input',
                    name: 'tableName',
                    message: 'Table name',
                    filter: function(value) {
                        return value.toLowerCase();
                    }
                },
                {
                    type: 'input',
                    name: 'resourceName',
                    message: 'CloudFormation Resource name',
                    default: function(answers) {
                        let resourceName = _.camelCase(answers.tableName);
                        resourceName = resourceName.charAt(0).toUpperCase() + resourceName.substring(1);
                        return resourceName + 'DynamoDB';
                    }
                }
            ];

            const done = this.async();
            this.prompt(prompts, function (answers) {
                this.tableName = answers.tableName;
                this.resourceName = answers.resourceName;

                done();
            }.bind(this));
        },

        keySchema: function() {
            const done = this.async();
            this.prompt(keySchemaPrompts(), function(answers) {
                this.keySchema.push({
                    AttributeName: answers.hashKeyName,
                    KeyType: 'HASH'
                });

                this.attributes.push({
                    AttributeName: answers.hashKeyName,
                    AttributeType: answers.hashKeyType
                });

                if (answers.keySchemaType === 'RANGE') {
                    this.keySchema.push({
                        AttributeName: answers.rangeKeyName,
                        KeyType: 'RANGE'
                    });

                    this.attributes.push({
                        AttributeName: answers.rangeKeyName,
                        AttributeType: answers.rangeKeyType
                    });
                }

                done();
            }.bind(this));
        },

        indices: function() {
            const done = this.async();
            const proceed = function(answers) {
                return answers.addIndex;
            };

            const loop = function(done, iteration) {
                const prompts = [{
                    type: 'input',
                    message: 'Index name',
                    name: 'index' + iteration + 'Name',
                }].concat(keySchemaPrompts('index' + iteration)).concat({
                    type: 'confirm',
                    default: false,
                    message: 'Add another index',
                    name: 'addIndex' + (iteration + 1)
                });

                this.prompt(prompts, function(answers) {
                    const keySchema = [{
                        AttributeName: answers['index' + iteration + 'HashKeyName'],
                        KeyType: 'HASH'
                    }];

                    if (!_.find(this.attributes, { AttributeName: answers['index' + iteration + 'HashKeyName'] })) {
                        this.attributes.push({
                            AttributeName: answers['index' + iteration + 'HashKeyName'],
                            AttributeType: answers['index' + iteration + 'HashKeyType']
                        });
                    }

                    if (answers['index' + iteration + 'RangeKeyName']) {
                        keySchema.push({
                            AttributeName: answers['index' + iteration + 'RangeKeyName'],
                            KeyType: 'RANGE'
                        });

                        if (!_.find(this.attributes, { AttributeName: answers['index' + iteration + 'RangeKeyName'] })) {
                            this.attributes.push({
                                AttributeName: answers['index' + iteration + 'RangeKeyName'],
                                AttributeType: answers['index' + iteration + 'RangeKeyType']
                            });
                        }
                    }

                    this.globalIndices.push({
                        IndexName: answers['index' + iteration + 'Name'],
                        KeySchema: keySchema,
                        ProjectionType: 'ALL'
                    });

                    if (answers['addIndex' + (iteration + 1)]) {
                        loop(done, iteration + 1);
                    } else {
                        done();
                    }
                }.bind(this));
            }.bind(this);

            this.prompt({
                type: 'confirm',
                default: false,
                message: 'Add a global index',
                name: 'addIndex0'
            }, function(answers) {
                if (answers.addIndex0) {
                    loop(done, 0);
                } else {
                    done();
                }
            });
        }
    },

    writing: function() {
        // Create the endpoint entry from a template
        const template = fs.readFileSync(this.templatePath('cf.json'), 'utf8');
        const rendered = ejs.render(template, this);

        // Inject this into api.json (potentially overriding an existing entry)
        const resource = JSON.parse(rendered);
        const existing = this.fs.readJSON(this.destinationPath('cf.json'));
        existing.Resources = _.assign(existing.Resources || {}, resource);
        this.fs.writeJSON(this.destinationPath('cf.json'), existing, null, 4);
    }
});
