//Cargar configuración de variables
require('dotenv').config();
const mongoose = require('mongoose');
//Subscripción  a mqtt
require('./src/app/mqtt');

//Conexión a mongoose
mongoose.connect(process.env.DATABASE, { useNewUrlParser: true });
mongoose.connection.on('error', (err) => {
    console.log(err);
  throw new Error(`Unable to connect to database.`);
});
mongoose.connection.on('connected', () => {
  console.log(`Connected to database.`);
});
