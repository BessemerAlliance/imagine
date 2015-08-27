'use strict';

var async = require('async');
var AWS = require('aws-sdk');

var nconf = require('@voyant/config');
var AWS = require('aws-sdk');
AWS.config = new AWS.Config({
    accessKeyId: nconf.get('aws_key'),
    secretAccessKey: nconf.get('aws_secret'),
    region: 'us-east-1'
});
var s3 = new AWS.S3();

var handler = require('..');
handler.ignoreErrors();

var myArgs = process.argv.slice(2);
var prefix = myArgs[0] || null;
var saver = myArgs[1] || null;

function run(done) {
    var tester = 0;
    async.doWhilst(function(cb) {
            s3.listObjects({
                Bucket: nconf.get('aws_bucketName'),
                Prefix: prefix,
                Marker: saver
            }, function(err, results) {
                if (err) return cb(err);

                tester = results.Contents.length;
                console.log('tester:', results.Contents.length);
                if (!tester) return cb();
                saver = results.Contents[tester - 1].Key;
                console.log('saver:', saver);

                async.each(results.Contents, function(data, cb1) {
                    //if (data.Size < 5 * 1024 * 1024) return cb1(); // only look at those over 5M
                    handler.s3Intf({
                        Bucket: nconf.get('aws_bucketName'),
                        Key: data.Key
                    }, function(err, msg) {
                        if (err) console.log(err, err.stack); // an error occurred}
                        else console.log(msg || data.Key); // successful response}
                        cb1(err);
                    });
                }, cb);
            });
        },
        function test() {
            return tester > 1;
        }, done);
}

run(function(err) {
    if (!err) {
        console.log('Created rotated and resized images for all existing.');
    } else {
        console.log('Unable to update images');
        console.log(err, err.stack);
    }
    var returnCode = err ? -1 : 0;
    process.exit(returnCode);
});
