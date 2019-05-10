//Cargar configuración de variables
require('dotenv').config();

const mqtt = require('mqtt');
let client  = mqtt.connect(`mqtt://${(process.env.MOSQUITTO_URL) ? process.env.MOSQUITTO_URL : 'localhost'}`);
 
client.on('connect', function () {
  client.subscribe(`probe/${process.env.PROBE_ID}`  , function (err) {
    if (!err) {
      client.publish(`probe/${process.env.PROBE_ID}`, 'Hello mqtt');
    } else {
        console.log(err);
    }

  })
});
 
client.on('message', function (topic, message) {
  // message is Buffer
  console.log(message.toString());
  //client.end();
});