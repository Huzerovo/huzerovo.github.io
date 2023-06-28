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
    $('#icon-search').attr('src', '/img/light-search.svg');
    $('#icon-theme').attr('src', '/img/moon.svg');
}

function setLightThemeIcon() {
    $('#icon-search').attr('src', '/img/dark-search.svg');
    $('#icon-theme').attr('src', '/img/sun.svg');
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

function myFinished() {
    // 页面载入后设置icon
    setTheme(getStorage('currentTheme'));
    // 监听事件
    $('#btn-switch-theme').click(function() {switchTheme()});
    $('#btn-side-menu').click(function() {
        let e = $('#side-nav');
        if (e.hasClass('hidden')) {
            e.removeClass('hidden');
            e.addClass('show');
        } else {
            e.removeClass('show');
            e.addClass('hidden');
        }
    });
    $('#btn-search').click(function() {console.log('Searching...')});
    $('#goto-top').click(function() {
        $('#root').scrollTop(0);
    });

    $('#goto-top').hide();
    window.onscroll = function() {
        if ($('#root').scrollTop() > 300) {
            $('#goto-top').show();
        } else {
            $('#goto-top').hide();
        }
    };
}
