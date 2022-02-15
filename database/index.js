const mongoose = require('mongoose');

const { dbHost, dbPort, dbUser, dbPass, dbName } = require('../app/config');

mongoose.connect(
  `mongodb+srv://admin:admin@testcluster.w2gdj.mongodb.net/db_sistemcafe?retryWrites=true&w=majority`,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true,
  },
);

// mongoose.connect(
//   `mongodb://${dbUser}:${dbPass}@${dbHost}:${dbPort}/${dbName}?authSource=admin`,
//   {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//     useFindAndModify: false,
//     useCreateIndex: true,
//   },
// );

const db = mongoose.connection;

module.exports = db;
