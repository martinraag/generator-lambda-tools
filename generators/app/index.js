'use strict';

const generators = require('yeoman-generator');
const mkdirp = require('mkdirp');

/**
 *  Main 'app' generator, sets up the basis for a Lambda backed
 *  service, which includes the 'lambdas' directory as well as the
 *  stubs for 'api.json' and 'cf.json' files.
 */
module.exports = generators.Base.extend({
    prompting: function() {
        const done = this.async();

        const prompts = [
            {
                type: 'input',
                name: 'serviceName',
                message: 'Service name',
                store: true,
                default: this.appname.trim().replace(/\s+/g, '-')
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
                store: true,
                default: 'ISC',
                validate: function(value) {
                    // Simple rule, make sure the value is present
                    return value.length > 0 ? true : 'License can\'t be empty';
                }
            },
            {
                type: 'input',
                name: 'authorEmail',
                message: 'Author (email)',
                store: true,
                validate: function(value) {
                    // Simple rule, make sure the value is present
                    return value.length > 0 ? true : 'Email can\'t be empty';
                }
            },
            {
                type: 'input',
                name: 'authorName',
                message: 'Author (name)',
                store: true,
                validate: function(value) {
                    // Simple rule, make sure the value is present
                    return value.length > 0 ? true : 'Name can\'t be empty';
                }
            }
        ];

        this.prompt(prompts, function (answers) {
            this.service = {
                name: answers.serviceName.toLowerCase().replace(/\s+/g, '-'),
                description: answers.serviceDescription,
                license: answers.serviceLicense
            };

            this.author = {
                name: answers.authorName,
                email: answers.authorEmail
            };

            done();
        }.bind(this));
    },

    writing: function() {
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
