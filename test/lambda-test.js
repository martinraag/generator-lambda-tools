'use strict';

const helpers = require('yeoman-test');
const assert = require('yeoman-assert');
const path = require('path');
const fs = require('fs');

describe('@testlio/lambda-tools:lambda', function() {
    describe('Without event.json', function() {
        before(function(done) {
            this.prompts = {
                lambdaName: 'test-function',
                createLambdaEvent: false
            };

            helpers.run(path.join(__dirname, '../generators/lambda'))
                .withPrompts(this.prompts)
                .on('end', done);
        });

        it('creates index.js', function() {
            const lambdaPath = 'lambdas/' + this.prompts.lambdaName + '/index.js';
            assert.file(lambdaPath);

            // Make sure the contents is accurate
            const comparison = fs.readFileSync(path.join(__dirname, '../generators/lambda/templates/index.js'), 'utf8');
            assert.fileContent(lambdaPath, comparison);
        });

        it('doesn\'t create event.json', function() {
            const eventPath = 'lambdas/' + this.prompts.lambdaName + '/event.json';
            assert.noFile(eventPath);
        });
    });

    describe('With event.json', function() {
        before(function(done) {
            this.prompts = {
                lambdaName: 'test-function',
                createLambdaEvent: true
            };

            helpers.run(path.join(__dirname, '../generators/lambda'))
                .withPrompts(this.prompts)
                .on('end', done);
        });

        it('creates index.js', function() {
            const lambdaPath = 'lambdas/' + this.prompts.lambdaName + '/index.js';
            assert.file(lambdaPath);

            // Make sure the contents is accurate
            const comparison = fs.readFileSync(path.join(__dirname, '../generators/lambda/templates/index.js'), 'utf8');
            assert.fileContent(lambdaPath, comparison);
        });

        it('creates event.json', function() {
            const eventPath = 'lambdas/' + this.prompts.lambdaName + '/event.json';
            assert.file(eventPath);

            // Make sure the contents is accurate
            const comparison = fs.readFileSync(path.join(__dirname, '../generators/lambda/templates/event.json'), 'utf8');
            assert.fileContent(eventPath, comparison);
        });
    });
});
