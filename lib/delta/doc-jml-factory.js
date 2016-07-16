/**
 * @fileoverview This module provides the factory class for XML documents
 */


/** @ignore */
var jmlpayload = require('./jmlpayload');
/** @ignore */
var fnv132 = require('./fnv132');
/** @ignore */
var tree = require('./tree');
/** @ignore */
var jmltree = require('./jmltree');
/** @ignore */
var jmlhandler = require('./jmlhandler');
/** @ignore */
var docmod = require('./doc');

/** Shared payload handler instance */
var payloadHandler = new jmlpayload.JMLPayloadHandler();

/** shared tree adapter instance */
var treeAdapter = new jmltree.JMLTreeAdapter();

/**
 * Create a new instance of the XML document factory class.
 * @constructor
 */
function DocumentJMLFactory() {
}


/**
 * Return a new empty document.
 *
 * @return {Object} A document initialized with default values.
 */
DocumentJMLFactory.prototype.createEmptyDocument = function() {
    return new docmod.Document('jml', 'untitled.jml',
        payloadHandler.createDocument(),
        undefined,
        '',
        undefined,
        undefined,
        undefined
    );
};


/**
 * Return new document loaded from a DOMDocument.
 *
 * @param {String|Document} jmldoc  The underlying DOMDocument.
 * @param {String}          [name]  The file name of the document.
 *
 * @return {Object} A document initialized from the given DOMDocument.
 */
DocumentJMLFactory.prototype.loadInputDocument = function(jmldoc, name) {
    var src, result, valueindex, treevalueindex;

    valueindex = new tree.NodeHashIndex(new jmltree.JMLNodeHash(fnv132.Hash));
    treevalueindex = new tree.TreeHashIndex(
            new tree.SimpleTreeHash(fnv132.Hash, valueindex));

    if (typeof jmldoc === 'string') {
        src = jmldoc;
        jmldoc = payloadHandler.parseString(jmldoc);
    }

    return new docmod.Document('jml', name,
        jmldoc,
        treeAdapter.adapt(jmldoc),
        src,
        valueindex,
        treevalueindex,
        undefined
    );
}


/**
 * Return new document loaded from a DOMDocument. Use this method for loading
 * the original (unchanged) document and supply it as doc1 to diff.Diff or
 * patch.Patch.
 *
 * @param {String|Document} jmldoc  The underlying DOMDocument.
 * @param {String}          [name]  The file name of the document.
 *
 * @return {Object} A document initialized from the given DOMDocument.
 */
DocumentJMLFactory.prototype.loadOriginalDocument = function(jmldoc, name) {
    var result = DocumentJMLFactory.prototype.loadInputDocument(jmldoc, name);

    var nodeindex = new tree.DocumentOrderIndex(result.tree);
    nodeindex.buildAll();
    result.nodeindex = nodeindex;

    return result;
}


/**
 * Return the proper document fragment adapter for the given deltadoc type.
 *
 * @param {String} type The document type of the document this adapter
 *         should be used for.
 *
 * @return {FragmentAdapter} A suitable fragment adapter for the given type.
 */
DocumentJMLFactory.prototype.createFragmentAdapter = function(type) {
    if (type === 'jml') {
        return new jmlpayload.JMLFragmentAdapter(treeAdapter);
    }
    else {
        return new jmlpayload.SerializedJMLFragmentAdapter(treeAdapter);
    }
}


/**
 * Return the proper node equality test function.
 *
 * @param {object} doc1 The original document
 * @param {object} doc2 The changed document
 *
 * @return {function} node equality test function.
 */
DocumentJMLFactory.prototype.createNodeEqualityTest = function(doc1, doc2) {
    if (!doc1.valueindex || !doc2.valueindex) {
        throw new Error('Parameter error: Document objects must have valueindex property');
    }

    // Use value index for node-comparison
    return function(a, b) {
        return doc1.valueindex.get(a) === doc2.valueindex.get(b);
    }
}


/**
 * Return the proper subtree equality test.
 *
 * @param {object} doc1 The original document
 * @param {object} doc2 The changed document
 *
 * @return {function} node equality test function.
 */
DocumentJMLFactory.prototype.createTreeEqualityTest = function(doc1, doc2) {
    if (!doc1.treevalueindex || !doc2.treevalueindex) {
        throw new Error('Parameter error: Document objects must have treevalueindex property');
    }

    // Use value index for node-comparison
    return function(a, b) {
        return doc1.treevalueindex.get(a) === doc2.treevalueindex.get(b);
    }
}


/**
 * Return proper value checker.
 *
 * @param {object} doc The original document
 *
 * @return {function} value comparison function.
 */
DocumentJMLFactory.prototype.createValueTest = function(doc) {
    if (!doc.valueindex) {
        throw new Error('Parameter error: Document objects must have valueindex property');
    }

    // Use value index for node-comparison
    return function(a, b) {
        return doc.valueindex.get(a) === b;
    }
};


/**
 * Returns delta operation handler factory.
 *
 * @return {object} Instance of the handler factory class suitable for JsonML
 *         documents.
 */
DocumentJMLFactory.prototype.createHandlerFactory = function() {
    return new jmlhandler.JMLOperationHandlerFactory();
}


/**
 * Serialize the data property into the src string and return it. Also store
 * the source into the ``src`` property of ``deltadoc``.
 *
 * @param {Object} deltadoc A populated document.
 *
 * @return {String} The JsonML representation of the document as a string.
 */
DocumentJMLFactory.prototype.serializeDocument = function(doc) {
    doc.src = payloadHandler.serializeToString(doc.data);

    return doc.src;
};


exports.DocumentJMLFactory = DocumentJMLFactory;
