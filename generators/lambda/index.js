'use strict';

const generators = require('yeoman-generator');
const path = require('path');
const helpers = require('../../lib/helper');

/**
 *  Generator for creating a new Lambda function, one which is not
 *  exposed via the API, but is still part of the service. Creates
 *  appropriate scaffolding in the 'lambdas' directory for the newly
 *  created Lambda function.
 */
module.exports = generators.Base.extend({
    constructor: function () {
        generators.Base.apply(this, arguments);

        // Allow lambda name to be passed in as an argument
        this.option('name', { type: String, desc: 'Lambda function name' });
        this.option('event', { desc: 'If event.json should be created', type: Boolean });
    },

    prompting: function() {
        const done = this.async();
        const prompts = [];

        this.lambda = {
            name: this.options.name,
            event: this.options.event
        };

        if (!this.lambda.name) {
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
        }

        if (!this.lambda.event) {
            prompts.push({
                type: 'confirm',
                name: 'event',
                message: 'Create event.json',
                default: true
            });
        }

        if (prompts.length === 0) {
            return done();
        }

        this.prompt(prompts, function (answers) {
            this.lambda = {
                name: this.lambda.name || answers.name,
                event: this.lambda.event || answers.event
            };

            done();
        }.bind(this));
    },

    writing: function() {
        const lambdaRoot = this.destinationPath('lambdas/' + this.lambda.name);

        // index.js
        this.copy(this.templatePath('index.js'), path.join(lambdaRoot, 'index.js'));

        if (this.lambda.event) {
            // event.json
            this.copy(this.templatePath('event.json'), path.join(lambdaRoot, 'event.json'));
        }
    }
});
