"use strict";

CanvasRenderingContext2D.prototype.clear = function ()
{
	this.save();
	try {
		this.setTransform(1, 0, 0, 1, 0, 0);
		this.fillStyle = 'azure';
		this.fillRect(0, 0, this.canvas.width, this.canvas.height);
	} finally {
		this.restore();
	}
};

function removeItem(array, item)
{
	let i = array.indexOf(item);
	if (i !== -1)
	{
		array.splice(i, 1);
		return true;
	}
	else
		return false;
}

function addItemUnique(array, item)
{
	let i = array.indexOf(item);
	if (i === -1)
	{
		array.push(item);
		return true;
	}
	else
		return false;
}

function randomHSLColor(lightness)
{
	return `hsl(${Math.floor(Math.random() * 360)},${Math.floor(Math.random() * 50 + 25)}%,${lightness}%)`;
}

const defaultNodeRadius = 12.5;	// px
const edgeThickness = 2;	// px

const touchEnabled = Modernizr.touchevents;

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
if (touchEnabled)
{
	console.log("Touch enabled.");
	canvas.addEventListener('touchstart', touchstart, { passive: false });
	canvas.addEventListener('touchmove', touchmove, { passive: false });
	canvas.addEventListener('touchend', touchend, { passive: false });
	canvas.addEventListener('touchcancel', touchend, { passive: false });
}
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
	TouchCameraControl: 10, // TODO: Mixed pan+zoom+rotate
};

let state = State.None;

// Camera transform
let offsetX = 0, offsetY = 0;

let selectedNodeIndices = [];
let mouseHoverNodeIndex = undefined;

let currentNodeColor = undefined;
let nameCounter = 1;

function lineIntersection(line1p1, line1p2, line2p1, line2p2)
{
	let det, gamma, lambda;
	det = (line1p2.x - line1p1.x) * (line2p2.y - line2p1.y) - (line2p2.x - line2p1.x) * (line1p2.y - line1p1.y);
	if (det === 0)
	{
		return false;
	}
	else
	{
		lambda = ((line2p2.y - line2p1.y) * (line2p2.x - line1p1.x) + (line2p1.x - line2p2.x) * (line2p2.y - line1p1.y)) / det;
		gamma = ((line1p1.y - line1p2.y) * (line2p2.x - line1p1.x) + (line1p2.x - line1p1.x) * (line2p2.y - line1p1.y)) / det;
		return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
	}
}

function getNodeIndexAtPosition(nodes, position)
{
	let closestNodeIndex = undefined,
		closestNodeX = undefined,
		closestNodeY = undefined;
	for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) 
	{
		let node = nodes[nodeIndex];
		let distanceSqr = (position.x - node.x) ** 2 + (position.y - node.y) ** 2;
		if (distanceSqr < (node.radius + defaultNodeRadius) ** 2)
		{
			if (closestNodeIndex === undefined)
			{
				closestNodeIndex = nodeIndex;
				closestNodeX = node.x;
				closestNodeY = node.y;
			}
			else if (distanceSqr < (position.x - closestNodeX) ** 2 + (position.y - closestNodeY) ** 2)
			{
				closestNodeIndex = nodeIndex;
				closestNodeX = node.x;
				closestNodeY = node.y;
			}
		}
	}
	return closestNodeIndex;
}

function getNodeIndicesInBox(box)
{
	let nodeIndices = [];
	for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++)
	{
		let node = nodes[nodeIndex];
		if (node.x < box.right && node.x > box.left && node.y < box.bottom && node.y > box.top)
			nodeIndices.push(nodeIndex);
	}
	return nodeIndices;
}

function getRelativePosition(element, x, y)
{
	let rect = element.getBoundingClientRect();
	return { x: x - rect.left - offsetX, y: y - rect.top - offsetY };
}

function nodeRadiusCurve(radius)
{
	return Math.sqrt(radius) + defaultNodeRadius;
}

function clearAll()
{
	selectedNodeIndices = [];
	edges = [];
	nodes = [];
	nameCounter = 0;
}

function moveNodes(deltaX, deltaY, nodeIndices)
{
	nodeIndices.forEach(nodeIndex => {
		nodes[nodeIndex].x += deltaX;
		nodes[nodeIndex].y += deltaY;
	});
}

function deleteNodes(nodeIndices)
{
	nodeIndices.forEach(nodeIndex => deleteNode(nodeIndex));
}

function deleteNode(nodeIndex)
{
	for (let i = edges.length - 1; i >= 0; i--)
	{
		const edge = edges[i];
		// Tear off edges before deleting node
		if (edge.nodeIndex1 === nodeIndex || edge.nodeIndex2 === nodeIndex)
			edges.splice(i, 1);
		// Shift edge node indices to adjust
		if (edge.nodeIndex1 > nodeIndex)
			edge.nodeIndex1--;
		if (edge.nodeIndex2 > nodeIndex)
			edge.nodeIndex2--;
	}
	if (removeItem(selectedNodeIndices, nodeIndex))
		for (let i = selectedNodeIndices.length - 1; i >= 0; i--)
			if (selectedNodeIndices[i] > nodeIndex)
				selectedNodeIndices[i]--; // Shift selected node indices to adjust
	nodes.splice(nodeIndex, 1);
}

function cutEdges(scissorStart, scissorEnd)
{
	for (let i = edges.length - 1; i >= 0; i--)
	{
		const edge = edges[i];
		const node1 = nodes[edge.nodeIndex1];
		const node2 = nodes[edge.nodeIndex2];
		if (lineIntersection(scissorStart, scissorEnd, node1, node2))
		{
			edges.splice(i, 1);
		}
	}
}

const mouseHoldDistanceThreshold = 1;
let lastMousePosition = undefined;
let lastMouseDownPosition = undefined;
let lastMouseDownTimestamp = undefined;
let lastMouseDownNodeIndex = undefined;

function mousedown(event)
{
	let mousePosition = getRelativePosition(event.target, event.clientX, event.clientY);
	let mouseDownNodeIndex = getNodeIndexAtPosition(nodes, mousePosition);
	
	switch (state)
	{
		case State.None:
			if (event.buttons === 1) // Left click
			{
				if (event.shiftKey && event.ctrlKey)
				{
					if (mouseDownNodeIndex !== undefined)
					{
						addItemUnique(selectedNodeIndices, mouseDownNodeIndex);
						state = State.MoveNode;
					}
				}
				else if (event.shiftKey)
				{
					if (mouseDownNodeIndex === undefined)
					{
						state = State.BoxSelect;
					}
					else
					{
						addItemUnique(selectedNodeIndices, mouseDownNodeIndex);
						state = State.ScanSelect;
					}
				}
				else if (event.ctrlKey)
				{
					if (mouseDownNodeIndex !== undefined)
					{
						if (selectedNodeIndices.indexOf(mouseDownNodeIndex) === -1)
							selectedNodeIndices = [mouseDownNodeIndex];
						state = State.MoveNode;
					}
					else
					{
						selectedNodeIndices = [];
					}
				}
				else if (event.altKey)
				{
					state = State.Pan;
				}
				else
				{
					if (mouseDownNodeIndex === undefined)
					{
						currentNodeColor = randomHSLColor(50);
						state = State.DrawNode;
					}
				}
			}
			else if (event.buttons === 2 && // Right click
				!event.shiftKey) // Shift key disables context menu prevention on Firefox
			{
				if (mouseDownNodeIndex !== undefined)
				{
					deleteNode(mouseDownNodeIndex);
					state = State.DeleteNode;
				}
				else
					state = State.DeleteEdge;
			}
			else if (event.buttons === 4) // Middle click
			{
				state = State.Pan;
			}
			break;
	}

	lastMouseDownPosition = lastMousePosition = mousePosition;
	lastMouseDownNodeIndex = mouseDownNodeIndex;
	lastMouseDownTimestamp = event.timeStamp;
}

function mousemove(event)
{
	let mousePosition = getRelativePosition(event.target, event.clientX, event.clientY);
	mouseHoverNodeIndex = getNodeIndexAtPosition(nodes, mousePosition);

	switch (state)
	{
		case State.None:
			if (event.buttons === 1 && lastMouseDownNodeIndex !== undefined && (nodes[lastMouseDownNodeIndex].x - mousePosition.x) ** 2 + (nodes[lastMouseDownNodeIndex].y - mousePosition.y) ** 2 > nodes[lastMouseDownNodeIndex].radius ** 2)
			{
				state = State.DrawEdge;
			}
			break;
			
		case State.Pan:
			offsetX += event.movementX;
			offsetY += event.movementY;
			break;
			
		case State.ScanSelect:
			if (mouseHoverNodeIndex !== undefined)
				addItemUnique(selectedNodeIndices, mouseHoverNodeIndex);
			break;
			
		case State.MoveNode:
			if (selectedNodeIndices.indexOf(lastMouseDownNodeIndex) !== -1)
				moveNodes(event.movementX, event.movementY, selectedNodeIndices);
			else
				moveNodes(event.movementX, event.movementY, [lastMouseDownNodeIndex]);
			break;
			
		case State.DeleteNode:
			if (mouseHoverNodeIndex !== undefined)
				deleteNode(mouseHoverNodeIndex);
			break;
			
		case State.DeleteEdge:
			if (lastMousePosition !== undefined)
				cutEdges(lastMousePosition, mousePosition);
			break;
	}

	lastMousePosition = mousePosition;
}

function mouseup(event)
{
	let mousePosition = getRelativePosition(event.target, event.clientX, event.clientY);
	let mouseUpNodeIndex = getNodeIndexAtPosition(nodes, mousePosition);

	switch (state)
	{
		case State.None:
			if (lastMouseDownNodeIndex !== undefined && lastMouseDownNodeIndex === mouseUpNodeIndex)
			{
				selectedNodeIndices = [];
				addItemUnique(selectedNodeIndices, mouseUpNodeIndex);
			}
			break;
			
		case State.BoxSelect:
			const box = {
				left: Math.min(lastMouseDownPosition.x, mousePosition.x),
				top: Math.min(lastMouseDownPosition.y, mousePosition.y),
				right: Math.max(lastMouseDownPosition.x, mousePosition.x),
				bottom: Math.max(lastMouseDownPosition.y, mousePosition.y),
			};
			getNodeIndicesInBox(box).forEach(nodeIndex => addItemUnique(selectedNodeIndices, nodeIndex));
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
				name: nameCounter++,
			});
			break;
			
		case State.DrawEdge:
			if (lastMouseDownNodeIndex !== undefined && mouseUpNodeIndex !== undefined)
			{
				if (!edges.some((edge) => edge.nodeIndex1 === lastMouseDownNodeIndex && edge.nodeIndex2 === mouseUpNodeIndex))
					edges.push({ nodeIndex1: lastMouseDownNodeIndex, nodeIndex2: mouseUpNodeIndex });
			}
			break;

		case State.DeleteEdge:
			let mouseDeltaSqr = (mousePosition.x - lastMouseDownPosition.x) ** 2 + (mousePosition.y - lastMouseDownPosition.y) ** 2;
			if (mouseDeltaSqr < mouseHoldDistanceThreshold ** 2)
				selectedNodeIndices = [];
			break;
	}

	lastMouseDownNodeIndex = undefined;
	state = State.None;
}

function wheel(event)
{
	// TODO: Camera zoom
}

const touchDoubleTapTimeout = 300; // ms
const touchHoldTimeout = 300; // ms
const touchDoubleTapDistanceThreshold = 20; // px I guess?

let touchInfos = new Map();

let lastSingleTouchStartNodeIndex = undefined;
let lastSingleTouchStartPosition = undefined;
let lastSingleTouchPosition = undefined;
let lastSingleTouchStartTimestamp = undefined;
let touchHoldTimer = undefined;

function touchstart(event)
{
	event.preventDefault();
	
	for (let i = 0; i < event.changedTouches.length; i++)
	{
		let touch = event.changedTouches[i];
		let touchPosition = getRelativePosition(touch.target, touch.clientX, touch.clientY);
		let touchStartNodeIndex = getNodeIndexAtPosition(nodes, touchPosition);
		touchInfos.set(touch.identifier, {
			touchStartPosition: touchPosition,
			touchPosition: touchPosition,
			touchClientPosition: { x: touch.clientX, y: touch.clientY },
			touchDelta: { x: 0, y: 0 },
			touchStartNodeIndex: touchStartNodeIndex,
			touchOnNodeIndex: touchStartNodeIndex,
			touchStartTimeStamp: event.timeStamp,
			touchTimeStamp: event.timeStamp,
		});
	}
	
	if (touchInfos.size === 1)
	{
		let touchInfo = touchInfos.values().next().value;
		switch (state)
		{
			case State.None:
				let doubleTap = false;
				if (lastSingleTouchStartPosition !== undefined)
				{
					let doubleTapDistanceSqr = (touchInfo.touchPosition.x - lastSingleTouchStartPosition.x) ** 2 + (touchInfo.touchPosition.y - lastSingleTouchStartPosition.y) ** 2;
					if (event.timeStamp - lastSingleTouchStartTimestamp < touchDoubleTapTimeout && doubleTapDistanceSqr < touchDoubleTapDistanceThreshold ** 2)
					{
						doubleTap = true;
						navigator.vibrate([30, 30, 30]);
						if (touchInfo.touchStartNodeIndex !== undefined)
						{
							deleteNode(touchInfo.touchStartNodeIndex);
							state = State.DeleteNode;
						}
					}
				}
				if (!doubleTap)
				{
					touchHoldTimer = setTimeout(function ()
					{
						if (touchInfos.size === 1)
						{
							let touchInfo = touchInfos.values().next().value;
							if (touchInfo.touchStartNodeIndex !== undefined)
							{
								if (selectedNodeIndices.indexOf(touchInfo.touchStartNodeIndex) === -1)
									selectedNodeIndices = [touchInfo.touchStartNodeIndex];
								state = State.MoveNode;
							}
							else
								state = State.DeleteEdge;
							navigator.vibrate(50);
						}
					}, touchHoldTimeout);
				}
				break;
		}
		lastSingleTouchStartNodeIndex = touchInfo.touchStartNodeIndex
		lastSingleTouchStartPosition = touchInfo.touchStartPosition;
		lastSingleTouchPosition = touchInfo.touchPosition;
		lastSingleTouchStartTimestamp = touchInfo.touchStartTimeStamp;
	}
	else if (touchInfos.size === 2)
	{
		touchHoldTimer = clearTimeout(touchHoldTimer);
		state = State.Pan	;
	}
	else if (touchInfos.size > 2)
	{
		touchHoldTimer = clearTimeout(touchHoldTimer);
		state = State.None;
	}
}

function touchmove(event)
{
	for (let i = 0; i < event.changedTouches.length; i++)
	{
		let touch = event.changedTouches[i];
		let touchPosition = getRelativePosition(touch.target, touch.clientX, touch.clientY);
		let touchOnNodeIndex = getNodeIndexAtPosition(nodes, touchPosition);
		// Update touch infos
		let touchInfo = touchInfos.get(touch.identifier);
		touchInfo.touchDelta = { x: touch.clientX - touchInfo.touchClientPosition.x, y: touch.clientY - touchInfo.touchClientPosition.y };
		touchInfo.touchClientPosition = { x: touch.clientX, y: touch.clientY };
		touchInfo.touchPosition = touchPosition;
		touchInfo.touchOnNodeIndex = touchOnNodeIndex;
		touchInfo.touchTimeStamp = event.timeStamp;
	}

	if (touchInfos.size === 1)
	{
		touchHoldTimer = clearTimeout(touchHoldTimer);
		let touchInfo = touchInfos.values().next().value;
		switch (state)
		{
			case State.None:
				if (touchInfo.touchStartNodeIndex !== undefined)
					state = State.DrawEdge
				else
				{
					currentNodeColor = randomHSLColor(50);
					state = State.DrawNode;
				}
				break;
				
			case State.MoveNode:
				if (selectedNodeIndices.indexOf(lastSingleTouchStartNodeIndex) !== -1)
					moveNodes(touchInfo.touchDelta.x, touchInfo.touchDelta.y, selectedNodeIndices);
				else
					moveNodes(touchInfo.touchDelta.x, touchInfo.touchDelta.y, [lastSingleTouchStartNodeIndex]);
				break;

			case State.DeleteNode:
				if (touchInfo.touchOnNodeIndex !== undefined)
					deleteNode(touchInfo.touchOnNodeIndex);
				break;
				
			case State.DeleteEdge:
				let touchOldPosition = {
					x: touchInfo.touchPosition.x - touchInfo.touchDelta.x,
					y: touchInfo.touchPosition.y - touchInfo.touchDelta.y,
				};
				if (touchOldPosition !== undefined)
				{
					cutEdges(touchOldPosition, touchInfo.touchPosition);
				}
				break;
				
			case State.ScanSelect:
				if (touchInfo.touchOnNodeIndex !== undefined)
				{
					addItemUnique(selectedNodeIndices, touchInfo.touchOnNodeIndex);
				}
				break;
		}
		lastSingleTouchPosition = touchInfo.touchPosition;
	}
	else if (touchInfos.size === 2)
	{
		let touchInfoList = [...touchInfos.values()];
		let touchInfo1 = touchInfoList[0];
		let touchInfo2 = touchInfoList[1];
		switch (state) {
			case State.Pan:
				let deltaAvgX = (touchInfo1.touchDelta.x + touchInfo2.touchDelta.x) / 2;
				let deltaAvgY = (touchInfo1.touchDelta.y + touchInfo2.touchDelta.y) / 2;
				offsetX += deltaAvgX;
				offsetY += deltaAvgY;
				break;
		}
	}
	else if (touchInfos.size > 2)
	{
		state = State.None;
	}
}

function touchend(event)
{
	let endedTouchInfos = new Map();
	for (let i = 0; i < event.changedTouches.length; i++)
	{
		let touch = event.changedTouches[i];
		endedTouchInfos.set(touch.identifier, touchInfos.get(touch.identifier));
		touchInfos.delete(touch.identifier);
	}

	if (endedTouchInfos.size === 1 && touchInfos.size === 0) {
		let touchInfo = endedTouchInfos.values().next().value;
		switch (state) {
			case State.None:
				if (touchInfo.touchStartNodeIndex !== undefined)
				{
					addItemUnique(selectedNodeIndices, touchInfo.touchStartNodeIndex);
					break;
				}
				currentNodeColor = randomHSLColor(50);
				// goto case State.DrawNode;
			case State.DrawNode:
				let nodeRadius = Math.sqrt(
					(touchInfo.touchPosition.x - lastSingleTouchStartPosition.x) ** 2 +
					(touchInfo.touchPosition.y - lastSingleTouchStartPosition.y) ** 2);
				nodes.push({
					x: lastSingleTouchStartPosition.x,
					y: lastSingleTouchStartPosition.y,
					radius: nodeRadiusCurve(nodeRadius),
					color: currentNodeColor,
					name: nameCounter++,
				});
				break;

			case State.DrawEdge:
				if (lastSingleTouchStartNodeIndex !== undefined && touchInfo.touchOnNodeIndex !== undefined) {
					if (!edges.some((edge) => edge.nodeIndex1 === lastSingleTouchStartNodeIndex && edge.nodeIndex2 === touchInfo.touchOnNodeIndex))
						edges.push({ nodeIndex1: lastSingleTouchStartNodeIndex, nodeIndex2: touchInfo.touchOnNodeIndex });
				}
				break;

			case State.BoxSelect:
				const box = {
					left: Math.min(lastSingleTouchStartPosition.x, touchInfo.touchPosition.x),
					top: Math.min(lastSingleTouchStartPosition.y, touchInfo.touchPosition.y),
					right: Math.max(lastSingleTouchStartPosition.x, touchInfo.touchPosition.x),
					bottom: Math.max(lastSingleTouchStartPosition.y, touchInfo.touchPosition.y),
				};
				getNodeIndicesInBox(box).forEach(nodeIndex => addItemUnique(selectedNodeIndices, nodeIndex));
				break;
		}
	}

	if (touchInfos.size === 0)
	{
		touchHoldTimer = clearTimeout(touchHoldTimer);
		state = State.None;
	}
	else if (touchInfos.size === 2)
	{
		touchHoldTimer = clearTimeout(touchHoldTimer);
		state = State.Pan;
	}
	else if (touchInfos.size > 2)
	{
		touchHoldTimer = clearTimeout(touchHoldTimer);
		state = State.None;
	}
}

function load()
{
	resize();
	window.requestAnimationFrame(draw);
}

function resize(event)
{
	canvas.width = canvas.clientWidth * window.devicePixelRatio;
	canvas.height = canvas.clientHeight * window.devicePixelRatio;
}

let lastDrawTimestamp = undefined;

function draw(timeStamp)
{
	let deltaTime = lastDrawTimestamp === undefined ? 0 : lastDrawTimestamp - timeStamp;

	if (touchEnabled)
	{
		lastMouseDownPosition = lastSingleTouchStartPosition;
		lastMousePosition = lastSingleTouchPosition;
		lastMouseDownNodeIndex = lastSingleTouchStartNodeIndex;
	}
	
	ctx.save();

	try
	{
		ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
		ctx.translate(offsetX, offsetY);
		ctx.clear();

		ctx.strokeStyle = "gray";
		ctx.lineWidth = edgeThickness;

		if (state === State.DrawEdge && lastMouseDownNodeIndex !== undefined)
		{
			ctx.beginPath();
			ctx.moveTo(nodes[lastMouseDownNodeIndex].x, nodes[lastMouseDownNodeIndex].y);
			ctx.lineTo(lastMousePosition.x, lastMousePosition.y);
			ctx.stroke();
		}

		edges.forEach(edge => {
			if (nodes[edge.nodeIndex1] !== undefined && nodes[edge.nodeIndex2] !== undefined)
			{
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

		if (state === State.DrawNode)
		{
			let nodeRadius = Math.sqrt(
				(lastMousePosition.x - lastMouseDownPosition.x) ** 2 +
				(lastMousePosition.y - lastMouseDownPosition.y) ** 2);
			ctx.fillStyle = currentNodeColor;
			ctx.beginPath();
			ctx.arc(lastMouseDownPosition.x, lastMouseDownPosition.y, nodeRadiusCurve(nodeRadius), 0, 360);
			ctx.fill();
		}

		ctx.lineWidth = 4;
		ctx.strokeStyle = 'gray';
		
		selectedNodeIndices.forEach(nodeIndex => {
			let selectedNode = nodes[nodeIndex];
			ctx.beginPath();
			ctx.arc(selectedNode.x, selectedNode.y, selectedNode.radius, 0, 360);
			ctx.stroke();
		});

		ctx.lineWidth = 1;
		ctx.strokeStyle = 'gray';
		ctx.setLineDash([4, 4]);

		if (state === State.BoxSelect && lastMouseDownPosition !== undefined)
		{
			ctx.strokeRect(lastMouseDownPosition.x, lastMouseDownPosition.y, lastMousePosition.x - lastMouseDownPosition.x, lastMousePosition.y - lastMouseDownPosition.y);
		}
	}
	finally
	{
		ctx.restore();
	}

	window.requestAnimationFrame(draw);

	lastDrawTimestamp = timeStamp;
}
