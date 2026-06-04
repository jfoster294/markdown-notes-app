const ENTRY_STORAGE_KEY = "paperTrailJournalEntriesV3";
const COMPASS_STORAGE_KEY = "paperTrailJournalCompassesV3";
const ACTIVE_COMPASS_KEY = "paperTrailActiveCompassIdV3";

const MAX_MEDIA_FILE_SIZE = 2.5 * 1024 * 1024;

const defaultLifeAreas = [
  "Health",
  "Fitness",
  "Mindset",
  "Spirituality",
  "Career",
  "Money",
  "Relationships",
  "Family",
  "Home / Environment",
  "Fun / Adventure",
  "Learning / Growth",
  "Purpose / Legacy"
];

const defaultEquationParts = [
  {
    id: "life-area",
    name: "Life Area",
    prompt: "Which area of life am I reflecting on today?",
    helper: "Choose the area that needs your attention."
  },
  {
    id: "current-reality",
    name: "Current Reality",
    prompt: "What is honestly happening in this area right now?",
    helper: "Write the truth without exaggerating or avoiding it."
  },
  {
    id: "feeling",
    name: "Feeling",
    prompt: "How do I feel about this area of my life?",
    helper: "Name the emotion underneath the situation."
  },
  {
    id: "friction",
    name: "Friction",
    prompt: "What feels blocked, heavy, weak, avoided, or unfinished?",
    helper: "Identify the resistance, problem, or pattern."
  },
  {
    id: "truth",
    name: "Truth",
    prompt: "What truth do I need to admit without lying to myself?",
    helper: "Be honest, grounded, and direct."
  },
  {
    id: "next-step",
    name: "Next Step",
    prompt: "What is one grounded action I can take next?",
    helper: "Choose one clear step instead of overthinking."
  }
];

const bookShell = document.getElementById("bookShell");
const frontCover = document.getElementById("frontCover");
const openJournalButton = document.getElementById("openJournalButton");
const newEntryButton = document.getElementById("newEntryButton");
const previousPageButton = document.getElementById("previousPageButton");
const nextPageButton = document.getElementById("nextPageButton");
const pageCorner = document.getElementById("pageCorner");
const turningPage = document.getElementById("turningPage");

const activeCompassSelect = document.getElementById("activeCompassSelect");
const toggleCompassButton = document.getElementById("toggleCompassButton");
const compassDrawer = document.getElementById("compassDrawer");
const closeCompassButton = document.getElementById("closeCompassButton");
const compassIconInput = document.getElementById("compassIconInput");
const compassNameInput = document.getElementById("compassNameInput");
const compassDescriptionInput = document.getElementById("compassDescriptionInput");
const lifeAreasInput = document.getElementById("lifeAreasInput");
const equationText = document.getElementById("equationText");
const equationPartList = document.getElementById("equationPartList");
const addEquationPartButton = document.getElementById("addEquationPartButton");
const resetStarterEquationButton = document.getElementById("resetStarterEquationButton");
const saveCompassButton = document.getElementById("saveCompassButton");
const createCompassButton = document.getElementById("createCompassButton");
const deleteCompassButton = document.getElementById("deleteCompassButton");

const searchInput = document.getElementById("searchInput");
const entryList = document.getElementById("entryList");
const entryCount = document.getElementById("entryCount");

const entryForm = document.getElementById("entryForm");
const titleInput = document.getElementById("titleInput");
const dateInput = document.getElementById("dateInput");
const tagsInput = document.getElementById("tagsInput");
const contentInput = document.getElementById("contentInput");
const mediaFileInput = document.getElementById("mediaFileInput");
const mediaList = document.getElementById("mediaList");

const wordCount = document.getElementById("wordCount");
const charCount = document.getElementById("charCount");
const lastSaved = document.getElementById("lastSaved");
const deleteEntryButton = document.getElementById("deleteEntryButton");

const todayStamp = document.getElementById("todayStamp");
const previewTitle = document.getElementById("previewTitle");
const previewDate = document.getElementById("previewDate");
const previewTags = document.getElementById("previewTags");
const previewContent = document.getElementById("previewContent");
const previewMediaList = document.getElementById("previewMediaList");

const toast = document.getElementById("toast");

let entries = [];
let compasses = [];
let activeEntryId = null;
let activeCompassId = null;
let compassDraft = null;
let activeMedia = [];

let dragState = {
  isDragging: false,
  startX: 0,
  progress: 0
};

init();

function init() {
  todayStamp.textContent = formatDisplayDate(getToday());

  compasses = loadCompasses();
  activeCompassId = localStorage.getItem(ACTIVE_COMPASS_KEY) || compasses[0].id;

  if (!compasses.some((compass) => compass.id === activeCompassId)) {
    activeCompassId = compasses[0].id;
  }

  entries = loadEntries();

  renderCompassSelect();
  loadCompassDraft(activeCompassId);
  renderCompassBuilder();
  renderEntryList();

  if (entries.length > 0) {
    loadEntry(entries[0].id);
  } else {
    startNewEntry(false);
  }

  setupEvents();
}

function setupEvents() {
  frontCover.addEventListener("click", openJournal);
  openJournalButton.addEventListener("click", openJournal);

  newEntryButton.addEventListener("click", () => {
    startNewEntry(true);
  });

  previousPageButton.addEventListener("click", () => {
    moveThroughEntries(-1);
  });

  nextPageButton.addEventListener("click", () => {
    moveThroughEntries(1);
  });

  searchInput.addEventListener("input", renderEntryList);

  activeCompassSelect.addEventListener("change", () => {
    activeCompassId = activeCompassSelect.value;
    localStorage.setItem(ACTIVE_COMPASS_KEY, activeCompassId);
    loadCompassDraft(activeCompassId);
    renderCompassBuilder();
    showToast("Active Compass changed.");
  });

  toggleCompassButton.addEventListener("click", () => {
    compassDrawer.hidden = !compassDrawer.hidden;
  });

  closeCompassButton.addEventListener("click", () => {
    compassDrawer.hidden = true;
  });

  compassIconInput.addEventListener("input", updateCompassDraftFromInputs);
  compassNameInput.addEventListener("input", updateCompassDraftFromInputs);
  compassDescriptionInput.addEventListener("input", updateCompassDraftFromInputs);
  lifeAreasInput.addEventListener("input", updateCompassDraftFromInputs);

  addEquationPartButton.addEventListener("click", addEquationPart);
  resetStarterEquationButton.addEventListener("click", resetStarterEquation);
  saveCompassButton.addEventListener("click", saveCompassDraft);
  createCompassButton.addEventListener("click", createNewCompass);
  deleteCompassButton.addEventListener("click", deleteActiveCompass);

  equationPartList.addEventListener("input", handleEquationPartInput);
  equationPartList.addEventListener("click", handleEquationPartClick);

  entryForm.addEventListener("input", () => {
    updateCounts();
    updatePreview();
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

    loadEntry(card.dataset.id);
    openJournal();
  });

  mediaFileInput.addEventListener("change", handleMediaUpload);

  mediaList.addEventListener("click", handleRemoveMedia);

  pageCorner.addEventListener("pointerdown", startPageDrag);
  window.addEventListener("pointermove", movePageDrag);
  window.addEventListener("pointerup", endPageDrag);
}

/* OPEN JOURNAL + PAGE TURN */

function openJournal() {
  bookShell.classList.remove("closed");
  bookShell.classList.add("open");
  openJournalButton.textContent = "Journal Open";
}

function startPageDrag(event) {
  openJournal();

  dragState.isDragging = true;
  dragState.startX = event.clientX;
  dragState.progress = 0;

  turningPage.classList.add("active");

  if (pageCorner.setPointerCapture) {
    pageCorner.setPointerCapture(event.pointerId);
  }
}

function movePageDrag(event) {
  if (!dragState.isDragging) {
    return;
  }

  const distance = dragState.startX - event.clientX;
  const progress = clamp(distance / 260, 0, 1);

  dragState.progress = progress;

  const rotation = progress * -176;
  turningPage.style.transform = `rotateY(${rotation}deg) translateZ(38px)`;
}

function endPageDrag() {
  if (!dragState.isDragging) {
    return;
  }

  dragState.isDragging = false;

  if (dragState.progress > 0.65) {
    turningPage.style.transform = "rotateY(-180deg) translateZ(38px)";

    setTimeout(() => {
      moveThroughEntries(1);
      resetTurningPage();
    }, 230);
  } else {
    resetTurningPage();
  }
}

function resetTurningPage() {
  turningPage.classList.remove("active");
  turningPage.style.transform = "rotateY(0deg) translateZ(38px)";
  dragState.progress = 0;
}

function moveThroughEntries(direction) {
  if (entries.length === 0) {
    startNewEntry(true);
    return;
  }

  const sortedEntries = [...entries].sort((a, b) => {
    return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
  });

  let currentIndex = sortedEntries.findIndex((entry) => {
    return String(entry.id) === String(activeEntryId);
  });

  if (currentIndex === -1) {
    currentIndex = 0;
  }

  let nextIndex = currentIndex + direction;

  if (nextIndex < 0) {
    nextIndex = sortedEntries.length - 1;
  }

  if (nextIndex >= sortedEntries.length) {
    nextIndex = 0;
  }

  loadEntry(sortedEntries[nextIndex].id);
  showToast("Page turned.");
}

/* COMPASS */

function createDefaultCompass() {
  return {
    id: "self-improvement-compass",
    icon: "🧭",
    name: "Self-Improvement Compass",
    description:
      "A guided journal system for checking in with the 12 areas of life, facing the truth, and choosing one grounded next step.",
    lifeAreas: [...defaultLifeAreas],
    equationParts: cloneData(defaultEquationParts),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function loadCompasses() {
  const savedCompasses = localStorage.getItem(COMPASS_STORAGE_KEY);

  if (!savedCompasses) {
    const starterCompass = createDefaultCompass();
    localStorage.setItem(COMPASS_STORAGE_KEY, JSON.stringify([starterCompass]));
    return [starterCompass];
  }

  try {
    const parsedCompasses = JSON.parse(savedCompasses);

    if (!Array.isArray(parsedCompasses) || parsedCompasses.length === 0) {
      return [createDefaultCompass()];
    }

    return parsedCompasses;
  } catch (error) {
    console.error(error);
    return [createDefaultCompass()];
  }
}

function saveCompasses() {
  localStorage.setItem(COMPASS_STORAGE_KEY, JSON.stringify(compasses));
}

function renderCompassSelect() {
  activeCompassSelect.innerHTML = "";

  compasses.forEach((compass) => {
    const option = document.createElement("option");
    option.value = compass.id;
    option.textContent = `${compass.icon || "🧭"} ${compass.name}`;
    activeCompassSelect.appendChild(option);
  });

  activeCompassSelect.value = activeCompassId;
}

function getActiveCompass() {
  return compasses.find((compass) => compass.id === activeCompassId) || compasses[0];
}

function loadCompassDraft(compassId) {
  const compass = compasses.find((item) => item.id === compassId) || compasses[0];
  compassDraft = cloneData(compass);
}

function renderCompassBuilder() {
  if (!compassDraft) {
    return;
  }

  compassIconInput.value = compassDraft.icon || "🧭";
  compassNameInput.value = compassDraft.name || "";
  compassDescriptionInput.value = compassDraft.description || "";
  lifeAreasInput.value = (compassDraft.lifeAreas || []).join("\n");

  renderEquationText();
  renderEquationParts();
}

function updateCompassDraftFromInputs() {
  compassDraft.icon = compassIconInput.value.trim() || "🧭";
  compassDraft.name = compassNameInput.value.trim() || "Untitled Compass";
  compassDraft.description = compassDescriptionInput.value.trim();

  compassDraft.lifeAreas = lifeAreasInput.value
    .split("\n")
    .map((area) => area.trim())
    .filter(Boolean);

  renderEquationText();
}

function renderEquationText() {
  const names = compassDraft.equationParts
    .map((part) => part.name.trim())
    .filter(Boolean);

  equationText.textContent = names.length
    ? `${names.join(" + ")} = ${compassDraft.name}`
    : `Custom Parts = ${compassDraft.name}`;
}

function renderEquationParts() {
  equationPartList.innerHTML = "";

  compassDraft.equationParts.forEach((part, index) => {
    const card = document.createElement("section");
    card.className = "equation-part";
    card.dataset.id = part.id;

    card.innerHTML = `
      <div class="equation-part-top">
        <span class="equation-part-number">${index + 1}</span>

        <div class="part-buttons">
          <button class="move-part-up" type="button">↑</button>
          <button class="move-part-down" type="button">↓</button>
          <button class="remove-part" type="button">Delete</button>
        </div>
      </div>

      <label>
        Part Name
        <input class="part-name-input" type="text" value="${escapeAttribute(part.name)}" />
      </label>

      <label>
        Prompt Question
        <textarea class="part-prompt-input" rows="2">${escapeHTML(part.prompt)}</textarea>
      </label>

      <label>
        Helper Text
        <textarea class="part-helper-input" rows="2">${escapeHTML(part.helper || "")}</textarea>
      </label>
    `;

    equationPartList.appendChild(card);
  });
}

function handleEquationPartInput(event) {
  const card = event.target.closest(".equation-part");

  if (!card) {
    return;
  }

  const part = compassDraft.equationParts.find((item) => item.id === card.dataset.id);

  if (!part) {
    return;
  }

  if (event.target.classList.contains("part-name-input")) {
    part.name = event.target.value;
  }

  if (event.target.classList.contains("part-prompt-input")) {
    part.prompt = event.target.value;
  }

  if (event.target.classList.contains("part-helper-input")) {
    part.helper = event.target.value;
  }

  renderEquationText();
}

function handleEquationPartClick(event) {
  const card = event.target.closest(".equation-part");

  if (!card) {
    return;
  }

  const index = compassDraft.equationParts.findIndex((part) => {
    return part.id === card.dataset.id;
  });

  if (index === -1) {
    return;
  }

  if (event.target.classList.contains("move-part-up") && index > 0) {
    const currentPart = compassDraft.equationParts[index];
    compassDraft.equationParts.splice(index, 1);
    compassDraft.equationParts.splice(index - 1, 0, currentPart);
  }

  if (
    event.target.classList.contains("move-part-down") &&
    index < compassDraft.equationParts.length - 1
  ) {
    const currentPart = compassDraft.equationParts[index];
    compassDraft.equationParts.splice(index, 1);
    compassDraft.equationParts.splice(index + 1, 0, currentPart);
  }

  if (event.target.classList.contains("remove-part")) {
    if (compassDraft.equationParts.length === 1) {
      showToast("A Compass needs at least one equation part.");
      return;
    }

    compassDraft.equationParts.splice(index, 1);
  }

  renderEquationText();
  renderEquationParts();
}

function addEquationPart() {
  compassDraft.equationParts.push({
    id: createId(),
    name: "New Part",
    prompt: "What do I need to reflect on here?",
    helper: "Customize this question."
  });

  renderEquationText();
  renderEquationParts();
  showToast("New equation part added.");
}

function resetStarterEquation() {
  const confirmed = confirm("Reset this Compass back to the starter self-improvement equation?");

  if (!confirmed) {
    return;
  }

  compassDraft.icon = "🧭";
  compassDraft.name = "Self-Improvement Compass";
  compassDraft.description =
    "A guided journal system for checking in with the 12 areas of life, facing the truth, and choosing one grounded next step.";
  compassDraft.lifeAreas = [...defaultLifeAreas];
  compassDraft.equationParts = cloneData(defaultEquationParts);

  renderCompassBuilder();
  showToast("Starter equation restored.");
}

function saveCompassDraft() {
  updateCompassDraftFromInputs();

  compassDraft.updatedAt = new Date().toISOString();

  const existingIndex = compasses.findIndex((compass) => compass.id === compassDraft.id);

  if (existingIndex >= 0) {
    compasses[existingIndex] = cloneData(compassDraft);
  } else {
    compasses.push(cloneData(compassDraft));
  }

  activeCompassId = compassDraft.id;
  localStorage.setItem(ACTIVE_COMPASS_KEY, activeCompassId);

  saveCompasses();
  renderCompassSelect();

  showToast("Compass saved.");
}

function createNewCompass() {
  compassDraft = {
    id: createId(),
    icon: "✨",
    name: "Custom Compass",
    description: "A custom journal Compass built from my own reflection equation.",
    lifeAreas: [...defaultLifeAreas],
    equationParts: cloneData(defaultEquationParts),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  compasses.push(cloneData(compassDraft));
  activeCompassId = compassDraft.id;
  localStorage.setItem(ACTIVE_COMPASS_KEY, activeCompassId);

  saveCompasses();
  renderCompassSelect();
  renderCompassBuilder();

  showToast("New Compass created.");
}

function deleteActiveCompass() {
  if (compasses.length === 1) {
    showToast("You need at least one Compass.");
    return;
  }

  const confirmed = confirm("Delete this Compass? Existing journal pages will stay saved.");

  if (!confirmed) {
    return;
  }

  compasses = compasses.filter((compass) => compass.id !== activeCompassId);
  activeCompassId = compasses[0].id;
  localStorage.setItem(ACTIVE_COMPASS_KEY, activeCompassId);

  saveCompasses();
  renderCompassSelect();
  loadCompassDraft(activeCompassId);
  renderCompassBuilder();

  showToast("Compass deleted.");
}

/* JOURNAL ENTRIES */

function buildCompassTemplate(compass) {
  const lines = [];

  lines.push(`# ${compass.name} Entry`);
  lines.push("");

  if (compass.description) {
    lines.push(`> ${compass.description}`);
    lines.push("");
  }

  if (compass.lifeAreas && compass.lifeAreas.length > 0) {
    lines.push("## 12 Areas of Life");
    lines.push(compass.lifeAreas.join(", "));
    lines.push("");
  }

  compass.equationParts.forEach((part) => {
    lines.push(`## ${part.name}`);
    lines.push(part.prompt);

    if (part.helper) {
      lines.push("");
      lines.push(`_${part.helper}_`);
    }

    lines.push("");
  });

  return lines.join("\n");
}

function loadEntries() {
  const savedEntries = localStorage.getItem(ENTRY_STORAGE_KEY);

  if (!savedEntries) {
    const starterEntry = createStarterEntry(getActiveCompass());
    localStorage.setItem(ENTRY_STORAGE_KEY, JSON.stringify([starterEntry]));
    return [starterEntry];
  }

  try {
    const parsedEntries = JSON.parse(savedEntries);

    if (!Array.isArray(parsedEntries)) {
      return [];
    }

    return parsedEntries;
  } catch (error) {
    console.error(error);
    return [];
  }
}

function createStarterEntry(compass) {
  const now = new Date().toISOString();

  return {
    id: createId(),
    title: "First Self-Improvement Page",
    date: getToday(),
    tags: "Self Improvement, Reflection, Compass",
    compassId: compass.id,
    compassName: compass.name,
    content: buildCompassTemplate(compass),
    media: [],
    createdAt: now,
    updatedAt: now
  };
}

function saveEntries() {
  try {
    localStorage.setItem(ENTRY_STORAGE_KEY, JSON.stringify(entries));
    return true;
  } catch (error) {
    console.error(error);
    showToast("Storage is full. Remove large media and try again.");
    return false;
  }
}

function startNewEntry(showMessage) {
  const compass = getActiveCompass();

  activeEntryId = null;
  activeMedia = [];

  titleInput.value = "";
  dateInput.value = getToday();
  tagsInput.value = compass.name;
  contentInput.value = buildCompassTemplate(compass);

  lastSaved.textContent = "Not saved yet";
  deleteEntryButton.disabled = true;

  renderEntryList();
  updateCounts();
  updatePreview();
  renderMediaLists();

  if (showMessage) {
    showToast("New Compass-guided page opened.");
  }

  openJournal();
  titleInput.focus();
}

function saveEntry() {
  const title = titleInput.value.trim() || "Untitled Entry";
  const now = new Date().toISOString();
  const compass = getActiveCompass();

  if (activeEntryId) {
    entries = entries.map((entry) => {
      if (String(entry.id) !== String(activeEntryId)) {
        return entry;
      }

      return {
        ...entry,
        title,
        date: dateInput.value || getToday(),
        tags: tagsInput.value.trim(),
        content: contentInput.value.trim(),
        compassId: compass.id,
        compassName: compass.name,
        media: activeMedia,
        updatedAt: now
      };
    });
  } else {
    const newEntry = {
      id: createId(),
      title,
      date: dateInput.value || getToday(),
      tags: tagsInput.value.trim(),
      content: contentInput.value.trim(),
      compassId: compass.id,
      compassName: compass.name,
      media: activeMedia,
      createdAt: now,
      updatedAt: now
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

  lastSaved.textContent = `Last saved at ${formatTime(entry.updatedAt || entry.createdAt)}`;
  deleteEntryButton.disabled = false;

  renderEntryList();
  updateCounts();
  updatePreview();
  renderMediaLists();
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
    loadEntry(entries[0].id);
  } else {
    startNewEntry(false);
  }

  renderEntryList();
  showToast("Journal page deleted.");
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
        ${entry.compassName}
      `.toLowerCase();

      return searchableText.includes(searchTerm);
    })
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

  entryCount.textContent = filteredEntries.length;
  entryList.innerHTML = "";

  if (filteredEntries.length === 0) {
    entryList.innerHTML = `
      <div class="entry-card">
        <strong>No pages found</strong>
        <p>Try a different search or create a new Compass-guided page.</p>
      </div>
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
      .slice(0, 3)
      .map((tag) => `<span>${escapeHTML(tag)}</span>`)
      .join("");

    card.innerHTML = `
      <small>${formatDisplayDate(entry.date || getToday())}</small>
      <strong>${escapeHTML(entry.title || "Untitled Entry")}</strong>
      <p>${escapeHTML(getExcerpt(entry.content || ""))}</p>

      <div class="entry-card-tags">
        ${tags || "<span>No tags</span>"}
      </div>
    `;

    entryList.appendChild(card);
  });
}

/* PREVIEW */

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
    : `<h1>${escapeHTML(title)}</h1><p>Start writing and your finished page will appear here.</p>`;
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

/* MEDIA */

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

/* HELPERS */

function getTagsArray(tagsText) {
  return String(tagsText)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function getExcerpt(content) {
  const plainText = String(content)
    .replaceAll("#", "")
    .replaceAll("*", "")
    .replaceAll("`", "")
    .replaceAll(">", "")
    .replaceAll("-", "")
    .trim();

  if (plainText.length <= 88) {
    return plainText || "Empty journal page";
  }

  return `${plainText.slice(0, 88)}...`;
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

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
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
