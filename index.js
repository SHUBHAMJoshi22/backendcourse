const express = require("express");
const cors = require("cors");
const dns = require("dns");
const crypto = require("crypto");
const multer = require("multer");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors({ optionsSuccessStatus: 200 }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Root check
app.get("/", (req, res) => {
  res.send("freeCodeCamp Back End & APIs Microservices Running");
});

// ==========================================
// 1. REQUEST HEADER PARSER MICROSERVICE
// ==========================================
app.get("/api/whoami", (req, res) => {
  res.json({
    ipaddress: req.headers["x-forwarded-for"] || req.ip,
    language: req.headers["accept-language"],
    software: req.headers["user-agent"]
  });
});

// ==========================================
// 2. URL SHORTENER MICROSERVICE
// ==========================================
const urlDatabase = [];

app.post("/api/shorturl", (req, res) => {
  const inputUrl = req.body.url;
  let parsedUrl;

  try {
    parsedUrl = new URL(inputUrl);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return res.json({ error: "invalid url" });
    }
  } catch (err) {
    return res.json({ error: "invalid url" });
  }

  dns.lookup(parsedUrl.hostname, (err) => {
    if (err) return res.json({ error: "invalid url" });

    let existing = urlDatabase.find((entry) => entry.original_url === inputUrl);
    if (!existing) {
      existing = { original_url: inputUrl, short_url: urlDatabase.length + 1 };
      urlDatabase.push(existing);
    }
    res.json(existing);
  });
});

app.get("/api/shorturl/:short_url", (req, res) => {
  const id = parseInt(req.params.short_url);
  const entry = urlDatabase.find((item) => item.short_url === id);
  if (!entry) return res.json({ error: "No short URL found" });
  res.redirect(entry.original_url);
});

// ==========================================
// 3. EXERCISE TRACKER MICROSERVICE
// ==========================================
const users = [];

app.post("/api/users", (req, res) => {
  const username = req.body.username;
  if (!username) return res.status(400).json({ error: "Username required" });

  const newUser = {
    username,
    _id: crypto.randomBytes(12).toString("hex"),
    log: []
  };
  users.push(newUser);
  res.json({ username: newUser.username, _id: newUser._id });
});

app.get("/api/users", (req, res) => {
  res.json(users.map((u) => ({ username: u.username, _id: u._id })));
});

app.post("/api/users/:_id/exercises", (req, res) => {
  const user = users.find((u) => u._id === req.params._id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const description = req.body.description;
  const duration = Number(req.body.duration);
  const dateObj = req.body.date ? new Date(req.body.date) : new Date();
  const dateStr = dateObj.toDateString();

  const exercise = { description, duration, date: dateStr, rawDate: dateObj };
  user.log.push(exercise);

  res.json({
    _id: user._id,
    username: user.username,
    date: dateStr,
    duration,
    description
  });
});

app.get("/api/users/:_id/logs", (req, res) => {
  const user = users.find((u) => u._id === req.params._id);
  if (!user) return res.status(404).json({ error: "User not found" });

  let logs = [...user.log];
  const { from, to, limit } = req.query;

  if (from) {
    const fromDate = new Date(from);
    logs = logs.filter((item) => item.rawDate >= fromDate);
  }
  if (to) {
    const toDate = new Date(to);
    logs = logs.filter((item) => item.rawDate <= toDate);
  }
  if (limit) {
    logs = logs.slice(0, Number(limit));
  }

  res.json({
    _id: user._id,
    username: user.username,
    count: logs.length,
    log: logs.map(({ description, duration, date }) => ({
      description,
      duration,
      date
    }))
  });
});

// ==========================================
// 4. FILE METADATA MICROSERVICE
// ==========================================
app.post("/api/fileanalyse", upload.single("upfile"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  res.json({
    name: req.file.originalname,
    type: req.file.mimetype,
    size: req.file.size
  });
});

// ==========================================
// 5. TIMESTAMP MICROSERVICE
// (Placed last so /api/whoami, /api/users, etc. match first)
// ==========================================
app.get("/api/:date?", (req, res) => {
  const dateParam = req.params.date;
  let date;

  if (!dateParam) {
    date = new Date();
  } else if (/^\d+$/.test(dateParam)) {
    date = new Date(parseInt(dateParam));
  } else {
    date = new Date(dateParam);
  }

  if (date.toString() === "Invalid Date") {
    return res.json({ error: "Invalid Date" });
  }

  res.json({
    unix: date.getTime(),
    utc: date.toUTCString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
