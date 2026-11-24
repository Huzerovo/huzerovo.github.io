/* huzerovo 主题 · 交互脚本（原生 JS，无依赖）
 * 明暗主题切换、搜索输入绑定、菜单溢出渐隐、文章目录折叠、回到顶部、图片灯箱。
 * 由 Layout 在 </body> 前引入；无需服务端按配置拼接脚本。
 */
(function () {
  "use strict";

  var root = document.documentElement;
  var KEY = "df-theme-prefer";
  var isDark = function () {
    return root.classList.contains("dark");
  };

  /** 应用主题：dark | light | auto（写入 localStorage，同步 dataset/colorScheme） */
  var applyTheme = function (mode) {
    if (mode === "dark") root.classList.add("dark");
    else if (mode === "light") root.classList.remove("dark");
    else if (window.matchMedia("(prefers-color-scheme: dark)").matches) root.classList.add("dark");
    else root.classList.remove("dark");
    root.dataset.theme = isDark() ? "dark" : "light";
    root.style.colorScheme = isDark() ? "dark" : "light";
    localStorage.setItem(KEY, mode);
  };

  var currentTheme = function () {
    return localStorage.getItem(KEY) || "auto";
  };

  var toggleTheme = function () {
    var devDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if ((!isDark() && devDark) || (isDark() && !devDark)) applyTheme("auto");
    else if (isDark()) applyTheme("light");
    else applyTheme("dark");
  };

  var switchBtn = document.getElementById("btn-switch-theme");
  if (switchBtn) switchBtn.addEventListener("click", toggleTheme);

  // 跟随系统变化（显式 light/dark 模式下 applyTheme 会保持用户选择）
  window
    .matchMedia("(prefers-color-scheme: light)")
    .addEventListener("change", function () {
      applyTheme(currentTheme());
    });

  // 搜索输入 → 主题搜索（search.js 提供 window.searchArticles）
  var searchInput = document.getElementById("search-input");
  if (searchInput && window.searchArticles) {
    searchInput.addEventListener("input", function () {
      window.searchArticles(this.value, "/search.json");
    });
  }

  // 顶栏菜单溢出渐隐
  var menu = document.querySelector(".topbar-menu ul");
  if (menu) {
    var updateMenuFade = function () {
      menu.classList.toggle("scrollable", menu.scrollWidth > menu.clientWidth + 1);
    };
    updateMenuFade();
    window.addEventListener("resize", updateMenuFade);
  }

  // 文章目录折叠（localStorage 记忆）
  var toc = document.getElementById("article-toc");
  var tocBtn = document.querySelector(".toc-toggle");
  if (toc && tocBtn) {
    var applyToc = function (collapsed) {
      toc.classList.toggle("collapsed", collapsed);
      tocBtn.setAttribute("aria-expanded", String(!collapsed));
    };
    applyToc(localStorage.getItem("df-toc-collapsed") === "1");
    tocBtn.addEventListener("click", function () {
      var next = !toc.classList.contains("collapsed");
      applyToc(next);
      localStorage.setItem("df-toc-collapsed", next ? "1" : "0");
    });
  }

  // 回到顶部
  var topBtn = document.getElementById("goto-top");
  if (topBtn) {
    window.addEventListener("scroll", function () {
      if (window.scrollY > 300) topBtn.classList.add("show");
      else topBtn.classList.remove("show");
    });
    topBtn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // 图片灯箱：正文图片 .img-link、首页卡片封面 .post-card-cover、图册 .gallery-item
  // （.gallery-item 仅在 gallery.lightbox 开启时由服务端渲染；无灯箱元素时整体为 no-op）
  var lightbox = document.getElementById("lightbox");
  if (lightbox) {
    document
      .querySelectorAll("a.img-link, .post-card-cover, .gallery-item")
      .forEach(function (link) {
        link.addEventListener("click", function (e) {
          e.preventDefault();
          var inner = link.querySelector("img");
          var src = inner ? inner.src : link.href;
          lightbox.querySelector("img").src = src;
          lightbox.classList.add("open");
        });
      });
    // 仅点击遮罩背景关闭（点图片本身不关，避免冒泡闪关）
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) lightbox.classList.remove("open");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") lightbox.classList.remove("open");
    });
  }
})();
