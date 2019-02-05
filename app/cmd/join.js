let sql = require("./method/connect.js");

module.exports.run = async (bot, msg, arg) => {
	let user_id = String(msg.author.id);

	let db, reply, skip;
	sql.database_connect().then(con => {
		db = con;
		return db.query(`SELECT player_id FROM player_info WHERE player_id = '${user_id}'`);
	}).then(rows => {
		//If returned result is NULL, then there is no such player registered.
		//Therefore they will be registered into the database.
		if(!rows[0]) {
			reply = `<@${user_id}>\n\`\`\`You have been born into the world of Arcrania\`\`\``;
			return db.query(`INSERT INTO player_info (player_id) VALUES ('${user_id}')`);
		} else {
			reply = `<@${user_id}>\n\`\`\`You are already inside the world of Arcrania.\`\`\``;
			skip = true;
			return;
		}
	}).then(() => {
		if(skip) return;
		return db.query(`INSERT INTO player_passive (player_id) VALUES ('${user_id}')`);
	}).then(() => {
		if(skip) return;
		return db.query(`INSERT INTO player_stat (player_id) VALUES ('${user_id}')`);
	}).then(() => {
		if(skip) return;
		return db.query(`INSERT INTO player_active (player_id) VALUES ('${user_id}')`);
	}).then(() => {
		msg.channel.send(reply);
		return db.end();
	}).catch(err => {
		if(db && db.end) db.end();
		console.log(err);
	});
}

module.exports.help = {
	"name" : "join"
}