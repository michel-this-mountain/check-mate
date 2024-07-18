document.addEventListener("DOMContentLoaded", function () {
    // #### encoding tab START #### //
    let encodingSelectTechniqueElement = document.getElementById("encoding-select-technique");
    let encodingInputElement = document.getElementById("encoding-decoding-input-textarea")
    let encodingOutputElement = document.getElementById("encoding-decoding-output-textarea")

    // if the technique changes, update the output textarea element
    encodingSelectTechniqueElement.addEventListener("change", function () {
        encodingOutputElement.innerText = decideEncodingOrDecoding(encodingSelectTechniqueElement.value, encodingInputElement.value)
    })

    // if the user is typing something, realtime update it to the output element
    encodingInputElement.addEventListener("input", function () {
        encodingOutputElement.innerText = decideEncodingOrDecoding(encodingSelectTechniqueElement.value, encodingInputElement.value)
    })
    // #### encoding tab END #### //
    // #### hashing tab START #### //
    let hashAlgorithmSelectElement = document.getElementById("hash-select-algorithm")
    let hashGenInputElement = document.getElementById("hash-generate-input")
    let hashGenOutputElement = document.getElementById("hash-generate-output")
    let hashIdentifyInputElement = document.getElementById("hash-identify-input")
    let hashIdentifyOutputEelement = document.getElementById("hash-identify-output")

    // add event listeners for generating an hash
    hashAlgorithmSelectElement.addEventListener("change", function () {
        hashGenOutputElement.innerText = decideHashingAlgorithm(hashAlgorithmSelectElement.value, hashGenInputElement.value)
    })

    hashGenInputElement.addEventListener("input", function () {
        hashGenOutputElement.innerText = decideHashingAlgorithm(hashAlgorithmSelectElement.value, hashGenInputElement.value)
    })

    // add event listener for the the hash-identifier
    hashIdentifyInputElement.addEventListener("input", function () {
        hashIdentifyOutputEelement.innerText = identifyHash(hashIdentifyInputElement.value)
    })
    // #### hashing tab END #### //
    // #### Formatter tab start #### //
    let formatJsonButton = document.getElementById("input-format-json-button")
    let formatJsonTextarea = document.getElementById("input-json-text")

    formatJsonTextarea.addEventListener("input", function () {
        if (isValidJSON(formatJsonTextarea.value)){
            formatJsonTextarea.classList.add("is-valid")
            formatJsonTextarea.classList.remove("is-invalid")
        } else {
            formatJsonTextarea.classList.remove("is-valid")
            formatJsonTextarea.classList.add("is-invalid")
        }
    })

    formatJsonButton.addEventListener("click", function () {
        formatJsonTextarea.value = formatJSON(formatJsonTextarea.value, 2)
    })
    // #### Formatter tab end #### //

})


// FORMATTER TAB START

// method that verifies if the input JSON is valid
function isValidJSON(jsonString) {
    try {
        JSON.parse(jsonString);
        return true;
    } catch (e) {
        return false;
    }
}

// method that formats a json object
function formatJSON(jsonString, depth = 2) {
    if (!isValidJSON(jsonString)) {
        throw new Error('Invalid JSON string');
    }
    const jsonObject = JSON.parse(jsonString);
    return JSON.stringify(jsonObject, null, depth);
}


// FORMATTER TAB END

// HASHING TAB START
/**
 * decideHashingAlgorithm()
 *
 * decides based off the input what hashing algorithm it should use
 *
 * @param algorithm algorithm to use
 * @param text text to hash
 * @returns {*|string} returns a hashed string
 */
function decideHashingAlgorithm(algorithm, text) {
    switch (algorithm) {
        case "md5":
            return hashMD5(text);
        case "bcrypt":
            return hashBcrypt(text);
        case "sha1":
            return hashSHA1(text);
        case "sha224":
            return hashSHA224(text);
        case "sha256":
            return hashSHA256(text);
        case "sha384":
            return hashSHA384(text);
        case "sha512":
            return hashSHA512(text);
    }
}

// method to hash using md5
function hashMD5(input) {
    return CryptoJS.MD5(input).toString(CryptoJS.enc.Hex);
}

// method to hash using bcrypt
function hashBcrypt(input) {
    return dcodeIO.bcrypt.hashSync(input, 10);
}

// Method to hash using SHA-1
function hashSHA1(input) {
    return CryptoJS.SHA1(input).toString(CryptoJS.enc.Hex);
}

// Method to hash using SHA-224
function hashSHA224(input) {
    return CryptoJS.SHA224(input).toString(CryptoJS.enc.Hex);
}

// Method to hash using SHA-256
function hashSHA256(input) {
    return CryptoJS.SHA256(input).toString(CryptoJS.enc.Hex);
}

// Method to hash using SHA-384
function hashSHA384(input) {
    return CryptoJS.SHA384(input).toString(CryptoJS.enc.Hex);
}

// Method to hash using SHA-512
function hashSHA512(input) {
    return CryptoJS.SHA512(input).toString(CryptoJS.enc.Hex);
}

/**
 * identifyHash()
 *
 * Method that takes a hash as input, and checks if it recognizes the hash, if so, it returns the possible values.
 *
 * @param hash
 * @returns {string}
 */
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
        96: ['SHA-384', 'SHA2-384', 'SHA3-384', 'Skein-512', 'GOST R 34.11-2012 (Streebog) 512-bit'],
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
        '^\\$2[ayb]\\$[0-9]{2}\\$[.\\/0-9A-Za-z]{53}$': 'bcrypt',
        '^\\$5\\$[.\\/0-9A-Za-z]{1,16}\\$[.\\/0-9A-Za-z]{43}$': 'SHA-256(Unix)',
        '^\\$6\\$[.\\/0-9A-Za-z]{1,16}\\$[.\\/0-9A-Za-z]{86}$': 'SHA-512(Unix)',
        '^\\$1\\$[.\\/0-9A-Za-z]{1,22}\\$[.\\/0-9A-Za-z]{31}$': 'MD5(Unix)',
        '^\\$y\\$[.\\/0-9A-Za-z]{1,}\\$[.\\/0-9A-Za-z]{1,}\\$[.\\/0-9A-Za-z]{43,}$': 'yescrypt',
        '^\\$argon2[di]?\\$': 'Argon2',
        '^\\$P\\$[.\\/0-9A-Za-z]{31}$': 'phpass',
        '^\\$H\\$[.\\/0-9A-Za-z]{31}$': 'phpass',
        '^\\$pbkdf2-sha256\\$.{52}$': 'PBKDF2',
        '^\\$argon2i\\$v=19\\$m=[0-9]+,t=[0-9]+,p=[0-9]+\\$.{70}$': 'Argon2i',
        '^\\$argon2d\\$v=19\\$m=[0-9]+,t=[0-9]+,p=[0-9]+\\$.{70}$': 'Argon2d',
        '^\\$argon2id\\$v=19\\$m=[0-9]+,t=[0-9]+,p=[0-9]+\\$.{70}$': 'Argon2id',
        '^\\$scrypt\\$[0-9]+\\$.{77}$': 'scrypt',
        '^\\$bcrypt-sha256\\$[0-9]+\\$.{60}$': 'bcrypt-sha256',
        '^\\$bcrypt-sha384\\$[0-9]+\\$.{86}$': 'bcrypt-sha384',
        '^\\$bcrypt-sha512\\$[0-9]+\\$.{110}$': 'bcrypt-sha512',
        '^\\$django\\$.{51}$': 'Django',
        '^\\$django\\$.{64}$': 'Django',
        '^\\$django\\$.{72}$': 'Django',
        '^\\$pbkdf2-sha1\\$.{44}$': 'PBKDF2(SHA-1)',
        '^\\$pbkdf2-sha256\\$.{52}$': 'PBKDF2(SHA-256)',
        '^\\$pbkdf2-sha512\\$.{132}$': 'PBKDF2(SHA-512)',
        '^\\$S\\$[0-9]{2}\\$[A-Za-z0-9\\.\\/]{43}$': 'Django(SHA-1)',
        '^\\$sha1\\$[A-Za-z0-9\\.\\/]{63}$': 'Django(SHA-1)',
        '^\\$5\\$[.\\/0-9A-Za-z]{1,16}\\$[.\\/0-9A-Za-z]{43}$': 'SunMD5',
        '^[a-fA-F0-9]{64}$': 'SHA2-256',
        '^[a-fA-F0-9]{96}$': 'SHA2-384',
        '^[a-fA-F0-9]{128}$': 'SHA2-512',
        '^[a-fA-F0-9]{64}$': 'SHA3-256',
        '^[a-fA-F0-9]{96}$': 'SHA3-384',
        '^[a-fA-F0-9]{128}$': 'SHA3-512',
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
function decideEncodingOrDecoding(technique, text) {
    switch (technique) {
        case "b64-e":
            return encodeBase64(text);
        case "b64-d":
            return decodeBase64(text);
        case "uri-e":
            return encodeURIString(text);
        case "uri-d":
            return decodeURIString(text);
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