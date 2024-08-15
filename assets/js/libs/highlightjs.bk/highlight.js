/*!
  Highlight.js v11.10.0 (git: 366a8bd012)
  (c) 2006-2024 Josh Goebel <hello@joshgoebel.com> and other contributors
  License: BSD-3-Clause
 */
var hljs = (function () {
  'use strict';

  /* eslint-disable no-multi-assign */

  function deepFreeze(obj) {
    if (obj instanceof Map) {
      obj.clear =
        obj.delete =
        obj.set =
          function () {
            throw new Error('map is read-only');
          };
    } else if (obj instanceof Set) {
      obj.add =
        obj.clear =
        obj.delete =
          function () {
            throw new Error('set is read-only');
          };
    }

    // Freeze self
    Object.freeze(obj);

    Object.getOwnPropertyNames(obj).forEach((name) => {
      const prop = obj[name];
      const type = typeof prop;

      // Freeze prop if it is an object or function and also not already frozen
      if ((type === 'object' || type === 'function') && !Object.isFrozen(prop)) {
        deepFreeze(prop);
      }
    });

    return obj;
  }

  /** @typedef {import('assets/js/libs/highlightjs/highlight.js').CallbackResponse} CallbackResponse */
  /** @typedef {import('assets/js/libs/highlightjs/highlight.js').CompiledMode} CompiledMode */
  /** @implements CallbackResponse */

  class Response {
    /**
     * @param {CompiledMode} mode
     */
    constructor(mode) {
      // eslint-disable-next-line no-undefined
      if (mode.data === undefined) mode.data = {};

      this.data = mode.data;
      this.isMatchIgnored = false;
    }

    ignoreMatch() {
      this.isMatchIgnored = true;
    }
  }

  /**
   * @param {string} value
   * @returns {string}
   */
  function escapeHTML(value) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /**
   * performs a shallow merge of multiple objects into one
   *
   * @template T
   * @param {T} original
   * @param {Record<string,any>[]} objects
   * @returns {T} a single new object
   */
  function inherit$1(original, ...objects) {
    /** @type Record<string,any> */
    const result = Object.create(null);

    for (const key in original) {
      result[key] = original[key];
    }
    objects.forEach(function(obj) {
      for (const key in obj) {
        result[key] = obj[key];
      }
    });
    return /** @type {T} */ (result);
  }

  /**
   * @typedef {object} Renderer
   * @property {(text: string) => void} addText
   * @property {(node: Node) => void} openNode
   * @property {(node: Node) => void} closeNode
   * @property {() => string} value
   */

  /** @typedef {{scope?: string, language?: string, sublanguage?: boolean}} Node */
  /** @typedef {{walk: (r: Renderer) => void}} Tree */
  /** */

  const SPAN_CLOSE = '</span>';

  /**
   * Determines if a node needs to be wrapped in <span>
   *
   * @param {Node} node */
  const emitsWrappingTags = (node) => {
    // rarely we can have a sublanguage where language is undefined
    // TODO: track down why
    return !!node.scope;
  };

  /**
   *
   * @param {string} name
   * @param {{prefix:string}} options
   */
  const scopeToCSSClass = (name, { prefix }) => {
    // sub-language
    if (name.startsWith("language:")) {
      return name.replace("language:", "language-");
    }
    // tiered scope: comment.line
    if (name.includes(".")) {
      const pieces = name.split(".");
      return [
        `${prefix}${pieces.shift()}`,
        ...(pieces.map((x, i) => `${x}${"_".repeat(i + 1)}`))
      ].join(" ");
    }
    // simple scope
    return `${prefix}${name}`;
  };

  /** @type {Renderer} */
  class HTMLRenderer {
    /**
     * Creates a new HTMLRenderer
     *
     * @param {Tree} parseTree - the parse tree (must support `walk` API)
     * @param {{classPrefix: string}} options
     */
    constructor(parseTree, options) {
      this.buffer = "";
      this.classPrefix = options.classPrefix;
      parseTree.walk(this);
    }

    /**
     * Adds texts to the output stream
     *
     * @param {string} text */
    addText(text) {
      this.buffer += escapeHTML(text);
    }

    /**
     * Adds a node open to the output stream (if needed)
     *
     * @param {Node} node */
    openNode(node) {
      if (!emitsWrappingTags(node)) return;

      const className = scopeToCSSClass(node.scope,
        { prefix: this.classPrefix });
      this.span(className);
    }

    /**
     * Adds a node close to the output stream (if needed)
     *
     * @param {Node} node */
    closeNode(node) {
      if (!emitsWrappingTags(node)) return;

      this.buffer += SPAN_CLOSE;
    }

    /**
     * returns the accumulated buffer
    */
    value() {
      return this.buffer;
    }

    // helpers

    /**
     * Builds a span element
     *
     * @param {string} className */
    span(className) {
      this.buffer += `<span class="${className}">`;
    }
  }

  /** @typedef {{scope?: string, language?: string, children: Node[]} | string} Node */
  /** @typedef {{scope?: string, language?: string, children: Node[]} } DataNode */
  /** @typedef {import('assets/js/libs/highlightjs/highlight.js').Emitter} Emitter */
  /**  */

  /** @returns {DataNode} */
  const newNode = (opts = {}) => {
    /** @type DataNode */
    const result = { children: [] };
    Object.assign(result, opts);
    return result;
  };

  class TokenTree {
    constructor() {
      /** @type DataNode */
      this.rootNode = newNode();
      this.stack = [this.rootNode];
    }

    get top() {
      return this.stack[this.stack.length - 1];
    }

    get root() { return this.rootNode; }

    /** @param {Node} node */
    add(node) {
      this.top.children.push(node);
    }

    /** @param {string} scope */
    openNode(scope) {
      /** @type Node */
      const node = newNode({ scope });
      this.add(node);
      this.stack.push(node);
    }

    closeNode() {
      if (this.stack.length > 1) {
        return this.stack.pop();
      }
      // eslint-disable-next-line no-undefined
      return undefined;
    }

    closeAllNodes() {
      while (this.closeNode());
    }

    toJSON() {
      return JSON.stringify(this.rootNode, null, 4);
    }

    /**
     * @typedef { import("./html_renderer").Renderer } Renderer
     * @param {Renderer} builder
     */
    walk(builder) {
      // this does not
      return this.constructor._walk(builder, this.rootNode);
      // this works
      // return TokenTree._walk(builder, this.rootNode);
    }

    /**
     * @param {Renderer} builder
     * @param {Node} node
     */
    static _walk(builder, node) {
      if (typeof node === "string") {
        builder.addText(node);
      } else if (node.children) {
        builder.openNode(node);
        node.children.forEach((child) => this._walk(builder, child));
        builder.closeNode(node);
      }
      return builder;
    }

    /**
     * @param {Node} node
     */
    static _collapse(node) {
      if (typeof node === "string") return;
      if (!node.children) return;

      if (node.children.every(el => typeof el === "string")) {
        // node.text = node.children.join("");
        // delete node.children;
        node.children = [node.children.join("")];
      } else {
        node.children.forEach((child) => {
          TokenTree._collapse(child);
        });
      }
    }
  }

  /**
    Currently this is all private API, but this is the minimal API necessary
    that an Emitter must implement to fully support the parser.

    Minimal interface:

    - addText(text)
    - __addSublanguage(emitter, subLanguageName)
    - startScope(scope)
    - endScope()
    - finalize()
    - toHTML()

  */

  /**
   * @implements {Emitter}
   */
  class TokenTreeEmitter extends TokenTree {
    /**
     * @param {*} options
     */
    constructor(options) {
      super();
      this.options = options;
    }

    /**
     * @param {string} text
     */
    addText(text) {
      if (text === "") { return; }

      this.add(text);
    }

    /** @param {string} scope */
    startScope(scope) {
      this.openNode(scope);
    }

    endScope() {
      this.closeNode();
    }

    /**
     * @param {Emitter & {root: DataNode}} emitter
     * @param {string} name
     */
    __addSublanguage(emitter, name) {
      /** @type DataNode */
      const node = emitter.root;
      if (name) node.scope = `language:${name}`;

      this.add(node);
    }

    toHTML() {
      const renderer = new HTMLRenderer(this, this.options);
      return renderer.value();
    }

    finalize() {
      this.closeAllNodes();
      return true;
    }
  }

  /**
   * @param {string} value
   * @returns {RegExp}
   * */

  /**
   * @param {RegExp | string } re
   * @returns {string}
   */
  function source(re) {
    if (!re) return null;
    if (typeof re === "string") return re;

    return re.source;
  }

  /**
   * @param {RegExp | string } re
   * @returns {string}
   */
  function lookahead(re) {
    return concat('(?=', re, ')');
  }

  /**
   * @param {RegExp | string } re
   * @returns {string}
   */
  function anyNumberOfTimes(re) {
    return concat('(?:', re, ')*');
  }

  /**
   * @param {RegExp | string } re
   * @returns {string}
   */
  function optional(re) {
    return concat('(?:', re, ')?');
  }

  /**
   * @param {...(RegExp | string) } args
   * @returns {string}
   */
  function concat(...args) {
    const joined = args.map((x) => source(x)).join("");
    return joined;
  }

  /**
   * @param { Array<string | RegExp | Object> } args
   * @returns {object}
   */
  function stripOptionsFromArgs(args) {
    const opts = args[args.length - 1];

    if (typeof opts === 'object' && opts.constructor === Object) {
      args.splice(args.length - 1, 1);
      return opts;
    } else {
      return {};
    }
  }

  /** @typedef { {capture?: boolean} } RegexEitherOptions */

  /**
   * Any of the passed expresssions may match
   *
   * Creates a huge this | this | that | that match
   * @param {(RegExp | string)[] | [...(RegExp | string)[], RegexEitherOptions]} args
   * @returns {string}
   */
  function either(...args) {
    /** @type { object & {capture?: boolean} }  */
    const opts = stripOptionsFromArgs(args);
    const joined = '('
      + (opts.capture ? "" : "?:")
      + args.map((x) => source(x)).join("|") + ")";
    return joined;
  }

  /**
   * @param {RegExp | string} re
   * @returns {number}
   */
  function countMatchGroups(re) {
    return (new RegExp(re.toString() + '|')).exec('').length - 1;
  }

  /**
   * Does lexeme start with a regular expression match at the beginning
   * @param {RegExp} re
   * @param {string} lexeme
   */
  function startsWith(re, lexeme) {
    const match = re && re.exec(lexeme);
    return match && match.index === 0;
  }

  // BACKREF_RE matches an open parenthesis or backreference. To avoid
  // an incorrect parse, it additionally matches the following:
  // - [...] elements, where the meaning of parentheses and escapes change
  // - other escape sequences, so we do not misparse escape sequences as
  //   interesting elements
  // - non-matching or lookahead parentheses, which do not capture. These
  //   follow the '(' with a '?'.
  const BACKREF_RE = /\[(?:[^\\\]]|\\.)*\]|\(\??|\\([1-9][0-9]*)|\\./;

  // **INTERNAL** Not intended for outside usage
  // join logically computes regexps.join(separator), but fixes the
  // backreferences so they continue to match.
  // it also places each individual regular expression into it's own
  // match group, keeping track of the sequencing of those match groups
  // is currently an exercise for the caller. :-)
  /**
   * @param {(string | RegExp)[]} regexps
   * @param {{joinWith: string}} opts
   * @returns {string}
   */
  function _rewriteBackreferences(regexps, { joinWith }) {
    let numCaptures = 0;

    return regexps.map((regex) => {
      numCaptures += 1;
      const offset = numCaptures;
      let re = source(regex);
      let out = '';

      while (re.length > 0) {
        const match = BACKREF_RE.exec(re);
        if (!match) {
          out += re;
          break;
        }
        out += re.substring(0, match.index);
        re = re.substring(match.index + match[0].length);
        if (match[0][0] === '\\' && match[1]) {
          // Adjust the backreference.
          out += '\\' + String(Number(match[1]) + offset);
        } else {
          out += match[0];
          if (match[0] === '(') {
            numCaptures++;
          }
        }
      }
      return out;
    }).map(re => `(${re})`).join(joinWith);
  }

  /** @typedef {import('assets/js/libs/highlightjs/highlight.js').Mode} Mode */
  /** @typedef {import('assets/js/libs/highlightjs/highlight.js').ModeCallback} ModeCallback */

  // Common regexps
  const MATCH_NOTHING_RE = /\b\B/;
  const IDENT_RE = '[a-zA-Z]\\w*';
  const UNDERSCORE_IDENT_RE = '[a-zA-Z_]\\w*';
  const NUMBER_RE = '\\b\\d+(\\.\\d+)?';
  const C_NUMBER_RE = '(-?)(\\b0[xX][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)'; // 0x..., 0..., decimal, float
  const BINARY_NUMBER_RE = '\\b(0b[01]+)'; // 0b...
  const RE_STARTERS_RE = '!|!=|!==|%|%=|&|&&|&=|\\*|\\*=|\\+|\\+=|,|-|-=|/=|/|:|;|<<|<<=|<=|<|===|==|=|>>>=|>>=|>=|>>>|>>|>|\\?|\\[|\\{|\\(|\\^|\\^=|\\||\\|=|\\|\\||~';

  /**
  * @param { Partial<Mode> & {binary?: string | RegExp} } opts
  */
  const SHEBANG = (opts = {}) => {
    const beginShebang = /^#![ ]*\//;
    if (opts.binary) {
      opts.begin = concat(
        beginShebang,
        /.*\b/,
        opts.binary,
        /\b.*/);
    }
    return inherit$1({
      scope: 'meta',
      begin: beginShebang,
      end: /$/,
      relevance: 0,
      /** @type {ModeCallback} */
      "on:begin": (m, resp) => {
        if (m.index !== 0) resp.ignoreMatch();
      }
    }, opts);
  };

  // Common modes
  const BACKSLASH_ESCAPE = {
    begin: '\\\\[\\s\\S]', relevance: 0
  };
  const APOS_STRING_MODE = {
    scope: 'string',
    begin: '\'',
    end: '\'',
    illegal: '\\n',
    contains: [BACKSLASH_ESCAPE]
  };
  const QUOTE_STRING_MODE = {
    scope: 'string',
    begin: '"',
    end: '"',
    illegal: '\\n',
    contains: [BACKSLASH_ESCAPE]
  };
  const PHRASAL_WORDS_MODE = {
    begin: /\b(a|an|the|are|I'm|isn't|don't|doesn't|won't|but|just|should|pretty|simply|enough|gonna|going|wtf|so|such|will|you|your|they|like|more)\b/
  };
  /**
   * Creates a comment mode
   *
   * @param {string | RegExp} begin
   * @param {string | RegExp} end
   * @param {Mode | {}} [modeOptions]
   * @returns {Partial<Mode>}
   */
  const COMMENT = function(begin, end, modeOptions = {}) {
    const mode = inherit$1(
      {
        scope: 'comment',
        begin,
        end,
        contains: []
      },
      modeOptions
    );
    mode.contains.push({
      scope: 'doctag',
      // hack to avoid the space from being included. the space is necessary to
      // match here to prevent the plain text rule below from gobbling up doctags
      begin: '[ ]*(?=(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):)',
      end: /(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):/,
      excludeBegin: true,
      relevance: 0
    });
    const ENGLISH_WORD = either(
      // list of common 1 and 2 letter words in English
      "I",
      "a",
      "is",
      "so",
      "us",
      "to",
      "at",
      "if",
      "in",
      "it",
      "on",
      // note: this is not an exhaustive list of contractions, just popular ones
      /[A-Za-z]+['](d|ve|re|ll|t|s|n)/, // contractions - can't we'd they're let's, etc
      /[A-Za-z]+[-][a-z]+/, // `no-way`, etc.
      /[A-Za-z][a-z]{2,}/ // allow capitalized words at beginning of sentences
    );
    // looking like plain text, more likely to be a comment
    mode.contains.push(
      {
        // TODO: how to include ", (, ) without breaking grammars that use these for
        // comment delimiters?
        // begin: /[ ]+([()"]?([A-Za-z'-]{3,}|is|a|I|so|us|[tT][oO]|at|if|in|it|on)[.]?[()":]?([.][ ]|[ ]|\))){3}/
        // ---

        // this tries to find sequences of 3 english words in a row (without any
        // "programming" type syntax) this gives us a strong signal that we've
        // TRULY found a comment - vs perhaps scanning with the wrong language.
        // It's possible to find something that LOOKS like the start of the
        // comment - but then if there is no readable text - good chance it is a
        // false match and not a comment.
        //
        // for a visual example please see:
        // https://github.com/highlightjs/highlight.js/issues/2827

        begin: concat(
          /[ ]+/, // necessary to prevent us gobbling up doctags like /* @author Bob Mcgill */
          '(',
          ENGLISH_WORD,
          /[.]?[:]?([.][ ]|[ ])/,
          '){3}') // look for 3 words in a row
      }
    );
    return mode;
  };
  const C_LINE_COMMENT_MODE = COMMENT('//', '$');
  const C_BLOCK_COMMENT_MODE = COMMENT('/\\*', '\\*/');
  const HASH_COMMENT_MODE = COMMENT('#', '$');
  const NUMBER_MODE = {
    scope: 'number',
    begin: NUMBER_RE,
    relevance: 0
  };
  const C_NUMBER_MODE = {
    scope: 'number',
    begin: C_NUMBER_RE,
    relevance: 0
  };
  const BINARY_NUMBER_MODE = {
    scope: 'number',
    begin: BINARY_NUMBER_RE,
    relevance: 0
  };
  const REGEXP_MODE = {
    scope: "regexp",
    begin: /\/(?=[^/\n]*\/)/,
    end: /\/[gimuy]*/,
    contains: [
      BACKSLASH_ESCAPE,
      {
        begin: /\[/,
        end: /\]/,
        relevance: 0,
        contains: [BACKSLASH_ESCAPE]
      }
    ]
  };
  const TITLE_MODE = {
    scope: 'title',
    begin: IDENT_RE,
    relevance: 0
  };
  const UNDERSCORE_TITLE_MODE = {
    scope: 'title',
    begin: UNDERSCORE_IDENT_RE,
    relevance: 0
  };
  const METHOD_GUARD = {
    // excludes method names from keyword processing
    begin: '\\.\\s*' + UNDERSCORE_IDENT_RE,
    relevance: 0
  };

  /**
   * Adds end same as begin mechanics to a mode
   *
   * Your mode must include at least a single () match group as that first match
   * group is what is used for comparison
   * @param {Partial<Mode>} mode
   */
  const END_SAME_AS_BEGIN = function(mode) {
    return Object.assign(mode,
      {
        /** @type {ModeCallback} */
        'on:begin': (m, resp) => { resp.data._beginMatch = m[1]; },
        /** @type {ModeCallback} */
        'on:end': (m, resp) => { if (resp.data._beginMatch !== m[1]) resp.ignoreMatch(); }
      });
  };

  var MODES = /*#__PURE__*/Object.freeze({
    __proto__: null,
    APOS_STRING_MODE: APOS_STRING_MODE,
    BACKSLASH_ESCAPE: BACKSLASH_ESCAPE,
    BINARY_NUMBER_MODE: BINARY_NUMBER_MODE,
    BINARY_NUMBER_RE: BINARY_NUMBER_RE,
    COMMENT: COMMENT,
    C_BLOCK_COMMENT_MODE: C_BLOCK_COMMENT_MODE,
    C_LINE_COMMENT_MODE: C_LINE_COMMENT_MODE,
    C_NUMBER_MODE: C_NUMBER_MODE,
    C_NUMBER_RE: C_NUMBER_RE,
    END_SAME_AS_BEGIN: END_SAME_AS_BEGIN,
    HASH_COMMENT_MODE: HASH_COMMENT_MODE,
    IDENT_RE: IDENT_RE,
    MATCH_NOTHING_RE: MATCH_NOTHING_RE,
    METHOD_GUARD: METHOD_GUARD,
    NUMBER_MODE: NUMBER_MODE,
    NUMBER_RE: NUMBER_RE,
    PHRASAL_WORDS_MODE: PHRASAL_WORDS_MODE,
    QUOTE_STRING_MODE: QUOTE_STRING_MODE,
    REGEXP_MODE: REGEXP_MODE,
    RE_STARTERS_RE: RE_STARTERS_RE,
    SHEBANG: SHEBANG,
    TITLE_MODE: TITLE_MODE,
    UNDERSCORE_IDENT_RE: UNDERSCORE_IDENT_RE,
    UNDERSCORE_TITLE_MODE: UNDERSCORE_TITLE_MODE
  });

  /**
  @typedef {import('assets/js/libs/highlightjs/highlight.js').CallbackResponse} CallbackResponse
  @typedef {import('assets/js/libs/highlightjs/highlight.js').CompilerExt} CompilerExt
  */

  // Grammar extensions / plugins
  // See: https://github.com/highlightjs/highlight.js/issues/2833

  // Grammar extensions allow "syntactic sugar" to be added to the grammar modes
  // without requiring any underlying changes to the compiler internals.

  // `compileMatch` being the perfect small example of now allowing a grammar
  // author to write `match` when they desire to match a single expression rather
  // than being forced to use `begin`.  The extension then just moves `match` into
  // `begin` when it runs.  Ie, no features have been added, but we've just made
  // the experience of writing (and reading grammars) a little bit nicer.

  // ------

  // TODO: We need negative look-behind support to do this properly
  /**
   * Skip a match if it has a preceding dot
   *
   * This is used for `beginKeywords` to prevent matching expressions such as
   * `bob.keyword.do()`. The mode compiler automatically wires this up as a
   * special _internal_ 'on:begin' callback for modes with `beginKeywords`
   * @param {RegExpMatchArray} match
   * @param {CallbackResponse} response
   */
  function skipIfHasPrecedingDot(match, response) {
    const before = match.input[match.index - 1];
    if (before === ".") {
      response.ignoreMatch();
    }
  }

  /**
   *
   * @type {CompilerExt}
   */
  function scopeClassName(mode, _parent) {
    // eslint-disable-next-line no-undefined
    if (mode.className !== undefined) {
      mode.scope = mode.className;
      delete mode.className;
    }
  }

  /**
   * `beginKeywords` syntactic sugar
   * @type {CompilerExt}
   */
  function beginKeywords(mode, parent) {
    if (!parent) return;
    if (!mode.beginKeywords) return;

    // for languages with keywords that include non-word characters checking for
    // a word boundary is not sufficient, so instead we check for a word boundary
    // or whitespace - this does no harm in any case since our keyword engine
    // doesn't allow spaces in keywords anyways and we still check for the boundary
    // first
    mode.begin = '\\b(' + mode.beginKeywords.split(' ').join('|') + ')(?!\\.)(?=\\b|\\s)';
    mode.__beforeBegin = skipIfHasPrecedingDot;
    mode.keywords = mode.keywords || mode.beginKeywords;
    delete mode.beginKeywords;

    // prevents double relevance, the keywords themselves provide
    // relevance, the mode doesn't need to double it
    // eslint-disable-next-line no-undefined
    if (mode.relevance === undefined) mode.relevance = 0;
  }

  /**
   * Allow `illegal` to contain an array of illegal values
   * @type {CompilerExt}
   */
  function compileIllegal(mode, _parent) {
    if (!Array.isArray(mode.illegal)) return;

    mode.illegal = either(...mode.illegal);
  }

  /**
   * `match` to match a single expression for readability
   * @type {CompilerExt}
   */
  function compileMatch(mode, _parent) {
    if (!mode.match) return;
    if (mode.begin || mode.end) throw new Error("begin & end are not supported with match");

    mode.begin = mode.match;
    delete mode.match;
  }

  /**
   * provides the default 1 relevance to all modes
   * @type {CompilerExt}
   */
  function compileRelevance(mode, _parent) {
    // eslint-disable-next-line no-undefined
    if (mode.relevance === undefined) mode.relevance = 1;
  }

  // allow beforeMatch to act as a "qualifier" for the match
  // the full match begin must be [beforeMatch][begin]
  const beforeMatchExt = (mode, parent) => {
    if (!mode.beforeMatch) return;
    // starts conflicts with endsParent which we need to make sure the child
    // rule is not matched multiple times
    if (mode.starts) throw new Error("beforeMatch cannot be used with starts");

    const originalMode = Object.assign({}, mode);
    Object.keys(mode).forEach((key) => { delete mode[key]; });

    mode.keywords = originalMode.keywords;
    mode.begin = concat(originalMode.beforeMatch, lookahead(originalMode.begin));
    mode.starts = {
      relevance: 0,
      contains: [
        Object.assign(originalMode, { endsParent: true })
      ]
    };
    mode.relevance = 0;

    delete originalMode.beforeMatch;
  };

  // keywords that should have no default relevance value
  const COMMON_KEYWORDS = [
    'of',
    'and',
    'for',
    'in',
    'not',
    'or',
    'if',
    'then',
    'parent', // common variable name
    'list', // common variable name
    'value' // common variable name
  ];

  const DEFAULT_KEYWORD_SCOPE = "keyword";

  /**
   * Given raw keywords from a language definition, compile them.
   *
   * @param {string | Record<string,string|string[]> | Array<string>} rawKeywords
   * @param {boolean} caseInsensitive
   */
  function compileKeywords(rawKeywords, caseInsensitive, scopeName = DEFAULT_KEYWORD_SCOPE) {
    /** @type {import("highlight.js/private").KeywordDict} */
    const compiledKeywords = Object.create(null);

    // input can be a string of keywords, an array of keywords, or a object with
    // named keys representing scopeName (which can then point to a string or array)
    if (typeof rawKeywords === 'string') {
      compileList(scopeName, rawKeywords.split(" "));
    } else if (Array.isArray(rawKeywords)) {
      compileList(scopeName, rawKeywords);
    } else {
      Object.keys(rawKeywords).forEach(function(scopeName) {
        // collapse all our objects back into the parent object
        Object.assign(
          compiledKeywords,
          compileKeywords(rawKeywords[scopeName], caseInsensitive, scopeName)
        );
      });
    }
    return compiledKeywords;

    // ---

    /**
     * Compiles an individual list of keywords
     *
     * Ex: "for if when while|5"
     *
     * @param {string} scopeName
     * @param {Array<string>} keywordList
     */
    function compileList(scopeName, keywordList) {
      if (caseInsensitive) {
        keywordList = keywordList.map(x => x.toLowerCase());
      }
      keywordList.forEach(function(keyword) {
        const pair = keyword.split('|');
        compiledKeywords[pair[0]] = [scopeName, scoreForKeyword(pair[0], pair[1])];
      });
    }
  }

  /**
   * Returns the proper score for a given keyword
   *
   * Also takes into account comment keywords, which will be scored 0 UNLESS
   * another score has been manually assigned.
   * @param {string} keyword
   * @param {string} [providedScore]
   */
  function scoreForKeyword(keyword, providedScore) {
    // manual scores always win over common keywords
    // so you can force a score of 1 if you really insist
    if (providedScore) {
      return Number(providedScore);
    }

    return commonKeyword(keyword) ? 0 : 1;
  }

  /**
   * Determines if a given keyword is common or not
   *
   * @param {string} keyword */
  function commonKeyword(keyword) {
    return COMMON_KEYWORDS.includes(keyword.toLowerCase());
  }

  /*

  For the reasoning behind this please see:
  https://github.com/highlightjs/highlight.js/issues/2880#issuecomment-747275419

  */

  /**
   * @type {Record<string, boolean>}
   */
  const seenDeprecations = {};

  /**
   * @param {string} message
   */
  const error = (message) => {
    console.error(message);
  };

  /**
   * @param {string} message
   * @param {any} args
   */
  const warn = (message, ...args) => {
    console.log(`WARN: ${message}`, ...args);
  };

  /**
   * @param {string} version
   * @param {string} message
   */
  const deprecated = (version, message) => {
    if (seenDeprecations[`${version}/${message}`]) return;

    console.log(`Deprecated as of ${version}. ${message}`);
    seenDeprecations[`${version}/${message}`] = true;
  };

  /* eslint-disable no-throw-literal */

  /**
  @typedef {import('assets/js/libs/highlightjs/highlight.js').CompiledMode} CompiledMode
  */

  const MultiClassError = new Error();

  /**
   * Renumbers labeled scope names to account for additional inner match
   * groups that otherwise would break everything.
   *
   * Lets say we 3 match scopes:
   *
   *   { 1 => ..., 2 => ..., 3 => ... }
   *
   * So what we need is a clean match like this:
   *
   *   (a)(b)(c) => [ "a", "b", "c" ]
   *
   * But this falls apart with inner match groups:
   *
   * (a)(((b)))(c) => ["a", "b", "b", "b", "c" ]
   *
   * Our scopes are now "out of alignment" and we're repeating `b` 3 times.
   * What needs to happen is the numbers are remapped:
   *
   *   { 1 => ..., 2 => ..., 5 => ... }
   *
   * We also need to know that the ONLY groups that should be output
   * are 1, 2, and 5.  This function handles this behavior.
   *
   * @param {CompiledMode} mode
   * @param {Array<RegExp | string>} regexes
   * @param {{key: "beginScope"|"endScope"}} opts
   */
  function remapScopeNames(mode, regexes, { key }) {
    let offset = 0;
    const scopeNames = mode[key];
    /** @type Record<number,boolean> */
    const emit = {};
    /** @type Record<number,string> */
    const positions = {};

    for (let i = 1; i <= regexes.length; i++) {
      positions[i + offset] = scopeNames[i];
      emit[i + offset] = true;
      offset += countMatchGroups(regexes[i - 1]);
    }
    // we use _emit to keep track of which match groups are "top-level" to avoid double
    // output from inside match groups
    mode[key] = positions;
    mode[key]._emit = emit;
    mode[key]._multi = true;
  }

  /**
   * @param {CompiledMode} mode
   */
  function beginMultiClass(mode) {
    if (!Array.isArray(mode.begin)) return;

    if (mode.skip || mode.excludeBegin || mode.returnBegin) {
      error("skip, excludeBegin, returnBegin not compatible with beginScope: {}");
      throw MultiClassError;
    }

    if (typeof mode.beginScope !== "object" || mode.beginScope === null) {
      error("beginScope must be object");
      throw MultiClassError;
    }

    remapScopeNames(mode, mode.begin, { key: "beginScope" });
    mode.begin = _rewriteBackreferences(mode.begin, { joinWith: "" });
  }

  /**
   * @param {CompiledMode} mode
   */
  function endMultiClass(mode) {
    if (!Array.isArray(mode.end)) return;

    if (mode.skip || mode.excludeEnd || mode.returnEnd) {
      error("skip, excludeEnd, returnEnd not compatible with endScope: {}");
      throw MultiClassError;
    }

    if (typeof mode.endScope !== "object" || mode.endScope === null) {
      error("endScope must be object");
      throw MultiClassError;
    }

    remapScopeNames(mode, mode.end, { key: "endScope" });
    mode.end = _rewriteBackreferences(mode.end, { joinWith: "" });
  }

  /**
   * this exists only to allow `scope: {}` to be used beside `match:`
   * Otherwise `beginScope` would necessary and that would look weird

    {
      match: [ /def/, /\w+/ ]
      scope: { 1: "keyword" , 2: "title" }
    }

   * @param {CompiledMode} mode
   */
  function scopeSugar(mode) {
    if (mode.scope && typeof mode.scope === "object" && mode.scope !== null) {
      mode.beginScope = mode.scope;
      delete mode.scope;
    }
  }

  /**
   * @param {CompiledMode} mode
   */
  function MultiClass(mode) {
    scopeSugar(mode);

    if (typeof mode.beginScope === "string") {
      mode.beginScope = { _wrap: mode.beginScope };
    }
    if (typeof mode.endScope === "string") {
      mode.endScope = { _wrap: mode.endScope };
    }

    beginMultiClass(mode);
    endMultiClass(mode);
  }

  /**
  @typedef {import('assets/js/libs/highlightjs/highlight.js').Mode} Mode
  @typedef {import('assets/js/libs/highlightjs/highlight.js').CompiledMode} CompiledMode
  @typedef {import('assets/js/libs/highlightjs/highlight.js').Language} Language
  @typedef {import('assets/js/libs/highlightjs/highlight.js').HLJSPlugin} HLJSPlugin
  @typedef {import('assets/js/libs/highlightjs/highlight.js').CompiledLanguage} CompiledLanguage
  */

  // compilation

  /**
   * Compiles a language definition result
   *
   * Given the raw result of a language definition (Language), compiles this so
   * that it is ready for highlighting code.
   * @param {Language} language
   * @returns {CompiledLanguage}
   */
  function compileLanguage(language) {
    /**
     * Builds a regex with the case sensitivity of the current language
     *
     * @param {RegExp | string} value
     * @param {boolean} [global]
     */
    function langRe(value, global) {
      return new RegExp(
        source(value),
        'm'
        + (language.case_insensitive ? 'i' : '')
        + (language.unicodeRegex ? 'u' : '')
        + (global ? 'g' : '')
      );
    }

    /**
      Stores multiple regular expressions and allows you to quickly search for
      them all in a string simultaneously - returning the first match.  It does
      this by creating a huge (a|b|c) regex - each individual item wrapped with ()
      and joined by `|` - using match groups to track position.  When a match is
      found checking which position in the array has content allows us to figure
      out which of the original regexes / match groups triggered the match.

      The match object itself (the result of `Regex.exec`) is returned but also
      enhanced by merging in any meta-data that was registered with the regex.
      This is how we keep track of which mode matched, and what type of rule
      (`illegal`, `begin`, end, etc).
    */
    class MultiRegex {
      constructor() {
        this.matchIndexes = {};
        // @ts-ignore
        this.regexes = [];
        this.matchAt = 1;
        this.position = 0;
      }

      // @ts-ignore
      addRule(re, opts) {
        opts.position = this.position++;
        // @ts-ignore
        this.matchIndexes[this.matchAt] = opts;
        this.regexes.push([opts, re]);
        this.matchAt += countMatchGroups(re) + 1;
      }

      compile() {
        if (this.regexes.length === 0) {
          // avoids the need to check length every time exec is called
          // @ts-ignore
          this.exec = () => null;
        }
        const terminators = this.regexes.map(el => el[1]);
        this.matcherRe = langRe(_rewriteBackreferences(terminators, { joinWith: '|' }), true);
        this.lastIndex = 0;
      }

      /** @param {string} s */
      exec(s) {
        this.matcherRe.lastIndex = this.lastIndex;
        const match = this.matcherRe.exec(s);
        if (!match) { return null; }

        // eslint-disable-next-line no-undefined
        const i = match.findIndex((el, i) => i > 0 && el !== undefined);
        // @ts-ignore
        const matchData = this.matchIndexes[i];
        // trim off any earlier non-relevant match groups (ie, the other regex
        // match groups that make up the multi-matcher)
        match.splice(0, i);

        return Object.assign(match, matchData);
      }
    }

    /*
      Created to solve the key deficiently with MultiRegex - there is no way to
      test for multiple matches at a single location.  Why would we need to do
      that?  In the future a more dynamic engine will allow certain matches to be
      ignored.  An example: if we matched say the 3rd regex in a large group but
      decided to ignore it - we'd need to started testing again at the 4th
      regex... but MultiRegex itself gives us no real way to do that.

      So what this class creates MultiRegexs on the fly for whatever search
      position they are needed.

      NOTE: These additional MultiRegex objects are created dynamically.  For most
      grammars most of the time we will never actually need anything more than the
      first MultiRegex - so this shouldn't have too much overhead.

      Say this is our search group, and we match regex3, but wish to ignore it.

        regex1 | regex2 | regex3 | regex4 | regex5    ' ie, startAt = 0

      What we need is a new MultiRegex that only includes the remaining
      possibilities:

        regex4 | regex5                               ' ie, startAt = 3

      This class wraps all that complexity up in a simple API... `startAt` decides
      where in the array of expressions to start doing the matching. It
      auto-increments, so if a match is found at position 2, then startAt will be
      set to 3.  If the end is reached startAt will return to 0.

      MOST of the time the parser will be setting startAt manually to 0.
    */
    class ResumableMultiRegex {
      constructor() {
        // @ts-ignore
        this.rules = [];
        // @ts-ignore
        this.multiRegexes = [];
        this.count = 0;

        this.lastIndex = 0;
        this.regexIndex = 0;
      }

      // @ts-ignore
      getMatcher(index) {
        if (this.multiRegexes[index]) return this.multiRegexes[index];

        const matcher = new MultiRegex();
        this.rules.slice(index).forEach(([re, opts]) => matcher.addRule(re, opts));
        matcher.compile();
        this.multiRegexes[index] = matcher;
        return matcher;
      }

      resumingScanAtSamePosition() {
        return this.regexIndex !== 0;
      }

      considerAll() {
        this.regexIndex = 0;
      }

      // @ts-ignore
      addRule(re, opts) {
        this.rules.push([re, opts]);
        if (opts.type === "begin") this.count++;
      }

      /** @param {string} s */
      exec(s) {
        const m = this.getMatcher(this.regexIndex);
        m.lastIndex = this.lastIndex;
        let result = m.exec(s);

        // The following is because we have no easy way to say "resume scanning at the
        // existing position but also skip the current rule ONLY". What happens is
        // all prior rules are also skipped which can result in matching the wrong
        // thing. Example of matching "booger":

        // our matcher is [string, "booger", number]
        //
        // ....booger....

        // if "booger" is ignored then we'd really need a regex to scan from the
        // SAME position for only: [string, number] but ignoring "booger" (if it
        // was the first match), a simple resume would scan ahead who knows how
        // far looking only for "number", ignoring potential string matches (or
        // future "booger" matches that might be valid.)

        // So what we do: We execute two matchers, one resuming at the same
        // position, but the second full matcher starting at the position after:

        //     /--- resume first regex match here (for [number])
        //     |/---- full match here for [string, "booger", number]
        //     vv
        // ....booger....

        // Which ever results in a match first is then used. So this 3-4 step
        // process essentially allows us to say "match at this position, excluding
        // a prior rule that was ignored".
        //
        // 1. Match "booger" first, ignore. Also proves that [string] does non match.
        // 2. Resume matching for [number]
        // 3. Match at index + 1 for [string, "booger", number]
        // 4. If #2 and #3 result in matches, which came first?
        if (this.resumingScanAtSamePosition()) {
          if (result && result.index === this.lastIndex) ; else { // use the second matcher result
            const m2 = this.getMatcher(0);
            m2.lastIndex = this.lastIndex + 1;
            result = m2.exec(s);
          }
        }

        if (result) {
          this.regexIndex += result.position + 1;
          if (this.regexIndex === this.count) {
            // wrap-around to considering all matches again
            this.considerAll();
          }
        }

        return result;
      }
    }

    /**
     * Given a mode, builds a huge ResumableMultiRegex that can be used to walk
     * the content and find matches.
     *
     * @param {CompiledMode} mode
     * @returns {ResumableMultiRegex}
     */
    function buildModeRegex(mode) {
      const mm = new ResumableMultiRegex();

      mode.contains.forEach(term => mm.addRule(term.begin, { rule: term, type: "begin" }));

      if (mode.terminatorEnd) {
        mm.addRule(mode.terminatorEnd, { type: "end" });
      }
      if (mode.illegal) {
        mm.addRule(mode.illegal, { type: "illegal" });
      }

      return mm;
    }

    /** skip vs abort vs ignore
     *
     * @skip   - The mode is still entered and exited normally (and contains rules apply),
     *           but all content is held and added to the parent buffer rather than being
     *           output when the mode ends.  Mostly used with `sublanguage` to build up
     *           a single large buffer than can be parsed by sublanguage.
     *
     *             - The mode begin ands ends normally.
     *             - Content matched is added to the parent mode buffer.
     *             - The parser cursor is moved forward normally.
     *
     * @abort  - A hack placeholder until we have ignore.  Aborts the mode (as if it
     *           never matched) but DOES NOT continue to match subsequent `contains`
     *           modes.  Abort is bad/suboptimal because it can result in modes
     *           farther down not getting applied because an earlier rule eats the
     *           content but then aborts.
     *
     *             - The mode does not begin.
     *             - Content matched by `begin` is added to the mode buffer.
     *             - The parser cursor is moved forward accordingly.
     *
     * @ignore - Ignores the mode (as if it never matched) and continues to match any
     *           subsequent `contains` modes.  Ignore isn't technically possible with
     *           the current parser implementation.
     *
     *             - The mode does not begin.
     *             - Content matched by `begin` is ignored.
     *             - The parser cursor is not moved forward.
     */

    /**
     * Compiles an individual mode
     *
     * This can raise an error if the mode contains certain detectable known logic
     * issues.
     * @param {Mode} mode
     * @param {CompiledMode | null} [parent]
     * @returns {CompiledMode | never}
     */
    function compileMode(mode, parent) {
      const cmode = /** @type CompiledMode */ (mode);
      if (mode.isCompiled) return cmode;

      [
        scopeClassName,
        // do this early so compiler extensions generally don't have to worry about
        // the distinction between match/begin
        compileMatch,
        MultiClass,
        beforeMatchExt
      ].forEach(ext => ext(mode, parent));

      language.compilerExtensions.forEach(ext => ext(mode, parent));

      // __beforeBegin is considered private API, internal use only
      mode.__beforeBegin = null;

      [
        beginKeywords,
        // do this later so compiler extensions that come earlier have access to the
        // raw array if they wanted to perhaps manipulate it, etc.
        compileIllegal,
        // default to 1 relevance if not specified
        compileRelevance
      ].forEach(ext => ext(mode, parent));

      mode.isCompiled = true;

      let keywordPattern = null;
      if (typeof mode.keywords === "object" && mode.keywords.$pattern) {
        // we need a copy because keywords might be compiled multiple times
        // so we can't go deleting $pattern from the original on the first
        // pass
        mode.keywords = Object.assign({}, mode.keywords);
        keywordPattern = mode.keywords.$pattern;
        delete mode.keywords.$pattern;
      }
      keywordPattern = keywordPattern || /\w+/;

      if (mode.keywords) {
        mode.keywords = compileKeywords(mode.keywords, language.case_insensitive);
      }

      cmode.keywordPatternRe = langRe(keywordPattern, true);

      if (parent) {
        if (!mode.begin) mode.begin = /\B|\b/;
        cmode.beginRe = langRe(cmode.begin);
        if (!mode.end && !mode.endsWithParent) mode.end = /\B|\b/;
        if (mode.end) cmode.endRe = langRe(cmode.end);
        cmode.terminatorEnd = source(cmode.end) || '';
        if (mode.endsWithParent && parent.terminatorEnd) {
          cmode.terminatorEnd += (mode.end ? '|' : '') + parent.terminatorEnd;
        }
      }
      if (mode.illegal) cmode.illegalRe = langRe(/** @type {RegExp | string} */ (mode.illegal));
      if (!mode.contains) mode.contains = [];

      mode.contains = [].concat(...mode.contains.map(function(c) {
        return expandOrCloneMode(c === 'self' ? mode : c);
      }));
      mode.contains.forEach(function(c) { compileMode(/** @type Mode */ (c), cmode); });

      if (mode.starts) {
        compileMode(mode.starts, parent);
      }

      cmode.matcher = buildModeRegex(cmode);
      return cmode;
    }

    if (!language.compilerExtensions) language.compilerExtensions = [];

    // self is not valid at the top-level
    if (language.contains && language.contains.includes('self')) {
      throw new Error("ERR: contains `self` is not supported at the top-level of a language.  See documentation.");
    }

    // we need a null object, which inherit will guarantee
    language.classNameAliases = inherit$1(language.classNameAliases || {});

    return compileMode(/** @type Mode */ (language));
  }

  /**
   * Determines if a mode has a dependency on it's parent or not
   *
   * If a mode does have a parent dependency then often we need to clone it if
   * it's used in multiple places so that each copy points to the correct parent,
   * where-as modes without a parent can often safely be re-used at the bottom of
   * a mode chain.
   *
   * @param {Mode | null} mode
   * @returns {boolean} - is there a dependency on the parent?
   * */
  function dependencyOnParent(mode) {
    if (!mode) return false;

    return mode.endsWithParent || dependencyOnParent(mode.starts);
  }

  /**
   * Expands a mode or clones it if necessary
   *
   * This is necessary for modes with parental dependenceis (see notes on
   * `dependencyOnParent`) and for nodes that have `variants` - which must then be
   * exploded into their own individual modes at compile time.
   *
   * @param {Mode} mode
   * @returns {Mode | Mode[]}
   * */
  function expandOrCloneMode(mode) {
    if (mode.variants && !mode.cachedVariants) {
      mode.cachedVariants = mode.variants.map(function(variant) {
        return inherit$1(mode, { variants: null }, variant);
      });
    }

    // EXPAND
    // if we have variants then essentially "replace" the mode with the variants
    // this happens in compileMode, where this function is called from
    if (mode.cachedVariants) {
      return mode.cachedVariants;
    }

    // CLONE
    // if we have dependencies on parents then we need a unique
    // instance of ourselves, so we can be reused with many
    // different parents without issue
    if (dependencyOnParent(mode)) {
      return inherit$1(mode, { starts: mode.starts ? inherit$1(mode.starts) : null });
    }

    if (Object.isFrozen(mode)) {
      return inherit$1(mode);
    }

    // no special dependency issues, just return ourselves
    return mode;
  }

  var version = "11.10.0";

  class HTMLInjectionError extends Error {
    constructor(reason, html) {
      super(reason);
      this.name = "HTMLInjectionError";
      this.html = html;
    }
  }

  /*
  Syntax highlighting with language autodetection.
  https://highlightjs.org/
  */



  /**
  @typedef {import('assets/js/libs/highlightjs/highlight.js').Mode} Mode
  @typedef {import('assets/js/libs/highlightjs/highlight.js').CompiledMode} CompiledMode
  @typedef {import('assets/js/libs/highlightjs/highlight.js').CompiledScope} CompiledScope
  @typedef {import('assets/js/libs/highlightjs/highlight.js').Language} Language
  @typedef {import('assets/js/libs/highlightjs/highlight.js').HLJSApi} HLJSApi
  @typedef {import('assets/js/libs/highlightjs/highlight.js').HLJSPlugin} HLJSPlugin
  @typedef {import('assets/js/libs/highlightjs/highlight.js').PluginEvent} PluginEvent
  @typedef {import('assets/js/libs/highlightjs/highlight.js').HLJSOptions} HLJSOptions
  @typedef {import('assets/js/libs/highlightjs/highlight.js').LanguageFn} LanguageFn
  @typedef {import('assets/js/libs/highlightjs/highlight.js').HighlightedHTMLElement} HighlightedHTMLElement
  @typedef {import('assets/js/libs/highlightjs/highlight.js').BeforeHighlightContext} BeforeHighlightContext
  @typedef {import('highlight.js/private').MatchType} MatchType
  @typedef {import('highlight.js/private').KeywordData} KeywordData
  @typedef {import('highlight.js/private').EnhancedMatch} EnhancedMatch
  @typedef {import('highlight.js/private').AnnotatedError} AnnotatedError
  @typedef {import('assets/js/libs/highlightjs/highlight.js').AutoHighlightResult} AutoHighlightResult
  @typedef {import('assets/js/libs/highlightjs/highlight.js').HighlightOptions} HighlightOptions
  @typedef {import('assets/js/libs/highlightjs/highlight.js').HighlightResult} HighlightResult
  */


  const escape = escapeHTML;
  const inherit = inherit$1;
  const NO_MATCH = Symbol("nomatch");
  const MAX_KEYWORD_HITS = 7;

  /**
   * @param {any} hljs - object that is extended (legacy)
   * @returns {HLJSApi}
   */
  const HLJS = function(hljs) {
    // Global internal variables used within the highlight.js library.
    /** @type {Record<string, Language>} */
    const languages = Object.create(null);
    /** @type {Record<string, string>} */
    const aliases = Object.create(null);
    /** @type {HLJSPlugin[]} */
    const plugins = [];

    // safe/production mode - swallows more errors, tries to keep running
    // even if a single syntax or parse hits a fatal error
    let SAFE_MODE = true;
    const LANGUAGE_NOT_FOUND = "Could not find the language '{}', did you forget to load/include a language module?";
    /** @type {Language} */
    const PLAINTEXT_LANGUAGE = { disableAutodetect: true, name: 'Plain text', contains: [] };

    // Global options used when within external APIs. This is modified when
    // calling the `hljs.configure` function.
    /** @type HLJSOptions */
    let options = {
      ignoreUnescapedHTML: false,
      throwUnescapedHTML: false,
      noHighlightRe: /^(no-?highlight)$/i,
      languageDetectRe: /\blang(?:uage)?-([\w-]+)\b/i,
      classPrefix: 'hljs-',
      cssSelector: 'pre code',
      languages: null,
      // beta configuration options, subject to change, welcome to discuss
      // https://github.com/highlightjs/highlight.js/issues/1086
      __emitter: TokenTreeEmitter
    };

    /* Utility functions */

    /**
     * Tests a language name to see if highlighting should be skipped
     * @param {string} languageName
     */
    function shouldNotHighlight(languageName) {
      return options.noHighlightRe.test(languageName);
    }

    /**
     * @param {HighlightedHTMLElement} block - the HTML element to determine language for
     */
    function blockLanguage(block) {
      let classes = block.className + ' ';

      classes += block.parentNode ? block.parentNode.className : '';

      // language-* takes precedence over non-prefixed class names.
      const match = options.languageDetectRe.exec(classes);
      if (match) {
        const language = getLanguage(match[1]);
        if (!language) {
          warn(LANGUAGE_NOT_FOUND.replace("{}", match[1]));
          warn("Falling back to no-highlight mode for this block.", block);
        }
        return language ? match[1] : 'no-highlight';
      }

      return classes
        .split(/\s+/)
        .find((_class) => shouldNotHighlight(_class) || getLanguage(_class));
    }

    /**
     * Core highlighting function.
     *
     * OLD API
     * highlight(lang, code, ignoreIllegals, continuation)
     *
     * NEW API
     * highlight(code, {lang, ignoreIllegals})
     *
     * @param {string} codeOrLanguageName - the language to use for highlighting
     * @param {string | HighlightOptions} optionsOrCode - the code to highlight
     * @param {boolean} [ignoreIllegals] - whether to ignore illegal matches, default is to bail
     *
     * @returns {HighlightResult} Result - an object that represents the result
     * @property {string} language - the language name
     * @property {number} relevance - the relevance score
     * @property {string} value - the highlighted HTML code
     * @property {string} code - the original raw code
     * @property {CompiledMode} top - top of the current mode stack
     * @property {boolean} illegal - indicates whether any illegal matches were found
    */
    function highlight(codeOrLanguageName, optionsOrCode, ignoreIllegals) {
      let code = "";
      let languageName = "";
      if (typeof optionsOrCode === "object") {
        code = codeOrLanguageName;
        ignoreIllegals = optionsOrCode.ignoreIllegals;
        languageName = optionsOrCode.language;
      } else {
        // old API
        deprecated("10.7.0", "highlight(lang, code, ...args) has been deprecated.");
        deprecated("10.7.0", "Please use highlight(code, options) instead.\nhttps://github.com/highlightjs/highlight.js/issues/2277");
        languageName = codeOrLanguageName;
        code = optionsOrCode;
      }

      // https://github.com/highlightjs/highlight.js/issues/3149
      // eslint-disable-next-line no-undefined
      if (ignoreIllegals === undefined) { ignoreIllegals = true; }

      /** @type {BeforeHighlightContext} */
      const context = {
        code,
        language: languageName
      };
      // the plugin can change the desired language or the code to be highlighted
      // just be changing the object it was passed
      fire("before:highlight", context);

      // a before plugin can usurp the result completely by providing it's own
      // in which case we don't even need to call highlight
      const result = context.result
        ? context.result
        : _highlight(context.language, context.code, ignoreIllegals);

      result.code = context.code;
      // the plugin can change anything in result to suite it
      fire("after:highlight", result);

      return result;
    }

    /**
     * private highlight that's used internally and does not fire callbacks
     *
     * @param {string} languageName - the language to use for highlighting
     * @param {string} codeToHighlight - the code to highlight
     * @param {boolean?} [ignoreIllegals] - whether to ignore illegal matches, default is to bail
     * @param {CompiledMode?} [continuation] - current continuation mode, if any
     * @returns {HighlightResult} - result of the highlight operation
    */
    function _highlight(languageName, codeToHighlight, ignoreIllegals, continuation) {
      const keywordHits = Object.create(null);

      /**
       * Return keyword data if a match is a keyword
       * @param {CompiledMode} mode - current mode
       * @param {string} matchText - the textual match
       * @returns {KeywordData | false}
       */
      function keywordData(mode, matchText) {
        return mode.keywords[matchText];
      }

      function processKeywords() {
        if (!top.keywords) {
          emitter.addText(modeBuffer);
          return;
        }

        let lastIndex = 0;
        top.keywordPatternRe.lastIndex = 0;
        let match = top.keywordPatternRe.exec(modeBuffer);
        let buf = "";

        while (match) {
          buf += modeBuffer.substring(lastIndex, match.index);
          const word = language.case_insensitive ? match[0].toLowerCase() : match[0];
          const data = keywordData(top, word);
          if (data) {
            const [kind, keywordRelevance] = data;
            emitter.addText(buf);
            buf = "";

            keywordHits[word] = (keywordHits[word] || 0) + 1;
            if (keywordHits[word] <= MAX_KEYWORD_HITS) relevance += keywordRelevance;
            if (kind.startsWith("_")) {
              // _ implied for relevance only, do not highlight
              // by applying a class name
              buf += match[0];
            } else {
              const cssClass = language.classNameAliases[kind] || kind;
              emitKeyword(match[0], cssClass);
            }
          } else {
            buf += match[0];
          }
          lastIndex = top.keywordPatternRe.lastIndex;
          match = top.keywordPatternRe.exec(modeBuffer);
        }
        buf += modeBuffer.substring(lastIndex);
        emitter.addText(buf);
      }

      function processSubLanguage() {
        if (modeBuffer === "") return;
        /** @type HighlightResult */
        let result = null;

        if (typeof top.subLanguage === 'string') {
          if (!languages[top.subLanguage]) {
            emitter.addText(modeBuffer);
            return;
          }
          result = _highlight(top.subLanguage, modeBuffer, true, continuations[top.subLanguage]);
          continuations[top.subLanguage] = /** @type {CompiledMode} */ (result._top);
        } else {
          result = highlightAuto(modeBuffer, top.subLanguage.length ? top.subLanguage : null);
        }

        // Counting embedded language score towards the host language may be disabled
        // with zeroing the containing mode relevance. Use case in point is Markdown that
        // allows XML everywhere and makes every XML snippet to have a much larger Markdown
        // score.
        if (top.relevance > 0) {
          relevance += result.relevance;
        }
        emitter.__addSublanguage(result._emitter, result.language);
      }

      function processBuffer() {
        if (top.subLanguage != null) {
          processSubLanguage();
        } else {
          processKeywords();
        }
        modeBuffer = '';
      }

      /**
       * @param {string} text
       * @param {string} scope
       */
      function emitKeyword(keyword, scope) {
        if (keyword === "") return;

        emitter.startScope(scope);
        emitter.addText(keyword);
        emitter.endScope();
      }

      /**
       * @param {CompiledScope} scope
       * @param {RegExpMatchArray} match
       */
      function emitMultiClass(scope, match) {
        let i = 1;
        const max = match.length - 1;
        while (i <= max) {
          if (!scope._emit[i]) { i++; continue; }
          const klass = language.classNameAliases[scope[i]] || scope[i];
          const text = match[i];
          if (klass) {
            emitKeyword(text, klass);
          } else {
            modeBuffer = text;
            processKeywords();
            modeBuffer = "";
          }
          i++;
        }
      }

      /**
       * @param {CompiledMode} mode - new mode to start
       * @param {RegExpMatchArray} match
       */
      function startNewMode(mode, match) {
        if (mode.scope && typeof mode.scope === "string") {
          emitter.openNode(language.classNameAliases[mode.scope] || mode.scope);
        }
        if (mode.beginScope) {
          // beginScope just wraps the begin match itself in a scope
          if (mode.beginScope._wrap) {
            emitKeyword(modeBuffer, language.classNameAliases[mode.beginScope._wrap] || mode.beginScope._wrap);
            modeBuffer = "";
          } else if (mode.beginScope._multi) {
            // at this point modeBuffer should just be the match
            emitMultiClass(mode.beginScope, match);
            modeBuffer = "";
          }
        }

        top = Object.create(mode, { parent: { value: top } });
        return top;
      }

      /**
       * @param {CompiledMode } mode - the mode to potentially end
       * @param {RegExpMatchArray} match - the latest match
       * @param {string} matchPlusRemainder - match plus remainder of content
       * @returns {CompiledMode | void} - the next mode, or if void continue on in current mode
       */
      function endOfMode(mode, match, matchPlusRemainder) {
        let matched = startsWith(mode.endRe, matchPlusRemainder);

        if (matched) {
          if (mode["on:end"]) {
            const resp = new Response(mode);
            mode["on:end"](match, resp);
            if (resp.isMatchIgnored) matched = false;
          }

          if (matched) {
            while (mode.endsParent && mode.parent) {
              mode = mode.parent;
            }
            return mode;
          }
        }
        // even if on:end fires an `ignore` it's still possible
        // that we might trigger the end node because of a parent mode
        if (mode.endsWithParent) {
          return endOfMode(mode.parent, match, matchPlusRemainder);
        }
      }

      /**
       * Handle matching but then ignoring a sequence of text
       *
       * @param {string} lexeme - string containing full match text
       */
      function doIgnore(lexeme) {
        if (top.matcher.regexIndex === 0) {
          // no more regexes to potentially match here, so we move the cursor forward one
          // space
          modeBuffer += lexeme[0];
          return 1;
        } else {
          // no need to move the cursor, we still have additional regexes to try and
          // match at this very spot
          resumeScanAtSamePosition = true;
          return 0;
        }
      }

      /**
       * Handle the start of a new potential mode match
       *
       * @param {EnhancedMatch} match - the current match
       * @returns {number} how far to advance the parse cursor
       */
      function doBeginMatch(match) {
        const lexeme = match[0];
        const newMode = match.rule;

        const resp = new Response(newMode);
        // first internal before callbacks, then the public ones
        const beforeCallbacks = [newMode.__beforeBegin, newMode["on:begin"]];
        for (const cb of beforeCallbacks) {
          if (!cb) continue;
          cb(match, resp);
          if (resp.isMatchIgnored) return doIgnore(lexeme);
        }

        if (newMode.skip) {
          modeBuffer += lexeme;
        } else {
          if (newMode.excludeBegin) {
            modeBuffer += lexeme;
          }
          processBuffer();
          if (!newMode.returnBegin && !newMode.excludeBegin) {
            modeBuffer = lexeme;
          }
        }
        startNewMode(newMode, match);
        return newMode.returnBegin ? 0 : lexeme.length;
      }

      /**
       * Handle the potential end of mode
       *
       * @param {RegExpMatchArray} match - the current match
       */
      function doEndMatch(match) {
        const lexeme = match[0];
        const matchPlusRemainder = codeToHighlight.substring(match.index);

        const endMode = endOfMode(top, match, matchPlusRemainder);
        if (!endMode) { return NO_MATCH; }

        const origin = top;
        if (top.endScope && top.endScope._wrap) {
          processBuffer();
          emitKeyword(lexeme, top.endScope._wrap);
        } else if (top.endScope && top.endScope._multi) {
          processBuffer();
          emitMultiClass(top.endScope, match);
        } else if (origin.skip) {
          modeBuffer += lexeme;
        } else {
          if (!(origin.returnEnd || origin.excludeEnd)) {
            modeBuffer += lexeme;
          }
          processBuffer();
          if (origin.excludeEnd) {
            modeBuffer = lexeme;
          }
        }
        do {
          if (top.scope) {
            emitter.closeNode();
          }
          if (!top.skip && !top.subLanguage) {
            relevance += top.relevance;
          }
          top = top.parent;
        } while (top !== endMode.parent);
        if (endMode.starts) {
          startNewMode(endMode.starts, match);
        }
        return origin.returnEnd ? 0 : lexeme.length;
      }

      function processContinuations() {
        const list = [];
        for (let current = top; current !== language; current = current.parent) {
          if (current.scope) {
            list.unshift(current.scope);
          }
        }
        list.forEach(item => emitter.openNode(item));
      }

      /** @type {{type?: MatchType, index?: number, rule?: Mode}}} */
      let lastMatch = {};

      /**
       *  Process an individual match
       *
       * @param {string} textBeforeMatch - text preceding the match (since the last match)
       * @param {EnhancedMatch} [match] - the match itself
       */
      function processLexeme(textBeforeMatch, match) {
        const lexeme = match && match[0];

        // add non-matched text to the current mode buffer
        modeBuffer += textBeforeMatch;

        if (lexeme == null) {
          processBuffer();
          return 0;
        }

        // we've found a 0 width match and we're stuck, so we need to advance
        // this happens when we have badly behaved rules that have optional matchers to the degree that
        // sometimes they can end up matching nothing at all
        // Ref: https://github.com/highlightjs/highlight.js/issues/2140
        if (lastMatch.type === "begin" && match.type === "end" && lastMatch.index === match.index && lexeme === "") {
          // spit the "skipped" character that our regex choked on back into the output sequence
          modeBuffer += codeToHighlight.slice(match.index, match.index + 1);
          if (!SAFE_MODE) {
            /** @type {AnnotatedError} */
            const err = new Error(`0 width match regex (${languageName})`);
            err.languageName = languageName;
            err.badRule = lastMatch.rule;
            throw err;
          }
          return 1;
        }
        lastMatch = match;

        if (match.type === "begin") {
          return doBeginMatch(match);
        } else if (match.type === "illegal" && !ignoreIllegals) {
          // illegal match, we do not continue processing
          /** @type {AnnotatedError} */
          const err = new Error('Illegal lexeme "' + lexeme + '" for mode "' + (top.scope || '<unnamed>') + '"');
          err.mode = top;
          throw err;
        } else if (match.type === "end") {
          const processed = doEndMatch(match);
          if (processed !== NO_MATCH) {
            return processed;
          }
        }

        // edge case for when illegal matches $ (end of line) which is technically
        // a 0 width match but not a begin/end match so it's not caught by the
        // first handler (when ignoreIllegals is true)
        if (match.type === "illegal" && lexeme === "") {
          // advance so we aren't stuck in an infinite loop
          return 1;
        }

        // infinite loops are BAD, this is a last ditch catch all. if we have a
        // decent number of iterations yet our index (cursor position in our
        // parsing) still 3x behind our index then something is very wrong
        // so we bail
        if (iterations > 100000 && iterations > match.index * 3) {
          const err = new Error('potential infinite loop, way more iterations than matches');
          throw err;
        }

        /*
        Why might be find ourselves here?  An potential end match that was
        triggered but could not be completed.  IE, `doEndMatch` returned NO_MATCH.
        (this could be because a callback requests the match be ignored, etc)

        This causes no real harm other than stopping a few times too many.
        */

        modeBuffer += lexeme;
        return lexeme.length;
      }

      const language = getLanguage(languageName);
      if (!language) {
        error(LANGUAGE_NOT_FOUND.replace("{}", languageName));
        throw new Error('Unknown language: "' + languageName + '"');
      }

      const md = compileLanguage(language);
      let result = '';
      /** @type {CompiledMode} */
      let top = continuation || md;
      /** @type Record<string,CompiledMode> */
      const continuations = {}; // keep continuations for sub-languages
      const emitter = new options.__emitter(options);
      processContinuations();
      let modeBuffer = '';
      let relevance = 0;
      let index = 0;
      let iterations = 0;
      let resumeScanAtSamePosition = false;

      try {
        if (!language.__emitTokens) {
          top.matcher.considerAll();

          for (;;) {
            iterations++;
            if (resumeScanAtSamePosition) {
              // only regexes not matched previously will now be
              // considered for a potential match
              resumeScanAtSamePosition = false;
            } else {
              top.matcher.considerAll();
            }
            top.matcher.lastIndex = index;

            const match = top.matcher.exec(codeToHighlight);
            // console.log("match", match[0], match.rule && match.rule.begin)

            if (!match) break;

            const beforeMatch = codeToHighlight.substring(index, match.index);
            const processedCount = processLexeme(beforeMatch, match);
            index = match.index + processedCount;
          }
          processLexeme(codeToHighlight.substring(index));
        } else {
          language.__emitTokens(codeToHighlight, emitter);
        }

        emitter.finalize();
        result = emitter.toHTML();

        return {
          language: languageName,
          value: result,
          relevance,
          illegal: false,
          _emitter: emitter,
          _top: top
        };
      } catch (err) {
        if (err.message && err.message.includes('Illegal')) {
          return {
            language: languageName,
            value: escape(codeToHighlight),
            illegal: true,
            relevance: 0,
            _illegalBy: {
              message: err.message,
              index,
              context: codeToHighlight.slice(index - 100, index + 100),
              mode: err.mode,
              resultSoFar: result
            },
            _emitter: emitter
          };
        } else if (SAFE_MODE) {
          return {
            language: languageName,
            value: escape(codeToHighlight),
            illegal: false,
            relevance: 0,
            errorRaised: err,
            _emitter: emitter,
            _top: top
          };
        } else {
          throw err;
        }
      }
    }

    /**
     * returns a valid highlight result, without actually doing any actual work,
     * auto highlight starts with this and it's possible for small snippets that
     * auto-detection may not find a better match
     * @param {string} code
     * @returns {HighlightResult}
     */
    function justTextHighlightResult(code) {
      const result = {
        value: escape(code),
        illegal: false,
        relevance: 0,
        _top: PLAINTEXT_LANGUAGE,
        _emitter: new options.__emitter(options)
      };
      result._emitter.addText(code);
      return result;
    }

    /**
    Highlighting with language detection. Accepts a string with the code to
    highlight. Returns an object with the following properties:

    - language (detected language)
    - relevance (int)
    - value (an HTML string with highlighting markup)
    - secondBest (object with the same structure for second-best heuristically
      detected language, may be absent)

      @param {string} code
      @param {Array<string>} [languageSubset]
      @returns {AutoHighlightResult}
    */
    function highlightAuto(code, languageSubset) {
      languageSubset = languageSubset || options.languages || Object.keys(languages);
      const plaintext = justTextHighlightResult(code);

      const results = languageSubset.filter(getLanguage).filter(autoDetection).map(name =>
        _highlight(name, code, false)
      );
      results.unshift(plaintext); // plaintext is always an option

      const sorted = results.sort((a, b) => {
        // sort base on relevance
        if (a.relevance !== b.relevance) return b.relevance - a.relevance;

        // always award the tie to the base language
        // ie if C++ and Arduino are tied, it's more likely to be C++
        if (a.language && b.language) {
          if (getLanguage(a.language).supersetOf === b.language) {
            return 1;
          } else if (getLanguage(b.language).supersetOf === a.language) {
            return -1;
          }
        }

        // otherwise say they are equal, which has the effect of sorting on
        // relevance while preserving the original ordering - which is how ties
        // have historically been settled, ie the language that comes first always
        // wins in the case of a tie
        return 0;
      });

      const [best, secondBest] = sorted;

      /** @type {AutoHighlightResult} */
      const result = best;
      result.secondBest = secondBest;

      return result;
    }

    /**
     * Builds new class name for block given the language name
     *
     * @param {HTMLElement} element
     * @param {string} [currentLang]
     * @param {string} [resultLang]
     */
    function updateClassName(element, currentLang, resultLang) {
      const language = (currentLang && aliases[currentLang]) || resultLang;

      element.classList.add("hljs");
      element.classList.add(`language-${language}`);
    }

    /**
     * Applies highlighting to a DOM node containing code.
     *
     * @param {HighlightedHTMLElement} element - the HTML element to highlight
    */
    function highlightElement(element) {
      /** @type HTMLElement */
      let node = null;
      const language = blockLanguage(element);

      if (shouldNotHighlight(language)) return;

      fire("before:highlightElement",
        { el: element, language });

      if (element.dataset.highlighted) {
        console.log("Element previously highlighted. To highlight again, first unset `dataset.highlighted`.", element);
        return;
      }

      // we should be all text, no child nodes (unescaped HTML) - this is possibly
      // an HTML injection attack - it's likely too late if this is already in
      // production (the code has likely already done its damage by the time
      // we're seeing it)... but we yell loudly about this so that hopefully it's
      // more likely to be caught in development before making it to production
      if (element.children.length > 0) {
        if (!options.ignoreUnescapedHTML) {
          console.warn("One of your code blocks includes unescaped HTML. This is a potentially serious security risk.");
          console.warn("https://github.com/highlightjs/highlight.js/wiki/security");
          console.warn("The element with unescaped HTML:");
          console.warn(element);
        }
        if (options.throwUnescapedHTML) {
          const err = new HTMLInjectionError(
            "One of your code blocks includes unescaped HTML.",
            element.innerHTML
          );
          throw err;
        }
      }

      node = element;
      const text = node.textContent;
      const result = language ? highlight(text, { language, ignoreIllegals: true }) : highlightAuto(text);

      element.innerHTML = result.value;
      element.dataset.highlighted = "yes";
      updateClassName(element, language, result.language);
      element.result = {
        language: result.language,
        // TODO: remove with version 11.0
        re: result.relevance,
        relevance: result.relevance
      };
      if (result.secondBest) {
        element.secondBest = {
          language: result.secondBest.language,
          relevance: result.secondBest.relevance
        };
      }

      fire("after:highlightElement", { el: element, result, text });
    }

    /**
     * Updates highlight.js global options with the passed options
     *
     * @param {Partial<HLJSOptions>} userOptions
     */
    function configure(userOptions) {
      options = inherit(options, userOptions);
    }

    // TODO: remove v12, deprecated
    const initHighlighting = () => {
      highlightAll();
      deprecated("10.6.0", "initHighlighting() deprecated.  Use highlightAll() now.");
    };

    // TODO: remove v12, deprecated
    function initHighlightingOnLoad() {
      highlightAll();
      deprecated("10.6.0", "initHighlightingOnLoad() deprecated.  Use highlightAll() now.");
    }

    let wantsHighlight = false;

    /**
     * auto-highlights all pre>code elements on the page
     */
    function highlightAll() {
      // if we are called too early in the loading process
      if (document.readyState === "loading") {
        wantsHighlight = true;
        return;
      }

      const blocks = document.querySelectorAll(options.cssSelector);
      blocks.forEach(highlightElement);
    }

    function boot() {
      // if a highlight was requested before DOM was loaded, do now
      if (wantsHighlight) highlightAll();
    }

    // make sure we are in the browser environment
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('DOMContentLoaded', boot, false);
    }

    /**
     * Register a language grammar module
     *
     * @param {string} languageName
     * @param {LanguageFn} languageDefinition
     */
    function registerLanguage(languageName, languageDefinition) {
      let lang = null;
      try {
        lang = languageDefinition(hljs);
      } catch (error$1) {
        error("Language definition for '{}' could not be registered.".replace("{}", languageName));
        // hard or soft error
        if (!SAFE_MODE) { throw error$1; } else { error(error$1); }
        // languages that have serious errors are replaced with essentially a
        // "plaintext" stand-in so that the code blocks will still get normal
        // css classes applied to them - and one bad language won't break the
        // entire highlighter
        lang = PLAINTEXT_LANGUAGE;
      }
      // give it a temporary name if it doesn't have one in the meta-data
      if (!lang.name) lang.name = languageName;
      languages[languageName] = lang;
      lang.rawDefinition = languageDefinition.bind(null, hljs);

      if (lang.aliases) {
        registerAliases(lang.aliases, { languageName });
      }
    }

    /**
     * Remove a language grammar module
     *
     * @param {string} languageName
     */
    function unregisterLanguage(languageName) {
      delete languages[languageName];
      for (const alias of Object.keys(aliases)) {
        if (aliases[alias] === languageName) {
          delete aliases[alias];
        }
      }
    }

    /**
     * @returns {string[]} List of language internal names
     */
    function listLanguages() {
      return Object.keys(languages);
    }

    /**
     * @param {string} name - name of the language to retrieve
     * @returns {Language | undefined}
     */
    function getLanguage(name) {
      name = (name || '').toLowerCase();
      return languages[name] || languages[aliases[name]];
    }

    /**
     *
     * @param {string|string[]} aliasList - single alias or list of aliases
     * @param {{languageName: string}} opts
     */
    function registerAliases(aliasList, { languageName }) {
      if (typeof aliasList === 'string') {
        aliasList = [aliasList];
      }
      aliasList.forEach(alias => { aliases[alias.toLowerCase()] = languageName; });
    }

    /**
     * Determines if a given language has auto-detection enabled
     * @param {string} name - name of the language
     */
    function autoDetection(name) {
      const lang = getLanguage(name);
      return lang && !lang.disableAutodetect;
    }

    /**
     * Upgrades the old highlightBlock plugins to the new
     * highlightElement API
     * @param {HLJSPlugin} plugin
     */
    function upgradePluginAPI(plugin) {
      // TODO: remove with v12
      if (plugin["before:highlightBlock"] && !plugin["before:highlightElement"]) {
        plugin["before:highlightElement"] = (data) => {
          plugin["before:highlightBlock"](
            Object.assign({ block: data.el }, data)
          );
        };
      }
      if (plugin["after:highlightBlock"] && !plugin["after:highlightElement"]) {
        plugin["after:highlightElement"] = (data) => {
          plugin["after:highlightBlock"](
            Object.assign({ block: data.el }, data)
          );
        };
      }
    }

    /**
     * @param {HLJSPlugin} plugin
     */
    function addPlugin(plugin) {
      upgradePluginAPI(plugin);
      plugins.push(plugin);
    }

    /**
     * @param {HLJSPlugin} plugin
     */
    function removePlugin(plugin) {
      const index = plugins.indexOf(plugin);
      if (index !== -1) {
        plugins.splice(index, 1);
      }
    }

    /**
     *
     * @param {PluginEvent} event
     * @param {any} args
     */
    function fire(event, args) {
      const cb = event;
      plugins.forEach(function(plugin) {
        if (plugin[cb]) {
          plugin[cb](args);
        }
      });
    }

    /**
     * DEPRECATED
     * @param {HighlightedHTMLElement} el
     */
    function deprecateHighlightBlock(el) {
      deprecated("10.7.0", "highlightBlock will be removed entirely in v12.0");
      deprecated("10.7.0", "Please use highlightElement now.");

      return highlightElement(el);
    }

    /* Interface definition */
    Object.assign(hljs, {
      highlight,
      highlightAuto,
      highlightAll,
      highlightElement,
      // TODO: Remove with v12 API
      highlightBlock: deprecateHighlightBlock,
      configure,
      initHighlighting,
      initHighlightingOnLoad,
      registerLanguage,
      unregisterLanguage,
      listLanguages,
      getLanguage,
      registerAliases,
      autoDetection,
      inherit,
      addPlugin,
      removePlugin
    });

    hljs.debugMode = function() { SAFE_MODE = false; };
    hljs.safeMode = function() { SAFE_MODE = true; };
    hljs.versionString = version;

    hljs.regex = {
      concat: concat,
      lookahead: lookahead,
      either: either,
      optional: optional,
      anyNumberOfTimes: anyNumberOfTimes
    };

    for (const key in MODES) {
      // @ts-ignore
      if (typeof MODES[key] === "object") {
        // @ts-ignore
        deepFreeze(MODES[key]);
      }
    }

    // merge all the modes/regexes into our main object
    Object.assign(hljs, MODES);

    return hljs;
  };

  // Other names for the variable may break build script
  const highlight = HLJS({});

  // returns a new instance of the highlighter to be used for extensions
  // check https://github.com/wooorm/lowlight/issues/47
  highlight.newInstance = () => HLJS({});

  return highlight;

})();
if (typeof exports === 'object' && typeof module !== 'undefined') { module.exports = hljs; }
/*! `apache` grammar compiled for Highlight.js 11.10.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Apache config
  Author: Ruslan Keba <rukeba@gmail.com>
  Contributors: Ivan Sagalaev <maniac@softwaremaniacs.org>
  Website: https://httpd.apache.org
  Description: language definition for Apache configuration files (httpd.conf & .htaccess)
  Category: config, web
  Audit: 2020
  */

  /** @type LanguageFn */
  function apache(hljs) {
    const NUMBER_REF = {
      className: 'number',
      begin: /[$%]\d+/
    };
    const NUMBER = {
      className: 'number',
      begin: /\b\d+/
    };
    const IP_ADDRESS = {
      className: "number",
      begin: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d{1,5})?/
    };
    const PORT_NUMBER = {
      className: "number",
      begin: /:\d{1,5}/
    };
    return {
      name: 'Apache config',
      aliases: [ 'apacheconf' ],
      case_insensitive: true,
      contains: [
        hljs.HASH_COMMENT_MODE,
        {
          className: 'section',
          begin: /<\/?/,
          end: />/,
          contains: [
            IP_ADDRESS,
            PORT_NUMBER,
            // low relevance prevents us from claming XML/HTML where this rule would
            // match strings inside of XML tags
            hljs.inherit(hljs.QUOTE_STRING_MODE, { relevance: 0 })
          ]
        },
        {
          className: 'attribute',
          begin: /\w+/,
          relevance: 0,
          // keywords aren’t needed for highlighting per se, they only boost relevance
          // for a very generally defined mode (starts with a word, ends with line-end
          keywords: { _: [
            "order",
            "deny",
            "allow",
            "setenv",
            "rewriterule",
            "rewriteengine",
            "rewritecond",
            "documentroot",
            "sethandler",
            "errordocument",
            "loadmodule",
            "options",
            "header",
            "listen",
            "serverroot",
            "servername"
          ] },
          starts: {
            end: /$/,
            relevance: 0,
            keywords: { literal: 'on off all deny allow' },
            contains: [
              {
                className: 'meta',
                begin: /\s\[/,
                end: /\]$/
              },
              {
                className: 'variable',
                begin: /[\$%]\{/,
                end: /\}/,
                contains: [
                  'self',
                  NUMBER_REF
                ]
              },
              IP_ADDRESS,
              NUMBER,
              hljs.QUOTE_STRING_MODE
            ]
          }
        }
      ],
      illegal: /\S/
    };
  }

  return apache;

})();

    hljs.registerLanguage('apache', hljsGrammar);
  })();/*! `arduino` grammar compiled for Highlight.js 11.10.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: C++
  Category: common, system
  Website: https://isocpp.org
  */

  /** @type LanguageFn */
  function cPlusPlus(hljs) {
    const regex = hljs.regex;
    // added for historic reasons because `hljs.C_LINE_COMMENT_MODE` does
    // not include such support nor can we be sure all the grammars depending
    // on it would desire this behavior
    const C_LINE_COMMENT_MODE = hljs.COMMENT('//', '$', { contains: [ { begin: /\\\n/ } ] });
    const DECLTYPE_AUTO_RE = 'decltype\\(auto\\)';
    const NAMESPACE_RE = '[a-zA-Z_]\\w*::';
    const TEMPLATE_ARGUMENT_RE = '<[^<>]+>';
    const FUNCTION_TYPE_RE = '(?!struct)('
      + DECLTYPE_AUTO_RE + '|'
      + regex.optional(NAMESPACE_RE)
      + '[a-zA-Z_]\\w*' + regex.optional(TEMPLATE_ARGUMENT_RE)
    + ')';

    const CPP_PRIMITIVE_TYPES = {
      className: 'type',
      begin: '\\b[a-z\\d_]*_t\\b'
    };

    // https://en.cppreference.com/w/cpp/language/escape
    // \\ \x \xFF \u2837 \u00323747 \374
    const CHARACTER_ESCAPES = '\\\\(x[0-9A-Fa-f]{2}|u[0-9A-Fa-f]{4,8}|[0-7]{3}|\\S)';
    const STRINGS = {
      className: 'string',
      variants: [
        {
          begin: '(u8?|U|L)?"',
          end: '"',
          illegal: '\\n',
          contains: [ hljs.BACKSLASH_ESCAPE ]
        },
        {
          begin: '(u8?|U|L)?\'(' + CHARACTER_ESCAPES + '|.)',
          end: '\'',
          illegal: '.'
        },
        hljs.END_SAME_AS_BEGIN({
          begin: /(?:u8?|U|L)?R"([^()\\ ]{0,16})\(/,
          end: /\)([^()\\ ]{0,16})"/
        })
      ]
    };

    const NUMBERS = {
      className: 'number',
      variants: [
        // Floating-point literal.
        { begin:
          "[+-]?(?:" // Leading sign.
            // Decimal.
            + "(?:"
              +"[0-9](?:'?[0-9])*\\.(?:[0-9](?:'?[0-9])*)?"
              + "|\\.[0-9](?:'?[0-9])*"
            + ")(?:[Ee][+-]?[0-9](?:'?[0-9])*)?"
            + "|[0-9](?:'?[0-9])*[Ee][+-]?[0-9](?:'?[0-9])*"
            // Hexadecimal.
            + "|0[Xx](?:"
              +"[0-9A-Fa-f](?:'?[0-9A-Fa-f])*(?:\\.(?:[0-9A-Fa-f](?:'?[0-9A-Fa-f])*)?)?"
              + "|\\.[0-9A-Fa-f](?:'?[0-9A-Fa-f])*"
            + ")[Pp][+-]?[0-9](?:'?[0-9])*"
          + ")(?:" // Literal suffixes.
            + "[Ff](?:16|32|64|128)?"
            + "|(BF|bf)16"
            + "|[Ll]"
            + "|" // Literal suffix is optional.
          + ")"
        },
        // Integer literal.
        { begin:
          "[+-]?\\b(?:" // Leading sign.
            + "0[Bb][01](?:'?[01])*" // Binary.
            + "|0[Xx][0-9A-Fa-f](?:'?[0-9A-Fa-f])*" // Hexadecimal.
            + "|0(?:'?[0-7])*" // Octal or just a lone zero.
            + "|[1-9](?:'?[0-9])*" // Decimal.
          + ")(?:" // Literal suffixes.
            + "[Uu](?:LL?|ll?)"
            + "|[Uu][Zz]?"
            + "|(?:LL?|ll?)[Uu]?"
            + "|[Zz][Uu]"
            + "|" // Literal suffix is optional.
          + ")"
          // Note: there are user-defined literal suffixes too, but perhaps having the custom suffix not part of the
          // literal highlight actually makes it stand out more.
        }
      ],
      relevance: 0
    };

    const PREPROCESSOR = {
      className: 'meta',
      begin: /#\s*[a-z]+\b/,
      end: /$/,
      keywords: { keyword:
          'if else elif endif define undef warning error line '
          + 'pragma _Pragma ifdef ifndef include' },
      contains: [
        {
          begin: /\\\n/,
          relevance: 0
        },
        hljs.inherit(STRINGS, { className: 'string' }),
        {
          className: 'string',
          begin: /<.*?>/
        },
        C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE
      ]
    };

    const TITLE_MODE = {
      className: 'title',
      begin: regex.optional(NAMESPACE_RE) + hljs.IDENT_RE,
      relevance: 0
    };

    const FUNCTION_TITLE = regex.optional(NAMESPACE_RE) + hljs.IDENT_RE + '\\s*\\(';

    // https://en.cppreference.com/w/cpp/keyword
    const RESERVED_KEYWORDS = [
      'alignas',
      'alignof',
      'and',
      'and_eq',
      'asm',
      'atomic_cancel',
      'atomic_commit',
      'atomic_noexcept',
      'auto',
      'bitand',
      'bitor',
      'break',
      'case',
      'catch',
      'class',
      'co_await',
      'co_return',
      'co_yield',
      'compl',
      'concept',
      'const_cast|10',
      'consteval',
      'constexpr',
      'constinit',
      'continue',
      'decltype',
      'default',
      'delete',
      'do',
      'dynamic_cast|10',
      'else',
      'enum',
      'explicit',
      'export',
      'extern',
      'false',
      'final',
      'for',
      'friend',
      'goto',
      'if',
      'import',
      'inline',
      'module',
      'mutable',
      'namespace',
      'new',
      'noexcept',
      'not',
      'not_eq',
      'nullptr',
      'operator',
      'or',
      'or_eq',
      'override',
      'private',
      'protected',
      'public',
      'reflexpr',
      'register',
      'reinterpret_cast|10',
      'requires',
      'return',
      'sizeof',
      'static_assert',
      'static_cast|10',
      'struct',
      'switch',
      'synchronized',
      'template',
      'this',
      'thread_local',
      'throw',
      'transaction_safe',
      'transaction_safe_dynamic',
      'true',
      'try',
      'typedef',
      'typeid',
      'typename',
      'union',
      'using',
      'virtual',
      'volatile',
      'while',
      'xor',
      'xor_eq'
    ];

    // https://en.cppreference.com/w/cpp/keyword
    const RESERVED_TYPES = [
      'bool',
      'char',
      'char16_t',
      'char32_t',
      'char8_t',
      'double',
      'float',
      'int',
      'long',
      'short',
      'void',
      'wchar_t',
      'unsigned',
      'signed',
      'const',
      'static'
    ];

    const TYPE_HINTS = [
      'any',
      'auto_ptr',
      'barrier',
      'binary_semaphore',
      'bitset',
      'complex',
      'condition_variable',
      'condition_variable_any',
      'counting_semaphore',
      'deque',
      'false_type',
      'future',
      'imaginary',
      'initializer_list',
      'istringstream',
      'jthread',
      'latch',
      'lock_guard',
      'multimap',
      'multiset',
      'mutex',
      'optional',
      'ostringstream',
      'packaged_task',
      'pair',
      'promise',
      'priority_queue',
      'queue',
      'recursive_mutex',
      'recursive_timed_mutex',
      'scoped_lock',
      'set',
      'shared_future',
      'shared_lock',
      'shared_mutex',
      'shared_timed_mutex',
      'shared_ptr',
      'stack',
      'string_view',
      'stringstream',
      'timed_mutex',
      'thread',
      'true_type',
      'tuple',
      'unique_lock',
      'unique_ptr',
      'unordered_map',
      'unordered_multimap',
      'unordered_multiset',
      'unordered_set',
      'variant',
      'vector',
      'weak_ptr',
      'wstring',
      'wstring_view'
    ];

    const FUNCTION_HINTS = [
      'abort',
      'abs',
      'acos',
      'apply',
      'as_const',
      'asin',
      'atan',
      'atan2',
      'calloc',
      'ceil',
      'cerr',
      'cin',
      'clog',
      'cos',
      'cosh',
      'cout',
      'declval',
      'endl',
      'exchange',
      'exit',
      'exp',
      'fabs',
      'floor',
      'fmod',
      'forward',
      'fprintf',
      'fputs',
      'free',
      'frexp',
      'fscanf',
      'future',
      'invoke',
      'isalnum',
      'isalpha',
      'iscntrl',
      'isdigit',
      'isgraph',
      'islower',
      'isprint',
      'ispunct',
      'isspace',
      'isupper',
      'isxdigit',
      'labs',
      'launder',
      'ldexp',
      'log',
      'log10',
      'make_pair',
      'make_shared',
      'make_shared_for_overwrite',
      'make_tuple',
      'make_unique',
      'malloc',
      'memchr',
      'memcmp',
      'memcpy',
      'memset',
      'modf',
      'move',
      'pow',
      'printf',
      'putchar',
      'puts',
      'realloc',
      'scanf',
      'sin',
      'sinh',
      'snprintf',
      'sprintf',
      'sqrt',
      'sscanf',
      'std',
      'stderr',
      'stdin',
      'stdout',
      'strcat',
      'strchr',
      'strcmp',
      'strcpy',
      'strcspn',
      'strlen',
      'strncat',
      'strncmp',
      'strncpy',
      'strpbrk',
      'strrchr',
      'strspn',
      'strstr',
      'swap',
      'tan',
      'tanh',
      'terminate',
      'to_underlying',
      'tolower',
      'toupper',
      'vfprintf',
      'visit',
      'vprintf',
      'vsprintf'
    ];

    const LITERALS = [
      'NULL',
      'false',
      'nullopt',
      'nullptr',
      'true'
    ];

    // https://en.cppreference.com/w/cpp/keyword
    const BUILT_IN = [ '_Pragma' ];

    const CPP_KEYWORDS = {
      type: RESERVED_TYPES,
      keyword: RESERVED_KEYWORDS,
      literal: LITERALS,
      built_in: BUILT_IN,
      _type_hints: TYPE_HINTS
    };

    const FUNCTION_DISPATCH = {
      className: 'function.dispatch',
      relevance: 0,
      keywords: {
        // Only for relevance, not highlighting.
        _hint: FUNCTION_HINTS },
      begin: regex.concat(
        /\b/,
        /(?!decltype)/,
        /(?!if)/,
        /(?!for)/,
        /(?!switch)/,
        /(?!while)/,
        hljs.IDENT_RE,
        regex.lookahead(/(<[^<>]+>|)\s*\(/))
    };

    const EXPRESSION_CONTAINS = [
      FUNCTION_DISPATCH,
      PREPROCESSOR,
      CPP_PRIMITIVE_TYPES,
      C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      NUMBERS,
      STRINGS
    ];

    const EXPRESSION_CONTEXT = {
      // This mode covers expression context where we can't expect a function
      // definition and shouldn't highlight anything that looks like one:
      // `return some()`, `else if()`, `(x*sum(1, 2))`
      variants: [
        {
          begin: /=/,
          end: /;/
        },
        {
          begin: /\(/,
          end: /\)/
        },
        {
          beginKeywords: 'new throw return else',
          end: /;/
        }
      ],
      keywords: CPP_KEYWORDS,
      contains: EXPRESSION_CONTAINS.concat([
        {
          begin: /\(/,
          end: /\)/,
          keywords: CPP_KEYWORDS,
          contains: EXPRESSION_CONTAINS.concat([ 'self' ]),
          relevance: 0
        }
      ]),
      relevance: 0
    };

    const FUNCTION_DECLARATION = {
      className: 'function',
      begin: '(' + FUNCTION_TYPE_RE + '[\\*&\\s]+)+' + FUNCTION_TITLE,
      returnBegin: true,
      end: /[{;=]/,
      excludeEnd: true,
      keywords: CPP_KEYWORDS,
      illegal: /[^\w\s\*&:<>.]/,
      contains: [
        { // to prevent it from being confused as the function title
          begin: DECLTYPE_AUTO_RE,
          keywords: CPP_KEYWORDS,
          relevance: 0
        },
        {
          begin: FUNCTION_TITLE,
          returnBegin: true,
          contains: [ TITLE_MODE ],
          relevance: 0
        },
        // needed because we do not have look-behind on the below rule
        // to prevent it from grabbing the final : in a :: pair
        {
          begin: /::/,
          relevance: 0
        },
        // initializers
        {
          begin: /:/,
          endsWithParent: true,
          contains: [
            STRINGS,
            NUMBERS
          ]
        },
        // allow for multiple declarations, e.g.:
        // extern void f(int), g(char);
        {
          relevance: 0,
          match: /,/
        },
        {
          className: 'params',
          begin: /\(/,
          end: /\)/,
          keywords: CPP_KEYWORDS,
          relevance: 0,
          contains: [
            C_LINE_COMMENT_MODE,
            hljs.C_BLOCK_COMMENT_MODE,
            STRINGS,
            NUMBERS,
            CPP_PRIMITIVE_TYPES,
            // Count matching parentheses.
            {
              begin: /\(/,
              end: /\)/,
              keywords: CPP_KEYWORDS,
              relevance: 0,
              contains: [
                'self',
                C_LINE_COMMENT_MODE,
                hljs.C_BLOCK_COMMENT_MODE,
                STRINGS,
                NUMBERS,
                CPP_PRIMITIVE_TYPES
              ]
            }
          ]
        },
        CPP_PRIMITIVE_TYPES,
        C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        PREPROCESSOR
      ]
    };

    return {
      name: 'C++',
      aliases: [
        'cc',
        'c++',
        'h++',
        'hpp',
        'hh',
        'hxx',
        'cxx'
      ],
      keywords: CPP_KEYWORDS,
      illegal: '</',
      classNameAliases: { 'function.dispatch': 'built_in' },
      contains: [].concat(
        EXPRESSION_CONTEXT,
        FUNCTION_DECLARATION,
        FUNCTION_DISPATCH,
        EXPRESSION_CONTAINS,
        [
          PREPROCESSOR,
          { // containers: ie, `vector <int> rooms (9);`
            begin: '\\b(deque|list|queue|priority_queue|pair|stack|vector|map|set|bitset|multiset|multimap|unordered_map|unordered_set|unordered_multiset|unordered_multimap|array|tuple|optional|variant|function)\\s*<(?!<)',
            end: '>',
            keywords: CPP_KEYWORDS,
            contains: [
              'self',
              CPP_PRIMITIVE_TYPES
            ]
          },
          {
            begin: hljs.IDENT_RE + '::',
            keywords: CPP_KEYWORDS
          },
          {
            match: [
              // extra complexity to deal with `enum class` and `enum struct`
              /\b(?:enum(?:\s+(?:class|struct))?|class|struct|union)/,
              /\s+/,
              /\w+/
            ],
            className: {
              1: 'keyword',
              3: 'title.class'
            }
          }
        ])
    };
  }

  /*
  Language: Arduino
  Author: Stefania Mellai <s.mellai@arduino.cc>
  Description: The Arduino® Language is a superset of C++. This rules are designed to highlight the Arduino® source code. For info about language see http://www.arduino.cc.
  Website: https://www.arduino.cc
  Category: system
  */


  /** @type LanguageFn */
  function arduino(hljs) {
    const ARDUINO_KW = {
      type: [
        "boolean",
        "byte",
        "word",
        "String"
      ],
      built_in: [
        "KeyboardController",
        "MouseController",
        "SoftwareSerial",
        "EthernetServer",
        "EthernetClient",
        "LiquidCrystal",
        "RobotControl",
        "GSMVoiceCall",
        "EthernetUDP",
        "EsploraTFT",
        "HttpClient",
        "RobotMotor",
        "WiFiClient",
        "GSMScanner",
        "FileSystem",
        "Scheduler",
        "GSMServer",
        "YunClient",
        "YunServer",
        "IPAddress",
        "GSMClient",
        "GSMModem",
        "Keyboard",
        "Ethernet",
        "Console",
        "GSMBand",
        "Esplora",
        "Stepper",
        "Process",
        "WiFiUDP",
        "GSM_SMS",
        "Mailbox",
        "USBHost",
        "Firmata",
        "PImage",
        "Client",
        "Server",
        "GSMPIN",
        "FileIO",
        "Bridge",
        "Serial",
        "EEPROM",
        "Stream",
        "Mouse",
        "Audio",
        "Servo",
        "File",
        "Task",
        "GPRS",
        "WiFi",
        "Wire",
        "TFT",
        "GSM",
        "SPI",
        "SD"
      ],
      _hints: [
        "setup",
        "loop",
        "runShellCommandAsynchronously",
        "analogWriteResolution",
        "retrieveCallingNumber",
        "printFirmwareVersion",
        "analogReadResolution",
        "sendDigitalPortPair",
        "noListenOnLocalhost",
        "readJoystickButton",
        "setFirmwareVersion",
        "readJoystickSwitch",
        "scrollDisplayRight",
        "getVoiceCallStatus",
        "scrollDisplayLeft",
        "writeMicroseconds",
        "delayMicroseconds",
        "beginTransmission",
        "getSignalStrength",
        "runAsynchronously",
        "getAsynchronously",
        "listenOnLocalhost",
        "getCurrentCarrier",
        "readAccelerometer",
        "messageAvailable",
        "sendDigitalPorts",
        "lineFollowConfig",
        "countryNameWrite",
        "runShellCommand",
        "readStringUntil",
        "rewindDirectory",
        "readTemperature",
        "setClockDivider",
        "readLightSensor",
        "endTransmission",
        "analogReference",
        "detachInterrupt",
        "countryNameRead",
        "attachInterrupt",
        "encryptionType",
        "readBytesUntil",
        "robotNameWrite",
        "readMicrophone",
        "robotNameRead",
        "cityNameWrite",
        "userNameWrite",
        "readJoystickY",
        "readJoystickX",
        "mouseReleased",
        "openNextFile",
        "scanNetworks",
        "noInterrupts",
        "digitalWrite",
        "beginSpeaker",
        "mousePressed",
        "isActionDone",
        "mouseDragged",
        "displayLogos",
        "noAutoscroll",
        "addParameter",
        "remoteNumber",
        "getModifiers",
        "keyboardRead",
        "userNameRead",
        "waitContinue",
        "processInput",
        "parseCommand",
        "printVersion",
        "readNetworks",
        "writeMessage",
        "blinkVersion",
        "cityNameRead",
        "readMessage",
        "setDataMode",
        "parsePacket",
        "isListening",
        "setBitOrder",
        "beginPacket",
        "isDirectory",
        "motorsWrite",
        "drawCompass",
        "digitalRead",
        "clearScreen",
        "serialEvent",
        "rightToLeft",
        "setTextSize",
        "leftToRight",
        "requestFrom",
        "keyReleased",
        "compassRead",
        "analogWrite",
        "interrupts",
        "WiFiServer",
        "disconnect",
        "playMelody",
        "parseFloat",
        "autoscroll",
        "getPINUsed",
        "setPINUsed",
        "setTimeout",
        "sendAnalog",
        "readSlider",
        "analogRead",
        "beginWrite",
        "createChar",
        "motorsStop",
        "keyPressed",
        "tempoWrite",
        "readButton",
        "subnetMask",
        "debugPrint",
        "macAddress",
        "writeGreen",
        "randomSeed",
        "attachGPRS",
        "readString",
        "sendString",
        "remotePort",
        "releaseAll",
        "mouseMoved",
        "background",
        "getXChange",
        "getYChange",
        "answerCall",
        "getResult",
        "voiceCall",
        "endPacket",
        "constrain",
        "getSocket",
        "writeJSON",
        "getButton",
        "available",
        "connected",
        "findUntil",
        "readBytes",
        "exitValue",
        "readGreen",
        "writeBlue",
        "startLoop",
        "IPAddress",
        "isPressed",
        "sendSysex",
        "pauseMode",
        "gatewayIP",
        "setCursor",
        "getOemKey",
        "tuneWrite",
        "noDisplay",
        "loadImage",
        "switchPIN",
        "onRequest",
        "onReceive",
        "changePIN",
        "playFile",
        "noBuffer",
        "parseInt",
        "overflow",
        "checkPIN",
        "knobRead",
        "beginTFT",
        "bitClear",
        "updateIR",
        "bitWrite",
        "position",
        "writeRGB",
        "highByte",
        "writeRed",
        "setSpeed",
        "readBlue",
        "noStroke",
        "remoteIP",
        "transfer",
        "shutdown",
        "hangCall",
        "beginSMS",
        "endWrite",
        "attached",
        "maintain",
        "noCursor",
        "checkReg",
        "checkPUK",
        "shiftOut",
        "isValid",
        "shiftIn",
        "pulseIn",
        "connect",
        "println",
        "localIP",
        "pinMode",
        "getIMEI",
        "display",
        "noBlink",
        "process",
        "getBand",
        "running",
        "beginSD",
        "drawBMP",
        "lowByte",
        "setBand",
        "release",
        "bitRead",
        "prepare",
        "pointTo",
        "readRed",
        "setMode",
        "noFill",
        "remove",
        "listen",
        "stroke",
        "detach",
        "attach",
        "noTone",
        "exists",
        "buffer",
        "height",
        "bitSet",
        "circle",
        "config",
        "cursor",
        "random",
        "IRread",
        "setDNS",
        "endSMS",
        "getKey",
        "micros",
        "millis",
        "begin",
        "print",
        "write",
        "ready",
        "flush",
        "width",
        "isPIN",
        "blink",
        "clear",
        "press",
        "mkdir",
        "rmdir",
        "close",
        "point",
        "yield",
        "image",
        "BSSID",
        "click",
        "delay",
        "read",
        "text",
        "move",
        "peek",
        "beep",
        "rect",
        "line",
        "open",
        "seek",
        "fill",
        "size",
        "turn",
        "stop",
        "home",
        "find",
        "step",
        "tone",
        "sqrt",
        "RSSI",
        "SSID",
        "end",
        "bit",
        "tan",
        "cos",
        "sin",
        "pow",
        "map",
        "abs",
        "max",
        "min",
        "get",
        "run",
        "put"
      ],
      literal: [
        "DIGITAL_MESSAGE",
        "FIRMATA_STRING",
        "ANALOG_MESSAGE",
        "REPORT_DIGITAL",
        "REPORT_ANALOG",
        "INPUT_PULLUP",
        "SET_PIN_MODE",
        "INTERNAL2V56",
        "SYSTEM_RESET",
        "LED_BUILTIN",
        "INTERNAL1V1",
        "SYSEX_START",
        "INTERNAL",
        "EXTERNAL",
        "DEFAULT",
        "OUTPUT",
        "INPUT",
        "HIGH",
        "LOW"
      ]
    };

    const ARDUINO = cPlusPlus(hljs);

    const kws = /** @type {Record<string,any>} */ (ARDUINO.keywords);

    kws.type = [
      ...kws.type,
      ...ARDUINO_KW.type
    ];
    kws.literal = [
      ...kws.literal,
      ...ARDUINO_KW.literal
    ];
    kws.built_in = [
      ...kws.built_in,
      ...ARDUINO_KW.built_in
    ];
    kws._hints = ARDUINO_KW._hints;

    ARDUINO.name = 'Arduino';
    ARDUINO.aliases = [ 'ino' ];
    ARDUINO.supersetOf = "cpp";

    return ARDUINO;
  }

  return arduino;

})();

    hljs.registerLanguage('arduino', hljsGrammar);
  })();/*! `awk` grammar compiled for Highlight.js 11.10.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Awk
  Author: Matthew Daly <matthewbdaly@gmail.com>
  Website: https://www.gnu.org/software/gawk/manual/gawk.html
  Description: language definition for Awk scripts
  Category: scripting
  */

  /** @type LanguageFn */
  function awk(hljs) {
    const VARIABLE = {
      className: 'variable',
      variants: [
        { begin: /\$[\w\d#@][\w\d_]*/ },
        { begin: /\$\{(.*?)\}/ }
      ]
    };
    const KEYWORDS = 'BEGIN END if else while do for in break continue delete next nextfile function func exit|10';
    const STRING = {
      className: 'string',
      contains: [ hljs.BACKSLASH_ESCAPE ],
      variants: [
        {
          begin: /(u|b)?r?'''/,
          end: /'''/,
          relevance: 10
        },
        {
          begin: /(u|b)?r?"""/,
          end: /"""/,
          relevance: 10
        },
        {
          begin: /(u|r|ur)'/,
          end: /'/,
          relevance: 10
        },
        {
          begin: /(u|r|ur)"/,
          end: /"/,
          relevance: 10
        },
        {
          begin: /(b|br)'/,
          end: /'/
        },
        {
          begin: /(b|br)"/,
          end: /"/
        },
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE
      ]
    };
    return {
      name: 'Awk',
      keywords: { keyword: KEYWORDS },
      contains: [
        VARIABLE,
        STRING,
        hljs.REGEXP_MODE,
        hljs.HASH_COMMENT_MODE,
        hljs.NUMBER_MODE
      ]
    };
  }

  return awk;

})();

    hljs.registerLanguage('awk', hljsGrammar);
  })();/*! `bash` grammar compiled for Highlight.js 11.10.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Bash
  Author: vah <vahtenberg@gmail.com>
  Contributrors: Benjamin Pannell <contact@sierrasoftworks.com>
  Website: https://www.gnu.org/software/bash/
  Category: common, scripting
  */

  /** @type LanguageFn */
  function bash(hljs) {
    const regex = hljs.regex;
    const VAR = {};
    const BRACED_VAR = {
      begin: /\$\{/,
      end: /\}/,
      contains: [
        "self",
        {
          begin: /:-/,
          contains: [ VAR ]
        } // default values
      ]
    };
    Object.assign(VAR, {
      className: 'variable',
      variants: [
        { begin: regex.concat(/\$[\w\d#@][\w\d_]*/,
          // negative look-ahead tries to avoid matching patterns that are not
          // Perl at all like $ident$, @ident@, etc.
          `(?![\\w\\d])(?![$])`) },
        BRACED_VAR
      ]
    });

    const SUBST = {
      className: 'subst',
      begin: /\$\(/,
      end: /\)/,
      contains: [ hljs.BACKSLASH_ESCAPE ]
    };
    const COMMENT = hljs.inherit(
      hljs.COMMENT(),
      {
        match: [
          /(^|\s)/,
          /#.*$/
        ],
        scope: {
          2: 'comment'
        }
      }
    );
    const HERE_DOC = {
      begin: /<<-?\s*(?=\w+)/,
      starts: { contains: [
        hljs.END_SAME_AS_BEGIN({
          begin: /(\w+)/,
          end: /(\w+)/,
          className: 'string'
        })
      ] }
    };
    const QUOTE_STRING = {
      className: 'string',
      begin: /"/,
      end: /"/,
      contains: [
        hljs.BACKSLASH_ESCAPE,
        VAR,
        SUBST
      ]
    };
    SUBST.contains.push(QUOTE_STRING);
    const ESCAPED_QUOTE = {
      match: /\\"/
    };
    const APOS_STRING = {
      className: 'string',
      begin: /'/,
      end: /'/
    };
    const ESCAPED_APOS = {
      match: /\\'/
    };
    const ARITHMETIC = {
      begin: /\$?\(\(/,
      end: /\)\)/,
      contains: [
        {
          begin: /\d+#[0-9a-f]+/,
          className: "number"
        },
        hljs.NUMBER_MODE,
        VAR
      ]
    };
    const SH_LIKE_SHELLS = [
      "fish",
      "bash",
      "zsh",
      "sh",
      "csh",
      "ksh",
      "tcsh",
      "dash",
      "scsh",
    ];
    const KNOWN_SHEBANG = hljs.SHEBANG({
      binary: `(${SH_LIKE_SHELLS.join("|")})`,
      relevance: 10
    });
    const FUNCTION = {
      className: 'function',
      begin: /\w[\w\d_]*\s*\(\s*\)\s*\{/,
      returnBegin: true,
      contains: [ hljs.inherit(hljs.TITLE_MODE, { begin: /\w[\w\d_]*/ }) ],
      relevance: 0
    };

    const KEYWORDS = [
      "if",
      "then",
      "else",
      "elif",
      "fi",
      "for",
      "while",
      "until",
      "in",
      "do",
      "done",
      "case",
      "esac",
      "function",
      "select"
    ];

    const LITERALS = [
      "true",
      "false"
    ];

    // to consume paths to prevent keyword matches inside them
    const PATH_MODE = { match: /(\/[a-z._-]+)+/ };

    // http://www.gnu.org/software/bash/manual/html_node/Shell-Builtin-Commands.html
    const SHELL_BUILT_INS = [
      "break",
      "cd",
      "continue",
      "eval",
      "exec",
      "exit",
      "export",
      "getopts",
      "hash",
      "pwd",
      "readonly",
      "return",
      "shift",
      "test",
      "times",
      "trap",
      "umask",
      "unset"
    ];

    const BASH_BUILT_INS = [
      "alias",
      "bind",
      "builtin",
      "caller",
      "command",
      "declare",
      "echo",
      "enable",
      "help",
      "let",
      "local",
      "logout",
      "mapfile",
      "printf",
      "read",
      "readarray",
      "source",
      "sudo",
      "type",
      "typeset",
      "ulimit",
      "unalias"
    ];

    const ZSH_BUILT_INS = [
      "autoload",
      "bg",
      "bindkey",
      "bye",
      "cap",
      "chdir",
      "clone",
      "comparguments",
      "compcall",
      "compctl",
      "compdescribe",
      "compfiles",
      "compgroups",
      "compquote",
      "comptags",
      "comptry",
      "compvalues",
      "dirs",
      "disable",
      "disown",
      "echotc",
      "echoti",
      "emulate",
      "fc",
      "fg",
      "float",
      "functions",
      "getcap",
      "getln",
      "history",
      "integer",
      "jobs",
      "kill",
      "limit",
      "log",
      "noglob",
      "popd",
      "print",
      "pushd",
      "pushln",
      "rehash",
      "sched",
      "setcap",
      "setopt",
      "stat",
      "suspend",
      "ttyctl",
      "unfunction",
      "unhash",
      "unlimit",
      "unsetopt",
      "vared",
      "wait",
      "whence",
      "where",
      "which",
      "zcompile",
      "zformat",
      "zftp",
      "zle",
      "zmodload",
      "zparseopts",
      "zprof",
      "zpty",
      "zregexparse",
      "zsocket",
      "zstyle",
      "ztcp"
    ];

    const GNU_CORE_UTILS = [
      "chcon",
      "chgrp",
      "chown",
      "chmod",
      "cp",
      "dd",
      "df",
      "dir",
      "dircolors",
      "ln",
      "ls",
      "mkdir",
      "mkfifo",
      "mknod",
      "mktemp",
      "mv",
      "realpath",
      "rm",
      "rmdir",
      "shred",
      "sync",
      "touch",
      "truncate",
      "vdir",
      "b2sum",
      "base32",
      "base64",
      "cat",
      "cksum",
      "comm",
      "csplit",
      "cut",
      "expand",
      "fmt",
      "fold",
      "head",
      "join",
      "md5sum",
      "nl",
      "numfmt",
      "od",
      "paste",
      "ptx",
      "pr",
      "sha1sum",
      "sha224sum",
      "sha256sum",
      "sha384sum",
      "sha512sum",
      "shuf",
      "sort",
      "split",
      "sum",
      "tac",
      "tail",
      "tr",
      "tsort",
      "unexpand",
      "uniq",
      "wc",
      "arch",
      "basename",
      "chroot",
      "date",
      "dirname",
      "du",
      "echo",
      "env",
      "expr",
      "factor",
      // "false", // keyword literal already
      "groups",
      "hostid",
      "id",
      "link",
      "logname",
      "nice",
      "nohup",
      "nproc",
      "pathchk",
      "pinky",
      "printenv",
      "printf",
      "pwd",
      "readlink",
      "runcon",
      "seq",
      "sleep",
      "stat",
      "stdbuf",
      "stty",
      "tee",
      "test",
      "timeout",
      // "true", // keyword literal already
      "tty",
      "uname",
      "unlink",
      "uptime",
      "users",
      "who",
      "whoami",
      "yes"
    ];

    return {
      name: 'Bash',
      aliases: [
        'sh',
        'zsh'
      ],
      keywords: {
        $pattern: /\b[a-z][a-z0-9._-]+\b/,
        keyword: KEYWORDS,
        literal: LITERALS,
        built_in: [
          ...SHELL_BUILT_INS,
          ...BASH_BUILT_INS,
          // Shell modifiers
          "set",
          "shopt",
          ...ZSH_BUILT_INS,
          ...GNU_CORE_UTILS
        ]
      },
      contains: [
        KNOWN_SHEBANG, // to catch known shells and boost relevancy
        hljs.SHEBANG(), // to catch unknown shells but still highlight the shebang
        FUNCTION,
        ARITHMETIC,
        COMMENT,
        HERE_DOC,
        PATH_MODE,
        QUOTE_STRING,
        ESCAPED_QUOTE,
        APOS_STRING,
        ESCAPED_APOS,
        VAR
      ]
    };
  }

  return bash;

})();

    hljs.registerLanguage('bash', hljsGrammar);
  })();/*! `c` grammar compiled for Highlight.js 11.10.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: C
  Category: common, system
  Website: https://en.wikipedia.org/wiki/C_(programming_language)
  */

  /** @type LanguageFn */
  function c(hljs) {
    const regex = hljs.regex;
    // added for historic reasons because `hljs.C_LINE_COMMENT_MODE` does
    // not include such support nor can we be sure all the grammars depending
    // on it would desire this behavior
    const C_LINE_COMMENT_MODE = hljs.COMMENT('//', '$', { contains: [ { begin: /\\\n/ } ] });
    const DECLTYPE_AUTO_RE = 'decltype\\(auto\\)';
    const NAMESPACE_RE = '[a-zA-Z_]\\w*::';
    const TEMPLATE_ARGUMENT_RE = '<[^<>]+>';
    const FUNCTION_TYPE_RE = '('
      + DECLTYPE_AUTO_RE + '|'
      + regex.optional(NAMESPACE_RE)
      + '[a-zA-Z_]\\w*' + regex.optional(TEMPLATE_ARGUMENT_RE)
    + ')';


    const TYPES = {
      className: 'type',
      variants: [
        { begin: '\\b[a-z\\d_]*_t\\b' },
        { match: /\batomic_[a-z]{3,6}\b/ }
      ]

    };

    // https://en.cppreference.com/w/cpp/language/escape
    // \\ \x \xFF \u2837 \u00323747 \374
    const CHARACTER_ESCAPES = '\\\\(x[0-9A-Fa-f]{2}|u[0-9A-Fa-f]{4,8}|[0-7]{3}|\\S)';
    const STRINGS = {
      className: 'string',
      variants: [
        {
          begin: '(u8?|U|L)?"',
          end: '"',
          illegal: '\\n',
          contains: [ hljs.BACKSLASH_ESCAPE ]
        },
        {
          begin: '(u8?|U|L)?\'(' + CHARACTER_ESCAPES + "|.)",
          end: '\'',
          illegal: '.'
        },
        hljs.END_SAME_AS_BEGIN({
          begin: /(?:u8?|U|L)?R"([^()\\ ]{0,16})\(/,
          end: /\)([^()\\ ]{0,16})"/
        })
      ]
    };

    const NUMBERS = {
      className: 'number',
      variants: [
        { begin: '\\b(0b[01\']+)' },
        { begin: '(-?)\\b([\\d\']+(\\.[\\d\']*)?|\\.[\\d\']+)((ll|LL|l|L)(u|U)?|(u|U)(ll|LL|l|L)?|f|F|b|B)' },
        { begin: '(-?)(\\b0[xX][a-fA-F0-9\']+|(\\b[\\d\']+(\\.[\\d\']*)?|\\.[\\d\']+)([eE][-+]?[\\d\']+)?)' }
      ],
      relevance: 0
    };

    const PREPROCESSOR = {
      className: 'meta',
      begin: /#\s*[a-z]+\b/,
      end: /$/,
      keywords: { keyword:
          'if else elif endif define undef warning error line '
          + 'pragma _Pragma ifdef ifndef elifdef elifndef include' },
      contains: [
        {
          begin: /\\\n/,
          relevance: 0
        },
        hljs.inherit(STRINGS, { className: 'string' }),
        {
          className: 'string',
          begin: /<.*?>/
        },
        C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE
      ]
    };

    const TITLE_MODE = {
      className: 'title',
      begin: regex.optional(NAMESPACE_RE) + hljs.IDENT_RE,
      relevance: 0
    };

    const FUNCTION_TITLE = regex.optional(NAMESPACE_RE) + hljs.IDENT_RE + '\\s*\\(';

    const C_KEYWORDS = [
      "asm",
      "auto",
      "break",
      "case",
      "continue",
      "default",
      "do",
      "else",
      "enum",
      "extern",
      "for",
      "fortran",
      "goto",
      "if",
      "inline",
      "register",
      "restrict",
      "return",
      "sizeof",
      "typeof",
      "typeof_unqual",
      "struct",
      "switch",
      "typedef",
      "union",
      "volatile",
      "while",
      "_Alignas",
      "_Alignof",
      "_Atomic",
      "_Generic",
      "_Noreturn",
      "_Static_assert",
      "_Thread_local",
      // aliases
      "alignas",
      "alignof",
      "noreturn",
      "static_assert",
      "thread_local",
      // not a C keyword but is, for all intents and purposes, treated exactly like one.
      "_Pragma"
    ];

    const C_TYPES = [
      "float",
      "double",
      "signed",
      "unsigned",
      "int",
      "short",
      "long",
      "char",
      "void",
      "_Bool",
      "_BitInt",
      "_Complex",
      "_Imaginary",
      "_Decimal32",
      "_Decimal64",
      "_Decimal96",
      "_Decimal128",
      "_Decimal64x",
      "_Decimal128x",
      "_Float16",
      "_Float32",
      "_Float64",
      "_Float128",
      "_Float32x",
      "_Float64x",
      "_Float128x",
      // modifiers
      "const",
      "static",
      "constexpr",
      // aliases
      "complex",
      "bool",
      "imaginary"
    ];

    const KEYWORDS = {
      keyword: C_KEYWORDS,
      type: C_TYPES,
      literal: 'true false NULL',
      // TODO: apply hinting work similar to what was done in cpp.js
      built_in: 'std string wstring cin cout cerr clog stdin stdout stderr stringstream istringstream ostringstream '
        + 'auto_ptr deque list queue stack vector map set pair bitset multiset multimap unordered_set '
        + 'unordered_map unordered_multiset unordered_multimap priority_queue make_pair array shared_ptr abort terminate abs acos '
        + 'asin atan2 atan calloc ceil cosh cos exit exp fabs floor fmod fprintf fputs free frexp '
        + 'fscanf future isalnum isalpha iscntrl isdigit isgraph islower isprint ispunct isspace isupper '
        + 'isxdigit tolower toupper labs ldexp log10 log malloc realloc memchr memcmp memcpy memset modf pow '
        + 'printf putchar puts scanf sinh sin snprintf sprintf sqrt sscanf strcat strchr strcmp '
        + 'strcpy strcspn strlen strncat strncmp strncpy strpbrk strrchr strspn strstr tanh tan '
        + 'vfprintf vprintf vsprintf endl initializer_list unique_ptr',
    };

    const EXPRESSION_CONTAINS = [
      PREPROCESSOR,
      TYPES,
      C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      NUMBERS,
      STRINGS
    ];

    const EXPRESSION_CONTEXT = {
      // This mode covers expression context where we can't expect a function
      // definition and shouldn't highlight anything that looks like one:
      // `return some()`, `else if()`, `(x*sum(1, 2))`
      variants: [
        {
          begin: /=/,
          end: /;/
        },
        {
          begin: /\(/,
          end: /\)/
        },
        {
          beginKeywords: 'new throw return else',
          end: /;/
        }
      ],
      keywords: KEYWORDS,
      contains: EXPRESSION_CONTAINS.concat([
        {
          begin: /\(/,
          end: /\)/,
          keywords: KEYWORDS,
          contains: EXPRESSION_CONTAINS.concat([ 'self' ]),
          relevance: 0
        }
      ]),
      relevance: 0
    };

    const FUNCTION_DECLARATION = {
      begin: '(' + FUNCTION_TYPE_RE + '[\\*&\\s]+)+' + FUNCTION_TITLE,
      returnBegin: true,
      end: /[{;=]/,
      excludeEnd: true,
      keywords: KEYWORDS,
      illegal: /[^\w\s\*&:<>.]/,
      contains: [
        { // to prevent it from being confused as the function title
          begin: DECLTYPE_AUTO_RE,
          keywords: KEYWORDS,
          relevance: 0
        },
        {
          begin: FUNCTION_TITLE,
          returnBegin: true,
          contains: [ hljs.inherit(TITLE_MODE, { className: "title.function" }) ],
          relevance: 0
        },
        // allow for multiple declarations, e.g.:
        // extern void f(int), g(char);
        {
          relevance: 0,
          match: /,/
        },
        {
          className: 'params',
          begin: /\(/,
          end: /\)/,
          keywords: KEYWORDS,
          relevance: 0,
          contains: [
            C_LINE_COMMENT_MODE,
            hljs.C_BLOCK_COMMENT_MODE,
            STRINGS,
            NUMBERS,
            TYPES,
            // Count matching parentheses.
            {
              begin: /\(/,
              end: /\)/,
              keywords: KEYWORDS,
              relevance: 0,
              contains: [
                'self',
                C_LINE_COMMENT_MODE,
                hljs.C_BLOCK_COMMENT_MODE,
                STRINGS,
                NUMBERS,
                TYPES
              ]
            }
          ]
        },
        TYPES,
        C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        PREPROCESSOR
      ]
    };

    return {
      name: "C",
      aliases: [ 'h' ],
      keywords: KEYWORDS,
      // Until differentiations are added between `c` and `cpp`, `c` will
      // not be auto-detected to avoid auto-detect conflicts between C and C++
      disableAutodetect: true,
      illegal: '</',
      contains: [].concat(
        EXPRESSION_CONTEXT,
        FUNCTION_DECLARATION,
        EXPRESSION_CONTAINS,
        [
          PREPROCESSOR,
          {
            begin: hljs.IDENT_RE + '::',
            keywords: KEYWORDS
          },
          {
            className: 'class',
            beginKeywords: 'enum class struct union',
            end: /[{;:<>=]/,
            contains: [
              { beginKeywords: "final class struct" },
              hljs.TITLE_MODE
            ]
          }
        ]),
      exports: {
        preprocessor: PREPROCESSOR,
        strings: STRINGS,
        keywords: KEYWORDS
      }
    };
  }

  return c;

})();

    hljs.registerLanguage('c', hljsGrammar);
  })();/*! `cal` grammar compiled for Highlight.js 11.10.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: C/AL
  Author: Kenneth Fuglsang Christensen <kfuglsang@gmail.com>
  Description: Provides highlighting of Microsoft Dynamics NAV C/AL code files
  Website: https://docs.microsoft.com/en-us/dynamics-nav/programming-in-c-al
  Category: enterprise
  */

  /** @type LanguageFn */
  function cal(hljs) {
    const regex = hljs.regex;
    const KEYWORDS = [
      "div",
      "mod",
      "in",
      "and",
      "or",
      "not",
      "xor",
      "asserterror",
      "begin",
      "case",
      "do",
      "downto",
      "else",
      "end",
      "exit",
      "for",
      "local",
      "if",
      "of",
      "repeat",
      "then",
      "to",
      "until",
      "while",
      "with",
      "var"
    ];
    const LITERALS = 'false true';
    const COMMENT_MODES = [
      hljs.C_LINE_COMMENT_MODE,
      hljs.COMMENT(
        /\{/,
        /\}/,
        { relevance: 0 }
      ),
      hljs.COMMENT(
        /\(\*/,
        /\*\)/,
        { relevance: 10 }
      )
    ];
    const STRING = {
      className: 'string',
      begin: /'/,
      end: /'/,
      contains: [ { begin: /''/ } ]
    };
    const CHAR_STRING = {
      className: 'string',
      begin: /(#\d+)+/
    };
    const DATE = {
      className: 'number',
      begin: '\\b\\d+(\\.\\d+)?(DT|D|T)',
      relevance: 0
    };
    const DBL_QUOTED_VARIABLE = {
      className: 'string', // not a string technically but makes sense to be highlighted in the same style
      begin: '"',
      end: '"'
    };

    const PROCEDURE = {
      match: [
        /procedure/,
        /\s+/,
        /[a-zA-Z_][\w@]*/,
        /\s*/
      ],
      scope: {
        1: "keyword",
        3: "title.function"
      },
      contains: [
        {
          className: 'params',
          begin: /\(/,
          end: /\)/,
          keywords: KEYWORDS,
          contains: [
            STRING,
            CHAR_STRING,
            hljs.NUMBER_MODE
          ]
        },
        ...COMMENT_MODES
      ]
    };

    const OBJECT_TYPES = [
      "Table",
      "Form",
      "Report",
      "Dataport",
      "Codeunit",
      "XMLport",
      "MenuSuite",
      "Page",
      "Query"
    ];
    const OBJECT = {
      match: [
        /OBJECT/,
        /\s+/,
        regex.either(...OBJECT_TYPES),
        /\s+/,
        /\d+/,
        /\s+(?=[^\s])/,
        /.*/,
        /$/
      ],
      relevance: 3,
      scope: {
        1: "keyword",
        3: "type",
        5: "number",
        7: "title"
      }
    };

    const PROPERTY = {
      match: /[\w]+(?=\=)/,
      scope: "attribute",
      relevance: 0
    };

    return {
      name: 'C/AL',
      case_insensitive: true,
      keywords: {
        keyword: KEYWORDS,
        literal: LITERALS
      },
      illegal: /\/\*/,
      contains: [
        PROPERTY,
        STRING,
        CHAR_STRING,
        DATE,
        DBL_QUOTED_VARIABLE,
        hljs.NUMBER_MODE,
        OBJECT,
        PROCEDURE
      ]
    };
  }

  return cal;

})();

    hljs.registerLanguage('cal', hljsGrammar);
  })();/*! `ceylon` grammar compiled for Highlight.js 11.10.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Ceylon
  Author: Lucas Werkmeister <mail@lucaswerkmeister.de>
  Website: https://ceylon-lang.org
  Category: system
  */

  /** @type LanguageFn */
  function ceylon(hljs) {
    // 2.3. Identifiers and keywords
    const KEYWORDS = [
      "assembly",
      "module",
      "package",
      "import",
      "alias",
      "class",
      "interface",
      "object",
      "given",
      "value",
      "assign",
      "void",
      "function",
      "new",
      "of",
      "extends",
      "satisfies",
      "abstracts",
      "in",
      "out",
      "return",
      "break",
      "continue",
      "throw",
      "assert",
      "dynamic",
      "if",
      "else",
      "switch",
      "case",
      "for",
      "while",
      "try",
      "catch",
      "finally",
      "then",
      "let",
      "this",
      "outer",
      "super",
      "is",
      "exists",
      "nonempty"
    ];
    // 7.4.1 Declaration Modifiers
    const DECLARATION_MODIFIERS = [
      "shared",
      "abstract",
      "formal",
      "default",
      "actual",
      "variable",
      "late",
      "native",
      "deprecated",
      "final",
      "sealed",
      "annotation",
      "suppressWarnings",
      "small"
    ];
    // 7.4.2 Documentation
    const DOCUMENTATION = [
      "doc",
      "by",
      "license",
      "see",
      "throws",
      "tagged"
    ];
    const SUBST = {
      className: 'subst',
      excludeBegin: true,
      excludeEnd: true,
      begin: /``/,
      end: /``/,
      keywords: KEYWORDS,
      relevance: 10
    };
    const EXPRESSIONS = [
      {
        // verbatim string
        className: 'string',
        begin: '"""',
        end: '"""',
        relevance: 10
      },
      {
        // string literal or template
        className: 'string',
        begin: '"',
        end: '"',
        contains: [ SUBST ]
      },
      {
        // character literal
        className: 'string',
        begin: "'",
        end: "'"
      },
      {
        // numeric literal
        className: 'number',
        begin: '#[0-9a-fA-F_]+|\\$[01_]+|[0-9_]+(?:\\.[0-9_](?:[eE][+-]?\\d+)?)?[kMGTPmunpf]?',
        relevance: 0
      }
    ];
    SUBST.contains = EXPRESSIONS;

    return {
      name: 'Ceylon',
      keywords: {
        keyword: KEYWORDS.concat(DECLARATION_MODIFIERS),
        meta: DOCUMENTATION
      },
      illegal: '\\$[^01]|#[^0-9a-fA-F]',
      contains: [
        hljs.C_LINE_COMMENT_MODE,
        hljs.COMMENT('/\\*', '\\*/', { contains: [ 'self' ] }),
        {
          // compiler annotation
          className: 'meta',
          begin: '@[a-z]\\w*(?::"[^"]*")?'
        }
      ].concat(EXPRESSIONS)
    };
  }

  return ceylon;

})();

    hljs.registerLanguage('ceylon', hljsGrammar);
  })();/*! `cmake` grammar compiled for Highlight.js 11.10.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: CMake
  Description: CMake is an open-source cross-platform system for build automation.
  Author: Igor Kalnitsky <igor@kalnitsky.org>
  Website: https://cmake.org
  Category: build-system
  */

  /** @type LanguageFn */
  function cmake(hljs) {
    return {
      name: 'CMake',
      aliases: [ 'cmake.in' ],
      case_insensitive: true,
      keywords: { keyword:
          // scripting commands
          'break cmake_host_system_information cmake_minimum_required cmake_parse_arguments '
          + 'cmake_policy configure_file continue elseif else endforeach endfunction endif endmacro '
          + 'endwhile execute_process file find_file find_library find_package find_path '
          + 'find_program foreach function get_cmake_property get_directory_property '
          + 'get_filename_component get_property if include include_guard list macro '
          + 'mark_as_advanced math message option return separate_arguments '
          + 'set_directory_properties set_property set site_name string unset variable_watch while '
          // project commands
          + 'add_compile_definitions add_compile_options add_custom_command add_custom_target '
          + 'add_definitions add_dependencies add_executable add_library add_link_options '
          + 'add_subdirectory add_test aux_source_directory build_command create_test_sourcelist '
          + 'define_property enable_language enable_testing export fltk_wrap_ui '
          + 'get_source_file_property get_target_property get_test_property include_directories '
          + 'include_external_msproject include_regular_expression install link_directories '
          + 'link_libraries load_cache project qt_wrap_cpp qt_wrap_ui remove_definitions '
          + 'set_source_files_properties set_target_properties set_tests_properties source_group '
          + 'target_compile_definitions target_compile_features target_compile_options '
          + 'target_include_directories target_link_directories target_link_libraries '
          + 'target_link_options target_sources try_compile try_run '
          // CTest commands
          + 'ctest_build ctest_configure ctest_coverage ctest_empty_binary_directory ctest_memcheck '
          + 'ctest_read_custom_files ctest_run_script ctest_sleep ctest_start ctest_submit '
          + 'ctest_test ctest_update ctest_upload '
          // deprecated commands
          + 'build_name exec_program export_library_dependencies install_files install_programs '
          + 'install_targets load_command make_directory output_required_files remove '
          + 'subdir_depends subdirs use_mangled_mesa utility_source variable_requires write_file '
          + 'qt5_use_modules qt5_use_package qt5_wrap_cpp '
          // core keywords
          + 'on off true false and or not command policy target test exists is_newer_than '
          + 'is_directory is_symlink is_absolute matches less greater equal less_equal '
          + 'greater_equal strless strgreater strequal strless_equal strgreater_equal version_less '
          + 'version_greater version_equal version_less_equal version_greater_equal in_list defined' },
      contains: [
        {
          className: 'variable',
          begin: /\$\{/,
          end: /\}/
        },
        hljs.COMMENT(/#\[\[/, /]]/),
        hljs.HASH_COMMENT_MODE,
        hljs.QUOTE_STRING_MODE,
        hljs.NUMBER_MODE
      ]
    };
  }

  return cmake;

})();

    hljs.registerLanguage('cmake', hljsGrammar);
  })();/*! `cpp` grammar compiled for Highlight.js 11.10.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: C++
  Category: common, system
  Website: https://isocpp.org
  */

  /** @type LanguageFn */
  function cpp(hljs) {
    const regex = hljs.regex;
    // added for historic reasons because `hljs.C_LINE_COMMENT_MODE` does
    // not include such support nor can we be sure all the grammars depending
    // on it would desire this behavior
    const C_LINE_COMMENT_MODE = hljs.COMMENT('//', '$', { contains: [ { begin: /\\\n/ } ] });
    const DECLTYPE_AUTO_RE = 'decltype\\(auto\\)';
    const NAMESPACE_RE = '[a-zA-Z_]\\w*::';
    const TEMPLATE_ARGUMENT_RE = '<[^<>]+>';
    const FUNCTION_TYPE_RE = '(?!struct)('
      + DECLTYPE_AUTO_RE + '|'
      + regex.optional(NAMESPACE_RE)
      + '[a-zA-Z_]\\w*' + regex.optional(TEMPLATE_ARGUMENT_RE)
    + ')';

    const CPP_PRIMITIVE_TYPES = {
      className: 'type',
      begin: '\\b[a-z\\d_]*_t\\b'
    };

    // https://en.cppreference.com/w/cpp/language/escape
    // \\ \x \xFF \u2837 \u00323747 \374
    const CHARACTER_ESCAPES = '\\\\(x[0-9A-Fa-f]{2}|u[0-9A-Fa-f]{4,8}|[0-7]{3}|\\S)';
    const STRINGS = {
      className: 'string',
      variants: [
        {
          begin: '(u8?|U|L)?"',
          end: '"',
          illegal: '\\n',
          contains: [ hljs.BACKSLASH_ESCAPE ]
        },
        {
          begin: '(u8?|U|L)?\'(' + CHARACTER_ESCAPES + '|.)',
          end: '\'',
          illegal: '.'
        },
        hljs.END_SAME_AS_BEGIN({
          begin: /(?:u8?|U|L)?R"([^()\\ ]{0,16})\(/,
          end: /\)([^()\\ ]{0,16})"/
        })
      ]
    };

    const NUMBERS = {
      className: 'number',
      variants: [
        // Floating-point literal.
        { begin:
          "[+-]?(?:" // Leading sign.
            // Decimal.
            + "(?:"
              +"[0-9](?:'?[0-9])*\\.(?:[0-9](?:'?[0-9])*)?"
              + "|\\.[0-9](?:'?[0-9])*"
            + ")(?:[Ee][+-]?[0-9](?:'?[0-9])*)?"
            + "|[0-9](?:'?[0-9])*[Ee][+-]?[0-9](?:'?[0-9])*"
            // Hexadecimal.
            + "|0[Xx](?:"
              +"[0-9A-Fa-f](?:'?[0-9A-Fa-f])*(?:\\.(?:[0-9A-Fa-f](?:'?[0-9A-Fa-f])*)?)?"
              + "|\\.[0-9A-Fa-f](?:'?[0-9A-Fa-f])*"
            + ")[Pp][+-]?[0-9](?:'?[0-9])*"
          + ")(?:" // Literal suffixes.
            + "[Ff](?:16|32|64|128)?"
            + "|(BF|bf)16"
            + "|[Ll]"
            + "|" // Literal suffix is optional.
          + ")"
        },
        // Integer literal.
        { begin:
          "[+-]?\\b(?:" // Leading sign.
            + "0[Bb][01](?:'?[01])*" // Binary.
            + "|0[Xx][0-9A-Fa-f](?:'?[0-9A-Fa-f])*" // Hexadecimal.
            + "|0(?:'?[0-7])*" // Octal or just a lone zero.
            + "|[1-9](?:'?[0-9])*" // Decimal.
          + ")(?:" // Literal suffixes.
            + "[Uu](?:LL?|ll?)"
            + "|[Uu][Zz]?"
            + "|(?:LL?|ll?)[Uu]?"
            + "|[Zz][Uu]"
            + "|" // Literal suffix is optional.
          + ")"
          // Note: there are user-defined literal suffixes too, but perhaps having the custom suffix not part of the
          // literal highlight actually makes it stand out more.
        }
      ],
      relevance: 0
    };

    const PREPROCESSOR = {
      className: 'meta',
      begin: /#\s*[a-z]+\b/,
      end: /$/,
      keywords: { keyword:
          'if else elif endif define undef warning error line '
          + 'pragma _Pragma ifdef ifndef include' },
      contains: [
        {
          begin: /\\\n/,
          relevance: 0
        },
        hljs.inherit(STRINGS, { className: 'string' }),
        {
          className: 'string',
          begin: /<.*?>/
        },
        C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE
      ]
    };

    const TITLE_MODE = {
      className: 'title',
      begin: regex.optional(NAMESPACE_RE) + hljs.IDENT_RE,
      relevance: 0
    };

    const FUNCTION_TITLE = regex.optional(NAMESPACE_RE) + hljs.IDENT_RE + '\\s*\\(';

    // https://en.cppreference.com/w/cpp/keyword
    const RESERVED_KEYWORDS = [
      'alignas',
      'alignof',
      'and',
      'and_eq',
      'asm',
      'atomic_cancel',
      'atomic_commit',
      'atomic_noexcept',
      'auto',
      'bitand',
      'bitor',
      'break',
      'case',
      'catch',
      'class',
      'co_await',
      'co_return',
      'co_yield',
      'compl',
      'concept',
      'const_cast|10',
      'consteval',
      'constexpr',
      'constinit',
      'continue',
      'decltype',
      'default',
      'delete',
      'do',
      'dynamic_cast|10',
      'else',
      'enum',
      'explicit',
      'export',
      'extern',
      'false',
      'final',
      'for',
      'friend',
      'goto',
      'if',
      'import',
      'inline',
      'module',
      'mutable',
      'namespace',
      'new',
      'noexcept',
      'not',
      'not_eq',
      'nullptr',
      'operator',
      'or',
      'or_eq',
      'override',
      'private',
      'protected',
      'public',
      'reflexpr',
      'register',
      'reinterpret_cast|10',
      'requires',
      'return',
      'sizeof',
      'static_assert',
      'static_cast|10',
      'struct',
      'switch',
      'synchronized',
      'template',
      'this',
      'thread_local',
      'throw',
      'transaction_safe',
      'transaction_safe_dynamic',
      'true',
      'try',
      'typedef',
      'typeid',
      'typename',
      'union',
      'using',
      'virtual',
      'volatile',
      'while',
      'xor',
      'xor_eq'
    ];

    // https://en.cppreference.com/w/cpp/keyword
    const RESERVED_TYPES = [
      'bool',
      'char',
      'char16_t',
      'char32_t',
      'char8_t',
      'double',
      'float',
      'int',
      'long',
      'short',
      'void',
      'wchar_t',
      'unsigned',
      'signed',
      'const',
      'static'
    ];

    const TYPE_HINTS = [
      'any',
      'auto_ptr',
      'barrier',
      'binary_semaphore',
      'bitset',
      'complex',
      'condition_variable',
      'condition_variable_any',
      'counting_semaphore',
      'deque',
      'false_type',
      'future',
      'imaginary',
      'initializer_list',
      'istringstream',
      'jthread',
      'latch',
      'lock_guard',
      'multimap',
      'multiset',
      'mutex',
      'optional',
      'ostringstream',
      'packaged_task',
      'pair',
      'promise',
      'priority_queue',
      'queue',
      'recursive_mutex',
      'recursive_timed_mutex',
      'scoped_lock',
      'set',
      'shared_future',
      'shared_lock',
      'shared_mutex',
      'shared_timed_mutex',
      'shared_ptr',
      'stack',
      'string_view',
      'stringstream',
      'timed_mutex',
      'thread',
      'true_type',
      'tuple',
      'unique_lock',
      'unique_ptr',
      'unordered_map',
      'unordered_multimap',
      'unordered_multiset',
      'unordered_set',
      'variant',
      'vector',
      'weak_ptr',
      'wstring',
      'wstring_view'
    ];

    const FUNCTION_HINTS = [
      'abort',
      'abs',
      'acos',
      'apply',
      'as_const',
      'asin',
      'atan',
      'atan2',
      'calloc',
      'ceil',
      'cerr',
      'cin',
      'clog',
      'cos',
      'cosh',
      'cout',
      'declval',
      'endl',
      'exchange',
      'exit',
      'exp',
      'fabs',
      'floor',
      'fmod',
      'forward',
      'fprintf',
      'fputs',
      'free',
      'frexp',
      'fscanf',
      'future',
      'invoke',
      'isalnum',
      'isalpha',
      'iscntrl',
      'isdigit',
      'isgraph',
      'islower',
      'isprint',
      'ispunct',
      'isspace',
      'isupper',
      'isxdigit',
      'labs',
      'launder',
      'ldexp',
      'log',
      'log10',
      'make_pair',
      'make_shared',
      'make_shared_for_overwrite',
      'make_tuple',
      'make_unique',
      'malloc',
      'memchr',
      'memcmp',
      'memcpy',
      'memset',
      'modf',
      'move',
      'pow',
      'printf',
      'putchar',
      'puts',
      'realloc',
      'scanf',
      'sin',
      'sinh',
      'snprintf',
      'sprintf',
      'sqrt',
      'sscanf',
      'std',
      'stderr',
      'stdin',
      'stdout',
      'strcat',
      'strchr',
      'strcmp',
      'strcpy',
      'strcspn',
      'strlen',
      'strncat',
      'strncmp',
      'strncpy',
      'strpbrk',
      'strrchr',
      'strspn',
      'strstr',
      'swap',
      'tan',
      'tanh',
      'terminate',
      'to_underlying',
      'tolower',
      'toupper',
      'vfprintf',
      'visit',
      'vprintf',
      'vsprintf'
    ];

    const LITERALS = [
      'NULL',
      'false',
      'nullopt',
      'nullptr',
      'true'
    ];

    // https://en.cppreference.com/w/cpp/keyword
    const BUILT_IN = [ '_Pragma' ];

    const CPP_KEYWORDS = {
      type: RESERVED_TYPES,
      keyword: RESERVED_KEYWORDS,
      literal: LITERALS,
      built_in: BUILT_IN,
      _type_hints: TYPE_HINTS
    };

    const FUNCTION_DISPATCH = {
      className: 'function.dispatch',
      relevance: 0,
      keywords: {
        // Only for relevance, not highlighting.
        _hint: FUNCTION_HINTS },
      begin: regex.concat(
        /\b/,
        /(?!decltype)/,
        /(?!if)/,
        /(?!for)/,
        /(?!switch)/,
        /(?!while)/,
        hljs.IDENT_RE,
        regex.lookahead(/(<[^<>]+>|)\s*\(/))
    };

    const EXPRESSION_CONTAINS = [
      FUNCTION_DISPATCH,
      PREPROCESSOR,
      CPP_PRIMITIVE_TYPES,
      C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      NUMBERS,
      STRINGS
    ];

    const EXPRESSION_CONTEXT = {
      // This mode covers expression context where we can't expect a function
      // definition and shouldn't highlight anything that looks like one:
      // `return some()`, `else if()`, `(x*sum(1, 2))`
      variants: [
        {
          begin: /=/,
          end: /;/
        },
        {
          begin: /\(/,
          end: /\)/
        },
        {
          beginKeywords: 'new throw return else',
          end: /;/
        }
      ],
      keywords: CPP_KEYWORDS,
      contains: EXPRESSION_CONTAINS.concat([
        {
          begin: /\(/,
          end: /\)/,
          keywords: CPP_KEYWORDS,
          contains: EXPRESSION_CONTAINS.concat([ 'self' ]),
          relevance: 0
        }
      ]),
      relevance: 0
    };

    const FUNCTION_DECLARATION = {
      className: 'function',
      begin: '(' + FUNCTION_TYPE_RE + '[\\*&\\s]+)+' + FUNCTION_TITLE,
      returnBegin: true,
      end: /[{;=]/,
      excludeEnd: true,
      keywords: CPP_KEYWORDS,
      illegal: /[^\w\s\*&:<>.]/,
      contains: [
        { // to prevent it from being confused as the function title
          begin: DECLTYPE_AUTO_RE,
          keywords: CPP_KEYWORDS,
          relevance: 0
        },
        {
          begin: FUNCTION_TITLE,
          returnBegin: true,
          contains: [ TITLE_MODE ],
          relevance: 0
        },
        // needed because we do not have look-behind on the below rule
        // to prevent it from grabbing the final : in a :: pair
        {
          begin: /::/,
          relevance: 0
        },
        // initializers
        {
          begin: /:/,
          endsWithParent: true,
          contains: [
            STRINGS,
            NUMBERS
          ]
        },
        // allow for multiple declarations, e.g.:
        // extern void f(int), g(char);
        {
          relevance: 0,
          match: /,/
        },
        {
          className: 'params',
          begin: /\(/,
          end: /\)/,
          keywords: CPP_KEYWORDS,
          relevance: 0,
          contains: [
            C_LINE_COMMENT_MODE,
            hljs.C_BLOCK_COMMENT_MODE,
            STRINGS,
            NUMBERS,
            CPP_PRIMITIVE_TYPES,
            // Count matching parentheses.
            {
              begin: /\(/,
              end: /\)/,
              keywords: CPP_KEYWORDS,
              relevance: 0,
              contains: [
                'self',
                C_LINE_COMMENT_MODE,
                hljs.C_BLOCK_COMMENT_MODE,
                STRINGS,
                NUMBERS,
                CPP_PRIMITIVE_TYPES
              ]
            }
          ]
        },
        CPP_PRIMITIVE_TYPES,
        C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        PREPROCESSOR
      ]
    };

    return {
      name: 'C++',
      aliases: [
        'cc',
        'c++',
        'h++',
        'hpp',
        'hh',
        'hxx',
        'cxx'
      ],
      keywords: CPP_KEYWORDS,
      illegal: '</',
      classNameAliases: { 'function.dispatch': 'built_in' },
      contains: [].concat(
        EXPRESSION_CONTEXT,
        FUNCTION_DECLARATION,
        FUNCTION_DISPATCH,
        EXPRESSION_CONTAINS,
        [
          PREPROCESSOR,
          { // containers: ie, `vector <int> rooms (9);`
            begin: '\\b(deque|list|queue|priority_queue|pair|stack|vector|map|set|bitset|multiset|multimap|unordered_map|unordered_set|unordered_multiset|unordered_multimap|array|tuple|optional|variant|function)\\s*<(?!<)',
            end: '>',
            keywords: CPP_KEYWORDS,
            contains: [
              'self',
              CPP_PRIMITIVE_TYPES
            ]
          },
          {
            begin: hljs.IDENT_RE + '::',
            keywords: CPP_KEYWORDS
          },
          {
            match: [
              // extra complexity to deal with `enum class` and `enum struct`
              /\b(?:enum(?:\s+(?:class|struct))?|class|struct|union)/,
              /\s+/,
              /\w+/
            ],
            className: {
              1: 'keyword',
              3: 'title.class'
            }
          }
        ])
    };
  }

  return cpp;

})();

    hljs.registerLanguage('cpp', hljsGrammar);
  })();/*! `csharp` grammar compiled for Highlight.js 11.10.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: C#
  Author: Jason Diamond <jason@diamond.name>
  Contributor: Nicolas LLOBERA <nllobera@gmail.com>, Pieter Vantorre <pietervantorre@gmail.com>, David Pine <david.pine@microsoft.com>
  Website: https://docs.microsoft.com/dotnet/csharp/
  Category: common
  */

  /** @type LanguageFn */
  function csharp(hljs) {
    const BUILT_IN_KEYWORDS = [
      'bool',
      'byte',
      'char',
      'decimal',
      'delegate',
      'double',
      'dynamic',
      'enum',
      'float',
      'int',
      'long',
      'nint',
      'nuint',
      'object',
      'sbyte',
      'short',
      'string',
      'ulong',
      'uint',
      'ushort'
    ];
    const FUNCTION_MODIFIERS = [
      'public',
      'private',
      'protected',
      'static',
      'internal',
      'protected',
      'abstract',
      'async',
      'extern',
      'override',
      'unsafe',
      'virtual',
      'new',
      'sealed',
      'partial'
    ];
    const LITERAL_KEYWORDS = [
      'default',
      'false',
      'null',
      'true'
    ];
    const NORMAL_KEYWORDS = [
      'abstract',
      'as',
      'base',
      'break',
      'case',
      'catch',
      'class',
      'const',
      'continue',
      'do',
      'else',
      'event',
      'explicit',
      'extern',
      'finally',
      'fixed',
      'for',
      'foreach',
      'goto',
      'if',
      'implicit',
      'in',
      'interface',
      'internal',
      'is',
      'lock',
      'namespace',
      'new',
      'operator',
      'out',
      'override',
      'params',
      'private',
      'protected',
      'public',
      'readonly',
      'record',
      'ref',
      'return',
      'scoped',
      'sealed',
      'sizeof',
      'stackalloc',
      'static',
      'struct',
      'switch',
      'this',
      'throw',
      'try',
      'typeof',
      'unchecked',
      'unsafe',
      'using',
      'virtual',
      'void',
      'volatile',
      'while'
    ];
    const CONTEXTUAL_KEYWORDS = [
      'add',
      'alias',
      'and',
      'ascending',
      'async',
      'await',
      'by',
      'descending',
      'equals',
      'from',
      'get',
      'global',
      'group',
      'init',
      'into',
      'join',
      'let',
      'nameof',
      'not',
      'notnull',
      'on',
      'or',
      'orderby',
      'partial',
      'remove',
      'select',
      'set',
      'unmanaged',
      'value|0',
      'var',
      'when',
      'where',
      'with',
      'yield'
    ];

    const KEYWORDS = {
      keyword: NORMAL_KEYWORDS.concat(CONTEXTUAL_KEYWORDS),
      built_in: BUILT_IN_KEYWORDS,
      literal: LITERAL_KEYWORDS
    };
    const TITLE_MODE = hljs.inherit(hljs.TITLE_MODE, { begin: '[a-zA-Z](\\.?\\w)*' });
    const NUMBERS = {
      className: 'number',
      variants: [
        { begin: '\\b(0b[01\']+)' },
        { begin: '(-?)\\b([\\d\']+(\\.[\\d\']*)?|\\.[\\d\']+)(u|U|l|L|ul|UL|f|F|b|B)' },
        { begin: '(-?)(\\b0[xX][a-fA-F0-9\']+|(\\b[\\d\']+(\\.[\\d\']*)?|\\.[\\d\']+)([eE][-+]?[\\d\']+)?)' }
      ],
      relevance: 0
    };
    const RAW_STRING = {
      className: 'string',
      begin: /"""("*)(?!")(.|\n)*?"""\1/,
      relevance: 1
    };
    const VERBATIM_STRING = {
      className: 'string',
      begin: '@"',
      end: '"',
      contains: [ { begin: '""' } ]
    };
    const VERBATIM_STRING_NO_LF = hljs.inherit(VERBATIM_STRING, { illegal: /\n/ });
    const SUBST = {
      className: 'subst',
      begin: /\{/,
      end: /\}/,
      keywords: KEYWORDS
    };
    const SUBST_NO_LF = hljs.inherit(SUBST, { illegal: /\n/ });
    const INTERPOLATED_STRING = {
      className: 'string',
      begin: /\$"/,
      end: '"',
      illegal: /\n/,
      contains: [
        { begin: /\{\{/ },
        { begin: /\}\}/ },
        hljs.BACKSLASH_ESCAPE,
        SUBST_NO_LF
      ]
    };
    const INTERPOLATED_VERBATIM_STRING = {
      className: 'string',
      begin: /\$@"/,
      end: '"',
      contains: [
        { begin: /\{\{/ },
        { begin: /\}\}/ },
        { begin: '""' },
        SUBST
      ]
    };
    const INTERPOLATED_VERBATIM_STRING_NO_LF = hljs.inherit(INTERPOLATED_VERBATIM_STRING, {
      illegal: /\n/,
      contains: [
        { begin: /\{\{/ },
        { begin: /\}\}/ },
        { begin: '""' },
        SUBST_NO_LF
      ]
    });
    SUBST.contains = [
      INTERPOLATED_VERBATIM_STRING,
      INTERPOLATED_STRING,
      VERBATIM_STRING,
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      NUMBERS,
      hljs.C_BLOCK_COMMENT_MODE
    ];
    SUBST_NO_LF.contains = [
      INTERPOLATED_VERBATIM_STRING_NO_LF,
      INTERPOLATED_STRING,
      VERBATIM_STRING_NO_LF,
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      NUMBERS,
      hljs.inherit(hljs.C_BLOCK_COMMENT_MODE, { illegal: /\n/ })
    ];
    const STRING = { variants: [
      RAW_STRING,
      INTERPOLATED_VERBATIM_STRING,
      INTERPOLATED_STRING,
      VERBATIM_STRING,
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE
    ] };

    const GENERIC_MODIFIER = {
      begin: "<",
      end: ">",
      contains: [
        { beginKeywords: "in out" },
        TITLE_MODE
      ]
    };
    const TYPE_IDENT_RE = hljs.IDENT_RE + '(<' + hljs.IDENT_RE + '(\\s*,\\s*' + hljs.IDENT_RE + ')*>)?(\\[\\])?';
    const AT_IDENTIFIER = {
      // prevents expressions like `@class` from incorrect flagging
      // `class` as a keyword
      begin: "@" + hljs.IDENT_RE,
      relevance: 0
    };

    return {
      name: 'C#',
      aliases: [
        'cs',
        'c#'
      ],
      keywords: KEYWORDS,
      illegal: /::/,
      contains: [
        hljs.COMMENT(
          '///',
          '$',
          {
            returnBegin: true,
            contains: [
              {
                className: 'doctag',
                variants: [
                  {
                    begin: '///',
                    relevance: 0
                  },
                  { begin: '<!--|-->' },
                  {
                    begin: '</?',
                    end: '>'
                  }
                ]
              }
            ]
          }
        ),
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        {
          className: 'meta',
          begin: '#',
          end: '$',
          keywords: { keyword: 'if else elif endif define undef warning error line region endregion pragma checksum' }
        },
        STRING,
        NUMBERS,
        {
          beginKeywords: 'class interface',
          relevance: 0,
          end: /[{;=]/,
          illegal: /[^\s:,]/,
          contains: [
            { beginKeywords: "where class" },
            TITLE_MODE,
            GENERIC_MODIFIER,
            hljs.C_LINE_COMMENT_MODE,
            hljs.C_BLOCK_COMMENT_MODE
          ]
        },
        {
          beginKeywords: 'namespace',
          relevance: 0,
          end: /[{;=]/,
          illegal: /[^\s:]/,
          contains: [
            TITLE_MODE,
            hljs.C_LINE_COMMENT_MODE,
            hljs.C_BLOCK_COMMENT_MODE
          ]
        },
        {
          beginKeywords: 'record',
          relevance: 0,
          end: /[{;=]/,
          illegal: /[^\s:]/,
          contains: [
            TITLE_MODE,
            GENERIC_MODIFIER,
            hljs.C_LINE_COMMENT_MODE,
            hljs.C_BLOCK_COMMENT_MODE
          ]
        },
        {
          // [Attributes("")]
          className: 'meta',
          begin: '^\\s*\\[(?=[\\w])',
          excludeBegin: true,
          end: '\\]',
          excludeEnd: true,
          contains: [
            {
              className: 'string',
              begin: /"/,
              end: /"/
            }
          ]
        },
        {
          // Expression keywords prevent 'keyword Name(...)' from being
          // recognized as a function definition
          beginKeywords: 'new return throw await else',
          relevance: 0
        },
        {
          className: 'function',
          begin: '(' + TYPE_IDENT_RE + '\\s+)+' + hljs.IDENT_RE + '\\s*(<[^=]+>\\s*)?\\(',
          returnBegin: true,
          end: /\s*[{;=]/,
          excludeEnd: true,
          keywords: KEYWORDS,
          contains: [
            // prevents these from being highlighted `title`
            {
              beginKeywords: FUNCTION_MODIFIERS.join(" "),
              relevance: 0
            },
            {
              begin: hljs.IDENT_RE + '\\s*(<[^=]+>\\s*)?\\(',
              returnBegin: true,
              contains: [
                hljs.TITLE_MODE,
                GENERIC_MODIFIER
              ],
              relevance: 0
            },
            { match: /\(\)/ },
            {
              className: 'params',
              begin: /\(/,
              end: /\)/,
              excludeBegin: true,
              excludeEnd: true,
              keywords: KEYWORDS,
              relevance: 0,
              contains: [
                STRING,
                NUMBERS,
                hljs.C_BLOCK_COMMENT_MODE
              ]
            },
            hljs.C_LINE_COMMENT_MODE,
            hljs.C_BLOCK_COMMENT_MODE
          ]
        },
        AT_IDENTIFIER
      ]
    };
  }

  return csharp;

})();

    hljs.registerLanguage('csharp', hljsGrammar);
  })();/*! `csp` grammar compiled for Highlight.js 11.10.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: CSP
  Description: Content Security Policy definition highlighting
  Author: Taras <oxdef@oxdef.info>
  Website: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
  Category: web

  vim: ts=2 sw=2 st=2
  */

  /** @type LanguageFn */
  function csp(hljs) {
    const KEYWORDS = [
      "base-uri",
      "child-src",
      "connect-src",
      "default-src",
      "font-src",
      "form-action",
      "frame-ancestors",
      "frame-src",
      "img-src",
      "manifest-src",
      "media-src",
      "object-src",
      "plugin-types",
      "report-uri",
      "sandbox",
      "script-src",
      "style-src",
      "trusted-types",
      "unsafe-hashes",
      "worker-src"
    ];
    return {
      name: 'CSP',
      case_insensitive: false,
      keywords: {
        $pattern: '[a-zA-Z][a-zA-Z0-9_-]*',
        keyword: KEYWORDS
      },
      contains: [
        {
          className: 'string',
          begin: "'",
          end: "'"
        },
        {
          className: 'attribute',
          begin: '^Content',
          end: ':',
          excludeEnd: true
        }
      ]
    };
  }

  return csp;

})();

    hljs.registerLanguage('csp', hljsGrammar);
  })();/*! `css` grammar compiled for Highlight.js 11.10.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  const MODES = (hljs) => {
    return {
      IMPORTANT: {
        scope: 'meta',
        begin: '!important'
      },
      BLOCK_COMMENT: hljs.C_BLOCK_COMMENT_MODE,
      HEXCOLOR: {
        scope: 'number',
        begin: /#(([0-9a-fA-F]{3,4})|(([0-9a-fA-F]{2}){3,4}))\b/
      },
      FUNCTION_DISPATCH: {
        className: "built_in",
        begin: /[\w-]+(?=\()/
      },
      ATTRIBUTE_SELECTOR_MODE: {
        scope: 'selector-attr',
        begin: /\[/,
        end: /\]/,
        illegal: '$',
        contains: [
          hljs.APOS_STRING_MODE,
          hljs.QUOTE_STRING_MODE
        ]
      },
      CSS_NUMBER_MODE: {
        scope: 'number',
        begin: hljs.NUMBER_RE + '(' +
          '%|em|ex|ch|rem' +
          '|vw|vh|vmin|vmax' +
          '|cm|mm|in|pt|pc|px' +
          '|deg|grad|rad|turn' +
          '|s|ms' +
          '|Hz|kHz' +
          '|dpi|dpcm|dppx' +
          ')?',
        relevance: 0
      },
      CSS_VARIABLE: {
        className: "attr",
        begin: /--[A-Za-z_][A-Za-z0-9_-]*/
      }
    };
  };

  const HTML_TAGS = [
    'a',
    'abbr',
    'address',
    'article',
    'aside',
    'audio',
    'b',
    'blockquote',
    'body',
    'button',
    'canvas',
    'caption',
    'cite',
    'code',
    'dd',
    'del',
    'details',
    'dfn',
    'div',
    'dl',
    'dt',
    'em',
    'fieldset',
    'figcaption',
    'figure',
    'footer',
    'form',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'header',
    'hgroup',
    'html',
    'i',
    'iframe',
    'img',
    'input',
    'ins',
    'kbd',
    'label',
    'legend',
    'li',
    'main',
    'mark',
    'menu',
    'nav',
    'object',
    'ol',
    'optgroup',
    'option',
    'p',
    'picture',
    'q',
    'quote',
    'samp',
    'section',
    'select',
    'source',
    'span',
    'strong',
    'summary',
    'sup',
    'table',
    'tbody',
    'td',
    'textarea',
    'tfoot',
    'th',
    'thead',
    'time',
    'tr',
    'ul',
    'var',
    'video'
  ];

  const SVG_TAGS = [
    'defs',
    'g',
    'marker',
    'mask',
    'pattern',
    'svg',
    'switch',
    'symbol',
    'feBlend',
    'feColorMatrix',
    'feComponentTransfer',
    'feComposite',
    'feConvolveMatrix',
    'feDiffuseLighting',
    'feDisplacementMap',
    'feFlood',
    'feGaussianBlur',
    'feImage',
    'feMerge',
    'feMorphology',
    'feOffset',
    'feSpecularLighting',
    'feTile',
    'feTurbulence',
    'linearGradient',
    'radialGradient',
    'stop',
    'circle',
    'ellipse',
    'image',
    'line',
    'path',
    'polygon',
    'polyline',
    'rect',
    'text',
    'use',
    'textPath',
    'tspan',
    'foreignObject',
    'clipPath'
  ];

  const TAGS = [
    ...HTML_TAGS,
    ...SVG_TAGS,
  ];

  // Sorting, then reversing makes sure longer attributes/elements like
  // `font-weight` are matched fully instead of getting false positives on say `font`

  const MEDIA_FEATURES = [
    'any-hover',
    'any-pointer',
    'aspect-ratio',
    'color',
    'color-gamut',
    'color-index',
    'device-aspect-ratio',
    'device-height',
    'device-width',
    'display-mode',
    'forced-colors',
    'grid',
    'height',
    'hover',
    'inverted-colors',
    'monochrome',
    'orientation',
    'overflow-block',
    'overflow-inline',
    'pointer',
    'prefers-color-scheme',
    'prefers-contrast',
    'prefers-reduced-motion',
    'prefers-reduced-transparency',
    'resolution',
    'scan',
    'scripting',
    'update',
    'width',
    // TODO: find a better solution?
    'min-width',
    'max-width',
    'min-height',
    'max-height'
  ].sort().reverse();

  // https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-classes
  const PSEUDO_CLASSES = [
    'active',
    'any-link',
    'blank',
    'checked',
    'current',
    'default',
    'defined',
    'dir', // dir()
    'disabled',
    'drop',
    'empty',
    'enabled',
    'first',
    'first-child',
    'first-of-type',
    'fullscreen',
    'future',
    'focus',
    'focus-visible',
    'focus-within',
    'has', // has()
    'host', // host or host()
    'host-context', // host-context()
    'hover',
    'indeterminate',
    'in-range',
    'invalid',
    'is', // is()
    'lang', // lang()
    'last-child',
    'last-of-type',
    'left',
    'link',
    'local-link',
    'not', // not()
    'nth-child', // nth-child()
    'nth-col', // nth-col()
    'nth-last-child', // nth-last-child()
    'nth-last-col', // nth-last-col()
    'nth-last-of-type', //nth-last-of-type()
    'nth-of-type', //nth-of-type()
    'only-child',
    'only-of-type',
    'optional',
    'out-of-range',
    'past',
    'placeholder-shown',
    'read-only',
    'read-write',
    'required',
    'right',
    'root',
    'scope',
    'target',
    'target-within',
    'user-invalid',
    'valid',
    'visited',
    'where' // where()
  ].sort().reverse();

  // https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-elements
  const PSEUDO_ELEMENTS = [
    'after',
    'backdrop',
    'before',
    'cue',
    'cue-region',
    'first-letter',
    'first-line',
    'grammar-error',
    'marker',
    'part',
    'placeholder',
    'selection',
    'slotted',
    'spelling-error'
  ].sort().reverse();

  const ATTRIBUTES = [
    'accent-color',
    'align-content',
    'align-items',
    'align-self',
    'alignment-baseline',
    'all',
    'animation',
    'animation-delay',
    'animation-direction',
    'animation-duration',
    'animation-fill-mode',
    'animation-iteration-count',
    'animation-name',
    'animation-play-state',
    'animation-timing-function',
    'appearance',
    'backface-visibility',
    'background',
    'background-attachment',
    'background-blend-mode',
    'background-clip',
    'background-color',
    'background-image',
    'background-origin',
    'background-position',
    'background-repeat',
    'background-size',
    'baseline-shift',
    'block-size',
    'border',
    'border-block',
    'border-block-color',
    'border-block-end',
    'border-block-end-color',
    'border-block-end-style',
    'border-block-end-width',
    'border-block-start',
    'border-block-start-color',
    'border-block-start-style',
    'border-block-start-width',
    'border-block-style',
    'border-block-width',
    'border-bottom',
    'border-bottom-color',
    'border-bottom-left-radius',
    'border-bottom-right-radius',
    'border-bottom-style',
    'border-bottom-width',
    'border-collapse',
    'border-color',
    'border-image',
    'border-image-outset',
    'border-image-repeat',
    'border-image-slice',
    'border-image-source',
    'border-image-width',
    'border-inline',
    'border-inline-color',
    'border-inline-end',
    'border-inline-end-color',
    'border-inline-end-style',
    'border-inline-end-width',
    'border-inline-start',
    'border-inline-start-color',
    'border-inline-start-style',
    'border-inline-start-width',
    'border-inline-style',
    'border-inline-width',
    'border-left',
    'border-left-color',
    'border-left-style',
    'border-left-width',
    'border-radius',
    'border-right',
    'border-end-end-radius',
    'border-end-start-radius',
    'border-right-color',
    'border-right-style',
    'border-right-width',
    'border-spacing',
    'border-start-end-radius',
    'border-start-start-radius',
    'border-style',
    'border-top',
    'border-top-color',
    'border-top-left-radius',
    'border-top-right-radius',
    'border-top-style',
    'border-top-width',
    'border-width',
    'bottom',
    'box-decoration-break',
    'box-shadow',
    'box-sizing',
    'break-after',
    'break-before',
    'break-inside',
    'cx',
    'cy',
    'caption-side',
    'caret-color',
    'clear',
    'clip',
    'clip-path',
    'clip-rule',
    'color',
    'color-interpolation',
    'color-interpolation-filters',
    'color-profile',
    'color-rendering',
    'color-scheme',
    'column-count',
    'column-fill',
    'column-gap',
    'column-rule',
    'column-rule-color',
    'column-rule-style',
    'column-rule-width',
    'column-span',
    'column-width',
    'columns',
    'contain',
    'content',
    'content-visibility',
    'counter-increment',
    'counter-reset',
    'cue',
    'cue-after',
    'cue-before',
    'cursor',
    'direction',
    'display',
    'dominant-baseline',
    'empty-cells',
    'enable-background',
    'fill',
    'fill-opacity',
    'fill-rule',
    'filter',
    'flex',
    'flex-basis',
    'flex-direction',
    'flex-flow',
    'flex-grow',
    'flex-shrink',
    'flex-wrap',
    'float',
    'flow',
    'flood-color',
    'flood-opacity',
    'font',
    'font-display',
    'font-family',
    'font-feature-settings',
    'font-kerning',
    'font-language-override',
    'font-size',
    'font-size-adjust',
    'font-smoothing',
    'font-stretch',
    'font-style',
    'font-synthesis',
    'font-variant',
    'font-variant-caps',
    'font-variant-east-asian',
    'font-variant-ligatures',
    'font-variant-numeric',
    'font-variant-position',
    'font-variation-settings',
    'font-weight',
    'gap',
    'glyph-orientation-horizontal',
    'glyph-orientation-vertical',
    'grid',
    'grid-area',
    'grid-auto-columns',
    'grid-auto-flow',
    'grid-auto-rows',
    'grid-column',
    'grid-column-end',
    'grid-column-start',
    'grid-gap',
    'grid-row',
    'grid-row-end',
    'grid-row-start',
    'grid-template',
    'grid-template-areas',
    'grid-template-columns',
    'grid-template-rows',
    'hanging-punctuation',
    'height',
    'hyphens',
    'icon',
    'image-orientation',
    'image-rendering',
    'image-resolution',
    'ime-mode',
    'inline-size',
    'inset',
    'inset-block',
    'inset-block-end',
    'inset-block-start',
    'inset-inline',
    'inset-inline-end',
    'inset-inline-start',
    'isolation',
    'kerning',
    'justify-content',
    'justify-items',
    'justify-self',
    'left',
    'letter-spacing',
    'lighting-color',
    'line-break',
    'line-height',
    'list-style',
    'list-style-image',
    'list-style-position',
    'list-style-type',
    'marker',
    'marker-end',
    'marker-mid',
    'marker-start',
    'mask',
    'margin',
    'margin-block',
    'margin-block-end',
    'margin-block-start',
    'margin-bottom',
    'margin-inline',
    'margin-inline-end',
    'margin-inline-start',
    'margin-left',
    'margin-right',
    'margin-top',
    'marks',
    'mask',
    'mask-border',
    'mask-border-mode',
    'mask-border-outset',
    'mask-border-repeat',
    'mask-border-slice',
    'mask-border-source',
    'mask-border-width',
    'mask-clip',
    'mask-composite',
    'mask-image',
    'mask-mode',
    'mask-origin',
    'mask-position',
    'mask-repeat',
    'mask-size',
    'mask-type',
    'max-block-size',
    'max-height',
    'max-inline-size',
    'max-width',
    'min-block-size',
    'min-height',
    'min-inline-size',
    'min-width',
    'mix-blend-mode',
    'nav-down',
    'nav-index',
    'nav-left',
    'nav-right',
    'nav-up',
    'none',
    'normal',
    'object-fit',
    'object-position',
    'opacity',
    'order',
    'orphans',
    'outline',
    'outline-color',
    'outline-offset',
    'outline-style',
    'outline-width',
    'overflow',
    'overflow-wrap',
    'overflow-x',
    'overflow-y',
    'padding',
    'padding-block',
    'padding-block-end',
    'padding-block-start',
    'padding-bottom',
    'padding-inline',
    'padding-inline-end',
    'padding-inline-start',
    'padding-left',
    'padding-right',
    'padding-top',
    'page-break-after',
    'page-break-before',
    'page-break-inside',
    'pause',
    'pause-after',
    'pause-before',
    'perspective',
    'perspective-origin',
    'pointer-events',
    'position',
    'quotes',
    'r',
    'resize',
    'rest',
    'rest-after',
    'rest-before',
    'right',
    'rotate',
    'row-gap',
    'scale',
    'scroll-margin',
    'scroll-margin-block',
    'scroll-margin-block-end',
    'scroll-margin-block-start',
    'scroll-margin-bottom',
    'scroll-margin-inline',
    'scroll-margin-inline-end',
    'scroll-margin-inline-start',
    'scroll-margin-left',
    'scroll-margin-right',
    'scroll-margin-top',
    'scroll-padding',
    'scroll-padding-block',
    'scroll-padding-block-end',
    'scroll-padding-block-start',
    'scroll-padding-bottom',
    'scroll-padding-inline',
    'scroll-padding-inline-end',
    'scroll-padding-inline-start',
    'scroll-padding-left',
    'scroll-padding-right',
    'scroll-padding-top',
    'scroll-snap-align',
    'scroll-snap-stop',
    'scroll-snap-type',
    'scrollbar-color',
    'scrollbar-gutter',
    'scrollbar-width',
    'shape-image-threshold',
    'shape-margin',
    'shape-outside',
    'shape-rendering',
    'stop-color',
    'stop-opacity',
    'stroke',
    'stroke-dasharray',
    'stroke-dashoffset',
    'stroke-linecap',
    'stroke-linejoin',
    'stroke-miterlimit',
    'stroke-opacity',
    'stroke-width',
    'speak',
    'speak-as',
    'src', // @font-face
    'tab-size',
    'table-layout',
    'text-anchor',
    'text-align',
    'text-align-all',
    'text-align-last',
    'text-combine-upright',
    'text-decoration',
    'text-decoration-color',
    'text-decoration-line',
    'text-decoration-skip-ink',
    'text-decoration-style',
    'text-decoration-thickness',
    'text-emphasis',
    'text-emphasis-color',
    'text-emphasis-position',
    'text-emphasis-style',
    'text-indent',
    'text-justify',
    'text-orientation',
    'text-overflow',
    'text-rendering',
    'text-shadow',
    'text-transform',
    'text-underline-offset',
    'text-underline-position',
    'top',
    'transform',
    'transform-box',
    'transform-origin',
    'transform-style',
    'transition',
    'transition-delay',
    'transition-duration',
    'transition-property',
    'transition-timing-function',
    'translate',
    'unicode-bidi',
    'vector-effect',
    'vertical-align',
    'visibility',
    'voice-balance',
    'voice-duration',
    'voice-family',
    'voice-pitch',
    'voice-range',
    'voice-rate',
    'voice-stress',
    'voice-volume',
    'white-space',
    'widows',
    'width',
    'will-change',
    'word-break',
    'word-spacing',
    'word-wrap',
    'writing-mode',
    'x',
    'y',
    'z-index'
  ].sort().reverse();

  /*
  Language: CSS
  Category: common, css, web
  Website: https://developer.mozilla.org/en-US/docs/Web/CSS
  */


  /** @type LanguageFn */
  function css(hljs) {
    const regex = hljs.regex;
    const modes = MODES(hljs);
    const VENDOR_PREFIX = { begin: /-(webkit|moz|ms|o)-(?=[a-z])/ };
    const AT_MODIFIERS = "and or not only";
    const AT_PROPERTY_RE = /@-?\w[\w]*(-\w+)*/; // @-webkit-keyframes
    const IDENT_RE = '[a-zA-Z-][a-zA-Z0-9_-]*';
    const STRINGS = [
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE
    ];

    return {
      name: 'CSS',
      case_insensitive: true,
      illegal: /[=|'\$]/,
      keywords: { keyframePosition: "from to" },
      classNameAliases: {
        // for visual continuity with `tag {}` and because we
        // don't have a great class for this?
        keyframePosition: "selector-tag" },
      contains: [
        modes.BLOCK_COMMENT,
        VENDOR_PREFIX,
        // to recognize keyframe 40% etc which are outside the scope of our
        // attribute value mode
        modes.CSS_NUMBER_MODE,
        {
          className: 'selector-id',
          begin: /#[A-Za-z0-9_-]+/,
          relevance: 0
        },
        {
          className: 'selector-class',
          begin: '\\.' + IDENT_RE,
          relevance: 0
        },
        modes.ATTRIBUTE_SELECTOR_MODE,
        {
          className: 'selector-pseudo',
          variants: [
            { begin: ':(' + PSEUDO_CLASSES.join('|') + ')' },
            { begin: ':(:)?(' + PSEUDO_ELEMENTS.join('|') + ')' }
          ]
        },
        // we may actually need this (12/2020)
        // { // pseudo-selector params
        //   begin: /\(/,
        //   end: /\)/,
        //   contains: [ hljs.CSS_NUMBER_MODE ]
        // },
        modes.CSS_VARIABLE,
        {
          className: 'attribute',
          begin: '\\b(' + ATTRIBUTES.join('|') + ')\\b'
        },
        // attribute values
        {
          begin: /:/,
          end: /[;}{]/,
          contains: [
            modes.BLOCK_COMMENT,
            modes.HEXCOLOR,
            modes.IMPORTANT,
            modes.CSS_NUMBER_MODE,
            ...STRINGS,
            // needed to highlight these as strings and to avoid issues with
            // illegal characters that might be inside urls that would tigger the
            // languages illegal stack
            {
              begin: /(url|data-uri)\(/,
              end: /\)/,
              relevance: 0, // from keywords
              keywords: { built_in: "url data-uri" },
              contains: [
                ...STRINGS,
                {
                  className: "string",
                  // any character other than `)` as in `url()` will be the start
                  // of a string, which ends with `)` (from the parent mode)
                  begin: /[^)]/,
                  endsWithParent: true,
                  excludeEnd: true
                }
              ]
            },
            modes.FUNCTION_DISPATCH
          ]
        },
        {
          begin: regex.lookahead(/@/),
          end: '[{;]',
          relevance: 0,
          illegal: /:/, // break on Less variables @var: ...
          contains: [
            {
              className: 'keyword',
              begin: AT_PROPERTY_RE
            },
            {
              begin: /\s/,
              endsWithParent: true,
              excludeEnd: true,
              relevance: 0,
              keywords: {
                $pattern: /[a-z-]+/,
                keyword: AT_MODIFIERS,
                attribute: MEDIA_FEATURES.join(" ")
              },
              contains: [
                {
                  begin: /[a-z-]+(?=:)/,
                  className: "attribute"
                },
                ...STRINGS,
                modes.CSS_NUMBER_MODE
              ]
            }
          ]
        },
        {
          className: 'selector-tag',
          begin: '\\b(' + TAGS.join('|') + ')\\b'
        }
      ]
    };
  }

  return css;

})();

    hljs.registerLanguage('css', hljsGrammar);
  })();/*! `dockerfile` grammar compiled for Highlight.js 11.10.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Dockerfile
  Requires: bash.js
  Author: Alexis Hénaut <alexis@henaut.net>
  Description: language definition for Dockerfile files
  Website: https://docs.docker.com/engine/reference/builder/
  Category: config
  */

  /** @type LanguageFn */
  function dockerfile(hljs) {
    const KEYWORDS = [
      "from",
      "maintainer",
      "expose",
      "env",
      "arg",
      "user",
      "onbuild",
      "stopsignal"
    ];
    return {
      name: 'Dockerfile',
      aliases: [ 'docker' ],
      case_insensitive: true,
      keywords: KEYWORDS,
      contains: [
        hljs.HASH_COMMENT_MODE,
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE,
        hljs.NUMBER_MODE,
        {
          beginKeywords: 'run cmd entrypoint volume add copy workdir label healthcheck shell',
          starts: {
            end: /[^\\]$/,
            subLanguage: 'bash'
          }
        }
      ],
      illegal: '</'
    };
  }

  return dockerfile;

})();

    hljs.registerLanguage('dockerfile', hljsGrammar);
  })();/*! `dos` grammar compiled for Highlight.js 11.10.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Batch file (DOS)
  Author: Alexander Makarov <sam@rmcreative.ru>
  Contributors: Anton Kochkov <anton.kochkov@gmail.com>
  Website: https://en.wikipedia.org/wiki/Batch_file
  Category: scripting
  */

  /** @type LanguageFn */
  function dos(hljs) {
    const COMMENT = hljs.COMMENT(
      /^\s*@?rem\b/, /$/,
      { relevance: 10 }
    );
    const LABEL = {
      className: 'symbol',
      begin: '^\\s*[A-Za-z._?][A-Za-z0-9_$#@~.?]*(:|\\s+label)',
      relevance: 0
    };
    const KEYWORDS = [
      "if",
      "else",
      "goto",
      "for",
      "in",
      "do",
      "call",
      "exit",
      "not",
      "exist",
      "errorlevel",
      "defined",
      "equ",
      "neq",
      "lss",
      "leq",
      "gtr",
      "geq"
    ];
    const BUILT_INS = [
      "prn",
      "nul",
      "lpt3",
      "lpt2",
      "lpt1",
      "con",
      "com4",
      "com3",
      "com2",
      "com1",
      "aux",
      "shift",
      "cd",
      "dir",
      "echo",
      "setlocal",
      "endlocal",
      "set",
      "pause",
      "copy",
      "append",
      "assoc",
      "at",
      "attrib",
      "break",
      "cacls",
      "cd",
      "chcp",
      "chdir",
      "chkdsk",
      "chkntfs",
      "cls",
      "cmd",
      "color",
      "comp",
      "compact",
      "convert",
      "date",
      "dir",
      "diskcomp",
      "diskcopy",
      "doskey",
      "erase",
      "fs",
      "find",
      "findstr",
      "format",
      "ftype",
      "graftabl",
      "help",
      "keyb",
      "label",
      "md",
      "mkdir",
      "mode",
      "more",
      "move",
      "path",
      "pause",
      "print",
      "popd",
      "pushd",
      "promt",
      "rd",
      "recover",
      "rem",
      "rename",
      "replace",
      "restore",
      "rmdir",
      "shift",
      "sort",
      "start",
      "subst",
      "time",
      "title",
      "tree",
      "type",
      "ver",
      "verify",
      "vol",
      // winutils
      "ping",
      "net",
      "ipconfig",
      "taskkill",
      "xcopy",
      "ren",
      "del"
    ];
    return {
      name: 'Batch file (DOS)',
      aliases: [
        'bat',
        'cmd'
      ],
      case_insensitive: true,
      illegal: /\/\*/,
      keywords: {
        keyword: KEYWORDS,
        built_in: BUILT_INS
      },
      contains: [
        {
          className: 'variable',
          begin: /%%[^ ]|%[^ ]+?%|![^ ]+?!/
        },
        {
          className: 'function',
          begin: LABEL.begin,
          end: 'goto:eof',
          contains: [
            hljs.inherit(hljs.TITLE_MODE, { begin: '([_a-zA-Z]\\w*\\.)*([_a-zA-Z]\\w*:)?[_a-zA-Z]\\w*' }),
            COMMENT
          ]
        },
        {
          className: 'number',
          begin: '\\b\\d+',
          relevance: 0
        },
        COMMENT
      ]
    };
  }

  return dos;

})();

    hljs.registerLanguage('dos', hljsGrammar);
  })();/*! `go` grammar compiled for Highlight.js 11.10.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Go
  Author: Stephan Kountso aka StepLg <steplg@gmail.com>
  Contributors: Evgeny Stepanischev <imbolk@gmail.com>
  Description: Google go language (golang). For info about language
  Website: http://golang.org/
  Category: common, system
  */

  function go(hljs) {
    const LITERALS = [
      "true",
      "false",
      "iota",
      "nil"
    ];
    const BUILT_INS = [
      "append",
      "cap",
      "close",
      "complex",
      "copy",
      "imag",
      "len",
      "make",
      "new",
      "panic",
      "print",
      "println",
      "real",
      "recover",
      "delete"
    ];
    const TYPES = [
      "bool",
      "byte",
      "complex64",
      "complex128",
      "error",
      "float32",
      "float64",
      "int8",
      "int16",
      "int32",
      "int64",
      "string",
      "uint8",
      "uint16",
      "uint32",
      "uint64",
      "int",
      "uint",
      "uintptr",
      "rune"
    ];
    const KWS = [
      "break",
      "case",
      "chan",
      "const",
      "continue",
      "default",
      "defer",
      "else",
      "fallthrough",
      "for",
      "func",
      "go",
      "goto",
      "if",
      "import",
      "interface",
      "map",
      "package",
      "range",
      "return",
      "select",
      "struct",
      "switch",
      "type",
      "var",
    ];
    const KEYWORDS = {
      keyword: KWS,
      type: TYPES,
      literal: LITERALS,
      built_in: BUILT_INS
    };
    return {
      name: 'Go',
      aliases: [ 'golang' ],
      keywords: KEYWORDS,
      illegal: '</',
      contains: [
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        {
          className: 'string',
          variants: [
            hljs.QUOTE_STRING_MODE,
            hljs.APOS_STRING_MODE,
            {
              begin: '`',
              end: '`'
            }
          ]
        },
        {
          className: 'number',
          variants: [
            {
              match: /-?\b0[xX]\.[a-fA-F0-9](_?[a-fA-F0-9])*[pP][+-]?\d(_?\d)*i?/, // hex without a present digit before . (making a digit afterwards required)
              relevance: 0
            },
            {
              match: /-?\b0[xX](_?[a-fA-F0-9])+((\.([a-fA-F0-9](_?[a-fA-F0-9])*)?)?[pP][+-]?\d(_?\d)*)?i?/, // hex with a present digit before . (making a digit afterwards optional)
              relevance: 0
            },
            {
              match: /-?\b0[oO](_?[0-7])*i?/, // leading 0o octal
              relevance: 0
            },
            {
              match: /-?\.\d(_?\d)*([eE][+-]?\d(_?\d)*)?i?/, // decimal without a present digit before . (making a digit afterwards required)
              relevance: 0
            },
            {
              match: /-?\b\d(_?\d)*(\.(\d(_?\d)*)?)?([eE][+-]?\d(_?\d)*)?i?/, // decimal with a present digit before . (making a digit afterwards optional)
              relevance: 0
            }
          ]
        },
        { begin: /:=/ // relevance booster
        },
        {
          className: 'function',
          beginKeywords: 'func',
          end: '\\s*(\\{|$)',
          excludeEnd: true,
          contains: [
            hljs.TITLE_MODE,
            {
              className: 'params',
              begin: /\(/,
              end: /\)/,
              endsParent: true,
              keywords: KEYWORDS,
              illegal: /["']/
            }
          ]
        }
      ]
    };
  }

  return go;

})();

    hljs.registerLanguage('go', hljsGrammar);
  })();/*! `http` grammar compiled for Highlight.js 11.10.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: HTTP
  Description: HTTP request and response headers with automatic body highlighting
  Author: Ivan Sagalaev <maniac@softwaremaniacs.org>
  Category: protocols, web
  Website: https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview
  */

  function http(hljs) {
    const regex = hljs.regex;
    const VERSION = 'HTTP/([32]|1\\.[01])';
    const HEADER_NAME = /[A-Za-z][A-Za-z0-9-]*/;
    const HEADER = {
      className: 'attribute',
      begin: regex.concat('^', HEADER_NAME, '(?=\\:\\s)'),
      starts: { contains: [
        {
          className: "punctuation",
          begin: /: /,
          relevance: 0,
          starts: {
            end: '$',
            relevance: 0
          }
        }
      ] }
    };
    const HEADERS_AND_BODY = [
      HEADER,
      {
        begin: '\\n\\n',
        starts: {
          subLanguage: [],
          endsWithParent: true
        }
      }
    ];

    return {
      name: 'HTTP',
      aliases: [ 'https' ],
      illegal: /\S/,
      contains: [
        // response
        {
          begin: '^(?=' + VERSION + " \\d{3})",
          end: /$/,
          contains: [
            {
              className: "meta",
              begin: VERSION
            },
            {
              className: 'number',
              begin: '\\b\\d{3}\\b'
            }
          ],
          starts: {
            end: /\b\B/,
            illegal: /\S/,
            contains: HEADERS_AND_BODY
          }
        },
        // request
        {
          begin: '(?=^[A-Z]+ (.*?) ' + VERSION + '$)',
          end: /$/,
          contains: [
            {
              className: 'string',
              begin: ' ',
              end: ' ',
              excludeBegin: true,
              excludeEnd: true
            },
            {
              className: "meta",
              begin: VERSION
            },
            {
              className: 'keyword',
              begin: '[A-Z]+'
            }
          ],
          starts: {
            end: /\b\B/,
            illegal: /\S/,
            contains: HEADERS_AND_BODY
          }
        },
        // to allow headers to work even without a preamble
        hljs.inherit(HEADER, { relevance: 0 })
      ]
    };
  }

  return http;

})();

    hljs.registerLanguage('http', hljsGrammar);
  })();/*! `ini` grammar compiled for Highlight.js 11.10.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: TOML, also INI
  Description: TOML aims to be a minimal configuration file format that's easy to read due to obvious semantics.
  Contributors: Guillaume Gomez <guillaume1.gomez@gmail.com>
  Category: common, config
  Website: https://github.com/toml-lang/toml
  */

  function ini(hljs) {
    const regex = hljs.regex;
    const NUMBERS = {
      className: 'number',
      relevance: 0,
      variants: [
        { begin: /([+-]+)?[\d]+_[\d_]+/ },
        { begin: hljs.NUMBER_RE }
      ]
    };
    const COMMENTS = hljs.COMMENT();
    COMMENTS.variants = [
      {
        begin: /;/,
        end: /$/
      },
      {
        begin: /#/,
        end: /$/
      }
    ];
    const VARIABLES = {
      className: 'variable',
      variants: [
        { begin: /\$[\w\d"][\w\d_]*/ },
        { begin: /\$\{(.*?)\}/ }
      ]
    };
    const LITERALS = {
      className: 'literal',
      begin: /\bon|off|true|false|yes|no\b/
    };
    const STRINGS = {
      className: "string",
      contains: [ hljs.BACKSLASH_ESCAPE ],
      variants: [
        {
          begin: "'''",
          end: "'''",
          relevance: 10
        },
        {
          begin: '"""',
          end: '"""',
          relevance: 10
        },
        {
          begin: '"',
          end: '"'
        },
        {
          begin: "'",
          end: "'"
        }
      ]
    };
    const ARRAY = {
      begin: /\[/,
      end: /\]/,
      contains: [
        COMMENTS,
        LITERALS,
        VARIABLES,
        STRINGS,
        NUMBERS,
        'self'
      ],
      relevance: 0
    };

    const BARE_KEY = /[A-Za-z0-9_-]+/;
    const QUOTED_KEY_DOUBLE_QUOTE = /"(\\"|[^"])*"/;
    const QUOTED_KEY_SINGLE_QUOTE = /'[^']*'/;
    const ANY_KEY = regex.either(
      BARE_KEY, QUOTED_KEY_DOUBLE_QUOTE, QUOTED_KEY_SINGLE_QUOTE
    );
    const DOTTED_KEY = regex.concat(
      ANY_KEY, '(\\s*\\.\\s*', ANY_KEY, ')*',
      regex.lookahead(/\s*=\s*[^#\s]/)
    );

    return {
      name: 'TOML, also INI',
      aliases: [ 'toml' ],
      case_insensitive: true,
      illegal: /\S/,
      contains: [
        COMMENTS,
        {
          className: 'section',
          begin: /\[+/,
          end: /\]+/
        },
        {
          begin: DOTTED_KEY,
          className: 'attr',
          starts: {
            end: /$/,
            contains: [
              COMMENTS,
              ARRAY,
              LITERALS,
              VARIABLES,
              STRINGS,
              NUMBERS
            ]
          }
        }
      ]
    };
  }

  return ini;

})();

    hljs.registerLanguage('ini', hljsGrammar);
  })();/*! `isbl` grammar compiled for Highlight.js 11.10.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: ISBL
  Author: Dmitriy Tarasov <dimatar@gmail.com>
  Description: built-in language DIRECTUM
  Category: enterprise
  */

  function isbl(hljs) {
    // Определение идентификаторов
    const UNDERSCORE_IDENT_RE = "[A-Za-zА-Яа-яёЁ_!][A-Za-zА-Яа-яёЁ_0-9]*";

    // Определение имен функций
    const FUNCTION_NAME_IDENT_RE = "[A-Za-zА-Яа-яёЁ_][A-Za-zА-Яа-яёЁ_0-9]*";

    // keyword : ключевые слова
    const KEYWORD =
      "and и else иначе endexcept endfinally endforeach конецвсе endif конецесли endwhile конецпока "
      + "except exitfor finally foreach все if если in в not не or или try while пока ";

    // SYSRES Constants
    const sysres_constants =
      "SYSRES_CONST_ACCES_RIGHT_TYPE_EDIT "
      + "SYSRES_CONST_ACCES_RIGHT_TYPE_FULL "
      + "SYSRES_CONST_ACCES_RIGHT_TYPE_VIEW "
      + "SYSRES_CONST_ACCESS_MODE_REQUISITE_CODE "
      + "SYSRES_CONST_ACCESS_NO_ACCESS_VIEW "
      + "SYSRES_CONST_ACCESS_NO_ACCESS_VIEW_CODE "
      + "SYSRES_CONST_ACCESS_RIGHTS_ADD_REQUISITE_CODE "
      + "SYSRES_CONST_ACCESS_RIGHTS_ADD_REQUISITE_YES_CODE "
      + "SYSRES_CONST_ACCESS_RIGHTS_CHANGE_REQUISITE_CODE "
      + "SYSRES_CONST_ACCESS_RIGHTS_CHANGE_REQUISITE_YES_CODE "
      + "SYSRES_CONST_ACCESS_RIGHTS_DELETE_REQUISITE_CODE "
      + "SYSRES_CONST_ACCESS_RIGHTS_DELETE_REQUISITE_YES_CODE "
      + "SYSRES_CONST_ACCESS_RIGHTS_EXECUTE_REQUISITE_CODE "
      + "SYSRES_CONST_ACCESS_RIGHTS_EXECUTE_REQUISITE_YES_CODE "
      + "SYSRES_CONST_ACCESS_RIGHTS_NO_ACCESS_REQUISITE_CODE "
      + "SYSRES_CONST_ACCESS_RIGHTS_NO_ACCESS_REQUISITE_YES_CODE "
      + "SYSRES_CONST_ACCESS_RIGHTS_RATIFY_REQUISITE_CODE "
      + "SYSRES_CONST_ACCESS_RIGHTS_RATIFY_REQUISITE_YES_CODE "
      + "SYSRES_CONST_ACCESS_RIGHTS_REQUISITE_CODE "
      + "SYSRES_CONST_ACCESS_RIGHTS_VIEW "
      + "SYSRES_CONST_ACCESS_RIGHTS_VIEW_CODE "
      + "SYSRES_CONST_ACCESS_RIGHTS_VIEW_REQUISITE_CODE "
      + "SYSRES_CONST_ACCESS_RIGHTS_VIEW_REQUISITE_YES_CODE "
      + "SYSRES_CONST_ACCESS_TYPE_CHANGE "
      + "SYSRES_CONST_ACCESS_TYPE_CHANGE_CODE "
      + "SYSRES_CONST_ACCESS_TYPE_EXISTS "
      + "SYSRES_CONST_ACCESS_TYPE_EXISTS_CODE "
      + "SYSRES_CONST_ACCESS_TYPE_FULL "
      + "SYSRES_CONST_ACCESS_TYPE_FULL_CODE "
      + "SYSRES_CONST_ACCESS_TYPE_VIEW "
      + "SYSRES_CONST_ACCESS_TYPE_VIEW_CODE "
      + "SYSRES_CONST_ACTION_TYPE_ABORT "
      + "SYSRES_CONST_ACTION_TYPE_ACCEPT "
      + "SYSRES_CONST_ACTION_TYPE_ACCESS_RIGHTS "
      + "SYSRES_CONST_ACTION_TYPE_ADD_ATTACHMENT "
      + "SYSRES_CONST_ACTION_TYPE_CHANGE_CARD "
      + "SYSRES_CONST_ACTION_TYPE_CHANGE_KIND "
      + "SYSRES_CONST_ACTION_TYPE_CHANGE_STORAGE "
      + "SYSRES_CONST_ACTION_TYPE_CONTINUE "
      + "SYSRES_CONST_ACTION_TYPE_COPY "
      + "SYSRES_CONST_ACTION_TYPE_CREATE "
      + "SYSRES_CONST_ACTION_TYPE_CREATE_VERSION "
      + "SYSRES_CONST_ACTION_TYPE_DELETE "
      + "SYSRES_CONST_ACTION_TYPE_DELETE_ATTACHMENT "
      + "SYSRES_CONST_ACTION_TYPE_DELETE_VERSION "
      + "SYSRES_CONST_ACTION_TYPE_DISABLE_DELEGATE_ACCESS_RIGHTS "
      + "SYSRES_CONST_ACTION_TYPE_ENABLE_DELEGATE_ACCESS_RIGHTS "
      + "SYSRES_CONST_ACTION_TYPE_ENCRYPTION_BY_CERTIFICATE "
      + "SYSRES_CONST_ACTION_TYPE_ENCRYPTION_BY_CERTIFICATE_AND_PASSWORD "
      + "SYSRES_CONST_ACTION_TYPE_ENCRYPTION_BY_PASSWORD "
      + "SYSRES_CONST_ACTION_TYPE_EXPORT_WITH_LOCK "
      + "SYSRES_CONST_ACTION_TYPE_EXPORT_WITHOUT_LOCK "
      + "SYSRES_CONST_ACTION_TYPE_IMPORT_WITH_UNLOCK "
      + "SYSRES_CONST_ACTION_TYPE_IMPORT_WITHOUT_UNLOCK "
      + "SYSRES_CONST_ACTION_TYPE_LIFE_CYCLE_STAGE "
      + "SYSRES_CONST_ACTION_TYPE_LOCK "
      + "SYSRES_CONST_ACTION_TYPE_LOCK_FOR_SERVER "
      + "SYSRES_CONST_ACTION_TYPE_LOCK_MODIFY "
      + "SYSRES_CONST_ACTION_TYPE_MARK_AS_READED "
      + "SYSRES_CONST_ACTION_TYPE_MARK_AS_UNREADED "
      + "SYSRES_CONST_ACTION_TYPE_MODIFY "
      + "SYSRES_CONST_ACTION_TYPE_MODIFY_CARD "
      + "SYSRES_CONST_ACTION_TYPE_MOVE_TO_ARCHIVE "
      + "SYSRES_CONST_ACTION_TYPE_OFF_ENCRYPTION "
      + "SYSRES_CONST_ACTION_TYPE_PASSWORD_CHANGE "
      + "SYSRES_CONST_ACTION_TYPE_PERFORM "
      + "SYSRES_CONST_ACTION_TYPE_RECOVER_FROM_LOCAL_COPY "
      + "SYSRES_CONST_ACTION_TYPE_RESTART "
      + "SYSRES_CONST_ACTION_TYPE_RESTORE_FROM_ARCHIVE "
      + "SYSRES_CONST_ACTION_TYPE_REVISION "
      + "SYSRES_CONST_ACTION_TYPE_SEND_BY_MAIL "
      + "SYSRES_CONST_ACTION_TYPE_SIGN "
      + "SYSRES_CONST_ACTION_TYPE_START "
      + "SYSRES_CONST_ACTION_TYPE_UNLOCK "
      + "SYSRES_CONST_ACTION_TYPE_UNLOCK_FROM_SERVER "
      + "SYSRES_CONST_ACTION_TYPE_VERSION_STATE "
      + "SYSRES_CONST_ACTION_TYPE_VERSION_VISIBILITY "
      + "SYSRES_CONST_ACTION_TYPE_VIEW "
      + "SYSRES_CONST_ACTION_TYPE_VIEW_SHADOW_COPY "
      + "SYSRES_CONST_ACTION_TYPE_WORKFLOW_DESCRIPTION_MODIFY "
      + "SYSRES_CONST_ACTION_TYPE_WRITE_HISTORY "
      + "SYSRES_CONST_ACTIVE_VERSION_STATE_PICK_VALUE "
      + "SYSRES_CONST_ADD_REFERENCE_MODE_NAME "
      + "SYSRES_CONST_ADDITION_REQUISITE_CODE "
      + "SYSRES_CONST_ADDITIONAL_PARAMS_REQUISITE_CODE "
      + "SYSRES_CONST_ADITIONAL_JOB_END_DATE_REQUISITE_NAME "
      + "SYSRES_CONST_ADITIONAL_JOB_READ_REQUISITE_NAME "
      + "SYSRES_CONST_ADITIONAL_JOB_START_DATE_REQUISITE_NAME "
      + "SYSRES_CONST_ADITIONAL_JOB_STATE_REQUISITE_NAME "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_ADDING_USER_TO_GROUP_ACTION "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_ADDING_USER_TO_GROUP_ACTION_CODE "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_CREATION_COMP_ACTION "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_CREATION_COMP_ACTION_CODE "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_CREATION_GROUP_ACTION "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_CREATION_GROUP_ACTION_CODE "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_CREATION_USER_ACTION "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_CREATION_USER_ACTION_CODE "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_DATABASE_USER_CREATION "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_DATABASE_USER_CREATION_ACTION "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_DATABASE_USER_DELETION "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_DATABASE_USER_DELETION_ACTION "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_DELETION_COMP_ACTION "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_DELETION_COMP_ACTION_CODE "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_DELETION_GROUP_ACTION "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_DELETION_GROUP_ACTION_CODE "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_DELETION_USER_ACTION "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_DELETION_USER_ACTION_CODE "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_DELETION_USER_FROM_GROUP_ACTION "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_DELETION_USER_FROM_GROUP_ACTION_CODE "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_GRANTING_FILTERER_ACTION "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_GRANTING_FILTERER_ACTION_CODE "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_GRANTING_FILTERER_RESTRICTION_ACTION "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_GRANTING_FILTERER_RESTRICTION_ACTION_CODE "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_GRANTING_PRIVILEGE_ACTION "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_GRANTING_PRIVILEGE_ACTION_CODE "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_GRANTING_RIGHTS_ACTION "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_GRANTING_RIGHTS_ACTION_CODE "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_IS_MAIN_SERVER_CHANGED_ACTION "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_IS_MAIN_SERVER_CHANGED_ACTION_CODE "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_IS_PUBLIC_CHANGED_ACTION "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_IS_PUBLIC_CHANGED_ACTION_CODE "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_REMOVING_FILTERER_ACTION "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_REMOVING_FILTERER_ACTION_CODE "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_REMOVING_FILTERER_RESTRICTION_ACTION "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_REMOVING_FILTERER_RESTRICTION_ACTION_CODE "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_REMOVING_PRIVILEGE_ACTION "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_REMOVING_PRIVILEGE_ACTION_CODE "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_REMOVING_RIGHTS_ACTION "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_REMOVING_RIGHTS_ACTION_CODE "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_SERVER_LOGIN_CREATION "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_SERVER_LOGIN_CREATION_ACTION "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_SERVER_LOGIN_DELETION "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_SERVER_LOGIN_DELETION_ACTION "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_UPDATING_CATEGORY_ACTION "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_UPDATING_CATEGORY_ACTION_CODE "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_UPDATING_COMP_TITLE_ACTION "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_UPDATING_COMP_TITLE_ACTION_CODE "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_UPDATING_FULL_NAME_ACTION "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_UPDATING_FULL_NAME_ACTION_CODE "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_UPDATING_GROUP_ACTION "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_UPDATING_GROUP_ACTION_CODE "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_UPDATING_PARENT_GROUP_ACTION "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_UPDATING_PARENT_GROUP_ACTION_CODE "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_UPDATING_USER_AUTH_TYPE_ACTION "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_UPDATING_USER_AUTH_TYPE_ACTION_CODE "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_UPDATING_USER_LOGIN_ACTION "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_UPDATING_USER_LOGIN_ACTION_CODE "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_UPDATING_USER_STATUS_ACTION "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_UPDATING_USER_STATUS_ACTION_CODE "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_USER_PASSWORD_CHANGE "
      + "SYSRES_CONST_ADMINISTRATION_HISTORY_USER_PASSWORD_CHANGE_ACTION "
      + "SYSRES_CONST_ALL_ACCEPT_CONDITION_RUS "
      + "SYSRES_CONST_ALL_USERS_GROUP "
      + "SYSRES_CONST_ALL_USERS_GROUP_NAME "
      + "SYSRES_CONST_ALL_USERS_SERVER_GROUP_NAME "
      + "SYSRES_CONST_ALLOWED_ACCESS_TYPE_CODE "
      + "SYSRES_CONST_ALLOWED_ACCESS_TYPE_NAME "
      + "SYSRES_CONST_APP_VIEWER_TYPE_REQUISITE_CODE "
      + "SYSRES_CONST_APPROVING_SIGNATURE_NAME "
      + "SYSRES_CONST_APPROVING_SIGNATURE_REQUISITE_CODE "
      + "SYSRES_CONST_ASSISTANT_SUBSTITUE_TYPE "
      + "SYSRES_CONST_ASSISTANT_SUBSTITUE_TYPE_CODE "
      + "SYSRES_CONST_ATTACH_TYPE_COMPONENT_TOKEN "
      + "SYSRES_CONST_ATTACH_TYPE_DOC "
      + "SYSRES_CONST_ATTACH_TYPE_EDOC "
      + "SYSRES_CONST_ATTACH_TYPE_FOLDER "
      + "SYSRES_CONST_ATTACH_TYPE_JOB "
      + "SYSRES_CONST_ATTACH_TYPE_REFERENCE "
      + "SYSRES_CONST_ATTACH_TYPE_TASK "
      + "SYSRES_CONST_AUTH_ENCODED_PASSWORD "
      + "SYSRES_CONST_AUTH_ENCODED_PASSWORD_CODE "
      + "SYSRES_CONST_AUTH_NOVELL "
      + "SYSRES_CONST_AUTH_PASSWORD "
      + "SYSRES_CONST_AUTH_PASSWORD_CODE "
      + "SYSRES_CONST_AUTH_WINDOWS "
      + "SYSRES_CONST_AUTHENTICATING_SIGNATURE_NAME "
      + "SYSRES_CONST_AUTHENTICATING_SIGNATURE_REQUISITE_CODE "
      + "SYSRES_CONST_AUTO_ENUM_METHOD_FLAG "
      + "SYSRES_CONST_AUTO_NUMERATION_CODE "
      + "SYSRES_CONST_AUTO_STRONG_ENUM_METHOD_FLAG "
      + "SYSRES_CONST_AUTOTEXT_NAME_REQUISITE_CODE "
      + "SYSRES_CONST_AUTOTEXT_TEXT_REQUISITE_CODE "
      + "SYSRES_CONST_AUTOTEXT_USAGE_ALL "
      + "SYSRES_CONST_AUTOTEXT_USAGE_ALL_CODE "
      + "SYSRES_CONST_AUTOTEXT_USAGE_SIGN "
      + "SYSRES_CONST_AUTOTEXT_USAGE_SIGN_CODE "
      + "SYSRES_CONST_AUTOTEXT_USAGE_WORK "
      + "SYSRES_CONST_AUTOTEXT_USAGE_WORK_CODE "
      + "SYSRES_CONST_AUTOTEXT_USE_ANYWHERE_CODE "
      + "SYSRES_CONST_AUTOTEXT_USE_ON_SIGNING_CODE "
      + "SYSRES_CONST_AUTOTEXT_USE_ON_WORK_CODE "
      + "SYSRES_CONST_BEGIN_DATE_REQUISITE_CODE "
      + "SYSRES_CONST_BLACK_LIFE_CYCLE_STAGE_FONT_COLOR "
      + "SYSRES_CONST_BLUE_LIFE_CYCLE_STAGE_FONT_COLOR "
      + "SYSRES_CONST_BTN_PART "
      + "SYSRES_CONST_CALCULATED_ROLE_TYPE_CODE "
      + "SYSRES_CONST_CALL_TYPE_VARIABLE_BUTTON_VALUE "
      + "SYSRES_CONST_CALL_TYPE_VARIABLE_PROGRAM_VALUE "
      + "SYSRES_CONST_CANCEL_MESSAGE_FUNCTION_RESULT "
      + "SYSRES_CONST_CARD_PART "
      + "SYSRES_CONST_CARD_REFERENCE_MODE_NAME "
      + "SYSRES_CONST_CERTIFICATE_TYPE_REQUISITE_ENCRYPT_VALUE "
      + "SYSRES_CONST_CERTIFICATE_TYPE_REQUISITE_SIGN_AND_ENCRYPT_VALUE "
      + "SYSRES_CONST_CERTIFICATE_TYPE_REQUISITE_SIGN_VALUE "
      + "SYSRES_CONST_CHECK_PARAM_VALUE_DATE_PARAM_TYPE "
      + "SYSRES_CONST_CHECK_PARAM_VALUE_FLOAT_PARAM_TYPE "
      + "SYSRES_CONST_CHECK_PARAM_VALUE_INTEGER_PARAM_TYPE "
      + "SYSRES_CONST_CHECK_PARAM_VALUE_PICK_PARAM_TYPE "
      + "SYSRES_CONST_CHECK_PARAM_VALUE_REEFRENCE_PARAM_TYPE "
      + "SYSRES_CONST_CLOSED_RECORD_FLAG_VALUE_FEMININE "
      + "SYSRES_CONST_CLOSED_RECORD_FLAG_VALUE_MASCULINE "
      + "SYSRES_CONST_CODE_COMPONENT_TYPE_ADMIN "
      + "SYSRES_CONST_CODE_COMPONENT_TYPE_DEVELOPER "
      + "SYSRES_CONST_CODE_COMPONENT_TYPE_DOCS "
      + "SYSRES_CONST_CODE_COMPONENT_TYPE_EDOC_CARDS "
      + "SYSRES_CONST_CODE_COMPONENT_TYPE_EXTERNAL_EXECUTABLE "
      + "SYSRES_CONST_CODE_COMPONENT_TYPE_OTHER "
      + "SYSRES_CONST_CODE_COMPONENT_TYPE_REFERENCE "
      + "SYSRES_CONST_CODE_COMPONENT_TYPE_REPORT "
      + "SYSRES_CONST_CODE_COMPONENT_TYPE_SCRIPT "
      + "SYSRES_CONST_CODE_COMPONENT_TYPE_URL "
      + "SYSRES_CONST_CODE_REQUISITE_ACCESS "
      + "SYSRES_CONST_CODE_REQUISITE_CODE "
      + "SYSRES_CONST_CODE_REQUISITE_COMPONENT "
      + "SYSRES_CONST_CODE_REQUISITE_DESCRIPTION "
      + "SYSRES_CONST_CODE_REQUISITE_EXCLUDE_COMPONENT "
      + "SYSRES_CONST_CODE_REQUISITE_RECORD "
      + "SYSRES_CONST_COMMENT_REQ_CODE "
      + "SYSRES_CONST_COMMON_SETTINGS_REQUISITE_CODE "
      + "SYSRES_CONST_COMP_CODE_GRD "
      + "SYSRES_CONST_COMPONENT_GROUP_TYPE_REQUISITE_CODE "
      + "SYSRES_CONST_COMPONENT_TYPE_ADMIN_COMPONENTS "
      + "SYSRES_CONST_COMPONENT_TYPE_DEVELOPER_COMPONENTS "
      + "SYSRES_CONST_COMPONENT_TYPE_DOCS "
      + "SYSRES_CONST_COMPONENT_TYPE_EDOC_CARDS "
      + "SYSRES_CONST_COMPONENT_TYPE_EDOCS "
      + "SYSRES_CONST_COMPONENT_TYPE_EXTERNAL_EXECUTABLE "
      + "SYSRES_CONST_COMPONENT_TYPE_OTHER "
      + "SYSRES_CONST_COMPONENT_TYPE_REFERENCE_TYPES "
      + "SYSRES_CONST_COMPONENT_TYPE_REFERENCES "
      + "SYSRES_CONST_COMPONENT_TYPE_REPORTS "
      + "SYSRES_CONST_COMPONENT_TYPE_SCRIPTS "
      + "SYSRES_CONST_COMPONENT_TYPE_URL "
      + "SYSRES_CONST_COMPONENTS_REMOTE_SERVERS_VIEW_CODE "
      + "SYSRES_CONST_CONDITION_BLOCK_DESCRIPTION "
      + "SYSRES_CONST_CONST_FIRM_STATUS_COMMON "
      + "SYSRES_CONST_CONST_FIRM_STATUS_INDIVIDUAL "
      + "SYSRES_CONST_CONST_NEGATIVE_VALUE "
      + "SYSRES_CONST_CONST_POSITIVE_VALUE "
      + "SYSRES_CONST_CONST_SERVER_STATUS_DONT_REPLICATE "
      + "SYSRES_CONST_CONST_SERVER_STATUS_REPLICATE "
      + "SYSRES_CONST_CONTENTS_REQUISITE_CODE "
      + "SYSRES_CONST_DATA_TYPE_BOOLEAN "
      + "SYSRES_CONST_DATA_TYPE_DATE "
      + "SYSRES_CONST_DATA_TYPE_FLOAT "
      + "SYSRES_CONST_DATA_TYPE_INTEGER "
      + "SYSRES_CONST_DATA_TYPE_PICK "
      + "SYSRES_CONST_DATA_TYPE_REFERENCE "
      + "SYSRES_CONST_DATA_TYPE_STRING "
      + "SYSRES_CONST_DATA_TYPE_TEXT "
      + "SYSRES_CONST_DATA_TYPE_VARIANT "
      + "SYSRES_CONST_DATE_CLOSE_REQ_CODE "
      + "SYSRES_CONST_DATE_FORMAT_DATE_ONLY_CHAR "
      + "SYSRES_CONST_DATE_OPEN_REQ_CODE "
      + "SYSRES_CONST_DATE_REQUISITE "
      + "SYSRES_CONST_DATE_REQUISITE_CODE "
      + "SYSRES_CONST_DATE_REQUISITE_NAME "
      + "SYSRES_CONST_DATE_REQUISITE_TYPE "
      + "SYSRES_CONST_DATE_TYPE_CHAR "
      + "SYSRES_CONST_DATETIME_FORMAT_VALUE "
      + "SYSRES_CONST_DEA_ACCESS_RIGHTS_ACTION_CODE "
      + "SYSRES_CONST_DESCRIPTION_LOCALIZE_ID_REQUISITE_CODE "
      + "SYSRES_CONST_DESCRIPTION_REQUISITE_CODE "
      + "SYSRES_CONST_DET1_PART "
      + "SYSRES_CONST_DET2_PART "
      + "SYSRES_CONST_DET3_PART "
      + "SYSRES_CONST_DET4_PART "
      + "SYSRES_CONST_DET5_PART "
      + "SYSRES_CONST_DET6_PART "
      + "SYSRES_CONST_DETAIL_DATASET_KEY_REQUISITE_CODE "
      + "SYSRES_CONST_DETAIL_PICK_REQUISITE_CODE "
      + "SYSRES_CONST_DETAIL_REQ_CODE "
      + "SYSRES_CONST_DO_NOT_USE_ACCESS_TYPE_CODE "
      + "SYSRES_CONST_DO_NOT_USE_ACCESS_TYPE_NAME "
      + "SYSRES_CONST_DO_NOT_USE_ON_VIEW_ACCESS_TYPE_CODE "
      + "SYSRES_CONST_DO_NOT_USE_ON_VIEW_ACCESS_TYPE_NAME "
      + "SYSRES_CONST_DOCUMENT_STORAGES_CODE "
      + "SYSRES_CONST_DOCUMENT_TEMPLATES_TYPE_NAME "
      + "SYSRES_CONST_DOUBLE_REQUISITE_CODE "
      + "SYSRES_CONST_EDITOR_CLOSE_FILE_OBSERV_TYPE_CODE "
      + "SYSRES_CONST_EDITOR_CLOSE_PROCESS_OBSERV_TYPE_CODE "
      + "SYSRES_CONST_EDITOR_TYPE_REQUISITE_CODE "
      + "SYSRES_CONST_EDITORS_APPLICATION_NAME_REQUISITE_CODE "
      + "SYSRES_CONST_EDITORS_CREATE_SEVERAL_PROCESSES_REQUISITE_CODE "
      + "SYSRES_CONST_EDITORS_EXTENSION_REQUISITE_CODE "
      + "SYSRES_CONST_EDITORS_OBSERVER_BY_PROCESS_TYPE "
      + "SYSRES_CONST_EDITORS_REFERENCE_CODE "
      + "SYSRES_CONST_EDITORS_REPLACE_SPEC_CHARS_REQUISITE_CODE "
      + "SYSRES_CONST_EDITORS_USE_PLUGINS_REQUISITE_CODE "
      + "SYSRES_CONST_EDITORS_VIEW_DOCUMENT_OPENED_TO_EDIT_CODE "
      + "SYSRES_CONST_EDOC_CARD_TYPE_REQUISITE_CODE "
      + "SYSRES_CONST_EDOC_CARD_TYPES_LINK_REQUISITE_CODE "
      + "SYSRES_CONST_EDOC_CERTIFICATE_AND_PASSWORD_ENCODE_CODE "
      + "SYSRES_CONST_EDOC_CERTIFICATE_ENCODE_CODE "
      + "SYSRES_CONST_EDOC_DATE_REQUISITE_CODE "
      + "SYSRES_CONST_EDOC_KIND_REFERENCE_CODE "
      + "SYSRES_CONST_EDOC_KINDS_BY_TEMPLATE_ACTION_CODE "
      + "SYSRES_CONST_EDOC_MANAGE_ACCESS_CODE "
      + "SYSRES_CONST_EDOC_NONE_ENCODE_CODE "
      + "SYSRES_CONST_EDOC_NUMBER_REQUISITE_CODE "
      + "SYSRES_CONST_EDOC_PASSWORD_ENCODE_CODE "
      + "SYSRES_CONST_EDOC_READONLY_ACCESS_CODE "
      + "SYSRES_CONST_EDOC_SHELL_LIFE_TYPE_VIEW_VALUE "
      + "SYSRES_CONST_EDOC_SIZE_RESTRICTION_PRIORITY_REQUISITE_CODE "
      + "SYSRES_CONST_EDOC_STORAGE_CHECK_ACCESS_RIGHTS_REQUISITE_CODE "
      + "SYSRES_CONST_EDOC_STORAGE_COMPUTER_NAME_REQUISITE_CODE "
      + "SYSRES_CONST_EDOC_STORAGE_DATABASE_NAME_REQUISITE_CODE "
      + "SYSRES_CONST_EDOC_STORAGE_EDIT_IN_STORAGE_REQUISITE_CODE "
      + "SYSRES_CONST_EDOC_STORAGE_LOCAL_PATH_REQUISITE_CODE "
      + "SYSRES_CONST_EDOC_STORAGE_SHARED_SOURCE_NAME_REQUISITE_CODE "
      + "SYSRES_CONST_EDOC_TEMPLATE_REQUISITE_CODE "
      + "SYSRES_CONST_EDOC_TYPES_REFERENCE_CODE "
      + "SYSRES_CONST_EDOC_VERSION_ACTIVE_STAGE_CODE "
      + "SYSRES_CONST_EDOC_VERSION_DESIGN_STAGE_CODE "
      + "SYSRES_CONST_EDOC_VERSION_OBSOLETE_STAGE_CODE "
      + "SYSRES_CONST_EDOC_WRITE_ACCES_CODE "
      + "SYSRES_CONST_EDOCUMENT_CARD_REQUISITES_REFERENCE_CODE_SELECTED_REQUISITE "
      + "SYSRES_CONST_ENCODE_CERTIFICATE_TYPE_CODE "
      + "SYSRES_CONST_END_DATE_REQUISITE_CODE "
      + "SYSRES_CONST_ENUMERATION_TYPE_REQUISITE_CODE "
      + "SYSRES_CONST_EXECUTE_ACCESS_RIGHTS_TYPE_CODE "
      + "SYSRES_CONST_EXECUTIVE_FILE_STORAGE_TYPE "
      + "SYSRES_CONST_EXIST_CONST "
      + "SYSRES_CONST_EXIST_VALUE "
      + "SYSRES_CONST_EXPORT_LOCK_TYPE_ASK "
      + "SYSRES_CONST_EXPORT_LOCK_TYPE_WITH_LOCK "
      + "SYSRES_CONST_EXPORT_LOCK_TYPE_WITHOUT_LOCK "
      + "SYSRES_CONST_EXPORT_VERSION_TYPE_ASK "
      + "SYSRES_CONST_EXPORT_VERSION_TYPE_LAST "
      + "SYSRES_CONST_EXPORT_VERSION_TYPE_LAST_ACTIVE "
      + "SYSRES_CONST_EXTENSION_REQUISITE_CODE "
      + "SYSRES_CONST_FILTER_NAME_REQUISITE_CODE "
      + "SYSRES_CONST_FILTER_REQUISITE_CODE "
      + "SYSRES_CONST_FILTER_TYPE_COMMON_CODE "
      + "SYSRES_CONST_FILTER_TYPE_COMMON_NAME "
      + "SYSRES_CONST_FILTER_TYPE_USER_CODE "
      + "SYSRES_CONST_FILTER_TYPE_USER_NAME "
      + "SYSRES_CONST_FILTER_VALUE_REQUISITE_NAME "
      + "SYSRES_CONST_FLOAT_NUMBER_FORMAT_CHAR "
      + "SYSRES_CONST_FLOAT_REQUISITE_TYPE "
      + "SYSRES_CONST_FOLDER_AUTHOR_VALUE "
      + "SYSRES_CONST_FOLDER_KIND_ANY_OBJECTS "
      + "SYSRES_CONST_FOLDER_KIND_COMPONENTS "
      + "SYSRES_CONST_FOLDER_KIND_EDOCS "
      + "SYSRES_CONST_FOLDER_KIND_JOBS "
      + "SYSRES_CONST_FOLDER_KIND_TASKS "
      + "SYSRES_CONST_FOLDER_TYPE_COMMON "
      + "SYSRES_CONST_FOLDER_TYPE_COMPONENT "
      + "SYSRES_CONST_FOLDER_TYPE_FAVORITES "
      + "SYSRES_CONST_FOLDER_TYPE_INBOX "
      + "SYSRES_CONST_FOLDER_TYPE_OUTBOX "
      + "SYSRES_CONST_FOLDER_TYPE_QUICK_LAUNCH "
      + "SYSRES_CONST_FOLDER_TYPE_SEARCH "
      + "SYSRES_CONST_FOLDER_TYPE_SHORTCUTS "
      + "SYSRES_CONST_FOLDER_TYPE_USER "
      + "SYSRES_CONST_FROM_DICTIONARY_ENUM_METHOD_FLAG "
      + "SYSRES_CONST_FULL_SUBSTITUTE_TYPE "
      + "SYSRES_CONST_FULL_SUBSTITUTE_TYPE_CODE "
      + "SYSRES_CONST_FUNCTION_CANCEL_RESULT "
      + "SYSRES_CONST_FUNCTION_CATEGORY_SYSTEM "
      + "SYSRES_CONST_FUNCTION_CATEGORY_USER "
      + "SYSRES_CONST_FUNCTION_FAILURE_RESULT "
      + "SYSRES_CONST_FUNCTION_SAVE_RESULT "
      + "SYSRES_CONST_GENERATED_REQUISITE "
      + "SYSRES_CONST_GREEN_LIFE_CYCLE_STAGE_FONT_COLOR "
      + "SYSRES_CONST_GROUP_ACCOUNT_TYPE_VALUE_CODE "
      + "SYSRES_CONST_GROUP_CATEGORY_NORMAL_CODE "
      + "SYSRES_CONST_GROUP_CATEGORY_NORMAL_NAME "
      + "SYSRES_CONST_GROUP_CATEGORY_SERVICE_CODE "
      + "SYSRES_CONST_GROUP_CATEGORY_SERVICE_NAME "
      + "SYSRES_CONST_GROUP_COMMON_CATEGORY_FIELD_VALUE "
      + "SYSRES_CONST_GROUP_FULL_NAME_REQUISITE_CODE "
      + "SYSRES_CONST_GROUP_NAME_REQUISITE_CODE "
      + "SYSRES_CONST_GROUP_RIGHTS_T_REQUISITE_CODE "
      + "SYSRES_CONST_GROUP_SERVER_CODES_REQUISITE_CODE "
      + "SYSRES_CONST_GROUP_SERVER_NAME_REQUISITE_CODE "
      + "SYSRES_CONST_GROUP_SERVICE_CATEGORY_FIELD_VALUE "
      + "SYSRES_CONST_GROUP_USER_REQUISITE_CODE "
      + "SYSRES_CONST_GROUPS_REFERENCE_CODE "
      + "SYSRES_CONST_GROUPS_REQUISITE_CODE "
      + "SYSRES_CONST_HIDDEN_MODE_NAME "
      + "SYSRES_CONST_HIGH_LVL_REQUISITE_CODE "
      + "SYSRES_CONST_HISTORY_ACTION_CREATE_CODE "
      + "SYSRES_CONST_HISTORY_ACTION_DELETE_CODE "
      + "SYSRES_CONST_HISTORY_ACTION_EDIT_CODE "
      + "SYSRES_CONST_HOUR_CHAR "
      + "SYSRES_CONST_ID_REQUISITE_CODE "
      + "SYSRES_CONST_IDSPS_REQUISITE_CODE "
      + "SYSRES_CONST_IMAGE_MODE_COLOR "
      + "SYSRES_CONST_IMAGE_MODE_GREYSCALE "
      + "SYSRES_CONST_IMAGE_MODE_MONOCHROME "
      + "SYSRES_CONST_IMPORTANCE_HIGH "
      + "SYSRES_CONST_IMPORTANCE_LOW "
      + "SYSRES_CONST_IMPORTANCE_NORMAL "
      + "SYSRES_CONST_IN_DESIGN_VERSION_STATE_PICK_VALUE "
      + "SYSRES_CONST_INCOMING_WORK_RULE_TYPE_CODE "
      + "SYSRES_CONST_INT_REQUISITE "
      + "SYSRES_CONST_INT_REQUISITE_TYPE "
      + "SYSRES_CONST_INTEGER_NUMBER_FORMAT_CHAR "
      + "SYSRES_CONST_INTEGER_TYPE_CHAR "
      + "SYSRES_CONST_IS_GENERATED_REQUISITE_NEGATIVE_VALUE "
      + "SYSRES_CONST_IS_PUBLIC_ROLE_REQUISITE_CODE "
      + "SYSRES_CONST_IS_REMOTE_USER_NEGATIVE_VALUE "
      + "SYSRES_CONST_IS_REMOTE_USER_POSITIVE_VALUE "
      + "SYSRES_CONST_IS_STORED_REQUISITE_NEGATIVE_VALUE "
      + "SYSRES_CONST_IS_STORED_REQUISITE_STORED_VALUE "
      + "SYSRES_CONST_ITALIC_LIFE_CYCLE_STAGE_DRAW_STYLE "
      + "SYSRES_CONST_JOB_BLOCK_DESCRIPTION "
      + "SYSRES_CONST_JOB_KIND_CONTROL_JOB "
      + "SYSRES_CONST_JOB_KIND_JOB "
      + "SYSRES_CONST_JOB_KIND_NOTICE "
      + "SYSRES_CONST_JOB_STATE_ABORTED "
      + "SYSRES_CONST_JOB_STATE_COMPLETE "
      + "SYSRES_CONST_JOB_STATE_WORKING "
      + "SYSRES_CONST_KIND_REQUISITE_CODE "
      + "SYSRES_CONST_KIND_REQUISITE_NAME "
      + "SYSRES_CONST_KINDS_CREATE_SHADOW_COPIES_REQUISITE_CODE "
      + "SYSRES_CONST_KINDS_DEFAULT_EDOC_LIFE_STAGE_REQUISITE_CODE "
      + "SYSRES_CONST_KINDS_EDOC_ALL_TEPLATES_ALLOWED_REQUISITE_CODE "
      + "SYSRES_CONST_KINDS_EDOC_ALLOW_LIFE_CYCLE_STAGE_CHANGING_REQUISITE_CODE "
      + "SYSRES_CONST_KINDS_EDOC_ALLOW_MULTIPLE_ACTIVE_VERSIONS_REQUISITE_CODE "
      + "SYSRES_CONST_KINDS_EDOC_SHARE_ACCES_RIGHTS_BY_DEFAULT_CODE "
      + "SYSRES_CONST_KINDS_EDOC_TEMPLATE_REQUISITE_CODE "
      + "SYSRES_CONST_KINDS_EDOC_TYPE_REQUISITE_CODE "
      + "SYSRES_CONST_KINDS_SIGNERS_REQUISITES_CODE "
      + "SYSRES_CONST_KOD_INPUT_TYPE "
      + "SYSRES_CONST_LAST_UPDATE_DATE_REQUISITE_CODE "
      + "SYSRES_CONST_LIFE_CYCLE_START_STAGE_REQUISITE_CODE "
      + "SYSRES_CONST_LILAC_LIFE_CYCLE_STAGE_FONT_COLOR "
      + "SYSRES_CONST_LINK_OBJECT_KIND_COMPONENT "
      + "SYSRES_CONST_LINK_OBJECT_KIND_DOCUMENT "
      + "SYSRES_CONST_LINK_OBJECT_KIND_EDOC "
      + "SYSRES_CONST_LINK_OBJECT_KIND_FOLDER "
      + "SYSRES_CONST_LINK_OBJECT_KIND_JOB "
      + "SYSRES_CONST_LINK_OBJECT_KIND_REFERENCE "
      + "SYSRES_CONST_LINK_OBJECT_KIND_TASK "
      + "SYSRES_CONST_LINK_REF_TYPE_REQUISITE_CODE "
      + "SYSRES_CONST_LIST_REFERENCE_MODE_NAME "
      + "SYSRES_CONST_LOCALIZATION_DICTIONARY_MAIN_VIEW_CODE "
      + "SYSRES_CONST_MAIN_VIEW_CODE "
      + "SYSRES_CONST_MANUAL_ENUM_METHOD_FLAG "
      + "SYSRES_CONST_MASTER_COMP_TYPE_REQUISITE_CODE "
      + "SYSRES_CONST_MASTER_TABLE_REC_ID_REQUISITE_CODE "
      + "SYSRES_CONST_MAXIMIZED_MODE_NAME "
      + "SYSRES_CONST_ME_VALUE "
      + "SYSRES_CONST_MESSAGE_ATTENTION_CAPTION "
      + "SYSRES_CONST_MESSAGE_CONFIRMATION_CAPTION "
      + "SYSRES_CONST_MESSAGE_ERROR_CAPTION "
      + "SYSRES_CONST_MESSAGE_INFORMATION_CAPTION "
      + "SYSRES_CONST_MINIMIZED_MODE_NAME "
      + "SYSRES_CONST_MINUTE_CHAR "
      + "SYSRES_CONST_MODULE_REQUISITE_CODE "
      + "SYSRES_CONST_MONITORING_BLOCK_DESCRIPTION "
      + "SYSRES_CONST_MONTH_FORMAT_VALUE "
      + "SYSRES_CONST_NAME_LOCALIZE_ID_REQUISITE_CODE "
      + "SYSRES_CONST_NAME_REQUISITE_CODE "
      + "SYSRES_CONST_NAME_SINGULAR_REQUISITE_CODE "
      + "SYSRES_CONST_NAMEAN_INPUT_TYPE "
      + "SYSRES_CONST_NEGATIVE_PICK_VALUE "
      + "SYSRES_CONST_NEGATIVE_VALUE "
      + "SYSRES_CONST_NO "
      + "SYSRES_CONST_NO_PICK_VALUE "
      + "SYSRES_CONST_NO_SIGNATURE_REQUISITE_CODE "
      + "SYSRES_CONST_NO_VALUE "
      + "SYSRES_CONST_NONE_ACCESS_RIGHTS_TYPE_CODE "
      + "SYSRES_CONST_NONOPERATING_RECORD_FLAG_VALUE "
      + "SYSRES_CONST_NONOPERATING_RECORD_FLAG_VALUE_MASCULINE "
      + "SYSRES_CONST_NORMAL_ACCESS_RIGHTS_TYPE_CODE "
      + "SYSRES_CONST_NORMAL_LIFE_CYCLE_STAGE_DRAW_STYLE "
      + "SYSRES_CONST_NORMAL_MODE_NAME "
      + "SYSRES_CONST_NOT_ALLOWED_ACCESS_TYPE_CODE "
      + "SYSRES_CONST_NOT_ALLOWED_ACCESS_TYPE_NAME "
      + "SYSRES_CONST_NOTE_REQUISITE_CODE "
      + "SYSRES_CONST_NOTICE_BLOCK_DESCRIPTION "
      + "SYSRES_CONST_NUM_REQUISITE "
      + "SYSRES_CONST_NUM_STR_REQUISITE_CODE "
      + "SYSRES_CONST_NUMERATION_AUTO_NOT_STRONG "
      + "SYSRES_CONST_NUMERATION_AUTO_STRONG "
      + "SYSRES_CONST_NUMERATION_FROM_DICTONARY "
      + "SYSRES_CONST_NUMERATION_MANUAL "
      + "SYSRES_CONST_NUMERIC_TYPE_CHAR "
      + "SYSRES_CONST_NUMREQ_REQUISITE_CODE "
      + "SYSRES_CONST_OBSOLETE_VERSION_STATE_PICK_VALUE "
      + "SYSRES_CONST_OPERATING_RECORD_FLAG_VALUE "
      + "SYSRES_CONST_OPERATING_RECORD_FLAG_VALUE_CODE "
      + "SYSRES_CONST_OPERATING_RECORD_FLAG_VALUE_FEMININE "
      + "SYSRES_CONST_OPERATING_RECORD_FLAG_VALUE_MASCULINE "
      + "SYSRES_CONST_OPTIONAL_FORM_COMP_REQCODE_PREFIX "
      + "SYSRES_CONST_ORANGE_LIFE_CYCLE_STAGE_FONT_COLOR "
      + "SYSRES_CONST_ORIGINALREF_REQUISITE_CODE "
      + "SYSRES_CONST_OURFIRM_REF_CODE "
      + "SYSRES_CONST_OURFIRM_REQUISITE_CODE "
      + "SYSRES_CONST_OURFIRM_VAR "
      + "SYSRES_CONST_OUTGOING_WORK_RULE_TYPE_CODE "
      + "SYSRES_CONST_PICK_NEGATIVE_RESULT "
      + "SYSRES_CONST_PICK_POSITIVE_RESULT "
      + "SYSRES_CONST_PICK_REQUISITE "
      + "SYSRES_CONST_PICK_REQUISITE_TYPE "
      + "SYSRES_CONST_PICK_TYPE_CHAR "
      + "SYSRES_CONST_PLAN_STATUS_REQUISITE_CODE "
      + "SYSRES_CONST_PLATFORM_VERSION_COMMENT "
      + "SYSRES_CONST_PLUGINS_SETTINGS_DESCRIPTION_REQUISITE_CODE "
      + "SYSRES_CONST_POSITIVE_PICK_VALUE "
      + "SYSRES_CONST_POWER_TO_CREATE_ACTION_CODE "
      + "SYSRES_CONST_POWER_TO_SIGN_ACTION_CODE "
      + "SYSRES_CONST_PRIORITY_REQUISITE_CODE "
      + "SYSRES_CONST_QUALIFIED_TASK_TYPE "
      + "SYSRES_CONST_QUALIFIED_TASK_TYPE_CODE "
      + "SYSRES_CONST_RECSTAT_REQUISITE_CODE "
      + "SYSRES_CONST_RED_LIFE_CYCLE_STAGE_FONT_COLOR "
      + "SYSRES_CONST_REF_ID_T_REF_TYPE_REQUISITE_CODE "
      + "SYSRES_CONST_REF_REQUISITE "
      + "SYSRES_CONST_REF_REQUISITE_TYPE "
      + "SYSRES_CONST_REF_REQUISITES_REFERENCE_CODE_SELECTED_REQUISITE "
      + "SYSRES_CONST_REFERENCE_RECORD_HISTORY_CREATE_ACTION_CODE "
      + "SYSRES_CONST_REFERENCE_RECORD_HISTORY_DELETE_ACTION_CODE "
      + "SYSRES_CONST_REFERENCE_RECORD_HISTORY_MODIFY_ACTION_CODE "
      + "SYSRES_CONST_REFERENCE_TYPE_CHAR "
      + "SYSRES_CONST_REFERENCE_TYPE_REQUISITE_NAME "
      + "SYSRES_CONST_REFERENCES_ADD_PARAMS_REQUISITE_CODE "
      + "SYSRES_CONST_REFERENCES_DISPLAY_REQUISITE_REQUISITE_CODE "
      + "SYSRES_CONST_REMOTE_SERVER_STATUS_WORKING "
      + "SYSRES_CONST_REMOTE_SERVER_TYPE_MAIN "
      + "SYSRES_CONST_REMOTE_SERVER_TYPE_SECONDARY "
      + "SYSRES_CONST_REMOTE_USER_FLAG_VALUE_CODE "
      + "SYSRES_CONST_REPORT_APP_EDITOR_INTERNAL "
      + "SYSRES_CONST_REPORT_BASE_REPORT_ID_REQUISITE_CODE "
      + "SYSRES_CONST_REPORT_BASE_REPORT_REQUISITE_CODE "
      + "SYSRES_CONST_REPORT_SCRIPT_REQUISITE_CODE "
      + "SYSRES_CONST_REPORT_TEMPLATE_REQUISITE_CODE "
      + "SYSRES_CONST_REPORT_VIEWER_CODE_REQUISITE_CODE "
      + "SYSRES_CONST_REQ_ALLOW_COMPONENT_DEFAULT_VALUE "
      + "SYSRES_CONST_REQ_ALLOW_RECORD_DEFAULT_VALUE "
      + "SYSRES_CONST_REQ_ALLOW_SERVER_COMPONENT_DEFAULT_VALUE "
      + "SYSRES_CONST_REQ_MODE_AVAILABLE_CODE "
      + "SYSRES_CONST_REQ_MODE_EDIT_CODE "
      + "SYSRES_CONST_REQ_MODE_HIDDEN_CODE "
      + "SYSRES_CONST_REQ_MODE_NOT_AVAILABLE_CODE "
      + "SYSRES_CONST_REQ_MODE_VIEW_CODE "
      + "SYSRES_CONST_REQ_NUMBER_REQUISITE_CODE "
      + "SYSRES_CONST_REQ_SECTION_VALUE "
      + "SYSRES_CONST_REQ_TYPE_VALUE "
      + "SYSRES_CONST_REQUISITE_FORMAT_BY_UNIT "
      + "SYSRES_CONST_REQUISITE_FORMAT_DATE_FULL "
      + "SYSRES_CONST_REQUISITE_FORMAT_DATE_TIME "
      + "SYSRES_CONST_REQUISITE_FORMAT_LEFT "
      + "SYSRES_CONST_REQUISITE_FORMAT_RIGHT "
      + "SYSRES_CONST_REQUISITE_FORMAT_WITHOUT_UNIT "
      + "SYSRES_CONST_REQUISITE_NUMBER_REQUISITE_CODE "
      + "SYSRES_CONST_REQUISITE_SECTION_ACTIONS "
      + "SYSRES_CONST_REQUISITE_SECTION_BUTTON "
      + "SYSRES_CONST_REQUISITE_SECTION_BUTTONS "
      + "SYSRES_CONST_REQUISITE_SECTION_CARD "
      + "SYSRES_CONST_REQUISITE_SECTION_TABLE "
      + "SYSRES_CONST_REQUISITE_SECTION_TABLE10 "
      + "SYSRES_CONST_REQUISITE_SECTION_TABLE11 "
      + "SYSRES_CONST_REQUISITE_SECTION_TABLE12 "
      + "SYSRES_CONST_REQUISITE_SECTION_TABLE13 "
      + "SYSRES_CONST_REQUISITE_SECTION_TABLE14 "
      + "SYSRES_CONST_REQUISITE_SECTION_TABLE15 "
      + "SYSRES_CONST_REQUISITE_SECTION_TABLE16 "
      + "SYSRES_CONST_REQUISITE_SECTION_TABLE17 "
      + "SYSRES_CONST_REQUISITE_SECTION_TABLE18 "
      + "SYSRES_CONST_REQUISITE_SECTION_TABLE19 "
      + "SYSRES_CONST_REQUISITE_SECTION_TABLE2 "
      + "SYSRES_CONST_REQUISITE_SECTION_TABLE20 "
      + "SYSRES_CONST_REQUISITE_SECTION_TABLE21 "
      + "SYSRES_CONST_REQUISITE_SECTION_TABLE22 "
      + "SYSRES_CONST_REQUISITE_SECTION_TABLE23 "
      + "SYSRES_CONST_REQUISITE_SECTION_TABLE24 "
      + "SYSRES_CONST_REQUISITE_SECTION_TABLE3 "
      + "SYSRES_CONST_REQUISITE_SECTION_TABLE4 "
      + "SYSRES_CONST_REQUISITE_SECTION_TABLE5 "
      + "SYSRES_CONST_REQUISITE_SECTION_TABLE6 "
      + "SYSRES_CONST_REQUISITE_SECTION_TABLE7 "
      + "SYSRES_CONST_REQUISITE_SECTION_TABLE8 "
      + "SYSRES_CONST_REQUISITE_SECTION_TABLE9 "
      + "SYSRES_CONST_REQUISITES_PSEUDOREFERENCE_REQUISITE_NUMBER_REQUISITE_CODE "
      + "SYSRES_CONST_RIGHT_ALIGNMENT_CODE "
      + "SYSRES_CONST_ROLES_REFERENCE_CODE "
      + "SYSRES_CONST_ROUTE_STEP_AFTER_RUS "
      + "SYSRES_CONST_ROUTE_STEP_AND_CONDITION_RUS "
      + "SYSRES_CONST_ROUTE_STEP_OR_CONDITION_RUS "
      + "SYSRES_CONST_ROUTE_TYPE_COMPLEX "
      + "SYSRES_CONST_ROUTE_TYPE_PARALLEL "
      + "SYSRES_CONST_ROUTE_TYPE_SERIAL "
      + "SYSRES_CONST_SBDATASETDESC_NEGATIVE_VALUE "
      + "SYSRES_CONST_SBDATASETDESC_POSITIVE_VALUE "
      + "SYSRES_CONST_SBVIEWSDESC_POSITIVE_VALUE "
      + "SYSRES_CONST_SCRIPT_BLOCK_DESCRIPTION "
      + "SYSRES_CONST_SEARCH_BY_TEXT_REQUISITE_CODE "
      + "SYSRES_CONST_SEARCHES_COMPONENT_CONTENT "
      + "SYSRES_CONST_SEARCHES_CRITERIA_ACTION_NAME "
      + "SYSRES_CONST_SEARCHES_EDOC_CONTENT "
      + "SYSRES_CONST_SEARCHES_FOLDER_CONTENT "
      + "SYSRES_CONST_SEARCHES_JOB_CONTENT "
      + "SYSRES_CONST_SEARCHES_REFERENCE_CODE "
      + "SYSRES_CONST_SEARCHES_TASK_CONTENT "
      + "SYSRES_CONST_SECOND_CHAR "
      + "SYSRES_CONST_SECTION_REQUISITE_ACTIONS_VALUE "
      + "SYSRES_CONST_SECTION_REQUISITE_CARD_VALUE "
      + "SYSRES_CONST_SECTION_REQUISITE_CODE "
      + "SYSRES_CONST_SECTION_REQUISITE_DETAIL_1_VALUE "
      + "SYSRES_CONST_SECTION_REQUISITE_DETAIL_2_VALUE "
      + "SYSRES_CONST_SECTION_REQUISITE_DETAIL_3_VALUE "
      + "SYSRES_CONST_SECTION_REQUISITE_DETAIL_4_VALUE "
      + "SYSRES_CONST_SECTION_REQUISITE_DETAIL_5_VALUE "
      + "SYSRES_CONST_SECTION_REQUISITE_DETAIL_6_VALUE "
      + "SYSRES_CONST_SELECT_REFERENCE_MODE_NAME "
      + "SYSRES_CONST_SELECT_TYPE_SELECTABLE "
      + "SYSRES_CONST_SELECT_TYPE_SELECTABLE_ONLY_CHILD "
      + "SYSRES_CONST_SELECT_TYPE_SELECTABLE_WITH_CHILD "
      + "SYSRES_CONST_SELECT_TYPE_UNSLECTABLE "
      + "SYSRES_CONST_SERVER_TYPE_MAIN "
      + "SYSRES_CONST_SERVICE_USER_CATEGORY_FIELD_VALUE "
      + "SYSRES_CONST_SETTINGS_USER_REQUISITE_CODE "
      + "SYSRES_CONST_SIGNATURE_AND_ENCODE_CERTIFICATE_TYPE_CODE "
      + "SYSRES_CONST_SIGNATURE_CERTIFICATE_TYPE_CODE "
      + "SYSRES_CONST_SINGULAR_TITLE_REQUISITE_CODE "
      + "SYSRES_CONST_SQL_SERVER_AUTHENTIFICATION_FLAG_VALUE_CODE "
      + "SYSRES_CONST_SQL_SERVER_ENCODE_AUTHENTIFICATION_FLAG_VALUE_CODE "
      + "SYSRES_CONST_STANDART_ROUTE_REFERENCE_CODE "
      + "SYSRES_CONST_STANDART_ROUTE_REFERENCE_COMMENT_REQUISITE_CODE "
      + "SYSRES_CONST_STANDART_ROUTES_GROUPS_REFERENCE_CODE "
      + "SYSRES_CONST_STATE_REQ_NAME "
      + "SYSRES_CONST_STATE_REQUISITE_ACTIVE_VALUE "
      + "SYSRES_CONST_STATE_REQUISITE_CLOSED_VALUE "
      + "SYSRES_CONST_STATE_REQUISITE_CODE "
      + "SYSRES_CONST_STATIC_ROLE_TYPE_CODE "
      + "SYSRES_CONST_STATUS_PLAN_DEFAULT_VALUE "
      + "SYSRES_CONST_STATUS_VALUE_AUTOCLEANING "
      + "SYSRES_CONST_STATUS_VALUE_BLUE_SQUARE "
      + "SYSRES_CONST_STATUS_VALUE_COMPLETE "
      + "SYSRES_CONST_STATUS_VALUE_GREEN_SQUARE "
      + "SYSRES_CONST_STATUS_VALUE_ORANGE_SQUARE "
      + "SYSRES_CONST_STATUS_VALUE_PURPLE_SQUARE "
      + "SYSRES_CONST_STATUS_VALUE_RED_SQUARE "
      + "SYSRES_CONST_STATUS_VALUE_SUSPEND "
      + "SYSRES_CONST_STATUS_VALUE_YELLOW_SQUARE "
      + "SYSRES_CONST_STDROUTE_SHOW_TO_USERS_REQUISITE_CODE "
      + "SYSRES_CONST_STORAGE_TYPE_FILE "
      + "SYSRES_CONST_STORAGE_TYPE_SQL_SERVER "
      + "SYSRES_CONST_STR_REQUISITE "
      + "SYSRES_CONST_STRIKEOUT_LIFE_CYCLE_STAGE_DRAW_STYLE "
      + "SYSRES_CONST_STRING_FORMAT_LEFT_ALIGN_CHAR "
      + "SYSRES_CONST_STRING_FORMAT_RIGHT_ALIGN_CHAR "
      + "SYSRES_CONST_STRING_REQUISITE_CODE "
      + "SYSRES_CONST_STRING_REQUISITE_TYPE "
      + "SYSRES_CONST_STRING_TYPE_CHAR "
      + "SYSRES_CONST_SUBSTITUTES_PSEUDOREFERENCE_CODE "
      + "SYSRES_CONST_SUBTASK_BLOCK_DESCRIPTION "
      + "SYSRES_CONST_SYSTEM_SETTING_CURRENT_USER_PARAM_VALUE "
      + "SYSRES_CONST_SYSTEM_SETTING_EMPTY_VALUE_PARAM_VALUE "
      + "SYSRES_CONST_SYSTEM_VERSION_COMMENT "
      + "SYSRES_CONST_TASK_ACCESS_TYPE_ALL "
      + "SYSRES_CONST_TASK_ACCESS_TYPE_ALL_MEMBERS "
      + "SYSRES_CONST_TASK_ACCESS_TYPE_MANUAL "
      + "SYSRES_CONST_TASK_ENCODE_TYPE_CERTIFICATION "
      + "SYSRES_CONST_TASK_ENCODE_TYPE_CERTIFICATION_AND_PASSWORD "
      + "SYSRES_CONST_TASK_ENCODE_TYPE_NONE "
      + "SYSRES_CONST_TASK_ENCODE_TYPE_PASSWORD "
      + "SYSRES_CONST_TASK_ROUTE_ALL_CONDITION "
      + "SYSRES_CONST_TASK_ROUTE_AND_CONDITION "
      + "SYSRES_CONST_TASK_ROUTE_OR_CONDITION "
      + "SYSRES_CONST_TASK_STATE_ABORTED "
      + "SYSRES_CONST_TASK_STATE_COMPLETE "
      + "SYSRES_CONST_TASK_STATE_CONTINUED "
      + "SYSRES_CONST_TASK_STATE_CONTROL "
      + "SYSRES_CONST_TASK_STATE_INIT "
      + "SYSRES_CONST_TASK_STATE_WORKING "
      + "SYSRES_CONST_TASK_TITLE "
      + "SYSRES_CONST_TASK_TYPES_GROUPS_REFERENCE_CODE "
      + "SYSRES_CONST_TASK_TYPES_REFERENCE_CODE "
      + "SYSRES_CONST_TEMPLATES_REFERENCE_CODE "
      + "SYSRES_CONST_TEST_DATE_REQUISITE_NAME "
      + "SYSRES_CONST_TEST_DEV_DATABASE_NAME "
      + "SYSRES_CONST_TEST_DEV_SYSTEM_CODE "
      + "SYSRES_CONST_TEST_EDMS_DATABASE_NAME "
      + "SYSRES_CONST_TEST_EDMS_MAIN_CODE "
      + "SYSRES_CONST_TEST_EDMS_MAIN_DB_NAME "
      + "SYSRES_CONST_TEST_EDMS_SECOND_CODE "
      + "SYSRES_CONST_TEST_EDMS_SECOND_DB_NAME "
      + "SYSRES_CONST_TEST_EDMS_SYSTEM_CODE "
      + "SYSRES_CONST_TEST_NUMERIC_REQUISITE_NAME "
      + "SYSRES_CONST_TEXT_REQUISITE "
      + "SYSRES_CONST_TEXT_REQUISITE_CODE "
      + "SYSRES_CONST_TEXT_REQUISITE_TYPE "
      + "SYSRES_CONST_TEXT_TYPE_CHAR "
      + "SYSRES_CONST_TYPE_CODE_REQUISITE_CODE "
      + "SYSRES_CONST_TYPE_REQUISITE_CODE "
      + "SYSRES_CONST_UNDEFINED_LIFE_CYCLE_STAGE_FONT_COLOR "
      + "SYSRES_CONST_UNITS_SECTION_ID_REQUISITE_CODE "
      + "SYSRES_CONST_UNITS_SECTION_REQUISITE_CODE "
      + "SYSRES_CONST_UNOPERATING_RECORD_FLAG_VALUE_CODE "
      + "SYSRES_CONST_UNSTORED_DATA_REQUISITE_CODE "
      + "SYSRES_CONST_UNSTORED_DATA_REQUISITE_NAME "
      + "SYSRES_CONST_USE_ACCESS_TYPE_CODE "
      + "SYSRES_CONST_USE_ACCESS_TYPE_NAME "
      + "SYSRES_CONST_USER_ACCOUNT_TYPE_VALUE_CODE "
      + "SYSRES_CONST_USER_ADDITIONAL_INFORMATION_REQUISITE_CODE "
      + "SYSRES_CONST_USER_AND_GROUP_ID_FROM_PSEUDOREFERENCE_REQUISITE_CODE "
      + "SYSRES_CONST_USER_CATEGORY_NORMAL "
      + "SYSRES_CONST_USER_CERTIFICATE_REQUISITE_CODE "
      + "SYSRES_CONST_USER_CERTIFICATE_STATE_REQUISITE_CODE "
      + "SYSRES_CONST_USER_CERTIFICATE_SUBJECT_NAME_REQUISITE_CODE "
      + "SYSRES_CONST_USER_CERTIFICATE_THUMBPRINT_REQUISITE_CODE "
      + "SYSRES_CONST_USER_COMMON_CATEGORY "
      + "SYSRES_CONST_USER_COMMON_CATEGORY_CODE "
      + "SYSRES_CONST_USER_FULL_NAME_REQUISITE_CODE "
      + "SYSRES_CONST_USER_GROUP_TYPE_REQUISITE_CODE "
      + "SYSRES_CONST_USER_LOGIN_REQUISITE_CODE "
      + "SYSRES_CONST_USER_REMOTE_CONTROLLER_REQUISITE_CODE "
      + "SYSRES_CONST_USER_REMOTE_SYSTEM_REQUISITE_CODE "
      + "SYSRES_CONST_USER_RIGHTS_T_REQUISITE_CODE "
      + "SYSRES_CONST_USER_SERVER_NAME_REQUISITE_CODE "
      + "SYSRES_CONST_USER_SERVICE_CATEGORY "
      + "SYSRES_CONST_USER_SERVICE_CATEGORY_CODE "
      + "SYSRES_CONST_USER_STATUS_ADMINISTRATOR_CODE "
      + "SYSRES_CONST_USER_STATUS_ADMINISTRATOR_NAME "
      + "SYSRES_CONST_USER_STATUS_DEVELOPER_CODE "
      + "SYSRES_CONST_USER_STATUS_DEVELOPER_NAME "
      + "SYSRES_CONST_USER_STATUS_DISABLED_CODE "
      + "SYSRES_CONST_USER_STATUS_DISABLED_NAME "
      + "SYSRES_CONST_USER_STATUS_SYSTEM_DEVELOPER_CODE "
      + "SYSRES_CONST_USER_STATUS_USER_CODE "
      + "SYSRES_CONST_USER_STATUS_USER_NAME "
      + "SYSRES_CONST_USER_STATUS_USER_NAME_DEPRECATED "
      + "SYSRES_CONST_USER_TYPE_FIELD_VALUE_USER "
      + "SYSRES_CONST_USER_TYPE_REQUISITE_CODE "
      + "SYSRES_CONST_USERS_CONTROLLER_REQUISITE_CODE "
      + "SYSRES_CONST_USERS_IS_MAIN_SERVER_REQUISITE_CODE "
      + "SYSRES_CONST_USERS_REFERENCE_CODE "
      + "SYSRES_CONST_USERS_REGISTRATION_CERTIFICATES_ACTION_NAME "
      + "SYSRES_CONST_USERS_REQUISITE_CODE "
      + "SYSRES_CONST_USERS_SYSTEM_REQUISITE_CODE "
      + "SYSRES_CONST_USERS_USER_ACCESS_RIGHTS_TYPR_REQUISITE_CODE "
      + "SYSRES_CONST_USERS_USER_AUTHENTICATION_REQUISITE_CODE "
      + "SYSRES_CONST_USERS_USER_COMPONENT_REQUISITE_CODE "
      + "SYSRES_CONST_USERS_USER_GROUP_REQUISITE_CODE "
      + "SYSRES_CONST_USERS_VIEW_CERTIFICATES_ACTION_NAME "
      + "SYSRES_CONST_VIEW_DEFAULT_CODE "
      + "SYSRES_CONST_VIEW_DEFAULT_NAME "
      + "SYSRES_CONST_VIEWER_REQUISITE_CODE "
      + "SYSRES_CONST_WAITING_BLOCK_DESCRIPTION "
      + "SYSRES_CONST_WIZARD_FORM_LABEL_TEST_STRING  "
      + "SYSRES_CONST_WIZARD_QUERY_PARAM_HEIGHT_ETALON_STRING "
      + "SYSRES_CONST_WIZARD_REFERENCE_COMMENT_REQUISITE_CODE "
      + "SYSRES_CONST_WORK_RULES_DESCRIPTION_REQUISITE_CODE "
      + "SYSRES_CONST_WORK_TIME_CALENDAR_REFERENCE_CODE "
      + "SYSRES_CONST_WORK_WORKFLOW_HARD_ROUTE_TYPE_VALUE "
      + "SYSRES_CONST_WORK_WORKFLOW_HARD_ROUTE_TYPE_VALUE_CODE "
      + "SYSRES_CONST_WORK_WORKFLOW_HARD_ROUTE_TYPE_VALUE_CODE_RUS "
      + "SYSRES_CONST_WORK_WORKFLOW_SOFT_ROUTE_TYPE_VALUE_CODE_RUS "
      + "SYSRES_CONST_WORKFLOW_ROUTE_TYPR_HARD "
      + "SYSRES_CONST_WORKFLOW_ROUTE_TYPR_SOFT "
      + "SYSRES_CONST_XML_ENCODING "
      + "SYSRES_CONST_XREC_STAT_REQUISITE_CODE "
      + "SYSRES_CONST_XRECID_FIELD_NAME "
      + "SYSRES_CONST_YES "
      + "SYSRES_CONST_YES_NO_2_REQUISITE_CODE "
      + "SYSRES_CONST_YES_NO_REQUISITE_CODE "
      + "SYSRES_CONST_YES_NO_T_REF_TYPE_REQUISITE_CODE "
      + "SYSRES_CONST_YES_PICK_VALUE "
      + "SYSRES_CONST_YES_VALUE ";

    // Base constant
    const base_constants = "CR FALSE nil NO_VALUE NULL TAB TRUE YES_VALUE ";

    // Base group name
    const base_group_name_constants =
      "ADMINISTRATORS_GROUP_NAME CUSTOMIZERS_GROUP_NAME DEVELOPERS_GROUP_NAME SERVICE_USERS_GROUP_NAME ";

    // Decision block properties
    const decision_block_properties_constants =
      "DECISION_BLOCK_FIRST_OPERAND_PROPERTY DECISION_BLOCK_NAME_PROPERTY DECISION_BLOCK_OPERATION_PROPERTY "
      + "DECISION_BLOCK_RESULT_TYPE_PROPERTY DECISION_BLOCK_SECOND_OPERAND_PROPERTY ";

    // File extension
    const file_extension_constants =
      "ANY_FILE_EXTENTION COMPRESSED_DOCUMENT_EXTENSION EXTENDED_DOCUMENT_EXTENSION "
      + "SHORT_COMPRESSED_DOCUMENT_EXTENSION SHORT_EXTENDED_DOCUMENT_EXTENSION ";

    // Job block properties
    const job_block_properties_constants =
      "JOB_BLOCK_ABORT_DEADLINE_PROPERTY "
      + "JOB_BLOCK_AFTER_FINISH_EVENT "
      + "JOB_BLOCK_AFTER_QUERY_PARAMETERS_EVENT "
      + "JOB_BLOCK_ATTACHMENT_PROPERTY "
      + "JOB_BLOCK_ATTACHMENTS_RIGHTS_GROUP_PROPERTY "
      + "JOB_BLOCK_ATTACHMENTS_RIGHTS_TYPE_PROPERTY "
      + "JOB_BLOCK_BEFORE_QUERY_PARAMETERS_EVENT "
      + "JOB_BLOCK_BEFORE_START_EVENT "
      + "JOB_BLOCK_CREATED_JOBS_PROPERTY "
      + "JOB_BLOCK_DEADLINE_PROPERTY "
      + "JOB_BLOCK_EXECUTION_RESULTS_PROPERTY "
      + "JOB_BLOCK_IS_PARALLEL_PROPERTY "
      + "JOB_BLOCK_IS_RELATIVE_ABORT_DEADLINE_PROPERTY "
      + "JOB_BLOCK_IS_RELATIVE_DEADLINE_PROPERTY "
      + "JOB_BLOCK_JOB_TEXT_PROPERTY "
      + "JOB_BLOCK_NAME_PROPERTY "
      + "JOB_BLOCK_NEED_SIGN_ON_PERFORM_PROPERTY "
      + "JOB_BLOCK_PERFORMER_PROPERTY "
      + "JOB_BLOCK_RELATIVE_ABORT_DEADLINE_TYPE_PROPERTY "
      + "JOB_BLOCK_RELATIVE_DEADLINE_TYPE_PROPERTY "
      + "JOB_BLOCK_SUBJECT_PROPERTY ";

    // Language code
    const language_code_constants = "ENGLISH_LANGUAGE_CODE RUSSIAN_LANGUAGE_CODE ";

    // Launching external applications
    const launching_external_applications_constants =
      "smHidden smMaximized smMinimized smNormal wmNo wmYes ";

    // Link kind
    const link_kind_constants =
      "COMPONENT_TOKEN_LINK_KIND "
      + "DOCUMENT_LINK_KIND "
      + "EDOCUMENT_LINK_KIND "
      + "FOLDER_LINK_KIND "
      + "JOB_LINK_KIND "
      + "REFERENCE_LINK_KIND "
      + "TASK_LINK_KIND ";

    // Lock type
    const lock_type_constants =
      "COMPONENT_TOKEN_LOCK_TYPE EDOCUMENT_VERSION_LOCK_TYPE ";

    // Monitor block properties
    const monitor_block_properties_constants =
      "MONITOR_BLOCK_AFTER_FINISH_EVENT "
      + "MONITOR_BLOCK_BEFORE_START_EVENT "
      + "MONITOR_BLOCK_DEADLINE_PROPERTY "
      + "MONITOR_BLOCK_INTERVAL_PROPERTY "
      + "MONITOR_BLOCK_INTERVAL_TYPE_PROPERTY "
      + "MONITOR_BLOCK_IS_RELATIVE_DEADLINE_PROPERTY "
      + "MONITOR_BLOCK_NAME_PROPERTY "
      + "MONITOR_BLOCK_RELATIVE_DEADLINE_TYPE_PROPERTY "
      + "MONITOR_BLOCK_SEARCH_SCRIPT_PROPERTY ";

    // Notice block properties
    const notice_block_properties_constants =
      "NOTICE_BLOCK_AFTER_FINISH_EVENT "
      + "NOTICE_BLOCK_ATTACHMENT_PROPERTY "
      + "NOTICE_BLOCK_ATTACHMENTS_RIGHTS_GROUP_PROPERTY "
      + "NOTICE_BLOCK_ATTACHMENTS_RIGHTS_TYPE_PROPERTY "
      + "NOTICE_BLOCK_BEFORE_START_EVENT "
      + "NOTICE_BLOCK_CREATED_NOTICES_PROPERTY "
      + "NOTICE_BLOCK_DEADLINE_PROPERTY "
      + "NOTICE_BLOCK_IS_RELATIVE_DEADLINE_PROPERTY "
      + "NOTICE_BLOCK_NAME_PROPERTY "
      + "NOTICE_BLOCK_NOTICE_TEXT_PROPERTY "
      + "NOTICE_BLOCK_PERFORMER_PROPERTY "
      + "NOTICE_BLOCK_RELATIVE_DEADLINE_TYPE_PROPERTY "
      + "NOTICE_BLOCK_SUBJECT_PROPERTY ";

    // Object events
    const object_events_constants =
      "dseAfterCancel "
      + "dseAfterClose "
      + "dseAfterDelete "
      + "dseAfterDeleteOutOfTransaction "
      + "dseAfterInsert "
      + "dseAfterOpen "
      + "dseAfterScroll "
      + "dseAfterUpdate "
      + "dseAfterUpdateOutOfTransaction "
      + "dseBeforeCancel "
      + "dseBeforeClose "
      + "dseBeforeDelete "
      + "dseBeforeDetailUpdate "
      + "dseBeforeInsert "
      + "dseBeforeOpen "
      + "dseBeforeUpdate "
      + "dseOnAnyRequisiteChange "
      + "dseOnCloseRecord "
      + "dseOnDeleteError "
      + "dseOnOpenRecord "
      + "dseOnPrepareUpdate "
      + "dseOnUpdateError "
      + "dseOnUpdateRatifiedRecord "
      + "dseOnValidDelete "
      + "dseOnValidUpdate "
      + "reOnChange "
      + "reOnChangeValues "
      + "SELECTION_BEGIN_ROUTE_EVENT "
      + "SELECTION_END_ROUTE_EVENT ";

    // Object params
    const object_params_constants =
      "CURRENT_PERIOD_IS_REQUIRED "
      + "PREVIOUS_CARD_TYPE_NAME "
      + "SHOW_RECORD_PROPERTIES_FORM ";

    // Other
    const other_constants =
      "ACCESS_RIGHTS_SETTING_DIALOG_CODE "
      + "ADMINISTRATOR_USER_CODE "
      + "ANALYTIC_REPORT_TYPE "
      + "asrtHideLocal "
      + "asrtHideRemote "
      + "CALCULATED_ROLE_TYPE_CODE "
      + "COMPONENTS_REFERENCE_DEVELOPER_VIEW_CODE "
      + "DCTS_TEST_PROTOCOLS_FOLDER_PATH "
      + "E_EDOC_VERSION_ALREADY_APPROVINGLY_SIGNED "
      + "E_EDOC_VERSION_ALREADY_APPROVINGLY_SIGNED_BY_USER "
      + "E_EDOC_VERSION_ALREDY_SIGNED "
      + "E_EDOC_VERSION_ALREDY_SIGNED_BY_USER "
      + "EDOC_TYPES_CODE_REQUISITE_FIELD_NAME "
      + "EDOCUMENTS_ALIAS_NAME "
      + "FILES_FOLDER_PATH "
      + "FILTER_OPERANDS_DELIMITER "
      + "FILTER_OPERATIONS_DELIMITER "
      + "FORMCARD_NAME "
      + "FORMLIST_NAME "
      + "GET_EXTENDED_DOCUMENT_EXTENSION_CREATION_MODE "
      + "GET_EXTENDED_DOCUMENT_EXTENSION_IMPORT_MODE "
      + "INTEGRATED_REPORT_TYPE "
      + "IS_BUILDER_APPLICATION_ROLE "
      + "IS_BUILDER_APPLICATION_ROLE2 "
      + "IS_BUILDER_USERS "
      + "ISBSYSDEV "
      + "LOG_FOLDER_PATH "
      + "mbCancel "
      + "mbNo "
      + "mbNoToAll "
      + "mbOK "
      + "mbYes "
      + "mbYesToAll "
      + "MEMORY_DATASET_DESRIPTIONS_FILENAME "
      + "mrNo "
      + "mrNoToAll "
      + "mrYes "
      + "mrYesToAll "
      + "MULTIPLE_SELECT_DIALOG_CODE "
      + "NONOPERATING_RECORD_FLAG_FEMININE "
      + "NONOPERATING_RECORD_FLAG_MASCULINE "
      + "OPERATING_RECORD_FLAG_FEMININE "
      + "OPERATING_RECORD_FLAG_MASCULINE "
      + "PROFILING_SETTINGS_COMMON_SETTINGS_CODE_VALUE "
      + "PROGRAM_INITIATED_LOOKUP_ACTION "
      + "ratDelete "
      + "ratEdit "
      + "ratInsert "
      + "REPORT_TYPE "
      + "REQUIRED_PICK_VALUES_VARIABLE "
      + "rmCard "
      + "rmList "
      + "SBRTE_PROGID_DEV "
      + "SBRTE_PROGID_RELEASE "
      + "STATIC_ROLE_TYPE_CODE "
      + "SUPPRESS_EMPTY_TEMPLATE_CREATION "
      + "SYSTEM_USER_CODE "
      + "UPDATE_DIALOG_DATASET "
      + "USED_IN_OBJECT_HINT_PARAM "
      + "USER_INITIATED_LOOKUP_ACTION "
      + "USER_NAME_FORMAT "
      + "USER_SELECTION_RESTRICTIONS "
      + "WORKFLOW_TEST_PROTOCOLS_FOLDER_PATH "
      + "ELS_SUBTYPE_CONTROL_NAME "
      + "ELS_FOLDER_KIND_CONTROL_NAME "
      + "REPEAT_PROCESS_CURRENT_OBJECT_EXCEPTION_NAME ";

    // Privileges
    const privileges_constants =
      "PRIVILEGE_COMPONENT_FULL_ACCESS "
      + "PRIVILEGE_DEVELOPMENT_EXPORT "
      + "PRIVILEGE_DEVELOPMENT_IMPORT "
      + "PRIVILEGE_DOCUMENT_DELETE "
      + "PRIVILEGE_ESD "
      + "PRIVILEGE_FOLDER_DELETE "
      + "PRIVILEGE_MANAGE_ACCESS_RIGHTS "
      + "PRIVILEGE_MANAGE_REPLICATION "
      + "PRIVILEGE_MANAGE_SESSION_SERVER "
      + "PRIVILEGE_OBJECT_FULL_ACCESS "
      + "PRIVILEGE_OBJECT_VIEW "
      + "PRIVILEGE_RESERVE_LICENSE "
      + "PRIVILEGE_SYSTEM_CUSTOMIZE "
      + "PRIVILEGE_SYSTEM_DEVELOP "
      + "PRIVILEGE_SYSTEM_INSTALL "
      + "PRIVILEGE_TASK_DELETE "
      + "PRIVILEGE_USER_PLUGIN_SETTINGS_CUSTOMIZE "
      + "PRIVILEGES_PSEUDOREFERENCE_CODE ";

    // Pseudoreference code
    const pseudoreference_code_constants =
      "ACCESS_TYPES_PSEUDOREFERENCE_CODE "
      + "ALL_AVAILABLE_COMPONENTS_PSEUDOREFERENCE_CODE "
      + "ALL_AVAILABLE_PRIVILEGES_PSEUDOREFERENCE_CODE "
      + "ALL_REPLICATE_COMPONENTS_PSEUDOREFERENCE_CODE "
      + "AVAILABLE_DEVELOPERS_COMPONENTS_PSEUDOREFERENCE_CODE "
      + "COMPONENTS_PSEUDOREFERENCE_CODE "
      + "FILTRATER_SETTINGS_CONFLICTS_PSEUDOREFERENCE_CODE "
      + "GROUPS_PSEUDOREFERENCE_CODE "
      + "RECEIVE_PROTOCOL_PSEUDOREFERENCE_CODE "
      + "REFERENCE_REQUISITE_PSEUDOREFERENCE_CODE "
      + "REFERENCE_REQUISITES_PSEUDOREFERENCE_CODE "
      + "REFTYPES_PSEUDOREFERENCE_CODE "
      + "REPLICATION_SEANCES_DIARY_PSEUDOREFERENCE_CODE "
      + "SEND_PROTOCOL_PSEUDOREFERENCE_CODE "
      + "SUBSTITUTES_PSEUDOREFERENCE_CODE "
      + "SYSTEM_SETTINGS_PSEUDOREFERENCE_CODE "
      + "UNITS_PSEUDOREFERENCE_CODE "
      + "USERS_PSEUDOREFERENCE_CODE "
      + "VIEWERS_PSEUDOREFERENCE_CODE ";

    // Requisite ISBCertificateType values
    const requisite_ISBCertificateType_values_constants =
      "CERTIFICATE_TYPE_ENCRYPT "
      + "CERTIFICATE_TYPE_SIGN "
      + "CERTIFICATE_TYPE_SIGN_AND_ENCRYPT ";

    // Requisite ISBEDocStorageType values
    const requisite_ISBEDocStorageType_values_constants =
      "STORAGE_TYPE_FILE "
      + "STORAGE_TYPE_NAS_CIFS "
      + "STORAGE_TYPE_SAPERION "
      + "STORAGE_TYPE_SQL_SERVER ";

    // Requisite CompType2 values
    const requisite_compType2_values_constants =
      "COMPTYPE2_REQUISITE_DOCUMENTS_VALUE "
      + "COMPTYPE2_REQUISITE_TASKS_VALUE "
      + "COMPTYPE2_REQUISITE_FOLDERS_VALUE "
      + "COMPTYPE2_REQUISITE_REFERENCES_VALUE ";

    // Requisite name
    const requisite_name_constants =
      "SYSREQ_CODE "
      + "SYSREQ_COMPTYPE2 "
      + "SYSREQ_CONST_AVAILABLE_FOR_WEB "
      + "SYSREQ_CONST_COMMON_CODE "
      + "SYSREQ_CONST_COMMON_VALUE "
      + "SYSREQ_CONST_FIRM_CODE "
      + "SYSREQ_CONST_FIRM_STATUS "
      + "SYSREQ_CONST_FIRM_VALUE "
      + "SYSREQ_CONST_SERVER_STATUS "
      + "SYSREQ_CONTENTS "
      + "SYSREQ_DATE_OPEN "
      + "SYSREQ_DATE_CLOSE "
      + "SYSREQ_DESCRIPTION "
      + "SYSREQ_DESCRIPTION_LOCALIZE_ID "
      + "SYSREQ_DOUBLE "
      + "SYSREQ_EDOC_ACCESS_TYPE "
      + "SYSREQ_EDOC_AUTHOR "
      + "SYSREQ_EDOC_CREATED "
      + "SYSREQ_EDOC_DELEGATE_RIGHTS_REQUISITE_CODE "
      + "SYSREQ_EDOC_EDITOR "
      + "SYSREQ_EDOC_ENCODE_TYPE "
      + "SYSREQ_EDOC_ENCRYPTION_PLUGIN_NAME "
      + "SYSREQ_EDOC_ENCRYPTION_PLUGIN_VERSION "
      + "SYSREQ_EDOC_EXPORT_DATE "
      + "SYSREQ_EDOC_EXPORTER "
      + "SYSREQ_EDOC_KIND "
      + "SYSREQ_EDOC_LIFE_STAGE_NAME "
      + "SYSREQ_EDOC_LOCKED_FOR_SERVER_CODE "
      + "SYSREQ_EDOC_MODIFIED "
      + "SYSREQ_EDOC_NAME "
      + "SYSREQ_EDOC_NOTE "
      + "SYSREQ_EDOC_QUALIFIED_ID "
      + "SYSREQ_EDOC_SESSION_KEY "
      + "SYSREQ_EDOC_SESSION_KEY_ENCRYPTION_PLUGIN_NAME "
      + "SYSREQ_EDOC_SESSION_KEY_ENCRYPTION_PLUGIN_VERSION "
      + "SYSREQ_EDOC_SIGNATURE_TYPE "
      + "SYSREQ_EDOC_SIGNED "
      + "SYSREQ_EDOC_STORAGE "
      + "SYSREQ_EDOC_STORAGES_ARCHIVE_STORAGE "
      + "SYSREQ_EDOC_STORAGES_CHECK_RIGHTS "
      + "SYSREQ_EDOC_STORAGES_COMPUTER_NAME "
      + "SYSREQ_EDOC_STORAGES_EDIT_IN_STORAGE "
      + "SYSREQ_EDOC_STORAGES_EXECUTIVE_STORAGE "
      + "SYSREQ_EDOC_STORAGES_FUNCTION "
      + "SYSREQ_EDOC_STORAGES_INITIALIZED "
      + "SYSREQ_EDOC_STORAGES_LOCAL_PATH "
      + "SYSREQ_EDOC_STORAGES_SAPERION_DATABASE_NAME "
      + "SYSREQ_EDOC_STORAGES_SEARCH_BY_TEXT "
      + "SYSREQ_EDOC_STORAGES_SERVER_NAME "
      + "SYSREQ_EDOC_STORAGES_SHARED_SOURCE_NAME "
      + "SYSREQ_EDOC_STORAGES_TYPE "
      + "SYSREQ_EDOC_TEXT_MODIFIED "
      + "SYSREQ_EDOC_TYPE_ACT_CODE "
      + "SYSREQ_EDOC_TYPE_ACT_DESCRIPTION "
      + "SYSREQ_EDOC_TYPE_ACT_DESCRIPTION_LOCALIZE_ID "
      + "SYSREQ_EDOC_TYPE_ACT_ON_EXECUTE "
      + "SYSREQ_EDOC_TYPE_ACT_ON_EXECUTE_EXISTS "
      + "SYSREQ_EDOC_TYPE_ACT_SECTION "
      + "SYSREQ_EDOC_TYPE_ADD_PARAMS "
      + "SYSREQ_EDOC_TYPE_COMMENT "
      + "SYSREQ_EDOC_TYPE_EVENT_TEXT "
      + "SYSREQ_EDOC_TYPE_NAME_IN_SINGULAR "
      + "SYSREQ_EDOC_TYPE_NAME_IN_SINGULAR_LOCALIZE_ID "
      + "SYSREQ_EDOC_TYPE_NAME_LOCALIZE_ID "
      + "SYSREQ_EDOC_TYPE_NUMERATION_METHOD "
      + "SYSREQ_EDOC_TYPE_PSEUDO_REQUISITE_CODE "
      + "SYSREQ_EDOC_TYPE_REQ_CODE "
      + "SYSREQ_EDOC_TYPE_REQ_DESCRIPTION "
      + "SYSREQ_EDOC_TYPE_REQ_DESCRIPTION_LOCALIZE_ID "
      + "SYSREQ_EDOC_TYPE_REQ_IS_LEADING "
      + "SYSREQ_EDOC_TYPE_REQ_IS_REQUIRED "
      + "SYSREQ_EDOC_TYPE_REQ_NUMBER "
      + "SYSREQ_EDOC_TYPE_REQ_ON_CHANGE "
      + "SYSREQ_EDOC_TYPE_REQ_ON_CHANGE_EXISTS "
      + "SYSREQ_EDOC_TYPE_REQ_ON_SELECT "
      + "SYSREQ_EDOC_TYPE_REQ_ON_SELECT_KIND "
      + "SYSREQ_EDOC_TYPE_REQ_SECTION "
      + "SYSREQ_EDOC_TYPE_VIEW_CARD "
      + "SYSREQ_EDOC_TYPE_VIEW_CODE "
      + "SYSREQ_EDOC_TYPE_VIEW_COMMENT "
      + "SYSREQ_EDOC_TYPE_VIEW_IS_MAIN "
      + "SYSREQ_EDOC_TYPE_VIEW_NAME "
      + "SYSREQ_EDOC_TYPE_VIEW_NAME_LOCALIZE_ID "
      + "SYSREQ_EDOC_VERSION_AUTHOR "
      + "SYSREQ_EDOC_VERSION_CRC "
      + "SYSREQ_EDOC_VERSION_DATA "
      + "SYSREQ_EDOC_VERSION_EDITOR "
      + "SYSREQ_EDOC_VERSION_EXPORT_DATE "
      + "SYSREQ_EDOC_VERSION_EXPORTER "
      + "SYSREQ_EDOC_VERSION_HIDDEN "
      + "SYSREQ_EDOC_VERSION_LIFE_STAGE "
      + "SYSREQ_EDOC_VERSION_MODIFIED "
      + "SYSREQ_EDOC_VERSION_NOTE "
      + "SYSREQ_EDOC_VERSION_SIGNATURE_TYPE "
      + "SYSREQ_EDOC_VERSION_SIGNED "
      + "SYSREQ_EDOC_VERSION_SIZE "
      + "SYSREQ_EDOC_VERSION_SOURCE "
      + "SYSREQ_EDOC_VERSION_TEXT_MODIFIED "
      + "SYSREQ_EDOCKIND_DEFAULT_VERSION_STATE_CODE "
      + "SYSREQ_FOLDER_KIND "
      + "SYSREQ_FUNC_CATEGORY "
      + "SYSREQ_FUNC_COMMENT "
      + "SYSREQ_FUNC_GROUP "
      + "SYSREQ_FUNC_GROUP_COMMENT "
      + "SYSREQ_FUNC_GROUP_NUMBER "
      + "SYSREQ_FUNC_HELP "
      + "SYSREQ_FUNC_PARAM_DEF_VALUE "
      + "SYSREQ_FUNC_PARAM_IDENT "
      + "SYSREQ_FUNC_PARAM_NUMBER "
      + "SYSREQ_FUNC_PARAM_TYPE "
      + "SYSREQ_FUNC_TEXT "
      + "SYSREQ_GROUP_CATEGORY "
      + "SYSREQ_ID "
      + "SYSREQ_LAST_UPDATE "
      + "SYSREQ_LEADER_REFERENCE "
      + "SYSREQ_LINE_NUMBER "
      + "SYSREQ_MAIN_RECORD_ID "
      + "SYSREQ_NAME "
      + "SYSREQ_NAME_LOCALIZE_ID "
      + "SYSREQ_NOTE "
      + "SYSREQ_ORIGINAL_RECORD "
      + "SYSREQ_OUR_FIRM "
      + "SYSREQ_PROFILING_SETTINGS_BATCH_LOGING "
      + "SYSREQ_PROFILING_SETTINGS_BATCH_SIZE "
      + "SYSREQ_PROFILING_SETTINGS_PROFILING_ENABLED "
      + "SYSREQ_PROFILING_SETTINGS_SQL_PROFILING_ENABLED "
      + "SYSREQ_PROFILING_SETTINGS_START_LOGGED "
      + "SYSREQ_RECORD_STATUS "
      + "SYSREQ_REF_REQ_FIELD_NAME "
      + "SYSREQ_REF_REQ_FORMAT "
      + "SYSREQ_REF_REQ_GENERATED "
      + "SYSREQ_REF_REQ_LENGTH "
      + "SYSREQ_REF_REQ_PRECISION "
      + "SYSREQ_REF_REQ_REFERENCE "
      + "SYSREQ_REF_REQ_SECTION "
      + "SYSREQ_REF_REQ_STORED "
      + "SYSREQ_REF_REQ_TOKENS "
      + "SYSREQ_REF_REQ_TYPE "
      + "SYSREQ_REF_REQ_VIEW "
      + "SYSREQ_REF_TYPE_ACT_CODE "
      + "SYSREQ_REF_TYPE_ACT_DESCRIPTION "
      + "SYSREQ_REF_TYPE_ACT_DESCRIPTION_LOCALIZE_ID "
      + "SYSREQ_REF_TYPE_ACT_ON_EXECUTE "
      + "SYSREQ_REF_TYPE_ACT_ON_EXECUTE_EXISTS "
      + "SYSREQ_REF_TYPE_ACT_SECTION "
      + "SYSREQ_REF_TYPE_ADD_PARAMS "
      + "SYSREQ_REF_TYPE_COMMENT "
      + "SYSREQ_REF_TYPE_COMMON_SETTINGS "
      + "SYSREQ_REF_TYPE_DISPLAY_REQUISITE_NAME "
      + "SYSREQ_REF_TYPE_EVENT_TEXT "
      + "SYSREQ_REF_TYPE_MAIN_LEADING_REF "
      + "SYSREQ_REF_TYPE_NAME_IN_SINGULAR "
      + "SYSREQ_REF_TYPE_NAME_IN_SINGULAR_LOCALIZE_ID "
      + "SYSREQ_REF_TYPE_NAME_LOCALIZE_ID "
      + "SYSREQ_REF_TYPE_NUMERATION_METHOD "
      + "SYSREQ_REF_TYPE_REQ_CODE "
      + "SYSREQ_REF_TYPE_REQ_DESCRIPTION "
      + "SYSREQ_REF_TYPE_REQ_DESCRIPTION_LOCALIZE_ID "
      + "SYSREQ_REF_TYPE_REQ_IS_CONTROL "
      + "SYSREQ_REF_TYPE_REQ_IS_FILTER "
      + "SYSREQ_REF_TYPE_REQ_IS_LEADING "
      + "SYSREQ_REF_TYPE_REQ_IS_REQUIRED "
      + "SYSREQ_REF_TYPE_REQ_NUMBER "
      + "SYSREQ_REF_TYPE_REQ_ON_CHANGE "
      + "SYSREQ_REF_TYPE_REQ_ON_CHANGE_EXISTS "
      + "SYSREQ_REF_TYPE_REQ_ON_SELECT "
      + "SYSREQ_REF_TYPE_REQ_ON_SELECT_KIND "
      + "SYSREQ_REF_TYPE_REQ_SECTION "
      + "SYSREQ_REF_TYPE_VIEW_CARD "
      + "SYSREQ_REF_TYPE_VIEW_CODE "
      + "SYSREQ_REF_TYPE_VIEW_COMMENT "
      + "SYSREQ_REF_TYPE_VIEW_IS_MAIN "
      + "SYSREQ_REF_TYPE_VIEW_NAME "
      + "SYSREQ_REF_TYPE_VIEW_NAME_LOCALIZE_ID "
      + "SYSREQ_REFERENCE_TYPE_ID "
      + "SYSREQ_STATE "
      + "SYSREQ_STATЕ "
      + "SYSREQ_SYSTEM_SETTINGS_VALUE "
      + "SYSREQ_TYPE "
      + "SYSREQ_UNIT "
      + "SYSREQ_UNIT_ID "
      + "SYSREQ_USER_GROUPS_GROUP_FULL_NAME "
      + "SYSREQ_USER_GROUPS_GROUP_NAME "
      + "SYSREQ_USER_GROUPS_GROUP_SERVER_NAME "
      + "SYSREQ_USERS_ACCESS_RIGHTS "
      + "SYSREQ_USERS_AUTHENTICATION "
      + "SYSREQ_USERS_CATEGORY "
      + "SYSREQ_USERS_COMPONENT "
      + "SYSREQ_USERS_COMPONENT_USER_IS_PUBLIC "
      + "SYSREQ_USERS_DOMAIN "
      + "SYSREQ_USERS_FULL_USER_NAME "
      + "SYSREQ_USERS_GROUP "
      + "SYSREQ_USERS_IS_MAIN_SERVER "
      + "SYSREQ_USERS_LOGIN "
      + "SYSREQ_USERS_REFERENCE_USER_IS_PUBLIC "
      + "SYSREQ_USERS_STATUS "
      + "SYSREQ_USERS_USER_CERTIFICATE "
      + "SYSREQ_USERS_USER_CERTIFICATE_INFO "
      + "SYSREQ_USERS_USER_CERTIFICATE_PLUGIN_NAME "
      + "SYSREQ_USERS_USER_CERTIFICATE_PLUGIN_VERSION "
      + "SYSREQ_USERS_USER_CERTIFICATE_STATE "
      + "SYSREQ_USERS_USER_CERTIFICATE_SUBJECT_NAME "
      + "SYSREQ_USERS_USER_CERTIFICATE_THUMBPRINT "
      + "SYSREQ_USERS_USER_DEFAULT_CERTIFICATE "
      + "SYSREQ_USERS_USER_DESCRIPTION "
      + "SYSREQ_USERS_USER_GLOBAL_NAME "
      + "SYSREQ_USERS_USER_LOGIN "
      + "SYSREQ_USERS_USER_MAIN_SERVER "
      + "SYSREQ_USERS_USER_TYPE "
      + "SYSREQ_WORK_RULES_FOLDER_ID ";

    // Result
    const result_constants = "RESULT_VAR_NAME RESULT_VAR_NAME_ENG ";

    // Rule identification
    const rule_identification_constants =
      "AUTO_NUMERATION_RULE_ID "
      + "CANT_CHANGE_ID_REQUISITE_RULE_ID "
      + "CANT_CHANGE_OURFIRM_REQUISITE_RULE_ID "
      + "CHECK_CHANGING_REFERENCE_RECORD_USE_RULE_ID "
      + "CHECK_CODE_REQUISITE_RULE_ID "
      + "CHECK_DELETING_REFERENCE_RECORD_USE_RULE_ID "
      + "CHECK_FILTRATER_CHANGES_RULE_ID "
      + "CHECK_RECORD_INTERVAL_RULE_ID "
      + "CHECK_REFERENCE_INTERVAL_RULE_ID "
      + "CHECK_REQUIRED_DATA_FULLNESS_RULE_ID "
      + "CHECK_REQUIRED_REQUISITES_FULLNESS_RULE_ID "
      + "MAKE_RECORD_UNRATIFIED_RULE_ID "
      + "RESTORE_AUTO_NUMERATION_RULE_ID "
      + "SET_FIRM_CONTEXT_FROM_RECORD_RULE_ID "
      + "SET_FIRST_RECORD_IN_LIST_FORM_RULE_ID "
      + "SET_IDSPS_VALUE_RULE_ID "
      + "SET_NEXT_CODE_VALUE_RULE_ID "
      + "SET_OURFIRM_BOUNDS_RULE_ID "
      + "SET_OURFIRM_REQUISITE_RULE_ID ";

    // Script block properties
    const script_block_properties_constants =
      "SCRIPT_BLOCK_AFTER_FINISH_EVENT "
      + "SCRIPT_BLOCK_BEFORE_START_EVENT "
      + "SCRIPT_BLOCK_EXECUTION_RESULTS_PROPERTY "
      + "SCRIPT_BLOCK_NAME_PROPERTY "
      + "SCRIPT_BLOCK_SCRIPT_PROPERTY ";

    // Subtask block properties
    const subtask_block_properties_constants =
      "SUBTASK_BLOCK_ABORT_DEADLINE_PROPERTY "
      + "SUBTASK_BLOCK_AFTER_FINISH_EVENT "
      + "SUBTASK_BLOCK_ASSIGN_PARAMS_EVENT "
      + "SUBTASK_BLOCK_ATTACHMENTS_PROPERTY "
      + "SUBTASK_BLOCK_ATTACHMENTS_RIGHTS_GROUP_PROPERTY "
      + "SUBTASK_BLOCK_ATTACHMENTS_RIGHTS_TYPE_PROPERTY "
      + "SUBTASK_BLOCK_BEFORE_START_EVENT "
      + "SUBTASK_BLOCK_CREATED_TASK_PROPERTY "
      + "SUBTASK_BLOCK_CREATION_EVENT "
      + "SUBTASK_BLOCK_DEADLINE_PROPERTY "
      + "SUBTASK_BLOCK_IMPORTANCE_PROPERTY "
      + "SUBTASK_BLOCK_INITIATOR_PROPERTY "
      + "SUBTASK_BLOCK_IS_RELATIVE_ABORT_DEADLINE_PROPERTY "
      + "SUBTASK_BLOCK_IS_RELATIVE_DEADLINE_PROPERTY "
      + "SUBTASK_BLOCK_JOBS_TYPE_PROPERTY "
      + "SUBTASK_BLOCK_NAME_PROPERTY "
      + "SUBTASK_BLOCK_PARALLEL_ROUTE_PROPERTY "
      + "SUBTASK_BLOCK_PERFORMERS_PROPERTY "
      + "SUBTASK_BLOCK_RELATIVE_ABORT_DEADLINE_TYPE_PROPERTY "
      + "SUBTASK_BLOCK_RELATIVE_DEADLINE_TYPE_PROPERTY "
      + "SUBTASK_BLOCK_REQUIRE_SIGN_PROPERTY "
      + "SUBTASK_BLOCK_STANDARD_ROUTE_PROPERTY "
      + "SUBTASK_BLOCK_START_EVENT "
      + "SUBTASK_BLOCK_STEP_CONTROL_PROPERTY "
      + "SUBTASK_BLOCK_SUBJECT_PROPERTY "
      + "SUBTASK_BLOCK_TASK_CONTROL_PROPERTY "
      + "SUBTASK_BLOCK_TEXT_PROPERTY "
      + "SUBTASK_BLOCK_UNLOCK_ATTACHMENTS_ON_STOP_PROPERTY "
      + "SUBTASK_BLOCK_USE_STANDARD_ROUTE_PROPERTY "
      + "SUBTASK_BLOCK_WAIT_FOR_TASK_COMPLETE_PROPERTY ";

    // System component
    const system_component_constants =
      "SYSCOMP_CONTROL_JOBS "
      + "SYSCOMP_FOLDERS "
      + "SYSCOMP_JOBS "
      + "SYSCOMP_NOTICES "
      + "SYSCOMP_TASKS ";

    // System dialogs
    const system_dialogs_constants =
      "SYSDLG_CREATE_EDOCUMENT "
      + "SYSDLG_CREATE_EDOCUMENT_VERSION "
      + "SYSDLG_CURRENT_PERIOD "
      + "SYSDLG_EDIT_FUNCTION_HELP "
      + "SYSDLG_EDOCUMENT_KINDS_FOR_TEMPLATE "
      + "SYSDLG_EXPORT_MULTIPLE_EDOCUMENTS "
      + "SYSDLG_EXPORT_SINGLE_EDOCUMENT "
      + "SYSDLG_IMPORT_EDOCUMENT "
      + "SYSDLG_MULTIPLE_SELECT "
      + "SYSDLG_SETUP_ACCESS_RIGHTS "
      + "SYSDLG_SETUP_DEFAULT_RIGHTS "
      + "SYSDLG_SETUP_FILTER_CONDITION "
      + "SYSDLG_SETUP_SIGN_RIGHTS "
      + "SYSDLG_SETUP_TASK_OBSERVERS "
      + "SYSDLG_SETUP_TASK_ROUTE "
      + "SYSDLG_SETUP_USERS_LIST "
      + "SYSDLG_SIGN_EDOCUMENT "
      + "SYSDLG_SIGN_MULTIPLE_EDOCUMENTS ";

    // System reference names
    const system_reference_names_constants =
      "SYSREF_ACCESS_RIGHTS_TYPES "
      + "SYSREF_ADMINISTRATION_HISTORY "
      + "SYSREF_ALL_AVAILABLE_COMPONENTS "
      + "SYSREF_ALL_AVAILABLE_PRIVILEGES "
      + "SYSREF_ALL_REPLICATING_COMPONENTS "
      + "SYSREF_AVAILABLE_DEVELOPERS_COMPONENTS "
      + "SYSREF_CALENDAR_EVENTS "
      + "SYSREF_COMPONENT_TOKEN_HISTORY "
      + "SYSREF_COMPONENT_TOKENS "
      + "SYSREF_COMPONENTS "
      + "SYSREF_CONSTANTS "
      + "SYSREF_DATA_RECEIVE_PROTOCOL "
      + "SYSREF_DATA_SEND_PROTOCOL "
      + "SYSREF_DIALOGS "
      + "SYSREF_DIALOGS_REQUISITES "
      + "SYSREF_EDITORS "
      + "SYSREF_EDOC_CARDS "
      + "SYSREF_EDOC_TYPES "
      + "SYSREF_EDOCUMENT_CARD_REQUISITES "
      + "SYSREF_EDOCUMENT_CARD_TYPES "
      + "SYSREF_EDOCUMENT_CARD_TYPES_REFERENCE "
      + "SYSREF_EDOCUMENT_CARDS "
      + "SYSREF_EDOCUMENT_HISTORY "
      + "SYSREF_EDOCUMENT_KINDS "
      + "SYSREF_EDOCUMENT_REQUISITES "
      + "SYSREF_EDOCUMENT_SIGNATURES "
      + "SYSREF_EDOCUMENT_TEMPLATES "
      + "SYSREF_EDOCUMENT_TEXT_STORAGES "
      + "SYSREF_EDOCUMENT_VIEWS "
      + "SYSREF_FILTERER_SETUP_CONFLICTS "
      + "SYSREF_FILTRATER_SETTING_CONFLICTS "
      + "SYSREF_FOLDER_HISTORY "
      + "SYSREF_FOLDERS "
      + "SYSREF_FUNCTION_GROUPS "
      + "SYSREF_FUNCTION_PARAMS "
      + "SYSREF_FUNCTIONS "
      + "SYSREF_JOB_HISTORY "
      + "SYSREF_LINKS "
      + "SYSREF_LOCALIZATION_DICTIONARY "
      + "SYSREF_LOCALIZATION_LANGUAGES "
      + "SYSREF_MODULES "
      + "SYSREF_PRIVILEGES "
      + "SYSREF_RECORD_HISTORY "
      + "SYSREF_REFERENCE_REQUISITES "
      + "SYSREF_REFERENCE_TYPE_VIEWS "
      + "SYSREF_REFERENCE_TYPES "
      + "SYSREF_REFERENCES "
      + "SYSREF_REFERENCES_REQUISITES "
      + "SYSREF_REMOTE_SERVERS "
      + "SYSREF_REPLICATION_SESSIONS_LOG "
      + "SYSREF_REPLICATION_SESSIONS_PROTOCOL "
      + "SYSREF_REPORTS "
      + "SYSREF_ROLES "
      + "SYSREF_ROUTE_BLOCK_GROUPS "
      + "SYSREF_ROUTE_BLOCKS "
      + "SYSREF_SCRIPTS "
      + "SYSREF_SEARCHES "
      + "SYSREF_SERVER_EVENTS "
      + "SYSREF_SERVER_EVENTS_HISTORY "
      + "SYSREF_STANDARD_ROUTE_GROUPS "
      + "SYSREF_STANDARD_ROUTES "
      + "SYSREF_STATUSES "
      + "SYSREF_SYSTEM_SETTINGS "
      + "SYSREF_TASK_HISTORY "
      + "SYSREF_TASK_KIND_GROUPS "
      + "SYSREF_TASK_KINDS "
      + "SYSREF_TASK_RIGHTS "
      + "SYSREF_TASK_SIGNATURES "
      + "SYSREF_TASKS "
      + "SYSREF_UNITS "
      + "SYSREF_USER_GROUPS "
      + "SYSREF_USER_GROUPS_REFERENCE "
      + "SYSREF_USER_SUBSTITUTION "
      + "SYSREF_USERS "
      + "SYSREF_USERS_REFERENCE "
      + "SYSREF_VIEWERS "
      + "SYSREF_WORKING_TIME_CALENDARS ";

    // Table name
    const table_name_constants =
      "ACCESS_RIGHTS_TABLE_NAME "
      + "EDMS_ACCESS_TABLE_NAME "
      + "EDOC_TYPES_TABLE_NAME ";

    // Test
    const test_constants =
      "TEST_DEV_DB_NAME "
      + "TEST_DEV_SYSTEM_CODE "
      + "TEST_EDMS_DB_NAME "
      + "TEST_EDMS_MAIN_CODE "
      + "TEST_EDMS_MAIN_DB_NAME "
      + "TEST_EDMS_SECOND_CODE "
      + "TEST_EDMS_SECOND_DB_NAME "
      + "TEST_EDMS_SYSTEM_CODE "
      + "TEST_ISB5_MAIN_CODE "
      + "TEST_ISB5_SECOND_CODE "
      + "TEST_SQL_SERVER_2005_NAME "
      + "TEST_SQL_SERVER_NAME ";

    // Using the dialog windows
    const using_the_dialog_windows_constants =
      "ATTENTION_CAPTION "
      + "cbsCommandLinks "
      + "cbsDefault "
      + "CONFIRMATION_CAPTION "
      + "ERROR_CAPTION "
      + "INFORMATION_CAPTION "
      + "mrCancel "
      + "mrOk ";

    // Using the document
    const using_the_document_constants =
      "EDOC_VERSION_ACTIVE_STAGE_CODE "
      + "EDOC_VERSION_DESIGN_STAGE_CODE "
      + "EDOC_VERSION_OBSOLETE_STAGE_CODE ";

    // Using the EA and encryption
    const using_the_EA_and_encryption_constants =
      "cpDataEnciphermentEnabled "
      + "cpDigitalSignatureEnabled "
      + "cpID "
      + "cpIssuer "
      + "cpPluginVersion "
      + "cpSerial "
      + "cpSubjectName "
      + "cpSubjSimpleName "
      + "cpValidFromDate "
      + "cpValidToDate ";

    // Using the ISBL-editor
    const using_the_ISBL_editor_constants =
      "ISBL_SYNTAX " + "NO_SYNTAX " + "XML_SYNTAX ";

    // Wait block properties
    const wait_block_properties_constants =
      "WAIT_BLOCK_AFTER_FINISH_EVENT "
      + "WAIT_BLOCK_BEFORE_START_EVENT "
      + "WAIT_BLOCK_DEADLINE_PROPERTY "
      + "WAIT_BLOCK_IS_RELATIVE_DEADLINE_PROPERTY "
      + "WAIT_BLOCK_NAME_PROPERTY "
      + "WAIT_BLOCK_RELATIVE_DEADLINE_TYPE_PROPERTY ";

    // SYSRES Common
    const sysres_common_constants =
      "SYSRES_COMMON "
      + "SYSRES_CONST "
      + "SYSRES_MBFUNC "
      + "SYSRES_SBDATA "
      + "SYSRES_SBGUI "
      + "SYSRES_SBINTF "
      + "SYSRES_SBREFDSC "
      + "SYSRES_SQLERRORS "
      + "SYSRES_SYSCOMP ";

    // Константы ==> built_in
    const CONSTANTS =
      sysres_constants
      + base_constants
      + base_group_name_constants
      + decision_block_properties_constants
      + file_extension_constants
      + job_block_properties_constants
      + language_code_constants
      + launching_external_applications_constants
      + link_kind_constants
      + lock_type_constants
      + monitor_block_properties_constants
      + notice_block_properties_constants
      + object_events_constants
      + object_params_constants
      + other_constants
      + privileges_constants
      + pseudoreference_code_constants
      + requisite_ISBCertificateType_values_constants
      + requisite_ISBEDocStorageType_values_constants
      + requisite_compType2_values_constants
      + requisite_name_constants
      + result_constants
      + rule_identification_constants
      + script_block_properties_constants
      + subtask_block_properties_constants
      + system_component_constants
      + system_dialogs_constants
      + system_reference_names_constants
      + table_name_constants
      + test_constants
      + using_the_dialog_windows_constants
      + using_the_document_constants
      + using_the_EA_and_encryption_constants
      + using_the_ISBL_editor_constants
      + wait_block_properties_constants
      + sysres_common_constants;

    // enum TAccountType
    const TAccountType = "atUser atGroup atRole ";

    // enum TActionEnabledMode
    const TActionEnabledMode =
      "aemEnabledAlways "
      + "aemDisabledAlways "
      + "aemEnabledOnBrowse "
      + "aemEnabledOnEdit "
      + "aemDisabledOnBrowseEmpty ";

    // enum TAddPosition
    const TAddPosition = "apBegin apEnd ";

    // enum TAlignment
    const TAlignment = "alLeft alRight ";

    // enum TAreaShowMode
    const TAreaShowMode =
      "asmNever "
      + "asmNoButCustomize "
      + "asmAsLastTime "
      + "asmYesButCustomize "
      + "asmAlways ";

    // enum TCertificateInvalidationReason
    const TCertificateInvalidationReason = "cirCommon cirRevoked ";

    // enum TCertificateType
    const TCertificateType = "ctSignature ctEncode ctSignatureEncode ";

    // enum TCheckListBoxItemState
    const TCheckListBoxItemState = "clbUnchecked clbChecked clbGrayed ";

    // enum TCloseOnEsc
    const TCloseOnEsc = "ceISB ceAlways ceNever ";

    // enum TCompType
    const TCompType =
      "ctDocument "
      + "ctReference "
      + "ctScript "
      + "ctUnknown "
      + "ctReport "
      + "ctDialog "
      + "ctFunction "
      + "ctFolder "
      + "ctEDocument "
      + "ctTask "
      + "ctJob "
      + "ctNotice "
      + "ctControlJob ";

    // enum TConditionFormat
    const TConditionFormat = "cfInternal cfDisplay ";

    // enum TConnectionIntent
    const TConnectionIntent = "ciUnspecified ciWrite ciRead ";

    // enum TContentKind
    const TContentKind =
      "ckFolder "
      + "ckEDocument "
      + "ckTask "
      + "ckJob "
      + "ckComponentToken "
      + "ckAny "
      + "ckReference "
      + "ckScript "
      + "ckReport "
      + "ckDialog ";

    // enum TControlType
    const TControlType =
      "ctISBLEditor "
      + "ctBevel "
      + "ctButton "
      + "ctCheckListBox "
      + "ctComboBox "
      + "ctComboEdit "
      + "ctGrid "
      + "ctDBCheckBox "
      + "ctDBComboBox "
      + "ctDBEdit "
      + "ctDBEllipsis "
      + "ctDBMemo "
      + "ctDBNavigator "
      + "ctDBRadioGroup "
      + "ctDBStatusLabel "
      + "ctEdit "
      + "ctGroupBox "
      + "ctInplaceHint "
      + "ctMemo "
      + "ctPanel "
      + "ctListBox "
      + "ctRadioButton "
      + "ctRichEdit "
      + "ctTabSheet "
      + "ctWebBrowser "
      + "ctImage "
      + "ctHyperLink "
      + "ctLabel "
      + "ctDBMultiEllipsis "
      + "ctRibbon "
      + "ctRichView "
      + "ctInnerPanel "
      + "ctPanelGroup "
      + "ctBitButton ";

    // enum TCriterionContentType
    const TCriterionContentType =
      "cctDate "
      + "cctInteger "
      + "cctNumeric "
      + "cctPick "
      + "cctReference "
      + "cctString "
      + "cctText ";

    // enum TCultureType
    const TCultureType = "cltInternal cltPrimary cltGUI ";

    // enum TDataSetEventType
    const TDataSetEventType =
      "dseBeforeOpen "
      + "dseAfterOpen "
      + "dseBeforeClose "
      + "dseAfterClose "
      + "dseOnValidDelete "
      + "dseBeforeDelete "
      + "dseAfterDelete "
      + "dseAfterDeleteOutOfTransaction "
      + "dseOnDeleteError "
      + "dseBeforeInsert "
      + "dseAfterInsert "
      + "dseOnValidUpdate "
      + "dseBeforeUpdate "
      + "dseOnUpdateRatifiedRecord "
      + "dseAfterUpdate "
      + "dseAfterUpdateOutOfTransaction "
      + "dseOnUpdateError "
      + "dseAfterScroll "
      + "dseOnOpenRecord "
      + "dseOnCloseRecord "
      + "dseBeforeCancel "
      + "dseAfterCancel "
      + "dseOnUpdateDeadlockError "
      + "dseBeforeDetailUpdate "
      + "dseOnPrepareUpdate "
      + "dseOnAnyRequisiteChange ";

    // enum TDataSetState
    const TDataSetState = "dssEdit dssInsert dssBrowse dssInActive ";

    // enum TDateFormatType
    const TDateFormatType = "dftDate dftShortDate dftDateTime dftTimeStamp ";

    // enum TDateOffsetType
    const TDateOffsetType = "dotDays dotHours dotMinutes dotSeconds ";

    // enum TDateTimeKind
    const TDateTimeKind = "dtkndLocal dtkndUTC ";

    // enum TDeaAccessRights
    const TDeaAccessRights = "arNone arView arEdit arFull ";

    // enum TDocumentDefaultAction
    const TDocumentDefaultAction = "ddaView ddaEdit ";

    // enum TEditMode
    const TEditMode =
      "emLock "
      + "emEdit "
      + "emSign "
      + "emExportWithLock "
      + "emImportWithUnlock "
      + "emChangeVersionNote "
      + "emOpenForModify "
      + "emChangeLifeStage "
      + "emDelete "
      + "emCreateVersion "
      + "emImport "
      + "emUnlockExportedWithLock "
      + "emStart "
      + "emAbort "
      + "emReInit "
      + "emMarkAsReaded "
      + "emMarkAsUnreaded "
      + "emPerform "
      + "emAccept "
      + "emResume "
      + "emChangeRights "
      + "emEditRoute "
      + "emEditObserver "
      + "emRecoveryFromLocalCopy "
      + "emChangeWorkAccessType "
      + "emChangeEncodeTypeToCertificate "
      + "emChangeEncodeTypeToPassword "
      + "emChangeEncodeTypeToNone "
      + "emChangeEncodeTypeToCertificatePassword "
      + "emChangeStandardRoute "
      + "emGetText "
      + "emOpenForView "
      + "emMoveToStorage "
      + "emCreateObject "
      + "emChangeVersionHidden "
      + "emDeleteVersion "
      + "emChangeLifeCycleStage "
      + "emApprovingSign "
      + "emExport "
      + "emContinue "
      + "emLockFromEdit "
      + "emUnLockForEdit "
      + "emLockForServer "
      + "emUnlockFromServer "
      + "emDelegateAccessRights "
      + "emReEncode ";

    // enum TEditorCloseObservType
    const TEditorCloseObservType = "ecotFile ecotProcess ";

    // enum TEdmsApplicationAction
    const TEdmsApplicationAction = "eaGet eaCopy eaCreate eaCreateStandardRoute ";

    // enum TEDocumentLockType
    const TEDocumentLockType = "edltAll edltNothing edltQuery ";

    // enum TEDocumentStepShowMode
    const TEDocumentStepShowMode = "essmText essmCard ";

    // enum TEDocumentStepVersionType
    const TEDocumentStepVersionType = "esvtLast esvtLastActive esvtSpecified ";

    // enum TEDocumentStorageFunction
    const TEDocumentStorageFunction = "edsfExecutive edsfArchive ";

    // enum TEDocumentStorageType
    const TEDocumentStorageType = "edstSQLServer edstFile ";

    // enum TEDocumentVersionSourceType
    const TEDocumentVersionSourceType =
      "edvstNone edvstEDocumentVersionCopy edvstFile edvstTemplate edvstScannedFile ";

    // enum TEDocumentVersionState
    const TEDocumentVersionState = "vsDefault vsDesign vsActive vsObsolete ";

    // enum TEncodeType
    const TEncodeType = "etNone etCertificate etPassword etCertificatePassword ";

    // enum TExceptionCategory
    const TExceptionCategory = "ecException ecWarning ecInformation ";

    // enum TExportedSignaturesType
    const TExportedSignaturesType = "estAll estApprovingOnly ";

    // enum TExportedVersionType
    const TExportedVersionType = "evtLast evtLastActive evtQuery ";

    // enum TFieldDataType
    const TFieldDataType =
      "fdtString "
      + "fdtNumeric "
      + "fdtInteger "
      + "fdtDate "
      + "fdtText "
      + "fdtUnknown "
      + "fdtWideString "
      + "fdtLargeInteger ";

    // enum TFolderType
    const TFolderType =
      "ftInbox "
      + "ftOutbox "
      + "ftFavorites "
      + "ftCommonFolder "
      + "ftUserFolder "
      + "ftComponents "
      + "ftQuickLaunch "
      + "ftShortcuts "
      + "ftSearch ";

    // enum TGridRowHeight
    const TGridRowHeight = "grhAuto " + "grhX1 " + "grhX2 " + "grhX3 ";

    // enum THyperlinkType
    const THyperlinkType = "hltText " + "hltRTF " + "hltHTML ";

    // enum TImageFileFormat
    const TImageFileFormat =
      "iffBMP "
      + "iffJPEG "
      + "iffMultiPageTIFF "
      + "iffSinglePageTIFF "
      + "iffTIFF "
      + "iffPNG ";

    // enum TImageMode
    const TImageMode = "im8bGrayscale " + "im24bRGB " + "im1bMonochrome ";

    // enum TImageType
    const TImageType = "itBMP " + "itJPEG " + "itWMF " + "itPNG ";

    // enum TInplaceHintKind
    const TInplaceHintKind =
      "ikhInformation " + "ikhWarning " + "ikhError " + "ikhNoIcon ";

    // enum TISBLContext
    const TISBLContext =
      "icUnknown "
      + "icScript "
      + "icFunction "
      + "icIntegratedReport "
      + "icAnalyticReport "
      + "icDataSetEventHandler "
      + "icActionHandler "
      + "icFormEventHandler "
      + "icLookUpEventHandler "
      + "icRequisiteChangeEventHandler "
      + "icBeforeSearchEventHandler "
      + "icRoleCalculation "
      + "icSelectRouteEventHandler "
      + "icBlockPropertyCalculation "
      + "icBlockQueryParamsEventHandler "
      + "icChangeSearchResultEventHandler "
      + "icBlockEventHandler "
      + "icSubTaskInitEventHandler "
      + "icEDocDataSetEventHandler "
      + "icEDocLookUpEventHandler "
      + "icEDocActionHandler "
      + "icEDocFormEventHandler "
      + "icEDocRequisiteChangeEventHandler "
      + "icStructuredConversionRule "
      + "icStructuredConversionEventBefore "
      + "icStructuredConversionEventAfter "
      + "icWizardEventHandler "
      + "icWizardFinishEventHandler "
      + "icWizardStepEventHandler "
      + "icWizardStepFinishEventHandler "
      + "icWizardActionEnableEventHandler "
      + "icWizardActionExecuteEventHandler "
      + "icCreateJobsHandler "
      + "icCreateNoticesHandler "
      + "icBeforeLookUpEventHandler "
      + "icAfterLookUpEventHandler "
      + "icTaskAbortEventHandler "
      + "icWorkflowBlockActionHandler "
      + "icDialogDataSetEventHandler "
      + "icDialogActionHandler "
      + "icDialogLookUpEventHandler "
      + "icDialogRequisiteChangeEventHandler "
      + "icDialogFormEventHandler "
      + "icDialogValidCloseEventHandler "
      + "icBlockFormEventHandler "
      + "icTaskFormEventHandler "
      + "icReferenceMethod "
      + "icEDocMethod "
      + "icDialogMethod "
      + "icProcessMessageHandler ";

    // enum TItemShow
    const TItemShow = "isShow " + "isHide " + "isByUserSettings ";

    // enum TJobKind
    const TJobKind = "jkJob " + "jkNotice " + "jkControlJob ";

    // enum TJoinType
    const TJoinType = "jtInner " + "jtLeft " + "jtRight " + "jtFull " + "jtCross ";

    // enum TLabelPos
    const TLabelPos = "lbpAbove " + "lbpBelow " + "lbpLeft " + "lbpRight ";

    // enum TLicensingType
    const TLicensingType = "eltPerConnection " + "eltPerUser ";

    // enum TLifeCycleStageFontColor
    const TLifeCycleStageFontColor =
      "sfcUndefined "
      + "sfcBlack "
      + "sfcGreen "
      + "sfcRed "
      + "sfcBlue "
      + "sfcOrange "
      + "sfcLilac ";

    // enum TLifeCycleStageFontStyle
    const TLifeCycleStageFontStyle = "sfsItalic " + "sfsStrikeout " + "sfsNormal ";

    // enum TLockableDevelopmentComponentType
    const TLockableDevelopmentComponentType =
      "ldctStandardRoute "
      + "ldctWizard "
      + "ldctScript "
      + "ldctFunction "
      + "ldctRouteBlock "
      + "ldctIntegratedReport "
      + "ldctAnalyticReport "
      + "ldctReferenceType "
      + "ldctEDocumentType "
      + "ldctDialog "
      + "ldctServerEvents ";

    // enum TMaxRecordCountRestrictionType
    const TMaxRecordCountRestrictionType =
      "mrcrtNone " + "mrcrtUser " + "mrcrtMaximal " + "mrcrtCustom ";

    // enum TRangeValueType
    const TRangeValueType =
      "vtEqual " + "vtGreaterOrEqual " + "vtLessOrEqual " + "vtRange ";

    // enum TRelativeDate
    const TRelativeDate =
      "rdYesterday "
      + "rdToday "
      + "rdTomorrow "
      + "rdThisWeek "
      + "rdThisMonth "
      + "rdThisYear "
      + "rdNextMonth "
      + "rdNextWeek "
      + "rdLastWeek "
      + "rdLastMonth ";

    // enum TReportDestination
    const TReportDestination = "rdWindow " + "rdFile " + "rdPrinter ";

    // enum TReqDataType
    const TReqDataType =
      "rdtString "
      + "rdtNumeric "
      + "rdtInteger "
      + "rdtDate "
      + "rdtReference "
      + "rdtAccount "
      + "rdtText "
      + "rdtPick "
      + "rdtUnknown "
      + "rdtLargeInteger "
      + "rdtDocument ";

    // enum TRequisiteEventType
    const TRequisiteEventType = "reOnChange " + "reOnChangeValues ";

    // enum TSBTimeType
    const TSBTimeType = "ttGlobal " + "ttLocal " + "ttUser " + "ttSystem ";

    // enum TSearchShowMode
    const TSearchShowMode =
      "ssmBrowse " + "ssmSelect " + "ssmMultiSelect " + "ssmBrowseModal ";

    // enum TSelectMode
    const TSelectMode = "smSelect " + "smLike " + "smCard ";

    // enum TSignatureType
    const TSignatureType = "stNone " + "stAuthenticating " + "stApproving ";

    // enum TSignerContentType
    const TSignerContentType = "sctString " + "sctStream ";

    // enum TStringsSortType
    const TStringsSortType = "sstAnsiSort " + "sstNaturalSort ";

    // enum TStringValueType
    const TStringValueType = "svtEqual " + "svtContain ";

    // enum TStructuredObjectAttributeType
    const TStructuredObjectAttributeType =
      "soatString "
      + "soatNumeric "
      + "soatInteger "
      + "soatDatetime "
      + "soatReferenceRecord "
      + "soatText "
      + "soatPick "
      + "soatBoolean "
      + "soatEDocument "
      + "soatAccount "
      + "soatIntegerCollection "
      + "soatNumericCollection "
      + "soatStringCollection "
      + "soatPickCollection "
      + "soatDatetimeCollection "
      + "soatBooleanCollection "
      + "soatReferenceRecordCollection "
      + "soatEDocumentCollection "
      + "soatAccountCollection "
      + "soatContents "
      + "soatUnknown ";

    // enum TTaskAbortReason
    const TTaskAbortReason = "tarAbortByUser " + "tarAbortByWorkflowException ";

    // enum TTextValueType
    const TTextValueType = "tvtAllWords " + "tvtExactPhrase " + "tvtAnyWord ";

    // enum TUserObjectStatus
    const TUserObjectStatus =
      "usNone "
      + "usCompleted "
      + "usRedSquare "
      + "usBlueSquare "
      + "usYellowSquare "
      + "usGreenSquare "
      + "usOrangeSquare "
      + "usPurpleSquare "
      + "usFollowUp ";

    // enum TUserType
    const TUserType =
      "utUnknown "
      + "utUser "
      + "utDeveloper "
      + "utAdministrator "
      + "utSystemDeveloper "
      + "utDisconnected ";

    // enum TValuesBuildType
    const TValuesBuildType =
      "btAnd " + "btDetailAnd " + "btOr " + "btNotOr " + "btOnly ";

    // enum TViewMode
    const TViewMode = "vmView " + "vmSelect " + "vmNavigation ";

    // enum TViewSelectionMode
    const TViewSelectionMode =
      "vsmSingle " + "vsmMultiple " + "vsmMultipleCheck " + "vsmNoSelection ";

    // enum TWizardActionType
    const TWizardActionType =
      "wfatPrevious " + "wfatNext " + "wfatCancel " + "wfatFinish ";

    // enum TWizardFormElementProperty
    const TWizardFormElementProperty =
      "wfepUndefined "
      + "wfepText3 "
      + "wfepText6 "
      + "wfepText9 "
      + "wfepSpinEdit "
      + "wfepDropDown "
      + "wfepRadioGroup "
      + "wfepFlag "
      + "wfepText12 "
      + "wfepText15 "
      + "wfepText18 "
      + "wfepText21 "
      + "wfepText24 "
      + "wfepText27 "
      + "wfepText30 "
      + "wfepRadioGroupColumn1 "
      + "wfepRadioGroupColumn2 "
      + "wfepRadioGroupColumn3 ";

    // enum TWizardFormElementType
    const TWizardFormElementType =
      "wfetQueryParameter " + "wfetText " + "wfetDelimiter " + "wfetLabel ";

    // enum TWizardParamType
    const TWizardParamType =
      "wptString "
      + "wptInteger "
      + "wptNumeric "
      + "wptBoolean "
      + "wptDateTime "
      + "wptPick "
      + "wptText "
      + "wptUser "
      + "wptUserList "
      + "wptEDocumentInfo "
      + "wptEDocumentInfoList "
      + "wptReferenceRecordInfo "
      + "wptReferenceRecordInfoList "
      + "wptFolderInfo "
      + "wptTaskInfo "
      + "wptContents "
      + "wptFileName "
      + "wptDate ";

    // enum TWizardStepResult
    const TWizardStepResult =
      "wsrComplete "
      + "wsrGoNext "
      + "wsrGoPrevious "
      + "wsrCustom "
      + "wsrCancel "
      + "wsrGoFinal ";

    // enum TWizardStepType
    const TWizardStepType =
      "wstForm "
      + "wstEDocument "
      + "wstTaskCard "
      + "wstReferenceRecordCard "
      + "wstFinal ";

    // enum TWorkAccessType
    const TWorkAccessType = "waAll " + "waPerformers " + "waManual ";

    // enum TWorkflowBlockType
    const TWorkflowBlockType =
      "wsbStart "
      + "wsbFinish "
      + "wsbNotice "
      + "wsbStep "
      + "wsbDecision "
      + "wsbWait "
      + "wsbMonitor "
      + "wsbScript "
      + "wsbConnector "
      + "wsbSubTask "
      + "wsbLifeCycleStage "
      + "wsbPause ";

    // enum TWorkflowDataType
    const TWorkflowDataType =
      "wdtInteger "
      + "wdtFloat "
      + "wdtString "
      + "wdtPick "
      + "wdtDateTime "
      + "wdtBoolean "
      + "wdtTask "
      + "wdtJob "
      + "wdtFolder "
      + "wdtEDocument "
      + "wdtReferenceRecord "
      + "wdtUser "
      + "wdtGroup "
      + "wdtRole "
      + "wdtIntegerCollection "
      + "wdtFloatCollection "
      + "wdtStringCollection "
      + "wdtPickCollection "
      + "wdtDateTimeCollection "
      + "wdtBooleanCollection "
      + "wdtTaskCollection "
      + "wdtJobCollection "
      + "wdtFolderCollection "
      + "wdtEDocumentCollection "
      + "wdtReferenceRecordCollection "
      + "wdtUserCollection "
      + "wdtGroupCollection "
      + "wdtRoleCollection "
      + "wdtContents "
      + "wdtUserList "
      + "wdtSearchDescription "
      + "wdtDeadLine "
      + "wdtPickSet "
      + "wdtAccountCollection ";

    // enum TWorkImportance
    const TWorkImportance = "wiLow " + "wiNormal " + "wiHigh ";

    // enum TWorkRouteType
    const TWorkRouteType = "wrtSoft " + "wrtHard ";

    // enum TWorkState
    const TWorkState =
      "wsInit "
      + "wsRunning "
      + "wsDone "
      + "wsControlled "
      + "wsAborted "
      + "wsContinued ";

    // enum TWorkTextBuildingMode
    const TWorkTextBuildingMode =
      "wtmFull " + "wtmFromCurrent " + "wtmOnlyCurrent ";

    // Перечисления
    const ENUMS =
      TAccountType
      + TActionEnabledMode
      + TAddPosition
      + TAlignment
      + TAreaShowMode
      + TCertificateInvalidationReason
      + TCertificateType
      + TCheckListBoxItemState
      + TCloseOnEsc
      + TCompType
      + TConditionFormat
      + TConnectionIntent
      + TContentKind
      + TControlType
      + TCriterionContentType
      + TCultureType
      + TDataSetEventType
      + TDataSetState
      + TDateFormatType
      + TDateOffsetType
      + TDateTimeKind
      + TDeaAccessRights
      + TDocumentDefaultAction
      + TEditMode
      + TEditorCloseObservType
      + TEdmsApplicationAction
      + TEDocumentLockType
      + TEDocumentStepShowMode
      + TEDocumentStepVersionType
      + TEDocumentStorageFunction
      + TEDocumentStorageType
      + TEDocumentVersionSourceType
      + TEDocumentVersionState
      + TEncodeType
      + TExceptionCategory
      + TExportedSignaturesType
      + TExportedVersionType
      + TFieldDataType
      + TFolderType
      + TGridRowHeight
      + THyperlinkType
      + TImageFileFormat
      + TImageMode
      + TImageType
      + TInplaceHintKind
      + TISBLContext
      + TItemShow
      + TJobKind
      + TJoinType
      + TLabelPos
      + TLicensingType
      + TLifeCycleStageFontColor
      + TLifeCycleStageFontStyle
      + TLockableDevelopmentComponentType
      + TMaxRecordCountRestrictionType
      + TRangeValueType
      + TRelativeDate
      + TReportDestination
      + TReqDataType
      + TRequisiteEventType
      + TSBTimeType
      + TSearchShowMode
      + TSelectMode
      + TSignatureType
      + TSignerContentType
      + TStringsSortType
      + TStringValueType
      + TStructuredObjectAttributeType
      + TTaskAbortReason
      + TTextValueType
      + TUserObjectStatus
      + TUserType
      + TValuesBuildType
      + TViewMode
      + TViewSelectionMode
      + TWizardActionType
      + TWizardFormElementProperty
      + TWizardFormElementType
      + TWizardParamType
      + TWizardStepResult
      + TWizardStepType
      + TWorkAccessType
      + TWorkflowBlockType
      + TWorkflowDataType
      + TWorkImportance
      + TWorkRouteType
      + TWorkState
      + TWorkTextBuildingMode;

    // Системные функции ==> SYSFUNCTIONS
    const system_functions =
      "AddSubString "
      + "AdjustLineBreaks "
      + "AmountInWords "
      + "Analysis "
      + "ArrayDimCount "
      + "ArrayHighBound "
      + "ArrayLowBound "
      + "ArrayOf "
      + "ArrayReDim "
      + "Assert "
      + "Assigned "
      + "BeginOfMonth "
      + "BeginOfPeriod "
      + "BuildProfilingOperationAnalysis "
      + "CallProcedure "
      + "CanReadFile "
      + "CArrayElement "
      + "CDataSetRequisite "
      + "ChangeDate "
      + "ChangeReferenceDataset "
      + "Char "
      + "CharPos "
      + "CheckParam "
      + "CheckParamValue "
      + "CompareStrings "
      + "ConstantExists "
      + "ControlState "
      + "ConvertDateStr "
      + "Copy "
      + "CopyFile "
      + "CreateArray "
      + "CreateCachedReference "
      + "CreateConnection "
      + "CreateDialog "
      + "CreateDualListDialog "
      + "CreateEditor "
      + "CreateException "
      + "CreateFile "
      + "CreateFolderDialog "
      + "CreateInputDialog "
      + "CreateLinkFile "
      + "CreateList "
      + "CreateLock "
      + "CreateMemoryDataSet "
      + "CreateObject "
      + "CreateOpenDialog "
      + "CreateProgress "
      + "CreateQuery "
      + "CreateReference "
      + "CreateReport "
      + "CreateSaveDialog "
      + "CreateScript "
      + "CreateSQLPivotFunction "
      + "CreateStringList "
      + "CreateTreeListSelectDialog "
      + "CSelectSQL "
      + "CSQL "
      + "CSubString "
      + "CurrentUserID "
      + "CurrentUserName "
      + "CurrentVersion "
      + "DataSetLocateEx "
      + "DateDiff "
      + "DateTimeDiff "
      + "DateToStr "
      + "DayOfWeek "
      + "DeleteFile "
      + "DirectoryExists "
      + "DisableCheckAccessRights "
      + "DisableCheckFullShowingRestriction "
      + "DisableMassTaskSendingRestrictions "
      + "DropTable "
      + "DupeString "
      + "EditText "
      + "EnableCheckAccessRights "
      + "EnableCheckFullShowingRestriction "
      + "EnableMassTaskSendingRestrictions "
      + "EndOfMonth "
      + "EndOfPeriod "
      + "ExceptionExists "
      + "ExceptionsOff "
      + "ExceptionsOn "
      + "Execute "
      + "ExecuteProcess "
      + "Exit "
      + "ExpandEnvironmentVariables "
      + "ExtractFileDrive "
      + "ExtractFileExt "
      + "ExtractFileName "
      + "ExtractFilePath "
      + "ExtractParams "
      + "FileExists "
      + "FileSize "
      + "FindFile "
      + "FindSubString "
      + "FirmContext "
      + "ForceDirectories "
      + "Format "
      + "FormatDate "
      + "FormatNumeric "
      + "FormatSQLDate "
      + "FormatString "
      + "FreeException "
      + "GetComponent "
      + "GetComponentLaunchParam "
      + "GetConstant "
      + "GetLastException "
      + "GetReferenceRecord "
      + "GetRefTypeByRefID "
      + "GetTableID "
      + "GetTempFolder "
      + "IfThen "
      + "In "
      + "IndexOf "
      + "InputDialog "
      + "InputDialogEx "
      + "InteractiveMode "
      + "IsFileLocked "
      + "IsGraphicFile "
      + "IsNumeric "
      + "Length "
      + "LoadString "
      + "LoadStringFmt "
      + "LocalTimeToUTC "
      + "LowerCase "
      + "Max "
      + "MessageBox "
      + "MessageBoxEx "
      + "MimeDecodeBinary "
      + "MimeDecodeString "
      + "MimeEncodeBinary "
      + "MimeEncodeString "
      + "Min "
      + "MoneyInWords "
      + "MoveFile "
      + "NewID "
      + "Now "
      + "OpenFile "
      + "Ord "
      + "Precision "
      + "Raise "
      + "ReadCertificateFromFile "
      + "ReadFile "
      + "ReferenceCodeByID "
      + "ReferenceNumber "
      + "ReferenceRequisiteMode "
      + "ReferenceRequisiteValue "
      + "RegionDateSettings "
      + "RegionNumberSettings "
      + "RegionTimeSettings "
      + "RegRead "
      + "RegWrite "
      + "RenameFile "
      + "Replace "
      + "Round "
      + "SelectServerCode "
      + "SelectSQL "
      + "ServerDateTime "
      + "SetConstant "
      + "SetManagedFolderFieldsState "
      + "ShowConstantsInputDialog "
      + "ShowMessage "
      + "Sleep "
      + "Split "
      + "SQL "
      + "SQL2XLSTAB "
      + "SQLProfilingSendReport "
      + "StrToDate "
      + "SubString "
      + "SubStringCount "
      + "SystemSetting "
      + "Time "
      + "TimeDiff "
      + "Today "
      + "Transliterate "
      + "Trim "
      + "UpperCase "
      + "UserStatus "
      + "UTCToLocalTime "
      + "ValidateXML "
      + "VarIsClear "
      + "VarIsEmpty "
      + "VarIsNull "
      + "WorkTimeDiff "
      + "WriteFile "
      + "WriteFileEx "
      + "WriteObjectHistory "
      + "Анализ "
      + "БазаДанных "
      + "БлокЕсть "
      + "БлокЕстьРасш "
      + "БлокИнфо "
      + "БлокСнять "
      + "БлокСнятьРасш "
      + "БлокУстановить "
      + "Ввод "
      + "ВводМеню "
      + "ВедС "
      + "ВедСпр "
      + "ВерхняяГраницаМассива "
      + "ВнешПрогр "
      + "Восст "
      + "ВременнаяПапка "
      + "Время "
      + "ВыборSQL "
      + "ВыбратьЗапись "
      + "ВыделитьСтр "
      + "Вызвать "
      + "Выполнить "
      + "ВыпПрогр "
      + "ГрафическийФайл "
      + "ГруппаДополнительно "
      + "ДатаВремяСерв "
      + "ДеньНедели "
      + "ДиалогДаНет "
      + "ДлинаСтр "
      + "ДобПодстр "
      + "ЕПусто "
      + "ЕслиТо "
      + "ЕЧисло "
      + "ЗамПодстр "
      + "ЗаписьСправочника "
      + "ЗначПоляСпр "
      + "ИДТипСпр "
      + "ИзвлечьДиск "
      + "ИзвлечьИмяФайла "
      + "ИзвлечьПуть "
      + "ИзвлечьРасширение "
      + "ИзмДат "
      + "ИзменитьРазмерМассива "
      + "ИзмеренийМассива "
      + "ИмяОрг "
      + "ИмяПоляСпр "
      + "Индекс "
      + "ИндикаторЗакрыть "
      + "ИндикаторОткрыть "
      + "ИндикаторШаг "
      + "ИнтерактивныйРежим "
      + "ИтогТблСпр "
      + "КодВидВедСпр "
      + "КодВидСпрПоИД "
      + "КодПоAnalit "
      + "КодСимвола "
      + "КодСпр "
      + "КолПодстр "
      + "КолПроп "
      + "КонМес "
      + "Конст "
      + "КонстЕсть "
      + "КонстЗнач "
      + "КонТран "
      + "КопироватьФайл "
      + "КопияСтр "
      + "КПериод "
      + "КСтрТблСпр "
      + "Макс "
      + "МаксСтрТблСпр "
      + "Массив "
      + "Меню "
      + "МенюРасш "
      + "Мин "
      + "НаборДанныхНайтиРасш "
      + "НаимВидСпр "
      + "НаимПоAnalit "
      + "НаимСпр "
      + "НастроитьПереводыСтрок "
      + "НачМес "
      + "НачТран "
      + "НижняяГраницаМассива "
      + "НомерСпр "
      + "НПериод "
      + "Окно "
      + "Окр "
      + "Окружение "
      + "ОтлИнфДобавить "
      + "ОтлИнфУдалить "
      + "Отчет "
      + "ОтчетАнал "
      + "ОтчетИнт "
      + "ПапкаСуществует "
      + "Пауза "
      + "ПВыборSQL "
      + "ПереименоватьФайл "
      + "Переменные "
      + "ПереместитьФайл "
      + "Подстр "
      + "ПоискПодстр "
      + "ПоискСтр "
      + "ПолучитьИДТаблицы "
      + "ПользовательДополнительно "
      + "ПользовательИД "
      + "ПользовательИмя "
      + "ПользовательСтатус "
      + "Прервать "
      + "ПроверитьПараметр "
      + "ПроверитьПараметрЗнач "
      + "ПроверитьУсловие "
      + "РазбСтр "
      + "РазнВремя "
      + "РазнДат "
      + "РазнДатаВремя "
      + "РазнРабВремя "
      + "РегУстВрем "
      + "РегУстДат "
      + "РегУстЧсл "
      + "РедТекст "
      + "РеестрЗапись "
      + "РеестрСписокИменПарам "
      + "РеестрЧтение "
      + "РеквСпр "
      + "РеквСпрПр "
      + "Сегодня "
      + "Сейчас "
      + "Сервер "
      + "СерверПроцессИД "
      + "СертификатФайлСчитать "
      + "СжПроб "
      + "Символ "
      + "СистемаДиректумКод "
      + "СистемаИнформация "
      + "СистемаКод "
      + "Содержит "
      + "СоединениеЗакрыть "
      + "СоединениеОткрыть "
      + "СоздатьДиалог "
      + "СоздатьДиалогВыбораИзДвухСписков "
      + "СоздатьДиалогВыбораПапки "
      + "СоздатьДиалогОткрытияФайла "
      + "СоздатьДиалогСохраненияФайла "
      + "СоздатьЗапрос "
      + "СоздатьИндикатор "
      + "СоздатьИсключение "
      + "СоздатьКэшированныйСправочник "
      + "СоздатьМассив "
      + "СоздатьНаборДанных "
      + "СоздатьОбъект "
      + "СоздатьОтчет "
      + "СоздатьПапку "
      + "СоздатьРедактор "
      + "СоздатьСоединение "
      + "СоздатьСписок "
      + "СоздатьСписокСтрок "
      + "СоздатьСправочник "
      + "СоздатьСценарий "
      + "СоздСпр "
      + "СостСпр "
      + "Сохр "
      + "СохрСпр "
      + "СписокСистем "
      + "Спр "
      + "Справочник "
      + "СпрБлокЕсть "
      + "СпрБлокСнять "
      + "СпрБлокСнятьРасш "
      + "СпрБлокУстановить "
      + "СпрИзмНабДан "
      + "СпрКод "
      + "СпрНомер "
      + "СпрОбновить "
      + "СпрОткрыть "
      + "СпрОтменить "
      + "СпрПарам "
      + "СпрПолеЗнач "
      + "СпрПолеИмя "
      + "СпрРекв "
      + "СпрРеквВведЗн "
      + "СпрРеквНовые "
      + "СпрРеквПр "
      + "СпрРеквПредЗн "
      + "СпрРеквРежим "
      + "СпрРеквТипТекст "
      + "СпрСоздать "
      + "СпрСост "
      + "СпрСохранить "
      + "СпрТблИтог "
      + "СпрТблСтр "
      + "СпрТблСтрКол "
      + "СпрТблСтрМакс "
      + "СпрТблСтрМин "
      + "СпрТблСтрПред "
      + "СпрТблСтрСлед "
      + "СпрТблСтрСозд "
      + "СпрТблСтрУд "
      + "СпрТекПредст "
      + "СпрУдалить "
      + "СравнитьСтр "
      + "СтрВерхРегистр "
      + "СтрНижнРегистр "
      + "СтрТблСпр "
      + "СумПроп "
      + "Сценарий "
      + "СценарийПарам "
      + "ТекВерсия "
      + "ТекОрг "
      + "Точн "
      + "Тран "
      + "Транслитерация "
      + "УдалитьТаблицу "
      + "УдалитьФайл "
      + "УдСпр "
      + "УдСтрТблСпр "
      + "Уст "
      + "УстановкиКонстант "
      + "ФайлАтрибутСчитать "
      + "ФайлАтрибутУстановить "
      + "ФайлВремя "
      + "ФайлВремяУстановить "
      + "ФайлВыбрать "
      + "ФайлЗанят "
      + "ФайлЗаписать "
      + "ФайлИскать "
      + "ФайлКопировать "
      + "ФайлМожноЧитать "
      + "ФайлОткрыть "
      + "ФайлПереименовать "
      + "ФайлПерекодировать "
      + "ФайлПереместить "
      + "ФайлПросмотреть "
      + "ФайлРазмер "
      + "ФайлСоздать "
      + "ФайлСсылкаСоздать "
      + "ФайлСуществует "
      + "ФайлСчитать "
      + "ФайлУдалить "
      + "ФмтSQLДат "
      + "ФмтДат "
      + "ФмтСтр "
      + "ФмтЧсл "
      + "Формат "
      + "ЦМассивЭлемент "
      + "ЦНаборДанныхРеквизит "
      + "ЦПодстр ";

    // Предопределенные переменные ==> built_in
    const predefined_variables =
      "AltState "
      + "Application "
      + "CallType "
      + "ComponentTokens "
      + "CreatedJobs "
      + "CreatedNotices "
      + "ControlState "
      + "DialogResult "
      + "Dialogs "
      + "EDocuments "
      + "EDocumentVersionSource "
      + "Folders "
      + "GlobalIDs "
      + "Job "
      + "Jobs "
      + "InputValue "
      + "LookUpReference "
      + "LookUpRequisiteNames "
      + "LookUpSearch "
      + "Object "
      + "ParentComponent "
      + "Processes "
      + "References "
      + "Requisite "
      + "ReportName "
      + "Reports "
      + "Result "
      + "Scripts "
      + "Searches "
      + "SelectedAttachments "
      + "SelectedItems "
      + "SelectMode "
      + "Sender "
      + "ServerEvents "
      + "ServiceFactory "
      + "ShiftState "
      + "SubTask "
      + "SystemDialogs "
      + "Tasks "
      + "Wizard "
      + "Wizards "
      + "Work "
      + "ВызовСпособ "
      + "ИмяОтчета "
      + "РеквЗнач ";

    // Интерфейсы ==> type
    const interfaces =
      "IApplication "
      + "IAccessRights "
      + "IAccountRepository "
      + "IAccountSelectionRestrictions "
      + "IAction "
      + "IActionList "
      + "IAdministrationHistoryDescription "
      + "IAnchors "
      + "IApplication "
      + "IArchiveInfo "
      + "IAttachment "
      + "IAttachmentList "
      + "ICheckListBox "
      + "ICheckPointedList "
      + "IColumn "
      + "IComponent "
      + "IComponentDescription "
      + "IComponentToken "
      + "IComponentTokenFactory "
      + "IComponentTokenInfo "
      + "ICompRecordInfo "
      + "IConnection "
      + "IContents "
      + "IControl "
      + "IControlJob "
      + "IControlJobInfo "
      + "IControlList "
      + "ICrypto "
      + "ICrypto2 "
      + "ICustomJob "
      + "ICustomJobInfo "
      + "ICustomListBox "
      + "ICustomObjectWizardStep "
      + "ICustomWork "
      + "ICustomWorkInfo "
      + "IDataSet "
      + "IDataSetAccessInfo "
      + "IDataSigner "
      + "IDateCriterion "
      + "IDateRequisite "
      + "IDateRequisiteDescription "
      + "IDateValue "
      + "IDeaAccessRights "
      + "IDeaObjectInfo "
      + "IDevelopmentComponentLock "
      + "IDialog "
      + "IDialogFactory "
      + "IDialogPickRequisiteItems "
      + "IDialogsFactory "
      + "IDICSFactory "
      + "IDocRequisite "
      + "IDocumentInfo "
      + "IDualListDialog "
      + "IECertificate "
      + "IECertificateInfo "
      + "IECertificates "
      + "IEditControl "
      + "IEditorForm "
      + "IEdmsExplorer "
      + "IEdmsObject "
      + "IEdmsObjectDescription "
      + "IEdmsObjectFactory "
      + "IEdmsObjectInfo "
      + "IEDocument "
      + "IEDocumentAccessRights "
      + "IEDocumentDescription "
      + "IEDocumentEditor "
      + "IEDocumentFactory "
      + "IEDocumentInfo "
      + "IEDocumentStorage "
      + "IEDocumentVersion "
      + "IEDocumentVersionListDialog "
      + "IEDocumentVersionSource "
      + "IEDocumentWizardStep "
      + "IEDocVerSignature "
      + "IEDocVersionState "
      + "IEnabledMode "
      + "IEncodeProvider "
      + "IEncrypter "
      + "IEvent "
      + "IEventList "
      + "IException "
      + "IExternalEvents "
      + "IExternalHandler "
      + "IFactory "
      + "IField "
      + "IFileDialog "
      + "IFolder "
      + "IFolderDescription "
      + "IFolderDialog "
      + "IFolderFactory "
      + "IFolderInfo "
      + "IForEach "
      + "IForm "
      + "IFormTitle "
      + "IFormWizardStep "
      + "IGlobalIDFactory "
      + "IGlobalIDInfo "
      + "IGrid "
      + "IHasher "
      + "IHistoryDescription "
      + "IHyperLinkControl "
      + "IImageButton "
      + "IImageControl "
      + "IInnerPanel "
      + "IInplaceHint "
      + "IIntegerCriterion "
      + "IIntegerList "
      + "IIntegerRequisite "
      + "IIntegerValue "
      + "IISBLEditorForm "
      + "IJob "
      + "IJobDescription "
      + "IJobFactory "
      + "IJobForm "
      + "IJobInfo "
      + "ILabelControl "
      + "ILargeIntegerCriterion "
      + "ILargeIntegerRequisite "
      + "ILargeIntegerValue "
      + "ILicenseInfo "
      + "ILifeCycleStage "
      + "IList "
      + "IListBox "
      + "ILocalIDInfo "
      + "ILocalization "
      + "ILock "
      + "IMemoryDataSet "
      + "IMessagingFactory "
      + "IMetadataRepository "
      + "INotice "
      + "INoticeInfo "
      + "INumericCriterion "
      + "INumericRequisite "
      + "INumericValue "
      + "IObject "
      + "IObjectDescription "
      + "IObjectImporter "
      + "IObjectInfo "
      + "IObserver "
      + "IPanelGroup "
      + "IPickCriterion "
      + "IPickProperty "
      + "IPickRequisite "
      + "IPickRequisiteDescription "
      + "IPickRequisiteItem "
      + "IPickRequisiteItems "
      + "IPickValue "
      + "IPrivilege "
      + "IPrivilegeList "
      + "IProcess "
      + "IProcessFactory "
      + "IProcessMessage "
      + "IProgress "
      + "IProperty "
      + "IPropertyChangeEvent "
      + "IQuery "
      + "IReference "
      + "IReferenceCriterion "
      + "IReferenceEnabledMode "
      + "IReferenceFactory "
      + "IReferenceHistoryDescription "
      + "IReferenceInfo "
      + "IReferenceRecordCardWizardStep "
      + "IReferenceRequisiteDescription "
      + "IReferencesFactory "
      + "IReferenceValue "
      + "IRefRequisite "
      + "IReport "
      + "IReportFactory "
      + "IRequisite "
      + "IRequisiteDescription "
      + "IRequisiteDescriptionList "
      + "IRequisiteFactory "
      + "IRichEdit "
      + "IRouteStep "
      + "IRule "
      + "IRuleList "
      + "ISchemeBlock "
      + "IScript "
      + "IScriptFactory "
      + "ISearchCriteria "
      + "ISearchCriterion "
      + "ISearchDescription "
      + "ISearchFactory "
      + "ISearchFolderInfo "
      + "ISearchForObjectDescription "
      + "ISearchResultRestrictions "
      + "ISecuredContext "
      + "ISelectDialog "
      + "IServerEvent "
      + "IServerEventFactory "
      + "IServiceDialog "
      + "IServiceFactory "
      + "ISignature "
      + "ISignProvider "
      + "ISignProvider2 "
      + "ISignProvider3 "
      + "ISimpleCriterion "
      + "IStringCriterion "
      + "IStringList "
      + "IStringRequisite "
      + "IStringRequisiteDescription "
      + "IStringValue "
      + "ISystemDialogsFactory "
      + "ISystemInfo "
      + "ITabSheet "
      + "ITask "
      + "ITaskAbortReasonInfo "
      + "ITaskCardWizardStep "
      + "ITaskDescription "
      + "ITaskFactory "
      + "ITaskInfo "
      + "ITaskRoute "
      + "ITextCriterion "
      + "ITextRequisite "
      + "ITextValue "
      + "ITreeListSelectDialog "
      + "IUser "
      + "IUserList "
      + "IValue "
      + "IView "
      + "IWebBrowserControl "
      + "IWizard "
      + "IWizardAction "
      + "IWizardFactory "
      + "IWizardFormElement "
      + "IWizardParam "
      + "IWizardPickParam "
      + "IWizardReferenceParam "
      + "IWizardStep "
      + "IWorkAccessRights "
      + "IWorkDescription "
      + "IWorkflowAskableParam "
      + "IWorkflowAskableParams "
      + "IWorkflowBlock "
      + "IWorkflowBlockResult "
      + "IWorkflowEnabledMode "
      + "IWorkflowParam "
      + "IWorkflowPickParam "
      + "IWorkflowReferenceParam "
      + "IWorkState "
      + "IWorkTreeCustomNode "
      + "IWorkTreeJobNode "
      + "IWorkTreeTaskNode "
      + "IXMLEditorForm "
      + "SBCrypto ";

    // built_in : встроенные или библиотечные объекты (константы, перечисления)
    const BUILTIN = CONSTANTS + ENUMS;

    // class: встроенные наборы значений, системные объекты, фабрики
    const CLASS = predefined_variables;

    // literal : примитивные типы
    const LITERAL = "null true false nil ";

    // number : числа
    const NUMBERS = {
      className: "number",
      begin: hljs.NUMBER_RE,
      relevance: 0
    };

    // string : строки
    const STRINGS = {
      className: "string",
      variants: [
        {
          begin: '"',
          end: '"'
        },
        {
          begin: "'",
          end: "'"
        }
      ]
    };

    // Токены
    const DOCTAGS = {
      className: "doctag",
      begin: "\\b(?:TODO|DONE|BEGIN|END|STUB|CHG|FIXME|NOTE|BUG|XXX)\\b",
      relevance: 0
    };

    // Однострочный комментарий
    const ISBL_LINE_COMMENT_MODE = {
      className: "comment",
      begin: "//",
      end: "$",
      relevance: 0,
      contains: [
        hljs.PHRASAL_WORDS_MODE,
        DOCTAGS
      ]
    };

    // Многострочный комментарий
    const ISBL_BLOCK_COMMENT_MODE = {
      className: "comment",
      begin: "/\\*",
      end: "\\*/",
      relevance: 0,
      contains: [
        hljs.PHRASAL_WORDS_MODE,
        DOCTAGS
      ]
    };

    // comment : комментарии
    const COMMENTS = { variants: [
      ISBL_LINE_COMMENT_MODE,
      ISBL_BLOCK_COMMENT_MODE
    ] };

    // keywords : ключевые слова
    const KEYWORDS = {
      $pattern: UNDERSCORE_IDENT_RE,
      keyword: KEYWORD,
      built_in: BUILTIN,
      class: CLASS,
      literal: LITERAL
    };

    // methods : методы
    const METHODS = {
      begin: "\\.\\s*" + hljs.UNDERSCORE_IDENT_RE,
      keywords: KEYWORDS,
      relevance: 0
    };

    // type : встроенные типы
    const TYPES = {
      className: "type",
      begin: ":[ \\t]*(" + interfaces.trim().replace(/\s/g, "|") + ")",
      end: "[ \\t]*=",
      excludeEnd: true
    };

    // variables : переменные
    const VARIABLES = {
      className: "variable",
      keywords: KEYWORDS,
      begin: UNDERSCORE_IDENT_RE,
      relevance: 0,
      contains: [
        TYPES,
        METHODS
      ]
    };

    // Имена функций
    const FUNCTION_TITLE = FUNCTION_NAME_IDENT_RE + "\\(";

    const TITLE_MODE = {
      className: "title",
      keywords: {
        $pattern: UNDERSCORE_IDENT_RE,
        built_in: system_functions
      },
      begin: FUNCTION_TITLE,
      end: "\\(",
      returnBegin: true,
      excludeEnd: true
    };

    // function : функции
    const FUNCTIONS = {
      className: "function",
      begin: FUNCTION_TITLE,
      end: "\\)$",
      returnBegin: true,
      keywords: KEYWORDS,
      illegal: "[\\[\\]\\|\\$\\?%,~#@]",
      contains: [
        TITLE_MODE,
        METHODS,
        VARIABLES,
        STRINGS,
        NUMBERS,
        COMMENTS
      ]
    };

    return {
      name: 'ISBL',
      case_insensitive: true,
      keywords: KEYWORDS,
      illegal: "\\$|\\?|%|,|;$|~|#|@|</",
      contains: [
        FUNCTIONS,
        TYPES,
        METHODS,
        VARIABLES,
        STRINGS,
        NUMBERS,
        COMMENTS
      ]
    };
  }

  return isbl;

})();

    hljs.registerLanguage('isbl', hljsGrammar);
  })();/*! `java` grammar compiled for Highlight.js 11.10.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  // https://docs.oracle.com/javase/specs/jls/se15/html/jls-3.html#jls-3.10
  var decimalDigits = '[0-9](_*[0-9])*';
  var frac = `\\.(${decimalDigits})`;
  var hexDigits = '[0-9a-fA-F](_*[0-9a-fA-F])*';
  var NUMERIC = {
    className: 'number',
    variants: [
      // DecimalFloatingPointLiteral
      // including ExponentPart
      { begin: `(\\b(${decimalDigits})((${frac})|\\.)?|(${frac}))` +
        `[eE][+-]?(${decimalDigits})[fFdD]?\\b` },
      // excluding ExponentPart
      { begin: `\\b(${decimalDigits})((${frac})[fFdD]?\\b|\\.([fFdD]\\b)?)` },
      { begin: `(${frac})[fFdD]?\\b` },
      { begin: `\\b(${decimalDigits})[fFdD]\\b` },

      // HexadecimalFloatingPointLiteral
      { begin: `\\b0[xX]((${hexDigits})\\.?|(${hexDigits})?\\.(${hexDigits}))` +
        `[pP][+-]?(${decimalDigits})[fFdD]?\\b` },

      // DecimalIntegerLiteral
      { begin: '\\b(0|[1-9](_*[0-9])*)[lL]?\\b' },

      // HexIntegerLiteral
      { begin: `\\b0[xX](${hexDigits})[lL]?\\b` },

      // OctalIntegerLiteral
      { begin: '\\b0(_*[0-7])*[lL]?\\b' },

      // BinaryIntegerLiteral
      { begin: '\\b0[bB][01](_*[01])*[lL]?\\b' },
    ],
    relevance: 0
  };

  /*
  Language: Java
  Author: Vsevolod Solovyov <vsevolod.solovyov@gmail.com>
  Category: common, enterprise
  Website: https://www.java.com/
  */


  /**
   * Allows recursive regex expressions to a given depth
   *
   * ie: recurRegex("(abc~~~)", /~~~/g, 2) becomes:
   * (abc(abc(abc)))
   *
   * @param {string} re
   * @param {RegExp} substitution (should be a g mode regex)
   * @param {number} depth
   * @returns {string}``
   */
  function recurRegex(re, substitution, depth) {
    if (depth === -1) return "";

    return re.replace(substitution, _ => {
      return recurRegex(re, substitution, depth - 1);
    });
  }

  /** @type LanguageFn */
  function java(hljs) {
    const regex = hljs.regex;
    const JAVA_IDENT_RE = '[\u00C0-\u02B8a-zA-Z_$][\u00C0-\u02B8a-zA-Z_$0-9]*';
    const GENERIC_IDENT_RE = JAVA_IDENT_RE
      + recurRegex('(?:<' + JAVA_IDENT_RE + '~~~(?:\\s*,\\s*' + JAVA_IDENT_RE + '~~~)*>)?', /~~~/g, 2);
    const MAIN_KEYWORDS = [
      'synchronized',
      'abstract',
      'private',
      'var',
      'static',
      'if',
      'const ',
      'for',
      'while',
      'strictfp',
      'finally',
      'protected',
      'import',
      'native',
      'final',
      'void',
      'enum',
      'else',
      'break',
      'transient',
      'catch',
      'instanceof',
      'volatile',
      'case',
      'assert',
      'package',
      'default',
      'public',
      'try',
      'switch',
      'continue',
      'throws',
      'protected',
      'public',
      'private',
      'module',
      'requires',
      'exports',
      'do',
      'sealed',
      'yield',
      'permits',
      'goto'
    ];

    const BUILT_INS = [
      'super',
      'this'
    ];

    const LITERALS = [
      'false',
      'true',
      'null'
    ];

    const TYPES = [
      'char',
      'boolean',
      'long',
      'float',
      'int',
      'byte',
      'short',
      'double'
    ];

    const KEYWORDS = {
      keyword: MAIN_KEYWORDS,
      literal: LITERALS,
      type: TYPES,
      built_in: BUILT_INS
    };

    const ANNOTATION = {
      className: 'meta',
      begin: '@' + JAVA_IDENT_RE,
      contains: [
        {
          begin: /\(/,
          end: /\)/,
          contains: [ "self" ] // allow nested () inside our annotation
        }
      ]
    };
    const PARAMS = {
      className: 'params',
      begin: /\(/,
      end: /\)/,
      keywords: KEYWORDS,
      relevance: 0,
      contains: [ hljs.C_BLOCK_COMMENT_MODE ],
      endsParent: true
    };

    return {
      name: 'Java',
      aliases: [ 'jsp' ],
      keywords: KEYWORDS,
      illegal: /<\/|#/,
      contains: [
        hljs.COMMENT(
          '/\\*\\*',
          '\\*/',
          {
            relevance: 0,
            contains: [
              {
                // eat up @'s in emails to prevent them to be recognized as doctags
                begin: /\w+@/,
                relevance: 0
              },
              {
                className: 'doctag',
                begin: '@[A-Za-z]+'
              }
            ]
          }
        ),
        // relevance boost
        {
          begin: /import java\.[a-z]+\./,
          keywords: "import",
          relevance: 2
        },
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        {
          begin: /"""/,
          end: /"""/,
          className: "string",
          contains: [ hljs.BACKSLASH_ESCAPE ]
        },
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE,
        {
          match: [
            /\b(?:class|interface|enum|extends|implements|new)/,
            /\s+/,
            JAVA_IDENT_RE
          ],
          className: {
            1: "keyword",
            3: "title.class"
          }
        },
        {
          // Exceptions for hyphenated keywords
          match: /non-sealed/,
          scope: "keyword"
        },
        {
          begin: [
            regex.concat(/(?!else)/, JAVA_IDENT_RE),
            /\s+/,
            JAVA_IDENT_RE,
            /\s+/,
            /=(?!=)/
          ],
          className: {
            1: "type",
            3: "variable",
            5: "operator"
          }
        },
        {
          begin: [
            /record/,
            /\s+/,
            JAVA_IDENT_RE
          ],
          className: {
            1: "keyword",
            3: "title.class"
          },
          contains: [
            PARAMS,
            hljs.C_LINE_COMMENT_MODE,
            hljs.C_BLOCK_COMMENT_MODE
          ]
        },
        {
          // Expression keywords prevent 'keyword Name(...)' from being
          // recognized as a function definition
          beginKeywords: 'new throw return else',
          relevance: 0
        },
        {
          begin: [
            '(?:' + GENERIC_IDENT_RE + '\\s+)',
            hljs.UNDERSCORE_IDENT_RE,
            /\s*(?=\()/
          ],
          className: { 2: "title.function" },
          keywords: KEYWORDS,
          contains: [
            {
              className: 'params',
              begin: /\(/,
              end: /\)/,
              keywords: KEYWORDS,
              relevance: 0,
              contains: [
                ANNOTATION,
                hljs.APOS_STRING_MODE,
                hljs.QUOTE_STRING_MODE,
                NUMERIC,
                hljs.C_BLOCK_COMMENT_MODE
              ]
            },
            hljs.C_LINE_COMMENT_MODE,
            hljs.C_BLOCK_COMMENT_MODE
          ]
        },
        NUMERIC,
        ANNOTATION
      ]
    };
  }

  return java;

})();

    hljs.registerLanguage('java', hljsGrammar);
  })();/*! `javascript` grammar compiled for Highlight.js 11.10.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  const IDENT_RE = '[A-Za-z$_][0-9A-Za-z$_]*';
  const KEYWORDS = [
    "as", // for exports
    "in",
    "of",
    "if",
    "for",
    "while",
    "finally",
    "var",
    "new",
    "function",
    "do",
    "return",
    "void",
    "else",
    "break",
    "catch",
    "instanceof",
    "with",
    "throw",
    "case",
    "default",
    "try",
    "switch",
    "continue",
    "typeof",
    "delete",
    "let",
    "yield",
    "const",
    "class",
    // JS handles these with a special rule
    // "get",
    // "set",
    "debugger",
    "async",
    "await",
    "static",
    "import",
    "from",
    "export",
    "extends"
  ];
  const LITERALS = [
    "true",
    "false",
    "null",
    "undefined",
    "NaN",
    "Infinity"
  ];

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
  const TYPES = [
    // Fundamental objects
    "Object",
    "Function",
    "Boolean",
    "Symbol",
    // numbers and dates
    "Math",
    "Date",
    "Number",
    "BigInt",
    // text
    "String",
    "RegExp",
    // Indexed collections
    "Array",
    "Float32Array",
    "Float64Array",
    "Int8Array",
    "Uint8Array",
    "Uint8ClampedArray",
    "Int16Array",
    "Int32Array",
    "Uint16Array",
    "Uint32Array",
    "BigInt64Array",
    "BigUint64Array",
    // Keyed collections
    "Set",
    "Map",
    "WeakSet",
    "WeakMap",
    // Structured data
    "ArrayBuffer",
    "SharedArrayBuffer",
    "Atomics",
    "DataView",
    "JSON",
    // Control abstraction objects
    "Promise",
    "Generator",
    "GeneratorFunction",
    "AsyncFunction",
    // Reflection
    "Reflect",
    "Proxy",
    // Internationalization
    "Intl",
    // WebAssembly
    "WebAssembly"
  ];

  const ERROR_TYPES = [
    "Error",
    "EvalError",
    "InternalError",
    "RangeError",
    "ReferenceError",
    "SyntaxError",
    "TypeError",
    "URIError"
  ];

  const BUILT_IN_GLOBALS = [
    "setInterval",
    "setTimeout",
    "clearInterval",
    "clearTimeout",

    "require",
    "exports",

    "eval",
    "isFinite",
    "isNaN",
    "parseFloat",
    "parseInt",
    "decodeURI",
    "decodeURIComponent",
    "encodeURI",
    "encodeURIComponent",
    "escape",
    "unescape"
  ];

  const BUILT_IN_VARIABLES = [
    "arguments",
    "this",
    "super",
    "console",
    "window",
    "document",
    "localStorage",
    "sessionStorage",
    "module",
    "global" // Node.js
  ];

  const BUILT_INS = [].concat(
    BUILT_IN_GLOBALS,
    TYPES,
    ERROR_TYPES
  );

  /*
  Language: JavaScript
  Description: JavaScript (JS) is a lightweight, interpreted, or just-in-time compiled programming language with first-class functions.
  Category: common, scripting, web
  Website: https://developer.mozilla.org/en-US/docs/Web/JavaScript
  */


  /** @type LanguageFn */
  function javascript(hljs) {
    const regex = hljs.regex;
    /**
     * Takes a string like "<Booger" and checks to see
     * if we can find a matching "</Booger" later in the
     * content.
     * @param {RegExpMatchArray} match
     * @param {{after:number}} param1
     */
    const hasClosingTag = (match, { after }) => {
      const tag = "</" + match[0].slice(1);
      const pos = match.input.indexOf(tag, after);
      return pos !== -1;
    };

    const IDENT_RE$1 = IDENT_RE;
    const FRAGMENT = {
      begin: '<>',
      end: '</>'
    };
    // to avoid some special cases inside isTrulyOpeningTag
    const XML_SELF_CLOSING = /<[A-Za-z0-9\\._:-]+\s*\/>/;
    const XML_TAG = {
      begin: /<[A-Za-z0-9\\._:-]+/,
      end: /\/[A-Za-z0-9\\._:-]+>|\/>/,
      /**
       * @param {RegExpMatchArray} match
       * @param {CallbackResponse} response
       */
      isTrulyOpeningTag: (match, response) => {
        const afterMatchIndex = match[0].length + match.index;
        const nextChar = match.input[afterMatchIndex];
        if (
          // HTML should not include another raw `<` inside a tag
          // nested type?
          // `<Array<Array<number>>`, etc.
          nextChar === "<" ||
          // the , gives away that this is not HTML
          // `<T, A extends keyof T, V>`
          nextChar === ","
          ) {
          response.ignoreMatch();
          return;
        }

        // `<something>`
        // Quite possibly a tag, lets look for a matching closing tag...
        if (nextChar === ">") {
          // if we cannot find a matching closing tag, then we
          // will ignore it
          if (!hasClosingTag(match, { after: afterMatchIndex })) {
            response.ignoreMatch();
          }
        }

        // `<blah />` (self-closing)
        // handled by simpleSelfClosing rule

        let m;
        const afterMatch = match.input.substring(afterMatchIndex);

        // some more template typing stuff
        //  <T = any>(key?: string) => Modify<
        if ((m = afterMatch.match(/^\s*=/))) {
          response.ignoreMatch();
          return;
        }

        // `<From extends string>`
        // technically this could be HTML, but it smells like a type
        // NOTE: This is ugh, but added specifically for https://github.com/highlightjs/highlight.js/issues/3276
        if ((m = afterMatch.match(/^\s+extends\s+/))) {
          if (m.index === 0) {
            response.ignoreMatch();
            // eslint-disable-next-line no-useless-return
            return;
          }
        }
      }
    };
    const KEYWORDS$1 = {
      $pattern: IDENT_RE,
      keyword: KEYWORDS,
      literal: LITERALS,
      built_in: BUILT_INS,
      "variable.language": BUILT_IN_VARIABLES
    };

    // https://tc39.es/ecma262/#sec-literals-numeric-literals
    const decimalDigits = '[0-9](_?[0-9])*';
    const frac = `\\.(${decimalDigits})`;
    // DecimalIntegerLiteral, including Annex B NonOctalDecimalIntegerLiteral
    // https://tc39.es/ecma262/#sec-additional-syntax-numeric-literals
    const decimalInteger = `0|[1-9](_?[0-9])*|0[0-7]*[89][0-9]*`;
    const NUMBER = {
      className: 'number',
      variants: [
        // DecimalLiteral
        { begin: `(\\b(${decimalInteger})((${frac})|\\.)?|(${frac}))` +
          `[eE][+-]?(${decimalDigits})\\b` },
        { begin: `\\b(${decimalInteger})\\b((${frac})\\b|\\.)?|(${frac})\\b` },

        // DecimalBigIntegerLiteral
        { begin: `\\b(0|[1-9](_?[0-9])*)n\\b` },

        // NonDecimalIntegerLiteral
        { begin: "\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*n?\\b" },
        { begin: "\\b0[bB][0-1](_?[0-1])*n?\\b" },
        { begin: "\\b0[oO][0-7](_?[0-7])*n?\\b" },

        // LegacyOctalIntegerLiteral (does not include underscore separators)
        // https://tc39.es/ecma262/#sec-additional-syntax-numeric-literals
        { begin: "\\b0[0-7]+n?\\b" },
      ],
      relevance: 0
    };

    const SUBST = {
      className: 'subst',
      begin: '\\$\\{',
      end: '\\}',
      keywords: KEYWORDS$1,
      contains: [] // defined later
    };
    const HTML_TEMPLATE = {
      begin: '\.?html`',
      end: '',
      starts: {
        end: '`',
        returnEnd: false,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          SUBST
        ],
        subLanguage: 'xml'
      }
    };
    const CSS_TEMPLATE = {
      begin: '\.?css`',
      end: '',
      starts: {
        end: '`',
        returnEnd: false,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          SUBST
        ],
        subLanguage: 'css'
      }
    };
    const GRAPHQL_TEMPLATE = {
      begin: '\.?gql`',
      end: '',
      starts: {
        end: '`',
        returnEnd: false,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          SUBST
        ],
        subLanguage: 'graphql'
      }
    };
    const TEMPLATE_STRING = {
      className: 'string',
      begin: '`',
      end: '`',
      contains: [
        hljs.BACKSLASH_ESCAPE,
        SUBST
      ]
    };
    const JSDOC_COMMENT = hljs.COMMENT(
      /\/\*\*(?!\/)/,
      '\\*/',
      {
        relevance: 0,
        contains: [
          {
            begin: '(?=@[A-Za-z]+)',
            relevance: 0,
            contains: [
              {
                className: 'doctag',
                begin: '@[A-Za-z]+'
              },
              {
                className: 'type',
                begin: '\\{',
                end: '\\}',
                excludeEnd: true,
                excludeBegin: true,
                relevance: 0
              },
              {
                className: 'variable',
                begin: IDENT_RE$1 + '(?=\\s*(-)|$)',
                endsParent: true,
                relevance: 0
              },
              // eat spaces (not newlines) so we can find
              // types or variables
              {
                begin: /(?=[^\n])\s/,
                relevance: 0
              }
            ]
          }
        ]
      }
    );
    const COMMENT = {
      className: "comment",
      variants: [
        JSDOC_COMMENT,
        hljs.C_BLOCK_COMMENT_MODE,
        hljs.C_LINE_COMMENT_MODE
      ]
    };
    const SUBST_INTERNALS = [
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      HTML_TEMPLATE,
      CSS_TEMPLATE,
      GRAPHQL_TEMPLATE,
      TEMPLATE_STRING,
      // Skip numbers when they are part of a variable name
      { match: /\$\d+/ },
      NUMBER,
      // This is intentional:
      // See https://github.com/highlightjs/highlight.js/issues/3288
      // hljs.REGEXP_MODE
    ];
    SUBST.contains = SUBST_INTERNALS
      .concat({
        // we need to pair up {} inside our subst to prevent
        // it from ending too early by matching another }
        begin: /\{/,
        end: /\}/,
        keywords: KEYWORDS$1,
        contains: [
          "self"
        ].concat(SUBST_INTERNALS)
      });
    const SUBST_AND_COMMENTS = [].concat(COMMENT, SUBST.contains);
    const PARAMS_CONTAINS = SUBST_AND_COMMENTS.concat([
      // eat recursive parens in sub expressions
      {
        begin: /(\s*)\(/,
        end: /\)/,
        keywords: KEYWORDS$1,
        contains: ["self"].concat(SUBST_AND_COMMENTS)
      }
    ]);
    const PARAMS = {
      className: 'params',
      // convert this to negative lookbehind in v12
      begin: /(\s*)\(/, // to match the parms with 
      end: /\)/,
      excludeBegin: true,
      excludeEnd: true,
      keywords: KEYWORDS$1,
      contains: PARAMS_CONTAINS
    };

    // ES6 classes
    const CLASS_OR_EXTENDS = {
      variants: [
        // class Car extends vehicle
        {
          match: [
            /class/,
            /\s+/,
            IDENT_RE$1,
            /\s+/,
            /extends/,
            /\s+/,
            regex.concat(IDENT_RE$1, "(", regex.concat(/\./, IDENT_RE$1), ")*")
          ],
          scope: {
            1: "keyword",
            3: "title.class",
            5: "keyword",
            7: "title.class.inherited"
          }
        },
        // class Car
        {
          match: [
            /class/,
            /\s+/,
            IDENT_RE$1
          ],
          scope: {
            1: "keyword",
            3: "title.class"
          }
        },

      ]
    };

    const CLASS_REFERENCE = {
      relevance: 0,
      match:
      regex.either(
        // Hard coded exceptions
        /\bJSON/,
        // Float32Array, OutT
        /\b[A-Z][a-z]+([A-Z][a-z]*|\d)*/,
        // CSSFactory, CSSFactoryT
        /\b[A-Z]{2,}([A-Z][a-z]+|\d)+([A-Z][a-z]*)*/,
        // FPs, FPsT
        /\b[A-Z]{2,}[a-z]+([A-Z][a-z]+|\d)*([A-Z][a-z]*)*/,
        // P
        // single letters are not highlighted
        // BLAH
        // this will be flagged as a UPPER_CASE_CONSTANT instead
      ),
      className: "title.class",
      keywords: {
        _: [
          // se we still get relevance credit for JS library classes
          ...TYPES,
          ...ERROR_TYPES
        ]
      }
    };

    const USE_STRICT = {
      label: "use_strict",
      className: 'meta',
      relevance: 10,
      begin: /^\s*['"]use (strict|asm)['"]/
    };

    const FUNCTION_DEFINITION = {
      variants: [
        {
          match: [
            /function/,
            /\s+/,
            IDENT_RE$1,
            /(?=\s*\()/
          ]
        },
        // anonymous function
        {
          match: [
            /function/,
            /\s*(?=\()/
          ]
        }
      ],
      className: {
        1: "keyword",
        3: "title.function"
      },
      label: "func.def",
      contains: [ PARAMS ],
      illegal: /%/
    };

    const UPPER_CASE_CONSTANT = {
      relevance: 0,
      match: /\b[A-Z][A-Z_0-9]+\b/,
      className: "variable.constant"
    };

    function noneOf(list) {
      return regex.concat("(?!", list.join("|"), ")");
    }

    const FUNCTION_CALL = {
      match: regex.concat(
        /\b/,
        noneOf([
          ...BUILT_IN_GLOBALS,
          "super",
          "import"
        ].map(x => `${x}\\s*\\(`)),
        IDENT_RE$1, regex.lookahead(/\s*\(/)),
      className: "title.function",
      relevance: 0
    };

    const PROPERTY_ACCESS = {
      begin: regex.concat(/\./, regex.lookahead(
        regex.concat(IDENT_RE$1, /(?![0-9A-Za-z$_(])/)
      )),
      end: IDENT_RE$1,
      excludeBegin: true,
      keywords: "prototype",
      className: "property",
      relevance: 0
    };

    const GETTER_OR_SETTER = {
      match: [
        /get|set/,
        /\s+/,
        IDENT_RE$1,
        /(?=\()/
      ],
      className: {
        1: "keyword",
        3: "title.function"
      },
      contains: [
        { // eat to avoid empty params
          begin: /\(\)/
        },
        PARAMS
      ]
    };

    const FUNC_LEAD_IN_RE = '(\\(' +
      '[^()]*(\\(' +
      '[^()]*(\\(' +
      '[^()]*' +
      '\\)[^()]*)*' +
      '\\)[^()]*)*' +
      '\\)|' + hljs.UNDERSCORE_IDENT_RE + ')\\s*=>';

    const FUNCTION_VARIABLE = {
      match: [
        /const|var|let/, /\s+/,
        IDENT_RE$1, /\s*/,
        /=\s*/,
        /(async\s*)?/, // async is optional
        regex.lookahead(FUNC_LEAD_IN_RE)
      ],
      keywords: "async",
      className: {
        1: "keyword",
        3: "title.function"
      },
      contains: [
        PARAMS
      ]
    };

    return {
      name: 'JavaScript',
      aliases: ['js', 'jsx', 'mjs', 'cjs'],
      keywords: KEYWORDS$1,
      // this will be extended by TypeScript
      exports: { PARAMS_CONTAINS, CLASS_REFERENCE },
      illegal: /#(?![$_A-z])/,
      contains: [
        hljs.SHEBANG({
          label: "shebang",
          binary: "node",
          relevance: 5
        }),
        USE_STRICT,
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE,
        HTML_TEMPLATE,
        CSS_TEMPLATE,
        GRAPHQL_TEMPLATE,
        TEMPLATE_STRING,
        COMMENT,
        // Skip numbers when they are part of a variable name
        { match: /\$\d+/ },
        NUMBER,
        CLASS_REFERENCE,
        {
          className: 'attr',
          begin: IDENT_RE$1 + regex.lookahead(':'),
          relevance: 0
        },
        FUNCTION_VARIABLE,
        { // "value" container
          begin: '(' + hljs.RE_STARTERS_RE + '|\\b(case|return|throw)\\b)\\s*',
          keywords: 'return throw case',
          relevance: 0,
          contains: [
            COMMENT,
            hljs.REGEXP_MODE,
            {
              className: 'function',
              // we have to count the parens to make sure we actually have the
              // correct bounding ( ) before the =>.  There could be any number of
              // sub-expressions inside also surrounded by parens.
              begin: FUNC_LEAD_IN_RE,
              returnBegin: true,
              end: '\\s*=>',
              contains: [
                {
                  className: 'params',
                  variants: [
                    {
                      begin: hljs.UNDERSCORE_IDENT_RE,
                      relevance: 0
                    },
                    {
                      className: null,
                      begin: /\(\s*\)/,
                      skip: true
                    },
                    {
                      begin: /(\s*)\(/,
                      end: /\)/,
                      excludeBegin: true,
                      excludeEnd: true,
                      keywords: KEYWORDS$1,
                      contains: PARAMS_CONTAINS
                    }
                  ]
                }
              ]
            },
            { // could be a comma delimited list of params to a function call
              begin: /,/,
              relevance: 0
            },
            {
              match: /\s+/,
              relevance: 0
            },
            { // JSX
              variants: [
                { begin: FRAGMENT.begin, end: FRAGMENT.end },
                { match: XML_SELF_CLOSING },
                {
                  begin: XML_TAG.begin,
                  // we carefully check the opening tag to see if it truly
                  // is a tag and not a false positive
                  'on:begin': XML_TAG.isTrulyOpeningTag,
                  end: XML_TAG.end
                }
              ],
              subLanguage: 'xml',
              contains: [
                {
                  begin: XML_TAG.begin,
                  end: XML_TAG.end,
                  skip: true,
                  contains: ['self']
                }
              ]
            }
          ],
        },
        FUNCTION_DEFINITION,
        {
          // prevent this from getting swallowed up by function
          // since they appear "function like"
          beginKeywords: "while if switch catch for"
        },
        {
          // we have to count the parens to make sure we actually have the correct
          // bounding ( ).  There could be any number of sub-expressions inside
          // also surrounded by parens.
          begin: '\\b(?!function)' + hljs.UNDERSCORE_IDENT_RE +
            '\\(' + // first parens
            '[^()]*(\\(' +
              '[^()]*(\\(' +
                '[^()]*' +
              '\\)[^()]*)*' +
            '\\)[^()]*)*' +
            '\\)\\s*\\{', // end parens
          returnBegin:true,
          label: "func.def",
          contains: [
            PARAMS,
            hljs.inherit(hljs.TITLE_MODE, { begin: IDENT_RE$1, className: "title.function" })
          ]
        },
        // catch ... so it won't trigger the property rule below
        {
          match: /\.\.\./,
          relevance: 0
        },
        PROPERTY_ACCESS,
        // hack: prevents detection of keywords in some circumstances
        // .keyword()
        // $keyword = x
        {
          match: '\\$' + IDENT_RE$1,
          relevance: 0
        },
        {
          match: [ /\bconstructor(?=\s*\()/ ],
          className: { 1: "title.function" },
          contains: [ PARAMS ]
        },
        FUNCTION_CALL,
        UPPER_CASE_CONSTANT,
        CLASS_OR_EXTENDS,
        GETTER_OR_SETTER,
        {
          match: /\$[(.]/ // relevance booster for a pattern common to JS libs: `$(something)` and `$.something`
        }
      ]
    };
  }

  return javascript;

})();

    hljs.registerLanguage('javascript', hljsGrammar);
  })();/*! `json` grammar compiled for Highlight.js 11.10.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: JSON
  Description: JSON (JavaScript Object Notation) is a lightweight data-interchange format.
  Author: Ivan Sagalaev <maniac@softwaremaniacs.org>
  Website: http://www.json.org
  Category: common, protocols, web
  */

  function json(hljs) {
    const ATTRIBUTE = {
      className: 'attr',
      begin: /"(\\.|[^\\"\r\n])*"(?=\s*:)/,
      relevance: 1.01
    };
    const PUNCTUATION = {
      match: /[{}[\],:]/,
      className: "punctuation",
      relevance: 0
    };
    const LITERALS = [
      "true",
      "false",
      "null"
    ];
    // NOTE: normally we would rely on `keywords` for this but using a mode here allows us
    // - to use the very tight `illegal: \S` rule later to flag any other character
    // - as illegal indicating that despite looking like JSON we do not truly have
    // - JSON and thus improve false-positively greatly since JSON will try and claim
    // - all sorts of JSON looking stuff
    const LITERALS_MODE = {
      scope: "literal",
      beginKeywords: LITERALS.join(" "),
    };

    return {
      name: 'JSON',
      aliases: ['jsonc'],
      keywords:{
        literal: LITERALS,
      },
      contains: [
        ATTRIBUTE,
        PUNCTUATION,
        hljs.QUOTE_STRING_MODE,
        LITERALS_MODE,
        hljs.C_NUMBER_MODE,
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE
      ],
      illegal: '\\S'
    };
  }

  return json;

})();

    hljs.registerLanguage('json', hljsGrammar);
  })();/*! `makefile` grammar compiled for Highlight.js 11.10.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Makefile
  Author: Ivan Sagalaev <maniac@softwaremaniacs.org>
  Contributors: Joël Porquet <joel@porquet.org>
  Website: https://www.gnu.org/software/make/manual/html_node/Introduction.html
  Category: common, build-system
  */

  function makefile(hljs) {
    /* Variables: simple (eg $(var)) and special (eg $@) */
    const VARIABLE = {
      className: 'variable',
      variants: [
        {
          begin: '\\$\\(' + hljs.UNDERSCORE_IDENT_RE + '\\)',
          contains: [ hljs.BACKSLASH_ESCAPE ]
        },
        { begin: /\$[@%<?\^\+\*]/ }
      ]
    };
    /* Quoted string with variables inside */
    const QUOTE_STRING = {
      className: 'string',
      begin: /"/,
      end: /"/,
      contains: [
        hljs.BACKSLASH_ESCAPE,
        VARIABLE
      ]
    };
    /* Function: $(func arg,...) */
    const FUNC = {
      className: 'variable',
      begin: /\$\([\w-]+\s/,
      end: /\)/,
      keywords: { built_in:
          'subst patsubst strip findstring filter filter-out sort '
          + 'word wordlist firstword lastword dir notdir suffix basename '
          + 'addsuffix addprefix join wildcard realpath abspath error warning '
          + 'shell origin flavor foreach if or and call eval file value' },
      contains: [ VARIABLE ]
    };
    /* Variable assignment */
    const ASSIGNMENT = { begin: '^' + hljs.UNDERSCORE_IDENT_RE + '\\s*(?=[:+?]?=)' };
    /* Meta targets (.PHONY) */
    const META = {
      className: 'meta',
      begin: /^\.PHONY:/,
      end: /$/,
      keywords: {
        $pattern: /[\.\w]+/,
        keyword: '.PHONY'
      }
    };
    /* Targets */
    const TARGET = {
      className: 'section',
      begin: /^[^\s]+:/,
      end: /$/,
      contains: [ VARIABLE ]
    };
    return {
      name: 'Makefile',
      aliases: [
        'mk',
        'mak',
        'make',
      ],
      keywords: {
        $pattern: /[\w-]+/,
        keyword: 'define endef undefine ifdef ifndef ifeq ifneq else endif '
        + 'include -include sinclude override export unexport private vpath'
      },
      contains: [
        hljs.HASH_COMMENT_MODE,
        VARIABLE,
        QUOTE_STRING,
        FUNC,
        ASSIGNMENT,
        META,
        TARGET
      ]
    };
  }

  return makefile;

})();

    hljs.registerLanguage('makefile', hljsGrammar);
  })();/*! `markdown` grammar compiled for Highlight.js 11.10.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Markdown
  Requires: xml.js
  Author: John Crepezzi <john.crepezzi@gmail.com>
  Website: https://daringfireball.net/projects/markdown/
  Category: common, markup
  */

  function markdown(hljs) {
    const regex = hljs.regex;
    const INLINE_HTML = {
      begin: /<\/?[A-Za-z_]/,
      end: '>',
      subLanguage: 'xml',
      relevance: 0
    };
    const HORIZONTAL_RULE = {
      begin: '^[-\\*]{3,}',
      end: '$'
    };
    const CODE = {
      className: 'code',
      variants: [
        // TODO: fix to allow these to work with sublanguage also
        { begin: '(`{3,})[^`](.|\\n)*?\\1`*[ ]*' },
        { begin: '(~{3,})[^~](.|\\n)*?\\1~*[ ]*' },
        // needed to allow markdown as a sublanguage to work
        {
          begin: '```',
          end: '```+[ ]*$'
        },
        {
          begin: '~~~',
          end: '~~~+[ ]*$'
        },
        { begin: '`.+?`' },
        {
          begin: '(?=^( {4}|\\t))',
          // use contains to gobble up multiple lines to allow the block to be whatever size
          // but only have a single open/close tag vs one per line
          contains: [
            {
              begin: '^( {4}|\\t)',
              end: '(\\n)$'
            }
          ],
          relevance: 0
        }
      ]
    };
    const LIST = {
      className: 'bullet',
      begin: '^[ \t]*([*+-]|(\\d+\\.))(?=\\s+)',
      end: '\\s+',
      excludeEnd: true
    };
    const LINK_REFERENCE = {
      begin: /^\[[^\n]+\]:/,
      returnBegin: true,
      contains: [
        {
          className: 'symbol',
          begin: /\[/,
          end: /\]/,
          excludeBegin: true,
          excludeEnd: true
        },
        {
          className: 'link',
          begin: /:\s*/,
          end: /$/,
          excludeBegin: true
        }
      ]
    };
    const URL_SCHEME = /[A-Za-z][A-Za-z0-9+.-]*/;
    const LINK = {
      variants: [
        // too much like nested array access in so many languages
        // to have any real relevance
        {
          begin: /\[.+?\]\[.*?\]/,
          relevance: 0
        },
        // popular internet URLs
        {
          begin: /\[.+?\]\(((data|javascript|mailto):|(?:http|ftp)s?:\/\/).*?\)/,
          relevance: 2
        },
        {
          begin: regex.concat(/\[.+?\]\(/, URL_SCHEME, /:\/\/.*?\)/),
          relevance: 2
        },
        // relative urls
        {
          begin: /\[.+?\]\([./?&#].*?\)/,
          relevance: 1
        },
        // whatever else, lower relevance (might not be a link at all)
        {
          begin: /\[.*?\]\(.*?\)/,
          relevance: 0
        }
      ],
      returnBegin: true,
      contains: [
        {
          // empty strings for alt or link text
          match: /\[(?=\])/ },
        {
          className: 'string',
          relevance: 0,
          begin: '\\[',
          end: '\\]',
          excludeBegin: true,
          returnEnd: true
        },
        {
          className: 'link',
          relevance: 0,
          begin: '\\]\\(',
          end: '\\)',
          excludeBegin: true,
          excludeEnd: true
        },
        {
          className: 'symbol',
          relevance: 0,
          begin: '\\]\\[',
          end: '\\]',
          excludeBegin: true,
          excludeEnd: true
        }
      ]
    };
    const BOLD = {
      className: 'strong',
      contains: [], // defined later
      variants: [
        {
          begin: /_{2}(?!\s)/,
          end: /_{2}/
        },
        {
          begin: /\*{2}(?!\s)/,
          end: /\*{2}/
        }
      ]
    };
    const ITALIC = {
      className: 'emphasis',
      contains: [], // defined later
      variants: [
        {
          begin: /\*(?![*\s])/,
          end: /\*/
        },
        {
          begin: /_(?![_\s])/,
          end: /_/,
          relevance: 0
        }
      ]
    };

    // 3 level deep nesting is not allowed because it would create confusion
    // in cases like `***testing***` because where we don't know if the last
    // `***` is starting a new bold/italic or finishing the last one
    const BOLD_WITHOUT_ITALIC = hljs.inherit(BOLD, { contains: [] });
    const ITALIC_WITHOUT_BOLD = hljs.inherit(ITALIC, { contains: [] });
    BOLD.contains.push(ITALIC_WITHOUT_BOLD);
    ITALIC.contains.push(BOLD_WITHOUT_ITALIC);

    let CONTAINABLE = [
      INLINE_HTML,
      LINK
    ];

    [
      BOLD,
      ITALIC,
      BOLD_WITHOUT_ITALIC,
      ITALIC_WITHOUT_BOLD
    ].forEach(m => {
      m.contains = m.contains.concat(CONTAINABLE);
    });

    CONTAINABLE = CONTAINABLE.concat(BOLD, ITALIC);

    const HEADER = {
      className: 'section',
      variants: [
        {
          begin: '^#{1,6}',
          end: '$',
          contains: CONTAINABLE
        },
        {
          begin: '(?=^.+?\\n[=-]{2,}$)',
          contains: [
            { begin: '^[=-]*$' },
            {
              begin: '^',
              end: "\\n",
              contains: CONTAINABLE
            }
          ]
        }
      ]
    };

    const BLOCKQUOTE = {
      className: 'quote',
      begin: '^>\\s+',
      contains: CONTAINABLE,
      end: '$'
    };

    const ENTITY = {
      //https://spec.commonmark.org/0.31.2/#entity-references
      scope: 'literal',
      match: /&([a-zA-Z0-9]+|#[0-9]{1,7}|#[Xx][0-9a-fA-F]{1,6});/
    };

    return {
      name: 'Markdown',
      aliases: [
        'md',
        'mkdown',
        'mkd'
      ],
      contains: [
        HEADER,
        INLINE_HTML,
        LIST,
        BOLD,
        ITALIC,
        BLOCKQUOTE,
        CODE,
        HORIZONTAL_RULE,
        LINK,
        LINK_REFERENCE,
        ENTITY
      ]
    };
  }

  return markdown;

})();

    hljs.registerLanguage('markdown', hljsGrammar);
  })();/*! `objectivec` grammar compiled for Highlight.js 11.10.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Objective-C
  Author: Valerii Hiora <valerii.hiora@gmail.com>
  Contributors: Angel G. Olloqui <angelgarcia.mail@gmail.com>, Matt Diephouse <matt@diephouse.com>, Andrew Farmer <ahfarmer@gmail.com>, Minh Nguyễn <mxn@1ec5.org>
  Website: https://developer.apple.com/documentation/objectivec
  Category: common
  */

  function objectivec(hljs) {
    const API_CLASS = {
      className: 'built_in',
      begin: '\\b(AV|CA|CF|CG|CI|CL|CM|CN|CT|MK|MP|MTK|MTL|NS|SCN|SK|UI|WK|XC)\\w+'
    };
    const IDENTIFIER_RE = /[a-zA-Z@][a-zA-Z0-9_]*/;
    const TYPES = [
      "int",
      "float",
      "char",
      "unsigned",
      "signed",
      "short",
      "long",
      "double",
      "wchar_t",
      "unichar",
      "void",
      "bool",
      "BOOL",
      "id|0",
      "_Bool"
    ];
    const KWS = [
      "while",
      "export",
      "sizeof",
      "typedef",
      "const",
      "struct",
      "for",
      "union",
      "volatile",
      "static",
      "mutable",
      "if",
      "do",
      "return",
      "goto",
      "enum",
      "else",
      "break",
      "extern",
      "asm",
      "case",
      "default",
      "register",
      "explicit",
      "typename",
      "switch",
      "continue",
      "inline",
      "readonly",
      "assign",
      "readwrite",
      "self",
      "@synchronized",
      "id",
      "typeof",
      "nonatomic",
      "IBOutlet",
      "IBAction",
      "strong",
      "weak",
      "copy",
      "in",
      "out",
      "inout",
      "bycopy",
      "byref",
      "oneway",
      "__strong",
      "__weak",
      "__block",
      "__autoreleasing",
      "@private",
      "@protected",
      "@public",
      "@try",
      "@property",
      "@end",
      "@throw",
      "@catch",
      "@finally",
      "@autoreleasepool",
      "@synthesize",
      "@dynamic",
      "@selector",
      "@optional",
      "@required",
      "@encode",
      "@package",
      "@import",
      "@defs",
      "@compatibility_alias",
      "__bridge",
      "__bridge_transfer",
      "__bridge_retained",
      "__bridge_retain",
      "__covariant",
      "__contravariant",
      "__kindof",
      "_Nonnull",
      "_Nullable",
      "_Null_unspecified",
      "__FUNCTION__",
      "__PRETTY_FUNCTION__",
      "__attribute__",
      "getter",
      "setter",
      "retain",
      "unsafe_unretained",
      "nonnull",
      "nullable",
      "null_unspecified",
      "null_resettable",
      "class",
      "instancetype",
      "NS_DESIGNATED_INITIALIZER",
      "NS_UNAVAILABLE",
      "NS_REQUIRES_SUPER",
      "NS_RETURNS_INNER_POINTER",
      "NS_INLINE",
      "NS_AVAILABLE",
      "NS_DEPRECATED",
      "NS_ENUM",
      "NS_OPTIONS",
      "NS_SWIFT_UNAVAILABLE",
      "NS_ASSUME_NONNULL_BEGIN",
      "NS_ASSUME_NONNULL_END",
      "NS_REFINED_FOR_SWIFT",
      "NS_SWIFT_NAME",
      "NS_SWIFT_NOTHROW",
      "NS_DURING",
      "NS_HANDLER",
      "NS_ENDHANDLER",
      "NS_VALUERETURN",
      "NS_VOIDRETURN"
    ];
    const LITERALS = [
      "false",
      "true",
      "FALSE",
      "TRUE",
      "nil",
      "YES",
      "NO",
      "NULL"
    ];
    const BUILT_INS = [
      "dispatch_once_t",
      "dispatch_queue_t",
      "dispatch_sync",
      "dispatch_async",
      "dispatch_once"
    ];
    const KEYWORDS = {
      "variable.language": [
        "this",
        "super"
      ],
      $pattern: IDENTIFIER_RE,
      keyword: KWS,
      literal: LITERALS,
      built_in: BUILT_INS,
      type: TYPES
    };
    const CLASS_KEYWORDS = {
      $pattern: IDENTIFIER_RE,
      keyword: [
        "@interface",
        "@class",
        "@protocol",
        "@implementation"
      ]
    };
    return {
      name: 'Objective-C',
      aliases: [
        'mm',
        'objc',
        'obj-c',
        'obj-c++',
        'objective-c++'
      ],
      keywords: KEYWORDS,
      illegal: '</',
      contains: [
        API_CLASS,
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        hljs.C_NUMBER_MODE,
        hljs.QUOTE_STRING_MODE,
        hljs.APOS_STRING_MODE,
        {
          className: 'string',
          variants: [
            {
              begin: '@"',
              end: '"',
              illegal: '\\n',
              contains: [ hljs.BACKSLASH_ESCAPE ]
            }
          ]
        },
        {
          className: 'meta',
          begin: /#\s*[a-z]+\b/,
          end: /$/,
          keywords: { keyword:
              'if else elif endif define undef warning error line '
              + 'pragma ifdef ifndef include' },
          contains: [
            {
              begin: /\\\n/,
              relevance: 0
            },
            hljs.inherit(hljs.QUOTE_STRING_MODE, { className: 'string' }),
            {
              className: 'string',
              begin: /<.*?>/,
              end: /$/,
              illegal: '\\n'
            },
            hljs.C_LINE_COMMENT_MODE,
            hljs.C_BLOCK_COMMENT_MODE
          ]
        },
        {
          className: 'class',
          begin: '(' + CLASS_KEYWORDS.keyword.join('|') + ')\\b',
          end: /(\{|$)/,
          excludeEnd: true,
          keywords: CLASS_KEYWORDS,
          contains: [ hljs.UNDERSCORE_TITLE_MODE ]
        },
        {
          begin: '\\.' + hljs.UNDERSCORE_IDENT_RE,
          relevance: 0
        }
      ]
    };
  }

  return objectivec;

})();

    hljs.registerLanguage('objectivec', hljsGrammar);
  })();/*! `perl` grammar compiled for Highlight.js 11.10.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Perl
  Author: Peter Leonov <gojpeg@yandex.ru>
  Website: https://www.perl.org
  Category: common
  */

  /** @type LanguageFn */
  function perl(hljs) {
    const regex = hljs.regex;
    const KEYWORDS = [
      'abs',
      'accept',
      'alarm',
      'and',
      'atan2',
      'bind',
      'binmode',
      'bless',
      'break',
      'caller',
      'chdir',
      'chmod',
      'chomp',
      'chop',
      'chown',
      'chr',
      'chroot',
      'class',
      'close',
      'closedir',
      'connect',
      'continue',
      'cos',
      'crypt',
      'dbmclose',
      'dbmopen',
      'defined',
      'delete',
      'die',
      'do',
      'dump',
      'each',
      'else',
      'elsif',
      'endgrent',
      'endhostent',
      'endnetent',
      'endprotoent',
      'endpwent',
      'endservent',
      'eof',
      'eval',
      'exec',
      'exists',
      'exit',
      'exp',
      'fcntl',
      'field',
      'fileno',
      'flock',
      'for',
      'foreach',
      'fork',
      'format',
      'formline',
      'getc',
      'getgrent',
      'getgrgid',
      'getgrnam',
      'gethostbyaddr',
      'gethostbyname',
      'gethostent',
      'getlogin',
      'getnetbyaddr',
      'getnetbyname',
      'getnetent',
      'getpeername',
      'getpgrp',
      'getpriority',
      'getprotobyname',
      'getprotobynumber',
      'getprotoent',
      'getpwent',
      'getpwnam',
      'getpwuid',
      'getservbyname',
      'getservbyport',
      'getservent',
      'getsockname',
      'getsockopt',
      'given',
      'glob',
      'gmtime',
      'goto',
      'grep',
      'gt',
      'hex',
      'if',
      'index',
      'int',
      'ioctl',
      'join',
      'keys',
      'kill',
      'last',
      'lc',
      'lcfirst',
      'length',
      'link',
      'listen',
      'local',
      'localtime',
      'log',
      'lstat',
      'lt',
      'ma',
      'map',
      'method',
      'mkdir',
      'msgctl',
      'msgget',
      'msgrcv',
      'msgsnd',
      'my',
      'ne',
      'next',
      'no',
      'not',
      'oct',
      'open',
      'opendir',
      'or',
      'ord',
      'our',
      'pack',
      'package',
      'pipe',
      'pop',
      'pos',
      'print',
      'printf',
      'prototype',
      'push',
      'q|0',
      'qq',
      'quotemeta',
      'qw',
      'qx',
      'rand',
      'read',
      'readdir',
      'readline',
      'readlink',
      'readpipe',
      'recv',
      'redo',
      'ref',
      'rename',
      'require',
      'reset',
      'return',
      'reverse',
      'rewinddir',
      'rindex',
      'rmdir',
      'say',
      'scalar',
      'seek',
      'seekdir',
      'select',
      'semctl',
      'semget',
      'semop',
      'send',
      'setgrent',
      'sethostent',
      'setnetent',
      'setpgrp',
      'setpriority',
      'setprotoent',
      'setpwent',
      'setservent',
      'setsockopt',
      'shift',
      'shmctl',
      'shmget',
      'shmread',
      'shmwrite',
      'shutdown',
      'sin',
      'sleep',
      'socket',
      'socketpair',
      'sort',
      'splice',
      'split',
      'sprintf',
      'sqrt',
      'srand',
      'stat',
      'state',
      'study',
      'sub',
      'substr',
      'symlink',
      'syscall',
      'sysopen',
      'sysread',
      'sysseek',
      'system',
      'syswrite',
      'tell',
      'telldir',
      'tie',
      'tied',
      'time',
      'times',
      'tr',
      'truncate',
      'uc',
      'ucfirst',
      'umask',
      'undef',
      'unless',
      'unlink',
      'unpack',
      'unshift',
      'untie',
      'until',
      'use',
      'utime',
      'values',
      'vec',
      'wait',
      'waitpid',
      'wantarray',
      'warn',
      'when',
      'while',
      'write',
      'x|0',
      'xor',
      'y|0'
    ];

    // https://perldoc.perl.org/perlre#Modifiers
    const REGEX_MODIFIERS = /[dualxmsipngr]{0,12}/; // aa and xx are valid, making max length 12
    const PERL_KEYWORDS = {
      $pattern: /[\w.]+/,
      keyword: KEYWORDS.join(" ")
    };
    const SUBST = {
      className: 'subst',
      begin: '[$@]\\{',
      end: '\\}',
      keywords: PERL_KEYWORDS
    };
    const METHOD = {
      begin: /->\{/,
      end: /\}/
      // contains defined later
    };
    const ATTR = {
      scope: 'attr',
      match: /\s+:\s*\w+(\s*\(.*?\))?/,
    };
    const VAR = {
      scope: 'variable',
      variants: [
        { begin: /\$\d/ },
        { begin: regex.concat(
          /[$%@](?!")(\^\w\b|#\w+(::\w+)*|\{\w+\}|\w+(::\w*)*)/,
          // negative look-ahead tries to avoid matching patterns that are not
          // Perl at all like $ident$, @ident@, etc.
          `(?![A-Za-z])(?![@$%])`
          )
        },
        {
          // Only $= is a special Perl variable and one can't declare @= or %=.
          begin: /[$%@](?!")[^\s\w{=]|\$=/,
          relevance: 0
        }
      ],
      contains: [ ATTR ],
    };
    const NUMBER = {
      className: 'number',
      variants: [
        // decimal numbers:
        // include the case where a number starts with a dot (eg. .9), and
        // the leading 0? avoids mixing the first and second match on 0.x cases
        { match: /0?\.[0-9][0-9_]+\b/ },
        // include the special versioned number (eg. v5.38)
        { match: /\bv?(0|[1-9][0-9_]*(\.[0-9_]+)?|[1-9][0-9_]*)\b/ },
        // non-decimal numbers:
        { match: /\b0[0-7][0-7_]*\b/ },
        { match: /\b0x[0-9a-fA-F][0-9a-fA-F_]*\b/ },
        { match: /\b0b[0-1][0-1_]*\b/ },
      ],
      relevance: 0
    };
    const STRING_CONTAINS = [
      hljs.BACKSLASH_ESCAPE,
      SUBST,
      VAR
    ];
    const REGEX_DELIMS = [
      /!/,
      /\//,
      /\|/,
      /\?/,
      /'/,
      /"/, // valid but infrequent and weird
      /#/ // valid but infrequent and weird
    ];
    /**
     * @param {string|RegExp} prefix
     * @param {string|RegExp} open
     * @param {string|RegExp} close
     */
    const PAIRED_DOUBLE_RE = (prefix, open, close = '\\1') => {
      const middle = (close === '\\1')
        ? close
        : regex.concat(close, open);
      return regex.concat(
        regex.concat("(?:", prefix, ")"),
        open,
        /(?:\\.|[^\\\/])*?/,
        middle,
        /(?:\\.|[^\\\/])*?/,
        close,
        REGEX_MODIFIERS
      );
    };
    /**
     * @param {string|RegExp} prefix
     * @param {string|RegExp} open
     * @param {string|RegExp} close
     */
    const PAIRED_RE = (prefix, open, close) => {
      return regex.concat(
        regex.concat("(?:", prefix, ")"),
        open,
        /(?:\\.|[^\\\/])*?/,
        close,
        REGEX_MODIFIERS
      );
    };
    const PERL_DEFAULT_CONTAINS = [
      VAR,
      hljs.HASH_COMMENT_MODE,
      hljs.COMMENT(
        /^=\w/,
        /=cut/,
        { endsWithParent: true }
      ),
      METHOD,
      {
        className: 'string',
        contains: STRING_CONTAINS,
        variants: [
          {
            begin: 'q[qwxr]?\\s*\\(',
            end: '\\)',
            relevance: 5
          },
          {
            begin: 'q[qwxr]?\\s*\\[',
            end: '\\]',
            relevance: 5
          },
          {
            begin: 'q[qwxr]?\\s*\\{',
            end: '\\}',
            relevance: 5
          },
          {
            begin: 'q[qwxr]?\\s*\\|',
            end: '\\|',
            relevance: 5
          },
          {
            begin: 'q[qwxr]?\\s*<',
            end: '>',
            relevance: 5
          },
          {
            begin: 'qw\\s+q',
            end: 'q',
            relevance: 5
          },
          {
            begin: '\'',
            end: '\'',
            contains: [ hljs.BACKSLASH_ESCAPE ]
          },
          {
            begin: '"',
            end: '"'
          },
          {
            begin: '`',
            end: '`',
            contains: [ hljs.BACKSLASH_ESCAPE ]
          },
          {
            begin: /\{\w+\}/,
            relevance: 0
          },
          {
            begin: '-?\\w+\\s*=>',
            relevance: 0
          }
        ]
      },
      NUMBER,
      { // regexp container
        begin: '(\\/\\/|' + hljs.RE_STARTERS_RE + '|\\b(split|return|print|reverse|grep)\\b)\\s*',
        keywords: 'split return print reverse grep',
        relevance: 0,
        contains: [
          hljs.HASH_COMMENT_MODE,
          {
            className: 'regexp',
            variants: [
              // allow matching common delimiters
              { begin: PAIRED_DOUBLE_RE("s|tr|y", regex.either(...REGEX_DELIMS, { capture: true })) },
              // and then paired delmis
              { begin: PAIRED_DOUBLE_RE("s|tr|y", "\\(", "\\)") },
              { begin: PAIRED_DOUBLE_RE("s|tr|y", "\\[", "\\]") },
              { begin: PAIRED_DOUBLE_RE("s|tr|y", "\\{", "\\}") }
            ],
            relevance: 2
          },
          {
            className: 'regexp',
            variants: [
              {
                // could be a comment in many languages so do not count
                // as relevant
                begin: /(m|qr)\/\//,
                relevance: 0
              },
              // prefix is optional with /regex/
              { begin: PAIRED_RE("(?:m|qr)?", /\//, /\//) },
              // allow matching common delimiters
              { begin: PAIRED_RE("m|qr", regex.either(...REGEX_DELIMS, { capture: true }), /\1/) },
              // allow common paired delmins
              { begin: PAIRED_RE("m|qr", /\(/, /\)/) },
              { begin: PAIRED_RE("m|qr", /\[/, /\]/) },
              { begin: PAIRED_RE("m|qr", /\{/, /\}/) }
            ]
          }
        ]
      },
      {
        className: 'function',
        beginKeywords: 'sub method',
        end: '(\\s*\\(.*?\\))?[;{]',
        excludeEnd: true,
        relevance: 5,
        contains: [ hljs.TITLE_MODE, ATTR ]
      },
      {
        className: 'class',
        beginKeywords: 'class',
        end: '[;{]',
        excludeEnd: true,
        relevance: 5,
        contains: [ hljs.TITLE_MODE, ATTR, NUMBER ]
      },
      {
        begin: '-\\w\\b',
        relevance: 0
      },
      {
        begin: "^__DATA__$",
        end: "^__END__$",
        subLanguage: 'mojolicious',
        contains: [
          {
            begin: "^@@.*",
            end: "$",
            className: "comment"
          }
        ]
      }
    ];
    SUBST.contains = PERL_DEFAULT_CONTAINS;
    METHOD.contains = PERL_DEFAULT_CONTAINS;

    return {
      name: 'Perl',
      aliases: [
        'pl',
        'pm'
      ],
      keywords: PERL_KEYWORDS,
      contains: PERL_DEFAULT_CONTAINS
    };
  }

  return perl;

})();

    hljs.registerLanguage('perl', hljsGrammar);
  })();/*! `pf` grammar compiled for Highlight.js 11.10.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Packet Filter config
  Description: pf.conf — packet filter configuration file (OpenBSD)
  Author: Peter Piwowarski <oldlaptop654@aol.com>
  Website: http://man.openbsd.org/pf.conf
  Category: config
  */

  function pf(hljs) {
    const MACRO = {
      className: 'variable',
      begin: /\$[\w\d#@][\w\d_]*/,
      relevance: 0
    };
    const TABLE = {
      className: 'variable',
      begin: /<(?!\/)/,
      end: />/
    };

    return {
      name: 'Packet Filter config',
      aliases: [ 'pf.conf' ],
      keywords: {
        $pattern: /[a-z0-9_<>-]+/,
        built_in: /* block match pass are "actions" in pf.conf(5), the rest are
                   * lexically similar top-level commands.
                   */
          'block match pass load anchor|5 antispoof|10 set table',
        keyword:
          'in out log quick on rdomain inet inet6 proto from port os to route '
          + 'allow-opts divert-packet divert-reply divert-to flags group icmp-type '
          + 'icmp6-type label once probability recieved-on rtable prio queue '
          + 'tos tag tagged user keep fragment for os drop '
          + 'af-to|10 binat-to|10 nat-to|10 rdr-to|10 bitmask least-stats random round-robin '
          + 'source-hash static-port '
          + 'dup-to reply-to route-to '
          + 'parent bandwidth default min max qlimit '
          + 'block-policy debug fingerprints hostid limit loginterface optimization '
          + 'reassemble ruleset-optimization basic none profile skip state-defaults '
          + 'state-policy timeout '
          + 'const counters persist '
          + 'no modulate synproxy state|5 floating if-bound no-sync pflow|10 sloppy '
          + 'source-track global rule max-src-nodes max-src-states max-src-conn '
          + 'max-src-conn-rate overload flush '
          + 'scrub|5 max-mss min-ttl no-df|10 random-id',
        literal:
          'all any no-route self urpf-failed egress|5 unknown'
      },
      contains: [
        hljs.HASH_COMMENT_MODE,
        hljs.NUMBER_MODE,
        hljs.QUOTE_STRING_MODE,
        MACRO,
        TABLE
      ]
    };
  }

  return pf;

})();

    hljs.registerLanguage('pf', hljsGrammar);
  })();/*! `pgsql` grammar compiled for Highlight.js 11.10.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: PostgreSQL and PL/pgSQL
  Author: Egor Rogov (e.rogov@postgrespro.ru)
  Website: https://www.postgresql.org/docs/11/sql.html
  Description:
      This language incorporates both PostgreSQL SQL dialect and PL/pgSQL language.
      It is based on PostgreSQL version 11. Some notes:
      - Text in double-dollar-strings is _always_ interpreted as some programming code. Text
        in ordinary quotes is _never_ interpreted that way and highlighted just as a string.
      - There are quite a bit "special cases". That's because many keywords are not strictly
        they are keywords in some contexts and ordinary identifiers in others. Only some
        of such cases are handled; you still can get some of your identifiers highlighted
        wrong way.
      - Function names deliberately are not highlighted. There is no way to tell function
        call from other constructs, hence we can't highlight _all_ function names. And
        some names highlighted while others not looks ugly.
  Category: database
  */

  function pgsql(hljs) {
    const COMMENT_MODE = hljs.COMMENT('--', '$');
    const UNQUOTED_IDENT = '[a-zA-Z_][a-zA-Z_0-9$]*';
    const DOLLAR_STRING = '\\$([a-zA-Z_]?|[a-zA-Z_][a-zA-Z_0-9]*)\\$';
    const LABEL = '<<\\s*' + UNQUOTED_IDENT + '\\s*>>';

    const SQL_KW =
      // https://www.postgresql.org/docs/11/static/sql-keywords-appendix.html
      // https://www.postgresql.org/docs/11/static/sql-commands.html
      // SQL commands (starting words)
      'ABORT ALTER ANALYZE BEGIN CALL CHECKPOINT|10 CLOSE CLUSTER COMMENT COMMIT COPY CREATE DEALLOCATE DECLARE '
      + 'DELETE DISCARD DO DROP END EXECUTE EXPLAIN FETCH GRANT IMPORT INSERT LISTEN LOAD LOCK MOVE NOTIFY '
      + 'PREPARE REASSIGN|10 REFRESH REINDEX RELEASE RESET REVOKE ROLLBACK SAVEPOINT SECURITY SELECT SET SHOW '
      + 'START TRUNCATE UNLISTEN|10 UPDATE VACUUM|10 VALUES '
      // SQL commands (others)
      + 'AGGREGATE COLLATION CONVERSION|10 DATABASE DEFAULT PRIVILEGES DOMAIN TRIGGER EXTENSION FOREIGN '
      + 'WRAPPER|10 TABLE FUNCTION GROUP LANGUAGE LARGE OBJECT MATERIALIZED VIEW OPERATOR CLASS '
      + 'FAMILY POLICY PUBLICATION|10 ROLE RULE SCHEMA SEQUENCE SERVER STATISTICS SUBSCRIPTION SYSTEM '
      + 'TABLESPACE CONFIGURATION DICTIONARY PARSER TEMPLATE TYPE USER MAPPING PREPARED ACCESS '
      + 'METHOD CAST AS TRANSFORM TRANSACTION OWNED TO INTO SESSION AUTHORIZATION '
      + 'INDEX PROCEDURE ASSERTION '
      // additional reserved key words
      + 'ALL ANALYSE AND ANY ARRAY ASC ASYMMETRIC|10 BOTH CASE CHECK '
      + 'COLLATE COLUMN CONCURRENTLY|10 CONSTRAINT CROSS '
      + 'DEFERRABLE RANGE '
      + 'DESC DISTINCT ELSE EXCEPT FOR FREEZE|10 FROM FULL HAVING '
      + 'ILIKE IN INITIALLY INNER INTERSECT IS ISNULL JOIN LATERAL LEADING LIKE LIMIT '
      + 'NATURAL NOT NOTNULL NULL OFFSET ON ONLY OR ORDER OUTER OVERLAPS PLACING PRIMARY '
      + 'REFERENCES RETURNING SIMILAR SOME SYMMETRIC TABLESAMPLE THEN '
      + 'TRAILING UNION UNIQUE USING VARIADIC|10 VERBOSE WHEN WHERE WINDOW WITH '
      // some of non-reserved (which are used in clauses or as PL/pgSQL keyword)
      + 'BY RETURNS INOUT OUT SETOF|10 IF STRICT CURRENT CONTINUE OWNER LOCATION OVER PARTITION WITHIN '
      + 'BETWEEN ESCAPE EXTERNAL INVOKER DEFINER WORK RENAME VERSION CONNECTION CONNECT '
      + 'TABLES TEMP TEMPORARY FUNCTIONS SEQUENCES TYPES SCHEMAS OPTION CASCADE RESTRICT ADD ADMIN '
      + 'EXISTS VALID VALIDATE ENABLE DISABLE REPLICA|10 ALWAYS PASSING COLUMNS PATH '
      + 'REF VALUE OVERRIDING IMMUTABLE STABLE VOLATILE BEFORE AFTER EACH ROW PROCEDURAL '
      + 'ROUTINE NO HANDLER VALIDATOR OPTIONS STORAGE OIDS|10 WITHOUT INHERIT DEPENDS CALLED '
      + 'INPUT LEAKPROOF|10 COST ROWS NOWAIT SEARCH UNTIL ENCRYPTED|10 PASSWORD CONFLICT|10 '
      + 'INSTEAD INHERITS CHARACTERISTICS WRITE CURSOR ALSO STATEMENT SHARE EXCLUSIVE INLINE '
      + 'ISOLATION REPEATABLE READ COMMITTED SERIALIZABLE UNCOMMITTED LOCAL GLOBAL SQL PROCEDURES '
      + 'RECURSIVE SNAPSHOT ROLLUP CUBE TRUSTED|10 INCLUDE FOLLOWING PRECEDING UNBOUNDED RANGE GROUPS '
      + 'UNENCRYPTED|10 SYSID FORMAT DELIMITER HEADER QUOTE ENCODING FILTER OFF '
      // some parameters of VACUUM/ANALYZE/EXPLAIN
      + 'FORCE_QUOTE FORCE_NOT_NULL FORCE_NULL COSTS BUFFERS TIMING SUMMARY DISABLE_PAGE_SKIPPING '
      //
      + 'RESTART CYCLE GENERATED IDENTITY DEFERRED IMMEDIATE LEVEL LOGGED UNLOGGED '
      + 'OF NOTHING NONE EXCLUDE ATTRIBUTE '
      // from GRANT (not keywords actually)
      + 'USAGE ROUTINES '
      // actually literals, but look better this way (due to IS TRUE, IS FALSE, ISNULL etc)
      + 'TRUE FALSE NAN INFINITY ';

    const ROLE_ATTRS = // only those not in keywrods already
      'SUPERUSER NOSUPERUSER CREATEDB NOCREATEDB CREATEROLE NOCREATEROLE INHERIT NOINHERIT '
      + 'LOGIN NOLOGIN REPLICATION NOREPLICATION BYPASSRLS NOBYPASSRLS ';

    const PLPGSQL_KW =
      'ALIAS BEGIN CONSTANT DECLARE END EXCEPTION RETURN PERFORM|10 RAISE GET DIAGNOSTICS '
      + 'STACKED|10 FOREACH LOOP ELSIF EXIT WHILE REVERSE SLICE DEBUG LOG INFO NOTICE WARNING ASSERT '
      + 'OPEN ';

    const TYPES =
      // https://www.postgresql.org/docs/11/static/datatype.html
      'BIGINT INT8 BIGSERIAL SERIAL8 BIT VARYING VARBIT BOOLEAN BOOL BOX BYTEA CHARACTER CHAR VARCHAR '
      + 'CIDR CIRCLE DATE DOUBLE PRECISION FLOAT8 FLOAT INET INTEGER INT INT4 INTERVAL JSON JSONB LINE LSEG|10 '
      + 'MACADDR MACADDR8 MONEY NUMERIC DEC DECIMAL PATH POINT POLYGON REAL FLOAT4 SMALLINT INT2 '
      + 'SMALLSERIAL|10 SERIAL2|10 SERIAL|10 SERIAL4|10 TEXT TIME ZONE TIMETZ|10 TIMESTAMP TIMESTAMPTZ|10 TSQUERY|10 TSVECTOR|10 '
      + 'TXID_SNAPSHOT|10 UUID XML NATIONAL NCHAR '
      + 'INT4RANGE|10 INT8RANGE|10 NUMRANGE|10 TSRANGE|10 TSTZRANGE|10 DATERANGE|10 '
      // pseudotypes
      + 'ANYELEMENT ANYARRAY ANYNONARRAY ANYENUM ANYRANGE CSTRING INTERNAL '
      + 'RECORD PG_DDL_COMMAND VOID UNKNOWN OPAQUE REFCURSOR '
      // spec. type
      + 'NAME '
      // OID-types
      + 'OID REGPROC|10 REGPROCEDURE|10 REGOPER|10 REGOPERATOR|10 REGCLASS|10 REGTYPE|10 REGROLE|10 '
      + 'REGNAMESPACE|10 REGCONFIG|10 REGDICTIONARY|10 ';// +

    const TYPES_RE =
      TYPES.trim()
        .split(' ')
        .map(function(val) { return val.split('|')[0]; })
        .join('|');

    const SQL_BI =
      'CURRENT_TIME CURRENT_TIMESTAMP CURRENT_USER CURRENT_CATALOG|10 CURRENT_DATE LOCALTIME LOCALTIMESTAMP '
      + 'CURRENT_ROLE|10 CURRENT_SCHEMA|10 SESSION_USER PUBLIC ';

    const PLPGSQL_BI =
      'FOUND NEW OLD TG_NAME|10 TG_WHEN|10 TG_LEVEL|10 TG_OP|10 TG_RELID|10 TG_RELNAME|10 '
      + 'TG_TABLE_NAME|10 TG_TABLE_SCHEMA|10 TG_NARGS|10 TG_ARGV|10 TG_EVENT|10 TG_TAG|10 '
      // get diagnostics
      + 'ROW_COUNT RESULT_OID|10 PG_CONTEXT|10 RETURNED_SQLSTATE COLUMN_NAME CONSTRAINT_NAME '
      + 'PG_DATATYPE_NAME|10 MESSAGE_TEXT TABLE_NAME SCHEMA_NAME PG_EXCEPTION_DETAIL|10 '
      + 'PG_EXCEPTION_HINT|10 PG_EXCEPTION_CONTEXT|10 ';

    const PLPGSQL_EXCEPTIONS =
      // exceptions https://www.postgresql.org/docs/current/static/errcodes-appendix.html
      'SQLSTATE SQLERRM|10 '
      + 'SUCCESSFUL_COMPLETION WARNING DYNAMIC_RESULT_SETS_RETURNED IMPLICIT_ZERO_BIT_PADDING '
      + 'NULL_VALUE_ELIMINATED_IN_SET_FUNCTION PRIVILEGE_NOT_GRANTED PRIVILEGE_NOT_REVOKED '
      + 'STRING_DATA_RIGHT_TRUNCATION DEPRECATED_FEATURE NO_DATA NO_ADDITIONAL_DYNAMIC_RESULT_SETS_RETURNED '
      + 'SQL_STATEMENT_NOT_YET_COMPLETE CONNECTION_EXCEPTION CONNECTION_DOES_NOT_EXIST CONNECTION_FAILURE '
      + 'SQLCLIENT_UNABLE_TO_ESTABLISH_SQLCONNECTION SQLSERVER_REJECTED_ESTABLISHMENT_OF_SQLCONNECTION '
      + 'TRANSACTION_RESOLUTION_UNKNOWN PROTOCOL_VIOLATION TRIGGERED_ACTION_EXCEPTION FEATURE_NOT_SUPPORTED '
      + 'INVALID_TRANSACTION_INITIATION LOCATOR_EXCEPTION INVALID_LOCATOR_SPECIFICATION INVALID_GRANTOR '
      + 'INVALID_GRANT_OPERATION INVALID_ROLE_SPECIFICATION DIAGNOSTICS_EXCEPTION '
      + 'STACKED_DIAGNOSTICS_ACCESSED_WITHOUT_ACTIVE_HANDLER CASE_NOT_FOUND CARDINALITY_VIOLATION '
      + 'DATA_EXCEPTION ARRAY_SUBSCRIPT_ERROR CHARACTER_NOT_IN_REPERTOIRE DATETIME_FIELD_OVERFLOW '
      + 'DIVISION_BY_ZERO ERROR_IN_ASSIGNMENT ESCAPE_CHARACTER_CONFLICT INDICATOR_OVERFLOW '
      + 'INTERVAL_FIELD_OVERFLOW INVALID_ARGUMENT_FOR_LOGARITHM INVALID_ARGUMENT_FOR_NTILE_FUNCTION '
      + 'INVALID_ARGUMENT_FOR_NTH_VALUE_FUNCTION INVALID_ARGUMENT_FOR_POWER_FUNCTION '
      + 'INVALID_ARGUMENT_FOR_WIDTH_BUCKET_FUNCTION INVALID_CHARACTER_VALUE_FOR_CAST '
      + 'INVALID_DATETIME_FORMAT INVALID_ESCAPE_CHARACTER INVALID_ESCAPE_OCTET INVALID_ESCAPE_SEQUENCE '
      + 'NONSTANDARD_USE_OF_ESCAPE_CHARACTER INVALID_INDICATOR_PARAMETER_VALUE INVALID_PARAMETER_VALUE '
      + 'INVALID_REGULAR_EXPRESSION INVALID_ROW_COUNT_IN_LIMIT_CLAUSE '
      + 'INVALID_ROW_COUNT_IN_RESULT_OFFSET_CLAUSE INVALID_TABLESAMPLE_ARGUMENT INVALID_TABLESAMPLE_REPEAT '
      + 'INVALID_TIME_ZONE_DISPLACEMENT_VALUE INVALID_USE_OF_ESCAPE_CHARACTER MOST_SPECIFIC_TYPE_MISMATCH '
      + 'NULL_VALUE_NOT_ALLOWED NULL_VALUE_NO_INDICATOR_PARAMETER NUMERIC_VALUE_OUT_OF_RANGE '
      + 'SEQUENCE_GENERATOR_LIMIT_EXCEEDED STRING_DATA_LENGTH_MISMATCH STRING_DATA_RIGHT_TRUNCATION '
      + 'SUBSTRING_ERROR TRIM_ERROR UNTERMINATED_C_STRING ZERO_LENGTH_CHARACTER_STRING '
      + 'FLOATING_POINT_EXCEPTION INVALID_TEXT_REPRESENTATION INVALID_BINARY_REPRESENTATION '
      + 'BAD_COPY_FILE_FORMAT UNTRANSLATABLE_CHARACTER NOT_AN_XML_DOCUMENT INVALID_XML_DOCUMENT '
      + 'INVALID_XML_CONTENT INVALID_XML_COMMENT INVALID_XML_PROCESSING_INSTRUCTION '
      + 'INTEGRITY_CONSTRAINT_VIOLATION RESTRICT_VIOLATION NOT_NULL_VIOLATION FOREIGN_KEY_VIOLATION '
      + 'UNIQUE_VIOLATION CHECK_VIOLATION EXCLUSION_VIOLATION INVALID_CURSOR_STATE '
      + 'INVALID_TRANSACTION_STATE ACTIVE_SQL_TRANSACTION BRANCH_TRANSACTION_ALREADY_ACTIVE '
      + 'HELD_CURSOR_REQUIRES_SAME_ISOLATION_LEVEL INAPPROPRIATE_ACCESS_MODE_FOR_BRANCH_TRANSACTION '
      + 'INAPPROPRIATE_ISOLATION_LEVEL_FOR_BRANCH_TRANSACTION '
      + 'NO_ACTIVE_SQL_TRANSACTION_FOR_BRANCH_TRANSACTION READ_ONLY_SQL_TRANSACTION '
      + 'SCHEMA_AND_DATA_STATEMENT_MIXING_NOT_SUPPORTED NO_ACTIVE_SQL_TRANSACTION '
      + 'IN_FAILED_SQL_TRANSACTION IDLE_IN_TRANSACTION_SESSION_TIMEOUT INVALID_SQL_STATEMENT_NAME '
      + 'TRIGGERED_DATA_CHANGE_VIOLATION INVALID_AUTHORIZATION_SPECIFICATION INVALID_PASSWORD '
      + 'DEPENDENT_PRIVILEGE_DESCRIPTORS_STILL_EXIST DEPENDENT_OBJECTS_STILL_EXIST '
      + 'INVALID_TRANSACTION_TERMINATION SQL_ROUTINE_EXCEPTION FUNCTION_EXECUTED_NO_RETURN_STATEMENT '
      + 'MODIFYING_SQL_DATA_NOT_PERMITTED PROHIBITED_SQL_STATEMENT_ATTEMPTED '
      + 'READING_SQL_DATA_NOT_PERMITTED INVALID_CURSOR_NAME EXTERNAL_ROUTINE_EXCEPTION '
      + 'CONTAINING_SQL_NOT_PERMITTED MODIFYING_SQL_DATA_NOT_PERMITTED '
      + 'PROHIBITED_SQL_STATEMENT_ATTEMPTED READING_SQL_DATA_NOT_PERMITTED '
      + 'EXTERNAL_ROUTINE_INVOCATION_EXCEPTION INVALID_SQLSTATE_RETURNED NULL_VALUE_NOT_ALLOWED '
      + 'TRIGGER_PROTOCOL_VIOLATED SRF_PROTOCOL_VIOLATED EVENT_TRIGGER_PROTOCOL_VIOLATED '
      + 'SAVEPOINT_EXCEPTION INVALID_SAVEPOINT_SPECIFICATION INVALID_CATALOG_NAME '
      + 'INVALID_SCHEMA_NAME TRANSACTION_ROLLBACK TRANSACTION_INTEGRITY_CONSTRAINT_VIOLATION '
      + 'SERIALIZATION_FAILURE STATEMENT_COMPLETION_UNKNOWN DEADLOCK_DETECTED '
      + 'SYNTAX_ERROR_OR_ACCESS_RULE_VIOLATION SYNTAX_ERROR INSUFFICIENT_PRIVILEGE CANNOT_COERCE '
      + 'GROUPING_ERROR WINDOWING_ERROR INVALID_RECURSION INVALID_FOREIGN_KEY INVALID_NAME '
      + 'NAME_TOO_LONG RESERVED_NAME DATATYPE_MISMATCH INDETERMINATE_DATATYPE COLLATION_MISMATCH '
      + 'INDETERMINATE_COLLATION WRONG_OBJECT_TYPE GENERATED_ALWAYS UNDEFINED_COLUMN '
      + 'UNDEFINED_FUNCTION UNDEFINED_TABLE UNDEFINED_PARAMETER UNDEFINED_OBJECT '
      + 'DUPLICATE_COLUMN DUPLICATE_CURSOR DUPLICATE_DATABASE DUPLICATE_FUNCTION '
      + 'DUPLICATE_PREPARED_STATEMENT DUPLICATE_SCHEMA DUPLICATE_TABLE DUPLICATE_ALIAS '
      + 'DUPLICATE_OBJECT AMBIGUOUS_COLUMN AMBIGUOUS_FUNCTION AMBIGUOUS_PARAMETER AMBIGUOUS_ALIAS '
      + 'INVALID_COLUMN_REFERENCE INVALID_COLUMN_DEFINITION INVALID_CURSOR_DEFINITION '
      + 'INVALID_DATABASE_DEFINITION INVALID_FUNCTION_DEFINITION '
      + 'INVALID_PREPARED_STATEMENT_DEFINITION INVALID_SCHEMA_DEFINITION INVALID_TABLE_DEFINITION '
      + 'INVALID_OBJECT_DEFINITION WITH_CHECK_OPTION_VIOLATION INSUFFICIENT_RESOURCES DISK_FULL '
      + 'OUT_OF_MEMORY TOO_MANY_CONNECTIONS CONFIGURATION_LIMIT_EXCEEDED PROGRAM_LIMIT_EXCEEDED '
      + 'STATEMENT_TOO_COMPLEX TOO_MANY_COLUMNS TOO_MANY_ARGUMENTS OBJECT_NOT_IN_PREREQUISITE_STATE '
      + 'OBJECT_IN_USE CANT_CHANGE_RUNTIME_PARAM LOCK_NOT_AVAILABLE OPERATOR_INTERVENTION '
      + 'QUERY_CANCELED ADMIN_SHUTDOWN CRASH_SHUTDOWN CANNOT_CONNECT_NOW DATABASE_DROPPED '
      + 'SYSTEM_ERROR IO_ERROR UNDEFINED_FILE DUPLICATE_FILE SNAPSHOT_TOO_OLD CONFIG_FILE_ERROR '
      + 'LOCK_FILE_EXISTS FDW_ERROR FDW_COLUMN_NAME_NOT_FOUND FDW_DYNAMIC_PARAMETER_VALUE_NEEDED '
      + 'FDW_FUNCTION_SEQUENCE_ERROR FDW_INCONSISTENT_DESCRIPTOR_INFORMATION '
      + 'FDW_INVALID_ATTRIBUTE_VALUE FDW_INVALID_COLUMN_NAME FDW_INVALID_COLUMN_NUMBER '
      + 'FDW_INVALID_DATA_TYPE FDW_INVALID_DATA_TYPE_DESCRIPTORS '
      + 'FDW_INVALID_DESCRIPTOR_FIELD_IDENTIFIER FDW_INVALID_HANDLE FDW_INVALID_OPTION_INDEX '
      + 'FDW_INVALID_OPTION_NAME FDW_INVALID_STRING_LENGTH_OR_BUFFER_LENGTH '
      + 'FDW_INVALID_STRING_FORMAT FDW_INVALID_USE_OF_NULL_POINTER FDW_TOO_MANY_HANDLES '
      + 'FDW_OUT_OF_MEMORY FDW_NO_SCHEMAS FDW_OPTION_NAME_NOT_FOUND FDW_REPLY_HANDLE '
      + 'FDW_SCHEMA_NOT_FOUND FDW_TABLE_NOT_FOUND FDW_UNABLE_TO_CREATE_EXECUTION '
      + 'FDW_UNABLE_TO_CREATE_REPLY FDW_UNABLE_TO_ESTABLISH_CONNECTION PLPGSQL_ERROR '
      + 'RAISE_EXCEPTION NO_DATA_FOUND TOO_MANY_ROWS ASSERT_FAILURE INTERNAL_ERROR DATA_CORRUPTED '
      + 'INDEX_CORRUPTED ';

    const FUNCTIONS =
      // https://www.postgresql.org/docs/11/static/functions-aggregate.html
      'ARRAY_AGG AVG BIT_AND BIT_OR BOOL_AND BOOL_OR COUNT EVERY JSON_AGG JSONB_AGG JSON_OBJECT_AGG '
      + 'JSONB_OBJECT_AGG MAX MIN MODE STRING_AGG SUM XMLAGG '
      + 'CORR COVAR_POP COVAR_SAMP REGR_AVGX REGR_AVGY REGR_COUNT REGR_INTERCEPT REGR_R2 REGR_SLOPE '
      + 'REGR_SXX REGR_SXY REGR_SYY STDDEV STDDEV_POP STDDEV_SAMP VARIANCE VAR_POP VAR_SAMP '
      + 'PERCENTILE_CONT PERCENTILE_DISC '
      // https://www.postgresql.org/docs/11/static/functions-window.html
      + 'ROW_NUMBER RANK DENSE_RANK PERCENT_RANK CUME_DIST NTILE LAG LEAD FIRST_VALUE LAST_VALUE NTH_VALUE '
      // https://www.postgresql.org/docs/11/static/functions-comparison.html
      + 'NUM_NONNULLS NUM_NULLS '
      // https://www.postgresql.org/docs/11/static/functions-math.html
      + 'ABS CBRT CEIL CEILING DEGREES DIV EXP FLOOR LN LOG MOD PI POWER RADIANS ROUND SCALE SIGN SQRT '
      + 'TRUNC WIDTH_BUCKET '
      + 'RANDOM SETSEED '
      + 'ACOS ACOSD ASIN ASIND ATAN ATAND ATAN2 ATAN2D COS COSD COT COTD SIN SIND TAN TAND '
      // https://www.postgresql.org/docs/11/static/functions-string.html
      + 'BIT_LENGTH CHAR_LENGTH CHARACTER_LENGTH LOWER OCTET_LENGTH OVERLAY POSITION SUBSTRING TREAT TRIM UPPER '
      + 'ASCII BTRIM CHR CONCAT CONCAT_WS CONVERT CONVERT_FROM CONVERT_TO DECODE ENCODE INITCAP '
      + 'LEFT LENGTH LPAD LTRIM MD5 PARSE_IDENT PG_CLIENT_ENCODING QUOTE_IDENT|10 QUOTE_LITERAL|10 '
      + 'QUOTE_NULLABLE|10 REGEXP_MATCH REGEXP_MATCHES REGEXP_REPLACE REGEXP_SPLIT_TO_ARRAY '
      + 'REGEXP_SPLIT_TO_TABLE REPEAT REPLACE REVERSE RIGHT RPAD RTRIM SPLIT_PART STRPOS SUBSTR '
      + 'TO_ASCII TO_HEX TRANSLATE '
      // https://www.postgresql.org/docs/11/static/functions-binarystring.html
      + 'OCTET_LENGTH GET_BIT GET_BYTE SET_BIT SET_BYTE '
      // https://www.postgresql.org/docs/11/static/functions-formatting.html
      + 'TO_CHAR TO_DATE TO_NUMBER TO_TIMESTAMP '
      // https://www.postgresql.org/docs/11/static/functions-datetime.html
      + 'AGE CLOCK_TIMESTAMP|10 DATE_PART DATE_TRUNC ISFINITE JUSTIFY_DAYS JUSTIFY_HOURS JUSTIFY_INTERVAL '
      + 'MAKE_DATE MAKE_INTERVAL|10 MAKE_TIME MAKE_TIMESTAMP|10 MAKE_TIMESTAMPTZ|10 NOW STATEMENT_TIMESTAMP|10 '
      + 'TIMEOFDAY TRANSACTION_TIMESTAMP|10 '
      // https://www.postgresql.org/docs/11/static/functions-enum.html
      + 'ENUM_FIRST ENUM_LAST ENUM_RANGE '
      // https://www.postgresql.org/docs/11/static/functions-geometry.html
      + 'AREA CENTER DIAMETER HEIGHT ISCLOSED ISOPEN NPOINTS PCLOSE POPEN RADIUS WIDTH '
      + 'BOX BOUND_BOX CIRCLE LINE LSEG PATH POLYGON '
      // https://www.postgresql.org/docs/11/static/functions-net.html
      + 'ABBREV BROADCAST HOST HOSTMASK MASKLEN NETMASK NETWORK SET_MASKLEN TEXT INET_SAME_FAMILY '
      + 'INET_MERGE MACADDR8_SET7BIT '
      // https://www.postgresql.org/docs/11/static/functions-textsearch.html
      + 'ARRAY_TO_TSVECTOR GET_CURRENT_TS_CONFIG NUMNODE PLAINTO_TSQUERY PHRASETO_TSQUERY WEBSEARCH_TO_TSQUERY '
      + 'QUERYTREE SETWEIGHT STRIP TO_TSQUERY TO_TSVECTOR JSON_TO_TSVECTOR JSONB_TO_TSVECTOR TS_DELETE '
      + 'TS_FILTER TS_HEADLINE TS_RANK TS_RANK_CD TS_REWRITE TSQUERY_PHRASE TSVECTOR_TO_ARRAY '
      + 'TSVECTOR_UPDATE_TRIGGER TSVECTOR_UPDATE_TRIGGER_COLUMN '
      // https://www.postgresql.org/docs/11/static/functions-xml.html
      + 'XMLCOMMENT XMLCONCAT XMLELEMENT XMLFOREST XMLPI XMLROOT '
      + 'XMLEXISTS XML_IS_WELL_FORMED XML_IS_WELL_FORMED_DOCUMENT XML_IS_WELL_FORMED_CONTENT '
      + 'XPATH XPATH_EXISTS XMLTABLE XMLNAMESPACES '
      + 'TABLE_TO_XML TABLE_TO_XMLSCHEMA TABLE_TO_XML_AND_XMLSCHEMA '
      + 'QUERY_TO_XML QUERY_TO_XMLSCHEMA QUERY_TO_XML_AND_XMLSCHEMA '
      + 'CURSOR_TO_XML CURSOR_TO_XMLSCHEMA '
      + 'SCHEMA_TO_XML SCHEMA_TO_XMLSCHEMA SCHEMA_TO_XML_AND_XMLSCHEMA '
      + 'DATABASE_TO_XML DATABASE_TO_XMLSCHEMA DATABASE_TO_XML_AND_XMLSCHEMA '
      + 'XMLATTRIBUTES '
      // https://www.postgresql.org/docs/11/static/functions-json.html
      + 'TO_JSON TO_JSONB ARRAY_TO_JSON ROW_TO_JSON JSON_BUILD_ARRAY JSONB_BUILD_ARRAY JSON_BUILD_OBJECT '
      + 'JSONB_BUILD_OBJECT JSON_OBJECT JSONB_OBJECT JSON_ARRAY_LENGTH JSONB_ARRAY_LENGTH JSON_EACH '
      + 'JSONB_EACH JSON_EACH_TEXT JSONB_EACH_TEXT JSON_EXTRACT_PATH JSONB_EXTRACT_PATH '
      + 'JSON_OBJECT_KEYS JSONB_OBJECT_KEYS JSON_POPULATE_RECORD JSONB_POPULATE_RECORD JSON_POPULATE_RECORDSET '
      + 'JSONB_POPULATE_RECORDSET JSON_ARRAY_ELEMENTS JSONB_ARRAY_ELEMENTS JSON_ARRAY_ELEMENTS_TEXT '
      + 'JSONB_ARRAY_ELEMENTS_TEXT JSON_TYPEOF JSONB_TYPEOF JSON_TO_RECORD JSONB_TO_RECORD JSON_TO_RECORDSET '
      + 'JSONB_TO_RECORDSET JSON_STRIP_NULLS JSONB_STRIP_NULLS JSONB_SET JSONB_INSERT JSONB_PRETTY '
      // https://www.postgresql.org/docs/11/static/functions-sequence.html
      + 'CURRVAL LASTVAL NEXTVAL SETVAL '
      // https://www.postgresql.org/docs/11/static/functions-conditional.html
      + 'COALESCE NULLIF GREATEST LEAST '
      // https://www.postgresql.org/docs/11/static/functions-array.html
      + 'ARRAY_APPEND ARRAY_CAT ARRAY_NDIMS ARRAY_DIMS ARRAY_FILL ARRAY_LENGTH ARRAY_LOWER ARRAY_POSITION '
      + 'ARRAY_POSITIONS ARRAY_PREPEND ARRAY_REMOVE ARRAY_REPLACE ARRAY_TO_STRING ARRAY_UPPER CARDINALITY '
      + 'STRING_TO_ARRAY UNNEST '
      // https://www.postgresql.org/docs/11/static/functions-range.html
      + 'ISEMPTY LOWER_INC UPPER_INC LOWER_INF UPPER_INF RANGE_MERGE '
      // https://www.postgresql.org/docs/11/static/functions-srf.html
      + 'GENERATE_SERIES GENERATE_SUBSCRIPTS '
      // https://www.postgresql.org/docs/11/static/functions-info.html
      + 'CURRENT_DATABASE CURRENT_QUERY CURRENT_SCHEMA|10 CURRENT_SCHEMAS|10 INET_CLIENT_ADDR INET_CLIENT_PORT '
      + 'INET_SERVER_ADDR INET_SERVER_PORT ROW_SECURITY_ACTIVE FORMAT_TYPE '
      + 'TO_REGCLASS TO_REGPROC TO_REGPROCEDURE TO_REGOPER TO_REGOPERATOR TO_REGTYPE TO_REGNAMESPACE TO_REGROLE '
      + 'COL_DESCRIPTION OBJ_DESCRIPTION SHOBJ_DESCRIPTION '
      + 'TXID_CURRENT TXID_CURRENT_IF_ASSIGNED TXID_CURRENT_SNAPSHOT TXID_SNAPSHOT_XIP TXID_SNAPSHOT_XMAX '
      + 'TXID_SNAPSHOT_XMIN TXID_VISIBLE_IN_SNAPSHOT TXID_STATUS '
      // https://www.postgresql.org/docs/11/static/functions-admin.html
      + 'CURRENT_SETTING SET_CONFIG BRIN_SUMMARIZE_NEW_VALUES BRIN_SUMMARIZE_RANGE BRIN_DESUMMARIZE_RANGE '
      + 'GIN_CLEAN_PENDING_LIST '
      // https://www.postgresql.org/docs/11/static/functions-trigger.html
      + 'SUPPRESS_REDUNDANT_UPDATES_TRIGGER '
      // ihttps://www.postgresql.org/docs/devel/static/lo-funcs.html
      + 'LO_FROM_BYTEA LO_PUT LO_GET LO_CREAT LO_CREATE LO_UNLINK LO_IMPORT LO_EXPORT LOREAD LOWRITE '
      //
      + 'GROUPING CAST ';

    const FUNCTIONS_RE =
        FUNCTIONS.trim()
          .split(' ')
          .map(function(val) { return val.split('|')[0]; })
          .join('|');

    return {
      name: 'PostgreSQL',
      aliases: [
        'postgres',
        'postgresql'
      ],
      supersetOf: "sql",
      case_insensitive: true,
      keywords: {
        keyword:
              SQL_KW + PLPGSQL_KW + ROLE_ATTRS,
        built_in:
              SQL_BI + PLPGSQL_BI + PLPGSQL_EXCEPTIONS
      },
      // Forbid some cunstructs from other languages to improve autodetect. In fact
      // "[a-z]:" is legal (as part of array slice), but improbabal.
      illegal: /:==|\W\s*\(\*|(^|\s)\$[a-z]|\{\{|[a-z]:\s*$|\.\.\.|TO:|DO:/,
      contains: [
        // special handling of some words, which are reserved only in some contexts
        {
          className: 'keyword',
          variants: [
            { begin: /\bTEXT\s*SEARCH\b/ },
            { begin: /\b(PRIMARY|FOREIGN|FOR(\s+NO)?)\s+KEY\b/ },
            { begin: /\bPARALLEL\s+(UNSAFE|RESTRICTED|SAFE)\b/ },
            { begin: /\bSTORAGE\s+(PLAIN|EXTERNAL|EXTENDED|MAIN)\b/ },
            { begin: /\bMATCH\s+(FULL|PARTIAL|SIMPLE)\b/ },
            { begin: /\bNULLS\s+(FIRST|LAST)\b/ },
            { begin: /\bEVENT\s+TRIGGER\b/ },
            { begin: /\b(MAPPING|OR)\s+REPLACE\b/ },
            { begin: /\b(FROM|TO)\s+(PROGRAM|STDIN|STDOUT)\b/ },
            { begin: /\b(SHARE|EXCLUSIVE)\s+MODE\b/ },
            { begin: /\b(LEFT|RIGHT)\s+(OUTER\s+)?JOIN\b/ },
            { begin: /\b(FETCH|MOVE)\s+(NEXT|PRIOR|FIRST|LAST|ABSOLUTE|RELATIVE|FORWARD|BACKWARD)\b/ },
            { begin: /\bPRESERVE\s+ROWS\b/ },
            { begin: /\bDISCARD\s+PLANS\b/ },
            { begin: /\bREFERENCING\s+(OLD|NEW)\b/ },
            { begin: /\bSKIP\s+LOCKED\b/ },
            { begin: /\bGROUPING\s+SETS\b/ },
            { begin: /\b(BINARY|INSENSITIVE|SCROLL|NO\s+SCROLL)\s+(CURSOR|FOR)\b/ },
            { begin: /\b(WITH|WITHOUT)\s+HOLD\b/ },
            { begin: /\bWITH\s+(CASCADED|LOCAL)\s+CHECK\s+OPTION\b/ },
            { begin: /\bEXCLUDE\s+(TIES|NO\s+OTHERS)\b/ },
            { begin: /\bFORMAT\s+(TEXT|XML|JSON|YAML)\b/ },
            { begin: /\bSET\s+((SESSION|LOCAL)\s+)?NAMES\b/ },
            { begin: /\bIS\s+(NOT\s+)?UNKNOWN\b/ },
            { begin: /\bSECURITY\s+LABEL\b/ },
            { begin: /\bSTANDALONE\s+(YES|NO|NO\s+VALUE)\b/ },
            { begin: /\bWITH\s+(NO\s+)?DATA\b/ },
            { begin: /\b(FOREIGN|SET)\s+DATA\b/ },
            { begin: /\bSET\s+(CATALOG|CONSTRAINTS)\b/ },
            { begin: /\b(WITH|FOR)\s+ORDINALITY\b/ },
            { begin: /\bIS\s+(NOT\s+)?DOCUMENT\b/ },
            { begin: /\bXML\s+OPTION\s+(DOCUMENT|CONTENT)\b/ },
            { begin: /\b(STRIP|PRESERVE)\s+WHITESPACE\b/ },
            { begin: /\bNO\s+(ACTION|MAXVALUE|MINVALUE)\b/ },
            { begin: /\bPARTITION\s+BY\s+(RANGE|LIST|HASH)\b/ },
            { begin: /\bAT\s+TIME\s+ZONE\b/ },
            { begin: /\bGRANTED\s+BY\b/ },
            { begin: /\bRETURN\s+(QUERY|NEXT)\b/ },
            { begin: /\b(ATTACH|DETACH)\s+PARTITION\b/ },
            { begin: /\bFORCE\s+ROW\s+LEVEL\s+SECURITY\b/ },
            { begin: /\b(INCLUDING|EXCLUDING)\s+(COMMENTS|CONSTRAINTS|DEFAULTS|IDENTITY|INDEXES|STATISTICS|STORAGE|ALL)\b/ },
            { begin: /\bAS\s+(ASSIGNMENT|IMPLICIT|PERMISSIVE|RESTRICTIVE|ENUM|RANGE)\b/ }
          ]
        },
        // functions named as keywords, followed by '('
        { begin: /\b(FORMAT|FAMILY|VERSION)\s*\(/
          // keywords: { built_in: 'FORMAT FAMILY VERSION' }
        },
        // INCLUDE ( ... ) in index_parameters in CREATE TABLE
        {
          begin: /\bINCLUDE\s*\(/,
          keywords: 'INCLUDE'
        },
        // not highlight RANGE if not in frame_clause (not 100% correct, but seems satisfactory)
        { begin: /\bRANGE(?!\s*(BETWEEN|UNBOUNDED|CURRENT|[-0-9]+))/ },
        // disable highlighting in commands CREATE AGGREGATE/COLLATION/DATABASE/OPERTOR/TEXT SEARCH .../TYPE
        // and in PL/pgSQL RAISE ... USING
        { begin: /\b(VERSION|OWNER|TEMPLATE|TABLESPACE|CONNECTION\s+LIMIT|PROCEDURE|RESTRICT|JOIN|PARSER|COPY|START|END|COLLATION|INPUT|ANALYZE|STORAGE|LIKE|DEFAULT|DELIMITER|ENCODING|COLUMN|CONSTRAINT|TABLE|SCHEMA)\s*=/ },
        // PG_smth; HAS_some_PRIVILEGE
        {
          // className: 'built_in',
          begin: /\b(PG_\w+?|HAS_[A-Z_]+_PRIVILEGE)\b/,
          relevance: 10
        },
        // extract
        {
          begin: /\bEXTRACT\s*\(/,
          end: /\bFROM\b/,
          returnEnd: true,
          keywords: {
            // built_in: 'EXTRACT',
            type: 'CENTURY DAY DECADE DOW DOY EPOCH HOUR ISODOW ISOYEAR MICROSECONDS '
                          + 'MILLENNIUM MILLISECONDS MINUTE MONTH QUARTER SECOND TIMEZONE TIMEZONE_HOUR '
                          + 'TIMEZONE_MINUTE WEEK YEAR' }
        },
        // xmlelement, xmlpi - special NAME
        {
          begin: /\b(XMLELEMENT|XMLPI)\s*\(\s*NAME/,
          keywords: {
            // built_in: 'XMLELEMENT XMLPI',
            keyword: 'NAME' }
        },
        // xmlparse, xmlserialize
        {
          begin: /\b(XMLPARSE|XMLSERIALIZE)\s*\(\s*(DOCUMENT|CONTENT)/,
          keywords: {
            // built_in: 'XMLPARSE XMLSERIALIZE',
            keyword: 'DOCUMENT CONTENT' }
        },
        // Sequences. We actually skip everything between CACHE|INCREMENT|MAXVALUE|MINVALUE and
        // nearest following numeric constant. Without with trick we find a lot of "keywords"
        // in 'avrasm' autodetection test...
        {
          beginKeywords: 'CACHE INCREMENT MAXVALUE MINVALUE',
          end: hljs.C_NUMBER_RE,
          returnEnd: true,
          keywords: 'BY CACHE INCREMENT MAXVALUE MINVALUE'
        },
        // WITH|WITHOUT TIME ZONE as part of datatype
        {
          className: 'type',
          begin: /\b(WITH|WITHOUT)\s+TIME\s+ZONE\b/
        },
        // INTERVAL optional fields
        {
          className: 'type',
          begin: /\bINTERVAL\s+(YEAR|MONTH|DAY|HOUR|MINUTE|SECOND)(\s+TO\s+(MONTH|HOUR|MINUTE|SECOND))?\b/
        },
        // Pseudo-types which allowed only as return type
        {
          begin: /\bRETURNS\s+(LANGUAGE_HANDLER|TRIGGER|EVENT_TRIGGER|FDW_HANDLER|INDEX_AM_HANDLER|TSM_HANDLER)\b/,
          keywords: {
            keyword: 'RETURNS',
            type: 'LANGUAGE_HANDLER TRIGGER EVENT_TRIGGER FDW_HANDLER INDEX_AM_HANDLER TSM_HANDLER'
          }
        },
        // Known functions - only when followed by '('
        { begin: '\\b(' + FUNCTIONS_RE + ')\\s*\\('
          // keywords: { built_in: FUNCTIONS }
        },
        // Types
        { begin: '\\.(' + TYPES_RE + ')\\b' // prevent highlight as type, say, 'oid' in 'pgclass.oid'
        },
        {
          begin: '\\b(' + TYPES_RE + ')\\s+PATH\\b', // in XMLTABLE
          keywords: {
            keyword: 'PATH', // hopefully no one would use PATH type in XMLTABLE...
            type: TYPES.replace('PATH ', '')
          }
        },
        {
          className: 'type',
          begin: '\\b(' + TYPES_RE + ')\\b'
        },
        // Strings, see https://www.postgresql.org/docs/11/static/sql-syntax-lexical.html#SQL-SYNTAX-CONSTANTS
        {
          className: 'string',
          begin: '\'',
          end: '\'',
          contains: [ { begin: '\'\'' } ]
        },
        {
          className: 'string',
          begin: '(e|E|u&|U&)\'',
          end: '\'',
          contains: [ { begin: '\\\\.' } ],
          relevance: 10
        },
        hljs.END_SAME_AS_BEGIN({
          begin: DOLLAR_STRING,
          end: DOLLAR_STRING,
          contains: [
            {
              // actually we want them all except SQL; listed are those with known implementations
              // and XML + JSON just in case
              subLanguage: [
                'pgsql',
                'perl',
                'python',
                'tcl',
                'r',
                'lua',
                'java',
                'php',
                'ruby',
                'bash',
                'scheme',
                'xml',
                'json'
              ],
              endsWithParent: true
            }
          ]
        }),
        // identifiers in quotes
        {
          begin: '"',
          end: '"',
          contains: [ { begin: '""' } ]
        },
        // numbers
        hljs.C_NUMBER_MODE,
        // comments
        hljs.C_BLOCK_COMMENT_MODE,
        COMMENT_MODE,
        // PL/pgSQL staff
        // %ROWTYPE, %TYPE, $n
        {
          className: 'meta',
          variants: [
            { // %TYPE, %ROWTYPE
              begin: '%(ROW)?TYPE',
              relevance: 10
            },
            { // $n
              begin: '\\$\\d+' },
            { // #compiler option
              begin: '^#\\w',
              end: '$'
            }
          ]
        },
        // <<labeles>>
        {
          className: 'symbol',
          begin: LABEL,
          relevance: 10
        }
      ]
    };
  }

  return pgsql;

})();

    hljs.registerLanguage('pgsql', hljsGrammar);
  })();/*! `php` grammar compiled for Highlight.js 11.10.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: PHP
  Author: Victor Karamzin <Victor.Karamzin@enterra-inc.com>
  Contributors: Evgeny Stepanischev <imbolk@gmail.com>, Ivan Sagalaev <maniac@softwaremaniacs.org>
  Website: https://www.php.net
  Category: common
  */

  /**
   * @param {HLJSApi} hljs
   * @returns {LanguageDetail}
   * */
  function php(hljs) {
    const regex = hljs.regex;
    // negative look-ahead tries to avoid matching patterns that are not
    // Perl at all like $ident$, @ident@, etc.
    const NOT_PERL_ETC = /(?![A-Za-z0-9])(?![$])/;
    const IDENT_RE = regex.concat(
      /[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*/,
      NOT_PERL_ETC);
    // Will not detect camelCase classes
    const PASCAL_CASE_CLASS_NAME_RE = regex.concat(
      /(\\?[A-Z][a-z0-9_\x7f-\xff]+|\\?[A-Z]+(?=[A-Z][a-z0-9_\x7f-\xff])){1,}/,
      NOT_PERL_ETC);
    const VARIABLE = {
      scope: 'variable',
      match: '\\$+' + IDENT_RE,
    };
    const PREPROCESSOR = {
      scope: 'meta',
      variants: [
        { begin: /<\?php/, relevance: 10 }, // boost for obvious PHP
        { begin: /<\?=/ },
        // less relevant per PSR-1 which says not to use short-tags
        { begin: /<\?/, relevance: 0.1 },
        { begin: /\?>/ } // end php tag
      ]
    };
    const SUBST = {
      scope: 'subst',
      variants: [
        { begin: /\$\w+/ },
        {
          begin: /\{\$/,
          end: /\}/
        }
      ]
    };
    const SINGLE_QUOTED = hljs.inherit(hljs.APOS_STRING_MODE, { illegal: null, });
    const DOUBLE_QUOTED = hljs.inherit(hljs.QUOTE_STRING_MODE, {
      illegal: null,
      contains: hljs.QUOTE_STRING_MODE.contains.concat(SUBST),
    });

    const HEREDOC = {
      begin: /<<<[ \t]*(?:(\w+)|"(\w+)")\n/,
      end: /[ \t]*(\w+)\b/,
      contains: hljs.QUOTE_STRING_MODE.contains.concat(SUBST),
      'on:begin': (m, resp) => { resp.data._beginMatch = m[1] || m[2]; },
      'on:end': (m, resp) => { if (resp.data._beginMatch !== m[1]) resp.ignoreMatch(); },
    };

    const NOWDOC = hljs.END_SAME_AS_BEGIN({
      begin: /<<<[ \t]*'(\w+)'\n/,
      end: /[ \t]*(\w+)\b/,
    });
    // list of valid whitespaces because non-breaking space might be part of a IDENT_RE
    const WHITESPACE = '[ \t\n]';
    const STRING = {
      scope: 'string',
      variants: [
        DOUBLE_QUOTED,
        SINGLE_QUOTED,
        HEREDOC,
        NOWDOC
      ]
    };
    const NUMBER = {
      scope: 'number',
      variants: [
        { begin: `\\b0[bB][01]+(?:_[01]+)*\\b` }, // Binary w/ underscore support
        { begin: `\\b0[oO][0-7]+(?:_[0-7]+)*\\b` }, // Octals w/ underscore support
        { begin: `\\b0[xX][\\da-fA-F]+(?:_[\\da-fA-F]+)*\\b` }, // Hex w/ underscore support
        // Decimals w/ underscore support, with optional fragments and scientific exponent (e) suffix.
        { begin: `(?:\\b\\d+(?:_\\d+)*(\\.(?:\\d+(?:_\\d+)*))?|\\B\\.\\d+)(?:[eE][+-]?\\d+)?` }
      ],
      relevance: 0
    };
    const LITERALS = [
      "false",
      "null",
      "true"
    ];
    const KWS = [
      // Magic constants:
      // <https://www.php.net/manual/en/language.constants.predefined.php>
      "__CLASS__",
      "__DIR__",
      "__FILE__",
      "__FUNCTION__",
      "__COMPILER_HALT_OFFSET__",
      "__LINE__",
      "__METHOD__",
      "__NAMESPACE__",
      "__TRAIT__",
      // Function that look like language construct or language construct that look like function:
      // List of keywords that may not require parenthesis
      "die",
      "echo",
      "exit",
      "include",
      "include_once",
      "print",
      "require",
      "require_once",
      // These are not language construct (function) but operate on the currently-executing function and can access the current symbol table
      // 'compact extract func_get_arg func_get_args func_num_args get_called_class get_parent_class ' +
      // Other keywords:
      // <https://www.php.net/manual/en/reserved.php>
      // <https://www.php.net/manual/en/language.types.type-juggling.php>
      "array",
      "abstract",
      "and",
      "as",
      "binary",
      "bool",
      "boolean",
      "break",
      "callable",
      "case",
      "catch",
      "class",
      "clone",
      "const",
      "continue",
      "declare",
      "default",
      "do",
      "double",
      "else",
      "elseif",
      "empty",
      "enddeclare",
      "endfor",
      "endforeach",
      "endif",
      "endswitch",
      "endwhile",
      "enum",
      "eval",
      "extends",
      "final",
      "finally",
      "float",
      "for",
      "foreach",
      "from",
      "global",
      "goto",
      "if",
      "implements",
      "instanceof",
      "insteadof",
      "int",
      "integer",
      "interface",
      "isset",
      "iterable",
      "list",
      "match|0",
      "mixed",
      "new",
      "never",
      "object",
      "or",
      "private",
      "protected",
      "public",
      "readonly",
      "real",
      "return",
      "string",
      "switch",
      "throw",
      "trait",
      "try",
      "unset",
      "use",
      "var",
      "void",
      "while",
      "xor",
      "yield"
    ];

    const BUILT_INS = [
      // Standard PHP library:
      // <https://www.php.net/manual/en/book.spl.php>
      "Error|0",
      "AppendIterator",
      "ArgumentCountError",
      "ArithmeticError",
      "ArrayIterator",
      "ArrayObject",
      "AssertionError",
      "BadFunctionCallException",
      "BadMethodCallException",
      "CachingIterator",
      "CallbackFilterIterator",
      "CompileError",
      "Countable",
      "DirectoryIterator",
      "DivisionByZeroError",
      "DomainException",
      "EmptyIterator",
      "ErrorException",
      "Exception",
      "FilesystemIterator",
      "FilterIterator",
      "GlobIterator",
      "InfiniteIterator",
      "InvalidArgumentException",
      "IteratorIterator",
      "LengthException",
      "LimitIterator",
      "LogicException",
      "MultipleIterator",
      "NoRewindIterator",
      "OutOfBoundsException",
      "OutOfRangeException",
      "OuterIterator",
      "OverflowException",
      "ParentIterator",
      "ParseError",
      "RangeException",
      "RecursiveArrayIterator",
      "RecursiveCachingIterator",
      "RecursiveCallbackFilterIterator",
      "RecursiveDirectoryIterator",
      "RecursiveFilterIterator",
      "RecursiveIterator",
      "RecursiveIteratorIterator",
      "RecursiveRegexIterator",
      "RecursiveTreeIterator",
      "RegexIterator",
      "RuntimeException",
      "SeekableIterator",
      "SplDoublyLinkedList",
      "SplFileInfo",
      "SplFileObject",
      "SplFixedArray",
      "SplHeap",
      "SplMaxHeap",
      "SplMinHeap",
      "SplObjectStorage",
      "SplObserver",
      "SplPriorityQueue",
      "SplQueue",
      "SplStack",
      "SplSubject",
      "SplTempFileObject",
      "TypeError",
      "UnderflowException",
      "UnexpectedValueException",
      "UnhandledMatchError",
      // Reserved interfaces:
      // <https://www.php.net/manual/en/reserved.interfaces.php>
      "ArrayAccess",
      "BackedEnum",
      "Closure",
      "Fiber",
      "Generator",
      "Iterator",
      "IteratorAggregate",
      "Serializable",
      "Stringable",
      "Throwable",
      "Traversable",
      "UnitEnum",
      "WeakReference",
      "WeakMap",
      // Reserved classes:
      // <https://www.php.net/manual/en/reserved.classes.php>
      "Directory",
      "__PHP_Incomplete_Class",
      "parent",
      "php_user_filter",
      "self",
      "static",
      "stdClass"
    ];

    /** Dual-case keywords
     *
     * ["then","FILE"] =>
     *     ["then", "THEN", "FILE", "file"]
     *
     * @param {string[]} items */
    const dualCase = (items) => {
      /** @type string[] */
      const result = [];
      items.forEach(item => {
        result.push(item);
        if (item.toLowerCase() === item) {
          result.push(item.toUpperCase());
        } else {
          result.push(item.toLowerCase());
        }
      });
      return result;
    };

    const KEYWORDS = {
      keyword: KWS,
      literal: dualCase(LITERALS),
      built_in: BUILT_INS,
    };

    /**
     * @param {string[]} items */
    const normalizeKeywords = (items) => {
      return items.map(item => {
        return item.replace(/\|\d+$/, "");
      });
    };

    const CONSTRUCTOR_CALL = { variants: [
      {
        match: [
          /new/,
          regex.concat(WHITESPACE, "+"),
          // to prevent built ins from being confused as the class constructor call
          regex.concat("(?!", normalizeKeywords(BUILT_INS).join("\\b|"), "\\b)"),
          PASCAL_CASE_CLASS_NAME_RE,
        ],
        scope: {
          1: "keyword",
          4: "title.class",
        },
      }
    ] };

    const CONSTANT_REFERENCE = regex.concat(IDENT_RE, "\\b(?!\\()");

    const LEFT_AND_RIGHT_SIDE_OF_DOUBLE_COLON = { variants: [
      {
        match: [
          regex.concat(
            /::/,
            regex.lookahead(/(?!class\b)/)
          ),
          CONSTANT_REFERENCE,
        ],
        scope: { 2: "variable.constant", },
      },
      {
        match: [
          /::/,
          /class/,
        ],
        scope: { 2: "variable.language", },
      },
      {
        match: [
          PASCAL_CASE_CLASS_NAME_RE,
          regex.concat(
            /::/,
            regex.lookahead(/(?!class\b)/)
          ),
          CONSTANT_REFERENCE,
        ],
        scope: {
          1: "title.class",
          3: "variable.constant",
        },
      },
      {
        match: [
          PASCAL_CASE_CLASS_NAME_RE,
          regex.concat(
            "::",
            regex.lookahead(/(?!class\b)/)
          ),
        ],
        scope: { 1: "title.class", },
      },
      {
        match: [
          PASCAL_CASE_CLASS_NAME_RE,
          /::/,
          /class/,
        ],
        scope: {
          1: "title.class",
          3: "variable.language",
        },
      }
    ] };

    const NAMED_ARGUMENT = {
      scope: 'attr',
      match: regex.concat(IDENT_RE, regex.lookahead(':'), regex.lookahead(/(?!::)/)),
    };
    const PARAMS_MODE = {
      relevance: 0,
      begin: /\(/,
      end: /\)/,
      keywords: KEYWORDS,
      contains: [
        NAMED_ARGUMENT,
        VARIABLE,
        LEFT_AND_RIGHT_SIDE_OF_DOUBLE_COLON,
        hljs.C_BLOCK_COMMENT_MODE,
        STRING,
        NUMBER,
        CONSTRUCTOR_CALL,
      ],
    };
    const FUNCTION_INVOKE = {
      relevance: 0,
      match: [
        /\b/,
        // to prevent keywords from being confused as the function title
        regex.concat("(?!fn\\b|function\\b|", normalizeKeywords(KWS).join("\\b|"), "|", normalizeKeywords(BUILT_INS).join("\\b|"), "\\b)"),
        IDENT_RE,
        regex.concat(WHITESPACE, "*"),
        regex.lookahead(/(?=\()/)
      ],
      scope: { 3: "title.function.invoke", },
      contains: [ PARAMS_MODE ]
    };
    PARAMS_MODE.contains.push(FUNCTION_INVOKE);

    const ATTRIBUTE_CONTAINS = [
      NAMED_ARGUMENT,
      LEFT_AND_RIGHT_SIDE_OF_DOUBLE_COLON,
      hljs.C_BLOCK_COMMENT_MODE,
      STRING,
      NUMBER,
      CONSTRUCTOR_CALL,
    ];

    const ATTRIBUTES = {
      begin: regex.concat(/#\[\s*/, PASCAL_CASE_CLASS_NAME_RE),
      beginScope: "meta",
      end: /]/,
      endScope: "meta",
      keywords: {
        literal: LITERALS,
        keyword: [
          'new',
          'array',
        ]
      },
      contains: [
        {
          begin: /\[/,
          end: /]/,
          keywords: {
            literal: LITERALS,
            keyword: [
              'new',
              'array',
            ]
          },
          contains: [
            'self',
            ...ATTRIBUTE_CONTAINS,
          ]
        },
        ...ATTRIBUTE_CONTAINS,
        {
          scope: 'meta',
          match: PASCAL_CASE_CLASS_NAME_RE
        }
      ]
    };

    return {
      case_insensitive: false,
      keywords: KEYWORDS,
      contains: [
        ATTRIBUTES,
        hljs.HASH_COMMENT_MODE,
        hljs.COMMENT('//', '$'),
        hljs.COMMENT(
          '/\\*',
          '\\*/',
          { contains: [
            {
              scope: 'doctag',
              match: '@[A-Za-z]+'
            }
          ] }
        ),
        {
          match: /__halt_compiler\(\);/,
          keywords: '__halt_compiler',
          starts: {
            scope: "comment",
            end: hljs.MATCH_NOTHING_RE,
            contains: [
              {
                match: /\?>/,
                scope: "meta",
                endsParent: true
              }
            ]
          }
        },
        PREPROCESSOR,
        {
          scope: 'variable.language',
          match: /\$this\b/
        },
        VARIABLE,
        FUNCTION_INVOKE,
        LEFT_AND_RIGHT_SIDE_OF_DOUBLE_COLON,
        {
          match: [
            /const/,
            /\s/,
            IDENT_RE,
          ],
          scope: {
            1: "keyword",
            3: "variable.constant",
          },
        },
        CONSTRUCTOR_CALL,
        {
          scope: 'function',
          relevance: 0,
          beginKeywords: 'fn function',
          end: /[;{]/,
          excludeEnd: true,
          illegal: '[$%\\[]',
          contains: [
            { beginKeywords: 'use', },
            hljs.UNDERSCORE_TITLE_MODE,
            {
              begin: '=>', // No markup, just a relevance booster
              endsParent: true
            },
            {
              scope: 'params',
              begin: '\\(',
              end: '\\)',
              excludeBegin: true,
              excludeEnd: true,
              keywords: KEYWORDS,
              contains: [
                'self',
                VARIABLE,
                LEFT_AND_RIGHT_SIDE_OF_DOUBLE_COLON,
                hljs.C_BLOCK_COMMENT_MODE,
                STRING,
                NUMBER
              ]
            },
          ]
        },
        {
          scope: 'class',
          variants: [
            {
              beginKeywords: "enum",
              illegal: /[($"]/
            },
            {
              beginKeywords: "class interface trait",
              illegal: /[:($"]/
            }
          ],
          relevance: 0,
          end: /\{/,
          excludeEnd: true,
          contains: [
            { beginKeywords: 'extends implements' },
            hljs.UNDERSCORE_TITLE_MODE
          ]
        },
        // both use and namespace still use "old style" rules (vs multi-match)
        // because the namespace name can include `\` and we still want each
        // element to be treated as its own *individual* title
        {
          beginKeywords: 'namespace',
          relevance: 0,
          end: ';',
          illegal: /[.']/,
          contains: [ hljs.inherit(hljs.UNDERSCORE_TITLE_MODE, { scope: "title.class" }) ]
        },
        {
          beginKeywords: 'use',
          relevance: 0,
          end: ';',
          contains: [
            // TODO: title.function vs title.class
            {
              match: /\b(as|const|function)\b/,
              scope: "keyword"
            },
            // TODO: could be title.class or title.function
            hljs.UNDERSCORE_TITLE_MODE
          ]
        },
        STRING,
        NUMBER,
      ]
    };
  }

  return php;

})();

    hljs.registerLanguage('php', hljsGrammar);
  })();/*! `php-template` grammar compiled for Highlight.js 11.10.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: PHP Template
  Requires: xml.js, php.js
  Author: Josh Goebel <hello@joshgoebel.com>
  Website: https://www.php.net
  Category: common
  */

  function phpTemplate(hljs) {
    return {
      name: "PHP template",
      subLanguage: 'xml',
      contains: [
        {
          begin: /<\?(php|=)?/,
          end: /\?>/,
          subLanguage: 'php',
          contains: [
            // We don't want the php closing tag ?> to close the PHP block when
            // inside any of the following blocks:
            {
              begin: '/\\*',
              end: '\\*/',
              skip: true
            },
            {
              begin: 'b"',
              end: '"',
              skip: true
            },
            {
              begin: 'b\'',
              end: '\'',
              skip: true
            },
            hljs.inherit(hljs.APOS_STRING_MODE, {
              illegal: null,
              className: null,
              contains: null,
              skip: true
            }),
            hljs.inherit(hljs.QUOTE_STRING_MODE, {
              illegal: null,
              className: null,
              contains: null,
              skip: true
            })
          ]
        }
      ]
    };
  }

  return phpTemplate;

})();

    hljs.registerLanguage('php-template', hljsGrammar);
  })();/*! `plaintext` grammar compiled for Highlight.js 11.10.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Plain text
  Author: Egor Rogov (e.rogov@postgrespro.ru)
  Description: Plain text without any highlighting.
  Category: common
  */

  function plaintext(hljs) {
    return {
      name: 'Plain text',
      aliases: [
        'text',
        'txt'
      ],
      disableAutodetect: true
    };
  }

  return plaintext;

})();

    hljs.registerLanguage('plaintext', hljsGrammar);
  })();/*! `powershell` grammar compiled for Highlight.js 11.10.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: PowerShell
  Description: PowerShell is a task-based command-line shell and scripting language built on .NET.
  Author: David Mohundro <david@mohundro.com>
  Contributors: Nicholas Blumhardt <nblumhardt@nblumhardt.com>, Victor Zhou <OiCMudkips@users.noreply.github.com>, Nicolas Le Gall <contact@nlegall.fr>
  Website: https://docs.microsoft.com/en-us/powershell/
  Category: scripting
  */

  function powershell(hljs) {
    const TYPES = [
      "string",
      "char",
      "byte",
      "int",
      "long",
      "bool",
      "decimal",
      "single",
      "double",
      "DateTime",
      "xml",
      "array",
      "hashtable",
      "void"
    ];

    // https://docs.microsoft.com/en-us/powershell/scripting/developer/cmdlet/approved-verbs-for-windows-powershell-commands
    const VALID_VERBS =
      'Add|Clear|Close|Copy|Enter|Exit|Find|Format|Get|Hide|Join|Lock|'
      + 'Move|New|Open|Optimize|Pop|Push|Redo|Remove|Rename|Reset|Resize|'
      + 'Search|Select|Set|Show|Skip|Split|Step|Switch|Undo|Unlock|'
      + 'Watch|Backup|Checkpoint|Compare|Compress|Convert|ConvertFrom|'
      + 'ConvertTo|Dismount|Edit|Expand|Export|Group|Import|Initialize|'
      + 'Limit|Merge|Mount|Out|Publish|Restore|Save|Sync|Unpublish|Update|'
      + 'Approve|Assert|Build|Complete|Confirm|Deny|Deploy|Disable|Enable|Install|Invoke|'
      + 'Register|Request|Restart|Resume|Start|Stop|Submit|Suspend|Uninstall|'
      + 'Unregister|Wait|Debug|Measure|Ping|Repair|Resolve|Test|Trace|Connect|'
      + 'Disconnect|Read|Receive|Send|Write|Block|Grant|Protect|Revoke|Unblock|'
      + 'Unprotect|Use|ForEach|Sort|Tee|Where';

    const COMPARISON_OPERATORS =
      '-and|-as|-band|-bnot|-bor|-bxor|-casesensitive|-ccontains|-ceq|-cge|-cgt|'
      + '-cle|-clike|-clt|-cmatch|-cne|-cnotcontains|-cnotlike|-cnotmatch|-contains|'
      + '-creplace|-csplit|-eq|-exact|-f|-file|-ge|-gt|-icontains|-ieq|-ige|-igt|'
      + '-ile|-ilike|-ilt|-imatch|-in|-ine|-inotcontains|-inotlike|-inotmatch|'
      + '-ireplace|-is|-isnot|-isplit|-join|-le|-like|-lt|-match|-ne|-not|'
      + '-notcontains|-notin|-notlike|-notmatch|-or|-regex|-replace|-shl|-shr|'
      + '-split|-wildcard|-xor';

    const KEYWORDS = {
      $pattern: /-?[A-z\.\-]+\b/,
      keyword:
        'if else foreach return do while until elseif begin for trap data dynamicparam '
        + 'end break throw param continue finally in switch exit filter try process catch '
        + 'hidden static parameter',
      // "echo" relevance has been set to 0 to avoid auto-detect conflicts with shell transcripts
      built_in:
        'ac asnp cat cd CFS chdir clc clear clhy cli clp cls clv cnsn compare copy cp '
        + 'cpi cpp curl cvpa dbp del diff dir dnsn ebp echo|0 epal epcsv epsn erase etsn exsn fc fhx '
        + 'fl ft fw gal gbp gc gcb gci gcm gcs gdr gerr ghy gi gin gjb gl gm gmo gp gps gpv group '
        + 'gsn gsnp gsv gtz gu gv gwmi h history icm iex ihy ii ipal ipcsv ipmo ipsn irm ise iwmi '
        + 'iwr kill lp ls man md measure mi mount move mp mv nal ndr ni nmo npssc nsn nv ogv oh '
        + 'popd ps pushd pwd r rbp rcjb rcsn rd rdr ren ri rjb rm rmdir rmo rni rnp rp rsn rsnp '
        + 'rujb rv rvpa rwmi sajb sal saps sasv sbp sc scb select set shcm si sl sleep sls sort sp '
        + 'spjb spps spsv start stz sujb sv swmi tee trcm type wget where wjb write'
      // TODO: 'validate[A-Z]+' can't work in keywords
    };

    const TITLE_NAME_RE = /\w[\w\d]*((-)[\w\d]+)*/;

    const BACKTICK_ESCAPE = {
      begin: '`[\\s\\S]',
      relevance: 0
    };

    const VAR = {
      className: 'variable',
      variants: [
        { begin: /\$\B/ },
        {
          className: 'keyword',
          begin: /\$this/
        },
        { begin: /\$[\w\d][\w\d_:]*/ }
      ]
    };

    const LITERAL = {
      className: 'literal',
      begin: /\$(null|true|false)\b/
    };

    const QUOTE_STRING = {
      className: "string",
      variants: [
        {
          begin: /"/,
          end: /"/
        },
        {
          begin: /@"/,
          end: /^"@/
        }
      ],
      contains: [
        BACKTICK_ESCAPE,
        VAR,
        {
          className: 'variable',
          begin: /\$[A-z]/,
          end: /[^A-z]/
        }
      ]
    };

    const APOS_STRING = {
      className: 'string',
      variants: [
        {
          begin: /'/,
          end: /'/
        },
        {
          begin: /@'/,
          end: /^'@/
        }
      ]
    };

    const PS_HELPTAGS = {
      className: "doctag",
      variants: [
        /* no paramater help tags */
        { begin: /\.(synopsis|description|example|inputs|outputs|notes|link|component|role|functionality)/ },
        /* one parameter help tags */
        { begin: /\.(parameter|forwardhelptargetname|forwardhelpcategory|remotehelprunspace|externalhelp)\s+\S+/ }
      ]
    };

    const PS_COMMENT = hljs.inherit(
      hljs.COMMENT(null, null),
      {
        variants: [
          /* single-line comment */
          {
            begin: /#/,
            end: /$/
          },
          /* multi-line comment */
          {
            begin: /<#/,
            end: /#>/
          }
        ],
        contains: [ PS_HELPTAGS ]
      }
    );

    const CMDLETS = {
      className: 'built_in',
      variants: [ { begin: '('.concat(VALID_VERBS, ')+(-)[\\w\\d]+') } ]
    };

    const PS_CLASS = {
      className: 'class',
      beginKeywords: 'class enum',
      end: /\s*[{]/,
      excludeEnd: true,
      relevance: 0,
      contains: [ hljs.TITLE_MODE ]
    };

    const PS_FUNCTION = {
      className: 'function',
      begin: /function\s+/,
      end: /\s*\{|$/,
      excludeEnd: true,
      returnBegin: true,
      relevance: 0,
      contains: [
        {
          begin: "function",
          relevance: 0,
          className: "keyword"
        },
        {
          className: "title",
          begin: TITLE_NAME_RE,
          relevance: 0
        },
        {
          begin: /\(/,
          end: /\)/,
          className: "params",
          relevance: 0,
          contains: [ VAR ]
        }
        // CMDLETS
      ]
    };

    // Using statment, plus type, plus assembly name.
    const PS_USING = {
      begin: /using\s/,
      end: /$/,
      returnBegin: true,
      contains: [
        QUOTE_STRING,
        APOS_STRING,
        {
          className: 'keyword',
          begin: /(using|assembly|command|module|namespace|type)/
        }
      ]
    };

    // Comperison operators & function named parameters.
    const PS_ARGUMENTS = { variants: [
      // PS literals are pretty verbose so it's a good idea to accent them a bit.
      {
        className: 'operator',
        begin: '('.concat(COMPARISON_OPERATORS, ')\\b')
      },
      {
        className: 'literal',
        begin: /(-){1,2}[\w\d-]+/,
        relevance: 0
      }
    ] };

    const HASH_SIGNS = {
      className: 'selector-tag',
      begin: /@\B/,
      relevance: 0
    };

    // It's a very general rule so I'll narrow it a bit with some strict boundaries
    // to avoid any possible false-positive collisions!
    const PS_METHODS = {
      className: 'function',
      begin: /\[.*\]\s*[\w]+[ ]??\(/,
      end: /$/,
      returnBegin: true,
      relevance: 0,
      contains: [
        {
          className: 'keyword',
          begin: '('.concat(
            KEYWORDS.keyword.toString().replace(/\s/g, '|'
            ), ')\\b'),
          endsParent: true,
          relevance: 0
        },
        hljs.inherit(hljs.TITLE_MODE, { endsParent: true })
      ]
    };

    const GENTLEMANS_SET = [
      // STATIC_MEMBER,
      PS_METHODS,
      PS_COMMENT,
      BACKTICK_ESCAPE,
      hljs.NUMBER_MODE,
      QUOTE_STRING,
      APOS_STRING,
      // PS_NEW_OBJECT_TYPE,
      CMDLETS,
      VAR,
      LITERAL,
      HASH_SIGNS
    ];

    const PS_TYPE = {
      begin: /\[/,
      end: /\]/,
      excludeBegin: true,
      excludeEnd: true,
      relevance: 0,
      contains: [].concat(
        'self',
        GENTLEMANS_SET,
        {
          begin: "(" + TYPES.join("|") + ")",
          className: "built_in",
          relevance: 0
        },
        {
          className: 'type',
          begin: /[\.\w\d]+/,
          relevance: 0
        }
      )
    };

    PS_METHODS.contains.unshift(PS_TYPE);

    return {
      name: 'PowerShell',
      aliases: [
        "pwsh",
        "ps",
        "ps1"
      ],
      case_insensitive: true,
      keywords: KEYWORDS,
      contains: GENTLEMANS_SET.concat(
        PS_CLASS,
        PS_FUNCTION,
        PS_USING,
        PS_ARGUMENTS,
        PS_TYPE
      )
    };
  }

  return powershell;

})();

    hljs.registerLanguage('powershell', hljsGrammar);
  })();/*! `python` grammar compiled for Highlight.js 11.10.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Python
  Description: Python is an interpreted, object-oriented, high-level programming language with dynamic semantics.
  Website: https://www.python.org
  Category: common
  */

  function python(hljs) {
    const regex = hljs.regex;
    const IDENT_RE = /[\p{XID_Start}_]\p{XID_Continue}*/u;
    const RESERVED_WORDS = [
      'and',
      'as',
      'assert',
      'async',
      'await',
      'break',
      'case',
      'class',
      'continue',
      'def',
      'del',
      'elif',
      'else',
      'except',
      'finally',
      'for',
      'from',
      'global',
      'if',
      'import',
      'in',
      'is',
      'lambda',
      'match',
      'nonlocal|10',
      'not',
      'or',
      'pass',
      'raise',
      'return',
      'try',
      'while',
      'with',
      'yield'
    ];

    const BUILT_INS = [
      '__import__',
      'abs',
      'all',
      'any',
      'ascii',
      'bin',
      'bool',
      'breakpoint',
      'bytearray',
      'bytes',
      'callable',
      'chr',
      'classmethod',
      'compile',
      'complex',
      'delattr',
      'dict',
      'dir',
      'divmod',
      'enumerate',
      'eval',
      'exec',
      'filter',
      'float',
      'format',
      'frozenset',
      'getattr',
      'globals',
      'hasattr',
      'hash',
      'help',
      'hex',
      'id',
      'input',
      'int',
      'isinstance',
      'issubclass',
      'iter',
      'len',
      'list',
      'locals',
      'map',
      'max',
      'memoryview',
      'min',
      'next',
      'object',
      'oct',
      'open',
      'ord',
      'pow',
      'print',
      'property',
      'range',
      'repr',
      'reversed',
      'round',
      'set',
      'setattr',
      'slice',
      'sorted',
      'staticmethod',
      'str',
      'sum',
      'super',
      'tuple',
      'type',
      'vars',
      'zip'
    ];

    const LITERALS = [
      '__debug__',
      'Ellipsis',
      'False',
      'None',
      'NotImplemented',
      'True'
    ];

    // https://docs.python.org/3/library/typing.html
    // TODO: Could these be supplemented by a CamelCase matcher in certain
    // contexts, leaving these remaining only for relevance hinting?
    const TYPES = [
      "Any",
      "Callable",
      "Coroutine",
      "Dict",
      "List",
      "Literal",
      "Generic",
      "Optional",
      "Sequence",
      "Set",
      "Tuple",
      "Type",
      "Union"
    ];

    const KEYWORDS = {
      $pattern: /[A-Za-z]\w+|__\w+__/,
      keyword: RESERVED_WORDS,
      built_in: BUILT_INS,
      literal: LITERALS,
      type: TYPES
    };

    const PROMPT = {
      className: 'meta',
      begin: /^(>>>|\.\.\.) /
    };

    const SUBST = {
      className: 'subst',
      begin: /\{/,
      end: /\}/,
      keywords: KEYWORDS,
      illegal: /#/
    };

    const LITERAL_BRACKET = {
      begin: /\{\{/,
      relevance: 0
    };

    const STRING = {
      className: 'string',
      contains: [ hljs.BACKSLASH_ESCAPE ],
      variants: [
        {
          begin: /([uU]|[bB]|[rR]|[bB][rR]|[rR][bB])?'''/,
          end: /'''/,
          contains: [
            hljs.BACKSLASH_ESCAPE,
            PROMPT
          ],
          relevance: 10
        },
        {
          begin: /([uU]|[bB]|[rR]|[bB][rR]|[rR][bB])?"""/,
          end: /"""/,
          contains: [
            hljs.BACKSLASH_ESCAPE,
            PROMPT
          ],
          relevance: 10
        },
        {
          begin: /([fF][rR]|[rR][fF]|[fF])'''/,
          end: /'''/,
          contains: [
            hljs.BACKSLASH_ESCAPE,
            PROMPT,
            LITERAL_BRACKET,
            SUBST
          ]
        },
        {
          begin: /([fF][rR]|[rR][fF]|[fF])"""/,
          end: /"""/,
          contains: [
            hljs.BACKSLASH_ESCAPE,
            PROMPT,
            LITERAL_BRACKET,
            SUBST
          ]
        },
        {
          begin: /([uU]|[rR])'/,
          end: /'/,
          relevance: 10
        },
        {
          begin: /([uU]|[rR])"/,
          end: /"/,
          relevance: 10
        },
        {
          begin: /([bB]|[bB][rR]|[rR][bB])'/,
          end: /'/
        },
        {
          begin: /([bB]|[bB][rR]|[rR][bB])"/,
          end: /"/
        },
        {
          begin: /([fF][rR]|[rR][fF]|[fF])'/,
          end: /'/,
          contains: [
            hljs.BACKSLASH_ESCAPE,
            LITERAL_BRACKET,
            SUBST
          ]
        },
        {
          begin: /([fF][rR]|[rR][fF]|[fF])"/,
          end: /"/,
          contains: [
            hljs.BACKSLASH_ESCAPE,
            LITERAL_BRACKET,
            SUBST
          ]
        },
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE
      ]
    };

    // https://docs.python.org/3.9/reference/lexical_analysis.html#numeric-literals
    const digitpart = '[0-9](_?[0-9])*';
    const pointfloat = `(\\b(${digitpart}))?\\.(${digitpart})|\\b(${digitpart})\\.`;
    // Whitespace after a number (or any lexical token) is needed only if its absence
    // would change the tokenization
    // https://docs.python.org/3.9/reference/lexical_analysis.html#whitespace-between-tokens
    // We deviate slightly, requiring a word boundary or a keyword
    // to avoid accidentally recognizing *prefixes* (e.g., `0` in `0x41` or `08` or `0__1`)
    const lookahead = `\\b|${RESERVED_WORDS.join('|')}`;
    const NUMBER = {
      className: 'number',
      relevance: 0,
      variants: [
        // exponentfloat, pointfloat
        // https://docs.python.org/3.9/reference/lexical_analysis.html#floating-point-literals
        // optionally imaginary
        // https://docs.python.org/3.9/reference/lexical_analysis.html#imaginary-literals
        // Note: no leading \b because floats can start with a decimal point
        // and we don't want to mishandle e.g. `fn(.5)`,
        // no trailing \b for pointfloat because it can end with a decimal point
        // and we don't want to mishandle e.g. `0..hex()`; this should be safe
        // because both MUST contain a decimal point and so cannot be confused with
        // the interior part of an identifier
        {
          begin: `(\\b(${digitpart})|(${pointfloat}))[eE][+-]?(${digitpart})[jJ]?(?=${lookahead})`
        },
        {
          begin: `(${pointfloat})[jJ]?`
        },

        // decinteger, bininteger, octinteger, hexinteger
        // https://docs.python.org/3.9/reference/lexical_analysis.html#integer-literals
        // optionally "long" in Python 2
        // https://docs.python.org/2.7/reference/lexical_analysis.html#integer-and-long-integer-literals
        // decinteger is optionally imaginary
        // https://docs.python.org/3.9/reference/lexical_analysis.html#imaginary-literals
        {
          begin: `\\b([1-9](_?[0-9])*|0+(_?0)*)[lLjJ]?(?=${lookahead})`
        },
        {
          begin: `\\b0[bB](_?[01])+[lL]?(?=${lookahead})`
        },
        {
          begin: `\\b0[oO](_?[0-7])+[lL]?(?=${lookahead})`
        },
        {
          begin: `\\b0[xX](_?[0-9a-fA-F])+[lL]?(?=${lookahead})`
        },

        // imagnumber (digitpart-based)
        // https://docs.python.org/3.9/reference/lexical_analysis.html#imaginary-literals
        {
          begin: `\\b(${digitpart})[jJ](?=${lookahead})`
        }
      ]
    };
    const COMMENT_TYPE = {
      className: "comment",
      begin: regex.lookahead(/# type:/),
      end: /$/,
      keywords: KEYWORDS,
      contains: [
        { // prevent keywords from coloring `type`
          begin: /# type:/
        },
        // comment within a datatype comment includes no keywords
        {
          begin: /#/,
          end: /\b\B/,
          endsWithParent: true
        }
      ]
    };
    const PARAMS = {
      className: 'params',
      variants: [
        // Exclude params in functions without params
        {
          className: "",
          begin: /\(\s*\)/,
          skip: true
        },
        {
          begin: /\(/,
          end: /\)/,
          excludeBegin: true,
          excludeEnd: true,
          keywords: KEYWORDS,
          contains: [
            'self',
            PROMPT,
            NUMBER,
            STRING,
            hljs.HASH_COMMENT_MODE
          ]
        }
      ]
    };
    SUBST.contains = [
      STRING,
      NUMBER,
      PROMPT
    ];

    return {
      name: 'Python',
      aliases: [
        'py',
        'gyp',
        'ipython'
      ],
      unicodeRegex: true,
      keywords: KEYWORDS,
      illegal: /(<\/|\?)|=>/,
      contains: [
        PROMPT,
        NUMBER,
        {
          // very common convention
          scope: 'variable.language',
          match: /\bself\b/
        },
        {
          // eat "if" prior to string so that it won't accidentally be
          // labeled as an f-string
          beginKeywords: "if",
          relevance: 0
        },
        { match: /\bor\b/, scope: "keyword" },
        STRING,
        COMMENT_TYPE,
        hljs.HASH_COMMENT_MODE,
        {
          match: [
            /\bdef/, /\s+/,
            IDENT_RE,
          ],
          scope: {
            1: "keyword",
            3: "title.function"
          },
          contains: [ PARAMS ]
        },
        {
          variants: [
            {
              match: [
                /\bclass/, /\s+/,
                IDENT_RE, /\s*/,
                /\(\s*/, IDENT_RE,/\s*\)/
              ],
            },
            {
              match: [
                /\bclass/, /\s+/,
                IDENT_RE
              ],
            }
          ],
          scope: {
            1: "keyword",
            3: "title.class",
            6: "title.class.inherited",
          }
        },
        {
          className: 'meta',
          begin: /^[\t ]*@/,
          end: /(?=#)|$/,
          contains: [
            NUMBER,
            PARAMS,
            STRING
          ]
        }
      ]
    };
  }

  return python;

})();

    hljs.registerLanguage('python', hljsGrammar);
  })();/*! `rsl` grammar compiled for Highlight.js 11.10.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: RenderMan RSL
  Author: Konstantin Evdokimenko <qewerty@gmail.com>
  Contributors: Shuen-Huei Guan <drake.guan@gmail.com>
  Website: https://renderman.pixar.com/resources/RenderMan_20/shadingLanguage.html
  Category: graphics
  */

  function rsl(hljs) {
    const BUILT_INS = [
      "abs",
      "acos",
      "ambient",
      "area",
      "asin",
      "atan",
      "atmosphere",
      "attribute",
      "calculatenormal",
      "ceil",
      "cellnoise",
      "clamp",
      "comp",
      "concat",
      "cos",
      "degrees",
      "depth",
      "Deriv",
      "diffuse",
      "distance",
      "Du",
      "Dv",
      "environment",
      "exp",
      "faceforward",
      "filterstep",
      "floor",
      "format",
      "fresnel",
      "incident",
      "length",
      "lightsource",
      "log",
      "match",
      "max",
      "min",
      "mod",
      "noise",
      "normalize",
      "ntransform",
      "opposite",
      "option",
      "phong",
      "pnoise",
      "pow",
      "printf",
      "ptlined",
      "radians",
      "random",
      "reflect",
      "refract",
      "renderinfo",
      "round",
      "setcomp",
      "setxcomp",
      "setycomp",
      "setzcomp",
      "shadow",
      "sign",
      "sin",
      "smoothstep",
      "specular",
      "specularbrdf",
      "spline",
      "sqrt",
      "step",
      "tan",
      "texture",
      "textureinfo",
      "trace",
      "transform",
      "vtransform",
      "xcomp",
      "ycomp",
      "zcomp"
    ];

    const TYPES = [
      "matrix",
      "float",
      "color",
      "point",
      "normal",
      "vector"
    ];

    const KEYWORDS = [
      "while",
      "for",
      "if",
      "do",
      "return",
      "else",
      "break",
      "extern",
      "continue"
    ];

    const CLASS_DEFINITION = {
      match: [
        /(surface|displacement|light|volume|imager)/,
        /\s+/,
        hljs.IDENT_RE,
      ],
      scope: {
        1: "keyword",
        3: "title.class",
      }
    };

    return {
      name: 'RenderMan RSL',
      keywords: {
        keyword: KEYWORDS,
        built_in: BUILT_INS,
        type: TYPES
      },
      illegal: '</',
      contains: [
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        hljs.QUOTE_STRING_MODE,
        hljs.APOS_STRING_MODE,
        hljs.C_NUMBER_MODE,
        {
          className: 'meta',
          begin: '#',
          end: '$'
        },
        CLASS_DEFINITION,
        {
          beginKeywords: 'illuminate illuminance gather',
          end: '\\('
        }
      ]
    };
  }

  return rsl;

})();

    hljs.registerLanguage('rsl', hljsGrammar);
  })();/*! `shell` grammar compiled for Highlight.js 11.10.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Shell Session
  Requires: bash.js
  Author: TSUYUSATO Kitsune <make.just.on@gmail.com>
  Category: common
  Audit: 2020
  */

  /** @type LanguageFn */
  function shell(hljs) {
    return {
      name: 'Shell Session',
      aliases: [
        'console',
        'shellsession'
      ],
      contains: [
        {
          className: 'meta.prompt',
          // We cannot add \s (spaces) in the regular expression otherwise it will be too broad and produce unexpected result.
          // For instance, in the following example, it would match "echo /path/to/home >" as a prompt:
          // echo /path/to/home > t.exe
          begin: /^\s{0,3}[/~\w\d[\]()@-]*[>%$#][ ]?/,
          starts: {
            end: /[^\\](?=\s*$)/,
            subLanguage: 'bash'
          }
        }
      ]
    };
  }

  return shell;

})();

    hljs.registerLanguage('shell', hljsGrammar);
  })();/*! `sql` grammar compiled for Highlight.js 11.10.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
   Language: SQL
   Website: https://en.wikipedia.org/wiki/SQL
   Category: common, database
   */

  /*

  Goals:

  SQL is intended to highlight basic/common SQL keywords and expressions

  - If pretty much every single SQL server includes supports, then it's a canidate.
  - It is NOT intended to include tons of vendor specific keywords (Oracle, MySQL,
    PostgreSQL) although the list of data types is purposely a bit more expansive.
  - For more specific SQL grammars please see:
    - PostgreSQL and PL/pgSQL - core
    - T-SQL - https://github.com/highlightjs/highlightjs-tsql
    - sql_more (core)

   */

  function sql(hljs) {
    const regex = hljs.regex;
    const COMMENT_MODE = hljs.COMMENT('--', '$');
    const STRING = {
      className: 'string',
      variants: [
        {
          begin: /'/,
          end: /'/,
          contains: [ { begin: /''/ } ]
        }
      ]
    };
    const QUOTED_IDENTIFIER = {
      begin: /"/,
      end: /"/,
      contains: [ { begin: /""/ } ]
    };

    const LITERALS = [
      "true",
      "false",
      // Not sure it's correct to call NULL literal, and clauses like IS [NOT] NULL look strange that way.
      // "null",
      "unknown"
    ];

    const MULTI_WORD_TYPES = [
      "double precision",
      "large object",
      "with timezone",
      "without timezone"
    ];

    const TYPES = [
      'bigint',
      'binary',
      'blob',
      'boolean',
      'char',
      'character',
      'clob',
      'date',
      'dec',
      'decfloat',
      'decimal',
      'float',
      'int',
      'integer',
      'interval',
      'nchar',
      'nclob',
      'national',
      'numeric',
      'real',
      'row',
      'smallint',
      'time',
      'timestamp',
      'varchar',
      'varying', // modifier (character varying)
      'varbinary'
    ];

    const NON_RESERVED_WORDS = [
      "add",
      "asc",
      "collation",
      "desc",
      "final",
      "first",
      "last",
      "view"
    ];

    // https://jakewheat.github.io/sql-overview/sql-2016-foundation-grammar.html#reserved-word
    const RESERVED_WORDS = [
      "abs",
      "acos",
      "all",
      "allocate",
      "alter",
      "and",
      "any",
      "are",
      "array",
      "array_agg",
      "array_max_cardinality",
      "as",
      "asensitive",
      "asin",
      "asymmetric",
      "at",
      "atan",
      "atomic",
      "authorization",
      "avg",
      "begin",
      "begin_frame",
      "begin_partition",
      "between",
      "bigint",
      "binary",
      "blob",
      "boolean",
      "both",
      "by",
      "call",
      "called",
      "cardinality",
      "cascaded",
      "case",
      "cast",
      "ceil",
      "ceiling",
      "char",
      "char_length",
      "character",
      "character_length",
      "check",
      "classifier",
      "clob",
      "close",
      "coalesce",
      "collate",
      "collect",
      "column",
      "commit",
      "condition",
      "connect",
      "constraint",
      "contains",
      "convert",
      "copy",
      "corr",
      "corresponding",
      "cos",
      "cosh",
      "count",
      "covar_pop",
      "covar_samp",
      "create",
      "cross",
      "cube",
      "cume_dist",
      "current",
      "current_catalog",
      "current_date",
      "current_default_transform_group",
      "current_path",
      "current_role",
      "current_row",
      "current_schema",
      "current_time",
      "current_timestamp",
      "current_path",
      "current_role",
      "current_transform_group_for_type",
      "current_user",
      "cursor",
      "cycle",
      "date",
      "day",
      "deallocate",
      "dec",
      "decimal",
      "decfloat",
      "declare",
      "default",
      "define",
      "delete",
      "dense_rank",
      "deref",
      "describe",
      "deterministic",
      "disconnect",
      "distinct",
      "double",
      "drop",
      "dynamic",
      "each",
      "element",
      "else",
      "empty",
      "end",
      "end_frame",
      "end_partition",
      "end-exec",
      "equals",
      "escape",
      "every",
      "except",
      "exec",
      "execute",
      "exists",
      "exp",
      "external",
      "extract",
      "false",
      "fetch",
      "filter",
      "first_value",
      "float",
      "floor",
      "for",
      "foreign",
      "frame_row",
      "free",
      "from",
      "full",
      "function",
      "fusion",
      "get",
      "global",
      "grant",
      "group",
      "grouping",
      "groups",
      "having",
      "hold",
      "hour",
      "identity",
      "in",
      "indicator",
      "initial",
      "inner",
      "inout",
      "insensitive",
      "insert",
      "int",
      "integer",
      "intersect",
      "intersection",
      "interval",
      "into",
      "is",
      "join",
      "json_array",
      "json_arrayagg",
      "json_exists",
      "json_object",
      "json_objectagg",
      "json_query",
      "json_table",
      "json_table_primitive",
      "json_value",
      "lag",
      "language",
      "large",
      "last_value",
      "lateral",
      "lead",
      "leading",
      "left",
      "like",
      "like_regex",
      "listagg",
      "ln",
      "local",
      "localtime",
      "localtimestamp",
      "log",
      "log10",
      "lower",
      "match",
      "match_number",
      "match_recognize",
      "matches",
      "max",
      "member",
      "merge",
      "method",
      "min",
      "minute",
      "mod",
      "modifies",
      "module",
      "month",
      "multiset",
      "national",
      "natural",
      "nchar",
      "nclob",
      "new",
      "no",
      "none",
      "normalize",
      "not",
      "nth_value",
      "ntile",
      "null",
      "nullif",
      "numeric",
      "octet_length",
      "occurrences_regex",
      "of",
      "offset",
      "old",
      "omit",
      "on",
      "one",
      "only",
      "open",
      "or",
      "order",
      "out",
      "outer",
      "over",
      "overlaps",
      "overlay",
      "parameter",
      "partition",
      "pattern",
      "per",
      "percent",
      "percent_rank",
      "percentile_cont",
      "percentile_disc",
      "period",
      "portion",
      "position",
      "position_regex",
      "power",
      "precedes",
      "precision",
      "prepare",
      "primary",
      "procedure",
      "ptf",
      "range",
      "rank",
      "reads",
      "real",
      "recursive",
      "ref",
      "references",
      "referencing",
      "regr_avgx",
      "regr_avgy",
      "regr_count",
      "regr_intercept",
      "regr_r2",
      "regr_slope",
      "regr_sxx",
      "regr_sxy",
      "regr_syy",
      "release",
      "result",
      "return",
      "returns",
      "revoke",
      "right",
      "rollback",
      "rollup",
      "row",
      "row_number",
      "rows",
      "running",
      "savepoint",
      "scope",
      "scroll",
      "search",
      "second",
      "seek",
      "select",
      "sensitive",
      "session_user",
      "set",
      "show",
      "similar",
      "sin",
      "sinh",
      "skip",
      "smallint",
      "some",
      "specific",
      "specifictype",
      "sql",
      "sqlexception",
      "sqlstate",
      "sqlwarning",
      "sqrt",
      "start",
      "static",
      "stddev_pop",
      "stddev_samp",
      "submultiset",
      "subset",
      "substring",
      "substring_regex",
      "succeeds",
      "sum",
      "symmetric",
      "system",
      "system_time",
      "system_user",
      "table",
      "tablesample",
      "tan",
      "tanh",
      "then",
      "time",
      "timestamp",
      "timezone_hour",
      "timezone_minute",
      "to",
      "trailing",
      "translate",
      "translate_regex",
      "translation",
      "treat",
      "trigger",
      "trim",
      "trim_array",
      "true",
      "truncate",
      "uescape",
      "union",
      "unique",
      "unknown",
      "unnest",
      "update",
      "upper",
      "user",
      "using",
      "value",
      "values",
      "value_of",
      "var_pop",
      "var_samp",
      "varbinary",
      "varchar",
      "varying",
      "versioning",
      "when",
      "whenever",
      "where",
      "width_bucket",
      "window",
      "with",
      "within",
      "without",
      "year",
    ];

    // these are reserved words we have identified to be functions
    // and should only be highlighted in a dispatch-like context
    // ie, array_agg(...), etc.
    const RESERVED_FUNCTIONS = [
      "abs",
      "acos",
      "array_agg",
      "asin",
      "atan",
      "avg",
      "cast",
      "ceil",
      "ceiling",
      "coalesce",
      "corr",
      "cos",
      "cosh",
      "count",
      "covar_pop",
      "covar_samp",
      "cume_dist",
      "dense_rank",
      "deref",
      "element",
      "exp",
      "extract",
      "first_value",
      "floor",
      "json_array",
      "json_arrayagg",
      "json_exists",
      "json_object",
      "json_objectagg",
      "json_query",
      "json_table",
      "json_table_primitive",
      "json_value",
      "lag",
      "last_value",
      "lead",
      "listagg",
      "ln",
      "log",
      "log10",
      "lower",
      "max",
      "min",
      "mod",
      "nth_value",
      "ntile",
      "nullif",
      "percent_rank",
      "percentile_cont",
      "percentile_disc",
      "position",
      "position_regex",
      "power",
      "rank",
      "regr_avgx",
      "regr_avgy",
      "regr_count",
      "regr_intercept",
      "regr_r2",
      "regr_slope",
      "regr_sxx",
      "regr_sxy",
      "regr_syy",
      "row_number",
      "sin",
      "sinh",
      "sqrt",
      "stddev_pop",
      "stddev_samp",
      "substring",
      "substring_regex",
      "sum",
      "tan",
      "tanh",
      "translate",
      "translate_regex",
      "treat",
      "trim",
      "trim_array",
      "unnest",
      "upper",
      "value_of",
      "var_pop",
      "var_samp",
      "width_bucket",
    ];

    // these functions can
    const POSSIBLE_WITHOUT_PARENS = [
      "current_catalog",
      "current_date",
      "current_default_transform_group",
      "current_path",
      "current_role",
      "current_schema",
      "current_transform_group_for_type",
      "current_user",
      "session_user",
      "system_time",
      "system_user",
      "current_time",
      "localtime",
      "current_timestamp",
      "localtimestamp"
    ];

    // those exist to boost relevance making these very
    // "SQL like" keyword combos worth +1 extra relevance
    const COMBOS = [
      "create table",
      "insert into",
      "primary key",
      "foreign key",
      "not null",
      "alter table",
      "add constraint",
      "grouping sets",
      "on overflow",
      "character set",
      "respect nulls",
      "ignore nulls",
      "nulls first",
      "nulls last",
      "depth first",
      "breadth first"
    ];

    const FUNCTIONS = RESERVED_FUNCTIONS;

    const KEYWORDS = [
      ...RESERVED_WORDS,
      ...NON_RESERVED_WORDS
    ].filter((keyword) => {
      return !RESERVED_FUNCTIONS.includes(keyword);
    });

    const VARIABLE = {
      className: "variable",
      begin: /@[a-z0-9][a-z0-9_]*/,
    };

    const OPERATOR = {
      className: "operator",
      begin: /[-+*/=%^~]|&&?|\|\|?|!=?|<(?:=>?|<|>)?|>[>=]?/,
      relevance: 0,
    };

    const FUNCTION_CALL = {
      begin: regex.concat(/\b/, regex.either(...FUNCTIONS), /\s*\(/),
      relevance: 0,
      keywords: { built_in: FUNCTIONS }
    };

    // keywords with less than 3 letters are reduced in relevancy
    function reduceRelevancy(list, {
      exceptions, when
    } = {}) {
      const qualifyFn = when;
      exceptions = exceptions || [];
      return list.map((item) => {
        if (item.match(/\|\d+$/) || exceptions.includes(item)) {
          return item;
        } else if (qualifyFn(item)) {
          return `${item}|0`;
        } else {
          return item;
        }
      });
    }

    return {
      name: 'SQL',
      case_insensitive: true,
      // does not include {} or HTML tags `</`
      illegal: /[{}]|<\//,
      keywords: {
        $pattern: /\b[\w\.]+/,
        keyword:
          reduceRelevancy(KEYWORDS, { when: (x) => x.length < 3 }),
        literal: LITERALS,
        type: TYPES,
        built_in: POSSIBLE_WITHOUT_PARENS
      },
      contains: [
        {
          begin: regex.either(...COMBOS),
          relevance: 0,
          keywords: {
            $pattern: /[\w\.]+/,
            keyword: KEYWORDS.concat(COMBOS),
            literal: LITERALS,
            type: TYPES
          },
        },
        {
          className: "type",
          begin: regex.either(...MULTI_WORD_TYPES)
        },
        FUNCTION_CALL,
        VARIABLE,
        STRING,
        QUOTED_IDENTIFIER,
        hljs.C_NUMBER_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        COMMENT_MODE,
        OPERATOR
      ]
    };
  }

  return sql;

})();

    hljs.registerLanguage('sql', hljsGrammar);
  })();/*! `swift` grammar compiled for Highlight.js 11.10.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /**
   * @param {string} value
   * @returns {RegExp}
   * */

  /**
   * @param {RegExp | string } re
   * @returns {string}
   */
  function source(re) {
    if (!re) return null;
    if (typeof re === "string") return re;

    return re.source;
  }

  /**
   * @param {RegExp | string } re
   * @returns {string}
   */
  function lookahead(re) {
    return concat('(?=', re, ')');
  }

  /**
   * @param {...(RegExp | string) } args
   * @returns {string}
   */
  function concat(...args) {
    const joined = args.map((x) => source(x)).join("");
    return joined;
  }

  /**
   * @param { Array<string | RegExp | Object> } args
   * @returns {object}
   */
  function stripOptionsFromArgs(args) {
    const opts = args[args.length - 1];

    if (typeof opts === 'object' && opts.constructor === Object) {
      args.splice(args.length - 1, 1);
      return opts;
    } else {
      return {};
    }
  }

  /** @typedef { {capture?: boolean} } RegexEitherOptions */

  /**
   * Any of the passed expresssions may match
   *
   * Creates a huge this | this | that | that match
   * @param {(RegExp | string)[] | [...(RegExp | string)[], RegexEitherOptions]} args
   * @returns {string}
   */
  function either(...args) {
    /** @type { object & {capture?: boolean} }  */
    const opts = stripOptionsFromArgs(args);
    const joined = '('
      + (opts.capture ? "" : "?:")
      + args.map((x) => source(x)).join("|") + ")";
    return joined;
  }

  const keywordWrapper = keyword => concat(
    /\b/,
    keyword,
    /\w$/.test(keyword) ? /\b/ : /\B/
  );

  // Keywords that require a leading dot.
  const dotKeywords = [
    'Protocol', // contextual
    'Type' // contextual
  ].map(keywordWrapper);

  // Keywords that may have a leading dot.
  const optionalDotKeywords = [
    'init',
    'self'
  ].map(keywordWrapper);

  // should register as keyword, not type
  const keywordTypes = [
    'Any',
    'Self'
  ];

  // Regular keywords and literals.
  const keywords = [
    // strings below will be fed into the regular `keywords` engine while regex
    // will result in additional modes being created to scan for those keywords to
    // avoid conflicts with other rules
    'actor',
    'any', // contextual
    'associatedtype',
    'async',
    'await',
    /as\?/, // operator
    /as!/, // operator
    'as', // operator
    'borrowing', // contextual
    'break',
    'case',
    'catch',
    'class',
    'consume', // contextual
    'consuming', // contextual
    'continue',
    'convenience', // contextual
    'copy', // contextual
    'default',
    'defer',
    'deinit',
    'didSet', // contextual
    'distributed',
    'do',
    'dynamic', // contextual
    'each',
    'else',
    'enum',
    'extension',
    'fallthrough',
    /fileprivate\(set\)/,
    'fileprivate',
    'final', // contextual
    'for',
    'func',
    'get', // contextual
    'guard',
    'if',
    'import',
    'indirect', // contextual
    'infix', // contextual
    /init\?/,
    /init!/,
    'inout',
    /internal\(set\)/,
    'internal',
    'in',
    'is', // operator
    'isolated', // contextual
    'nonisolated', // contextual
    'lazy', // contextual
    'let',
    'macro',
    'mutating', // contextual
    'nonmutating', // contextual
    /open\(set\)/, // contextual
    'open', // contextual
    'operator',
    'optional', // contextual
    'override', // contextual
    'package',
    'postfix', // contextual
    'precedencegroup',
    'prefix', // contextual
    /private\(set\)/,
    'private',
    'protocol',
    /public\(set\)/,
    'public',
    'repeat',
    'required', // contextual
    'rethrows',
    'return',
    'set', // contextual
    'some', // contextual
    'static',
    'struct',
    'subscript',
    'super',
    'switch',
    'throws',
    'throw',
    /try\?/, // operator
    /try!/, // operator
    'try', // operator
    'typealias',
    /unowned\(safe\)/, // contextual
    /unowned\(unsafe\)/, // contextual
    'unowned', // contextual
    'var',
    'weak', // contextual
    'where',
    'while',
    'willSet' // contextual
  ];

  // NOTE: Contextual keywords are reserved only in specific contexts.
  // Ideally, these should be matched using modes to avoid false positives.

  // Literals.
  const literals = [
    'false',
    'nil',
    'true'
  ];

  // Keywords used in precedence groups.
  const precedencegroupKeywords = [
    'assignment',
    'associativity',
    'higherThan',
    'left',
    'lowerThan',
    'none',
    'right'
  ];

  // Keywords that start with a number sign (#).
  // #(un)available is handled separately.
  const numberSignKeywords = [
    '#colorLiteral',
    '#column',
    '#dsohandle',
    '#else',
    '#elseif',
    '#endif',
    '#error',
    '#file',
    '#fileID',
    '#fileLiteral',
    '#filePath',
    '#function',
    '#if',
    '#imageLiteral',
    '#keyPath',
    '#line',
    '#selector',
    '#sourceLocation',
    '#warning'
  ];

  // Global functions in the Standard Library.
  const builtIns = [
    'abs',
    'all',
    'any',
    'assert',
    'assertionFailure',
    'debugPrint',
    'dump',
    'fatalError',
    'getVaList',
    'isKnownUniquelyReferenced',
    'max',
    'min',
    'numericCast',
    'pointwiseMax',
    'pointwiseMin',
    'precondition',
    'preconditionFailure',
    'print',
    'readLine',
    'repeatElement',
    'sequence',
    'stride',
    'swap',
    'swift_unboxFromSwiftValueWithType',
    'transcode',
    'type',
    'unsafeBitCast',
    'unsafeDowncast',
    'withExtendedLifetime',
    'withUnsafeMutablePointer',
    'withUnsafePointer',
    'withVaList',
    'withoutActuallyEscaping',
    'zip'
  ];

  // Valid first characters for operators.
  const operatorHead = either(
    /[/=\-+!*%<>&|^~?]/,
    /[\u00A1-\u00A7]/,
    /[\u00A9\u00AB]/,
    /[\u00AC\u00AE]/,
    /[\u00B0\u00B1]/,
    /[\u00B6\u00BB\u00BF\u00D7\u00F7]/,
    /[\u2016-\u2017]/,
    /[\u2020-\u2027]/,
    /[\u2030-\u203E]/,
    /[\u2041-\u2053]/,
    /[\u2055-\u205E]/,
    /[\u2190-\u23FF]/,
    /[\u2500-\u2775]/,
    /[\u2794-\u2BFF]/,
    /[\u2E00-\u2E7F]/,
    /[\u3001-\u3003]/,
    /[\u3008-\u3020]/,
    /[\u3030]/
  );

  // Valid characters for operators.
  const operatorCharacter = either(
    operatorHead,
    /[\u0300-\u036F]/,
    /[\u1DC0-\u1DFF]/,
    /[\u20D0-\u20FF]/,
    /[\uFE00-\uFE0F]/,
    /[\uFE20-\uFE2F]/
    // TODO: The following characters are also allowed, but the regex isn't supported yet.
    // /[\u{E0100}-\u{E01EF}]/u
  );

  // Valid operator.
  const operator = concat(operatorHead, operatorCharacter, '*');

  // Valid first characters for identifiers.
  const identifierHead = either(
    /[a-zA-Z_]/,
    /[\u00A8\u00AA\u00AD\u00AF\u00B2-\u00B5\u00B7-\u00BA]/,
    /[\u00BC-\u00BE\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF]/,
    /[\u0100-\u02FF\u0370-\u167F\u1681-\u180D\u180F-\u1DBF]/,
    /[\u1E00-\u1FFF]/,
    /[\u200B-\u200D\u202A-\u202E\u203F-\u2040\u2054\u2060-\u206F]/,
    /[\u2070-\u20CF\u2100-\u218F\u2460-\u24FF\u2776-\u2793]/,
    /[\u2C00-\u2DFF\u2E80-\u2FFF]/,
    /[\u3004-\u3007\u3021-\u302F\u3031-\u303F\u3040-\uD7FF]/,
    /[\uF900-\uFD3D\uFD40-\uFDCF\uFDF0-\uFE1F\uFE30-\uFE44]/,
    /[\uFE47-\uFEFE\uFF00-\uFFFD]/ // Should be /[\uFE47-\uFFFD]/, but we have to exclude FEFF.
    // The following characters are also allowed, but the regexes aren't supported yet.
    // /[\u{10000}-\u{1FFFD}\u{20000-\u{2FFFD}\u{30000}-\u{3FFFD}\u{40000}-\u{4FFFD}]/u,
    // /[\u{50000}-\u{5FFFD}\u{60000-\u{6FFFD}\u{70000}-\u{7FFFD}\u{80000}-\u{8FFFD}]/u,
    // /[\u{90000}-\u{9FFFD}\u{A0000-\u{AFFFD}\u{B0000}-\u{BFFFD}\u{C0000}-\u{CFFFD}]/u,
    // /[\u{D0000}-\u{DFFFD}\u{E0000-\u{EFFFD}]/u
  );

  // Valid characters for identifiers.
  const identifierCharacter = either(
    identifierHead,
    /\d/,
    /[\u0300-\u036F\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]/
  );

  // Valid identifier.
  const identifier = concat(identifierHead, identifierCharacter, '*');

  // Valid type identifier.
  const typeIdentifier = concat(/[A-Z]/, identifierCharacter, '*');

  // Built-in attributes, which are highlighted as keywords.
  // @available is handled separately.
  // https://docs.swift.org/swift-book/documentation/the-swift-programming-language/attributes
  const keywordAttributes = [
    'attached',
    'autoclosure',
    concat(/convention\(/, either('swift', 'block', 'c'), /\)/),
    'discardableResult',
    'dynamicCallable',
    'dynamicMemberLookup',
    'escaping',
    'freestanding',
    'frozen',
    'GKInspectable',
    'IBAction',
    'IBDesignable',
    'IBInspectable',
    'IBOutlet',
    'IBSegueAction',
    'inlinable',
    'main',
    'nonobjc',
    'NSApplicationMain',
    'NSCopying',
    'NSManaged',
    concat(/objc\(/, identifier, /\)/),
    'objc',
    'objcMembers',
    'propertyWrapper',
    'requires_stored_property_inits',
    'resultBuilder',
    'Sendable',
    'testable',
    'UIApplicationMain',
    'unchecked',
    'unknown',
    'usableFromInline',
    'warn_unqualified_access'
  ];

  // Contextual keywords used in @available and #(un)available.
  const availabilityKeywords = [
    'iOS',
    'iOSApplicationExtension',
    'macOS',
    'macOSApplicationExtension',
    'macCatalyst',
    'macCatalystApplicationExtension',
    'watchOS',
    'watchOSApplicationExtension',
    'tvOS',
    'tvOSApplicationExtension',
    'swift'
  ];

  /*
  Language: Swift
  Description: Swift is a general-purpose programming language built using a modern approach to safety, performance, and software design patterns.
  Author: Steven Van Impe <steven.vanimpe@icloud.com>
  Contributors: Chris Eidhof <chris@eidhof.nl>, Nate Cook <natecook@gmail.com>, Alexander Lichter <manniL@gmx.net>, Richard Gibson <gibson042@github>
  Website: https://swift.org
  Category: common, system
  */


  /** @type LanguageFn */
  function swift(hljs) {
    const WHITESPACE = {
      match: /\s+/,
      relevance: 0
    };
    // https://docs.swift.org/swift-book/ReferenceManual/LexicalStructure.html#ID411
    const BLOCK_COMMENT = hljs.COMMENT(
      '/\\*',
      '\\*/',
      { contains: [ 'self' ] }
    );
    const COMMENTS = [
      hljs.C_LINE_COMMENT_MODE,
      BLOCK_COMMENT
    ];

    // https://docs.swift.org/swift-book/ReferenceManual/LexicalStructure.html#ID413
    // https://docs.swift.org/swift-book/ReferenceManual/zzSummaryOfTheGrammar.html
    const DOT_KEYWORD = {
      match: [
        /\./,
        either(...dotKeywords, ...optionalDotKeywords)
      ],
      className: { 2: "keyword" }
    };
    const KEYWORD_GUARD = {
      // Consume .keyword to prevent highlighting properties and methods as keywords.
      match: concat(/\./, either(...keywords)),
      relevance: 0
    };
    const PLAIN_KEYWORDS = keywords
      .filter(kw => typeof kw === 'string')
      .concat([ "_|0" ]); // seems common, so 0 relevance
    const REGEX_KEYWORDS = keywords
      .filter(kw => typeof kw !== 'string') // find regex
      .concat(keywordTypes)
      .map(keywordWrapper);
    const KEYWORD = { variants: [
      {
        className: 'keyword',
        match: either(...REGEX_KEYWORDS, ...optionalDotKeywords)
      }
    ] };
    // find all the regular keywords
    const KEYWORDS = {
      $pattern: either(
        /\b\w+/, // regular keywords
        /#\w+/ // number keywords
      ),
      keyword: PLAIN_KEYWORDS
        .concat(numberSignKeywords),
      literal: literals
    };
    const KEYWORD_MODES = [
      DOT_KEYWORD,
      KEYWORD_GUARD,
      KEYWORD
    ];

    // https://github.com/apple/swift/tree/main/stdlib/public/core
    const BUILT_IN_GUARD = {
      // Consume .built_in to prevent highlighting properties and methods.
      match: concat(/\./, either(...builtIns)),
      relevance: 0
    };
    const BUILT_IN = {
      className: 'built_in',
      match: concat(/\b/, either(...builtIns), /(?=\()/)
    };
    const BUILT_INS = [
      BUILT_IN_GUARD,
      BUILT_IN
    ];

    // https://docs.swift.org/swift-book/ReferenceManual/LexicalStructure.html#ID418
    const OPERATOR_GUARD = {
      // Prevent -> from being highlighting as an operator.
      match: /->/,
      relevance: 0
    };
    const OPERATOR = {
      className: 'operator',
      relevance: 0,
      variants: [
        { match: operator },
        {
          // dot-operator: only operators that start with a dot are allowed to use dots as
          // characters (..., ...<, .*, etc). So there rule here is: a dot followed by one or more
          // characters that may also include dots.
          match: `\\.(\\.|${operatorCharacter})+` }
      ]
    };
    const OPERATORS = [
      OPERATOR_GUARD,
      OPERATOR
    ];

    // https://docs.swift.org/swift-book/ReferenceManual/LexicalStructure.html#grammar_numeric-literal
    // TODO: Update for leading `-` after lookbehind is supported everywhere
    const decimalDigits = '([0-9]_*)+';
    const hexDigits = '([0-9a-fA-F]_*)+';
    const NUMBER = {
      className: 'number',
      relevance: 0,
      variants: [
        // decimal floating-point-literal (subsumes decimal-literal)
        { match: `\\b(${decimalDigits})(\\.(${decimalDigits}))?` + `([eE][+-]?(${decimalDigits}))?\\b` },
        // hexadecimal floating-point-literal (subsumes hexadecimal-literal)
        { match: `\\b0x(${hexDigits})(\\.(${hexDigits}))?` + `([pP][+-]?(${decimalDigits}))?\\b` },
        // octal-literal
        { match: /\b0o([0-7]_*)+\b/ },
        // binary-literal
        { match: /\b0b([01]_*)+\b/ }
      ]
    };

    // https://docs.swift.org/swift-book/ReferenceManual/LexicalStructure.html#grammar_string-literal
    const ESCAPED_CHARACTER = (rawDelimiter = "") => ({
      className: 'subst',
      variants: [
        { match: concat(/\\/, rawDelimiter, /[0\\tnr"']/) },
        { match: concat(/\\/, rawDelimiter, /u\{[0-9a-fA-F]{1,8}\}/) }
      ]
    });
    const ESCAPED_NEWLINE = (rawDelimiter = "") => ({
      className: 'subst',
      match: concat(/\\/, rawDelimiter, /[\t ]*(?:[\r\n]|\r\n)/)
    });
    const INTERPOLATION = (rawDelimiter = "") => ({
      className: 'subst',
      label: "interpol",
      begin: concat(/\\/, rawDelimiter, /\(/),
      end: /\)/
    });
    const MULTILINE_STRING = (rawDelimiter = "") => ({
      begin: concat(rawDelimiter, /"""/),
      end: concat(/"""/, rawDelimiter),
      contains: [
        ESCAPED_CHARACTER(rawDelimiter),
        ESCAPED_NEWLINE(rawDelimiter),
        INTERPOLATION(rawDelimiter)
      ]
    });
    const SINGLE_LINE_STRING = (rawDelimiter = "") => ({
      begin: concat(rawDelimiter, /"/),
      end: concat(/"/, rawDelimiter),
      contains: [
        ESCAPED_CHARACTER(rawDelimiter),
        INTERPOLATION(rawDelimiter)
      ]
    });
    const STRING = {
      className: 'string',
      variants: [
        MULTILINE_STRING(),
        MULTILINE_STRING("#"),
        MULTILINE_STRING("##"),
        MULTILINE_STRING("###"),
        SINGLE_LINE_STRING(),
        SINGLE_LINE_STRING("#"),
        SINGLE_LINE_STRING("##"),
        SINGLE_LINE_STRING("###")
      ]
    };

    const REGEXP_CONTENTS = [
      hljs.BACKSLASH_ESCAPE,
      {
        begin: /\[/,
        end: /\]/,
        relevance: 0,
        contains: [ hljs.BACKSLASH_ESCAPE ]
      }
    ];

    const BARE_REGEXP_LITERAL = {
      begin: /\/[^\s](?=[^/\n]*\/)/,
      end: /\//,
      contains: REGEXP_CONTENTS
    };

    const EXTENDED_REGEXP_LITERAL = (rawDelimiter) => {
      const begin = concat(rawDelimiter, /\//);
      const end = concat(/\//, rawDelimiter);
      return {
        begin,
        end,
        contains: [
          ...REGEXP_CONTENTS,
          {
            scope: "comment",
            begin: `#(?!.*${end})`,
            end: /$/,
          },
        ],
      };
    };

    // https://docs.swift.org/swift-book/documentation/the-swift-programming-language/lexicalstructure/#Regular-Expression-Literals
    const REGEXP = {
      scope: "regexp",
      variants: [
        EXTENDED_REGEXP_LITERAL('###'),
        EXTENDED_REGEXP_LITERAL('##'),
        EXTENDED_REGEXP_LITERAL('#'),
        BARE_REGEXP_LITERAL
      ]
    };

    // https://docs.swift.org/swift-book/ReferenceManual/LexicalStructure.html#ID412
    const QUOTED_IDENTIFIER = { match: concat(/`/, identifier, /`/) };
    const IMPLICIT_PARAMETER = {
      className: 'variable',
      match: /\$\d+/
    };
    const PROPERTY_WRAPPER_PROJECTION = {
      className: 'variable',
      match: `\\$${identifierCharacter}+`
    };
    const IDENTIFIERS = [
      QUOTED_IDENTIFIER,
      IMPLICIT_PARAMETER,
      PROPERTY_WRAPPER_PROJECTION
    ];

    // https://docs.swift.org/swift-book/ReferenceManual/Attributes.html
    const AVAILABLE_ATTRIBUTE = {
      match: /(@|#(un)?)available/,
      scope: 'keyword',
      starts: { contains: [
        {
          begin: /\(/,
          end: /\)/,
          keywords: availabilityKeywords,
          contains: [
            ...OPERATORS,
            NUMBER,
            STRING
          ]
        }
      ] }
    };

    const KEYWORD_ATTRIBUTE = {
      scope: 'keyword',
      match: concat(/@/, either(...keywordAttributes), lookahead(either(/\(/, /\s+/))),
    };

    const USER_DEFINED_ATTRIBUTE = {
      scope: 'meta',
      match: concat(/@/, identifier)
    };

    const ATTRIBUTES = [
      AVAILABLE_ATTRIBUTE,
      KEYWORD_ATTRIBUTE,
      USER_DEFINED_ATTRIBUTE
    ];

    // https://docs.swift.org/swift-book/ReferenceManual/Types.html
    const TYPE = {
      match: lookahead(/\b[A-Z]/),
      relevance: 0,
      contains: [
        { // Common Apple frameworks, for relevance boost
          className: 'type',
          match: concat(/(AV|CA|CF|CG|CI|CL|CM|CN|CT|MK|MP|MTK|MTL|NS|SCN|SK|UI|WK|XC)/, identifierCharacter, '+')
        },
        { // Type identifier
          className: 'type',
          match: typeIdentifier,
          relevance: 0
        },
        { // Optional type
          match: /[?!]+/,
          relevance: 0
        },
        { // Variadic parameter
          match: /\.\.\./,
          relevance: 0
        },
        { // Protocol composition
          match: concat(/\s+&\s+/, lookahead(typeIdentifier)),
          relevance: 0
        }
      ]
    };
    const GENERIC_ARGUMENTS = {
      begin: /</,
      end: />/,
      keywords: KEYWORDS,
      contains: [
        ...COMMENTS,
        ...KEYWORD_MODES,
        ...ATTRIBUTES,
        OPERATOR_GUARD,
        TYPE
      ]
    };
    TYPE.contains.push(GENERIC_ARGUMENTS);

    // https://docs.swift.org/swift-book/ReferenceManual/Expressions.html#ID552
    // Prevents element names from being highlighted as keywords.
    const TUPLE_ELEMENT_NAME = {
      match: concat(identifier, /\s*:/),
      keywords: "_|0",
      relevance: 0
    };
    // Matches tuples as well as the parameter list of a function type.
    const TUPLE = {
      begin: /\(/,
      end: /\)/,
      relevance: 0,
      keywords: KEYWORDS,
      contains: [
        'self',
        TUPLE_ELEMENT_NAME,
        ...COMMENTS,
        REGEXP,
        ...KEYWORD_MODES,
        ...BUILT_INS,
        ...OPERATORS,
        NUMBER,
        STRING,
        ...IDENTIFIERS,
        ...ATTRIBUTES,
        TYPE
      ]
    };

    const GENERIC_PARAMETERS = {
      begin: /</,
      end: />/,
      keywords: 'repeat each',
      contains: [
        ...COMMENTS,
        TYPE
      ]
    };
    const FUNCTION_PARAMETER_NAME = {
      begin: either(
        lookahead(concat(identifier, /\s*:/)),
        lookahead(concat(identifier, /\s+/, identifier, /\s*:/))
      ),
      end: /:/,
      relevance: 0,
      contains: [
        {
          className: 'keyword',
          match: /\b_\b/
        },
        {
          className: 'params',
          match: identifier
        }
      ]
    };
    const FUNCTION_PARAMETERS = {
      begin: /\(/,
      end: /\)/,
      keywords: KEYWORDS,
      contains: [
        FUNCTION_PARAMETER_NAME,
        ...COMMENTS,
        ...KEYWORD_MODES,
        ...OPERATORS,
        NUMBER,
        STRING,
        ...ATTRIBUTES,
        TYPE,
        TUPLE
      ],
      endsParent: true,
      illegal: /["']/
    };
    // https://docs.swift.org/swift-book/ReferenceManual/Declarations.html#ID362
    // https://docs.swift.org/swift-book/documentation/the-swift-programming-language/declarations/#Macro-Declaration
    const FUNCTION_OR_MACRO = {
      match: [
        /(func|macro)/,
        /\s+/,
        either(QUOTED_IDENTIFIER.match, identifier, operator)
      ],
      className: {
        1: "keyword",
        3: "title.function"
      },
      contains: [
        GENERIC_PARAMETERS,
        FUNCTION_PARAMETERS,
        WHITESPACE
      ],
      illegal: [
        /\[/,
        /%/
      ]
    };

    // https://docs.swift.org/swift-book/ReferenceManual/Declarations.html#ID375
    // https://docs.swift.org/swift-book/ReferenceManual/Declarations.html#ID379
    const INIT_SUBSCRIPT = {
      match: [
        /\b(?:subscript|init[?!]?)/,
        /\s*(?=[<(])/,
      ],
      className: { 1: "keyword" },
      contains: [
        GENERIC_PARAMETERS,
        FUNCTION_PARAMETERS,
        WHITESPACE
      ],
      illegal: /\[|%/
    };
    // https://docs.swift.org/swift-book/ReferenceManual/Declarations.html#ID380
    const OPERATOR_DECLARATION = {
      match: [
        /operator/,
        /\s+/,
        operator
      ],
      className: {
        1: "keyword",
        3: "title"
      }
    };

    // https://docs.swift.org/swift-book/ReferenceManual/Declarations.html#ID550
    const PRECEDENCEGROUP = {
      begin: [
        /precedencegroup/,
        /\s+/,
        typeIdentifier
      ],
      className: {
        1: "keyword",
        3: "title"
      },
      contains: [ TYPE ],
      keywords: [
        ...precedencegroupKeywords,
        ...literals
      ],
      end: /}/
    };

    const TYPE_DECLARATION = {
      begin: [
        /(struct|protocol|class|extension|enum|actor)/,
        /\s+/,
        identifier,
        /\s*/,
      ],
      beginScope: {
        1: "keyword",
        3: "title.class"
      },
      keywords: KEYWORDS,
      contains: [
        GENERIC_PARAMETERS,
        ...KEYWORD_MODES,
        {
          begin: /:/,
          end: /\{/,
          keywords: KEYWORDS,
          contains: [
            {
              scope: "title.class.inherited",
              match: typeIdentifier,
            },
            ...KEYWORD_MODES,
          ],
          relevance: 0,
        },
      ]
    };

    // Add supported submodes to string interpolation.
    for (const variant of STRING.variants) {
      const interpolation = variant.contains.find(mode => mode.label === "interpol");
      // TODO: Interpolation can contain any expression, so there's room for improvement here.
      interpolation.keywords = KEYWORDS;
      const submodes = [
        ...KEYWORD_MODES,
        ...BUILT_INS,
        ...OPERATORS,
        NUMBER,
        STRING,
        ...IDENTIFIERS
      ];
      interpolation.contains = [
        ...submodes,
        {
          begin: /\(/,
          end: /\)/,
          contains: [
            'self',
            ...submodes
          ]
        }
      ];
    }

    return {
      name: 'Swift',
      keywords: KEYWORDS,
      contains: [
        ...COMMENTS,
        FUNCTION_OR_MACRO,
        INIT_SUBSCRIPT,
        TYPE_DECLARATION,
        OPERATOR_DECLARATION,
        PRECEDENCEGROUP,
        {
          beginKeywords: 'import',
          end: /$/,
          contains: [ ...COMMENTS ],
          relevance: 0
        },
        REGEXP,
        ...KEYWORD_MODES,
        ...BUILT_INS,
        ...OPERATORS,
        NUMBER,
        STRING,
        ...IDENTIFIERS,
        ...ATTRIBUTES,
        TYPE,
        TUPLE
      ]
    };
  }

  return swift;

})();

    hljs.registerLanguage('swift', hljsGrammar);
  })();/*! `typescript` grammar compiled for Highlight.js 11.10.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  const IDENT_RE = '[A-Za-z$_][0-9A-Za-z$_]*';
  const KEYWORDS = [
    "as", // for exports
    "in",
    "of",
    "if",
    "for",
    "while",
    "finally",
    "var",
    "new",
    "function",
    "do",
    "return",
    "void",
    "else",
    "break",
    "catch",
    "instanceof",
    "with",
    "throw",
    "case",
    "default",
    "try",
    "switch",
    "continue",
    "typeof",
    "delete",
    "let",
    "yield",
    "const",
    "class",
    // JS handles these with a special rule
    // "get",
    // "set",
    "debugger",
    "async",
    "await",
    "static",
    "import",
    "from",
    "export",
    "extends"
  ];
  const LITERALS = [
    "true",
    "false",
    "null",
    "undefined",
    "NaN",
    "Infinity"
  ];

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
  const TYPES = [
    // Fundamental objects
    "Object",
    "Function",
    "Boolean",
    "Symbol",
    // numbers and dates
    "Math",
    "Date",
    "Number",
    "BigInt",
    // text
    "String",
    "RegExp",
    // Indexed collections
    "Array",
    "Float32Array",
    "Float64Array",
    "Int8Array",
    "Uint8Array",
    "Uint8ClampedArray",
    "Int16Array",
    "Int32Array",
    "Uint16Array",
    "Uint32Array",
    "BigInt64Array",
    "BigUint64Array",
    // Keyed collections
    "Set",
    "Map",
    "WeakSet",
    "WeakMap",
    // Structured data
    "ArrayBuffer",
    "SharedArrayBuffer",
    "Atomics",
    "DataView",
    "JSON",
    // Control abstraction objects
    "Promise",
    "Generator",
    "GeneratorFunction",
    "AsyncFunction",
    // Reflection
    "Reflect",
    "Proxy",
    // Internationalization
    "Intl",
    // WebAssembly
    "WebAssembly"
  ];

  const ERROR_TYPES = [
    "Error",
    "EvalError",
    "InternalError",
    "RangeError",
    "ReferenceError",
    "SyntaxError",
    "TypeError",
    "URIError"
  ];

  const BUILT_IN_GLOBALS = [
    "setInterval",
    "setTimeout",
    "clearInterval",
    "clearTimeout",

    "require",
    "exports",

    "eval",
    "isFinite",
    "isNaN",
    "parseFloat",
    "parseInt",
    "decodeURI",
    "decodeURIComponent",
    "encodeURI",
    "encodeURIComponent",
    "escape",
    "unescape"
  ];

  const BUILT_IN_VARIABLES = [
    "arguments",
    "this",
    "super",
    "console",
    "window",
    "document",
    "localStorage",
    "sessionStorage",
    "module",
    "global" // Node.js
  ];

  const BUILT_INS = [].concat(
    BUILT_IN_GLOBALS,
    TYPES,
    ERROR_TYPES
  );

  /*
  Language: JavaScript
  Description: JavaScript (JS) is a lightweight, interpreted, or just-in-time compiled programming language with first-class functions.
  Category: common, scripting, web
  Website: https://developer.mozilla.org/en-US/docs/Web/JavaScript
  */


  /** @type LanguageFn */
  function javascript(hljs) {
    const regex = hljs.regex;
    /**
     * Takes a string like "<Booger" and checks to see
     * if we can find a matching "</Booger" later in the
     * content.
     * @param {RegExpMatchArray} match
     * @param {{after:number}} param1
     */
    const hasClosingTag = (match, { after }) => {
      const tag = "</" + match[0].slice(1);
      const pos = match.input.indexOf(tag, after);
      return pos !== -1;
    };

    const IDENT_RE$1 = IDENT_RE;
    const FRAGMENT = {
      begin: '<>',
      end: '</>'
    };
    // to avoid some special cases inside isTrulyOpeningTag
    const XML_SELF_CLOSING = /<[A-Za-z0-9\\._:-]+\s*\/>/;
    const XML_TAG = {
      begin: /<[A-Za-z0-9\\._:-]+/,
      end: /\/[A-Za-z0-9\\._:-]+>|\/>/,
      /**
       * @param {RegExpMatchArray} match
       * @param {CallbackResponse} response
       */
      isTrulyOpeningTag: (match, response) => {
        const afterMatchIndex = match[0].length + match.index;
        const nextChar = match.input[afterMatchIndex];
        if (
          // HTML should not include another raw `<` inside a tag
          // nested type?
          // `<Array<Array<number>>`, etc.
          nextChar === "<" ||
          // the , gives away that this is not HTML
          // `<T, A extends keyof T, V>`
          nextChar === ","
          ) {
          response.ignoreMatch();
          return;
        }

        // `<something>`
        // Quite possibly a tag, lets look for a matching closing tag...
        if (nextChar === ">") {
          // if we cannot find a matching closing tag, then we
          // will ignore it
          if (!hasClosingTag(match, { after: afterMatchIndex })) {
            response.ignoreMatch();
          }
        }

        // `<blah />` (self-closing)
        // handled by simpleSelfClosing rule

        let m;
        const afterMatch = match.input.substring(afterMatchIndex);

        // some more template typing stuff
        //  <T = any>(key?: string) => Modify<
        if ((m = afterMatch.match(/^\s*=/))) {
          response.ignoreMatch();
          return;
        }

        // `<From extends string>`
        // technically this could be HTML, but it smells like a type
        // NOTE: This is ugh, but added specifically for https://github.com/highlightjs/highlight.js/issues/3276
        if ((m = afterMatch.match(/^\s+extends\s+/))) {
          if (m.index === 0) {
            response.ignoreMatch();
            // eslint-disable-next-line no-useless-return
            return;
          }
        }
      }
    };
    const KEYWORDS$1 = {
      $pattern: IDENT_RE,
      keyword: KEYWORDS,
      literal: LITERALS,
      built_in: BUILT_INS,
      "variable.language": BUILT_IN_VARIABLES
    };

    // https://tc39.es/ecma262/#sec-literals-numeric-literals
    const decimalDigits = '[0-9](_?[0-9])*';
    const frac = `\\.(${decimalDigits})`;
    // DecimalIntegerLiteral, including Annex B NonOctalDecimalIntegerLiteral
    // https://tc39.es/ecma262/#sec-additional-syntax-numeric-literals
    const decimalInteger = `0|[1-9](_?[0-9])*|0[0-7]*[89][0-9]*`;
    const NUMBER = {
      className: 'number',
      variants: [
        // DecimalLiteral
        { begin: `(\\b(${decimalInteger})((${frac})|\\.)?|(${frac}))` +
          `[eE][+-]?(${decimalDigits})\\b` },
        { begin: `\\b(${decimalInteger})\\b((${frac})\\b|\\.)?|(${frac})\\b` },

        // DecimalBigIntegerLiteral
        { begin: `\\b(0|[1-9](_?[0-9])*)n\\b` },

        // NonDecimalIntegerLiteral
        { begin: "\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*n?\\b" },
        { begin: "\\b0[bB][0-1](_?[0-1])*n?\\b" },
        { begin: "\\b0[oO][0-7](_?[0-7])*n?\\b" },

        // LegacyOctalIntegerLiteral (does not include underscore separators)
        // https://tc39.es/ecma262/#sec-additional-syntax-numeric-literals
        { begin: "\\b0[0-7]+n?\\b" },
      ],
      relevance: 0
    };

    const SUBST = {
      className: 'subst',
      begin: '\\$\\{',
      end: '\\}',
      keywords: KEYWORDS$1,
      contains: [] // defined later
    };
    const HTML_TEMPLATE = {
      begin: '\.?html`',
      end: '',
      starts: {
        end: '`',
        returnEnd: false,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          SUBST
        ],
        subLanguage: 'xml'
      }
    };
    const CSS_TEMPLATE = {
      begin: '\.?css`',
      end: '',
      starts: {
        end: '`',
        returnEnd: false,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          SUBST
        ],
        subLanguage: 'css'
      }
    };
    const GRAPHQL_TEMPLATE = {
      begin: '\.?gql`',
      end: '',
      starts: {
        end: '`',
        returnEnd: false,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          SUBST
        ],
        subLanguage: 'graphql'
      }
    };
    const TEMPLATE_STRING = {
      className: 'string',
      begin: '`',
      end: '`',
      contains: [
        hljs.BACKSLASH_ESCAPE,
        SUBST
      ]
    };
    const JSDOC_COMMENT = hljs.COMMENT(
      /\/\*\*(?!\/)/,
      '\\*/',
      {
        relevance: 0,
        contains: [
          {
            begin: '(?=@[A-Za-z]+)',
            relevance: 0,
            contains: [
              {
                className: 'doctag',
                begin: '@[A-Za-z]+'
              },
              {
                className: 'type',
                begin: '\\{',
                end: '\\}',
                excludeEnd: true,
                excludeBegin: true,
                relevance: 0
              },
              {
                className: 'variable',
                begin: IDENT_RE$1 + '(?=\\s*(-)|$)',
                endsParent: true,
                relevance: 0
              },
              // eat spaces (not newlines) so we can find
              // types or variables
              {
                begin: /(?=[^\n])\s/,
                relevance: 0
              }
            ]
          }
        ]
      }
    );
    const COMMENT = {
      className: "comment",
      variants: [
        JSDOC_COMMENT,
        hljs.C_BLOCK_COMMENT_MODE,
        hljs.C_LINE_COMMENT_MODE
      ]
    };
    const SUBST_INTERNALS = [
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      HTML_TEMPLATE,
      CSS_TEMPLATE,
      GRAPHQL_TEMPLATE,
      TEMPLATE_STRING,
      // Skip numbers when they are part of a variable name
      { match: /\$\d+/ },
      NUMBER,
      // This is intentional:
      // See https://github.com/highlightjs/highlight.js/issues/3288
      // hljs.REGEXP_MODE
    ];
    SUBST.contains = SUBST_INTERNALS
      .concat({
        // we need to pair up {} inside our subst to prevent
        // it from ending too early by matching another }
        begin: /\{/,
        end: /\}/,
        keywords: KEYWORDS$1,
        contains: [
          "self"
        ].concat(SUBST_INTERNALS)
      });
    const SUBST_AND_COMMENTS = [].concat(COMMENT, SUBST.contains);
    const PARAMS_CONTAINS = SUBST_AND_COMMENTS.concat([
      // eat recursive parens in sub expressions
      {
        begin: /(\s*)\(/,
        end: /\)/,
        keywords: KEYWORDS$1,
        contains: ["self"].concat(SUBST_AND_COMMENTS)
      }
    ]);
    const PARAMS = {
      className: 'params',
      // convert this to negative lookbehind in v12
      begin: /(\s*)\(/, // to match the parms with 
      end: /\)/,
      excludeBegin: true,
      excludeEnd: true,
      keywords: KEYWORDS$1,
      contains: PARAMS_CONTAINS
    };

    // ES6 classes
    const CLASS_OR_EXTENDS = {
      variants: [
        // class Car extends vehicle
        {
          match: [
            /class/,
            /\s+/,
            IDENT_RE$1,
            /\s+/,
            /extends/,
            /\s+/,
            regex.concat(IDENT_RE$1, "(", regex.concat(/\./, IDENT_RE$1), ")*")
          ],
          scope: {
            1: "keyword",
            3: "title.class",
            5: "keyword",
            7: "title.class.inherited"
          }
        },
        // class Car
        {
          match: [
            /class/,
            /\s+/,
            IDENT_RE$1
          ],
          scope: {
            1: "keyword",
            3: "title.class"
          }
        },

      ]
    };

    const CLASS_REFERENCE = {
      relevance: 0,
      match:
      regex.either(
        // Hard coded exceptions
        /\bJSON/,
        // Float32Array, OutT
        /\b[A-Z][a-z]+([A-Z][a-z]*|\d)*/,
        // CSSFactory, CSSFactoryT
        /\b[A-Z]{2,}([A-Z][a-z]+|\d)+([A-Z][a-z]*)*/,
        // FPs, FPsT
        /\b[A-Z]{2,}[a-z]+([A-Z][a-z]+|\d)*([A-Z][a-z]*)*/,
        // P
        // single letters are not highlighted
        // BLAH
        // this will be flagged as a UPPER_CASE_CONSTANT instead
      ),
      className: "title.class",
      keywords: {
        _: [
          // se we still get relevance credit for JS library classes
          ...TYPES,
          ...ERROR_TYPES
        ]
      }
    };

    const USE_STRICT = {
      label: "use_strict",
      className: 'meta',
      relevance: 10,
      begin: /^\s*['"]use (strict|asm)['"]/
    };

    const FUNCTION_DEFINITION = {
      variants: [
        {
          match: [
            /function/,
            /\s+/,
            IDENT_RE$1,
            /(?=\s*\()/
          ]
        },
        // anonymous function
        {
          match: [
            /function/,
            /\s*(?=\()/
          ]
        }
      ],
      className: {
        1: "keyword",
        3: "title.function"
      },
      label: "func.def",
      contains: [ PARAMS ],
      illegal: /%/
    };

    const UPPER_CASE_CONSTANT = {
      relevance: 0,
      match: /\b[A-Z][A-Z_0-9]+\b/,
      className: "variable.constant"
    };

    function noneOf(list) {
      return regex.concat("(?!", list.join("|"), ")");
    }

    const FUNCTION_CALL = {
      match: regex.concat(
        /\b/,
        noneOf([
          ...BUILT_IN_GLOBALS,
          "super",
          "import"
        ].map(x => `${x}\\s*\\(`)),
        IDENT_RE$1, regex.lookahead(/\s*\(/)),
      className: "title.function",
      relevance: 0
    };

    const PROPERTY_ACCESS = {
      begin: regex.concat(/\./, regex.lookahead(
        regex.concat(IDENT_RE$1, /(?![0-9A-Za-z$_(])/)
      )),
      end: IDENT_RE$1,
      excludeBegin: true,
      keywords: "prototype",
      className: "property",
      relevance: 0
    };

    const GETTER_OR_SETTER = {
      match: [
        /get|set/,
        /\s+/,
        IDENT_RE$1,
        /(?=\()/
      ],
      className: {
        1: "keyword",
        3: "title.function"
      },
      contains: [
        { // eat to avoid empty params
          begin: /\(\)/
        },
        PARAMS
      ]
    };

    const FUNC_LEAD_IN_RE = '(\\(' +
      '[^()]*(\\(' +
      '[^()]*(\\(' +
      '[^()]*' +
      '\\)[^()]*)*' +
      '\\)[^()]*)*' +
      '\\)|' + hljs.UNDERSCORE_IDENT_RE + ')\\s*=>';

    const FUNCTION_VARIABLE = {
      match: [
        /const|var|let/, /\s+/,
        IDENT_RE$1, /\s*/,
        /=\s*/,
        /(async\s*)?/, // async is optional
        regex.lookahead(FUNC_LEAD_IN_RE)
      ],
      keywords: "async",
      className: {
        1: "keyword",
        3: "title.function"
      },
      contains: [
        PARAMS
      ]
    };

    return {
      name: 'JavaScript',
      aliases: ['js', 'jsx', 'mjs', 'cjs'],
      keywords: KEYWORDS$1,
      // this will be extended by TypeScript
      exports: { PARAMS_CONTAINS, CLASS_REFERENCE },
      illegal: /#(?![$_A-z])/,
      contains: [
        hljs.SHEBANG({
          label: "shebang",
          binary: "node",
          relevance: 5
        }),
        USE_STRICT,
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE,
        HTML_TEMPLATE,
        CSS_TEMPLATE,
        GRAPHQL_TEMPLATE,
        TEMPLATE_STRING,
        COMMENT,
        // Skip numbers when they are part of a variable name
        { match: /\$\d+/ },
        NUMBER,
        CLASS_REFERENCE,
        {
          className: 'attr',
          begin: IDENT_RE$1 + regex.lookahead(':'),
          relevance: 0
        },
        FUNCTION_VARIABLE,
        { // "value" container
          begin: '(' + hljs.RE_STARTERS_RE + '|\\b(case|return|throw)\\b)\\s*',
          keywords: 'return throw case',
          relevance: 0,
          contains: [
            COMMENT,
            hljs.REGEXP_MODE,
            {
              className: 'function',
              // we have to count the parens to make sure we actually have the
              // correct bounding ( ) before the =>.  There could be any number of
              // sub-expressions inside also surrounded by parens.
              begin: FUNC_LEAD_IN_RE,
              returnBegin: true,
              end: '\\s*=>',
              contains: [
                {
                  className: 'params',
                  variants: [
                    {
                      begin: hljs.UNDERSCORE_IDENT_RE,
                      relevance: 0
                    },
                    {
                      className: null,
                      begin: /\(\s*\)/,
                      skip: true
                    },
                    {
                      begin: /(\s*)\(/,
                      end: /\)/,
                      excludeBegin: true,
                      excludeEnd: true,
                      keywords: KEYWORDS$1,
                      contains: PARAMS_CONTAINS
                    }
                  ]
                }
              ]
            },
            { // could be a comma delimited list of params to a function call
              begin: /,/,
              relevance: 0
            },
            {
              match: /\s+/,
              relevance: 0
            },
            { // JSX
              variants: [
                { begin: FRAGMENT.begin, end: FRAGMENT.end },
                { match: XML_SELF_CLOSING },
                {
                  begin: XML_TAG.begin,
                  // we carefully check the opening tag to see if it truly
                  // is a tag and not a false positive
                  'on:begin': XML_TAG.isTrulyOpeningTag,
                  end: XML_TAG.end
                }
              ],
              subLanguage: 'xml',
              contains: [
                {
                  begin: XML_TAG.begin,
                  end: XML_TAG.end,
                  skip: true,
                  contains: ['self']
                }
              ]
            }
          ],
        },
        FUNCTION_DEFINITION,
        {
          // prevent this from getting swallowed up by function
          // since they appear "function like"
          beginKeywords: "while if switch catch for"
        },
        {
          // we have to count the parens to make sure we actually have the correct
          // bounding ( ).  There could be any number of sub-expressions inside
          // also surrounded by parens.
          begin: '\\b(?!function)' + hljs.UNDERSCORE_IDENT_RE +
            '\\(' + // first parens
            '[^()]*(\\(' +
              '[^()]*(\\(' +
                '[^()]*' +
              '\\)[^()]*)*' +
            '\\)[^()]*)*' +
            '\\)\\s*\\{', // end parens
          returnBegin:true,
          label: "func.def",
          contains: [
            PARAMS,
            hljs.inherit(hljs.TITLE_MODE, { begin: IDENT_RE$1, className: "title.function" })
          ]
        },
        // catch ... so it won't trigger the property rule below
        {
          match: /\.\.\./,
          relevance: 0
        },
        PROPERTY_ACCESS,
        // hack: prevents detection of keywords in some circumstances
        // .keyword()
        // $keyword = x
        {
          match: '\\$' + IDENT_RE$1,
          relevance: 0
        },
        {
          match: [ /\bconstructor(?=\s*\()/ ],
          className: { 1: "title.function" },
          contains: [ PARAMS ]
        },
        FUNCTION_CALL,
        UPPER_CASE_CONSTANT,
        CLASS_OR_EXTENDS,
        GETTER_OR_SETTER,
        {
          match: /\$[(.]/ // relevance booster for a pattern common to JS libs: `$(something)` and `$.something`
        }
      ]
    };
  }

  /*
  Language: TypeScript
  Author: Panu Horsmalahti <panu.horsmalahti@iki.fi>
  Contributors: Ike Ku <dempfi@yahoo.com>
  Description: TypeScript is a strict superset of JavaScript
  Website: https://www.typescriptlang.org
  Category: common, scripting
  */


  /** @type LanguageFn */
  function typescript(hljs) {
    const tsLanguage = javascript(hljs);

    const IDENT_RE$1 = IDENT_RE;
    const TYPES = [
      "any",
      "void",
      "number",
      "boolean",
      "string",
      "object",
      "never",
      "symbol",
      "bigint",
      "unknown"
    ];
    const NAMESPACE = {
      begin: [
        /namespace/,
        /\s+/,
        hljs.IDENT_RE
      ],
      beginScope: {
        1: "keyword",
        3: "title.class"
      }
    };
    const INTERFACE = {
      beginKeywords: 'interface',
      end: /\{/,
      excludeEnd: true,
      keywords: {
        keyword: 'interface extends',
        built_in: TYPES
      },
      contains: [ tsLanguage.exports.CLASS_REFERENCE ]
    };
    const USE_STRICT = {
      className: 'meta',
      relevance: 10,
      begin: /^\s*['"]use strict['"]/
    };
    const TS_SPECIFIC_KEYWORDS = [
      "type",
      // "namespace",
      "interface",
      "public",
      "private",
      "protected",
      "implements",
      "declare",
      "abstract",
      "readonly",
      "enum",
      "override",
      "satisfies"
    ];

    /*
      namespace is a TS keyword but it's fine to use it as a variable name too.
      const message = 'foo';
      const namespace = 'bar';
    */

    const KEYWORDS$1 = {
      $pattern: IDENT_RE,
      keyword: KEYWORDS.concat(TS_SPECIFIC_KEYWORDS),
      literal: LITERALS,
      built_in: BUILT_INS.concat(TYPES),
      "variable.language": BUILT_IN_VARIABLES
    };
    const DECORATOR = {
      className: 'meta',
      begin: '@' + IDENT_RE$1,
    };

    const swapMode = (mode, label, replacement) => {
      const indx = mode.contains.findIndex(m => m.label === label);
      if (indx === -1) { throw new Error("can not find mode to replace"); }

      mode.contains.splice(indx, 1, replacement);
    };


    // this should update anywhere keywords is used since
    // it will be the same actual JS object
    Object.assign(tsLanguage.keywords, KEYWORDS$1);

    tsLanguage.exports.PARAMS_CONTAINS.push(DECORATOR);

    // highlight the function params
    const ATTRIBUTE_HIGHLIGHT = tsLanguage.contains.find(c => c.className === "attr");
    tsLanguage.exports.PARAMS_CONTAINS.push([
      tsLanguage.exports.CLASS_REFERENCE, // class reference for highlighting the params types
      ATTRIBUTE_HIGHLIGHT, // highlight the params key
    ]);
    tsLanguage.contains = tsLanguage.contains.concat([
      DECORATOR,
      NAMESPACE,
      INTERFACE,
    ]);

    // TS gets a simpler shebang rule than JS
    swapMode(tsLanguage, "shebang", hljs.SHEBANG());
    // JS use strict rule purposely excludes `asm` which makes no sense
    swapMode(tsLanguage, "use_strict", USE_STRICT);

    const functionDeclaration = tsLanguage.contains.find(m => m.label === "func.def");
    functionDeclaration.relevance = 0; // () => {} is more typical in TypeScript

    Object.assign(tsLanguage, {
      name: 'TypeScript',
      aliases: [
        'ts',
        'tsx',
        'mts',
        'cts'
      ]
    });

    return tsLanguage;
  }

  return typescript;

})();

    hljs.registerLanguage('typescript', hljsGrammar);
  })();/*! `vbscript` grammar compiled for Highlight.js 11.10.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: VBScript
  Description: VBScript ("Microsoft Visual Basic Scripting Edition") is an Active Scripting language developed by Microsoft that is modeled on Visual Basic.
  Author: Nikita Ledyaev <lenikita@yandex.ru>
  Contributors: Michal Gabrukiewicz <mgabru@gmail.com>
  Website: https://en.wikipedia.org/wiki/VBScript
  Category: scripting
  */

  /** @type LanguageFn */
  function vbscript(hljs) {
    const regex = hljs.regex;
    const BUILT_IN_FUNCTIONS = [
      "lcase",
      "month",
      "vartype",
      "instrrev",
      "ubound",
      "setlocale",
      "getobject",
      "rgb",
      "getref",
      "string",
      "weekdayname",
      "rnd",
      "dateadd",
      "monthname",
      "now",
      "day",
      "minute",
      "isarray",
      "cbool",
      "round",
      "formatcurrency",
      "conversions",
      "csng",
      "timevalue",
      "second",
      "year",
      "space",
      "abs",
      "clng",
      "timeserial",
      "fixs",
      "len",
      "asc",
      "isempty",
      "maths",
      "dateserial",
      "atn",
      "timer",
      "isobject",
      "filter",
      "weekday",
      "datevalue",
      "ccur",
      "isdate",
      "instr",
      "datediff",
      "formatdatetime",
      "replace",
      "isnull",
      "right",
      "sgn",
      "array",
      "snumeric",
      "log",
      "cdbl",
      "hex",
      "chr",
      "lbound",
      "msgbox",
      "ucase",
      "getlocale",
      "cos",
      "cdate",
      "cbyte",
      "rtrim",
      "join",
      "hour",
      "oct",
      "typename",
      "trim",
      "strcomp",
      "int",
      "createobject",
      "loadpicture",
      "tan",
      "formatnumber",
      "mid",
      "split",
      "cint",
      "sin",
      "datepart",
      "ltrim",
      "sqr",
      "time",
      "derived",
      "eval",
      "date",
      "formatpercent",
      "exp",
      "inputbox",
      "left",
      "ascw",
      "chrw",
      "regexp",
      "cstr",
      "err"
    ];
    const BUILT_IN_OBJECTS = [
      "server",
      "response",
      "request",
      // take no arguments so can be called without ()
      "scriptengine",
      "scriptenginebuildversion",
      "scriptengineminorversion",
      "scriptenginemajorversion"
    ];

    const BUILT_IN_CALL = {
      begin: regex.concat(regex.either(...BUILT_IN_FUNCTIONS), "\\s*\\("),
      // relevance 0 because this is acting as a beginKeywords really
      relevance: 0,
      keywords: { built_in: BUILT_IN_FUNCTIONS }
    };

    const LITERALS = [
      "true",
      "false",
      "null",
      "nothing",
      "empty"
    ];

    const KEYWORDS = [
      "call",
      "class",
      "const",
      "dim",
      "do",
      "loop",
      "erase",
      "execute",
      "executeglobal",
      "exit",
      "for",
      "each",
      "next",
      "function",
      "if",
      "then",
      "else",
      "on",
      "error",
      "option",
      "explicit",
      "new",
      "private",
      "property",
      "let",
      "get",
      "public",
      "randomize",
      "redim",
      "rem",
      "select",
      "case",
      "set",
      "stop",
      "sub",
      "while",
      "wend",
      "with",
      "end",
      "to",
      "elseif",
      "is",
      "or",
      "xor",
      "and",
      "not",
      "class_initialize",
      "class_terminate",
      "default",
      "preserve",
      "in",
      "me",
      "byval",
      "byref",
      "step",
      "resume",
      "goto"
    ];

    return {
      name: 'VBScript',
      aliases: [ 'vbs' ],
      case_insensitive: true,
      keywords: {
        keyword: KEYWORDS,
        built_in: BUILT_IN_OBJECTS,
        literal: LITERALS
      },
      illegal: '//',
      contains: [
        BUILT_IN_CALL,
        hljs.inherit(hljs.QUOTE_STRING_MODE, { contains: [ { begin: '""' } ] }),
        hljs.COMMENT(
          /'/,
          /$/,
          { relevance: 0 }
        ),
        hljs.C_NUMBER_MODE
      ]
    };
  }

  return vbscript;

})();

    hljs.registerLanguage('vbscript', hljsGrammar);
  })();/*! `vbscript-html` grammar compiled for Highlight.js 11.10.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: VBScript in HTML
  Requires: xml.js, vbscript.js
  Author: Ivan Sagalaev <maniac@softwaremaniacs.org>
  Description: "Bridge" language defining fragments of VBScript in HTML within <% .. %>
  Website: https://en.wikipedia.org/wiki/VBScript
  Category: scripting
  */

  function vbscriptHtml(hljs) {
    return {
      name: 'VBScript in HTML',
      subLanguage: 'xml',
      contains: [
        {
          begin: '<%',
          end: '%>',
          subLanguage: 'vbscript'
        }
      ]
    };
  }

  return vbscriptHtml;

})();

    hljs.registerLanguage('vbscript-html', hljsGrammar);
  })();/*! `vim` grammar compiled for Highlight.js 11.10.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Vim Script
  Author: Jun Yang <yangjvn@126.com>
  Description: full keyword and built-in from http://vimdoc.sourceforge.net/htmldoc/
  Website: https://www.vim.org
  Category: scripting
  */

  function vim(hljs) {
    return {
      name: 'Vim Script',
      keywords: {
        $pattern: /[!#@\w]+/,
        keyword:
          // express version except: ! & * < = > !! # @ @@
          'N|0 P|0 X|0 a|0 ab abc abo al am an|0 ar arga argd arge argdo argg argl argu as au aug aun b|0 bN ba bad bd be bel bf bl bm bn bo bp br brea breaka breakd breakl bro bufdo buffers bun bw c|0 cN cNf ca cabc caddb cad caddf cal cat cb cc ccl cd ce cex cf cfir cgetb cgete cg changes chd che checkt cl cla clo cm cmapc cme cn cnew cnf cno cnorea cnoreme co col colo com comc comp con conf cope '
          + 'cp cpf cq cr cs cst cu cuna cunme cw delm deb debugg delc delf dif diffg diffo diffp diffpu diffs diffthis dig di dl dell dj dli do doautoa dp dr ds dsp e|0 ea ec echoe echoh echom echon el elsei em en endfo endf endt endw ene ex exe exi exu f|0 files filet fin fina fini fir fix fo foldc foldd folddoc foldo for fu go gr grepa gu gv ha helpf helpg helpt hi hid his ia iabc if ij il im imapc '
          + 'ime ino inorea inoreme int is isp iu iuna iunme j|0 ju k|0 keepa kee keepj lN lNf l|0 lad laddb laddf la lan lat lb lc lch lcl lcs le lefta let lex lf lfir lgetb lgete lg lgr lgrepa lh ll lla lli lmak lm lmapc lne lnew lnf ln loadk lo loc lockv lol lope lp lpf lr ls lt lu lua luad luaf lv lvimgrepa lw m|0 ma mak map mapc marks mat me menut mes mk mks mksp mkv mkvie mod mz mzf nbc nb nbs new nm nmapc nme nn nnoreme noa no noh norea noreme norm nu nun nunme ol o|0 om omapc ome on ono onoreme opt ou ounme ow p|0 '
          + 'profd prof pro promptr pc ped pe perld po popu pp pre prev ps pt ptN ptf ptj ptl ptn ptp ptr pts pu pw py3 python3 py3d py3f py pyd pyf quita qa rec red redi redr redraws reg res ret retu rew ri rightb rub rubyd rubyf rund ru rv sN san sa sal sav sb sbN sba sbf sbl sbm sbn sbp sbr scrip scripte scs se setf setg setl sf sfir sh sim sig sil sl sla sm smap smapc sme sn sni sno snor snoreme sor '
          + 'so spelld spe spelli spellr spellu spellw sp spr sre st sta startg startr star stopi stj sts sun sunm sunme sus sv sw sy synti sync tN tabN tabc tabdo tabe tabf tabfir tabl tabm tabnew '
          + 'tabn tabo tabp tabr tabs tab ta tags tc tcld tclf te tf th tj tl tm tn to tp tr try ts tu u|0 undoj undol una unh unl unlo unm unme uns up ve verb vert vim vimgrepa vi viu vie vm vmapc vme vne vn vnoreme vs vu vunme windo w|0 wN wa wh wi winc winp wn wp wq wqa ws wu wv x|0 xa xmapc xm xme xn xnoreme xu xunme y|0 z|0 ~ '
          // full version
          + 'Next Print append abbreviate abclear aboveleft all amenu anoremenu args argadd argdelete argedit argglobal arglocal argument ascii autocmd augroup aunmenu buffer bNext ball badd bdelete behave belowright bfirst blast bmodified bnext botright bprevious brewind break breakadd breakdel breaklist browse bunload '
          + 'bwipeout change cNext cNfile cabbrev cabclear caddbuffer caddexpr caddfile call catch cbuffer cclose center cexpr cfile cfirst cgetbuffer cgetexpr cgetfile chdir checkpath checktime clist clast close cmap cmapclear cmenu cnext cnewer cnfile cnoremap cnoreabbrev cnoremenu copy colder colorscheme command comclear compiler continue confirm copen cprevious cpfile cquit crewind cscope cstag cunmap '
          + 'cunabbrev cunmenu cwindow delete delmarks debug debuggreedy delcommand delfunction diffupdate diffget diffoff diffpatch diffput diffsplit digraphs display deletel djump dlist doautocmd doautoall deletep drop dsearch dsplit edit earlier echo echoerr echohl echomsg else elseif emenu endif endfor '
          + 'endfunction endtry endwhile enew execute exit exusage file filetype find finally finish first fixdel fold foldclose folddoopen folddoclosed foldopen function global goto grep grepadd gui gvim hardcopy help helpfind helpgrep helptags highlight hide history insert iabbrev iabclear ijump ilist imap '
          + 'imapclear imenu inoremap inoreabbrev inoremenu intro isearch isplit iunmap iunabbrev iunmenu join jumps keepalt keepmarks keepjumps lNext lNfile list laddexpr laddbuffer laddfile last language later lbuffer lcd lchdir lclose lcscope left leftabove lexpr lfile lfirst lgetbuffer lgetexpr lgetfile lgrep lgrepadd lhelpgrep llast llist lmake lmap lmapclear lnext lnewer lnfile lnoremap loadkeymap loadview '
          + 'lockmarks lockvar lolder lopen lprevious lpfile lrewind ltag lunmap luado luafile lvimgrep lvimgrepadd lwindow move mark make mapclear match menu menutranslate messages mkexrc mksession mkspell mkvimrc mkview mode mzscheme mzfile nbclose nbkey nbsart next nmap nmapclear nmenu nnoremap '
          + 'nnoremenu noautocmd noremap nohlsearch noreabbrev noremenu normal number nunmap nunmenu oldfiles open omap omapclear omenu only onoremap onoremenu options ounmap ounmenu ownsyntax print profdel profile promptfind promptrepl pclose pedit perl perldo pop popup ppop preserve previous psearch ptag ptNext '
          + 'ptfirst ptjump ptlast ptnext ptprevious ptrewind ptselect put pwd py3do py3file python pydo pyfile quit quitall qall read recover redo redir redraw redrawstatus registers resize retab return rewind right rightbelow ruby rubydo rubyfile rundo runtime rviminfo substitute sNext sandbox sargument sall saveas sbuffer sbNext sball sbfirst sblast sbmodified sbnext sbprevious sbrewind scriptnames scriptencoding '
          + 'scscope set setfiletype setglobal setlocal sfind sfirst shell simalt sign silent sleep slast smagic smapclear smenu snext sniff snomagic snoremap snoremenu sort source spelldump spellgood spellinfo spellrepall spellundo spellwrong split sprevious srewind stop stag startgreplace startreplace '
          + 'startinsert stopinsert stjump stselect sunhide sunmap sunmenu suspend sview swapname syntax syntime syncbind tNext tabNext tabclose tabedit tabfind tabfirst tablast tabmove tabnext tabonly tabprevious tabrewind tag tcl tcldo tclfile tearoff tfirst throw tjump tlast tmenu tnext topleft tprevious ' + 'trewind tselect tunmenu undo undojoin undolist unabbreviate unhide unlet unlockvar unmap unmenu unsilent update vglobal version verbose vertical vimgrep vimgrepadd visual viusage view vmap vmapclear vmenu vnew '
          + 'vnoremap vnoremenu vsplit vunmap vunmenu write wNext wall while winsize wincmd winpos wnext wprevious wqall wsverb wundo wviminfo xit xall xmapclear xmap xmenu xnoremap xnoremenu xunmap xunmenu yank',
        built_in: // built in func
          'synIDtrans atan2 range matcharg did_filetype asin feedkeys xor argv '
          + 'complete_check add getwinposx getqflist getwinposy screencol '
          + 'clearmatches empty extend getcmdpos mzeval garbagecollect setreg '
          + 'ceil sqrt diff_hlID inputsecret get getfperm getpid filewritable '
          + 'shiftwidth max sinh isdirectory synID system inputrestore winline '
          + 'atan visualmode inputlist tabpagewinnr round getregtype mapcheck '
          + 'hasmapto histdel argidx findfile sha256 exists toupper getcmdline '
          + 'taglist string getmatches bufnr strftime winwidth bufexists '
          + 'strtrans tabpagebuflist setcmdpos remote_read printf setloclist '
          + 'getpos getline bufwinnr float2nr len getcmdtype diff_filler luaeval '
          + 'resolve libcallnr foldclosedend reverse filter has_key bufname '
          + 'str2float strlen setline getcharmod setbufvar index searchpos '
          + 'shellescape undofile foldclosed setqflist buflisted strchars str2nr '
          + 'virtcol floor remove undotree remote_expr winheight gettabwinvar '
          + 'reltime cursor tabpagenr finddir localtime acos getloclist search '
          + 'tanh matchend rename gettabvar strdisplaywidth type abs py3eval '
          + 'setwinvar tolower wildmenumode log10 spellsuggest bufloaded '
          + 'synconcealed nextnonblank server2client complete settabwinvar '
          + 'executable input wincol setmatches getftype hlID inputsave '
          + 'searchpair or screenrow line settabvar histadd deepcopy strpart '
          + 'remote_peek and eval getftime submatch screenchar winsaveview '
          + 'matchadd mkdir screenattr getfontname libcall reltimestr getfsize '
          + 'winnr invert pow getbufline byte2line soundfold repeat fnameescape '
          + 'tagfiles sin strwidth spellbadword trunc maparg log lispindent '
          + 'hostname setpos globpath remote_foreground getchar synIDattr '
          + 'fnamemodify cscope_connection stridx winbufnr indent min '
          + 'complete_add nr2char searchpairpos inputdialog values matchlist '
          + 'items hlexists strridx browsedir expand fmod pathshorten line2byte '
          + 'argc count getwinvar glob foldtextresult getreg foreground cosh '
          + 'matchdelete has char2nr simplify histget searchdecl iconv '
          + 'winrestcmd pumvisible writefile foldlevel haslocaldir keys cos '
          + 'matchstr foldtext histnr tan tempname getcwd byteidx getbufvar '
          + 'islocked escape eventhandler remote_send serverlist winrestview '
          + 'synstack pyeval prevnonblank readfile cindent filereadable changenr '
          + 'exp'
      },
      illegal: /;/,
      contains: [
        hljs.NUMBER_MODE,
        {
          className: 'string',
          begin: '\'',
          end: '\'',
          illegal: '\\n'
        },

        /*
        A double quote can start either a string or a line comment. Strings are
        ended before the end of a line by another double quote and can contain
        escaped double-quotes and post-escaped line breaks.

        Also, any double quote at the beginning of a line is a comment but we
        don't handle that properly at the moment: any double quote inside will
        turn them into a string. Handling it properly will require a smarter
        parser.
        */
        {
          className: 'string',
          begin: /"(\\"|\n\\|[^"\n])*"/
        },
        hljs.COMMENT('"', '$'),

        {
          className: 'variable',
          begin: /[bwtglsav]:[\w\d_]+/
        },
        {
          begin: [
            /\b(?:function|function!)/,
            /\s+/,
            hljs.IDENT_RE
          ],
          className: {
            1: "keyword",
            3: "title"
          },
          end: '$',
          relevance: 0,
          contains: [
            {
              className: 'params',
              begin: '\\(',
              end: '\\)'
            }
          ]
        },
        {
          className: 'symbol',
          begin: /<[\w-]+>/
        }
      ]
    };
  }

  return vim;

})();

    hljs.registerLanguage('vim', hljsGrammar);
  })();