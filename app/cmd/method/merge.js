module.exports = {
	merge_inventory : () => {
		let sql = require('./connect.js');

		let db, filtered, skip = false;

		sql.database_connect().then(con => {
			db = con;
			//Retrieve the view of merged inventory
			return db.query(`SELECT * FROM merge_inventory`);
		}).then(results => {
			//Record the merged inventory and fetch the amount in unfiltered inventory
			filtered = results;
			return db.query(`SELECT COUNT(inventory_id) AS amount FROM player_inventory`);
		}).then(res => {
			//Compare the # of data inside unfiltered inventory to filtered inventory
			if(res[0].amount != Object.keys(filtered).length) {
				//First push amount into unfiltered inventory from filtered inventory
				return db.query(`SELECT m.inventory_id, m.amount FROM merge_inventory m JOIN player_inventory p ON m.inventory_id = p.inventory_id WHERE m.amount <> p.amount`);
			}
			skip = true;
			return;
		}).then(res => {
			if(skip)
				return;
			//Compile the list to be updated here
			let sql_case = `amount = CASE inventory_id `;
			for(let key in res) {
				sql_case += `WHEN ${res[key].inventory_id} THEN ${res[key].amount} `;
			}
			sql_case += `ELSE amount END`;
			//Update inventory table to match view
			return db.query(`UPDATE player_inventory SET ${sql_case}`);
		}).then(() => {
			if(skip)
				return;
			//Extract all inventory_id to be deleted
			return db.query(`SELECT * FROM delete_inventory`);
		}).then(res => {
			if(skip)
				return;
			let iid_con = [];
			for(let key in res) {
				iid_con.push(res[key].inventory_id);
			}
			//Delete all excess inventory id in the player_inventory
			return db.query(`DELETE FROM player_inventory WHERE inventory_id IN (${iid_con.join(',')})`);
			//Finished cleaning up inventory. Closing up connection
			return db.end();
		}).catch(err => {
			if(db && db.end) db.end();
			console.log(err);
		});
	}
}