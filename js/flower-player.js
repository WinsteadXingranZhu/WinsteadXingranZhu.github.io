(() => {
const FLOWER_PLAYER_STATE = "winstead-flower-player";

// Define the public playlist here. Visitors can only play the tracks in this list.
const flowerPlaylist = [
  {
    title: "Piano Concerto No. 2 · II. Adagio sostenuto",
    artist: "Sergei Rachmaninoff",
    src: "music/rachmaninoff-piano-concerto-2-adagio.mp3",
    recording: "Musopen · Public domain",
    source: "https://commons.wikimedia.org/wiki/File:Sergei_Rachmaninoff_-_piano_concerto_no._2_in_c_minor,_op._18_-_ii._adagio_sostenuto.ogg"
  },
  {
    title: "Schwanengesang, D. 957 · Ständchen",
    artist: "Franz Schubert · Jason M. C. Han",
    src: "music/schubert-standchen-d957.mp3",
    recording: "Jason M. C. Han · CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:St%C3%A4ndchen_(Schubert)-Serenade_D957_No.4,_Player_Jason,_Han.ogg"
  },
  {
    title: "The Four Seasons: Winter · I. Allegro non molto",
    artist: "Antonio Vivaldi · USAF Concert Band",
    src: "music/vivaldi-winter-allegro.mp3",
    recording: "USAF Concert Band and Singing Sergeants · Public domain",
    source: "https://commons.wikimedia.org/wiki/File:Vivaldi_Winter_mvt_1_Allegro_non_molto_-_The_USAF_Concert.ogg"
  },
  {
    title: "Moonlight Sonata · I. Adagio sostenuto",
    artist: "Ludwig van Beethoven",
    src: "music/beethoven-moonlight-adagio.mp3",
    recording: "Musopen · Public domain",
    source: "https://commons.wikimedia.org/wiki/File:Ludwig_van_Beethoven_-_sonata_no._14_in_c_sharp_minor_%27moonlight%27,_op._27_no._2_-_i._adagio_sostenuto.ogg"
  },
  {
    title: "Feel You",
    artist: "Shin Yong Jae",
    src: "music/feel_you.mp3"
  }
];

const player = document.createElement("aside");
player.className = "flower-player";
player.dataset.open = "false";
player.dataset.playing = "false";
player.innerHTML = `
  <section class="flower-panel" id="flower-player-panel" aria-label="Music player" aria-hidden="true" inert>
    <p class="flower-player-label">Now playing</p>
    <p class="flower-track-title"></p>
    <p class="flower-track-artist"></p>
    <div class="flower-progress-row">
      <span class="flower-time flower-current">0:00</span>
      <input class="flower-progress" type="range" min="0" max="100" value="0" step="0.1" aria-label="Track position">
      <span class="flower-time flower-duration">0:00</span>
    </div>
    <div class="flower-controls">
      <button class="flower-control flower-previous" type="button" aria-label="Previous track">‹</button>
      <button class="flower-control flower-play" type="button" aria-label="Play">▶</button>
      <button class="flower-control flower-next" type="button" aria-label="Next track">›</button>
    </div>
    <ol class="flower-playlist" aria-label="Playlist" hidden></ol>
    <section class="flower-recording" aria-label="Recording details" hidden>
      <p class="flower-recording-credit"></p>
      <a class="flower-recording-source" href="" target="_blank" rel="noopener noreferrer">source ↗</a>
    </section>
    <div class="flower-player-meta">
      <span class="flower-track-count"></span>
      <button class="flower-playlist-toggle" type="button" aria-expanded="false">playlist ↓</button>
      <button class="flower-recording-toggle" type="button" aria-expanded="false" hidden>recording ↓</button>
    </div>
  </section>
  <button class="flower-toggle" type="button" aria-expanded="false" aria-controls="flower-player-panel">
    <img class="flower-sculpture" src="images/flower-player-botanica.png?v=3" alt="" aria-hidden="true">
    <canvas aria-hidden="true"></canvas>
    <span class="visually-hidden">Open music player</span>
  </button>
  <audio preload="metadata"></audio>
`;
document.body.append(player);

const audio = player.querySelector("audio");
const canvas = player.querySelector("canvas");
const context = canvas.getContext("2d");
const toggle = player.querySelector(".flower-toggle");
const panel = player.querySelector(".flower-panel");
const playButton = player.querySelector(".flower-play");
const previousButton = player.querySelector(".flower-previous");
const nextButton = player.querySelector(".flower-next");
const progress = player.querySelector(".flower-progress");
const currentTime = player.querySelector(".flower-current");
const duration = player.querySelector(".flower-duration");
const title = player.querySelector(".flower-track-title");
const artist = player.querySelector(".flower-track-artist");
const count = player.querySelector(".flower-track-count");
const playlist = player.querySelector(".flower-playlist");
const playlistToggle = player.querySelector(".flower-playlist-toggle");
const recording = player.querySelector(".flower-recording");
const recordingCredit = player.querySelector(".flower-recording-credit");
const recordingSource = player.querySelector(".flower-recording-source");
const recordingToggle = player.querySelector(".flower-recording-toggle");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let trackIndex = 0;
let constellationPoints = [];
let flowerHovered = false;
let audioContext;
let analyser;
let frequencyData;

const savedState = (() => {
  try { return JSON.parse(sessionStorage.getItem(FLOWER_PLAYER_STATE)) || {}; }
  catch { return {}; }
})();

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
};

const saveState = () => {
  sessionStorage.setItem(FLOWER_PLAYER_STATE, JSON.stringify({
    currentTime: audio.currentTime || 0,
    playing: !audio.paused,
    trackIndex,
    trackSrc: flowerPlaylist[trackIndex].src
  }));
};

playlist.innerHTML = flowerPlaylist.map((track, index) => `
  <li>
    <button type="button" data-track-index="${index}">
      <span class="flower-playlist-number">${String(index + 1).padStart(2, "0")}</span>
      <span class="flower-playlist-title">${track.title}</span>
    </button>
  </li>
`).join("");

const setRecordingOpen = (isOpen) => {
  recording.hidden = !isOpen;
  recordingToggle.setAttribute("aria-expanded", String(isOpen));
  recordingToggle.textContent = isOpen ? "recording ↑" : "recording ↓";
};

const setPlaylistOpen = (isOpen) => {
  if (isOpen) setRecordingOpen(false);
  playlist.hidden = !isOpen;
  playlistToggle.setAttribute("aria-expanded", String(isOpen));
  playlistToggle.textContent = isOpen ? "playlist ↑" : "playlist ↓";
};

const loadTrack = (index, resumeAt = 0) => {
  trackIndex = (index + flowerPlaylist.length) % flowerPlaylist.length;
  const track = flowerPlaylist[trackIndex];
  audio.src = track.src;
  title.textContent = track.title;
  artist.textContent = track.artist;
  count.textContent = `${trackIndex + 1} of ${flowerPlaylist.length}`;
  setRecordingOpen(false);
  recordingToggle.hidden = !track.source;
  recordingCredit.textContent = track.recording || "";
  recordingSource.href = track.source || "";
  recordingSource.setAttribute("aria-label", `Open recording source for ${track.title}`);
  playlist.querySelectorAll("button").forEach((button, buttonIndex) => {
    if (buttonIndex === trackIndex) button.setAttribute("aria-current", "true");
    else button.removeAttribute("aria-current");
  });
  progress.value = 0;
  currentTime.textContent = "0:00";
  audio.addEventListener("loadedmetadata", () => {
    audio.currentTime = Math.min(resumeAt, audio.duration || 0);
    duration.textContent = formatTime(audio.duration);
  }, { once: true });
};

const connectAudio = () => {
  if (audioContext) return;
  audioContext = new AudioContext();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 64;
  frequencyData = new Uint8Array(analyser.frequencyBinCount);
  const source = audioContext.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(audioContext.destination);
};

const togglePlayback = async () => {
  connectAudio();
  if (audioContext.state === "suspended") await audioContext.resume();
  if (audio.paused) await audio.play();
  else audio.pause();
};

const changeTrack = async (direction) => {
  const wasPlaying = !audio.paused;
  loadTrack(trackIndex + direction);
  if (wasPlaying) {
    connectAudio();
    await audio.play();
  }
};

const selectTrack = async (index) => {
  const wasPlaying = !audio.paused;
  loadTrack(index);
  if (wasPlaying) {
    connectAudio();
    await audio.play();
  }
};

const setOpen = (isOpen) => {
  player.dataset.open = String(isOpen);
  toggle.setAttribute("aria-expanded", String(isOpen));
  toggle.querySelector("span").textContent = isOpen ? "Close music player" : "Open music player";
  panel.setAttribute("aria-hidden", String(!isOpen));
  panel.inert = !isOpen;
  if (!isOpen) {
    setPlaylistOpen(false);
    setRecordingOpen(false);
  }
};

toggle.addEventListener("click", () => setOpen(player.dataset.open !== "true"));
toggle.addEventListener("pointerenter", () => { flowerHovered = true; });
toggle.addEventListener("pointerleave", () => { flowerHovered = false; });

playButton.addEventListener("click", () => togglePlayback().catch(() => {}));
previousButton.addEventListener("click", () => changeTrack(-1));
nextButton.addEventListener("click", () => changeTrack(1));
playlistToggle.addEventListener("click", () => setPlaylistOpen(playlist.hidden));
recordingToggle.addEventListener("click", () => {
  const shouldOpen = recording.hidden;
  if (shouldOpen) setPlaylistOpen(false);
  setRecordingOpen(shouldOpen);
});
recordingSource.addEventListener("click", (event) => {
  event.preventDefault();
  const sourceWindow = window.open(recordingSource.href, "_blank");
  if (sourceWindow) sourceWindow.opener = null;
  else window.location.assign(recordingSource.href);
});
playlist.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-track-index]");
  if (button) selectTrack(Number(button.dataset.trackIndex)).catch(() => {});
});

document.addEventListener("pointerdown", (event) => {
  if (player.dataset.open === "true" && !player.contains(event.target)) setOpen(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setOpen(false);
});

progress.addEventListener("input", () => {
  if (audio.duration) audio.currentTime = Number(progress.value) / 100 * audio.duration;
});

audio.addEventListener("play", () => {
  player.dataset.playing = "true";
  playButton.textContent = "Ⅱ";
  playButton.setAttribute("aria-label", "Pause");
});

audio.addEventListener("pause", () => {
  player.dataset.playing = "false";
  playButton.textContent = "▶";
  playButton.setAttribute("aria-label", "Play");
  saveState();
});

audio.addEventListener("timeupdate", () => {
  const percentage = audio.duration ? audio.currentTime / audio.duration * 100 : 0;
  progress.value = percentage;
  currentTime.textContent = formatTime(audio.currentTime);
});

audio.addEventListener("ended", () => changeTrack(1));
window.addEventListener("pagehide", saveState);

const buildFlower = () => {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = 132 * ratio;
  canvas.height = 190 * ratio;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  constellationPoints = [
    [24, 42], [44, 25], [70, 37], [101, 56], [31, 82],
    [82, 91], [112, 107], [47, 128], [95, 145], [67, 165]
  ].map(([x, y], index) => ({
    connectTo: index > 0 && index % 3 !== 0 ? index - 1 : -1,
    phase: index * 1.37,
    size: index % 3 === 0 ? .9 : .58,
    x,
    y
  }));
};

const drawConstellations = (time, energy) => {
  const positions = constellationPoints.map((point) => ({
    x: point.x + Math.sin(time * .0012 + point.phase) * (audio.paused ? .28 : .8 + energy),
    y: point.y + Math.cos(time * .001 + point.phase) * (audio.paused ? .2 : .6 + energy * .7)
  }));

  constellationPoints.forEach((point, index) => {
    const position = positions[index];
    if (point.connectTo >= 0) {
      const connected = positions[point.connectTo];
      context.strokeStyle = `rgba(139, 161, 166, ${.06 + energy * .13})`;
      context.lineWidth = .38;
      context.beginPath();
      context.moveTo(position.x, position.y);
      context.lineTo(connected.x, connected.y);
      context.stroke();
    }
    context.fillStyle = `rgba(166, 187, 190, ${.24 + energy * .3})`;
    context.beginPath();
    context.arc(position.x, position.y, point.size, 0, Math.PI * 2);
    context.fill();
    if (index % 4 === 0) {
      const size = 1.4 + point.size + energy * 1.8;
      context.strokeStyle = `rgba(190, 205, 205, ${.23 + energy * .32})`;
      context.beginPath();
      context.moveTo(position.x - size, position.y);
      context.lineTo(position.x + size, position.y);
      context.moveTo(position.x, position.y - size);
      context.lineTo(position.x, position.y + size);
      context.stroke();
    }
  });
};

const drawFlower = (time = 0) => {
  context.clearRect(0, 0, 132, 190);
  let energy = 0;
  if (analyser && !audio.paused) {
    analyser.getByteFrequencyData(frequencyData);
    energy = frequencyData.reduce((sum, value) => sum + value, 0) / frequencyData.length / 255;
  }

  drawConstellations(time, energy);

  const meterMotion = audio.paused ? (flowerHovered ? 1.15 : .72) : 1.6 + energy * 3.2;
  [0, 1, 2].forEach((bar) => {
    const wave = (Math.sin(time * (.003 + bar * .0005) + bar * 1.8) + 1) / 2;
    const height = 5 + (.35 + wave * .65) * 10 * meterMotion;
    const x = 104 + bar * 6;
    context.fillStyle = `rgba(140, 164, 168, ${.38 + meterMotion * .08})`;
    for (let dot = 0; dot < height; dot += 2.8) {
      context.beginPath();
      context.arc(x, 177 - dot, .82, 0, Math.PI * 2);
      context.fill();
    }
  });

  requestAnimationFrame(drawFlower);
};

buildFlower();
const savedTrackIndex = flowerPlaylist.findIndex((track) => track.src === savedState.trackSrc);
const legacyTrackIndex = Number.isInteger(savedState.trackIndex)
  ? (savedState.trackIndex + flowerPlaylist.length - 1) % flowerPlaylist.length
  : 0;
loadTrack(savedTrackIndex >= 0 ? savedTrackIndex : legacyTrackIndex, savedState.currentTime || 0);
requestAnimationFrame(drawFlower);
})();
