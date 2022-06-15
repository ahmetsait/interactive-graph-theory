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

function randomHSLColor(lightness: number = 50) {
	return `hsl(${Math.floor(Math.random() * 360)},${Math.floor(Math.random() * 50 + 25)}%,${lightness}%)`;
}

const defaultNodeRadius = 12.5;	// px
const edgeThickness = 2;	// px

const touchEnabled = Modernizr.touchevents;

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d", { alpha: false })!;
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = "high";

window.addEventListener("load", load);

new ResizeObserver(resize).observe(canvas);
canvas.addEventListener("mousedown", mousedown);
canvas.addEventListener("mousemove", mousemove);
canvas.addEventListener("mouseup", mouseup);
canvas.addEventListener("wheel", wheel);
if (touchEnabled) {
	console.log("Touch enabled.");
	canvas.addEventListener("touchstart", touchstart, { passive: false });
	canvas.addEventListener("touchmove", touchmove, { passive: false });
	canvas.addEventListener("touchend", touchend, { passive: false });
	canvas.addEventListener("touchcancel", touchend, { passive: false });
}
canvas.addEventListener("contextmenu", event => event.preventDefault());

class Vec2 {
	constructor(
		public x: number = 0,
		public y: number = 0) { }

	public get magnitudeSqr(): number {
		return this.x ** 2 + this.y ** 2;
	}

	public get magnitude(): number {
		return Math.sqrt(this.magnitudeSqr);
	}

	public add(rhs: Vec2 | number): Vec2 {
		if (rhs instanceof Vec2)
			return new Vec2(this.x + rhs.x, this.y + rhs.y);
		else
			return new Vec2(this.x + rhs, this.y + rhs);
	}

	public sub(rhs: Vec2 | number): Vec2 {
		if (rhs instanceof Vec2)
			return new Vec2(this.x - rhs.x, this.y - rhs.y);
		else
			return new Vec2(this.x - rhs, this.y - rhs);
	}

	public mul(rhs: Vec2 | number): Vec2 {
		if (rhs instanceof Vec2)
			return new Vec2(this.x * rhs.x, this.y * rhs.y);
		else
			return new Vec2(this.x * rhs, this.y * rhs);
	}

	public div(rhs: Vec2 | number): Vec2 {
		if (rhs instanceof Vec2)
			return new Vec2(this.x / rhs.x, this.y / rhs.y);
		else
			return new Vec2(this.x / rhs, this.y / rhs);
	}

	public dot(v: Vec2): number {
		return this.x * v.x + this.y * v.y;
	}
}

class GraphNode {
	constructor(
		public position: Vec2,
		public radius: number,
		public color: string,
		public name: string) { }
}

class GraphEdge {
	constructor(
		public nodeIndex1: number,
		public nodeIndex2: number) { }
}

let nodes: GraphNode[] = [];
let edges: GraphEdge[] = [];

enum State {
	None = 0,
	DrawNode = 1,
	MoveNode = 2,
	DeleteNode = 3,
	DrawEdge = 4,
	DeleteEdge = 5,
	BoxSelect = 6,
	ScanSelect = 7,
	Pan = 8,
	Zoom = 9,
	TouchCameraControl = 10, // TODO = Mixed pan+zoom+rotate
};

let state = State.None;

// Camera transform
let offset = new Vec2;

let selectedNodeIndices: number[] = [];
let mouseHoverNodeIndex: number = -1;

let currentNodeColor: string;
let nameCounter = 1;

class Line {
	constructor(
		public p1: Vec2,
		public p2: Vec2) { }

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
}

function getNodeIndexAtPosition(nodes: GraphNode[], position: Vec2): number {
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

function getPositionRelativeToElement(element: Element | null, x: number, y: number): Vec2 {
	if (element === null)
		return new Vec2(x, y);
	let rect = element.getBoundingClientRect();
	return new Vec2(x - rect.left - offset.x, y - rect.top - offset.y);
}

function nodeRadiusCurve(radius: number): number {
	return Math.sqrt(radius) + defaultNodeRadius;
}

function resetAll() {
	selectedNodeIndices = [];
	edges = [];
	nodes = [];
	nameCounter = 1;
}

function moveNodes(delta: Vec2, nodeIndices: number[]) {
	nodeIndices.forEach(nodeIndex => {
		if (nodeIndex >= 0 && nodeIndex < nodes.length) {
			let node = nodes[nodeIndex]!;
			node.position = node.position.add(delta);
		}
		else
			throw new RangeError(`nodeIndex = ${nodeIndex} is out of range for nodes.length = ${nodes.length}`);
	});
}

function deleteNodes(nodeIndices: number[]) {
	nodeIndices.forEach(nodeIndex => deleteNode(nodeIndex));
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
		if (selectedNodeIndices[i]! > nodeIndex)
			selectedNodeIndices[i]--; // Shift selected node indices to adjust
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

const mouseHoldDistanceThreshold = 1;
let lastMousePosition: Vec2 | null = null;
let lastMouseDownPosition: Vec2 | null = null;
let lastMouseDownTimestamp: number = -1;
let lastMouseDownNodeIndex: number = -1;

function mousedown(event: MouseEvent) {
	let mousePosition = getPositionRelativeToElement(event.target as Element, event.clientX, event.clientY);
	let mouseDownNodeIndex = getNodeIndexAtPosition(nodes, mousePosition);

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
					if (mouseDownNodeIndex === -1) {
						state = State.BoxSelect;
					}
					else {
						addItemUnique(selectedNodeIndices, mouseDownNodeIndex);
						state = State.ScanSelect;
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
					state = State.Pan;
				}
				else {
					if (mouseDownNodeIndex === -1) {
						currentNodeColor = randomHSLColor(50);
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

function mousemove(event: MouseEvent) {
	let mousePosition = getPositionRelativeToElement(event.target as Element, event.clientX, event.clientY);
	mouseHoverNodeIndex = getNodeIndexAtPosition(nodes, mousePosition);

	const movement = new Vec2(event.movementX, event.movementY);

	switch (state) {
		case State.None:
			if (event.buttons === 1 &&
				lastMouseDownNodeIndex !== -1 &&
				nodes[lastMouseDownNodeIndex]!.position.sub(mousePosition).magnitudeSqr > nodes[lastMouseDownNodeIndex]!.radius ** 2) {
				state = State.DrawEdge;
			}
			break;

		case State.Pan:
			offset = offset.add(movement);
			break;

		case State.ScanSelect:
			if (mouseHoverNodeIndex !== -1)
				addItemUnique(selectedNodeIndices, mouseHoverNodeIndex);
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
			if (mouseHoverNodeIndex !== -1)
				deleteNode(mouseHoverNodeIndex);
			break;

		case State.DeleteEdge:
			if (lastMousePosition !== null)
				cutEdges(new Line(lastMousePosition, mousePosition));
			break;
	}

	lastMousePosition = mousePosition;
}

function mouseup(event: MouseEvent) {
	let mousePosition = getPositionRelativeToElement(event.target as Element, event.clientX, event.clientY);
	let mouseUpNodeIndex = getNodeIndexAtPosition(nodes, mousePosition);

	switch (state) {
		case State.None:
			if (lastMouseDownNodeIndex !== -1 && lastMouseDownNodeIndex === mouseUpNodeIndex) {
				selectedNodeIndices = [];
				addItemUnique(selectedNodeIndices, mouseUpNodeIndex);
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
					(nameCounter++).toString(),
				)
			);
			break;

		case State.DrawEdge:
			if (lastMouseDownNodeIndex !== -1 && mouseUpNodeIndex !== -1) {
				if (!edges.some((edge) => edge.nodeIndex1 === lastMouseDownNodeIndex && edge.nodeIndex2 === mouseUpNodeIndex))
					edges.push(new GraphEdge(lastMouseDownNodeIndex, mouseUpNodeIndex));
			}
			break;

		case State.DeleteEdge:
			if (lastMouseDownPosition === null)
				throw new Error("State machine bug.");
			let mouseDeltaSqr = mousePosition.sub(lastMouseDownPosition).magnitudeSqr;
			if (mouseDeltaSqr < mouseHoldDistanceThreshold ** 2)
				selectedNodeIndices = [];
			break;
	}

	lastMouseDownNodeIndex = -1;
	state = State.None;
}

function wheel(event: WheelEvent) {
	// TODO: Camera zoom
}

const touchDoubleTapTimeout = 300; // ms
const touchHoldTimeout = 300; // ms
const touchDoubleTapDistanceThreshold = 20; // px I guess?

class TouchInfo {
	constructor(
		public touchStartPosition: Vec2,
		public touchPosition: Vec2,
		public touchClientPosition: Vec2,
		public touchDelta: Vec2,
		public touchStartNodeIndex: number,
		public touchOnNodeIndex: number,
		public touchStartTimeStamp: number,
		public touchTimeStamp: number) { }
}

let touchInfos = new Map<number, TouchInfo>();

let lastSingleTouchStartNodeIndex = -1;
let lastSingleTouchStartPosition: Vec2 | null = null;
let lastSingleTouchPosition: Vec2 | null = null;
let lastSingleTouchStartTimestamp: number = -1;
let touchHoldTimer: number | undefined = undefined;

function touchstart(event: TouchEvent) {
	event.preventDefault();

	for (let i = 0; i < event.changedTouches.length; i++) {
		let touch = event.changedTouches[i]!;
		let touchPosition = getPositionRelativeToElement(touch.target as Element, touch.clientX, touch.clientY);
		let touchStartNodeIndex = getNodeIndexAtPosition(nodes, touchPosition);

		touchInfos.set(
			touch.identifier,
			new TouchInfo(
				touchPosition,
				touchPosition,
				new Vec2(touch.clientX, touch.clientY),
				new Vec2,
				touchStartNodeIndex,
				touchStartNodeIndex,
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
						navigator.vibrate([30, 30, 30]);
						if (touchInfo.touchStartNodeIndex !== -1) {
							deleteNode(touchInfo.touchStartNodeIndex);
							state = State.DeleteNode;
						}
					}
				}
				if (!doubleTap) {
					touchHoldTimer = setTimeout(function () {
						if (touchInfos.size === 1) {
							let touchInfo = touchInfos.values().next().value;
							if (touchInfo.touchStartNodeIndex !== -1) {
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
}

function touchmove(event: TouchEvent) {
	for (let i = 0; i < event.changedTouches.length; i++) {
		let touch = event.changedTouches[i]!;
		let touchPosition = getPositionRelativeToElement(touch.target as Element, touch.clientX, touch.clientY);
		let touchOnNodeIndex = getNodeIndexAtPosition(nodes, touchPosition);
		// Update touch infos
		let touchInfo = touchInfos.get(touch.identifier);
		if (touchInfo === undefined)
			continue;
		touchInfo.touchDelta = new Vec2(
			touch.clientX - touchInfo.touchClientPosition.x,
			touch.clientY - touchInfo.touchClientPosition.y
		);
		touchInfo.touchClientPosition = new Vec2(touch.clientX, touch.clientY);
		touchInfo.touchPosition = touchPosition;
		touchInfo.touchOnNodeIndex = touchOnNodeIndex;
		touchInfo.touchTimeStamp = event.timeStamp;
	}

	if (touchInfos.size === 1) {
		clearTimeout(touchHoldTimer);
		touchHoldTimer = undefined;
		let touchInfo = touchInfos.values().next().value as TouchInfo;
		switch (state) {
			case State.None:
				if (touchInfo.touchStartNodeIndex !== -1)
					state = State.DrawEdge
				else {
					currentNodeColor = randomHSLColor(50);
					state = State.DrawNode;
				}
				break;

			case State.MoveNode:
				if (selectedNodeIndices.indexOf(lastSingleTouchStartNodeIndex) !== -1)
					moveNodes(touchInfo.touchDelta, selectedNodeIndices);
				else
					moveNodes(touchInfo.touchDelta, [lastSingleTouchStartNodeIndex]);
				break;

			case State.DeleteNode:
				if (touchInfo.touchOnNodeIndex !== -1)
					deleteNode(touchInfo.touchOnNodeIndex);
				break;

			case State.DeleteEdge:
				let touchOldPosition = touchInfo.touchPosition.sub(touchInfo.touchDelta);
				cutEdges(new Line(touchOldPosition, touchInfo.touchPosition));
				break;
		}
		lastSingleTouchPosition = touchInfo.touchPosition;
	}
	else if (touchInfos.size === 2) {
		let touchInfoList = [...touchInfos.values()];
		let touchInfo1 = touchInfoList[0]!;
		let touchInfo2 = touchInfoList[1]!;
		switch (state) {
			case State.Pan:
				let deltaAvg = touchInfo1.touchDelta.add(touchInfo2.touchDelta).div(2);
				offset = offset.add(deltaAvg);
				break;
		}
	}
	else if (touchInfos.size > 2) {
		state = State.None;
	}
}

function touchend(event: TouchEvent) {
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
					if (!removeItem(selectedNodeIndices, touchInfo.touchStartNodeIndex))
						addItemUnique(selectedNodeIndices, touchInfo.touchStartNodeIndex);
					break;
				}
				currentNodeColor = randomHSLColor(50);
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
						(nameCounter++).toString(),
					)
				);
				break;

			case State.DrawEdge:
				if (lastSingleTouchStartNodeIndex !== -1 && touchInfo.touchOnNodeIndex !== -1) {
					if (!edges.some((edge) => edge.nodeIndex1 === lastSingleTouchStartNodeIndex && edge.nodeIndex2 === touchInfo.touchOnNodeIndex))
						edges.push(new GraphEdge(lastSingleTouchStartNodeIndex, touchInfo.touchOnNodeIndex));
				}
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
}

function load() {
	resize();
	window.requestAnimationFrame(draw);
}

function resize(entries?: ResizeObserverEntry[], observer?: ResizeObserver) {
	canvas.width = canvas.clientWidth * window.devicePixelRatio;
	canvas.height = canvas.clientHeight * window.devicePixelRatio;
}

let lastDrawTimestamp: number = -1;

function draw(timeStamp: number) {
	let deltaTime = lastDrawTimestamp === -1 ? 0 : lastDrawTimestamp - timeStamp;

	if (touchEnabled) {
		lastMouseDownPosition = lastSingleTouchStartPosition;
		lastMousePosition = lastSingleTouchPosition;
		lastMouseDownNodeIndex = lastSingleTouchStartNodeIndex;
	}

	ctx.save();

	try {
		ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
		ctx.translate(offset.x, offset.y);
		clearCanvas(canvas, ctx, "azure");

		ctx.strokeStyle = "gray";
		ctx.lineWidth = edgeThickness;

		if (state === State.DrawEdge && lastMouseDownNodeIndex !== -1 && lastMousePosition !== null) {
			ctx.beginPath();
			ctx.moveTo(nodes[lastMouseDownNodeIndex]!.position.x, nodes[lastMouseDownNodeIndex]!.position.y);
			ctx.lineTo(lastMousePosition.x, lastMousePosition.y);
			ctx.stroke();
		}

		edges.forEach(
			edge => {
				const node1 = nodes[edge.nodeIndex1];
				const node2 = nodes[edge.nodeIndex2];
				if (node1 === undefined || node2 === undefined)
					throw new Error("Edge has missing nodes.");
				ctx.beginPath();
				ctx.moveTo(node1.position.x, node1.position.y);
				ctx.lineTo(node2.position.x, node2.position.y);
				ctx.stroke();
			}
		);

		ctx.font = "bold 15px sans-serif";
		ctx.textBaseline = "middle";
		ctx.textAlign = "center";

		nodes.forEach(node => {
			ctx.fillStyle = node.color;
			ctx.beginPath();
			ctx.arc(node.position.x, node.position.y, node.radius, 0, 360);
			ctx.fill();
			ctx.fillStyle = "white";
			ctx.fillText(node.name, node.position.x, node.position.y);
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

		ctx.lineWidth = 4;
		ctx.strokeStyle = "gray";

		selectedNodeIndices.forEach(nodeIndex => {
			let selectedNode = nodes[nodeIndex]!;
			ctx.beginPath();
			ctx.arc(selectedNode.position.x, selectedNode.position.y, selectedNode.radius, 0, 360);
			ctx.stroke();
		});

		ctx.lineWidth = 1;
		ctx.strokeStyle = "gray";
		ctx.setLineDash([4, 4]);

		if (state === State.BoxSelect && lastMousePosition !== null && lastMouseDownPosition !== null) {
			ctx.strokeRect(lastMouseDownPosition.x, lastMouseDownPosition.y, lastMousePosition.x - lastMouseDownPosition.x, lastMousePosition.y - lastMouseDownPosition.y);
		}
	}
	finally {
		ctx.restore();
	}

	window.requestAnimationFrame(draw);

	lastDrawTimestamp = timeStamp;
}
