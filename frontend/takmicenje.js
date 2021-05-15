const socket = io('https://dev.backend.blitzmath.ml:2053', {
    autoConnect: false
});

const text = document.getElementById('message');
const time = document.getElementById('time');
const question = document.getElementById('question');
const btns = document.getElementById('buttons-wrapper');

const progBar = document.getElementById("progbar");

const button1 = document.getElementById("btn-1");
const button2 = document.getElementById("btn-2");
const button3 = document.getElementById("btn-3");
const button4 = document.getElementById("btn-4");

const shuffle = array => {
    let currentIndex = array.length, temporaryValue, randomIndex;
    while (0 !== currentIndex) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    };
    return array;
};

const replaceButtons = answers => {
    button1.innerHTML = answers[0];
    button2.innerHTML = answers[1];
    button3.innerHTML = answers[2];
    button4.innerHTML = answers[3];
};

const toggleInputs = () => {
    button1.toggleAttribute('disabled');
    button2.toggleAttribute('disabled');
    button3.toggleAttribute('disabled');
    button4.toggleAttribute('disabled');
};

btns.addEventListener('submit', e => {
    e.preventDefault();
    if (e.submitter.id === "btn-dc") {
        socket.disconnect();
        console.log("disconnected!");
        window.location.replace("app.html").catch(e => console.error(e));
    } else {
        socket.emit('izbor', e.submitter.textContent);
    };
});

document.getElementById("solo-ready").addEventListener("click", () => {
    document.getElementById("solo-msg").toggleAttribute("hidden");
    btns.toggleAttribute("hidden");

    socket.emit("izbor", -500);
});

socket.on('log', message => console.log(message));

socket.on('res', (recv_obj) => {
    progBar.classList.remove("progress");
    void progBar.offsetWidth;
    progBar.classList.add("progress");
    question.innerHTML = recv_obj.prompt;
    replaceButtons(shuffle(recv_obj.answers));
});

socket.on('penalty', () => {
    toggleInputs();
    setTimeout(() => toggleInputs(), 3000);
});

window.addEventListener('load', () => {
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
                const {displayName, email, uid} = user;
                if (email.indexOf('@teslabg.edu.rs') >= 0) {
                    socket.connect();
                    socket.emit("conn", uid, displayName, email);
                } else {
                    btns.toggleAttribute("hidden");
                    let time = 5;
                    document.getElementById("error").innerText = `Moras koristiti skolski mejl! Redirect za ${time} sekundi...`;
                    firebase.auth().signOut().then(() => {
                        setInterval(() => {
                            time -= 1;
                            document.getElementById("error").innerText = `Moras koristiti skolski mejl! Redirect za ${time} sekundi...`;
                        }, 1000);
                        setTimeout(() => {
                            window.location.replace("index.html");
                        }, 5000);
                    }).catch(e => console.error);
                }
            }
        }, e => console.error);
});