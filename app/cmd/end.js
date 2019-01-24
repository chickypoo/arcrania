let nodemon = require('nodemon');
const staff = require('../config/staff.json');


module.exports.run = async (bot, msg, arg) => {
	let user_id = String(msg.author.id);
	if(staff.admin.indexOf(user_id) != -1) {
		msg.reply(msg.author);

		/*
		console.log(`${user_id} with admin privilege is going to evoke a shutdown`);
		nodemon.emit('quit');
		*/
	}
}

module.exports.help = {
	"name" : "shutdown"
}