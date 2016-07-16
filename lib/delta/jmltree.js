/**
 * @file:   Adapter class converting an JsonML document into a simple tree
 *          structure suitable for comparison using the XCC tree diff
 *          algorithm.
 *
 * @module  jmltree
 */

/** @ignore */
var tree = require('./tree');
var jml  = require('./jml').JsonML;

/**
 * A function that visits every node of a JsonML tree in document order. Calls
 * a callback with the visited node and the result of the callback from
 * visiting the parent node.
 *
 * @param node      The JsonML node representing the starting point for the
 *                  mapping operation
 * @param callback  function(node, parents_result)
 * @param presult   Internal use.
 */
function mapjml(node, callback, presult) {
    var result = callback(node, presult);
    if (jml.isElement(node)) {
        jml.eachChild(node, function(child){
            mapjml(child, callback, result);
        });
    }
    return result;
}


/**
 * @constructor
 */
function JMLTreeAdapter() {
}


/**
 * Create node wrappers for the specified element or text node and all its
 * descentants and return toplevel wrapper.
 **/
JMLTreeAdapter.prototype.adapt = function(element) {
    return mapjml(element, function(node, wrappedParent) {
        var content = jml.isElement(node) ? jml.getTagName(node) : node;
        var wrappedNode = new tree.Node(content, node);
        if (wrappedParent) {
            wrappedParent.append(wrappedNode);
        }
        return wrappedNode;
    });
};


/**
 * @constructor
 */
function JMLNodeHash(HashAlgorithm) {
    this.HashAlgorithm = HashAlgorithm;
}


JMLNodeHash.prototype.ELEMENT_PREFIX = '\x00\x00\x00\x01';
JMLNodeHash.prototype.ATTRIBUTE_PREFIX = '\x00\x00\x00\x02';
JMLNodeHash.prototype.TEXT_PREFIX = '\x00\x00\x00\x03';
JMLNodeHash.prototype.SEPARATOR = '\x00\x00';

JMLNodeHash.prototype.process = function(node, hash) {
    var jmlnode = node.data;

    hash = hash || new this.HashAlgorithm();

    if (jml.isElement(jmlnode)) {
        this.processElement(jmlnode, hash);
    } else {
        this.processText(jmlnode, hash);
    }

    return hash.get();
};


JMLNodeHash.prototype.processElement = function(jmlnode, hash) {
    var attrqns, attrnodes, i, n, qn;

    // Process tag
    hash.update(this.ELEMENT_PREFIX);
    hash.update(jml.getTagName(jmlnode));
    hash.update(this.SEPARATOR);

    // Process attributes
    if (jml.hasAttributes(jmlnode)) {
        attrqns = [];
        attrnodes = {};
        jml.eachAttribute(jmlnode, function(key, value){
            attrqns.unshift(key);
            attrnodes[key] = value;
        });
        attrqns = attrqns.sort();
        attrqns.forEach(function(qn) {
            this.processAttribute(qn, attrnodes[qn], hash);
        }, this);
    }
};


JMLNodeHash.prototype.processAttribute = function(qn, value, hash) {
    hash.update(this.ATTRIBUTE_PREFIX);
    hash.update(qn);
    hash.update(this.SEPARATOR);
    hash.update(value);
};


JMLNodeHash.prototype.processText = function(jmlnode, hash) {
    hash.update(this.TEXT_PREFIX);
    hash.update(jmlnode);
};


exports.JMLTreeAdapter = JMLTreeAdapter;
exports.JMLNodeHash = JMLNodeHash;
