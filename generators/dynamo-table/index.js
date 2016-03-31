'use strict';

const generators = require('yeoman-generator');
const _ = require('lodash');
const fs = require('fs');
const ejs = require('ejs');

const helpers = require('../../lib/helper');

/**
 *  Generator for creating a new DynamoDB table for the service,
 *  results in a new entry in 'cf.json' that corresponds to a DynamoDB
 *  table
 */
module.exports = generators.Base.extend({
    constructor: function () {
        generators.Base.apply(this, arguments);

        // Set up some of the attributes
        this.attributes = [];
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
        }
    },

    writing: function() {
        // Create the endpoint entry from a template
        const template = fs.readFileSync(this.templatePath('cf.json'), 'utf8');
        const rendered = ejs.render(template, this);

        // Inject this into cf.json (potentially overriding an existing entry)
        const resource = JSON.parse(rendered);
        const existing = this.fs.readJSON(this.destinationPath('cf.json'));
        existing.Resources = _.assign(existing.Resources || {}, resource);
        this.fs.writeJSON(this.destinationPath('cf.json'), existing, null, 4);
    }
});
