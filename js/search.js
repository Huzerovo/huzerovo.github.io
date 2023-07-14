let articles = null;

function clear_error() {
    $('#search').removeAttr('style');
}
function regex_error() {
    $('#search').attr('style', 'color: red;');
}

// 正则搜索
function search_with_regex(k, article) {
    let regex = null;
    let html_str = '';
    try {
        regex = new RegExp(k, 'g');
    } catch {
        regex_error();
        return html_str;
    }

    try {
        if (article.title !== '' && article.content !== '') {
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
                <p class="item-title">
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
    if (title !== '' && content !== '') {
        // 按照关键字顺序查找，在第一次查找成功后或者查找失败时跳出
        for (let i in keywords) {
            let k = keywords[i];
            // 在输入关键字处理时，去除首尾空格可能导致空字符
            if (k === '') {
                continue;
            }
            let idx_title = title.indexOf(k);
            let idx_content = content.indexOf(k);
            if (idx_title >= 0 || idx_content >= 0) {
                match = true;
                title = title.replaceAll(k, '<mark>' + k + '</mark>');
                if (idx_content >= 0) {
                    let start = Math.max(0, idx_content - 80);
                    let end = Math.min(content.length, start + 160);
                    content = content.slice(start, end);
                    content = content.replaceAll(k, '<mark>' + k + '</mark>');
                }
                break;
            }
        }

        // 如果有匹配的
        if (match) {
            return `
        <article class="articles-list-item">
            <a href="${article.url}">
                <p class="item-title">
                    ${title}
                </p>
                <p class="item-content">
                    ${content}
                </p>
            </a>
        </article>`;
        }
    }
    return '';
}

// 这个实现在具有大量文章时可能表现不佳
function searchArticle(path) {
    clear_error();
    let pattern = $('#search').val().trim();
    // 输入为空
    if (pattern.length < 1) {
        $('#search-result .articles-list').empty();
        return;
    }

    let keywords = '';
    let use_regex = false;
    // 判断是否为正则
    if (pattern.length > 2 && pattern[0] === '/' && pattern[pattern.length - 1] === '/') {
        keywords = pattern.replace(/^\//, '').replace(/\/$/, '');
        use_regex = true;
    } else {
        // '+'分割字符
        keywords = pattern.split('+');
        // 去除首尾空格
        keywords.forEach(function(e, i, arr){
            arr[i] = e.trim();
        });
        // 按照关键字长度，降序排序
        keywords.sort(function(a, b) {
            return b.length - a.length
        })
        use_regex = false;
    }

    // 请求xml
    $.ajax({
        url: path,
        dataType: 'xml',
        success: function(data) {
            // 加载文章
            if (articles === null) {
                // 转为Array
                articles = $('entry', data).map(function() {
                    return {
                        title: $('title', this).text().trim(),
                        url: $('url', this).text(),
                        // 删除content中的HTML标签
                        content: $('content', this).text().replace(/<.*?>/g, ''),
                    }
                }).get();
            }

            // 在文章的标题与内容中查找关键字
            $('#search-result .articles-list').empty();
            articles.forEach(function(article) {
                let html_str = '';
                // 使用正则查找
                if (use_regex) {
                    html_str = search_with_regex(keywords, article);
                } else {
                    html_str = search_with_keywords(keywords, article);
                }
                if (html_str !== '') {
                    $('#search-result .articles-list').append(html_str);
                }
            })
        }, // success END
        error: function() {
            console.log("Request '" + path + "' failed in ajax.");
        },
    });
}
