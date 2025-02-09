hexo.extend.injector.register('head_end', '<script>\
    (function(d, w, c) {\
        w.ChatraID = \'2P2qeHTEzeNQMkfK5\';\
        var s = d.createElement(\'script\');\
        w[c] = w[c] || function() {\
            (w[c].q = w[c].q || []).push(arguments);\
        };\
        s.async = true;\
        s.src = \'https://call.chatra.io/chatra.js\';\
        if (d.head) d.head.appendChild(s);\
    })(document, window, \'Chatra\');\
</script>', 'default');
