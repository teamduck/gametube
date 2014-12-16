// tedge.js: 3D games in javascript
// v 0.01

var gl;
var shader;
var canvas;
var entities = [];

// input
var K_LEFT = false;
var K_RIGHT = false;
var K_UP = false;
var K_DOWN = false;
var K_SPACE = false;
var K_KONAMI = false;
var KONAMI_CODE = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65];

// graphics
var gCamera;
var gTextures = {};

var wMatrix = mat4.create();
var pMatrix = mat4.create();
var STD_SHADER;

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
	
	// init game stuffs
	gameInit();
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
			window.setTimeout(callback, 1000/10);
		};
})();

// startup
function initGL()
{
	// find the canvas
	canvas = document.getElementById("game");
	
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
	
	// load & compile shaders
	initShaders();
	
	// set up gl default state
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.enable(gl.DEPTH_TEST);
	
	// perspective
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);	
	mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.3, 200.0, pMatrix);
	gl.uniformMatrix4fv(STD_SHADER.pMatrix, false, pMatrix);
}

// render loop
function render()
{	
	// clear screen
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// set the camera
	gl.uniformMatrix4fv(STD_SHADER.vMatrix, false, gCamera.getMatrix());
	
	// render errything
	for (ent in entities)
	{	
		if (entities[ent].render)
		{
			//mat4.set(cameraMtx, mMatrix);		
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
	gl.bindTexture(gl.TEXTURE_2D, null);
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

function drawMesh(mesh, worldMtx, shader)
{
    if (shader === undefined) shader = STD_SHADER;
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
	gl.drawArrays(gl.TRIANGLES, 0, mesh.count * 3);
}

// SHADERS: //////////////////////////////////////////

var STD_FRAG_SHADER = "#ifdef GL_ES\n" +
                      "precision highp float;\n" +
                      "#endif\n" +
                      "//varying vec2  vTexCoord;\n" +
                      "//varying float vTexScale;\n" +
                      "//varying vec4  vColor;\n" +
                      "varying vec3 vLightingA;\n"+
                      "varying vec3 vLightingB;\n"+                      
                      "//uniform sampler2D uSampler;\n" +
                      "void main(void)\n" +
                      "{\n" +
                      "//gl_FragColor = texture2D(uSampler, vTexCoord * vTexScale) * vColor * vLighting;\n" +
//                      "gl_FragColor = vec4((dot(vLightingB, vec3(0.0, 1.0, 0.0))+1.0)/2.0 + max(dot(vLightingB, vec3(0.0, 1.0, 0.0))-1.5, 0.0));\n" +
                      //"gl_FragColor = vec4((dot(vLightingB, vec3(0.0, 1.0, 0.0))+1.0)/2.0 + max(dot(vLightingB, vec3(0.0, 1.0, 0.0))-1.5, 0.0));\n" +
                      "gl_FragColor = vec4(vec3(dot(normalize(vLightingA), normalize(vec3(1.0, 3.0, 2.0)))*0.3+0.5), 1.0);// * vLighting;\n" +
                      "gl_FragColor = gl_FragColor + vec4(vec3(max(dot(normalize(vLightingB), normalize(vec3(1.0, 3.0, 2.0)))*0.4 - 0.2, 0.0)), 1.0);\n" +
                      "}\n";

var STD_VERT_SHADER = "attribute vec3 aVertPos;\n" +
                      "attribute vec3 aVertNorm;\n" +
                      "//attribute vec2 aTexCoord;\n" +
                      "uniform mat4 uWMatrix;\n" +
                      "uniform mat4 uVMatrix;\n" +
                      "uniform mat4 uPMatrix;\n" +
                      "//uniform vec4  uColor;\n" +
                      "//uniform float uTexScale;\n" +
                      "//varying vec2  vTexCoord;\n" +
                      "//varying vec4  vColor;\n" +
                      "//varying float vTexScale;\n" +
                      "varying vec3 vLightingA;\n" +
                      "varying vec3 vLightingB;\n" +
                      "void main(void) {\n" +
    "gl_Position = uPMatrix * uVMatrix * uWMatrix * vec4(aVertPos, 1.0);\n" +
    "vLightingA  = vec3(uWMatrix * vec4(aVertNorm, 0.0));\n" +     
    "vLightingB  = vec3(uPMatrix * uVMatrix * uWMatrix * vec4(aVertNorm, 0.0));\n" +         
//                      "gl_Position = uWMatrix * vec4(aVertPos, 1.0);\n" +
//                      "gl_Position = uVMatrix * gl_Position;\n" +
//                      "gl_Position = uPMatrix * gl_Position;\n" +
                      "//vLighting   = normalize(aVertNorm);//(dot(vec3(0.0, 1.0, 0.0), aVertNorm) + 1.0)*0.5;\n" +
                      "//    vTexCoord   = aTexCoord;\n" +
                      "//    vColor      = uColor;\n" +
                      "//    vTexScale   = uTexScale;\n" +
                      "}\n";

function StandardShader()
{
    var fShader = gl.createShader(gl.FRAGMENT_SHADER);
    var vShader = gl.createShader(gl.VERTEX_SHADER);
    
    gl.shaderSource(fShader, STD_FRAG_SHADER);
    gl.compileShader(fShader);
	if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS))
	{
		alert(gl.getShaderInfoLog(fShader));
		return;
	}

    gl.shaderSource(vShader, STD_VERT_SHADER);
    gl.compileShader(vShader);
	if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS))
	{
		alert(gl.getShaderInfoLog(vShader));
		return;
	}
    
    var shader = gl.createProgram();
    gl.attachShader(shader, vShader);
    gl.attachShader(shader, fShader);
    gl.linkProgram(shader);
	if (!gl.getProgramParameter(shader, gl.LINK_STATUS))
	{
		alert("Errar: Could not initialize shader.");
        return;
	}
    
    gl.useProgram(shader);
    
    shader.vertPos = gl.getAttribLocation(shader, "aVertPos");
    gl.enableVertexAttribArray(shader.vertPos);
    shader.vertNorm = gl.getAttribLocation(shader, "aVertNorm");
    gl.enableVertexAttribArray(shader.vertNorm);    
	//shader.texCoord = gl.getAttribLocation(shader, "aTexCoord");
	//gl.enableVertexAttribArray(shader.texCoord);
	shader.wMatrix = gl.getUniformLocation(shader, "uWMatrix");	
	shader.vMatrix = gl.getUniformLocation(shader, "uVMatrix");	
	shader.pMatrix = gl.getUniformLocation(shader, "uPMatrix");
	//shader.color   = gl.getUniformLocation(shader, "uColor");
	//shader.texScale = gl.getUniformLocation(shader,"uTexScale");    
    
    //gl.uniform4f(shader.color, 1.0, 1.0, 1.0, 1.0);
    //gl.uniform1f(shader.texScale, 1.0);
    
    return shader;
}

// tank shader specific routines:
function initShaders()
{
    STD_SHADER = StandardShader();
}


//////////////////////////////////////////////////////
// INPUT
//////////////////////////////////////////////////////
var keysDown = {};
var lastKeys = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

var K_DOWN  = 40;
var K_RIGHT = 39;
var K_UP    = 38;
var K_LEFT  = 37;
var K_SPACE = 32;

function InputtingEntity(e, player)
{
    e.keyDown = function (key)
    {
        return (player == puid && (key in keysDown));
    }
    
    return e;
}

// input
function onKeyDown(evt) 
{
	if (!evt) evt = window.event;
	
    keysDown[evt.keyCode] = true;

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
	window.requestAnimFrame(gameLoop, canvas);
	render();

	lastT = curT;
	curT = new Date().getTime();
    var dt = (curT - lastT)/1000.0;
    
    if (dt > 1.0)
        dt = 1.0;
	
	update(dt);
    Physics(dt);
	//setTimeout(gameLoop, 0);
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
    
    BufferMesh(mesh);
    
    var e = PhysicalEntity({}, mesh, false);
    
    e.render = function(mtx)
    {
        mat4.set(Mat4List(e.matrix), mtx);
        drawMesh(e.mesh, mtx);
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
    
    e.render = function(mtx)
    {
        mat4.set(Mat4List(e.matrix), mtx);
        drawMesh(e.mesh, mtx);
    }
    
    return e;
}


/*
game entity:
	entity.update = function(dt) {};

graphical entity:
	entity.render = function(viewMtx) {};
	
physical entity:
	entity.pos = [];
	entity.vel = [];
	entity.accl = [];
	entity.bounds = [];
	entity.drag = [];
	// entity.collision = flags;
	// entity.onCollision = callback
	
net entity:
	


*/

//////////////////////////////////////////////////////
// PHYSICS
//////////////////////////////////////////////////////
/*
// AABB vs AABB collision detection
function checkCollision(e1, e2)
{
	if (!e1.pos || !e1.bounds || !e2.pos || !e2.bounds)
		return false;
		
	var b1 = {
		min: 	[e1.bounds.min[0] + e1.pos[0], 
				 e1.bounds.min[1] + e1.pos[1], 
				 e1.bounds.min[2] + e1.pos[2]],
		max: 	[e1.bounds.max[0] + e1.pos[0], 
				 e1.bounds.max[1] + e1.pos[1], 
				 e1.bounds.max[2] + e1.pos[2]]
	};

	var b2 = {
		min: 	[e2.bounds.min[0] + e2.pos[0], 
				 e2.bounds.min[1] + e2.pos[1], 
				 e2.bounds.min[2] + e2.pos[2]],
		max: 	[e2.bounds.max[0] + e2.pos[0], 
				 e2.bounds.max[1] + e2.pos[1], 
				 e2.bounds.max[2] + e2.pos[2]]
	};
	
	return (b1.max[0] > b2.min[0] &&
		b1.max[1] > b2.min[1] &&
		b1.max[2] > b2.min[2] &&
		b2.max[0] > b1.min[0] &&
		b2.max[1] > b1.min[1] &&
		b2.max[2] > b1.min[2]);
}

// AABB vs AABB collision correction
function collision(e, bounds)
{
	var hit = false;
	for (b in bounds)
	{
		if (bounds[b].min[0] - e.bounds.max[0] < e.pos[0] &&
			bounds[b].min[1] - e.bounds.max[1] < e.pos[1] &&
			bounds[b].min[2] - e.bounds.max[2] < e.pos[2] &&
			bounds[b].max[0] - e.bounds.min[0] > e.pos[0] &&
			bounds[b].max[1] - e.bounds.min[1] > e.pos[1] &&
			bounds[b].max[2] - e.bounds.min[2] > e.pos[2])
		{
			hit = true;
			
			// collision
			var dx = [];
			for (var i = 0; i < 3; i++)
			{
				dx.push(bounds[b].min[i] - e.bounds.max[i] - e.pos[i]);
				dx.push(bounds[b].max[i] - e.bounds.min[i] - e.pos[i]);
			}
			
			// find axis of smallest separation
			var min = Math.abs(dx[0]);
			var dim = 0;
			for (var i = 1; i < 6; i++)
			{
				if (Math.abs(dx[i]) < min)
				{
					min = Math.abs(dx[i]);
					dim = i;
				}
			}
			
			// correct position & velocity
			e.pos[Math.floor(dim/2)] += dx[dim];
			e.vel[Math.floor(dim/2)] = 0;
		}
	}
	
	return hit;
}
*/
// euler integration
function physics(p, dt)
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
// NET
//////////////////////////////////////////////////////



//////////////////////////////////////////////////////
// USEFUL ENTITIES
//////////////////////////////////////////////////////


// tracking camera
function createTrackingCamera(target)
{
	var camera = {
		pos:	[0, 10, 0],
		vel:	[0, 0, 0],
		accl:	[0, 0, 0],
		drag:	3.0,
		bounds: {min: [-1, -1, -1], max: [1, 1, 1]}
	};

	var tpos = [0, 0, 0];
	var ctpos = [0, 0, 0]
	
	camera.update = function (dt)
	{
		// target tracking
		if (target && target.pos)
		{
			tpos[0] = target.pos[0];
			tpos[1] = target.pos[1];
			tpos[2] = target.pos[2];
            
            ctpos = VecRotate(Vector3(0.0, 5.0, -10.0), target.rot);
            ctpos = VecAdd(ctpos, tpos);
				
            /*
			if (target.rot !== undefined)
			{
				// where the camera wants to be
				ctpos[0] = tpos[0] - Math.sin(target.rot-Math.PI/2.0) * 12.0;
				ctpos[1] = tpos[1] + 4.0;
				ctpos[2] = tpos[2] - Math.cos(target.rot-Math.PI/2.0) * 12.0;
				
				// where the camera wants to look
				tpos[0] += Math.sin(target.rot-Math.PI/2.0) * 4.0;
				tpos[1] += 1.0;
				tpos[2] += Math.cos(target.rot-Math.PI/2.0) * 4.0;
			}
            */
		}
		
		// camera acceleration
		camera.accl[0] = (ctpos[0] - camera.pos[0]) * 5.0;
		camera.accl[1] = (ctpos[1] - camera.pos[1]) * 5.0;
		camera.accl[2] = (ctpos[2] - camera.pos[2]) * 5.0;
		
		physics(camera, dt);
		//collision(camera, bounds);
	};
	
	var cameraMtx = mat4.create();	
	camera.getMatrix = function ()
	{
		mat4.lookAt(camera.pos, tpos, [0.0, 1.0, 0.0], cameraMtx);
		return cameraMtx;
	};

	return camera;
}

// team duck
