// Note ThemeConf is defined in the <head> node.
// This is a example:
// const ThemeConf = {
//   rootId: "root",
//   codeId: "code-style",
//   ibtnId: "btn-switch-theme",
//   iconDarkClass: "bi-moon",
//   iconLightClass: "bi-sun",
//   codeStyle: {
//      light: "/path/to/light.css"
//      dark: "/path/to/dark.css"
//   }
// };

const ThemeSwitcher = {
  mode: { auto: "auto", dark: "dark", light: "light" },

  _preferName: "ThemePrefer",

  _current: "light",

  _getPrefer: function () {
    return localStorage.getItem(ThemeSwitcher._preferName);
  },

  _setPrefer: function (mode) {
    localStorage.setItem(ThemeSwitcher._preferName, mode);
  },

  toLight: function () {
    let root = document.getElementById(ThemeConf.rootId);
    if (root) root.removeAttribute("class");
    let code = document.getElementById(ThemeConf.codeId);
    if (code) code.setAttribute("href", ThemeConf.codeStyle.light);

    let icon = document.getElementById(ThemeConf.ibtnId);
    if (icon) {
      icon = icon.querySelector("i");
      icon.classList.remove("bi-moon");
      icon.classList.add("bi-sun");
    }
    ThemeSwitcher._current = ThemeSwitcher.mode.light;
  },

  toDark: function () {
    let root = document.getElementById(ThemeConf.rootId);
    if (root) root.setAttribute("class", ThemeSwitcher.mode.dark);
    let code = document.getElementById(ThemeConf.codeId);
    if (code) code.setAttribute("href", ThemeConf.codeStyle.dark);

    let icon = document.getElementById(ThemeConf.ibtnId);
    if (icon) {
      icon = icon.querySelector("i");
      icon.classList.remove("bi-sun");
      icon.classList.add("bi-moon");
    }
    ThemeSwitcher._current = ThemeSwitcher.mode.dark;
  },

  toAuto: function () {
    if (isDeviceInDark()) {
      ThemeSwitcher.toDark();
    } else {
      ThemeSwitcher.toLight();
    }
  },

  init: function () {
    // Check if there is a preference.
    if (localStorage.getItem(ThemeSwitcher._preferName) === null) {
      ThemeSwitcher._setPrefer(ThemeSwitcher.mode.auto);
    }
    ThemeSwitcher.follow();
  },

  follow: function () {
    switch (ThemeSwitcher._getPrefer()) {
      case ThemeSwitcher.mode.auto:
        ThemeSwitcher.toAuto();
        break;
      case ThemeSwitcher.mode.dark:
        ThemeSwitcher.toDark();
        break;
      case ThemeSwitcher.mode.light:
        ThemeSwitcher.toLight();
        break;
      default:
        ThemeSwitcher._setPrefer(ThemeSwitcher.mode.auto);
        ThemeSwitcher.toAuto();
        break;
    }
  },
};

function isDeviceInDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function switchThemeClickHandler() {
  let isWebDark = ThemeSwitcher._current === ThemeSwitcher.mode.dark;
  let isDevDark = isDeviceInDark();
  if ((!isWebDark && isDevDark) || (isWebDark && !isDevDark)) {
    ThemeSwitcher._setPrefer(ThemeSwitcher.mode.auto);
  } else if (isWebDark) {
    ThemeSwitcher._setPrefer(ThemeSwitcher.mode.light);
  } else {
    ThemeSwitcher._setPrefer(ThemeSwitcher.mode.dark);
  }
  ThemeSwitcher.follow();
}
