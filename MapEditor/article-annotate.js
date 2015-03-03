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

var highlighter;

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
    article_ranges.push(([highlight_start, highlight_end]));
    //var highlight_range = range.toCharacterRange("col2text")
    window.alert(highlight_start + " " + highlight_end);
}

function removeArticle(){

}

function checkRange(element){
    var textarea1 = document.getElementById("col2text");
    //var click_position = textarea1.selectionStart;
    var highlight_range = rangy.getSelection().getRangeAt(0).toCharacterRange(textarea1)
    var highlight_start = highlight_range.start;
    var highlight_end = highlight_range.end;
    //window.alert(highlight_start, highlight_end);
    for(var a = 0; a < article_ranges.length; a++ ){
        //window.alert("Article Range: " + article_ranges[a][0] + " " + article_ranges[a][1]);
        if (highlight_start >= article_ranges[a][0] && highlight_start <= article_ranges[a][1]){
            window.alert("Clicked inside article");
            var range = rangy.createRange();
            range.selectNodeContents(element);
            //var node = element;
            //debugger;
            //range.selectNode($(this));
            //range.setStartAndEnd(textarea1, article_ranges[a][0], article_ranges[a][1]);
            var sel = rangy.getSelection();
            sel.setSingleRange(range);

        }
    }
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
        elementProperties: {onclick:"checkRange(this)"},
        tagNames: ["span", "a"]
    }));

}