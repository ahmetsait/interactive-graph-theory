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
		public label: string) {
			this.id = GraphNode.maxId;
			GraphNode.maxId++;
		}
	
	public velocity: Vector2 = new Vector2();
	public id: number = 0;
	public static maxId: number = 0;
	
	public static copyFromNode(node: GraphNode): GraphNode{
		const n = new GraphNode(node.position, node.radius, node.color, node.label);
		GraphNode.maxId--;
		n.id = node.id;
		return n;
	}

	toJSON() {
		return {
			id: this.id,
			position: this.position,
			radius: this.radius,
			color: this.color,
			label: this.label
	};
}
}

class GraphEdge {
	constructor(
		public node1id: number,
		public node2id: number,
		public edgeType: EdgeType,
		public weight: number | null) {
			this.id = GraphEdge.maxId;
			GraphEdge.maxId++;
		}
	public id: number = 0;
	public static maxId: number = 0;

	public static copyFromEdge(edge: GraphEdge): GraphEdge{
		const e = new GraphEdge(edge.node1id, edge.node2id, edge.edgeType, edge.weight);
		GraphEdge.maxId--;
		e.id = edge.id;
		return e;
	}

	public switchDirection(){
		const temp1id = this.node1id;
		this.node1id = this.node2id;
		this.node2id = temp1id;
	}
}

class Graph {
	constructor(
		public nodes: Map<number, GraphNode> = new Map<number, GraphNode>(),
		public edges: Map<number, GraphEdge> = new Map<number, GraphEdge>(),
		public screenData: ScreenData = new ScreenData(new Vector2(), 1)
	) { }

	public serializeJson(): string {
		return JSON.stringify({
			nodes: [...this.nodes.values()],
			edges: [...this.edges.values()],
			screenData: this.screenData,
		}, null, '\t');
	}

	static deserializeJson(json: string): Graph {
		const data = JSON.parse(json);
		const g = new Graph();

		g.nodes = new Map<number, GraphNode>();
		for (const n of data.nodes) {
			const node = new GraphNode(
				new Vector2(n.position.x, n.position.y),
				n.radius,
				n.color,
				n.label
			);
			node.id = n.id;
			g.nodes.set(node.id, node);
		}

		g.edges = new Map<number, GraphEdge>();
		for (const e of data.edges) {
			const edge = new GraphEdge(
				e.node1id,
				e.node2id,
				e.edgeType,
				e.weight
			);
			edge.id = e.id;
			g.edges.set(edge.id, edge);
		}

		g.screenData = Object.assign(new ScreenData(new Vector2(), 1), data.screenData);
		g.screenData.offset = new Vector2(data.screenData.offset.x, data.screenData.offset.y);

		return g;
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
	TreeSelect,
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

//#region Extension implementations

if (!Array.prototype.contains) {
  Array.prototype.contains = function<T>(this: T[], element: T): boolean {
    return this.indexOf(element) > -1;
  };
}

if (!Map.prototype.some){
	Map.prototype.some = function<K, V>(this: Map<K, V>, predicate: (value?: V) => boolean): boolean{
		let res = false;
		for(let val of this){
			if (predicate(val[1])){
				res = true;
				break;
			}
		}
		return res;
	} 
}

if (!Map.prototype.find){
	Map.prototype.find = function<K, V>(this: Map<K, V>, predicate: (value?: V) => boolean): V | undefined{
		let res: V | undefined = undefined;
		for(let val of this){
			if (predicate(val[1])){
				res = val[1];
				break;
			}
		}
		return res;
	} 
}

//#endregion


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


const defaultNodeRadius = 12.5;	// px
const edgeThickness = 2;	// px
const edgeWeightEditRadius = 15; //px
let edgeAnimOffset = 0;

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
		if (e.ctrlKey && e.key === "z") {
			e.preventDefault();
			undo();
		}
		if (e.ctrlKey && (e.key === "y" || (e.shiftKey && e.key === "Z"))) {
			e.preventDefault();
			redo();
		}
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

let nodes: Map<number, GraphNode> = new Map<number, GraphNode>();
let edges: Map<number, GraphEdge> = new Map<number, GraphEdge>();

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
	if (!acceptedMimeTypes.contains(files[0].type)) {
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

function importJson(json: string, recordUndo: boolean = true) {
	try {
		const graph = Graph.deserializeJson(json);
		if (recordUndo)
			pushClear(new Graph(nodes, edges, screenData), graph, [...selectedNodeIDs], [...selectedEdgeIDs]);
		importGraph(graph);
	}
	catch (err) {
		console.error("Error importing JSON:", err);
		alert("Invalid or corrupted graph JSON file.");
	}

}

function importGraph(graph: Graph){
	try {
		resetAll();
		nodes = graph.nodes;
		edges = graph.edges;

		let max = -1;
		for (let [k,v] of nodes){
			if (v.id > max)
				max = v.id;
		}
		GraphNode.maxId = max + 1;

		max = -1;
		for (let [k,v] of edges){
			if (v.id > max)
				max = v.id;
		}
		GraphEdge.maxId = max + 1;

		if (graph.screenData) {
			screenData.offset = new Vector2(graph.screenData.offset.x, graph.screenData.offset.y);
			screenData.zoom = graph.screenData.zoom;
		} else {
			screenData = new ScreenData(new Vector2(), 1);
		}
		
		max = 1;
		for (const node of nodes) {
			const label = parseInt(node[1].label!);
			if (!isNaN(label) && label > max)
				max = label;
		}
		labelCounter = max + 1;
		draw(window.performance.now());
	}
	catch (err) {
		console.error("Error importing Graph:", err);
		alert("Invalid or corrupted graph file.");
	}
}

//#endregion

//#region LocalStorage

function loadState(key: string){
	try {
		const serializedState = localStorage.getItem(key);
		if (serializedState === null)
			return;
		importJson(JSON.parse(serializedState), false);
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

function load() {
	loadState("lastState");
	resize();
	draw(window.performance.now());
}

function saveLastState(){
	const currentState = exportJson();
	saveState("lastState", currentState);
}

//#endregion

//#region Helper Functions

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

function removeItem<T>(array: T[], item: T, checkDeep: boolean = false) {
	let i = checkDeep ? array.findIndex((val) => JSON.stringify(val) === JSON.stringify(item)) : array.indexOf(item);
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

function getNodeIDAtPosition(nodes: Map<number, GraphNode>, position: Vector2): number {
	let closestNodeId = -1;
	let closestNodeX: number;
	let closestNodeY: number;

	for(let kv of nodes){
		let node = kv[1]!;
		let distanceSqr = position.sub(node.position).magnitudeSqr;
		if (distanceSqr < (node.radius + defaultNodeRadius) ** 2) {
			if (closestNodeId === -1) {
				closestNodeId = node.id;
				closestNodeX = node.position.x;
				closestNodeY = node.position.y;
			}
			else if (distanceSqr < (position.x - closestNodeX!) ** 2 + (position.y - closestNodeY!) ** 2) {
				closestNodeId = node.id;
				closestNodeX = node.position.x;
				closestNodeY = node.position.y;
			}
		}
	}
	return closestNodeId;
}

function getEdgeIDAtPosition(edges: Map<number, GraphEdge>, position: Vector2) : number
{
	let closestEdgeId = -1;
	let minDistance = Number.POSITIVE_INFINITY;

	for (let kv of edges){
		let edge = kv[1]!;
		let node1 = nodes.get(edge.node1id)!;
		let node2 = nodes.get(edge.node2id)!;
		
		let distance = (new Line(node1.position, node2?.position)).getPointDistance(position);
		const selectDistance = (Modernizr.touchevents ? 12 : 8) * window.devicePixelRatio;
		if (distance < selectDistance) {
			if (closestEdgeId === -1) {
				closestEdgeId = edge.id;
				minDistance = distance;
			}
			else if (distance < minDistance) {
				closestEdgeId = edge.id;
				minDistance = distance;
			}
		}
	}
	return closestEdgeId;
}

function getConnectedEdges(nodeId: number, deepCopy:boolean = false): GraphEdge[]{
	let res: GraphEdge[] = [];
	for(let kv of edges){
		let edge = kv[1];
		if (edge.node1id === nodeId || edge.node2id === nodeId)
			res.push(deepCopy ? GraphEdge.copyFromEdge(edge) : edge);
	}
	return res;
}

function getConnectedEdgeIDs(nodeId: number): number[]{
	let res: number[] = [];
	for(let kv of edges){
		let edge = kv[1];
		if (edge.node1id === nodeId || edge.node2id === nodeId)
			res.push(edge.id);
	}
	return res;
}

function getEdgeListCopy(list: GraphEdge[]): GraphEdge[]{
	return list.reduce((acc: GraphEdge[], val) => {
		acc.push(GraphEdge.copyFromEdge(val));
		return acc;	
	}, [])
}

function getNodeIDsInRect(box: DOMRectReadOnly): number[] {
	let nodeIndices: number[] = [];
	nodes.forEach((node, key) => {
		if (node.position.x < box.right &&
			node.position.x > box.left &&
			node.position.y < box.bottom &&
			node.position.y > box.top) {
			nodeIndices.push(key);
		}
	})
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

function resetAll() {
	selectedNodeIDs = [];
	selectedEdgeIDs = [];
	edges = new Map<number, GraphEdge>();
	nodes = new Map<number, GraphNode>();
	labelCounter = 1;
	saveLastState();
	draw(window.performance.now());
}

function clearGraph(){
	pushClear(new Graph(nodes, edges, screenData), new Graph(new Map<number, GraphNode>(), new Map<number, GraphEdge>(), new ScreenData(new Vector2(), 1)), [...selectedNodeIDs], [...selectedEdgeIDs]);
	resetAll();
}

function selectAll() {
	selectedEdgeIDs = [];
	if (selectedNodeIDs.length < nodes.size){
		selectedNodeIDs = [...nodes.keys()];
		pushSelection([...selectedNodeIDs], [], [], [...selectedEdgeIDs]);
	}
	else{
		pushSelection([], [...selectedNodeIDs], [], [...selectedEdgeIDs]);
		selectedNodeIDs = [];
	}
	draw(window.performance.now());
}

function deleteSelected() {
	deleteNodes(selectedNodeIDs);
}

function moveNodes(delta: Vector2, nodeIDs: number[]) {
	nodeIDs.forEach(nodeID => {
		if (nodeID >= 0) {
			let node = nodes.get(nodeID)!;
			node.position = node.position.add(delta);
		}
		else
			throw new RangeError(`nodeID = ${nodeID} couldn't have found!`);
	});
}

function getConnectedNodes(selectedNodeID : number): number[]{
	if (selectedNodeID === -1) return [];
	const toVisit = [selectedNodeID];
	const visited = new Set<number>();

	while (toVisit.length > 0) {
		const i = toVisit.pop()!;
		if (visited.has(i)) continue;
		visited.add(i);

		for (const e of edges) {
			if (e[1].node1id === i && !visited.has(e[1].node2id))
				toVisit.push(e[1].node2id);
			else if (e[1].node2id === i && !visited.has(e[1].node1id))
				toVisit.push(e[1].node1id);
		}
	}
	return Array.from(visited);
}

function deleteNodes(nodeIndices: number[]) {
	let array = new Int32Array(nodeIndices).sort().reverse();
	let deletedNodes: GraphNode[] = [];
	let deletedEdges: GraphEdge[] = [];
	for (let nodeID of array){
		let node = nodes.get(nodeID)!;
		deletedEdges = [...deletedEdges, ...getConnectedEdges(nodeID)];
		deletedNodes.push(node);
		deleteNode(nodeID);
	}
	pushNodeDelete(deletedNodes, deletedEdges);
	draw(window.performance.now());
}

function deleteNode(nodeId: number) {
	for (let kv of edges){
		const edge = kv[1]!;
		// Tear off edges before deleting node
		if (edge.node1id === nodeId || edge.node2id === nodeId)
			edges.delete(edge.id);
	}
	removeItem(selectedNodeIDs, nodeId);
	for (let i = selectedNodeIDs.length - 1; i >= 0; i--) {
		const v = selectedNodeIDs[i];
		if (v !== undefined && v > nodeId) {
			selectedNodeIDs[i] = v - 1;
		}
	}
	nodes.delete(nodeId);
}

function cutEdges(scissor: Line) {
	let edgesToCut: GraphEdge[] = [];
	for (let kv of edges){
		const edge = kv[1]!;
		const node1 = nodes.get(edge.node1id)!;
		const node2 = nodes.get(edge.node2id)!;
		if (scissor.intersects(new Line(node1.position, node2.position))) {
			edgesToCut.push(structuredClone(edge!));
			edges.delete(edge.id);
		}
	}
	if (edgesToCut.length > 0)
		pushEdgeDelete(edgesToCut);
}

function isEdgeVisible(e: GraphEdge, camLeft: number, camRight: number,camTop: number, camBottom: number): boolean {
	const n1 = nodes.get(e.node1id)!.position;
	const n2 = nodes.get(e.node2id)!.position;
	const minX = Math.min(n1.x, n2.x);
	const maxX = Math.max(n1.x, n2.x);
	const minY = Math.min(n1.y, n2.y);
	const maxY = Math.max(n1.y, n2.y);
	return !(maxX < camLeft || minX > camRight || maxY < camTop || minY > camBottom);
}

function showDialog(id: string) {
	document.getElementById(id)?.classList.remove("hidden");
}

function closeDialog(id: string) {
	document.getElementById(id)?.classList.add("hidden");
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

//#endregion

//#region Undo/Redo

enum DeltaType {
	NodeAdd,
	NodeDelete,
	NodeMove,
	NodeUpdate,
	EdgeAdd,
	EdgeDelete,
	EdgeUpdate,
	EdgeSplit,
	EdgeDrop,
	Selection,
	Clear
}

type Delta =
	| { type: DeltaType.NodeAdd, node: GraphNode }
	| { type: DeltaType.NodeDelete, nodes: GraphNode[], oldEdges: GraphEdge[]}
	| { type: DeltaType.NodeMove, ids: number[], delta: Vector2}
	| { type: DeltaType.NodeUpdate, oldNode: GraphNode, newNode: GraphNode }
	| { type: DeltaType.EdgeAdd, edge: GraphEdge }
	| { type: DeltaType.EdgeDelete, edges: GraphEdge[] }
	| { type: DeltaType.EdgeUpdate, oldEdge: GraphEdge, newEdge: GraphEdge }
	| { type: DeltaType.EdgeSplit, splittedEdge: GraphEdge, newNode: GraphNode, edge1: GraphEdge, edge2: GraphEdge}
	| { type: DeltaType.EdgeDrop, edge: GraphEdge, newNode: GraphNode}
	| { type: DeltaType.Selection, addedNodeIDs: number[], removedNodeIDs: number[], addedEdgeIDs: number[], removedEdgeIDs: number[]}
	| { type: DeltaType.Clear, oldGraph: Graph, newGraph: Graph, oldSelectedNodeIDs: number[], oldSelectedEdgeIDs: number[]};

let undoStack: Delta[] = [];
let redoStack: Delta[] = [];

let undoButton = document.getElementById("undo") as HTMLButtonElement;
let redoButton = document.getElementById("redo") as HTMLButtonElement;
undoButton.disabled = true;
redoButton.disabled = true;

function pushDelta(d: Delta) {
	undoStack.push(d);
	undoStackStrings.push(deltaToString(d));
    redoStackStrings = [];
	updateHistoryPanel();
	redoStack = [];
	undoButton.disabled = false;
	redoButton.disabled = true;
}

function undo() {
	if (undoStack.length === 0){
		undoButton.disabled = true;
		return;
	}
	const d = undoStack.pop()!;
	undoButton.disabled = undoStack.length === 0;
	applyReverseDelta(d);
	redoStack.push(d);
	pushRedoDescription(deltaToString(d));
	redoButton.disabled = false;
	saveLastState();
	draw(performance.now());
}

function redo() {
	if (redoStack.length === 0){
		redoButton.disabled = true;
		return;
	}
	const d = redoStack.pop()!;
	redoButton.disabled = redoStack.length === 0;
	applyDelta(d);
	undoStack.push(d);
	pushUndoDescription(deltaToString(d));
	undoButton.disabled = false;
	
	saveLastState();
	draw(performance.now());
}

function undoToIndex(index: number){
	if (index >= undoStack.length)
		return;

	while (undoStack.length > index){
		undo();
	}
}

function redoToIndex(index: number){
	if (index >= redoStack.length)
		return;

	while (redoStack.length > index){
		redo();
	}
}

function applyDelta(d: Delta) {
	switch (d.type) {
		case DeltaType.NodeAdd:
			nodes.set(d.node.id, d.node);
			break;
		case DeltaType.NodeDelete:
			for(let node of d.nodes)
				deleteNode(node.id);
			break;
		case DeltaType.NodeMove:
			for (const i of d.ids)
				nodes.get(i)!.position = nodes.get(i)!.position.add(d.delta);
			break;
		case DeltaType.NodeUpdate:
			nodes.set(d.newNode.id, d.newNode);
			break;
		case DeltaType.EdgeAdd:
			edges.set(d.edge.id, d.edge);
			break;
		case DeltaType.EdgeDelete:
			for(let e of d.edges)
				edges.delete(e.id);
			break;
		case DeltaType.EdgeUpdate:
			edges.set(d.newEdge.id, d.newEdge);
			break;
		case DeltaType.EdgeSplit:
			nodes.set(d.newNode.id, d.newNode);
			edges.delete(d.splittedEdge.id);
			edges.set(d.edge1.id, d.edge1);
			edges.set(d.edge2.id, d.edge2);
			break;

		case DeltaType.EdgeDrop:
			nodes.set(d.newNode.id, d.newNode);
			edges.set(d.edge.id, d.edge);
			break;
		case DeltaType.Selection:
			for(let i of d.addedEdgeIDs)
				addItemUnique(selectedEdgeIDs, i);
			for(let i of d.removedEdgeIDs)
				removeItem(selectedEdgeIDs, i);
			for(let i of d.addedNodeIDs)
				addItemUnique(selectedNodeIDs, i);
			for(let i of d.removedNodeIDs)
				removeItem(selectedNodeIDs, i);
			break;
		case DeltaType.Clear:
			if (d.newGraph){
				importGraph(d.newGraph);
				selectedNodeIDs = [];
				selectedEdgeIDs = [];
			}
			break;
	}
}

function applyReverseDelta(d: Delta) {
	switch (d.type) {
		case DeltaType.NodeAdd:
			deleteNode(d.node.id);
			break;
		case DeltaType.NodeDelete:
			for (let i = 0; i<d.nodes.length; i++)
				nodes.set(d.nodes[i]!.id, d.nodes[i]!);
			for (let edge of getEdgeListCopy(d.oldEdges))
				edges.set(edge.id, edge);
			break;
		case DeltaType.NodeMove:
			for (const i of d.ids)
				nodes.get(i)!.position = nodes.get(i)!.position.sub(d.delta);
			break;
		case DeltaType.NodeUpdate:
			nodes.set(d.oldNode.id, d.oldNode);
			break;
		case DeltaType.EdgeAdd:
			edges.delete(d.edge.id);
			break;
		case DeltaType.EdgeDelete:
			for (let i = 0; i < d.edges.length; i++)
				edges.set(d.edges[i]!.id, d.edges[i]!);
			break;
		case DeltaType.EdgeUpdate:
			edges.set(d.oldEdge.id, d.oldEdge);
			break;
		case DeltaType.EdgeSplit:
			edges.delete(d.edge1.id);
			edges.delete(d.edge2.id);
			edges.set(d.splittedEdge.id, d.splittedEdge);
			nodes.delete(d.newNode.id);
			break;
		case DeltaType.EdgeDrop:
			deleteNode(d.newNode.id);
			break;
		case DeltaType.Selection:
			for(let i of d.removedEdgeIDs)
				addItemUnique(selectedEdgeIDs, i);
			for(let i of d.addedEdgeIDs)
				removeItem(selectedEdgeIDs, i);
			for(let i of d.removedNodeIDs)
				addItemUnique(selectedNodeIDs, i);
			for(let i of d.addedNodeIDs)
				removeItem(selectedNodeIDs, i);
			break;
		case DeltaType.Clear:
			if (d.oldGraph){
				importGraph(d.oldGraph);
				selectedNodeIDs = [...d.oldSelectedNodeIDs];
				selectedEdgeIDs = [...d.oldSelectedEdgeIDs];
			}
			break;
	}
}

function pushNodeAdd(node: GraphNode) {
	pushDelta({ type: DeltaType.NodeAdd, node: GraphNode.copyFromNode(node) });
}

function pushNodeDelete(nodes: GraphNode[], edgesList: GraphEdge[]) {
	pushDelta({ type: DeltaType.NodeDelete, nodes: [...nodes], oldEdges: getEdgeListCopy(edgesList)});
}

function pushNodeMove(ids: number[], delta: Vector2) {
	pushDelta({ type: DeltaType.NodeMove, ids:[...ids], delta});
}

function pushNodeUpdate(oldN: GraphNode, newN: GraphNode) {
	pushDelta({ type: DeltaType.NodeUpdate,oldNode: GraphNode.copyFromNode(oldN), newNode: GraphNode.copyFromNode(newN) });
}

function pushSelection(addedNodeIDs: number[], removedNodeIDs: number[], addedEdgeIDs: number[], removedEdgeIDs: number[]) {
	pushDelta({ type: DeltaType.Selection, addedNodeIDs: [...addedNodeIDs], removedNodeIDs: [...removedNodeIDs], addedEdgeIDs: [...addedEdgeIDs], removedEdgeIDs: [...removedEdgeIDs]});
}

function pushEdgeAdd(edge: GraphEdge) {
	pushDelta({ type: DeltaType.EdgeAdd, edge: GraphEdge.copyFromEdge(edge) });
}

function pushEdgeDelete(edges: GraphEdge[]) {
	pushDelta({ type: DeltaType.EdgeDelete, edges: getEdgeListCopy(edges) });
}

function pushEdgeUpdate(oldE: GraphEdge, newE: GraphEdge) {
	pushDelta({ type: DeltaType.EdgeUpdate, oldEdge: GraphEdge.copyFromEdge(oldE), newEdge: GraphEdge.copyFromEdge(newE) });
}

function pushEdgeSplit(splittedEdge: GraphEdge, newNode: GraphNode, edge1: GraphEdge, edge2: GraphEdge){
	pushDelta({ type: DeltaType.EdgeSplit,
		splittedEdge: GraphEdge.copyFromEdge(splittedEdge),
		newNode: GraphNode.copyFromNode(newNode),
		edge1: GraphEdge.copyFromEdge(edge1),
		edge2: GraphEdge.copyFromEdge(edge2)}
	);
}

function pushEdgeDrop(edge: GraphEdge, node: GraphNode){
	pushDelta({ type: DeltaType.EdgeDrop, edge: GraphEdge.copyFromEdge(edge), newNode: GraphNode.copyFromNode(node)});
}

function pushClear(oldgraph: Graph, newGraph: Graph, oldSelectedNodeIDs: number[], oldSelectedEdgeIDs: number[]){
	pushDelta({ type: DeltaType.Clear, oldGraph: oldgraph, newGraph: newGraph, oldSelectedNodeIDs: [...oldSelectedNodeIDs], oldSelectedEdgeIDs: [...oldSelectedEdgeIDs]});
}

//#region Undo/Redo History

enum Panel{
	EditPanel,
	HistoryPanel
}

const historyPanel = document.getElementById("historyPanel")!;
const contentPanel = document.getElementById("panelContent")!;
const sidePanel = document.getElementById("sidePanel")!;
const panelClose = document.getElementById("panelClose")!;
const tabHistory = document.getElementById("tabHistory")!;
const tabEdit = document.getElementById("tabEdit")!;
const historyContent = document.getElementById("historyContent")!;
const editContent = document.getElementById("editContent")!;

let undoStackStrings: string[] = [];
let redoStackStrings: string[] = [];

function pushUndoDescription(s: string) {
    undoStackStrings.push(s);
    redoStackStrings.pop();
    updateHistoryPanel();
}

function pushRedoDescription(s: string) {
    redoStackStrings.push(s);
	undoStackStrings.pop();
    updateHistoryPanel();
}

function updateHistoryPanel() {
    let html = '';
    for (let i = 0; i < undoStackStrings.length; i++)
        html += `<button onclick="undoToIndex(`+ i +`)" class="item">${undoStackStrings[i]}</button>`;
    for (let i = redoStackStrings.length - 1; i >= 0; i--)
        html += `<button onclick="redoToIndex(`+ i +`)" class="redoItem">${redoStackStrings[i]}</button>`;
    historyPanel.innerHTML = html;
	queueMicrotask(() => {
        contentPanel.scrollTop = contentPanel.scrollHeight;
    });
}

function deltaToString(d: Delta): string {
    switch (d.type) {
        case DeltaType.NodeAdd:
            return `Node added (${d.node.id})`;

        case DeltaType.NodeDelete:
            return `Deleted ${d.nodes.length} node(s)`;

        case DeltaType.NodeMove:
            return `Moved ${d.ids.length} node(s)`;

        case DeltaType.NodeUpdate:
            return `Updated node ${d.newNode.id}`;

        case DeltaType.EdgeAdd:
            return `Edge added (${d.edge.id})`;

        case DeltaType.EdgeDelete:
            return `Deleted ${d.edges.length} edge(s)`;

        case DeltaType.EdgeUpdate:
            return `Updated edge ${d.newEdge.id}`;

        case DeltaType.EdgeSplit:
            return `Split edge ${d.splittedEdge.id}`;

        case DeltaType.EdgeDrop:
            return `Dropped edge ${d.edge.id}`;

        case DeltaType.Selection:
            return `Selection changed`;

        case DeltaType.Clear:
            return `Graph cleared`;

        default:
            return "Unknown action";
    }
}

function openPanel(panel: Panel){
	sidePanel.classList.add("open");
	switch(panel){
		case Panel.EditPanel:
			tabEdit.classList.add("active");
			tabHistory.classList.remove("active");
			historyContent.style.display = "none";
			editContent.style.display = "block";
			break;
		case Panel.HistoryPanel:
			tabHistory.classList.add("active");
			tabEdit.classList.remove("active");
			historyContent.style.display = "block";
			editContent.style.display = "none";
			break;
	}
}

panelClose.onclick = () => {
    sidePanel.classList.remove("open");
};

//#endregion

//#endregion

//#region Edit Tooltip

let editingNode = -1;
let editingEdge = -1;
let isEditModalClosing = false;

function worldToScreen(pos: Vector2): Vector2 {
    return new Vector2(
        pos.x * screenData.zoom + screenData.offset.x,
        pos.y * screenData.zoom + screenData.offset.y
    );
}

function rgbToHex(c: string): string {
    if (c.startsWith("#")) return c;
    return "#ffffff";
}

function updateNodeProperties(nodeIndex: number) {
    editingNode = nodeIndex;
    editingEdge = -1;

    const node = nodes.get(nodeIndex)!;
    const html = `
        <label>Label</label>
        <input id="prop-label" value="${node.label}">

        <label>Color</label>
        <input id="prop-color" type="color" value="${rgbToHex(node.color)}">

        <label>Radius</label>
        <input id="prop-radius" type="number" min="5" max="200" value="${node.radius}">

        <button id="prop-save">Save</button>
        <!--<button id="prop-del">Delete</button>-->
    `;
    editContent.innerHTML = html;

    setTimeout(() => {
        (document.getElementById("prop-save") as HTMLButtonElement).onclick = () => {

			const oldNode = GraphNode.copyFromNode(node);
            node.label = (document.getElementById("prop-label") as HTMLInputElement).value;
            node.color = (document.getElementById("prop-color") as HTMLInputElement).value;
            node.radius = parseFloat((document.getElementById("prop-radius") as HTMLInputElement).value);
			pushNodeUpdate(oldNode, GraphNode.copyFromNode(node));

            saveLastState();
            draw(performance.now());
        };
		/*
        (document.getElementById("prop-del") as HTMLButtonElement).onclick = () => {
            pushNodeDelete([nodes.get(nodeIndex)!], getEdgeListCopy(getConnectedEdges(nodeIndex)));
			deleteNode(nodeIndex);
            saveLastState();
            draw(performance.now());
        };*/
    });
}

function updateEdgeProperties(edgeIndex: number) {
    editingEdge = edgeIndex;
    editingNode = -1;

    const e = edges.get(edgeIndex)!;

    const html = `
        <label>Weight</label>
        <input id="prop-weight" type="number" step="1" value="${e.weight ?? ""}">

        <label>Type</label>
        <select id="prop-type">
            <option value="0" ${e.edgeType === 0 ? "selected" : ""}>Bidirectional</option>
            <option value="1" ${e.edgeType === 1 ? "selected" : ""}>Directional</option>
        </select>

		<button id="prop-flip">Flip Direction</button>
        <button id="prop-save">Save</button>
        <!--<button id="prop-del">Delete</button>-->
    `;

    editContent.innerHTML = html;

    setTimeout(() => {
        (document.getElementById("prop-save") as HTMLButtonElement).onclick = () => {
            const w = (document.getElementById("prop-weight") as HTMLInputElement).value;
            const t = parseInt((document.getElementById("prop-type") as HTMLSelectElement).value);
			const oldEdge = GraphEdge.copyFromEdge(e);
            e.weight = w === "" ? null : parseFloat(w);
            e.edgeType = t;
			pushEdgeUpdate(oldEdge, GraphEdge.copyFromEdge(e));

            saveLastState();
            draw(performance.now());
        };
		(document.getElementById("prop-flip") as HTMLButtonElement).onclick = () => {
			const oldEdge = GraphEdge.copyFromEdge(e);
			e!.switchDirection();
			pushEdgeUpdate(oldEdge, GraphEdge.copyFromEdge(e));
            saveLastState();
            draw(performance.now());
        };
		/*
        (document.getElementById("prop-del") as HTMLButtonElement).onclick = () => {
			pushEdgeDelete([edges.get(edgeIndex)!]);
			edges.delete(edgeIndex);
            saveLastState();
            draw(performance.now());
        };*/
    });
}

//#endregion

let state = State.None;

// Camera transform
let screenData = new ScreenData(new Vector2(), 1);

let selectedNodeIDs: number[] = [];
let selectedEdgeIDs: number[] = [];
let mouseHoverNodeId: number = -1;
let mouseHoverEdgeId: number = -1;

let currentNodeColor: string;
let labelCounter = 1;

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

let edgeEditorEl: HTMLInputElement | null = null;


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

	for(let kv of nodes){
		
		const a = kv[1]!;
		let force = new Vector2();
		if ((lastMouseDownNodeId === a.id || selectedNodeIDs.contains(a.id)) && state == State.MoveNode)
			continue;
		
		for (let kv2 of nodes){
			const b = kv2[1]!;
			if (a.id === b.id) continue;
			const delta = a.position.sub(b!.position);
			let dist = delta.magnitude || 0.001;
			const dir = delta.div(dist);
			const falloff = 1 - (clamp(dist, 50, maxForceApplyDistance) / maxForceApplyDistance) ** 2;
			force = force.add(dir.mul(repulsion * falloff / (dist * dist)));
		}

		for (const e of edges) {
			if (nodes.get(e[1].node1id)!.id === a.id || nodes.get(e[1].node2id)!.id === a.id) {
				const other = nodes.get(e[1].node1id)!.id === a.id ? nodes.get(e[1].node2id)! : nodes.get(e[1].node2id)!;
				const delta = other.position.sub(a.position);
				let dist = delta.magnitude || 0.001;
				const dir = delta.div(dist);

				const w = e[1].weight ?? 1;
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
		node[1].position = node[1].position.add(node[1].velocity);

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
let lastMouseDownNodeId: number = -1;
let lastMouseDownEdgeId: number = -1;

function mousedown(event: MouseEvent) {
	if (edgeEditorEl && (event.target as HTMLInputElement) !== edgeEditorEl)
		return;
	let mousePosition = getPositionRelativeToElement(event.target as Element, event.clientX, event.clientY);
	let mouseDownNodeId = getNodeIDAtPosition(nodes, mousePosition);
	let mouseDownEdgeId = -1;
	if (mouseDownNodeId === -1)
		mouseDownEdgeId = getEdgeIDAtPosition(edges, mousePosition)

	switch (state) {
		case State.None:
			if (event.buttons === 1) // Left click
			{
				if (event.shiftKey && event.ctrlKey) {
					if (mouseDownNodeId !== -1) {
						addItemUnique(selectedNodeIDs, mouseDownNodeId);
						pushSelection([mouseDownNodeId], [], [], [...selectedEdgeIDs]);
						state = State.MoveNode;
					}
				}
				else if (event.shiftKey) {
					if (mouseDownEdgeId > -1){
						if (selectedEdgeIDs.contains(mouseDownEdgeId)){
							pushSelection([], [], [], [mouseDownEdgeId]);
							removeItem(selectedEdgeIDs, mouseDownEdgeId);
						}
						else{
							pushSelection( [], [...selectedNodeIDs], [mouseDownEdgeId], []);
							selectedNodeIDs = [];
							addItemUnique(selectedEdgeIDs, mouseDownEdgeId);
						}
					}
					else if (mouseDownNodeId === -1) {
						state = State.BoxSelect;
					}
					else {
						if (event.altKey){
							const connected = getConnectedNodes(mouseDownNodeId);
							pushSelection(connected, [], [], [...selectedEdgeIDs])
							connected.forEach((id) => {addItemUnique(selectedNodeIDs, id)});
							state = State.TreeSelect;
						}
						else if (!selectedNodeIDs.contains(mouseDownNodeId)) {
							addItemUnique(selectedNodeIDs, mouseDownNodeId);
							pushSelection([mouseDownNodeId], [], [], [...selectedEdgeIDs]);
							state = State.ScanSelect;
						}
						else {
							removeItem(selectedNodeIDs, mouseDownNodeId);
							pushSelection([], [mouseDownNodeId], [], []);
							state = State.ScanDeselect;
						}
					}
				}
				else if (event.ctrlKey) {
					if (mouseDownNodeId !== -1) {
						if (!selectedNodeIDs.contains(mouseDownNodeId)){
							pushSelection([mouseDownNodeId], [...selectedNodeIDs], [], [...selectedEdgeIDs]);
							selectedNodeIDs = [mouseDownNodeId];
						}
						state = State.MoveNode;
					}
					else {
						pushSelection([], [...selectedNodeIDs], [], [...selectedEdgeIDs]);
						selectedNodeIDs = [];
						selectedEdgeIDs = [];
					}
				}
				else if (event.altKey) {
					const treeIndices = getConnectedNodes(mouseDownNodeId);
					if (selectedNodeIDs.contains(mouseDownNodeId)){
						pushSelection([], [...treeIndices], [], []);
						treeIndices.forEach((id) => {removeItem(selectedNodeIDs, id)});
					}
					else{
						pushSelection([...treeIndices], [], [], [...selectedEdgeIDs]);
						selectedNodeIDs = treeIndices;
					}
					state = State.TreeSelect;
				}
				else {
					if (mouseDownNodeId === -1 && mouseDownEdgeId === -1) {
						currentNodeColor = randomHslColor();
						state = State.DrawNode;
					}
				}
			}
			else if (event.buttons === 2 && // Right click
				!event.shiftKey) // Shift key disables context menu prevention on Firefox
			{
				if (mouseDownNodeId !== -1) {
					pushNodeDelete([nodes.get(mouseDownNodeId)!], getConnectedEdges(mouseDownNodeId));
					deleteNode(mouseDownNodeId);
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
	lastMouseDownNodeId = mouseDownNodeId;
	lastMouseDownEdgeId = mouseDownEdgeId;
	lastMouseDownTimestamp = event.timeStamp;

	draw(window.performance.now());
}

function mousemove(event: MouseEvent) {
	if (edgeEditorEl && (event.target as HTMLInputElement) !== edgeEditorEl)
		return;
	let mousePosition = getPositionRelativeToElement(event.target as Element, event.clientX, event.clientY);
	mouseHoverNodeId = getNodeIDAtPosition(nodes, mousePosition);
	mouseHoverEdgeId = getEdgeIDAtPosition(edges, mousePosition);

	const movement = new Vector2(event.movementX, event.movementY).div(screenData.zoom);

	switch (state) {
		case State.None:
			if (event.buttons === 1){
				if (lastMouseDownEdgeId > -1 && mouseHoverEdgeId !== lastMouseDownEdgeId){
					currentNodeColor = randomHslColor();
					state = State.SplitEdge;
				}
				else if (lastMouseDownNodeId !== -1 &&
					nodes.get(lastMouseDownNodeId)!.position.sub(mousePosition).magnitudeSqr > nodes.get(lastMouseDownNodeId)!.radius ** 2) {
					state = State.DrawEdge;
				}
			}
			break;

		case State.Pan:
			screenData.offset = screenData.offset.add(movement.mul(screenData.zoom));
			saveLastState();
			break;

		case State.ScanSelect:
			if (mouseHoverNodeId !== -1){
				pushSelection([mouseHoverNodeId], [], [] , [...selectedEdgeIDs]);
				addItemUnique(selectedNodeIDs, mouseHoverNodeId);
			}
			break;

		case State.ScanDeselect:
			if (mouseHoverNodeId !== -1){
				pushSelection([], [mouseHoverNodeId], [], []);
				removeItem(selectedNodeIDs, mouseHoverNodeId);
			}
			break;

		case State.MoveNode:
			if (lastMouseDownNodeId !== -1) {
				if (selectedNodeIDs.contains(lastMouseDownNodeId))
					moveNodes(movement, selectedNodeIDs);
				else
					moveNodes(movement, [lastMouseDownNodeId]);
			}
			break;

		case State.DeleteNode:
			if (mouseHoverNodeId !== -1){
				pushNodeDelete([nodes.get(mouseHoverNodeId)!], getConnectedEdges(mouseHoverNodeId));
				deleteNode(mouseHoverNodeId);
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
	let mouseUpNodeId = getNodeIDAtPosition(nodes, mousePosition);
	let mouseUpEdgeId = getEdgeIDAtPosition(edges, mousePosition);

	switch (state) {
		case State.None:
			if (selectedNodeIDs.contains(lastMouseDownNodeId)){
				pushSelection([], [lastMouseDownNodeId], [], [])
				removeItem(selectedNodeIDs, lastMouseDownNodeId);
			}
			else if (lastMouseDownNodeId !== -1 && lastMouseDownEdgeId === -1  && lastMouseDownNodeId === mouseUpNodeId) {
				const oldSelectedNodeIndices = [...selectedNodeIDs];
				const oldSelectedEdgeIndices = [...selectedEdgeIDs];
				selectedNodeIDs = [];
				selectedEdgeIDs = [];
				pushSelection([mouseUpNodeId], oldSelectedNodeIndices, [], oldSelectedEdgeIndices);
				addItemUnique(selectedNodeIDs, mouseUpNodeId);
				updateNodeProperties(mouseUpNodeId);
			}else if (lastMouseDownEdgeId > -1 && lastMouseDownEdgeId === mouseUpEdgeId && !event.shiftKey){
				if (selectedEdgeIDs.contains(lastMouseDownEdgeId)){
					pushSelection([], [], [], [lastMouseDownEdgeId]);
					removeItem(selectedEdgeIDs, lastMouseDownEdgeId);
				}
				else{
					const oldSelectedEdgeIndices = [...selectedEdgeIDs];
					const oldSelectedNodeIndices = [...selectedNodeIDs];
					selectedEdgeIDs = [];
					selectedNodeIDs = [];
					const pos = getPositionRelativeToElement(canvas, event.clientX, event.clientY);
					const edgeIdx = getEdgeIDAtPosition(edges, pos);
					updateEdgeProperties(edgeIdx);
					pushSelection([], oldSelectedNodeIndices, [mouseUpEdgeId], oldSelectedEdgeIndices);
					addItemUnique(selectedEdgeIDs, lastMouseDownEdgeId);
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
			const indices = getNodeIDsInRect(rect);
			pushSelection(indices, [], [], [...selectedEdgeIDs]);
			selectedEdgeIDs = [];
			indices.forEach(nodeId => addItemUnique(selectedNodeIDs, nodeId));
			break;

		case State.DrawNode:
			if (lastMouseDownPosition === null)
				throw new Error("State machine bug.");
			let nodeRadius = mousePosition.sub(lastMouseDownPosition).magnitude;
			let created = new GraphNode(
					lastMouseDownPosition,
					nodeRadiusCurve(nodeRadius),
					currentNodeColor,
					"",
				);
			nodes.set(created.id, created);
			pushNodeAdd(created);
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
			
			nodes.set(newNode.id, newNode);
			
			const splittedEdge = edges.get(lastMouseDownEdgeId);
			const firstEdge = new GraphEdge(splittedEdge!.node1id, newNode.id, splittedEdge!.edgeType, splittedEdge!.weight);
			const secondEdge = new GraphEdge(newNode.id, splittedEdge!.node2id, splittedEdge!.edgeType, splittedEdge!.weight);
			edges.set(firstEdge.id, firstEdge);
			edges.set(secondEdge.id, secondEdge);
			pushEdgeSplit(splittedEdge!, newNode, firstEdge, secondEdge); 
			edges.delete(splittedEdge!.id);
			saveLastState();
			break;
		case State.MoveNode:
			if (lastMouseDownNodeId !== -1)
				pushNodeMove((selectedNodeIDs.contains(lastMouseDownNodeId)) ? selectedNodeIDs : [lastMouseDownNodeId], mousePosition.sub(lastMouseDownPosition!));
			saveLastState();
			break

		case State.DrawEdge:
			if (lastMouseDownNodeId !== -1 && mouseUpNodeId !== -1) {
				if (!edges.some((edge) => (edge!.node1id === lastMouseDownNodeId && edge!.node2id === mouseUpNodeId) ||
						(edge!.node1id === mouseUpNodeId && edge!.node2id === lastMouseDownNodeId))){
						const newEdge = new GraphEdge(lastMouseDownNodeId, mouseUpNodeId, EdgeType.Directional, 1);
						edges.set(newEdge.id, newEdge);
						pushEdgeAdd(newEdge);
						saveLastState();
					}
				else{
					const edge = edges.find((e) => (e!.node1id === mouseUpNodeId && e!.node2id === lastMouseDownNodeId)) as GraphEdge;
					if (edge)
					{
						const oldEdge = structuredClone(edge);
						if (edge.edgeType === EdgeType.Directional)
							edge.edgeType = EdgeType.Bidirectional
						pushEdgeUpdate(oldEdge, edge);
						saveLastState();
					}
				}
			}

			// create new node if edge drawing released on empty space
			else if (lastMouseDownNodeId !== -1)
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
					nodes.set(newNode.id, newNode);
					const edge = new GraphEdge(lastMouseDownNodeId, newNode.id, EdgeType.Directional, 1);
					edges.set(edge.id, edge);
					pushEdgeDrop(edge, newNode);
					saveLastState();
				}
			}
			
			break;

		case State.DeleteEdge:
			if (lastMouseDownPosition === null)
				throw new Error("State machine bug.");
			let mouseDeltaSqr = mousePosition.sub(lastMouseDownPosition).magnitudeSqr;
			if (mouseDeltaSqr < mouseHoldDistanceThreshold ** 2){
				pushSelection([], [...selectedNodeIDs], [], [...selectedEdgeIDs]);
				selectedNodeIDs = [];
			}
			saveLastState();
			break;
	}

	lastMouseDownNodeId = -1;
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
		public touchStartNodeId: number,
		public touchOnNodeId: number,
		public touchStartEdgeId: number,
		public touchOnEdgeId: number,
		public touchStartTimeStamp: number,
		public touchTimeStamp: number) { }
}

let touchInfos = new Map<number, TouchInfo>();

let lastSingleTouchStartNodeId = -1;
let lastSingleTouchStartEdgeId = -1;
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
		let touchStartNodeId = getNodeIDAtPosition(nodes, touchPosition);
		let touchStartEdgeId = -1;
		if (touchStartNodeId === -1)
			touchStartEdgeId = getEdgeIDAtPosition(edges, touchPosition);

		touchInfos.set(
			touch.identifier,
			new TouchInfo(
				touchPosition,
				touchPosition,
				new Vector2(touch.clientX, touch.clientY),
				new Vector2,
				touchStartNodeId,
				touchStartNodeId,
				touchStartEdgeId,
				touchStartEdgeId,
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
						if (touchInfo.touchStartNodeId !== -1) {
							pushNodeDelete([nodes.get(touchInfo.touchStartNodeId)!], getConnectedEdges(touchInfo.touchStartNodeId))
							deleteNode(touchInfo.touchStartNodeId);
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
							if (touchInfo.touchStartNodeId !== -1) {
								if (!selectedNodeIDs.contains(touchInfo.touchStartNodeId)){
									pushSelection([touchInfo.touchStartNodeId], [...selectedNodeIDs], [], [...selectedEdgeIDs]);
									selectedNodeIDs = [touchInfo.touchStartNodeId];
								}
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
		lastSingleTouchStartNodeId = touchInfo.touchStartNodeId;
		lastSingleTouchStartEdgeId = touchInfo.touchStartEdgeId;
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
		let touchOnNodeId = getNodeIDAtPosition(nodes, touchPosition);
		let touchOnEdgeId = getEdgeIDAtPosition(edges, touchPosition);
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
		touchInfo.touchOnNodeId = touchOnNodeId;
		touchInfo.touchOnEdgeId = touchOnEdgeId;
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
				if (touchInfo.touchStartNodeId !== -1)
					state = State.DrawEdge;
				else if (touchInfo.touchStartEdgeId !== -1){
					if (touchInfo.touchOnEdgeId !== touchInfo.touchStartEdgeId){
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
				if (selectedNodeIDs.contains(lastSingleTouchStartNodeId))
					moveNodes(touchInfo.touchDelta.div(screenData.zoom), selectedNodeIDs);
				else
					moveNodes(touchInfo.touchDelta.div(screenData.zoom), [lastSingleTouchStartNodeId]);
				saveLastState();
				break;

			case State.DeleteNode:
				if (touchInfo.touchOnNodeId !== -1){
					pushNodeDelete([nodes.get(touchInfo.touchOnNodeId)!], getConnectedEdges(touchInfo.touchOnNodeId));
					deleteNode(touchInfo.touchOnNodeId);
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
				if (touchInfo.touchStartNodeId !== -1) {
					if (!removeItem(selectedNodeIDs, touchInfo.touchStartNodeId)){
						pushSelection([touchInfo.touchStartNodeId], [], [], [...selectedEdgeIDs]);
						addItemUnique(selectedNodeIDs, touchInfo.touchStartNodeId);
						updateNodeProperties(touchInfo.touchStartNodeId);
					}
					else
						pushSelection([], [touchInfo.touchStartNodeId], [], [...selectedEdgeIDs]);
					selectedEdgeIDs = [];
					break;
				}
				else if (touchInfo.touchStartEdgeId !== -1){
					const pos = touchInfo.touchPosition;
					const edgeIdx = getEdgeIDAtPosition(edges, pos);
					if (edgeIdx !== -1) {
						updateEdgeProperties(edgeIdx);
					}
					if (!removeItem(selectedEdgeIDs, touchInfo.touchStartEdgeId)){
						pushSelection([], [...selectedNodeIDs], [touchInfo.touchStartEdgeId], []);
						addItemUnique(selectedEdgeIDs, touchInfo.touchStartEdgeId);
						updateNodeProperties(touchInfo.touchStartEdgeId);
					}
					else
						pushSelection([], [...selectedNodeIDs], [], [touchInfo.touchStartEdgeId]);
					selectedNodeIDs = [];
					break;
				}
				currentNodeColor = randomHslColor();
			// goto case State.DrawNode;
			case State.DrawNode:
				if (lastSingleTouchStartPosition === null)
					throw new Error("State machine bug.");
				let nodeRadius = touchInfo.touchPosition.sub(lastSingleTouchStartPosition).magnitude;
				const node = new GraphNode(
						lastSingleTouchStartPosition,
						nodeRadiusCurve(nodeRadius),
						currentNodeColor,
						""
					);
				nodes.set(node.id, node);
				pushNodeAdd(node);
				saveLastState();
				break;

			case State.DrawEdge:
				if (lastSingleTouchStartNodeId !== -1 && touchInfo.touchOnNodeId !== -1) {
					if (!edges.some((edge) => edge!.node1id === lastSingleTouchStartNodeId && edge!.node2id === touchInfo.touchOnNodeId)){
						const edge = new GraphEdge(lastSingleTouchStartNodeId, touchInfo.touchOnNodeId, EdgeType.Directional, 1);
						edges.set(edge.id, edge);
						pushEdgeAdd(edge);
						saveLastState();
					}
					else{
						const edge = edges.find((e) => (e!.node1id === touchInfo.touchOnNodeId && e!.node2id === lastSingleTouchStartNodeId)) as GraphEdge;
						if (edge)
						{
							const oldEdge = GraphEdge.copyFromEdge(edge);
							if (edge.edgeType === EdgeType.Directional)
								edge.edgeType = EdgeType.Bidirectional
							pushEdgeUpdate(oldEdge, edge);
							saveLastState();
						}
					}
				}
				else if (lastSingleTouchStartNodeId !== -1)
				{
					if (lastSingleTouchPosition === null)
						throw new Error("State machine bug.");
					const newNode = new GraphNode(
						new Vector2(touchInfo.touchPosition.x, touchInfo.touchPosition.y),
						defaultNodeRadius,
						randomHslColor(),
						"",
					)
					nodes.set(newNode.id, newNode);
					const edge = new GraphEdge(lastSingleTouchStartNodeId, newNode.id, EdgeType.Directional, 1);
					edges.set(edge.id, edge);
					pushEdgeDrop(edge, newNode);
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
				nodes.set(newNode.id, newNode);
				const splittedEdge = edges.get(touchInfo.touchStartEdgeId);
				const edge1 = new GraphEdge(splittedEdge!.node1id, newNode.id, splittedEdge!.edgeType, splittedEdge!.weight);
				const edge2 = new GraphEdge(newNode.id, splittedEdge!.node2id, splittedEdge!.edgeType, splittedEdge!.weight);

				edges.set(edge1.id, edge1);
				edges.set(edge2.id, edge2);
				pushEdgeSplit(splittedEdge!, newNode, edge1!, edge2!);
				edges.delete(splittedEdge!.id);
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
				let indices: number[] = [];
				for(let i of getNodeIDsInRect(rect)){
					if (addItemUnique(selectedNodeIDs, i))
						indices.push(i);
				}
				getNodeIDsInRect(rect).forEach(nodeId => addItemUnique(selectedNodeIDs, nodeId));
				pushSelection([...indices], [], [], [...selectedEdgeIDs]);
				selectedEdgeIDs = [];
				break;
			case State.MoveNode:
				pushNodeMove(selectedNodeIDs, touchInfo.touchPosition.sub(touchInfo.touchStartPosition));
				break;
		}
	}

	if (touchInfos.size === 0) {
		clearTimeout(touchHoldTimer);
		touchHoldTimer = undefined;
		state = State.None;
	}
	else if (touchInfos.size === 1){
		if (lastSingleTouchStartNodeId !== -1){
			const indices = getConnectedNodes(lastSingleTouchStartNodeId);
			pushSelection([...indices], [], [], [...selectedEdgeIDs]);
			selectedNodeIDs = indices;
			selectedEdgeIDs = [];
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

function resize(entries?: ResizeObserverEntry[], observer?: ResizeObserver) {
	canvas.width = canvas.clientWidth * window.devicePixelRatio;
	canvas.height = canvas.clientHeight * window.devicePixelRatio;
	draw(window.performance.now());
}

let lastDrawTimestamp: number = -1;

function draw(timeStamp: number) {

	if (Modernizr.touchevents) {
		lastMouseDownPosition	= lastSingleTouchStartPosition;
		lastMousePosition		= lastSingleTouchPosition;
		lastMouseDownNodeId		= lastSingleTouchStartNodeId;
		lastMouseDownEdgeId		= lastSingleTouchStartEdgeId;
	}

	let f: AnimFrame | null = null;
	let prog = 0;
	if (timeline.frames.length > 0) {
		const idx = Math.floor(timeline.playhead);
		f = timeline.frames[idx] ?? null;
		prog = timeline.playhead - idx;
	}

	const HN = f ? f.highlightedNodeIndices	: highlightedNodeIndices;
	const HE = f ? f.highlightedEdgeIndices	: highlightedEdgeIndices;
	const AE = f ? f.animatedEdgeIndices	: [];
	const AN = f ? f.animatedNodeIDs		: [];

	ctx.save();
	try {
		ctx.setTransform(1,0,0,1,0,0);
		ctx.clearRect(0,0,canvas.width,canvas.height);

		ctx.setTransform(
			screenData.zoom * devicePixelRatio,
			0,0,
			screenData.zoom * devicePixelRatio,
			screenData.offset.x * devicePixelRatio,
			screenData.offset.y * devicePixelRatio
		);

		clearCanvas(canvas, ctx, "white");

		if (lastMousePosition !== null) {
			ctx.strokeStyle = "gray";
			ctx.lineWidth = edgeThickness;

			if (state === State.DrawEdge && lastMouseDownNodeId !== -1) {
				ctx.beginPath();
				ctx.moveTo(nodes.get(lastMouseDownNodeId)!.position.x, nodes.get(lastMouseDownNodeId)!.position.y);
				ctx.lineTo(lastMousePosition.x, lastMousePosition.y);
				ctx.stroke();
			}

			if (state === State.SplitEdge) {
				const e = edges.get(lastMouseDownEdgeId);
				if (e) {
					const n1 = nodes.get(e.node1id), n2 = nodes.get(e.node2id);
					if (n1 && n2) {
						ctx.beginPath();
						ctx.moveTo(n1.position.x, n1.position.y);
						ctx.lineTo(lastMousePosition.x!, lastMousePosition.y!);
						ctx.lineTo(n2.position.x, n2.position.y);
						ctx.stroke();
					}
				}
			}
		}

		const camLeft	= -screenData.offset.x / screenData.zoom;
		const camTop	= -screenData.offset.y / screenData.zoom;
		const camRight	= (canvas.width  - screenData.offset.x) / screenData.zoom;
		const camBottom	= (canvas.height - screenData.offset.y) / screenData.zoom;

		for (let kv of edges){

			const e = kv[1]!;
			if (!e) continue;

			const n1 = nodes.get(e.node1id);
			const n2 = nodes.get(e.node2id);
			if (!n1 || !n2) continue;

			if (state === State.SplitEdge && e.id === lastMouseDownEdgeId) continue;
			if (!isEdgeVisible(e, camLeft, camRight, camTop, camBottom)) continue;

			if (e.edgeType === EdgeType.Directional) {
				const v = n2.position.sub(n1.position);
				const len = v.magnitude;

				if (len > 0.001) {
					const dir = v.div(len);
					const tail = n2.position.sub(dir.mul(n2.radius));
					const mid  = tail.sub(dir.mul(10));
					const L = mid.rotatedAround( 30, tail);
					const R = mid.rotatedAround(-30, tail);

					ctx.fillStyle = (selectedEdgeIDs.contains(e.id)) ? "blue" : "gray";
					ctx.beginPath();
					ctx.moveTo(tail.x, tail.y);
					ctx.lineTo(L.x, L.y);
					ctx.lineTo(R.x, R.y);
					ctx.fill();
				}
			}

			ctx.strokeStyle = (selectedEdgeIDs.contains(e.id)) ? "blue" : "gray";
			ctx.lineWidth = edgeThickness;
			ctx.beginPath();
			ctx.moveTo(n1.position.x, n1.position.y);
			ctx.lineTo(n2.position.x, n2.position.y);
			ctx.stroke();

			if (e.weight !== null) {
				const mid = n1.position.add(n2.position).div(2);
				ctx.fillStyle = "white";
				ctx.beginPath();
				ctx.arc(mid.x, mid.y, edgeWeightEditRadius, 0, 360);
				ctx.fill();

				ctx.fillStyle = "blue";
				ctx.font = "bold 15px sans-serif";
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.fillText(e.weight!.toString(), mid.x, mid.y);
			}
		}

		ctx.strokeStyle = "red";
		ctx.lineWidth = edgeThickness * 2;

		for (const ei of HE) {
			const e = edges.get(ei);
			if (!e) continue;
			const n1 = nodes.get(e.node1id), n2 = nodes.get(e.node2id);
			if (!n1 || !n2) continue;

			ctx.beginPath();
			ctx.moveTo(n1.position.x, n1.position.y);
			ctx.lineTo(n2.position.x, n2.position.y);
			ctx.stroke();
		}

		for (let [k, e] of edges){
			if (!e) continue;
			if (!AE.contains(e.id)) continue;
			const n1 = nodes.get(e.node1id), n2 = nodes.get(e.node2id);
			if (!n1 || !n2) continue;

			const v  = n2.position.sub(n1.position);
			const len = v.magnitude;
			if (len < 0.001) continue;

			const dir = v.div(len);
			const t = Math.max(0, Math.min(1, prog));
			const end = n1.position.add(dir.mul(len * t));

			ctx.strokeStyle = "red";
			ctx.lineWidth = edgeThickness * 2;
			ctx.beginPath();
			ctx.moveTo(n1.position.x, n1.position.y);
			ctx.lineTo(end.x, end.y);
			ctx.stroke();
		}

		ctx.font = "bold 15px sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		for(let kv of nodes){
			const node = kv[1]!;

			if (
				node.position.x + node.radius < camLeft ||
				node.position.x - node.radius > camRight ||
				node.position.y + node.radius < camTop ||
				node.position.y - node.radius > camBottom
			) continue;

			ctx.fillStyle = node.color;
			ctx.beginPath();
			ctx.arc(node.position.x, node.position.y, node.radius, 0, 360);
			ctx.fill();

			let labelToDraw = node.label;
			if (f && f.labels && f.labels[node.id] !== undefined)
				labelToDraw = f.labels[node.id]!;

			ctx.fillStyle = "white";
			ctx.fillText(labelToDraw, node.position.x, node.position.y);
		}

		if (state===State.DrawNode && lastMousePosition && lastMouseDownPosition) {
			const r = lastMousePosition.sub(lastMouseDownPosition).magnitude;
			ctx.fillStyle = currentNodeColor;
			ctx.beginPath();
			ctx.arc(lastMouseDownPosition.x, lastMouseDownPosition.y, nodeRadiusCurve(r), 0, 360);
			ctx.fill();
		}

		if (state===State.SplitEdge && lastMousePosition) {
			ctx.fillStyle = currentNodeColor;
			ctx.beginPath();
			ctx.arc(lastMousePosition.x, lastMousePosition.y, defaultNodeRadius, 0, 360);
			ctx.fill();
		}

		ctx.strokeStyle = "gray";
		ctx.lineWidth = 4;

		for (const ni of selectedNodeIDs) {
			const n = nodes.get(ni);
			if (!n) continue;

			ctx.beginPath();
			ctx.arc(n.position.x, n.position.y, n.radius, 0, 360);
			ctx.stroke();
		}

		if (state===State.BoxSelect && lastMousePosition && lastMouseDownPosition) {
			ctx.setLineDash([4,4]);
			ctx.strokeStyle = "gray";
			ctx.lineWidth = 1;
			ctx.strokeRect(
				lastMouseDownPosition.x,
				lastMouseDownPosition.y,
				lastMousePosition.x-lastMouseDownPosition.x,
				lastMousePosition.y-lastMouseDownPosition.y
			);
		}

		ctx.strokeStyle = "red";
		ctx.lineWidth = 4;

		for (const ni of HN) {
			const n = nodes.get(ni);
			if (!n) continue;

			ctx.beginPath();
			ctx.arc(n.position.x, n.position.y, n.radius, 0, 360);
			ctx.stroke();
		}
		if (AN){
			for (const anim of AN){
				const n = nodes.get(anim.id);
				if (!n) continue;

				const angle = anim.angle + prog * 2 * Math.PI;
	
				ctx.beginPath();
				ctx.arc(n.position.x, n.position.y, n.radius, anim.angle, angle);
				ctx.stroke();
			}
		}
	}
	finally { ctx.restore(); }

	lastDrawTimestamp = timeStamp;
}
