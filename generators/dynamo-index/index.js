'use strict';

const generators = require('yeoman-generator');
const _ = require('lodash');
const ejs = require('ejs');

const helpers = require('../../lib/helper');

/**
 *  Generator that simplifies adding indices to DynamoDB tables
 *  used in the service. Assumes that at least one DynamoDB resource is
 *  defined in 'cf.json', which can be done with the dynamo-table generator
 */
module.exports = generators.Base.extend({
    constructor: function () {
        generators.Base.apply(this, arguments);

        // Set up some of the attributes
        this.attributes = [];
        this.keySchema = [];
    },

    initializing: function() {
        // Make sure there's at least one DynamoDB table resource
        const stack = this.fs.readJSON(this.destinationPath('cf.json'));
        const tables = _.pickBy(stack.Resources, function(value) {
            return value.Type === 'AWS::DynamoDB::Table';
        });

        if (_.size(tables) === 0) {
            throw new Error('No DynamoDB table resources have been defined');
        }

        this.tables = tables;
    },

    prompting: {
        basics: function() {
            const prompts = [
                {
                    type: 'list',
                    name: 'resourceName',
                    message: 'DynamoDB resource to add the index to',
                    choices: _.keys(this.tables)
                },
                {
                    type: 'input',
                    name: 'indexName',
                    message: 'Index name'
                },
                {
                    type: 'list',
                    name: 'indexScope',
                    message: 'Index scope',
                    choices: [
                        {
                            name: 'Global',
                            value: 'GlobalSecondaryIndexes'
                        },
                        {
                            name: 'Local',
                            value: 'LocalSecondaryIndexes'
                        }
                    ]
                }
            ];

            const done = this.async();
            this.prompt(prompts, function (answers) {
                this.resourceName = answers.resourceName;
                this.indexName = answers.indexName;
                this.indexScope = answers.indexScope;
                done();
            }.bind(this));
        },

        keySchema: function() {
            const done = this.async();
            this.prompt(helpers.dynamoDBKeySchemaPrompts(), function(answers) {
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

        policies: function() {
            const prompts = [
                {
                    type: 'confirm',
                    name: 'updateLambdaPolicies',
                    message: 'Include in Lambda access policies',
                    default: true
                }
            ];

            const done = this.async();
            this.prompt(prompts, function(answers) {
                this.updateLambdaPolicies = answers.updateLambdaPolicies;
                done();
            }.bind(this));
        }
    },

    writing: function() {
        // Create the endpoint entry from a template
        const template = this.fs.read(this.templatePath('cf.json'), 'utf8');
        const rendered = ejs.render(template, {
            keySchema: this.keySchema,
            indexName: this.indexName,
            globalIndex: this.indexScope === 'GlobalSecondaryIndexes'
        });

        // Inject this into cf.json
        const resource = JSON.parse(rendered);
        const existing = this.fs.readJSON(this.destinationPath('cf.json'));
        const existingResource = existing.Resources[this.resourceName];

        // Add attributes (making sure we only ever have one attribute with a given name)
        const attributes = _.uniqBy(_.concat([], existingResource.Properties.AttributeDefinitions, this.attributes), 'AttributeName');
        existingResource.Properties.AttributeDefinitions = attributes;

        if (_.isArray(existingResource.Properties[this.indexScope])) {
            existingResource.Properties[this.indexScope].push(resource);
        } else {
            existingResource.Properties[this.indexScope] = [resource];
        }

        existing.Resources[this.resourceName] = existingResource;
        this.fs.writeJSON(this.destinationPath('cf.json'), existing, null, 4);


        // If necessary, update lambda_policies to include access to indices
        const policyTemplate = this.fs.read(this.templatePath('lambda_policies.json'), 'utf8');
        const renderedPolicy = ejs.render(policyTemplate, {
            tableName: JSON.stringify(existingResource.Properties.TableName)
        });
        const policy = JSON.parse(renderedPolicy);

        if (this.fs.exists(this.destinationPath('lambda_policies.json'))) {
            let existingPolicies = this.fs.readJSON(this.destinationPath('lambda_policies.json'));

            // Should be an array, if not, make it so
            existingPolicies = [].concat(existingPolicies);

            // Check if the policy already exists
            if (!_.find(existingPolicies, policy)) {
                // Add the new policy and write back to file
                existingPolicies.push(policy);
            }

            this.fs.writeJSON(this.destinationPath('lambda_policies.json'), existingPolicies, null, 4);
        } else {
            // First policy, just create an array and write to file
            this.fs.writeJSON(this.destinationPath('lambda_policies.json'), [policy], null, 4);
        }
    }
});
