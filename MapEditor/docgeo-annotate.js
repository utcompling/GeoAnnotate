"use strict"

var SpansObject;

var docgeoApplier;
var docgeoUnapplier;

var docgeoClass = "docgeo"
var annotationClasses = [docgeoClass]

function addDocGeo() {
    addAnnotation(docgeoClass, docgeoApplier)
}

function init() {
    commonMapInit()

    SpansObject = Parse.Object.extend("DocGeoSpans");

    docgeoApplier = rangy.createClassApplier(docgeoClass, {
        elementAttributes: {onclick:"spanClick(this)"},
        normalize: false
    });
    docgeoUnapplier = rangy.createClassApplier(docgeoClass, {
        elementAttributes: {onclick:"spanClick(this)"},
        normalize: true
    });

    annotationClassesAndAppliers = [
        {clazz: docgeoClass, applier: docgeoApplier, unapplier: docgeoUnapplier}
    ]

    keyCodeActions = [
        {code: 65, action: addDocGeo},
        {code: 82, action: removeAnnotation}
    ]

    isDocGeo = true
}

// Set 4-space indentation for vi
// vi:sw=4
