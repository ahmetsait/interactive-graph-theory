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
canvas.addEventListener('touchstart', touchstart, { passive: false });
canvas.addEventListener('touchmove', touchmove, { passive: false });
canvas.addEventListener('touchend', touchend, { passive: false });
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
};

let state = State.None;

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

function invertColor(hex) {
	if (hex.indexOf('#') === 0) {
		hex = hex.slice(1);
	}
	// convert 3-digit hex to 6-digits.
	if (hex.length === 3) {
		hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
	}
	if (hex.length !== 6) {
		throw new Error('Invalid HEX color.');
	}
	// invert color components
	let r = (255 - parseInt(hex.slice(0, 2), 16)).toString(16),
		g = (255 - parseInt(hex.slice(2, 4), 16)).toString(16),
		b = (255 - parseInt(hex.slice(4, 6), 16)).toString(16);
	// pad each with zeros and return
	return '#' + padZero(r) + padZero(g) + padZero(b);
}

function padZero(str, len) {
	len = len || 2;
	let zeros = new Array(len).join('0');
	return (zeros + str).slice(-len);
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

function getRelativePosition(element, x, y) {
	let rect = element.getBoundingClientRect();
	return { x: x - rect.left, y: y - rect.top };
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
			if (event.buttons === 1) {
				if (mouseDownNodeIndex === undefined) {
					if (event.shiftKey) {
						state = State.BoxSelect;
					} else {
						currentNodeColor = randHSLColor(50);
						state = State.DrawNode;
					}
				} else if (event.ctrlKey) {
					selectedNodeIndices.clear();
					selectedNodeIndices.add(mouseDownNodeIndex);
					state = State.MoveNode;
				} else if (event.shiftKey) {
					state = State.ScanSelect;
				}
			} else if (event.buttons === 2 && !event.shiftKey) {
				// Shift key disables context menu prevention on Firefox
				if (mouseDownNodeIndex !== undefined)
					state = State.DeleteNode;
				else
					state = State.DeleteEdge;
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
			if (lastMouseDownNodeIndex !== undefined && (nodes[lastMouseDownNodeIndex].x - mousePosition.x) ** 2 + (nodes[lastMouseDownNodeIndex].y - mousePosition.y) ** 2 > nodes[lastMouseDownNodeIndex].radius ** 2) {
				state = State.DrawEdge;
			}
			break;
		case State.MoveNode:
			selectedNodeIndices.forEach(nodeIndex => {
				nodes[nodeIndex].x += mousePosition.x - lastMousePosition.x;
				nodes[nodeIndex].y += mousePosition.y - lastMousePosition.y;
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
			selectedNodeIndices = mouseUpNodeIndex;
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

const doubleTapTimeout = 300;	// ms
const touchHoldTimeout = 300;	// ms

//let currentTouches = new Map();

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
			ctx.fillStyle = 'white'/*invertColor(ctx.fillStyle)*/;
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

		if (selectedNodeIndices !== undefined) {
			let selectedNode = nodes[selectedNodeIndices];
			ctx.beginPath();
			ctx.strokeStyle = selectedNode.color;
			ctx.strokeStyle = 'gray'/*invertColor(ctx.strokeStyle)*/;
			ctx.arc(selectedNode.x, selectedNode.y, selectedNode.radius, 0, 360);
			ctx.stroke();
		}
	}
	finally {
		ctx.restore();
	}

	window.requestAnimationFrame(draw);

	lastDrawTimestamp = timestamp;
}
