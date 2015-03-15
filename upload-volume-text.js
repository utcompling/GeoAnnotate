#!/usr/bin/env node

"use strict"

var fs = require('fs')
var Parse = require('parse').Parse
 
Parse.initialize("Dxi3BvGT3mHiDC7B1YjeEuiUQKtWIeQNofT5FIIx", "QG352rxcZvLrYeV4jOCsIZvM8mIeQyhvHzDNINAb")
var VolTextObject = Parse.Object.extend("VolumeText")

var args = process.argv.slice(2)

function failure(op, error) {
  console.log("Failure " + op + " " + error.message + " (" + error.code + ")")
}

function uploadVolume(file, aftercb) {
  console.log("Reading " + file)
  var vol = file.replace(/^0*(.*?)\.txt\.joined$/, '$1')
  console.log("Writing volume " + vol)
  var desc = fs.readFileSync(file + '.desc', 'utf8')
  var text = fs.readFileSync(file, 'utf8')
  var base64 = Buffer(text).toString('base64')
  var fileobj = new Parse.File("volume" + file, { base64: base64 })
  fileobj.save().then(function() {
    var volObject = new VolTextObject()
    return volObject.save({"vol":vol, "text":fileobj, "description":desc})
  }, function(error) {
    failure("saving file", error)
  }).then(function() {
    aftercb()
  }, function(error) {
    failure("creating volume object", error)
  })
}

function uploadVolumeSeries(items) {
  if (items.length > 0) {
    var item = items[0]
    uploadVolume(item, function() {
      uploadVolumeSeries(items.slice(1))
    })
  }
}
uploadVolumeSeries(args)

