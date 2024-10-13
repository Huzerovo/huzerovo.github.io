let articles = null;

function clear_error() {
  $("#search-input").removeAttr("style");
}

function regex_error() {
  $("#search-input").attr("style", "color: red;");
}

/*
 * 对关键字进行预处理：移除首尾空格、移除空字符（strlen == 0）、分割等。
 * k: 关键字
 * c: 分割字符，空字符表示不分割
 * return: string数组
 */
function preprocess_keywords(k, c = "") {
  if (typeof k !== "string") {
    return [];
  }

  if (k === "") {
    return [];
  }

  if (c !== "") {
    k = k.split(c);
  } else {
    k = [k];
  }

  // 移除首尾空格
  k.forEach(function (e, i, a) {
    a[i] = e.trim();
  });

  // 排序
  k.sort(function (a, b) {
    return b.length - a.length;
  });

  let ret = [];

  for (i in k) {
    if (k[i] !== "") {
      ret.push(k[i]);
    }
  }

  return ret;
}

// 正则搜索
function search_with_regex(k, article) {
  let regex = null;
  let html_str = "";
  try {
    regex = new RegExp(k, "g");
  } catch {
    regex_error();
    return html_str;
  }

  try {
    if (article.title !== "" && article.content !== "") {
      let title = article.title;
      let content = article.content;
      let match = false;
      let start = content.length;
      let end = -1;
      if (title.search(regex) !== -1) {
        match = true;
        title = title.replace(regex, "<mark>$&</mark>");
      }

      start = content.search(regex);
      end = start + 80;
      if (start !== -1) {
        match = true;
      }

      if (match) {
        if (start <= 0) {
          start = 0;
          end = Math.min(180, content.length);
        } else {
          start = Math.max(0, start - 80);
          end = Math.min(content.length, end);
        }
        // 先替换关键字的话，可能会在<mark>或</mark>标签中断开
        // 导致显示错误。
        content = content.slice(start, end).replace(regex, "<mark>$&</mark>");
        html_str = `
        <article class="articles-list-item">
            <a href="${article.url}">
                <p class="post-entry-title">
                    ${title}
                </p>
                <p class="item-content">
                    ${content}
                </p>
            </a>
        </article>`;
      }
    }
    return html_str;
  } catch (e) {
    console.log(e);
  }

  return html_str;
}

// 关键字搜索
function search_with_keywords(keywords, article) {
  let title = article.title;
  let content = article.content;
  let match = false;
  if (title !== "" && content !== "") {
    // 按照关键字顺序查找，在第一次查找成功后或者查找失败时跳出
    // 此时关键字可能包含'&'
    for (let i in keywords) {
      // 对关键字进行处理
      // 如果关键字不包含'&'，则ks是只有一个元素的数组，否则是多个元素的数组。
      let ks = preprocess_keywords(keywords[i], "&");
      if (ks.length === 0) {
        continue;
      }
      // 匹配到的关键字个数
      let count = 0;
      // 标记首次匹配成功位置
      let start = -1;
      for (let j in ks) {
        let k = ks[j];
        let idx_title = title.indexOf(k);
        let idx_content = content.indexOf(k);
        // 当标题或者内容中存在关键字时表示查找成功
        if (idx_title >= 0 || idx_content >= 0) {
          count++;
          // 只有第一个关键字匹配才会显示高亮
          if (start < 0) {
            title = title.replaceAll(k, "<mark>" + k + "</mark>");
            start = Math.max(0, idx_content - 80);
            let end = Math.min(content.length, start + 160);
            content = content.slice(start, end);
            content = content.replaceAll(k, "<mark>" + k + "</mark>");
          }
        }
      }
      // 包含'&'时，只有当关键字全部匹配时才算成功
      if (count === ks.length) {
        match = true;
        break;
      }
    }

    // 如果有匹配的
    if (match) {
      return `
        <article class="articles-list-item">
            <a href="${article.url}">
                <p class="post-entry-title">
                    ${title}
                </p>
                <p class="item-content">
                    ${content}
                </p>
            </a>
        </article>`;
    }
  }
  return "";
}

// 这个实现在具有大量文章时可能表现不佳
function searchArticle(path) {
  clear_error();
  let pattern = $("#search-input").val().trim();
  // 输入为空
  if (pattern.length < 1) {
    $("#search-result .articles-list").empty();
    return;
  }

  let keywords = "";
  let use_regex = false;
  // 判断是否为正则
  if (
    pattern.length > 2 &&
    pattern[0] === "/" &&
    pattern[pattern.length - 1] === "/"
  ) {
    keywords = pattern.replace(/^\//, "").replace(/\/$/, "");
    use_regex = true;
  } else {
    keywords = preprocess_keywords(pattern, "+");
    if (keywords.length === 0) {
      return;
    }
    use_regex = false;
  }

  // 请求xml
  $.ajax({
    url: path,
    dataType: "xml",
    success: function (data) {
      // 加载文章
      if (articles === null) {
        // 转为Array
        articles = $("entry", data)
          .map(function () {
            return {
              title: $("title", this).text().trim(),
              url: $("url", this).text(),
              // 删除content中的HTML标签
              content: $("content", this).text().replace(/<.*?>/g, ""),
            };
          })
          .get();
      }

      // 在文章的标题与内容中查找关键字
      $("#search-result .articles-list").empty();
      articles.forEach(function (article) {
        let html_str = "";
        // 使用正则查找
        if (use_regex) {
          html_str = search_with_regex(keywords, article);
        } else {
          html_str = search_with_keywords(keywords, article);
        }
        if (html_str !== "") {
          $("#search-result .articles-list").append(html_str);
        }
      });
    }, // success END
    error: function () {
      console.log("Request '" + path + "' failed in ajax.");
    },
  });
}
