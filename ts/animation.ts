class AnimFrame {
	constructor(
		public highlightedNodeIndices: number[] = [],
		public highlightedEdgeIndices: number[] = [],
		public animatedEdgeIndices: number[] = [],
		public animatedNodeIDs: number[] = [],
		public labels?: { [nodeIndex: number]: string }
	) {}
}

const timeline = {
	frames: [] as AnimFrame[],
	playhead: 0,
	playing: false,
	speed: 1.0,
	lastTS: 0,
};

function resetTimeline() {
	timeline.frames = [];
	timeline.playhead = 0;
	timeline.playing = false;
	timeline.lastTS = 0;
	updateTimelineBar();
	draw(performance.now());
}

function recordFrame(frame: AnimFrame) {
	timeline.frames.push(frame);
	updateTimelineMax();
}

function updateTimelineMax() {
	const slider = document.getElementById("timeline-range") as HTMLInputElement;
	slider.max = (timeline.frames.length - 1).toString();
}

function startPlayback(direction: 1 | -1 = 1) {
	timeline.playing = true;
	timeline.speed = direction * Math.abs(parseFloat(timelineSpeed.value));
	timeline.lastTS = performance.now();
	animTick();
}

function pausePlayback() {
	timeline.playing = false;
}

function stopAnimation() {
	highlightedNodeIndices = [];
	highlightedEdgeIndices = [];
	resetTimeline();
	pausePlayback();
	seekTo(0);
	toggleTimelineVisibility(false);
}

function togglePlay() {
	if (!timeline.playing) startPlayback(1);
	else pausePlayback();
}

function seekTo(frame: number) {
	const max = Math.max(0, timeline.frames.length - 1);
	timeline.playhead = Math.max(0, Math.min(max, frame));
	draw(performance.now());
	updateTimelineBar();
}

function animTick() {
	if (!timeline.playing) return;

	const now = performance.now();
	const dt = (now - timeline.lastTS) / 1000;
	timeline.lastTS = now;


	const fps = 5 * Math.abs(timeline.speed);

	timeline.playhead += Math.sign(timeline.speed) * fps * dt;

	const max = Math.max(0, timeline.frames.length - 1);

	if (timeline.playhead < 0) {
		timeline.playhead = 0;
		timeline.playing = false;
	}
	if (timeline.playhead > max) {
		timeline.playhead = max;
		timeline.playing = false;
	}

	draw(now);
	updateTimelineBar();

	requestAnimationFrame(animTick);
}

function stepforward() {
	pausePlayback();
	seekTo(Math.floor(timeline.playhead) + 1);
}

function stepback() {
	pausePlayback();
	seekTo(Math.ceil(timeline.playhead) - 1);
}

function speedChanged(event: Event) {
	const sel = event.target as HTMLSelectElement;
	timeline.speed = parseFloat(sel.value);
}

const timelineBar = document.getElementById("timeline-bar") as HTMLElement;
const timelineSlider = document.getElementById("timeline-range") as HTMLInputElement;
const timelineSpeed = document.getElementById("timeline-speed") as HTMLInputElement;

function toggleTimelineVisibility(value: boolean) {
	timelineBar.style.display = value ? "flex" : "none";
}

function updateTimelineBar() {
	if (timeline.frames.length === 0) return;
	timelineSlider.value = timeline.playhead.toString();
}

timelineSlider?.addEventListener("input", () => {
	pausePlayback();
	seekTo(parseFloat(timelineSlider.value));
});
