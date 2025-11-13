const animationDelay = 300;

let highlightedNodeIndices: number[] = [];
let highlightedEdgeIndices: number[] = [];
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

function getEdgeWeight(a: number, b: number): number {
	const weight = edges.find((e)=> e.nodeIndex1 === a && e.nodeIndex2 === b || (e.edgeType === EdgeType.Bidirectional && e.nodeIndex1 === b && e.nodeIndex2 === a))?.weight;
	if (weight)
		return weight;
	return NaN;
}

async function dijkstra() {
	toggleTimelineVisibility(true);
	resetTimeline();
	highlightedNodeIndices = [];
	highlightedEdgeIndices = [];

	if (selectedNodeIndices.length !== 1) {
		alert("You need to select one node.");
		return;
	}

	function makeLabelSnapshot(distances: number[]): { [index: number]: string } {
		const labels: { [index: number]: string } = {};
		for (let i = 0; i < distances.length; i++) {
			labels[i] = distances[i] === Infinity ? "∞" : distances[i]!.toString();
		}
		return labels;
	}

	const start = selectedNodeIndices[0]!;
	const n = nodes.length;
	const visited = Array<boolean>(n).fill(false);
	const connections = gatherConnections();
	const distances = new Array(n).fill(Infinity);

	recordFrame(new AnimFrame([], [], [], makeLabelSnapshot(distances)));

	distances[start] = 0;
	highlightedNodeIndices.push(start);
	recordFrame(new AnimFrame(
		[...highlightedNodeIndices],
		[...highlightedEdgeIndices],
		[],
		makeLabelSnapshot(distances)
	));

	while (true) {
		let best = Infinity;
		let u = -1;

		for (let i = 0; i < n; i++) {
			const d = distances[i];
			if (!visited[i] && d < best) {
				best = d;
				u = i;
			}
		}

		if (u === -1) break;

		visited[u] = true;

		if (addItemUnique(highlightedNodeIndices, u)) {
			recordFrame(new AnimFrame(
				[...highlightedNodeIndices],
				[...highlightedEdgeIndices],
				[],
				makeLabelSnapshot(distances)
			));
		}

		for (const v of connections[u]!) {
			let edgeIndex = edges.findIndex(e =>
				(e.nodeIndex1 === u && e.nodeIndex2 === v) ||
				(e.nodeIndex2 === u && e.nodeIndex1 === v)
			);

			if (edgeIndex >= 0) {
				recordFrame(new AnimFrame(
					[...highlightedNodeIndices],
					[...highlightedEdgeIndices],
					[edgeIndex],
					makeLabelSnapshot(distances)
				));
				highlightedEdgeIndices.push(edgeIndex);
			}

			const w = getEdgeWeight(u, v);
			const newDist = distances[u] + w;
			let improved = false;

			if (newDist < distances[v]) {
				distances[v] = newDist;
				improved = true;
			}

			const isNewNode = addItemUnique(highlightedNodeIndices, v);
			if (isNewNode) {
				recordFrame(new AnimFrame(
					[...highlightedNodeIndices],
					[...highlightedEdgeIndices],
					[],
					makeLabelSnapshot(distances)
				));
			} else if (improved) {
				recordFrame(new AnimFrame(
					[...highlightedNodeIndices],
					[...highlightedEdgeIndices],
					[],
					makeLabelSnapshot(distances)
				));
			}
		}
	}

	for (let i = 0; i < n; i++) {
		nodes[i]!.label = distances[i] === Infinity ? "∞" : distances[i]!.toString();
	}

	highlightedEdgeIndices = [];
	highlightedNodeIndices = [];
	draw(performance.now());
}

async function BFS(){
	toggleTimelineVisibility(true);
	resetTimeline();
	highlightedEdgeIndices = [];
	highlightedNodeIndices = [];

	let startNodeIndex: number;
	if (selectedNodeIndices.length === 1)
		startNodeIndex = selectedNodeIndices[0]!;
	else{
		alert("You need to select one node.");
		return;
	}

	let visited = Array<boolean>(nodes.length).fill(false);
	let connections = gatherConnections();
	let queue = Array<number>();
	queue.push(startNodeIndex);
	visited[startNodeIndex] = true;


	while (queue.length > 0){
		let currentNodeIndex = queue.shift() as number;
		let added = addItemUnique(highlightedNodeIndices, currentNodeIndex);
		if (added)
			recordFrame(new AnimFrame([...highlightedNodeIndices], [...highlightedEdgeIndices], []));
		for (const nodeIndex of connections[currentNodeIndex]!) {
			if (!visited[nodeIndex]){
				let edgeIndex = edges.findIndex(e =>
					(e.nodeIndex1 === currentNodeIndex && e.nodeIndex2 === nodeIndex) ||
					(e.nodeIndex2 === currentNodeIndex && e.nodeIndex1 === nodeIndex)
				);
				if (edgeIndex >= 0){
					recordFrame(new AnimFrame([...highlightedNodeIndices], [...highlightedEdgeIndices], [edgeIndex]));
					highlightedEdgeIndices.push(edgeIndex);
				}
				let added = addItemUnique(highlightedNodeIndices, nodeIndex);
				if (added) 
					recordFrame(new AnimFrame([...highlightedNodeIndices], [...highlightedEdgeIndices], []));
				queue.push(nodeIndex);
				visited[nodeIndex] = true;
			}
		}
	}
	console.log(timeline);
	highlightedNodeIndices = [];
	highlightedEdges = [];
	draw(window.performance.now());
}

async function DFS() {
	toggleTimelineVisibility(true);
	resetTimeline();

	highlightedEdgeIndices = [];
	highlightedNodeIndices = [];

	if (selectedNodeIndices.length !== 1) {
		alert("You need to select exactly one start node.");
		return;
	}

	const start = selectedNodeIndices[0]!;
	const visited = Array<boolean>(nodes.length).fill(false);
	const connections = gatherConnections();

	const stack: { from: number|null, to: number }[] = [];
	stack.push({ from: null, to: start });

	while (stack.length > 0) {

		const { from, to: current } = stack.pop()!;
		if (visited[current]) continue;

		if (from !== null) {

			let edgeIndex = edges.findIndex(e =>
				(e.nodeIndex1 === from && e.nodeIndex2 === current) ||
				(e.nodeIndex2 === from && e.nodeIndex1 === current)
			);

			if (edgeIndex >= 0) {
				recordFrame(
					new AnimFrame(
						[...highlightedNodeIndices],
						[...highlightedEdgeIndices],
						[edgeIndex]
					)
				);
				highlightedEdgeIndices.push(edgeIndex);
			}
		}

		if (addItemUnique(highlightedNodeIndices, current)) {
			recordFrame(
				new AnimFrame(
					[...highlightedNodeIndices],
					[...highlightedEdgeIndices],
					[]
				)
			);
		}

		visited[current] = true;

		const neigh = connections[current]!;
		for (let i = neigh.length - 1; i >= 0; i--) {
			const n = neigh[i]!;
			if (!visited[n]) {
				stack.push({ from: current, to: n });
			}
		}
	}

	highlightedNodeIndices = [];
	highlightedEdgeIndices = [];
	draw(window.performance.now());
}

