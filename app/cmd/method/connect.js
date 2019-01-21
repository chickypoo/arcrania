const mysql = require('promise-mysql');
const sql_setting = require("../../config/sql.json");

module.exports = {
	database_connect : () => {
		let con = mysql.createConnection({
			host: sql_setting.host,
			user: sql_setting.user,
			password: sql_setting.pass,
			database: sql_setting.db
		});

		return con;
	}
};