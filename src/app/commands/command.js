//Importamos la librería de mongoose y la de crypto
const mongoose = require('mongoose');
//Se define un esquema para la base de datos
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;

var cronTimeSchema = new Schema({
    minute: {
        type: String,
        default: '*'
    },
    hour: {
        type: String,
        default: '*'
    },
    dayMonth: {
        type: String,
        default: '*'
    },
    month: {
        type: String,
        default: '*'
    },
    dayWeek: {
        type: String,
        default: '*'
    }
});

var parameterSchema = new Schema({
    name: {
        type: String,
        required: "The parameter's name is required"
    },
    value: {
        type: String,
    }
});

var commandSchema = new Schema({
    name: {
        type: String,
        required: "The command's name is required"
    },
    parameters: {
        type: [parameterSchema],
        validate: {
            validator: function(v) {
                return (v.length > 0);
            },
            msg: 'You must insert at least one parameter'
        }
    },
    time: {   
        type: cronTimeSchema,
        required: "The time when the command will be executed is required",
    },
    duration: {
        type: Number,
        required: "The duration of the command is required"
    },
    probe: { 
        type: ObjectId,
        ref: 'Probe',
        required: 'The probe where the command will be executed is required'
    }
});

//Métodos

//Creamos el modelo
mongoose.model('Command', commandSchema);