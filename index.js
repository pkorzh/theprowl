var util       = require('util');
var glob       = require('glob');
var fs         = require('fs');
var parslets   = require('parslets');
var toker      = require('toker');
var scss       = require('./scss');
var lexOptions = { identifierStart: /[\.#@$_a-zA-Z]/, identifierPart: /([#$_a-zA-Z-]|[0-9])/, keywords: ['@mixin', '@include', '@extend'] };

function tokens(pattern) {
	return glob.sync(pattern, {}).reduce(function(prev, file) {
		return prev.concat(new toker.LexicalAnalyzer(fs.readFileSync(file, 'utf8'), lexOptions).getTokens());
	}, []);
}

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

function lint(parslets) {
	var t = tokens('./*.scss'),
		oMixins = obsoleteMixins(t),
		includes = new parslets.TokenWrapper(t).consume(parslets.search(scss.include)).map(function(include) {
			include.arguments = (include.arguments || []).map(function(curr) {
				return curr.lexeme
			});

			return include;
		});

	var blackList = [];

	for (var i = includes.length - 1; i >= 0; i--) {
		var include = includes[i],
			mixin = oMixins[include.name];

		if (mixin) {
			blackList.push.apply(blackList, mixin.selectors.map(function(sel) {
				for (var i = include.arguments.length - 1; i >= 0; i--) {
					var arg = include.arguments[i];
					debugger;

					sel = sel.replace('#{' + mixin.arguments[i].name + '}', arg);
				};

				return sel;
			}));
		}
	}

	return blackList;
}