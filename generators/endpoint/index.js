'use strict';

const generators = require('yeoman-generator');
const ejs = require('ejs');
const fs = require('fs');
const helpers = require('../../lib/helper');
const _ = require('lodash');

module.exports = generators.Base.extend({
    constructor: function() {
        generators.Base.apply(this, arguments);

        // Set up placeholders for prompt answers
        this.endpoint = {
            parameters: [],
            headers: {}
        };

        this.lambda = {};
    },

    prompting: {
        basic: function() {
            // First, ask for the path, lambda name and HTTP method
            // (these will always be needed)
            const prompts = [
                {
                    type: 'input',
                    name: 'path',
                    message: 'Path for the endpoint',
                    default: '/',
                    validate: function(value) {
                        if (value[0] !== '/') {
                            return 'Endpoint paths must begin with a slash (/)';
                        }

                        return true
                    }
                },
                {
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
                },
                {
                    type: 'list',
                    name: 'method',
                    message: 'HTTP Method',
                    default: 0,
                    choices: [
                        { name: 'GET', value: 'get' },
                        { name: 'PUT', value: 'put' },
                        { name: 'POST', value: 'post' },
                        { name: 'DELETE', value: 'delete' },
                        { name: 'OPTIONS', value: 'options' },
                        { name: 'HEAD', value: 'head' },
                        { name: 'PATCH', value: 'patch' }
                    ]
                }
            ];

            const done = this.async();
            this.prompt(prompts, function(answers) {
                this.endpoint.path = answers.path;
                this.endpoint.method = answers.method;
                this.lambda.name = answers.name;

                done();
            }.bind(this));
        },

        bodyParameter: function() {
            if (['post', 'put', 'patch'].indexOf(this.endpoint.method) === -1) {
                return;
            }

            const prompts = [
                {
                    type: 'input',
                    name: 'requestBodyName',
                    message: 'Map request body to event property (leave blank to skip)'
                }
            ];

            const done = this.async();
            this.prompt(prompts, function(answers) {
                if (answers.requestBodyName) {
                    this.endpoint.bodyParameter = answers.requestBodyName;
                }

                done();
            }.bind(this));
        },

        pathParameters: function() {
            const parameters = helpers.extractURLParameters(this.endpoint.path);

            if (parameters.length === 0) {
                return;
            }

            // Create prompts for all the parameters (asking if they are required)
            const prompts = parameters.map(function(param) {
                return {
                    type: 'confirm',
                    name: 'required.' + param,
                    message: 'Is path parameter \'' + param + '\' required?',
                    default: true
                };
            });

            const done = this.async();

            this.prompt(prompts, function(answers) {
                parameters.forEach(function(param) {
                    this.endpoint.parameters.push({
                        name: param,
                        in: 'path',
                        type: 'string',
                        required: answers['required.' + param]
                    });
                }.bind(this));

                done();
            }.bind(this));
        },

        headerParameters: function() {
            const loop = function(done) {
                const prompts = [
                    {
                        type: 'input',
                        name: 'requestHeader',
                        message: 'Request header name',
                        validate: function(value) {
                            // Super naive implementation, so that empty values are not allowed
                            if (value.length > 0) {
                                return true
                            }

                            return 'Header name shouldn\'t be empty';
                        }
                    },
                    {
                        type: 'input',
                        name: 'integrationHeader',
                        message: 'Map to integration header',
                        default: function(answers) {
                            return 'x-' + answers.requestHeader.toLowerCase();
                        },
                        validate: function(value) {
                            // Super naive implementation, so that empty values are not allowed
                            if (value.length > 0) {
                                return true
                            }

                            return 'Header name shouldn\'t be empty';
                        }
                    },
                    {
                        type: 'confirm',
                        name: 'mapAnotherHeader',
                        message: 'Map another HTTP header?',
                        default: false
                    }
                ];

                this.prompt(prompts, function(answers) {
                    this.endpoint.headers[answers.integrationHeader] = answers.requestHeader;

                    if (answers.mapAnotherHeader) {
                        loop(done);
                    } else {
                        done();
                    }
                }.bind(this));
            }.bind(this);

            const done = this.async();

            // Repeatedly ask for headers that need to be mapped
            this.prompt({
                type: 'confirm',
                name: 'mapHeader',
                message: 'Map HTTP headers?',
                default: false
            }, function(answers) {
                if (answers.mapHeader) {
                    loop(done)
                } else {
                    done();
                }
            });
        }
    },

    writing: function() {
        // Create the lambda function itself
        this.composeWith("@testlio/lambda-tools:lambda", {
            options: {
                event: true,
                name: this.lambda.name
            }
        }, {
            local: require.resolve("../lambda")
        });

        // Create an API suitable name
        let name = _.camelCase(this.lambda.name);
        name = name.charAt(0).toUpperCase() + name.slice(1);

        // Create requestParameters
        const requestParameters = {};
        for (let header in this.endpoint.headers) {
            const value = 'method.request.header.' + this.endpoint.headers[header];
            requestParameters['integration.request.header.' + header] = value;
        }

        // Create requestTemplate (the object)
        const requestTemplate = {
            path: '$context.resourcePath'
        };

        for (let header in this.endpoint.headers) {
            const key = this.endpoint.headers[header];
            requestTemplate[_.camelCase(key)] = '$input.params(\'' + key + '\')';
        }

        for (let param in this.endpoint.parameters) {
            const key = this.endpoint.parameters[param].name;
            requestTemplate[_.camelCase(key)] = '$util.urlDecode($input.params(\'' + key + '\'))';
        }

        let requestTemplateString;
        if (this.endpoint.bodyParameter) {
            requestTemplate[this.endpoint.bodyParameter] = '<%= placeholder %>';
            requestTemplateString = JSON.stringify(requestTemplate);
            requestTemplateString = requestTemplateString.replace(/"<%= placeholder %>"/g, "$$input.json('$$')");
        } else {
            requestTemplateString = JSON.stringify(requestTemplate);
        }

        // Create the endpoint entry from a template
        const template = fs.readFileSync(this.templatePath('api.json'), 'utf8');
        const rendered = ejs.render(template, {
            method: this.endpoint.method,
            parameters: this.endpoint.parameters,
            requestParameters: requestParameters,
            requestTemplate: requestTemplateString,
            lambdaName: name
        });

        // Inject this into api.json (potentially overriding an existing entry)
        const endpoint = JSON.parse(rendered);
        const existing = this.fs.readJSON(this.destinationPath('api.json'));
        existing.paths[this.endpoint.path] = _.assign(existing.paths[this.endpoint.path] || {}, endpoint);
        this.fs.writeJSON(this.destinationPath('api.json'), existing, null, 4);
    }
});
