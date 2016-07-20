/**
 * @file:   A collection of classes supporting tree structures and operations
 * @module  tree
 */

/**
 * Create a new tree node and set its value and optionally user data.
 *
 * @param {String} [value]  The node value.
 * @param {object} [data]   User data for this tree node. You may store a
 *         reference to the corresponding object in the underlying document
 *         structure. E.g. a reference to a DOM element.
 *
 * @constructor
 */
function Node(value, data) {
    this.value = value;
    this.data = data;
    this.depth = 0;

    // this.par = undefined;
    // this.childidx = undefined;
    this.children = [];
}


/**
 * Append the given node as a child node.
 *
 * @param {object} child The new child node.
 */
Node.prototype.append = function(child) {
    if (child.par) {
        throw new Error('Cannot append a child which already has a parent');
    }

    child.depth = this.depth + 1;
    child.par = this;
    child.childidx = this.children.length;
    this.children.push(child);
};


/**
 * Invokes a callback for the node and all its child nodes in preorder
 * (document order).
 *
 * @param {function}    callback    The function which will be invoked for each
 *         node.
 * @param {object}      [T]         Context object bound to "this" when the
 *         callback is invoked.
 */
Node.prototype.forEach = function(callback, T) {
    callback.call(T, this);
    this.children.forEach(function(node) {
        node.forEach(callback, T);
    });
};


/**
 * Invokes a callback for the node and all its child nodes in postorder.
 *
 * @param {function}    callback    The function which will be invoked for each
 *         node.
 * @param {object}      [T]         Context object bound to "this" when the
 *         callback is invoked.
 */
Node.prototype.forEachPostorder = function(callback, T) {
    this.children.forEach(function(node) {
        node.forEachPostorder(callback, T);
    });
    callback.call(T, this);
};


/**
 * Equal to forEach except that the callback is not invoked for the context
 * node.
 *
 * @param {function}    callback    The function which will be invoked for each
 *         node.
 * @param {object}      [T]         Context object bound to "this" when the
 *         callback is invoked.
 */
Node.prototype.forEachDescendant = function(callback, T) {
    this.children.forEach(function(node) {
        node.forEach(callback, T);
    });
};


Node.prototype.toString = function() {
    return "Node(" + this.value + ")";
};

/**
 * Create a new Matching instance. Optionally specify the property used to
 * store partner links in target objects.
 *
 * @param {String}  [propname]  The name of the property which should be used
 *         on a tree.Node to store a reference to its partner.
 *
 * @constructor
 */
function Matching(propname) {
    this.propname = propname || 'partner';
}


/**
 * Return the partner of given object.
 *
 * @param {object} obj  The tree node whose partner should be returned.
 * @return {object} The object associated with the given tree node.
 */
Matching.prototype.get = function(obj) {
    return obj && obj[this.propname];
};


/**
 * Associate the given objects.
 *
 * @param {object} a    The first candidate for the new pair.
 * @param {object} b    The second candidate for the new pair.
 */
Matching.prototype.put = function(a, b) {
    if (a[this.propname] || b[this.propname]) {
        throw new Error('Cannot associate objects which are already part of a matching');
    }
    a[this.propname] = b;
    b[this.propname] = a;
};

Matching.prototype.toString = function(tree, indent) {
    if (indent === undefined) { indent = 1; }
    var a = tree,
        b = this.get(a),
        me = this,
        str = "",
        indentStr = Array(indent).join("  ");
    str += indentStr + a.toString();
    str += Array(50 - str.length).join(" ") + " -> ";
    str += indentStr + (b && b.toString());
    a.children.forEach(function(child) {
        str += "\n" + me.toString(child, indent + 1);
    });
    return str;
};

/**
 * Create a new secondary tree structure providing quick access to all
 * nodes of a generation.
 *
 * @param {object}  root        A tree.Node representing the root of the tree
 * @param {string}  [propname]  The name of the property which will be used to
 *         cache index values on tree.Node objects.
 *
 * @constructor
 */
function GenerationIndex(root, propname) {
    /**
     * The root of the tree.
     */
    this.root = root;

    /**
     * A property set at every indexed tree.Node indicating the position
     * of the node in the generation.
     */
    this.propname = propname || 'gencacheidx';

    /**
     * An array of arrays of tree.Nodes. Each containing tree.Nodes at the
     * same depth.
     */
    this.generations = [];

    /**
     * An array of booleans indexed by tree depth indicating whether all
     * nodes of a generation have been indexed.
     */
    this.gencomplete = [];

    /**
     * Return true if the whole generation index is complete.
     */
    this.idxcomplete = false;
}


/**
 * Build up complete generation index upfront if necessary.
 */
GenerationIndex.prototype.buildAll = function() {
    var i;
    if (!this.idxcomplete) {
        this.buildSubtree(this.root);
        for (i = 0; i < this.generations.length; i++) {
            this.gencomplete[i] = true;
        }
        this.idxcomplete = true;
    }
};


/**
 * Build up index of a subtree rooting at the specified node.
 */
GenerationIndex.prototype.buildSubtree = function(node) {
    var i, depth;
    depth = node.depth - this.root.depth;

    // Prepare generation structure
    if (this.generations.length === depth) {
        this.generations.push([]);
        this.gencomplete[depth] = true;
    }

    // Append current node
    node[this.propname] = this.generations[depth].length;
    this.generations[depth].push(node);

    // Recurse for children
    for (i = 0; i < node.children.length; i++) {
        this.buildSubtree(node.children[i]);
    }
};


/**
 * Extend generation index dynamically (not implemented yet)
 */
GenerationIndex.extendGeneration = function(depth, offset) {
    throw new Error('Dynamic index expansion not implemented yet');
};


/**
 * Return first node of the generation at depth.
 */
GenerationIndex.prototype.first = function(depth) {
    if (depth < this.generations.length) {
        // First node is in index, return it
        if (this.generations[depth].length > 0) {
            return this.generations[depth][0];
        }

        // Requested index is beyond upper bound of generation array
        // and the generation cache is complete.
        else if (this.gencomplete[depth]) {
            return undefined;
        }
    }

    if (this.idxcomplete) {
        // No need to attempt searching for the node if index is complete.
        return undefined;
    }
    else {
        // Extend generations
        // return this.extendGeneration(depth, refindex + offset);
        throw new Error('Dynamic index expansion not implemented yet');
    }
};


/**
 * Return last node of the generation at depth.
 */
GenerationIndex.prototype.last = function(depth) {
    if (depth < this.generations.length) {
        // Generation cache is complete. Return last item.
        if (this.gencomplete[depth]) {
            return this.generations[depth][this.generations[depth].length - 1];
        }
    }

    if (this.idxcomplete) {
        // No need to attempt searching for the node if index is complete.
        return undefined;
    }
    else {
        // Extend generations
        // return this.extendGeneration(depth, refindex + offset);
        throw new Error('Dynamic index expansion not implemented yet');
    }
};


/**
 * Return a tree.Node with the same depth at the given offset relative to
 * the given reference node.
 *
 * @param {object}  refnode   The reference tree.Node
 * @param {number}  offset    An integer value
 *
 * @returns {object} tree.Node or undefined
 */
GenerationIndex.prototype.get = function(refnode, offset) {
    var depth, refindex;

    offset = offset || 0;

    if (refnode === this.root) {
        // Return the root node if refnode is equal to the tree root.
        if (offset === 0) {
            return refnode;
        }
        else {
            return undefined;
        }
    }

    depth = refnode.depth - this.root.depth;
    if (depth < this.generations.length) {
        // If we already have cached some nodes in this tree depth, go for
        // them.
        if (refnode.hasOwnProperty(this.propname)) {
            refindex = refnode[this.propname];
            if (this.generations[depth][refindex] !== refnode) {
                throw new Error('GenerationIndex index corrupt');
            }

            // Requested offset lies beyond lower bound. Return undefined.
            if (refindex + offset < 0) {
                return undefined;
            }

            // Requested offset is already indexed. Return it.
            else if (refindex + offset < this.generations[depth].length) {
                return this.generations[depth][refindex + offset];
            }

            // Requested index is beyond upper bound of generation array
            // and the generation cache is complete.
            else if (this.gencomplete[depth]) {
                return undefined;
            }

            // Requested index is beyand upper bound of generation array
            // but the generation cache is not yet complete. Fall through
            // to code outside below.
        }

    }

    if (this.idxcomplete) {
        // No need to attempt searching for the node if index is complete.
        return undefined;
    }
    else {
        // Extend generations
        // return this.extendGeneration(depth, refindex + offset);
        throw new Error('Dynamic index expansion not implemented yet');
    }
};


/**
 * Create a new secondary tree structure providing quick access to all
 * nodes in document order.
 *
 * @param {object}  root      A tree.Node representing the root of the tree
 * @param {string}  [propname]  The name of the property which will be used to
 *         cache index values on tree.Node objects.
 *
 * @constructor
 */
function DocumentOrderIndex(root, propname) {
    /**
     * The root of the tree.
     */
    this.root = root;

    /**
     * A property set at every indexed tree.Node indicating the position
     * of the node in the generation.
     */
    this.propname = propname || 'docorderidx';

    /**
     * Return true if the whole generation index is complete.
     */
    this.idxcomplete = false;

    /**
     * Array of nodes in document order.
     */
    this.nodes = [];
}


/**
 * Build up complete document order index upfront if necessary.
 */
DocumentOrderIndex.prototype.buildAll = function() {
    if (!this.idxcomplete) {
        this.root.forEach(function(node) {
            node[this.propname] = this.nodes.length;
            this.nodes.push(node);
        }, this);
        this.idxcomplete = true;
    }
};


/**
 * Return a tree.Node at the offset relative to the given reference node.
 *
 * @param {object}  refnode   The reference tree.Node
 * @param {number}  offset    An integer value
 *
 * @returns {object} tree.Node or undefined
 */
DocumentOrderIndex.prototype.get = function(refnode, offset) {
    var depth, refindex;

    offset = offset || 0;

    // If we already have cached some nodes in this tree depth, go for
    // them.
    if (refnode.hasOwnProperty(this.propname)) {
        refindex = refnode[this.propname];
        if (this.nodes[refindex] !== refnode) {
            throw new Error('Document order index corrupt');
        }

        // Requested offset lies beyond lower bound. Return undefined.
        if (refindex + offset < 0) {
            return undefined;
        }

        // Requested offset is already indexed. Return it.
        else if (refindex + offset < this.nodes.length) {
            return this.nodes[refindex + offset];
        }

        // Requested index is beyond upper bound of index. Fall through to
        // code outside the if below.
    }

    if (this.idxcomplete) {
        // No need to attempt searching for the node if index is complete.
        return undefined;
    }
    else {
        // Extend document order index
        // return this.extendIndex(depth, refnode, index);
        throw new Error('Dynamic index expansion not implemented yet');
    }
};


/**
 * Return the size of a subtree when traversed using this index
 * Static function: must work also with nodes which are not part of the index.
 */
DocumentOrderIndex.prototype.size = function(refnode) {
    var i=0;
    refnode.forEach(function(n) {
        i++;
    });
    return i;
};


/**
 * Return an array of all nodes contained in the subtree under refnode in
 * document order index.
 * Static function: must work also with nodes which are not part of the index.
 */
DocumentOrderIndex.prototype.flatten = function(refnode) {
    var result = [];
    refnode.forEach(function(n) {
        result.push(n);
    });
    return result;
};


/**
 * Simple subtree hashing algorithm.
 *
 * @param {function}    HashAlgorithm   Constructor function for the hash
 * @param {object}      nodehashindex   An instance of :js:class:`NodeHashIndex`
 *
 * @constructor
 */
function SimpleTreeHash(HashAlgorithm, nodehashindex) {
    this.HashAlgorithm = HashAlgorithm;
    this.nodehashindex = nodehashindex;
}


/**
 * Calculate hash value of subtree
 *
 * @param {object}  node    A tree.Node specifying the root of the subtree.
 * @param {object}  [hash]  If provided, use this hash instance. Otherwise
 *         create a new one.
 */
SimpleTreeHash.prototype.process = function(node, hash) {
    hash = hash || new this.HashAlgorithm();

    node.forEach(function(n) {
        var nodehash = this.nodehashindex.get(n);
        hash.update(nodehash);
    }, this);

    return hash.get();
};


/**
 * Create new instance of a node hash index.
 *
 * @param {object}  nodehash    An object implementing the node-hashing method
 *         for the underlying document. E.g. an instance of
 *         :js:class:`DOMNodeHash`.
 * @param {string}  [propname]  The name of the property which will be used to
 *         cache the hash values on tree.Node objects. Defaults to 'nodehash'.
 *
 * @constructor
 */
function NodeHashIndex(nodehash, propname) {
    this.nodehash = nodehash;
    this.propname = propname || 'nodehash';
}


/**
 * Return the hash value for the given node.
 *
 * @param {object}  node    A tree.Node.
 *
 * @return {number} Hash value of the tree node.
 */
NodeHashIndex.prototype.get = function(node) {
    if (node) {
        if (!(node.hasOwnProperty(this.propname))) {
            node[this.propname] = this.nodehash.process(node);
        }

        return node[this.propname];
    }
};


/**
 * Create new instance of a tree hash index.
 *
 * @param {object}  treehash    An object implementing the tree-hashing method.
 *         E.g. an instance of
 *         :js:class`SimpleTreeHash`.
 * @param {string}  [propname]  The name of the property which will be used to
 *         cache the hash values on tree.Node objects. Defaults to 'treehash'.
 *
 * @constructor
 */
function TreeHashIndex(treehash, propname) {
    this.treehash = treehash;
    this.propname = propname || 'treehash';
}


/**
 * Return the hash value for the subtree rooted at the given node.
 *
 * @param {object}  node    A tree.Node.
 *
 * @return {number} Hash value of the subtree rooted at the given node.
 */
TreeHashIndex.prototype.get = function(node) {
    if (node) {
        if (!(node.hasOwnProperty(this.propname))) {
            node[this.propname] = this.treehash.process(node);
        }

        return node[this.propname];
    }
};


/**
 * Construct a new tree anchor object. The tree anchor is a pure data object
 * used to point to a position in the tree. The object has the following
 * properties:
 *
 * base
 *      The base node of the anchor. If the anchor points at the root node,
 *      base is undefined.
 *
 * target
 *      The target node this anchor points at. This node is a child node of
 *      base. This property may be undefined if the anchor points before or
 *      after the children list.
 *
 * index
 *      The index into the children list of the base node. This property is
 *      undefined when the anchor points at the root of the tree.
 *
 * @param {tree.Node} root      The root node of the tree.
 * @param {tree.Node} [base]    The base node for this anchor. If index is left
 *         out, this parameter specifies the target node.  Otherwise it
 *         specifies the parent node of the target pointed at by index.
 * @param {Number} [index]      The child index of the target node.
 *
 * @constructor
 */
function Anchor(root, base, index) {
    if (!root) {
        throw new Error('Parameter error: need a reference to the tree root');
    }

    if (!base || (root === base && typeof index === 'undefined')) {
        this.base = undefined;
        this.target = root;
        this.index = undefined;
    }
    else if (typeof index === 'undefined') {
        this.base = base.par;
        this.target = base;
        this.index = base.childidx;
    }
    else {
        this.base = base;
        this.target = base.children[index];
        this.index = index;
    }
}


exports.Node = Node;
exports.Matching = Matching;
exports.GenerationIndex = GenerationIndex;
exports.DocumentOrderIndex = DocumentOrderIndex;
exports.SimpleTreeHash = SimpleTreeHash;
exports.NodeHashIndex = NodeHashIndex;
exports.TreeHashIndex = TreeHashIndex;
exports.Anchor = Anchor;
