'use strict';

const generators = require('yeoman-generator');
const helpers = require('../../lib/helper');
const _ = require('lodash');
const ejs = require('ejs');
const fs = require('fs');

/**
 *  Generator for creating a new periodic Lambda function, one which
 *  is not exposed via the API, but has a periodic event triggering it.
 *  Creates appropriate scaffolding in the 'lambdas' directory for the newly
 *  created Lambda function, as well as creating appropriate CF resources
 *  to cf.json template
 */
module.exports = generators.Base.extend({
    constructor: function () {
        generators.Base.apply(this, arguments);

        this.rule = {};
        this.lambda = {};
        this.target = {};
    },

    prompting: function() {
        const done = this.async();
        const prompts = [];

        prompts.push({
            type: 'input',
            name: 'name',
            message: 'Lambda function name',
            validate: function(value) {
                try {
                    return helpers.isValidLambdaName(value);
                } catch (err) {
                    return err.message;
                }
            }
        });

        prompts.push({
            type: 'confirm',
            name: 'event',
            message: 'Create event.json',
            default: true
        });

        prompts.push({
            type: 'input',
            name: 'scheduleExpression',
            message: 'Schedule/Rate expression',
            validate: function(value) {
                // Two formats are supported
                // cron(<Fields>) and rate(<Value> <Unit>)
                const rateExpression = /^rate\(((?:[0-9])+)\s+((?:(?:minute)|(?:hour)|(?:day))s?)\)$/;
                const cronExpression = /^cron\((?:([^\s]*)\s+){5}([^\s]*)\)$/;

                if (!rateExpression.test(value) && !cronExpression.test(value)) {
                    return 'Only cron(<Fields>) or rate(<Value> <Unit>) expressions are allowed';
                }

                return true;
            }
        });

        prompts.push({
            type: 'input',
            name: 'ruleName',
            message: 'CloudWatch rule name (leave empty for automatic name)',
            default: ''
        });

        prompts.push({
            type: 'input',
            name: 'logicalID',
            message: 'CloudWatch rule logical ID (used in CloudFormation template)',
            default: function(answers) {
                if (answers.ruleName) {
                    return `${_.upperFirst(_.camelCase(answers.ruleName))}Event`;
                }

                return '';
            },
            validate: function(value) {
                try {
                    return helpers.isValidCloudFormationLogicalID(value);
                } catch (err) {
                    return err.message;
                }
            }
        });

        prompts.push({
            type: 'input',
            name: 'description',
            message: 'CloudWatch rule description (leave empty to skip)',
            default: ''
        });

        prompts.push({
            type: 'input',
            name: 'input',
            message: 'CloudWatch rule static input (JSON string, leave empty to skip)',
            default: ''
        });

        prompts.push({
            type: 'input',
            name: 'inputPath',
            message: 'CloudWatch rule input path (JSONPath string, leave empty to skip)',
            default: ''
        });

        prompts.push({
            type: 'confirm',
            default: true,
            name: 'ruleStateEnabled',
            message: 'Is CloudWatch rule ENABLED?'
        });

        this.prompt(prompts, function (answers) {
            this.lambda = {
                name: answers.name,
                event: answers.event
            };

            this.rule = {
                name: answers.ruleName,
                logicalID: answers.logicalID,
                description: answers.description,
                scheduleExpression: answers.scheduleExpression,
                state: answers.ruleStateEnabled ? 'ENABLED' : 'DISABLED'
            };

            this.target = {
                input: answers.input,
                inputPath: answers.inputPath
            };

            done();
        }.bind(this));
    },

    writing: function() {
        // Create the lambda function itself
        this.composeWith('lambda-tools:lambda', {
            options: {
                event: this.lambda.event,
                name: this.lambda.name
            }
        }, {
            local: require.resolve('../lambda')
        });

        // Read the existing resources (to see if we already have one and if so
        // it'll help us derive the ID for the target we are about to add)
        const existing = this.fs.readJSON(this.destinationPath('cf.json'));
        const logicalID = this.rule.logicalID;
        const functionLogicalID = _.upperFirst(_.camelCase(this.lambda.name));

        let existingRule = existing.Resources[logicalID] || {};
        existingRule = _.merge({ Targets: [] }, existingRule);

        const nextID = `${existingRule.Targets.length + 1}`;

        // Create the new resource and then merge it with the existing one
        const template = fs.readFileSync(this.templatePath('cf.json'), 'utf8');
        const rendered = JSON.parse(ejs.render(template, {
            resource: {
                logicalID: this.rule.logicalID,
                description: this.rule.description,
                name: this.rule.name,
                scheduleExpression: this.rule.scheduleExpression,
                state: this.rule.state
            },
            lambda: {
                logicalID: functionLogicalID
            },
            target: {
                input: this.target.input,
                inputPath: this.target.inputPath,
                id: nextID
            },
            permission: {
                logicalID: `${this.rule.logicalID}${functionLogicalID}Permission`
            }
        }));

        existing.Resources = _.merge(existing.Resources || {}, rendered);
        this.fs.writeJSON(this.destinationPath('cf.json'), existing, null, 4);
    }
});
