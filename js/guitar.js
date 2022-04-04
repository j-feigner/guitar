window.onload = main;

function main() {
    var canvas = document.querySelector(".viewport");

    var app = new Guitar(canvas);
    app.start();
}

class Guitar{
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext("2d");

        this.audio_ctx = new AudioContext();
        this.sounds = [];

        this.num_strings = 6;
        this.num_frets = 19;
    }

    start() {
        this.sounds = this.loadSounds();
        var stopper = 0;
        //this.#loadSoundFiles(() => {
        //    alert("All sounds loaded");
        //})
    }

    loadSounds() {
        // Load all files names from directory
        fetch("php/load_sounds.php")
        .then(response => {
            return response.text();
        })
        // Convert file names to urls and fetch each file
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
            console.error("Error: ", error)
        });
    }
}