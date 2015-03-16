"use strict";

var map, annotation;

//var ne_annotations;

var VolTextObject;
var VolSpansObject;
var NESpansObject;
var ToponymObject;

var place_applier;
var place_unapplier;

var person_applier;
var person_unapplier;

var vol_serial_span = "";

var articleChanges = 0
var place_selection = [];
var selvol = "0";
var artUser = "Default";
var placeClass = "place";
var personClass = "person";

var DeleteFeature = OpenLayers.Class(OpenLayers.Control, {
    initialize: function(layer, options) {
        OpenLayers.Control.prototype.initialize.apply(this, [options]);
        this.layer = layer;
        this.handler = new OpenLayers.Handler.Feature(
            this, layer, {click: this.clickFeature}
        );
    },
    clickFeature: function(feature) {
        // if feature doesn't have a fid, destroy it
        if(feature.fid == undefined) {
            this.layer.destroyFeatures([feature]);
        } else {
            feature.state = OpenLayers.State.DELETE;
            this.layer.events.triggerEvent("afterfeaturemodified", 
                                           {feature: feature});
            feature.renderIntent = "select";
            this.layer.drawFeature(feature);
        }
    },
    setMap: function(map) {
        this.handler.setMap(map);
        OpenLayers.Control.prototype.setMap.apply(this, arguments);
    },
    CLASS_NAME: "OpenLayers.Control.DeleteFeature"
});

function getFeatures() {
    //var mLayers = map.layers;
    var annotation_layer = map.getLayersByName("Annotations")

    var geoJSON = new OpenLayers.Format.GeoJSON()

    for(var a = 0; a < annotation_layer[0].features.length; a++ ){
        var layer_geom = annotation_layer[0].features[a].geometry.transform("EPSG:900913", "EPSG:4326")
        var geoJSONText = geoJSON.write(annotation_layer[0].features[a].geometry.transform("EPSG:900913", "EPSG:4326"));
        window.alert(geoJSONText)
    };
    //window.alert(annotation.features)
}

function zoomFeatures() {
    window.alert("Zoom Action Needed")
}

function match_ranges(sometext, re) {
    var matches = [];
    while ((m = re.exec(sometext)) !== null) {
      matches.push([re.lastIndex - m[0].length, re.lastIndex - 1]);
    }
    return matches;
};

function addPlace() {
    addAnnotation("place", place_applier)
}

function addPerson() {
    addAnnotation("person", person_applier)
}

function utf8_to_b64(str) {
    return window.btoa(unescape(encodeURIComponent(str)))
}

// Save annotations in a serialized format. SUCCESSCB is a callback to execute
// upon successful saving.
function saveAnnotationsSerialized(successcb) {
    // Fetch annotations
    var place_annotations = getAnnotations("place")
    var person_annotations = getAnnotations("person")
    var ne_annotations = person_annotations.concat(place_annotations)
    window.alert("Saving This Many Annotations: " + ne_annotations.length)
    // Convert to an array of serialized annotations in the form "START-END".
    var serialAnnotations = ne_annotations.map(function(ann) {
        return ann.node.className + "$" + ann.start + "$" + ann.end
    })
    // Join to a single serialized string
    var serialString = serialAnnotations.join(":")
    var base64 = utf8_to_b64(serialString);
    var parse_file = new Parse.File((annotUser + "-" + selvol + +".txt"), { base64: base64 });
    // Save to Parse. First look for an existing entry for the user and volume.
    // If found, update it. Else create a new entry.
    var query = new Parse.Query(NESpansObject)
    query.equalTo("user", annotUser)
    query.equalTo("vol", selvol)
    query.first().then(function(existing) {
        if (existing) {
            existing.set("spans", parse_file)
            return existing.save()
        } else {
            var neSpansObject = new NESpansObject()
            return neSpansObject.save({"user":annotUser, "vol":selvol, "spans":parse_file})
        }
    }, savefailure("finding existing entry")
    ).then(savesuccess(successcb),
        savefailure("saving new or updating existing entry"))
}

// Called from HTML. Save annotations. If saved successfully, reset list of
// article changes.
function saveAnnotations() {
    function success() {
        articleChanges = 0
    }
    if (annotUser != "Default") {
        saveAnnotationsSerialized(success)
    } else {
        window.alert("Please select a non-default Annotator Name prior prior to saving")
    }
}

function loadVolumeAnnotations(results){
    removeAnnotations()
    var textNode = getTextNode().childNodes[0]
    var spansSerialized = results[0].get("spans").split(":")
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
        if (span.class_name == "place"){
            place_applier.applyToRange(range)
        }
        if (span.class_name == "person"){
            person_applier.applyToRange(range)
        }
    }
}

function closeDialog(node) {
    $(node).dialog("close")
}

function checkVol(tableSelector) {
    if (annotUser != "Default") {
        var table = $(tableSelector).DataTable()
        var ret = table.$('tr.selected')
        if (ret.length > 0) {
            var newvol = table.$('tr.selected').find('td:first').text()
            if (articleChanges > 0) {
                $("<div>Do you want to save the existing annotations?</div>").dialog({
                    resizable: false,
                    modal: true,
                    buttons: {
                        "Yes": function() {
                            saveAnnotations()
                            loadVolumeText(newvol, NESpansObject)
                            closeDialog(this)
                        },
                        "No": function() {
                            loadVolumeText(newvol, NESpansObject)
                            closeDialog(this)
                        },
                        "Cancel": function() {
                            console.log("Canceled")
                            window.alert("FIXME: We should set the visibly selected volume to the old one")
                            closeDialog(this)
                        }
                    }
                })
            } 
            loadVolumeText(newvol, NESpansObject)
        }
    } else {
        window.alert("Please select a non-default Annotator name prior to loading a volume")
    }
}

function getArtTableRows(vol){
    //There is a potential consistency problem if vol_serial_spans is changed in the period of time
    //that the volume table is originally loaded and the article table is loaded.
    //In the future we probably want to requery the spans before loading to check for updates
    vol_serial_spans
}

function getVolSpanTableRows(table){
    var query = new Parse.Query(VolSpansObject)
    query.exists("vol")
    query.equalTo("user", artUser)
    query.find().then(function(results) {
        //console.log("Successfully " + results[0].get["text"))
        //$("#col2text").html(results[0].get("text"))
        for (var i = 0; i < results.length; i++) {
            var vol = results[i].get("vol")
            vol_serial_span = results[i].get("spans")
            var num_arts = vol_serial_span.split(':').length
            table.row.add([vol, num_arts]).draw();
        }
    })
}

function nameChangeArticle() {
    var el = document.getElementById("selectUserArticle");
    artUser = el.options[el.selectedIndex].innerHTML;
    var table = $('#vol_table').DataTable()
    if (artUser != "Default"){
        // var rows = getVolSpanTableRows(table);
    }else{
        window.alert("Please select a non default user for Article Pool");
    }
}

function nameChangeAnnotator() {
    var el = document.getElementById("selectUserAnnotator");
    annotUser = el.options[el.selectedIndex].innerHTML;
}

function removeAnnotations() {
    place_unapplier.undoToRange(makeRange(document.body))
    person_unapplier.undoToRange(makeRange(document.body))
    articleChanges = 0
}

document.onkeypress = function (e) {
    e = e || window.event;
    //check of 'a' was pressed
    if (e.keyCode == 97){
        //window.alert(e.keyCode)
        var sel = rangy.getSelection();
        addPlace()
    }
    //check of 'e' was pressed
    if (e.keyCode == 101){
        //window.alert(e.keyCode)
        var sel = rangy.getSelection();
        addPerson()
    }
    //check if 'r' was pressed
    if (e.keyCode == 114){
        removeAnnotation()
    }
};

function removeAnnotation() {
    var selectionRange = getSelectionRange()
    if (overlapsAnnotation(selectionRange, true, "place") || overlapsAnnotation(selectionRange, true, "person"))
        alert("Selection contains part of an annotation")
    else {
        place_unapplier.undoToSelection()
        person_unapplier.undoToSelection()
    }
}

function spanClick(element){
    //window.alert("Clicked inside article");
    var range = rangy.createRange();
    range.selectNodeContents(element);
    var sel = rangy.getSelection();
    sel.setSingleRange(range);
}

function saveFeatures() {
    var annotation_layer = map.getLayersByName("Annotations")

    /*
    for(var a = 0; a < annotation_layer[0].features.length; a++ ){
        var layer_geom = annotation_layer[0].features[a].geometry.transform("EPSG:900913", "EPSG:4326")
        var geoJSONText = geoJSON.write(annotation_layer[0].features[a].geometry.transform("EPSG:900913", "EPSG:4326"));
        toponymObject.save({"GEOJSON": layer_geom})
        window.alert(geoJSONText)
    };*/

}

function init() {

    var extent = new OpenLayers.Bounds(
        -12003508, 3009847, -9005759, 6557774
    );

    Parse.initialize("Dxi3BvGT3mHiDC7B1YjeEuiUQKtWIeQNofT5FIIx", "QG352rxcZvLrYeV4jOCsIZvM8mIeQyhvHzDNINAb");

    VolTextObject = Parse.Object.extend("VolumeText");
    VolSpansObject = Parse.Object.extend("VolumeSpans");
    NESpansObject = Parse.Object.extend("NESpans");
    ToponymObject = Parse.Object.extend("Toponym");
    //toponymObject = new ToponymObject();

    rangy.init();

    var table = $('#vol_table').DataTable()
    var rows = getVolTableRows(table)

    place_applier = rangy.createClassApplier(placeClass, {
        elementAttributes: {onclick:"spanClick(this)"},
        normalize: false
    });
    place_unapplier = rangy.createClassApplier(placeClass, {
        elementAttributes: {onclick:"spanClick(this)"},
        normalize: true
    });

    person_applier = rangy.createClassApplier(personClass, {
        elementAttributes: {onclick:"spanClick(this)"},
        normalize: false
    });
    person_unapplier = rangy.createClassApplier(personClass, {
        elementAttributes: {onclick:"spanClick(this)"},
        normalize: true
    });

    map = new OpenLayers.Map('map', {
        projection: new OpenLayers.Projection("EPSG:900913"),
        displayProjection: new OpenLayers.Projection("EPSG:4326"),
        controls: [
            new OpenLayers.Control.PanZoom(),
            new OpenLayers.Control.Navigation(),
            new OpenLayers.Control.MousePosition({prefix: 'Long: ', separator: '  Lat: ', numDigits: 3, emptyString:''})
        ]
    });
    

    var gphy = new OpenLayers.Layer.Google(
        "Google Streets"
    );

    var saveStrategy = new OpenLayers.Strategy.Save();
    
    annotation = new OpenLayers.Layer.Vector("Annotations", {
        strategies: [new OpenLayers.Strategy.BBOX(), saveStrategy],
        projection: new OpenLayers.Projection("EPSG:4326"),
        protocol : new OpenLayers.Protocol.HTTP({
                url : 'polygons.geojson',
                format : new OpenLayers.Format.GeoJSON()
            })
    })
   
    map.addLayers([gphy, annotation]);

    var panel = new OpenLayers.Control.Panel({
        displayClass: 'customEditingToolbar',
        allowDepress: true
    });
    
    var draw = new OpenLayers.Control.DrawFeature(
        annotation, OpenLayers.Handler.Polygon,
        {
            title: "Draw Feature",
            displayClass: "olControlDrawFeaturePolygon",
            multi: true
        }
    );
    
    var edit = new OpenLayers.Control.ModifyFeature(annotation, {
        title: "Modify Feature",
        displayClass: "olControlModifyFeature"
    });

    var del = new DeleteFeature(annotation, {title: "Delete Feature"});
   
    var save = new OpenLayers.Control.Button({
        title: "Save Changes",
        trigger: function() {
            if(edit.feature) {
                edit.selectControl.unselectAll();
            }
            saveStrategy.save();
            window.alert("Done Saving")
        },
        displayClass: "olControlSaveFeatures"
    });

    panel.addControls([save, del, edit, draw]);
    map.addControl(panel);
    map.zoomToExtent(extent, true);
}

// Set 4-space indentation for vi
// vi:sw=4
