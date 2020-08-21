const router = require("express").Router();
//const passport = require("passport");
const mongoose = require("mongoose");
const Lesson = mongoose.model("Lesson");
const User = mongoose.model("User");
const auth = require("../auth");

router.param(
	"lesson",
	function(req, res, next, slug) {
		Lesson.findOne({slug}).populate("teacher").then(function(lesson) {
			if (!lesson) {
				return res.sendStatus(404);
			}

			req.lesson = lesson;

			return next();
		}).catch(next);
	},
);

router.get(
	"/",
	auth.optional,
	function(req, res, next) {
		let query = {};
		let limit = 20;
		let offset = 0;

		if (typeof req.query.limit !== "undefined") {
			limit = req.query.limit;
		}

		if (typeof req.query.offset !== "undefined") {
			offset = req.query.offset;
		}

		if (typeof req.query.tag !== "undefined") {
			query.tagList = {"$in": [req.query.tag]};
		}

		Promise.all([
			req.query.teacher ? User.findOne({username: req.query.teacher}) : null,
			req.query.reserved ? User.findOne({username: req.query.reserved}) : null,
		]).then(function(results) {
			const teacher = results[0];
			const reserver = results[1];

			if (teacher) {
				query.teacher = teacher._id;
			}

			if (reserver) {
				query._id = {$in: reserver.reservations};
			} else if (req.query.reserved) {
				query._id = {$in: []};
			}

			return Promise.all([
				Lesson.find(query).limit(Number(limit)).skip(Number(offset)).sort({
					createdAt: "desc",
				}).populate("teacher").exec(),
				Lesson.count(query).exec(),
				req.payload ? User.findById(req.payload.id) : null,
			]).then(function(results) {
				const lessons = results[0];
				const lessonsCount = results[1];
				const user = results[2];

				return res.json({
					lessons: lessons.map(function(lesson) {
						return lesson.toJSONFor(user);
					}),
					lessonsCount,
				});
			});
		}).catch(next);
	},
);

router.post(
	"/",
	auth.required,
	function(req, res, next) {
		User.findById(req.payload.id).then(function(user) {
			if (!user) {
				return res.sendStatus(401);
			}

			const lesson = new Lesson(req.body.lesson);

			lesson.teacher = user;

			return lesson.save().then(function() {
				console.log(lesson.teacher);
				return res.json({lesson: lesson.toJSONFor(user)});
			});
		}).catch(next);
	},
);

router.get(
	"/:lesson",
	auth.optional,
	function(req, res, next) {
		Promise.all([
			req.payload ? User.findById(req.payload.id) : null,
			req.lesson.populate("teacher").execPopulate(),
		]).then(function(results) {
			const user = results[0];

			return res.json({lesson: req.lesson.toJSONFor(user)});
		}).catch(next);
	},
);

router.put(
	"/:lesson",
	auth.required,
	function(req, res, next) {
		User.findById(req.payload.id).then(function(user) {
			if (req.lesson._id.toString() === req.payload.id.toString()) {
				if (typeof req.body.lesson.title !== "undefined") {
					req.lesson.title = req.body.lesson.title;
				}

				if (typeof req.body.lesson.description !== "undefined") {
					req.lesson.description = req.body.lesson.description;
				}

				if (typeof req.body.lesson.body !== "undefined") {
					req.lesson.body = req.body.lesson.body;
				}

				req.lesson.save().then(function(lesson) {
					return res.json({lesson: lesson.toJSONFor(user)});
				}).catch(next);
			} else {
				return res.send(403);
			}
		});
	},
);

router.delete(
	"/:lesson",
	auth.required,
	function(req, res, {}) {
		User.findById(req.payload.id).then(function() {
			if (req.lesson.teacher.toString() === req.payload.id.toString()) {
				return req.lesson.remove().then(function() {
					return res.sendStatus(204);
				});
			} else {
				return res.sendStatus(403);
			}
		});
	},
);

router.post(
	"/:lesson/reserve",
	auth.required,
	function(req, res, next) {
		const lessonId = req.lesson._id;

		User.findById(req.payload.id).then(function(user) {
			if (!user) {
				return res.sendStatus(401);
			}

			return user.reserve(lessonId).then(function() {
				return req.lesson.updateReservationsCount().then(function(lesson) {
					return res.json({lesson: lesson.toJSONFor(user)});
				});
			});
		}).catch(next);
	},
);

router.delete(
	"/:lesson/reserve",
	auth.required,
	function(req, res, next) {
		const lessonId = req.lesson._id;

		User.findById(req.payload.id).then(function(user) {
			if (!user) {
				return res.sendStatus(401);
			}

			return user.unreserve(lessonId).then(function() {
				return req.lesson.updateReservationsCount().then(function(lesson) {
					return res.json({lesson: lesson.toJSONFor(user)});
				});
			});
		}).catch(next);
	},
);

module.exports = router;
