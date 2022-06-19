const animationDelay = 300;

let highlightedNodeIndex: number = -1;
let highlightedEdge: GraphEdge | undefined;

async function animationStep() {
	draw(window.performance.now());
	return new Promise(function (resolve) {
		setTimeout(resolve, animationDelay);
	});
}

function gatherConnections() {
	let connections = Array<number[]>(nodes.length);
	for (let i = 0; i < connections.length; i++) {
		connections[i] = [].slice();
	}
	for (const edge of edges) {
		addItemUnique(connections[edge.nodeIndex1]!, edge.nodeIndex2);
		addItemUnique(connections[edge.nodeIndex2]!, edge.nodeIndex1);
	}
	return connections;
}

async function dijkstra() {
	let startNodeIndex: number;
	if (selectedNodeIndices.length === 1)
		startNodeIndex = selectedNodeIndices[0]!;
	else
		return;

	let visited = Array<boolean>(nodes.length).fill(false);
	let connections = gatherConnections();
	let distances = Array<number>(nodes.length).fill(Infinity);
	distances[startNodeIndex] = 0;
	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i]!;
		node.label = distances[i] === Infinity ? "∞" : distances[i]!.toString();
	}
	await resolveDijkstra(startNodeIndex, connections, visited, distances, true);
	highlightedNodeIndex = -1;
	highlightedEdge = undefined;
	draw(window.performance.now());
}

async function resolveDijkstra(currentNodeIndex: number, connections: number[][], visited: boolean[], distances: number[], animate: boolean) {
	highlightedNodeIndex = currentNodeIndex;
	highlightedEdge = undefined;
	if (animate) await animationStep();
	for (const nodeIndex of connections[currentNodeIndex]!) {
		highlightedEdge = new GraphEdge(currentNodeIndex, nodeIndex);
		if (animate) await animationStep();
		if (distances[currentNodeIndex]! + 1 < distances[nodeIndex]!) {
			distances[nodeIndex]! = distances[currentNodeIndex]! + 1;
			nodes[nodeIndex]!.label = distances[nodeIndex] === Infinity ? "∞" : distances[nodeIndex]!.toString();
			await resolveDijkstra(nodeIndex, connections, visited, distances, animate);
			highlightedNodeIndex = currentNodeIndex;
			highlightedEdge = undefined;
			if (animate) await animationStep();
		}
	}
}
