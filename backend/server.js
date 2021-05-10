require('dotenv').config();
const fs = require("fs");

const privateKey = fs.readFileSync("keys/key.pem");
const cert_ = fs.readFileSync("keys/cert.pem");

const socketServer = require("http2").createSecureServer({
    allowHTTP1: true,
    key: privateKey,
    cert: cert_
});

const express = require('express');
const app = express();

const options = {
    serveClient: false,
    cors: {
        origin: ["https://blitzmath.ml", "https://blitzmath.ml/takmicenje"],
        methods: ["GET"]
    }
};

const io = require('socket.io')(socketServer, options);
const mongoose = require('mongoose');
const findOrCreate = require('mongoose-find-or-create');

mongoose.set('useCreateIndex', true);
mongoose.connect('mongodb+srv://despot:bBVhAWWIlkidiUN2@cluster0.mqtnq.mongodb.net/db?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));

const UserSchema = new mongoose.Schema({
    uid: {
        type: String,
        unique: true
    },
    email: String,
    ime_prezime: String,
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

const random = (min, max) => {return Math.floor(Math.random() * (max - min + 1) + min)}

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
            };
            izraz = `${br1} ${op} ${br2}`;
            return {
                prompt: izraz,
                answers: [result, result + genOffset(false), result + genOffset(false), result + genOffset(true)]
            };
        case "*":
        case "/":
            br1 = random(1, 25);
            br2 = random(1, 25);
            result = br1 * br2;
            if (op === "/") {
                [result, br1] = [br1, result];
            };
            izraz = `${br1} ${op} ${br2}`;
            return {
                prompt: izraz,
                answers: [result, result + genOffset(false), result + genOffset(false), result + genOffset(true)]
            };
        case "^":
            br1 = random(2, 6);
            br2 = random(2, 4);
            result = br1 ** br2;
            izraz = `${br1}<sup>${br2}</sup>`;
            return {
                prompt: izraz,
                answers: [result, result * br2, result * br1, result / br1]
            };
    };
};

const checkDB = (uid, email) => {
    Users.findOrCreate({uid: uid}, {email: email}, (err, res) => console.log(err, res));
    return true;
}

io.on('connection', socket => {
    let ans, score, ime;
    let enabled = true, timeStarted = 0;

    socket.emit('log', `connected to the server with id ${socket.id}`);
    console.log(`session ${socket.id} started!`);

    socket.on('start', (uid, name, email) => {
        checkDB(uid, email);
        ime = name;

        timeStarted = Date.now();
        q = genQuestion();
        socket.emit('res', q);
        ans = q.answers[0];
    });

    socket.on('izbor', izbor => {
        if (enabled) {
            console.log(`${ime} answered ${izbor}. Total: ${score} (correct: ${ans})`);
            if (parseInt(izbor) === ans) {
                // tacan odgovor
                score += Date.now() - timeStarted;
                q = genQuestion();
                ans = q.answers[0];
                socket.emit('res', q);
                console.log(`${ime}: ${q.prompt}`)
                timeStarted = Date.now();
            } else {
                // netacan odgovor
                socket.emit('penalty');
                enabled = false;
                setTimeout(() => {
                    enabled = true;
                }, 3000);
            }
        }
    });

    socket.on('disconnect', reason => console.log(socket.id, 'disconnected! reason: ', reason));
});

app.get("/leaderboard", (req, res) => {
    res.JSON({
        "some": "data"
    });
});

// app.listen(443, () => console.log("REST API started"));
require("http2").createSecureServer({
    key: privateKey,
    cert: cert_
}, app).listen(443);
console.log("REST API started")
socketServer.listen(2053);
console.log('Websocket started');
