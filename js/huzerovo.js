// LocalStorage 读写
function hasStorage(key) {
    if (localStorage.getItem(key) === null) {
        return false;
    } else {
        return true;
    }
}

function getStorage(key) {
    return localStorage.getItem(key);
}

function setStorage(key, value) {
    localStorage.setItem(key, value)
}

// 主题切换
function switchTheme() {
    if (getStorage('currentTheme') === 'light') {
        setTheme('dark');
    } else {
        setTheme('light')
    }
}

function setTheme(theme) {
    let root = $('#root');
    if (theme === 'light') {
        root.addClass('light');
        root.removeClass('dark');
        $('#code-style').attr('href', codeStyle.light);
        setLightThemeIcon();
    } else {
        root.addClass('dark');
        root.removeClass('light');
        $('#code-style').attr('href', codeStyle.dark);
        setDarkThemeIcon();
    }
    setStorage('currentTheme', theme)
}

function setDarkThemeIcon() {
    $('#btn-switch-theme i').removeClass('bi-sun');
    $('#btn-switch-theme i').addClass('bi-moon');
}

function setLightThemeIcon() {
    $('#btn-switch-theme i').removeClass('bi-moon');
    $('#btn-switch-theme i').addClass('bi-sun');
}

function followTheme() {
    let darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    let lightMode = window.matchMedia('(prefers-color-scheme: light)').matches;
    let theme = getStorage('currentTheme');

    if (theme === 'light' && darkMode) {
        switchTheme()
    } else if (theme === 'dark' && lightMode) {
        switchTheme();
    }
}

function myLoading() {
    if (hasStorage('currentTheme')) {
        setTheme(getStorage('currentTheme'));
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme('dark');
    } else {
        setTheme('light');
    }
}
