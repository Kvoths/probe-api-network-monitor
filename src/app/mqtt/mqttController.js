const mqtt = require('mqtt');

exports.sendMessage = function (topic, message) {
    let client  = mqtt.connect(`mqtt://${(process.env.MOSQUITTO_URL) ? process.env.MOSQUITTO_URL : 'localhost'}`);

    client.on('connect', function () {
        client.publish(topic, message);
        client.end();
        console.log('Resultado enviado');
    });
    
};