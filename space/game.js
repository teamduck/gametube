/* Space Explorer 
 * Greg Tourville
 * March 2013
 * --------------
 * Ideas:
 *  Gameplay
 *    - navigation / exploration
 *    - enemies
 *    - missions (delivery, giving rides, uh mining)
 *    - communication and diplomacy
 *    - storyline
 *    - puzzles
 *  Environment
 *    - asteroids
 *    - comets & shooting stars
 *    - nebulas
 *    - galaxies
 *    - worm holes
 *    - dust
 *  Planets
 *    - weather
 *    - vegetation
 *    - cities
 *    - hangars
 *  Enemies
 *    - space pirates
 *    - robots
 *  Particle effects
 *    - ship exhaust
 *    - weapons explosions
 *    - atmospheric entry
 *  Heads up display
 *    - speed
 *    - ship integrity
 *    - tracking targets
 *  Misc
 *    - cool effects
 *       * lorentz transformation
 *       * black hole distortions
 *       * doppler shift
 *       * environment or bump mapping
 *       * lens flare
 *   - physics
 *   - animation
*/

// Procedural models
var ship = function(phi, theta) 
{
	var t = sin(theta)*sin(3*phi);
	if (t < 0) t = t * -4.0 * (sin(phi) + 2.0);
	return 2.0/(abs(sin(1.5*theta)) + 0.5 + t);
};

var SHIP_MESH = Math2MeshSphere(ship, 10, 40);
var SPHERE_MESH = Math2MeshSphere(function (p,t) { return 1.0; }, 2, 4);
var SPHERE_MESH_QUALITY = Math2MeshSphere(function (p,t) { return 1.0; }, 20, 20);

TransformMesh(SHIP_MESH, Mat4World(Vector3(), QuatXYZ(3.14/2,0,0)));

// remove translation from matrix
function StaticMatrix(vMatrix)
{
	return [
		vMatrix[0], vMatrix[1], vMatrix[2],  vMatrix[3], 
		vMatrix[4], vMatrix[5], vMatrix[6],  vMatrix[7], 
		vMatrix[8], vMatrix[9], vMatrix[10], vMatrix[11], 
		0,          0,          0,           vMatrix[15]
	];
}

function MAX(a, b) {
	return a > b ? a : b;
}

// Entities
function HUD() 
{
	var NUM_CHARGES = 25;
	var TRAIL_LENGTH = 10;
	var RANGE = 50.0;
	var SPEED = 10.5;
	var ACCEL = 1.02;
	var h = {};
	
	var text = TextSprite("NET", "white", "32px lucida console", 100, 100);
	
	var meshVertices = gl.createBuffer();
	
	// initialize charges
	var particles = [];
	for (var i = 0; i < NUM_CHARGES; i++) 
	{
		var pos = [Math.random()*RANGE - RANGE/2.0,
			Math.random()*RANGE - RANGE/2.0,
			Math.random()*RANGE - RANGE/2.0];
		var vel = [Math.random()*SPEED - SPEED/2.0,
			Math.random()*SPEED - SPEED/2.0,
			Math.random()*SPEED - SPEED/2.0];
		particles.push([pos, [pos[0]+vel[0], pos[1]+vel[1], pos[2]+vel[2]]]);
	}
	
	
	// buffer trails
	var vertices;
	function buildLines() {
		vertices = [];
		for (var i in particles) {
			for (var j = 0; j < TRAIL_LENGTH; j++) {
				var k = j < particles[i].length ? j : particles[i].length - 1;
				vertices.push(particles[i][k][0]);
				vertices.push(particles[i][k][1]);
				vertices.push(particles[i][k][2]);
				if (j > 0 && j < TRAIL_LENGTH - 1) {
					vertices.push(particles[i][k][0]);
					vertices.push(particles[i][k][1]);
					vertices.push(particles[i][k][2]);
				}
			}
		}	
	}
	
	// update simulation
	h.update = function (dt) 
	{
		for (var i in particles) {
			var pos = particles[i][particles[i].length - 1];
			var dpos = particles[i][particles[i].length - 2];
			var vel = [pos[0] - dpos[0], pos[1] - dpos[1], pos[2] - dpos[2]];
			vel = [vel[0] - pos[0] * ACCEL * dt, vel[1] - pos[1] * ACCEL * dt, vel[2] - pos[2] * ACCEL * dt];
			pos = [pos[0] + vel[0], pos[1] + vel[1], pos[2] + vel[2]];
			particles[i].push(pos);
			if (particles[i].length > TRAIL_LENGTH) {
				particles[i] = particles[i].slice(1);
			}
		}
	}
	
	// draw orbits
	h.render = function (mtx)
	{
		// overlay on screen
		buildLines();
		gl.disable(gl.DEPTH_TEST);
		gl.bindBuffer(gl.ARRAY_BUFFER, meshVertices);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
		gl.vertexAttribPointer(STD_SHADER.vertPos, 3, gl.FLOAT, false, 0, 0);
		
		// blue
		var viewMtx = Mat4List(Mat4Mult(Mat4Scale(0.02), Mat4Translate([-4*canvas.width/canvas.height, 3.75, -10])));
		gl.uniformMatrix4fv(STD_SHADER.wMatrix, false, mtx);
		gl.uniformMatrix4fv(STD_SHADER.vMatrix, false, viewMtx);
		STD_SHADER.setColor(0.0, 0.0, 100.0, 1.0);
		gl.drawArrays(gl.LINES, 0, NUM_CHARGES * TRAIL_LENGTH);
		
		// red
		viewMtx = Mat4List(Mat4Mult(Mat4Scale(0.02), Mat4World([-4*canvas.width/canvas.height, 3.75, -10], QuatXYZ(0, 3.14, 0))));
		gl.uniformMatrix4fv(STD_SHADER.wMatrix, false, mtx);
		gl.uniformMatrix4fv(STD_SHADER.vMatrix, false, viewMtx);
		STD_SHADER.setColor(100.0, 0.0, 0.0, 1.0);
		gl.drawArrays(gl.LINES, 0, NUM_CHARGES * TRAIL_LENGTH);
		
		// reset view matrix
		gl.uniformMatrix4fv(STD_SHADER.vMatrix, false, vMatrix);
		
		gl.enable(gl.DEPTH_TEST);
		
		text.x = canvas.width/12;
		text.y = canvas.height/9;
		text.render();
	}
	
	return h;
}

function Planets()
{
	var p = {};
	var mesh = BufferMesh(SPHERE_MESH_QUALITY);
	var theta = 0;
	p.planets = [];
	p.sizes = [];
	p.color = [];
	
	for (var i = 0; i < 10; i++)
	{
		p.planets.push([Math.random()*500.0 - 250,
					Math.random()*500.0 - 250,
					Math.random()*500.0 - 250]);
		p.sizes.push(Math.random() * 40.0);
		p.color.push(Math.random());
	}
	
	p.update = function (dt) 
	{
		theta += dt;
	}
	
	p.render = function (mtx)
	{
		var expandedViewMatrix = [
			vMatrix[0], vMatrix[1], vMatrix[2],  vMatrix[3], 
			vMatrix[4], vMatrix[5], vMatrix[6],  vMatrix[7], 
			vMatrix[8], vMatrix[9], vMatrix[10], vMatrix[11], 
			vMatrix[12]*0.1, vMatrix[13]*0.1, vMatrix[14]*0.1, vMatrix[15]];
		
		gl.uniformMatrix4fv(STD_SHADER.vMatrix, false, expandedViewMatrix);
		
		for (var j in p.planets)
		{
			// planet
			STD_SHADER.setColor(0.0, p.color[j], 1 - p.color[j], 1.0);
			var p_matrix = Mat4Mult(Mat4Scale(p.sizes[j]), Mat4Translate(p.planets[j]));
			mat4.set(Mat4List(p_matrix), mtx);
			DrawMesh(mesh, mtx, STD_SHADER);
			
			// moon
			STD_SHADER.setColor(0.7, 0.7, 0.7, 1.0);
			var p_matrix = Matrix4();
			p_matrix = Mat4Mult(p_matrix, Mat4Translate([p.sizes[j]*2.5, 0, 0]));			
			p_matrix = Mat4Mult(p_matrix, Mat4World([0, 0, 0], QuatXYZ(0, theta, 0)));
			p_matrix = Mat4Mult(p_matrix, Mat4Translate(p.planets[j]));
			mat4.set(Mat4List(p_matrix), mtx);
			DrawMesh(mesh, mtx, STD_SHADER);			
		}
		
		gl.uniformMatrix4fv(STD_SHADER.vMatrix, false, vMatrix);
	};
	
	return p;
}

function Space()
{
	var s = {};
	var NUM_STARS = 1000;
	var mesh = BufferMesh(SPHERE_MESH);
	
	// create background buffer
	var starBuffer = gl.createBuffer();
	var vertices = [];
	var starCoords = [];
	var starCount;
	for (var i = 0; i < NUM_STARS; i++)
	{
		var pos = [Math.random()*500.0 - 250,
					Math.random()*500.0 - 250,
					Math.random()*500.0 - 250];
		pos = VecScale(VecNormalize(pos), 400);
		starCoords.push(pos);
		var mtx = Mat4Translate(pos);
		vertices = vertices.concat(Mat4TransformPoints(SPHERE_MESH.vertices, mtx));
	}
	gl.bindBuffer(gl.ARRAY_BUFFER, starBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	starCount = vertices.length / 3;
	vertices = [];
	
	// create constellation buffer
	var constellations = [];
	var constellationBuffer = gl.createBuffer();
	var constellationCount;
	for (var i = 0; i < starCoords.length/2; i++) {
		var closest; var distance = -1; var dist;
		for (var j = 0; j < starCoords.length; j++) {
			dist = VecLengthSqr(VecSub(starCoords[i],starCoords[j]));
			if (i != j && (distance < 0 || dist < distance)) {
				distance = dist;
				closest = j;
			}
		}
		constellations.push(starCoords[i][0]);
		constellations.push(starCoords[i][1]);
		constellations.push(starCoords[i][2]);
		constellations.push(starCoords[closest][0]);
		constellations.push(starCoords[closest][1]);
		constellations.push(starCoords[closest][2]);
	}
	gl.bindBuffer(gl.ARRAY_BUFFER, constellationBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(constellations), gl.STATIC_DRAW);
	constellationCount = constellations.length / 3;
	constellations = [];
	
	s.render = function (mtx)
	{
		// stars are very far away, so remove view matrix translation
		var staticViewMatrix = StaticMatrix(vMatrix);
		gl.uniformMatrix4fv(STD_SHADER.vMatrix, false, staticViewMatrix);
		gl.uniformMatrix4fv(STD_SHADER.wMatrix, false, Mat4List(Matrix4()));
		
		STD_SHADER.setColor(10,10,10,10);
		
		// draw star buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, starBuffer);
		gl.vertexAttribPointer(STD_SHADER.vertPos, 3, gl.FLOAT, false, 0, 0);
		gl.drawArrays(gl.TRIANGLES, 0, starCount);
		
		// draw constellations
		gl.bindBuffer(gl.ARRAY_BUFFER, constellationBuffer);
		gl.vertexAttribPointer(STD_SHADER.vertPos, 3, gl.FLOAT, false, 0, 0);
		gl.drawArrays(gl.LINES, 0, constellationCount);
				
		// reset view matrix
		gl.uniformMatrix4fv(STD_SHADER.vMatrix, false, vMatrix);
	};

	return s;
}

function Player(puid)
{
	var p = DynamicEntity(SHIP_MESH, Mat4Scale(0.1));
	InputtingEntity(p, puid);
	
	p.pos = [0.0, 12.0, -105.0];
	p.vel = [0.0, 0.0, 0.0];
	p.friction = 0.125;
	
	p.update = function (dt)
	{
		p.force = VecRotate(VecScale(VEC_FORWARD, 0.0), p.rot);
		p.rotVel = Quat();
		
		if (p.keyDown(K_UP)) p.rotVel = QuatXYZ(1.0, 0.0, 0.0);
		if (p.keyDown(K_DOWN)) p.rotVel = QuatXYZ(-1.0, 0.0, 0.0);
		if (p.keyDown(K_LEFT)) p.rotVel = QuatXYZ(0.0, 1.0, 0.0);
		if (p.keyDown(K_RIGHT)) p.rotVel = QuatXYZ(0.0, -1.0, 0.0);
		if (p.keyDown(K_SPACE))
		{
			p.force = VecAdd(p.force, VecRotate(VecScale(VEC_FORWARD, 100.0), p.rot));
		}
	}
	
	var meshRender = p.render;
	p.render = function (mtx)
	{
		// render ship
		p.shader.setColor(0.8, 0.8, 0.8);
		meshRender(mtx);
		
		// render particle cloud
		p.shader.setColor(10,10,10,1);
		for (var i = 0; i < 40; i++) {
			var pos = [(i%7)*137, (i%5)*523, (i%11)*307];
			pos = VecScale(pos, 0.02);
			pos = VecAdd(pos, VecScale(p.pos, -0.02));
			pos = [pos[0] - Math.floor(pos[0]) - 0.5,
				pos[1] - Math.floor(pos[1]) - 0.5,
				pos[2] - Math.floor(pos[2]) - 0.5];
			pos = VecScale(pos, 50);
			pos = VecAdd(pos, p.pos);
			DrawMesh(SPHERE_MESH, Mat4List(Mat4Mult(Mat4Scale(0.1),Mat4Translate(pos))));
		}
	}
	
	return p;
}

function TextureTest() {
	var t = {};
	var mesh = BufferMesh(BOX_MESH);
	var theta = 0;
	var bitmap = context.createImageData(128, 128);
	var texture = gl.createTexture();
	
	// create image
	for (var y = 0; y < 128; y++) {
		for (var x = 0; x < 128; x++) {
			bitmap.data[4*(x+y*128)+0] = x;
			bitmap.data[4*(x+y*128)+1] = y;
			bitmap.data[4*(x+y*128)+2] = (x*y)%256;
			bitmap.data[4*(x+y*128)+3] = 255;
		}
	}
	
	// store in vram
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, bitmap);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.bindTexture(gl.TEXTURE_2D, null);
	
	t.update = function (dt) 
	{
		theta += dt;
	}
	
	t.render = function (mtx) 
	{
		// set up texture shader
		TEX_SHADER.enable();
		gl.uniformMatrix4fv(TEX_SHADER.pMatrix, false, pMatrix);
		gl.uniformMatrix4fv(TEX_SHADER.vMatrix, false, Mat4List(Matrix4()));
		
		// bind texture
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, box.textures[Math.floor(theta)%6]);
		gl.uniform1i(TEX_SHADER.samplerUniform, 0);
		
		// rotating cube in the middle of the screen
		var mtx = Mat4Translate([-0.5, -0.5, -0.5]);
		mtx = Mat4Mult(mtx, Mat4World([0, 0, 0], QuatXYZ(0, theta, -theta)));
		mtx = Mat4Mult(mtx, Mat4Scale(0.5));
		mtx = Mat4Mult(mtx, Mat4Translate([1.5*canvas.width/canvas.height, 1.5, -4]));
		DrawMesh(mesh, Mat4List(mtx), TEX_SHADER);
		
		// draw
		gl.uniformMatrix4fv(TEX_SHADER.vMatrix, false, vMatrix);
		TEX_SHADER.disable();
		STD_SHADER.enable();
	}
	
	return t;
}

function FractalImaging() {
	var f = {};
	var mesh = BufferMesh(SQUARE_MESH);
	var theta = 0;
	var WIDTH = 512;
	var HEIGHT = 512;
	var bitmap = context.createImageData(WIDTH, HEIGHT);
	var textures = [];
	
	var lambda = [[-0.73, 0.5]];
	
	// image series
	function Z3 (lambda) {
		for (var y = 0; y < WIDTH; y++) {
			for (var x = 0; x < HEIGHT; x++) {
				var c = 2.5*x/WIDTH - 1.25;
				var d = 2.5*y/HEIGHT - 1.25;
				var a = c; var b = d; var k;
				for (k = 0; k < 25; k++) {
					if (a*a + b*b > WIDTH*WIDTH*HEIGHT*HEIGHT) break;
					var aa = a; var bb = b;
					a = aa*aa*aa - aa*bb*bb - 2*aa*bb*bb + lambda[0];
					b = bb*bb*bb - 2*aa*aa*bb - aa*aa*bb + lambda[1];
				}
				bitmap.data[4*(x+y*WIDTH)+0] = MAX(k*k - 100, 10) - bitmap.data[0];
				bitmap.data[4*(x+y*WIDTH)+1] = MAX(k*k - 100, 10) - bitmap.data[1];
				bitmap.data[4*(x+y*WIDTH)+2] = MAX(k*k - 100, 10) - bitmap.data[2];
				bitmap.data[4*(x+y*WIDTH)+3] = 255;
			}
		}
	}
	
	// store in vram
	for (var i = 0; i < lambda.length; i++) {
		var texture = gl.createTexture();
		Z3(lambda[i]);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		textures.push(texture);
	}
	
	gl.bindTexture(gl.TEXTURE_2D, null);
	
	f.update = function (dt) 
	{
		theta += dt * -0.01;
	}
	
	f.render = function (mtx) 
	{
		// set up texture shader
		TEX_SHADER.enable();
		gl.uniformMatrix4fv(TEX_SHADER.pMatrix, false, pMatrix);
		gl.uniformMatrix4fv(TEX_SHADER.vMatrix, false, StaticMatrix(vMatrix));
				
		// floating particle board
		var mtx = Mat4Translate([0, 0, -2]);
		mtx = Mat4Mult(mtx, Mat4World([0,0,0], QuatXYZ(0,0,theta)));
		mtx = Mat4Mult(mtx, Mat4World([0,0,0], QuatXYZ(0,3.14,0)));		
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
		gl.depthMask(false);
		for (var t in textures) {
			// bind texture
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, textures[t]);
			gl.uniform1i(TEX_SHADER.samplerUniform, 0);
			DrawMesh(mesh, Mat4List(mtx), TEX_SHADER);
		}
		gl.depthMask(true);
		gl.disable(gl.BLEND);
		
		// draw
		gl.uniformMatrix4fv(TEX_SHADER.vMatrix, false, vMatrix);
		TEX_SHADER.disable();
		STD_SHADER.enable();
	}
	
	return f;
}

function SpaceBox() {
	var s = {};
	var mesh = BufferMesh(SQUARE_MESH);
	var theta = 0;
	var WIDTH = 512;
	var HEIGHT = 512;
	var bitmap = context.createImageData(WIDTH, HEIGHT);
	s.textures = [];
	
	// image series
	function generatingFunction(face) {
		var rot = [0,0,0,0,3.1416/2,0,0,3.1416,0,0,-3.1416/2,0,3.1416/2,0,0,-3.1416/2,0,0];
		var matrix = Mat4World([0,0,0], QuatXYZ(rot[face*3],rot[face*3+1],rot[face*3+2]));
		
		var for_vectors = [[0,0,-1], [1,0,0], [0,0,1], [-1,0,0], [0,-1,0], [0,1,0]];
		var right_vectors = [[-1,0,0], [0,0,-1], [1,0,0], [0,0,1], [-1,0,0], [-1,0,0]];
		
		var forward = for_vectors[face];
		var right = right_vectors[face];
		var up = VecCross(forward, right);
		//var forward = Mat4TransformPoints(VEC_FORWARD, matrix);
		//var up = Mat4TransformPoints(VEC_UP, matrix);
		//var right = Mat4TransformPoints(VEC_RIGHT, matrix);
		//debugger;
		for (var y = 0; y < HEIGHT; y++) {
			for (var x = 0; x < WIDTH; x++) {
				var color;
				var vec = VecAdd(VecScale(right, 2*(x+0.5)/WIDTH - 1),
								VecScale(up, 2*(y+0.5)/HEIGHT - 1));
				vec = VecAdd(vec, forward);
				var angle = Math.atan2(vec[0], vec[2]) / Math.PI;
				vec = VecNormalize(vec);
				
				// space colors
				color = VecScale(VecMult(vec, vec), 128);
				//color = [MAX(vec[0], 0), MAX(vec[1], 0), MAX(vec[2], 0)];
				//color = VecScale(vec, 128);
				
				// navigation markers
				color = VecAdd(color, [0, 0, 10000 * MAX(Math.sin(vec[1] * 25 - 1) - 0.98, 0)]);
				color = VecAdd(color, [0, 0, 10000 * MAX(Math.sin(angle * 50) - 0.98, 0)]);
				
				bitmap.data[4*(x+y*WIDTH)+0] = color[0];
				bitmap.data[4*(x+y*WIDTH)+1] = color[1];
				bitmap.data[4*(x+y*WIDTH)+2] = color[2];
				bitmap.data[4*(x+y*WIDTH)+3] = 255;
			}
		}
	}
	
	// store in vram
	for (var f = 0; f < 6; f++) {
		var texture = gl.createTexture();
		generatingFunction(f);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, bitmap);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		s.textures.push(texture);
	}
	
	gl.bindTexture(gl.TEXTURE_2D, null);
	
	s.render = function (mtx) 
	{
		// set up texture shader
		TEX_SHADER.enable();
		gl.uniformMatrix4fv(TEX_SHADER.pMatrix, false, pMatrix);
		gl.uniformMatrix4fv(TEX_SHADER.vMatrix, false, StaticMatrix(vMatrix));
				
		// render six sides
		var mtx = Mat4Translate([0, 0, -1]);
		//gl.enable(gl.BLEND);
		gl.depthMask(false);
		gl.disable(gl.DEPTH_TEST);
		gl.activeTexture(gl.TEXTURE0);
		gl.uniform1i(TEX_SHADER.samplerUniform, 0);
		
		// four walls
		for (var f = 0; f < 4; f++) {
			gl.bindTexture(gl.TEXTURE_2D, s.textures[f]);
			DrawMesh(mesh, Mat4List(mtx), TEX_SHADER);
			mtx = Mat4Mult(mtx, Mat4World([0,0,0], QuatXYZ(0,3.1416/2,0)));
		}
		
		// ceiling
		var mtx = Mat4Translate([0, 0, -1]);
		mtx = Mat4Mult(mtx, Mat4World([0,0,0], QuatXYZ(3.1416/2, 0, 0)));
		gl.bindTexture(gl.TEXTURE_2D, s.textures[4]);
		DrawMesh(mesh, Mat4List(mtx), TEX_SHADER);
		
		// floor
		var mtx = Mat4Translate([0, 0, -1]);
		mtx = Mat4Mult(mtx, Mat4World([0,0,0], QuatXYZ(-3.1416/2, 0, 0)));
		gl.bindTexture(gl.TEXTURE_2D, s.textures[5]);
		DrawMesh(mesh, Mat4List(mtx), TEX_SHADER);
		
		gl.enable(gl.DEPTH_TEST);
		gl.depthMask(true);
		//gl.disable(gl.BLEND);
		
		// draw
		gl.uniformMatrix4fv(TEX_SHADER.vMatrix, false, vMatrix);
		TEX_SHADER.disable();
		STD_SHADER.enable();
	}
	
	return s;
}


function gameInit()
{
	puid = connect();
	
	// receive / create game data
	box = receive(SpaceBox);
	ifs = receive(FractalImaging);	
	planets = receive(Planets);
	space = receive(Space);
	players = receiveAll(Player);
	display = receive(HUD);
	test = receive(TextureTest);
	
	player = receiveNew(Player, puid);
	gCamera = receiveNew(TrackingCamera, player);
	gCamera.pos = VecAdd(player.pos, VecScale(VEC_FORWARD, -2.5));
	
	// hand over control to tedge / tedge server enterprise
	startGame();
}
