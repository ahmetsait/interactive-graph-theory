function getAllNodeIndices() {
	/**
	 * @type Array
	 */
	let nodesIndices = [];
	// console.log(nodes);
	nodes.forEach((e) => {
		nodesIndices.push(e.label);
	});
	// console.log(nodesIndices);
	return nodesIndices;
}

function getNewLabel() {
	if (nodes.length === 0) return 0;

	let indices = getAllNodeIndices();
	// console.log(indices);
	let newValue = Math.max(...indices) + 1;
	// console.log("new value: ", newValue);
	return newValue;
}

// function findEdge(index1, index2) {
// 	edges.forEach(element => {
// 		if(element.nodeIndex1 == index1 && element.nodeIndex1 == index2){
// 			return element;
// 		}
// 	});
// }

function removeAlgorithmObjects() {
	if (document.querySelector(".div-element")) {
		document.querySelector(".div-element").remove();
	}

	if (document.querySelector(".total-div")) {
		document.querySelector(".total-div").remove();
	}
}

function drawSpesificGraph() {
	nodes = [];
	nodes.push(new GraphNode(new Vector2(500, 480), 25, randomHslColor(), 0));
	nodes.push(new GraphNode(new Vector2(420, 200), 25, randomHslColor(), 1));
	nodes.push(new GraphNode(new Vector2(650, 375), 25, randomHslColor(), 2));
	nodes.push(new GraphNode(new Vector2(700, 200), 25, randomHslColor(), 3));
	nodes.push(new GraphNode(new Vector2(280, 650), 25, randomHslColor(), 4));
	nodes.push(new GraphNode(new Vector2(220, 280), 25, randomHslColor(), 5));
	nodes.push(new GraphNode(new Vector2(850, 530), 25, randomHslColor(), 6));
	nodes.push(new GraphNode(new Vector2(350, 400), 25, randomHslColor(), 7));

	edges.push(new GraphEdge(0,7,16));
	edges.push(new GraphEdge(2,3,17));
	edges.push(new GraphEdge(1,7,19));
	edges.push(new GraphEdge(0,2,26));
	edges.push(new GraphEdge(5,7,28));
	edges.push(new GraphEdge(1,3,29));
	edges.push(new GraphEdge(1,5,32));
	edges.push(new GraphEdge(2,7,34));
	edges.push(new GraphEdge(4,5,35));
	edges.push(new GraphEdge(1,2,36));
	edges.push(new GraphEdge(4,7,37));
	edges.push(new GraphEdge(0,4,38));
	edges.push(new GraphEdge(6,2,40));
	edges.push(new GraphEdge(3,6,52));
	edges.push(new GraphEdge(6,0,58));
	edges.push(new GraphEdge(6,4,93));

}

function drawRandomGraph(size) {
	nodes = [];
	console.log("hey");
	for (let i = 1; i < size; i++) {
		nodes.push(
			new GraphNode(
				new Vector2(
					Math.floor(200 + Math.random() * 700),
					Math.floor(150 + Math.random() * 450)
				),
				25,
				randomHslColor(),
				i
			)
		);
	}
	// new GraphNode(new Vector2(Math.floor(200 + Math.random() * 700), Math.floor(150 + Math.random() * 450)), 25, randomHslColor(), 1);
	// new GraphNode(new Vector2(Math.floor(200 + Math.random() * 700), Math.floor(150 + Math.random() * 450)), 25, randomHslColor(), 2);
	// new GraphNode(new Vector2(Math.floor(200 + Math.random() * 700), Math.floor(150 + Math.random() * 450)), 25, randomHslColor(), 3);
	// new GraphNode(new Vector2(Math.floor(200 + Math.random() * 700), Math.floor(150 + Math.random() * 450)), 25, randomHslColor(), 4);
	// new GraphNode(new Vector2(Math.floor(200 + Math.random() * 700), Math.floor(150 + Math.random() * 450)), 25, randomHslColor(), 5);
	// new GraphNode(new Vector2(Math.floor(200 + Math.random() * 700), Math.floor(150 + Math.random() * 450)), 25, randomHslColor(), 6);
	// new GraphNode(new Vector2(Math.floor(200 + Math.random() * 700), Math.floor(150 + Math.random() * 450)), 25, randomHslColor(), 7);
	// new GraphNode(new Vector2(100, 100), 25, randomHslColor(), 7);
}
