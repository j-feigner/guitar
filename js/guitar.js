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

        this.draw = this.draw.bind(this);
    }

    start() {
        this.loadSounds(this.sound_source).then(decoded_buffers => {
            // All sound resources have successfully loaded in here
            this.sounds = decoded_buffers;
            this.createStrings();
        })
        .catch(error => {
            console.error("Guitar Error: ", error);
        });
        this.initializeCanvases();
        this.drawBackground();
        window.requestAnimationFrame(this.draw);
    }

    // Asynchronous method that returns an array of Promises that resolve
    // to decoded Audio Buffers from mp3 files in ../sounds/directory
    loadSounds(directory) {
        // Load all files names from directory
        return fetch("php/load_sounds.php?instr=" + directory, {method: "GET"})
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
    }

    initializeCanvases() {
        this.background_canvas = document.createElement("canvas");
        this.render_canvas = document.createElement("canvas");

        this.background_canvas.className = this.render_canvas.className = "render-canvas";

        this.container.appendChild(this.background_canvas);
        this.container.appendChild(this.render_canvas);

        this.background_canvas.width = this.render_canvas.width = this.container.offsetWidth;
        this.background_canvas.height = this.render_canvas.height = this.container.offsetHeight;

        this.ctx = this.render_canvas.getContext("2d");
    }

    drawBackground() {
        var ctx = this.background_canvas.getContext("2d");
        var w = this.background_canvas.width;
        var h = this.background_canvas.height;

        var fretboard_width = w - (w / 5);

        // Draw fret demarcations to background
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        var fret_width = fretboard_width / this.num_frets;
        var fret_height = h;
        var fretboard_y = (h / 2) - (fret_height / 2);
        for(var i = 0; i < 19; i++) {
            ctx.beginPath();
            ctx.moveTo(i * fret_width, fretboard_y);
            ctx.lineTo(i * fret_width, fretboard_y + fret_height);
            ctx.stroke();
            ctx.closePath();
        }
    }

    draw(timestamp) {
        var w = this.render_canvas.width;
        var h = this.render_canvas.height;

        // Clear rendering canvas
        this.ctx.clearRect(0, 0, w, h);

        // String display properties
        var string_height = h / this.num_strings;
        this.ctx.lineWidth = 6;
        this.ctx.strokeStyle = "white";

        // Standing wave parameters
        var tau = Math.PI * 2;
        var amplitude = 0.5;
        var wavelength = w / 16;
        var frequency = 1 / wavelength;

        // Draw each string to render canvas
        for(var i = 0; i < this.num_strings; i++) {
            var string_y = (i * string_height) + (string_height / 2);
            this.ctx.beginPath();
            this.ctx.moveTo(0, string_y);
            for(var x = 0; x < w; x++) {
                var y = 2 * amplitude * Math.sin(x * tau / wavelength) * Math.cos(frequency * tau * timestamp);
                this.ctx.lineTo(x, string_y + (0));
            }
            this.ctx.stroke();
            this.ctx.closePath();
        }

        // Redraw
        window.requestAnimationFrame(this.draw);
    }

    createStrings() {

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