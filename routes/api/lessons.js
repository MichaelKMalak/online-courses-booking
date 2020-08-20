const router = require("express").Router();
//const passport = require("passport");
const mongoose = require("mongoose");
const Lesson = mongoose.model("Lesson");
const User = mongoose.model("User");
var Comment = mongoose.model('Comment');
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

router.param('comment', function (req, res, next, id) {
    Comment.findById(id).then(function (comment) {
        if (!comment) { return res.sendStatus(404); }

        req.comment = comment;

        return next();
    }).catch(next);
});

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

///LESSON CRUD

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

/// COMMENT CRUD
router.get('/:lesson/comments', auth.optional, function (req, res, next) {
    Promise.resolve(req.payload ? User.findById(req.payload.id) : null).then(function (user) {
        return req.lesson.populate({
            path: 'comments',
            populate: {
                path: 'author'
            },
            options: {
                sort: {
                    createdAt: 'desc'
                }
            }
        }).execPopulate().then(function (lesson) {
            return res.json({
                comments: req.lesson.comments.map(function (comment) {
                    return comment.toJSONFor(user);
                })
            });
        });
    }).catch(next);
});

router.post('/:lesson/comments', auth.required, function (req, res, next) {
    User.findById(req.payload.id).then(function (user) {
        if (!user) { return res.sendStatus(401); }

        var comment = new Comment(req.body.comment);
        comment.lesson = req.lesson;
        comment.author = user;

        return comment.save().then(function () {
            req.lesson.comments.push(comment);

            return req.lesson.save().then(function (lesson) {
                res.json({ comment: comment.toJSONFor(user) });
            });
        });
    }).catch(next);
});

router.delete('/:lesson/comments/:comment', auth.required, function (req, res, next) {
    if (req.comment.author.toString() === req.payload.id.toString()) {
        req.lesson.comments.remove(req.comment._id);
        req.lesson.save()
            .then(Comment.find({ _id: req.comment._id }).remove().exec())
            .then(function () {
                res.sendStatus(204);
            });
    } else {
        res.sendStatus(403);
    }
});

module.exports = router;
