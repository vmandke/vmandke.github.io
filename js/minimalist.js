window.onload = function() {
    console.log("Welcome to vmandke's world. Have fun!!!")
    welcomeScreen()
}

function clearMainDiv() {
    var maindiv = document.getElementById("maindiv");
    while (maindiv.firstChild) {
        maindiv.removeChild(maindiv.firstChild);
    }   
}

function welcomeScreen() {
    var maindiv = document.getElementById("maindiv");
    title = document.createElement("div")
    subtitle = document.createElement("div")
    title.textContent = "Vinaya Mandke"
    subtitle.textContent = "Ramblings of an eternal learner"
    title.setAttribute("class", "titlename")
    subtitle.setAttribute("class", "titlename subtitle")
    maindiv.appendChild(title)
    maindiv.appendChild(subtitle)
}