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
	let connections = new Map<number, Set<number>>();
	for (const [id, edge] of edges) {
		let set = connections.get(edge.node1id) ?? new Set<number>();
		set!.add(edge.node2id);
		connections.set(edge.node1id, set);
		if (edge.edgeType === EdgeType.Bidirectional){
			set = connections.get(edge.node2id) ?? new Set<number>();
			set.add(edge.node1id);
			connections.set(edge.node2id, set);
		}
	}
	return connections;
}

function getEdgeWeight(a: number, b: number): number {
	const weight = edges.find((e)=> e!.node1id === a && e!.node2id === b || (e!.edgeType === EdgeType.Bidirectional && e!.node1id === b && e!.node2id === a))?.weight;
	if (weight)
		return weight;
	return NaN;
}

async function dijkstra() {
	toggleTimelineVisibility(true);
	resetTimeline();
	highlightedNodeIndices = [];
	highlightedEdgeIndices = [];

	if (selectedNodeIDs.length !== 1) {
		alert("You need to select one node.");
		return;
	}

	const start = selectedNodeIDs[0]!;
	const visited = new Set<number>();
	const connections = gatherConnections();

	const distances = new Map<number, number>();
	for (const [id] of nodes) distances.set(id, Infinity);

	function makeLabelSnapshot(): { [id: number]: string } {
		const out: { [id: number]: string } = {};
		for (const [id, d] of distances) out[id] = d === Infinity ? "∞" : d.toString();
		return out;
	}

	distances.set(start, 0);

	recordFrame(new AnimFrame([], [], [], [start], makeLabelSnapshot()));
	highlightedNodeIndices.push(start);

	while (true) {
		let best = Infinity;
		let u: number | null = null;

		for (const [id, d] of distances) {
			if (!visited.has(id) && d < best) {
				best = d;
				u = id;
			}
		}

		if (u === null) break;

		visited.add(u);

		if (addItemUnique(highlightedNodeIndices, u))
			recordFrame(new AnimFrame([...highlightedNodeIndices], [...highlightedEdgeIndices], [], [], makeLabelSnapshot()));

		let set = connections.get(u)!;
		if (!set) continue;
		for (const v of set) {
			const edge = edges.find(e =>
				(e!.node1id === u && e!.node2id === v) ||
				(e!.node2id === u && e!.node1id === v)
			);
			if (!edge) continue;

			recordFrame(new AnimFrame([...highlightedNodeIndices], [...highlightedEdgeIndices], [edge.id], [], makeLabelSnapshot()));

			highlightedEdgeIndices.push(edge.id);

			const old = distances.get(v)!;
			const cand = distances.get(u)! + getEdgeWeight(u, v);

			if (cand < old) distances.set(v, cand);

			if (!visited.has(v)) {
				recordFrame(new AnimFrame([...highlightedNodeIndices], [...highlightedEdgeIndices], [], [v], makeLabelSnapshot()));
				addItemUnique(highlightedNodeIndices, v);
			}
		}
	}
	recordFrame(new AnimFrame([...highlightedNodeIndices], [...highlightedEdgeIndices], [], [], makeLabelSnapshot()));
	for (const [id, d] of distances) nodes.get(id)!.label = d === Infinity ? "∞" : d.toString();

	highlightedNodeIndices = [];
	highlightedEdgeIndices = [];
	draw(performance.now());
}


async function BFS(){
	toggleTimelineVisibility(true);
	resetTimeline();
	highlightedEdgeIndices = [];
	highlightedNodeIndices = [];

	let startNodeIndex: number;
	if (selectedNodeIDs.length === 1)
		startNodeIndex = selectedNodeIDs[0]!;
	else{
		alert("You need to select one node.");
		return;
	}

	const visited = new Set<number>();
	let connections = gatherConnections();
	let queue = Array<number>();
	queue.push(startNodeIndex);
	visited.add(startNodeIndex);


	while (queue.length > 0){
		let currentNodeIndex = queue.shift() as number;
		let added = !highlightedEdgeIndices.contains(currentNodeIndex);
		if (added){
			recordFrame(new AnimFrame([...highlightedNodeIndices], [...highlightedEdgeIndices], [], [currentNodeIndex]));
			addItemUnique(highlightedNodeIndices, currentNodeIndex)
		}
		for (const nodeIndex of connections.get(currentNodeIndex) ?? new Set<number>()) {
			if (!visited.has(nodeIndex)){
				let edgeIndex = edges.find(e =>
					(e!.node1id === currentNodeIndex && e!.node2id === nodeIndex) ||
					(e!.node2id === currentNodeIndex && e!.node1id === nodeIndex)
				)!.id;
				if (edgeIndex >= 0){
					recordFrame(new AnimFrame([...highlightedNodeIndices], [...highlightedEdgeIndices], [edgeIndex]));
					highlightedEdgeIndices.push(edgeIndex);
				}
				let added = !highlightedEdgeIndices.contains(nodeIndex);
				if (added){
					recordFrame(new AnimFrame([...highlightedNodeIndices], [...highlightedEdgeIndices], [], [nodeIndex]));
					addItemUnique(highlightedNodeIndices, nodeIndex);
				}
				queue.push(nodeIndex);
				visited.add(nodeIndex);
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

	if (selectedNodeIDs.length !== 1) {
		alert("You need to select exactly one start node.");
		return;
	}

	const start = selectedNodeIDs[0]!;
	const visited = new Set<number>();
	const connections = gatherConnections();

	const stack: { from: number|null, to: number }[] = [];
	stack.push({ from: null, to: start });

	while (stack.length > 0) {

		const { from, to: current } = stack.pop()!;
		if (visited.has(current)) continue;

		if (from !== null) {

			let edgeIndex = edges.find(e =>
				(e!.node1id === from && e!.node2id === current) ||
				(e!.node2id === from && e!.node1id === current)
			)!.id;

			if (edgeIndex >= 0) {
				recordFrame(
					new AnimFrame(
						[...highlightedNodeIndices],
						[...highlightedEdgeIndices],
						[edgeIndex],
						[]
					)
				);
				highlightedEdgeIndices.push(edgeIndex);
			}
		}

		let added = !highlightedNodeIndices.contains(current);
		if (added) {
			recordFrame(
				new AnimFrame(
					[...highlightedNodeIndices],
					[...highlightedEdgeIndices],
					[],
					[current]
				)
			);
			addItemUnique(highlightedNodeIndices, current);
		}

		visited.add(current);

		const neigh = Array.from(connections.get(current) ?? new Set<number>()).reverse();
		
		for (let i = 0; i < neigh.length; i++) {
			const n = neigh[i]!;
			if (!visited.has(n)) {
				stack.push({ from: current, to: n });
			}
		}
	}
	recordFrame(
				new AnimFrame(
					[...highlightedNodeIndices],
					[...highlightedEdgeIndices],
					[],
					[]
				)
			);

	highlightedNodeIndices = [];
	highlightedEdgeIndices = [];
	draw(window.performance.now());
}

