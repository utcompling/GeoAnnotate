var highlighter;

var article_ranges = [];


function match_ranges(sometext, re) {
    var matches = [];
    while ((m = re.exec(sometext)) !== null) {
      matches.push([re.lastIndex - m[0].length, re.lastIndex - 1]);
    }
    return matches;
};

function checkVol(){
    var table = $('#art_table').DataTable();
    var ret = table.$('tr.selected');
    var selvol = ret[0].cells[0].innerHTML;
    var query = new Parse.Query(VolObject);
    query.equalTo("vol", selvol)
    query.find({
        success: function(results) {
            //alert("Successfully" + results[0].get("text"))
            $("#col2text").html(results[0].get("text"));
        }
    })
}

function removeA(arr) {
    var what, a = arguments, L = a.length, ax;
    while (L > 1 && arr.length) {
        what = a[--L];
        while ((ax= arr.indexOf(what)) !== -1) {
            arr.splice(ax, 1);
        }
    }
    return arr;
}

function highlightSelectedText() {
    highlighter.highlightSelection("highlight");
}

function removeHighlightFromSelectedText() {
    highlighter.unhighlightSelection();
}

function addArticle(){
    highlightSelectedText();
    var range = rangy.createRange();
    var highlight_range = rangy.getSelection().getRangeAt(0).toCharacterRange(document.getElementById('col2text'))
    var highlight_start = highlight_range.start;
    var highlight_end = highlight_range.end;
    //var highlight_range = range.toCharacterRange("col2text")
}

function removeArticle(){
    var highlight_range = rangy.getSelection().getRangeAt(0).toCharacterRange(document.getElementById('col2text'))
    var highlight_start = highlight_range.start;
    var highlight_end = highlight_range.end;
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
    ArtObject = Parse.Object.extend("Article");
    volObject = new VolObject();
    artObject = new ArtObject();

    rangy.init();

    highlighter = rangy.createHighlighter();

    applier = rangy.createClassApplier("highlight");

    highlighter.addClassApplier(rangy.createClassApplier("highlight", {
        ignoreWhiteSpace: true,
        elementAttributes: {onclick:"spanClick(this)"},
        tagNames: ["span", "a"]
    }));

}