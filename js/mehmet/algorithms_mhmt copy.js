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
var __generator =
	(this && this.__generator) ||
	function (thisArg, body) {
		var _ = {
				label: 0,
				sent: function () {
					if (t[0] & 1) throw t[1];
					return t[1];
				},
				trys: [],
				ops: [],
			},
			f,
			y,
			t,
			g;
		return (
			(g = { next: verb(0), throw: verb(1), return: verb(2) }),
			typeof Symbol === "function" &&
				(g[Symbol.iterator] = function () {
					return this;
				}),
			g
		);
		function verb(n) {
			return function (v) {
				return step([n, v]);
			};
		}
		function step(op) {
			if (f) throw new TypeError("Generator is already executing.");
			while (_)
				try {
					if (
						((f = 1),
						y &&
							(t =
								op[0] & 2
									? y["return"]
									: op[0]
									? y["throw"] ||
									  ((t = y["return"]) && t.call(y), 0)
									: y.next) &&
							!(t = t.call(y, op[1])).done)
					)
						return t;
					if (((y = 0), t)) op = [op[0] & 2, t.value];
					switch (op[0]) {
						case 0:
						case 1:
							t = op;
							break;
						case 4:
							_.label++;
							return { value: op[1], done: false };
						case 5:
							_.label++;
							y = op[1];
							op = [0];
							continue;
						case 7:
							op = _.ops.pop();
							_.trys.pop();
							continue;
						default:
							if (
								!((t = _.trys),
								(t = t.length > 0 && t[t.length - 1])) &&
								(op[0] === 6 || op[0] === 2)
							) {
								_ = 0;
								continue;
							}
							if (
								op[0] === 3 &&
								(!t || (op[1] > t[0] && op[1] < t[3]))
							) {
								_.label = op[1];
								break;
							}
							if (op[0] === 6 && _.label < t[1]) {
								_.label = t[1];
								t = op;
								break;
							}
							if (t && _.label < t[2]) {
								_.label = t[2];
								_.ops.push(op);
								break;
							}
							if (t[2]) _.ops.pop();
							_.trys.pop();
							continue;
					}
					op = body.call(thisArg, _);
				} catch (e) {
					op = [6, e];
					y = 0;
				} finally {
					f = t = 0;
				}
			if (op[0] & 5) throw op[1];
			return { value: op[0] ? op[1] : void 0, done: true };
		}
	};
function animationStep_2() {
	return __awaiter(this, void 0, void 0, function () {
		return __generator(this, function (_a) {
			draw(window.performance.now());
			return [
				2 /*return*/,
				new Promise(function (resolve) {
					setTimeout(resolve, animationDelay);
				}),
			];
		});
	});
}
function kruskal_2() {
	function compareWeight(a, b) {
		// converting to uppercase to have case-insensitive comparison
		var w1 = a.edgeWeight;
		var w2 = b.edgeWeight;
		var comparison = 0;
		if (w1 > w2) comparison = 1;
		else comparison = -1;
		return comparison;
	}
	/**
	 *
	 * @param {Array} nodesList
	 */
	function checkTreeStatus(nodesList) {
		var mainTree = nodesList[0].tree;
		var sameTree = true;
		nodesList.forEach(function (e) {
			if (e.tree == -1 || e.tree != mainTree) return false;
		});
		return true;
	}
	function changeTree(tree1, tree2) {
		var bigTree = Math.max(tree1, tree2);
		var smallTree = Math.min(tree1, tree2);
		nodeStatus.forEach(function (e) {
			if (e.tree == smallTree) {
				e.tree = bigTree;
			}
		});
	}
	function findTotalWeight() {
		var weight = 0;
		sorted.forEach(function (element) {
			if (element.status == 1) {
				weight = weight + element.edgeWeight;
			}
		});
		return weight;
	}
	// create new edges list copy
	// sort the newEdges list
	// continue with this sorted newEdges list
	/**
	 * @type HTMLElement
	 */
	var div = document.createElement("div");
	div.style.width = "150px";
	div.classList.add("div-element");
	document.body.appendChild(div);
	var ul = document.createElement("ul");
	ul.classList.add("edge-list-ul");
	var newEdges = structuredClone(edges);
	/**
	 *
	 * @param {GraphEdge} a
	 * @param {GraphEdge} b
	 */
	// console.log("sorting..");
	/**
	 *  @type Array
	 */
	var sorted = newEdges.sort(compareWeight);
	sorted.forEach(function (e) {
		e.status = 0;
	});
	// console.log("sorted edge list : ", sorted);
	// console.log("main edges       : ", edges);
	var nodeStatus = [];
	var node = {};
	var _tree = -1;
	nodes.forEach(function (
		/**
		 * @type GraphNode
		 */
		e
	) {
		node = {
			label: e.label,
			status: 0,
			tree: -1,
		};
		nodeStatus.push(node);
	});
	// console.log("nodeStatus list: ", nodeStatus);
	var node1;
	var node2;
	/**
	 * @type HTMLElement
	 */
	var li = null;
	sorted.forEach(function (e) {
		li = document.createElement("li");
		li.classList.add("edge-li");
		// console.log("before animation");
		// const added = addItemUnique(
		// 	highlightedListItem,
		// 	li
		// );
		// if (added) yield animationStep();
		// console.log("before animation");
		li.textContent = ""
			.concat(e.nodeIndex1, " - ")
			.concat(e.nodeIndex2, " => ")
			.concat(e.edgeWeight);
		animationLog = [];
		animationLog.push(li.textContent);
		// yield animationStep();
		// await animationStep();
		ul.appendChild(li);
		div.appendChild(ul);
		// li.classList.add("blue-li");
		node1 = nodeStatus[e.nodeIndex1];
		node2 = nodeStatus[e.nodeIndex2];
		if (node1.status == 0 && node2.status == 0) {
			// console.log("find new tree");
			_tree++;
			node1.status = 1;
			node1.tree = _tree;
			node2.status = 1;
			node2.tree = _tree;
			e.status = 1;
		} else if (node1.status == 0 && node2.status != 0) {
			// console.log("one visited one unvisited.");
			node1.status = 1;
			node1.tree = node2.tree;
			e.status = 1;
		} else if (node2.status == 0 && node1.status != 0) {
			// console.log("one visited one unvisited.");
			node2.status = 1;
			node2.tree = node1.tree;
			e.status = 1;
		} else {
			// console.log("both visited.");
			if (node2.tree != node1.tree) {
				e.status = 1;
				changeTree(node2.tree, node1.tree);
			} else {
				e.status = -1;
			}
		}
		li.classList.remove("blue-li");
		if (e.status === 1) {
			// console.log("green");
			li.classList.add("green-li");
		} else {
			li.classList.add("red-li");
		}
	});
	// console.log(sorted);
	var totalWeight = findTotalWeight();
	// console.log("nodeStatus list: ", nodeStatus);
	// console.log("total weight: ", totalWeight);
	var totalDiv = document.createElement("div");
	totalDiv.classList.add("total-div");
	document.body.appendChild(totalDiv);
	var totalTitle = document.createElement("p");
	totalTitle.classList.add("total-title");
	totalTitle.textContent = "Total Weight";
	totalDiv.appendChild(totalTitle);
	var totalWeightP = document.createElement("p");
	totalWeightP.classList.add("total-weight");
	totalWeightP.textContent = totalWeight.toString();
	totalDiv.appendChild(totalWeightP);
	// ctx.strokeStyle = "red";
	// ctx.lineWidth = edgeThickness * 6;
	// ctx.beginPath();
	// ctx.moveTo(0, 0);
	// ctx.lineTo(400, 200);
	// ctx.stroke();
	highlightedEdges = [];
	sorted.forEach(function (e) {
		if (e.status === 1) {
			highlightedEdges.push(e); // push edges on the path to that array then call draw.
		}
	});
	draw(window.performance.now());
	// highlightedEdges = [];
	// yield animationStep();
	// highlightedEdges = []
}
