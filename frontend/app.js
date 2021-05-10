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
    }).catch(e => console.error(e));
});

document.getElementById("takmicenje").addEventListener('click', () => {
    window.location.replace(`/takmicenje.html`);
});

const updateUi = async (displayName, uid, photoURL) => {
    document.getElementById("slika").src = photoURL;
    document.getElementById("name").innerText = displayName;
    // document.getElementById("highscore").innerText = await axios.get(`https://backend.blitzmath.ml/leaderboard?uid=${uid}`);
}

firebase.auth().onAuthStateChanged(user => {
    if (user) {
            const {displayName, uid, photoURL} = user;
            updateUi(displayName, uid, photoURL);
            document.getElementById("loading").toggleAttribute("hidden");
            document.querySelector("main").classList = "";
        } else {
            window.location.replace("/");
        }
    }, e => console.error(e));