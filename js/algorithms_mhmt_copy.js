"use strict";
function kruskal_2() {
    function compareWeight(a, b) {
        // converting to uppercase to have case-insensitive comparison
        const w1 = a.edgeWeight;
        const w2 = b.edgeWeight;
        let comparison = 0;
        if (w1 > w2)
            comparison = 1;
        else
            comparison = -1;
        return comparison;
    }
    /**
     *
     * @param {Array} nodesList
     */
    function checkTreeStatus(nodesList) {
        let mainTree = nodesList[0].tree;
        let sameTree = true;
        nodesList.forEach((e) => {
            if (e.tree == -1 || e.tree != mainTree)
                return false;
        });
        return true;
    }
    function changeTree(tree1, tree2) {
        let bigTree = Math.max(tree1, tree2);
        let smallTree = Math.min(tree1, tree2);
        nodeStatus.forEach((e) => {
            if (e.tree == smallTree) {
                e.tree = bigTree;
            }
        });
    }
    function findTotalWeight() {
        let weight = 0;
        sorted.forEach((element) => {
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
    const div = document.createElement("div");
    div.style.width = "150px";
    div.classList.add("div-element");
    document.body.appendChild(div);
    const ul = document.createElement("ul");
    ul.classList.add("edge-list-ul");
    let newEdges = structuredClone(edges);
    /**
     *
     * @param {GraphEdge} a
     * @param {GraphEdge} b
     */
    // console.log("sorting..");
    /**
     *  @type Array
     */
    let sorted = newEdges.sort(compareWeight);
    sorted.forEach((e) => {
        e.status = 0;
    });
    // console.log("sorted edge list : ", sorted);
    // console.log("main edges       : ", edges);
    let nodeStatus = [];
    let node = {};
    let _tree = -1;
    nodes.forEach((
    /**
     * @type GraphNode
     */
    e) => {
        node = {
            label: e.label,
            status: 0,
            tree: -1,
        };
        nodeStatus.push(node);
    });
    // console.log("nodeStatus list: ", nodeStatus);
    let node1;
    let node2;
    let li;
    sorted.forEach((e) => {
        li = document.createElement("li");
        li.classList.add("edge-li");
        // console.log("before animation");
        // const added = addItemUnique(
        // 	highlightedListItem,
        // 	li
        // );
        // if (added) yield animationStep();
        // console.log("before animation");
        li.textContent = `${e.nodeIndex1} - ${e.nodeIndex2} => ${e.edgeWeight}`;
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
        }
        else if (node1.status == 0 && node2.status != 0) {
            // console.log("one visited one unvisited.");
            node1.status = 1;
            node1.tree = node2.tree;
            e.status = 1;
        }
        else if (node2.status == 0 && node1.status != 0) {
            // console.log("one visited one unvisited.");
            node2.status = 1;
            node2.tree = node1.tree;
            e.status = 1;
        }
        else {
            // console.log("both visited.");
            if (node2.tree != node1.tree) {
                e.status = 1;
                changeTree(node2.tree, node1.tree);
            }
            else {
                e.status = -1;
            }
        }
        li.classList.remove("blue-li");
        if (e.status === 1) {
            // console.log("green");
            li.classList.add("green-li");
        }
        else {
            li.classList.add("red-li");
        }
    });
    // console.log(sorted);
    let totalWeight = findTotalWeight();
    // console.log("nodeStatus list: ", nodeStatus);
    // console.log("total weight: ", totalWeight);
    const totalDiv = document.createElement("div");
    totalDiv.classList.add("total-div");
    document.body.appendChild(totalDiv);
    const totalTitle = document.createElement("p");
    totalTitle.classList.add("total-title");
    totalTitle.textContent = "Total Weight";
    totalDiv.appendChild(totalTitle);
    const totalWeightP = document.createElement("p");
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
    sorted.forEach((e) => {
        if (e.status === 1) {
            highlightedEdges.push(e); // push edges on the path to that array then call draw.
        }
    });
    draw(window.performance.now());
    // highlightedEdges = [];
    // yield animationStep();
    // highlightedEdges = []
}
//# sourceMappingURL=algorithms_mhmt%20copy.js.map