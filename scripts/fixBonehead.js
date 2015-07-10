'use strict';

var async = require('async');
var AWS = require('aws-sdk');

var nconf = require('@voyant/config');

var s3 = new AWS.S3({
    accessKeyId: nconf.get('aws_key'),
    secretAccessKey: nconf.get('aws_secret'),
    region: 'us-east-1'
});

var myArgs = process.argv.slice(2);

function run(done) {
    var tester = 0;
    async.doWhilst(function(cb) {
        s3.listObjects({
            Bucket: nconf.get('aws_bucketName')
        }, function(err, data) {
            if (err) return cb(err);
            async.filter(data.Contents,
                function(content, cb) {
                    // '551ad73f8fb141ad31000000_sm_'
                    cb(content.Key.indexOf(myArgs[0]) > -1);
                },
                function(results) {
                    tester = results.length;
                    if (!tester) return cb();
                    s3.deleteObjects({
                        Bucket: nconf.get('aws_bucketName'),
                        Delete: {
                            Objects: results.map(function(result) {
                                return {
                                    Key: result.Key
                                };
                            })
                        }
                    }, function(err, data) {
                        if (err) console.log(err, err.stack); // an error occurred
                        else console.log(data.Deleted.length); // successful response
                        cb(err);
                    });
                }
            );
        });
    }, function test() {
        return tester > 0;
    }, done);
}

run(function(err) {
    if (!err) {
        console.log('Bonehead fixed.');
    } else {
        console.log('Unable to initialize data');
        console.log(err, err.stack);
    }
    var returnCode = err ? -1 : 0;
    process.exit(returnCode);
});
