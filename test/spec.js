'use strict';


var fs = require('fs');
var should = require('should');
var rimraf = require('rimraf');

process.env.NODE_ENV = 'test';
var nconf = require('@voyant/config');
var AWS = require('aws-sdk');
AWS.config = new AWS.Config({
    accessKeyId: nconf.get('aws_key'),
    secretAccessKey: nconf.get('aws_secret'),
    region: 'us-east-1'
});
var s3 = new AWS.S3();

var handler = require('..');

var newdir = __dirname + '/new/';

function writer(params, done) {
    fs.writeFile(newdir + params.Key, params.Body, done);
}

describe('Local', function() {
    before(function(done) {
        this.params = {
            Bucket: '',
            Key: 'link.png'
        };

        fs.mkdir(newdir, done);
    });

    it('should create 4 sizes of the same image', function(done) {
        var data = __dirname + '/' + this.params.Key;
        handler.transform(this.params, data, writer, function(err) {
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


describe('S3', function() {
    before(function(done) {
        this.timeout = 5000;
        s3.deleteObject({
            Bucket: nconf.get('aws_bucketName').replace(/_/g, '-') + '-processed',
            Key: 'testImage.jpg'
        }, function(err, data) {
            // don't care if there was an error
            done();
        });
    });

    beforeEach(function() {
        this.params = {
            Bucket: nconf.get('aws_bucketName')
        };
    });

    it('should access S3 and create the appropriate files', function(done) {
        this.params.Key = 'testImage.jpg';
        handler.s3Intf(this.params, function(err, msg) {
            should.not.exist(msg);
            done(err);
        });
    });

    it('should not create the same file twice', function(done) {
        this.params.Key = 'testImage_sm.jpg';
        handler.s3Intf(this.params, function(err, msg) {
            msg.should.eql('skipping already done testImage_sm.jpg');
            done(err);
        });
    });
});
