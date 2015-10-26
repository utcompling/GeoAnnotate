#!/usr/bin/env node

"use strict"

var fs = require('fs')
var Parse = require('parse').Parse
 
Parse.initialize("Dxi3BvGT3mHiDC7B1YjeEuiUQKtWIeQNofT5FIIx", "QG352rxcZvLrYeV4jOCsIZvM8mIeQyhvHzDNINAb")
var NESpans= Parse.Object.extend("NESpans")

var args = process.argv.slice(2)
console.log(args)

function failure(op, error) {
  console.log("Failure " + op + " " + error.message + " (" + error.code + ")")
}

function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
}

function uploadVolume(file, aftercb) {
  console.log("Reading " + file)
  var vol = file.split('/').slice(-1)[0].split('.')[0].replace(/[^0-9]+/, '').replace(/[^0-9]+/,'').replace(/^0*/, '')
  console.log(vol)
  //var vol = file.replace(/^0*(.*?)\.txt\.joined.nespans$/, '$1')
  console.log("Writing volume " + vol)
  //var desc = fs.readFileSync(file + '.desc', 'utf8')
  var users = ["Max Cadwalder"]
  var text = fs.readFileSync(file, 'utf8')
  var base64 = Buffer(text).toString('base64')
  
  for (var i=0;i<users.length;i++) {
    (function(user){
      var fileobj = new Parse.File("NESpans-"+user +"-"+ vol _ ".txt", { base64: base64 })
      fileobj.save().then(function() {
        var nesObject = new NESpans()
        return nesObject.save({"vol":vol, "spans":fileobj, "user":user})
      }, function(error) {
        failure("saving file", error)
      }).then(function() {
        aftercb()
      }, function(error) {
        failure("creating volume object", error)
      })
    })(users[i])
  }
}

function uploadVolumeSeries(items) {
  if (items.length > 0) {
    for (var i=0;i<items.length;i++){
      var item = items[i]
      console.log(items[i])
      uploadVolume(item, function() {
        sleep(2000);
      })
    }
  }
}

uploadVolumeSeries(args)

