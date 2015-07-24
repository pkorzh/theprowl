var glob       = require('glob');
var fs         = require('fs');
var parslets   = require('parslets');
var toker      = require('toker');
var scss       = require('./scss-parslets');
var lexOptions = { identifierStart: /[\.#@$_a-zA-Z]/, identifierPart: /([$_a-zA-Z-]|[0-9])/, keywords: ['@mixin', '@include', '@extend'] };

function _tokens(pattern) {
	return glob.sync(pattern, {}).reduce(function(prev, file) {
		return prev.concat(new toker.LexicalAnalyzer(fs.readFileSync(file, 'utf8'), lexOptions).getTokens());
	}, []);
}

function _obsolete(tokens) {
	tokens.index = 0;
	return new parslets.ParsletCombinator(scss.mixinsParslet).parse(tokens).filter(function (token) {
		return token.comment && token.comment.lexeme;
	}).filter(function(token) {
		return token.comment.lexeme.indexOf('@obsolete') !== -1;
	}).reduce(function(obj, token) {
		obj[token.name.lexeme] = token;

		return obj;
	}, {});
}

function _invocation(tokens) {
	tokens.index = 0;
	return new parslets.ParsletCombinator(scss.includesParslet).parse(tokens).map(function(token) {
		return token;
	});
}

module.exports.lint = function(pattern) {
	var tokens = _tokens(pattern),
		obsolete = _obsolete(tokens),
		invocation = _invocation(tokens);

	invocation.forEach(function(token) {
		if (obsolete[token.name.lexeme]) {
			console.log(token.name.lexeme);
		}
	})
};