/* default 主题 · 原生搜索（无依赖）：
 * 拉取 /search.json，按空格分词过滤标题/正文/标签/分类；
 * 关键词以 `/` 开头进入正则模式（如 /gfm、/g[a-z]+m、包裹形式 /foo bar/），
 * 大小写不敏感，匹配结果与普通关键词一样高亮。
 * 摘要以最早命中的关键词为中心截取（关键词靠后也能在预览中高亮）。
 * 由 Layout 底部脚本在 #search-input 上绑定 input 事件调用 window.searchArticles。
 */
(function () {
  "use strict";

  var cache = null;
  var cacheUrl = "";

  function loadIndex(url, cb) {
    if (cache && cacheUrl === url) {
      cb(cache);
      return;
    }
    fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error("search.json " + r.status);
        return r.json();
      })
      .then(function (data) {
        cache = data;
        cacheUrl = url;
        cb(data);
      })
      .catch(function (err) {
        console.error("搜索索引加载失败:", err);
        cb([]);
      });
  }

  /**
   * 分词：空白分隔；以 `/` 开头的关键词进入正则模式。
   * 支持 `/.../` 包裹（内部可含空格，`\/` 转义）；未闭合时按空白截断。
   */
  function parseKeywords(raw) {
    var kws = [];
    var i = 0;
    var n = raw.length;
    var isSpace = function (ch) {
      return /\s/.test(ch);
    };
    while (i < n) {
      while (i < n && isSpace(raw[i])) i++;
      if (i >= n) break;
      if (raw[i] === "/") {
        // 优先找闭合的 /（可跨空格，跳过 \/ 转义）→ 整段为一个正则；
        // 未闭合则按空白截断（如 /foo bar = 正则 foo + 普通词 bar）
        var j = i + 1;
        var closed = -1;
        while (j < n) {
          if (raw[j] === "\\") {
            j += 2;
            continue;
          }
          if (raw[j] === "/") {
            closed = j;
            break;
          }
          j++;
        }
        if (closed !== -1) {
          kws.push(raw.slice(i, closed + 1));
          i = closed + 1;
        } else {
          var k = i + 1;
          while (k < n && !isSpace(raw[k])) k++;
          kws.push(raw.slice(i, k));
          i = k;
        }
      } else {
        var m = i;
        while (m < n && !isSpace(raw[m])) m++;
        kws.push(raw.slice(i, m));
        i = m;
      }
    }
    return kws;
  }

  function isRegex(kw) {
    return kw.length > 1 && kw[0] === "/";
  }

  function compile(kw) {
    if (isRegex(kw)) {
      // 去掉前导 /；如以 / 结尾（包裹形式）同样去掉
      var src = kw.slice(1);
      if (src.length > 0 && src[src.length - 1] === "/") src = src.slice(0, -1);
      if (src === "") return { re: null, plain: kw.toLowerCase() };
      try {
        return { re: new RegExp(src, "i"), plain: null };
      } catch (e) {
        // 非法正则：按普通文本搜索（去掉前导 /）
        return { re: null, plain: src.toLowerCase() };
      }
    }
    return { re: null, plain: kw.toLowerCase() };
  }

  function match(item, comps) {
    var haystack = (
      item.title +
      " " +
      item.content +
      " " +
      (item.tags || []).join(" ") +
      " " +
      (item.categories || []).join(" ")
    ).toLowerCase();
    for (var i = 0; i < comps.length; i++) {
      var c = comps[i];
      if (c.re) {
        if (!c.re.test(haystack)) return false;
      } else if (haystack.indexOf(c.plain) === -1) {
        return false;
      }
    }
    return true;
  }

  /**
   * 摘要：以最早命中的关键词为中心截取 ~maxLen 窗口，并保证完整包含关键词
   * （避免截断破坏高亮）。前后截断处用 … 标注；未命中（理论上不会发生）回退为从头截断。
   */
  function excerptAround(content, comps, maxLen) {
    var pos = -1;
    var kwLen = 1;
    for (var i = 0; i < comps.length; i++) {
      var c = comps[i];
      var m = c.re
        ? c.re.exec(content)
        : c.plain
          ? new RegExp(escapeRegExp(c.plain), "i").exec(content)
          : null;
      if (m && (pos === -1 || m.index < pos)) {
        pos = m.index;
        kwLen = m[0].length || 1;
      }
    }
    if (pos === -1) {
      if (content.length <= maxLen) return content;
      return content.slice(0, maxLen) + "…";
    }
    var lead = Math.floor(maxLen * 0.35);
    var start = Math.max(0, pos - lead);
    var end = Math.min(content.length, start + maxLen);
    if (end < pos + kwLen) end = Math.min(content.length, pos + kwLen);
    var out = content.slice(start, end);
    if (start > 0) out = "…" + out;
    if (end < content.length) out += "…";
    return out;
  }

  function render(items, container, comps) {
    if (items.length === 0) {
      container.innerHTML = '<p class="search-empty">无结果</p>';
      return;
    }
    var html = "";
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var excerpt = excerptAround(it.content, comps, 160);
      var metaParts = [];
      if (it.date) metaParts.push(escapeHtml(it.date));
      if (it.tags && it.tags.length) {
        metaParts.push(it.tags.map(function (tag) { return highlight(tag, comps); }).join(" / "));
      }
      if (it.categories && it.categories.length) {
        metaParts.push(it.categories.map(function (cat) { return highlight(cat, comps); }).join(" / "));
      }
      html +=
        '<a class="search-item" href="' +
        it.url +
        '">' +
        '<div class="search-item-title">' +
        highlight(it.title, comps) +
        "</div>" +
        '<p class="search-item-excerpt">' +
        highlight(excerpt, comps) +
        "</p>" +
        '<div class="search-item-meta">' +
        metaParts.join(" · ") +
        "</div>" +
        "</a>";
    }
    container.innerHTML = html;
  }

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * 高亮：在**原始文本**上匹配（正则/普通关键词统一处理），输出时才做 HTML 转义。
   * 先转义再匹配会导致含 & < > " 的命中漏高亮（如 /->/ 在 -&gt; 上匹配不到），
   * 因此这里收集所有命中区间、合并重叠后一次性拼接；空匹配跳过。
   */
  function highlight(raw, comps) {
    var ranges = [];
    for (var i = 0; i < comps.length; i++) {
      var c = comps[i];
      var re = c.re
        ? new RegExp(c.re.source, "gi")
        : c.plain
          ? new RegExp(escapeRegExp(c.plain), "gi")
          : null;
      if (!re) continue;
      var m;
      while ((m = re.exec(raw)) !== null) {
        if (m[0].length === 0) {
          re.lastIndex += 1; // 空匹配不产生高亮，避免死循环
          continue;
        }
        ranges.push([m.index, m.index + m[0].length]);
      }
    }
    if (ranges.length === 0) return escapeHtml(raw);
    ranges.sort(function (a, b) {
      return a[0] - b[0] || a[1] - b[1];
    });
    var merged = [ranges[0]];
    for (var k = 1; k < ranges.length; k++) {
      var last = merged[merged.length - 1];
      if (ranges[k][0] <= last[1]) {
        if (ranges[k][1] > last[1]) last[1] = ranges[k][1];
      } else {
        merged.push(ranges[k]);
      }
    }
    var out = "";
    var pos = 0;
    for (var r = 0; r < merged.length; r++) {
      out += escapeHtml(raw.slice(pos, merged[r][0]));
      out += "<mark>" + escapeHtml(raw.slice(merged[r][0], merged[r][1])) + "</mark>";
      pos = merged[r][1];
    }
    out += escapeHtml(raw.slice(pos));
    return out;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  window.searchArticles = function (raw, url) {
    var container = document.getElementById("search-results");
    if (!container) return;
    var kws = parseKeywords(raw);
    if (kws.length === 0) {
      container.innerHTML = "";
      return;
    }
    var comps = kws.map(compile);
    loadIndex(url || "/search.json", function (index) {
      var hits = index.filter(function (it) {
        return match(it, comps);
      });
      render(hits, container, comps);
    });
  };
})();
