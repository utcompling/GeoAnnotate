"use strict";

var applier;
var unapplier;
var VolObject, volObject;
// var SerialArtObject, serialArtObject;
var ArtObject, artObject;

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

//slow method that iterates over article spans
function loadArticleAnnotations(results){
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

function saveAnnotations(){
    if (user != "Default"){
        var textNode = getTextNode();
        // var nodes = getRangeNodes(makeRange(document.body))
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
                artObject = new ArtObject();
                artObject.save({"user":change_user, "vol":change_vol, "span":change_span});
            } else if (change_type == "remove") {
                var query = new Parse.Query("Article");
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
        articleChanges = [];
    } else{
        window.alert("Please select a non-default Annotator Name prior prior to saving")
    }

}

function checkVol(){
    if (user != "Default"){
        var table = $('#art_table').DataTable();
        var ret = table.$('tr.selected');
        if (ret.length > 0) {
            selvol = ret[0].cells[0].innerHTML;
            var query = new Parse.Query(VolObject);
            query.equalTo("vol", selvol);
            query.find({
                success: function(results) {
                    //alert("Successfully" + results[0].get("text"))
                    $("#col2text").html(results[0].get("text"));
                    var q2 = new Parse.Query(ArtObject);
                    q2.equalTo("user", user);
                    q2.equalTo("vol", selvol);
                    q2.find({
                        success: function(results) {
                            //alert("Successfully" + results[0].get("text"))
                            if (results.length > 0) {
                                loadArticleAnnotations(results);
                            }
                        }
                    })
                }
            })
        }
    } else{
        window.alert("Please select a non-default Annotator Name prior to loading a volume")
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
    volObject = new VolObject();
    // SerialArtObject = Parse.Object.extend("Volume");
    // serialArtObject = new SerialArtObject();
    ArtObject = Parse.Object.extend("Article");
    artObject = new ArtObject();

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
