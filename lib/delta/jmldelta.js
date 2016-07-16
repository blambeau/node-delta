/**
 * @fileoverview    Adapter class for JsonML based delta format
 */

/** @ignore */
var deltamod = require('./delta');

/** @ignore */
var jml = require('./jml').JsonML;

/** @ignore */
var contextdelta = require('./contextdelta');

TYPE_TAGS = {};
TYPE_TAGS[deltamod.UPDATE_NODE_TYPE] = 'node';
TYPE_TAGS[deltamod.UPDATE_FOREST_TYPE] = 'forest';
TYPE_TAGS.node = deltamod.UPDATE_NODE_TYPE;
TYPE_TAGS.forest = deltamod.UPDATE_FOREST_TYPE;

/**
 * @constructor
 */
function JMLDeltaAdapter(fragmentadapter) {
    this.fragmentadapter = fragmentadapter;
}


JMLDeltaAdapter.prototype.adaptDocument = function(doc) {
    var operations = [], root, nodes, n, i, me = this;

    // loop through children and add documents and options to delta class
    jml.eachChild(doc, function(n){
        operations.push(me.adaptOperation(n, TYPE_TAGS[jml.getTagName(n)]));
    });

    return operations;
};


JMLDeltaAdapter.prototype.adaptOperation = function(element, type) {
    var path = jml.getAttribute(element, 'path'),
        children, remove, insert, i, n, head, tail, body;

    switch (type) {
        case deltamod.UPDATE_NODE_TYPE:
        case deltamod.UPDATE_FOREST_TYPE:
            break;
        default:
            throw new Error('Encountered unsupported change type');
    }

    // Parse path
    if (path === '') {
        path = [];
    } else {
        path = path.split('/').map(function(component) {
            return parseInt(component, 10);
        });
    }

    children = jml.getChildren(element);
    node = this.nextElement('context', children);
    head = this.parseContext(node);

    node = this.nextElement('remove', children);
    remove = this.fragmentadapter.importFragment(jml.getChildren(node));

    node = this.nextElement('insert', children);
    insert = this.fragmentadapter.importFragment(jml.getChildren(node));

    node = this.nextElement('context', children);
    tail = this.parseContext(node);

    return new contextdelta.DetachedContextOperation(type, path, remove, insert, head, tail);
};

JMLDeltaAdapter.prototype.nextElement = function(tag, domnodes) {
    var node = domnodes.shift();
    while (node && jml.isElement(node)) {
        if (jml.getTagName(node) === tag) {
            break;
        }
        node = domnodes.shift();
    }
    return node;
};

JMLDeltaAdapter.prototype.nextText = function(domnodes) {
    var node = domnodes.shift();
    while(node && jml.isElement(node)) {
        node = domnodes.shift();
    }
    return node;
};

JMLDeltaAdapter.prototype.parseContext = function(node) {
    var children = jml.getChildren(node);
    var text = this.nextText(children);
    if (text) {
        return text.split(';').map(function(component) {
            component = component.trim();
            if (component.length) {
                return parseInt(component, 16);
            }
        });
    }
};

/**
 * Populate the document with settings and operations from delta.
 */
JMLDeltaAdapter.prototype.populateDocument = function(doc, operations) {
    var i, element;
    for (i = 0; i < operations.length; i++) {
        element = this.constructOperationElement(doc, operations[i]);
        jml.appendChild(doc, element);
    }
};


JMLDeltaAdapter.prototype.constructOperationElement = function(doc, op) {
    var tag = TYPE_TAGS[op.type],
        deep = (op.type !== deltamod.UPDATE_NODE_TYPE),
        element = [tag],
        remove = ['remove'],
        insert = ['insert'],
        head = ['context'],
        tail = ['context'],
        oldcontent, newcontent;

    jml.setAttribute(element, 'path', op.path.join('/'));

    jml.appendChild(head, this.formatFingerprint(op.head));
    jml.appendChild(element, head);

    if (op.remove) {
        oldcontent = this.fragmentadapter.adapt(doc, op.remove, deep);
        jml.appendChildren(remove, oldcontent);
        jml.appendChild(element, remove);
    }

    if (op.insert) {
        newcontent = this.fragmentadapter.adapt(doc, op.insert, deep);
        jml.appendChildren(insert, newcontent);
        jml.appendChild(element, insert);
    }

    jml.appendChild(tail, this.formatFingerprint(op.tail));
    jml.appendChild(element, tail);

    return element;
};

JMLDeltaAdapter.prototype.formatFingerprint = function(parts) {
    return parts.map(function(n) {
        return n ? n.toString(16) : '';
    }).join(';');
};


exports.JMLDeltaAdapter = JMLDeltaAdapter;
