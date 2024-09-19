class EncoderDecoder {

    static encodeBase64(str) {
        return btoa(str);
    }

    static decodeBase64(str) {
        return atob(str);
    }

    static encodeURI(str) {
        return encodeURI(str);
    }

    static decodeURI(str) {
        return decodeURI(str);
    }

    static encodeDecimal(str) {
        return str.split('').map(char => `&#${char.charCodeAt(0)};`).join('');
    }

    static decodeDecimal(str) {
        return str.match(/&#\d+;/g).map(entity => String.fromCharCode(parseInt(entity.slice(2, -1)))).join('');
    }

    static encodeHex(str) {
        return str.split('').map(char => `&#x${char.charCodeAt(0).toString(16)};`).join('');
    }

    static decodeHex(str) {
        return str.match(/&#x[\da-fA-F]+;/g).map(entity => String.fromCharCode(parseInt(entity.slice(3, -1), 16))).join('');
    }

    static encodeHTML(str) {
        return str.replace(/[&<>"']/g, function(m) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            }[m];
        });
    }

    static decodeHTML(str) {
        let txt = document.createElement("textarea");
        txt.innerHTML = str;
        return txt.value;
    }

    static encodeUnicode(str) {
        return str.split('').map(char => '\\u' + ('0000' + char.charCodeAt(0).toString(16)).slice(-4)).join('');
    }

    static decodeUnicode(str) {
        return str.replace(/\\u[\dA-F]{4}/gi, match => String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16)));
    }

    static encodeHexJS(str) {
        return '\\x' + str.split('').map(char => ('0' + char.charCodeAt(0).toString(16)).slice(-2)).join('\\x');
    }

    static decodeHexJS(str) {
        return str.split('\\x').slice(1).map(hex => String.fromCharCode(parseInt(hex, 16))).join('');
    }
}