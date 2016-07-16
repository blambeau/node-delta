/**
 * @file:   Payload handler for stringified JsonML data
 *
 * @module  jmlpayload
 */

/** @ignore */
var jml = require('./jml').JsonML;

/**
 * @constructor
 */
function JMLPayloadHandler(defaultRootTag) {
    if (defaultRootTag === undefined) {
        defaultRootTag = "html";
    }
    this.defaultRootTag = defaultRootTag;
}

JMLPayloadHandler.prototype.serializeToString = function(data) {
    return JSON.stringify(data);
};

JMLPayloadHandler.prototype.parseString = function(string) {
    return JSON.parse(string);
};

JMLPayloadHandler.prototype.createDocument = function() {
    return [ this.defaultRootTag ];
};

JMLPayloadHandler.prototype.createTreeFragmentAdapter = function(doc, type) {
    if (type === 'jml') {
        return new exports.JMLFragmentAdapter();
    }
    else {
        return new exports.SerializedJMLFragmentAdapter();
    }
};


/**
 * @constructor
 */
function JMLFragmentAdapter(docadapter) {
    this.docadapter = docadapter;
}

JMLFragmentAdapter.prototype.adapt = function(doc, nodes, deep) {
    var i, result = [];

    for (i = 0; i < nodes.length; i++) {
        jml.appendChild(result, jml.clone(nodes[i].data, deep));
    }

    return result;
};

JMLFragmentAdapter.prototype.importFragment = function(jmlnodes, deep) {
    var result = [], node, i;

    for (i=0; i<jmlnodes.length; i++) {
        node = this.docadapter.adapt(jmlnodes[i]);
        if (node) {
            result.push(node);
        }
    }

    return result;
};

/**
 * @constructor
 */
function SerializedJMLFragmentAdapter() {
}

SerializedJMLFragmentAdapter.prototype.adapt = function(nodes, deep) {
    var object = JMLFragmentAdapter.prototype.adapt.call(this, nodes, deep);
    return JSON.stringify(object);
};

exports.JMLPayloadHandler = JMLPayloadHandler;
exports.JMLFragmentAdapter = JMLFragmentAdapter;
exports.SerializedJMLFragmentAdapter = SerializedJMLFragmentAdapter;
