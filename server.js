const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

// Updated CORS settings
app.use(cors({
    origin: "*",  // Allow all frontend requests
    methods: ["GET"],
}));

app.use(express.static('public')); // Serves frontend files

const musicFolder = path.join(__dirname, 'music');
let playlist = fs.readdirSync(musicFolder).filter(file => file.endsWith('.mp3'));

let currentIndex = 0;
let songStartTime = Date.now(); // Track when the current song started

// 🔄 Get currently playing song + next 5 tracks
function getCurrentAndNextSongs() {
    if (!playlist || playlist.length === 0) {
        return { error: "No songs available" };
    }
    return {
        current: playlist[currentIndex],
        next: playlist.slice(currentIndex + 1, currentIndex + 6),
        songStartTime: songStartTime, // Send start time to the frontend
    };
}

// 🎶 API: Get current song info
app.get('/current-song', (req, res) => {
    const songData = getCurrentAndNextSongs();
    if (songData.error) {
        return res.status(500).json(songData);
    }
    res.json(songData);
});

// 🎧 API: Stream current song with correct timestamp
app.get('/stream', (req, res) => {
    if (!playlist || playlist.length === 0) {
        return res.status(500).send("No songs available to stream");
    }
    
    const songPath = path.join(musicFolder, playlist[currentIndex]);
    const stat = fs.statSync(songPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        const stream = fs.createReadStream(songPath, { start, end });
        res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': end - start + 1,
            'Content-Type': 'audio/mpeg',
        });
        stream.pipe(res);
    } else {
        res.writeHead(200, { 'Content-Length': fileSize, 'Content-Type': 'audio/mpeg' });
        fs.createReadStream(songPath).pipe(res);
    }
});

// ⏩ Move to next song when current song finishes
setInterval(() => {
    if (playlist.length > 0) {
        currentIndex = (currentIndex + 1) % playlist.length; // Loop through playlist
        songStartTime = Date.now(); // Reset start time for the new song
    }
}, 30000); // Adjust time based on song length

app.listen(PORT, () => console.log(`🚀 Cumbia Radio Server running on http://localhost:${PORT}`));
