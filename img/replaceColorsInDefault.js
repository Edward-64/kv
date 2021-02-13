const fs = require('fs');

fs.readFile(__dirname + '/players/default.svg', 'utf8', (err, svg) => {
	if (err) return console.log(err)
	svg = svg.replace(/#576a70/ig, '#73808c');
	svg = svg.replace(/#435257/ig, '#5c6670');
	svg = svg.replace(/#51b6a0/ig, '#d49326');
	svg = svg.replace(/#aaabc2/ig, '#928ea1');
	//svg = svg.replace(/#283033/ig, '#5c6670');
	fs.writeFile(__dirname + '/players/default.svg', svg, a => a);
});
