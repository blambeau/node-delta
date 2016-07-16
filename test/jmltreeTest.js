var jmltree = require('../lib/delta/jmltree');

function adapt(jsonml) {
    return (new jmltree.JMLTreeAdapter()).adapt(jsonml);
}

exports.testEmptyDoc = function(test) {
    var jsonml = [ "article" ];

    var tree = adapt(jsonml);

    test.equal(tree.data, jsonml);
    test.equal(tree.value, "article");
    test.equal(tree.children.length, 0);
    test.equal(tree.depth, 0);
    test.done();
};

exports.testSimpleDoc = function(test) {
    var child = [ "p", "Hello World!" ];
    var jsonml = [ "article", { "uuid": "aj12d" }, child ];

    var tree = adapt(jsonml);

    test.equal(tree.data, jsonml);
    test.equal(tree.value, "article");
    test.equal(tree.children.length, 1);
    test.equal(tree.depth, 0);

    var treeChild = tree.children[0];
    test.equal(treeChild.data, child);
    test.equal(treeChild.value, "p");
    test.equal(treeChild.children.length, 1);
    test.equal(treeChild.depth, 1);

    var treeLeaf = treeChild.children[0];
    test.equal(treeLeaf.data, "Hello World!");
    test.equal(treeLeaf.value, "Hello World!");
    test.equal(treeLeaf.children.length, 0);
    test.equal(treeLeaf.depth, 2);

    test.done();
};
