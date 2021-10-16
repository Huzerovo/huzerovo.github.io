function switchToDarkMode() {
    let root = document.getElementById("root");
    root.setAttribute("class", "dark");
    let codeStyleCSS = document.getElementById("code-style");
    if (codeStyleCSS !== null) {
        codeStyleCSS.setAttribute("href", codeStyle.dark);
    }
    return "dark";
}

function switchToLightMode() {
    let root = document.getElementById("root");
    root.setAttribute("class", "light");
    let codeStyleCSS = document.getElementById("code-style");
    if (codeStyleCSS !== null) {
        codeStyleCSS.setAttribute("href", codeStyle.light);
    }
    return "light";
}

function switchTheme() {
    let currentTheme = localStorage.getItem("currentTheme");
    if (currentTheme === "light") {
        localStorage.setItem("currentTheme", switchToDarkMode());
    } else if (currentTheme === "dark") {
        localStorage.setItem("currentTheme", switchToLightMode());
    } else {
        console.log("Switch theme style failed");
    }
}

function setTheme() {
    if (localStorage.getItem("currentTheme") === null) {
        if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
            localStorage.setItem("currentTheme", switchToDarkMode());
            return;
        }
        localStorage.setItem("currentTheme", "light");
        let root = document.getElementById("root");
        root.setAttribute("class", "light");
    } else if (localStorage.getItem("currentTheme") === "dark") {
        localStorage.setItem("currentTheme", switchToDarkMode());
    } else if (localStorage.getItem("currentTheme") === "light") {
        localStorage.setItem("currentTheme", switchToLightMode());
    } else {
        console.log("Unknow Theme:" + localStorage.getItem("currentTheme"));
    }
}

function changeMenu() {
    let menu = document.getElementById("side-nav");
    console.log(menu.getAttribute("class"));
    if (menu.getAttribute("class") === "hidden") {
        menu.setAttribute("class", "show");
    } else {
        menu.setAttribute("class", "hidden");
    }
}