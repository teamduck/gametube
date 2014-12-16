// node script to pull out some primitive docs from the code

fs = require("fs");

var blacklist = {};
//blacklist["glMatrix-0.9.5.min.js"] = true;
//blacklist["compiled.js"] = true;

var totalLines = 0;
var totalFunctions = 0;
var totalSize = 0;
var compiled = "";

console.log("\nparsing .js files...\n");

if (process.argv.length < 3) {
	console.log("needs an output file\n");
	process.exit(1);
}

var output = {
	"title": "TEDGE PROJECT QUICK REFERENCE",
	"file": process.argv[2],
	"sdivider": "---------------------------------\r\n\r\n",
	"ddivider": "=================================\r\n",
	"data": "",
	"section": function (title) {
		console.log(title + "...");
		output.data += title + ":\r\n";
	},
	"stub": function (s) {
		output.data += "\t" + s + "\r\n";
	},
	"end": function () {
		output.data += "\r\n\r\n";
	},
	"write": function () {
		output.data = output.title + "\r\n" + output.ddivider + 
			output.ddivider + "\r\n\r\n" + output.data;
		fs.writeFile(output.file, output.data, function (err) {
			if (err) throw err;
			console.log("\nsaved to " + output.file + "\n");
		});
	}
}

function parse(data)
{
	var functionCount = 0;
	var lineCount = 0;
	totalSize += data.length;
	compiled += data;
	
	var functions = data.match(/function\s+[A-Z0-9_]+\s*\([A-Z0-9_, ]*\)/gi);
	var lines = data.split("\n");
	
	if (functions) {
		functionCount = functions.length;
		totalFunctions += functions.length;
	}
	if (lines) {
		lineCount = lines.length;
		totalLines += lineCount;
	}
	
	var details = lineCount + " line";
	if (lineCount != 1) details += "s";
	details += " and " + functionCount + " function";
	if (functionCount != 1) details += "s";
	
	output.stub(details);
	output.stub("");
	
	for (var f in functions) {
		output.stub(functions[f]);
	}
	if (functions) return functions.length;
	return 0;
}

fs.readdir(".", function (err, files) {
	if (err) throw err;
	for (var f in files) {
		var file = files[f];
		var suffix = file.substring(file.length-3);
		if (suffix == ".js" && !blacklist[file]) {
			output.section(file);
			compiled += "/* " + file + " */\r\n";
			var count = parse(fs.readFileSync(file, {encoding: "binary", flags: "r"}));
			output.end();
		}
	}
	
	// save cheatsheet
	output.section(totalLines + " lines and " + totalFunctions + " functions for the entire project. Total filesize: " + totalSize/1000 + "kb");
	output.write();
	
	// save compiled .js file
	fs.writeFile("release\\compiled.js", compiled, function (err) {
		if (err) throw err;
		console.log("compiled successfully\n");
	});
});
