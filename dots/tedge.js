// tedge.js: 3D games in javascript
// v 0.01

var gl;
var shader;
var canvas;
var canvas2D;
var context;
var entities = [];

var DEV_MODE = false;

// input
var K_KONAMI = false;
var KONAMI_CODE = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65];

// graphics
var gCamera;
var gTextures = {};

var vMatrix = mat4.create();
var wMatrix = mat4.create();
var pMatrix = mat4.create();
var STD_SHADER;

var cos = Math.cos;
var sin = Math.sin;
var tan = Math.tan;
var abs = Math.abs;

// timing
var lastT;
var curT;


// start the tEdgine
function run()
{
	// init graphics
	initGL();
	
	// init input
	document.onkeydown = onKeyDown;
	document.onkeyup = onKeyUp;
	document.onmousedown = onMouseDown;
	document.onmouseup = onMouseUp;
	document.onmousemove = onMouseMove;
	
	// init game stuffs
	gameInit();
}
window.onload = run;

var gLoadingScreen;
var gLoadingCallback;
var gLoadIndex;
var gLoadList;
function Load(constructorList, callback) {
	// create the black and white bar
	gLoadingScreen = LoadingScreen();
	gLoadingScreen.setProgress(0);
	gLoadingScreen.render();
	
	// store info
	gLoadList = constructorList;
	gLoadIndex = 0;
	if (callback)
		gLoadingCallback = callback;
	else
		gLoadingCallback = startGame;
	
	// start timeout loop
	window.setTimeout(LoadInstance, 1);
}

function LoadInstance() {
	gLoadingScreen.setProgress((gLoadIndex+1)/gLoadList.length);
	gLoadingScreen.render();
	
	var instance = gLoadList[gLoadIndex];
	if (typeof instance[0] === "number") {
		for (var i = 0; i < instance[0]; i++) {
			entities.push(instance[1](instance[2]));
		}
	} else {
		entities.push(instance[0](instance[1]));
	}

	gLoadIndex++;
	if (gLoadIndex < gLoadList.length)
		window.setTimeout(LoadInstance, 1);
	else
		gLoadingCallback();
}

//////////////////////////////////////////////////////
// GAME MANAGEMENT
//////////////////////////////////////////////////////

function connect()
{
	return 0;
}

function receive(type, arg)
{
	var e = type(arg);
	entities.push(e);
	return e;
}

function receiveAll(type, N, arg)
{
	if (N === undefined)
		return;

	var list = [];
	for (var i = 0; i < N; i++)
	{
		var e = type(arg);
		list.push(e);
		entities.push(e);
	}
	return list;
}

function receiveNew(type, arg)
{
	var e = type(arg);
	entities.push(e);
	return e;
}


//////////////////////////////////////////////////////
// GRAPHICS
//////////////////////////////////////////////////////

window.requestAnimFrame = (function() 
{
	return window.requestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		window.oRequestAnimationFrame ||
		window.msRequestAnimationFrame ||
		function(/* function FrameRequestCallback */ callback, /* DOMElement Element */ element) {
			window.setTimeout(callback, 1000/30);
		};
})();

// startup
function initGL()
{
	// find the canvas
	canvas = document.getElementById("game");
	canvas.width = document.body.clientWidth;
	canvas.height = document.body.clientHeight;
	
	// get gl context
	try {
		gl = canvas.getContext("webgl") ||
			canvas.getContext("experimental-webgl") ||
			canvas.getContext("webkit-3d") ||
			canvas.getContext("moz-webgl");
		gl.viewportWidth = canvas.width;
		gl.viewportHeight = canvas.height;
	} catch (e) {
	}
	if (!gl)
	{
		alert("Sorry, WebGL not supported.");
	}
	
	// get 2D context
	try {
		canvas2D = document.getElementById("2D");
		canvas2D.width = 512;
		canvas2D.height = 512;
		context = canvas2D.getContext("2d");
	} catch (e) {
	}
	if (!context)
	{
		alert("Could not bind 2D context.");
	}
	
	// load & compile shaders
	initShaders();
	
	// set up gl default state
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);
	
	// perspective
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);	
	mat4.perspective(55, gl.viewportWidth / gl.viewportHeight, 0.3, 400.0, pMatrix);
	gl.uniformMatrix4fv(STD_SHADER.pMatrix, false, pMatrix);
}

// render loop
function render()
{	
	// clear screen
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// set the camera
	vMatrix = gCamera.getMatrix();
	//gl.uniformMatrix4fv(STD_SHADER.vMatrix, false, vMatrix);
	
	// render first
	for (ent in entities)
	{
		if (entities[ent].render && entities[ent].renderFirst)
		{
			mat4.identity(wMatrix);
			entities[ent].render(wMatrix);
		}	
	}	
	
	// render normal
	for (ent in entities)
	{	
		if (entities[ent].render && 
			entities[ent].renderLast === undefined &&
			entities[ent].renderFirst === undefined)
		{
			mat4.identity(wMatrix);
			entities[ent].render(wMatrix);
		}
		
		if (DEV_MODE && entities[ent].devRender) {
			entities[ent].devRender();
		}
	}
	
	// render last
	for (ent in entities)
	{
		if (entities[ent].render && entities[ent].renderLast)
		{
			mat4.identity(wMatrix);
			entities[ent].render(wMatrix);
		}	
	}
}

// TEXTURES: /////////////////////////////////////////

function loadTexture(file)
{
	// prevent duplicate loading
	if (gTextures[file])
		return gTextures[file];
	
	var texture = gl.createTexture();
	texture.image = new Image();
	texture.image.onload = function() {
		handleLoadedTexture(texture)
	}
	texture.image.src = file;
	
	gTextures[file] = texture;
	return texture;
}

function setTexture(texture)
{
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.uniform1i(STD_SHADER.samplerUniform, 0);
}

function handleLoadedTexture(texture)
{
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, texture.image);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	//gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	//gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.bindTexture(gl.TEXTURE_2D, null);
}

function StoreTexture(texture, bitmap) 
{
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	//gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	//gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.bindTexture(gl.TEXTURE_2D, null);
}

function MakeTexture(shader, size) {
	// allocate image data and texture id
	var bitmap = context.createImageData(size, size);
	var texture = gl.createTexture();
	texture.bitmap = bitmap;
	texture.size = size;
	
	// create image
	for (var y = 0; y < size; y++) {
		for (var x = 0; x < size; x++) {
			var color = shader(x/size, y/size);
			bitmap.data[4*(x+y*size)+0] = color[0];
			bitmap.data[4*(x+y*size)+1] = color[1];
			bitmap.data[4*(x+y*size)+2] = color[2];
			if (color.length > 3)
				bitmap.data[4*(x+y*size)+3] = color[3];
			else
				bitmap.data[4*(x+y*size)+3] = 255;
		}
	}
	// store in vram
	StoreTexture(texture, bitmap);
	return texture;
}

function UpdateTexture(texture, shader)
{
	var size = texture.size;
	var bitmap = texture.bitmap;
	
	// draw image
	for (var y = 0; y < size; y++) {
		for (var x = 0; x < size; x++) {
			var color = shader(x/size, y/size);
			bitmap.data[4*(x+y*size)+0] = color[0];
			bitmap.data[4*(x+y*size)+1] = color[1];
			bitmap.data[4*(x+y*size)+2] = color[2];
			if (color.length > 3)
				bitmap.data[4*(x+y*size)+3] = color[3];
			else
				bitmap.data[4*(x+y*size)+3] = 255;
		}
	}
	// store in vram
	StoreTexture(texture, bitmap);
	return texture;
}

function PackTexture(shaders, size) {
	if (shaders.length == 1)
		return MakeTexture(shaders[0], size);
	else if (shaders.length == 2) {
		// allocate image data and texture id
		var bitmap = context.createImageData(size, size);
		var texture = gl.createTexture();
		
		// create image
		for (var y = 0; y < size; y++) {
			for (var x = 0; x < size; x++) {
				var xx = x%(size/2);
				var color = shaders[Math.floor(x/(size/2))](2*xx/size, y/size);
				bitmap.data[4*(x+y*size)+0] = color[0];
				bitmap.data[4*(x+y*size)+1] = color[1];
				bitmap.data[4*(x+y*size)+2] = color[2];
				if (color.length > 3)
					bitmap.data[4*(x+y*size)+3] = color[3];
				else
					bitmap.data[4*(x+y*size)+3] = 255;
			}
		}
		// store in vram
		StoreTexture(texture, bitmap);
		return texture;
	} else {
		console.log("Unsupported texture packing format.");
	}
}


// MESHES: /////////////////////////////////////////

// load json mesh into video memory
function BufferMesh(mesh)
{
	// prevent duplicate loading
	if (mesh.buffered)
		return mesh;
	
	mesh.vert_buf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vert_buf);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.vertices), gl.STATIC_DRAW);
	
	if (mesh.uvs)
	{
		mesh.uv_buf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, mesh.uv_buf);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.uvs), gl.STATIC_DRAW);
	}
	
	if (mesh.normals)
	{
		mesh.norm_buf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, mesh.norm_buf);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.normals), gl.STATIC_DRAW);
	}
	
	mesh.buffered = true;
	return mesh;
}

// update mesh data
function UpdateMesh(mesh)
{
	if (mesh.buffered === undefined)
		return BufferMesh(mesh);
	
	gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vert_buf);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.vertices), gl.DYNAMIC_DRAW);
	
	if (mesh.uvs)
	{
		gl.bindBuffer(gl.ARRAY_BUFFER, mesh.uv_buf);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.uvs), gl.DYNAMIC_DRAW);
	}
	
	if (mesh.normals)
	{
		gl.bindBuffer(gl.ARRAY_BUFFER, mesh.norm_buf);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.normals), gl.DYNAMIC_DRAW);
	}
	
	mesh.buffered = true;
	return mesh;
}

function DrawMesh(mesh, worldMtx, shader, wireframe)
{
	if (worldMtx.length < 16) {
		console.log("Warning: Invalid matrix type.");
		worldMtx = Mat4List(worldMtx);
	}
	if (shader === undefined) shader = STD_SHADER;
	shader.enable();
	// set vertex position array buffer
	gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vert_buf);
	gl.vertexAttribPointer(shader.vertPos, 3, gl.FLOAT, false, 0, 0);
	
	// set normal array buffer
	if (mesh.norm_buf && shader.vertNorm !== undefined)
	{
		gl.bindBuffer(gl.ARRAY_BUFFER, mesh.norm_buf);
		gl.vertexAttribPointer(shader.vertNorm, 3, gl.FLOAT, false, 0, 0);
	}
	
	// set UV array buffer
	if (mesh.uv_buf && shader.texCoord !== undefined)
	{
		gl.bindBuffer(gl.ARRAY_BUFFER, mesh.uv_buf);
		gl.vertexAttribPointer(shader.texCoord, 2, gl.FLOAT, false, 0, 0);
	}
	
	// set world matrix
	gl.uniformMatrix4fv(shader.wMatrix, false, worldMtx);

	// do it
	if (wireframe)
		gl.drawArrays(gl.LINE_STRIP, 0, mesh.count * 3);
	else
		gl.drawArrays(gl.TRIANGLES, 0, mesh.count * 3);
}


function CloneMesh(mesh) {
	var clone = {count: mesh.count};
	if (mesh.vertices) {
		clone.vertices = [];
		for (var v in mesh.vertices) {
			clone.vertices.push(mesh.vertices[v]);
		}
	}
	if (mesh.normals) {
		clone.normals = [];
		for (var n in mesh.normals) {
			clone.normals.push(mesh.normals[n]);
		}
	}
	if (mesh.uvs) {
		clone.uvs = [];
		for (var uv in mesh.uvs) {
			clone.uvs.push(mesh.uvs[uv]);
		}
	}
	return clone;
}

function TransformMesh(mesh, mtx)
{
	mesh.vertices = Mat4TransformPoints(mesh.vertices, mtx);
	//mesh.normals = Mat3TransformPoints(mesh.normals, mtx);
	return mesh;
}

function TransformMeshNonlinear(mesh, transformFunction) 
{
	for (var i = 0; i < mesh.vertices.length; i+=3) 
	{
		var transformed = transformFunction(
			[mesh.vertices[i], 
			mesh.vertices[i+1], 
			mesh.vertices[i+2]]
		);
		mesh.vertices[i] = transformed[0];
		mesh.vertices[i+1] = transformed[1];
		mesh.vertices[i+2] = transformed[2];
	}
	return mesh;
}

// more mesh functions
// [u'] = [a b][u] + [e]
// [v'] = [c d][v] + [f]
function TransformMeshUVs(mesh, affineMatrix) {
	for (var i = 0; i < mesh.uvs.length; i+=2) {
		var u = mesh.uvs[i]; var v = mesh.uvs[i+1];
		mesh.uvs[i] = affineMatrix[0]*u + affineMatrix[1]*v + affineMatrix[2];
		mesh.uvs[i+1] = affineMatrix[3]*u + affineMatrix[4]*v + affineMatrix[5];
	}
}


//////////////////////////////////////////////////////
// INPUT
//////////////////////////////////////////////////////
var keysDown = {};
var keysHit = {};
var buttonsDown = {};
var buttonsHit = {};
var mouseX = 0.5;
var mouseY = 0.5;

var lastKeys = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

var K_CTL	= 17;
var K_1		= 49;
var K_W		= 87;
var K_A		= 65;
var K_S		= 83;
var K_D		= 68;
var K_DOWN  = 40;
var K_RIGHT = 39;
var K_UP	= 38;
var K_LEFT  = 37;
var K_SPACE = 32;

var M_LEFT		= 0;
var M_MIDDLE 	= 1;
var M_RIGHT 	= 2;

function InputtingEntity(e, player)
{
	e.keyDown = function (key)
	{
		return (player == puid && (key in keysDown));
	}
	
	e.keyHit = function (key)
	{
		return (player == puid && (key in keysHit));
	}
	
	e.mouseDown = function (button)
	{
		return (player == puid && (button in buttonsDown));
	}
	
	e.mouseHit = function (button)
	{
		return (player == puid && (button in buttonsHit));
	}
	
	e.mousePosition = function ()
	{
		if (player == puid)
			return [mouseX/canvas.width, mouseY/canvas.height];
	}
	
	return e;
}

// input
function onKeyDown(evt) 
{
	if (!evt) evt = window.event;
	
	keysDown[evt.keyCode] = true;
	keysHit[evt.keyCode] = true;

	lastKeys.push(evt.keyCode);
	lastKeys.splice(0, 1);
	K_KONAMI = true;
	for (var i = 0; i < 10; i++)
		if (lastKeys[i] != KONAMI_CODE[i])
			K_KONAMI = false;
}

function onKeyUp(evt) 
{
	if (!evt) evt = window.event;
	if (evt.keyCode in keysDown)
		delete keysDown[evt.keyCode];
	
	if (evt.keyCode == K_1)
		DEV_MODE = !DEV_MODE;
}

function onMouseDown(evt) 
{
	if (!evt) evt = window.event;
	buttonsDown[evt.button] = true;
	buttonsHit[evt.button] = true;
}

function onMouseUp(evt)
{
	if (!evt) evt = window.event;
	if (evt.button in buttonsDown)
		delete buttonsDown[evt.button];
}

function onMouseMove(evt)
{
	if (!evt) evt = window.event;
	mouseX = evt.clientX;
	mouseY = evt.clientY;
}

//////////////////////////////////////////////////////
// GAME
//////////////////////////////////////////////////////

function startGame()
{
	// set the clock
	curT = new Date().getTime();
	gameLoop();
}

// main loop
function gameLoop()
{
	lastT = curT;
	curT = new Date().getTime();
	var dt = (curT - lastT + 1)/1000.0;
	
	if (dt > 1.0)
		dt = 1.0;
	
	Physics(dt);
	update(dt);
	render();
	
	keysHit = {}; buttonsHit = {};
	//setTimeout(gameLoop, 0);
	window.requestAnimFrame(gameLoop, canvas);	
}

function update(dt)
{	
	for (ent in entities)
	{
		if (entities[ent].update)
		{
			entities[ent].update(dt);
		}
	}
}

function removeEntity(e)
{
	var idx = entities.indexOf(e);
	if (idx != -1) 
		entities.splice(idx, 1);

	// destructor
	if (e.destroy) 
		e.destroy();
}


function StaticEntity(mesh, mdlMtx)
{
	if (mdlMtx)
	{   
		var origMesh = mesh;
		mesh = {uvs: origMesh.uvs, count: origMesh.count};
		mesh.vertices = Mat4TransformPoints(origMesh.vertices, mdlMtx);
		mesh.normals  = Mat3TransformPoints(origMesh.normals, mdlMtx);
	}
	
	var e = {};
	e.mesh = BufferMesh(mesh);
	
	e = PhysicalEntity(e, mesh, false);
	e.shader = STD_SHADER;
	
	e.render = function()
	{
		if (e.texture !== undefined) {
			TEX_SHADER.enable(e.texture);
			DrawMesh(e.mesh, Mat4List(e.matrix), TEX_SHADER);
		} else {
			DrawMesh(e.mesh, Mat4List(e.matrix), e.shader);
		}
	}

	
	return e;
}

function DynamicEntity(origMesh, mdlMtx)
{
	var mesh;
	if (mdlMtx)
	{   
		mesh = {uvs: origMesh.uvs, count: origMesh.count};
		mesh.vertices = Mat4TransformPoints(origMesh.vertices, mdlMtx);
		mesh.normals  = Mat3TransformPoints(origMesh.normals, mdlMtx);
	}
	else
		mesh = origMesh;
	
	BufferMesh(mesh);
	
	var e = PhysicalEntity({}, mesh, true);
	e.shader = STD_SHADER;
	
	e.render = function()
	{
		DrawMesh(e.mesh, Mat4List(e.matrix), e.shader);
	}
	
	return e;
}

function addPoint(mesh, values, x, z, wrap, u, v)
{
	mesh.vertices = mesh.vertices.concat(values[x][z]);
	if (u === undefined || v === undefined) {
		mesh.uvs.push(x / (values.length));
		mesh.uvs.push(z / (values[0].length));
	} else {
		mesh.uvs.push(u / (values.length));
		mesh.uvs.push(v / (values[0].length));
	}
	
	var X = values.length;
	var Z = values[0].length;
	
	if (true)
	{
		var normal = Vector3();
		if (x > 0)
		{
			if (z > 0 || wrap)
				normal = VecAdd( normal,
							VecNormalize(VecCross(VecSub(values[x-1][z], values[x][z]), 
												  VecSub(values[x][(z-1+Z)%Z], values[x][z]))));
			if (z < values[0].length - 1 || wrap)
				normal = VecAdd( normal,
							VecNormalize(VecCross(VecSub(values[x][(z+1+Z)%Z], values[x][z]), 
												  VecSub(values[x-1][z], values[x][z]))));
		}
		if (x < values.length - 1)
		{
			if (z > 0 || wrap)
				normal = VecAdd( normal,
							VecNormalize(VecCross(VecSub(values[x][(z-1+Z)%Z], values[x][z]), 
												VecSub(values[x+1][z], values[x][z]))));
			if (z < values[0].length - 1 || wrap)
				normal = VecAdd( normal,
							VecNormalize(VecCross(VecSub(values[x+1][z], values[x][z]), 
												VecSub(values[x][(z+1)%Z], values[x][z]))));
		}
		if (wrap)
		{
			if (x==0)
				normal = VecCross(VecSub(values[x+1][z], values[x][z]),
								VecSub(values[x+1][(z+1)%Z], values[x][z]));
			else if (x==X-1)
				normal = VecCross(VecSub(values[x-1][z], values[x][z]),
								VecSub(values[x-1][(z+1)%Z], values[x][z]));
		}
			
		
		mesh.normals = mesh.normals.concat(VecNormalize(normal));
	}
	else
		mesh.normals = mesh.normals.concat(normals[x][z]);
}

function Math2Mesh(maths, xrange, zrange, quality)
{
	var values = [];
	var X, Z;
	var dx = (xrange[1] - xrange[0])/quality;
	var dz = (zrange[1] - zrange[0])/quality;
	var delta = dx < dz ? dx : dz;
	for (var x = xrange[0], X =0; x <= xrange[1]; x += delta, X++)
	{
		values.push([]);
		for (var z = zrange[0], Z = 0; z <= zrange[1]; z += delta, Z++)
		{
			values[X].push(Vector3(x,maths(x,z),z));
		}
	}
	
	//  1	  25
	//
	//	0 / 1
	//
	//  34	  6
	
	var mesh = {};
	mesh.count = (X - 1) * (Z - 1) * 2;
	mesh.vertices = [];
	mesh.normals = [];
	mesh.uvs = [];
	for (var x = 0; x < X-1; x++)
		for (var z = 0; z < Z-1; z++)
		{
			addPoint(mesh, values, x,   z);
			addPoint(mesh, values, x+1, z);
			addPoint(mesh, values, x,   z+1);
			addPoint(mesh, values, x,   z+1);
			addPoint(mesh, values, x+1, z);
			addPoint(mesh, values, x+1, z+1);
		}
	
	return mesh;
}


function Math2MeshSphere(maths, slices, cuts)
{
	var values = [];
	var normals = [];
	for (var slice = 0; slice <= slices; slice++)
	{
		values.push([]);
		normals.push([]);
		var theta = slice/slices*Math.PI;
		for (var cut = 0; cut < cuts; cut++)
		{
			var phi = cut/cuts*Math.PI*2 - Math.PI;
			var r = maths(phi, theta);
			normals[slice][cut] = Vector3(cos(phi)*sin(theta), cos(theta), sin(phi)*sin(theta));
			values[slice][cut] = VecScale(normals[slice][cut], r);
		}
	}
	
	var mesh = {};
	mesh.count = (slices - 1) * cuts * 2
	mesh.vertices = [];
	mesh.normals = [];
	mesh.uvs = [];
	for (var slice = 1; slice < slices-1; slice++)
		for (var cut = 0; cut < cuts; cut++)
		{
			addPoint(mesh, values, slice,   cut, normals);
			addPoint(mesh, values, slice+1, cut, normals);
			addPoint(mesh, values, slice,   (cut+1)%cuts, normals, slice, cut+1);
			addPoint(mesh, values, slice,   (cut+1)%cuts, normals, slice, cut+1);
			addPoint(mesh, values, slice+1, cut, normals);
			addPoint(mesh, values, slice+1, (cut+1)%cuts, normals, slice+1, cut+1);
		}
	for (var cut = 0; cut < cuts; cut++)
	{
		addPoint(mesh, values, 0, 0, normals, 0, cut+1);
		addPoint(mesh, values, 1, cut, normals);
		addPoint(mesh, values, 1, (cut+1)%cuts, normals, 1, cut+1);
		addPoint(mesh, values, slices-1, (cut+1)%cuts, normals, slices-1, cut+1);
		addPoint(mesh, values, slices-1, cut, normals);
		addPoint(mesh, values, slices, 0, normals, slices, cut+1);		
	}
	
	return mesh;
}

function Math2MeshCylinder(maths, slices, cuts, caps)
{
	var values = [];
	var normals = [];
	for (var slice = 0; slice < slices; slice++)
	{
		values.push([]);
		normals.push([]);
		for (var cut = 0; cut < cuts; cut++)
		{
			var theta = cut/(cuts) * 2 * Math.PI;
			var phi = slice/(slices-1);
			// takes an angle [0, 2PI] and t parameter [0,1] and returns a radius
			var r = maths(theta, phi);
			var x = VecScale(Vector3(cos(theta), 0, sin(theta)), r);
			x = VecAdd(x, Vector3(0, phi, 0));
			normals[slice][cut] = x;
			values[slice][cut] = x;
		}
	}
	
	
	var mesh = {};
	mesh.count = (slices - 1) * cuts * 2
	if (caps) mesh.count += cuts * 2;
	mesh.vertices = [];
	mesh.normals = [];
	mesh.uvs = [];
	for (var slice = 0; slice < slices - 1; slice++)
		for (var cut = 0; cut < cuts; cut++)
		{
			addPoint(mesh, values, slice,   cut, normals);
			addPoint(mesh, values, slice+1, cut, normals);
			addPoint(mesh, values, slice,   (cut+1)%cuts, normals, slice, cut+1);
			addPoint(mesh, values, slice,   (cut+1)%cuts, normals, slice, cut+1);
			addPoint(mesh, values, slice+1, cut, normals);
			addPoint(mesh, values, slice+1, (cut+1)%cuts, normals, slice+1, cut+1);
		}	
	return mesh;
}


function Math2MeshTunnel(maths, slices, cuts, caps)
{
	var values = [];
	var normals = [];
	for (var slice = 0; slice < slices; slice++)
	{
		values.push([]);
		normals.push([]);
		for (var cut = 0; cut < cuts; cut++)
		{
			var phi = cut/cuts*Math.PI*2 - Math.PI;
			// takes an angle and t parameter [0,1] and returns a vertex
			var x = maths(slice/slices, phi);
			normals[slice][cut] = x;
			values[slice][cut] = x;
		}
	}
	
	
	var mesh = {};
	mesh.count = (slices - 1) * cuts * 2
	if (caps) mesh.count += cuts * 2;
	mesh.vertices = [];
	mesh.normals = [];
	mesh.uvs = [];
	for (var slice = 0; slice < slices - 1; slice++)
		for (var cut = 0; cut < cuts; cut++)
		{
			addPoint(mesh, values, slice,   cut, normals);
			addPoint(mesh, values, slice+1, cut, normals);
			addPoint(mesh, values, slice,   (cut+1)%cuts, normals, slice, cut+1);
			addPoint(mesh, values, slice,   (cut+1)%cuts, normals, slice, cut+1);
			addPoint(mesh, values, slice+1, cut, normals);
			addPoint(mesh, values, slice+1, (cut+1)%cuts, normals, slice+1, cut+1);
		}
	if (caps) {
		// add top and bottom caps
		// sort of doesnt work
		values.push([]);
		normals.push([]);
		values[slices][0] = values[0][0];
		values[slices][1] = VecScale(VecAdd(values[0][0], values[0][cuts/2]), 0.5);
		values[slices][2] = values[0][cuts/2];
		values[slices][3] = values[slices-1][0];
		values[slices][4] = VecScale(VecAdd(values[slices-1][0], values[slices-1][cuts/2]), 0.5);
		values[slices][5] = values[slices-1][cuts/2];
		for (var i = 0; i < 3; i++) normals[slices].push([0, -1, 0]);
		for (var i = 0; i < 3; i++) normals[slices].push([0, 1, 0]);
		
		for (var cut = 0; cut < cuts; cut++)
		{
			addPoint(mesh, values, slices, 1, normals, 0, cut+1);
			addPoint(mesh, values, 1, cut, normals);
			addPoint(mesh, values, 1, (cut+1)%cuts, normals, 1, cut+1);
			addPoint(mesh, values, slices-1, (cut+1)%cuts, normals, slices-1, cut+1);
			addPoint(mesh, values, slices-1, cut, normals);
			addPoint(mesh, values, slices, 4, normals, slices, cut+1);		
		}
	}
	
	return mesh;
}


function Math2MeshPath(path, cuts)
{
	var values = [];
	var normals = [];
	for (var i = 0; i < path.length; i++)
	{
		values.push([]);
		normals.push([]);
		if (i < path.length - 1) {
			for (var cut = 0; cut < cuts; cut++)
			{
				var phi = cut/cuts*Math.PI*2 - Math.PI;
				var vector = VecNormalize(VecSub(path[i+1].pos, path[i].pos));
				var angle = QuatFromVectors(VEC_UP, vector);
				angle = QuatNormalize(angle);
				var x = [Math.sin(phi), 0, Math.cos(phi)];
				normals[i][cut] = x;
				x = VecScale(x, path[i].radius);
				x = Mat4TransformPoint(x, Mat4Rotate(angle));
				values[i][cut] = VecAdd(x, path[i].pos);
			}
		} else {
			for (var cut = 0; cut < cuts; cut++)
			{
				values[i][cut] = path[i].pos;
				normals[i][cut] = VEC_UP;
			}
		}
	}
	
	var mesh = {};
	mesh.count = (path.length - 1) * cuts * 2
	mesh.vertices = [];
	mesh.normals = [];
	mesh.uvs = [];
	for (var slice = 0; slice < path.length - 1; slice++)
		for (var cut = 0; cut < cuts; cut++)
		{
			addPoint(mesh, values, slice,   cut, normals);
			addPoint(mesh, values, slice+1, cut, normals);
			addPoint(mesh, values, slice,   (cut+1)%cuts, normals, slice, cut+1);
			addPoint(mesh, values, slice,   (cut+1)%cuts, normals, slice, cut+1);
			addPoint(mesh, values, slice+1, cut, normals);
			addPoint(mesh, values, slice+1, (cut+1)%cuts, normals, slice+1, cut+1);
		}	
	return mesh;
}


//////////////////////////////////////////////////////
// PHYSICS
//////////////////////////////////////////////////////

// euler integration
function SimplePhysics(p, dt)
{
	// movement
	p.pos[0] += p.vel[0] * dt;
	p.pos[1] += p.vel[1] * dt;
	p.pos[2] += p.vel[2] * dt;
	
	// acceleration
	if (p.accl)
	{
		p.vel[0] += p.accl[0] * dt;
		p.vel[1] += p.accl[1] * dt;
		p.vel[2] += p.accl[2] * dt;
	}
	
	// drag
	if (p.drag)
	{
		p.vel[0] -= p.vel[0] * p.drag * dt;
		p.vel[1] -= p.vel[1] * p.drag * dt;
		p.vel[2] -= p.vel[2] * p.drag * dt;
	}
	
	// rotation
	if (p.rotv !== undefined)
	{
		p.rot += p.rotv * dt;
	}
	
	if (p.rota !== undefined)
	{
		p.rotv += p.rota * dt;
	}
}


//////////////////////////////////////////////////////
// MISC ENTITIES
//////////////////////////////////////////////////////

function FPSCounter() {
	var t = 0; var frames = 0;
	fps = {fps: 1, renderLast: true};
	
	fps.update = function (dt) {
		frames++; t += dt - 1/1000;
		if (t > 1) {
			fps.fps = Math.ceil(frames / t);
			t = 0;
			frames = 0;
		}
		
		fps.text = TextSprite(fps.fps + " fps", "white", "48px impact");
		fps.text.x = (canvas.width - fps.text.size.width);
		fps.text.y = canvas.height - 64;
	}
	
	fps.render = function (m) {
		if (fps.text) {
			fps.text.render(m);
		}
	}

	return fps;
}

// loading bar
function LoadingScreen() {
	var bar = {progress: 0.0};
	var mesh = BufferMesh(SQUARE_MESH);
	var texture = MakeTexture(function () {return [255, 255, 255, 255];}, 16);
	
	bar.setProgress = function (percent) {
		if (percent > 1) percent = 1;
		bar.progress = percent;
	}
	
	bar.render = function () 
	{
		// clear screen
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		
		var matrix;
		TEX_SHADER.enable(texture);
		OrthogonalProjection();
		gl.depthMask(false);
		
		TEX_SHADER.setColor(100,100,100);
		matrix = Mat4Scale(0.5, 0.15, 1);
		DrawMesh(mesh, Mat4List(matrix), TEX_SHADER);
		
		TEX_SHADER.setColor(0,0,0);
		matrix = Mat4Scale(0.475, 0.125, 1);
		DrawMesh(mesh, Mat4List(matrix), TEX_SHADER);
		
		if (bar.progress > 0) {
			TEX_SHADER.setColor(3,3,3);
			matrix = Mat4Scale(0.45 * bar.progress, 0.1, 1);
			matrix = Mat4Mult(Mat4Translate(1 - 1/bar.progress, 0, 0), matrix);
			DrawMesh(mesh, Mat4List(matrix), TEX_SHADER);
		}
		
		gl.depthMask(true);
		NormalProjection();
	}
	return bar;
}


function Camera(vector) {
	var cameraMtx = mat4.create();
	mat4.lookAt([0,0,0], vector, [0, 1, 0], cameraMtx);
	return {
		getMatrix: function ()
		{
			return cameraMtx;
		},
		
		setMatrix: function (pos, rotation)
		{
			cameraMtx = Mat4List(Mat4World(pos, rotation));
		},
		
		pos: [0, 0, 0],
		rot: QuatXYZ(0, 0, 0)
	};
}


// tracking camera
function TrackingCamera(target)
{
	var camera = {
		pos:	[0, 10, 0],
		rot:	QuatXYZ(),
		up:		[0, 1, 0],
		vel:	[0, 0, 0],
		accl:	[0, 0, 0],
		drag:	3.0,
		bounds: {min: [-1, -1, -1], max: [1, 1, 1]},
		vector: [0, 2, -8],
		target: [0, 0.5, 0],
		acceleration: 25,
		distance: 0.5
	};

	var tpos = [0, 0, 1];
	var ctpos = [0, 0, 0]
	
	camera.update = function (dt)
	{
		// target tracking
		if (target && target.pos)
		{
			tpos = VecAdd(target.pos, camera.target);
			
			ctpos = VecRotate(camera.vector, target.rot);
			ctpos = VecScale(ctpos, camera.distance);
			ctpos = VecAdd(ctpos, tpos);
		}
		
		if (VecLengthSqr(VecSub(ctpos, camera.pos)) > 200*200)
			camera.pos = VecCopy(ctpos);
		
		// camera acceleration
		camera.accl[0] = (ctpos[0] - camera.pos[0]) * camera.acceleration;
		camera.accl[1] = (ctpos[1] - camera.pos[1]) * camera.acceleration;
		camera.accl[2] = (ctpos[2] - camera.pos[2]) * camera.acceleration;
		
		var look = VecSub(tpos, camera.pos);
		camera.rot = QuatNormalize(QuatFromVectors(VEC_FORWARD, look));
		
		SimplePhysics(camera, dt);
		//collision(camera, bounds);
	};
	
	var cameraMtx = mat4.create();
	camera.getMatrix = function ()
	{
		mat4.lookAt(camera.pos, tpos, gCamera.up, cameraMtx);
		return cameraMtx;
	};

	return camera;
}

// first person camera
function FPSCamera() 
{
	var cameraMtx = Mat4List(Matrix4());
	var camera = {pos: [0, 0, 0], rot: QuatXYZ(0, 0, 0), offset: [0, 3, 0]};
	camera.getMatrix = function ()
	{
		return cameraMtx;
	};
	
	camera.set = function (pos, look) 
	{
		camera.pos = VecAdd(pos, camera.offset);
		camera.rot = look;
		cameraMtx = Mat4Translate(VecScale(camera.pos, -1));
		cameraMtx = Mat4Mult(cameraMtx, Mat4World(Vector3(), QuatInverse(camera.rot)));
		cameraMtx = Mat4List(cameraMtx);
	}
	
	camera.update = function (dt)
	{
	};
		
	return camera;
}


// team duck 4 lyfe
