const socket = io("wss:///", {
    autoConnect: false
});

const btns = document.getElementById("buttons-wrapper");
const progBar = document.getElementById("progbar");

function shuffle(array) {
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

function replaceButtons(answers) {
    document.getElementById("btn-1").innerHTML = answers[0];
    document.getElementById("btn-2").innerHTML = answers[1];
    document.getElementById("btn-3").innerHTML = answers[2];
    document.getElementById("btn-4").innerHTML = answers[3];
}

btns.addEventListener("submit", e => {
    e.preventDefault();
    socket.emit("izbor", e.submitter.textContent);
});

function start(first) {
    if (first) {
        document.getElementById("solo-msg").toggleAttribute("hidden");
        socket.connect();
    } else {
        document.getElementById("solo-fail").toggleAttribute("hidden");
        socket.connect();
    }
    btns.toggleAttribute("hidden");
    socket.emit("getQ");
}

socket.on("log", console.log);

socket.on("questions", (q, time) => {
    progBar.classList.remove("progress");
    void progBar.offsetWidth;
    progBar.classList.add("progress");
    document.querySelector("body").style.setProperty("--animation-time", time + "ms");
    document.getElementById('question').innerHTML = q.prompt;
    replaceButtons(shuffle(q.answers));
    console.log(q, time);
});

socket.on("res", (correct, score, time) => {
    console.log(correct)
    if (!correct) {
        btns.toggleAttribute("hidden");
        if (time) {
            // pogresio je
            document.getElementById("reason").innerText = "Ostao si bez vremena!";
        } else {
            // ostao je bez vremena
            document.getElementById("reason").innerText = "Pogresno si odgovorio na to pitanje!";
        }
        document.getElementById("solo-score").innerText = `${score}`;
        document.getElementById("solo-fail").toggleAttribute("hidden");
    } else {
        socket.emit("getQ");
    }
});