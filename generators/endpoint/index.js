'use strict';

const generators = require('yeoman-generator');
const ejs = require('ejs');
const fs = require('fs');
const helpers = require('../../lib/helper');
const _ = require('lodash');

/**
 *  Generator for adding a new API endpoint to the service, including the backing
 *  lambda function. The generator makes sure that path and header parameters
 *  are appropriately mapped in 'api.json' and also creates the scaffolding
 *  for the implementation of the Lambda function under the 'lambdas' directory
 */
module.exports = generators.Base.extend({
    constructor: function() {
        generators.Base.apply(this, arguments);

        // Set up placeholders for prompt answers
        this.endpoint = {
            pathParameters: [],
            headerParameters: [],
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
                    filter: function(value) {
                        if (value.charAt(0) !== '/') {
                            return `/${value}`;
                        }

                        return value;
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
                    this.endpoint.pathParameters.push({
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
                                return true;
                            }

                            return 'Header name shouldn\'t be empty';
                        }
                    },
                    {
                        type: 'input',
                        name: 'integrationHeader',
                        message: 'Map to integration header',
                        default: function(answers) {
                            const lowercase = answers.requestHeader.toLowerCase();
                            if (_.startsWith(lowercase, 'x-')) {
                                return lowercase;
                            }

                            return 'x-' + lowercase;
                        },
                        validate: function(value) {
                            // Super naive implementation, so that empty values are not allowed
                            if (value.length > 0) {
                                return true;
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
                    this.endpoint.headerParameters.push({
                        name: answers.requestHeader,
                        in: 'header',
                        type: 'string',
                        required: true
                    });

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
                    loop(done);
                } else {
                    done();
                }
            });
        }
    },

    writing: function() {
        // Create the lambda function itself
        this.composeWith('lambda-tools:lambda', {
            options: {
                event: true,
                name: this.lambda.name
            }
        }, {
            local: require.resolve('../lambda')
        });

        // Create an API suitable name
        let name = _.camelCase(this.lambda.name);
        name = name.charAt(0).toUpperCase() + name.slice(1);

        // Create requestParameters
        const requestParameters = {};
        for (const header in this.endpoint.headers) {
            const value = 'method.request.header.' + this.endpoint.headers[header];
            requestParameters['integration.request.header.' + header] = value;
        }

        // Create requestTemplate (the object)
        const requestTemplate = {
            path: '$context.resourcePath'
        };

        for (const header in this.endpoint.headers) {
            const key = this.endpoint.headers[header];
            requestTemplate[_.camelCase(key)] = '$input.params(\'' + key + '\')';
        }

        for (const param in this.endpoint.pathParameters) {
            const key = this.endpoint.pathParameters[param].name;
            requestTemplate[_.camelCase(key)] = '$util.urlDecode($input.params(\'' + key + '\'))';
        }

        let requestTemplateString;
        if (this.endpoint.bodyParameter) {
            requestTemplate[this.endpoint.bodyParameter] = '<%= placeholder %>';
            requestTemplateString = JSON.stringify(requestTemplate);
            requestTemplateString = requestTemplateString.replace(/"<%= placeholder %>"/g, '$$input.json(\'$$\')');
        } else {
            requestTemplateString = JSON.stringify(requestTemplate);
        }

        // Convert parameters to references (use a nicer style, where parameters are globally
        // defined in the template)
        const templateParameters = [];
        const swaggerParameters = {};

        for (const param in this.endpoint.pathParameters) {
            let key = _.camelCase(this.endpoint.pathParameters[param].name) + 'Path';
            key = key.charAt(0).toUpperCase() + key.substring(1);

            templateParameters.push({
                '$ref': '#/parameters/' + key
            });

            swaggerParameters[key] = this.endpoint.pathParameters[param];
        }

        for (const param in this.endpoint.headerParameters) {
            let key = _.camelCase(this.endpoint.headerParameters[param].name) + 'Header';
            key = key.charAt(0).toUpperCase() + key.substring(1);

            templateParameters.push({
                '$ref': '#/parameters/' + key
            });

            swaggerParameters[key] = this.endpoint.headerParameters[param];
        }

        // Create the endpoint entry from a template
        const template = fs.readFileSync(this.templatePath('api.json'), 'utf8');
        const rendered = ejs.render(template, {
            method: this.endpoint.method,
            parameters: templateParameters,
            requestParameters: requestParameters,
            requestTemplate: requestTemplateString,
            lambdaName: name
        });

        // Inject this into api.json (potentially overriding an existing entry)
        const endpoint = JSON.parse(rendered);
        const existing = this.fs.readJSON(this.destinationPath('api.json'));
        existing.paths[this.endpoint.path] = _.assign(existing.paths[this.endpoint.path] || {}, endpoint);
        existing.parameters = _.assign(existing.parameters || {}, swaggerParameters);
        this.fs.writeJSON(this.destinationPath('api.json'), existing, null, 4);
    }
});
