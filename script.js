// Global states to keep track of our fetched movies and the user's active page number
var movies = []; 
var currentPage = 1;

// TODO: Paste your secure alphanumeric v3 text key right inside the quotes below
const API_KEY = "fffa8cf32c1c5bb9cdfc864a1c48a7f7"; 

// This helper function pieces together our API request URL dynamically. 
const getApiUrl = (page, langIso = "") => {
    let url = `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&sort_by=popularity.desc&vote_count.gte=50&page=${page}`;
    if (langIso && langIso !== "All") {
        url += `&with_original_language=${langIso.toLowerCase()}`;
    }
    return url;
};

// TMDB stores images separately on their CDN, so we prefix this base path to load the poster images
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

// TMDB returns genre data as numbers (IDs). We map those IDs to readable names here.
const GENRE_MAP = {
    28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
    99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
    27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Sci-Fi",
    10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western"
};

// The main engine that talks to the live TMDB database.
async function loadMovieCatalog(pageNumber = 1, appendData = false) {
    var movieListContainer = document.getElementById("movieList");
    if (!movieListContainer) return; 

    var languageSelect = document.getElementById("languageSelect");
    
    // PERSISTENCE STEP: On fresh home page loads, look up if a preferred language choice exists in storage memory
    if (languageSelect && !appendData && pageNumber === 1) {
        var savedLanguage = localStorage.getItem('userSelectedLanguage');
        if (savedLanguage) {
            languageSelect.value = savedLanguage;
        }
    }
    
    var activeLang = (languageSelect && languageSelect.value) ? languageSelect.value : "All";

    // Show a clean loading animation to let the user know the network is processing
    if (!appendData) {
        movieListContainer.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 0; color: var(--text-muted);">
                <div style="border: 4px solid rgba(255,255,255,0.1); border-left-color: var(--brand-gold); border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px auto;"></div>
                <p>Curating global cinema catalog channels...</p>
            </div>
        `;
    }

    try {
        var response = await fetch(getApiUrl(pageNumber, activeLang));
        if (!response.ok) throw new Error("Catalog synchronization failure.");
        
        var data = await response.json();
        
        // Take the raw payload from TMDB and clean it up into a structure our app likes
        var fetchedMovies = data.results.map(function(item) {
            return {
                title: item.title,
                year: item.release_date ? item.release_date.split("-")[0] : "N/A",
                genre: item.genre_ids.map(id => GENRE_MAP[id] || "Cinema"),
                rating: item.vote_average,
                language: item.original_language.toUpperCase(), 
                poster: item.poster_path ? (IMAGE_BASE_URL + item.poster_path) : "https://via.placeholder.com/500x750?text=No+Poster",
                description: item.overview || "No description provided."
            };
        });

        // Add new movies to the existing array if paginating, otherwise set it fresh
        if (appendData) {
            movies = movies.concat(fetchedMovies);
        } else {
            movies = fetchedMovies;
        }

        // Render standard home list filters or trending filters based on active viewport
        var currentPath = window.location.pathname.toLowerCase();
        if (currentPath.includes("trending.html")) {
            renderTrendingList();
        } else {
            filterMovies(); 
        }

    } catch (error) {
        if(!appendData) {
            movieListContainer.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--brand-red);">
                    <h3>⚠️ Global Archive Retrieval Fault</h3>
                    <p>Unable to connect securely to TMDB streaming endpoints. Verify your token setup.</p>
                </div>
            `;
        }
    }
}

// --- MANUALLY CONTROLLED PAGINATION HANDLING ---
function loadNextPage() {
    var btn = document.getElementById("loadMoreBtn");
    if (btn) {
        btn.textContent = "Loading next channel...";
        btn.style.opacity = "0.7";
        btn.disabled = true;
    }

    currentPage += 1;
    
    loadMovieCatalog(currentPage, true).then(function() {
        if (btn) {
            btn.textContent = "Show More Movies";
            btn.style.opacity = "1";
            btn.disabled = false;
        }
    });
}

// Filters down the database to render globally high-rated films for trending view
function renderTrendingList() {
    var savedLanguage = localStorage.getItem('userSelectedLanguage') || "All";
    var trendingMovies = movies;
    
    if (savedLanguage !== "All") {
        trendingMovies = movies.filter(function(m) {
            return m.language === savedLanguage.toUpperCase();
        });
    }

    trendingMovies = trendingMovies.filter(function(m) { return m.rating >= 6.5; });
    trendingMovies.sort(function(a, b) { return b.rating - a.rating; });
    showMovies(trendingMovies);
}

// Loops through our movie array and renders cards with isolated bottom-right bookmarks and 5-star ratings
function showMovies(movieArray) {
    var movieList = document.getElementById("movieList");
    if (!movieList) return; 
    
    movieList.innerHTML = "";

    if (movieArray.length === 0) {
        movieList.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
                <h3>No movies match your current parameters.</h3>
                <p>Try resetting search filters or changing terms.</p>
            </div>
        `;
        return;
    }

    window.currentRenderedMovies = movieArray;
    var currentWatchlist = JSON.parse(localStorage.getItem('userWatchlist')) || [];

    movieArray.forEach(function(movie, index) {
        var ratingOutOfFive = movie.rating / 2;
        var starText = "\u2605".repeat(Math.round(ratingOutOfFive));
        
        var isBookmarked = currentWatchlist.some(function(item) { return item.title === movie.title; });
        var activeClass = isBookmarked ? "saved" : "";

        movieList.innerHTML += `
            <div class="movie-card" style="position: relative;">
                <!-- Link wrapper ONLY covers the image and main information space -->
                <a href="movie-details.html" style="text-decoration: none; color: inherit; display: block;" onclick="saveActiveMovieByIndex(${index})">
                    <img class="poster" src="${movie.poster}" alt="${movie.title} poster image">
                    
                    <div class="card-info" style="padding-bottom: 50px;"> <!-- Extra padding-bottom reserves space for metrics row -->
                        <h3>${movie.title}</h3>
                        <p>Year: ${movie.year} | Language: <strong>${movie.language}</strong></p>
                    </div>
                </a>
                
                <!-- FIXED STRUCTURE: Placed completely OUTSIDE the anchor link to prevent re-routing pages -->
                <div class="card-footer-metrics">
                    <span class="stars">${starText} (${ratingOutOfFive.toFixed(1)}/5)</span>
                    
                    <button class="quick-bookmark-btn ${activeClass}" onclick="handleQuickBookmark(event, ${index})" aria-label="Save to watchlist">
                        <svg viewBox="0 0 24 24">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    });
}

// Intercepts the grid card actions to handle fast watchlist saves without page re-routing
function handleQuickBookmark(event, index) {
    event.stopPropagation(); // Stops the anchor click from firing and opening the details view
    
    if (!window.currentRenderedMovies || !window.currentRenderedMovies[index]) return;
    var movie = window.currentRenderedMovies[index];
    
    var currentWatchlist = JSON.parse(localStorage.getItem('userWatchlist')) || [];
    var existingIndex = currentWatchlist.findIndex(function(item) { return item.title === movie.title; });
    
    // Target the specific button element that was clicked
    var btn = event.currentTarget;

    if (existingIndex > -1) {
        // Remove from list
        currentWatchlist.splice(existingIndex, 1);
        btn.classList.remove("saved");
    } else {
        // Add to list
        currentWatchlist.push(movie);
        btn.classList.add("saved");
    }
    
    localStorage.setItem('userWatchlist', JSON.stringify(currentWatchlist));
}
        
        

// When a user clicks a movie card, we isolate that specific movie index and cache it in the browser's memory
function saveActiveMovieByIndex(index) {
    if (window.currentRenderedMovies && window.currentRenderedMovies[index]) {
        var selectedMovie = window.currentRenderedMovies[index];
        localStorage.setItem('activeMovieContext', JSON.stringify(selectedMovie));
    }
}

// Hook up our event listeners to react instantly when a user types a name or picks a genre
var searchBox = document.getElementById("searchBox");
var genreSelect = document.getElementById("genreSelect");
var languageSelect = document.getElementById("languageSelect"); 

if (searchBox) searchBox.addEventListener("input", filterMovies);
if (genreSelect) genreSelect.addEventListener("change", filterMovies);

if (languageSelect) {
    languageSelect.addEventListener("change", function() {
        localStorage.setItem('userSelectedLanguage', languageSelect.value); 
        currentPage = 1; 
        loadMovieCatalog(currentPage, false);
    });
}

// Checks search and genre criteria at the same time to trim down our rendered grid view array
function filterMovies() {
    var searchText = (searchBox ? searchBox.value.toLowerCase().trim() : "");
    var selectedGenre = (genreSelect ? genreSelect.value : "All");
    var results = [];

    for (var i = 0; i < movies.length; i++) {
        var movie = movies[i];
        
        var titleMatches = movie.title.toLowerCase().includes(searchText);
        var genreMatches = (selectedGenre === "All" || movie.genre.includes(selectedGenre));

        if (titleMatches && genreMatches) {
            results.push(movie);
        }
    }
    showMovies(results);
}

// Reads the clicked movie profile data out of memory cache and generates the entire custom layout view on the details page
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
    
    // FIXED RATING MATH: Convert 10-point scale to match our clean 5-star dashboard format
    var detailsRatingOutOfFive = movie.rating / 2;
    
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
                    <span class="tag">Language: ${movie.language}</span>
                    <span class="tag">${movie.genre.join(", ")}</span>
                </div>
                
                <p class="rating-display">★ Rating: <strong>${detailsRatingOutOfFive.toFixed(1)} / 5.0</strong></p>
                
                <h3 style="margin-bottom:10px;">Overview</h3>
                <p class="overview-text">${movie.description}</p>
                <button onclick="toggleWatchlist()" id="watchlistBtn" class="${btnClass}">${btnText}</button>
            </div>
        </div>
    `;
}

// Toggles the movie inside our local persistent array when the user clicks the watchlist tracking button
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

// Pulls down the saved items array from local browser storage and displays them in a neat collection view grid
function renderWatchlist() {
    var watchlistGrid = document.getElementById("watchlistGrid");
    if (!watchlistGrid) return;

    var currentWatchlist = JSON.parse(localStorage.getItem('userWatchlist')) || [];
    watchlistGrid.innerHTML = "";

    if (currentWatchlist.length === 0) {
        watchlistGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; background: var(--bg-card); border-radius: 16px; border: 1px dashed rgba(229,184,66,0.25); max-width: 600px; margin: 40px auto; box-shadow: 0 8px 32px rgba(0,0,0,0.4);">
                <h3 style="color: var(--brand-gold); font-size: 1.4rem; margin-bottom: 12px; font-weight: 700;">No Movies in Watchlist</h3>
                <p style="color: var(--text-muted); margin-bottom: 25px; font-size: 0.95rem; line-height: 1.6;">You haven't bookmarked any global cinema profiles yet. Browse the home dashboard catalog channels to add titles.</p>
                <a href="index.html" class="btn btn-primary">Browse Movies</a>
            </div>
        `;
        return;
    }

    for (var i = 0; i < currentWatchlist.length; i++) {
        var movie = currentWatchlist[i];
        
        watchlistGrid.innerHTML += `
            <div class="movie-card" style="position: relative;">
                <a href="movie-details.html" style="text-decoration: none; color: inherit;">
                    <img class="poster" src="${movie.poster}" alt="${movie.title}">
                    <div class="card-info">
                        <h3>${movie.title}</h3>
                        <p>Year: ${movie.year} | Lang: ${movie.language}</p>
                        <p class="stars">${"\u2605".repeat(Math.round(movie.rating / 2))} (${movie.rating.toFixed(1)})</p>
                    </div>
                </a>
                <div style="padding: 0 16px 16px 16px;">
                    <button class="btn btn-danger" style="width: 100%; font-size: 0.85rem; padding: 8px 0;">Remove</button>
                </div>
            </div>
        `;
        
        var cardNode = watchlistGrid.lastElementChild;
        cardNode.querySelector("a").setAttribute("onclick", `saveActiveWatchlistMovie(${i})`);
        cardNode.querySelector("button").setAttribute("onclick", `removeFromWatchlistByIndex(${i})`);
    }
}

function saveActiveWatchlistMovie(index) {
    var currentWatchlist = JSON.parse(localStorage.getItem('userWatchlist')) || [];
    if(currentWatchlist[index]) {
        localStorage.setItem('activeMovieContext', JSON.stringify(currentWatchlist[index]));
    }
}

function removeFromWatchlistByIndex(index) {
    var currentWatchlist = JSON.parse(localStorage.getItem('userWatchlist')) || [];
    currentWatchlist.splice(index, 1);
    localStorage.setItem('userWatchlist', JSON.stringify(currentWatchlist));
    renderWatchlist();
}

// --- BULLETPROOF ROUTER STARTUP FRAMEWORK ---
function startApplication() {
    var currentPath = window.location.pathname.toLowerCase();

    if (currentPath.includes("movie-details.html")) {
        // Runs text injection immediately without fetching TMDB grids
        renderMovieDetails();
    } else if (currentPath.includes("watchlist.html")) {
        // Runs empty state or storage array lookup immediately
        renderWatchlist();
    } else {
        // Runs home catalog index rows setup automatically on launch
        loadMovieCatalog(1, false);
    }
}

// Initialize boot parameters
startApplication();