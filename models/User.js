const mongoose = require("mongoose");
//const uniqueValidator = require("mongoose-unique-validator");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
// const {throws} = require("assert");
const secret = require("../.config").secret;

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
		reservations: [{type: mongoose.Schema.Types.ObjectId, ref: "Lesson"}],
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

UserSchema.methods.generateJWT = function() {
	const today = new Date();
	const exp = new Date(today);
	exp.setDate(today.getDate() + 60);

	return jwt.sign(
		{
			id: this._id,
			username: this.username,
			exp: parseInt(exp.getTime() / 1_000),
		},
		secret,
	);
};

UserSchema.methods.toAuthJson = function() {
	return {
		username: this.username,
		email: this.email,
		image: this.image ||
		"https://static.productionready.io/images/smiley-cyrus.jpg",
		token: this.generateJWT(),
	};
};

UserSchema.methods.reserve = function(id) {
	if (this.reservations.indexOf(id) === -1) {
		this.reservations.push(id);
	}

	return this.save();
};

UserSchema.methods.unreserve = function(id) {
	this.reservations.remove(id);
	return this.save();
};

UserSchema.methods.isReserved = function(id) {
	return this.reservations.some(function(reservationId) {
		return reservationId.toString() === id.toString();
	});
};
UserSchema.methods.toProfileJSONFor = function() {
	return {
		username: this.username,
		bio: this.bio,
		image: this.image ||
		"https://static.productionready.io/images/smiley-cyrus.jpg",
	};
};

mongoose.model("User", UserSchema);
