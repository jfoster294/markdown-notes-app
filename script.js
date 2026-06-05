/*
  ============================================================
  PAPERTRAIL JOURNAL - SCRIPT.JS
  ============================================================

  This file controls the FUNCTIONALITY of the app.

  WHAT THIS FILE DOES:
  - Saves journal entries to localStorage
  - Loads saved journal entries
  - Opens the most recent saved page when the app starts
  - Opens a blank page for first-time users
  - Updates the live preview while typing
  - Tracks word count and character count
  - Handles memory attachments
  - Lets the user delete entries
  - Lets the user search saved entries
  - Switches between Journal View and Compass View
  - Generates guided journal pages from Compass prompts
  - Makes the mini toolbar buttons insert simple markdown

  IMPORTANT:
  This file is built for the NEW HTML structure where Compass is a
  separate screen, not a right-side panel.
*/

/* ============================================================
   LOCAL STORAGE SETTINGS
   ============================================================ */

/*
  This key is the name used in the browser's localStorage.

  Keeping the same V4 key helps protect your existing saved journal
  entries from the previous version.
*/
const ENTRY_STORAGE_KEY = "paperTrailJournalEntriesV4";

/*
  Media is saved as base64 inside localStorage.

  Browsers do not give unlimited localStorage, so large media can break saving.
  2.5 MB is a safer limit.
*/
const MAX_MEDIA_FILE_SIZE = 2.5 * 1024 * 1024;

/* ============================================================
   DOM ELEMENTS
   ============================================================ */

/*
  These connect JavaScript to the HTML elements.

  If an ID changes in index.html, it must also be changed here.
*/

const journalView = document.getElementById("journalView");
const compassView = document.getElementById("compassView");

const newEntryButton = document.getElementById("newEntryButton");
const newEntryPanelButton = document.getElementById("newEntryPanelButton");
const saveEntryButton = document.getElementById("saveEntryButton");

const compassButton = document.getElementById("compassButton");
const entriesButton = document.getElementById("entriesButton");
const backToJournalButton = document.getElementById("backToJournalButton");
const searchFocusButton = document.getElementById("searchFocusButton");

const entryCount = document.getElementById("entryCount");
const searchInput = document.getElementById("searchInput");
const entryList = document.getElementById("entryList");

const entryForm = document.getElementById("entryForm");
const titleInput = document.getElementById("titleInput");
const dateInput = document.getElementById("dateInput");
const tagsInput = document.getElementById("tagsInput");
const contentInput = document.getElementById("contentInput");

const mediaFileInput = document.getElementById("mediaFileInput");
const mediaList = document.getElementById("mediaList");
const previewMediaList = document.getElementById("previewMediaList");

const previewDate = document.getElementById("previewDate");
const previewTitle = document.getElementById("previewTitle");
const previewTags = document.getElementById("previewTags");
const previewContent = document.getElementById("previewContent");

const wordCount = document.getElementById("wordCount");
const charCount = document.getElementById("charCount");
const lastSaved = document.getElementById("lastSaved");
const deleteEntryButton = document.getElementById("deleteEntryButton");

const generateGuidedPageButton = document.getElementById("generateGuidedPageButton");
const promptCards = document.querySelectorAll(".prompt-card");
const formatButtons = document.querySelectorAll(".format-button");

const toast = document.getElementById("toast");

/* ============================================================
   APP STATE
   ============================================================ */

/*
  entries:
  Stores all saved journal pages.

  activeEntryId:
  Stores which page is currently open.
  If this is null, the user is writing a new unsaved page.

  activeMedia:
  Stores attachments for the currently open page.
*/

let entries = [];
let activeEntryId = null;
let activeMedia = [];

/* ============================================================
   APP STARTUP
   ============================================================ */

init();

/*
  init runs when the app first loads.

  Startup behavior:
  - Load saved entries
  - If saved entries exist, open the most recently updated one
  - If no entries exist, open a blank page
  - Render the entry list
  - Connect all button events
*/
function init() {
  entries = loadEntries();

  setupEventListeners();

  if (entries.length > 0) {
    const mostRecentEntry = getMostRecentEntry();
    loadEntry(mostRecentEntry.id);
  } else {
    openBlankPage();
  }

  renderEntryList();
  showView("journal");
}

/* ============================================================
   EVENT LISTENERS
   ============================================================ */

function setupEventListeners() {
  newEntryButton.addEventListener("click", () => {
    openBlankPage();
    showView("journal");
    showToast("Blank journal page opened.");
  });

  newEntryPanelButton.addEventListener("click", () => {
    openBlankPage();
    showView("journal");
    showToast("Blank journal page opened.");
  });

  saveEntryButton.addEventListener("click", saveEntry);

  entryForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveEntry();
  });

  deleteEntryButton.addEventListener("click", deleteActiveEntry);

  searchInput.addEventListener("input", renderEntryList);

  searchFocusButton.addEventListener("click", () => {
    showView("journal");
    searchInput.focus();
  });

  entryList.addEventListener("click", (event) => {
    const card = event.target.closest(".entry-card");

    if (!card || !card.dataset.id) {
      return;
    }

    loadEntry(card.dataset.id);
    showView("journal");
  });

  compassButton.addEventListener("click", () => {
    showView("compass");
  });

  entriesButton.addEventListener("click", () => {
    showView("journal");
    searchInput.focus();
  });

  backToJournalButton.addEventListener("click", () => {
    showView("journal");
  });

  generateGuidedPageButton.addEventListener("click", () => {
    generateGuidedPage("full");
  });

  promptCards.forEach((card) => {
    card.addEventListener("click", () => {
      generateGuidedPage(card.dataset.template);
    });
  });

  titleInput.addEventListener("input", updatePreview);
  dateInput.addEventListener("input", updatePreview);
  tagsInput.addEventListener("input", updatePreview);

  contentInput.addEventListener("input", () => {
    updatePreview();
    updateCounts();
  });

  mediaFileInput.addEventListener("change", handleMediaUpload);
  mediaList.addEventListener("click", handleRemoveMedia);

  formatButtons.forEach((button) => {
    button.addEventListener("click", () => {
      insertMarkdown(button.dataset.format);
    });
  });
}

/* ============================================================
   VIEW SWITCHING
   ============================================================ */

/*
  showView controls which screen is visible.

  journal:
  Shows the main journal screen.

  compass:
  Shows the separate Compass screen.
*/
function showView(viewName) {
  const showingJournal = viewName === "journal";

  journalView.classList.toggle("active-view", showingJournal);
  compassView.classList.toggle("active-view", !showingJournal);

  entriesButton.classList.toggle("active", showingJournal);
  compassButton.classList.toggle("active", !showingJournal);

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

/* ============================================================
   ENTRY LOADING / SAVING
   ============================================================ */

function loadEntries() {
  const savedEntries = localStorage.getItem(ENTRY_STORAGE_KEY);

  if (!savedEntries) {
    return [];
  }

  try {
    const parsedEntries = JSON.parse(savedEntries);

    if (!Array.isArray(parsedEntries)) {
      return [];
    }

    return parsedEntries.map(normalizeEntry);
  } catch (error) {
    console.error("Could not load saved journal pages:", error);
    return [];
  }
}

/*
  normalizeEntry protects the app from older saved entry formats.

  This matters because we changed the app structure, but we do not want
  old saved entries to break the new version.
*/
function normalizeEntry(entry) {
  return {
    id: entry.id || createId(),
    title: entry.title || "Untitled Entry",
    date: entry.date || getToday(),
    tags: entry.tags || "",
    content: entry.content || "",
    media: Array.isArray(entry.media) ? entry.media : [],
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: entry.updatedAt || new Date().toISOString()
  };
}

function saveEntries() {
  try {
    localStorage.setItem(ENTRY_STORAGE_KEY, JSON.stringify(entries));
    return true;
  } catch (error) {
    console.error("Storage error:", error);
    showToast("Storage is full. Remove large media and try again.");
    return false;
  }
}

function saveEntry() {
  const now = new Date().toISOString();

  const entryData = {
    title: titleInput.value.trim() || "Untitled Entry",
    date: dateInput.value || getToday(),
    tags: tagsInput.value.trim(),
    content: contentInput.value.trim(),
    media: activeMedia,
    updatedAt: now
  };

  if (activeEntryId) {
    entries = entries.map((entry) => {
      if (String(entry.id) !== String(activeEntryId)) {
        return entry;
      }

      return {
        ...entry,
        ...entryData
      };
    });
  } else {
    const newEntry = {
      id: createId(),
      ...entryData,
      createdAt: now
    };

    entries.unshift(newEntry);
    activeEntryId = newEntry.id;
    deleteEntryButton.disabled = false;
  }

  const saved = saveEntries();

  if (!saved) {
    return;
  }

  renderEntryList();
  updatePreview();
  renderMediaLists();

  lastSaved.textContent = `Last saved at ${formatTime(now)}`;
  showToast("Journal page saved.");
}

function loadEntry(entryId) {
  const entry = entries.find((item) => String(item.id) === String(entryId));

  if (!entry) {
    return;
  }

  activeEntryId = entry.id;
  activeMedia = Array.isArray(entry.media) ? cloneData(entry.media) : [];

  titleInput.value = entry.title || "";
  dateInput.value = entry.date || getToday();
  tagsInput.value = entry.tags || "";
  contentInput.value = entry.content || "";

  deleteEntryButton.disabled = false;
  lastSaved.textContent = `Last saved at ${formatTime(entry.updatedAt || entry.createdAt)}`;

  updatePreview();
  updateCounts();
  renderMediaLists();
  renderEntryList();
}

function openBlankPage() {
  activeEntryId = null;
  activeMedia = [];

  titleInput.value = "";
  dateInput.value = getToday();
  tagsInput.value = "";
  contentInput.value = "";

  deleteEntryButton.disabled = true;
  lastSaved.textContent = "Not saved yet";

  updatePreview();
  updateCounts();
  renderMediaLists();
  renderEntryList();

  titleInput.focus();
}

function deleteActiveEntry() {
  if (!activeEntryId) {
    return;
  }

  const confirmed = confirm("Delete this journal page?");

  if (!confirmed) {
    return;
  }

  entries = entries.filter((entry) => String(entry.id) !== String(activeEntryId));

  saveEntries();

  if (entries.length > 0) {
    loadEntry(getMostRecentEntry().id);
  } else {
    openBlankPage();
  }

  showToast("Journal page deleted.");
}

function getMostRecentEntry() {
  return [...entries].sort((a, b) => {
    return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
  })[0];
}

/* ============================================================
   ENTRY LIST
   ============================================================ */

function renderEntryList() {
  const searchTerm = searchInput.value.toLowerCase().trim();

  const filteredEntries = entries
    .filter((entry) => {
      const searchableText = `
        ${entry.title}
        ${entry.date}
        ${entry.tags}
        ${entry.content}
      `.toLowerCase();

      return searchableText.includes(searchTerm);
    })
    .sort((a, b) => {
      return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
    });

  entryCount.textContent = filteredEntries.length;
  entryList.innerHTML = "";

  if (filteredEntries.length === 0) {
    entryList.innerHTML = `
      <button class="entry-card" type="button">
        <strong>No saved pages yet</strong>
        <small>Write a blank page or open the Compass.</small>
        <div class="entry-card-tags">
          <span>#new</span>
          <span>#journal</span>
        </div>
      </button>
    `;

    return;
  }

  filteredEntries.forEach((entry) => {
    const card = document.createElement("button");

    card.className = "entry-card";
    card.type = "button";
    card.dataset.id = entry.id;

    if (String(entry.id) === String(activeEntryId)) {
      card.classList.add("active");
    }

    const tags = getTagsArray(entry.tags || "")
      .slice(0, 2)
      .map((tag) => `<span>${escapeHTML(tag)}</span>`)
      .join("");

    card.innerHTML = `
      <strong>${escapeHTML(entry.title || "Untitled Entry")}</strong>
      <small>${formatDisplayDate(entry.date || getToday())}</small>
      <div class="entry-card-tags">
        ${tags || "<span>#untagged</span>"}
      </div>
    `;

    entryList.appendChild(card);
  });
}







/* ============================================================
   LIVE PREVIEW
   ============================================================ */

function updatePreview() {
  const title = titleInput.value.trim() || "Untitled Entry";
  const date = dateInput.value || getToday();
  const tags = getTagsArray(tagsInput.value);
  const content = contentInput.value.trim();

  previewTitle.textContent = title;
  previewDate.textContent = formatDisplayDate(date);

  previewTags.innerHTML = tags.length
    ? tags.map((tag) => `<span class="tag">${escapeHTML(tag)}</span>`).join("")
    : `<span class="tag">No tags</span>`;

  previewContent.innerHTML = content
    ? markdownToHTML(content)
    : `<p class="empty-preview">Your finished journal page will appear here.</p>`;
}

function updateCounts() {
  const text = contentInput.value.trim();
  const words = text ? text.split(/\s+/).length : 0;
  const characters = contentInput.value.length;

  wordCount.textContent = `${words} word${words === 1 ? "" : "s"}`;
  charCount.textContent = `${characters} character${characters === 1 ? "" : "s"}`;
}

/* ============================================================
   COMPASS GUIDED PAGES
   ============================================================ */

/*
  This function creates a guided journal page from the Compass screen.

  Example:
  - User clicks "What am I grateful for?"
  - JavaScript loads the gratitude template
  - The app fills the journal writing area with that template
  - Then it sends the user back to the Journal screen
*/
function generateGuidedPage(templateName) {
  const hasWriting =
    titleInput.value.trim() ||
    tagsInput.value.trim() ||
    contentInput.value.trim() ||
    activeMedia.length > 0;

  if (hasWriting) {
    const confirmed = confirm("Replace the current page with this Compass-guided page?");

    if (!confirmed) {
      return;
    }
  }

  const template = getCompassTemplate(templateName);

  activeEntryId = null;
  activeMedia = [];

  titleInput.value = template.title;
  dateInput.value = getToday();
  tagsInput.value = template.tags;
  contentInput.value = template.content;

  deleteEntryButton.disabled = true;
  lastSaved.textContent = "Not saved yet";

  updatePreview();
  updateCounts();
  renderMediaLists();
  renderEntryList();

  showView("journal");
  showToast("Compass page generated.");
}

/*
  These are the actual Compass templates.

  EASY TO EDIT:
  If you want to change the guided questions later, edit the text inside
  each content section below.
*/
function getCompassTemplate(templateName) {
  const templates = {
    learn: {
      title: "What I Learned Today",
      tags: "#learning, #growth",
      content: `# What I Learned Today

## Main Lesson
What did today teach me?

## Moment That Stood Out
What happened that made this lesson clear?

## What This Means
Why does this lesson matter in my life right now?

## How I Can Apply It
What is one way I can use this lesson tomorrow?

## Final Reflection
What do I want to remember from today?`
    },

    gratitude: {
      title: "Gratitude Reflection",
      tags: "#gratitude, #mindset",
      content: `# Gratitude Reflection

## Three Things I Am Grateful For
- 
- 
- 

## Small Good Moment
What small moment felt good today?

## Person I Appreciate
Who helped me, supported me, or made life better recently?

## What This Reminds Me
What does gratitude show me about my life right now?

## Final Thought
What do I want to carry with me?`
    },

    goals: {
      title: "Goal Check-In",
      tags: "#goals, #focus",
      content: `# Goal Check-In

## Main Goal On My Mind
What goal matters most right now?

## Why It Matters
Why do I actually care about this goal?

## Current Progress
What have I already done?

## Current Obstacle
What is slowing me down?

## Next Grounded Step
What is one clear action I can take next?`
    },

    improve: {
      title: "Growth Area Reflection",
      tags: "#improvement, #self-awareness",
      content: `# Growth Area Reflection

## What Can I Improve?
What part of my life needs more attention?

## Honest Reality
What is currently happening in this area?

## Pattern I Notice
What do I keep repeating?

## Better Choice
What would a stronger version of me do next?

## One Action
What is one simple step I can take today?`
    },

    free: {
      title: "Free Reflection",
      tags: "#reflection",
      content: `# Free Reflection

## What Is On My Mind?

Write freely without editing yourself.

## What Am I Feeling?

Name the real emotion underneath the thoughts.

## What Do I Need?

Be honest about what would help.

## What Comes Next?

Choose one grounded next step.`
    },

    full: {
      title: "Full Compass Reflection",
      tags: "#compass, #clarity, #growth",
      content: `# Full Compass Reflection

## Health
How is my body feeling, and what does it need?

## Fitness
Am I building strength, energy, and discipline?

## Mindset
What thoughts have been shaping my mood and actions?

## Spirituality
Do I feel connected, grounded, and aligned?

## Career
What progress am I making professionally?

## Money
Am I making wise financial choices?

## Relationships
Who am I connecting with, avoiding, or needing to understand better?

## Family
What matters most in my family life right now?

## Home / Environment
Does my environment support the life I want?

## Fun / Adventure
Where do I need more joy, play, or new experience?

## Learning / Growth
What am I learning about myself or the world?

## Purpose / Legacy
What kind of person am I becoming?

## Truth
What truth do I need to admit without lying to myself?

## Next Step
What is one grounded action I can take next?`
    }
  };

  return templates[templateName] || templates.free;
}

/* ============================================================
   MARKDOWN TOOLBAR
   ============================================================ */

/*
  These buttons insert markdown into the textarea.

  Toolbar meanings:
  - B = bold
  - I = italic
  - H = heading
  - list icon = bullet point
  - quote icon = blockquote
  - link icon = markdown link
*/
function insertMarkdown(formatType) {
  const start = contentInput.selectionStart;
  const end = contentInput.selectionEnd;
  const selectedText = contentInput.value.slice(start, end);

  let replacement = "";

  if (formatType === "bold") {
    replacement = selectedText ? `**${selectedText}**` : "**bold text**";
  }

  if (formatType === "italic") {
    replacement = selectedText ? `*${selectedText}*` : "*italic text*";
  }

  if (formatType === "heading") {
    replacement = selectedText ? `## ${selectedText}` : "## Heading";
  }

  if (formatType === "list") {
    replacement = selectedText ? `- ${selectedText}` : "- List item";
  }

  if (formatType === "quote") {
    replacement = selectedText ? `> ${selectedText}` : "> Quote";
  }

  if (formatType === "link") {
    replacement = selectedText
      ? `[${selectedText}](https://example.com)`
      : "[link text](https://example.com)";
  }

  contentInput.setRangeText(replacement, start, end, "end");
  contentInput.focus();

  updatePreview();
  updateCounts();
}

/* ============================================================
   MARKDOWN PREVIEW CONVERTER
   ============================================================ */

/*
  This is a simple markdown converter.

  It supports:
  - # Heading 1
  - ## Heading 2
  - ### Heading 3
  - - Bullet lists
  - > Blockquotes
  - **bold**
  - *italic*
  - `code`
  - [links](https://example.com)

  It intentionally stays beginner-friendly.
*/
function markdownToHTML(markdown) {
  const escapedMarkdown = escapeHTML(markdown);
  const lines = escapedMarkdown.split("\n");

  let html = "";
  let listOpen = false;

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (trimmed === "") {
      if (listOpen) {
        html += "</ul>";
        listOpen = false;
      }

      return;
    }

    if (trimmed.startsWith("- ")) {
      if (!listOpen) {
        html += "<ul>";
        listOpen = true;
      }

      html += `<li>${parseInlineMarkdown(trimmed.slice(2))}</li>`;
      return;
    }

    if (listOpen) {
      html += "</ul>";
      listOpen = false;
    }

    if (trimmed.startsWith("### ")) {
      html += `<h3>${parseInlineMarkdown(trimmed.slice(4))}</h3>`;
      return;
    }

    if (trimmed.startsWith("## ")) {
      html += `<h2>${parseInlineMarkdown(trimmed.slice(3))}</h2>`;
      return;
    }

    if (trimmed.startsWith("# ")) {
      html += `<h1>${parseInlineMarkdown(trimmed.slice(2))}</h1>`;
      return;
    }

    if (trimmed.startsWith("&gt; ")) {
      html += `<blockquote>${parseInlineMarkdown(trimmed.slice(5))}</blockquote>`;
      return;
    }

    html += `<p>${parseInlineMarkdown(trimmed)}</p>`;
  });

  if (listOpen) {
    html += "</ul>";
  }

  return html;
}

/*
  This handles inline markdown inside paragraphs.

  IMPORTANT:
  This corrected function is the one that avoids the broken copied regex.
*/
function parseInlineMarkdown(text) {
  return text
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/$begin:math:display$\(\[\^$end:math:display$]+)\]$begin:math:text$\(\[\^\)\]\+\)$end:math:text$/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

/* ============================================================
   MEDIA ATTACHMENTS
   ============================================================ */

function handleMediaUpload(event) {
  const files = Array.from(event.target.files || []);

  if (files.length === 0) {
    return;
  }

  files.forEach((file) => {
    if (!isAllowedMediaType(file.type)) {
      showToast(`${file.name} is not supported.`);
      return;
    }

    if (file.size > MAX_MEDIA_FILE_SIZE) {
      showToast(`${file.name} is too large. Keep media under 2.5 MB.`);
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      activeMedia.push({
        id: createId(),
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl: reader.result
      });

      renderMediaLists();
      showToast("Memory added. Save the page to keep it.");
    };

    reader.onerror = () => {
      showToast("Could not read this media file.");
    };

    reader.readAsDataURL(file);
  });

  mediaFileInput.value = "";
}

function renderMediaLists() {
  renderMediaGrid(mediaList, true);
  renderMediaGrid(previewMediaList, false);
}

function renderMediaGrid(container, allowRemove) {
  container.innerHTML = "";

  if (!activeMedia || activeMedia.length === 0) {
    container.innerHTML = `
      <div class="empty-media">
        No memory attachments yet.
      </div>
    `;

    return;
  }

  activeMedia.forEach((media) => {
    const card = document.createElement("div");
    card.className = "media-card";
    card.dataset.id = media.id;

    let mediaElement = "";

    if (media.type.startsWith("image/")) {
      mediaElement = `<img src="${media.dataUrl}" alt="${escapeAttribute(media.name)}" />`;
    } else if (media.type.startsWith("video/")) {
      mediaElement = `<video src="${media.dataUrl}" controls></video>`;
    } else if (media.type.startsWith("audio/")) {
      mediaElement = `<audio src="${media.dataUrl}" controls></audio>`;
    }

    card.innerHTML = `
      ${allowRemove ? `<button class="remove-media" type="button">×</button>` : ""}
      ${mediaElement}
      <strong>${escapeHTML(media.name)}</strong>
      <small>${formatFileSize(media.size)}</small>
    `;

    container.appendChild(card);
  });
}

function handleRemoveMedia(event) {
  const removeButton = event.target.closest(".remove-media");

  if (!removeButton) {
    return;
  }

  const card = event.target.closest(".media-card");

  if (!card) {
    return;
  }

  activeMedia = activeMedia.filter((media) => String(media.id) !== String(card.dataset.id));

  renderMediaLists();
  showToast("Memory removed. Save the page to update it.");
}

function isAllowedMediaType(type) {
  return type.startsWith("image/") || type.startsWith("video/") || type.startsWith("audio/");
}

/* ============================================================
   HELPER FUNCTIONS
   ============================================================ */

function getTagsArray(tagsText) {
  return String(tagsText)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function formatDisplayDate(dateString) {
  const date = new Date(`${dateString}T12:00:00`);

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function formatTime(dateString) {
  const date = new Date(dateString);

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatFileSize(bytes) {
  if (!bytes) {
    return "0 KB";
  }

  const kilobytes = bytes / 1024;
  const megabytes = kilobytes / 1024;

  if (megabytes >= 1) {
    return `${megabytes.toFixed(1)} MB`;
  }

  return `${Math.round(kilobytes)} KB`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2400);
}

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cloneData(data) {
  return JSON.parse(JSON.stringify(data));
}

function escapeHTML(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(text) {
  return escapeHTML(text);
}
