/* js tanks server
 * 7/23/2011
 * aizuwakamatsu, fukushimaken, japan
 */

// NODE LIBRARIES ////////////////////////////////////////////////////////////
var sys 	= require('sys');
var http	= require('http');
var fs 		= require('fs');
var url 	= require('url');

// uses socket.io 0.7.9
var sio		= require('socket.io');

// CONSTANTS /////////////////////////////////////////////////////////////////
var PORT	= 8079;

// DATA STRUCTURES ///////////////////////////////////////////////////////////
var uid		= 1;	// unique id counter
var clients	= [];	// array of socket.io client objects


// PROTOCOL //////////////////////////////////////////////////////////////////
//
// SERVER -> CLIENT:
//   {event: 'hi', id: u_id}
//
// CLIENT -> SERVER:
//   {event: 'pos', blah blah}	- rebroadcast message volatile
//   {blah blah blah}			- rebroadcast message
//

function debug(message)
{
	sys.puts("error: " + message);
}

var mime_types = 
{
	html:"text/html",
	htm:"text/html",
	css:"text/css",
	js:"text/javascript",
	png:"image/png",
	jpg:"image/jpeg",
	ico:"image/vnd.microsoft.icon",
	txt:"text/plain"
};

// SERVER HANDLERS ///////////////////////////////////////////////////////////

function staticFileHandler(filename)
{
	// cache the data ahead of time
	var file = fs.readFileSync(filename, "binary");
	var stats = fs.statSync(filename);
	var etag = '"' + stats.ino + '-' + stats.size + '-' + Date.parse(stats.mtime) + '"';
	
	var i = filename.lastIndexOf(".");
	var content_type = "text/plain";
	if (i != -1) 
	{
		var extension = filename.substring(i+1);
		if (extension != "" && mime_types[extension] != undefined)
			content_type = mime_types[extension];
	}	
	
	var header = {
		"Server": 			"halo-infinity",
		"ETag": 			etag,
		"Content-Type": 	content_type,
		"Content-Length": 	file.length
	}
	
	return function(request, response)
	{
		if (request.headers['if-none-match'] != undefined && 
			request.headers['if-none-match'].indexOf(etag) != -1)
		{
			//sys.puts("304 on " + filename);
			response.writeHead(304);
			response.end();
			return;
		}

		// sys.puts("Serving file " + filename + ".");		
		response.writeHead(200, header);  
		response.write(file, "binary");  
		response.end();
	};
}

var root = staticFileHandler("index.html");
var handler = {};

function listFile(file) { handler[file] = staticFileHandler(file); }

// list of files on the server
handler["index.html"] 	= root;
//listFile("favicon.ico");
listFile("server.js");
listFile("game.js");
listFile("duck.js");
listFile("tedge.js");
listFile("physics.js");
listFile("meshes.js");
listFile("glMatrix-0.9.5.min.js");
listFile("thick.png");
//listFile("thin.png");

// FILE SERVER ///////////////////////////////////////////////////////////////
server = http.createServer(function(req, resp)
{
	var uri = url.parse(req.url).pathname;
	var filename = uri.substring(1);

	if (filename)
	{
		if (handler[filename])
		{
			handler[filename](req, resp);
		}
		else
		{		
			resp.writeHead(404, {"Content-Type": "text/plain"});  
			resp.write("Error 404: file not found");  
			resp.end();
			debug("requested invalid file: '" + filename + "'");			
		}
	}
	else
	{
		root(req, resp);
	}
});

server.listen(PORT);

// SOCKET.IO SERVER //////////////////////////////////////////////////////////

var io = sio.listen(server); 
io.sockets.on('connection', function(client)
{ 
	// new player connected
	var user_id = uid++;
	clients[user_id] = client;
	
	// incoming ajax
	client.on('message', function(msg)
	{
		if (msg.event == 'pos')
		{
			client.volatile.broadcast.json.send(msg);
		}
		else
		{
			client.broadcast.json.send(msg);		
		}
	}); 
	
	// client disconnect
	client.on('disconnect', function()
	{
		delete clients[user_id];
		// RemovePlayer(user_id);
	});
	
	// begin the handshake
	client.json.send({event: "hi", id: user_id});
	
	sys.puts("New player with id " + user_id);
}); 
