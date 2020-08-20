const router = require('express').Router();
const mongoose = require('mongoose');
const Lesson = mongoose.model('Lesson');

router.get('/', function ({}, res, next) {
    Lesson.find().distinct('tagList').then(function (tags) {
        return res.json({ tags: tags });
    }).catch(next);
});

module.exports = router;