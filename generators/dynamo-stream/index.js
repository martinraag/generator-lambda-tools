'use strict';

const generators = require('yeoman-generator');
const _ = require('lodash');
const ejs = require('ejs');

/**
 *  Generator for adding a Lambda function that is attached to a DynamoDB
 *  stream on an already existing table. Will throw an error if no tables
 *  exist. Adding tables can be done with the dynamo-table generator
 */
module.exports = generators.Base.extend({
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
            // Ask which table the stream should attach to
            const prompts = [
                {
                    type: 'list',
                    name: 'resourceName',
                    message: 'DynamoDB resource to attach the stream to',
                    choices: _.keys(this.tables)
                },
                {
                    type: 'input',
                    name: 'streamName',
                    message: 'Stream resource name',
                    default: function(answers) {
                        // Append 'Stream' to the resourceName
                        return answers.resourceName + 'Stream';
                    }
                }
            ];

            const done = this.async();
            this.prompt(prompts, function(answers) {
                this.resourceName = answers.resourceName;
                this.streamName = answers.streamName;

                // We now also know the table
                this.table = this.tables[this.resourceName];

                done();
            }.bind(this));
        },

        lambda: function() {
            // Ask about the Lambda function that will handle the stream
            // Only really need the name of it
            const prompts = [
                {
                    type: 'input',
                    name: 'lambdaName',
                    message: 'Lambda function name',
                    validate: function(value) {
                        return value.length > 0 ? true : 'Lambda name can\'t be empty';
                    }
                }
            ];

            const done = this.async();
            this.prompt(prompts, function(answers) {
                this.lambda = {
                    name: answers.lambdaName
                };

                done();
            }.bind(this));
        },

        stream: function() {
            // Ask about the stream
            // The batch size, whether to enable it and starting position
            // Also, ask what the stream view type should be (attached to the table)
            const prompts = [
                {
                    type: 'input',
                    name: 'batchSize',
                    message: 'Batch size',
                    validate: function(value) {
                        return _.isInteger(parseInt(value, 10)) ? true : 'Batch size must be a number';
                    },
                    filter: function(value) {
                        return parseInt(value, 10);
                    },
                    default: '100'
                },
                {
                    type: 'confirm',
                    name: 'enabled',
                    message: 'Enable the stream',
                    default: true
                },
                {
                    type: 'list',
                    name: 'startingPosition',
                    message: 'Starting position',
                    choices: ['TRIM_HORIZON', 'LATEST'],
                    default: 'TRIM_HORIZON'
                },
                {
                    type: 'list',
                    name: 'streamViewType',
                    message: 'Stream view type for the table',
                    choices: ['KEYS_ONLY', 'NEW_IMAGE', 'OLD_IMAGE', 'NEW_AND_OLD_IMAGES'],
                    default: 'NEW_IMAGE'
                }
            ];

            const done = this.async();
            this.prompt(prompts, function(answers) {
                this.stream = {
                    batchSize: answers.batchSize,
                    enabled: answers.enabled,
                    startingPosition: answers.startingPosition
                };

                this.table.Properties.StreamSpecification = _.merge({},
                    this.table.Properties.StreamSpecification,
                    { StreamViewType: answers.streamViewType });

                done();
            }.bind(this));
        }
    },

    writing: function() {
        // Create a Lambda function as well
        this.composeWith('@testlio/lambda-tools:lambda', {
            options: {
                event: false,
                name: this.lambda.name
            }
        }, {
            local: require.resolve('../lambda')
        });

        // Create the stream entry from a template
        let lambdaName = _.camelCase(this.lambda.name);
        lambdaName = lambdaName.charAt(0).toUpperCase() + lambdaName.substring(1);

        const template = this.fs.read(this.templatePath('cf.json'), 'utf8');
        const rendered = ejs.render(template, {
            stream: this.stream,
            lambdaName: lambdaName,
            resourceName: this.resourceName
        });

        // Inject into cf.json
        const resource = JSON.parse(rendered);
        const existing = this.fs.readJSON(this.destinationPath('cf.json'));
        existing.Resources[this.resourceName] = this.table;
        existing.Resources[this.streamName] = resource;

        // Write back
        this.fs.writeJSON(this.destinationPath('cf.json'), existing, null, 4);


        // Create policy entry from a template
        const policyTemplate = this.fs.read(this.templatePath('lambda_policies.json'), 'utf8');
        const policyRendered = ejs.render(policyTemplate, {
            tableName: this.table.Properties.TableName
        });

        const policy = JSON.parse(policyRendered);

        // Add to existing policies
        if (this.fs.exists(this.destinationPath('lambda_policies.json'))) {
            const existingPolicies = [].concat(this.fs.readJSON(this.destinationPath('lambda_policies.json'), []));

            // Add the new policy and write back to file
            existingPolicies.push(policy);
            this.fs.writeJSON(this.destinationPath('lambda_policies.json'), existingPolicies, null, 4);
        } else {
            // First policy, just create an array and write to file
            this.fs.writeJSON(this.destinationPath('lambda_policies.json'), [policy], null, 4);
        }
    }
});
