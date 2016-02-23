'use strict';

const generators = require('yeoman-generator');
const path = require('path');

module.exports = generators.Base.extend({
    prompting: function() {
        const done = this.async();

        const prompts = [
            {
                type: 'input',
                name: 'lambdaName',
                validate: function(value) {
                    if (value.length === 0) {
                        return 'Can\'t have an empty name';
                    }

                    const pattern = /^([a-zA-Z0-9-_]{1,140})$/

                    if (!value.match(pattern)) {
                        return 'Name must only include A-Z, a-z, 0-9, \'-\' or \'_\' and be at most 140 characters'
                    }

                    return true
                },
                message: 'Lambda function name',
            },
            {
                type: 'confirm',
                name: 'createLambdaEvent',
                message: 'Create event.json',
                default: true
            }
        ];

        this.prompt(prompts, function (answers) {
            this.lambda = {
                name: answers.lambdaName,
                createEvent: answers.createLambdaEvent
            };

            done();
        }.bind(this));
    },

    writing: function() {
        const lambdaRoot = this.destinationPath('lambdas/' + this.lambda.name);

        // index.js
        this.copy(this.templatePath('index.js'), path.join(lambdaRoot, 'index.js'));

        if (this.lambda.createEvent) {
            // event.json
            this.copy(this.templatePath('event.json'), path.join(lambdaRoot, 'event.json'));
        }
    }
});
