"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => OpenAISummaryHelperPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");

// node_modules/diff/libesm/diff/base.js
var Diff = class {
  diff(oldStr, newStr, options = {}) {
    let callback;
    if (typeof options === "function") {
      callback = options;
      options = {};
    } else if ("callback" in options) {
      callback = options.callback;
    }
    const oldString = this.castInput(oldStr, options);
    const newString = this.castInput(newStr, options);
    const oldTokens = this.removeEmpty(this.tokenize(oldString, options));
    const newTokens = this.removeEmpty(this.tokenize(newString, options));
    return this.diffWithOptionsObj(oldTokens, newTokens, options, callback);
  }
  diffWithOptionsObj(oldTokens, newTokens, options, callback) {
    var _a;
    const done = (value) => {
      value = this.postProcess(value, options);
      if (callback) {
        setTimeout(function() {
          callback(value);
        }, 0);
        return void 0;
      } else {
        return value;
      }
    };
    const newLen = newTokens.length, oldLen = oldTokens.length;
    let editLength = 1;
    let maxEditLength = newLen + oldLen;
    if (options.maxEditLength != null) {
      maxEditLength = Math.min(maxEditLength, options.maxEditLength);
    }
    const maxExecutionTime = (_a = options.timeout) !== null && _a !== void 0 ? _a : Infinity;
    const abortAfterTimestamp = Date.now() + maxExecutionTime;
    const bestPath = [{ oldPos: -1, lastComponent: void 0 }];
    let newPos = this.extractCommon(bestPath[0], newTokens, oldTokens, 0, options);
    if (bestPath[0].oldPos + 1 >= oldLen && newPos + 1 >= newLen) {
      return done(this.buildValues(bestPath[0].lastComponent, newTokens, oldTokens));
    }
    let minDiagonalToConsider = -Infinity, maxDiagonalToConsider = Infinity;
    const execEditLength = () => {
      for (let diagonalPath = Math.max(minDiagonalToConsider, -editLength); diagonalPath <= Math.min(maxDiagonalToConsider, editLength); diagonalPath += 2) {
        let basePath;
        const removePath = bestPath[diagonalPath - 1], addPath = bestPath[diagonalPath + 1];
        if (removePath) {
          bestPath[diagonalPath - 1] = void 0;
        }
        let canAdd = false;
        if (addPath) {
          const addPathNewPos = addPath.oldPos - diagonalPath;
          canAdd = addPath && 0 <= addPathNewPos && addPathNewPos < newLen;
        }
        const canRemove = removePath && removePath.oldPos + 1 < oldLen;
        if (!canAdd && !canRemove) {
          bestPath[diagonalPath] = void 0;
          continue;
        }
        if (!canRemove || canAdd && removePath.oldPos < addPath.oldPos) {
          basePath = this.addToPath(addPath, true, false, 0, options);
        } else {
          basePath = this.addToPath(removePath, false, true, 1, options);
        }
        newPos = this.extractCommon(basePath, newTokens, oldTokens, diagonalPath, options);
        if (basePath.oldPos + 1 >= oldLen && newPos + 1 >= newLen) {
          return done(this.buildValues(basePath.lastComponent, newTokens, oldTokens)) || true;
        } else {
          bestPath[diagonalPath] = basePath;
          if (basePath.oldPos + 1 >= oldLen) {
            maxDiagonalToConsider = Math.min(maxDiagonalToConsider, diagonalPath - 1);
          }
          if (newPos + 1 >= newLen) {
            minDiagonalToConsider = Math.max(minDiagonalToConsider, diagonalPath + 1);
          }
        }
      }
      editLength++;
    };
    if (callback) {
      (function exec() {
        setTimeout(function() {
          if (editLength > maxEditLength || Date.now() > abortAfterTimestamp) {
            return callback(void 0);
          }
          if (!execEditLength()) {
            exec();
          }
        }, 0);
      })();
    } else {
      while (editLength <= maxEditLength && Date.now() <= abortAfterTimestamp) {
        const ret = execEditLength();
        if (ret) {
          return ret;
        }
      }
    }
  }
  addToPath(path, added, removed, oldPosInc, options) {
    const last = path.lastComponent;
    if (last && !options.oneChangePerToken && last.added === added && last.removed === removed) {
      return {
        oldPos: path.oldPos + oldPosInc,
        lastComponent: { count: last.count + 1, added, removed, previousComponent: last.previousComponent }
      };
    } else {
      return {
        oldPos: path.oldPos + oldPosInc,
        lastComponent: { count: 1, added, removed, previousComponent: last }
      };
    }
  }
  extractCommon(basePath, newTokens, oldTokens, diagonalPath, options) {
    const newLen = newTokens.length, oldLen = oldTokens.length;
    let oldPos = basePath.oldPos, newPos = oldPos - diagonalPath, commonCount = 0;
    while (newPos + 1 < newLen && oldPos + 1 < oldLen && this.equals(oldTokens[oldPos + 1], newTokens[newPos + 1], options)) {
      newPos++;
      oldPos++;
      commonCount++;
      if (options.oneChangePerToken) {
        basePath.lastComponent = { count: 1, previousComponent: basePath.lastComponent, added: false, removed: false };
      }
    }
    if (commonCount && !options.oneChangePerToken) {
      basePath.lastComponent = { count: commonCount, previousComponent: basePath.lastComponent, added: false, removed: false };
    }
    basePath.oldPos = oldPos;
    return newPos;
  }
  equals(left, right, options) {
    if (options.comparator) {
      return options.comparator(left, right);
    } else {
      return left === right || !!options.ignoreCase && left.toLowerCase() === right.toLowerCase();
    }
  }
  removeEmpty(array) {
    const ret = [];
    for (let i = 0; i < array.length; i++) {
      if (array[i]) {
        ret.push(array[i]);
      }
    }
    return ret;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  castInput(value, options) {
    return value;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tokenize(value, options) {
    return Array.from(value);
  }
  join(chars) {
    return chars.join("");
  }
  postProcess(changeObjects, options) {
    return changeObjects;
  }
  get useLongestToken() {
    return false;
  }
  buildValues(lastComponent, newTokens, oldTokens) {
    const components = [];
    let nextComponent;
    while (lastComponent) {
      components.push(lastComponent);
      nextComponent = lastComponent.previousComponent;
      delete lastComponent.previousComponent;
      lastComponent = nextComponent;
    }
    components.reverse();
    const componentLen = components.length;
    let componentPos = 0, newPos = 0, oldPos = 0;
    for (; componentPos < componentLen; componentPos++) {
      const component = components[componentPos];
      if (!component.removed) {
        if (!component.added && this.useLongestToken) {
          let value = newTokens.slice(newPos, newPos + component.count);
          value = value.map(function(value2, i) {
            const oldValue = oldTokens[oldPos + i];
            return oldValue.length > value2.length ? oldValue : value2;
          });
          component.value = this.join(value);
        } else {
          component.value = this.join(newTokens.slice(newPos, newPos + component.count));
        }
        newPos += component.count;
        if (!component.added) {
          oldPos += component.count;
        }
      } else {
        component.value = this.join(oldTokens.slice(oldPos, oldPos + component.count));
        oldPos += component.count;
      }
    }
    return components;
  }
};

// node_modules/diff/libesm/util/string.js
function hasOnlyWinLineEndings(string) {
  return string.includes("\r\n") && !string.startsWith("\n") && !string.match(/[^\r]\n/);
}
function hasOnlyUnixLineEndings(string) {
  return !string.includes("\r\n") && string.includes("\n");
}

// node_modules/diff/libesm/diff/line.js
var LineDiff = class extends Diff {
  constructor() {
    super(...arguments);
    this.tokenize = tokenize;
  }
  equals(left, right, options) {
    if (options.ignoreWhitespace) {
      if (!options.newlineIsToken || !left.includes("\n")) {
        left = left.trim();
      }
      if (!options.newlineIsToken || !right.includes("\n")) {
        right = right.trim();
      }
    } else if (options.ignoreNewlineAtEof && !options.newlineIsToken) {
      if (left.endsWith("\n")) {
        left = left.slice(0, -1);
      }
      if (right.endsWith("\n")) {
        right = right.slice(0, -1);
      }
    }
    return super.equals(left, right, options);
  }
};
var lineDiff = new LineDiff();
function diffLines(oldStr, newStr, options) {
  return lineDiff.diff(oldStr, newStr, options);
}
function tokenize(value, options) {
  if (options.stripTrailingCr) {
    value = value.replace(/\r\n/g, "\n");
  }
  const retLines = [], linesAndNewlines = value.split(/(\n|\r\n)/);
  if (!linesAndNewlines[linesAndNewlines.length - 1]) {
    linesAndNewlines.pop();
  }
  for (let i = 0; i < linesAndNewlines.length; i++) {
    const line = linesAndNewlines[i];
    if (i % 2 && !options.newlineIsToken) {
      retLines[retLines.length - 1] += line;
    } else {
      retLines.push(line);
    }
  }
  return retLines;
}

// node_modules/diff/libesm/patch/line-endings.js
function unixToWin(patch) {
  if (Array.isArray(patch)) {
    return patch.map((p) => unixToWin(p));
  }
  return Object.assign(Object.assign({}, patch), { hunks: patch.hunks.map((hunk) => Object.assign(Object.assign({}, hunk), { lines: hunk.lines.map((line, i) => {
    var _a;
    return line.startsWith("\\") || line.endsWith("\r") || ((_a = hunk.lines[i + 1]) === null || _a === void 0 ? void 0 : _a.startsWith("\\")) ? line : line + "\r";
  }) })) });
}
function winToUnix(patch) {
  if (Array.isArray(patch)) {
    return patch.map((p) => winToUnix(p));
  }
  return Object.assign(Object.assign({}, patch), { hunks: patch.hunks.map((hunk) => Object.assign(Object.assign({}, hunk), { lines: hunk.lines.map((line) => line.endsWith("\r") ? line.substring(0, line.length - 1) : line) })) });
}
function isUnix(patch) {
  if (!Array.isArray(patch)) {
    patch = [patch];
  }
  return !patch.some((index) => index.hunks.some((hunk) => hunk.lines.some((line) => !line.startsWith("\\") && line.endsWith("\r"))));
}
function isWin(patch) {
  if (!Array.isArray(patch)) {
    patch = [patch];
  }
  return patch.some((index) => index.hunks.some((hunk) => hunk.lines.some((line) => line.endsWith("\r")))) && patch.every((index) => index.hunks.every((hunk) => hunk.lines.every((line, i) => {
    var _a;
    return line.startsWith("\\") || line.endsWith("\r") || ((_a = hunk.lines[i + 1]) === null || _a === void 0 ? void 0 : _a.startsWith("\\"));
  })));
}

// node_modules/diff/libesm/patch/parse.js
function parsePatch(uniDiff) {
  const diffstr = uniDiff.split(/\n/), list = [];
  let i = 0;
  function isGitDiffHeader(line) {
    return /^diff --git /.test(line);
  }
  function isDiffHeader(line) {
    return isGitDiffHeader(line) || /^Index:\s/.test(line) || /^diff(?: -r \w+)+\s/.test(line);
  }
  function isFileHeader(line) {
    return /^(---|\+\+\+)\s/.test(line);
  }
  function isHunkHeader(line) {
    return /^@@\s/.test(line);
  }
  function parseIndex() {
    var _a;
    const index = {};
    index.hunks = [];
    list.push(index);
    let seenDiffHeader = false;
    while (i < diffstr.length) {
      const line = diffstr[i];
      if (isFileHeader(line) || isHunkHeader(line)) {
        break;
      }
      if (isGitDiffHeader(line)) {
        if (seenDiffHeader) {
          return;
        }
        seenDiffHeader = true;
        index.isGit = true;
        const paths = parseGitDiffHeader(line);
        if (paths) {
          index.oldFileName = paths.oldFileName;
          index.newFileName = paths.newFileName;
        }
        i++;
        while (i < diffstr.length) {
          const extLine = diffstr[i];
          if (isFileHeader(extLine) || isHunkHeader(extLine) || isDiffHeader(extLine)) {
            break;
          }
          const renameFromMatch = /^rename from (.*)/.exec(extLine);
          if (renameFromMatch) {
            index.oldFileName = "a/" + unquoteIfQuoted(renameFromMatch[1]);
            index.isRename = true;
          }
          const renameToMatch = /^rename to (.*)/.exec(extLine);
          if (renameToMatch) {
            index.newFileName = "b/" + unquoteIfQuoted(renameToMatch[1]);
            index.isRename = true;
          }
          const copyFromMatch = /^copy from (.*)/.exec(extLine);
          if (copyFromMatch) {
            index.oldFileName = "a/" + unquoteIfQuoted(copyFromMatch[1]);
            index.isCopy = true;
          }
          const copyToMatch = /^copy to (.*)/.exec(extLine);
          if (copyToMatch) {
            index.newFileName = "b/" + unquoteIfQuoted(copyToMatch[1]);
            index.isCopy = true;
          }
          const newFileModeMatch = /^new file mode (\d+)/.exec(extLine);
          if (newFileModeMatch) {
            index.isCreate = true;
            index.newMode = newFileModeMatch[1];
          }
          const deletedFileModeMatch = /^deleted file mode (\d+)/.exec(extLine);
          if (deletedFileModeMatch) {
            index.isDelete = true;
            index.oldMode = deletedFileModeMatch[1];
          }
          const oldModeMatch = /^old mode (\d+)/.exec(extLine);
          if (oldModeMatch) {
            index.oldMode = oldModeMatch[1];
          }
          const newModeMatch = /^new mode (\d+)/.exec(extLine);
          if (newModeMatch) {
            index.newMode = newModeMatch[1];
          }
          if (/^Binary files /.test(extLine)) {
            index.isBinary = true;
          }
          i++;
        }
        continue;
      } else if (isDiffHeader(line)) {
        if (seenDiffHeader) {
          return;
        }
        seenDiffHeader = true;
        const headerMatch = /^(?:Index:|diff(?: -r \w+)+)\s+/.exec(line);
        if (headerMatch) {
          index.index = line.substring(headerMatch[0].length).trim();
        }
      }
      i++;
    }
    parseFileHeader(index);
    parseFileHeader(index);
    if (index.oldFileName === void 0 !== (index.newFileName === void 0)) {
      throw new Error("Missing " + (index.oldFileName !== void 0 ? '"+++ ..."' : '"--- ..."') + " file header for " + ((_a = index.oldFileName) !== null && _a !== void 0 ? _a : index.newFileName));
    }
    while (i < diffstr.length) {
      const line = diffstr[i];
      if (isDiffHeader(line) || isFileHeader(line) || /^===================================================================/.test(line)) {
        break;
      } else if (isHunkHeader(line)) {
        index.hunks.push(parseHunk());
      } else {
        i++;
      }
    }
  }
  function parseGitDiffHeader(line) {
    const rest = line.substring("diff --git ".length);
    if (rest.startsWith('"')) {
      const oldPath = parseQuotedFileName(rest);
      if (oldPath === null) {
        return null;
      }
      const afterOld = rest.substring(oldPath.rawLength + 1);
      let newFileName;
      if (afterOld.startsWith('"')) {
        const newPath = parseQuotedFileName(afterOld);
        if (newPath === null) {
          return null;
        }
        newFileName = newPath.fileName;
      } else {
        newFileName = afterOld;
      }
      return {
        oldFileName: oldPath.fileName,
        newFileName
      };
    }
    const quoteIdx = rest.indexOf('"');
    if (quoteIdx > 0) {
      const oldFileName = rest.substring(0, quoteIdx - 1);
      const newPath = parseQuotedFileName(rest.substring(quoteIdx));
      if (newPath === null) {
        return null;
      }
      return {
        oldFileName,
        newFileName: newPath.fileName
      };
    }
    if (rest.startsWith("a/")) {
      const splits = [];
      let idx = 0;
      while (true) {
        idx = rest.indexOf(" b/", idx + 1);
        if (idx === -1) {
          break;
        }
        splits.push(idx);
      }
      if (splits.length > 0) {
        const mid = splits[Math.floor(splits.length / 2)];
        return {
          oldFileName: rest.substring(0, mid),
          newFileName: rest.substring(mid + 1)
        };
      }
    }
    return null;
  }
  function unquoteIfQuoted(s) {
    if (s.startsWith('"')) {
      const parsed = parseQuotedFileName(s);
      if (parsed) {
        return parsed.fileName;
      }
    }
    return s;
  }
  function parseQuotedFileName(s) {
    if (!s.startsWith('"')) {
      return null;
    }
    let result = "";
    let j = 1;
    while (j < s.length) {
      if (s[j] === '"') {
        return { fileName: result, rawLength: j + 1 };
      }
      if (s[j] === "\\" && j + 1 < s.length) {
        j++;
        switch (s[j]) {
          case "a":
            result += "\x07";
            break;
          case "b":
            result += "\b";
            break;
          case "f":
            result += "\f";
            break;
          case "n":
            result += "\n";
            break;
          case "r":
            result += "\r";
            break;
          case "t":
            result += "	";
            break;
          case "v":
            result += "\v";
            break;
          case "\\":
            result += "\\";
            break;
          case '"':
            result += '"';
            break;
          case "0":
          case "1":
          case "2":
          case "3":
          case "4":
          case "5":
          case "6":
          case "7": {
            if (j + 2 >= s.length || s[j + 1] < "0" || s[j + 1] > "7" || s[j + 2] < "0" || s[j + 2] > "7") {
              return null;
            }
            const bytes = [parseInt(s.substring(j, j + 3), 8)];
            j += 3;
            while (s[j] === "\\" && s[j + 1] >= "0" && s[j + 1] <= "7") {
              if (j + 3 >= s.length || s[j + 2] < "0" || s[j + 2] > "7" || s[j + 3] < "0" || s[j + 3] > "7") {
                return null;
              }
              bytes.push(parseInt(s.substring(j + 1, j + 4), 8));
              j += 4;
            }
            result += new TextDecoder("utf-8").decode(new Uint8Array(bytes));
            continue;
          }
          // Note that in C, there are also three kinds of hex escape sequences:
          // - \xhh
          // - \uhhhh
          // - \Uhhhhhhhh
          // We do not bother to parse them here because, so far as we know,
          // they are never emitted by any tools that generate unified diff
          // format diffs, and so for now jsdiff does not consider them legal.
          default:
            return null;
        }
      } else {
        result += s[j];
      }
      j++;
    }
    return null;
  }
  function parseFileHeader(index) {
    const fileHeaderMatch = /^(---|\+\+\+)\s+/.exec(diffstr[i]);
    if (fileHeaderMatch) {
      const prefix = fileHeaderMatch[1], data = diffstr[i].substring(3).trim().split("	", 2), header = (data[1] || "").trim();
      let fileName = data[0];
      if (fileName.startsWith('"')) {
        fileName = unquoteIfQuoted(fileName);
      } else {
        fileName = fileName.replace(/\\\\/g, "\\");
      }
      if (prefix === "---") {
        index.oldFileName = fileName;
        index.oldHeader = header;
      } else {
        index.newFileName = fileName;
        index.newHeader = header;
      }
      i++;
    }
  }
  function parseHunk() {
    var _a;
    const chunkHeaderIndex = i, chunkHeaderLine = diffstr[i++], chunkHeader = chunkHeaderLine.split(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
    const hunk = {
      oldStart: +chunkHeader[1],
      oldLines: typeof chunkHeader[2] === "undefined" ? 1 : +chunkHeader[2],
      newStart: +chunkHeader[3],
      newLines: typeof chunkHeader[4] === "undefined" ? 1 : +chunkHeader[4],
      lines: []
    };
    if (hunk.oldLines === 0) {
      hunk.oldStart += 1;
    }
    if (hunk.newLines === 0) {
      hunk.newStart += 1;
    }
    let addCount = 0, removeCount = 0;
    for (; i < diffstr.length && (removeCount < hunk.oldLines || addCount < hunk.newLines || ((_a = diffstr[i]) === null || _a === void 0 ? void 0 : _a.startsWith("\\"))); i++) {
      const operation = diffstr[i].length == 0 && i != diffstr.length - 1 ? " " : diffstr[i][0];
      if (operation === "+" || operation === "-" || operation === " " || operation === "\\") {
        hunk.lines.push(diffstr[i]);
        if (operation === "+") {
          addCount++;
        } else if (operation === "-") {
          removeCount++;
        } else if (operation === " ") {
          addCount++;
          removeCount++;
        }
      } else {
        throw new Error(`Hunk at line ${chunkHeaderIndex + 1} contained invalid line ${diffstr[i]}`);
      }
    }
    if (!addCount && hunk.newLines === 1) {
      hunk.newLines = 0;
    }
    if (!removeCount && hunk.oldLines === 1) {
      hunk.oldLines = 0;
    }
    if (addCount !== hunk.newLines) {
      throw new Error("Added line count did not match for hunk at line " + (chunkHeaderIndex + 1));
    }
    if (removeCount !== hunk.oldLines) {
      throw new Error("Removed line count did not match for hunk at line " + (chunkHeaderIndex + 1));
    }
    if (i < diffstr.length && diffstr[i] && /^[+ -]/.test(diffstr[i]) && !isFileHeader(diffstr[i])) {
      throw new Error("Hunk at line " + (chunkHeaderIndex + 1) + " has more lines than expected (expected " + hunk.oldLines + " old lines and " + hunk.newLines + " new lines)");
    }
    return hunk;
  }
  while (i < diffstr.length) {
    parseIndex();
  }
  return list;
}

// node_modules/diff/libesm/util/distance-iterator.js
function distance_iterator_default(start, minLine, maxLine) {
  let wantForward = true, backwardExhausted = false, forwardExhausted = false, localOffset = 1;
  return function iterator() {
    if (wantForward && !forwardExhausted) {
      if (backwardExhausted) {
        localOffset++;
      } else {
        wantForward = false;
      }
      if (start + localOffset <= maxLine) {
        return start + localOffset;
      }
      forwardExhausted = true;
    }
    if (!backwardExhausted) {
      if (!forwardExhausted) {
        wantForward = true;
      }
      if (minLine <= start - localOffset) {
        return start - localOffset++;
      }
      backwardExhausted = true;
      return iterator();
    }
    return void 0;
  };
}

// node_modules/diff/libesm/patch/apply.js
function applyPatch(source, patch, options = {}) {
  let patches;
  if (typeof patch === "string") {
    patches = parsePatch(patch);
  } else if (Array.isArray(patch)) {
    patches = patch;
  } else {
    patches = [patch];
  }
  if (patches.length > 1) {
    throw new Error("applyPatch only works with a single input.");
  }
  return applyStructuredPatch(source, patches[0], options);
}
function applyStructuredPatch(source, patch, options = {}) {
  if (options.autoConvertLineEndings || options.autoConvertLineEndings == null) {
    if (hasOnlyWinLineEndings(source) && isUnix(patch)) {
      patch = unixToWin(patch);
    } else if (hasOnlyUnixLineEndings(source) && isWin(patch)) {
      patch = winToUnix(patch);
    }
  }
  const lines = source.split("\n"), hunks = patch.hunks, compareLine = options.compareLine || ((lineNumber, line, operation, patchContent) => line === patchContent), fuzzFactor = options.fuzzFactor || 0;
  let minLine = 0;
  if (fuzzFactor < 0 || !Number.isInteger(fuzzFactor)) {
    throw new Error("fuzzFactor must be a non-negative integer");
  }
  if (!hunks.length) {
    return source;
  }
  let prevLine = "", removeEOFNL = false, addEOFNL = false;
  for (let i = 0; i < hunks[hunks.length - 1].lines.length; i++) {
    const line = hunks[hunks.length - 1].lines[i];
    if (line[0] == "\\") {
      if (prevLine[0] == "+") {
        removeEOFNL = true;
      } else if (prevLine[0] == "-") {
        addEOFNL = true;
      }
    }
    prevLine = line;
  }
  if (removeEOFNL) {
    if (addEOFNL) {
      if (!fuzzFactor && lines[lines.length - 1] == "") {
        return false;
      }
    } else if (lines[lines.length - 1] == "") {
      lines.pop();
    } else if (!fuzzFactor) {
      return false;
    }
  } else if (addEOFNL) {
    if (lines[lines.length - 1] != "") {
      lines.push("");
    } else if (!fuzzFactor) {
      return false;
    }
  }
  function applyHunk(hunkLines, toPos, maxErrors, hunkLinesI = 0, lastContextLineMatched = true, patchedLines = [], patchedLinesLength = 0) {
    let nConsecutiveOldContextLines = 0;
    let nextContextLineMustMatch = false;
    for (; hunkLinesI < hunkLines.length; hunkLinesI++) {
      const hunkLine = hunkLines[hunkLinesI], operation = hunkLine.length > 0 ? hunkLine[0] : " ", content = hunkLine.length > 0 ? hunkLine.substr(1) : hunkLine;
      if (operation === "-") {
        if (compareLine(toPos + 1, lines[toPos], operation, content)) {
          toPos++;
          nConsecutiveOldContextLines = 0;
        } else {
          if (!maxErrors || lines[toPos] == null) {
            return null;
          }
          patchedLines[patchedLinesLength] = lines[toPos];
          return applyHunk(hunkLines, toPos + 1, maxErrors - 1, hunkLinesI, false, patchedLines, patchedLinesLength + 1);
        }
      }
      if (operation === "+") {
        if (!lastContextLineMatched) {
          return null;
        }
        patchedLines[patchedLinesLength] = content;
        patchedLinesLength++;
        nConsecutiveOldContextLines = 0;
        nextContextLineMustMatch = true;
      }
      if (operation === " ") {
        nConsecutiveOldContextLines++;
        patchedLines[patchedLinesLength] = lines[toPos];
        if (compareLine(toPos + 1, lines[toPos], operation, content)) {
          patchedLinesLength++;
          lastContextLineMatched = true;
          nextContextLineMustMatch = false;
          toPos++;
        } else {
          if (nextContextLineMustMatch || !maxErrors) {
            return null;
          }
          return lines[toPos] && (applyHunk(hunkLines, toPos + 1, maxErrors - 1, hunkLinesI + 1, false, patchedLines, patchedLinesLength + 1) || applyHunk(hunkLines, toPos + 1, maxErrors - 1, hunkLinesI, false, patchedLines, patchedLinesLength + 1)) || applyHunk(hunkLines, toPos, maxErrors - 1, hunkLinesI + 1, false, patchedLines, patchedLinesLength);
        }
      }
    }
    patchedLinesLength -= nConsecutiveOldContextLines;
    toPos -= nConsecutiveOldContextLines;
    patchedLines.length = patchedLinesLength;
    return {
      patchedLines,
      oldLineLastI: toPos - 1
    };
  }
  const resultLines = [];
  let prevHunkOffset = 0;
  for (let i = 0; i < hunks.length; i++) {
    const hunk = hunks[i];
    let hunkResult;
    const maxLine = lines.length - hunk.oldLines + fuzzFactor;
    let toPos;
    for (let maxErrors = 0; maxErrors <= fuzzFactor; maxErrors++) {
      toPos = hunk.oldStart + prevHunkOffset - 1;
      const iterator = distance_iterator_default(toPos, minLine, maxLine);
      for (; toPos !== void 0; toPos = iterator()) {
        hunkResult = applyHunk(hunk.lines, toPos, maxErrors);
        if (hunkResult) {
          break;
        }
      }
      if (hunkResult) {
        break;
      }
    }
    if (!hunkResult) {
      return false;
    }
    for (let i2 = minLine; i2 < toPos; i2++) {
      resultLines.push(lines[i2]);
    }
    for (let i2 = 0; i2 < hunkResult.patchedLines.length; i2++) {
      const line = hunkResult.patchedLines[i2];
      resultLines.push(line);
    }
    minLine = hunkResult.oldLineLastI + 1;
    prevHunkOffset = toPos + 1 - hunk.oldStart;
  }
  for (let i = minLine; i < lines.length; i++) {
    resultLines.push(lines[i]);
  }
  return resultLines.join("\n");
}

// node_modules/diff/libesm/patch/create.js
function needsQuoting(s) {
  for (let i = 0; i < s.length; i++) {
    if (s[i] < " " || s[i] > "~" || s[i] === '"' || s[i] === "\\") {
      return true;
    }
  }
  return false;
}
function quoteFileNameIfNeeded(s) {
  if (!needsQuoting(s)) {
    return s;
  }
  let result = '"';
  const bytes = new TextEncoder().encode(s);
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i];
    if (b === 7) {
      result += "\\a";
    } else if (b === 8) {
      result += "\\b";
    } else if (b === 9) {
      result += "\\t";
    } else if (b === 10) {
      result += "\\n";
    } else if (b === 11) {
      result += "\\v";
    } else if (b === 12) {
      result += "\\f";
    } else if (b === 13) {
      result += "\\r";
    } else if (b === 34) {
      result += '\\"';
    } else if (b === 92) {
      result += "\\\\";
    } else if (b >= 32 && b <= 126) {
      result += String.fromCharCode(b);
    } else {
      result += "\\" + b.toString(8).padStart(3, "0");
    }
    i++;
  }
  result += '"';
  return result;
}
var INCLUDE_HEADERS = {
  includeIndex: true,
  includeUnderline: true,
  includeFileHeaders: true
};
function structuredPatch(oldFileName, newFileName, oldStr, newStr, oldHeader, newHeader, options) {
  let optionsObj;
  if (!options) {
    optionsObj = {};
  } else if (typeof options === "function") {
    optionsObj = { callback: options };
  } else {
    optionsObj = options;
  }
  if (typeof optionsObj.context === "undefined") {
    optionsObj.context = 4;
  }
  const context = optionsObj.context;
  if (optionsObj.newlineIsToken) {
    throw new Error("newlineIsToken may not be used with patch-generation functions, only with diffing functions");
  }
  if (!optionsObj.callback) {
    return diffLinesResultToPatch(diffLines(oldStr, newStr, optionsObj));
  } else {
    const { callback } = optionsObj;
    diffLines(oldStr, newStr, Object.assign(Object.assign({}, optionsObj), { callback: (diff) => {
      const patch = diffLinesResultToPatch(diff);
      callback(patch);
    } }));
  }
  function diffLinesResultToPatch(diff) {
    if (!diff) {
      return;
    }
    diff.push({ value: "", lines: [] });
    function contextLines(lines) {
      return lines.map(function(entry) {
        return " " + entry;
      });
    }
    const hunks = [];
    let oldRangeStart = 0, newRangeStart = 0, curRange = [], oldLine = 1, newLine = 1;
    for (let i = 0; i < diff.length; i++) {
      const current = diff[i], lines = current.lines || splitLines(current.value);
      current.lines = lines;
      if (current.added || current.removed) {
        if (!oldRangeStart) {
          const prev = diff[i - 1];
          oldRangeStart = oldLine;
          newRangeStart = newLine;
          if (prev) {
            curRange = context > 0 ? contextLines(prev.lines.slice(-context)) : [];
            oldRangeStart -= curRange.length;
            newRangeStart -= curRange.length;
          }
        }
        for (const line of lines) {
          curRange.push((current.added ? "+" : "-") + line);
        }
        if (current.added) {
          newLine += lines.length;
        } else {
          oldLine += lines.length;
        }
      } else {
        if (oldRangeStart) {
          if (lines.length <= context * 2 && i < diff.length - 2) {
            for (const line of contextLines(lines)) {
              curRange.push(line);
            }
          } else {
            const contextSize = Math.min(lines.length, context);
            for (const line of contextLines(lines.slice(0, contextSize))) {
              curRange.push(line);
            }
            const hunk = {
              oldStart: oldRangeStart,
              oldLines: oldLine - oldRangeStart + contextSize,
              newStart: newRangeStart,
              newLines: newLine - newRangeStart + contextSize,
              lines: curRange
            };
            hunks.push(hunk);
            oldRangeStart = 0;
            newRangeStart = 0;
            curRange = [];
          }
        }
        oldLine += lines.length;
        newLine += lines.length;
      }
    }
    for (const hunk of hunks) {
      for (let i = 0; i < hunk.lines.length; i++) {
        if (hunk.lines[i].endsWith("\n")) {
          hunk.lines[i] = hunk.lines[i].slice(0, -1);
        } else {
          hunk.lines.splice(i + 1, 0, "\\ No newline at end of file");
          i++;
        }
      }
    }
    return {
      oldFileName,
      newFileName,
      oldHeader,
      newHeader,
      hunks
    };
  }
}
function formatPatch(patch, headerOptions) {
  var _a, _b, _c, _d, _e, _f;
  if (!headerOptions) {
    headerOptions = INCLUDE_HEADERS;
  }
  if (Array.isArray(patch)) {
    if (patch.length > 1 && !headerOptions.includeFileHeaders && !patch.every((p) => p.isGit)) {
      throw new Error("Cannot omit file headers on a multi-file patch. (The result would be unparseable; how would a tool trying to apply the patch know which changes are to which file?)");
    }
    return patch.map((p) => formatPatch(p, headerOptions)).join("\n");
  }
  const ret = [];
  if (patch.isGit) {
    headerOptions = INCLUDE_HEADERS;
    if (!patch.oldFileName) {
      throw new Error("oldFileName must be specified for Git patches");
    }
    if (!patch.newFileName) {
      throw new Error("newFileName must be specified for Git patches");
    }
    let gitOldName = patch.oldFileName;
    let gitNewName = patch.newFileName;
    if (patch.isCreate && gitOldName === "/dev/null") {
      gitOldName = gitNewName.replace(/^b\//, "a/");
    } else if (patch.isDelete && gitNewName === "/dev/null") {
      gitNewName = gitOldName.replace(/^a\//, "b/");
    }
    ret.push("diff --git " + quoteFileNameIfNeeded(gitOldName) + " " + quoteFileNameIfNeeded(gitNewName));
    if (patch.isDelete) {
      ret.push("deleted file mode " + ((_a = patch.oldMode) !== null && _a !== void 0 ? _a : "100644"));
    }
    if (patch.isCreate) {
      ret.push("new file mode " + ((_b = patch.newMode) !== null && _b !== void 0 ? _b : "100644"));
    }
    if (patch.oldMode && patch.newMode && !patch.isDelete && !patch.isCreate) {
      ret.push("old mode " + patch.oldMode);
      ret.push("new mode " + patch.newMode);
    }
    if (patch.isRename) {
      ret.push("rename from " + quoteFileNameIfNeeded(((_c = patch.oldFileName) !== null && _c !== void 0 ? _c : "").replace(/^a\//, "")));
      ret.push("rename to " + quoteFileNameIfNeeded(((_d = patch.newFileName) !== null && _d !== void 0 ? _d : "").replace(/^b\//, "")));
    }
    if (patch.isCopy) {
      ret.push("copy from " + quoteFileNameIfNeeded(((_e = patch.oldFileName) !== null && _e !== void 0 ? _e : "").replace(/^a\//, "")));
      ret.push("copy to " + quoteFileNameIfNeeded(((_f = patch.newFileName) !== null && _f !== void 0 ? _f : "").replace(/^b\//, "")));
    }
  } else {
    if (headerOptions.includeIndex && patch.oldFileName == patch.newFileName && patch.oldFileName !== void 0) {
      ret.push("Index: " + patch.oldFileName);
    }
    if (headerOptions.includeUnderline) {
      ret.push("===================================================================");
    }
  }
  const hasHunks = patch.hunks.length > 0;
  if (headerOptions.includeFileHeaders && patch.oldFileName !== void 0 && patch.newFileName !== void 0 && (!patch.isGit || hasHunks)) {
    ret.push("--- " + quoteFileNameIfNeeded(patch.oldFileName) + (patch.oldHeader ? "	" + patch.oldHeader : ""));
    ret.push("+++ " + quoteFileNameIfNeeded(patch.newFileName) + (patch.newHeader ? "	" + patch.newHeader : ""));
  }
  for (let i = 0; i < patch.hunks.length; i++) {
    const hunk = patch.hunks[i];
    const oldStart = hunk.oldLines === 0 ? hunk.oldStart - 1 : hunk.oldStart;
    const newStart = hunk.newLines === 0 ? hunk.newStart - 1 : hunk.newStart;
    ret.push("@@ -" + oldStart + "," + hunk.oldLines + " +" + newStart + "," + hunk.newLines + " @@");
    for (const line of hunk.lines) {
      ret.push(line);
    }
  }
  return ret.join("\n") + "\n";
}
function createTwoFilesPatch(oldFileName, newFileName, oldStr, newStr, oldHeader, newHeader, options) {
  if (typeof options === "function") {
    options = { callback: options };
  }
  if (!(options === null || options === void 0 ? void 0 : options.callback)) {
    const patchObj = structuredPatch(oldFileName, newFileName, oldStr, newStr, oldHeader, newHeader, options);
    if (!patchObj) {
      return;
    }
    return formatPatch(patchObj, options === null || options === void 0 ? void 0 : options.headerOptions);
  } else {
    const { callback } = options;
    structuredPatch(oldFileName, newFileName, oldStr, newStr, oldHeader, newHeader, Object.assign(Object.assign({}, options), { callback: (patchObj) => {
      if (!patchObj) {
        callback(void 0);
      } else {
        callback(formatPatch(patchObj, options.headerOptions));
      }
    } }));
  }
}
function splitLines(text) {
  const hasTrailingNl = text.endsWith("\n");
  const result = text.split("\n").map((line) => line + "\n");
  if (hasTrailingNl) {
    result.pop();
  } else {
    result.push(result.pop().slice(0, -1));
  }
  return result;
}

// main.ts
var DEFAULT_SETTINGS = {
  apiKey: "",
  baseUrl: "https://api.openai.com/v1",
  descriptionPrompt: [
    "\u8BF7\u57FA\u4E8E\u4E0B\u9762\u6587\u7AE0\u751F\u6210\u4E00\u6BB5\u9002\u5408\u5199\u5165 frontmatter description \u7684\u4E2D\u6587\u63CF\u8FF0\u3002",
    "\u8981\u6C42\uFF1A",
    "1. 60 \u5230 100 \u5B57\uFF1B",
    "2. \u4FDD\u6301\u51C6\u786E\u3001\u5177\u4F53\uFF0C\u4E0D\u8981\u5938\u5F20\uFF1B",
    "3. \u53EA\u8F93\u51FA description \u6B63\u6587\uFF0C\u4E0D\u8981\u989D\u5916\u89E3\u91CA\uFF1B",
    "",
    "\u6587\u7AE0\u6807\u9898\uFF1A{{title}}",
    "\u6587\u7AE0\u8DEF\u5F84\uFF1A{{path}}",
    "",
    "\u6587\u7AE0\u5185\u5BB9\uFF1A",
    "{{content}}"
  ].join("\n"),
  maxInputChars: 24e3,
  model: "gpt-4.1-mini",
  overwriteDescription: false,
  reviewPrompt: [
    "\u4F60\u662F\u4E00\u540D\u4E2D\u6587\u6587\u7AE0\u7F16\u8F91\u52A9\u624B\uFF0C\u8BF7\u76F4\u63A5\u8F93\u51FA\u201C\u4FEE\u8BA2\u540E\u7684\u5B8C\u6574 Markdown \u6587\u672C\u201D\uFF0C\u7528\u4E8E\u66FF\u6362\u539F\u6587\u3002",
    "\u76EE\u6807\uFF1A\u4FEE\u6B63\u9519\u522B\u5B57\u3001\u8BED\u75C5\u3001\u8868\u8FBE\u4E0D\u987A\u3001\u91CD\u590D\u3001\u6807\u70B9\u548C\u63AA\u8F9E\u95EE\u9898\uFF0C\u4F46\u4E0D\u8981\u6539\u53D8\u4F5C\u8005\u539F\u610F\u3002",
    "\u8981\u6C42\uFF1A",
    "1. YAML frontmatter \u5FC5\u987B\u4FDD\u6301\u539F\u6837\uFF0C\u9664\u975E\u5176\u4E2D\u6709\u660E\u663E\u9519\u522B\u5B57\uFF1B",
    "2. \u4FDD\u6301\u6807\u9898\u5C42\u7EA7\u3001\u5217\u8868\u3001\u94FE\u63A5\u3001\u5F15\u7528\u3001\u8868\u683C\u3001\u4EE3\u7801\u5757\u7B49 Markdown \u7ED3\u6784\uFF1B",
    "3. \u4E0D\u8981\u65B0\u589E\u89E3\u91CA\uFF0C\u4E0D\u8981\u5199\u5BA1\u7A3F\u610F\u89C1\uFF0C\u4E0D\u8981\u4F7F\u7528\u4EE3\u7801\u56F4\u680F\uFF1B",
    "4. \u53EA\u8F93\u51FA\u4FEE\u8BA2\u540E\u7684\u5B8C\u6574 Markdown \u6587\u672C\uFF1B",
    "",
    "\u6587\u7AE0\u6807\u9898\uFF1A{{title}}",
    "\u6587\u7AE0\u8DEF\u5F84\uFF1A{{path}}",
    "",
    "\u539F\u6587\u5168\u6587\uFF1A",
    "{{content}}"
  ].join("\n"),
  rollingSummaryPrompt: [
    "\u4F60\u6B63\u5728\u6267\u884C\u957F\u6587\u7684\u5206\u6BB5\u9012\u8FDB\u6458\u8981\u4EFB\u52A1\u3002",
    "\u6574\u7BC7\u6587\u7AE0\u5171 {{chunk_total}} \u6BB5\uFF0C\u5F53\u524D\u5904\u7406\u7B2C {{chunk_index}} \u6BB5\u3002",
    "\u4F60\u4F1A\u770B\u5230\u4E24\u90E8\u5206\u8F93\u5165\uFF1A",
    "1. \u5DF2\u6709\u7D2F\u8BA1\u6458\u8981\uFF1A\u8868\u793A\u622A\u81F3\u4E0A\u4E00\u6BB5\u4E3A\u6B62\u7684\u91CD\u8981\u5185\u5BB9\uFF1B",
    "2. \u5F53\u524D\u6BB5\u6B63\u6587\uFF1A\u8FD9\u6B21\u65B0\u589E\u9700\u8981\u7EB3\u5165\u603B\u7ED3\u7684\u5185\u5BB9\u3002",
    "",
    "\u4F60\u7684\u76EE\u6807\u4E0D\u662F\u53EA\u603B\u7ED3\u5F53\u524D\u6BB5\uFF0C\u800C\u662F\u8F93\u51FA\u4E00\u4EFD\u201C\u622A\u81F3\u5F53\u524D\u6BB5\u4E3A\u6B62\u201D\u7684\u7D2F\u8BA1\u6458\u8981\u3002",
    "\u8981\u6C42\uFF1A",
    "1. \u4F18\u5148\u4FDD\u7559\u5DF2\u6709\u7D2F\u8BA1\u6458\u8981\u4E2D\u7684\u5173\u952E\u4FE1\u606F\uFF0C\u5E76\u4E0E\u5F53\u524D\u6BB5\u7684\u65B0\u4FE1\u606F\u6574\u5408\uFF1B",
    "2. \u53BB\u91CD\u548C\u538B\u7F29\uFF0C\u907F\u514D\u91CD\u590D\u8868\u8FF0\uFF1B",
    "3. \u7528 4 \u5230 6 \u6761\u8981\u70B9\u603B\u7ED3\uFF1B",
    "4. \u6700\u540E\u4E00\u884C\u5355\u72EC\u7ED9\u51FA\u4E00\u53E5\u603B\u62EC\uFF1B",
    "5. \u4E0D\u8981\u7F16\u9020\u539F\u6587\u6CA1\u6709\u63D0\u5230\u7684\u4FE1\u606F\uFF1B",
    "",
    "\u6587\u7AE0\u6807\u9898\uFF1A{{title}}",
    "\u6587\u7AE0\u8DEF\u5F84\uFF1A{{path}}",
    "",
    "\u5DF2\u6709\u7D2F\u8BA1\u6458\u8981\uFF1A",
    "{{previous_summary}}",
    "",
    "\u5F53\u524D\u5904\u7406\u6BB5\u6B63\u6587\uFF1A",
    "{{content}}"
  ].join("\n"),
  summaryPrompt: [
    "\u8BF7\u9605\u8BFB\u4E0B\u9762\u7684\u6587\u7AE0\uFF0C\u5E76\u751F\u6210\u4E2D\u6587\u6982\u62EC\u3002",
    "\u8981\u6C42\uFF1A",
    "1. \u7528 3 \u5230 5 \u6761\u8981\u70B9\u603B\u7ED3\uFF1B",
    "2. \u6700\u540E\u4E00\u884C\u5355\u72EC\u7ED9\u51FA\u4E00\u53E5\u603B\u62EC\uFF1B",
    "3. \u4E0D\u8981\u7F16\u9020\u539F\u6587\u6CA1\u6709\u63D0\u5230\u7684\u4FE1\u606F\uFF1B",
    "",
    "\u6587\u7AE0\u6807\u9898\uFF1A{{title}}",
    "\u6587\u7AE0\u8DEF\u5F84\uFF1A{{path}}",
    "",
    "\u6587\u7AE0\u5185\u5BB9\uFF1A",
    "{{content}}"
  ].join("\n")
};
var API_KEY_SECRET_ID = "openai-summary-helper-api-key";
var MIN_CHUNK_SIZE = 1e3;
var MAX_CARRYOVER_CHARS = 4e3;
var REVIEW_DIFF_CONTEXT_LINES = 3;
var LiveGenerationModal = class extends import_obsidian.Modal {
  constructor(app, options) {
    super(app);
    this.abortController = new AbortController();
    this.answerText = "";
    this.cancelButtonEl = null;
    this.closed = false;
    this.commitButtonEl = null;
    this.copyButtonEl = null;
    this.elapsedEl = null;
    this.elapsedTimer = null;
    this.isRunning = true;
    this.statusEl = null;
    this.thinkingText = "";
    this.thinkingWrapEl = null;
    this.thinkingValueEl = null;
    this.answerValueEl = null;
    this.startedAt = Date.now();
    this.commitLabel = options.commitLabel;
    this.helperText = options.helperText;
    this.onCommit = options.onCommit;
    this.titleText = options.title;
  }
  get signal() {
    return this.abortController.signal;
  }
  isClosed() {
    return this.closed;
  }
  beginStep(message) {
    this.isRunning = true;
    this.answerText = "";
    this.thinkingText = "";
    this.updateStatus(message);
    this.renderContent();
    this.updateActions();
  }
  updateStatus(message) {
    var _a;
    (_a = this.statusEl) == null ? void 0 : _a.setText(message);
  }
  updateContent(result) {
    this.answerText = result.answer;
    this.thinkingText = result.thinking;
    this.renderContent();
    this.updateActions();
  }
  markComplete(message) {
    this.isRunning = false;
    this.updateStatus(message);
    this.updateActions();
  }
  markError(message) {
    this.isRunning = false;
    this.updateStatus(message);
    this.updateActions();
  }
  markCanceled(message) {
    this.isRunning = false;
    this.updateStatus(message);
    this.updateActions();
  }
  onOpen() {
    const { contentEl } = this;
    this.setTitle(this.titleText);
    const helper = contentEl.createEl("p", { text: this.helperText });
    helper.style.marginBottom = "0.75rem";
    helper.style.color = "var(--text-muted)";
    helper.style.lineHeight = "1.5";
    const metaEl = contentEl.createDiv();
    metaEl.style.display = "flex";
    metaEl.style.justifyContent = "space-between";
    metaEl.style.alignItems = "center";
    metaEl.style.gap = "1rem";
    metaEl.style.marginBottom = "0.75rem";
    this.statusEl = metaEl.createDiv({ text: "Preparing request..." });
    this.statusEl.style.fontWeight = "600";
    this.statusEl.style.lineHeight = "1.5";
    this.statusEl.style.flex = "1";
    this.elapsedEl = metaEl.createSpan({ text: "Elapsed 00:00" });
    this.elapsedEl.style.color = "var(--text-muted)";
    this.elapsedEl.style.whiteSpace = "nowrap";
    this.thinkingWrapEl = this.buildSection(contentEl, "Thinking");
    this.thinkingValueEl = this.thinkingWrapEl.createEl("pre");
    this.prepareTextSurface(this.thinkingValueEl, "Model reasoning will appear here if the endpoint exposes it.");
    const answerWrapEl = this.buildSection(contentEl, "Answer");
    this.answerValueEl = answerWrapEl.createEl("pre");
    this.prepareTextSurface(this.answerValueEl, "The formal answer will stream here.");
    const actionsEl = contentEl.createDiv();
    actionsEl.style.display = "flex";
    actionsEl.style.gap = "0.75rem";
    actionsEl.style.marginTop = "1rem";
    actionsEl.style.flexWrap = "wrap";
    this.copyButtonEl = actionsEl.createEl("button", { text: "Copy answer" });
    this.copyButtonEl.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(this.answerText);
        new import_obsidian.Notice("Copied answer to clipboard.");
      } catch (error) {
        console.error("Failed to copy answer", error);
        new import_obsidian.Notice("Could not copy answer to clipboard.");
      }
    });
    if (this.onCommit && this.commitLabel) {
      this.commitButtonEl = actionsEl.createEl("button", { text: this.commitLabel });
      this.commitButtonEl.addClass("mod-cta");
      this.commitButtonEl.addEventListener("click", async () => {
        var _a, _b;
        if (!this.answerText.trim()) {
          new import_obsidian.Notice("There is no formal answer to save yet.");
          return;
        }
        (_a = this.commitButtonEl) == null ? void 0 : _a.setAttr("disabled", true);
        try {
          await ((_b = this.onCommit) == null ? void 0 : _b.call(this, this.answerText.trim()));
        } catch (error) {
          console.error("Failed to commit generated answer", error);
          new import_obsidian.Notice(error instanceof Error ? error.message : "Failed to save generated answer.");
        } finally {
          this.updateActions();
        }
      });
    }
    this.cancelButtonEl = actionsEl.createEl("button", { text: "Cancel request" });
    this.cancelButtonEl.addEventListener("click", () => {
      if (this.isRunning) {
        this.updateStatus("Canceling request...");
        this.abortController.abort("Canceled by user.");
        return;
      }
      this.close();
    });
    this.renderContent();
    this.updateActions();
    this.updateElapsed();
    this.elapsedTimer = window.setInterval(() => this.updateElapsed(), 1e3);
  }
  onClose() {
    this.closed = true;
    if (this.isRunning && !this.abortController.signal.aborted) {
      this.abortController.abort("Modal closed by user.");
    }
    if (this.elapsedTimer !== null) {
      window.clearInterval(this.elapsedTimer);
      this.elapsedTimer = null;
    }
    this.contentEl.empty();
  }
  buildSection(parent, title) {
    const wrapEl = parent.createDiv();
    wrapEl.style.marginTop = "1rem";
    const titleEl = wrapEl.createEl("h4", { text: title });
    titleEl.style.margin = "0 0 0.5rem 0";
    return wrapEl;
  }
  prepareTextSurface(surface, placeholder) {
    surface.style.margin = "0";
    surface.style.padding = "0.75rem";
    surface.style.maxHeight = "16rem";
    surface.style.overflow = "auto";
    surface.style.whiteSpace = "pre-wrap";
    surface.style.wordBreak = "break-word";
    surface.style.background = "var(--background-secondary)";
    surface.style.border = "1px solid var(--background-modifier-border)";
    surface.style.borderRadius = "8px";
    surface.setText(placeholder);
  }
  renderContent() {
    if (this.thinkingWrapEl && this.thinkingValueEl) {
      const thinking = this.thinkingText.trim();
      this.thinkingWrapEl.style.display = thinking ? "block" : "none";
      if (thinking) {
        this.thinkingValueEl.setText(thinking);
      }
    }
    if (this.answerValueEl) {
      const answer = this.answerText.trim();
      this.answerValueEl.setText(answer || "The formal answer will stream here.");
    }
  }
  updateActions() {
    if (this.copyButtonEl) {
      this.copyButtonEl.toggleAttribute("disabled", !this.answerText.trim());
    }
    if (this.commitButtonEl) {
      this.commitButtonEl.toggleAttribute("disabled", this.isRunning || !this.answerText.trim());
    }
    if (this.cancelButtonEl) {
      this.cancelButtonEl.setText(this.isRunning ? "Cancel request" : "Close");
    }
  }
  updateElapsed() {
    if (!this.elapsedEl) {
      return;
    }
    const elapsedSeconds = Math.floor((Date.now() - this.startedAt) / 1e3);
    const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, "0");
    const seconds = String(elapsedSeconds % 60).padStart(2, "0");
    this.elapsedEl.setText(`Elapsed ${minutes}:${seconds}`);
  }
};
var ReviewDiffModal = class extends import_obsidian.Modal {
  constructor(app, options) {
    super(app);
    this.diffText = options.diffText;
    this.file = options.file;
    this.onApply = options.onApply;
  }
  onOpen() {
    const { contentEl } = this;
    const patches = parsePatch(this.diffText);
    const stats = this.countDiffStats(patches);
    this.setTitle(`AI review diff: ${this.file.basename}`);
    const helper = contentEl.createEl("p", {
      text: `Review the unified diff below. If you approve it, the plugin will apply these changes to "${this.file.path}".`
    });
    helper.style.marginBottom = "0.75rem";
    helper.style.color = "var(--text-muted)";
    helper.style.lineHeight = "1.5";
    const meta = contentEl.createEl("p", {
      text: `Hunks: ${stats.hunks} | Additions: ${stats.additions} | Deletions: ${stats.deletions}`
    });
    meta.style.margin = "0 0 0.75rem 0";
    meta.style.fontWeight = "600";
    const diffEl = contentEl.createDiv();
    diffEl.style.maxHeight = "28rem";
    diffEl.style.overflow = "auto";
    diffEl.style.background = "var(--background-primary)";
    diffEl.style.border = "1px solid var(--background-modifier-border)";
    diffEl.style.borderRadius = "8px";
    if (patches.length > 0) {
      this.renderStructuredDiff(diffEl, patches);
    } else {
      this.renderRawDiff(diffEl);
    }
    const actions = contentEl.createDiv();
    actions.style.display = "flex";
    actions.style.gap = "0.75rem";
    actions.style.flexWrap = "wrap";
    actions.style.marginTop = "1rem";
    const copyButton = actions.createEl("button", { text: "Copy diff" });
    copyButton.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(this.diffText);
        new import_obsidian.Notice("Copied review diff to clipboard.");
      } catch (error) {
        console.error("Failed to copy review diff", error);
        new import_obsidian.Notice("Could not copy review diff.");
      }
    });
    const applyButton = actions.createEl("button", { text: "Apply changes" });
    applyButton.addClass("mod-cta");
    applyButton.addEventListener("click", async () => {
      applyButton.toggleAttribute("disabled", true);
      try {
        await this.onApply();
        this.close();
      } catch (error) {
        console.error("Failed to apply AI review changes", error);
        new import_obsidian.Notice(error instanceof Error ? error.message : "Failed to apply AI review changes.");
        applyButton.toggleAttribute("disabled", false);
      }
    });
    const closeButton = actions.createEl("button", { text: "Close" });
    closeButton.addEventListener("click", () => this.close());
  }
  onClose() {
    this.contentEl.empty();
  }
  countDiffStats(patches) {
    let additions = 0;
    let deletions = 0;
    let hunks = 0;
    for (const patch of patches) {
      hunks += patch.hunks.length;
      for (const hunk of patch.hunks) {
        for (const line of hunk.lines) {
          if (line.startsWith("+")) {
            additions += 1;
          } else if (line.startsWith("-")) {
            deletions += 1;
          }
        }
      }
    }
    return { additions, deletions, hunks };
  }
  renderStructuredDiff(parent, patches) {
    var _a, _b;
    for (const [patchIndex, patch] of patches.entries()) {
      if (patchIndex > 0) {
        const spacer = parent.createDiv();
        spacer.style.height = "0.75rem";
        spacer.style.background = "var(--background-secondary)";
        spacer.style.borderTop = "1px solid var(--background-modifier-border)";
        spacer.style.borderBottom = "1px solid var(--background-modifier-border)";
      }
      const header = parent.createDiv({
        text: `${(_a = patch.oldFileName) != null ? _a : this.file.path} -> ${(_b = patch.newFileName) != null ? _b : this.file.path}`
      });
      header.style.padding = "0.6rem 0.75rem";
      header.style.fontFamily = "var(--font-monospace)";
      header.style.fontSize = "12px";
      header.style.fontWeight = "600";
      header.style.background = "var(--background-secondary)";
      header.style.borderBottom = "1px solid var(--background-modifier-border)";
      header.style.wordBreak = "break-all";
      for (const hunk of patch.hunks) {
        this.renderHunk(parent, hunk);
      }
    }
  }
  renderHunk(parent, hunk) {
    const hunkHeader = parent.createDiv({
      text: `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`
    });
    hunkHeader.style.padding = "0.35rem 0.75rem";
    hunkHeader.style.fontFamily = "var(--font-monospace)";
    hunkHeader.style.fontSize = "12px";
    hunkHeader.style.color = "var(--text-muted)";
    hunkHeader.style.background = "var(--background-secondary-alt)";
    hunkHeader.style.borderBottom = "1px solid var(--background-modifier-border)";
    let oldLineNumber = hunk.oldStart;
    let newLineNumber = hunk.newStart;
    for (const rawLine of hunk.lines) {
      if (rawLine.startsWith("\\")) {
        this.renderDiffRow(parent, "note", null, null, "\\", rawLine.slice(1).trimStart());
        continue;
      }
      if (rawLine.startsWith("+")) {
        this.renderDiffRow(parent, "addition", null, newLineNumber, "+", rawLine.slice(1));
        newLineNumber += 1;
        continue;
      }
      if (rawLine.startsWith("-")) {
        this.renderDiffRow(parent, "deletion", oldLineNumber, null, "-", rawLine.slice(1));
        oldLineNumber += 1;
        continue;
      }
      this.renderDiffRow(parent, "context", oldLineNumber, newLineNumber, " ", rawLine.slice(1));
      oldLineNumber += 1;
      newLineNumber += 1;
    }
  }
  renderDiffRow(parent, kind, oldLineNumber, newLineNumber, prefix, content) {
    const row = parent.createDiv();
    row.style.display = "grid";
    row.style.gridTemplateColumns = "4rem 4rem 1.5rem minmax(0, 1fr)";
    row.style.alignItems = "start";
    row.style.fontFamily = "var(--font-monospace)";
    row.style.fontSize = "12px";
    row.style.lineHeight = "1.6";
    row.style.borderBottom = "1px solid var(--background-modifier-border-hover)";
    if (kind === "addition") {
      row.style.background = "rgba(46, 160, 67, 0.14)";
    } else if (kind === "deletion") {
      row.style.background = "rgba(248, 81, 73, 0.14)";
    } else if (kind === "note") {
      row.style.background = "var(--background-secondary)";
    }
    if (kind === "note") {
      const note = row.createDiv({
        text: `${prefix}${content}`
      });
      note.style.gridColumn = "1 / -1";
      note.style.padding = "0.2rem 0.75rem";
      note.style.color = "var(--text-muted)";
      note.style.fontStyle = "italic";
      note.style.whiteSpace = "pre-wrap";
      note.style.wordBreak = "break-word";
      return;
    }
    this.renderLineNumberCell(row, oldLineNumber);
    this.renderLineNumberCell(row, newLineNumber);
    const prefixEl = row.createDiv({ text: prefix });
    prefixEl.style.padding = "0.2rem 0";
    prefixEl.style.textAlign = "center";
    prefixEl.style.color = kind === "addition" ? "#1a7f37" : kind === "deletion" ? "#cf222e" : "var(--text-faint)";
    prefixEl.style.fontWeight = "700";
    const contentEl = row.createDiv({ text: content });
    contentEl.style.padding = "0.2rem 0.75rem 0.2rem 0";
    contentEl.style.whiteSpace = "pre-wrap";
    contentEl.style.wordBreak = "break-word";
  }
  renderLineNumberCell(parent, lineNumber) {
    const cell = parent.createDiv({
      text: lineNumber === null ? "" : String(lineNumber)
    });
    cell.style.padding = "0.2rem 0.5rem";
    cell.style.textAlign = "right";
    cell.style.color = "var(--text-faint)";
    cell.style.userSelect = "none";
    cell.style.borderRight = "1px solid var(--background-modifier-border-hover)";
  }
  renderRawDiff(parent) {
    const rawEl = parent.createEl("pre");
    rawEl.setText(this.diffText);
    rawEl.style.margin = "0";
    rawEl.style.padding = "0.75rem";
    rawEl.style.whiteSpace = "pre-wrap";
    rawEl.style.wordBreak = "break-word";
    rawEl.style.background = "var(--background-secondary)";
  }
};
var OpenAISummaryHelperPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
    this.currentOperationToken = 0;
    this.statusBarEl = null;
  }
  async onload() {
    await this.loadSettings();
    try {
      this.statusBarEl = this.addStatusBarItem();
      this.setIdleStatus();
    } catch (error) {
      console.debug("Status bar is not available in this Obsidian environment.", error);
      this.statusBarEl = null;
    }
    this.addSettingTab(new OpenAISummarySettingTab(this.app, this));
    this.addCommand({
      id: "summarize-current-note",
      name: "Summarize current note",
      callback: async () => {
        await this.summarizeCurrentNote();
      }
    });
    this.addCommand({
      id: "summarize-selection",
      name: "Summarize selection",
      editorCallback: async (editor) => {
        await this.summarizeSelection(editor);
      }
    });
    this.addCommand({
      id: "generate-description-current-note",
      name: "Generate description for current note",
      callback: async () => {
        await this.generateDescriptionForCurrentNote();
      }
    });
    this.addCommand({
      id: "ai-review-current-note",
      name: "AI review current note",
      callback: async () => {
        await this.reviewCurrentNote();
      }
    });
  }
  async loadSettings() {
    var _a;
    const stored = await this.loadData();
    const legacyApiKey = typeof (stored == null ? void 0 : stored.apiKey) === "string" ? stored.apiKey : "";
    const secretApiKey = this.supportsSecureStorage() ? (_a = this.app.secretStorage.getSecret(API_KEY_SECRET_ID)) != null ? _a : "" : "";
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...stored,
      apiKey: secretApiKey || legacyApiKey
    };
  }
  async saveSettings() {
    if (this.supportsSecureStorage()) {
      this.app.secretStorage.setSecret(API_KEY_SECRET_ID, this.settings.apiKey);
      await this.saveData({
        ...this.settings,
        apiKey: ""
      });
      return;
    }
    await this.saveData(this.settings);
  }
  async testConnection() {
    if (!this.settings.apiKey.trim()) {
      new import_obsidian.Notice("Set your API key first.");
      return;
    }
    try {
      const result = await this.requestCompletion("Reply with exactly: OK");
      if (result.answer.toUpperCase() === "OK") {
        new import_obsidian.Notice("Connection test passed.");
        return;
      }
      new import_obsidian.Notice(`Connection worked, model replied: ${result.answer}`);
    } catch (error) {
      console.error("Connection test failed", error);
      new import_obsidian.Notice(this.toErrorMessage(error));
    }
  }
  async summarizeCurrentNote() {
    const context = await this.getActiveNoteContext();
    if (!context) {
      return;
    }
    const modal = new LiveGenerationModal(this.app, {
      commitLabel: "Insert at cursor",
      helperText: "This panel streams the model output as it arrives. Only the formal answer will be inserted into the editor when you click the button below.",
      onCommit: async (value) => {
        const currentView = this.app.workspace.getActiveViewOfType(import_obsidian.MarkdownView);
        const editor = currentView == null ? void 0 : currentView.editor;
        if (!editor) {
          throw new Error("Could not find an active editor to insert into.");
        }
        editor.replaceSelection(`${value}
`);
        new import_obsidian.Notice("Summary inserted at cursor.");
      },
      title: `Summary task: ${context.file.basename}`
    });
    modal.open();
    const progress = this.beginOperation(`Generating summary for "${context.file.basename}"...`);
    const bridge = this.createBridge(modal, progress);
    try {
      await this.generateSummary(context.file, context.content, bridge);
      const message = `Summary ready for "${context.file.basename}". Review the live panel and click "Insert at cursor" if you want to use the final answer.`;
      progress.complete(message);
      if (!modal.isClosed()) {
        modal.markComplete(message);
      }
    } catch (error) {
      console.error("Failed to summarize current note", error);
      const message = this.isAbortError(error) ? `Summary canceled for "${context.file.basename}".` : `Summary failed for "${context.file.basename}": ${this.toErrorMessage(error)}`;
      progress.fail(message);
      if (!modal.isClosed()) {
        if (this.isAbortError(error)) {
          modal.markCanceled(message);
        } else {
          modal.markError(message);
        }
      }
    }
  }
  async summarizeSelection(editor) {
    const selection = editor.getSelection().trim();
    if (!selection) {
      new import_obsidian.Notice("Select some text first.");
      return;
    }
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      new import_obsidian.Notice("Open a Markdown note first.");
      return;
    }
    const insertPosition = editor.getCursor("to");
    const modal = new LiveGenerationModal(this.app, {
      commitLabel: "Insert below selection",
      helperText: "This panel streams the model output as it arrives. Only the formal answer will be inserted after the selected text when you click the button below.",
      onCommit: async (value) => {
        editor.replaceRange(`

${value}
`, insertPosition);
        new import_obsidian.Notice("Summary inserted below selection.");
      },
      title: `Selection summary task: ${activeFile.basename}`
    });
    modal.open();
    const progress = this.beginOperation(`Generating selection summary for "${activeFile.basename}"...`);
    const bridge = this.createBridge(modal, progress);
    try {
      await this.generateSummary(activeFile, selection, bridge);
      const message = `Selection summary ready for "${activeFile.basename}". Review the live panel and click "Insert below selection" if you want to use the final answer.`;
      progress.complete(message);
      if (!modal.isClosed()) {
        modal.markComplete(message);
      }
    } catch (error) {
      console.error("Failed to summarize selection", error);
      const message = this.isAbortError(error) ? `Selection summary canceled for "${activeFile.basename}".` : `Selection summary failed for "${activeFile.basename}": ${this.toErrorMessage(error)}`;
      progress.fail(message);
      if (!modal.isClosed()) {
        if (this.isAbortError(error)) {
          modal.markCanceled(message);
        } else {
          modal.markError(message);
        }
      }
    }
  }
  async generateDescriptionForCurrentNote() {
    const context = await this.getActiveNoteContext();
    if (!context) {
      return;
    }
    const modal = new LiveGenerationModal(this.app, {
      commitLabel: "Save to frontmatter description",
      helperText: `This panel streams the model output as it arrives. Only the formal answer will be saved into the YAML frontmatter field "description" of "${context.file.path}" when you click the button below.`,
      onCommit: async (value) => {
        const existing = this.getExistingDescription(context.file);
        if (existing && !this.settings.overwriteDescription) {
          throw new Error("This note already has a description. Enable overwrite in settings to replace it.");
        }
        await this.app.fileManager.processFrontMatter(context.file, (frontmatter) => {
          frontmatter.description = value.trim();
        });
        new import_obsidian.Notice(`Saved to frontmatter.description in "${context.file.path}".`);
      },
      title: `Description task: ${context.file.basename}`
    });
    modal.open();
    const progress = this.beginOperation(`Generating description for "${context.file.basename}"...`);
    const bridge = this.createBridge(modal, progress);
    try {
      await this.requestCompletion(
        this.renderPrompt(this.settings.descriptionPrompt, context.file, this.limitInput(context.content)),
        bridge,
        `Generating description for "${context.file.basename}"...`
      );
      const message = `Description ready for "${context.file.basename}". Review the live panel and click "Save to frontmatter description" if you want to write the final answer.`;
      progress.complete(message);
      if (!modal.isClosed()) {
        modal.markComplete(message);
      }
    } catch (error) {
      console.error("Failed to generate description", error);
      const message = this.isAbortError(error) ? `Description canceled for "${context.file.basename}".` : `Description failed for "${context.file.basename}": ${this.toErrorMessage(error)}`;
      progress.fail(message);
      if (!modal.isClosed()) {
        if (this.isAbortError(error)) {
          modal.markCanceled(message);
        } else {
          modal.markError(message);
        }
      }
    }
  }
  async reviewCurrentNote() {
    const context = await this.getActiveNoteContext(false);
    if (!context) {
      return;
    }
    if (context.content.length > this.settings.maxInputChars) {
      new import_obsidian.Notice(
        `AI review currently requires the full note in one request. Current note length is ${context.content.length} characters, limit is ${this.settings.maxInputChars}.`,
        8e3
      );
      return;
    }
    const originalContent = context.content;
    const modal = new LiveGenerationModal(this.app, {
      helperText: "This panel streams the AI's revised full note. When generation finishes, the plugin will open a unified diff preview so you can approve the exact line changes before anything is applied.",
      title: `AI review task: ${context.file.basename}`
    });
    modal.open();
    const progress = this.beginOperation(`Reviewing "${context.file.basename}" with AI...`);
    const bridge = this.createBridge(modal, progress);
    try {
      const result = await this.requestCompletion(
        this.renderPrompt(this.settings.reviewPrompt, context.file, originalContent),
        bridge,
        `Reviewing "${context.file.basename}" and drafting a revised note...`
      );
      const revisedContent = this.extractReviewContent(result.answer);
      const diffText = this.createReviewDiff(context.file, originalContent, revisedContent);
      if (!this.hasMeaningfulDiff(diffText)) {
        const message2 = `AI review finished for "${context.file.basename}". No wording fixes were suggested.`;
        progress.complete(message2);
        if (!modal.isClosed()) {
          modal.updateContent({
            answer: "No wording fixes were suggested for the current note.",
            rawAnswer: result.rawAnswer,
            thinking: result.thinking
          });
          modal.markComplete(message2);
        }
        return;
      }
      const message = `AI review finished for "${context.file.basename}". Opening diff preview...`;
      progress.complete(message);
      if (!modal.isClosed()) {
        modal.markComplete(message);
        modal.close();
      }
      new ReviewDiffModal(this.app, {
        diffText,
        file: context.file,
        onApply: async () => {
          const latestContent = await this.app.vault.read(context.file);
          if (latestContent !== originalContent) {
            throw new Error("The note changed after the review was generated. Please run AI review again.");
          }
          const patched = applyPatch(latestContent, diffText);
          if (patched === false) {
            throw new Error("Could not apply the generated diff to the current note.");
          }
          await this.app.vault.modify(context.file, patched);
          new import_obsidian.Notice(`Applied AI review changes to "${context.file.path}".`);
        }
      }).open();
    } catch (error) {
      console.error("Failed to review current note", error);
      const message = this.isAbortError(error) ? `AI review canceled for "${context.file.basename}".` : `AI review failed for "${context.file.basename}": ${this.toErrorMessage(error)}`;
      progress.fail(message);
      if (!modal.isClosed()) {
        if (this.isAbortError(error)) {
          modal.markCanceled(message);
        } else {
          modal.markError(message);
        }
      }
    }
  }
  getExistingDescription(file) {
    const cache = this.app.metadataCache.getFileCache(file);
    const frontmatter = cache == null ? void 0 : cache.frontmatter;
    const description = frontmatter == null ? void 0 : frontmatter.description;
    return typeof description === "string" ? description : null;
  }
  async generateSummary(file, content, progress) {
    const normalizedContent = content.trim();
    if (!normalizedContent) {
      throw new Error("There is no content to summarize.");
    }
    if (normalizedContent.length <= this.settings.maxInputChars) {
      return await this.requestCompletion(
        this.renderPrompt(this.settings.summaryPrompt, file, normalizedContent),
        progress,
        `Generating summary for "${file.basename}" in a single request...`
      );
    }
    const chunks = this.chunkContentByParagraphs(normalizedContent, this.settings.maxInputChars);
    if (chunks.length <= 1) {
      return await this.requestCompletion(
        this.renderPrompt(this.settings.summaryPrompt, file, normalizedContent),
        progress,
        `Generating summary for "${file.basename}" in a single request...`
      );
    }
    let cumulativeSummary = "";
    let lastResult = {
      answer: "",
      rawAnswer: "",
      thinking: ""
    };
    for (const [index, chunk] of chunks.entries()) {
      console.info(`OpenAI Summary Helper: summarizing chunk ${index + 1}/${chunks.length}`);
      lastResult = await this.requestCompletion(
        this.renderPrompt(this.settings.rollingSummaryPrompt, file, chunk, {
          chunk_index: String(index + 1),
          chunk_total: String(chunks.length),
          previous_summary: cumulativeSummary ? this.limitCarryoverSummary(cumulativeSummary) : "\uFF08\u65E0\uFF0C\u8FD9\u662F\u7B2C\u4E00\u6BB5\uFF0C\u8BF7\u76F4\u63A5\u4ECE\u5F53\u524D\u6BB5\u5F00\u59CB\u5EFA\u7ACB\u7D2F\u8BA1\u6458\u8981\u3002\uFF09"
        }),
        progress,
        `Summarizing "${file.basename}" chunk ${index + 1}/${chunks.length}...`
      );
      cumulativeSummary = lastResult.answer;
    }
    return {
      ...lastResult,
      answer: cumulativeSummary,
      rawAnswer: cumulativeSummary
    };
  }
  async getActiveNoteContext(stripFrontmatter = true) {
    const view = this.app.workspace.getActiveViewOfType(import_obsidian.MarkdownView);
    const file = view == null ? void 0 : view.file;
    if (!file) {
      new import_obsidian.Notice("Open a Markdown note first.");
      return null;
    }
    const raw = await this.app.vault.read(file);
    const content = stripFrontmatter ? this.stripFrontmatter(raw).trim() : raw;
    if (!content.trim()) {
      new import_obsidian.Notice("The current note is empty.");
      return null;
    }
    return { content, file };
  }
  stripFrontmatter(content) {
    if (!content.startsWith("---\n")) {
      return content;
    }
    const closingIndex = content.indexOf("\n---\n", 4);
    if (closingIndex === -1) {
      return content;
    }
    return content.slice(closingIndex + 5);
  }
  chunkContentByParagraphs(content, targetChars) {
    const safeTargetChars = Math.max(MIN_CHUNK_SIZE, targetChars);
    const blocks = this.extractParagraphBlocks(content);
    const chunks = [];
    let currentChunkParts = [];
    let currentChunkLength = 0;
    for (const block of blocks) {
      const blockParts = block.length > safeTargetChars ? this.splitOversizedBlock(block, safeTargetChars) : [block];
      for (const part of blockParts) {
        const separatorLength = currentChunkParts.length > 0 ? 2 : 0;
        const nextLength = currentChunkLength + separatorLength + part.length;
        if (currentChunkParts.length > 0 && nextLength > safeTargetChars) {
          chunks.push(currentChunkParts.join("\n\n").trim());
          currentChunkParts = [part];
          currentChunkLength = part.length;
          continue;
        }
        currentChunkParts.push(part);
        currentChunkLength = nextLength;
      }
    }
    if (currentChunkParts.length > 0) {
      chunks.push(currentChunkParts.join("\n\n").trim());
    }
    return chunks.filter((chunk) => chunk.length > 0);
  }
  extractParagraphBlocks(content) {
    const lines = content.split(/\r?\n/);
    const blocks = [];
    let currentBlock = [];
    let inFenceBlock = false;
    let fenceMarker = "";
    const flushCurrentBlock = () => {
      const block = currentBlock.join("\n").trim();
      if (block) {
        blocks.push(block);
      }
      currentBlock = [];
    };
    for (const line of lines) {
      const trimmedLine = line.trim();
      const fenceMatch = trimmedLine.match(/^(```+|~~~+)/);
      if (!inFenceBlock && trimmedLine === "") {
        flushCurrentBlock();
        continue;
      }
      currentBlock.push(line);
      if (!fenceMatch) {
        continue;
      }
      const marker = fenceMatch[1];
      if (!inFenceBlock) {
        inFenceBlock = true;
        fenceMarker = marker[0];
        continue;
      }
      if (marker[0] === fenceMarker) {
        inFenceBlock = false;
        fenceMarker = "";
      }
    }
    flushCurrentBlock();
    return blocks.length > 0 ? blocks : [content.trim()];
  }
  splitOversizedBlock(block, targetChars) {
    const parts = [];
    let remaining = block.trim();
    while (remaining.length > targetChars) {
      const splitIndex = this.findSplitIndex(remaining, targetChars);
      parts.push(remaining.slice(0, splitIndex).trim());
      remaining = remaining.slice(splitIndex).trim();
    }
    if (remaining) {
      parts.push(remaining);
    }
    return parts;
  }
  findSplitIndex(content, targetChars) {
    const minIndex = Math.max(Math.floor(targetChars * 0.7), MIN_CHUNK_SIZE);
    const maxIndex = Math.min(content.length, targetChars + Math.max(600, Math.floor(targetChars * 0.15)));
    const naturalBreaks = ["\n\n", "\n", "\u3002", "\uFF01", "\uFF1F", "\uFF1B", ". ", "! ", "? ", "; "];
    for (const marker of naturalBreaks) {
      const forwardIndex = content.indexOf(marker, targetChars);
      if (forwardIndex !== -1 && forwardIndex <= maxIndex) {
        return forwardIndex + marker.length;
      }
    }
    for (const marker of naturalBreaks) {
      const backwardIndex = content.lastIndexOf(marker, targetChars);
      if (backwardIndex !== -1 && backwardIndex >= minIndex) {
        return backwardIndex + marker.length;
      }
    }
    return targetChars;
  }
  limitCarryoverSummary(summary) {
    const dynamicLimit = Math.min(MAX_CARRYOVER_CHARS, Math.max(800, Math.floor(this.settings.maxInputChars / 3)));
    if (summary.length <= dynamicLimit) {
      return summary;
    }
    return `${summary.slice(0, dynamicLimit).trim()}

[\u7D2F\u8BA1\u6458\u8981\u5DF2\u622A\u65AD\uFF0C\u4EE5\u63A7\u5236\u4E0A\u4E0B\u6587\u957F\u5EA6]`;
  }
  limitInput(content) {
    const trimmed = content.trim();
    if (trimmed.length <= this.settings.maxInputChars) {
      return trimmed;
    }
    return `${trimmed.slice(0, this.settings.maxInputChars)}

[Content truncated for summary]`;
  }
  extractReviewContent(answer) {
    const normalized = answer.replace(/\r\n/g, "\n").trim();
    const fencedBlock = normalized.match(/^```(?:markdown|md)?\n([\s\S]*?)\n```$/i);
    if (fencedBlock) {
      return fencedBlock[1];
    }
    const genericFence = [...normalized.matchAll(/```(?:markdown|md)?\n([\s\S]*?)\n```/gi)];
    if (genericFence.length === 1) {
      return genericFence[0][1];
    }
    return normalized;
  }
  createReviewDiff(file, originalContent, revisedContent) {
    return createTwoFilesPatch(
      file.path,
      file.path,
      originalContent,
      revisedContent,
      "original",
      "reviewed",
      {
        context: REVIEW_DIFF_CONTEXT_LINES
      }
    );
  }
  hasMeaningfulDiff(diffText) {
    return diffText.split("\n").some((line) => line.startsWith("+") && !line.startsWith("+++") || line.startsWith("-") && !line.startsWith("---"));
  }
  renderPrompt(template, file, content, extraTokens = {}) {
    const tokens = {
      title: file.basename,
      path: file.path,
      content,
      ...extraTokens
    };
    let rendered = template;
    for (const [token, value] of Object.entries(tokens)) {
      rendered = this.replaceToken(rendered, `{{${token}}}`, value);
    }
    return rendered;
  }
  replaceToken(template, token, value) {
    return template.split(token).join(value);
  }
  async requestCompletion(prompt, progress, statusMessage = "Generating response...") {
    var _a;
    const baseUrl = this.settings.baseUrl.trim().replace(/\/$/, "");
    const apiKey = this.settings.apiKey.trim();
    const model = this.settings.model.trim();
    if (!baseUrl) {
      throw new Error("Set the Base URL in plugin settings.");
    }
    if (!apiKey) {
      throw new Error("Set the API key in plugin settings.");
    }
    if (!model) {
      throw new Error("Set the model name in plugin settings.");
    }
    const payload = {
      model,
      messages: [
        {
          role: "system",
          content: "You are a precise writing assistant. Follow the user request faithfully and avoid adding facts not grounded in the provided note."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2
    };
    progress == null ? void 0 : progress.beginStep(statusMessage);
    if (import_obsidian.Platform.isDesktopApp && typeof require === "function") {
      return await this.streamChatCompletion(`${baseUrl}/chat/completions`, apiKey, payload, progress, statusMessage);
    }
    progress == null ? void 0 : progress.updateStatus(`${statusMessage} Streaming is not available here, waiting for the full response...`);
    const response = await (0, import_obsidian.requestUrl)({
      url: `${baseUrl}/chat/completions`,
      method: "POST",
      contentType: "application/json",
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });
    if (response.status < 200 || response.status >= 300) {
      const apiMessage = (_a = this.extractApiError(response.json)) != null ? _a : response.text;
      throw new Error(`API request failed (${response.status}): ${apiMessage}`);
    }
    const result = this.extractCompletionResult(response.json);
    if (!result.answer) {
      throw new Error("The API returned an empty response.");
    }
    progress == null ? void 0 : progress.updateContent(result);
    return result;
  }
  extractApiError(payload) {
    if (!payload || typeof payload !== "object") {
      return null;
    }
    const error = payload.error;
    if (error && typeof error.message === "string" && error.message.trim()) {
      return error.message;
    }
    return null;
  }
  async streamChatCompletion(urlString, apiKey, payload, progress, statusMessage = "Generating response...") {
    const url = new URL(urlString);
    const transport = url.protocol === "https:" ? require("node:https") : require("node:http");
    return await new Promise((resolve, reject) => {
      let settled = false;
      let rawAnswer = "";
      let rawThinking = "";
      let buffer = "";
      let sawStreamEvent = false;
      const finish = (handler) => {
        if (settled) {
          return;
        }
        settled = true;
        handler();
      };
      const applyEventBlock = (rawEvent) => {
        const data = rawEvent.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart()).join("\n");
        if (!data || data === "[DONE]") {
          return;
        }
        sawStreamEvent = true;
        const eventPayload = JSON.parse(data);
        const delta = this.extractCompletionDelta(eventPayload);
        rawAnswer += delta.answer;
        rawThinking += delta.thinking;
        const liveResult = this.normalizeCompletionResult(rawAnswer, rawThinking);
        progress == null ? void 0 : progress.updateContent(liveResult);
        progress == null ? void 0 : progress.updateStatus(statusMessage);
      };
      const request = transport.request(
        {
          hostname: url.hostname,
          headers: {
            Accept: "text/event-stream",
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          method: "POST",
          path: `${url.pathname}${url.search}`,
          port: url.port || void 0,
          protocol: url.protocol
        },
        (response) => {
          var _a;
          const statusCode = (_a = response.statusCode) != null ? _a : 0;
          response.setEncoding("utf8");
          if (statusCode < 200 || statusCode >= 300) {
            let errorBuffer = "";
            response.on("data", (chunk) => {
              errorBuffer += String(chunk);
            });
            response.on("end", () => {
              finish(() => {
                var _a2;
                reject(
                  new Error(
                    `API request failed (${statusCode}): ${(_a2 = this.extractApiErrorFromText(errorBuffer)) != null ? _a2 : "Unknown error"}`
                  )
                );
              });
            });
            return;
          }
          progress == null ? void 0 : progress.updateStatus(`${statusMessage} Connected. Waiting for tokens...`);
          response.on("data", (chunk) => {
            buffer += String(chunk);
            buffer = buffer.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
            let separatorIndex = buffer.indexOf("\n\n");
            while (separatorIndex !== -1) {
              const rawEvent = buffer.slice(0, separatorIndex).trim();
              buffer = buffer.slice(separatorIndex + 2);
              separatorIndex = buffer.indexOf("\n\n");
              if (!rawEvent) {
                continue;
              }
              try {
                applyEventBlock(rawEvent);
              } catch (error) {
                finish(() => {
                  reject(
                    new Error(
                      error instanceof Error ? `Could not parse streaming response: ${error.message}` : "Could not parse streaming response."
                    )
                  );
                });
                return;
              }
            }
          });
          response.on("end", () => {
            finish(() => {
              const remaining = buffer.trim();
              if (remaining.startsWith("data:")) {
                try {
                  applyEventBlock(remaining);
                } catch (error) {
                  reject(
                    new Error(
                      error instanceof Error ? `Could not parse trailing streaming response: ${error.message}` : "Could not parse trailing streaming response."
                    )
                  );
                  return;
                }
              }
              if (remaining && !sawStreamEvent) {
                try {
                  const payload2 = JSON.parse(remaining);
                  const result2 = this.extractCompletionResult(payload2);
                  progress == null ? void 0 : progress.updateContent(result2);
                  resolve(result2);
                  return;
                } catch (error) {
                  reject(
                    new Error(
                      error instanceof Error ? `Could not parse response body: ${error.message}` : "Could not parse response body."
                    )
                  );
                  return;
                }
              }
              const result = this.normalizeCompletionResult(rawAnswer, rawThinking);
              if (!result.answer) {
                reject(new Error("The API returned an empty formal answer."));
                return;
              }
              progress == null ? void 0 : progress.updateContent(result);
              resolve(result);
            });
          });
        }
      );
      request.on("error", (error) => {
        finish(() => {
          reject(error);
        });
      });
      if (progress == null ? void 0 : progress.signal.aborted) {
        request.destroy(new Error("Request canceled."));
        return;
      }
      progress == null ? void 0 : progress.signal.addEventListener(
        "abort",
        () => {
          request.destroy(new Error("Request canceled."));
        },
        { once: true }
      );
      request.write(JSON.stringify({ ...payload, stream: true }));
      request.end();
    });
  }
  extractCompletionDelta(payload) {
    var _a, _b;
    if (!payload || typeof payload !== "object") {
      return { answer: "", thinking: "" };
    }
    const choice = (_a = payload.choices) == null ? void 0 : _a[0];
    if (!choice || typeof choice !== "object") {
      return { answer: "", thinking: "" };
    }
    const delta = (_b = choice.delta) != null ? _b : choice.message;
    return this.extractSegments(delta);
  }
  extractCompletionResult(payload) {
    var _a, _b;
    if (!payload || typeof payload !== "object") {
      return this.normalizeCompletionResult("", "");
    }
    const choice = (_a = payload.choices) == null ? void 0 : _a[0];
    if (choice && typeof choice === "object") {
      const node = (_b = choice.message) != null ? _b : choice.delta;
      const segments = this.extractSegments(node);
      return this.normalizeCompletionResult(segments.answer, segments.thinking);
    }
    return this.normalizeCompletionResult("", "");
  }
  extractSegments(node) {
    if (!node || typeof node !== "object") {
      return { answer: "", thinking: "" };
    }
    const record = node;
    const contentSegments = this.extractSegmentsFromContent(record.content);
    let answer = contentSegments.answer;
    let thinking = contentSegments.thinking;
    thinking += this.extractTextValue(record.reasoning_content);
    thinking += this.extractTextValue(record.reasoning);
    thinking += this.extractTextValue(record.thinking);
    if (!record.content && typeof record.text === "string") {
      answer += record.text;
    }
    return { answer, thinking };
  }
  extractSegmentsFromContent(content) {
    if (typeof content === "string") {
      return { answer: content, thinking: "" };
    }
    if (Array.isArray(content)) {
      return content.reduce(
        (accumulator, item) => {
          const next = this.extractSegmentsFromContent(item);
          return {
            answer: accumulator.answer + next.answer,
            thinking: accumulator.thinking + next.thinking
          };
        },
        { answer: "", thinking: "" }
      );
    }
    if (!content || typeof content !== "object") {
      return { answer: "", thinking: "" };
    }
    const record = content;
    const type = typeof record.type === "string" ? record.type.toLowerCase() : "";
    const text = this.extractTextValue(record.text) || this.extractTextValue(record.content);
    const reasoning = this.extractTextValue(record.reasoning_content) || this.extractTextValue(record.reasoning);
    if (type.includes("reason") || type.includes("think")) {
      return {
        answer: "",
        thinking: text || reasoning
      };
    }
    return {
      answer: text,
      thinking: reasoning
    };
  }
  extractTextValue(value) {
    if (typeof value === "string") {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.extractTextValue(item)).join("");
    }
    if (!value || typeof value !== "object") {
      return "";
    }
    const record = value;
    if (typeof record.text === "string") {
      return record.text;
    }
    if (typeof record.content === "string") {
      return record.content;
    }
    return "";
  }
  normalizeCompletionResult(rawAnswer, rawThinking) {
    const split = this.splitThinkContent(rawAnswer);
    return {
      answer: split.answer.trim(),
      rawAnswer: rawAnswer.trim(),
      thinking: this.mergeThinking(rawThinking, split.thinking).trim()
    };
  }
  splitThinkContent(text) {
    if (!text.includes("<think>")) {
      return {
        answer: text,
        thinking: ""
      };
    }
    let answer = "";
    let cursor = 0;
    const thinkingParts = [];
    while (cursor < text.length) {
      const openIndex = text.indexOf("<think>", cursor);
      if (openIndex === -1) {
        answer += text.slice(cursor);
        break;
      }
      answer += text.slice(cursor, openIndex);
      const closeIndex = text.indexOf("</think>", openIndex + 7);
      if (closeIndex === -1) {
        thinkingParts.push(text.slice(openIndex + 7));
        break;
      }
      thinkingParts.push(text.slice(openIndex + 7, closeIndex));
      cursor = closeIndex + 8;
    }
    return {
      answer: answer.replace(/<\/?think>/g, ""),
      thinking: thinkingParts.join("\n\n")
    };
  }
  mergeThinking(primary, secondary) {
    const normalizedPrimary = primary.trim();
    const normalizedSecondary = secondary.trim();
    if (!normalizedPrimary) {
      return normalizedSecondary;
    }
    if (!normalizedSecondary) {
      return normalizedPrimary;
    }
    if (normalizedPrimary.includes(normalizedSecondary)) {
      return normalizedPrimary;
    }
    if (normalizedSecondary.includes(normalizedPrimary)) {
      return normalizedSecondary;
    }
    return `${normalizedPrimary}

${normalizedSecondary}`;
  }
  extractApiErrorFromText(text) {
    var _a;
    const trimmed = text.trim();
    if (!trimmed) {
      return null;
    }
    try {
      return (_a = this.extractApiError(JSON.parse(trimmed))) != null ? _a : trimmed;
    } catch (e) {
      return trimmed;
    }
  }
  toErrorMessage(error) {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }
    return "Something went wrong. Check the console for details.";
  }
  createBridge(modal, operation) {
    return {
      beginStep: (message) => {
        operation.update(message);
        if (!modal.isClosed()) {
          modal.beginStep(message);
        }
      },
      signal: modal.signal,
      updateContent: (result) => {
        if (!modal.isClosed()) {
          modal.updateContent(result);
        }
      },
      updateStatus: (message) => {
        operation.update(message);
        if (!modal.isClosed()) {
          modal.updateStatus(message);
        }
      }
    };
  }
  isAbortError(error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return true;
    }
    if (error instanceof Error) {
      return /abort|cancel/i.test(error.message);
    }
    return false;
  }
  beginOperation(initialMessage) {
    const token = ++this.currentOperationToken;
    const notice = new import_obsidian.Notice(initialMessage, 0);
    this.setOperationMessage(token, initialMessage);
    return {
      update: (message) => {
        notice.setMessage(message);
        this.setOperationMessage(token, message);
      },
      complete: (message) => {
        notice.setMessage(message);
        this.setOperationMessage(token, message);
        window.setTimeout(() => {
          notice.hide();
          this.clearOperationMessage(token);
        }, 5e3);
      },
      fail: (message) => {
        notice.setMessage(message);
        this.setOperationMessage(token, message);
        window.setTimeout(() => {
          notice.hide();
          this.clearOperationMessage(token);
        }, 8e3);
      }
    };
  }
  setOperationMessage(token, message) {
    if (token !== this.currentOperationToken || !this.statusBarEl) {
      return;
    }
    this.statusBarEl.setText(message);
  }
  clearOperationMessage(token) {
    if (token !== this.currentOperationToken) {
      return;
    }
    this.setIdleStatus();
  }
  setIdleStatus() {
    var _a;
    (_a = this.statusBarEl) == null ? void 0 : _a.setText("Obsidian AI Helper: idle");
  }
  supportsSecureStorage() {
    return (0, import_obsidian.requireApiVersion)("1.11.4");
  }
};
var OpenAISummarySettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Obsidian AI Helper" });
    new import_obsidian.Setting(containerEl).setName("Base URL").setDesc("Use a base URL that already includes /v1, for example https://api.openai.com/v1").addText((text) => {
      text.setPlaceholder("https://api.openai.com/v1").setValue(this.plugin.settings.baseUrl).onChange(async (value) => {
        this.plugin.settings.baseUrl = value.trim();
        await this.plugin.saveSettings();
      });
      text.inputEl.style.width = "24rem";
    });
    new import_obsidian.Setting(containerEl).setName("API key").setDesc(
      this.plugin.supportsSecureStorage() ? "Stored in Obsidian secret storage." : "Stored in this plugin's data.json because this Obsidian build does not support secret storage."
    ).addText((text) => {
      text.setPlaceholder("sk-...").setValue(this.plugin.settings.apiKey).onChange(async (value) => {
        this.plugin.settings.apiKey = value.trim();
        await this.plugin.saveSettings();
      });
      text.inputEl.type = "password";
      text.inputEl.style.width = "24rem";
    });
    new import_obsidian.Setting(containerEl).setName("Model").setDesc("Any model name supported by your OpenAI-compatible endpoint.").addText((text) => {
      text.setPlaceholder("gpt-4.1-mini").setValue(this.plugin.settings.model).onChange(async (value) => {
        this.plugin.settings.model = value.trim();
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian.Setting(containerEl).setName("Summary chunk target characters").setDesc(
      "Approximate character target for a single summary chunk. Long notes are split near natural paragraph boundaries around this size; the description command still truncates at this limit."
    ).addText((text) => {
      text.setPlaceholder("24000").setValue(String(this.plugin.settings.maxInputChars)).onChange(async (value) => {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isFinite(parsed) || parsed < 1e3) {
          return;
        }
        this.plugin.settings.maxInputChars = parsed;
        await this.plugin.saveSettings();
      });
      text.inputEl.type = "number";
    });
    new import_obsidian.Setting(containerEl).setName("Overwrite existing description").setDesc("Allow the Generate description command to replace an existing frontmatter description.").addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.overwriteDescription).onChange(async (value) => {
        this.plugin.settings.overwriteDescription = value;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian.Setting(containerEl).setName("Summary prompt template").setDesc("Available placeholders: {{title}}, {{path}}, {{content}}").addTextArea((textArea) => {
      textArea.setValue(this.plugin.settings.summaryPrompt).onChange(async (value) => {
        this.plugin.settings.summaryPrompt = value;
        await this.plugin.saveSettings();
      });
      textArea.inputEl.rows = 10;
      textArea.inputEl.style.width = "100%";
    });
    new import_obsidian.Setting(containerEl).setName("Rolling summary prompt template").setDesc(
      "Available placeholders: {{title}}, {{path}}, {{content}}, {{chunk_index}}, {{chunk_total}}, {{previous_summary}}"
    ).addTextArea((textArea) => {
      textArea.setValue(this.plugin.settings.rollingSummaryPrompt).onChange(async (value) => {
        this.plugin.settings.rollingSummaryPrompt = value;
        await this.plugin.saveSettings();
      });
      textArea.inputEl.rows = 12;
      textArea.inputEl.style.width = "100%";
    });
    new import_obsidian.Setting(containerEl).setName("Description prompt template").setDesc("Available placeholders: {{title}}, {{path}}, {{content}}").addTextArea((textArea) => {
      textArea.setValue(this.plugin.settings.descriptionPrompt).onChange(async (value) => {
        this.plugin.settings.descriptionPrompt = value;
        await this.plugin.saveSettings();
      });
      textArea.inputEl.rows = 10;
      textArea.inputEl.style.width = "100%";
    });
    new import_obsidian.Setting(containerEl).setName("AI review prompt template").setDesc("Available placeholders: {{title}}, {{path}}, {{content}}").addTextArea((textArea) => {
      textArea.setValue(this.plugin.settings.reviewPrompt).onChange(async (value) => {
        this.plugin.settings.reviewPrompt = value;
        await this.plugin.saveSettings();
      });
      textArea.inputEl.rows = 12;
      textArea.inputEl.style.width = "100%";
    });
    new import_obsidian.Setting(containerEl).setName("Test connection").setDesc("Send a lightweight request to confirm your endpoint, API key, and model.").addButton((button) => {
      button.setButtonText("Test").setCta().onClick(async () => {
        await this.plugin.testConnection();
      });
    });
  }
};
