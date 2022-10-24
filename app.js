const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
app.use(express.json());
const {
  models: { User, Note },
} = require("./db");
const path = require("path");

const requireToken = async (req, res, next) => {
  const user = await User.byToken(req.headers.authorization);

  req.user = user;
  next();
};

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

app.post("/api/auth", async (req, res, next) => {
  try {
    res.send({ token: await User.authenticate(req.body) });
  } catch (ex) {
    next(ex);
  }
});

app.get("/api/auth", requireToken, async (req, res, next) => {
  try {
    res.send(req.user);
  } catch (ex) {
    next(ex);
  }
});

app.get("/api/users/notes", requireToken, async (req, res, next) => {
  try {
    if (req.user.id) {
      const notes = await Note.findAll({
        where: { userId: req.user.id },
      });
      return res.json(notes);
    }
    return res.status(501).send(Error("no notes"));
  } catch (error) {
    next(error);
  }
});

app.use((err, req, res, next) => {
  console.log(err);
  res.status(err.status || 500).send({ error: err.message });
});

module.exports = app;
