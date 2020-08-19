var router = require('express').Router();
var passport = require('passport');
var mongoose = require('mongoose');
var Lesson = mongoose.model('Lesson');
var User = mongoose.model('User');
var auth = require('../auth');

router.param('lesson', function (req, res, next, slug) {
    Lesson.findOne({ slug: slug })
        .populate('teacher')
        .then(function (lesson) {
            if (!lesson) { return res.sendStatus(404); }

            req.lesson = lesson;

            return next();
        }).catch(next);
});

router.post('/', auth.required, function (req, res, next) {
    User.findById(req.payload.id).then(function (user) {
        if (!user) { return res.sendStatus(401); }

        var lesson = new Lesson(req.body.lesson);

        lesson.teacher = user;

        return lesson.save().then(function () {
            console.log(lesson.teacher);
            return res.json({ lesson: lesson.toJSONFor(user) });
        });
    }).catch(next);
});

router.get('/:lesson', auth.optional, function (req, res, next) {
    Promise.all([
        req.payload ? User.findById(req.payload.id) : null,
        req.lesson.populate('teacher').execPopulate()
    ]).then(function (results) {
        var user = results[0];

        return res.json({ lesson: req.lesson.toJSONFor(user) });
    }).catch(next);
});

router.put('/:lesson', auth.required, function (req, res, next) {
    if (req.lesson._id.toString() === req.payload.id.toString()) {
        if (typeof req.body.lesson.title !== 'undefined') {
            req.lesson.title = req.body.lesson.title;
        }

        if (typeof req.body.lesson.description !== 'undefined') {
            req.lesson.description = req.body.lesson.description;
        }

        if (typeof req.body.lesson.body !== 'undefined') {
            req.lesson.body = req.body.lesson.body;
        }

        req.lesson.save().then(function (lesson) {
            return res.json({ lesson: lesson.toJSONFor(user) });
        }).catch(next);
    } else {
        return res.send(403);
    }
});

router.delete('/:lesson', auth.required, function (req, res, {}}) {
    User.findById(req.payload.id).then(function () {
        if (req.lesson.teacher.toString() === req.payload.id.toString()) {
            return req.lesson.remove().then(function () {
                return res.sendStatus(204);
            });
        } else {
            return res.sendStatus(403);
        }
    });
});

module.exports = router;