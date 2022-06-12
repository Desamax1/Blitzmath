require("dotenv").config();
const {OAuth2Client} = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const path = require("path");
const sharp = require("sharp");
const formidable = require("formidable");
const axios = require("axios");
const fs = require("fs");
const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const { createServer } = require("http");
const { Server } = require("socket.io");
const db = require("better-sqlite3")("blitzmath.db", {
    fileMustExist: true
});

const cors = require("cors");
const app = express();
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(cookieParser());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    serveClient: true,
    cors: {
        origin: ["https://blitzmath.ml", "http://localhost:5500"],
        methods: ["GET"]
    }
});

app.use(cors({
    origin: ["https://blitzmath.ml", "http://localhost:5555"]
}));

const random = (min, max) => { return Math.floor(Math.random() * (max - min + 1) + min) }
const operacije = ['+', '-', '*', '/', '^'];

const genOffset = last => {
    let offset = random(1, 9);
    if (last) {
        offset = 10;
    }
    if (Math.random() > 0.5) {
        offset *= -1;
    }
    return offset;
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
            br1 = random(1, 36);
            br2 = random(1, 36);
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
            br1 = random(2, 8);
            br2 = random(2, 4);
            result = br1 ** br2;
            izraz = `${br1}<sup>${br2}</sup>`;
            return {
                prompt: izraz,
                answers: [result, result * br2, result * br1, result / br1]
            }
    }
}

io.on("connection", socket => {
    let ime, id, finishTime;
    let score = -1, ans = -500;

    socket.emit('log', `connected to the server with id ${socket.id}`);
    console.log(`session ${socket.id} started!`);
    socket.on("conn", (uid, name, email) => {
        checkDB(uid, email, name);
        ime = name;
        id = uid;
        finishTime = Date.now() + 10000;
    });

    socket.on('izbor', izbor => {
        console.log(`${ime} answered ${izbor}. Total: ${score} (correct: ${ans})`);
        if ((parseInt(izbor) === ans || ans === -500) && Date.now() <= finishTime) {
            // tacan odgovor
            score++;
            let time = 10000 * (0.95 ** score);
            if (time < 3500) {
                time = 3500;
            }
            finishTime = Date.now() + time;
            q = genQuestion();
            ans = q.answers[0];            
            socket.emit("res", q, time);
            console.log(`${ime}: ${q.prompt}`);
        } else {
            // netacan odgovor
            socket.emit("fail", score);
            socket.disconnect();
            Users.updateOne( { "uid": id, highscore: { $lt: score } }, { $set: { highscore: score } } )
                .then(obj => {
                    console.log(`User ${ime} failed with a score of ${score}!`);
                });
        }
    });

    socket.on('disconnect', reason => console.log(socket.id, 'disconnected! reason: ', reason));
});

app.post("/user/login", async (req, res) => {
    try {
        const ticket = await client.verifyIdToken({
            idToken: req.body.credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        
        if (!db.prepare(`SELECT id FROM users WHERE googleId='${payload.sub}'`).get()) {
            db.prepare(`INSERT INTO users (googleId, createdAt, lastLogin, ime, prezime) VALUES ('${payload.sub}', ${Date.now()}, ${Date.now()}, '${payload.given_name}', '${payload.family_name}')`).run();
            const response = await axios.get(payload.picture,  { responseType: 'arraybuffer' });
            await sharp(Buffer.from(response.data, "utf-8")).resize({
                width: 96,
                height: 96,
                fit: 'cover'
            }).webp({
                quality: 75,
                smartSubsample: true
            }).toFile(path.join(__dirname, "img", `${payload.sub}`));
        } else {
            db.prepare(`UPDATE users SET lastLogin=${Date.now()} WHERE googleId='${payload.sub}'`).run();
        }


        res.cookie("uid", payload.sub, {
            maxAge: 1000*3600*24*365,
            httpOnly: true
        })
        res.redirect("/dash");
    } catch (e) {
        res.sendStatus(500);
        console.error(e);
    }
});
app.get("/user/logout", (req, res) => {
    res.clearCookie("uid");
    res.redirect("/");
});

app.get("/settings", (req, res) => {
    res.sendFile(path.join(__dirname, "html", "settings.html"));
});
app.get("/user/settings", (req, res) => {
    if (req.cookies.uid) {
        const settings = db.prepare(`SELECT showLB FROM users WHERE googleId='${req.cookies.uid}'`).get();
        res.json(settings);
    } else {
        res.sendStatus(401);
    }
});
app.post("/user/settings", (req, res) => {
    if (req.cookies.uid === undefined) {
        res.sendStatus(401);
    }
    const form = formidable({
        maxFileSize: 10 * 1024 * 1024
    });
    form.parse(req, async (err, fields, files) => {
        if (err) {
            console.error(err);
            res.sendStatus(500);
        }
        db.prepare(`UPDATE users SET showLB=${fields.showLB} WHERE googleId='${req.cookies.uid}'`).run();
        if (files.avatar && (files.avatar.mimetype === "image/png" || files.avatar.mimetype === "image/jpg" || files.avatar.mimetype === "image/jpeg" || files.avatar.mimetype === "image/webp" || files.avatar.mimetype === "image/gif")) {
            // compess and save
            await sharp(files.avatar.filepath).resize({
                width: 96,
                height: 96,
                fit: 'cover'
            }).webp({
                quality: 75,
                smartSubsample: true
            }).toFile(path.join(__dirname, "img", `${req.cookies.uid}`));
        }
        res.sendStatus(200);
    });
});

app.get("/leaderboard", (req, res) => {
    res.sendFile(path.join(__dirname, "html", "leaderboard.html"));
});
app.get("/stats", (req, res) => {
    const scores = db.prepare(`SELECT ime, prezime, highscore, id FROM users WHERE highscore > 0 AND users.showLB = 1 ORDER BY highscore DESC`).all();
    res.json(scores);
});

app.get("/dash", (req, res) => {
    if (req.cookies.uid) {
        res.sendFile(path.join(__dirname, "html", "app.html"));
    } else {
        res.redirect("/");
    }
});
app.get("/img/user", (req, res) => {
    if (req.cookies.uid) {
        res.sendFile(path.join(__dirname, "img", `${req.cookies.uid}`));
    } else {
        res.sendStatus(401);
    }
});
app.get("/user/data", (req, res) => {
    if (!req.cookies.uid) {
        res.sendStatus(401);
    }
    const data = db.prepare(`SELECT ime, prezime, highscore FROM users WHERE googleId='${req.cookies.uid}'`).get();
    res.json(data);
});

app.get("/apple-touch-icon.png", (req, res) => res.sendFile(path.join(__dirname, "assets", "apple-touch-icon.png")));
app.get("/favicon-16x16.png", (req, res) => res.sendFile(path.join(__dirname, "assets", "favicon-16x16.png")));
app.get("/favicon-32x32.png", (req, res) => res.sendFile(path.join(__dirname, "assets", "favicon-32x32.png")));
app.get("/safari-pinned-tab.svg", (req, res) => res.sendFile(path.join(__dirname, "assets", "safari-pinned-tab.svg")));
app.get("/site.webmanifest", (req, res) => res.sendFile(path.join(__dirname, "assets", "site.webmanifest")));
app.get("/style.css", (req, res) => res.sendFile(path.join(__dirname, "assets", "style.css")));
app.get("/", (req, res) => {
    if (req.cookies.uid) {
        res.redirect("/dash");
    } else {
        res.sendFile(path.join(__dirname, "html", "index.html"))
    }
});

httpServer.listen(8443, () => console.log(`Listening on http://localhost:8443`));