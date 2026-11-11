
"use strict";

// MovieVault - Capstone II
// Version 1: Movie discovery and local collection

const API_URL = "https://itunes.apple.com/search";
const STORAGE_KEY = "movievault_library_v1";

const movieGrid = document.getElementById("movieGrid");
const statusMessage = document.getElementById("statusMessage");
const sectionTitle = document.getElementById("sectionTitle");
const resultsCount = document.getElementById("resultsCount");

const movieDialog = document.getElementById("movieDialog");
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");

let movies = [];
let currentView = "discover";
let selectedMovie = null;
let searchNumber = 0;

function loadLibrary() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

let library = loadLibrary();

function saveLibrary() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
  } catch {
    statusMessage.textContent =
      "Browser storage is unavailable. Your changes may not be saved.";
  }
}

function getRecord(movie) {
  return library[movie.id] || {
    ...movie,
    watchlist: false,
    watched: false,
    rating: 0
  };
}

function saveRecord(record) {
  if (!record.watchlist && !record.watched && !record.rating) {
    delete library[record.id];
  } else {
    library[record.id] = record;
  }

  saveLibrary();
  updateStats();
  renderMovies();
  updateMovieDetails();
}

function updateStats() {
  const records = Object.values(library);

  document.getElementById("watchlistCount").textContent =
    records.filter(movie => movie.watchlist).length;

  document.getElementById("watchedCount").textContent =
    records.filter(movie => movie.watched).length;

  document.getElementById("ratedCount").textContent =
    records.filter(movie => movie.rating > 0).length;
}

function normalizeMovie(item) {
  const date = new Date(item.releaseDate);
  const year = Number.isNaN(date.getTime())
    ? "Unknown year"
    : date.getFullYear();

  return {
    id: String(item.trackId),
    title: item.trackName || "Untitled Movie",
    year,
    genre: item.primaryGenreName || "Movie",
    description:
      item.longDescription ||
      item.shortDescription ||
      "No description is available for this movie.",
    poster: (item.artworkUrl100 || "")
      .replace("100x100bb", "600x600bb"),
    url: item.trackViewUrl || ""
  };
}

async function searchMovies(query) {
  const requestNumber = ++searchNumber;
  currentView = "discover";
  updateNavigation();

  sectionTitle.textContent = "Search Results";
  movieGrid.replaceChildren();
  statusMessage.textContent = "Searching for movies...";
  resultsCount.textContent = "";

  const params = new URLSearchParams({
    term: query,
    media: "movie",
    entity: "movie",
    country: "US",
    limit: "40"
  });

  try {
    const response = await fetch(`${API_URL}?${params}`);

    if (!response.ok) {
      throw new Error("Movie search failed");
    }

    const data = await response.json();

    // Ignore older searches that finish after newer searches.
    if (requestNumber !== searchNumber) return;

    const uniqueMovies = new Map();

    for (const item of data.results || []) {
      if (item.trackId && item.trackName) {
        const movie = normalizeMovie(item);
        uniqueMovies.set(movie.id, movie);
      }
    }

    movies = [...uniqueMovies.values()];
    statusMessage.textContent = "";
    renderMovies();

  } catch (error) {
    if (requestNumber !== searchNumber) return;

    console.error("Movie search error:", error);
    statusMessage.textContent =
      "Unable to load movies. Check your connection and try again.";
  }
}

function updateNavigation() {
  document.querySelectorAll(".nav-btn").forEach(button => {
    const active = button.dataset.view === currentView;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function changeView(view) {
  currentView = view;
  updateNavigation();
  statusMessage.textContent = "";
  renderMovies();
}

function createMovieCard(movie) {
  const record = getRecord(movie);

  const card = document.createElement("button");
  card.type = "button";
  card.className = "movie-card";

  const posterWrap = document.createElement("div");
  posterWrap.className = "poster-wrap";

  if (movie.poster) {
    const poster = document.createElement("img");
    poster.src = movie.poster;
    poster.alt = `${movie.title} poster`;
    poster.loading = "lazy";
    poster.onerror = () => poster.remove();
    posterWrap.appendChild(poster);
  }

  if (record.watched || record.watchlist) {
    const badge = document.createElement("span");
    badge.className = "movie-badge";
    badge.textContent = record.watched
      ? "✓ Watched"
      : "★ Watchlist";
    posterWrap.appendChild(badge);
  }

  const body = document.createElement("div");
  body.className = "movie-card-body";

  const title = document.createElement("h3");
  title.textContent = movie.title;

  const meta = document.createElement("p");
  meta.textContent = `${movie.year} • ${movie.genre}`;

  body.append(title, meta);
  card.append(posterWrap, body);

  card.addEventListener("click", () => openMovie(movie));

  return card;
}

function renderMovies() {
  movieGrid.replaceChildren();

  let displayedMovies = [];

  if (currentView === "watchlist") {
    sectionTitle.textContent = "My Watchlist";
    displayedMovies = Object.values(library)
      .filter(movie => movie.watchlist);
  } else if (currentView === "watched") {
    sectionTitle.textContent = "Watched Movies";
    displayedMovies = Object.values(library)
      .filter(movie => movie.watched);
  } else {
    sectionTitle.textContent = "Discover Movies";
    displayedMovies = movies;
  }

  resultsCount.textContent =
    `${displayedMovies.length} movie${displayedMovies.length === 1 ? "" : "s"}`;

  if (displayedMovies.length === 0) {
    const empty = document.createElement("p");
    empty.className = "status-message";

    if (currentView === "watchlist") {
      empty.textContent =
        "Your watchlist is empty. Discover movies to add some!";
    } else if (currentView === "watched") {
      empty.textContent =
        "You haven't marked any movies as watched yet.";
    } else {
      empty.textContent =
        "No movies found. Try searching for another title.";
    }

    movieGrid.appendChild(empty);
    return;
  }

  for (const movie of displayedMovies) {
    movieGrid.appendChild(createMovieCard(movie));
  }
}

function openMovie(movie) {
  selectedMovie = movie;

  document.getElementById("detailTitle").textContent = movie.title;

  document.getElementById("detailMeta").textContent =
    `${movie.year} • ${movie.genre}`;

  document.getElementById("detailDescription").textContent =
    movie.description;

  const poster = document.getElementById("detailPoster");
  poster.src = movie.poster;
  poster.alt = `${movie.title} poster`;
  poster.hidden = !movie.poster;
  poster.onerror = () => {
    poster.hidden = true;
  };

  const link = document.getElementById("detailLink");
  link.href = movie.url || "#";
  link.hidden = !movie.url;

  updateMovieDetails();
  movieDialog.showModal();
}

function updateMovieDetails() {
  if (!selectedMovie) return;

  const record = getRecord(selectedMovie);

  document.getElementById("watchlistButton").textContent =
    record.watchlist
      ? "✓ Remove from Watchlist"
      : "+ Add to Watchlist";

  document.getElementById("watchedButton").textContent =
    record.watched
      ? "✓ Mark as Unwatched"
      : "Mark as Watched";

  document.getElementById("ratingInput").value =
    String(record.rating || 0);
}

document.getElementById("watchlistButton")
  .addEventListener("click", () => {
    if (!selectedMovie) return;

    const record = getRecord(selectedMovie);
    record.watchlist = !record.watchlist;

    if (record.watchlist) {
      record.watched = false;
      record.rating = 0;
    }

    saveRecord(record);
  });

document.getElementById("watchedButton")
  .addEventListener("click", () => {
    if (!selectedMovie) return;

    const record = getRecord(selectedMovie);
    record.watched = !record.watched;

    if (record.watched) {
      record.watchlist = false;
    } else {
      record.rating = 0;
    }

    saveRecord(record);
  });

document.getElementById("ratingInput")
  .addEventListener("change", event => {
    if (!selectedMovie) return;

    const record = getRecord(selectedMovie);
    record.rating = Number(event.target.value);

    if (record.rating > 0) {
      record.watched = true;
      record.watchlist = false;
    }

    saveRecord(record);
  });

document.getElementById("closeDialog")
  .addEventListener("click", () => movieDialog.close());

movieDialog.addEventListener("click", event => {
  if (event.target === movieDialog) {
    movieDialog.close();
  }
});

searchForm.addEventListener("submit", event => {
  event.preventDefault();

  const query = searchInput.value.trim();

  if (query) {
    searchMovies(query);
  }
});

document.querySelectorAll(".nav-btn").forEach(button => {
  button.addEventListener("click", () => {
    changeView(button.dataset.view);
  });
});

// Start the website with an initial movie search.
updateStats();
searchMovies("Avengers");
