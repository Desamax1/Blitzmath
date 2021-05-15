require('dotenv').config();
const fs = require("fs");
const socketServer = require("http2").createSecureServer({
    allowHTTP1: true,
    key: fs.readFileSync("keys/key.pem"),
    cert: fs.readFileSync("keys/cert.pem")
});
const io = require('socket.io')(socketServer, {
    serveClient: false,
    cors: {
        origin: ["https://blitzmath.ml", "http://localhost:5500"],
        methods: ["GET"]
    }
});

const express = require('express');
const spdy = require('spdy');
const cors = require('cors');
const app = express();

app.use(cors({
    origin: ["https://blitzmath.ml", "http://localhost:5500"]
}));

const mongoose = require('mongoose');
const findOrCreate = require('mongoose-findorcreate');

mongoose.set('useCreateIndex', true);
mongoose.connect('mongodb+srv://despot:vKz2Mxhknhvl8YIH@blitzcluster.dynoy.mongodb.net/myFirstDatabase?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

const UserSchema = new mongoose.Schema({
    uid: {
        type: String,
        unique: true,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    ime_prezime: {
        type: String,
        required: true,
        unique: true
    },
    firstLogin: {
        type: Date,
        default: Date.now
    },
    lastLogin: {
        type: Date,
        default: Date.now
    },
    admin: {
        type: Boolean,
        default: false
    },
    highscore: {
        type: Number,
        default: 0
    }
});

UserSchema.plugin(findOrCreate);
const Users = mongoose.model('User', UserSchema);
db.once('open', () => console.log("connected to db"));

const random = (min, max) => { return Math.floor(Math.random() * (max - min + 1) + min) }
const operacije = ['+', '-', '*', '/', '^'];

const genOffset = last => {
    if (last) {
        offset = 10;
    } else {
        offset = random(1, 9);
    }

    if (Math.round(Math.random())) {
        return offset * (-1);
    } else {
        return offset;
    }
}

const genQuestion = () => {
    let result, br1, br2, izraz;
    const id = random(0, operacije.length - 1);
    const op = operacije[id];
    switch (op) {
        case "-":
        case "+":
            br1 = random(1, 200);
            br2 = random(1, 200);
            if (op === "+") {
                result = br1 + br2;
            } else {
                result = br1 - br2;
            }
            izraz = `${br1} ${op} ${br2}`;
            return {
                prompt: izraz,
                answers: [result, result + genOffset(false), result + genOffset(false), result + genOffset(true)]
            }
        case "*":
        case "/":
            br1 = random(1, 25);
            br2 = random(1, 25);
            result = br1 * br2;
            if (op === "/") {
                [result, br1] = [br1, result];
            }
            izraz = `${br1} ${op} ${br2}`;
            return {
                prompt: izraz,
                answers: [result, result + genOffset(false), result + genOffset(false), result + genOffset(true)]
            }
        case "^":
            br1 = random(2, 6);
            br2 = random(2, 4);
            result = br1 ** br2;
            izraz = `${br1}<sup>${br2}</sup>`;
            return {
                prompt: izraz,
                answers: [result, result * br2, result * br1, result / br1]
            }
    }
}

const checkDB = (uid, email, displayName) => {
    Users.findOrCreate({uid: uid, email: email, ime_prezime: displayName}, (err, user, created) => {
        if (err) {
            console.error(err);
        } else {
            console.log(`User ${displayName} located in DB!`);
        }
    });
}

io.on('connection', socket => {
    let ime, id;
    let enabled = true, score = -1, ans = -500;
    

    socket.emit('log', `connected to the server with id ${socket.id}`);
    console.log(`session ${socket.id} started!`);
    socket.on("conn", (uid, name, email) => {
        checkDB(uid, email, name);
        ime = name;
        id = uid;
    });

    socket.on('izbor', izbor => {
        if (enabled) {
            console.log(`${ime} answered ${izbor}. Total: ${score} (correct: ${ans})`);
            if (parseInt(izbor) === ans || ans === -500) {
                // tacan odgovor
                score++;
                q = genQuestion();
                ans = q.answers[0];
                socket.emit('res', q);
                console.log(`${ime}: ${q.prompt}`);
            } else {
                // netacan odgovor
                socket.emit("fail");
                Users.updateOne( { "uid": id, highscore: { $lt: score } }, { $set: { highscore: score } } )
                    .then(obj => {
                        console.log(`highscore in DB set to ${score}`);
                    });
            }
        }
    });

    socket.on('disconnect', reason => console.log(socket.id, 'disconnected! reason: ', reason));
});

app.get("/loggedIn", (req, res) => {
    res.status(200).json({
        message: "OK"
    });
    Users.updateOne({uid: req.query.uid}, {lastLogin: Date.now()}).then((doc) => console.log(`UID ${req.query.uid} logged in!`));
});

app.get("/leaderboard", (req, res) => {
    if (req.query.uid) {
        res.status(200).json({
            uid: req.query.uid,
            message: "logged in"
        });
    } else {
        res.status(200).json(
            [{
                ime_prezime: "Petar Jankovic",
                score: 20
            },
            {
                ime_prezime: "Marko Markovic",
                score: 10
            },
            {
                ime_prezime: "Jovan Ducic",
                score: 5
            }]
        );
    }
});

spdy.createServer({
    allowHTTP1: true,
    key: fs.readFileSync("keys/key.pem"),
    cert: fs.readFileSync("keys/cert.pem")
}, app).listen(443, err => {
    if (err) {
        console.error(err);
    } else {
        console.log("REST API started")
    }
});
socketServer.listen(2053, () => console.log('Websocket started'));
