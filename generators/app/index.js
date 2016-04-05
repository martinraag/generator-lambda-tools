'use strict';

const generators = require('yeoman-generator');
const mkdirp = require('mkdirp');

/**
 *  Main 'app' generator, sets up the basis for a Lambda backed
 *  service, which includes the 'lambdas' directory as well as the
 *  stubs for 'api.json' and 'cf.json' files.
 */
module.exports = generators.Base.extend({
    prompting: {
        service: function() {
            // Ask for the basic information about this service
            // Notice, this info is also stored for future reference
            const prompts = [
                {
                    type: 'input',
                    name: 'serviceName',
                    message: 'Service name',
                    default: function() {
                        return this.appname.trim().replace(/\s+/g, '-');
                    }.bind(this),
                    filter: function(value) {
                        return value.toLowerCase().replace(/\s+/g, '-');
                    }
                },
                {
                    type: 'input',
                    name: 'serviceDescription',
                    message: 'Service description'
                },
                {
                    type: 'input',
                    name: 'serviceLicense',
                    message: 'License (API)',
                    default: 'ISC',
                    store: true,
                    validate: function(value) {
                        // Simple rule, make sure the value is present
                        return value.length > 0 ? true : 'License can\'t be empty';
                    }
                }
            ];

            const done = this.async();
            this.prompt(prompts, function(answers) {
                this.service = {
                    name: answers.serviceName,
                    description: answers.serviceDescription,
                    license: answers.serviceLicense
                };

                done();
            }.bind(this));
        },

        author: function() {
            // Ask about the author of this service
            const prompts = [
                {
                    type: 'input',
                    name: 'authorEmail',
                    message: 'Author email',
                    store: true,
                    validate: function(value) {
                        // Simple rule, make sure the value is present
                        return value.length > 0 ? true : 'Email can\'t be empty';
                    }
                },
                {
                    type: 'input',
                    name: 'authorName',
                    message: 'Author name',
                    store: true,
                    validate: function(value) {
                        // Simple rule, make sure the value is present
                        return value.length > 0 ? true : 'Name can\'t be empty';
                    }
                }
            ];

            const done = this.async();
            this.prompt(prompts, function(answers) {
                this.author = {
                    name: answers.authorName,
                    email: answers.authorEmail
                };

                done();
            }.bind(this));
        },

        dependencies: function() {
            // Ask about installing dependencies
            const dependencies = [
                {
                    // LT is always installed as dev-dependency
                    name: 'lambda-tools',
                    value: {
                        name: '@testlio/lambda-tools',
                        dev: true
                    },
                    checked: true
                },
                {
                    name: 'lambda-foundation',
                    value: {
                        name: '@testlio/lambda-foundation',
                        dev: false
                    },
                    checked: true
                }
            ];

            const prompts = [
                {
                    type: 'checkbox',
                    name: 'dependencies',
                    message: 'Install dependencies',
                    choices: dependencies
                }
            ];

            const done = this.async();
            this.prompt(prompts, function(answers) {
                this.dependencies = [];

                if (answers.dependencies) {
                    this.dependencies = this.dependencies.concat(answers.dependencies);
                }

                done();
            }.bind(this));
        }
    },

    writing: function() {
        // Install appropriate dependencies
        if (this.dependencies) {
            this.dependencies.forEach(function(dependency) {
                this.npmInstall([dependency.name], {
                    saveDev: dependency.dev,
                    save: !dependency.dev
                });
            }.bind(this));
        }

        const template = {
            service: this.service,
            author: this.author
        };

        // Create the stubs for cf.json and api.json
        this.fs.copyTpl(
            this.templatePath('cf.json'),
            this.destinationPath('cf.json'),
            template
        );

        this.fs.copyTpl(
            this.templatePath('api.json'),
            this.destinationPath('api.json'),
            template
        );

        // Create a placeholder directory for lambdas
        mkdirp.sync(this.destinationPath('lambdas'));

        // Create a config file
        this.config.save();
    }
});
