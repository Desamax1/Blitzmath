require("dotenv").config();
const {OAuth2Client} = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const path = require("path");
const sharp = require("sharp");
const formidable = require("formidable");
const axios = require("axios");
const shrink = require("shrink-ray-current");

const fs = require("fs");
const cookie = require("cookie");

const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const { createServer } = require("https");
const { Server } = require("socket.io");
const db = require("better-sqlite3")("blitzmath.db");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(shrink());
app.use((req, res, next) => {
    const clear = ["/", "/style.css", "/site.webmanifest", "/safari-pinned-tab.svg", "/favicon-32x32.png", "/favicon-16x16.png", "/apple-touch-icon.png", "/user/login", "/tos", "/pp", "/robots.txt", "/mstile-150x150.png"];
    if (!clear.includes(req.url) && !req.cookies.uid) {
        res.status(401).redirect("/");
    } else {
        next();
    }
});

const httpServer = createServer({
    key: fs.readFileSync(path.join(__dirname, "keys", "key.pem")),
    cert: fs.readFileSync(path.join(__dirname, "keys", "cert.pem")),
    minVersion: "TLSv1.2",
}, app);
const io = new Server(httpServer, {
    serveClient: true,
});

const random = (min, max) => { return Math.floor(Math.random() * (max - min + 1) + min) }
const operacije = ['+', '-', '*', '/', '^'];

function genOffset(last) {
    let offset = random(1, 9);
    if (last) {
        offset = 10;
    }
    if (Math.random() > 0.5) {
        offset *= -1;
    }
    return offset;
}

function genQuestion() {
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
    const uid = cookie.parse(socket.handshake.headers.cookie).uid;
    const tmp = db.prepare(`SELECT ime, prezime FROM users WHERE googleId='${uid}'`).get();
    const ime = tmp.ime + " " + tmp.prezime;

    let time = 10000, lastAns = Date.now();
    let score = 0, ans = -500;

    socket.emit('log', `connected to the server with id ${socket.id}`);
    console.log(`session ${socket.id} started!`);

    socket.use((e, next) => {
        if (Date.now() - lastAns > time) {
            socket.emit("res", false, score, true);
            socket.disconnect();
        } else {
            next();
        }
    });

    socket.on("getQ", () => {
        q = genQuestion();
        ans = q.answers[0];
        socket.emit("questions", q, time);
    });

    socket.on("izbor", izbor => {
        console.log(`${ime} answered ${izbor}. Total: ${score} (correct: ${ans})`);
        console.log(parseInt(izbor) === ans);
        socket.emit("res", parseInt(izbor) === ans, score, false);
        if (parseInt(izbor) === ans) {
            // tacan odgovor
            score++;
            time = Math.floor(10000 * (0.95 ** score));
            if (time < 3500) {
                time = 3500;
            }
            console.log(`${ime}: ${q.prompt}, time: ${Date.now()-lastAns}`);
            lastAns = Date.now();
            socket.emit("getQ");
        } else {
            // netacan odgovor
            socket.disconnect();
            db.prepare(`UPDATE users SET highscore=${score} WHERE highscore<${score} AND googleId='${uid}'`).run();
        }
    });

    socket.on('disconnect', reason => console.log(socket.id, 'disconnected! reason: ', reason));
});

app.get("/solo", (req, res) => {
    res.sendFile(path.join(__dirname, "html", "solo.html"));
});
app.get("/solo.js", (req, res) => {
    res.sendFile(path.join(__dirname, "js", "solo.min.js"));
});

app.post("/user/login", async (req, res) => {
    try {
        const ticket = await client.verifyIdToken({
            idToken: req.body.credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        
        if (!db.prepare(`SELECT id FROM users WHERE email='${payload.email}'`).get()) {
            db.prepare(`INSERT INTO users (googleId, createdAt, lastLogin, ime, prezime, email) VALUES ('${payload.sub}', ${Date.now()}, ${Date.now()}, '${payload.given_name}', '${payload.family_name}', '${payload.email}')`).run();
            
            const picBytes = await axios.get(payload.picture, { responseType: 'arraybuffer' });
            await sharp(Buffer.from(picBytes.data, "utf-8"))
            .resize({
                width: 96,
                height: 96,
                fit: 'cover',
            }).webp({
                quality: 75,
                smartSubsample: true,
            }).toFile(path.join(__dirname, "img", `${payload.sub}`));
        } else {
            if (!db.prepare(`SELECT googleId FROM users WHERE email='${payload.email}'`).get().googleId) {
                db.prepare(`UPDATE users SET googleId='${payload.sub}' WHERE email='${payload.email}'`).run();
            }
            db.prepare(`UPDATE users SET lastLogin=${Date.now()} WHERE googleId='${payload.sub}'`).run();
        }
        
        if (!fs.existsSync(path.join(__dirname, "img", payload.sub))) {
            const picBytes = await axios.get(payload.picture, { responseType: 'arraybuffer' });
            await sharp(Buffer.from(picBytes.data, "utf-8"))
            .resize({
                width: 96,
                height: 96,
                fit: 'cover',
            }).webp({
                quality: 75,
                smartSubsample: true,
            }).toFile(path.join(__dirname, "img", `${payload.sub}`));
        }

        res.cookie("uid", payload.sub, {
            maxAge: 1000*3600*24*365,
            httpOnly: true,
            sameSite: "strict",
            secure: true,
        });
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
    const settings = db.prepare(`SELECT showLB FROM users WHERE googleId='${req.cookies.uid}'`).get();
    res.json(settings);
});
app.post("/user/settings", (req, res) => {
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
            await sharp(files.avatar.filepath, {
                animated: true
            }).resize({
                width: 96,
                height: 96,
                fit: 'cover'
            }).webp({
                quality: 75,
                smartSubsample: true
            }).toFile(path.join(__dirname, "img", `${req.cookies.uid}`));
        }
        if (files.avatar) {
            fs.unlink(files.avatar.filepath, function(){});
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
    res.sendFile(path.join(__dirname, "html", "app.html"));
});
app.get("/user/img", (req, res) => {
    res.sendFile(path.join(__dirname, "img", `${req.cookies.uid}`));
});
app.get("/user/data", (req, res) => {
    const data = db.prepare(`SELECT ime, prezime, highscore FROM users WHERE googleId='${req.cookies.uid}'`).get();
    res.json(data);
});

app.get("/robots.txt", (req, res) => res.sendFile(path.join(__dirname, "assets", "robots.txt")));
app.get("/tos", (req, res) => res.sendFile(path.join(__dirname, "html", "tos.html")));
app.get("/pp", (req, res) => res.sendFile(path.join(__dirname, "html", "pp.html")));
app.get("/apple-touch-icon.png", (req, res) => res.sendFile(path.join(__dirname, "assets", "apple-touch-icon.png")));
app.get("/favicon-16x16.png", (req, res) => res.sendFile(path.join(__dirname, "assets", "favicon-16x16.png")));
app.get("/favicon-32x32.png", (req, res) => res.sendFile(path.join(__dirname, "assets", "favicon-32x32.png")));
app.get("/safari-pinned-tab.svg", (req, res) => res.sendFile(path.join(__dirname, "assets", "safari-pinned-tab.svg")));
app.get("/site.webmanifest", (req, res) => res.sendFile(path.join(__dirname, "assets", "site.webmanifest")));
app.get("/mstile-150x150.png", (req, res) => res.sendFile(path.join(__dirname, "assets", "mstile-150x150.png")));
app.get("/style.css", (req, res) => res.sendFile(path.join(__dirname, "assets", "style.min.css")));
app.get("/", (req, res) => {
    if (req.cookies.uid) {
        res.redirect("/dash");
    } else {
        res.sendFile(path.join(__dirname, "html", "index.html"))
    }
});

httpServer.listen(443, () => {
    console.log(`Listening on https://localhost/`);
    db.prepare(`CREATE TABLE IF NOT EXISTS"users" (
        "id"	INTEGER,
        "googleId"	TEXT UNIQUE,
        "email"	TEXT NOT NULL UNIQUE,
        "createdAt"	INTEGER,
        "lastLogin"	INTEGER,
        "ime"	TEXT,
        "prezime"	TEXT,
        "highscore"	INTEGER DEFAULT 0,
        "showLB"	INTEGER DEFAULT 1,
        PRIMARY KEY("id" AUTOINCREMENT)
    );`).run();
});