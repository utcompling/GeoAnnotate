var map, annotation;

var place_selection = [];

var re = /<place>[^<]+<\/place>/g;


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

function placeClicked(textarea, place_range){
    place_selection = place_range
    textarea.selectionStart = place_range[0]
    textarea.selectionEnd = place_range[1]+1
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

function addPlace() {
    var textarea1 = document.getElementById("col2text")
    var start = textarea1.selectionStart;
    // obtain the index of the last selected character
    var finish = textarea1.selectionEnd;
    // obtain the selected text
    var sel = textarea1.value.substring(start, finish);
    document.getElementById("col2text").value = replaceRange(textarea1.value, start, finish, "<place>"+sel+"</place>")
}

function removePlace() {
    window.alert("Remove Place Action Needed")
}

function saveFeatures() {
    var annotation_layer = map.getLayersByName("Annotations")

    for(var a = 0; a < annotation_layer[0].features.length; a++ ){
        var layer_geom = annotation_layer[0].features[a].geometry.transform("EPSG:900913", "EPSG:4326")
        var geoJSONText = geoJSON.write(annotation_layer[0].features[a].geometry.transform("EPSG:900913", "EPSG:4326"));
        testObject.save({"GEOJSON": layer_geom})
        window.alert(geoJSONText)
    };

}

function init() {

    var extent = new OpenLayers.Bounds(
        -11593508, 5009847, -11505759, 6057774
    );

    Parse.initialize("Dxi3BvGT3mHiDC7B1YjeEuiUQKtWIeQNofT5FIIx", "QG352rxcZvLrYeV4jOCsIZvM8mIeQyhvHzDNINAb");

    TestObject = Parse.Object.extend("GeoJson");
    testObject = new TestObject();

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