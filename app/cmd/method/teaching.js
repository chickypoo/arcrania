const { lstatSync, readdirSync} = require('fs');
const { join} = require('path');
const isDirectory = source => lstatSync(source).isDirectory();
const getDirectories = source => readdirSync(source).map(name => join(source, name)).filter(isDirectory);
const passive_path = '/home/arcrania/config/skill/passive/';
const fx = require('./modules.js');

module.exports = {
	teaching : (func1) => {
		let sql = require('./connect.js');

		let db, skip, trainee;

		sql.database_connect().then(con => {
			db = con;
			//Grab the next one in queue who is ready for learning
			return db.query(`SELECT * FROM upgrade_queue WHERE learning_finish <= CURRENT_TIMESTAMP() ORDER BY learning_finish ASC LIMIT 1`);
		}).then(res => {
			//Grab the player's passive skill tree
			if(!res[0]) {
				skip = true;
				return;
			}
			trainee = res[0];
			return db.query(`SELECT * FROM player_passive WHERE player_id = '${trainee.player_id}'`);
		}).then(res => {
			if(skip) return;
			//Checks if player can add the skill
			result = func1(trainee.skill_id, res[0]);
			let sqlTier;
			//Return money if cant
			//Update the skill if can
			if(result[0]) {
				switch(result[1]) {
					case 1 : sqlTier = 'passive_t1'; break;
					case 2 : sqlTier = 'passive_t2'; break;
					case 3 : sqlTier = 'passive_t3'; break;
					case 4 : sqlTier = 'passive_t4'; break;
					case 5 : sqlTier = 'lifeskill'; break;
				}
				return db.query(`UPDATE player_passive SET ${sqlTier} = '${result[2]}' WHERE player_id = '${trainee.player_id}'`);
			}
			else
				return db.query(`UPDATE player_currency SET gold = gold + ${result[1]} WHERE player_id = '${trainee.player_id}'`);
		}).then(() => {
			if(skip) return;
			//Remove from the list
			return db.query(`DELETE FROM upgrade_queue WHERE learning_finish <= CURRENT_TIMESTAMP() ORDER BY learning_finish ASC LIMIT 1`);
		}).then(() => {
			//Close database connection
			return db.end();
		}).catch(e => {
			if(db && db.end) db.end();
			console.log(e);
		});
	},

	ableToLearn : (cid, p) => {
		//Determine if its learn or upgrade
		let upgrading = false, max, refund, tier = 0, breakout, pStr = '';
		for(let ppStr in p)
			if(p[ppStr])
				pStr += p[ppStr];
		if(pStr.indexOf(cid) !== -1)
			upgrading = true;
		if(upgrading) {
			let sub = getDirectories(passive_path),pc;
			for(let i = 0; i < sub.length; i++) {
				pc = require('require-all')({
					dirname: sub[i]
				});
				for(const k in pc) {
					for(let key in pc[k]) {
						//If Upgrading
						if(key === cid.substring(0,1)) {
							max = pc[k][key].max[fx.b32_to_dec(cid.substring(1,2))];
							refund = pc[k][key].cost[fx.b32_to_dec(cid.substring(1,2))];
							breakout = true;
						}
						if(breakout) break;
					}
					if(breakout) break;
				}
				if(breakout) break;
			}
			//Find the current level of the skill
			let index = pStr.indexOf(cid);
			let level = fx.b32_to_dec(pStr.substring(index+2, index+5));
			//Cannot level anymore, refund the gold
			if(level >= max)
				return [false, refund];
			else {
				let upgradedStr;
				for(let ppStr in p) {
					if(p[ppStr] && (p[ppStr].indexOf(cid) !== -1)) {
							upgradedStr = p[ppStr].substring(0,p[ppStr].indexOf(cid)+2) + fx.dec_to_b32(fx.b32_to_dec(p[ppStr].substring(p[ppStr].indexOf(cid)+2, p[ppStr].indexOf(cid)+5))+1).padStart(3,'0') + p[ppStr].substring(p[ppStr].indexOf(cid)+5,p[ppStr].length);
							break;
					}
					tier++
				}
				return [true, tier, upgradedStr];
			}
		} else {
			//Append the skill to the proper tier
			if(cid.charAt(0) == 'A' || cid.charAt(0) == 'B')
				tier = 1;
			else if(cid.charAt(0) == 'C' || cid.charAt(0) == 'D')
				tier = 2;
			else if(cid.charAt(0) == 'E' || cid.charAt(0) == 'F')
				tier = 3;
			else if(cid.charAt(0) == 'G' || cid.charAt(0) == 'H')
				tier = 4;
			else if(cid.charAt(0) == 'I' || cid.charAt(0) == 'J')
				tier = 5;
			let curTier = 0, appendedStr;
			for(let pp in p) {
				if(curTier++ != tier) continue;
				appendedStr = `${p[pp] ? p[pp] : ''}${cid}001`;
			}
			return [true, tier, appendedStr];
		}
	}
}