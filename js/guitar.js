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

        this.fingerboard = new SIFingerboard(strings, frets);
        this.num_strings = strings;
        this.strings = [];

        this.num_frets = frets;

        this.mouse_dragging = false;
        this.drag_delay = 250;

        this.draw = this.draw.bind(this);
    }

    start() {
        this.loadSounds(this.sound_source).then(decoded_buffers => {
            // All sound resources have successfully loaded in here
            this.sounds = decoded_buffers;
            this.createStrings();
            this.createFingerboard();
            this.drawBackground();
            window.requestAnimationFrame(this.draw);
        })
        .catch(error => {
            console.error("Guitar Error: ", error);
        });

        this.initializeCanvases();
        this.initializeEvents();
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

    // Populates strings array with SIString objects
    // Strings contain a hitbox for event detection, sounds array, and animation flags
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

            this.strings[i] = new SIString();
            this.strings[i].line = midline_y;
            this.strings[i].rect = new Rectangle(0, hitbox_y, width, string_hitbox_height);
            this.strings[i].sounds = this.sounds.slice(sounds_start, sounds_start + 4);
        }
    }

    // Populates container element with two HTML Canvas elements, one
    // for background imagery (fingerboard) and one for animated imagery (strings, frets)
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
        // Click and drag toggles
        window.addEventListener("mousedown", () => {
            this.mouse_dragging = true;
        })
        window.addEventListener("mouseup", () => {
            this.mouse_dragging = false;
        })
        this.render_canvas.addEventListener("mousemove", e => {
            // On click and drag, pluck strings
            if(this.mouse_dragging) {
                this.strings.forEach(string => {
                    if(string.rect.isPointInBounds(e.offsetX, e.offsetY)) {
                        string.pluck(this.audio_ctx, this.drag_delay);
                    }
                })
            } 
            // If mouse is not dragging, highlight fret location underr cursor
            else {
                this.fingerboard.hover_location = null;
                this.fingerboard.locations.forEach(row => {
                    row.forEach(location => {
                        if(location.isPointInBounds(e.offsetX, e.offsetY)) {
                            this.fingerboard.hover_location = location;
                        }
                    })
                })
            }
        })
        this.render_canvas.addEventListener("mouseout", () => {
            this.fingerboard.hover_location = null;
        })

        // Change string's respective fret on mouse click
        // Clicking on current fret will unfret string (set string.current_fret to 0)
        this.render_canvas.addEventListener("click", e => {
            this.fingerboard.locations.forEach((row, string_index) => {
                row.forEach((location, fret_index) => {
                    if(location.isPointInBounds(e.offsetX, e.offsetY)) {
                        if(this.strings[string_index].current_fret === fret_index + 1) {
                            this.strings[string_index].current_fret = 0;
                        } else {
                            this.strings[string_index].current_fret = fret_index + 1;
                        }
                    }
                })
            })
        })
    }

    // Creates SIFingerboard object, mainly used for determining fret selection
    // during mouse events
    createFingerboard() {
        var fingerboard_width = this.width - (this.width / 4);
        var fret_width = fingerboard_width / this.num_frets;
        var fret_height = this.height / this.num_strings;

        for(var i = 0; i < this.num_strings; i++) {
            var row = [];
            for(var j = 0; j < this.num_frets; j++) {
                row[j] = new Rectangle(fret_width * j, fret_height * i, fret_width, fret_height);
            }
            this.fingerboard.locations.push(row);
        }
    }

    // Called once during start() to draw static imagery to the background canvas
    drawBackground() {
        var ctx = this.background_canvas.getContext("2d");

        // Draw fingerboard
        ctx.fillStyle = "rgb(88, 88, 88)";
        ctx.beginPath();
        ctx.rect(0, 0, this.width - (this.width / 4), this.height);
        ctx.fill();
        ctx.closePath();

        // Draw bridges
        ctx.strokeStyle = "saddlebrown";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(3, 0);
        ctx.lineTo(3, this.height);
        ctx.moveTo(this.width - 3, 0);
        ctx.lineTo(this.width - 3, this.height);
        ctx.stroke();
        ctx.closePath();

        // Draw fret demarcations to background
        ctx.strokeStyle = "grey";
        for(var i = 0; i < this.fingerboard.rows; i++) {
            ctx.beginPath();
            this.fingerboard.locations[i].forEach((location, index) => {
                ctx.lineWidth = 2;
                ctx.moveTo(location.x + location.width, location.y);
                ctx.lineTo(location.x + location.width, location.y + location.height);
                ctx.stroke();
            })
            ctx.closePath();
        }
    }

    // Called recursively once per frame with requestAnimationFrame()
    // All drawing done to the foreground rendering canvas
    draw(timestamp) {
        // Clear rendering canvas
        this.ctx.clearRect(0, 0, this.width, this.height);

        // String display properties
        this.ctx.lineWidth = 6;
        this.ctx.strokeStyle = "white";

        // Standing wave parameters
        var tau = Math.PI * 2;
        var amplitude = 1.4;
        var wavelength = this.width / 16;
        var frequency = 1 / wavelength;

        // Draw each string line to render_canvas with standing wave animation
        this.strings.forEach((string, index) => {
            this.ctx.beginPath();

            // Draw horizontally to fret location
            var fret_x = 0;
            if(string.current_fret !== 0) {
                var l = this.fingerboard.locations[index][string.current_fret - 1];
                fret_x = l.x + (l.width / 2);
            }
            this.ctx.moveTo(0, string.line);
            this.ctx.lineTo(fret_x, string.line);

            // Draw standing sine wave from fret
            var amp_mod = amplitude * string.amplitude_modifier;
            for(var x = fret_x; x <= this.width; x++) {
                var y = 2 * amp_mod * Math.sin(x * tau / wavelength) * Math.cos(frequency * tau * timestamp);
                this.ctx.lineTo(x, string.line + (y));
            }
            this.ctx.stroke();
            this.ctx.closePath();

            // Draw current fret selection if set for string
            if(string.current_fret !== 0) {
                var l = this.fingerboard.locations[index][string.current_fret - 1];
                var x = l.x + (l.width / 2);
                var y = l.y + (l.height / 2);

                this.ctx.fillStyle = "rgb(255,100,100)";
                this.ctx.beginPath();
                this.ctx.arc(x, y, 10, 0, tau);
                this.ctx.fill();
                this.ctx.closePath();
            }
        })

        // Draw hovered fingerboard location
        if(this.fingerboard.hover_location !== null) {
            var l = this.fingerboard.hover_location;
            var x = l.x + (l.width / 2);
            var y = l.y + (l.height / 2);
            var radius = 10;

            this.ctx.fillStyle = "rgba(255,160,122,0.6)";
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius, 0, tau);
            this.ctx.fill();
            this.ctx.closePath();
        }

        // Redraw
        window.requestAnimationFrame(this.draw);
    }
}

class SIString {
    constructor() {
        this.line; // y-value used for rendering with ctx.stroke()
        this.rect; // Rectangle object used for hit detection

        this.sounds;

        this.current_fret = 0;
        this.overlay_fret;
        this.is_fretted = false;

        this.is_playing = false;
        this.play_timeout;

        this.amplitude_modifier = 0;
        this.vibrate_interval;

        this.can_pluck = true;
    }

    // Called on click & drag across a string's hitbox
    // Plays sound accoording to currrent fret and animates corresponding string
    pluck(ctx, repeat_delay = 0) {
        if(this.can_pluck) {
            // Play audio byte
            var source = new AudioBufferSourceNode(ctx);
            source.buffer = this.sounds[this.current_fret];
            source.connect(ctx.destination);
            source.start();

            // Set decreasing vibration amplitude
            this.amplitude_modifier = 1;
            clearInterval(this.vibrate_interval);
            this.vibrate_interval = setInterval(() => {
                this.amplitude_modifier -= 0.1;
                if(this.amplitude_modifier <= 0.1) {
                    this.amplitude_modifier = 0;
                    clearInterval(this.vibrate_interval);
                }
            }, 150)

            // Set animation flag for sound duration
            this.is_playing = true;
            clearTimeout(this.play_timeout);
            this.play_timeout = setTimeout(() => {
                this.is_playing = false;
            }, source.buffer.duration * 1000 * 0.9)

            // Flag to prevent repeat plays on mousedrag
            this.can_pluck = false;
            setTimeout(() => {
                this.can_pluck = true;
            }, repeat_delay)
        }
    }
}

class SIFingerboard {
    constructor(strings, frets) {
        this.rows = strings;
        this.columns = frets;
        this.locations = [];
        this.hover_location = null;
    }
}