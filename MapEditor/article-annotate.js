
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

function checkRange(){
    var textarea1 = document.getElementById("col2text")
    var click_position = textarea1.selectionStart;
    var place_ranges = match_ranges(textarea1.value, re)
    for(var a = 0; a < place_ranges.length; a++ ){
        if (click_position >= place_ranges[a][0] && click_position <= place_ranges[a][1]){
            placeClicked(textarea1, place_ranges[a])
            window.alert("Clicked inside place", place_ranges[a])
        }
    }
}

function replaceRange(s, start, end, substitute) {
    return s.substring(0, start) + substitute + s.substring(end);
}

function init() {

    Parse.initialize("Dxi3BvGT3mHiDC7B1YjeEuiUQKtWIeQNofT5FIIx", "QG352rxcZvLrYeV4jOCsIZvM8mIeQyhvHzDNINAb");

    VolObject = Parse.Object.extend("Text");
    volObject = new VolObject();

}