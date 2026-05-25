const STORAGE_KEY = "paperTrailJournalEntries";

const starterEntries = [
  {
    id: 1,
    title: "Morning Reflection",
    date: getToday(),
    tags: "Personal, Reflection",
    content:
`# Morning Reflection

Today I am choosing to move with a calm mind.

**Main focus:** build one meaningful thing well.

- Stay present
- Keep the work simple
- Save the lesson
- Return to peace

> Small steps still count when they are taken with intention.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

let entries = loadEntries();
let activeEntryId = entries.length > 0 ? entries[0].id : null;

const newEntryButton = document.getElementById("newEntryButton");
const searchInput = document.getElementById("searchInput");
const entryList = document.getElementById("entryList");
const entryCount = document.getElementById("entryCount");

const entryForm = document.getElementById("entryForm");
const titleInput = document.getElementById("titleInput");
const dateInput = document.getElementById("dateInput");
const tagsInput = document.getElementById("tagsInput");
const contentInput = document.getElementById("contentInput");

const wordCount = document.getElementById("wordCount");
const charCount = document.getElementById("charCount");
const lastSaved = document.getElementById("lastSaved");
const deleteEntryButton = document.getElementById("deleteEntryButton");

const todayStamp = document.getElementById("todayStamp");
const previewDate = document.getElementById("previewDate");
const previewTags = document.getElementById("previewTags");
const previewContent = document.getElementById("previewContent");

const toast = document.getElementById("toast");

todayStamp.textContent = formatDisplayDate(getToday());

if (activeEntryId) {
  loadEntry(activeEntryId);
} else {
  startNewEntry();
}

renderEntryList();
updatePreview();

newEntryButton.addEventListener("click", startNewEntry);
searchInput.addEventListener("input", renderEntryList);

entryForm.addEventListener("input", () => {
  updatePreview();
  updateCounts();
});

entryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  saveEntry();
});

deleteEntryButton.addEventListener("click", deleteActiveEntry);

entryList.addEventListener("click", (event) => {
  const card = event.target.closest(".entry-card");

  if (!card) {
    return;
  }

  const entryId = Number(card.dataset.id);
  loadEntry(entryId);
});

function startNewEntry() {
  activeEntryId = null;

  titleInput.value = "";
  dateInput.value = getToday();
  tagsInput.value = "";
  contentInput.value =
`# New Journal Entry

Write what is true today.

- What happened?
- What did I learn?
- What needs my attention?
- What am I grateful for?`;

  lastSaved.textContent = "Not saved yet";
  deleteEntryButton.disabled = true;

  renderEntryList();
  updatePreview();
  updateCounts();

  titleInput.focus();
  showToast("New journal page opened.");
}

function saveEntry() {
  const title = titleInput.value.trim() || "Untitled Entry";
  const now = new Date().toISOString();

  if (activeEntryId) {
    entries = entries.map((entry) => {
      if (entry.id !== activeEntryId) {
        return entry;
      }

      return {
        ...entry,
        title: title,
        date: dateInput.value || getToday(),
        tags: tagsInput.value.trim(),
        content: contentInput.value.trim(),
        updatedAt: now
      };
    });
  } else {
    const newEntry = {
      id: Date.now(),
      title: title,
      date: dateInput.value || getToday(),
      tags: tagsInput.value.trim(),
      content: contentInput.value.trim(),
      createdAt: now,
      updatedAt: now
    };

    entries.unshift(newEntry);
    activeEntryId = newEntry.id;
    deleteEntryButton.disabled = false;
  }

  saveEntries();
  renderEntryList();

  lastSaved.textContent = `Last saved at ${formatTime(now)}`;
  showToast("Journal entry saved.");
}

function loadEntry(entryId) {
  const entry = entries.find((item) => item.id === entryId);

  if (!entry) {
    return;
  }

  activeEntryId = entry.id;

  titleInput.value = entry.title;
  dateInput.value = entry.date;
  tagsInput.value = entry.tags || "";
  contentInput.value = entry.content;

  lastSaved.textContent = `Last saved at ${formatTime(entry.updatedAt)}`;
  deleteEntryButton.disabled = false;

  renderEntryList();
  updatePreview();
  updateCounts();
}

function deleteActiveEntry() {
  if (!activeEntryId) {
    return;
  }

  const confirmed = confirm("Delete this journal entry?");

  if (!confirmed) {
    return;
  }

  entries = entries.filter((entry) => entry.id !== activeEntryId);
  saveEntries();

  if (entries.length > 0) {
    activeEntryId = entries[0].id;
    loadEntry(activeEntryId);
  } else {
    startNewEntry();
  }

  renderEntryList();
  showToast("Journal entry deleted.");
}

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
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  entryCount.textContent = filteredEntries.length;
  entryList.innerHTML = "";

  if (filteredEntries.length === 0) {
    entryList.innerHTML = `
      <div class="entry-card">
        <strong>No entries found</strong>
        <p>Try a different search or create a new entry.</p>
      </div>
    `;
    return;
  }

  filteredEntries.forEach((entry) => {
    const card = document.createElement("button");
    card.className = "entry-card";
    card.type = "button";
    card.dataset.id = entry.id;

    if (entry.id === activeEntryId) {
      card.classList.add("active");
    }

    const tags = getTagsArray(entry.tags || "")
      .slice(0, 3)
      .map((tag) => `<span>${escapeHTML(tag)}</span>`)
      .join("");

    card.innerHTML = `
      <small>${formatDisplayDate(entry.date)}</small>
      <strong>${escapeHTML(entry.title)}</strong>
      <p>${escapeHTML(getExcerpt(entry.content))}</p>

      <div class="entry-card-tags">
        ${tags || "<span>No tags</span>"}
      </div>
    `;

    entryList.appendChild(card);
  });
}

function updatePreview() {
  const title = titleInput.value.trim() || "Untitled Entry";
  const date = dateInput.value || getToday();
  const tags = getTagsArray(tagsInput.value);

  previewDate.textContent = formatDisplayDate(date);

  previewTags.innerHTML = tags.length
    ? tags.map((tag) => `<span class="tag">${escapeHTML(tag)}</span>`).join("")
    : `<span class="tag">No tags</span>`;

  const content = contentInput.value.trim();

  if (!content) {
    previewContent.innerHTML = `
      <h1>${escapeHTML(title)}</h1>
      <p class="empty-preview">Start writing and your formatted journal page will appear here.</p>
    `;
    return;
  }

  previewContent.innerHTML = `
    <h1>${escapeHTML(title)}</h1>
    ${markdownToHTML(content)}
  `;
}

function updateCounts() {
  const text = contentInput.value.trim();
  const words = text ? text.split(/\s+/).length : 0;
  const characters = contentInput.value.length;

  wordCount.textContent = `${words} word${words === 1 ? "" : "s"}`;
  charCount.textContent = `${characters} character${characters === 1 ? "" : "s"}`;
}

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

function parseInlineMarkdown(text) {
  return text
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function getTagsArray(tagsText) {
  return tagsText
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function getExcerpt(content) {
  const plainText = content
    .replaceAll("#", "")
    .replaceAll("*", "")
    .replaceAll("`", "")
    .replaceAll(">", "")
    .replaceAll("-", "")
    .trim();

  if (plainText.length <= 82) {
    return plainText || "Empty entry";
  }

  return `${plainText.slice(0, 82)}...`;
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function loadEntries() {
  const savedEntries = localStorage.getItem(STORAGE_KEY);

  if (!savedEntries) {
    return [...starterEntries];
  }

  try {
    const parsedEntries = JSON.parse(savedEntries);

    return parsedEntries.map((entry) => {
      const cleanedEntry = { ...entry };
      delete cleanedEntry.mood;
      return cleanedEntry;
    });
  } catch (error) {
    console.error("Could not load journal entries:", error);
    return [...starterEntries];
  }
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

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2400);
}

function escapeHTML(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
