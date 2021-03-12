const socket = io('http://localhost:2000', {
    autoConnect: false
});

const text = document.getElementById('message');
const time = document.getElementById('time');
const question = document.getElementById('question');
const btns = document.getElementById('buttons-wrapper');
const start_form = document.getElementById("start-form");

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
        // console.log("true");
        start_form[0].placeholder = 'Moras upisati sifru!';
    }
});

btns.addEventListener('submit', e => {
    e.preventDefault();
    if (e.submitter.id === "btn-dc") {
        socket.disconnect();
        console.log("disconnected!");
        start_form.toggleAttribute('hidden');
        btns.toggleAttribute('hidden');
    } else {
        socket.emit('izbor', e.submitter.id);
    }
});

socket.on('log', message => console.log(message));

socket.on('res', (message, recv_obj) => {
    text.innerHTML = message;
    question.innerHTML = recv_obj.prompt;
});