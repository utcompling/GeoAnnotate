#!/usr/bin/env node

"use strict"

var fs = require('fs')
var Parse = require('parse').Parse
 
Parse.initialize("Dxi3BvGT3mHiDC7B1YjeEuiUQKtWIeQNofT5FIIx", "QG352rxcZvLrYeV4jOCsIZvM8mIeQyhvHzDNINAb")
var DocGeoSpansObject = Parse.Object.extend("DocGeoSpans")

var args = process.argv.slice(2)

function failure(op, error) {
  console.log("Failure " + op + " " + error.message + " (" + error.code + ")")
}

function uploadSpans(file, aftercb) {
  console.log("Reading " + file)
  var vol = file.replace(/^(.*?)-(.*?).txt$/, '$2')
  var user = file.replace(/^(.*?)-(.*?).txt$/, '$1')
  var text = fs.readFileSync(file, 'utf8')
  var base64 = Buffer(text).toString('base64')
  var fileobj = new Parse.File(file, { base64: base64 })
  fileobj.save().then(function() {
    var spansObject = new DocGeoSpansObject()
    return spansObject.save({"vol":vol, "spans":fileobj, "user":user})
  }, function(error) {
    failure("saving file", error)
  }).then(function() {
    aftercb()
  }, function(error) {
    failure("creating spans object", error)
  })
}

function uploadSpansSeries(items) {
  if (items.length > 0) {
    var item = items[0]
    uploadSpans(item, function() {
      uploadSpansSeries(items.slice(1))
    })
  }
}
uploadSpansSeries(args)

