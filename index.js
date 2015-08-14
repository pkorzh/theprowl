var util       = require('util');
var glob       = require('glob');
var fs         = require('fs');
var parslets   = require('parslets');
var toker      = require('toker');
var scss       = require('./scss');
var ast        = require('./ast');
var lexOptions = { identifierStart: /[\.#@$_a-zA-Z]/, identifierPart: /([#$_a-zA-Z-]|[0-9])/, keywords: ['@mixin', '@include', '@extend'] };

function obsoleteNodes(t) {
	return new parslets.TokenWrapper(t).consume(parslets.search(scss.content)).filter(function(node) {
		return node.obsolete;
	});
}

function includeNodes(t) {
	return new parslets.TokenWrapper(t).consume(parslets.search(scss.include)).reduce(function(prev, curr) {
		group = prev[curr.name] || (prev[curr.name] = []);

		group.push(curr);

		return prev;
	}, {});
}

var lint = module.exports.lint = function(pattern) {
	var blackList = [];

	glob.sync(pattern, {}).forEach(function(file) {
		var tokens = new toker.LexicalAnalyzer(fs.readFileSync(file, 'utf8'), lexOptions).getTokens(),
			list   = obsoleteNodes(tokens);

		var includes = includeNodes(tokens);

		list.forEach(function(node) {
			if (node instanceof ast.Ruleset) {
				blackList.push.apply(blackList, node.selectors());
			} else if (node instanceof ast.Mixin) {
				if (includes[node.name]) {
					var mixin = node;

					for (var i = includes[node.name].length - 1; i >= 0; i--) {
						var include = includes[node.name][i];

						blackList.push.apply(blackList, mixin.selectors.map(function(sel) {
							for (var i = include.arguments.length - 1; i >= 0; i--) {
								sel = sel.replace('#{' + mixin.arguments[i].name + '}', include.arguments[i]);
							}
							return sel;
						}));
					}
				}
			}
		});

		tokens = null;
	});

	return blackList;
}