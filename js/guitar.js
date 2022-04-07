window.onload = main;

function main() {
    var container = document.querySelector(".guitar-container");
    var app = new StringInstrument(6, 19, "guitar_6_acoustic", container);
    app.start();
}

class StringInstrument{
    constructor(strings, frets, sounds, container) {
        this.container = container;

        this.background_canvas;
        this.render_canvas;
        this.ctx;

        this.audio_ctx = new AudioContext();
        this.sound_source = sounds;
        this.sounds = [];

        this.num_strings = strings;
        this.strings = [];

        this.num_frets = frets;
        this.frets = [];
    }

    start() {
        this.sounds = this.loadSounds(this.sound_source);
        this.initializeCanvases();
        this.drawBackground();
    }

    initializeCanvases() {
        this.background_canvas = document.createElement("canvas");
        this.render_canvas = document.createElement("canvas");

        this.background_canvas.className = this.render_canvas.className = "render-canvas";

        this.container.appendChild(this.background_canvas);
        this.container.appendChild(this.render_canvas);

        this.background_canvas.width = this.render_canvas.width = this.container.offsetWidth;
        this.background_canvas.height = this.render_canvas.height = this.container.offsetHeight;
    }

    drawBackground() {
        var ctx = this.background_canvas.getContext("2d");
        var width = this.background_canvas.width;
        var height = this.background_canvas.height;

        // Draw frets
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        var fret_width = width / this.num_frets;
        var fret_height = height / 2;
        var fretboard_y = (height / 2) - (fret_height / 2);
        for(var i = 0; i < 19; i++) {
            ctx.beginPath();
            ctx.moveTo(i * fret_width, fretboard_y);
            ctx.lineTo(i * fret_width, fretboard_y + fret_height);
            ctx.stroke();
            ctx.closePath();
        }
    }

    draw() {
        // Draw strings
        var width = this.canvas.width;
    }

    loadSounds(directory) {
        // Load all files names from directory
        fetch("php/load_sounds.php?instr=" + directory, {method: "GET"})
        .then(response => {
            return response.text();
        })
        // Convert file names to urls and fetch each file as an arraybuffer
        .then(response_text => {
            var names = JSON.parse(response_text);
            var urls = names.map(sound => "sounds/" + this.sound_source + "/" + sound);
            var fetches = urls.map(url => fetch(url)
                .then(response => response.arrayBuffer()));

            return Promise.all(fetches);
        })
        // Decode each returned arraybuffer into useable sounds
        .then(buffers => {
            var sounds = buffers.map(buffer => this.audio_ctx.decodeAudioData(buffer)
                .then(sound => sound));
            
            return Promise.all(sounds);
        })
        // Return decoded sounds
        .then(decoded_buffers => {
            return decoded_buffers
        })
        .catch(error => {
            console.error("Guitar.loadSounds() Error: ", error);
        });
    }
}

class Fret{
    constructor() {
        this.rect;
        this.fret_num;
    }
}

class String{
    constructor() {
        this.rect;
        this.sounds;
    }

    pluck() {

    }
}