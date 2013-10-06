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
//var SPHERE_MESH = Math2MeshSphere(function (p,t) { return 1; }, 2, 4);
var SPHERE_MESH = Math2MeshSphere(function (p,t) { return 1.0; }, 32, 32);

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
	StoreTexture(texture, bitmap);
	
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
		gl.bindTexture(gl.TEXTURE_2D, texture);
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
		StoreTexture(texture, bitmap);
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

// inputs [0, 1], [0, 1]
// 0..255
function NoiseSampler(seed, depth, scale)
{
	var primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41];
	var p1, p2, p3;
	var j = 13; var k = seed;
	j = (2*j + k)%256;
	k = (k*primes[j%primes.length] + k)%256;
	p1 = j + k;
	j = (3*j + k + seed)%256;
	k = (k*primes[j%primes.length] + k)%256;
	p2 = j + k;
	j = (5*j + k + 1)%256;
	k = (k*primes[j%primes.length] + k)%256;
	p3 = j + k;
	
	if (scale === undefined) scale = 1;
	
	function noise(x, y) {
		var r1 = 1 + x*y + x*p1 + y*p1 + p1*p1 + y;
		var r2 = r1 + (r1%p2) * (x + x*p2 + y*p2 + p2*p2);
		var r3 = r2 + (r2%p3) * (p2 + x*p3 + y*p3 + p3*p3);
		return r3%256;
	}
	
	var buffer = [];
	for (var y = 0; y < 512; y++) {
		for (var x = 0; x < 512; x++) {
			buffer.push(noise(x,y));
		}
	}
	
	function discrete(x, y) {
		x = x%(512); y = y%512;
		return buffer[y*512 + x];
	}
		
	function smooth(x,y) {
		var s = 0;
		var dx = x - Math.floor(x);
		var dy = y - Math.floor(y);
		x -= dx; y -= dy;	
		
		s = (discrete(x,y) * (1 - dx) * (1 - dy)
				+ discrete(x+1, y) * dx * (1 - dy)
				+ discrete(x, y+1) * (1 - dx) * dy
				+ discrete(x+1, y+1) * dx * dy);
						
		return s;
	};
	
	return function (x, y, depthFactor) {
		var h = 0; var r = 1; if (depthFactor === undefined) depthFactor = depth;
		x *= scale; y *= scale;
		for (var i = depthFactor; i; i--) {
			h += smooth(x*i*i, y*i*i);
			h /= 2;
			r *= 2;
		}
		h += 1.0/r;
		return Math.floor(h);
	}
}

function FluidSim() {
	var f = {};
	var mesh = BufferMesh(SQUARE_MESH);
	var t = 0;
	var SIZE = 128;
	var framerate = 1.0/15;
	var WIDTH = SIZE; var HEIGHT = SIZE;
	var bitmap = context.createImageData(WIDTH, HEIGHT);
	var texture = gl.createTexture();
	
	var sampler = NoiseSampler(4, 3, 0.1);
	var sampler2 = NoiseSampler(100, 1, 1);
	var sampler3 = NoiseSampler(333, 1, 1);
	
	var density = []; var buffer = [];
	var vel = {x: [], y: []}; var vel_buffer = {x: [], y: []};
	
	// initialize buffers
	for (var x = 0; x < WIDTH; x++) {
		density.push([]); buffer.push([]);
		vel.x.push([]); vel.y.push([]);
		vel_buffer.x.push([]); vel_buffer.y.push([]);
		for (var y = 0; y < HEIGHT; y++) {
			density[x].push(sampler(x,y));
			buffer[x].push(0);
			var vx = Math.random()*2 - 1; vx = 32 * vx * vx * vx - (y/HEIGHT - 0.5)*12;
			var vy = Math.random()*2 - 1; vy = 32 * vy * vy * vy + (x/WIDTH - 0.5)*12;
			vel.x[x].push(vx);
			vel.y[x].push(vy);
			//vel.x[x].push((sampler2(x,y)-128+8)*0.1);
			//vel.y[x].push((sampler3(x,y)-128+8)*0.1);
			vel_buffer.x[x].push(0);
			vel_buffer.y[x].push(0);
		}
	}
	
	var swap;
	function SwapBuffers() {
		swap = density;
		density = buffer;
		buffer = swap;
		swap = vel;
		vel = vel_buffer;
		vel_buffer = swap;
	}
	
	
	// diffusion
	var diff = 0.5;
	var inv_diff = 1 - diff;
	function Diffusion() {
		var dir_x = [-1, 0, 1, 0];
		var dir_y = [-1, 0, 1, 0];
		for (var x = 1; x < WIDTH-1; x++) {
			for (var y = 1; y < HEIGHT-1; y++) {
				buffer[x][y] = density[x][y] * inv_diff;
				vel_buffer.x[x][y] = vel.x[x][y] * inv_diff;
				vel_buffer.y[x][y] = vel.y[x][y] * inv_diff;
				// average with neighbor cells
				for (var d = 0; d < 4; d++) {
					var nx = x + dir_x[d];
					var ny = y + dir_y[d];
					buffer[x][y] += density[nx][ny] * diff * 0.25;
					vel_buffer.x[x][y] += vel.x[nx][ny] * diff * 0.25;
					vel_buffer.y[x][y] += vel.y[nx][ny] * diff * 0.25;
				}
			}
		}
		SwapBuffers();
	}
	
	// convection
	var tf = 0.5;
	var itf = 1 - tf;
	function Convection() {
		for (var x = 1; x < WIDTH-1; x++) {
			for (var y = 1; y < HEIGHT-1; y++) {
				var dx = Math.floor(vel.x[x][y]+0.5);
				var dy = Math.floor(vel.y[x][y]+0.5);
				var nx = x + dx;
				var ny = y + dy;
				// clamp
				if (ny >= 0 && ny < HEIGHT && nx >= 0 && nx < WIDTH) {
					buffer[x][y] = density[nx][ny] * tf
						+ density[x][y] * itf;
					var wf = (density[x][y]/256.0) * tf;
					vel_buffer.x[x][y] = vel.x[nx][ny] * wf
						+ vel.x[x][y] * (1 - wf);
					vel_buffer.y[x][y] = vel.y[nx][ny] * wf
						+ vel.y[x][y] * (1 - wf);
				}
			}
		}
		SwapBuffers();
	}
	
	// shading
	function Redraw() {
		// image series
		for (var y = 0; y < HEIGHT; y++) {
			for (var x = 0; x < WIDTH; x++) {
				var g = density[x][y];//vel.x[x][y]*16 + 128;
				//bitmap.data[4*(x+y*WIDTH)+0] = vel.x[x][y]*8 + 128;
				//bitmap.data[4*(x+y*WIDTH)+1] = vel.y[x][y]*8 + 128;
				bitmap.data[4*(x+y*WIDTH)+0] = g*2;
				bitmap.data[4*(x+y*WIDTH)+1] = g*2;
				bitmap.data[4*(x+y*WIDTH)+2] = g*2;
				bitmap.data[4*(x+y*WIDTH)+3] = 255;
			}
		}	
		// store in vram
		StoreTexture(texture, bitmap);
	}
	
	Diffusion();
	Redraw();
	
	f.update = function (dt) 
	{
		t += dt;
		if (t > framerate)
		{
			Convection();
			Diffusion();
			Redraw();
			
			t -= framerate;
		}
	}
	
	f.render = function (mtx) 
	{
		// set up texture shader
		TEX_SHADER.enable();
		gl.uniformMatrix4fv(TEX_SHADER.pMatrix, false, pMatrix);
		gl.uniformMatrix4fv(TEX_SHADER.vMatrix, false, StaticMatrix(vMatrix));
				
		// sprite
		var mtx = Mat4Translate([0, -1.5, 6]);
		// bind texture
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.uniform1i(TEX_SHADER.samplerUniform, 0);
		DrawMesh(mesh, Mat4List(mtx), TEX_SHADER);
		
		// draw
		gl.uniformMatrix4fv(TEX_SHADER.vMatrix, false, vMatrix);
		TEX_SHADER.disable();
		STD_SHADER.enable();
	}
	
	return f;
}



function SphereMap() {
	var s = {};
	var mesh = BufferMesh(SPHERE_MESH);
	var t = 0;
	var SIZE = 512;
	var WIDTH = SIZE;
	var HEIGHT = SIZE;
	var bitmap = context.createImageData(WIDTH, HEIGHT);
	var texture = gl.createTexture();
	
	var seed = 123;
	var depth = 5;
	var sampler = NoiseSampler(seed, depth, 0.1);
	
	function redraw() {
		// image series
		for (var y = 0; y < HEIGHT; y++) {
			for (var x = 0; x < WIDTH; x++) {
				// map uv to phi and theta
				// change phi and theta to XYZ
				// convert XYZ to box textures
				// presto
				var t = x/WIDTH*Math.sin(y/HEIGHT*2*Math.PI);
				var s = x/WIDTH*Math.cos(y/HEIGHT*2*Math.PI);
				var value = Math.sin(s*100) * Math.cos(t*100) * 128 + 128;//sampler(s,t);
				bitmap.data[4*(x+y*WIDTH)+0] = value;
				bitmap.data[4*(x+y*WIDTH)+1] = value;
				bitmap.data[4*(x+y*WIDTH)+2] = value;
				bitmap.data[4*(x+y*WIDTH)+3] = 255;
			}
		}	
		// store in vram
		StoreTexture(texture, bitmap);
	}
	

	redraw();

	
	s.update = function (dt) 
	{
		t += dt;
	}
	
	s.render = function (mtx) 
	{
		// set up texture shader
		TEX_SHADER.enable();
		gl.uniformMatrix4fv(TEX_SHADER.pMatrix, false, pMatrix);
		gl.uniformMatrix4fv(TEX_SHADER.vMatrix, false, StaticMatrix(vMatrix));
				
		// sprite
		var mtx = Mat4World([4, 1, 10], QuatXYZ(0,t,0));
		// bind texture
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.uniform1i(TEX_SHADER.samplerUniform, 0);
		DrawMesh(mesh, Mat4List(mtx), TEX_SHADER);
		
		// draw
		gl.uniformMatrix4fv(TEX_SHADER.vMatrix, false, vMatrix);
		TEX_SHADER.disable();
		STD_SHADER.enable();
	}
	
	return s;
}



function HeightMap() {
	var h = {};
	var t = 0;
	var SIZE = 64;
	var WIDTH = SIZE;
	var HEIGHT = SIZE;
	var bitmap = context.createImageData(WIDTH, HEIGHT);
	var texture = gl.createTexture();
	
	var seed = 1;
	var depth = 5;
	var sampler = NoiseSampler(seed, depth, 0.125);
	
	var heightMap = Math2Mesh(function (x,y) { return (sampler(x+2,y+2)-sampler(0.5,0.5))/50; }, [-1,1], [-1,1], 32);
	var mesh = BufferMesh(heightMap);
	
	function redraw() {
		// image series
		for (var y = 0; y < HEIGHT; y++) {
			for (var x = 0; x < WIDTH; x++) {
				bitmap.data[4*(x+y*WIDTH)+0] = sampler(x,y);
				bitmap.data[4*(x+y*WIDTH)+1] = sampler(x+13, y+3);
				bitmap.data[4*(x+y*WIDTH)+2] = sampler(x+27, y+5);
				bitmap.data[4*(x+y*WIDTH)+3] = 255;
			}
		}	
		// store in vram
		StoreTexture(texture, bitmap);
	}
	

	redraw();

	
	h.update = function (dt) 
	{
		t += dt;
	}
	
	h.render = function (mtx) 
	{
		// sprite
		var mtx = Mat4World([0, 0.5, 6], QuatXYZ(-0.5,t,0));	
	
		// set up texture shader
		TEX_SHADER.enable();
		gl.uniformMatrix4fv(TEX_SHADER.pMatrix, false, pMatrix);
		gl.uniformMatrix4fv(TEX_SHADER.vMatrix, false, StaticMatrix(vMatrix));

		// bind texture
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.uniform1i(TEX_SHADER.samplerUniform, 0);
		DrawMesh(mesh, Mat4List(mtx), TEX_SHADER);
		
		// draw
		gl.uniformMatrix4fv(TEX_SHADER.vMatrix, false, vMatrix);
		TEX_SHADER.disable();
		STD_SHADER.enable();
	}
	
	return h;
}

function Spheroid() {
	var s = {};
	var t = 0;
	var SIZE = 64;
	var WIDTH = SIZE;
	var HEIGHT = SIZE;
	var bitmap = context.createImageData(WIDTH, HEIGHT);
	var texture = gl.createTexture();
	
	var seed = 0;
	var depth = 3;
	var sampler = NoiseSampler(seed, depth, 10);
	
	var spheroid = Math2MeshSphere(function (x,y) { 
		return sampler(x+Math.PI,y+Math.PI)/128;
	}, 32, 32);
	var mesh = BufferMesh(spheroid);
	
	function redraw() {
		// image series
		for (var y = 0; y < HEIGHT; y++) {
			for (var x = 0; x < WIDTH; x++) {
				var value = sampler(x+Math.PI, y+Math.PI);
				bitmap.data[4*(x+y*WIDTH)+0] = value;
				bitmap.data[4*(x+y*WIDTH)+1] = value;
				bitmap.data[4*(x+y*WIDTH)+2] = value;
				bitmap.data[4*(x+y*WIDTH)+3] = 255;
			}
		}	
		// store in vram
		StoreTexture(texture, bitmap);
	}
	
	redraw();
	
	s.update = function (dt) 
	{
		t += dt;
	}
	
	s.render = function (mtx) 
	{
		// sprite
		var mtx = Mat4World([-4, 1, 10], QuatXYZ(-0.2,-t,0));	
	
		// set up texture shader
		TEX_SHADER.enable();
		gl.uniformMatrix4fv(TEX_SHADER.pMatrix, false, pMatrix);
		gl.uniformMatrix4fv(TEX_SHADER.vMatrix, false, StaticMatrix(vMatrix));

		// bind texture
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.uniform1i(TEX_SHADER.samplerUniform, 0);
		DrawMesh(mesh, Mat4List(mtx), TEX_SHADER);
		
		// draw
		gl.uniformMatrix4fv(TEX_SHADER.vMatrix, false, vMatrix);
		TEX_SHADER.disable();
		STD_SHADER.enable();
	}
	
	return s;
}

function RainbowTunnel() 
{
	var r = {};
	var WIDTH = 64; var HEIGHT = 64;
	var bitmap = context.createImageData(WIDTH, HEIGHT);
	var texture = gl.createTexture();
	
	function path(t) {
		return [Math.sin(t*8*Math.PI), t*80, Math.cos(t*8*Math.PI)];
	}
	
	tunnelMesh = Math2MeshCylinder(function (theta, t) {
		return VecAdd([Math.cos(theta), 0, Math.sin(theta)], path(t));
	}, 20, 100);
	MeshTransformUVs(tunnelMesh, [10, 0, 0, 1, 0, 0]);
	var mesh = BufferMesh(tunnelMesh);
	
	// image series
	for (var y = 0; y < HEIGHT; y++) {
		for (var x = 0; x < WIDTH; x++) {
			bitmap.data[4*(x+y*WIDTH)+0] = Math.sin(x/5+Math.PI/1.5)*128 + 127;
			bitmap.data[4*(x+y*WIDTH)+1] = Math.sin(x/5)*128 + 127;
			bitmap.data[4*(x+y*WIDTH)+2] = Math.sin(x/5-Math.PI/1.5)*128 + 127;
			bitmap.data[4*(x+y*WIDTH)+3] = 255;
		}
	}
	// store in vram
	StoreTexture(texture, bitmap);
	
	var t = 0;
	r.update = function (dt) {t += dt;}
	
	r.render = function (mtx) {
		// sprite
		var z = t/20.0;
		if (t > 12) t -= 10;
		
		var translation = VecSub([0,0,0], path(z));
		var rotation = QuatXYZ(Math.PI/2,0,0);
		translation = VecRotate(translation, rotation);
		var mtx = Mat4World(translation, rotation);
	
		// set up texture shader
		TEX_SHADER.enable();
		gl.uniformMatrix4fv(TEX_SHADER.pMatrix, false, pMatrix);
		gl.uniformMatrix4fv(TEX_SHADER.vMatrix, false, StaticMatrix(vMatrix));

		// bind texture
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.uniform1i(TEX_SHADER.samplerUniform, 0);
		DrawMesh(mesh, Mat4List(mtx), TEX_SHADER);
		
		// draw
		gl.uniformMatrix4fv(TEX_SHADER.vMatrix, false, vMatrix);
		TEX_SHADER.disable();
		STD_SHADER.enable();
	}
	
	return r;
}


// Procedural models
var ship = function(phi, theta) 
{
	var t = sin(theta)*sin(3*phi);
	if (t < 0) t = t * -4.0 * (sin(phi) + 2.0);
	return 2.0/(abs(sin(1.5*theta)) + 0.5 + t);
};
var ORIGINAL_MESH = Math2MeshSphere(ship, 10, 40);
TransformMesh(ORIGINAL_MESH, Mat4World(Vector3(), QuatXYZ(3.14/2,0,0)));

var station = function(t, phi)
{
	var x = Math.sin(phi) * Math.floor(Math.sin(t*12*Math.PI)+2.1);
	var y = Math.cos(phi) * Math.floor(Math.sin(t*12*Math.PI)+2.1);
	var z = 10*t;
	if (t < 0.1 || t > 0.9) x = y = 0;
	return [x/2,y/2,z/2];
};
var SPACE_STATION_MESH = Math2MeshCylinder(station, 20, 20);


var cockpit = function(phi, theta) {
	var r = Math.sin(phi+Math.PI)*0.5 + Math.sqrt(1 - 0.25*Math.cos(phi+Math.PI)*Math.cos(phi+Math.PI));
	return MAX(r, ship(phi, theta));
}
var COCKPIT_SHIP_MESH = Math2MeshSphere(cockpit, 10, 40);
TransformMesh(COCKPIT_SHIP_MESH, Mat4World(Vector3(), QuatXYZ(3.14/2,0,0)));


var voyager = function(phi, theta) {
	return MOD(theta, 0.2)*5;
}
var VOYAGER_MESH = Math2MeshSphere(voyager, 10, 40);
TransformMesh(VOYAGER_MESH, Mat4World(Vector3(), QuatXYZ(3.14/2,0,0)));


var alien = function(phi, theta) {
	//return MOD(phi, 2*Math.PI/3);
	return MAX(MAX(MIN(1/Math.sin(phi*2), 4), -4), MOD(theta+4, 2*Math.PI/3));
}
var SHIP_MESH = Math2MeshSphere(alien, 20, 12);
TransformMesh(SHIP_MESH, Mat4World(Vector3(), QuatXYZ(-3.14/2,0,0)));
TransformMesh(SHIP_MESH, Mat4Scale(1, 0.5, 1));


function ShipDesigner() {
	var s = {};
	var mesh = BufferMesh(SHIP_MESH);
	var wireframe = false;
	
	var t = 0;
	s.update = function (dt) {
		t += dt;
	}
	
	s.render = function (mtx) {
		var mtx = Mat4World([0, -1, 10], QuatXYZ(0, t, 0));
		mtx = Mat4List(mtx);
		
		//DrawMesh(mesh, Mat4List(mtx), STD_SHADER);
		
		var shader = STD_SHADER;
		// set vertex position array buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vert_buf);
		gl.vertexAttribPointer(shader.vertPos, 3, gl.FLOAT, false, 0, 0);
		
		// set world matrix
		gl.uniformMatrix4fv(shader.wMatrix, false, mtx);
		
		// do it
		if (wireframe)
			gl.drawArrays(gl.LINE_STRIP, 0, mesh.count * 3);
		else
			gl.drawArrays(gl.TRIANGLES, 0, mesh.count * 3);
	}
	
	return s;
}


// main
function gameInit()
{
	puid = connect();
	
	// receive / create game data
	ifs = receive(FractalImaging);
	//test = receive(TextureTest);
	//fluid = receive(FluidSim);
	ball = receive(SphereMap);
	field = receive(HeightMap);
	//asteroid = receive(Spheroid);
	//text = receive(TextSprite, "PROPERTY of TEAM DUCK LABS");
	//tunnel = receive(RainbowTunnel);
	ship = receive(ShipDesigner);

	gCamera = receiveNew(Camera, [0, 0, 1]);
	
	// hand over control to tedge / tedge server enterprise
	startGame();
}
