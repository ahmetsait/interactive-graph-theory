"use strict";

CanvasRenderingContext2D.prototype.clear = function (preserveTransform) {
	if (preserveTransform) {
		this.save();
		this.setTransform(1, 0, 0, 1, 0, 0);
	}

	this.fillStyle = 'azure';
	this.fillRect(0, 0, this.canvas.width, this.canvas.height);

	if (preserveTransform) {
		this.restore();
	}
};

function randHSLColor(lightness) {
	return `hsl(${Math.floor(Math.random() * 360)},${Math.floor(Math.random() * 50 + 25)}%,${lightness}%)`;
}

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { alpha: false });
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = 'high'

window.addEventListener('load', load);
new ResizeObserver(resize).observe(canvas);
canvas.addEventListener('mousedown', mousedown);
canvas.addEventListener('mousemove', mousemove);
canvas.addEventListener('mouseup', mouseup);
canvas.addEventListener('touchstart', touchstart);
canvas.addEventListener('touchmove', touchmove);
canvas.addEventListener('touchend', touchend);
canvas.addEventListener('contextmenu', event => event.preventDefault());

const nodeRadius = 12.5;
const edgeThickness = 2;

let nodes = [];
let edges = [];

let firstNode = undefined;
let airEdge = undefined;
let nodeDeleted = false;

function getRelativePosition(event) {

	let rect = event.target.getBoundingClientRect();

	let x = event.clientX - rect.left;
	let y = event.clientY - rect.top;

	return { x, y };
}

function lineIntersection(line1p1, line1p2, line2p1, line2p2) {
	let det, gamma, lambda;
	det = (line1p2.x - line1p1.x) * (line2p2.y - line2p1.y) - (line2p2.x - line2p1.x) * (line1p2.y - line1p1.y);
	if (det === 0) {
		return false;
	} else {
		lambda = ((line2p2.y - line2p1.y) * (line2p2.x - line1p1.x) + (line2p1.x - line2p2.x) * (line2p2.y - line1p1.y)) / det;
		gamma = ((line1p1.y - line1p2.y) * (line2p2.x - line1p1.x) + (line1p2.x - line1p1.x) * (line2p2.y - line1p1.y)) / det;
		return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
	}
}

function mousedown(event) {
	let point = getRelativePosition(event);
	if (event.buttons === 1) {
		for (let i = 0; i < nodes.length; i++) {
			let node = nodes[i];
			if ((point.x - node.x) ** 2 + (point.y - node.y) ** 2 < (nodeRadius * 2) ** 2) {
				firstNode = i;
				break;
			}
		}
		// Node add
		if (firstNode === undefined)
			nodes.push({ x: point.x, y: point.y, color: randHSLColor(50) });
	}
	// Node delete
	else if (event.buttons === 2 && !event.shiftKey) {
		let selected = undefined;
		for (let i = 0; i < nodes.length; i++) {
			let node = nodes[i];
			if ((point.x - node.x) ** 2 + (point.y - node.y) ** 2 < nodeRadius ** 2) {
				selected = i;
				break;
			}
		}
		if (selected !== undefined) {
			for (let i = edges.length - 1; i >= 0; i--) {
				const edge = edges[i];
				if (edge.firstNode === selected || edge.secondNode === selected)
					edges.splice(i, 1);
			}
			for (let i = edges.length - 1; i >= 0; i--) {
				const edge = edges[i];
				if (edge.firstNode > selected)
					edge.firstNode--;
				if (edge.secondNode > selected)
					edge.secondNode--;
			}
			nodes.splice(selected, 1);
			nodeDeleted = true;
		}
	}
}

let lastMousePosition = undefined;

function mousemove(event) {
	let pos = getRelativePosition(event);
	// Temp edge
	if (event.buttons === 1) {
		if (firstNode !== undefined) {
			if (event.shiftKey && airEdge === undefined) {
				nodes[firstNode].x = pos.x;
				nodes[firstNode].y = pos.y;
			}
			else
				airEdge = pos;
		}
	}

	// Edge delete
	if (event.buttons === 2 && !nodeDeleted) {
		if (lastMousePosition !== undefined) {
			for (let i = edges.length - 1; i >= 0; i--) {
				const edge = edges[i];
				const node1 = nodes[edge.firstNode];
				const node2 = nodes[edge.secondNode];
				if (lineIntersection(lastMousePosition, pos, node1, node2)) {
					edges.splice(i, 1);
				}
			}
		}
	}
	lastMousePosition = pos;
}

function mouseup(event) {
	if (firstNode === undefined) {
		return;
	}

	let point = getRelativePosition(event);
	let secondNode = undefined;

	for (let i = 0; i < nodes.length; i++) {
		let node = nodes[i];
		if ((point.x - node.x) ** 2 + (point.y - node.y) ** 2 < (nodeRadius * 2) ** 2) {
			secondNode = i;
			break;
		}
	}
	// Edge add
	if (firstNode !== undefined && secondNode !== undefined) {
		if (!edges.some((edge) => edge.firstNode === firstNode && edge.secondNode === secondNode))
			edges.push({ firstNode, secondNode });
	}
	firstNode = undefined;
	airEdge = undefined;
	nodeDeleted = false;
}

let lastTouched = undefined;

function touchstart(event){
	event.preventDefault();
	if (lastTouched === undefined)
		lastTouched = event.timeStamp;
	let deltaTime = event.timeStamp - lastTouched;
	lastTouched = event.timeStamp;
	let rect = event.target.getBoundingClientRect();

	let x = event.touches[0].clientX - rect.left;
	let y = event.touches[0].clientY - rect.top;

	for (let i = 0; i < nodes.length; i++) {
		let node = nodes[i];
		if ((x - node.x) ** 2 + (y - node.y) ** 2 < (nodeRadius * 2) ** 2) {
			firstNode = i;
			break;
		}
	}

	// Node delete
	if (deltaTime < 200) { // 200ms
		let selected = undefined;
		for (let i = 0; i < nodes.length; i++) {
			let node = nodes[i];
			if ((x - node.x) ** 2 + (y - node.y) ** 2 < (nodeRadius * 2) ** 2) {
				selected = i;
				break;
			}
		}
		if (selected !== undefined) {
			for (let i = edges.length - 1; i >= 0; i--) {
				const edge = edges[i];
				if (edge.firstNode === selected || edge.secondNode === selected)
					edges.splice(i, 1);
			}
			for (let i = edges.length - 1; i >= 0; i--) {
				const edge = edges[i];
				if (edge.firstNode > selected)
					edge.firstNode--;
				if (edge.secondNode > selected)
					edge.secondNode--;
			}
			nodes.splice(selected, 1);
			nodeDeleted = true;
		}
	}
	lastMousePosition = {x:x, y:y};
}

function touchmove(event){
	
	if (nodeDeleted) return;
	if (lastTouched === undefined)
		lastTouched = event.timeStamp;

	let deltaTime = event.timeStamp - lastTouched;
	let rect = event.target.getBoundingClientRect();

	let x = event.changedTouches[0].clientX - rect.left;
	let y = event.changedTouches[0].clientY - rect.top;

	// Node move and temp edge 
	if (firstNode !== undefined) {
		if (deltaTime > 200 && airEdge === undefined) {
			nodes[firstNode].x = x;
			nodes[firstNode].y = y;
		}
		else
			airEdge = {x:x, y:y};
	}

	// Edge delete
	if (deltaTime > 500 && firstNode === undefined) {
		if (lastMousePosition !== undefined) {
			for (let i = edges.length - 1; i >= 0; i--) {
				const edge = edges[i];
				const node1 = nodes[edge.firstNode];
				const node2 = nodes[edge.secondNode];
				if (lineIntersection(lastMousePosition, {x:x, y:y}, node1, node2)) {
					edges.splice(i, 1);
				}
			}
		}
	}
	lastMousePosition = {x:x, y:y};
}

function touchend(event){
	if (lastTouched === undefined)
		lastTouched = event.timeStamp;
	let deltaTime = event.timeStamp - lastTouched;
	
	let rect = event.target.getBoundingClientRect();

	let x = event.changedTouches[0].clientX - rect.left;
	let y = event.changedTouches[0].clientY - rect.top;
	let secondNode = undefined;



	for (let i = 0; i < nodes.length; i++) {
		let node = nodes[i];
		if ((x - node.x) ** 2 + (y - node.y) ** 2 < (nodeRadius * 2) ** 2) {
			secondNode = i;
			break;
		}
	}
	
	// Node add
	if (firstNode === undefined && deltaTime < 500 && secondNode === undefined) {
		nodes.push({ x: x, y: y, color: randHSLColor(50) });
		return;
	}

	// Edge add
	if (firstNode !== undefined && secondNode !== undefined) {
		if (!edges.some((edge) => edge.firstNode === firstNode && edge.secondNode === secondNode))
			edges.push({ firstNode, secondNode });
	}
	firstNode = undefined;
	airEdge = undefined;
	nodeDeleted = false;
}

function load() {
	resize();
	window.requestAnimationFrame(draw);
}

function resize(event) {
	canvas.width = canvas.clientWidth * window.devicePixelRatio;
	canvas.height = canvas.clientHeight * window.devicePixelRatio;
}

let lastTimestamp = undefined;

function draw(timestamp) {
	if (lastTimestamp === undefined)
		lastTimestamp = timestamp;

	let deltaTime = lastTimestamp - timestamp;

	let now = new Date();

	ctx.save();
	ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
	ctx.clear();

	ctx.strokeStyle = "gray";
	ctx.lineWidth = edgeThickness;

	if (firstNode !== undefined && airEdge !== undefined) {
		ctx.beginPath();
		ctx.save();
		ctx.moveTo(nodes[firstNode].x, nodes[firstNode].y);
		ctx.lineTo(airEdge.x, airEdge.y);
		ctx.restore();
		ctx.stroke();
	}

	edges.forEach(edge => {
		ctx.beginPath();
		ctx.save();
		ctx.moveTo(nodes[edge.firstNode].x, nodes[edge.firstNode].y);
		ctx.lineTo(nodes[edge.secondNode].x, nodes[edge.secondNode].y);
		ctx.restore();
		ctx.stroke();
	});

	nodes.forEach(node => {
		ctx.fillStyle = node.color;
		ctx.beginPath();
		ctx.arc(node.x, node.y, nodeRadius, 0, 360);
		ctx.fill();
	});

	ctx.restore();

	window.requestAnimationFrame(draw);
}
