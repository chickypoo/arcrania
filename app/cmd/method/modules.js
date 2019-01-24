module.exports = {
	format_shift_left : (value, length) => {
		return value.toString().padStart(Math.min(value.toString().length, length), ' ');
	}
};