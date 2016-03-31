'use strict';

const generators = require('yeoman-generator');
const inquirer = require('inquirer');
const ejs = require('ejs');
const fs = require('fs');
const helpers = require('../../lib/helper');
const _ = require('lodash');

/**
 *  Generator for enabling CORS on an existing endpoint, modifies
 *  existing integrations and adds a corresponding "options" integration
 */
module.exports = generators.Base.extend({
    constructor: function() {
        generators.Base.apply(this, arguments);

        // Set up placeholders for prompt answers
        this.cors = {
            headers: [],
            methods: [],
            origins: []
        };
    },

    initializing: function() {
        // Read in existing API
        const existing = this.fs.readJSON(this.destinationPath('api.json')).paths;

        // Make sure there is at least one path
        if (_.size(existing) === 0) {
            throw new Error('No paths/endpoints defined');
        }

        this.paths = existing;
    },

    prompting: {
        endpoint: function() {
            const prompts = [
                {
                    type: 'list',
                    name: 'path',
                    message: 'Enable CORS for path',
                    default: 0,
                    choices: _.keys(this.paths)
                }
            ];

            const done = this.async();
            this.prompt(prompts, function (answers) {
                this.path = answers.path;
                this.endpoint = this.paths[this.path];
                done();
            }.bind(this));
        },

        cors: function() {
            // Pick up all methods found for given path
            const methods = _.keys(this.endpoint);

            const prompts = [
                {
                    type: 'checkbox',
                    name: 'allowMethods',
                    message: 'Allow methods',
                    choices: methods.map(function(method) {
                        return {
                            name: method.toUpperCase(),
                            checked: true
                        };
                    }),
                    validate: function(answer) {
                        return answer.length < 1 ? 'You musth choose at least one method' : true;
                    }
                },
                {
                    type: 'checkbox',
                    name: 'allowHeaders',
                    message: 'Allow headers',
                    choices: function(answers) {
                        // Pick up all headers for chosen methods
                        const methods = answers.allowMethods;
                        let headers = answers.allowMethods.reduce(function(current, method) {
                            method = method.toLowerCase();

                            const params = this.endpoint[method]['x-amazon-apigateway-integration'].requestParameters;

                            const headers = [];
                            _.forOwn(params, function(value) {
                                if (_.startsWith(value, 'method.request.header.')) {
                                    headers.push({
                                        name: _.trimStart(value, 'method.request.header.'),
                                        checked: true
                                    });
                                }
                            });

                            return _.unionBy(current, headers, 'name');
                        }.bind(this), []);

                        // Create two sections (AWS suggested + additional)
                        const awsHeaders = [
                            {
                                name: 'Content-Type',
                                checked: true
                            },
                            {
                                name: 'X-Amz-Date',
                                checked: true
                            },
                            {
                                name: 'X-Api-Key',
                                checked: true
                            }
                        ];

                        headers = _.differenceBy(headers, awsHeaders, 'name');

                        let result = [
                            new inquirer.Separator('AWS suggested')
                        ];

                        result = result.concat(awsHeaders);

                        if (headers.length > 0) {
                            result = result.concat(new inquirer.Separator('Additional'));
                            result = result.concat(headers);
                        }

                        return result;
                    }.bind(this)
                },
                {
                    type: 'input',
                    name: 'allowOrigin',
                    message: 'Allow origin',
                    default: '*'
                }
            ];

            const done = this.async();
            this.prompt(prompts, function (answers) {
                this.cors.methods = answers.allowMethods.concat('OPTIONS');
                this.cors.headers = answers.allowHeaders;
                this.cors.origins = answers.allowOrigin.split(',').map(_.trim);
                done();
            }.bind(this));
        }
    },

    writing: function() {
        // Create the response parameters
        const responseParameters = {
            'method.response.header.Access-Control-Allow-Headers': '\'' + this.cors.headers.join(',') + '\'',
            'method.response.header.Access-Control-Allow-Methods': '\'' + this.cors.methods.join(',') + '\'',
            'method.response.header.Access-Control-Allow-Origin': '\'' + this.cors.origins.join(',') + '\''
        };

        // Create the OPTIONS method
        const template = fs.readFileSync(this.templatePath('api.json'), 'utf8');
        const rendered = ejs.render(template, {
            responseParameters: responseParameters
        });
        this.endpoint['options'] = JSON.parse(rendered);

        // Add CORS response headers to the selected methods
        const merge = {
            responses: {
                200: {
                    headers: {
                        'Access-Control-Allow-Headers': {
                            type: 'string'
                        },
                        'Access-Control-Allow-Methods': {
                            type: 'string'
                        },
                        'Access-Control-Allow-Origin': {
                            type: 'string'
                        }
                    }
                }
            },
            'x-amazon-apigateway-integration': {
                responses: {
                    default: {
                        responseParameters: responseParameters
                    }
                }
            }
        };

        this.cors.methods.forEach(function(method) {
            method = method.toLowerCase();
            this.endpoint[method] = _.merge({}, this.endpoint[method], merge);
        }.bind(this));

        // Write back the final endpoint
        const existingAPI = this.fs.readJSON(this.destinationPath('api.json'));
        existingAPI.paths[this.path] = this.endpoint;

        this.fs.writeJSON(this.destinationPath('api.json'), existingAPI, null, 4);
    }
});
