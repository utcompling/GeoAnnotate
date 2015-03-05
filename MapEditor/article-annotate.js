var highlighter;

//Will have schema vol-change_type-user-spanstart-spanend
var article_changes = [];
var selvol = "0";
var user = "Default";


function match_ranges(sometext, re) {
    var matches = [];
    while ((m = re.exec(sometext)) !== null) {
      matches.push([re.lastIndex - m[0].length, re.lastIndex - 1]);
    }
    return matches;
};

//fast method for loading annotations based on serialized string
function load_serial_article_annotations(results){
    var serialized_annot = results[0].get("serialized_annotations")
    highlighter.deserialize(serialized_annot)

}

//slow method that iterates over article spans
function load_article_annotations(results){
    var selection = rangy.getSelection();
    var selectionRanges = [];
    for(var a = 0; a < results.length; a++ ){
        var span = results[a].get("span");
        var start_span = span.split("-")[0];
        selectionRanges.push({
            "characterRange": {
                "start": start_span,
                "end": end
            }
        });
    }
    selection.restoreCharacterRanges(document.getElementById('col2text'), selectionRanges);
    highlighter.highlightSelection(highlightClass, selection);
}

function saveAnnotations(){
    var serialized_annot = highlighter.serialize();
    if (user != "Default"){
        serialArtObject.save({"user":user, "vol":selvol, "serialized_annotations":serialized_annot });
        window.alert("Saving This Many Article Changes: " + article_changes.length);
        for(var a = 0; a < article_changes.length; a++ ){
            var change = article_changes[a];
            var change_row = change.split("-")
            var change_user = change_row[0];
            var change_vol = change_row[1];
            var change_type = change_row[2];
            var change_spanstart = change_row[3];
            var change_spanend = change_row[4];
            if (change_type == "add" ) {
                artObject = new ArtObject();
                artObject.save({"user":change_user, "vol":change_vol, "span":(change_spanstart+"-"+change_spanend)});
            } else if (change_type == "remove"){
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
        article_changes = [];
    } else{
        window.alert("Please select a non-default Annotator Name prior prior to saving")
    }

}

function checkVol(){
    if (user != "Default"){
        var table = $('#art_table').DataTable();
        var ret = table.$('tr.selected');
        selvol = ret[0].cells[0].innerHTML;
        var query = new Parse.Query(VolObject);
        query.equalTo("vol", selvol);
        query.find({
            success: function(results) {
                //alert("Successfully" + results[0].get("text"))
                $("#col2text").html(results[0].get("text"));
            }
        })
        var query = new Parse.Query(SerialArtObject);
        query.equalTo("user", user);
        query.equalTo("vol", selvol);
        query.find({
            success: function(results) {
                //alert("Successfully" + results[0].get("text"))
                if (results.length > 0) {
                    load_serial_article_annotations(results);
                }
            }
        })

    } else{
        window.alert("Please select a non-default Annotator Name prior to loading a volume")
    }
}

function nameChange(){
    var el = document.getElementById("selectUser");
    user = el.options[el.selectedIndex].innerHTML;;
}

function highlightSelectedText() {
    highlighter.highlightSelection("highlight");
}

function removeHighlightFromSelectedText() {
    highlighter.unhighlightSelection();
}

function addArticle(){
    var numbarts1 = highlighter.serialize().split("|").length;
    highlightSelectedText();
    var numbarts2 = highlighter.serialize().split("|").length;
    if (numbarts1 != numbarts2){
        var range = rangy.createRange();
        var highlight_range = rangy.getSelection().getRangeAt(0).toCharacterRange(document.getElementById('col2text'))
        var highlight_start = highlight_range.start;
        var highlight_end = highlight_range.end;
        article_changes.push((user + "-"+ selvol + "-add" + "-" + highlight_start + "-" + highlight_end))
        //var highlight_range = range.toCharacterRange("col2text")
    } else{
        window.alert("Partial Selection was blocked from adding");
    }
}

function removeArticle(){
    var highlight_range = rangy.getSelection().getRangeAt(0).toCharacterRange(document.getElementById('col2text'))
    var highlight_start = highlight_range.start;
    var highlight_end = highlight_range.end;
    var index = article_changes.indexOf((user + "-"+ selvol + "-add" + "-" + highlight_start + "-" + highlight_end));
    if (index != -1){
        article_changes.splice(index, 1)
    } else{
        article_changes.push((user + "-"+ selvol + "-remove" + "-" + highlight_start + "-" + highlight_end))
    }
    removeHighlightFromSelectedText();
    //window.alert("Removed Article Annotation")
}

function spanClick(element){
    //window.alert("Clicked inside article");
    var range = rangy.createRange();
    range.selectNodeContents(element);
    var sel = rangy.getSelection();
    sel.setSingleRange(range);
}

function replaceRange(s, start, end, substitute) {
    return s.substring(0, start) + substitute + s.substring(end);
}

function init() {

    Parse.initialize("Dxi3BvGT3mHiDC7B1YjeEuiUQKtWIeQNofT5FIIx", "QG352rxcZvLrYeV4jOCsIZvM8mIeQyhvHzDNINAb");

    VolObject = Parse.Object.extend("Text");
    SerialArtObject = Parse.Object.extend("Volume");
    volObject = new VolObject();
    serialArtObject = new SerialArtObject();
    ArtObject = Parse.Object.extend("Article");
    artObject = new ArtObject();

    rangy.init();

    highlighter = rangy.createHighlighter();

    applier = rangy.createClassApplier("highlight");

    highlighter.addClassApplier(rangy.createClassApplier("highlight", {
        ignoreWhiteSpace: true,
        normalize:false,
        elementAttributes: {onclick:"spanClick(this)"},
        tagNames: ["span", "a"]
    }));

}