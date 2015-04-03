"use strict"

var SpansObject;

var docgeoApplier;
var docgeoUnapplier;
var docgeoApplier_geo;
var docgeoUnapplier_geo;

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

    docgeoApplier_geo = rangy.createClassApplier(docgeoClass, {
        elementAttributes: {onclick:"spanClick(this)", geo:"1"},
        normalize: false
    });

    docgeoUnapplier_geo = rangy.createClassApplier(docgeoClass, {
        elementAttributes: {onclick:"spanClick(this)", geo:"1"},
        normalize: true
    });

    annotationClassesAndAppliers = [
        {clazz: docgeoClass, applier: docgeoApplier, geoapplier: docgeoApplier_geo, geounapplier: docgeoUnapplier_geo, unapplier: docgeoUnapplier}
    ]

    keyCodeActions = [
        {code: 65, action: addDocGeo},
        {code: 82, action: removeAnnotation}
    ]

    isDocGeo = true
}

// Set 4-space indentation for vi
// vi:sw=4
