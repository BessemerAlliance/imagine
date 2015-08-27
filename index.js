'use strict';

// dependencies
var async = require('async');
var AWS = require('aws-sdk');
var util = require('util');
var mfn = require('modify-filename');
var isImage = require('is-image');

// Enable ImageMagick integration
var gm = require('gm').subClass({
    imageMagick: true
});

// constants
var SIZES = {
    'sm': 100,
    'md': 320,
    'lg': 800,
    'or': 0
};

// get reference to S3 client
var s3 = new AWS.S3();

var returnErrors = true;
exports.ignoreErrors = function() {
    returnErrors = false;
};

var transform = exports.transform = function(params, data, writeFn, done) {
    // clone the params
    var putParams = {
        Bucket: params.Bucket.replace(/_/g, '-') + '-processed'
    };

    async.forEachOfSeries(SIZES, function sizer(maxSize, sizeKey, sizerCb) {
        putParams.Key = (sizeKey === 'or') ? params.Key : mfn(params.Key, function(name, ext) {
            return name + '_' + sizeKey + ext;
        });

        gm(data)
            .autoOrient()
            .size(function(err, size) {
                if (err) return sizerCb(returnErrors ? err : null);
                // Infer the scaling factor to avoid stretching the image unnaturally
                var scalingFactor = maxSize > 0 ? Math.min(
                    maxSize / size.width,
                    maxSize / size.height
                ) : 1;
                if (scalingFactor < 1) {
                    var width = scalingFactor * size.width;
                    var height = scalingFactor * size.height;
                    // Transform the image buffer in memory
                    this.resize(width, height);
                }

                this.toBuffer(function(err, buffer) {
                    if (err) return sizerCb(returnErrors ? err : null);

                    // Stream the transformed image to the "-processed" S3 bucket
                    putParams.Body = buffer;
                    writeFn(putParams, sizerCb);
                });
            });
    }, done);
};

var s3Intf = exports.s3Intf = function(params, done) {
    var msg = '';

    if (!isImage(params.Key)) {
        msg = 'skipping non-image file ' + params.Key;
        return done(null, msg);
    }

    var alreadyDone = Object.keys(SIZES).reduce(function(r, code) {
        return r || params.Key.indexOf('_' + code) > -1;
    }, false);
    if (alreadyDone) {
        msg = 'skipping already done ' + params.Key;
        return done(null, msg);
    }

    s3.getObject(params, function(err, response) {
        if (err) return done(err);
        params.ContentType = response.ContentType;
        transform(params, response.Body, function(params, cb) {
            s3.putObject(params, cb);
        }, done);
    });
};

exports.handler = function(event, context) {
    // Read options from the event
    console.log('Reading options from event:\n', util.inspect(event, {
        depth: 5
    }));

    // Object key may have spaces or unicode non-ASCII characters
    var params = {
        Bucket: event.Records[0].s3.bucket.name,
        Key: decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '))
    };

    s3Intf(params, function(err, msg) {
        if (err) {
            console.error(
                'Unable to process ' + params.Bucket + '/' + params.Key +
                ' due to an error: ' + err
            );
            return context.fail(err);
        }
        if (msg) console.log(msg);

        console.log('Successfully processed ' + params.Bucket + '/' + params.Key);
        return context.succeed();
    });
};
