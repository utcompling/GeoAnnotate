#!/usr/bin/env node

"use strict"

var fs = require('fs')
var http = require('http')
var Parse = require('parse').Parse
 
Parse.initialize("Dxi3BvGT3mHiDC7B1YjeEuiUQKtWIeQNofT5FIIx", "QG352rxcZvLrYeV4jOCsIZvM8mIeQyhvHzDNINAb")
var VolTextObject = Parse.Object.extend("VolumeText")
var NESpansObject = Parse.Object.extend("NESpans")

var args = process.argv.slice(2)
var user = args[0]

function failure(op, error) {
  console.log("Failure " + op + " " + error.message + " (" + error.code + ")")
}

// From http://stackoverflow.com/questions/11944932/how-to-download-a-file-with-node-js
var download = function(url, dest, cb) {
  var file = fs.createWriteStream(dest)
  var request = http.get(url, function(response) {
    response.pipe(file)
    file.on('finish', function() {
      file.close(cb)  // close() is async, call cb after close completes.
    })
  }).on('error', function(err) { // Handle errors
    fs.unlink(dest) // Delete the file async. (But we don't check the result)
    failure("loading " + url, err)
  })
};

function loadSpanFile(item, cb) {
  var dest = item.user + "-" + item.vol + ".txt"
  console.log("Downloading " + item.spans + " into " + dest)
  download(item.spans, dest, cb)
}

function loadSpanFiles(items) {
  if (items.length > 0) {
    var item = items[0]
    loadSpanFile(item, function() {
      loadSpanFiles(items.slice(1))
    })
  }
}

function loadSpanInfo(aftercb, user_name) {
  var query = new Parse.Query(NESpansObject)
  query.equalTo("user", user_name);
  //query.limit(1000)
  query.find().then(function(results) {
    var items = results.map(function(result) {
      var item = {user: result.get("user"), vol: result.get("vol"),
        spans: result.get("spans").url()}
      console.log("Found entry: user=" + item.user + ", vol=" + item.vol +
                  ", spans=" + item.spans)
      return item
    })
    aftercb(items)
  }, function(error) {
    failure("loading span info", error)
  })
}


console.log(user)
loadSpanInfo(loadSpanFiles, user)
