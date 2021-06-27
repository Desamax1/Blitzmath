const socket = io('https://dev.backend.blitzmath.ml:2053', {
    autoConnect: false
});

const btns = document.getElementById('buttons-wrapper');
const progBar = document.getElementById("progbar");

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
}

const replaceButtons = answers => {
    document.getElementById("btn-1").innerHTML = answers[0];
    document.getElementById("btn-2").innerHTML = answers[1];
    document.getElementById("btn-3").innerHTML = answers[2];
    document.getElementById("btn-4").innerHTML = answers[3];
}

btns.addEventListener('submit', e => {
    e.preventDefault();
    socket.emit('izbor', e.submitter.textContent);
});

const start = (first) => {
    if (first) {
        document.getElementById("solo-msg").toggleAttribute("hidden")
    } else {
        document.getElementById("solo-fail").toggleAttribute("hidden")
        socket.connect();
        socket.emit("conn",
            localStorage.getItem("uid"),
            localStorage.getItem("displayName"),
            localStorage.getItem("email")
        );
    }
    btns.toggleAttribute("hidden");
    socket.emit("izbor", -500);
}

socket.on('log', message => console.log(message));

socket.on('res', (recv_obj, time) => {
    progBar.classList.remove("progress");
    void progBar.offsetWidth;
    progBar.classList.add("progress");
    document.querySelector("body").style.setProperty("--animation-time", time + "ms");
    document.getElementById('question').innerHTML = recv_obj.prompt;
    replaceButtons(shuffle(recv_obj.answers));
});

socket.on('fail', score => {
    btns.toggleAttribute("hidden");
    document.getElementById("solo-score").innerText = `${score}`;
    document.getElementById("solo-fail").toggleAttribute("hidden");
});

window.addEventListener('load', () => {
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            const { displayName, email, uid } = user;
            if (email.indexOf('@teslabg.edu.rs') > 0) {
                localStorage.setItem('uid', uid);
                localStorage.setItem('email', email);
                localStorage.setItem('displayName', displayName);
                socket.connect();
                socket.emit("conn", uid, displayName, email);
            } else {
                localStorage.clear();
                btns.toggleAttribute("hidden");
                let time = 5;
                document.getElementById("error").innerHTML = `Moraš koristiti školski mejl! Preusmeravanje za <span id="preostVreme"></span> sekund(i)...`;
                firebase.auth().signOut().then(() => {
                    setInterval(() => {
                        time -= 1;
                        document.getElementById("preostVreme").innerText = `${time}`;
                    }, 1000);
                    setTimeout(() => {
                        window.location.replace("index.html");
                    }, 5000);
                }).catch(console.error);
            }
        }
    }, console.error);
});