
const ENTRY_STORAGE_KEY = "paperTrailJournalEntriesSimple";
const MAX_MEDIA_FILE_SIZE = 2.5 * 1024 * 1024;

let entries = [];
let activeEntryId = null;
let activeMedia = [];

const journalView = document.getElementById("journalView");
const compassView = document.getElementById("compassView");

const newEntryButton = document.getElementById("newEntryButton");
const newEntryPanelButton = document.getElementById("newEntryPanelButton");
const saveEntryButton = document.getElementById("saveEntryButton");
const entriesButton = document.getElementById("entriesButton");
const compassButton = document.getElementById("compassButton");
const backToJournalButton = document.getElementById("backToJournalButton");

const entryCount = document.getElementById("entryCount");
const searchInput = document.getElementById("searchInput");
const entryList = document.getElementById("entryList");

const entryForm = document.getElementById("entryForm");
const titleInput = document.getElementById("titleInput");
const dateInput = document.getElementById("dateInput");
const tagsInput = document.getElementById("tagsInput");
const contentInput = document.getElementById("contentInput");

const previewDate = document.getElementById("previewDate");
const previewTitle = document.getElementById("previewTitle");
const previewTags = document.getElementById("previewTags");
const previewContent = document.getElementById("previewContent");

const wordCount = document.getElementById("wordCount");
const charCount = document.getElementById("charCount");
const lastSaved = document.getElementById("lastSaved");
const deleteEntryButton = document.getElementById("deleteEntryButton");

const mediaFileInput = document.getElementById("mediaFileInput");
const mediaList = document.getElementById("mediaList");
const previewMediaList = document.getElementById("previewMediaList");

const generateGuidedPageButton = document.getElementById("generateGuidedPageButton");
const promptCards = document.querySelectorAll(".prompt-card");

const toast = document.getElementById("toast");

init();

function init() {
  entries = loadEntries();

  setupEvents();

  if (entries.length > 0) {
    loadEntry(getMostRecentEntry().id);
  } else {
    openBlankPage();
  }

  showJournal();
  renderEntryList();
}

function setupEvents() {
  newEntryButton.addEventListener("click", () => {
    openBlankPage();
    showJournal();
    showToast("Blank page opened.");
  });

  newEntryPanelButton.addEventListener("click", () => {
    openBlankPage();
    showJournal();
    showToast("Blank page opened.");
  });

  saveEntryButton.addEventListener("click", saveEntry);

  entryForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveEntry();
  });

  deleteEntryButton.addEventListener("click", deleteEntry);

  entriesButton.addEventListener("click", showJournal);
  compassButton.addEventListener("click", showCompass);
  backToJournalButton.addEventListener("click", showJournal);

  searchInput.addEventListener("input", renderEntryList);

  entryList.addEventListener("click", (event) => {
    const card = event.target.closest(".entry-card");

    if (!card || !card.dataset.id) {
      return;
    }

    loadEntry(card.dataset.id);
    showJournal();
  });

  titleInput.addEventListener("input", updatePreview);
  dateInput.addEventListener("input", updatePreview);
  tagsInput.addEventListener("input", updatePreview);

  contentInput.addEventListener("input", () => {
    updatePreview();
    updateCounts();
  });

  mediaFileInput.addEventListener("change", handleMediaUpload);
  mediaList.addEventListener("click", removeMedia);

  generateGuidedPageButton.addEventListener("click", () => {
    generateGuidedPage("full");
  });

  promptCards.forEach((card) => {
    card.addEventListener("click", () => {
      generateGuidedPage(card.dataset.template);
    });
  });
}

function showJournal() {
  journalView.classList.add("active-view");
  compassView.classList.remove("active-view");

  entriesButton.classList.add("active");
  compassButton.classList.remove("active");
}

function showCompass() {
  journalView.classList.remove("active-view");
  compassView.classList.add("active-view");

  entriesButton.classList.remove("active");
  compassButton.classList.add("active");
}

function loadEntries() {
  const saved = localStorage.getItem(ENTRY_STORAGE_KEY);

  if (!saved) {
    return [];
  }

  try {
    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  } catch {
    return [];
  }
}

function saveEntries() {
  try {
    localStorage.setItem(ENTRY_STORAGE_KEY, JSON.stringify(entries));
    return true;
  } catch {
    showToast("Storage full. Remove large media.");
    return false;
  }
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
      if (entry.id === activeEntryId) {
        return { ...entry, ...entryData };
      }

      return entry;
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

  if (!saveEntries()) {
    return;
  }

  renderEntryList();
  updatePreview();
  renderMediaLists();

  lastSaved.textContent = `Last saved at ${formatTime(now)}`;
  showToast("Journal page saved.");
}

function loadEntry(id) {
  const entry = entries.find((item) => item.id === id);

  if (!entry) {
    return;
  }

  activeEntryId = entry.id;
  activeMedia = Array.isArray(entry.media) ? [...entry.media] : [];

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

function deleteEntry() {
  if (!activeEntryId) {
    return;
  }

  const confirmed = confirm("Delete this journal page?");

  if (!confirmed) {
    return;
  }

  entries = entries.filter((entry) => entry.id !== activeEntryId);
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

function renderEntryList() {
  const searchTerm = searchInput.value.toLowerCase().trim();

  const filtered = entries
    .filter((entry) => {
      const text = `${entry.title} ${entry.date} ${entry.tags} ${entry.content}`.toLowerCase();
      return text.includes(searchTerm);
    })
    .sort((a, b) => {
      return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
    });

  entryCount.textContent = filtered.length;
  entryList.innerHTML = "";

  if (filtered.length === 0) {
    entryList.innerHTML = `
      <button class="entry-card" type="button">
        <strong>No saved pages yet</strong>
        <small>Create a new page or use Compass.</small>
        <div class="entry-card-tags">
          <span>#new</span>
        </div>
      </button>
    `;
    return;
  }

  filtered.forEach((entry) => {
    const card = document.createElement("button");
    card.className = "entry-card";
    card.type = "button";
    card.dataset.id = entry.id;

    if (entry.id === activeEntryId) {
      card.classList.add("active");
    }

    const tags = getTags(entry.tags)
      .slice(0, 2)
      .map((tag) => `<span>${escapeHTML(tag)}</span>`)
      .join("");

    card.innerHTML = `
      <strong>${escapeHTML(entry.title)}</strong>
      <small>${formatDate(entry.date)}</small>
      <div class="entry-card-tags">
        ${tags || "<span>#untagged</span>"}
      </div>
    `;

    entryList.appendChild(card);
  });
}

function updatePreview() {
  const title = titleInput.value.trim() || "Untitled Entry";
  const date = dateInput.value || getToday();
  const tags = getTags(tagsInput.value);
  const content = contentInput.value.trim();

  previewTitle.textContent = title;
  previewDate.textContent = formatDate(date);

  previewTags.innerHTML = tags.length
    ? tags.map((tag) => `<span class="tag">${escapeHTML(tag)}</span>`).join("")
    : `<span class="tag">No tags</span>`;

  previewContent.innerHTML = content
    ? markdownToHTML(content)
    : `<p class="empty-text">Your finished journal page will appear here.</p>`;
}

function updateCounts() {
  const text = contentInput.value.trim();
  const words = text ? text.split(/\s+/).length : 0;
  const characters = contentInput.value.length;

  wordCount.textContent = `${words} word${words === 1 ? "" : "s"}`;
  charCount.textContent = `${characters} character${characters === 1 ? "" : "s"}`;
}

function generateGuidedPage(type) {
  const hasWriting =
    titleInput.value.trim() ||
    tagsInput.value.trim() ||
    contentInput.value.trim() ||
    activeMedia.length > 0;

  if (hasWriting) {
    const confirmed = confirm("Replace the current page with a guided page?");

    if (!confirmed) {
      return;
    }
  }

  const template = getTemplate(type);

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
  showJournal();

  showToast("Guided page created.");
}

function getTemplate(type) {
  const templates = {
    learn: {
      title: "What I Learned Today",
      tags: "#learning, #growth",
      content:
`# What I Learned Today

## Main Lesson
What did today teach me?

## Moment That Stood Out
What happened that made this lesson clear?

## How I Can Apply It
What is one way I can use this lesson tomorrow?`
    },

    gratitude: {
      title: "Gratitude Reflection",
      tags: "#gratitude, #mindset",
      content:
`# Gratitude Reflection

## Three Things I Am Grateful For
- 
- 
- 

## Small Good Moment
What small moment felt good today?

## Final Thought
What do I want to carry with me?`
    },

    goals: {
      title: "Goal Check-In",
      tags: "#goals, #focus",
      content:
`# Goal Check-In

## Main Goal
What goal matters most right now?

## Why It Matters
Why do I care about this goal?

## Current Obstacle
What is slowing me down?

## Next Step
What is one clear action I can take next?`
    },

    improve: {
      title: "Growth Area Reflection",
      tags: "#improvement, #self-awareness",
      content:
`# Growth Area Reflection

## What Can I Improve?
What part of my life needs attention?

## Honest Reality
What is currently happening?

## Better Choice
What would a stronger version of me do next?

## One Action
What is one simple step I can take today?`
    },

    full: {
      title: "Full Compass Reflection",
      tags: "#compass, #clarity, #growth",
      content:
`# Full Compass Reflection

## Health
How is my body feeling?

## Mindset
What thoughts have been shaping me?

## Career
What progress am I making?

## Money
Am I making wise financial choices?

## Relationships
Who needs my attention or understanding?

## Home / Environment
Does my environment support me?

## Purpose
What kind of person am I becoming?

## Truth
What truth do I need to admit?

## Next Step
What is one grounded action I can take next?`
    }
  };

  return templates[type] || templates.full;
}

function markdownToHTML(markdown) {
  const safeText = escapeHTML(markdown);
  const lines = safeText.split("\n");

  let html = "";
  let listOpen = false;

  lines.forEach((line) => {
    const text = line.trim();

    if (text === "") {
      if (listOpen) {
        html += "</ul>";
        listOpen = false;
      }
      return;
    }

    if (text.startsWith("- ")) {
      if (!listOpen) {
        html += "<ul>";
        listOpen = true;
      }

      html += `<li>${text.slice(2)}</li>`;
      return;
    }

    if (listOpen) {
      html += "</ul>";
      listOpen = false;
    }

    if (text.startsWith("# ")) {
      html += `<h1>${text.slice(2)}</h1>`;
    } else if (text.startsWith("## ")) {
      html += `<h2>${text.slice(3)}</h2>`;
    } else if (text.startsWith("### ")) {
      html += `<h3>${text.slice(4)}</h3>`;
    } else if (text.startsWith("&gt; ")) {
      html += `<blockquote>${text.slice(5)}</blockquote>`;
    } else {
      html += `<p>${text}</p>`;
    }
  });

  if (listOpen) {
    html += "</ul>";
  }

  return html;
}

function handleMediaUpload(event) {
  const files = Array.from(event.target.files || []);

  files.forEach((file) => {
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/") && !file.type.startsWith("audio/")) {
      showToast("Unsupported file.");
      return;
    }

    if (file.size > MAX_MEDIA_FILE_SIZE) {
      showToast("File too large. Keep under 2.5 MB.");
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
      showToast("Memory added. Save page to keep it.");
    };

    reader.readAsDataURL(file);
  });

  mediaFileInput.value = "";
}

function renderMediaLists() {
  renderMediaGrid(mediaList, true);
  renderMediaGrid(previewMediaList, false);
}

function renderMediaGrid(container, canRemove) {
  container.innerHTML = "";

  if (activeMedia.length === 0) {
    container.innerHTML = `<div class="empty-media">No memory attachments yet.</div>`;
    return;
  }

  activeMedia.forEach((media) => {
    const card = document.createElement("div");
    card.className = "media-card";
    card.dataset.id = media.id;

    let mediaHTML = "";

    if (media.type.startsWith("image/")) {
      mediaHTML = `<img src="${media.dataUrl}" alt="${escapeHTML(media.name)}" />`;
    }

    if (media.type.startsWith("video/")) {
      mediaHTML = `<video src="${media.dataUrl}" controls></video>`;
    }

    if (media.type.startsWith("audio/")) {
      mediaHTML = `<audio src="${media.dataUrl}" controls></audio>`;
    }

    card.innerHTML = `
      ${canRemove ? `<button class="remove-media" type="button">×</button>` : ""}
      ${mediaHTML}
      <strong>${escapeHTML(media.name)}</strong>
      <small>${formatFileSize(media.size)}</small>
    `;

    container.appendChild(card);
  });
}

function removeMedia(event) {
  const button = event.target.closest(".remove-media");

  if (!button) {
    return;
  }

  const card = event.target.closest(".media-card");

  if (!card) {
    return;
  }

  activeMedia = activeMedia.filter((media) => media.id !== card.dataset.id);
  renderMediaLists();
  showToast("Memory removed.");
}

function getTags(text) {
  return String(text)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function formatDate(dateText) {
  const date = new Date(`${dateText}T12:00:00`);

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function formatTime(dateText) {
  const date = new Date(dateText);

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatFileSize(bytes) {
  const kb = bytes / 1024;
  const mb = kb / 1024;

  if (mb >= 1) {
    return `${mb.toFixed(1)} MB`;
  }

  return `${Math.round(kb)} KB`;
}

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

function escapeHTML(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
