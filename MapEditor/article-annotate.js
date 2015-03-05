"use strict";

var applier;
var unapplier;
var VolObject;
// var SerialArtObject;
var ArtObject;
var Art2Object;
var Art3Object;

var selvol = "0";
var user = "Default";
var annotateClass = "geoarticle";
var articleChanges = [];

function getSelectionRange() {
    return rangy.getSelection().getRangeAt(0)
}

// Return true if the range overlaps and annotation
function overlapsAnnotation(range) {
    function containerIsAnnotationChild(container) {
        return container.nodeType === 3 &&
            container.parentNode.className === annotateClass
    }
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
    return document.getElementById('col2text');
}

function loadAnnotations(results){
    applier.undoToRange(makeRange(document.body))
    articleChanges = []
    var textNode = getTextNode().childNodes[0]
    var spans = []
    for(var a = 0; a < results.length; a++) {
        var span = results[a].get("span");
        var split_span = span.split("-");
        var start = split_span[0];
        var end = split_span[1];
        spans.push({start: start, end: end})
    }
    spans.sort(function(a, b) { return b.start - a.start })
    for (var a = 0; a < spans.length; a++) {
        var span = spans[a]
        var range = rangy.createRange()
        range.setStartAndEnd(textNode, span.start, span.end)
        applier.applyToRange(range)
    }
}

function loadAnnotationsXML(results) {
    applier.undoToRange(makeRange(document.body))
    articleChanges = []
    $(getTextNode()).html(results[0].get("html"))
    $(getTextNode()).find('.' + annotateClass).attr("onclick", "spanClick(this)")
}

function savesuccess(obj) {
    console.log("Saved volume " + selvol + " for user " + user)
}

function savefailure(error) {
    window.alert("Failure saving volume " + selvol + " for user " + user +
                 ": " + error.message + " (" + error.code + ")")
}

function saveAnnotationsXML() {
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
    }, savefailure).then(savesuccess, savefailure)
}

function saveAnnotationsDirectly() {
    var nodes = getRangeNodes(makeRange(document.body))
    var parseAnnotations = []
    window.alert("Saving This Many Annotations: " + nodes.length)
    var nodes = getRangeNodes(getSelectionRange())
    var textNode = getTextNode()
    for (var i = 0; i < nodes.length; i++) {
        var artrange = makeRange(nodes[i]).toCharacterRange(textNode)
        var artObject = new Art2Object()
        artObject.set("user", user)
        artObject.set("vol", selvol)
        artObject.set("span", artrange.start + "-" + artrange.end)
        parseAnnotations.push(artObject)
    }
    var query = new Parse.Query(Art2Object)
    query.find().then(function(existingobjs) {
        Parse.Object.saveAll(parseAnnotations, {
            success: function(newobjs) {
                console.log("Saved " + newobjs.length + " new objects")
                Parse.Object.destroyAll(existingobjs).then(function(success) {
                    console.log("Destroyed " + existingobjs.length + " old objects")
                }, function(error) {
                    console.error("Oops! Something went wrong in delete old objects: " +
                                  error.message + " (" + error.code + ")")
                })
            },
            error: function(error) {
                console.error("Oops! Something went wrong in save new objects: " +
                              error.message + " (" + error.code + ")")
            }
        })
    }, function(error) {
        console.error("Oops! Something went wrong in querying existing objects: " +
                      error.message + " (" + error.code + ")")
    })
}

function saveAnnotationsByChangeSet() {
    var textNode = getTextNode();
    window.alert("Saving This Many Article Changes: " + articleChanges.length);
    for(var a = 0; a < articleChanges.length; a++ ){
        var change = articleChanges[a]
        var change_row = change.split("-")
        var change_user = change_row[0]
        var change_vol = change_row[1]
        var change_type = change_row[2]
        var change_spanstart = change_row[3]
        var change_spanend = change_row[4]
        var change_span = change_spanstart + "-" + change_spanend
        if (change_type == "add") {
            var artObject = new ArtObject();
            artObject.save({"user":change_user, "vol":change_vol, "span":change_span});
        } else if (change_type == "remove") {
            var query = new Parse.Query(ArtObject);
            query.equalTo("user", change_user);
            query.equalTo("vol", change_vol);
            query.equalTo("span", change_span);
            query.find({
                success: function(results) {
                    Parse.Object.destroyAll(results).then(function(success) {
                    // All the objects were deleted
                    }, function(error) {
                      console.error("Oops! Something went wrong in delete: " + error.message + " (" + error.code + ")");
                    });
                }
            });
        }
    }
}

function saveAnnotations() {
    if (user != "Default") {
        saveAnnotationsByChangeSet()
        // saveAnnotationsDirectly()
        saveAnnotationsXML()
    } else {
        window.alert("Please select a non-default Annotator Name prior prior to saving")
    }
    articleChanges = [];
}

function loadVolume(vol) {
    selvol = vol
    var query = new Parse.Query(VolObject)
    query.equalTo("vol", vol)
    query.find().then(function(results) {
        //console.log("Successfully " + results[0].get["text"))
        $("#col2text").html(results[0].get("text"))
        // var q2 = new Parse.Query(ArtObject)
        var q2 = new Parse.Query(Art3Object)
        q2.equalTo("user", user)
        q2.equalTo("vol", vol)
        return q2.find()
    }).then(function(results) {
        //console.log("Successfully " + results[0])
        if (results.length > 0) {
            // loadAnnotations(results)
            loadAnnotationsXML(results)
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
            var newvol = ret[0].cells[0].innerHTML
            if (articleChanges.length > 0) {
                $("<div>Do you want to save the existing annotations?</div>").dialog({
                    resizable: false,
                    modal: true,
                    buttons: {
                        "Yes": function() {
                            saveAnnotations()
                            loadVolume(newvol)
                            closeDialog(this)
                        },
                        "No": function() {
                            loadVolume(newvol)
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
                loadVolume(newvol)
            }
        }
    } else {
        window.alert("Please select a non-default Annotator name prior to loading a volume")
    }
}

function nameChange(){
    var el = document.getElementById("selectUser");
    user = el.options[el.selectedIndex].innerHTML;
}

function addArticle() {
    var selectionRange = getSelectionRange()
    if (overlapsAnnotation(selectionRange))
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

function removeArticle() {
    var selectionRange = getSelectionRange()
    if (overlapsAnnotation(selectionRange))
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

    VolObject = Parse.Object.extend("Text");
    // SerialArtObject = Parse.Object.extend("Volume");
    ArtObject = Parse.Object.extend("Article");
    Art2Object = Parse.Object.extend("Article2");
    Art3Object = Parse.Object.extend("Article3");

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
}

// vi:sw=4
