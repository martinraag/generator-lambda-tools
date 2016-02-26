'use strict';

const generators = require('yeoman-generator');
const mkdirp = require('mkdirp');

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
                name: 'authorEmail',
                message: 'Author (email)'
            },
            {
                type: 'input',
                name: 'authorName',
                message: 'Author (name)'
            }
        ];

        this.prompt(prompts, function (answers) {
            this.service = {
                name: answers.serviceName.toLowerCase().replace(/\s+/g, '-'),
                description: answers.serviceDescription
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
