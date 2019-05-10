//Cargar configuración de variables
require('dotenv').config();
const mongoose = require('mongoose');
const mqtt = require('mqtt');
const commandController = require('./src/app/commands/commandsController');
let client  = mqtt.connect(`mqtt://${(process.env.MOSQUITTO_URL) ? process.env.MOSQUITTO_URL : 'localhost'}`);
 
client.on('connect', function () {
  client.subscribe(`probe/${process.env.PROBE_ID}/#`  , function (err) {
    if (!err) {
      client.publish(`probe/${process.env.PROBE_ID}`, 'Hello mqtt');
    } else {
        console.log(err);
    }
  })
});

client.on('message', function (topic, message) {
  // message is Buffer
  commandController.processMessage(topic, message);
  console.log('Mensaje recibido');
  //client.end();
});

//Conexión a mongoose
mongoose.connect(process.env.DATABASE, { useNewUrlParser: true });
mongoose.connection.on('error', (err) => {
    console.log(err);
  throw new Error(`Unable to connect to database.`);
});
mongoose.connection.on('connected', () => {
  console.log(`Connected to database.`);
});
