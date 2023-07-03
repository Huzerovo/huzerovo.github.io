let articles = null;

function clear_error() {
    $('#search').removeAttr('style');
}
function regex_error() {
    $('#search').attr('style', 'color: red;');
}

function search_with_regex(k, article) {
    let regex = null;
    let keywords = [];
    try {
        regex = new RegExp(k, 'g');
    } catch {
        regex_error();
    }
    keywords = keywords.concat(article.title.match(regex));
    keywords = keywords.concat(article.content.match(regex));
    console.log(regex);
    console.log(article.title.match(regex));
    console.log('keywords: ' + keywords);
    return search_with_keywords(keywords, article);
}

function search_with_keywords(keywords, article) {
    let html_str = '';
    let title = article.title;
    let content = article.content;
    let start = article.content.length;
    let end = -1;
    let ok = [];
    let match = false;
    let content_match = false;
    // 查找所有关键字
    if (article.title !== '' && article.content !== '') {
        // 这里可能需要对'mark'这个特殊的关键字进行额外的处理
        keywords.forEach(function(k) {
            if (!ok.includes(k)) {
                ok.push(k);
                console.log('Searching keyword: ' + k);
                let idx_title = article.title.indexOf(k);
                console.log(article.title);
                let idx_content = article.content.indexOf(k);
                console.log('title index: ' + idx_title + ', contetn index: ' + idx_content);
                if (idx_title >= 0 || idx_content >= 0) {
                    match = true;
                    title = title.replace(k, '<mark>' + k + '</mark>')
                    if (idx_content >= 0) {
                        content_match = true;
                        content = content.replace(k, '<mark>' + k + '</mark>');
                        if (start > idx_content) {
                            start = idx_content;
                        }
                        if (end < idx_content) {
                            end = idx_content;
                        }
                    }
                }
            }
        });
        if (match) {
            if (content_match) {
                start = Math.max(start - 60, 0);
                end = Math.min(end + 60, content.length);
            } else {
                start = 0;
                end = Math.min(120, content.length);
            }
            html_str = `
        <article class="article-list-item">
            <a href="${article.url}">
                <h3>${title}</h3>
                <p>
                    ${content.slice(start, end)}
                </p>
            </a>
        </article>`;
        }
    }
    return html_str;
}

// 这个实现在具有大量文章时可能表现不佳
function searchArticle(path) {
    $('.article-list').empty();
    clear_error();
    // 空格分割字符
    let pattern = $('#search').val().trim();
    if (pattern.length < 1) {
        return;
    }

    let keywords = '';
    let use_regex = false;
    // 判断是否为正则
    if (pattern.length > 2 && pattern[0] === '/' && pattern[pattern.length - 1] === '/') {
        keywords = pattern.replace(/^\//, '').replace(/\/$/, '');
        use_regex = true;
    } else {
        keywords = pattern.split(/[\s]+/);
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
            articles.forEach(function(article) {
                let html_str = '';
                console.log('use regex: ' + use_regex);
                // 使用正则查找
                if (use_regex) {
                    html_str = search_with_regex(keywords, article);
                } else {
                    html_str = search_with_keywords(keywords, article);
                }
                if (html_str !== '') {
                    $('.article-list').append(html_str);
                }
            })
        }, // success END
        error: function() {
            console.log("Cannot request: " + path);
        },
    });
}
