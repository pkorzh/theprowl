var Node = function(extras) {
	extras = extras || {};

	this.obsolete = extras.comment ? extras.comment.indexOf('obsolete') !== -1 : false;
};

var Mixin = exports.Mixin = function(name, extras) {
	Node.call(this, extras);

	this.name = name;

	this.arguments = extras.arguments ? extras.arguments.map(function(curr) {
			return {
				name: curr.name.lexeme,
				value: curr.defaultValue ? curr.defaultValue.lexeme : null
			}
		}) 
		:
		[];

	this.selectors = extras.body ? extras.body.filter(function(node) {
			return node instanceof Ruleset;
		}).reduce(function(prev, curr) {
			prev.push.apply(prev, curr.selectors());

			return prev;
		}, [])
		:
		[];
};
Mixin.prototype = new Node;
Mixin.prototype.constructor = Mixin;


var Include = exports.Include = function(name, extras) {
	Node.call(this, extras);

	this.name = name;

	this.arguments = extras.arguments ? extras.arguments.map(function(argument) {
			return argument.lexeme;
		})
		:
		[];
};
Include.prototype = new Node;
Include.prototype.constructor = Include;


var Ruleset = exports.Ruleset = function(selectors, extras) {
	Node.call(this, extras);

	this._selectors = selectors;
	this.body = extras.body ? extras.body : [];
};
Ruleset.prototype = new Node;
Ruleset.prototype.constructor = Ruleset;

Ruleset.prototype.selectors = function() {
	var retVal = [];

	for (var i = this._selectors.length - 1; i >= 0; i--) {
		var topSel = this._selectors[i];

		retVal.push(topSel);

		for (var j = this.body.length - 1; j >= 0; j--) {
			var child = this.body[j];

			if (child instanceof Ruleset) {
				var childSels = child.selectors();

				for (var k = childSels.length - 1; k >= 0; k--) {
					retVal.push(topSel + ' ' + childSels[k]);
				}
			}
		}
	}

	return retVal;
};