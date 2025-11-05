const animationDelay = 300;

let highlightedNodeIndices: number[] = [];
let highlightedEdges: GraphEdge[] = [];

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
		if (edge.edgeType == EdgeType.Bidirectional)
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

	const connections = gatherConnections();
	const n = nodes.length;
	const visited = Array<boolean>(n).fill(false);
	const distances: number[] = new Array(n).fill(Infinity);
	distances[startNodeIndex] = 0;

	for (let i = 0; i < n; i++)
		nodes[i]!.label = distances[i] === Infinity ? "∞" : distances[i]!.toString();
	if (!distances) return;
	while (true) {
		let best = Infinity;
		let u = -1;
		for (let i = 0; i < n; i++) {
			const d = distances[i] ?? Infinity;
			if (!visited[i] && d < best) {
				best = d;
				u = i;
			}	
		}

		if (u === -1) break;
		visited[u] = true;
		addItemUnique(highlightedNodeIndices, u);
		highlightedEdges = [];
		await animationStep();

		for (const v of connections[u]!) {
			const w = getEdgeWeight(u, v);
			highlightedEdges.push(new GraphEdge(u, v, EdgeType.Bidirectional, 0));
			await animationStep();
			if (distances[u]! + w < distances[v]!) {
				distances[v]! = distances[u]! + w;
				nodes[v]!.label = distances[v]!.toString();
			}
		}
		draw(window.performance.now());
	}

	highlightedNodeIndices = [];
	highlightedEdges = [];
	draw(window.performance.now());
}

function getEdgeWeight(a: number, b: number): number {
	const weight = edges.find((e)=> e.nodeIndex1 === a && e.nodeIndex2 === b || (e.edgeType === EdgeType.Bidirectional && e.nodeIndex1 === b && e.nodeIndex2 === a))?.weight;
	if (weight)
		return weight;
	return NaN;
}

async function BFS(){
	let startNodeIndex: number;
	if (selectedNodeIndices.length === 1)
		startNodeIndex = selectedNodeIndices[0]!;
	else
		return;

	let visited = Array<boolean>(nodes.length).fill(false);
	let connections = gatherConnections();
	let queue = Array<number>();
	queue.push(startNodeIndex);
	visited[startNodeIndex] = true;

	while (queue.length > 0){
		let currentNodeIndex = queue.shift() as number;
		let added = addItemUnique(highlightedNodeIndices, currentNodeIndex);
		if (added) await animationStep();
		for (const nodeIndex of connections[currentNodeIndex]!) {
			if (!visited[nodeIndex]){
				highlightedEdges.push(new GraphEdge(currentNodeIndex, nodeIndex, EdgeType.Bidirectional, 0));
				await animationStep();
				let added = addItemUnique(highlightedNodeIndices, nodeIndex);
				if (added) await animationStep();
				queue.push(nodeIndex);
				visited[nodeIndex] = true;
			}
		}
	}
	highlightedNodeIndices = [];
	highlightedEdges = [];
	draw(window.performance.now());
}

async function DFS(){
	let startNodeIndex: number;
	if (selectedNodeIndices.length === 1)
		startNodeIndex = selectedNodeIndices[0]!;
	else
		return;

	let visited = Array<boolean>(nodes.length).fill(false);
	let connections = gatherConnections();
	visited[startNodeIndex] = true;

	await resolveDFS(startNodeIndex, connections, visited);
	highlightedNodeIndices = [];
	highlightedEdges = [];
	draw(window.performance.now());
}

async function resolveDFS(currentNodeIndex: number, connections: number[][], visited: boolean[]){
	visited[currentNodeIndex] = true;
	for (const nodeIndex of connections[currentNodeIndex]!) {
		const added = addItemUnique(highlightedNodeIndices, currentNodeIndex);
		if (added) await animationStep();
		if (!visited[nodeIndex]){
			highlightedEdges.push(new GraphEdge(currentNodeIndex, nodeIndex, EdgeType.Bidirectional, 0));
			await animationStep();
			if (connections[nodeIndex]?.length == 0)
				if (addItemUnique(highlightedNodeIndices, nodeIndex)) await animationStep();
			await resolveDFS(nodeIndex, connections, visited);
		}
	}
}