const firebaseConfig = {
    apiKey: "AIzaSyAi305auov5H3siXdByjx-fBKbom9X9EqM",
    authDomain: "blitzmath-3ee6b.firebaseapp.com",
    databaseURL: "https://blitzmath-3ee6b-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "blitzmath-3ee6b",
    storageBucket: "blitzmath-3ee6b.appspot.com",
    messagingSenderId: "762275634313",
    appId: "1:762275634313:web:12e5fd745f38f5b808ba58",
    measurementId: "G-Q5JPQ5KHWE"
};

firebase.initializeApp(firebaseConfig);
firebase.analytics();

document.getElementById("logout").addEventListener('click', () => {
    firebase.auth().signOut().then(() => {
        window.location.replace("/");
    }).catch(console.error);
});

document.getElementById("solo-mod").addEventListener('click', () => {
    window.location.replace("solo.html");
});

document.getElementById("leaderboard").addEventListener('click', () => {
    window.location.replace("leaderboard.html");
});

firebase.auth().onAuthStateChanged(user => {
    // if (user) {
    //     const {displayName, uid, photoURL} = user;
    //     fetch(`https://backend.blitzmath.ml:8443/loggedIn?uid=${uid}`).then(res => res.json().then(json => console.log(json)));
        // document.getElementById("slika").src = photoURL;
        // document.getElementById("name").innerText = displayName;
        // fetch(`https://backend.blitzmath.ml:8443/leaderboard?uid=${uid}`).then(res => res.json().then(json => {
        //     document.getElementById("highscore").innerText = json.score;
        // }));
        // document.getElementById("loading").toggleAttribute("hidden");
        // document.querySelector("main").classList = "";
    // } else {
    //     let time = 5;
    //     document.getElementById("error").innerHTML = `Moraš koristiti školski mejl! Preusmeravanje za <span id="preostVreme"></span>s...`;
    //     firebase.auth().signOut().then(() => {
    //         setInterval(() => {
    //             time -= 1;
    //             document.getElementById("preostVreme").innerText = `${time}`;
    //         }, 1000);
    //         setTimeout(() => {
    //             window.location.replace("index.html");
    //         }, 5000);
    //     }).catch(console.error);
    // }
    if (user) {
        const { displayName, email, uid, photoURL } = user;
        if (email.indexOf('@teslabg.edu.rs') > 0) {
            fetch(`https://backend.blitzmath.ml:8443/loggedIn?uid=${uid}`).then(res => res.json().then(json => console.log(json)));
            document.getElementById("slika").src = photoURL;
            document.getElementById("name").innerText = displayName;
            fetch(`https://backend.blitzmath.ml:8443/leaderboard?uid=${uid}`).then(res => res.json().then(json => {
                document.getElementById("highscore").innerText = json.score;
            }));
            document.getElementById("loading").toggleAttribute("hidden");
            document.querySelector("main").classList = "";
        } else {
            let time = 5;
            document.getElementById("error").innerHTML = 'Moraš koristiti školski mejl! Preusmeravanje za <span id="preostVreme"></span>s...';
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