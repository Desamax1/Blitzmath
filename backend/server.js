require('dotenv').config();
const fs = require("fs");
const httpServer = require("http2").createSecureServer({
    allowHTTP1: true,
    key: fs.readFileSync("keys/key.pem"),
    cert: fs.readFileSync("keys/cert.pem")
});

const options = {
    serveClient: false,
    cors: {
        origin: ["https://blitzmath.ml", "https://blitzmath.ml/takmicenje"],
        methods: ["GET"]
    }
};

const io = require('socket.io')(httpServer, options);

const mongoose = require('mongoose');

mongoose.set('useCreateIndex', true);
mongoose.connect('mongodb+srv://despot:bBVhAWWIlkidiUN2@cluster0.mqtnq.mongodb.net/db?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));

const Users = mongoose.model('User', new mongoose.Schema({
    ime: String,
    prezime: String,
    sifra: {
        type: Number,
        unique: true
    },
    bodovi: Number
}));

var ready = false;
var users = [];
var sifre = [];

const checkPass = sifra => {
    for (let i = 0; i < sifre.length; i++) {
        if (sifre[i] === sifra) return true;
        else if (i === sifre.length - 1 && sifre[i] !== sifra) return false;
    };
};

db.once('open', () => {
    console.log("connected to db");
    Users.find({}, (err, doc) => {
        users = doc;
        for (let i = 0; i < users.length; i++) {
            sifre.push(users[i].sifra);
        };
        ready = true;
    });
});

const random = (mn, mx) => {
    return Math.round(Math.random() * (mx - mn) + mn);
};

const operacije = ['+', '-', '*', '/', '^'];

const genOffset = (last) => {
    if (last) {
        offset = 10;
    } else {
        offset = random(1, 9);
    };
    if (random(0, 1)) {
        return offset * (-1);
    } else {
        return offset;
    };
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
    return true;
}

io.on('connection', socket => {
    let timeStarted = 0, ans, enabled = true, score, ime, timeTaken = 0;
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

    socket.on('izbor', i => {
        if (enabled) {
            console.log(`${ime} answered ${i}. Total: ${score} (correct: ${ans})`);
            if (parseInt(i) === ans) {
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

    socket.on('disconnect', (reason) => console.log(socket.id, 'disconnected! reason: ', reason));
});

httpServer.listen(2053);
console.log('started');
