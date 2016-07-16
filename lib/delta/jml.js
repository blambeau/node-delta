/*
    jsonml-utils.js
    JsonML manipulation methods

    Created: 2006-11-09-0116
    Modified: 2012-11-03-2051
    Adapted for node-delta: 2016-07-16-1513

    Copyright (c)2006-2012 Stephen M. McKamey
    Changes for node-delta (c)2016 Bernard Lambeau
    Distributed under The MIT License: http://jsonml.org/license
*/

var JsonML = JsonML || {};

exports.JsonML = JsonML;

(function(JsonML) {
    'use strict';

    /* Utility Methods -------------------------*/

    /**
     * Determines if the value is an Array
     *
     * @private
     * @param {*} val the object being tested
     * @return {boolean}
     */
    var isArray = Array.isArray || function(val) {
        return (val instanceof Array);
    };

    /**
     * @param {*} jml
     * @return {boolean}
     */
    var isFragment = JsonML.isFragment = function(jml) {
        return isArray(jml) && (jml[0] === '');
    };

    /**
     * @param {*} jml
     * @return {string}
     */
    var getTagName = JsonML.getTagName = function(jml) {
        return jml[0] || '';
    };

    /**
     * @param {*} jml
     * @return {boolean}
     */
    var isElement = JsonML.isElement = function(jml) {
        return isArray(jml) && ('string' === typeof jml[0]);
    };

    /**
     * @param {*} jml
     * @return {boolean}
     */
    var isAttributes = JsonML.isAttributes = function(jml) {
        return !!jml && ('object' === typeof jml) && !isArray(jml);
    };

    /**
     * @param {*} jml
     * @return {boolean}
     */
    var hasAttributes = JsonML.hasAttributes = function(jml) {
        if (!isElement(jml)) {
            throw new SyntaxError('invalid JsonML');
        }

        return isAttributes(jml[1]);
    };

    /**
     * @param {*} jml
     * @param {boolean} addIfMissing
     * @return {object}
     */
    var getAttributes = JsonML.getAttributes = function(jml, addIfMissing) {
        if (hasAttributes(jml)) {
            return jml[1];
        }

        if (!addIfMissing) {
            return undefined;
        }

        // need to add an attribute object
        var name = jml.shift();
        var attr = {};
        jml.unshift(attr);
        jml.unshift(name||'');
        return attr;
    };

    /**
     * Calls `callback` with each (key,value) pair in its attributes,
     * if any.
     *
     * @pre jml must be an element, see isElement
     * @param {*} jml
     * @param {function(key,value)} callback
     */
    var eachAttribute = JsonML.eachAttribute = function(jml, callback) {
        var attrs = getAttributes(jml, false);
        if (attrs) {
            for (var k in attrs) {
                if (attrs.hasOwnProperty(k)) {
                   var v = attrs[k];
                   callback(k, v);
                }
            }            
        }        
    };

    /**
     * @param {*} jml
     * @param {object} attr
     */
    var addAttributes = JsonML.addAttributes = function(jml, attr) {
        if (!isElement(jml) || !isAttributes(attr)) {
            throw new SyntaxError('invalid JsonML');
        }

        if (!isAttributes(jml[1])) {
            // just insert attributes
            var name = jml.shift();
            jml.unshift(attr);
            jml.unshift(name||'');
            return;
        }

        // merge attribute objects
        var old = jml[1];
        for (var key in attr) {
            if (attr.hasOwnProperty(key)) {
                old[key] = attr[key];
            }
        }
    };

    /**
     * @param {*} jml
     * @param {string} key
     * @return {string|number|boolean}
     */
    var getAttribute = JsonML.getAttribute = function(jml, key) {
        if (!hasAttributes(jml)) {
            return undefined;
        }
        return jml[1][key];
    };

    /**
     * @param {*} jml
     * @param {string} key
     * @param {string|number|boolean} value
     */
    var setAttribute = JsonML.setAttribute = function(jml, key, value) {
        getAttributes(jml, true)[key] = value;
    };

    /**
     * @param {*} jml
     * @param {array|object|string} child
     */
    var appendChild = JsonML.appendChild = function(parent, child) {
        if (!isArray(parent)) {
            throw new SyntaxError('invalid JsonML');
        }

        if (isArray(child) && child[0] === '') {
            // result was multiple JsonML sub-trees (i.e. documentFragment)
            child.shift();// remove fragment ident

            // directly append children
            while (child.length) {
                appendChild(parent, child.shift(), arguments[2]);
            }

        } else if (child && 'object' === typeof child) {
            if (isArray(child)) {
                if (!isElement(child)) {
                    throw new SyntaxError('invalid JsonML');
                }

                if (typeof arguments[2] === 'function') {
                    // onAppend callback for JBST use
                    (arguments[2])(parent, child);
                }

                // result was a JsonML node
                parent.push(child);

            } else if (JsonML.isRaw(child)) {

                // result was a JsonML node
                parent.push(child);

            } else {
                // result was JsonML attributes
                addAttributes(parent, child);
            }

        } else if ('undefined' !== typeof child && child !== null) {

            // must convert to string or JsonML will discard
            child = String(child);

            // skip processing empty string literals
            if (child && parent.length > 1 && 'string' === typeof parent[parent.length-1]) {
                // combine strings
                parent[parent.length-1] += child;
            } else if (child || !parent.length) {
                // append
                parent.push(child);
            }
        }
    };

    var appendChildren = JsonML.appendChildren = function(jml, children) {
        children.forEach(function(child){
            appendChild(jml, child);
        });
    };

    /**
     * @param {*} jml
     * @return {array}
     */
    var getChildren = JsonML.getChildren = function(jml) {
        if (hasAttributes(jml)) {
            return jml.slice(2);
        }

        return jml.slice(1);
    };

    /**
     * Calls `callback` for each child of `jml`.
     *
     * @pre `jml` must be an element, see isElement
     * @param {*} jml
     * @param {function} callback
     */
    var eachChild = JsonML.eachChild = function(jml, callback) {
        if (!isElement(jml)) {
            throw new SyntaxError('invalid JsonML');
        }
        var start = hasAttributes(jml) ? 2 : 1;
        for (var i=start; i<jml.length; i++) {
            callback(jml[i]);
        }
    };

    var clone = JsonML.clone = function(jml, deep) {
        if (isElement(jml)) {
            var cloned = [ getTagName(jml) ];
            eachAttribute(jml, function(k,v){
                setAttribute(cloned, k, v);
            });
            if (deep) {
                eachChild(jml, function(child){
                    appendChild(cloned, clone(child, deep));
                });
            }
            return cloned;
        } else {
            return "" + jml;
        }
    };

})(JsonML);