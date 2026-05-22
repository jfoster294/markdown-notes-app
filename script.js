const notesList = document.getElementById("notesList");
const emptyListMessage = document.getElementById("emptyListMessage");

const newNoteButton = document.getElementById("newNoteButton");
const noteForm = document.getElementById("noteForm");
const editorTitle = document.getElementById("editorTitle");
const titleInput = document.getElementById("titleInput");
const tagsInput = document.getElementById("tagsInput");
const contentInput = document.getElementById("contentInput");
const previewBox = document.getElementById("previewBox");
const saveMessage = document.getElementById("saveMessage");

const searchInput = document.getElementById("searchInput");
const tagFilter = document.getElementById("tagFilter");
const pinNoteButton = document.getElementById("pinNoteButton");
const deleteNoteButton = document.getElementById("deleteNoteButton");
const clearEditorButton = document.getElementById("clearEditorButton");

const totalNotes = document.getElementById("totalNotes");
const pinnedNotes = document.getElementById("pinnedNotes");
const tagCount = document.getElementById("tagCount");

let notes = JSON.parse(localStorage.getItem("markdownNotes")) || [];
let activeNoteId = null;

newNoteButton.addEventListener("click", function () {
  clearEditor();
});

noteForm.addEventListener("submit", function (event) {
  event.preventDefault();
  saveNote();
});

titleInput.addEventListener("input", function () {
  updatePreview();
});

tagsInput.addEventListener("input", function () {
  updatePreview();
});

contentInput.addEventListener("input", function () {
  updatePreview();
});

searchInput.addEventListener("input", function () {
  renderNotes();
});

tagFilter.addEventListener("change", function () {
  renderNotes();
});

pinNoteButton.addEventListener("click", function () {
  if (!activeNoteId) {
    saveMessage.textContent = "Save the note before pinning it.";
    return;
  }

  notes = notes.map(function (note) {
    if (note.id === activeNoteId) {
      return {
        ...note,
        pinned: !note.pinned
      };
    }

    return note;
  });

  saveNotes();
  renderNotes();
  loadNote(activeNoteId);
});

deleteNoteButton.addEventListener("click", function () {
  if (!activeNoteId) {
    clearEditor();
    return;
  }

  const confirmDelete = confirm("Delete this note?");

  if (confirmDelete) {
    notes = notes.filter(function (note) {
      return note.id !== activeNoteId;
    });

    saveNotes();
    clearEditor();
    renderNotes();
  }
});

clearEditorButton.addEventListener("click", function () {
  clearEditor();
});

function saveNote() {
  const title = titleInput.value.trim();
  const tags = parseTags(tagsInput.value);
  const content = contentInput.value.trim();

  if (!title) {
    saveMessage.textContent = "Please add a note title.";
    return;
  }

  if (activeNoteId) {
    notes = notes.map(function (note) {
      if (note.id === activeNoteId) {
        return {
          ...note,
          title: title,
          tags: tags,
          content: content,
          updatedAt: new Date().toISOString()
        };
      }

      return note;
    });
  } else {
    const newNote = {
      id: Date.now().toString(),
      title: title,
      tags: tags,
      content: content,
      pinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    notes.unshift(newNote);
    activeNoteId = newNote.id;
  }

  saveNotes();
  renderNotes();
  updateTagFilter();
  editorTitle.textContent = "Editing Note";
  saveMessage.textContent = "Note saved locally.";
}

function saveNotes() {
  localStorage.setItem("markdownNotes", JSON.stringify(notes));
}

function renderNotes() {
  notesList.innerHTML = "";

  const searchText = searchInput.value.toLowerCase().trim();
  const selectedTag = tagFilter.value;

  const filteredNotes = notes
    .filter(function (note) {
      const tagText = note.tags.join(" ").toLowerCase();

      const matchesSearch =
        note.title.toLowerCase().includes(searchText) ||
        note.content.toLowerCase().includes(searchText) ||
        tagText.includes(searchText);

      const matchesTag =
        selectedTag === "All" || note.tags.includes(selectedTag);

      return matchesSearch && matchesTag;
    })
    .sort(function (a, b) {
      if (a.pinned && !b.pinned) {
        return -1;
      }

      if (!a.pinned && b.pinned) {
        return 1;
      }

      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

  if (filteredNotes.length === 0) {
    emptyListMessage.classList.add("show");
  } else {
    emptyListMessage.classList.remove("show");
  }

  filteredNotes.forEach(function (note) {
    const item = document.createElement("article");
    item.className = "note-list-item";

    if (note.id === activeNoteId) {
      item.classList.add("active");
    }

    item.addEventListener("click", function () {
      loadNote(note.id);
    });

    const pinLabel = note.pinned ? `<p class="pin-label">Pinned</p>` : "";

    item.innerHTML = `
      ${pinLabel}
      <h3>${escapeHTML(note.title)}</h3>
      <p>${getPreviewText(note.content)}</p>
      <div class="note-tags">
        ${note.tags.map(function (tag) {
          return `<span class="note-tag">${escapeHTML(tag)}</span>`;
        }).join("")}
      </div>
    `;

    notesList.appendChild(item);
  });

  updateStats();
}

function loadNote(id) {
  const note = notes.find(function (item) {
    return item.id === id;
  });

  if (!note) {
    return;
  }

  activeNoteId = note.id;
  titleInput.value = note.title;
  tagsInput.value = note.tags.join(", ");
  contentInput.value = note.content;

  editorTitle.textContent = "Editing Note";
  pinNoteButton.textContent = note.pinned ? "Unpin" : "Pin";
  saveMessage.textContent = "Note loaded.";

  updatePreview();
  renderNotes();
}

function clearEditor() {
  activeNoteId = null;
  titleInput.value = "";
  tagsInput.value = "";
  contentInput.value = "";

  editorTitle.textContent = "New Note";
  pinNoteButton.textContent = "Pin";
  saveMessage.textContent = "Editor cleared.";
  updatePreview();
  renderNotes();
}

function parseTags(tagString) {
  return tagString
    .split(",")
    .map(function (tag) {
      return tag.trim();
    })
    .filter(function (tag) {
      return tag !== "";
    });
}

function updateTagFilter() {
  const currentValue = tagFilter.value;
  const tags = getAllTags();

  tagFilter.innerHTML = `<option value="All">All Tags</option>`;

  tags.forEach(function (tag) {
    const option = document.createElement("option");
    option.value = tag;
    option.textContent = tag;
    tagFilter.appendChild(option);
  });

  if (tags.includes(currentValue)) {
    tagFilter.value = currentValue;
  } else {
    tagFilter.value = "All";
  }
}

function getAllTags() {
  const tagSet = new Set();

  notes.forEach(function (note) {
    note.tags.forEach(function (tag) {
      tagSet.add(tag);
    });
  });

  return Array.from(tagSet).sort();
}

function updateStats() {
  totalNotes.textContent = notes.length;

  pinnedNotes.textContent = notes.filter(function (note) {
    return note.pinned;
  }).length;

  tagCount.textContent = getAllTags().length;
}

function updatePreview() {
  const content = contentInput.value.trim();

  if (!content) {
    previewBox.innerHTML = `<p class="preview-placeholder">Start typing to preview your markdown.</p>`;
    return;
  }

  previewBox.innerHTML = convertMarkdownToHTML(content);
}

function convertMarkdownToHTML(markdown) {
  let html = escapeHTML(markdown);

  html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
  html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
  html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");

  html = html.replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/gim, "<em>$1</em>");
  html = html.replace(/`(.*?)`/gim, "<code>$1</code>");

  html = html.replace(/^> (.*$)/gim, "<blockquote>$1</blockquote>");

  html = html.replace(/^- (.*$)/gim, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>)/gims, "<ul>$1</ul>");

  html = html
    .split(/\n{2,}/)
    .map(function (block) {
      const trimmed = block.trim();

      if (
        trimmed.startsWith("<h1>") ||
        trimmed.startsWith("<h2>") ||
        trimmed.startsWith("<h3>") ||
        trimmed.startsWith("<ul>") ||
        trimmed.startsWith("<blockquote>")
      ) {
        return trimmed;
      }

      return `<p>${trimmed.replace(/\n/g, "<br>")}</p>`;
    })
    .join("");

  return html;
}

function getPreviewText(content) {
  if (!content) {
    return "No content yet.";
  }

  const cleanText = content
    .replace(/[#>*`-]/g, "")
    .replace(/\n/g, " ")
    .trim();

  if (cleanText.length > 80) {
    return `${escapeHTML(cleanText.slice(0, 80))}...`;
  }

  return escapeHTML(cleanText);
}

function escapeHTML(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

updateTagFilter();
renderNotes();
updatePreview();
