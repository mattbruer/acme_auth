const Sequelize = require("sequelize");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { STRING } = Sequelize;
const config = {
  logging: false,
};

if (process.env.LOGGING) {
  delete config.logging;
}
const conn = new Sequelize(
  process.env.DATABASE_URL || "postgres://localhost/acme_db",
  config
);

const User = conn.define("user", {
  username: STRING,
  password: STRING,
});

const Note = conn.define("note", {
  text: STRING,
});

Note.hasOne(User);
User.hasMany(Note);

const SALT_NUMBER = 5;

User.beforeCreate(async (user) => {
  user.password = await bcrypt.hash(user.password, SALT_NUMBER);
});

// Other way of hashing the password
// User.beforeCreate((user) => {
//    bcrypt.hash(user.password, SALT_NUMBER, function(err, hash) {
//     user.password = hash;
//     user.save();
//   });
// });

User.byToken = async (token) => {
  try {
    const { userId } = jwt.verify(token, process.env.JWT);
    const user = await User.findByPk(userId);
    if (user) {
      return user;
    }
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  } catch (ex) {
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  }
};

User.authenticate = async ({ username, password }) => {
  const db_user = await User.findOne({
    where: {
      username,
    },
  });

  const is_the_same = await bcrypt.compare(password, db_user.password);
  if (db_user && is_the_same) {
    return jwt.sign({ userId: db_user.id }, process.env.JWT);
  }

  const error = Error("bad credentials");
  error.status = 401;
  throw error;
};

const syncAndSeed = async () => {
  await conn.sync({ force: true });
  const credentials = [
    { username: "lucy", password: "lucy_pw" },
    { username: "moe", password: "moe_pw" },
    { username: "larry", password: "larry_pw" },
  ];

  const notes = [
    { text: "some stuff" },
    { text: "some other stuff" },
    { text: "some more stuff" },
  ];

  const [note1, note2, note3] = await Promise.all(
    notes.map((note) => Note.create(note))
  );

  const [lucy, moe, larry] = await Promise.all(
    credentials.map((credential) => User.create(credential))
  );

  await lucy.setNotes(note1);
  await moe.setNotes([note2, note3]);

  await note1.setUser(lucy);
  await note2.setUser(moe);
  await note3.setUser(moe);

  return {
    users: {
      lucy,
      moe,
      larry,
    },
  };
};

module.exports = {
  syncAndSeed,
  models: {
    User,
    Note,
  },
};
