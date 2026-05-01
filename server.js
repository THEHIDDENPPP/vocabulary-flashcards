const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vocab', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// User Schema
const userSchema = new mongoose.Schema({
  username: String,
  password: String
});
const User = mongoose.model('User', userSchema);

// Word Schema
const wordSchema = new mongoose.Schema({
  userId: String,
  word: String,
  def: String,
  ex: String,
  trick: String,
  cat: { type: String, default: 'none' }
});
const Word = mongoose.model('Word', wordSchema);

// Middleware to verify token
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).send('Token required');
  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, decoded) => {
    if (err) return res.status(401).send('Invalid token');
    req.userId = decoded.id;
    next();
  });
};

// Routes
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ username, password: hashedPassword });
  await user.save();
  res.send('User registered');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.status(401).send('Invalid credentials');
  }
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret');
  res.json({ token });
});

app.get('/words', verifyToken, async (req, res) => {
  const words = await Word.find({ userId: req.userId });
  res.json(words);
});

app.post('/words', verifyToken, async (req, res) => {
  const word = new Word({ ...req.body, userId: req.userId });
  await word.save();
  res.json(word);
});

app.put('/words/:id', verifyToken, async (req, res) => {
  const word = await Word.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, req.body, { new: true });
  res.json(word);
});

app.delete('/words/:id', verifyToken, async (req, res) => {
  await Word.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  res.send('Deleted');
});

// Serve frontend
app.use(express.static('public'));

app.listen(3000, () => console.log('Server running on port 3000'));