/**
 * @fileoverview This module contains a factory class for the JsonML patch format.
 */

/** @ignore */
var jmlpayload = require('./jmlpayload');
/** @ignore */
var deltamod = require('./delta');
/** @ignore */
var contextdelta= require('./contextdelta');
/** @ignore */
var jmldelta = require('./jmldelta');
/** @ignore */
var deltadocmod = require('./delta-doc');


/**
 * Return shared payload handler.
 */
var payloadHandler = new jmlpayload.JMLPayloadHandler('patch');


/**
 * Create a new instance of the factory class supporting the JsonML patch file
 * format.
 *
 * @constructor
 */
function DeltaJMLFactory() {
}


/**
 * Return a new empty delta document.
 *
 * @param {tree.Matching} [matching] A matching produced by some tree diff algorithm.
 *
 * @return {Object} A delta document initialized with default values.
 */
DeltaJMLFactory.prototype.createEmptyDocument = function(matching) {
    return new deltadocmod.DeltaDocument('jml', 'untitled-diff.jml',
        payloadHandler.createDocument(),
        undefined,
        undefined,
        undefined,
        matching
    );
};


/**
 * Return a delta document loaded from the given string or JsonML object.
 *
 * @param {String|Document} jmldoc  A document containing delta operations.
 * @param {Object} fragAdapter      A document fragemnt adapter. Use the object
 *         produced by createFragmentAdapter method from a document factory.
 * @param {String}          [name]  The file name of the document.
 *
 * @return {Object} A delta document initialized with default values.
 */
DeltaJMLFactory.prototype.loadDocument = function(jmldoc, fragAdapter, name) {
    var src, operations, entries = [], i,
        deltaAdapter = new jmldelta.JMLDeltaAdapter(fragAdapter);

    if (typeof jmldoc === 'string') {
        src = jmldoc;
        jmldoc = payloadHandler.parseString(jmldoc);
    }

    return new deltadocmod.DeltaDocument('jml', name,
        jmldoc,
        [],
        deltaAdapter.adaptDocument(jmldoc),
        src,
        undefined
    );
};


/**
 * Return an initialized collector instance.
 *
 * @param {Object} deltadoc      The delta document produced by createEmptyDocument
 *         or loadDocument.
 * @param {Object} doc           The document as created by the
 *         loadOriginalDocument method of the document factory class.
 * @param {functio} [equals]    The equality test-function used during diffing.
 *
 * @return {delta.DeltaCollector} An initialized collector instance.
 */
DeltaJMLFactory.prototype.createCollector = function(deltadoc, doc, equals) {
    var collector, root, partner;

    if (!doc.tree) {
        throw new Error('Parameter error: Document objects must have a tree property');
    }
    if (!doc.valueindex) {
        throw new Error('Parameter error: Document objects must have a valueindex property');
    }

    root = doc.tree;
    partner = deltadoc.matching.get(root);
    if (!partner) {
        throw new Error('Parameter error: Matching does not contain tree root');
    }

    collector = new deltamod.DeltaCollector(deltadoc.matching, root, partner);

    if (equals) {
        collector.equals = equals;
    }

    return collector;
}


/**
 * Return an initialized context delta detacher instance.
 *
 * @param {Object} doc           The document as created by the
 *         loadOriginalDocument method of the document factory class.
 *
 * @return {contextdelta.Detacher} Initialized detacher instance.
 */
DeltaJMLFactory.prototype.createDetacher = function(doc) {
    var contextgen = new contextdelta.ContextGenerator(4, doc.nodeindex, doc.valueindex);
    return new contextdelta.Detacher(contextgen);
}


/**
 * Return an initialized context delta attacher instance
 *
 * @param {Object} resolver An instance of ContextResolver. Use the output of
 *         createResolver method from the resolver factory.
 *
 * @return {delta.Attacher} Initialized attacher instance.
 */
DeltaJMLFactory.prototype.createAttacher = function(resolver) {
    return new deltamod.Attacher(resolver);
}


/**
 * Return an initialized delta adapter instance.
 *
 * @param {Object} fragAdapter      A document fragemnt adapter. Use the object
 *         produced by createFragmentAdapter method from a document factory.
 *
 * @return {jmldelta.JMLDeltaAdapter} Initialized instance of the proper delta
 *         adapter.
 */
DeltaJMLFactory.prototype.createDeltaAdapter = function(fragAdapter) {
    return new jmldelta.JMLDeltaAdapter(fragAdapter);
}


/**
 * Serialize the data property into the src string and return it. Also store
 * the source into the ``src`` property of ``deltadoc``.
 *
 * @param {Object} deltadoc A populated delta document.
 *
 * @return {String} The JsonML representation of the delta document as a string.
 */
DeltaJMLFactory.prototype.serializeDocument = function(deltadoc) {
    deltadoc.src = payloadHandler.serializeToString(deltadoc.data);

    return deltadoc.src;
};

exports.DeltaJMLFactory = DeltaJMLFactory;
