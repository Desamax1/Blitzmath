window.addEventListener('load', () => {
    fetch("https://backend.blitzmath.ml:8443/leaderboard").then(res => res.json().then(json => json.forEach(usr => {
        // console.log(usr);
        const element = document.createElement("tr");
        const data1 = document.createElement("td");
        data1.innerText = usr.ime_prezime;
        const data2 = document.createElement("td");
        data2.innerText = usr.highscore;
        element.appendChild(data1);
        element.appendChild(data2);
        document.querySelector("tbody").appendChild(element);
    })));
});