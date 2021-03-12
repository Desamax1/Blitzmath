const socket = io('http://localhost:2000', {
    autoConnect: false
});

const text = document.getElementById('message');
const time = document.getElementById('time');
const question = document.getElementById('question');
const btns = document.getElementById('buttons-wrapper');
const start_form = document.getElementById("start-form");

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
    }
    return array;
};

const replaceButtons = answers => {
    button1.innerHTML = answers[0];
    button2.innerHTML = answers[1];
    button3.innerHTML = answers[2];
    button4.innerHTML = answers[3];
};

start_form.addEventListener('submit', e => {
    e.preventDefault();
    if (start_form[0].value) {
        socket.connect();
        start_form.toggleAttribute('hidden');
        btns.toggleAttribute('hidden');
        socket.emit('start', start_form[0].value);
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
    text.innerHTML = message;
    question.innerHTML = recv_obj.prompt;
    const answers = shuffle(recv_obj.answers);
    console.log(answers);
    replaceButtons(answers);
});