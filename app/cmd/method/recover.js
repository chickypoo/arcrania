module.exports = {
	recover : () => {
		let sql = require('./connect.js'), db,skip, a = new Array();

		sql.database_connect().then(con => {
			db = con;
			return db.query(`SELECT player_id FROM timer WHERE what = 'recovery' AND expiry <= CURRENT_TIMESTAMP()`);
		}).then(res => {
			if(!res[0]) {
				skip = true;
				return;
			}
			//Compile all list of recoveree
			for(let i = 0; i < res.length; i++) {
				a.push(`'${res[i].player_id}'`);
			}
			return db.query(`DELETE FROM timer WHERE what = 'recovery' AND player_id IN (${a.join(',')})`);
		}).then(() => {
			if(skip) return;
			return db.query(`UPDATE player_info SET player_act = 'free' WHERE player_id IN (${a.join(',')})`);
		}).then(() => {
			return db.end();
		}).catch(e => {
			if(db && db.end) db.end();
			console.log(e);
		});
	},

	wild : () => {
		let sql = require('./connect.js'),db,skip,a = new Array();

		sql.database_connect().then(con => {
			db = con;
			return db.query(`SELECT battle_id FROM battle_entity WHERE battle_id NOT IN (SELECT DISTINCT battle_id FROM battle)`);
		}).then(res => {
			if(!res[0]) {
				skip = true;
				return;
			}
			for(let i = 0; i < res.length; i++) 
				a.push(res[i].battle_id);
			return db.query(`DELETE FROM battle_entity WHERE battle_id IN (${a.join(',')})`);
		}).then(() => {
			return db.end();
		}).catch(e => {
			if(db && db.end) db.end();
			console.log(e);
		});
	}
}