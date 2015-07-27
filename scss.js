var parslets = require('parslets');

function content() {
	return this.consume(include, parslets.sequence(declaration), ruleset);
}

function wrapper_content() {
	this.consume('{');
	var ret = this.consume(parslets.sequence(content));
	this.consume('}');
	return ret;
}

function declaration() {
	this.consumeIf(':comment');

	var name = this.consume(':identifier'),
		value;

	this.consume(':');

	 value = this.consume(parslets.sequence(function() {
	  return this.consume(function() {
	   return {
	    name: this.consume(':identifier'),
	    arguments: this.consume(parslets.actualArgs)
	   }
	  }, function() {
	   return this.consume(parslets.arith({postfixOps: ['px', 'em', '%', '!important']}))
	  })
	 }));

	this.consumeIf(';');
	this.consumeIf(':comment');

	return {
		//type: 'declaration',
		//name: name.lexeme,
		//value: value
	}
}

function ruleset() {
	this.consumeIf(':comment');

	return {
		type: 'ruleset',
		selector: this.consume(selector_tree),
		body: this.consume(wrapper_content)
	}
}

function pseudo_selector() {
	var sel = this.consume(selector);

	this.consume(':');

	return sel + ':' + this.consume(':identifier').lexeme;
}

function selector() {
	this.consumeIf(':comment');

	return this.consume(function() {
		var t;
		return [
			this.consume(':identifier').lexeme,
			this.consume('{').lexeme,
			this.consume(':identifier').lexeme,
			this.consume('}').lexeme,
			(t = this.consumeIf(':identifier')) ? t.lexeme : ''
		].join('');
	}, function() {
		return [
			this.consume('[').lexeme,
			this.consume(':identifier').lexeme,
			this.consume(':operator').lexeme,
			this.consume(parslets.lValue).lexeme,
			this.consume(']').lexeme
		].join('');
	}, function() {
		return [
			this.consume('[').lexeme,
			this.consume(':identifier').lexeme,
			this.consume(']').lexeme
		].join('');
	}, function() {
		return this.consume(':identifier').lexeme;
	});
}

function selector_group() {
	this.consumeIf(':comment');

	var group = [this.consume(pseudo_selector, selector)],
		s, operator;

	while(!this.eof()) {
		if (operator = this.consumeIf(':operator')) {
			group.push(operator);
		}

		if (s = this.consumeIf(pseudo_selector, selector)) {
			group.push(s);
		}

		if (!s) {
			break;
		}
	}

	return group.reduce(function(prev, curr) {
		return prev + (curr.lexeme ? curr.lexeme : curr);
	}, '');
}

function selector_tree() {
	this.consumeIf(':comment');

	var tree = [],
		group;

	while(group = this.consume(selector_group)) {
		tree.push(group);

		if (this.is(',')) {
			this.consume();

			if (this.is('{')) {
				break;
			}
		} else {
			break;
		}
	}

	return tree;
}

var mixin = module.exports.mixin = function() {
	var comment = this.consumeIf(':comment');

	this.consume('@mixin');

	var ret =  {
		type: 'mixin',
		name: this.consume(':identifier').lexeme,
		arguments: this.consumeIf(parslets.formalArgs),
		body: this.consume(wrapper_content),
		comment: comment
	};



	return ret;
};

var include = module.exports.include = function() {
	this.consume('@include');

	var ret = {
		type: 'include',
		name: this.consume(':identifier').lexeme,
		arguments: this.consumeIf(parslets.actualArgs)
	};

	this.consumeIf(';');

	return ret;
};