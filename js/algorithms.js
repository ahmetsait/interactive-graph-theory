"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const animationDelay = 300;
let highlightedNodeIndices = [];
let highlightedEdges = [];
function animationStep() {
    return __awaiter(this, void 0, void 0, function* () {
        draw(window.performance.now());
        return new Promise(function (resolve) {
            setTimeout(resolve, animationDelay);
        });
    });
}
function gatherConnections() {
    let connections = Array(nodes.length);
    for (let i = 0; i < connections.length; i++) {
        connections[i] = [].slice();
    }
    for (const edge of edges) {
        addItemUnique(connections[edge.nodeIndex1], edge.nodeIndex2);
        if (edge.edgeType == EdgeType.Bidirectional)
            addItemUnique(connections[edge.nodeIndex2], edge.nodeIndex1);
    }
    return connections;
}
function dijkstra() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        let startNodeIndex;
        if (selectedNodeIndices.length === 1)
            startNodeIndex = selectedNodeIndices[0];
        else
            return;
        const connections = gatherConnections();
        const n = nodes.length;
        const visited = Array(n).fill(false);
        const distances = new Array(n).fill(Infinity);
        distances[startNodeIndex] = 0;
        for (let i = 0; i < n; i++)
            nodes[i].label = distances[i] === Infinity ? "∞" : distances[i].toString();
        if (!distances)
            return;
        while (true) {
            let best = Infinity;
            let u = -1;
            for (let i = 0; i < n; i++) {
                const d = (_a = distances[i]) !== null && _a !== void 0 ? _a : Infinity;
                if (!visited[i] && d < best) {
                    best = d;
                    u = i;
                }
            }
            if (u === -1)
                break;
            visited[u] = true;
            addItemUnique(highlightedNodeIndices, u);
            highlightedEdges = [];
            yield animationStep();
            for (const v of connections[u]) {
                const w = getEdgeWeight(u, v);
                highlightedEdges.push(new GraphEdge(u, v, EdgeType.Bidirectional, 0));
                yield animationStep();
                if (distances[u] + w < distances[v]) {
                    distances[v] = distances[u] + w;
                    nodes[v].label = distances[v].toString();
                }
            }
            draw(window.performance.now());
        }
        highlightedNodeIndices = [];
        highlightedEdges = [];
        draw(window.performance.now());
    });
}
function getEdgeWeight(a, b) {
    var _a;
    const weight = (_a = edges.find((e) => e.nodeIndex1 === a && e.nodeIndex2 === b || (e.edgeType === EdgeType.Bidirectional && e.nodeIndex1 === b && e.nodeIndex2 === a))) === null || _a === void 0 ? void 0 : _a.weight;
    if (weight)
        return weight;
    return NaN;
}
function BFS() {
    return __awaiter(this, void 0, void 0, function* () {
        let startNodeIndex;
        if (selectedNodeIndices.length === 1)
            startNodeIndex = selectedNodeIndices[0];
        else
            return;
        let visited = Array(nodes.length).fill(false);
        let connections = gatherConnections();
        let queue = Array();
        queue.push(startNodeIndex);
        visited[startNodeIndex] = true;
        while (queue.length > 0) {
            let currentNodeIndex = queue.shift();
            let added = addItemUnique(highlightedNodeIndices, currentNodeIndex);
            if (added)
                yield animationStep();
            for (const nodeIndex of connections[currentNodeIndex]) {
                if (!visited[nodeIndex]) {
                    highlightedEdges.push(new GraphEdge(currentNodeIndex, nodeIndex, EdgeType.Bidirectional, 0));
                    yield animationStep();
                    let added = addItemUnique(highlightedNodeIndices, nodeIndex);
                    if (added)
                        yield animationStep();
                    queue.push(nodeIndex);
                    visited[nodeIndex] = true;
                }
            }
        }
        highlightedNodeIndices = [];
        highlightedEdges = [];
        draw(window.performance.now());
    });
}
function DFS() {
    return __awaiter(this, void 0, void 0, function* () {
        let startNodeIndex;
        if (selectedNodeIndices.length === 1)
            startNodeIndex = selectedNodeIndices[0];
        else
            return;
        let visited = Array(nodes.length).fill(false);
        let connections = gatherConnections();
        visited[startNodeIndex] = true;
        yield resolveDFS(startNodeIndex, connections, visited);
        highlightedNodeIndices = [];
        highlightedEdges = [];
        draw(window.performance.now());
    });
}
function resolveDFS(currentNodeIndex, connections, visited) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        visited[currentNodeIndex] = true;
        for (const nodeIndex of connections[currentNodeIndex]) {
            const added = addItemUnique(highlightedNodeIndices, currentNodeIndex);
            if (added)
                yield animationStep();
            if (!visited[nodeIndex]) {
                highlightedEdges.push(new GraphEdge(currentNodeIndex, nodeIndex, EdgeType.Bidirectional, 0));
                yield animationStep();
                if (((_a = connections[nodeIndex]) === null || _a === void 0 ? void 0 : _a.length) == 0)
                    if (addItemUnique(highlightedNodeIndices, nodeIndex))
                        yield animationStep();
                yield resolveDFS(nodeIndex, connections, visited);
            }
        }
    });
}
//# sourceMappingURL=algorithms.js.map