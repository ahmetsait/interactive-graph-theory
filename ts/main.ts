class Vector2 {
	constructor(
		public x: number = 0,
		public y: number = 0) { }

	public get magnitudeSqr(): number {
		return this.x ** 2 + this.y ** 2;
	}

	public get magnitude(): number {
		return Math.sqrt(this.magnitudeSqr);
	}

	public get normalized(): Vector2{
		const vector = new Vector2()
		const mag = this.magnitude;
		vector.x = this.x / mag;
		vector.y = this.y / mag;
		return vector;
	}

	public add(rhs: Vector2 | number): Vector2 {
		if (rhs instanceof Vector2)
			return new Vector2(this.x + rhs.x, this.y + rhs.y);
		else
			return new Vector2(this.x + rhs, this.y + rhs);
	}

	public sub(rhs: Vector2 | number): Vector2 {
		if (rhs instanceof Vector2)
			return new Vector2(this.x - rhs.x, this.y - rhs.y);
		else
			return new Vector2(this.x - rhs, this.y - rhs);
	}

	public mul(rhs: Vector2 | number): Vector2 {
		if (rhs instanceof Vector2)
			return new Vector2(this.x * rhs.x, this.y * rhs.y);
		else
			return new Vector2(this.x * rhs, this.y * rhs);
	}

	public div(rhs: Vector2 | number): Vector2 {
		if (rhs instanceof Vector2)
			return new Vector2(this.x / rhs.x, this.y / rhs.y);
		else
			return new Vector2(this.x / rhs, this.y / rhs);
	}

	public dot(v: Vector2): number {
		return this.x * v.x + this.y * v.y;
	}

	public rotated(angleDegrees: number): Vector2 {
		const result = new Vector2();
		const theta = angleDegrees * Math.PI / 180;
		result.x = this.x * Math.cos(theta) - this.y * Math.sin(theta);
		result.y = this.x * Math.sin(theta) + this.y * Math.cos(theta);
		return result;
	}

	public rotatedAround(angleDegrees: number, pivot: Vector2) : Vector2{
		const result = new Vector2();
		const theta = angleDegrees * Math.PI / 180;
		const dx = this.x - pivot.x;
		const dy = this.y - pivot.y;
		result.x = dx * Math.cos(theta) - dy * Math.sin(theta) + pivot.x;
		result.y = dx * Math.sin(theta) + dy * Math.cos(theta) + pivot.y;
		return result;
	}

	static fromJSON(data: any): Vector2 {
		return new Vector2(data.x, data.y);
	}

	public toJSON() {
		return { x: this.x, y: this.y };
	}
}

class GraphNode {
	constructor(
		public position: Vector2,
		public radius: number,
		public color: string,
		public label: string) { }
	
	public velocity: Vector2 = new Vector2();
}

class GraphEdge {
	constructor(
		public nodeIndex1: number,
		public nodeIndex2: number,
		public edgeType: EdgeType,
		public weight: number | null) { }
}

class Graph {
	constructor(
		public nodes: GraphNode[] = [],
		public edges: GraphEdge[] = [],
		public screenData: ScreenData = new ScreenData(new Vector2(), 1)
	) { }

	public serializeJson(): string {
		return JSON.stringify(this, null, '\t');
	}

	static deserializeJson(json: string): Graph {
		let graph = Object.assign(new Graph(), JSON.parse(json)) as Graph;
		for (const node of graph.nodes) {
			node.position = new Vector2(node.position.x, node.position.y);
		}
		graph.screenData.offset = new Vector2(graph.screenData.offset.x, graph.screenData.offset.y);
		return graph;
	}
}

enum State {
	None,
	DrawNode,
	MoveNode,
	DeleteNode,
	DrawEdge,
	SplitEdge,
	DeleteEdge,
	BoxSelect,
	ScanSelect,
	ScanDeselect,
	Pan,
	Zoom,
	TouchCameraControl, // TODO: Mixed pan+zoom+rotate
};

enum EdgeType{
	Bidirectional,
	Directional
};

class ScreenData{
	constructor(
		public offset: Vector2,
		public zoom: number
	){}

	static fromJSON(data: any): ScreenData {
		return new ScreenData(Vector2.fromJSON(data.offset), data.zoom ?? 1);
	}

	public toJSON() {
		return {offset: this.offset.toJSON(), zoom: this.zoom};
	}
}

class Line {
	constructor(
		public p1: Vector2,
		public p2: Vector2) { }

	public intersects(line: Line): boolean {
		const line1 = this, line2 = line;
		let det, gamma, lambda;
		det = (line1.p2.x - line1.p1.x) * (line2.p2.y - line2.p1.y) - (line2.p2.x - line2.p1.x) * (line1.p2.y - line1.p1.y);
		if (det === 0) {
			return false;
		}
		else {
			lambda = ((line2.p2.y - line2.p1.y) * (line2.p2.x - line1.p1.x) + (line2.p1.x - line2.p2.x) * (line2.p2.y - line1.p1.y)) / det;
			gamma = ((line1.p1.y - line1.p2.y) * (line2.p2.x - line1.p1.x) + (line1.p2.x - line1.p1.x) * (line2.p2.y - line1.p1.y)) / det;
			return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
		}
	}

	public getPointDistance(point: Vector2) : number{
		const a = this.p1;
		const b = this.p2;
		const ab = b.sub(a);
		const ap = point.sub(a);

		const t = Math.max(0, Math.min(1, ap.dot(ab) / ab.dot(ab)));
		const closest = a.add(ab.mul(t));
		return point.sub(closest).magnitude;
	}
}


function clearCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, color: string) {
	ctx.save();
	try {
		ctx.resetTransform();
		ctx.fillStyle = color;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	}
	finally {
		ctx.restore();
	}
}

for (const dropdownButton of document.getElementsByClassName("dropdown-button")) {
	dropdownButton.addEventListener("click", (event) => {
		dropdownButton.nextElementSibling?.classList.toggle("hidden");
	});
}

document.addEventListener("pointerdown", closeDropdown);

for (const dropdown of document.getElementsByClassName("dropdown")) {
	for (const element of dropdown.children) {
		element.addEventListener("click", () => closeDropdown());
	}
}

function closeDropdown(event?: MouseEvent) {
	for (const dropdown of document.getElementsByClassName("dropdown")) {
		if (event === undefined || !dropdown.parentNode?.contains(event.target as Node))
			dropdown.classList.add("hidden");
	}
}

function removeItem<T>(array: T[], item: T) {
	let i = array.indexOf(item);
	if (i !== -1) {
		array.splice(i, 1);
		return true;
	}
	else
		return false;
}

function addItemUnique<T>(array: T[], item: T) {
	let i = array.indexOf(item);
	if (i === -1) {
		array.push(item);
		return true;
	}
	else
		return false;
}

function hslToRgbHex(h: number, s: number, l: number) {
	var r, g, b;

	if (s == 0) {
		r = g = b = l; // achromatic
	}
	else {
		function hue2rgb(p: number, q: number, t: number) {
			if (t < 0) t += 1;
			if (t > 1) t -= 1;
			if (t < 1 / 6) return p + (q - p) * 6 * t;
			if (t < 1 / 2) return q;
			if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
			return p;
		}

		var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		var p = 2 * l - q;
		r = hue2rgb(p, q, h + 1 / 3);
		g = hue2rgb(p, q, h);
		b = hue2rgb(p, q, h - 1 / 3);
	}

	return "#" + ((Math.round(r * 255) << 16) + (Math.round(g * 255) << 8) + (Math.round(b * 255))).toString(16);
}

function randomHslColor(lightness: number = 0.50) {
	return hslToRgbHex(Math.random(), Math.random() * 0.50 + 0.25, lightness);
}

function clamp(value: number, min: number, max: number) : number{
	if (min > max)
		[min, max] = [max, min];
	return Math.min(Math.max(value, min), max);
}

const defaultNodeRadius = 12.5;	// px
const edgeThickness = 2;	// px
const edgeWeightEditRadius = 15; //px
let edgeAnimOffset = 0;

//const touchEnabled = Modernizr.touchevents;

// zoom anim variables
const zoomSpeed = 0.001;
const minZoom = 0.2;
const maxZoom = 3;
let targetZoom = 1;
let zoomAnimFrame: number | null = null;
let animating = false;
let animId: number | null = null;
let animStartTime = 0;
let animStartLogZ = 0;
let animTargetLogZ = 0;
let pivotScreen = new Vector2();
let pivotWorld  = new Vector2();
const ZOOM_ANIM_MS = 150;

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d", { alpha: false })!;
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = "high";

new ResizeObserver(resize).observe(canvas);
window.addEventListener("load", load);
canvas.addEventListener("contextmenu", event => event.preventDefault());

document.addEventListener("keydown", (e: KeyboardEvent) => {
	if (!e.repeat) {
		if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "a") {
			selectAll();
			e.preventDefault();
		}
		else if (!e.ctrlKey && !e.shiftKey && !e.altKey && e.key === "Delete") {
			deleteSelected();
			e.preventDefault();
		}
	}
});

let nodes: GraphNode[] = [];
let edges: GraphEdge[] = [];

//#region Import/Export

function importDialog() {
	const textarea = document.getElementById("import") as HTMLTextAreaElement;
	textarea.value = "";
	showDialog("import-dialog");
	textarea.focus();
}

function importConfirm() {
	const textarea = document.getElementById("import") as HTMLTextAreaElement;
	if (textarea.value)
		importJson(textarea.value);
	closeDialog("import-dialog");
}

function exportDialog() {
	const textarea = document.getElementById("export") as HTMLTextAreaElement;
	textarea.value = exportJson();
	showDialog("export-dialog");
	textarea.focus();
	textarea.setSelectionRange(0, textarea.value.length, "backward");
}

function exportToClipboard() {
	const textarea = document.getElementById("export") as HTMLTextAreaElement;
	if (textarea.value)
		navigator.clipboard.writeText(textarea.value);
	closeDialog("export-dialog");
}

const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input') as HTMLInputElement;

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropArea?.addEventListener(eventName, preventDefaults, false);
  document.body.addEventListener(eventName, preventDefaults, false); // Prevent default on body too
});

['dragenter', 'dragover'].forEach(eventName => {
  dropArea?.addEventListener(eventName, () => dropArea?.classList.add('highlight'), false);
});

['dragleave', 'drop'].forEach(eventName => {
  dropArea?.addEventListener(eventName, () => dropArea?.classList.remove('highlight'), false);
});

dropArea?.addEventListener('drop', handleDrop, false);

dropArea?.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', (event) => {
	const target = event.target as HTMLInputElement;
	if (target.files && target.files.length > 0) {
		const selectedFile = target?.files?.[0];
		if (!selectedFile) return;
		handleImportedFile(selectedFile)
	}
});

function preventDefaults (e: Event) {
  e.preventDefault();
  e.stopPropagation();
}

function handleDrop(e : DragEvent) {
  const dt = e.dataTransfer;
  const files = dt?.files;
  const acceptedMimeTypes = ['text/plain', 'application/json'];
  if (files && files[0])
  {
	if (acceptedMimeTypes.indexOf(files[0].type) === -1) {
		console.log(`Invalid MIME type: ${files[0].type}`);
		return;
  	}
  	handleImportedFile(files[0]);
  }
}

function handleImportedFile(file : File) {
	console.log('Selected file:', file.name);
		const reader = new FileReader();
		reader.onload = (e) => {
			const fileContent = e.target?.result as string;
			const textarea = document.getElementById("import") as HTMLTextAreaElement;
			textarea.value = fileContent;
		};
		reader.readAsText(file);

}

function exportJson() {
	return new Graph(nodes, edges, screenData).serializeJson();
}

function downloadExport(){
	const textarea = document.getElementById("export") as HTMLTextAreaElement;
	const blob = new Blob([textarea.value], {type: "text/json"});
	const dataUrl = window.URL.createObjectURL(blob);

	const now = new Date();
		const timestamp = now.toISOString()
			.replace("T", "_")
			.replace(/:/g, "-")
			.split(".")[0];

		const fileName = `graph_${timestamp}.json`;
    
	const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
	link.click();
	window.URL.revokeObjectURL(dataUrl);
	link.remove();
}

function importJson(json: string) {
	try {
		const graph = Graph.deserializeJson(json);
		resetAll();

		nodes = graph.nodes;
		edges = graph.edges;
		if (graph.screenData) {
			screenData.offset = new Vector2(graph.screenData.offset.x, graph.screenData.offset.y);
			screenData.zoom = graph.screenData.zoom;
		} else {
			screenData = new ScreenData(new Vector2(), 1);
		}

		let max = 1;
		for (const node of nodes) {
			const label = parseInt(node.label!);
			if (!isNaN(label) && label > max)
				max = label;
		}
		labelCounter = max + 1;
		draw(window.performance.now());
	}
	catch (err) {
		console.error("Error importing JSON:", err);
		alert("Invalid or corrupted graph JSON file.");
	}

}
//#endregion

//#region LocalStorage

function loadState(key: string){
	try {
		const serializedState = localStorage.getItem(key);
		console.log("STATE: " + serializedState);
		if (serializedState === null)
			return;
		importJson(JSON.parse(serializedState));
	} catch (error) {
		console.error("Error loading state from localStorage:", error);
		return;
	}
}

function saveState(key: string, state: string){
	try {
		const serializedState = JSON.stringify(state);
		localStorage.setItem(key, serializedState);
	} catch (error) {
		console.error("Error saving state to localStorage:", error);
	}
}

//#endregion

let state = State.None;

// Camera transform
let screenData = new ScreenData(new Vector2(), 1);

let selectedNodeIndices: number[] = [];
let selectedEdgeIndices: number[] = [];
let mouseHoverNodeIndex: number = -1;
let mouseHoverEdgeIndex: number = -1;

let currentNodeColor: string;
let labelCounter = 1;

function getNodeIndexAtPosition(nodes: GraphNode[], position: Vector2): number {
	let closestNodeIndex = -1;
	let closestNodeX: number;
	let closestNodeY: number;

	for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
		let node = nodes[nodeIndex]!;
		let distanceSqr = position.sub(node.position).magnitudeSqr;
		if (distanceSqr < (node.radius + defaultNodeRadius) ** 2) {
			if (closestNodeIndex === -1) {
				closestNodeIndex = nodeIndex;
				closestNodeX = node.position.x;
				closestNodeY = node.position.y;
			}
			else if (distanceSqr < (position.x - closestNodeX!) ** 2 + (position.y - closestNodeY!) ** 2) {
				closestNodeIndex = nodeIndex;
				closestNodeX = node.position.x;
				closestNodeY = node.position.y;
			}
		}
	}
	return closestNodeIndex;
}

function getEdgeIndexAtPosition(edges: GraphEdge[], position: Vector2) : number
{
	let closestEdgeIndex = -1;
	let minDistance = Number.POSITIVE_INFINITY;

	for (let edgeIndex = 0; edgeIndex < edges.length; edgeIndex++) {
		let edge = edges[edgeIndex]!;
		let node1 = nodes[edge.nodeIndex1]!;
		let node2 = nodes[edge.nodeIndex2]!;
		
		let distance = (new Line(node1.position, node2?.position)).getPointDistance(position);
		const selectDistance = (Modernizr.touchevents ? 12 : 8) * window.devicePixelRatio;
		if (distance < selectDistance) {
			if (closestEdgeIndex === -1) {
				closestEdgeIndex = edgeIndex;
				minDistance = distance;
			}
			else if (distance < minDistance) {
				closestEdgeIndex = edgeIndex;
				minDistance = distance;
			}
		}
	}
	return closestEdgeIndex;
}

function getNodeIndicesInRect(box: DOMRectReadOnly): number[] {
	let nodeIndices: number[] = [];
	for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
		let node = nodes[nodeIndex]!;
		if (node.position.x < box.right &&
			node.position.x > box.left &&
			node.position.y < box.bottom &&
			node.position.y > box.top) {
			nodeIndices.push(nodeIndex);
		}
	}
	return nodeIndices;
}

function getPositionRelativeToElement(element: Element | null, x: number, y: number): Vector2 {
	if (element === null) return new Vector2(x, y);
	const rect = element.getBoundingClientRect();
	return new Vector2(
		((x - rect.left - screenData.offset.x) / screenData.zoom) | 0,
		((y - rect.top  - screenData.offset.y) / screenData.zoom) | 0
	);
}

function nodeRadiusCurve(radius: number): number {
	return +(Math.sqrt(radius) + defaultNodeRadius).toFixed(2);
}

function showDialog(id: string) {
	document.getElementById(id)?.classList.remove("hidden");
}

function closeDialog(id: string) {
	document.getElementById(id)?.classList.add("hidden");
}

for (const layer of document.getElementsByClassName("modal-layer")) {
	for (const button of layer.getElementsByClassName("modal-close-button")) {
		button.addEventListener("click", (event) => {
			closeDialog(layer.id);
		});
	}
}

document.addEventListener("click", (event) => {
	if (event.target instanceof Element && event.target.classList.contains("modal-layer"))
		event.target.classList.add("hidden");
});

function resetAll() {
	selectedNodeIndices = [];
	selectedEdgeIndices = [];
	edges = [];
	nodes = [];
	labelCounter = 1;
	saveLastState();
	draw(window.performance.now());
}

function selectAll() {
	if (selectedNodeIndices.length < nodes.length)
		selectedNodeIndices = [...nodes.keys()];
	else
		selectedNodeIndices = [];
	draw(window.performance.now());
}

function deleteSelected() {
	deleteNodes(selectedNodeIndices);
}

function moveNodes(delta: Vector2, nodeIndices: number[]) {
	nodeIndices.forEach(nodeIndex => {
		if (nodeIndex >= 0 && nodeIndex < nodes.length) {
			let node = nodes[nodeIndex]!;
			node.position = node.position.add(delta);
		}
		else
			throw new RangeError(`nodeIndex = ${nodeIndex} is out of range for nodes.length = ${nodes.length}`);
	});
}

function getConnectedNodes(selectedNodeIndex : number): number[]{
	if (selectedNodeIndex === -1) return [];
	const toVisit = [selectedNodeIndex];
	const visited = new Set<number>();

	while (toVisit.length > 0) {
		const i = toVisit.pop()!;
		if (visited.has(i)) continue;
		visited.add(i);

		for (const e of edges) {
			if (e.nodeIndex1 === i && !visited.has(e.nodeIndex2))
				toVisit.push(e.nodeIndex2);
			else if (e.nodeIndex2 === i && !visited.has(e.nodeIndex1))
				toVisit.push(e.nodeIndex1);
		}
	}
	return Array.from(visited);
}

function deleteNodes(nodeIndices: number[]) {
	new Int32Array(nodeIndices).sort().reverse().forEach(nodeIndex => deleteNode(nodeIndex));
	draw(window.performance.now());
}

function deleteNode(nodeIndex: number) {
	for (let i = edges.length - 1; i >= 0; i--) {
		const edge = edges[i]!;
		// Tear off edges before deleting node
		if (edge.nodeIndex1 === nodeIndex || edge.nodeIndex2 === nodeIndex)
			edges.splice(i, 1);
		// Shift edge node indices to adjust
		if (edge.nodeIndex1 > nodeIndex)
			edge.nodeIndex1--;
		if (edge.nodeIndex2 > nodeIndex)
			edge.nodeIndex2--;
	}
	removeItem(selectedNodeIndices, nodeIndex);
	for (let i = selectedNodeIndices.length - 1; i >= 0; i--) {
		const v = selectedNodeIndices[i];
		if (v !== undefined && v > nodeIndex) {
			selectedNodeIndices[i] = v - 1;
		}
	}
	nodes.splice(nodeIndex, 1);
}

function cutEdges(scissor: Line) {
	for (let i = edges.length - 1; i >= 0; i--) {
		const edge = edges[i]!;
		const node1 = nodes[edge.nodeIndex1]!;
		const node2 = nodes[edge.nodeIndex2]!;
		if (scissor.intersects(new Line(node1.position, node2.position))) {
			edges.splice(i, 1);
		}
	}
}

function isEdgeVisible(e: GraphEdge, camLeft: number, camRight: number,camTop: number, camBottom: number): boolean {
	const n1 = nodes[e.nodeIndex1]!.position;
	const n2 = nodes[e.nodeIndex2]!.position;
	const minX = Math.min(n1.x, n2.x);
	const maxX = Math.max(n1.x, n2.x);
	const minY = Math.min(n1.y, n2.y);
	const maxY = Math.max(n1.y, n2.y);
	return !(maxX < camLeft || minX > camRight || maxY < camTop || minY > camBottom);
}

function tryVibrate(pattern: number[]): void;
function tryVibrate(pattern: number): void;

function tryVibrate(pattern : number[] | number){
	if ("vibrate" in navigator) {
		navigator.vibrate(pattern);
	} else {
		console.warn("Vibration API not supported on this device.");
	}
}

let edgeEditorEl: HTMLInputElement | null = null;

function openEdgeWeightEditor(edgeIndex: number) {
	const edge = edges[edgeIndex]!;
	const node1 = nodes[edge.nodeIndex1]!.position;
	const node2 = nodes[edge.nodeIndex2]!.position;
	const midPoint = node1.add(node2).div(2);
	const midScreen = midPoint.mul(screenData.zoom).add(screenData.offset);

	const rect = canvas.getBoundingClientRect();
	const left = rect.left + midScreen.x;
	const top  = rect.top  + midScreen.y;

	if (edgeEditorEl)
		edgeEditorEl.remove();

	const input = document.createElement("input");
	edgeEditorEl = input;
	input.type = "number";
	input.step = "any";
	input.value = String(edge.weight ?? 1);
	Object.assign(input.style, {
		position: "fixed",
		left: `${left - 30}px`,
		top:  `${top  - 14}px`,
		width: "60px",
		height: "28px",
		padding: "2px 6px",
		font: "14px/20px system-ui, sans-serif",
		textAlign: "center",
		border: "1px solid #888",
		borderRadius: "6px",
		background: "#fff",
		zIndex: "9999",
	} as CSSStyleDeclaration);

	document.body.appendChild(input);
	input.focus();
	input.select();

	const commit = (ok: boolean) => {
		if (ok) {
			const v = parseFloat(input.value);
			if (!Number.isNaN(v)) {
				edge.weight = v;
				saveLastState?.();
				draw(performance.now());
			}
		}
		input.remove();
		if (edgeEditorEl === input) edgeEditorEl = null;
	};

	input.addEventListener("keydown", (ev) => {
		if (ev.key === "Enter") commit(true);
		else if (ev.key === "Escape") commit(false);
	});
	input.addEventListener("blur", () => commit(true));
}

//#region Physics Related

let physicsRunning = false;
const repulsion = 1000;
const spring = 0.01;
const damping = 0.04;
const drag = 0.05;
const maxSpeed = 10;
const idealDist = 200;
const maxForceApplyDistance = 1000;
let lastFrameTime = performance.now();

function updatePhysics() {
	if (!physicsRunning) return;
	const now = performance.now();
	const deltaTime = now  - lastFrameTime;
	lastFrameTime = now;

	for(let i = 0; i < nodes.length; i++) {
		let force = new Vector2();
		if ((lastMouseDownNodeIndex === i || selectedNodeIndices.indexOf(i) >= 0) && state == State.MoveNode)
			continue;
		const a = nodes[i]!;
		
		for(let j = 0; j < nodes.length; j++){
			if (a === nodes[j]) continue;
			const delta = a.position.sub(nodes[j]!.position);
			let dist = delta.magnitude || 0.001;
			const dir = delta.div(dist);
			const falloff = 1 - (clamp(dist, 50, maxForceApplyDistance) / maxForceApplyDistance) ** 2;
			force = force.add(dir.mul(repulsion * falloff / (dist * dist)));
		}

		for (const e of edges) {
			if (nodes[e.nodeIndex1] === a || nodes[e.nodeIndex2] === a) {
				const other = nodes[e.nodeIndex1] === a ? nodes[e.nodeIndex2]! : nodes[e.nodeIndex1]!;
				const delta = other.position.sub(a.position);
				let dist = delta.magnitude || 0.001;
				const dir = delta.div(dist);

				const w = e.weight ?? 1;
				const weightedIdeal = idealDist * Math.sqrt(w);

				const springForce = (dist - weightedIdeal) * spring;
				const relVel = other.velocity.sub(a.velocity);
				const dampingForce = relVel.dot(dir) * damping;
				force = force.add(dir.mul(springForce + dampingForce));
			}
		}

		a.velocity = a.velocity.add(force);
		a.velocity = a.velocity.mul(1 - drag);
		if (a.velocity.magnitude > maxSpeed)
			a.velocity = a.velocity.normalized.mul(maxSpeed);
	}
	for(const node of nodes)
		node.position = node.position.add(node.velocity);

	draw(performance.now());
	requestAnimationFrame(updatePhysics);
}

function togglePhysics(){
	physicsRunning=!physicsRunning;
	if(physicsRunning){
		nodes.forEach(n => n.velocity = new Vector2(Math.random()-0.5, Math.random()-0.5));
		updatePhysics();
	}
};

//#endregion

//#region Mouse Controls

canvas.addEventListener("mousedown", mousedown);
canvas.addEventListener("mousemove", mousemove);
canvas.addEventListener("mouseup", mouseup);
canvas.addEventListener("wheel", wheel);

const mouseHoldDistanceThreshold = 1;
let lastMousePosition: Vector2 | null = null;
let lastMouseDownPosition: Vector2 | null = null;
let lastMouseDownTimestamp: number = -1;
let lastMouseDownNodeIndex: number = -1;
let lastMouseDownEdgeIndex: number = -1;

function mousedown(event: MouseEvent) {
	if (edgeEditorEl && (event.target as HTMLInputElement) !== edgeEditorEl)
		return;
	let mousePosition = getPositionRelativeToElement(event.target as Element, event.clientX, event.clientY);
	let mouseDownNodeIndex = getNodeIndexAtPosition(nodes, mousePosition);
	let mouseDownEdgeIndex = -1;
	if (mouseDownNodeIndex === -1)
		mouseDownEdgeIndex = getEdgeIndexAtPosition(edges, mousePosition)

	switch (state) {
		case State.None:
			if (event.buttons === 1) // Left click
			{
				if (event.shiftKey && event.ctrlKey) {
					if (mouseDownNodeIndex !== -1) {
						addItemUnique(selectedNodeIndices, mouseDownNodeIndex);
						state = State.MoveNode;
					}
				}
				else if (event.shiftKey) {
					if (mouseDownEdgeIndex > -1){
						if (selectedEdgeIndices.indexOf(mouseDownEdgeIndex) >= 0)
							removeItem(selectedEdgeIndices, mouseDownEdgeIndex);
						else{
							selectedNodeIndices = [];
							addItemUnique(selectedEdgeIndices, mouseDownEdgeIndex);
						}
					}
					else if (mouseDownNodeIndex === -1) {
						state = State.BoxSelect;
					}
					else {
						if (selectedNodeIndices.indexOf(mouseDownNodeIndex) === -1) {
							addItemUnique(selectedNodeIndices, mouseDownNodeIndex);
							state = State.ScanSelect;
						}
						else {
							removeItem(selectedNodeIndices, mouseDownNodeIndex);
							state = State.ScanDeselect;
						}
					}
				}
				else if (event.ctrlKey) {
					if (mouseDownNodeIndex !== -1) {
						if (selectedNodeIndices.indexOf(mouseDownNodeIndex) === -1)
							selectedNodeIndices = [mouseDownNodeIndex];
						state = State.MoveNode;
					}
					else {
						selectedNodeIndices = [];
					}
				}
				else if (event.altKey) {
					selectedNodeIndices = getConnectedNodes(mouseDownNodeIndex);
				}
				else {
					if (mouseDownNodeIndex === -1 && mouseDownEdgeIndex === -1) {
						currentNodeColor = randomHslColor();
						state = State.DrawNode;
					}
				}
			}
			else if (event.buttons === 2 && // Right click
				!event.shiftKey) // Shift key disables context menu prevention on Firefox
			{
				if (mouseDownNodeIndex !== -1) {
					deleteNode(mouseDownNodeIndex);
					state = State.DeleteNode;
				}
				else
					state = State.DeleteEdge;
				saveLastState();
			}
			else if (event.buttons === 4) // Middle click
			{
				state = State.Pan;
			}
			break;
	}

	lastMouseDownPosition = lastMousePosition = mousePosition;
	lastMouseDownNodeIndex = mouseDownNodeIndex;
	lastMouseDownEdgeIndex = mouseDownEdgeIndex;
	lastMouseDownTimestamp = event.timeStamp;

	draw(window.performance.now());
}

function mousemove(event: MouseEvent) {
	if (edgeEditorEl && (event.target as HTMLInputElement) !== edgeEditorEl)
		return;
	let mousePosition = getPositionRelativeToElement(event.target as Element, event.clientX, event.clientY);
	mouseHoverNodeIndex = getNodeIndexAtPosition(nodes, mousePosition);
	mouseHoverEdgeIndex = getEdgeIndexAtPosition(edges, mousePosition);

	const movement = new Vector2(event.movementX, event.movementY).div(screenData.zoom);

	switch (state) {
		case State.None:
			if (event.buttons === 1){
				if (lastMouseDownEdgeIndex > -1 && mouseHoverEdgeIndex !== lastMouseDownEdgeIndex){
					currentNodeColor = randomHslColor();
					state = State.SplitEdge;
				}
				else if (lastMouseDownNodeIndex !== -1 &&
					nodes[lastMouseDownNodeIndex]!.position.sub(mousePosition).magnitudeSqr > nodes[lastMouseDownNodeIndex]!.radius ** 2) {
					state = State.DrawEdge;
				}
			}
			break;

		case State.Pan:
			screenData.offset = screenData.offset.add(movement.mul(screenData.zoom));
			saveLastState();
			break;

		case State.ScanSelect:
			if (mouseHoverNodeIndex !== -1)
				addItemUnique(selectedNodeIndices, mouseHoverNodeIndex);
			break;

		case State.ScanDeselect:
			if (mouseHoverNodeIndex !== -1)
				removeItem(selectedNodeIndices, mouseHoverNodeIndex);
			break;

		case State.MoveNode:
			if (lastMouseDownNodeIndex !== -1) {
				if (selectedNodeIndices.indexOf(lastMouseDownNodeIndex) !== -1)
					moveNodes(movement, selectedNodeIndices);
				else
					moveNodes(movement, [lastMouseDownNodeIndex]);
			}
			break;

		case State.DeleteNode:
			if (mouseHoverNodeIndex !== -1){
				deleteNode(mouseHoverNodeIndex);
				saveLastState();
			}
			break;

		case State.DeleteEdge:
			if (lastMousePosition !== null){
				cutEdges(new Line(lastMousePosition, mousePosition));
				saveLastState();
			}
			break;
	}

	lastMousePosition = mousePosition;

	draw(window.performance.now());
}

function mouseup(event: MouseEvent) {
	if (edgeEditorEl && (event.target as HTMLInputElement) !== edgeEditorEl){
		edgeEditorEl.remove();
		edgeEditorEl = null;
		return;
	}
	let mousePosition = getPositionRelativeToElement(event.target as Element, event.clientX, event.clientY);
	let mouseUpNodeIndex = getNodeIndexAtPosition(nodes, mousePosition);
	let mouseUpEdgeIndex = getEdgeIndexAtPosition(edges, mousePosition);

	switch (state) {
		case State.None:
			if (selectedNodeIndices.indexOf(lastMouseDownNodeIndex) > -1){
				removeItem(selectedNodeIndices, lastMouseDownNodeIndex);
			}
			else if (lastMouseDownNodeIndex !== -1 && lastMouseDownEdgeIndex === -1  && lastMouseDownNodeIndex === mouseUpNodeIndex) {
				selectedNodeIndices = [];
				selectedEdgeIndices = [];
				addItemUnique(selectedNodeIndices, mouseUpNodeIndex);
			}else if (lastMouseDownEdgeIndex > -1 && lastMouseDownEdgeIndex === mouseUpEdgeIndex && !event.shiftKey){
				if (selectedEdgeIndices.indexOf(lastMouseDownEdgeIndex) >= 0)
					removeItem(selectedEdgeIndices, lastMouseDownEdgeIndex);
				else{
					selectedEdgeIndices = [];
					selectedNodeIndices = [];
					const pos = getPositionRelativeToElement(canvas, event.clientX, event.clientY);
					const edgeIdx = getEdgeIndexAtPosition(edges, pos);
					const midpoint = nodes[edges[edgeIdx]!.nodeIndex1]!.position.add(nodes[edges[edgeIdx]!.nodeIndex2]!.position).div(2);
					if (edgeIdx !== -1 && pos.sub(midpoint).magnitudeSqr < edgeWeightEditRadius ** 2) {
						openEdgeWeightEditor(edgeIdx);
						return;
					}

					addItemUnique(selectedEdgeIndices, lastMouseDownEdgeIndex);
				}
			}
			break;

		case State.BoxSelect:
			if (lastMouseDownPosition === null)
				throw new Error("State machine bug.");
			const box = {
				left: Math.min(lastMouseDownPosition.x, mousePosition.x),
				top: Math.min(lastMouseDownPosition.y, mousePosition.y),
				right: Math.max(lastMouseDownPosition.x, mousePosition.x),
				bottom: Math.max(lastMouseDownPosition.y, mousePosition.y),
			};
			let rect = new DOMRect(box.left, box.top, box.right - box.left, box.bottom - box.top);
			getNodeIndicesInRect(rect).forEach(nodeIndex => addItemUnique(selectedNodeIndices, nodeIndex));
			break;

		case State.DrawNode:
			if (lastMouseDownPosition === null)
				throw new Error("State machine bug.");
			let nodeRadius = mousePosition.sub(lastMouseDownPosition).magnitude;
			nodes.push(
				new GraphNode(
					lastMouseDownPosition,
					nodeRadiusCurve(nodeRadius),
					currentNodeColor,
					"",
				)
			);
			saveLastState();
			break;
		case State.SplitEdge:
			if (lastMouseDownPosition === null)
				throw new Error("State machine bug.");
			const newNode = new GraphNode(
					mousePosition,
					defaultNodeRadius,
					currentNodeColor,
					"",
				);

			const newNodeIndex = nodes.push(newNode) - 1;
			const splittedEdge = edges[lastMouseDownEdgeIndex];
			edges.push(new GraphEdge(splittedEdge!.nodeIndex1, newNodeIndex, splittedEdge!.edgeType, splittedEdge!.weight));
			edges.push(new GraphEdge(newNodeIndex, splittedEdge!.nodeIndex2, splittedEdge!.edgeType, splittedEdge!.weight));

			removeItem(edges, splittedEdge);

			// Edge leri pushla
			saveLastState();
			break;
		case State.MoveNode:
			saveLastState();
			break

		case State.DrawEdge:
			if (lastMouseDownNodeIndex !== -1 && mouseUpNodeIndex !== -1) {
				if (!edges.some((edge) => (edge.nodeIndex1 === lastMouseDownNodeIndex && edge.nodeIndex2 === mouseUpNodeIndex) ||
						(edge.nodeIndex1 === mouseUpNodeIndex && edge.nodeIndex2 === lastMouseDownNodeIndex))){
						edges.push(new GraphEdge(lastMouseDownNodeIndex, mouseUpNodeIndex, EdgeType.Directional, 1));
						saveLastState();
					}
				else{
					const edge = edges.find((e) => (e.nodeIndex1 === mouseUpNodeIndex && e.nodeIndex2 === lastMouseDownNodeIndex)) as GraphEdge;
					if (edge)
					{
						const index = edges.indexOf(edge);
						if (edge.edgeType === EdgeType.Directional)
							edges[index]!.edgeType = EdgeType.Bidirectional
						saveLastState();
					}
				}
			}

			// create new node if edge drawing released on empty space
			else if (lastMouseDownNodeIndex !== -1)
			{
				if (lastMouseDownPosition === null)
					throw new Error("State machine bug.");
				if (event.buttons === 0)// Left button
				{
					const newNode = new GraphNode(
						new Vector2(mousePosition.x, mousePosition.y),
						defaultNodeRadius,
						randomHslColor(),
						"",
					)
					nodes.push(newNode);
					edges.push(new GraphEdge(lastMouseDownNodeIndex, nodes.indexOf(newNode), EdgeType.Directional, 1));
					saveLastState();
				}
			}
			
			break;

		case State.DeleteEdge:
			if (lastMouseDownPosition === null)
				throw new Error("State machine bug.");
			let mouseDeltaSqr = mousePosition.sub(lastMouseDownPosition).magnitudeSqr;
			if (mouseDeltaSqr < mouseHoldDistanceThreshold ** 2)
				selectedNodeIndices = [];
			saveLastState();
			break;
	}

	lastMouseDownNodeIndex = -1;
	state = State.None;
	draw(window.performance.now());
}

function wheel(event: WheelEvent) {
  	event.preventDefault();
  	if (edgeEditorEl && (event.target as HTMLInputElement) !== edgeEditorEl){
		edgeEditorEl.remove();
		edgeEditorEl = null;
		return;
	}
	const factor = Math.exp(-event.deltaY * zoomSpeed * 5);

	const rect = canvas.getBoundingClientRect();
	pivotScreen = new Vector2(event.clientX - rect.left, event.clientY - rect.top);
	pivotWorld  = pivotScreen.sub(screenData.offset).div(screenData.zoom);

	const currentLogZ = Math.log(screenData.zoom);
	const targetZ = Math.min(maxZoom, Math.max(minZoom, screenData.zoom * factor));
	animStartLogZ  = currentLogZ;
	animTargetLogZ = Math.log(targetZ);
	animStartTime  = performance.now();

	if (animId !== null) cancelAnimationFrame(animId);

	const step = () => {
		const t = Math.min(1, (performance.now() - animStartTime) / ZOOM_ANIM_MS);
		const logZ = animStartLogZ + (animTargetLogZ - animStartLogZ) * t;
		const z = Math.exp(logZ);
		screenData.zoom   = z;
		screenData.offset = pivotScreen.sub(pivotWorld.mul(z));

		draw(performance.now());
		if (t < 1)
			animId = requestAnimationFrame(step);
		else
			animId = null;
	};
	animId = requestAnimationFrame(step);
	saveLastState();
}

//#endregion

//#region Touch Controls

canvas.addEventListener("touchstart", touchstart, { passive: false });
canvas.addEventListener("touchmove", touchmove, { passive: false });
canvas.addEventListener("touchend", touchend, { passive: false });
canvas.addEventListener("touchcancel", touchend, { passive: false });

const touchDoubleTapTimeout = 300; // ms
const touchHoldTimeout = 300; // ms
const touchDoubleTapDistanceThreshold = 20; // px I guess?

class TouchInfo {
	constructor(
		public touchStartPosition: Vector2,
		public touchPosition: Vector2,
		public touchClientPosition: Vector2,
		public touchDelta: Vector2,
		public touchStartNodeIndex: number,
		public touchOnNodeIndex: number,
		public touchStartEdgeIndex: number,
		public touchOnEdgeIndex: number,
		public touchStartTimeStamp: number,
		public touchTimeStamp: number) { }
}

let touchInfos = new Map<number, TouchInfo>();

let lastSingleTouchStartNodeIndex = -1;
let lastSingleTouchStartEdgeIndex = -1;
let lastSingleTouchStartPosition: Vector2 | null = null;
let lastSingleTouchPosition: Vector2 | null = null;
let lastSingleTouchStartTimestamp: number = -1;
let touchHoldTimer: number | undefined = undefined;
let moveThreshold = 5;

function touchstart(event: TouchEvent) {
	event.preventDefault();
	if (edgeEditorEl && (event.target as HTMLInputElement) !== edgeEditorEl)
		return;
	for (let i = 0; i < event.changedTouches.length; i++) {
		let touch = event.changedTouches[i]!;
		let touchPosition = getPositionRelativeToElement(touch.target as Element, touch.clientX, touch.clientY);
		let touchStartNodeIndex = getNodeIndexAtPosition(nodes, touchPosition);
		let touchStartEdgeIndex = -1;
		if (touchStartNodeIndex === -1)
			touchStartEdgeIndex = getEdgeIndexAtPosition(edges, touchPosition);

		touchInfos.set(
			touch.identifier,
			new TouchInfo(
				touchPosition,
				touchPosition,
				new Vector2(touch.clientX, touch.clientY),
				new Vector2,
				touchStartNodeIndex,
				touchStartNodeIndex,
				touchStartEdgeIndex,
				touchStartEdgeIndex,
				event.timeStamp,
				event.timeStamp,
			)
		);
	}

	if (touchInfos.size === 1) {
		let touchInfo = touchInfos.values().next().value as TouchInfo;
		switch (state) {
			case State.None:
				let doubleTap = false;
				if (lastSingleTouchStartPosition !== null && lastSingleTouchStartTimestamp !== -1) {
					let doubleTapDistanceSqr = touchInfo.touchPosition.sub(lastSingleTouchStartPosition).magnitudeSqr;
					if (event.timeStamp - lastSingleTouchStartTimestamp < touchDoubleTapTimeout && doubleTapDistanceSqr < touchDoubleTapDistanceThreshold ** 2) {
						doubleTap = true;
						tryVibrate([30, 30, 30]);
						if (touchInfo.touchStartNodeIndex !== -1) {
							deleteNode(touchInfo.touchStartNodeIndex);
							state = State.DeleteNode;
							saveLastState();
						}
					}
				}
				if (!doubleTap) {
					touchHoldTimer = setTimeout(function () {
						if (touchInfos.size === 1) {
							const it = touchInfos.values().next();
							if (it.done || !it.value) return;
							const touchInfo = it.value as TouchInfo;
							if (touchInfo.touchStartNodeIndex !== -1) {
								if (selectedNodeIndices.indexOf(touchInfo.touchStartNodeIndex) === -1)
									selectedNodeIndices = [touchInfo.touchStartNodeIndex];
								state = State.MoveNode;
							}
							else
								state = State.DeleteEdge;
							tryVibrate(50);
						}
					}, touchHoldTimeout);
				}
				break;
		}
		lastSingleTouchStartNodeIndex = touchInfo.touchStartNodeIndex;
		lastSingleTouchStartEdgeIndex = touchInfo.touchStartEdgeIndex;
		lastSingleTouchStartPosition = touchInfo.touchStartPosition;
		lastSingleTouchPosition = touchInfo.touchPosition;
		lastSingleTouchStartTimestamp = touchInfo.touchStartTimeStamp;
	}
	else if (touchInfos.size === 2) {
		clearTimeout(touchHoldTimer);
		touchHoldTimer = undefined;
		state = State.Pan;
	}
	else if (touchInfos.size > 2) {
		clearTimeout(touchHoldTimer);
		touchHoldTimer = undefined;
		state = State.None;
	}

	draw(window.performance.now());
}

function touchmove(event: TouchEvent) {
	if (edgeEditorEl && (event.target as HTMLInputElement) !== edgeEditorEl)
		return;
	let anyTouchMoved = state !== State.None;
	for (let i = 0; i < event.changedTouches.length; i++) {
		let touch = event.changedTouches[i]!;
		let touchPosition = getPositionRelativeToElement(touch.target as Element, touch.clientX, touch.clientY);
		let touchOnNodeIndex = getNodeIndexAtPosition(nodes, touchPosition);
		let touchOnEdgeIndex = getEdgeIndexAtPosition(edges, touchPosition);
		// Update touch infos
		let touchInfo = touchInfos.get(touch.identifier);
		if (touchInfo === undefined)
			continue;

		touchInfo.touchDelta = new Vector2(
			touch.clientX - touchInfo.touchClientPosition.x,
			touch.clientY - touchInfo.touchClientPosition.y
		); 
		if (touchInfo.touchDelta.magnitudeSqr >= moveThreshold ** 2){
			anyTouchMoved = true;
		}
		touchInfo.touchClientPosition = new Vector2(touch.clientX, touch.clientY);
		touchInfo.touchPosition = touchPosition;
		touchInfo.touchOnNodeIndex = touchOnNodeIndex;
		touchInfo.touchOnEdgeIndex = touchOnEdgeIndex;
		touchInfo.touchTimeStamp = event.timeStamp;
	}
	if (!anyTouchMoved)
		return;

	if (touchInfos.size === 1) {
		clearTimeout(touchHoldTimer);
		touchHoldTimer = undefined;
		let touchInfo = touchInfos.values().next().value as TouchInfo;
		switch (state) {
			case State.None:
				if (touchInfo.touchStartNodeIndex !== -1)
					state = State.DrawEdge;
				else if (touchInfo.touchStartEdgeIndex !== -1){
					if (touchInfo.touchOnEdgeIndex !== touchInfo.touchStartEdgeIndex){
						currentNodeColor = randomHslColor();
						state = State.SplitEdge;
					}
				}
				else {
					currentNodeColor = randomHslColor();
					state = State.DrawNode;
				}
				break;

			case State.MoveNode:
				if (selectedNodeIndices.indexOf(lastSingleTouchStartNodeIndex) !== -1)
					moveNodes(touchInfo.touchDelta.div(screenData.zoom), selectedNodeIndices);
				else
					moveNodes(touchInfo.touchDelta.div(screenData.zoom), [lastSingleTouchStartNodeIndex]);
				saveLastState();
				break;

			case State.DeleteNode:
				if (touchInfo.touchOnNodeIndex !== -1){
					deleteNode(touchInfo.touchOnNodeIndex);
					saveLastState();
				}
				break;

			case State.DeleteEdge:
				let touchOldPosition = touchInfo.touchPosition.sub(touchInfo.touchDelta);
				cutEdges(new Line(touchOldPosition, touchInfo.touchPosition));
				saveLastState();
				break;
		}
		lastSingleTouchPosition = touchInfo.touchPosition;
	}
	else if (touchInfos.size === 2) {
		let [t1, t2] = [...touchInfos.values()];

		let prev1 = t1!.touchClientPosition.sub(t1!.touchDelta);
		let prev2 = t2!.touchClientPosition.sub(t2!.touchDelta);

		let prevDist = prev1.sub(prev2).magnitude;
		let currDist = t1!.touchClientPosition.sub(t2!.touchClientPosition).magnitude;
		if (prevDist < 1e-3) prevDist = 1e-3;

		let scale = currDist / prevDist;
		let newZoom = clamp(screenData.zoom * scale, minZoom, maxZoom);

		let rect = canvas.getBoundingClientRect();
		let midScreen = new Vector2(
			(t1!.touchClientPosition.x + t2!.touchClientPosition.x) / 2 - rect.left,
			(t1!.touchClientPosition.y + t2!.touchClientPosition.y) / 2 - rect.top
		);
		let midWorld = midScreen.sub(screenData.offset).div(screenData.zoom);

		screenData.zoom = newZoom;
		screenData.offset = midScreen.sub(midWorld.mul(newZoom));

		let deltaAvg = t1!.touchDelta.add(t2!.touchDelta).div(2);
		screenData.offset = screenData.offset.add(deltaAvg);
	}
	else if (touchInfos.size > 2) {
		state = State.None;
	}

	draw(window.performance.now());
}

function touchend(event: TouchEvent) {
	if (edgeEditorEl && (event.target as HTMLInputElement) !== edgeEditorEl){
		edgeEditorEl.remove();
		edgeEditorEl = null;
		return;
	}
	let endedTouchInfos = new Map<number, TouchInfo>();
	for (let i = 0; i < event.changedTouches.length; i++) {
		let touch = event.changedTouches[i]!;
		endedTouchInfos.set(touch.identifier, touchInfos.get(touch.identifier)!);
		touchInfos.delete(touch.identifier);
	}

	if (endedTouchInfos.size === 1 && touchInfos.size === 0) {
		let touchInfo = endedTouchInfos.values().next().value as TouchInfo;
		switch (state) {
			// @ts-expect-error
			case State.None:
				if (touchInfo.touchStartNodeIndex !== -1) {
					selectedEdgeIndices = [];
					if (!removeItem(selectedNodeIndices, touchInfo.touchStartNodeIndex))
						addItemUnique(selectedNodeIndices, touchInfo.touchStartNodeIndex);
					break;
				}
				else if (touchInfo.touchStartEdgeIndex !== -1){
					selectedNodeIndices = [];

					const pos = touchInfo.touchPosition;
					const edgeIdx = getEdgeIndexAtPosition(edges, pos);
					if (edgeIdx !== -1) {
						const edge = edges[edgeIdx]!;
						const midpoint = nodes[edge.nodeIndex1]!.position
							.add(nodes[edge.nodeIndex2]!.position)
							.div(2);

						if (pos.sub(midpoint).magnitudeSqr < edgeWeightEditRadius ** 2) {
							openEdgeWeightEditor(edgeIdx);
							return;
						}
					}
					if (!removeItem(selectedEdgeIndices, touchInfo.touchStartEdgeIndex))
						addItemUnique(selectedEdgeIndices, touchInfo.touchStartEdgeIndex);
					break;
				}
				currentNodeColor = randomHslColor();
			// goto case State.DrawNode;
			case State.DrawNode:
				if (lastSingleTouchStartPosition === null)
					throw new Error("State machine bug.");
				let nodeRadius = touchInfo.touchPosition.sub(lastSingleTouchStartPosition).magnitude;
				nodes.push(
					new GraphNode(
						lastSingleTouchStartPosition,
						nodeRadiusCurve(nodeRadius),
						currentNodeColor,
						"",
					)
				);
				saveLastState();
				break;

			case State.DrawEdge:
				if (lastSingleTouchStartNodeIndex !== -1 && touchInfo.touchOnNodeIndex !== -1) {
					if (!edges.some((edge) => edge.nodeIndex1 === lastSingleTouchStartNodeIndex && edge.nodeIndex2 === touchInfo.touchOnNodeIndex)){
						edges.push(new GraphEdge(lastSingleTouchStartNodeIndex, touchInfo.touchOnNodeIndex, EdgeType.Directional, 1));
						saveLastState();
					}
					else{
						const edge = edges.find((e) => (e.nodeIndex1 === touchInfo.touchOnNodeIndex && e.nodeIndex2 === lastSingleTouchStartNodeIndex)) as GraphEdge;
						if (edge)
						{
							const index = edges.indexOf(edge);
							if (edge.edgeType === EdgeType.Directional)
								edges[index]!.edgeType = EdgeType.Bidirectional
							saveLastState();
						}
					}
				}
				else if (lastSingleTouchStartNodeIndex !== -1)
				{
					if (lastSingleTouchPosition === null)
						throw new Error("State machine bug.");
					const newNode = new GraphNode(
						new Vector2(touchInfo.touchPosition.x, touchInfo.touchPosition.y),
						defaultNodeRadius,
						randomHslColor(),
						"",
					)
					nodes.push(newNode);
					edges.push(new GraphEdge(lastSingleTouchStartNodeIndex, nodes.indexOf(newNode), EdgeType.Directional, 1));
					saveLastState();
				}
				break;
			case State.SplitEdge:
				if (lastSingleTouchPosition === null)
					throw new Error("State machine bug.");
				const newNode = new GraphNode(
						touchInfo.touchPosition,
						defaultNodeRadius,
						currentNodeColor,
						"",
					);

				const newNodeIndex = nodes.push(newNode) - 1;
				const splittedEdge = edges[touchInfo.touchStartEdgeIndex];
				edges.push(new GraphEdge(splittedEdge!.nodeIndex1, newNodeIndex, splittedEdge!.edgeType, splittedEdge!.weight));
				edges.push(new GraphEdge(newNodeIndex, splittedEdge!.nodeIndex2, splittedEdge!.edgeType, splittedEdge!.weight));

				removeItem(edges, splittedEdge);
				saveLastState();
				break;
			case State.BoxSelect:
				if (lastSingleTouchStartPosition === null)
					throw new Error("State machine bug.");
				const box = {
					left: Math.min(lastSingleTouchStartPosition.x, touchInfo.touchPosition.x),
					top: Math.min(lastSingleTouchStartPosition.y, touchInfo.touchPosition.y),
					right: Math.max(lastSingleTouchStartPosition.x, touchInfo.touchPosition.x),
					bottom: Math.max(lastSingleTouchStartPosition.y, touchInfo.touchPosition.y),
				};
				let rect = new DOMRect(box.left, box.top, box.right - box.left, box.top - box.bottom);
				getNodeIndicesInRect(rect).forEach(nodeIndex => addItemUnique(selectedNodeIndices, nodeIndex));
				break;
		}
	}

	if (touchInfos.size === 0) {
		clearTimeout(touchHoldTimer);
		touchHoldTimer = undefined;
		state = State.None;
	}
	else if (touchInfos.size === 1){
		if (lastSingleTouchStartNodeIndex !== -1){
			selectedNodeIndices = getConnectedNodes(lastSingleTouchStartNodeIndex);
		}
	}
	else if (touchInfos.size === 2) {
		
		clearTimeout(touchHoldTimer);
		touchHoldTimer = undefined;
		state = State.Pan;
	}
	else if (touchInfos.size > 2) {
		clearTimeout(touchHoldTimer);
		touchHoldTimer = undefined;
		state = State.None;
	}
	draw(window.performance.now());
}

//#endregion

function load() {
	loadState("lastState");
	resize();
	draw(window.performance.now());
}

function saveLastState(){
	const currentState = exportJson();
	saveState("lastState", currentState);
}

function resize(entries?: ResizeObserverEntry[], observer?: ResizeObserver) {
	// let w = canvas.width;
	// let h = canvas.height;
	canvas.width = canvas.clientWidth * window.devicePixelRatio;
	canvas.height = canvas.clientHeight * window.devicePixelRatio;
	// let widthDiff = canvas.width - w;
	// let heightDiff = canvas.height - h;
	// offset.x += widthDiff / 2;
	// offset.y += heightDiff / 2;
	draw(window.performance.now());
}

let lastDrawTimestamp: number = -1;

function draw(timeStamp: number) {
	let deltaTime = lastDrawTimestamp === -1 ? 0 : lastDrawTimestamp - timeStamp;

	if (Modernizr.touchevents) {
		lastMouseDownPosition = lastSingleTouchStartPosition;
		lastMousePosition = lastSingleTouchPosition;
		lastMouseDownNodeIndex = lastSingleTouchStartNodeIndex;
		lastMouseDownEdgeIndex = lastSingleTouchStartEdgeIndex;
	}

	ctx.save();

	try {
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		ctx.setTransform(
			screenData.zoom * window.devicePixelRatio, // scaleX
			0,               // skewX
			0,               // skewY
			screenData.zoom * window.devicePixelRatio, // scaleY
			screenData.offset.x * window.devicePixelRatio, // translateX
			screenData.offset.y * window.devicePixelRatio // translateY
		);

		clearCanvas(canvas, ctx, "white");

		ctx.strokeStyle = "gray";
		ctx.lineWidth = edgeThickness;

		if (lastMousePosition !== null){
			if (state === State.DrawEdge && lastMouseDownNodeIndex !== -1) {
				ctx.beginPath();
				ctx.moveTo(nodes[lastMouseDownNodeIndex]!.position.x, nodes[lastMouseDownNodeIndex]!.position.y);
				ctx.lineTo(lastMousePosition.x, lastMousePosition.y);
				ctx.stroke();
			}
			else if (state === State.SplitEdge){
				const splittedEdge = edges[lastMouseDownEdgeIndex];
				const node1 = nodes[splittedEdge?.nodeIndex1!];
				const node2 = nodes[splittedEdge?.nodeIndex2!];
				ctx.beginPath();
				ctx.moveTo(node1?.position.x!, node1?.position.y!);
				ctx.lineTo(lastMousePosition.x!, lastMousePosition.y!);
				ctx.lineTo(node2?.position.x!, node2?.position.y!);
				ctx.stroke();
			}
		}
		const camLeft   = -screenData.offset.x / screenData.zoom;
		const camTop    = -screenData.offset.y / screenData.zoom;
		const camRight  = (canvas.width  - screenData.offset.x) / screenData.zoom;
		const camBottom = (canvas.height - screenData.offset.y) / screenData.zoom;

		for (let i = 0; i < edges.length; i++) {
			if ((state === State.SplitEdge && i === lastMouseDownEdgeIndex) || !isEdgeVisible(edges[i]!, camLeft, camRight, camTop, camBottom))
				continue;
			let edge = edges[i]!;
			const node1 = nodes[edge.nodeIndex1];
			const node2 = nodes[edge.nodeIndex2];
			if (node1 === undefined || node2 === undefined)
				throw new Error("Edge has missing nodes.");

			if (edge.edgeType === EdgeType.Directional){
				const edgeDir = node2.position.sub(node1.position).normalized;
				const intPoint = node1.position.add(node2.position.sub(node1.position).add(node1.position.sub(node2.position).normalized.mul(node2.radius)));
				const arrowMidPoint = intPoint.sub(edgeDir.mul(10));
				const firstPoint = arrowMidPoint.rotatedAround(30, intPoint);
				const secondPoint = arrowMidPoint.rotatedAround(-30, intPoint);
				
				ctx.fillStyle = selectedEdgeIndices.indexOf(i) >= 0 ? "blue" : "gray";
				ctx.beginPath();
				ctx.moveTo(intPoint.x, intPoint.y);
				ctx.lineTo(firstPoint.x, firstPoint.y);
				ctx.lineTo(secondPoint.x, secondPoint.y);
				ctx.fill();
			}

			ctx.strokeStyle = selectedEdgeIndices.indexOf(i) >= 0 ? "blue" : "gray";
			ctx.beginPath();
			ctx.moveTo(node1.position.x, node1.position.y);
			ctx.lineTo(node2.position.x, node2.position.y);
			ctx.stroke();

			// Draw edge weight
			if (edge.weight !== null){
				const edgeCenter = node1.position.add(node2.position).div(2);

				ctx.fillStyle = "white";
				ctx.beginPath();
				ctx.arc(edgeCenter.x, edgeCenter.y, edgeWeightEditRadius, 0, 360);
				ctx.fill();

				ctx.fillStyle = "blue";
				ctx.font = "bold 15px sans-serif";
				ctx.textBaseline = "middle";
				ctx.textAlign = "center";
				ctx.fillText(edge.weight!.toString(), edgeCenter.x, edgeCenter.y);
			}
		}

		for (const edge of highlightedEdges) {
			ctx.strokeStyle = "red";
			ctx.lineWidth = edgeThickness * 2;
			ctx.beginPath();
			ctx.moveTo(nodes[edge.nodeIndex1]!.position.x, nodes[edge.nodeIndex1]!.position.y);
			ctx.lineTo(nodes[edge.nodeIndex2]!.position.x, nodes[edge.nodeIndex2]!.position.y);
			ctx.stroke();
		}

		ctx.font = "bold 15px sans-serif";
		ctx.textBaseline = "middle";
		ctx.textAlign = "center";

		nodes.forEach(node => {
			if (node.position.x + node.radius < camLeft ||
				node.position.x - node.radius > camRight ||
				node.position.y + node.radius < camTop ||
				node.position.y - node.radius > camBottom)
				return;
			ctx.fillStyle = node.color;
			ctx.beginPath();
			ctx.arc(node.position.x, node.position.y, node.radius, 0, 360);
			ctx.fill();
			ctx.fillStyle = "white";
			ctx.fillText(node.label, node.position.x, node.position.y);
		});

		if (state === State.DrawNode) {
			if (lastMousePosition === null || lastMouseDownPosition === null)
				throw new Error("lastMousePosition or lastMouseDownPosition cannot be null.");
			let nodeRadius = lastMousePosition.sub(lastMouseDownPosition).magnitude;
			ctx.fillStyle = currentNodeColor;
			ctx.beginPath();
			ctx.arc(lastMouseDownPosition.x, lastMouseDownPosition.y, nodeRadiusCurve(nodeRadius), 0, 360);
			ctx.fill();
		}
		else if (state === State.SplitEdge){
			if (lastMousePosition === null || lastMouseDownPosition === null)
				throw new Error("lastMousePosition or lastMouseDownPosition cannot be null.");

			ctx.fillStyle = currentNodeColor;
			ctx.beginPath();
			ctx.arc(lastMousePosition.x, lastMousePosition.y, defaultNodeRadius, 0, 360);
			ctx.fill();
		}

		ctx.lineWidth = 4;
		ctx.strokeStyle = "gray";

		selectedNodeIndices.forEach(nodeIndex => {
			let selectedNode = nodes[nodeIndex]!;
			ctx.beginPath();
			ctx.arc(selectedNode.position.x, selectedNode.position.y, selectedNode.radius, 0, 360);
			ctx.stroke();
		});

		if (state === State.BoxSelect && lastMousePosition !== null && lastMouseDownPosition !== null) {
			ctx.lineWidth = 1;
			ctx.strokeStyle = "gray";
			ctx.setLineDash([4, 4]);
			ctx.strokeRect(lastMouseDownPosition.x, lastMouseDownPosition.y, lastMousePosition.x - lastMouseDownPosition.x, lastMousePosition.y - lastMouseDownPosition.y);
		}

		for (const index of highlightedNodeIndices) {
			ctx.lineWidth = 4;
			ctx.strokeStyle = "red";
			ctx.setLineDash([]);
			ctx.beginPath();
			ctx.arc(nodes[index]!.position.x, nodes[index]!.position.y, nodes[index]!.radius, 0, 360);
			ctx.stroke();
		}
	}
	finally {
		ctx.restore();
	}

	//window.requestAnimationFrame(draw);

	lastDrawTimestamp = timeStamp;
}
