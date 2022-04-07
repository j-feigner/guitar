window.onload = main;

function main() {
    var container = document.querySelector(".guitar-container");
    var app = new StringInstrument(6, 19, "/sounds", container);
    app.start();
}

class StringInstrument{
    constructor(strings, frets, sounds, container) {
        this.container = container;

        this.canvas = document.createElement("canvas");
        this.ctx = this.canvas.getContext("2d");

        this.audio_ctx = new AudioContext();
        this.sounds = [];

        this.num_strings = 6;
        this.strings = [];

        this.num_frets = 19;
        this.frets = [];
    }

    start() {
        this.sounds = this.loadSounds();
        this.drawBackground();
    }

    drawBackground() {
        var background_canvas = document.querySelector("#backgroundCanvas");
        background_canvas.width = 800;
        background_canvas.height = 300;
        var ctx = background_canvas.getContext("2d");

        var width = background_canvas.width;
        var height = background_canvas.height;

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

    loadSounds() {
        // Load all files names from directory
        fetch("php/load_sounds.php")
        .then(response => {
            return response.text();
        })
        // Convert file names to urls and fetch each file as an arraybuffer
        .then(response_text => {
            var names = JSON.parse(response_text);
            var urls = names.map(sound => "sounds/" + sound);
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