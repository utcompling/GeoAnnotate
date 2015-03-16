"use strict"

var annotUser = "Default"

function getSelectionRange() {
    return rangy.getSelection().getRangeAt(0)
}

// Return true if the range overlaps an annotation
function overlapsAnnotation(range, exactOK, annotateClass) {
    function containerIsAnnotationChild(container) {
        return container.nodeType === 3 &&
            container.parentNode.className === annotateClass
    }
    // If the range exactly covers a single text node and covers
    // the entire text node, then we are OK and not partially
    // overlapping.
    if (exactOK && range.startContainer === range.endContainer &&
        range.startContainer.nodeType === 3 &&
        range.startOffset === 0 &&
        range.endOffset === range.startContainer.length)
        return false
    // Otherwise, if the start or end is in an annotation text node,
    // we're overlapping.
    return (containerIsAnnotationChild(range.startContainer) ||
        containerIsAnnotationChild(range.endContainer))
}

// Return the nodes contained within the range.
// NOTE: Always check overlapsAnnotation() first.
// NOTE: Currently, this returns an empty array if we are
// entirely within a single annotation but not exactly on it.
function getRangeNodes(range, annotateClasses) {
    if (range.startContainer === range.endContainer &&
        range.startContainer.nodeType === 3 &&
        annotateClasses.indexOf(range.startContainer.parentNode.className) > -1)
        return [range.startContainer]
    return range.getNodes(false, function(node) {
      return (annotateClasses.indexOf(node.className) > -1)
    })
}

function makeRange(node) {
    var range = rangy.createRange()
    range.selectNode(node)
    return range
}

function getTextNode() {
    return document.getElementById('col2text')
}

// Return an array of annotations as character offsets, where each annotation
// is an object containing 'start', 'end' and 'node' properties
function getAnnotations(annotateClass) {
    var nodes = getRangeNodes(makeRange(document.body), [annotateClass])
    var textNode = getTextNode()
    //debugger;
    var ne_annotations = nodes.map(function(node) {
        var range = makeRange(node).toCharacterRange(textNode)
        return {start:range.start, end:range.end, node:node}
    })
    return ne_annotations
}

function addAnnotation(clazz, applier) {
    var selectionRange = getSelectionRange()
    if (selectionRange.startOffset != selectionRange.endOffset) {
        if (overlapsAnnotation(selectionRange, false, clazz))
            alert("Selection already contains part of an annotation")
        else {
            var nodes = getRangeNodes(selectionRange, [clazz])
            if (nodes.length > 0)
                alert("Selection already contains an annotation")
            else {
                applier.applyToSelection()
                articleChanges += 1
                console.log("Added a " + clazz)
            }
        }
    }
}

// Function that returns a callback function meant to be called upon
// successful save in a Parse operation. SUCCESSCB is a callback passed
// in by the user to be executed by the returned callback, which also logs
// a save message.
function savesuccess(successcb) {
    return function(obj) {
        console.log("Saved volume " + selvol + " for user " + annotUser)
        successcb()
    }
}

// Function that returns a callback function meant to be called as a failure
// callback from a Parse operation. The OPERATION argument, if given,
// specifies the operation during which the failure occurred and will appear
// in the message.
function savefailure(operation) {
    return function(error) {
        window.alert("Failure saving volume " + selvol + " for user " + annotUser +
                     (operation ? " during " + operation : "") + ": " + error.message +
                     " (" + error.code + ")")
    }
}

function httpGet(theUrl, callback)
{
    var xmlhttp=new XMLHttpRequest();
    
    xmlhttp.onreadystatechange=function()
    {
        if (xmlhttp.readyState==4 && xmlhttp.status==200)
        {
            callback(xmlhttp.responseText);
        }
    }
    xmlhttp.open("GET", theUrl, false);
    xmlhttp.send();    
}

function loadVolumeText(vol, spansObject) {
    selvol = vol
    var query = new Parse.Query(VolTextObject)
    query.equalTo("vol", vol)
    query.find().then(function(results) {
        //console.log("Successfully " + results[0].get["text"))
        httpGet(results[0].get("text").url(), function(text){
            $("#col2text").html(text);
            var q2 = new Parse.Query(spansObject)
            q2.equalTo("user", annotUser)
            q2.equalTo("vol", vol)
            q2.find().then(function(results2) {
                if (results2.length > 0) {
                    // loadAnnotations(results)
                    // loadAnnotationsXML(results)
                    loadVolumeAnnotations(results2)
                }
            });
        })
        //debugger;
        //return Parse.Cloud.httpRequest({ url: results[0].get("text").url() })
    })
}

function getVolTableRows(table){
    var query = new Parse.Query(VolTextObject)
    query.exists("vol")
    query.find().then(function(results) {
        //console.log("Successfully " + results[0].get["text"))
        //$("#col2text").html(results[0].get("text"))
        for (var i = 0; i < results.length; i++) {
            var vol = results[i].get("vol")
            var descrip = results[i].get("description")
            table.row.add([vol, descrip]).draw();
        }
    })
}

// Set 4-space indentation for vi
// vi:sw=4
