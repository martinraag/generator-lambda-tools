'use strict';

const helpers = require('yeoman-test');
const assert = require('yeoman-assert');
const path = require('path');
const exists = require('is-there');
const fs = require('fs');

describe('@testlio/lambda-tools:app', function() {
    before(function(done) {
        this.prompts = {
            serviceName: 'name',
            serviceDescription: 'description',
            authorName: 'author',
            authorEmail: 'test@test.com'
        };

        helpers.run(path.join(__dirname, '../generators/app'))
            .withPrompts(this.prompts)
            .on('end', done);
    });

    it('generates api.json file', function() {
        assert.file('api.json');

        // Assert that the contents is correct
        const actual = JSON.parse(fs.readFileSync('api.json'));

        assert.equal(actual.info.title, this.prompts.serviceName);
        assert.equal(actual.info.description, this.prompts.serviceDescription);
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

    it('generates lambdas directory', function() {
        assert(exists('lambdas'));
    });
});
