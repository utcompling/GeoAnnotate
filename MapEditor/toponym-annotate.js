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
    addAnnotation(placeClass, placeApplier)
}

function addPerson() {
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

}

// Set 4-space indentation for vi
// vi:sw=4
