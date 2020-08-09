const mongoose = require("mongoose");
//const uniqueValidator = require("mongoose-unique-validator");
const crypto = require("crypto");

const UserSchema = new mongoose.Schema(
	{
		username: {
			type: String,
			lowercase: true,
			unique: true,
			required: [true, "can't be blank"],
			match: [/^[a-zA-Z0-9]+$/, "is invalid"],
			index: true,
		},
		email: {
			type: String,
			lowercase: true,
			unique: true,
			required: [true, "can't be blank"],
			match: [/\S+@\S+\.\S+/, "is invalid"],
			index: true,
		},
		bio: String,
		image: String,
		hash: String,
		salt: String,
	},
	{timestamps: true},
);

UserSchema.methods.setPassword = function(password) {
	this.salt = crypto.randomBytes(16).toString("hex");
	this.hash = crypto.pbkdf2Sync(password, this.salt, 10_000, 512, "sha512").toString(
		"hex",
	);
};

UserSchema.methods.validPassword = function(password) {
	const hash = crypto.pbkdf2Sync(password, this.salt, 10_000, 512, "sha512").toString(
		"hex",
	);
	return this.hash === hash;
};

mongoose.model("User", UserSchema);
