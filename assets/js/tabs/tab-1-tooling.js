document.addEventListener("DOMContentLoaded", function () {
    let encodingSelectTechniqueElement = document.getElementById("encoding-select-technique");
    let encodingInputElement = document.getElementById("encoding-decoding-input-textarea")
    let encodingOutputElement = document.getElementById("encoding-decoding-output-textarea")

    // if the technique changes, update the output textarea element
    encodingSelectTechniqueElement.addEventListener("change", function (){
        encodingOutputElement.innerText = decideEncodingOrDecoding(encodingSelectTechniqueElement.value, encodingInputElement.value)
    })

    // if the user is typing something, realtime update it to the output element
    encodingInputElement.addEventListener("input", function(){
        encodingOutputElement.innerText = decideEncodingOrDecoding(encodingSelectTechniqueElement.value, encodingInputElement.value)
    })
})

// HASHING TAB START
function identifyHash(hash) {
    // Define known hash lengths and their prioritized names
    const hashTypes = {
        16: ['CRC-32', 'CRC-64', 'Adler-32', 'FNV-132', 'FNV-164'],
        32: ['MD5', 'NTLM', 'LM', 'Domain Cached Credentials', 'SQL Server 2000', 'SQL Server 2005', 'CRC-128', 'md5(utf16le($pass))'],
        40: ['SHA-1', 'MySQL4.1', 'MySQL5', 'Tiger-160', 'RIPEMD-160', 'Haval-160', 'SHA-1(MaNGOS)', 'SHA-1(MaNGOS2)', 'sha1(utf16le($pass))'],
        48: ['Haval-192', 'Tiger-192', 'TIGER'],
        56: ['SHA-224', 'SHA2-224', 'Haval-224', 'SHA3-224', 'GOST R 34.11-2012 (Streebog) 256-bit'],
        64: ['SHA-256', 'SHA2-256', 'SHA3-256', 'WordPress', 'RIPEMD-256', 'Haval-256', 'GOST R 34.11-94', 'GOST CryptoPro', 'Skein-256', 'BLAKE2s', 'sha256(utf16le($pass))'],
        80: ['RIPEMD-320'],
        96: ['SHA-384', 'SHA2-384', 'SHA3-384', 'Skein-512', 'GOST R 34.11-2012 (Streebog) 512-bit', 'sha384(utf16le($pass))'],
        128: ['SHA-512', 'SHA2-512', 'SHA-512/224', 'SHA-512/256', 'SHA3-512', 'Whirlpool', 'Skein-1024', 'BLAKE2b', 'sha512(utf16le($pass))'],
    };

    // Additional hash checks for known formats
    const knownFormats = {
        '^[a-fA-F0-9]{16}$': 'CRC-32',
        '^[a-fA-F0-9]{32}$': 'MD5',
        '^[a-fA-F0-9]{40}$': 'SHA-1',
        '^[a-fA-F0-9]{56}$': 'SHA-224',
        '^[a-fA-F0-9]{64}$': 'SHA-256',
        '^[a-fA-F0-9]{96}$': 'SHA-384',
        '^[a-fA-F0-9]{128}$': 'SHA-512',
        '^[0-9a-f]{32}:[0-9a-f]{32}$': 'Cisco-IOS(SMD5)',
        '^\$2[ayb]\$.{56}$': 'bcrypt',
        '^\$5\$.{56}$': 'SHA-256(Unix)',
        '^\$6\$.{86}$': 'SHA-512(Unix)',
        '^\$1\$.{31}$': 'MD5(Unix)',
        '^\$2[ayb]\$.{56}$': 'bcrypt',
        '^\$5\$.{56}$': 'SHA-256(Unix)',
        '^\$6\$.{86}$': 'SHA-512(Unix)',
        '^\\$y\\$[./0-9A-Za-z]{1,}\\$[./0-9A-Za-z]{1,}\\$[./0-9A-Za-z]{43,}$': 'yescrypt',
        '^\$argon2[di]?\$': 'Argon2',
        '^\$P\$[.\/0-9A-Za-z]{31}$': 'phpass',
        '^\$H\$[.\/0-9A-Za-z]{31}$': 'phpass',
        '^\$pbkdf2-sha256\$.{52}$': 'PBKDF2',
        '^\$argon2i\$v=19\$m=[0-9]+,t=[0-9]+,p=[0-9]+\$.{70}$': 'Argon2i',
        '^\$argon2d\$v=19\$m=[0-9]+,t=[0-9]+,p=[0-9]+\$.{70}$': 'Argon2d',
        '^\$argon2id\$v=19\$m=[0-9]+,t=[0-9]+,p=[0-9]+\$.{70}$': 'Argon2id',
        '^\$2a\$.{56}$': 'bcrypt',
        '^\$2b\$.{56}$': 'bcrypt',
        '^\$2y\$.{56}$': 'bcrypt',
        '^\$2\$.{56}$': 'bcrypt',
        '^\$scrypt\$[0-9]+\$.{77}$': 'scrypt',
        '^\$bcrypt-sha256\$[0-9]+\$.{60}$': 'bcrypt-sha256',
        '^\$bcrypt-sha384\$[0-9]+\$.{86}$': 'bcrypt-sha384',
        '^\$bcrypt-sha512\$[0-9]+\$.{110}$': 'bcrypt-sha512',
        '^\$django\$.{51}$': 'Django',
        '^\$django\$.{64}$': 'Django',
        '^\$django\$.{72}$': 'Django',
        '^\$pbkdf2-sha1\$.{44}$': 'PBKDF2(SHA-1)',
        '^\$pbkdf2-sha256\$.{52}$': 'PBKDF2(SHA-256)',
        '^\$pbkdf2-sha512\$.{132}$': 'PBKDF2(SHA-512)',
        '^\$django\$.{64}$': 'Django',
        '^\$django\$.{72}$': 'Django',
        '^[a-fA-F0-9]{64}$': 'SHA2-256',
        '^[a-fA-F0-9]{96}$': 'SHA2-384',
        '^[a-fA-F0-9]{128}$': 'SHA2-512',
        '^[a-fA-F0-9]{64}$': 'SHA3-256',
        '^[a-fA-F0-9]{96}$': 'SHA3-384',
        '^[a-fA-F0-9]{128}$': 'SHA3-512',
        '^\$S\$[0-9]{2}\$[A-Za-z0-9\.\/]{43}$': 'Django(SHA-1)',
        '^\$sha1\$[A-Za-z0-9\.\/]{63}$': 'Django(SHA-1)',
        '^\$5\$\$\$[0-9]{2}\$[A-Za-z0-9\.\/]{43}$': 'SunMD5',
        '^\$scrypt\$[0-9]+\$.{77}$': 'scrypt',
        '^\$bcrypt-sha256\$[0-9]+\$.{60}$': 'bcrypt-sha256',
        '^\$bcrypt-sha384\$[0-9]+\$.{86}$': 'bcrypt-sha384',
        '^\$bcrypt-sha512\$[0-9]+\$.{110}$': 'bcrypt-sha512',
        '^[0-9a-f]{32}:[0-9a-f]{32}$': 'Cisco-IOS(SMD5)',
        '^[0-9a-fA-F]{16}$': 'CRC-32',
    };

    let possibleMatches = [];

    // Check known formats
    for (const regex in knownFormats) {
        if (new RegExp(regex).test(hash)) {
            possibleMatches.push(knownFormats[regex]);
        }
    }

    // Check if the hash is a valid hexadecimal string
    const hexRegex = /^[a-fA-F0-9]+$/;
    if (hexRegex.test(hash)) {
        // Check the length of the hash to determine its type
        const hashLength = hash.length;
        if (hashTypes[hashLength]) {
            possibleMatches = possibleMatches.concat(hashTypes[hashLength]);
        }
    } else if (possibleMatches.length === 0) {
        return JSON.stringify(["not a valid hash"]);
    }

    // Remove duplicates and prioritize the list
    possibleMatches = [...new Set(possibleMatches)];

    return JSON.stringify(possibleMatches);
}

// HASHING TAB END

// DECODING/ENCODING TAB START
/**
 * decideEncodingOrDecoding()
 *
 * decides based off the technique what encoding or decoding technique it should use, and it returns the
 *
 * @param technique
 * @param text
 * @returns {*|string}
 */
function decideEncodingOrDecoding(technique, text){
    switch (technique) {
        case "b64-e": return encodeBase64(text);
        case "b64-d": return decodeBase64(text);
        case "uri-e": return encodeURIString(text);
        case "uri-d": return decodeURIString(text);
    }
}

// Base64 Encoding
function encodeBase64(input) {
    return btoa(input);
}

// Base64 Decoding
function decodeBase64(input) {
    return atob(input);
}

// URI Encoding
function encodeURIString(input) {
    return encodeURIComponent(input);
}

// URI Decoding
function decodeURIString(input) {
    return decodeURIComponent(input);
}

// DECODING/ENCODING TAB END