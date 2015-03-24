"use strict"

var SpansObject;

var placeApplier;
var placeUnapplier;

var personApplier;
var personUnapplier;

var placeClass = "place"
var personClass = "person"
var annotationClasses = [placeClass, personClass]

function addPlace() {
    destroyMapFeatures()
    addAnnotation(placeClass, placeApplier)
}

function addPerson() {
    destroyMapFeatures()
    addAnnotation(personClass, personApplier)
}

function init() {
    commonMapInit()

    SpansObject = Parse.Object.extend("NESpans");

    placeApplier = rangy.createClassApplier(placeClass, {
        elementAttributes: {onclick:"spanClick(this)"},
        normalize: false
    });
    placeUnapplier = rangy.createClassApplier(placeClass, {
        elementAttributes: {onclick:"spanClick(this)"},
        normalize: true
    });

    personApplier = rangy.createClassApplier(personClass, {
        elementAttributes: {onclick:"spanClick(this)"},
        normalize: false
    });
    personUnapplier = rangy.createClassApplier(personClass, {
        elementAttributes: {onclick:"spanClick(this)"},
        normalize: true
    });

    annotationClassesAndAppliers = [
        {clazz: placeClass, applier: placeApplier, unapplier: placeUnapplier},
        {clazz: personClass, applier: personApplier, unapplier: personUnapplier}
    ]

    keyCodeActions = [
        {code: 65, action: addPlace},
        {code: 69, action: addPerson},
        {code: 82, action: removeAnnotation}
    ]
}

// Set 4-space indentation for vi
// vi:sw=4
