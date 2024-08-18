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

}