var util       = require('util');
var glob       = require('glob');
var fs         = require('fs');
var parslets   = require('parslets');
var toker      = require('toker');
var scss       = require('./scss');
var lexOptions = { identifierStart: /[\.#@$_a-zA-Z]/, identifierPart: /([#$_a-zA-Z-]|[0-9])/, keywords: ['@mixin', '@include', '@extend'] };

function obsoleteMixins(t) {
	return new parslets.TokenWrapper(t).consume(parslets.search(scss.mixin)).filter(function(token) {
		return token.comment;
	}).filter(function(token) {
		return token.comment.lexeme.indexOf('obsolete') !== -1;
	}).reduce(function(prev, curr) {
		prev[curr.name] = {
			arguments: (curr.arguments || []).map(function(curr) {
				return {
					name: curr.name.lexeme,
					value: curr.defaultValue.lexeme
				}
			}),
			selectors: curr.body.filter(function(token) {
				return token.type === 'ruleset'
			}).reduce(function(prev, curr) {
				return prev.concat(curr.selector);
			}, [])
		};

		return prev;
	}, {});
}

function obsoleteIncludes(tokens, mixins) {
	var includes = new parslets.TokenWrapper(tokens).consume(parslets.search(scss.include)).map(function(include) {
		include.arguments = (include.arguments || []).map(function(curr) {
			return curr.lexeme
		});

		return include;
	});

	var blackList = [];

	for (var i = includes.length - 1; i >= 0; i--) {
		var include = includes[i],
			mixin = mixins[include.name];

		if (mixin) {
			blackList.push.apply(blackList, mixin.selectors.map(function(sel) {
				for (var i = include.arguments.length - 1; i >= 0; i--) {
					var arg = include.arguments[i];

					sel = sel.replace('#{' + mixin.arguments[i].name + '}', arg);
				};

				return sel;
			}));
		}
	}

	return blackList;
}

var lint = module.exports.lint = function(pattern) {
	var blackList = [];

	glob.sync(pattern, {}).forEach(function(file) {
		var tokens = new toker.LexicalAnalyzer(fs.readFileSync(file, 'utf8'), lexOptions).getTokens(),
			obj = obsoleteMixins(tokens);

		if (Object.keys(obj).length !== 0) {
			blackList.push.apply(blackList, [obsoleteIncludes(tokens, obj)]);
		}

		tokens = null;
	});

	return blackList;
}
