"use strict"

var VolTextObject;
var map, annotationLayer;

var annotationChanges = 0
var selvol = "0";
var annotationClassesAndAppliers;

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

function getMapFeatures() {
    //var mLayers = map.layers;
    // var annLayer = map.getLayersByName("Annotations")
    var annLayer = annotationLayer

    var geoJSON = new OpenLayers.Format.GeoJSON()

    var jsonfeatsarr = annLayer.features.map(function(feature) {
        var layer_geom = feature.geometry.transform("EPSG:900913", "EPSG:4326")
        var geoJSONText = geoJSON.write(layer_geom)
        return geoJSONText
    })
    var jsonfeats = jsonfeatsarr.join("@@")
    // window.alert(jsonfeats)
    return jsonfeats
}

function jsonToMapFeatures(jsonstr) {
    var geoJSON = new OpenLayers.Format.GeoJSON()

    var jsonfeats = jsonstr.split("@@")
    // debugger
    var feats = jsonfeats.map(function(jsonfeat) {
        var geom = geoJSON.read(jsonfeat, "Geometry")
        var transformedGeom = geom.transform("EPSG:4326", "EPSG:900913")
        return new OpenLayers.Feature.Vector(transformedGeom)
    })
    return feats
}

function getSelectionNodes() {
    var selectionRange = getSelectionRange()
    return getRangeNodes(selectionRange, annotationClasses)
}

function getStoredMapFeatures(node) {
    return $.data(node, "features")
}

function setStoredMapFeatures(node, feats) {
    $.data(node, "features", feats)
}

function addMapFeaturesToSelection() {
    var jsonfeats = getMapFeatures()
    var rangenodes = getSelectionNodes()
    rangenodes.forEach(function(node) {
        setStoredMapFeatures(node, jsonfeats)
    })
}

function zoomFeatures() {
    window.alert("Zoom Action Needed")
}

function utf8_to_b64(str) {
    return window.btoa(unescape(encodeURIComponent(str)))
}

// Save annotations in a serialized format.
function saveVolumeAnnotations() {
    // Fetch annotations
    var annotations = getAnnotations(annotationClasses)
    // Convert to an array of serialized annotations in the form "CLASS$START$END".
    var serialAnnotations = annotations.map(function(ann) {
        var jsonmapfeats = getStoredMapFeatures(ann.node) || ""
        return ann.node.className + "$" + ann.start + "$" + ann.end + "$" + jsonmapfeats
    })
    // Join to a single serialized string
    var serialString = serialAnnotations.join("|")
    var base64 = utf8_to_b64(serialString);
    var parse_file = new Parse.File((annotUser + "-" + selvol +".txt"), { base64: base64 });
    // Save to Parse. First look for an existing entry for the user and volume.
    // If found, update it. Else create a new entry.
    var query = new Parse.Query(SpansObject)
    query.equalTo("user", annotUser)
    query.equalTo("vol", selvol)
    query.first().then(function(existing) {
        if (existing) {
            existing.set("spans", parse_file)
            return existing.save()
        } else {
            var spansObject = new SpansObject()
            return spansObject.save({"user":annotUser, "vol":selvol, "spans":parse_file})
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
    if (annotUser != "Default") {
        saveVolumeAnnotations()
    } else {
        logMessage("Please select a non-default Annotator Name prior prior to saving")
    }
}

// Load volume annotations
function loadVolumeAnnotations(results) {
    var textNode = getTextNode().childNodes[0]
    httpGet(results[0].get("spans").url(), function(spansText) {
        var spansSerialized = spansText.split("|")
        var spans = spansSerialized.map(function(span) {
            var splitSpan = span.split("$")
            var className = splitSpan[0]
            var start = splitSpan[1]
            var end = splitSpan[2]
            var jsonmapfeats = splitSpan[3]
            return {start: start, end: end, className: className, jsonmapfeats: jsonmapfeats}
        })
        spans.sort(function(a, b) { return b.start - a.start })
        for (var i = 0; i < spans.length; i++) {
            var span = spans[i]
            var range = rangy.createRange()
            range.setStartAndEnd(textNode, span.start, span.end)
            annotationClassesAndAppliers.forEach(function(ca) {
                if (span.className == ca.clazz) {
                    ca.applier.applyToRange(range)
                }
            })
            getRangeNodes(range, annotationClasses).forEach(function(node) {
                if (span.jsonmapfeats)
                    setStoredMapFeatures(node, span.jsonmapfeats)
            })
        }
    })
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
            if (annotationChanges > 0) {
                $("<div>Do you want to save the existing annotations?</div>").dialog({
                    resizable: false,
                    modal: true,
                    buttons: {
                        "Yes": function() {
                            saveAnnotations()
                            loadVolumeText(newvol, SpansObject)
                            closeDialog(this)
                        },
                        "No": function() {
                            loadVolumeText(newvol, SpansObject)
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
            loadVolumeText(newvol, SpansObject)
        }
    } else {
        logMessage("Please select a non-default Annotator name prior to loading a volume")
    }
}

function nameChangeAnnotator() {
    var el = document.getElementById("selectUserAnnotator");
    annotUser = el.options[el.selectedIndex].innerHTML;
}

function removeAnnotations() {
    annotationLayer.destroyFeatures()
    annotationClassesAndAppliers.forEach(function(ca) {
        ca.unapplier.undoToRange(makeRange(document.body))
    })
    annotationChanges = 0
}

function removeAnnotation() {
    var selectionRange = getSelectionRange()
    if (overlapsAnnotation(selectionRange, true, annotationClasses))
        logMessage("Selection contains part of an annotation")
    else {
        annotationClassesAndAppliers.forEach(function(ca) {
            ca.unapplier.undoToSelection()
        })
    }
}

function spanClick(element) {
    //window.alert("Clicked inside article")
    var range = rangy.createRange()
    range.selectNodeContents(element)
    var sel = rangy.getSelection()
    sel.setSingleRange(range)
    var jsonfeats = getStoredMapFeatures(element)
    // alert("GeoJSON: " + jsonfeats)
    annotationLayer.destroyFeatures()
    if (jsonfeats)
        annotationLayer.addFeatures(jsonToMapFeatures(jsonfeats))
}

function annotationFeatureChanged(event) {
    addMapFeaturesToSelection()
    // var bounds = event.feature.geometry.getBounds();
    // var answer = "bottom: " + bounds.bottom + "\n";
    // answer += "left: " + bounds.left + "\n";
    // answer += "right: " + bounds.right + "\n";
    // answer += "top: " + bounds.top + "\n";
    // alert("Feature modified: " + answer);
}

function commonMapInit() {
    var extent = new OpenLayers.Bounds(
        -12003508, 3009847, -9005759, 6557774
    );

    Parse.initialize("Dxi3BvGT3mHiDC7B1YjeEuiUQKtWIeQNofT5FIIx", "QG352rxcZvLrYeV4jOCsIZvM8mIeQyhvHzDNINAb");

    VolTextObject = Parse.Object.extend("VolumeText");

    rangy.init();

    var table = $('#vol_table').DataTable()
    var rows = getVolTableRows(table)

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
    
    annotationLayer = new OpenLayers.Layer.Vector("Annotations", {
        strategies: [new OpenLayers.Strategy.BBOX(), saveStrategy],
        projection: new OpenLayers.Projection("EPSG:4326"),
        protocol : new OpenLayers.Protocol.HTTP({
                url : 'polygons.geojson',
                format : new OpenLayers.Format.GeoJSON()
            })
    })
   
    map.addLayers([gphy, annotationLayer]);

    annotationLayer.events.on({
        featureadded: annotationFeatureChanged,
        featuremodified: annotationFeatureChanged,
        featureremoved: annotationFeatureChanged
    })

    var panel = new OpenLayers.Control.Panel({
        displayClass: 'customEditingToolbar',
        allowDepress: true
    });
    
    var draw = new OpenLayers.Control.DrawFeature(
        annotationLayer, OpenLayers.Handler.Polygon,
        {
            title: "Draw Feature",
            displayClass: "olControlDrawFeaturePolygon",
            multi: true
        }
    );
    
    var edit = new OpenLayers.Control.ModifyFeature(annotationLayer, {
        title: "Modify Feature",
        displayClass: "olControlModifyFeature"
    });

    var del = new DeleteFeature(annotationLayer, {title: "Delete Feature"});
   
    var save = new OpenLayers.Control.Button({
        title: "Save Changes",
        trigger: function() {
            if(edit.feature) {
                edit.selectControl.unselectAll();
            }
            saveStrategy.save();
            logMessage("Done Saving")
        },
        displayClass: "olControlSaveFeatures"
    });

    panel.addControls([save, del, edit, draw]);
    map.addControl(panel);
    map.zoomToExtent(extent, true);
}

