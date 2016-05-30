'use strict';

const generators = require('yeoman-generator');
const ejs = require('ejs');
const fs = require('fs');
const _ = require('lodash');

/**
 *  Generator for adding response codes to endpoints
 */
module.exports = generators.Base.extend({
    constructor: function() {
        generators.Base.apply(this, arguments);

        // Set up placeholders for prompt answers
        this.response = {
            status: '200',
            template: '',
            parameters: {},
            headers: {}
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
                    message: 'Add a response to path',
                    default: 0,
                    choices: _.keys(this.paths)
                },
                {
                    type: 'list',
                    name: 'method',
                    message: 'HTTP Method',
                    choices: function(answers) {
                        return _.keys(this.paths[answers.path]).map(_.toUpper);
                    }.bind(this)
                }
            ];

            const done = this.async();
            this.prompt(prompts, function(answers) {
                this.path = answers.path;
                this.endpoint = this.paths[this.path];
                this.method = answers.method.toLowerCase();
                done();
            }.bind(this));
        },

        response: function() {
            const prompts = [
                {
                    type: 'list',
                    name: 'statusCodeCommon',
                    message: 'Status code',
                    choices: ['400', '401', '403', '404', '500', 'Other'],
                    default: 0
                },
                {
                    type: 'input',
                    name: 'statusCode',
                    message: 'Status code',
                    when: function(answers) {
                        return answers.statusCodeCommon === 'Other';
                    },
                    validate: function(answer) {
                        const int = parseInt(answer, 10);

                        // Only validate the code is numeric, we could also validate
                        // that the number is a possible status code, but that seems
                        // overkill (and as the list of codes may change, it would not
                        // be as flexible)
                        if (_.isNaN(int)) {
                            return 'Status code should be numeric';
                        }

                        return true;
                    }
                },
                {
                    type: 'input',
                    name: 'responseId',
                    message: 'Response name/pattern',
                    default: function(answers) {
                        return (answers.statusCode || answers.statusCodeCommon) + '.*';
                    },
                    validate: function(value) {
                        return value.length > 0 ? true : 'Response name/pattern can\'t be empty';
                    }
                },
                {
                    type: 'input',
                    name: 'responseDescription',
                    message: 'Response description',
                    default: function(answers) {
                        const code = answers.statusCode || answers.statusCodeCommon;
                        if (code === '400') {
                            return 'Bad Request';
                        } else if (code === '401') {
                            return 'Unauthorized';
                        } else if (code === '403') {
                            return 'Forbidden';
                        } else if (code === '404') {
                            return 'Not Found';
                        } else if (code === '500') {
                            return 'Internal Error';
                        }

                        return 'HTTP ' + answers.statusCode || answers.statusCodeCommon;
                    }
                },
                {
                    type: 'list',
                    name: 'responseTemplateType',
                    message: 'Response template MIME type',
                    choices: ['application/json'],
                    default: 'application/json'
                },
                {
                    type: 'confirm',
                    name: 'hasResponseTemplate',
                    message: 'Create response template?',
                    default: function(answers) {
                        const code = answers.statusCode || answers.statusCodeCommon;
                        if (code === '400' || code === '401' || code === '403' || code === '404') {
                            return true;
                        } else if (code === '500') {
                            return true;
                        }

                        return false;
                    }
                },
                {
                    type: 'input',
                    name: 'responseTemplate',
                    message: 'Response template',
                    when: function(answers) {
                        return answers.hasResponseTemplate;
                    },
                    default: function(answers) {
                        const code = answers.statusCode || answers.statusCodeCommon;
                        if (code === '400') {
                            return '{ "message": "Bad Request" }';
                        } else if (code === '401') {
                            return '{ "message": "Unauthorized" }';
                        } else if (code === '403') {
                            return '{ "message": "Forbidden" }';
                        } else if (code === '404') {
                            return '{ "message": "Not Found" }';
                        } else if (code === '500') {
                            return '{ "message": "Internal Error" }';
                        }

                        return '';
                    }
                }
            ];

            const done = this.async();
            this.prompt(prompts, function(answers) {
                this.response.status = {
                    code: answers.statusCode || answers.statusCodeCommon
                };

                this.response.description = answers.responseDescription;

                this.response.template = {
                    type: answers.responseTemplateType,
                    template: answers.responseTemplate || ''
                };

                this.response.responseId = answers.responseId;

                done();
            }.bind(this));
        },

        responseParameters: function() {
            // Loop and ask for parameters to forward from the integration
            // to the response
            const loop = function(done) {
                const prompts = [
                    {
                        type: 'input',
                        name: 'responseHeader',
                        message: 'Response header name',
                        validate: function(value) {
                            // Super naive implementation, so that empty values are not allowed
                            if (value.length > 0) {
                                return true;
                            }

                            return 'Header name shouldn\'t be empty';
                        },
                        filter: function(value) {
                            if (!_.startsWith(value, 'method.response.header.')) {
                                return 'method.response.header.' + value;
                            }

                            return value;
                        }
                    },
                    {
                        type: 'list',
                        name: 'integrationSource',
                        choices: ['header', 'body'],
                        message: 'Map from integration...',
                        default: 1
                    },
                    {
                        type: 'input',
                        name: 'integrationKeyPath',
                        message: 'Key path for the value',
                        when: function(answers) {
                            return answers.integrationSource === 'header';
                        },
                        default: function(answers) {
                            return _.trimStart(answers.responseHeader, 'method.response.header.');
                        },
                        filter: function(value) {
                            if (!_.startsWith(value, 'integration.request.header.')) {
                                return 'integration.request.header.' + value;
                            }

                            return value;
                        }
                    },
                    {
                        type: 'input',
                        name: 'integrationKeyPath',
                        message: 'Key path for the value',
                        when: function(answers) {
                            return answers.integrationSource === 'body';
                        },
                        default: function(answers) {
                            const trimmed = _.trimStart(answers.responseHeader, 'method.response.header.');
                            return _.camelCase(trimmed);
                        },
                        filter: function(value) {
                            if (!_.startsWith(value, 'integration.request.body.')) {
                                return 'integration.request.body.' + value;
                            }

                            return value;
                        }
                    },
                    {
                        type: 'confirm',
                        name: 'mapAnotherHeader',
                        message: 'Map another header',
                        default: false
                    }
                ];

                this.prompt(prompts, function(answers) {
                    this.response.parameters[answers.responseHeader] = answers.integrationKeyPath;

                    this.response.headers[_.trimStart(answers.responseHeader, 'method.response.header.')] = {
                        type: 'string'
                    };

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
                message: 'Include any HTTP headers?',
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
        // API we'll be modifying
        const existingAPI = this.fs.readJSON(this.destinationPath('api.json'));

        // Add the new response to both the extension as well as main Swagger parts
        if (_.startsWith(this.response.template.template, '[')) {
            // Returns an array
            this.response.schema = {
                type: 'array',
                items: {
                    type: 'object'
                }
            };
        } else {
            this.response.schema = {
                type: 'object'
            };
        }

        const template = fs.readFileSync(this.templatePath('api.json'), 'utf8');
        const rendered = JSON.parse(ejs.render(template, this.response));

        // Write back the final endpoint
        this.endpoint[this.method] = _.merge({}, this.endpoint[this.method], rendered);
        existingAPI.paths[this.path] = this.endpoint;

        this.fs.writeJSON(this.destinationPath('api.json'), existingAPI, null, 4);
    }
});
