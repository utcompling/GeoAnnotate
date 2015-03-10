"use strict";

var applier;
var unapplier;
var VolObject;
var VolTextObject;
var VolSpansObject;
var SerialArtObject;
var ArtObject;
var Art2Object;

var selvol = "0";
var user = "Default";
var annotateClass = "geoarticle";
var articleChanges = [];

function getSelectionRange() {
    return rangy.getSelection().getRangeAt(0)
}

// Return true if the range overlaps an annotation
function overlapsAnnotation(range, exactOK) {
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
function getRangeNodes(range) {
    if (range.startContainer === range.endContainer &&
        range.startContainer.className === annotateClass)
        return [range.startContainer]
    return range.getNodes(false, function(node) {
      return node.className === annotateClass
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
function getAnnotations() {
    var nodes = getRangeNodes(makeRange(document.body))
    var textNode = getTextNode()
    var annotations = nodes.map(function(node) {
        var range = makeRange(node).toCharacterRange(textNode)
        return {start:range.start, end:range.end, node:node}
    })
    return annotations
}
//
// Remove any existing annotations and clear the article-changes list
function removeAnnotations() {
    unapplier.undoToRange(makeRange(document.body))
    articleChanges = []
}

// Function that returns a callback function meant to be called upon successful save in
// a Parse operation. SUCCESSCB is a callback passed in by the user to be executed
// by the returned callback, which also logs a save message.
function savesuccess(successcb) {
    return function(obj) {
        console.log("Saved volume " + selvol + " for user " + user)
        successcb()
    }
}

// Function that returns a callback function meant to be called as a failure callback
// from a Parse operation. The OPERATION argument, if given, specifies the operation
// during which the failure occurred and will appear in the message.
function savefailure(operation) {
    return function(error) {
        window.alert("Failure saving volume " + selvol + " for user " + user +
                     (operation ? " during " + operation : "") + ": " + error.message +
                     " (" + error.code + ")")
    }
}

/*

// Save annotations as a big HTML string. SUCCESSCB is a callback to execute upon
// successful saving.
function saveAnnotationsXML(successcb) {
    var textNode = getTextNode()
    var clone = $(textNode).clone()
    // Remove onclick handlers
    clone.find('.' + annotateClass).removeAttr('onclick')
    var html = clone.html()
    var query = new Parse.Query(Art3Object)
    query.equalTo("user", user)
    query.equalTo("vol", selvol)
    query.find().then(function(existing) {
        if (existing.length > 0) {
            existing[0].set("html", html)
            return existing[0].save()
        } else {
            var artObject = new Art3Object()
            return artObject.save({"user":user, "vol":selvol, "html":html})
        }
    }, savefailure("finding existing entry")
    ).then(savesuccess(successcb),
        savefailure("saving new or updating existing entry"))
}
*/

function loadAnnotations(results) {
    removeAnnotations()
    var textNode = getTextNode().childNodes[0]
    var spans = results.map(function(result) {
        var span = result.get("span")
        var split_span = span.split("-")
        var start = split_span[0]
        var end = split_span[1]
        return {start: start, end: end}
    })
    spans.sort(function(a, b) { return b.start - a.start })
    for (var a = 0; a < spans.length; a++) {
        var span = spans[a]
        var range = rangy.createRange()
        range.setStartAndEnd(textNode, span.start, span.end)
        applier.applyToRange(range)
    }
}

// Save annotations "directly" as a set of separate entries, one per span.
// This saves all spans each time. SUCCESSCB is a callback to execute upon successful
// saving.
function saveAnnotationsDirectly(successcb) {
    var annotations = getAnnotations()
    window.alert("Saving This Many Annotations: " + annotations.length)
    var parseAnnotations = annotations.map(function(annotation) {
        var artObject = new Art2Object()
        artObject.set("user", user)
        artObject.set("vol", selvol)
        artObject.set("span", annotation.start + "-" + annotation.end)
        return artObject
    })
    var query = new Parse.Query(Art2Object)
    query.find().then(function(existingobjs) {
        Parse.Object.saveAll(parseAnnotations, {
            success: function(newobjs) {
                console.log("Saved " + newobjs.length + " new objects")
                Parse.Object.destroyAll(existingobjs).then(function(results) {
                    console.log("Destroyed " + existingobjs.length + " old objects")
                    savesuccess(successcb)(newobjs)
                }, savefailure("delete old objects"))
            },
            error: savefailure("save new objects")
        })
    }, savefailure("querying existing objects"))
}

// Save annotations according to the article changes, in a non-serialized format by
// updating the spans that were changed. SUCCESSCB is a callback to execute
// upon successful saving.
function saveAnnotationsByChangeSet(successcb) {
    var textNode = getTextNode()
    window.alert("Saving This Many Article Changes: " + articleChanges.length)
    // We have a whole series of changes to save and we save them one at a time.
    // When each one finishes, a callback triggers. We keep track of how many
    // successful saves we've had, and when it equals the total number of changes to
    // be saved, we've successfully saved everything, and we trigger the success
    // callback.
    var savedChanges = 0
    // FIXME! If an error occurs it should immediately abort further processing,
    // rather than continuing with trying to save further spans.
    // FIXME double! If an error occurs our saved database will be in an inconsistent
    // state, with some annotations saved and some not. This may lead to errors at
    // load time.
    // These FIXME's may not be so important because we don't use this, prefering
    // to serialize all spans in a single item.
    for(var a = 0; a < articleChanges.length; a++) {
        var change = articleChanges[a]
        var change_row = change.split("-")
        var change_user = change_row[0]
        var change_vol = change_row[1]
        var change_type = change_row[2]
        var change_spanstart = change_row[3]
        var change_spanend = change_row[4]
        var change_span = change_spanstart + "-" + change_spanend
        if (change_type == "add") {
            var artObject = new ArtObject()
            artObject.save({"user":change_user, "vol":change_vol,
                           "span":change_span}).then(function(results) {
                savedChanges++
                if (savedChanges == articleChanges.length) {
                    savesuccess(successcb)(results)
                }
            }, savefailure("add"))
        } else if (change_type == "remove") {
            var query = new Parse.Query(ArtObject)
            query.equalTo("user", change_user)
            query.equalTo("vol", change_vol)
            query.equalTo("span", change_span)
            query.find().then(function(results) {
                return Parse.Object.destroyAll(results)
            }, savefailure("delete")).then(function(results) {
                savedChanges++
                if (savedChanges == articleChanges.length) {
                    savesuccess(successcb)(results)
                }
            }, savefailure("delete"))
        }
    }
}

// Load annotations in a serialized format. RESULTS is the query results from
// Parse, queried on the user and volume. There should be only one entry for a given
// user and volume.
function loadAnnotationsSerialized(results) {
    removeAnnotations()
    var textNode = getTextNode().childNodes[0]
    var spansSerialized = results[0].get("spans").split(":")
    var spans = spansSerialized.map(function(span) {
        var split_span = span.split("$")
        var start = split_span[1]
        var end = split_span[2]
        return {start: start, end: end}
    })
    spans.sort(function(a, b) { return b.start - a.start })
    for (var i = 0; i < spans.length; i++) {
        var span = spans[i]
        var range = rangy.createRange()
        range.setStartAndEnd(textNode, span.start, span.end)
        applier.applyToRange(range)
    }
}

// Save annotations in a serialized format. SUCCESSCB is a callback to execute
// upon successful saving.
function saveAnnotationsSerialized(successcb) {
    // Fetch annotations
    var annotations = getAnnotations()
    window.alert("Saving This Many Annotations: " + annotations.length)
    // Convert to an array of serialized annotations in the form "START-END".
    var serialAnnotations = annotations.map(function(ann) {
        return ann.node.className + "$" + ann.start + "$" + ann.end
    })
    // Join to a single serialized string
    var serialString = serialAnnotations.join(":")
    // Save to Parse. First look for an existing entry for the user and volume.
    // If found, update it. Else create a new entry.
    var query = new Parse.Query(VolSpansObject)
    query.equalTo("user", user)
    query.equalTo("vol", selvol)
    query.first().then(function(existing) {
        if (existing) {
            existing.set("spans", serialString)
            return existing.save()
        } else {
            var artObject = new VolSpansObject()
            return artObject.save({"user":user, "vol":selvol, "spans":serialString})
        }
    }, savefailure("finding existing entry")
    ).then(savesuccess(successcb),
        savefailure("saving new or updating existing entry"))
}

// Called from HTML. Save annotations. If saved successfully, reset list of
// article changes.
function saveAnnotations() {
    function success() {
        articleChanges = []
    }
    if (user != "Default") {
        // saveAnnotationsByChangeSet(success)
        // saveAnnotationsDirectly(success)
        // saveAnnotationsXML(success)
        // saveSerializedSpans()
        saveAnnotationsSerialized(success)
    } else {
        window.alert("Please select a non-default Annotator Name prior prior to saving")
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

function loadVolumeText(vol) {
    selvol = vol
    var query = new Parse.Query(VolTextObject)
    query.equalTo("vol", vol)
    query.find().then(function(results) {
        //console.log("Successfully " + results[0].get["text"))
        httpGet(results[0].get("text").url(), function(text){
            $("#col2text").html(text);
            // var q2 = new Parse.Query(ArtObject)
            var q2 = new Parse.Query(VolSpansObject)
            q2.equalTo("user", user)
            q2.equalTo("vol", vol)
            q2.find().then(function(results2) {
                if (results2.length > 0) {
                    // loadAnnotations(results)
                    // loadAnnotationsXML(results)
                    loadAnnotationsSerialized(results2)
                }
            });
        })
        //debugger;
        //return Parse.Cloud.httpRequest({ url: results[0].get("text").url() })
    })
}

function loadVolume(vol) {
    selvol = vol
    var query = new Parse.Query(VolObject)
    query.equalTo("vol", vol)
    query.find().then(function(results) {
        //console.log("Successfully " + results[0].get["text"))
        $("#col2text").html(results[0].get("text"))
        // var q2 = new Parse.Query(ArtObject)
        var q2 = new Parse.Query(VolspansObject)
        q2.equalTo("user", user)
        q2.equalTo("vol", vol)
        return q2.find()
    }).then(function(results) {
        //console.log("Successfully " + results[0])
        if (results.length > 0) {
            // loadAnnotations(results)
            // loadAnnotationsXML(results)
            loadAnnotationsSerialized(results)
        }
    })
}

function closeDialog(node) {
    $(node).dialog("close")
}

function checkVol() {
    if (user != "Default") {
        var table = $('#art_table').DataTable()
        var ret = table.$('tr.selected')
        if (ret.length > 0) {
            var newvol = table.$('tr.selected').find('td:first').text();
            if (articleChanges.length > 0) {
                $("<div>Do you want to save the existing annotations?</div>").dialog({
                    resizable: false,
                    modal: true,
                    buttons: {
                        "Yes": function() {
                            saveAnnotations()
                            loadVolumeText(newvol)
                            closeDialog(this)
                        },
                        "No": function() {
                            loadVolumeText(newvol)
                            closeDialog(this)
                        },
                        "Cancel": function() {
                            console.log("Canceled")
                            window.alert("FIXME: We should set the visibly selected volume to the old one")
                            closeDialog(this)
                        }
                    }
                })
            } else {
                loadVolumeText(newvol)
            }
        }
    } else {
        window.alert("Please select a non-default Annotator name prior to loading a volume")
    }
}

function getTableRows(table){
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

document.onkeypress = function (e) {
    e = e || window.event;
    //check of 'a' was pressed
    if (e.keyCode == 97){
        //window.alert(e.keyCode)
        var sel = rangy.getSelection();
        addArticle()
    }
    //check if 'r' was pressed
    if (e.keyCode == 114){
        removeArticle()
    }
};

function nameChange(){
    var el = document.getElementById("selectUser");
    user = el.options[el.selectedIndex].innerHTML;
}

function addArticle() {
    var selectionRange = getSelectionRange()
    if (selectionRange.startOffset != selectionRange.endOffset){
        if (overlapsAnnotation(selectionRange, false))
            alert("Selection already contains part of an annotation")
        else {
            var nodes = getRangeNodes(selectionRange)
            if (nodes.length > 0)
                alert("Selection already contains an annotation")
            else {
                applier.applyToSelection()
                var artrange = getSelectionRange().toCharacterRange(getTextNode())
                var change = user + "-"+ selvol + "-add" + "-" + artrange.start + "-" + artrange.end
                articleChanges.push(change)
                console.log("Added " + change + " to article changes")
            }
        }
    }
}

function removeArticle() {
    var selectionRange = getSelectionRange()
    if (overlapsAnnotation(selectionRange, true))
        alert("Selection contains part of an annotation")
    else {
        var nodes = getRangeNodes(selectionRange)
        var textNode = getTextNode()
        for (var i = 0; i < nodes.length; i++) {
            var artrange = makeRange(nodes[i]).toCharacterRange(textNode)
            var change = user + "-"+ selvol + "-add" + "-" + artrange.start + "-" + artrange.end
            var index = articleChanges.indexOf(change)
            if (index != -1) {
                articleChanges.splice(index, 1)
                console.log("Removed " + change + " from article changes")
            } else {
                var change = user + "-"+ selvol + "-remove" + "-" + artrange.start + "-" + artrange.end
                articleChanges.push(change)
                console.log("Added " + change + " to article changes")
            }
        }
        unapplier.undoToSelection();
        //window.alert("Removed Article Annotation")
    }
}

function spanClick(element){
    //window.alert("Clicked inside article");
    var range = rangy.createRange();
    range.selectNodeContents(element);
    var sel = rangy.getSelection();
    sel.setSingleRange(range);
}

function init() {

    Parse.initialize("Dxi3BvGT3mHiDC7B1YjeEuiUQKtWIeQNofT5FIIx",
                     "QG352rxcZvLrYeV4jOCsIZvM8mIeQyhvHzDNINAb");

    VolTextObject = Parse.Object.extend("VolumeText");
    VolSpansObject = Parse.Object.extend("VolumeSpans");
    ArtObject = Parse.Object.extend("Article");
    Art2Object = Parse.Object.extend("Article2");

    rangy.init();

    // We have a separate applier and unapplier because the former needs to
    // not normalize, which would merge two adjacent articles, but the
    // latter does need to normalize, so that after removing the span, the
    // text node left behind gets merged with adjacent nodes (otherwise,
    // adding back an article would put a separate span around each text
    // node).
    applier = rangy.createClassApplier(annotateClass, {
        elementAttributes: {onclick:"spanClick(this)"},
        normalize: false
    });
    unapplier = rangy.createClassApplier(annotateClass, {
        elementAttributes: {onclick:"spanClick(this)"},
        normalize: true
    });

    var table = $('#art_table').DataTable()
    var rows = getTableRows(table);
}

// vi:sw=4
