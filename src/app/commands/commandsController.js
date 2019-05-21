const mongoose = require('mongoose');
const cron = require('node-cron');
const { spawn } = require('child_process');
const mqttController = require('../mqtt/mqttController');
let cronJobs = {};
require('./command');
require('./result');

// var Parameter = mongoose.model('Command');
let Result = mongoose.model('Result');
//var exports = module.exports;
exports.processMessage = function (topic, message) {
    try {    
        let splitedTopic = topic.split('/');
        if (splitedTopic[2] == 'command' && splitedTopic[3] !== undefined) {
            let command = JSON.parse(message);
            console.log(command.active);
            command._id = splitedTopic[3];
            //Destroy command
            if (command._id == 'iperfServer') {
                console.log('Activando servidor para iperf');
                this.execAuto(command);
            } else if (!command.active && cronJobs[splitedTopic[3]] !== undefined) {
                console.log('Deleting: ' + splitedTopic[3]);
                cronJobs[splitedTopic[3]].destroy();
                console.log('Deleted.');
            } else if (command.active) {
                createCron(command);
            }
            //Set command

        }
    } catch (e) {
        console.log(e);
    }
}

getResults = function (req, res, next) {
    Result.find( function ( err, results ) {
        res.status(200);
        res.json(results);
    });
}

createCron = function (command) {
    console.log('Monitorizando...');
    
    let minute = (command.time.minute) ? command.time.minute : '*';
    let hour = (command.time.hour) ? command.time.hour : '*';
    let dayMonth = (command.time.dayMonth) ? command.time.dayMonth : '*';
    let month = (command.time.month) ? command.time.month : '*';
    let dayWeek = (command.time.dayWeek) ? command.time.dayWeek : '*';
    let cronString = minute + ' ' + hour + ' ' + dayMonth + ' ' + month + ' ' + dayWeek;  

    cronJobs[command._id] = cron.schedule(cronString, () => {
        this.execAuto(command);
    });
}

execAuto = async function (command) {
    var commandParams = [];

    for (var i = 0; i < command.parameters.length; i++)
    {
        var parameter = command.parameters[i];
        commandParams.push(parameter['name']);

        if (parameter['value'] !== undefined && parameter['value'] !== null && parameter['value'] !== "")
            commandParams.push(parameter['value']);
    }
    
    if (command.name  === 'iperf' && command.server !== undefined && command.server !== null && command.server !== "") {
        let message = {
            name: 'iperf',
            parameters: [{
                name: -s
            }],
            duration: 60,
            active: true
        };

        mqttController.sendMessage('probe/' + command.server + '/command/iperfServer', message);
        await sleep(2000);
        commandSpawn = spawn(command.name, commandParams);
        this.getCommandOutput(commandSpawn, command.duration).then( output => saveCommandOutput (command._id, command.name, output, command.duration));
    } else {
        commandSpawn = spawn(command.name, commandParams);
        this.getCommandOutput(commandSpawn, command.duration).then( output => {
            if (command._id !== 'iperfServer') 
            {
                saveCommandOutput (command._id, command.name, output, command.duration)
            }
        });
    }
}

getCommandOutput = function (commandSpawn, duration) {
    return new Promise( function(resolve, reject) {
        var output = '';
        
        setTimeout( function () { 
            console.log('Timeout, the process will be killed');
            commandSpawn.kill('SIGINT');
        }, duration * 1000);
        
        commandSpawn.stdout.on('data', function (data) {
            if (data != null) {
                output += data.toString();
            }
        });
            
        commandSpawn.stderr.on('data', function (data) {
            if (data != null) {
                console.log('stderr: ' + data.toString());
                output += data.toString();
            }
        });
            
        commandSpawn.on('exit', function (code) {
            if (code != null) {
                console.log('child process exited with code ' + code.toString());
                resolve(output);
            }
        });
    });
}

saveCommandOutput = function (command_id, command_name, output, duration) {
    let expr, dividedString, values;
    switch (command_name) {
        case 'ping':
            //Si la última línea del ping es rtt significa que ha tenido éxito el ping
            expr = 'rtt min/avg/max/mdev = ';
            dividedString = output.split(expr);
            if (typeof dividedString[1] !== 'undefined') {
                values = dividedString[1].replace(' ms\n', '');
                values = values.split('/');
                values = {
                    "min": values[0],
                    "avg": values[1],
                    "max": values[2],
                    "mdev": values[3],
                    "duration": duration
                };
            } else {
                values = {
                    "min": 0,
                    "avg": 0,
                    "max": 0,
                    "mdev": 0,
                    "duration": duration
                };
            }

            this.saveResult(command_id, 'ping', values);
            break;
        case 'tcpdump':
            expr = ' packets captured';
            dividedString = output.split(expr);
            expr = '\n';
            dividedString = dividedString[0].split(expr);
            let num_packets = dividedString[dividedString.length - 1];
            
            if (!isNaN(num_packets)) {
                values = {
                    "num_packets": num_packets,
                    "duration": duration,
                    "num_packets_per_secon": (num_packets / duration)
                };
                
            } else {
                values = {
                    "num_packets": 0,
                    "duration": duration,
                    "num_packets_per_secon": 0
                };
            }
            
            this.saveResult(command_id, 'tcpdump', values);
            break;
        case 'iperf':
            expr = 'Bandwidth';
            dividedString = output.split(expr);

            value = {
                "interval": {
                    value: 0,
                    units: ''
                },
                "transfer": {
                    value: 0,
                    units: ''

                },
                "bandwidth": {
                    value: 0,
                    units: '' 
                }    
            }

            if (typeof dividedString[1] !== 'undefined') {
                expr = '  ';
                dividedString = dividedString[1].split(expr);

                if (dividedString[2] !== undefined && dividedString[3] !== undefined && dividedString[4] !== undefined) {
                    for (let i = 2; i < 5; i++) {
                        let auxDividedString = dividedString[i].split(' ');
                        let aux_value;
                        if (i == 2) {
                            aux_value = {
                                value: auxDividedString[0] + auxDividedString[1],
                                units: auxDividedString[2]
                            };
                        } else {
                            aux_value = {
                                value: auxDividedString[0],
                                units: auxDividedString[1]
                            };
                        }

                        switch (i) {
                        case 2:
                            value.interval = aux_value;
                            break;
                        case 3:
                            value.transfer = aux_value;
                            break;
                        case 4:
                            value.bandwidth = aux_value;
                            break;
                        }
                    }
                }

            }

            this.saveResult(command_id, 'iperf', value);
            break;
        default:
            console.log(`The command ${command_name} is not yet implemented.`);
    }
}

saveResult = function (command_id, type, values) {
    var result = new Result();
    result.command = command_id;
    result.type = type;
    result.results = values;
    result.save( function(err, result) {
        if (err) {
            console.log(err);
        }
        let message = JSON.stringify(result);
        mqttController.sendMessage('master', message);
        return true;
    });
}

