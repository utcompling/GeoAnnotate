"use strict";

var applier;
var unapplier;
var VolTextObject;
var VolSpansObject;

var selvol = "0";
var annotateClass = "geoarticle";
var annotationChanges = 0

// Remove any existing annotations and clear the article-changes list
function removeAnnotations() {
    unapplier.undoToRange(makeRange(document.body))
    annotationChanges = 0
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
    query.equalTo("user", annotUser)
    query.equalTo("vol", selvol)
    query.find().then(function(existing) {
        if (existing.length > 0) {
            existing[0].set("html", html)
            return existing[0].save()
        } else {
            var artObject = new Art3Object()
            return artObject.save({"user":annotUser, "vol":selvol, "html":html})
        }
    }, savefailure("finding existing entry")
    ).then(savesuccess(successcb),
        savefailure("saving new or updating existing entry"))
}
*/

// Load annotations in a serialized format. RESULTS is the query results from
// Parse, queried on the user and volume. There should be only one entry for
// a given user and volume.
function loadVolumeAnnotations(results) {
    var textNode = getTextNode().childNodes[0]
    var spansSerialized = results[0].get("spans").split("|")
    var spans = spansSerialized.map(function(span) {
        var split_span = span.split("$")
        var class_name = split_span[0]
        var start = split_span[1]
        var end = split_span[2]
        return {start: start, end: end, class_name: class_name}
    })
    spans.sort(function(a, b) { return b.start - a.start })
    for (var i = 0; i < spans.length; i++) {
        var span = spans[i]
        var range = rangy.createRange()
        range.setStartAndEnd(textNode, span.start, span.end)
        applier.applyToRange(range)
    }
}

// Save annotations in a serialized format.
function saveVolumeAnnotations() {
    // Fetch annotations
    var annotations = getAnnotations([annotateClass])
    // Convert to an array of serialized annotations in the form "START-END".
    var serialAnnotations = annotations.map(function(ann) {
        return ann.node.className + "$" + ann.start + "$" + ann.end
    })
    // Join to a single serialized string
    var serialString = serialAnnotations.join("|")
    // Save to Parse. First look for an existing entry for the user and volume.
    // If found, update it. Else create a new entry.
    var query = new Parse.Query(VolSpansObject)
    query.equalTo("user", annotUser)
    query.equalTo("vol", selvol)
    query.first().then(function(existing) {
        if (existing) {
            existing.set("spans", serialString)
            return existing.save()
        } else {
            var artObject = new VolSpansObject()
            return artObject.save({"user":annotUser, "vol":selvol, "spans":serialString})
        }
    }, savefailure("finding existing entry")
    ).then(savesuccess(function() {
        annotationChanges = 0
        logMessage("Saved " + annotations.length + " annotations")
    }),
        savefailure("saving new or updating existing entry"))
}

// Called from HTML. Save annotations. If saved successfully, reset list of
// article changes.
function saveAnnotations() {
    function success() {
        annotationChanges = 0
    }
    if (annotUser != "Default") {
        // saveAnnotationsByChangeSet(success)
        // saveAnnotationsDirectly(success)
        // saveAnnotationsXML(success)
        // saveSerializedSpans()
        saveVolumeAnnotations(success)
    } else {
        logMessage("Please select a non-default Annotator Name prior prior to saving")
    }
}

function closeDialog(node) {
    $(node).dialog("close")
}

function checkVol() {
    if (annotUser != "Default") {
        var table = $('#vol_table').DataTable()
        var ret = table.$('tr.selected')
        if (ret.length > 0) {
            var newvol = table.$('tr.selected').find('td:first').text()
            if (annotationChanges > 0) {
                $("<div>Do you want to save the existing annotations?</div>").dialog({
                    resizable: false,
                    modal: true,
                    buttons: {
                        "Yes": function() {
                            saveAnnotations()
                            loadVolumeText(newvol, VolSpansObject)
                            closeDialog(this)
                        },
                        "No": function() {
                            loadVolumeText(newvol, VolSpansObject)
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
                loadVolumeText(newvol, VolSpansObject)
            }
        }
    } else {
        logMessage("Please select a non-default Annotator name prior to loading a volume")
    }
}

function nameChangeAnnotator(){
    var el = document.getElementById("selectUserAnnotator");
    annotUser = el.options[el.selectedIndex].innerHTML;
}

function addArticle() {
    addAnnotation(annotateClass, applier)
}

function removeAnnotation() {
    var selectionRange = getSelectionRange()
    if (overlapsAnnotation(selectionRange, true, [annotateClass]))
        logMessage("Selection contains part of an annotation")
    else {
        unapplier.undoToSelection()
    }
}

function spanClick(element){
    //logMessage("Clicked inside article");
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

    var table = $('#vol_table').DataTable()
    var rows = getVolTableRows(table)
}

// Set 4-space indentation for vi
// vi:sw=4
