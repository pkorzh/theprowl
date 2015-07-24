var parslets = require('parslets');
var arith    = parslets.arith({ postfixOps: ['++', '--', 'px', 'em', '%'] });

function cssBlockParslet() {
	var body = [];

	this.consume('{');

	while(!this.consumeIf('}')) {
		var property = this.consume(':identifier'),
			value;

		if (this.consumeIf(':')) {
			value = this.consume(arith.additiveExpressionParslet);
		} else {
			value = this.consume(cssBlockParslet);
		}

		body.push({
			property: property,
			value: value
		});
	}

	return body;
}

function mixinParslet() {
	var comment = this.consumeIf(':comment');

	this.consume('@mixin');

	return {
		name: this.consume(':identifier'),
		arguments: this.consume(parslets.namedArgumentsParslet),
		block: this.consume(cssBlockParslet),
		comment: comment
	}
}

module.exports.mixinsParslet = function() {
	var mixins = [];

	while(!this.eof()) {
		var mixin = this.consumeIf(mixinParslet);

		if (mixin) {
			mixins.push(mixin);
		} else {
			this.consume();
		}
	}

	return mixins;
}

function actualArguments() {
	var arguments = [];

	this.consume('(');

	while(!this.consumeIf(')')) {
		arguments.push(this.consume(arith.additiveExpressionParslet));

		this.consumeIf(',');
	}

	return arguments;
}

function includeParslet() {
	this.consume('@include');

	return {
		name: this.consume(':identifier'),
		arguments: this.consumeIf(actualArguments)
	};
}

module.exports.includesParslet = function() {
	var includes = [];

	while(!this.eof()) {
		var include = this.consumeIf(includeParslet);

		if (include) {
			includes.push(include);
		} else {
			this.consume();
		}
	}

	return includes;
}

