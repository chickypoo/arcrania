let sql = require('./method/connect.js');

module.exports.help = {
	"name" : "run"
}

module.exports.run = async (bot, msg, arg) => {
	let userID = msg.author.id, db,skip;

	sql.database_connect().then(con => {
		db = con;
		return db.query(`SELECT * FROM player_info WHERE player_id = '${userID}'`);
	}).then(res => {
		if(!res[0]) {
			skip = true;
			return;
		}
		//Player can only flee when fighting
		if(res[0].player_act !== 'fighting') {
			msg.reply(`You are not fighting anything at the moment.`);
			skip = true;
			return;
		}
		//Remove player from battle
		return db.query(`DELETE FROM battle WHERE player_id = '${userID}'`);
	}).then(() => {
		if(skip) return;
		//Give player a recovering debuff
		return db.query(`UPDATE player_info SET player_act = 'recovering' WHERE player_id = '${userID}'`);
	}).then(() => {
		if(skip) return;
		//Timeout the recovery in 10 minutes in timer
		msg.reply(`You have fled the battle. You currently are now recoverying for 10 minutes. (Cannot do any action that requires work)`);
		return db.query(`INSERT INTO timer VALUES ('${userID}',TIMESTAMPADD(MINUTE,10,CURRENT_TIMESTAMP()),'recovery')`);
	}).then(() => {
		//Close database connection
		return db.end();
	}).catch(e => {
		if(db && db.end) db.end();
		console.log(e);
	});
}