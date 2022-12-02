function getWeight(): number {
	let weight: number | null;
	// weight = Math.floor(Math.random() * 50);
	let response: string = prompt("Enter the weight") || "";
	weight = parseInt(response);
	while (!weight) {
		alert("Value can't be empty!!!");
		// weight = Math.floor(Math.random() * 50);
		response = prompt("Enter the weight") || "";
		weight = parseInt(response);

	}
	while (isNaN(weight)) {
		alert("Value isn't number.");
	}
	return weight;
}
