// Coolie 读取写入
function hasCookie(key) {
    if (localStorage.getItem(key) === null) {
        return false;
    } else {
        return true;
    }
}

function getCookie(key) {
    return localStorage.getItem(key);
}

function setCookie(key, value) {
    localStorage.setItem(key, value)
}

// 主题切换
function switchTheme() {
    if (getCookie('currentTheme') === 'light') {
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
    } else {
        root.addClass('dark');
        root.removeClass('light');
        $('#code-style').attr('href', codeStyle.dark);
    }
    setCookie('currentTheme', theme)
}

function followTheme() {
	let darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
	let lightMode = window.matchMedia('(prefers-color-scheme: light)').matches;
	let theme = getCookie('currentTheme');

	if (theme === 'light' && darkMode) {
		switchTheme()
	} else if (theme === 'dark' && lightMode) {
		switchTheme();
	}
}

function initTheme() {
    if (hasCookie('currentTheme')) {
        setTheme(getCookie('currentTheme'));
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme('dark');
    } else {
        setTheme('light');
    }
}

// 导航栏，侧边栏切换
function hideOrShow(e) {
    if (e.hasClass('hidden')) {
        e.removeClass('hidden');
        e.addClass('show');
    } else {
        e.removeClass('show');
        e.addClass('hidden');
    }
}

function changeMenu() {
    hideOrShow($('#side-nav'));
}

function switchSidebar() {
    hideOrShow($('.left-sidebar, .right-sidebar'));
}
