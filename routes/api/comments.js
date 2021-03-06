const router = require("express").Router();
const mongoose = require("mongoose");
const User = mongoose.model("User");
const Comment = mongoose.model("Comment");
const auth = require("../auth");

router.param(
	"comment",
	function(req, res, next, id) {
		Comment.findById(id).then(function(comment) {
			if (!comment) {
				return res.sendStatus(404);
			}

			req.comment = comment;

			return next();
		}).catch(next);
	},
);

router.get(
	"/:lesson/comments",
	auth.optional,
	function(req, res, next) {
		Promise.resolve(req.payload ? User.findById(req.payload.id) : null).then(function(
			user,
		) {
			return req.lesson.populate({
				path: "comments",
				populate: {
					path: "author",
				},
				options: {
					sort: {
						createdAt: "desc",
					},
				},
			}).execPopulate().then(function({}) {
				return res.json({
					comments: req.lesson.comments.map(function(comment) {
						return comment.toJSONFor(user);
					}),
				});
			});
		}).catch(next);
	},
);

router.post(
	"/:lesson/comments",
	auth.required,
	function(req, res, next) {
		User.findById(req.payload.id).then(function(user) {
			if (!user) {
				return res.sendStatus(401);
			}

			const comment = new Comment(req.body.comment);
			comment.lesson = req.lesson;
			comment.author = user;

			return comment.save().then(function() {
				req.lesson.comments.push(comment);

				return req.lesson.save().then(function({}) {
					res.json({comment: comment.toJSONFor(user)});
				});
			});
		}).catch(next);
	},
);

router.delete(
	"/:lesson/comments/:comment",
	auth.required,
	function(req, res, {}) {
		if (req.comment.author.toString() === req.payload.id.toString()) {
			req.lesson.comments.remove(req.comment._id);
			req.lesson.save().then(
				Comment.find({_id: req.comment._id}).remove().exec(),
			).then(function() {
				res.sendStatus(204);
			});
		} else {
			res.sendStatus(403);
		}
	},
);

module.exports = router;
