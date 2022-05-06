"use strict";

CanvasRenderingContext2D.prototype.clear = function () {
	this.save();
	try {
		this.setTransform(1, 0, 0, 1, 0, 0);
		this.fillStyle = 'azure';
		this.fillRect(0, 0, this.canvas.width, this.canvas.height);
	} finally {
		this.restore();
	}
};

function randomHSLColor(lightness) {
	return `hsl(${Math.floor(Math.random() * 360)},${Math.floor(Math.random() * 50 + 25)}%,${lightness}%)`;
}

const defaultNodeRadius = 12.5;	// px
const edgeThickness = 2;	// px

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { alpha: false });
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = 'high'

window.addEventListener('load', load);

new ResizeObserver(resize).observe(canvas);
canvas.addEventListener('mousedown', mousedown);
canvas.addEventListener('mousemove', mousemove);
canvas.addEventListener('mouseup', mouseup);
canvas.addEventListener('wheel', wheel);
// canvas.addEventListener('touchstart', touchstart, { passive: false });
// canvas.addEventListener('touchmove', touchmove, { passive: false });
// canvas.addEventListener('touchend', touchend, { passive: false });
canvas.addEventListener('contextmenu', event => event.preventDefault());

let nodes = [];
let edges = [];

const State = {
	None: 0,
	DrawNode: 1,
	MoveNode: 2,
	DeleteNode: 3,
	DrawEdge: 4,
	DeleteEdge: 5,
	BoxSelect: 6,
	ScanSelect: 7,
	Pan: 8,
	Zoom: 9,
};

let state = State.None;

// Camera transform
let offsetX = 0, offsetY = 0;

let selectedNodeIndices = new Set();
let hoveringNodeIndex = undefined;

let currentNodeColor = undefined;
let nameCounter = 1;

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

function getNodeIndexAtPosition(nodes, position) {
	let closestNodeIndex = undefined,
		closestNodeX = undefined,
		closestNodeY = undefined;
	for (let i = 0; i < nodes.length; i++) {
		let node = nodes[i];
		let distance = (position.x - node.x) ** 2 + (position.y - node.y) ** 2;
		if (distance < (node.radius + defaultNodeRadius) ** 2) {
			if (closestNodeIndex === undefined)
				closestNodeIndex = i;
			else if (distance < (closestNodeX - node.x) ** 2 + (closestNodeY - node.y) ** 2) {
				closestNodeIndex = i;
				closestNodeX = node.x;
				closestNodeY = node.y;
			}
		}
	}
	return closestNodeIndex;
}

function getNodesIndicesInBox(nodes, box) {
	let result = [];
	nodes.forEach((node, index) => {
		if (node.x < box.right && node.x > box.left && node.y < box.bottom && node.y > box.top)
			result.push(index);
	});
	return result;
}

function getRelativePosition(element, x, y) {
	let rect = element.getBoundingClientRect();
	return { x: x - rect.left - offsetX, y: y - rect.top - offsetY };
}

let lastMousePosition = undefined;
let lastMouseDownPosition = undefined;
let lastMouseDownTimestamp = undefined;
let lastMouseDownNodeIndex = undefined;

function mousedown(event) {
	let mousePosition = getRelativePosition(event.target, event.clientX, event.clientY);
	let mouseDownNodeIndex = getNodeIndexAtPosition(nodes, mousePosition);
	
	switch (state) {
		case State.None:
			if (event.buttons === 1) { // Left click
				if (event.shiftKey && event.ctrlKey) {
					if (mouseDownNodeIndex !== undefined) {
						selectedNodeIndices.add(mouseDownNodeIndex);
						state = State.MoveNode;
					}
				} else if (event.shiftKey) {
					if (mouseDownNodeIndex === undefined) {
						state = State.BoxSelect;
					} else {
						selectedNodeIndices.add(mouseDownNodeIndex);
						state = State.ScanSelect;
					}
				} else if (event.ctrlKey) {
					if (!selectedNodeIndices.has(mouseDownNodeIndex))
						selectedNodeIndices.clear();
					if (mouseDownNodeIndex !== undefined) {
						selectedNodeIndices.add(mouseDownNodeIndex);
						state = State.MoveNode;
					}
				} else if (event.altKey) {
					state = State.Pan;
				} else {
					if (mouseDownNodeIndex === undefined) {
						currentNodeColor = randomHSLColor(50);
						state = State.DrawNode;
					}
				}
			}
			else if (event.buttons === 2 && !event.shiftKey) { // Right click
				// Shift key disables context menu prevention on Firefox
				if (mouseDownNodeIndex !== undefined)
					state = State.DeleteNode;
				else
					state = State.DeleteEdge;
			}
			else if (event.buttons === 4) { // Middle click
				state = State.Pan;
			}
			break;
	}

	lastMouseDownPosition = lastMousePosition = mousePosition;
	lastMouseDownNodeIndex = mouseDownNodeIndex;
	lastMouseDownTimestamp = event.timeStamp;
}

function mousemove(event) {
	let mousePosition = getRelativePosition(event.target, event.clientX, event.clientY);
	hoveringNodeIndex = getNodeIndexAtPosition(nodes, mousePosition);

	switch (state) {
		case State.None:
			if (event.buttons === 1 && lastMouseDownNodeIndex !== undefined && (nodes[lastMouseDownNodeIndex].x - mousePosition.x) ** 2 + (nodes[lastMouseDownNodeIndex].y - mousePosition.y) ** 2 > nodes[lastMouseDownNodeIndex].radius ** 2) {
				state = State.DrawEdge;
			}
			break;
		case State.Pan:
			offsetX += event.movementX;
			offsetY += event.movementY;
			break;
		case State.ScanSelect:
			if (hoveringNodeIndex !== undefined)
				selectedNodeIndices.add(hoveringNodeIndex);
			break;
		case State.MoveNode:
			selectedNodeIndices.forEach(nodeIndex => {
				nodes[nodeIndex].x += event.movementX;
				nodes[nodeIndex].y += event.movementY;
			});
			break;
		case State.DeleteNode:
			if (hoveringNodeIndex !== undefined) {
				for (let i = edges.length - 1; i >= 0; i--) {
					const edge = edges[i];
					// Tear off edges before deleting node
					if (edge.nodeIndex1 === hoveringNodeIndex || edge.nodeIndex2 === hoveringNodeIndex)
						edges.splice(i, 1);
					// Shift node indices after deletion
					if (edge.nodeIndex1 > hoveringNodeIndex)
						edge.nodeIndex1--;
					if (edge.nodeIndex2 > hoveringNodeIndex)
						edge.nodeIndex2--;
				}
				selectedNodeIndices.delete(hoveringNodeIndex);
				nodes.splice(hoveringNodeIndex, 1);
			}
			break;
		case State.DeleteEdge:
			if (lastMousePosition !== undefined) {
				for (let i = edges.length - 1; i >= 0; i--) {
					const edge = edges[i];
					const node1 = nodes[edge.nodeIndex1];
					const node2 = nodes[edge.nodeIndex2];
					if (lineIntersection(lastMousePosition, mousePosition, node1, node2)) {
						edges.splice(i, 1);
					}
				}
			}
			break;
	}

	lastMousePosition = mousePosition;
}

function mouseup(event) {
	let mousePosition = getRelativePosition(event.target, event.clientX, event.clientY);
	let mouseUpNodeIndex = getNodeIndexAtPosition(nodes, mousePosition);

	switch (state) {
		case State.None:
			if (lastMouseDownNodeIndex !== undefined && lastMouseDownNodeIndex === mouseUpNodeIndex) {
				selectedNodeIndices.clear();
				selectedNodeIndices.add(mouseUpNodeIndex);
			}
			break;
		case State.BoxSelect:
			const box = {
				left: Math.min(lastMouseDownPosition.x, lastMousePosition.x),
				top: Math.min(lastMouseDownPosition.y, lastMousePosition.y),
				right: Math.max(lastMouseDownPosition.x, lastMousePosition.x),
				bottom: Math.max(lastMouseDownPosition.y, lastMousePosition.y),
			};
			getNodesIndicesInBox(nodes, box).forEach(nodeIndex => selectedNodeIndices.add(nodeIndex));
			break;
		case State.DrawNode:
			let nodeRadius = Math.sqrt(
				(mousePosition.x - lastMouseDownPosition.x) ** 2 +
				(mousePosition.y - lastMouseDownPosition.y) ** 2);
			nodes.push({
				x: lastMouseDownPosition.x,
				y: lastMouseDownPosition.y,
				radius: nodeRadiusCurve(nodeRadius),
				color: currentNodeColor,
				name: nameCounter++
			});
			break;
		case State.DrawEdge:
			if (lastMouseDownNodeIndex !== undefined && mouseUpNodeIndex !== undefined) {
				if (!edges.some((edge) => edge.nodeIndex1 === lastMouseDownNodeIndex && edge.nodeIndex2 === mouseUpNodeIndex))
					edges.push({ nodeIndex1: lastMouseDownNodeIndex, nodeIndex2: mouseUpNodeIndex });
			}
			break;
	}

	lastMouseDownNodeIndex = undefined;
	state = State.None;
}

function wheel(event) {
	// TODO: Camera zoom
}

const doubleTapTimeout = 300;	// ms
const touchHoldTimeout = 300;	// ms

let currentTouches = new Map();

function touchstart(event) {
	event.preventDefault();

	//event.changedTouches.forEach(touch => {
	//	currentTouches.set(touch.identifier, {
	//		touch: touch,
	//		startPosition: { x: touch.clientX, y: touch.clientY },
	//		startTimeStamp: event.timeStamp
	//	});
	//});

	if (event.touches.length > 1)
		return;

	let touch = event.touches[0];

	let touchPosition = getRelativePosition(touch.target, touch.clientX, touch.clientY);
	let touchStartNodeIndex = getNodeIndexAtPosition(nodes, touchPosition);

	switch (state) {
		case State.None:
			break;
	}

	lastMouseDownPosition = lastMousePosition = touchPosition;
	lastMouseDownNodeIndex = touchStartNodeIndex;
	lastMouseDownTimestamp = event.timeStamp;

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
			selectedNode = i;
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
			selectedNode = undefined;
		}
	}
	lastMousePosition = { x: x, y: y };
}

function touchmove(event) {

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
		} else {
			airEdge = { x: x, y: y };
			selectedNode = undefined;
		}
	}

	// Edge delete
	if (deltaTime > 500 && firstNode === undefined) {
		if (lastMousePosition !== undefined) {
			for (let i = edges.length - 1; i >= 0; i--) {
				const edge = edges[i];
				const node1 = nodes[edge.firstNode];
				const node2 = nodes[edge.secondNode];
				if (lineIntersection(lastMousePosition, { x: x, y: y }, node1, node2)) {
					edges.splice(i, 1);
				}
			}
		}
	}
	lastMousePosition = { x: x, y: y };
}

function touchend(event) {
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
		nodes.push({ x: x, y: y, color: randHSLColor(50), name: nameCounter++ });
		selectedNode = undefined;
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

function nodeRadiusCurve(radius) {
	return Math.sqrt(radius) + defaultNodeRadius;
}

let lastDrawTimestamp = undefined;

function draw(timestamp) {
	let deltaTime = lastDrawTimestamp === undefined ? 0 : lastDrawTimestamp - timestamp;

	ctx.save();

	try {
		ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
		ctx.translate(offsetX, offsetY);
		ctx.clear();

		ctx.strokeStyle = "gray";
		ctx.lineWidth = edgeThickness;

		if (state === State.DrawEdge && lastMouseDownNodeIndex !== undefined) {
			ctx.beginPath();
			ctx.moveTo(nodes[lastMouseDownNodeIndex].x, nodes[lastMouseDownNodeIndex].y);
			ctx.lineTo(lastMousePosition.x, lastMousePosition.y);
			ctx.stroke();
		}

		edges.forEach(edge => {
			if (nodes[edge.nodeIndex1] !== undefined && nodes[edge.nodeIndex2] !== undefined) {
				ctx.beginPath();
				ctx.moveTo(nodes[edge.nodeIndex1].x, nodes[edge.nodeIndex1].y);
				ctx.lineTo(nodes[edge.nodeIndex2].x, nodes[edge.nodeIndex2].y);
				ctx.stroke();
			}
		});

		ctx.font = "bold 15px sans-serif";
		ctx.textBaseline = "middle";
		ctx.textAlign = "center";

		nodes.forEach(node => {
			ctx.fillStyle = node.color;
			ctx.beginPath();
			ctx.arc(node.x, node.y, node.radius, 0, 360);
			ctx.fill();
			ctx.fillStyle = 'white';
			ctx.fillText(node.name, node.x, node.y);
		});

		if (state === State.DrawNode) {
			let nodeRadius = Math.sqrt(
				(lastMousePosition.x - lastMouseDownPosition.x) ** 2 +
				(lastMousePosition.y - lastMouseDownPosition.y) ** 2);
			ctx.fillStyle = currentNodeColor;
			ctx.beginPath();
			ctx.arc(lastMouseDownPosition.x, lastMouseDownPosition.y, nodeRadiusCurve(nodeRadius), 0, 360);
			ctx.fill();
		}

		ctx.lineWidth = 3;
		ctx.strokeStyle = 'gray';
		
		selectedNodeIndices.forEach(nodeIndex => {
			let selectedNode = nodes[nodeIndex];
			ctx.beginPath();
			ctx.arc(selectedNode.x, selectedNode.y, selectedNode.radius, 0, 360);
			ctx.stroke();
		});

		ctx.lineWidth = 1;
		ctx.strokeStyle = 'gray';
		ctx.setLineDash([2, 2]);

		if (state === State.BoxSelect && lastMouseDownPosition !== undefined) {
			ctx.strokeRect(lastMouseDownPosition.x, lastMouseDownPosition.y, lastMousePosition.x - lastMouseDownPosition.x, lastMousePosition.y - lastMouseDownPosition.y);
		}
	}
	finally {
		ctx.restore();
	}

	window.requestAnimationFrame(draw);

	lastDrawTimestamp = timestamp;
}
