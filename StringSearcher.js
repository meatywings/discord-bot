class StringSearcher {
	constructor(options = {}) {
		Object.assign(this, {
			value: null,
			children: {},
			parent: null,
			strings: [],
		}, options);
	}

	add(child) {
		if (this.children[child.value]) return false;
		this.children[child.value] = child;
		child.parent = this;
		return true;
	}

	search(str) {
		let p = this;
		let stack = '';
		const output = [];
		let stack_start_index = 0;
		let exact = 0;

		// loop through string one char at a time
		for (let i = 0; i < str.length; i++) {
			const c = str.charAt(i);

			// Add c to the stack
			stack = `${stack}${c}`;

			const node = p.children[c.toLowerCase()] || p.children[c.toUpperCase()];

			if (node == undefined) {
				p = this;
				// clear stack
				stack = '';
				stack_start_index = i + 1;
				continue;
			} else {
				p = node;
				if (p.children[null] != undefined) {
					// we are at the end of the tree

					// Check if this is an exact match
					let cb = str.charAt(stack_start_index - 1);
					let ca = str.charAt(i + 1);

					if (cb == ' ' || cb == '') {
						cb = true;
					}

					if (ca == ' ' || ca == '') {
						ca = true;
					}

					if (ca === true && cb === true) {
						// exact match to start of output
						output.splice(exact++, 0, stack);
					} else {
						output.push(stack);
					}

					if (Object.keys(p.children) == 1) {
						stack = '';
						stack_start_index = i;
					}
				}
			}
		}
		return output;
	}

	load(str_array) {
		this.strings = this.strings.concat(str_array);
		for (const i in str_array) {
			// New word, set node back to root
			let p = this;

			// Get str to iterate over.
			const str = str_array[i];
			for (const j in str) {
				const c = str[j];

				// If parent already contains char set it as the parent and move to next letter.
				let node = p.children[c];
				if (node == undefined) {
					// create a node for the char with the parent as p
					node = new StringSearcher({ value: c, parent: p });
				}
				// Add the node to the parent
				p.add(node);

				// Set the parent as the new node.
				p = node;
			}

			p.add(new StringSearcher({ value: null, parent: p }));
		}
	}

	clear() {
		this.strings = [];
		this.children = {};
		this.value = null;
		this.parent = null;
	}
}

module.exports = new StringSearcher();