'use strict';

// dependencies
var async = require('async');
var AWS = require('aws-sdk');
var util = require('util');
var mfn = require('modify-filename');

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
var FILETYPES = ['png', 'jpg', 'gif', 'tiff'];

// get reference to S3 client
var s3 = new AWS.S3();

var transform = exports.transform = function(params, data, writeFn, done) {
    var baseKey = params.Key;
    async.forEachOfSeries(SIZES, function sizer(maxSize, sizeKey, sizerCb) {
        gm(data)
            .autoOrient()
            .size(function(err, size) {
                if (err) return sizerCb(err);
                if (maxSize > 0) {
                    // Infer the scaling factor to avoid stretching the image unnaturally
                    var scalingFactor = Math.min(
                        maxSize / size.width,
                        maxSize / size.height
                    );
                    var width = scalingFactor * size.width;
                    var height = scalingFactor * size.height;
                    // Transform the image buffer in memory
                    this.resize(width, height);
                }
            })
            .toBuffer(function(err, buffer) {
                if (err) return sizerCb(err);

                params.Key = (sizeKey === 'or') ? baseKey : mfn(baseKey, function(name, ext) {
                    return name + '_' + sizeKey + ext;
                });
                params.Body = buffer;

                // Stream the transformed image to the same S3 bucket
                writeFn(params, sizerCb);
            });
    }, done);
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

    // Infer the image type
    var typeMatch = params.Key.match(/\.([^.]*)$/);
    if (!typeMatch) {
        console.error('unable to infer image type for key ' + params.Key);
        return context.fail();
    }

    var imageType = typeMatch[1];
    if (!imageType || FILETYPES.indexOf(imageType) < 0) {
        console.log('skipping non-image ' + params.Key);
        return context.done();
    }

    s3.getObject(params, function(err, response) {
        if (err) return context.fail(err);
        params.ContentType = response.ContentType;

        transform(params, response.Body, s3.putObject, function(err) {
            if (err) {
                console.error(
                    'Unable to resize ' + params.Bucket + '/' + params.Key +
                    ' due to an error: ' + err
                );
                return context.fail(err);
            }

            console.log('Successfully resized ' + params.Bucket + '/' + params.Key);
            return context.succeed();
        });
    });
};
