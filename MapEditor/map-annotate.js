"use strict"

var isDocGeo = false

var VolTextObject
var map, annotationLayer
var programmaticMapChange = false

// Number of changes made to annotations, either adding or removing a span
// or adding/removing a geometry. Only really used to check whether non-zero.
var annotationChanges = 0
var selvol = "0"
var annotationClassesAndAppliers
var keyCodeActions

var recentLocations = []
var recentLocationsMaxLength = 10

var lastSelectedNode

$(document).ready(function() {
    // This handles selection in dataTable
    var table = $('#vol_table').DataTable();

    $('#vol_table tbody').on('click', 'tr', function() {
        checkVol(this, '#vol_table', SpansObject)
    } );
 
    // FIXME: What does this do?
    $('#button').click( function() {
        table.row('.selected').remove().draw( false )
    } );

    $("#col2text").on("cut paste", function(e) {
        e.preventDefault()
    })

    // Prevent changes in a content-editable div
    $("#col2text").get(0).addEventListener("keydown", function(e) {
        e = e || window.event;
        console.log("Key pressed: keyCode=" + e.keyCode +
                    " altKey=" + e.altKey +
                    " ctrlKey=" + e.ctrlKey +
                    " metaKey=" + e.metaKey +
                    " shiftKey=" + e.shiftKey)
        // Allow Cmd + z and Cmd + c
        var allowableKey = e.metaKey && (e.keyCode == 90 || e.keyCode == 67)
        // Allow arrow keys, home, end, pgup, pgdn
        if (!allowableKey && (e.keyCode < 33 || e.keyCode > 40))
            e.preventDefault()
        if (!e.altKey && !e.ctrlKey && !e.metaKey) {
            keyCodeActions.forEach(function(action) {
                if (e.keyCode == action.code)
                    action.action()
            })
        }
    }, true)

    // Remove selection CSS and active geometry when outside span
    $("#col2text").on("mouseup", function(e) {
        //console.log("Mouse Clicked in col2text: " + e.button)
        if (e.button == 0){
            if (getSelectionNodes().length == 0){
                if (lastSelectedNode){
                    removeSelectCSS(lastSelectedNode);
                    destroyMapFeatures();
                    lastSelectedNode = null;
                }
            }
        }
    })

    $("#latlong").on("keypress", function(e) {
        e = e || window.event
        //console.log("Mouse Clicked in col2text: " + e.button)
        if (e.keyCode == 13){
            setLatLong()
        }
    })

    window.addEventListener("beforeunload", function (e) {
        var confirmationMessage = 'It looks like you have been editing something. '
        confirmationMessage += 'If you leave before saving, your changes will be lost.'

        if (annotationChanges == 0) {
            return undefined
        }

        (e || window.event).returnValue = confirmationMessage //Gecko + IE
        return confirmationMessage //Gecko + Webkit, Safari, Chrome etc.
    })
} )

function getSelectionNodes() {
    var selectionRange = getSelectionRange()
    return getRangeNodes(selectionRange, annotationClasses)
}

function setSelectionToNode(node) {
    var range = rangy.createRange()
    range.selectNodeContents(node)
    var sel = rangy.getSelection()
    sel.setSingleRange(range)
}

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
        if (lastSelectedNode)
            setSelectionToNode(lastSelectedNode)
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
        var layer_geom = feature.geometry
        var geoJSONText = geoJSON.write(layer_geom.transform("EPSG:900913", "EPSG:4326"))
        //Any transformation of a vector layer geometry changes the layer projection, So we must transform it back.
        //Done to prevent polygons disappearing/zooming incorrectly
        layer_geom.transform("EPSG:4326", "EPSG:900913")
        return geoJSONText
    })
    var jsonfeats = jsonfeatsarr.join("@@")
    console.log(jsonfeats)
    //window.alert("json feats?" + jsonfeats)
    return jsonfeats
}

// Return the centroid of the first point or polygon on the map, as a
// string of the form LAT,LONG. If there isn't any point or polygon on the
// map, return "unknown".
function getMapCentroid() {
    if (annotationLayer.features.length == 0)
        return undefined
    var centroid =
        annotationLayer.features[0].geometry.getCentroid().transform("EPSG:900913", "EPSG:4326")
    return centroid.y.toFixed(3) + "," + centroid.x.toFixed(3)
}

function jsonToMapFeatures(jsonstr) {
    var geoJSON = new OpenLayers.Format.GeoJSON()

    var jsonfeats = jsonstr.split("@@")
    var feats = jsonfeats.map(function(jsonfeat) {
        var geom = geoJSON.read(jsonfeat, "Geometry")
        var transformedGeom = geom.transform("EPSG:4326", "EPSG:900913")
        return new OpenLayers.Feature.Vector(transformedGeom)
    })
    return feats
}

function latLongToJson(latlong) {
    if (!latlong) {
        logMessage("Empty lat/long value")
        return undefined
    }
    var split_latlong = latlong.split(",")
    var lat = split_latlong[1]
    var lon = split_latlong[0]
    if (isNaN(lat) || isNaN(lon)) {
        logMessage("Invalid lat/long value: " + latlong)
        return undefined
    }
    return ('{"type":"Point","coordinates":[' + lat + ',' + lon + ']}')
}

function getStoredMapFeatures(node) {
    return $.data(node, "features")
}

function setStoredMapFeatures(node, feats, setattr) {
    console.log("setStoredMapFeatures: node=[" + node + "] feats=[" + feats + "] setattr=" + setattr)
    //$( "span:first" ).text( jQuery.data( node, "features" ).first );
    $.data(node, "features", feats)

    if (setattr) {
        node.setAttribute("geo", "1")
    }

    //console.log(feats)

    if (feats.length == 0) {
        node.removeAttribute("geo")
    }

    //console.log(feats + 'applied to' + node)
}

// Store the specified GeoJSON map features in the ranges associated with the selection.
// Return the range nodes in the selection.
function addMapFeaturesToSelection(jsonfeats) {
    annotationChanges++
    var rangenodes = getSelectionNodes()
    rangenodes.forEach(function(node) {
        setStoredMapFeatures(node, jsonfeats, true)
    })
    return rangenodes
}

function doProgrammaticMapChange(cb) {
    try {
        programmaticMapChange = true
        cb()
    } finally {
        programmaticMapChange = false
    }
}

function destroyMapFeatures() {
    doProgrammaticMapChange(function() { annotationLayer.destroyFeatures() })
}

function addMapFeatures(feats) {
    doProgrammaticMapChange(function() { annotationLayer.addFeatures(feats) })
}

function displayMapFeatures(jsonfeats) {
    destroyMapFeatures()
    if (jsonfeats)
        addMapFeatures(jsonToMapFeatures(jsonfeats))
}

// Add an annotation with an attached map feature
function addFeature(clazz, applier, conflict_clazzes) {
    destroyMapFeatures()
    if (conflict_clazzes==='undefined'){
        conflict_clazzes = [clazz]
    }
    if (addAnnotation(clazz, applier, conflict_clazzes)) {
        var nodes = getSelectionNodes()
        if (nodes.length > 0)
            lastSelectedNode = nodes[0]
    }
}

function populateRecentLocations() {
    var htmlarr = []
    for (var i = recentLocations.length - 1; i >= 0; i--) {
        var recentLoc = recentLocations[i]
        var jsonfeats = recentLoc.jsonfeats
        var splitfeats = jsonfeats.split("@@")
        var html = '<tr>' + '<td onclick="locClick(event)" data-jsonfeats="' +
                     encodeURI(jsonfeats) + '">&#x24b3;</td><td><input value="' +
                     recentLoc.html + '" onchange="locChange(event)" data-index="' + i +
                     '"></td><td>' + recentLoc.centroid + '</td><td>' +
                     splitfeats.length + '</td></tr>'
        htmlarr.push(html)
    }
    $('#recentlocs').html(htmlarr.join("\n"))
}

/* Add an element to the recentLocations list with the specified HTML,
 * GeoJSON features, and string describing the centroid. */
function addToRecentLocations(node, jsonfeats, centroid) {
    // We want to make sure we don't have duplicate entries.
    var curNodeIndex =
        recentLocations.map(function(obj) { return obj.node }).indexOf(node)
    var curJsonIndex =
        recentLocations.map(function(obj) { return obj.jsonfeats }).indexOf(jsonfeats)
    if (curNodeIndex !== -1) {
        // console.log("Found entry with same node")
        // If the node is found, delete the current entry and create a new one
        // with the new map features, but preserving the text of the current
        // entry, which might have been changed by the user.
        var curhtml = recentLocations[curNodeIndex].html
        recentLocations.splice(curNodeIndex, 1)
        recentLocations.push({node: node, html: curhtml, jsonfeats: jsonfeats, centroid: centroid})
    } else if (curJsonIndex !== -1) {
        // console.log("Found entry with same GeoJSON features")
        // Else if we find an entry with the same GeoJSON features, move it
        // to the top of the stack.
        var objToMove = recentLocations[curJsonIndex]
        recentLocations.splice(curJsonIndex, 1)
        recentLocations.push(objToMove)
    } else {
        // console.log("Found no matching entry")
        // Else, delete the item at the bottom of the stack if necessary (i.e.
        // maximum stack size reached), and add new entry at top of stack.
        var html = node.innerHTML.substring(0, 20)
        if (recentLocations.length >= recentLocationsMaxLength)
            recentLocations = recentLocations.slice(1)
        recentLocations.push({node: node, html: html, jsonfeats: jsonfeats, centroid: centroid})
    }
    populateRecentLocations()
}

function locChange(e) {
    console.log(e.target.value)
    recentLocations[$(e.target).attr('data-index')].html = e.target.value
}

function locClick(e) {
    var jsonfeats = unescape($(e.target).attr('data-jsonfeats'))
    snapToJsonLocation(jsonfeats)
}

/* Given map features in JSON, set the map to contain those features and
 * add to the selected annotation, if any. If ADDTORECENTLOCS is true,
 * also add the map feature location to the recent-locations list.
 */
function snapToJsonLocation(jsonfeats, addtorecentlocs) {
    console.log("Snapping to " + jsonfeats)
    displayMapFeatures(jsonfeats)
    if (lastSelectedNode) {
        setSelectionToNode(lastSelectedNode)
        var rangenodes = addMapFeaturesToSelection(jsonfeats)
        if (addtorecentlocs) {
            var centroid = getMapCentroid()
            if (jsonfeats && centroid && rangenodes.length > 0) {
                var text = rangenodes[0].innerHTML.substring(0, 20)
                addToRecentLocations(text, jsonfeats, centroid)
            }
        }
    } else {
        logMessage("No selection to add map features to")
    }
}

function setLatLong() {
    var latlong = $("#latlong").val()
    console.log(latlong)
    var newjsonfeats = latLongToJson(latlong)
    if (newjsonfeats) {
        var existing = getMapFeatures()
        var jsonfeats = existing ? existing + "@@" + newjsonfeats : newjsonfeats
        console.log("Setting location feats to " + jsonfeats)
        snapToJsonLocation(jsonfeats, "addtorecentlocs")
    }
}

function zoomFeatures() {
    var bounds = annotationLayer.getDataExtent()
    //var bounds = annotationLayer.getDataExtent().transform("EPSG:4326", "EPSG:900913")
    map.zoomToExtent(bounds)
}

// Save annotations in a serialized format.
function saveVolumeAnnotations(successcb) {
    // Fetch annotations
    var annotations = getAnnotations(annotationClasses)
    // Convert to an array of serialized annotations in the form "CLASS$START$END".
    var geometries = 0
    var serialAnnotations = annotations.map(function(ann) {
        var jsonmapfeats = getStoredMapFeatures(ann.node) || ""
        if (jsonmapfeats)
            geometries++
        return ann.node.className + "$" + ann.start + "$" + ann.end + "$" + jsonmapfeats
    })
    // Join to a single serialized string
    var serialString = serialAnnotations.join("|")
    var base64 = utf8ToB64(serialString);
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
        logMessage("Saved " + annotations.length + " annotations (" +
                   geometries + " geometries)")
        if (successcb)
            successcb()
    }),
        savefailure("saving new or updating existing entry"))
}

// Called from HTML. Save annotations. If saved successfully, reset list of
// article changes.
function saveAnnotations(successcb) {
    if (annotUser != "Default") {
        saveVolumeAnnotations(successcb)
    } else {
        logMessage("Please select a non-default Annotator Name prior prior to saving")
    }
}

// Load volume annotations
function loadVolumeAnnotations(results) {
    var textDivNode = getTextNode()
    textDivNode.normalize()
    var textNode = textDivNode.childNodes[0]
    logMessage("Loading Annotations...")
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
        var geometries = 0
        for (var i = 0; i < spans.length; i++) {
            var span = spans[i]
            if (span.start > textNode.length || span.end > textNode.length) {
                console.log("Skipped span [" + span.start + "," +
                    span.end + "] because > " + textNode.length)
            } else {
                var range = rangy.createRange()
                range.setStartAndEnd(textNode, span.start, span.end)
                annotationClassesAndAppliers.forEach(function(ca) {
                    if (span.className == ca.clazz) {
                        if (span.jsonmapfeats && ca.geoapplier) {
                            ca.geoapplier.applyToRange(range)
                            geometries++
                        } else {
                            ca.applier.applyToRange(range)
                        }
                    }
                })
                getRangeNodes(range, annotationClasses).forEach(function(node) {
                    if (span.jsonmapfeats)
                        setStoredMapFeatures(node, span.jsonmapfeats, false)
                })
            }
        }
        logMessage("Loaded " + spans.length + " annotations (" +
                  geometries + " geometries)")
    })
}

function nameChangeAnnotator() {
    var el = document.getElementById("selectUserAnnotator");
    annotUser = el.options[el.selectedIndex].innerHTML;
}

function removeAnnotationsUponLoad() {
    destroyMapFeatures()
    // We don't actually need to remove the individual spans because we
    // just overwrite the whole HTML.
    annotationChanges = 0
}

function removeAnnotation() {
    if (lastSelectedNode){
        removeSelectCSS(lastSelectedNode)

    setSelectionToNode(lastSelectedNode)
    var selectionRange = getSelectionRange()
    if (overlapsAnnotation(selectionRange, true, annotationClasses))
        logMessage("Selection contains part of an annotation")
    else {
        var nodes = getRangeNodes(getSelectionRange())
        nodes.forEach(function(node) {
            annotationClassesAndAppliers.forEach(function(ca) {
               if (ca.clazz == node.className) {
                    if (node.getAttribute("geo"))
                        ca.geounapplier.undoToRange(makeRange(node))
                    else
                        ca.unapplier.undoToRange(makeRange(node))
               }
            })
        })
        destroyMapFeatures()
        lastSelectedNode = undefined
        annotationChanges++
    }
    }
    else{
        logMessage("Cannot Remove Span that hasn't been selected")
    }
}

function addSelectCSS(node){
    node.setAttribute("select", "1")
}

function removeSelectCSS(node){
    node.removeAttribute("select")
}

// Clicked on an annotation. Set up the map to display the annotation's
// map features and add to recent locations.
function spanClick(element) {
    //setSelectionToNode(element)
    if (lastSelectedNode) {
        removeSelectCSS(lastSelectedNode)
    }
    lastSelectedNode = element
    addSelectCSS(lastSelectedNode)
    var jsonfeats = getStoredMapFeatures(element)
    console.log("Click on element with JSON " + jsonfeats)
    displayMapFeatures(jsonfeats)
    var centroid = getMapCentroid()
    if (jsonfeats && centroid) {
        addToRecentLocations(element, jsonfeats, centroid)
    }
}

function annotationFeatureChanged(event) {
    console.log("annotationFeatureChanged: Programmatic Change:" + programmaticMapChange)
    if (!programmaticMapChange) {
        var jsonfeats = getMapFeatures()
        var centroid = getMapCentroid()
        console.log("annotationFeatureChanged: jsonfeats=[" + jsonfeats + "] centroid=[" + centroid + "] rangenodes=[" + rangenodes + "]")
        var rangenodes = addMapFeaturesToSelection(jsonfeats)
        if (jsonfeats && centroid && rangenodes.length > 0) {
            addToRecentLocations(rangenodes[0], jsonfeats, centroid)
        }
    }
    // var bounds = event.feature.geometry.getBounds();
    // var answer = "bottom: " + bounds.bottom + "\n";
    // answer += "left: " + bounds.left + "\n";
    // answer += "right: " + bounds.right + "\n";
    // answer += "top: " + bounds.top + "\n";
    // alert("Feature modified: " + answer);
}

function annotationFeatureAdded(event) {
    console.log("annotationFeatureAdded " + event)
    annotationFeatureChanged(event)
}

function annotationFeatureModified(event) {
    console.log("annotationFeatureModified " + event)
    annotationFeatureChanged(event)
}

function annotationFeatureRemoved(event) {
    console.log("annotationFeatureRemoved " + event)
    annotationFeatureChanged(event)
}

function commonMapInit() {
    var extent = new OpenLayers.Bounds(
    -11425435.395096, 2827558.5499316, -6494329.8270487, 5762740.4356738 );

    //var initial_position = new OpenLayers.LonLat(lon, lat)

    Parse.initialize("Dxi3BvGT3mHiDC7B1YjeEuiUQKtWIeQNofT5FIIx", "QG352rxcZvLrYeV4jOCsIZvM8mIeQyhvHzDNINAb");

    VolTextObject = Parse.Object.extend("VolumeText");

    rangy.init();

    var table = $('#vol_table').DataTable()
    getVolTableRows(table)

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

    //polyboundRefresh = new OpenLayers.Strategy.Refresh({force: true});
    
    //var vertexStyle = {
    //    pointRadius: 10000,
    //    graphicName: 'cross'
    //}
    //var styleMap = new OpenLayers.StyleMap({
    //    "default": OpenLayers.Feature.Vector.style['default'],
    //    "vertex": vertexStyle
    //}, {extendDefault: false})
    //var styleMap = new OpenLayers.StyleMap(vertexStyle)

    annotationLayer = new OpenLayers.Layer.Vector("Annotations", {
        projection: new OpenLayers.Projection("EPSG:4326"),
        //styleMap: styleMap,
        style: { 'pointRadius':10, 'graphicName':'cross',
                 'fillColor':"#ee9900", 'fillOpacity':0.4, 'strokeOpacity':0.4
                 //'strokeLineCap':'square'
               } 
    })
   
    map.addLayers([gphy, annotationLayer]);

    annotationLayer.events.on({
        featureadded: annotationFeatureAdded,
        featuremodified: annotationFeatureModified,
        featureremoved: annotationFeatureRemoved
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
    
    var drawpoint = new OpenLayers.Control.DrawFeature(
        annotationLayer, OpenLayers.Handler.Point,
        {
            title: "Draw Point Feature",
            displayClass: "olControlDrawFeaturePoint",
            multi: false
        }
    );
    
    var edit = new OpenLayers.Control.ModifyFeature(annotationLayer, {
        title: "Modify Feature",
        displayClass: "olControlModifyFeature"
    });

    var del = new DeleteFeature(annotationLayer, {title: "Delete Feature"});
   

    panel.addControls([del, edit, draw, drawpoint]);
    map.addControl(panel);
    //map.setCenter(position, zoom);
    map.zoomToExtent(extent, true);
}

// Set 4-space indentation for vi
// vi:sw=4
