'use strict';

const helpers = require('yeoman-test');
const assert = require('yeoman-assert');
const path = require('path');
const exists = require('is-there');
const fs = require('fs-extra');

describe('lambda-tools:app', function() {
    describe('With modern runtime', function() {
        before(function(done) {
            this.prompts = {
                serviceName: 'name',
                serviceDescription: 'description',
                serviceLicense: 'test-license',
                authorName: 'author',
                authorEmail: 'test@test.com',
                dependencies: []
            };

            helpers.run(path.join(__dirname, '../generators/app'))
                .inTmpDir(function(dir) {
                    // Make sure there's a stub cf.json file in place
                    fs.copySync(path.join(__dirname, 'templates/package.json'), path.join(dir, 'package.json'), {
                        clobber: true
                    });
                })
                .withPrompts(this.prompts)
                .on('end', done);
        });

        it('generates api.json file', function() {
            assert.file('api.json');

            // Assert that the contents is correct
            const actual = JSON.parse(fs.readFileSync('api.json'));

            assert.equal(actual.info.title, this.prompts.serviceName);
            assert.equal(actual.info.description, this.prompts.serviceDescription);
            assert.equal(actual.info.license.name, this.prompts.serviceLicense);
            assert.equal(actual.info.contact.name, this.prompts.authorName);
            assert.equal(actual.info.contact.email, this.prompts.authorEmail);
        });

        it('generates cf.json file', function() {
            assert.file('cf.json');

            // Assert that the contents is correct
            // (namely that the switched in values were correctly inserted)
            const actual = JSON.parse(fs.readFileSync('cf.json'));

            assert.equal(actual.Description, this.prompts.serviceDescription);
            assert.equal(actual.Parameters.aaProjectName.Default, this.prompts.serviceName);
            assert.equal(actual.Parameters.aaProjectName.AllowedValues[0], this.prompts.serviceName);
        });

        it('generates .lambda-tools-rc.json file', function() {
            assert.file('.lambda-tools-rc.json');

            // The contents should also be valid
            const actual = JSON.parse(fs.readFileSync('.lambda-tools-rc.json'));

            assert.equal(actual.project.name, this.prompts.serviceName);
            assert.equal(actual.aws.stage, 'dev');
            assert.equal(actual.aws.region, 'us-east-1');
            assert.equal(actual.lambda.runtime, 'nodejs4.3');
        });

        it('generates lambdas directory', function() {
            assert(exists('lambdas'));
        });
    });

    describe('With legacy runtime', function() {
        before(function(done) {
            this.prompts = {
                serviceName: 'name',
                serviceDescription: 'description',
                serviceLicense: 'test-license',
                authorName: 'author',
                authorEmail: 'test@test.com',
                dependencies: [],
                runtime: 'nodejs'
            };

            helpers.run(path.join(__dirname, '../generators/app'))
                .inTmpDir(function(dir) {
                    // Make sure there's a stub cf.json file in place
                    fs.copySync(path.join(__dirname, 'templates/package.json'), path.join(dir, 'package.json'), {
                        clobber: true
                    });
                })
                .withPrompts(this.prompts)
                .on('end', done);
        });

        it('generates api.json file', function() {
            assert.file('api.json');

            // Assert that the contents is correct
            const actual = JSON.parse(fs.readFileSync('api.json'));

            assert.equal(actual.info.title, this.prompts.serviceName);
            assert.equal(actual.info.description, this.prompts.serviceDescription);
            assert.equal(actual.info.license.name, this.prompts.serviceLicense);
            assert.equal(actual.info.contact.name, this.prompts.authorName);
            assert.equal(actual.info.contact.email, this.prompts.authorEmail);
        });

        it('generates cf.json file', function() {
            assert.file('cf.json');

            // Assert that the contents is correct
            // (namely that the switched in values were correctly inserted)
            const actual = JSON.parse(fs.readFileSync('cf.json'));

            assert.equal(actual.Description, this.prompts.serviceDescription);
            assert.equal(actual.Parameters.aaProjectName.Default, this.prompts.serviceName);
            assert.equal(actual.Parameters.aaProjectName.AllowedValues[0], this.prompts.serviceName);
        });

        it('generates .lambda-tools-rc.json file', function() {
            assert.file('.lambda-tools-rc.json');

            // The contents should also be valid
            const actual = JSON.parse(fs.readFileSync('.lambda-tools-rc.json'));

            assert.equal(actual.project.name, this.prompts.serviceName);
            assert.equal(actual.aws.stage, 'dev');
            assert.equal(actual.aws.region, 'us-east-1');
            assert.equal(actual.lambda.runtime, 'nodejs');
        });

        it('generates lambdas directory', function() {
            assert(exists('lambdas'));
        });
    });
});
