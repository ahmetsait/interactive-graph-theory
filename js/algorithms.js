"use strict";
var __awaiter =
	(this && this.__awaiter) ||
	function (thisArg, _arguments, P, generator) {
		function adopt(value) {
			return value instanceof P
				? value
				: new P(function (resolve) {
						resolve(value);
				  });
		}
		return new (P || (P = Promise))(function (resolve, reject) {
			function fulfilled(value) {
				try {
					step(generator.next(value));
				} catch (e) {
					reject(e);
				}
			}
			function rejected(value) {
				try {
					step(generator["throw"](value));
				} catch (e) {
					reject(e);
				}
			}
			function step(result) {
				result.done
					? resolve(result.value)
					: adopt(result.value).then(fulfilled, rejected);
			}
			step(
				(generator = generator.apply(thisArg, _arguments || [])).next()
			);
		});
	};
const animationDelay = 800;
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
		addItemUnique(connections[edge.nodeIndex2], edge.nodeIndex1);
	}
	return connections;
}
function dijkstra() {
	return __awaiter(this, void 0, void 0, function* () {
		let startNodeIndex;
		if (selectedNodeIndices.length === 1)
			startNodeIndex = selectedNodeIndices[0];
		else return;
		let visited = Array(nodes.length).fill(false);
		let connections = gatherConnections();
		let distances = Array(nodes.length).fill(Infinity);
		distances[startNodeIndex] = 0;
		for (let i = 0; i < nodes.length; i++) {
			const node = nodes[i];
			node.label =
				distances[i] === Infinity ? "∞" : distances[i].toString();
		}
		yield resolveDijkstra(
			startNodeIndex,
			connections,
			visited,
			distances,
			true
		);
		highlightedNodeIndices = [];
		highlightedEdges = [];
		draw(window.performance.now());
	});
}
function resolveDijkstra(
	currentNodeIndex,
	connections,
	visited,
	distances,
	animate
) {
	return __awaiter(this, void 0, void 0, function* () {
		addItemUnique(highlightedNodeIndices, currentNodeIndex);
		highlightedEdges = [];
		if (animate) yield animationStep();
		for (const nodeIndex of connections[currentNodeIndex]) {
			highlightedEdges.push(new GraphEdge(currentNodeIndex, nodeIndex));
			if (animate) yield animationStep();
			if (distances[currentNodeIndex] + 1 < distances[nodeIndex]) {
				distances[nodeIndex] = distances[currentNodeIndex] + 1;
				nodes[nodeIndex].label =
					distances[nodeIndex] === Infinity
						? "∞"
						: distances[nodeIndex].toString();
				yield resolveDijkstra(
					nodeIndex,
					connections,
					visited,
					distances,
					animate
				);
				addItemUnique(highlightedNodeIndices, currentNodeIndex);
				highlightedEdges = [];
				if (animate) yield animationStep();
			}
		}
	});
}

function Prim() {
	return __awaiter(this, void 0, void 0, function* () {
		let startNodeIndex;
		if (selectedNodeIndices.length === 1)
			startNodeIndex = selectedNodeIndices[0];
		else return;
		let visited = Array(nodes.length).fill(false);
		let connections = gatherConnections();
	});
}

function BFS() {
	return __awaiter(this, void 0, void 0, function* () {
		let startNodeIndex;
		if (selectedNodeIndices.length === 1)
			startNodeIndex = selectedNodeIndices[0];
		else return;
		let visited = Array(nodes.length).fill(false);
		let connections = gatherConnections();
		let queue = Array();
		queue.push(startNodeIndex);
		visited[startNodeIndex] = true;
		while (queue.length > 0) {
			let currentNodeIndex = queue.shift();
			let added = addItemUnique(highlightedNodeIndices, currentNodeIndex);
			if (added) yield animationStep();
			for (const nodeIndex of connections[currentNodeIndex]) {
				if (!visited[nodeIndex]) {
					highlightedEdges.push(
						new GraphEdge(currentNodeIndex, nodeIndex)
					);
					let added = addItemUnique(
						highlightedNodeIndices,
						nodeIndex
					);
					if (added) yield animationStep();
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
		else return;
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
		visited[currentNodeIndex] = true;
		for (const nodeIndex of connections[currentNodeIndex]) {
			const added = addItemUnique(
				highlightedNodeIndices,
				currentNodeIndex
			);
			if (added) yield animationStep();
			if (!visited[nodeIndex]) {
				highlightedEdges.push(
					new GraphEdge(currentNodeIndex, nodeIndex)
				);
				yield animationStep();
				yield resolveDFS(nodeIndex, connections, visited);
			}
		}
	});
}
//# sourceMappingURL=algorithms.js.map
