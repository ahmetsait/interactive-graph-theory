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
let highlightedNodeIndex = -1;
let highlightedEdge;
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
        addItemUnique(connections[edge.nodeIndex2], edge.nodeIndex1);
    }
    return connections;
}
function dijkstra() {
    return __awaiter(this, void 0, void 0, function* () {
        let startNodeIndex;
        if (selectedNodeIndices.length === 1)
            startNodeIndex = selectedNodeIndices[0];
        else
            return;
        let visited = Array(nodes.length).fill(false);
        let connections = gatherConnections();
        let distances = Array(nodes.length).fill(Infinity);
        distances[startNodeIndex] = 0;
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            node.label = distances[i] === Infinity ? "∞" : distances[i].toString();
        }
        yield resolveDijkstra(startNodeIndex, connections, visited, distances, true);
        highlightedNodeIndex = -1;
        highlightedEdge = undefined;
        draw(window.performance.now());
    });
}
function resolveDijkstra(currentNodeIndex, connections, visited, distances, animate) {
    return __awaiter(this, void 0, void 0, function* () {
        highlightedNodeIndex = currentNodeIndex;
        highlightedEdge = undefined;
        if (animate)
            yield animationStep();
        for (const nodeIndex of connections[currentNodeIndex]) {
            highlightedEdge = new GraphEdge(currentNodeIndex, nodeIndex);
            if (animate)
                yield animationStep();
            if (distances[currentNodeIndex] + 1 < distances[nodeIndex]) {
                distances[nodeIndex] = distances[currentNodeIndex] + 1;
                nodes[nodeIndex].label = distances[nodeIndex] === Infinity ? "∞" : distances[nodeIndex].toString();
                yield resolveDijkstra(nodeIndex, connections, visited, distances, animate);
                highlightedNodeIndex = currentNodeIndex;
                highlightedEdge = undefined;
                if (animate)
                    yield animationStep();
            }
        }
    });
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
            for (const nodeIndex of connections[currentNodeIndex]) {
                highlightedNodeIndex = currentNodeIndex;
                highlightedEdge = undefined;
                yield animationStep();
                if (!visited[nodeIndex]) {
                    highlightedEdge = new GraphEdge(currentNodeIndex, nodeIndex);
                    yield animationStep();
                    queue.push(nodeIndex);
                    visited[nodeIndex] = true;
                }
            }
            highlightedNodeIndex = -1;
            highlightedEdge = undefined;
            draw(window.performance.now());
        }
    });
}
//# sourceMappingURL=algorithms.js.map