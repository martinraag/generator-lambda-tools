'use strict';

const helpers = require('yeoman-test');
const assert = require('yeoman-assert');
const path = require('path');
const fs = require('fs-extra');
const ejs = require('ejs');
const _ = require('lodash');

//
//  Helpers
//

function runGenerator(prompts, done) {
    const deps = [
        [helpers.createDummyGenerator(), 'lambda-tools:lambda']
    ];

    helpers.run(path.join(__dirname, '../generators/periodic-lambda'))
        .inTmpDir(function(dir) {
            // Make sure there's a stub api.json file in place
            fs.copySync(path.join(__dirname, '../generators/app/templates'), dir, {
                clobber: true
            });
        })
        .withPrompts(prompts)
        .withOptions({
            force: true
        })
        .withGenerators(deps)
        .on('end', done);
}

//
//  Tests
//
describe('lambda-tools:periodic-lambda', function() {
    describe('With simple values', function() {
        before(function(done) {
            this.prompts = {
                name: 'periodic-event-handler',
                event: true,
                scheduleExpression: 'cron(* 0/15 * * * *)',
                ruleName: 'periodic-event',
                logicalID: 'PeriodicEvent',
                description: 'Periodic event to test out the generator'
            };

            this.templateValues = {
                resource: {
                    logicalID: this.prompts.logicalID,
                    description: this.prompts.description,
                    name: this.prompts.ruleName,
                    scheduleExpression: this.prompts.scheduleExpression,
                    state: 'ENABLED'
                },
                lambda: {
                    logicalID: _.upperFirst(_.camelCase(this.prompts.name))
                },
                target: {
                    input: '',
                    inputPath: '',
                    id: '1'
                },
                permission: {
                    logicalID: `PeriodicEventPeriodicEventHandlerPermission`
                }
            };

            runGenerator(this.prompts, done);
        });

        it('creates correct entries in cf.json', function() {
            assert.file('cf.json');

            // Validate the contents
            const contents = JSON.parse(fs.readFileSync('cf.json')).Resources;
            const templatePath = path.join(__dirname, '../generators/periodic-lambda/templates/cf.json');
            const comparison = JSON.parse(ejs.render(fs.readFileSync(templatePath, 'utf8'), this.templateValues));

            assert.deepStrictEqual(contents, comparison);
        });

        it('creates correct Lambda function files', function() {
            assert.file('lambdas/periodic-event-handler/index.js');
            assert.file('lambdas/periodic-event-handler/event.json');
        });
    });

    describe('With complex values', function() {
        before(function(done) {
            this.prompts = {
                name: 'periodic-event-handler',
                event: true,
                scheduleExpression: 'cron(* 0/15 * * * *)',
                ruleName: 'periodic-event',
                logicalID: 'PeriodicEvent',
                description: 'Periodic event to test out the generator',
                input: '{ "foo": "bar" }',
                inputPath: '$.foo',
                ruleStateEnabled: false
            };

            this.templateValues = {
                resource: {
                    logicalID: this.prompts.logicalID,
                    description: this.prompts.description,
                    name: this.prompts.ruleName,
                    scheduleExpression: this.prompts.scheduleExpression,
                    state: 'DISABLED'
                },
                lambda: {
                    logicalID: _.upperFirst(_.camelCase(this.prompts.name))
                },
                target: {
                    input: '{ "foo": "bar" }',
                    inputPath: '$.foo',
                    id: '1'
                },
                permission: {
                    logicalID: `PeriodicEventPeriodicEventHandlerPermission`
                }
            };

            runGenerator(this.prompts, done);
        });

        it('creates correct entries in cf.json', function() {
            assert.file('cf.json');

            // Validate the contents
            const contents = JSON.parse(fs.readFileSync('cf.json')).Resources;
            const templatePath = path.join(__dirname, '../generators/periodic-lambda/templates/cf.json');
            const comparison = JSON.parse(ejs.render(fs.readFileSync(templatePath, 'utf8'), this.templateValues));

            assert.deepStrictEqual(contents, comparison);
        });

        it('creates correct Lambda function files', function() {
            assert.file('lambdas/periodic-event-handler/index.js');
            assert.file('lambdas/periodic-event-handler/event.json');
        });
    });
});
