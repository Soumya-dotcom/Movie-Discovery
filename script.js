// --- NETWORK DATA HUB CONFIGURATION ---
var movies = []; 

// TODO: Paste your secure v3 text key right inside the empty string quotes below
const API_KEY = "fffa8cf32c1c5bb9cdfc864a1c48a7f7"; 
const API_URL = `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&sort_by=popularity.desc&vote_count.gte=150&page=1`;
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

const GENRE_MAP = {
    28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
    99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
    27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Sci-Fi",
    10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western"
};

// GLOBAL RETRIEVAL HANDSHAKE ENGINE
async function loadMovieCatalog() {
    var movieListContainer = document.getElementById("movieList");
    if (!movieListContainer) return; 

    movieListContainer.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 0; color: var(--text-muted);">
            <div style="border: 4px solid rgba(255,255,255,0.1); border-left-color: var(--brand-accent); border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px auto;"></div>
            <p>Curating global cinema catalog channels...</p>
        </div>
    `;

    try {
        var response = await fetch(API_URL);
        if (!response.ok) throw new Error("Catalog synchronization failure.");
        
        var data = await response.json();
        
        movies = data.results.map(function(item) {
            return {
                title: item.title,
                year: item.release_date ? item.release_date.split("-")[0] : "N/A",
                genre: item.genre_ids.map(id => GENRE_MAP[id] || "Cinema"),
                rating: item.vote_average,
                language: item.original_language.toUpperCase(), 
                poster: item.poster_path ? (IMAGE_BASE_URL + item.poster_path) : "https://via.placeholder.com/500x750?text=No+Poster",
                description: item.overview
            };
        });

        initializeRouting();

    } catch (error) {
        movieListContainer.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--brand-red);">
                <h3>⚠️ Global Archive Retrieval Fault</h3>
                <p>Unable to connect securely to TMDB streaming endpoints. Verify your token setup.</p>
            </div>
        `;
    }
}

function initializeRouting() {
    // Standardizes the path check to prevent absolute URI errors
    var currentPath = window.location.pathname.toLowerCase();

    if (currentPath.includes("trending.html")) {
        var trendingMovies = movies.filter(function(m) { return m.rating >= 7.5; });
        trendingMovies.sort(function(a, b) { return b.rating - a.rating; });
        showMovies(trendingMovies);
    } else if (currentPath.includes("movie-details.html")) {
        // Safe check if render function exists
        if (typeof renderMovieDetails === 'function') {
            renderMovieDetails();
        }
    } else if (currentPath.includes("watchlist.html")) {
        if (typeof renderWatchlist === 'function') {
            renderWatchlist();
        }
    } else {
        // Default fall-through back to index homepage layout channel
        showMovies(movies);
    }
}

function showMovies(movieArray) {
    var movieList = document.getElementById("movieList");
    if (!movieList) return; 
    
    movieList.innerHTML = "";

    if (movieArray.length === 0) {
        movieList.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
                <h3>No movies match your current parameters.</h3>
                <p>Try resetting filters or changing terms.</p>
            </div>
        `;
        return;
    }

    for (var i = 0; i < movieArray.length; i++) {
        var movie = movieArray[i];
        var starText = "\u2605".repeat(Math.round(movie.rating / 2));
        var safePayload = encodeURIComponent(JSON.stringify(movie));

        movieList.innerHTML += `
            <a href="movie-details.html" onclick="saveActiveMovie('${safePayload}')" class="movie-card" aria-label="View Info for ${movie.title}">
                <img class="poster" src="${movie.poster}" alt="${movie.title} poster image">
                <div class="card-info">
                    <h3>${movie.title}</h3>
                    <p>Year: ${movie.year}</p>
                    <p class="stars">${starText} (${movie.rating.toFixed(1)})</p>
                </div>
            </a>
        `;
    }
}

function saveActiveMovie(movieDataJson) {
    localStorage.setItem('activeMovieContext', decodeURIComponent(movieDataJson));
}

// LIVE FILTER AND EVENT HOOKS
var searchBox = document.getElementById("searchBox");
var genreSelect = document.getElementById("genreSelect");

if (searchBox) searchBox.addEventListener("input", filterMovies);
if (genreSelect) genreSelect.addEventListener("change", filterMovies);

function filterMovies() {
    var searchText = searchBox.value.toLowerCase().trim();
    var selectedGenre = genreSelect.value;
    var results = [];

    for (var i = 0; i < movies.length; i++) {
        var movie = movies[i];
        var titleMatches = movie.title.toLowerCase().includes(searchText);
        var genreMatches = (selectedGenre === "All" || movie.genre.some(function(g) {
            return g.trim() === selectedGenre.trim();
        }));

        if (titleMatches && genreMatches) {
            results.push(movie);
        }
    }
    showMovies(results);
}

// --- DETAILS PAGE ENGINE RENDERING ---
function renderMovieDetails() {
    var wrapper = document.getElementById("movieDetailsWrapper");
    if (!wrapper) return;

    var rawData = localStorage.getItem('activeMovieContext');
    if (!rawData) {
        wrapper.innerHTML = `
            <div style="text-align: center; color: var(--brand-red); padding: 40px;">
                <h2>⚠️ Context Missing</h2>
                <p>No movie context selected. Please return home and select a profile card.</p>
                <a href="index.html" class="btn btn-primary" style="margin-top:20px;">Go Home</a>
            </div>
        `;
        return;
    }

    var movie = JSON.parse(rawData);
    var currentWatchlist = JSON.parse(localStorage.getItem('userWatchlist')) || [];
    var isSaved = currentWatchlist.some(function(item) { return item.title === movie.title; });
    
    var btnText = isSaved ? "Remove from Watchlist" : "Add to Watchlist";
    var btnClass = isSaved ? "btn btn-danger" : "btn btn-primary";

    wrapper.innerHTML = `
        <div class="details-grid">
            <div>
                <img src="${movie.poster}" alt="${movie.title} image" class="large-poster">
            </div>
            <div class="details-info-zone">
                <h1>${movie.title} (${movie.year})</h1>
                <div class="meta-tags">
                    <span class="tag">${movie.language}</span>
                    <span class="tag">${movie.genre.join(", ")}</span>
                </div>
                <p class="rating-display">★ Rating: <strong>${movie.rating.toFixed(1)} / 10</strong></p>
                <h3 style="margin-bottom:10px;">Overview</h3>
                <p class="overview-text">${movie.description || "No description provided."}</p>
                <button onclick="toggleWatchlist()" id="watchlistBtn" class="${btnClass}">${btnText}</button>
            </div>
        </div>
    `;
}

function toggleWatchlist() {
    var rawData = localStorage.getItem('activeMovieContext');
    if (!rawData) return;
    
    var movie = JSON.parse(rawData);
    var currentWatchlist = JSON.parse(localStorage.getItem('userWatchlist')) || [];
    var existingIndex = currentWatchlist.findIndex(function(item) { return item.title === movie.title; });
    var btn = document.getElementById("watchlistBtn");

    if (existingIndex > -1) {
        currentWatchlist.splice(existingIndex, 1);
        if(btn) { btn.textContent = "Add to Watchlist"; btn.className = "btn btn-primary"; }
    } else {
        currentWatchlist.push(movie);
        if(btn) { btn.textContent = "Remove from Watchlist"; btn.className = "btn btn-danger"; }
    }
    localStorage.setItem('userWatchlist', JSON.stringify(currentWatchlist));
}

// --- WATCHLIST LAYOUT ARCHITECTURE ---
function renderWatchlist() {
    var watchlistGrid = document.getElementById("watchlistGrid");
    if (!watchlistGrid) return;

    var currentWatchlist = JSON.parse(localStorage.getItem('userWatchlist')) || [];
    watchlistGrid.innerHTML = "";

    if (currentWatchlist.length === 0) {
        watchlistGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 0; color: var(--text-muted);">
                <h3>Your Watchlist is empty.</h3>
                <p>Browse the catalog channels to add titles.</p>
                <a href="index.html" class="btn btn-primary" style="margin-top: 20px;">Browse Movies</a>
            </div>
        `;
        return;
    }

    for (var i = 0; i < currentWatchlist.length; i++) {
        var movie = currentWatchlist[i];
        var safePayload = encodeURIComponent(JSON.stringify(movie));
        
        watchlistGrid.innerHTML += `
            <div class="movie-card" style="position: relative;">
                <a href="movie-details.html" onclick="saveActiveMovie('${safePayload}')" style="text-decoration: none; color: inherit;">
                    <img class="poster" src="${movie.poster}" alt="${movie.title}">
                    <div class="card-info">
                        <h3>${movie.title}</h3>
                        <p>Year: ${movie.year}</p>
                        <p class="stars">${"\u2605".repeat(Math.round(movie.rating / 2))} (${movie.rating.toFixed(1)})</p>
                    </div>
                </a>
                <div style="padding: 0 16px 16px 16px;">
                    <button onclick="removeFromWatchlistByIndex(${i})" class="btn btn-danger" style="width: 100%; font-size: 0.85rem; padding: 8px 0;">Remove</button>
                </div>
            </div>
        `;
    }
}

function removeFromWatchlistByIndex(index) {
    var currentWatchlist = JSON.parse(localStorage.getItem('userWatchlist')) || [];
    currentWatchlist.splice(index, 1);
    localStorage.setItem('userWatchlist', JSON.stringify(currentWatchlist));
    renderWatchlist();
}

// Run initial server fetch execution
loadMovieCatalog();