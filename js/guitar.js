window.onload = main;

function main() {
    var container = document.querySelector(".guitar-container");
    var app = new StringInstrument(6, 19, "guitar_6_acoustic", container);
    app.start();
}

class StringInstrument {
    constructor(strings, frets, sounds, container) {
        this.container = container;

        this.width;
        this.height;

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

        this.mouse_dragging = false;
        this.drag_delay = 250;

        this.draw = this.draw.bind(this);
    }

    start() {
        this.loadSounds(this.sound_source).then(decoded_buffers => {
            // All sound resources have successfully loaded in here
            this.sounds = decoded_buffers;
            this.createStrings();
            window.requestAnimationFrame(this.draw);
        })
        .catch(error => {
            console.error("Guitar Error: ", error);
        });

        this.initializeCanvases();
        this.initializeEvents();
        this.createFrets();
        this.drawBackground();
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

    createStrings() {
        var width =  this.render_canvas.width;
        var height = this.render_canvas.height;

        var fretboard_division = height / this.num_strings; // Divides fretboard into equal parts for each string
        var half_division = fretboard_division / 2;

        var string_hitbox_height = 14;

        for(var i = 0; i < this.num_strings; i++) {
            var sounds_start = i * 5;
            var midline_y = (i * fretboard_division) + (half_division);
            var hitbox_y = midline_y - (string_hitbox_height / 2);

            this.strings[i] = new InstrumentString();
            this.strings[i].line = midline_y;
            this.strings[i].rect = new Rectangle(0, hitbox_y, width, string_hitbox_height);
            this.strings[i].sounds = this.sounds.slice(sounds_start, sounds_start + 4);
        }
    }

    initializeCanvases() {
        this.background_canvas = document.createElement("canvas");
        this.render_canvas = document.createElement("canvas");

        this.background_canvas.className = this.render_canvas.className = "render-canvas";

        this.container.appendChild(this.background_canvas);
        this.container.appendChild(this.render_canvas);

        this.background_canvas.width = this.render_canvas.width = this.width = this.container.offsetWidth;
        this.background_canvas.height = this.render_canvas.height = this.height = this.container.offsetHeight;

        this.ctx = this.render_canvas.getContext("2d");
    }

    initializeEvents() {
        window.addEventListener("mousedown", () => {
            this.mouse_dragging = true;
        })
        window.addEventListener("mouseup", () => {
            this.mouse_dragging = false;
        })

        this.render_canvas.addEventListener("mousemove", e => {
            if(this.mouse_dragging) {
                this.strings.forEach(string => {
                    if(string.rect.isPointInBounds(e.offsetX, e.offsetY)) {
                        string.pluck(this.audio_ctx, this.drag_delay);
                    }
                })
            } 
            else {
                this.strings.forEach((string, string_index) => {
                    if(string.rect.isPointInBounds(e.offsetX, e.offsetY)) {
                        this.frets.forEach((fret, fret_index) => {
                            if(fret.isPointInBounds(e.offsetX, e.offsetY)) {
                                this.drawFretOverlay(fret_index, string_index);
                            }
                        })
                    }
                })
            }
        })
    }

    createFrets() {
        var fretboard_width = this.width - (this.width / 5);
        var fret_width = fretboard_width / this.num_frets;
        var fret_height = this.height;

        for(var i = 0; i < this.num_frets; i++) {
            this.frets[i] = new Rectangle(i * fret_width, 0, fret_width, fret_height);
        }
    }

    drawBackground() {
        var ctx = this.background_canvas.getContext("2d");

        // Draw fret demarcations to background
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        this.frets.forEach(fret => {
            ctx.beginPath();
            ctx.moveTo(fret.x, fret.y);
            ctx.lineTo(fret.x, fret.y + fret.height);
            ctx.stroke();
            ctx.closePath();
        }) 
    }

    drawFretOverlay(fret, string) {
        alert("Fret: " + String(fret) + " String: " + String(string));
    }

    draw(timestamp) {
        // Clear rendering canvas
        this.ctx.clearRect(0, 0, this.width, this.height);

        // String display properties
        this.ctx.lineWidth = 6;
        this.ctx.strokeStyle = "white";

        // Standing wave parameters
        var tau = Math.PI * 2;
        var amplitude = 2;
        var wavelength = this.width / 16;
        var frequency = 1 / wavelength;

        // Draw each string line to render_canvas with standing wave animation
        this.strings.forEach(string => {
            var amp_mod = amplitude * string.amplitude_modifier;
            this.ctx.beginPath();
            this.ctx.moveTo(0, string.line);
            for(var x = 0; x < this.width; x++) {
                var y = 2 * amp_mod * Math.sin(x * tau / wavelength) * Math.cos(frequency * tau * timestamp);
                this.ctx.lineTo(x, string.line + (y));
            }
            this.ctx.stroke();
            this.ctx.closePath();
        })

        // Redraw
        window.requestAnimationFrame(this.draw);
    }
}

class InstrumentString {
    constructor() {
        this.line; // y-value used for rendering with ctx.stroke()
        this.rect; // Rectangle object used for hit detection

        this.sounds;

        this.current_fret = 0;
        this.is_fretted = false;

        this.is_playing = false;
        this.amplitude_modifier = 0;
        this.can_pluck = true;
    }

    pluck(ctx, repeat_delay = 0) {
        if(this.can_pluck) {
            // Play audio byte
            var source = new AudioBufferSourceNode(ctx);
            source.buffer = this.sounds[0];
            source.connect(ctx.destination);
            source.start();

            // Set decreasing vibration amplitude
            this.amplitude_modifier = 1;
            var vibrate = setInterval(() => {
                this.amplitude_modifier -= 0.05;
                if(this.amplitude_modifier <= 0) {
                    this.amplitude_modifier = 0;
                }
            }, 150)

            // Set animation flag for sound duration
            this.is_playing = true;
            setTimeout(() => {
                this.is_playing = false;
                this.amplitude_modifier = 0;
                clearInterval(vibrate);
            }, this.sounds[0].duration * 1000 * 0.9)

            // Flag to prevent repeat plays on mousedrag
            this.can_pluck = false;
            setTimeout(() => {
                this.can_pluck = true;
            }, repeat_delay)
        }
    }
}