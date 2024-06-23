const express = require('express')
const app = express()
const bodyParser = require('body-parser');
const cors = require('cors')
require('dotenv').config()
let mongoose = require('mongoose');

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', (_req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

mongoose.connect(process.env.MONGO_URI);

let User = mongoose.model('User', new mongoose.Schema({
  username: String
}));
let Exercise = mongoose.model('Exercise', new mongoose.Schema({
  user_id: String,
  description: String,
  duration: Number,
  date: String
}));

function sendError() {
  res.json({
    error: "User not found"
  });
}

app.post("/api/users", async (req, res) => {
  const name = req.body.username;
  let user = await User.findOne({username: name})
  if (!user) user = await new User({username: name}).save();

  res.json({
    username: user.username,
    _id: user._id
  });
});

app.get("/api/users", async (_req, res) => {
  res.send(await User.find());
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const id = req.params._id;
  //Date formatting fuckery
  let date = req.body.date ? new Date(req.body.date) : new Date();
  dateParts = date.toUTCString().replace(/,/g, "").split(" ");
  date = [dateParts[0], dateParts[2], dateParts[1], dateParts[3]].join(" ");

  if (!mongoose.isValidObjectId(id)) {
    sendError();
    return;
  }

  let user = await User.findById(id);
  if (!user) {
    sendError();
    return;
  }
  let exercise = await new Exercise({
    user_id: user._id.toString(),
    description: req.body.description,
    duration: req.body.duration,
    date: date
  }).save();

  res.json({
    username: user.username,
    description: exercise.description,
    duration: exercise.duration,
    date: exercise.date,
    _id: user._id.toString()
  });
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const id = req.params._id;
  if (!mongoose.isValidObjectId(id)) {
    sendError();
    return;
  }
  let user = await User.findById({_id: id});
  if (!user) {
    sendError();
    return;
  }

  let exercises = await Exercise.find({user_id: user._id.toString()});

  //Filtering exercises by optional params.
  if (Object.keys(req.query).length > 0) {
    const from = req.query.from ? new Date(req.query.from) : new Date(0);
    const to = req.query.to ? new Date(req.query.to) : new Date();
    let count = 0;
    const limit = req.query.limit ? req.query.limit : null;
    
    exercises = exercises.filter(ex => {
      const date = new Date(ex.date);
      if (limit && count >= limit) return false;
      if (date < from) return false;
      if (date > to) return false;
      count++;
      return true;
    });
  }

  res.json({
    username: user.username,
    count: exercises.length,
    _id: user._id.toString(),
    log: exercises.map(log => ({
      description: log.description,
      duration: log.duration,
      date: log.date
    }))
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});
