const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const slug = require("slug");
const User = mongoose.model("User");

const LessonSchema = new mongoose.Schema(
	{
		slug: {type: String, lowercase: true, unique: true},
		title: String,
		description: String,
		body: String,
		favoritesCount: {type: Number, default: 0},
		tagList: [{type: String}],
		comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
		teacher: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
	},
	{timestamps: true},
);

LessonSchema.plugin(uniqueValidator, {message: "is already taken"});

LessonSchema.pre(
	"validate",
	function(next) {
		this.slugify();

		next();
	},
);

LessonSchema.methods.slugify = function() {
	this.slug = slug(this.title);
};

LessonSchema.methods.updateReservationsCount = function() {
	const lesson = this;

	return User.count({reservations: {$in: [lesson._id]}}).then(function(count) {
		lesson.reservationCount = count;

		return lesson.save();
	});
};

LessonSchema.methods.toJSONFor = function(user) {
	return {
		slug: this.slug,
		title: this.title,
		description: this.description,
		body: this.body,
		createdAt: this.createdAt,
		updatedAt: this.updatedAt,
		tagList: this.tagList,
		reserved: user ? user.isReserved(this._id) : false,
		reservationsCount: this.reservationsCount,
		teacher: this.teacher.toProfileJSONFor(user),
	};
};

mongoose.model("Lesson", LessonSchema);
