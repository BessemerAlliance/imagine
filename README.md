# imagine
Image scaling and rotation

Triggered by upload event of new image to S3

Utilizing [ImageMagick](https://www.npmjs.com/package/gm) for resizing and auto-orientation.

## Resizing

Four copies of each image are set at various sizes. Maximum sizes below for height or width. Keeps original ratio.
- small (`sm`) - 100px
- medium (`md`) - 320px
- large (`lg`) - 800px
- original - reorient only, not resized, no suffix


## AWS Lambda
Written for AWS Lambda, following the guide: http://docs.aws.amazon.com/lambda/latest/dg/walkthrough-s3-events-adminuser.html

[Code here](http://docs.aws.amazon.com/lambda/latest/dg/walkthrough-s3-events-adminuser-create-test-function-create-function.html)

## Testing

### Install ImageMagick

```
$ brew install imagemagick
```

### Mocha

```
$ npm test
```
