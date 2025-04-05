require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const User = require("./models/User");
const jwt = require('jsonwebtoken');
const Post = require('./models/Post');

const app = express();
const PORT = process.env.PORT || 5000;

// Enhanced CORS configuration
const corsOptions = {
  origin: ["https://yourmindmosaic.vercel.app", "http://localhost:5173"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"]
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

app.use(bodyParser.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));



  // Add authentication middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: "Authentication required" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Signup API
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if email or username already exists
    let existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: "Email or Username already exists" });
    }

    // Create new user
    const newUser = new User({ username, email, password });
    await newUser.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser._id, username: newUser.username }, // Payload
      process.env.JWT_SECRET, // Secret key
      { expiresIn: "1h" } // Token expiration
    );

    // Send response with token
    res.status(201).json({
      message: "User registered successfully",
      token: token,
      username: newUser.username,
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
});


// Login API
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body; // Changed from username to email
    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Find user by email
    const user = await User.findOne({ email }); // Changed to find by email
    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username }, // Payload
      process.env.JWT_SECRET, // Secret key from .env
      { expiresIn: '1h' } // Token expiration time
    );

    // Send response with token
    res.status(200).json({
      message: "Login successful",
      token: token, // Send the generated token
      username: user.username,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
});

// fetchposts
app.get('/api/fetchPosts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ timestamp: -1 }).lean();
    const transformedPosts = posts.map(post => ({
      id: post._id.toString(),
      content: post.content,
      author: post.author,
      timestamp: post.timestamp,
      comments: post.comments.map(comment => ({
        id: comment._id.toString(),
        content: comment.content,
        author: comment.author,
        timestamp: comment.timestamp,
        isAnonymous: comment.isAnonymous
      })),
      isAnonymous: post.isAnonymous
    }));
    res.json(transformedPosts);
  } catch (error) {
    res.status(500).json({ message: "Error fetching posts", error });
  }
});

// POST posts
app.post('/api/posts', authenticate, async (req, res) => {
  try {
    const { content, isAnonymous } = req.body;
    const author = isAnonymous ? 'Anonymous' : req.user.username;

    const newPost = new Post({ content, author, isAnonymous });
    const savedPost = await newPost.save();

    res.status(201).json({
      id: savedPost._id.toString(),
      content: savedPost.content,
      author: savedPost.author,
      timestamp: savedPost.timestamp,
      comments: [],
      isAnonymous: savedPost.isAnonymous
    });
  } catch (error) {
    res.status(500).json({ message: "Error creating post", error });
  }
});


//POST comment
app.post('/api/posts/:postId/comments', authenticate, async (req, res) => {
  try {
    const { content, isAnonymous } = req.body;
    const author = isAnonymous ? 'Anonymous' : req.user.username;
    const comment = { content, author, isAnonymous };

    const updatedPost = await Post.findByIdAndUpdate(
      req.params.postId,
      { $push: { comments: comment } },
      { new: true }
    );

    const newComment = updatedPost.comments[updatedPost.comments.length - 1];
    res.status(201).json({
      id: newComment._id.toString(),
      content: newComment.content,
      author: newComment.author,
      timestamp: newComment.timestamp,
      isAnonymous: newComment.isAnonymous
    });
  } catch (error) {
    res.status(500).json({ message: "Error adding comment", error });
  }
});










// Add this line near the end, before app.listen()
app.get("/", (req, res) => {
  res.send("MindMosaic Backend is Running 🚀");
});






app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
module.exports = app;

