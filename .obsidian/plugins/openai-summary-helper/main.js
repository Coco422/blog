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
  async getActiveNoteContext() {
    const view = this.app.workspace.getActiveViewOfType(import_obsidian.MarkdownView);
    const file = view == null ? void 0 : view.file;
    if (!file) {
      new import_obsidian.Notice("Open a Markdown note first.");
      return null;
    }
    const raw = await this.app.vault.read(file);
    const content = this.stripFrontmatter(raw).trim();
    if (!content) {
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
    (_a = this.statusBarEl) == null ? void 0 : _a.setText("OpenAI Summary Helper: idle");
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
    containerEl.createEl("h2", { text: "OpenAI Summary Helper" });
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
    new import_obsidian.Setting(containerEl).setName("Test connection").setDesc("Send a lightweight request to confirm your endpoint, API key, and model.").addButton((button) => {
      button.setButtonText("Test").setCta().onClick(async () => {
        await this.plugin.testConnection();
      });
    });
  }
};
