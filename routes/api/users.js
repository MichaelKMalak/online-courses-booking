const mongoose = require("mongoose");
const router = require("express").Router();
//const passport = require("passport");
const User = mongoose.model("User");
const auth = require("../auth");

router.get(
	"/user",
	auth.required,
	function(req, res, next) {
		User.findById(req.payload.id).then(function(user) {
			if (!user) {
				return res.sendStatus(401);
			}

			return res.json({user: user.toAuthJSON()});
		}).catch(next);
	},
);

module.exports = router;
