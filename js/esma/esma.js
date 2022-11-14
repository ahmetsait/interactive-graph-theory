function getWeight() {
	let weight;
	// weight = Math.floor(Math.random() * 50);
	weight = parseInt(prompt("Enter the weight"));
	while (!weight) {
		alert("Value can't be empty!!!");
		// weight = Math.floor(Math.random() * 50);
		weight = prompt("Enter the weight");
	}
	while (isNaN(weight)) {
		alert("Value isn't number.");
	}
	return weight;
}
