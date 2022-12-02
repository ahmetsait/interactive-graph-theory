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
		clearCanvas(canvas, ctx, "white");

		ctx.strokeStyle = "gray";
		ctx.lineWidth = edgeThickness;

		if (state === State.DrawEdge && lastMouseDownNodeIndex !== -1 && lastMousePosition !== null) {
			ctx.strokeStyle = "blue";
			ctx.beginPath();
			ctx.moveTo(nodes[lastMouseDownNodeIndex]!.position.x, nodes[lastMouseDownNodeIndex]!.position.y);
			ctx.lineTo(lastMousePosition.x, lastMousePosition.y);
			ctx.stroke();
		}

		
		for (let i = 0; i < edges.length; i++) {
			let edge = edges[i]!;
			const node1 = nodes[edge.nodeIndex1];
			const node2 = nodes[edge.nodeIndex2];
			if (node1 === undefined || node2 === undefined)
				throw new Error("Edge has missing nodes.");
			ctx.beginPath();
			// ctx.strokeStyle = "black";
			ctx.moveTo(node1.position.x, node1.position.y);
			ctx.lineTo(node2.position.x, node2.position.y);
			ctx.stroke();

			// ctx.globalCompositeOperation = "destination-over";

		}

		for (const edge of highlightedEdges) {
			console.log("hi");
			
			ctx.strokeStyle = "red";
			ctx.lineWidth = edgeThickness * 2;
			ctx.beginPath();
			ctx.moveTo(nodes[edge.nodeIndex1]!.position.x, nodes[edge.nodeIndex1]!.position.y);
			ctx.lineTo(nodes[edge.nodeIndex2]!.position.x, nodes[edge.nodeIndex2]!.position.y);
			ctx.stroke();
		}
		


		for (let i = 0; i < edges.length; i++) {
			let edge = edges[i]!;
			const node1 = nodes[edge.nodeIndex1];
			const node2 = nodes[edge.nodeIndex2];
			if (node1 === undefined || node2 === undefined)
				throw new Error("Edge has missing nodes.");

			ctx.fillStyle = '#fff';	
			var width = ctx.measureText((edge.edgeWeight).toString()).width;
			ctx.fillRect(((node1.position.x + node2.position.x) / 2)-15, ((node1.position.y + node2.position.y) / 2)-15, 30, 30);
				


			ctx.font = "bold 15px sans-serif";
			ctx.textBaseline = "middle";
			ctx.textAlign = "center";
			ctx.fillStyle = "blue";
			ctx.fillText(
				(edge.edgeWeight).toString(),
				((node1.position.x + node2.position.x) / 2), // added 5px cause not on it, but a little to the edge of the edge
				((node1.position.y + node2.position.y) / 2) 
			);
		}

		

		

		nodes.forEach(node => {
			ctx.fillStyle = node.color;
			ctx.beginPath();
			ctx.arc(node.position.x, node.position.y, node.radius, 0, 360);
			ctx.fill();
			// ctx.font = "bold 15px sans-serif";	
			ctx.font = "bold 15px sans-serif";
			ctx.textBaseline = "middle";
			ctx.textAlign = "center";
			ctx.fillStyle = "white";
			ctx.fillText((node.label).toString(), node.position.x, node.position.y);
		});


		for (const index of highlightedNodeIndices) {
			ctx.lineWidth = 4;
			ctx.strokeStyle = "red";
			ctx.setLineDash([]);
			ctx.beginPath();
			ctx.arc(nodes[index]!.position.x, nodes[index]!.position.y, nodes[index]!.radius, 0, 360);
			ctx.stroke();
		}

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

		if (state === State.BoxSelect && lastMousePosition !== null && lastMouseDownPosition !== null) {
			ctx.lineWidth = 1;
			ctx.strokeStyle = "gray";
			ctx.setLineDash([4, 4]);
			ctx.strokeRect(lastMouseDownPosition.x, lastMouseDownPosition.y, lastMousePosition.x - lastMouseDownPosition.x, lastMousePosition.y - lastMouseDownPosition.y);
		}

		
	}
	finally {
		ctx.restore();
	}

	//window.requestAnimationFrame(draw);

	lastDrawTimestamp = timeStamp;
}
