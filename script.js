// --- LIVE SERVER ARCHITECTURE HUB (NETFLIX STYLE MIX) ---
var movies = []; 

// 1. Secure configuration mapping setup
// Uses a temporary hardcoded string fallback for your local VS Code Live Server testing preview window
const API_KEY = "PASTE_YOUR_API_KEY_V3_HERE"; 
const API_URL = `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&sort_by=popularity.desc&vote_count.gte=150&page=1`;
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

const GENRE_MAP = {
    28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
    99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
    27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Sci-Fi",
    10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western"
};

// HEURISTIC #1 & #5: Async Network Engine & Status Loader
async function loadMovieCatalog() {
    var movieListContainer = document.getElementById("movieList");
    
    if (movieListContainer) {
        movieListContainer.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 0; color: var(--text-muted);">
                <div class="spinner" style="border: 4px solid rgba(255,255,255,0.1); border-left-color: var(--brand-accent); border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px auto;"></div>
                <p>Curating mixed global cinema catalog channels...</p>
            </div>
        `;
    }

    try {
        var response = await fetch(API_URL);
        if (!response.ok) throw new Error("Cloud catalog handshake sync anomaly detected");
        
        var data = await response.json();
        
        // Re-structure the network payload dynamically into our standard card format variables
        movies = data.results.map(function(serverMovie) {
            return {
                title: serverMovie.title,
                year: serverMovie.release_date ? serverMovie.release_date.split("-")[0] : "N/A",
                genre: serverMovie.genre_ids.map(id => GENRE_MAP[id] || "Cinema"),
                rating: serverMovie.vote_average,
                language: serverMovie.original_language.toUpperCase(), 
                poster: serverMovie.poster_path ? (IMAGE_BASE_URL + serverMovie.poster_path) : "https://via.placeholder.com/500x750?text=No+Poster",
                description: serverMovie.overview
            };
        });

        initializeRouting();

    } catch (error) {
        if (movieListContainer) {
            movieListContainer.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--brand-red);">
                    <h3>⚠️ Global Archive Retrieval Fault</h3>
                    <p>Unable to connect securely to TMDB streaming endpoints. Check your local token variables.</p>
                </div>
            `;
        }
    }
}

function initializeRouting() {
    var currentPath = window.location.pathname.split("/").pop();

    if (currentPath === "trending.html") {
        // Trending filters down to items with a high user review score dynamically
        var trendingMovies = movies.filter(function(m) { return m.rating >= 7.5; });
        trendingMovies.sort(function(a, b) { return b.rating - a.rating; });
        showMovies(trendingMovies);
    } else {
        showMovies(movies);
    }
}

function getStars(rating) {
    var starCount = Math.round(rating / 2);
    var starText = "";
    for (var i = 0; i < 5; i++) {
        starText += (i < starCount) ? "\u2605" : "\u2606";
    }
    return starText;
}

function showMovies(movieArray) {
    var movieList = document.getElementById("movieList");
    if (!movieList) return; 
    
    movieList.innerHTML = "";

    if (movieArray.length === 0) {
        movieList.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #bbbbbb;">
                <h3>No movies match your current search constraints.</h3>
                <p>Try refining your search text or switching genres.</p>
            </div>
        `;
        return;
    }

    for (var i = 0; i < movieArray.length; i++) {
        var movie = movieArray[i];
        var starText = getStars(movie.rating);
        var safePayload = encodeURIComponent(JSON.stringify(movie));

        movieList.innerHTML += `
            <a href="movie-details.html" onclick="saveActiveMovie('${safePayload}')" class="movie-card" aria-label="View info for ${movie.title}">
                <img class="poster" src="${movie.poster}" alt="${movie.title} poster">
                <div class="card-info">
                    <h3>${movie.title}</h3>
                    <p>Year: ${movie.year}</p>
                    <p>Genre: ${movie.genre.slice(0, 2).join(", ")}</p>
                    <p class="stars">${starText} (${movie.rating.toFixed(1)})</p>
                </div>
            </a>
        `;
    }
}

function saveActiveMovie(movieDataJson) {
    localStorage.setItem('activeMovieContext', decodeURIComponent(movieDataJson));
}

// Start app catalog fetch sequence
loadMovieCatalog();

// Search and Filter Events hook up
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