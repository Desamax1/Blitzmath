const socket = io('https://backend.blitzmath.ml:2053', {
    autoConnect: false
});

const text = document.getElementById('message');
const time = document.getElementById('time');
const question = document.getElementById('question');
const btns = document.getElementById('buttons-wrapper');
const start_form = document.getElementById("start-form");

const errorP = document.getElementById("error");
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

start_form.addEventListener('submit', e => {
    e.preventDefault();
    if (start_form[0].value) {
        socket.connect();
        socket.emit('start', parseInt(start_form[0].value));
        start_form[0].value = '';
        start_form[0].placeholder = 'Unesi svoju sifru';
    } else {
        start_form[0].placeholder = 'Moras upisati sifru!';
    };
});

btns.addEventListener('submit', e => {
    e.preventDefault();
    if (e.submitter.id === "btn-dc") {
        socket.disconnect();
        console.log("disconnected!");
        start_form.toggleAttribute('hidden');
        btns.toggleAttribute('hidden');
    } else {
        socket.emit('izbor', e.submitter.textContent);
    };
});

socket.on('log', message => console.log(message));

socket.on('res', (message, recv_obj) => {
    if (message === "start") {
        start_form.toggleAttribute('hidden');
        btns.toggleAttribute('hidden');
        question.innerHTML = recv_obj.prompt;
        replaceButtons(shuffle(recv_obj.answers));
        errorP.innerHTML = "";
    } else if (message === "error") {
        errorP.innerHTML = recv_obj;
    } else {
        progBar.classList.remove("progress");
        void progBar.offsetWidth;
        progBar.classList.add("progress");
        question.innerHTML = recv_obj.prompt;
        replaceButtons(shuffle(recv_obj.answers));
    };
});

socket.on('penalty', () => {
    toggleInputs();
    setTimeout(() => toggleInputs(), 3000);
});