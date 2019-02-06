module.exports = {
	format_shift_left : (value, length) => value.toString().padStart(Math.min(value.toString().length, length), ' '),

	dec_to_b32 : dec => dec.toString(32).toUpperCase(),

	b32_to_dec : b32 => parseInt(b32, 32),

	within : (low, high, val) => ((val >= low) && (val <= high)),

	random : (low, high) => Math.floor(Math.random() * (high - low + 1) + low),

	cookLvlNext : (lvl) => {
		let chef = require('../../config/recipe/recipe.json').cooking_level;
		let bexp = chef.bexp;
		return bexp + chef.iexp * Math.floor(lvl / chef.iper);
	}
};