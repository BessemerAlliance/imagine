'use strict';

var handler = require('..');
var fs = require('fs');
var should = require('should');
var rimraf = require('rimraf');

var newdir = __dirname + '/new/';

function writer(params, done) {
    fs.writeFile(newdir + params.Key, params.Body, done);
}

describe('Sizer', function() {
    before(function(done) {
        this.params = {
            Key: 'link.png'
        };
        this.data = __dirname + '/' + this.params.Key;
        fs.mkdir(newdir, done);
    });

    it('should create 4 sizes of the same image', function(done) {
        handler.transform(this.params, this.data, writer, function(err) {
            should.exist(fs.existsSync(newdir + 'link_sm.png'));
            should.exist(fs.existsSync(newdir + 'link_md.png'));
            should.exist(fs.existsSync(newdir + 'link_lg.png'));
            should.exist(fs.existsSync(newdir + 'link.png'));
            done(err);
        });
    });

    after(function(done) {
        rimraf(newdir, done);
    });
});
