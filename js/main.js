"use strict";
class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    get magnitudeSqr() {
        return Math.pow(this.x, 2) + Math.pow(this.y, 2);
    }
    get magnitude() {
        return Math.sqrt(this.magnitudeSqr);
    }
    add(rhs) {
        if (rhs instanceof Vector2)
            return new Vector2(this.x + rhs.x, this.y + rhs.y);
        else
            return new Vector2(this.x + rhs, this.y + rhs);
    }
    sub(rhs) {
        if (rhs instanceof Vector2)
            return new Vector2(this.x - rhs.x, this.y - rhs.y);
        else
            return new Vector2(this.x - rhs, this.y - rhs);
    }
    mul(rhs) {
        if (rhs instanceof Vector2)
            return new Vector2(this.x * rhs.x, this.y * rhs.y);
        else
            return new Vector2(this.x * rhs, this.y * rhs);
    }
    div(rhs) {
        if (rhs instanceof Vector2)
            return new Vector2(this.x / rhs.x, this.y / rhs.y);
        else
            return new Vector2(this.x / rhs, this.y / rhs);
    }
    dot(v) {
        return this.x * v.x + this.y * v.y;
    }
}
class GraphNode {  //grafta node'un özelliklerinin atanması
    constructor(position, radius, color, label) {
        this.position = position;
        this.radius = radius;
        this.color = color;
        this.label = label;
    }
}
class GraphEdge { //edge çizebilmek için mouse tutup bırakma yerlerinin belirlenmesi
    constructor(nodeIndex1, nodeIndex2) {
        this.nodeIndex1 = nodeIndex1;
        this.nodeIndex2 = nodeIndex2;
    }
}
class Graph {
    constructor(nodes = [], edges = []) {
        this.nodes = nodes;
        this.edges = edges;
    }
    serializeJson() {
        return JSON.stringify(this, null, '\t');
    }
    static deserializeJson(json) {
        let graph = Object.assign(new Graph(), JSON.parse(json));
        for (const node of graph.nodes) {
            node.position = new Vector2(node.position.x, node.position.y);
        }
        return graph;
    }
}
var State;
(function (State) {
    State[State["None"] = 0] = "None";
    State[State["DrawNode"] = 1] = "DrawNode";
    State[State["MoveNode"] = 2] = "MoveNode";
    State[State["DeleteNode"] = 3] = "DeleteNode";
    State[State["DrawEdge"] = 4] = "DrawEdge";
    State[State["DeleteEdge"] = 5] = "DeleteEdge";
    State[State["BoxSelect"] = 6] = "BoxSelect";
    State[State["ScanSelect"] = 7] = "ScanSelect";
    State[State["ScanDeselect"] = 8] = "ScanDeselect";
    State[State["Pan"] = 9] = "Pan";
    State[State["Zoom"] = 10] = "Zoom";
    State[State["TouchCameraControl"] = 11] = "TouchCameraControl";
})(State || (State = {}));
;
function clearCanvas(canvas, ctx, color) {
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
        var _a;
        (_a = dropdownButton.nextElementSibling) === null || _a === void 0 ? void 0 : _a.classList.toggle("hidden");
    });
}
document.addEventListener("pointerdown", closeDropdown);
for (const dropdown of document.getElementsByClassName("dropdown")) {
    for (const element of dropdown.children) {
        element.addEventListener("click", () => closeDropdown());
    }
}
function closeDropdown(event) {
    var _a;
    for (const dropdown of document.getElementsByClassName("dropdown")) {
        if (event === undefined || !((_a = dropdown.parentNode) === null || _a === void 0 ? void 0 : _a.contains(event.target)))
            dropdown.classList.add("hidden");
    }
}
function removeItem(array, item) {
    let i = array.indexOf(item);
    if (i !== -1) {
        array.splice(i, 1);
        return true;
    }
    else
        return false;
}
function addItemUnique(array, item) {
    let i = array.indexOf(item);
    if (i === -1) {
        array.push(item);
        return true;
    }
    else
        return false;
}
function hslToRgbHex(h, s, l) {
    var r, g, b;
    if (s == 0) {
        r = g = b = l; // achromatic
    }
    else {
        function hue2rgb(p, q, t) {
            if (t < 0)
                t += 1;
            if (t > 1)
                t -= 1;
            if (t < 1 / 6)
                return p + (q - p) * 6 * t;
            if (t < 1 / 2)
                return q;
            if (t < 2 / 3)
                return p + (q - p) * (2 / 3 - t) * 6;
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
function randomHslColor(lightness = 0.50) {
    return hslToRgbHex(Math.random(), Math.random() * 0.50 + 0.25, lightness);
}
const defaultNodeRadius = 12.5; // px
const edgeThickness = 2; // px
const touchEnabled = Modernizr.touchevents;
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", { alpha: false });
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = "high";
new ResizeObserver(resize).observe(canvas);
window.addEventListener("load", load);
canvas.addEventListener("mousedown", mousedown);
canvas.addEventListener("mousemove", mousemove);
canvas.addEventListener("mouseup", mouseup);
canvas.addEventListener("wheel", wheel);
if (touchEnabled) {
    canvas.addEventListener("touchstart", touchstart, { passive: false });
    canvas.addEventListener("touchmove", touchmove, { passive: false });
    canvas.addEventListener("touchend", touchend, { passive: false });
    canvas.addEventListener("touchcancel", touchend, { passive: false });
}
canvas.addEventListener("contextmenu", event => event.preventDefault());
document.addEventListener("keydown", (e) => {
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
let nodes = [];
let edges = [];
function importDialog() {
    const textarea = document.getElementById("import");
    textarea.value = "";
    showDialog("import-dialog");
    textarea.focus();
}
function importConfirm() {
    const textarea = document.getElementById("import");
    if (textarea.value)
        importJson(textarea.value);
    closeDialog("import-dialog");
}
function exportDialog() {
    const textarea = document.getElementById("export");
    textarea.value = exportJson();
    showDialog("export-dialog");
    textarea.focus();
    textarea.setSelectionRange(0, textarea.value.length, "backward");
}
function exportToClipboard() {
    const textarea = document.getElementById("export");
    if (textarea.value)
        navigator.clipboard.writeText(textarea.value);
    closeDialog("export-dialog");
}
function exportJson() {
    return new Graph(nodes, edges).serializeJson();
}
function importJson(json) {
    let graph = Graph.deserializeJson(json);
    resetAll();
    nodes = graph.nodes;
    edges = graph.edges;
    let max = 1;
    for (const node of nodes) {
        let label = parseInt(node.label);
        if (!isNaN(label) && label > max)
            max = label;
    }
    labelCounter = max + 1;
    draw(window.performance.now());
}
let state = State.None;
// Camera transform
let offset = new Vector2;
let selectedNodeIndices = [];
let mouseHoverNodeIndex = -1;
let currentNodeColor;
let labelCounter = 1;
class Line {
    constructor(p1, p2) {
        this.p1 = p1;
        this.p2 = p2;
    }
    intersects(line) {
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
function getNodeIndexAtPosition(nodes, position) {
    let closestNodeIndex = -1;
    let closestNodeX;
    let closestNodeY;
    for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
        let node = nodes[nodeIndex];
        let distanceSqr = position.sub(node.position).magnitudeSqr;
        if (distanceSqr < Math.pow((node.radius + defaultNodeRadius), 2)) {
            if (closestNodeIndex === -1) {
                closestNodeIndex = nodeIndex;
                closestNodeX = node.position.x;
                closestNodeY = node.position.y;
            }
            else if (distanceSqr < Math.pow((position.x - closestNodeX), 2) + Math.pow((position.y - closestNodeY), 2)) {
                closestNodeIndex = nodeIndex;
                closestNodeX = node.position.x;
                closestNodeY = node.position.y;
            }
        }
    }
    return closestNodeIndex;
}
function getNodeIndicesInRect(box) {
    let nodeIndices = [];
    for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
        let node = nodes[nodeIndex];
        if (node.position.x < box.right &&
            node.position.x > box.left &&
            node.position.y < box.bottom &&
            node.position.y > box.top) {
            nodeIndices.push(nodeIndex);
        }
    }
    return nodeIndices;
}
function getPositionRelativeToElement(element, x, y) {
    if (element === null)
        return new Vector2(x, y);
    let rect = element.getBoundingClientRect();
    return new Vector2((x - rect.left - offset.x) | 0, (y - rect.top - offset.y) | 0);
}
function nodeRadiusCurve(radius) { //bu sanırım vertex boyu değiştirmek için
    return +(Math.sqrt(radius) + defaultNodeRadius).toFixed(2);
}
function showDialog(id) {
    var _a;
    (_a = document.getElementById(id)) === null || _a === void 0 ? void 0 : _a.classList.remove("hidden");
}
function closeDialog(id) {
    var _a;
    (_a = document.getElementById(id)) === null || _a === void 0 ? void 0 : _a.classList.add("hidden");
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
    edges = [];
    nodes = [];
    labelCounter = 1;
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
function moveNodes(delta, nodeIndices) {
    nodeIndices.forEach(nodeIndex => {
        if (nodeIndex >= 0 && nodeIndex < nodes.length) {
            let node = nodes[nodeIndex];
            node.position = node.position.add(delta);
        }
        else
            throw new RangeError(`nodeIndex = ${nodeIndex} is out of range for nodes.length = ${nodes.length}`);
    });
}
function deleteNodes(nodeIndices) {
    new Int32Array(nodeIndices).sort().reverse().forEach(nodeIndex => deleteNode(nodeIndex));
    draw(window.performance.now());
}
function deleteNode(nodeIndex) {
    for (let i = edges.length - 1; i >= 0; i--) {
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
    removeItem(selectedNodeIndices, nodeIndex);
    for (let i = selectedNodeIndices.length - 1; i >= 0; i--) {
        if (selectedNodeIndices[i] > nodeIndex)
            selectedNodeIndices[i]--; // Shift selected node indices to adjust
    }
    nodes.splice(nodeIndex, 1);
}
function cutEdges(scissor) {
    for (let i = edges.length - 1; i >= 0; i--) {
        const edge = edges[i];
        const node1 = nodes[edge.nodeIndex1];
        const node2 = nodes[edge.nodeIndex2];
        if (scissor.intersects(new Line(node1.position, node2.position))) {
            edges.splice(i, 1);
        }
    }
}
const mouseHoldDistanceThreshold = 1;
let lastMousePosition = null;
let lastMouseDownPosition = null;
let lastMouseDownTimestamp = -1;
let lastMouseDownNodeIndex = -1;
function mousedown(event) {
    let mousePosition = getPositionRelativeToElement(event.target, event.clientX, event.clientY);
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
                    state = State.Pan;
                }
                else {
                    if (mouseDownNodeIndex === -1) {
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
    draw(window.performance.now());
}
function mousemove(event) {
    let mousePosition = getPositionRelativeToElement(event.target, event.clientX, event.clientY);
    mouseHoverNodeIndex = getNodeIndexAtPosition(nodes, mousePosition);
    const movement = new Vector2(event.movementX, event.movementY);
    switch (state) {
        case State.None:
            if (event.buttons === 1 &&
                lastMouseDownNodeIndex !== -1 &&
                nodes[lastMouseDownNodeIndex].position.sub(mousePosition).magnitudeSqr > Math.pow(nodes[lastMouseDownNodeIndex].radius, 2)) {
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
            if (mouseHoverNodeIndex !== -1)
                deleteNode(mouseHoverNodeIndex);
            break;
        case State.DeleteEdge:
            if (lastMousePosition !== null)
                cutEdges(new Line(lastMousePosition, mousePosition));
            break;
    }
    lastMousePosition = mousePosition;
    draw(window.performance.now());
}
function mouseup(event) {
    let mousePosition = getPositionRelativeToElement(event.target, event.clientX, event.clientY);
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
            nodes.push(new GraphNode(lastMouseDownPosition, nodeRadiusCurve(nodeRadius), currentNodeColor, "")); //label eklenebilir
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
            if (mouseDeltaSqr < Math.pow(mouseHoldDistanceThreshold, 2))
                selectedNodeIndices = [];
            break;
    }
    lastMouseDownNodeIndex = -1;
    state = State.None;
    draw(window.performance.now());
}
function wheel(event) {
    // TODO: Camera zoom
    draw(window.performance.now());
}
const touchDoubleTapTimeout = 300; // ms
const touchHoldTimeout = 300; // ms
const touchDoubleTapDistanceThreshold = 20; // px I guess?
class TouchInfo {
    constructor(touchStartPosition, touchPosition, touchClientPosition, touchDelta, touchStartNodeIndex, touchOnNodeIndex, touchStartTimeStamp, touchTimeStamp) {
        this.touchStartPosition = touchStartPosition;
        this.touchPosition = touchPosition;
        this.touchClientPosition = touchClientPosition;
        this.touchDelta = touchDelta;
        this.touchStartNodeIndex = touchStartNodeIndex;
        this.touchOnNodeIndex = touchOnNodeIndex;
        this.touchStartTimeStamp = touchStartTimeStamp;
        this.touchTimeStamp = touchTimeStamp;
    }
}
let touchInfos = new Map();
let lastSingleTouchStartNodeIndex = -1;
let lastSingleTouchStartPosition = null;
let lastSingleTouchPosition = null;
let lastSingleTouchStartTimestamp = -1;
let touchHoldTimer = undefined;
function touchstart(event) {
    event.preventDefault();
    for (let i = 0; i < event.changedTouches.length; i++) {
        let touch = event.changedTouches[i];
        let touchPosition = getPositionRelativeToElement(touch.target, touch.clientX, touch.clientY);
        let touchStartNodeIndex = getNodeIndexAtPosition(nodes, touchPosition);
        touchInfos.set(touch.identifier, new TouchInfo(touchPosition, touchPosition, new Vector2(touch.clientX, touch.clientY), new Vector2, touchStartNodeIndex, touchStartNodeIndex, event.timeStamp, event.timeStamp));
    }
    if (touchInfos.size === 1) {
        let touchInfo = touchInfos.values().next().value;
        switch (state) {
            case State.None:
                let doubleTap = false;
                if (lastSingleTouchStartPosition !== null && lastSingleTouchStartTimestamp !== -1) {
                    let doubleTapDistanceSqr = touchInfo.touchPosition.sub(lastSingleTouchStartPosition).magnitudeSqr;
                    if (event.timeStamp - lastSingleTouchStartTimestamp < touchDoubleTapTimeout && doubleTapDistanceSqr < Math.pow(touchDoubleTapDistanceThreshold, 2)) {
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
        lastSingleTouchStartNodeIndex = touchInfo.touchStartNodeIndex;
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
function touchmove(event) {
    for (let i = 0; i < event.changedTouches.length; i++) {
        let touch = event.changedTouches[i];
        let touchPosition = getPositionRelativeToElement(touch.target, touch.clientX, touch.clientY);
        let touchOnNodeIndex = getNodeIndexAtPosition(nodes, touchPosition);
        // Update touch infos
        let touchInfo = touchInfos.get(touch.identifier);
        if (touchInfo === undefined)
            continue;
        touchInfo.touchDelta = new Vector2(touch.clientX - touchInfo.touchClientPosition.x, touch.clientY - touchInfo.touchClientPosition.y);
        touchInfo.touchClientPosition = new Vector2(touch.clientX, touch.clientY);
        touchInfo.touchPosition = touchPosition;
        touchInfo.touchOnNodeIndex = touchOnNodeIndex;
        touchInfo.touchTimeStamp = event.timeStamp;
    }
    if (touchInfos.size === 1) {
        clearTimeout(touchHoldTimer);
        touchHoldTimer = undefined;
        let touchInfo = touchInfos.values().next().value;
        switch (state) {
            case State.None:
                if (touchInfo.touchStartNodeIndex !== -1)
                    state = State.DrawEdge;
                else {
                    currentNodeColor = randomHslColor();
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
        let touchInfo1 = touchInfoList[0];
        let touchInfo2 = touchInfoList[1];
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
    draw(window.performance.now());
}
function touchend(event) {
    let endedTouchInfos = new Map();
    for (let i = 0; i < event.changedTouches.length; i++) {
        let touch = event.changedTouches[i];
        endedTouchInfos.set(touch.identifier, touchInfos.get(touch.identifier));
        touchInfos.delete(touch.identifier);
    }
    if (endedTouchInfos.size === 1 && touchInfos.size === 0) {
        let touchInfo = endedTouchInfos.values().next().value;
        switch (state) {
            // @ts-expect-error
            case State.None:
                if (touchInfo.touchStartNodeIndex !== -1) {
                    if (!removeItem(selectedNodeIndices, touchInfo.touchStartNodeIndex))
                        addItemUnique(selectedNodeIndices, touchInfo.touchStartNodeIndex);
                    break;
                }
                currentNodeColor = randomHslColor();
            // goto case State.DrawNode;
            case State.DrawNode:
                if (lastSingleTouchStartPosition === null)
                    throw new Error("State machine bug.");
                let nodeRadius = touchInfo.touchPosition.sub(lastSingleTouchStartPosition).magnitude;
                nodes.push(new GraphNode(lastSingleTouchStartPosition, nodeRadiusCurve(nodeRadius), currentNodeColor, ""));
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
    draw(window.performance.now());
}
function load() {
    resize();
    draw(window.performance.now());
}
function resize(entries, observer) {
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
let lastDrawTimestamp = -1;
function draw(timeStamp) {
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
        clearCanvas(canvas, ctx, "white");
        ctx.strokeStyle = "gray";
        ctx.lineWidth = edgeThickness;
        if (state === State.DrawEdge && lastMouseDownNodeIndex !== -1 && lastMousePosition !== null) {
            ctx.beginPath();
            ctx.moveTo(nodes[lastMouseDownNodeIndex].position.x, nodes[lastMouseDownNodeIndex].position.y);
            ctx.lineTo(lastMousePosition.x, lastMousePosition.y);
            ctx.stroke();
        }
        for (let i = 0; i < edges.length; i++) {
            let edge = edges[i];
            const node1 = nodes[edge.nodeIndex1];
            const node2 = nodes[edge.nodeIndex2];
            if (node1 === undefined || node2 === undefined)
                throw new Error("Edge has missing nodes.");
            ctx.beginPath();
            ctx.moveTo(node1.position.x, node1.position.y);
            ctx.lineTo(node2.position.x, node2.position.y);
            ctx.stroke();
        }
        for (const edge of highlightedEdges) {
            ctx.strokeStyle = "red";
            ctx.lineWidth = edgeThickness * 2;
            ctx.beginPath();
            ctx.moveTo(nodes[edge.nodeIndex1].position.x, nodes[edge.nodeIndex1].position.y);
            ctx.lineTo(nodes[edge.nodeIndex2].position.x, nodes[edge.nodeIndex2].position.y);
            ctx.stroke();
        }
        ctx.font = "bold 15px sans-serif";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        nodes.forEach(node => {
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
        ctx.lineWidth = 4;
        ctx.strokeStyle = "gray";
        selectedNodeIndices.forEach(nodeIndex => {
            let selectedNode = nodes[nodeIndex];
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
            ctx.arc(nodes[index].position.x, nodes[index].position.y, nodes[index].radius, 0, 360);
            ctx.stroke();
        }
    }
    finally {
        ctx.restore();
    }
    //window.requestAnimationFrame(draw);
    lastDrawTimestamp = timeStamp;
}
//# sourceMappingURL=main.js.map