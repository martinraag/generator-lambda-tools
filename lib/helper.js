'use strict';

// Helpers for validating aspects of generators
module.exports = {
    /**
     * Returns true iff string is a valid Lambda function name, otherwise
     * throws an error with the appropriate reason
     */
    isValidLambdaName: function(string) {
        if (string.length === 0) {
            throw new Error('Can\'t have an empty name');
        }

        const pattern = /^([a-zA-Z0-9-_]{1,140})$/;

        if (!string.match(pattern)) {
            throw new Error('Name must only include A-Z, a-z, 0-9, \'-\' or \'_\' and be at most 140 characters');
        }

        return true;
    },

    /**
     * Extract URL parameters from the path, follows the simple Swagger
     * logic, where a parameter is enclosed in {}. Returns an array
     * of parameters found
     */
    extractURLParameters: function(url) {
        let match;
        const paramRe = /\{([^\{\}]+)\}/g;
        const parameters = [];
        while ((match = paramRe.exec(url)) !== null) {
            parameters.push(match[1]);
        }

        return parameters;
    },

    /**
     *  Returns true iff the parameter is a suitable string for DynamoDB attribute name
     */
    isValidDynamoDBAttributeName: function(string) {
        if (string.length < 1 || string.length > 255) {
            throw new Error('Attribute name must be 1-255 characters long');
        }

        return true;
    },

    /**
     *  Returns true iff the parameter is a suitable string for DynamoDB index name
     */
    isValidDynamoDBIndexName: function(string) {
        if (string.length < 3 || string.length > 255) {
            throw new Error('Attribute name must be 3-255 characters long');
        }

        return true;
    },

    isValidCloudFormationLogicalID: function(string) {
        if (!string.match(/^[A-Za-z0-9]+$/)) {
            throw new Error('Logical ID must be alphanumeric [A-Za-z0-9] and not empty');
        }

        return true;
    },

    /**
     *  Returns an array of prompts that correspond to DynamoDB key schema
     */
    dynamoDBKeySchemaPrompts: function() {
        const attributeTypes = [
            {
                name: 'String',
                value: 'S'
            },
            {
                name: 'Number',
                value: 'N'
            },
            {
                name: 'Binary',
                value: 'B'
            }
        ];

        const attributeNameValidator = function(value) {
            try {
                return module.exports.isValidDynamoDBAttributeName(value);
            } catch (err) {
                return err.message;
            }
        };

        const rangeKeyWhen = function(answers) {
            return answers.keySchemaType === 'RANGE';
        };

        return [
            {
                type: 'list',
                name: 'keySchemaType',
                message: 'Key schema type',
                choices: [
                    {
                        name: 'Hash Key',
                        value: 'HASH'
                    },
                    {
                        name: 'Range Key',
                        value: 'RANGE'
                    }
                ],
                default: 0
            },
            {
                type: 'input',
                name: 'hashKeyName',
                message: 'Hash key attribute name',
                validate: attributeNameValidator
            },
            {
                type: 'list',
                name: 'hashKeyType',
                message: 'Hash key attribute type',
                choices: attributeTypes,
                default: 0
            },
            {
                type: 'input',
                name: 'rangeKeyName',
                message: 'Range key attribute name',
                when: rangeKeyWhen,
                validate: attributeNameValidator
            },
            {
                type: 'list',
                name: 'rangeKeyType',
                message: 'Hash key attribute type',
                choices: attributeTypes,
                when: rangeKeyWhen,
                default: 0
            }
        ];
    }
};
