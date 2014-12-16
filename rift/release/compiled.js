/* csg.js */
// constructive solid geometry -- needs some work
// todo: support UVs
//   check intersection direction

function LineIntersection(lineVertex, lineVector, pointA, pointB)
{
	debugger;
	var c = VecSub(lineVertex, pointA);
	var v = VecSub(pointB, pointA);
	var d = VecLength(v);
	var t = VecDot(v, c);
	var q = VecAdd(pointA, VecScale(v, t/d));
	var vq = VecSub(q, lineVertex);
	var r = VecLength(vq) / VecDot(q, vq);
	var F = VecAdd(lineVertex, VecScale(lineVector, r));
	return F;
	//var r = VecDot(v, q);
	//t = (t + r) / d;
	// if 0 <= t <= d, then it's on the segment; otherwise it's off in space
	//if (t >= 0 && t <= d)
	//	return VecAdd(pointA, VecScale(v, t / d));
	return;
}

function LineOverlap(segmentA, segmentB, lineVector) 
{
	var aVector = VecSub(segmentA[1], segmentA[0]);
	var bVector = VecSub(segmentB[1], segmentB[0]);
	if (VecDot(aVector, lineVector) < 0) {
		var swap = segmentA[0];
		segmentA[0] = segmentA[1];
		segmentA[1] = swap;
	}
	if (VecDot(bVector, lineVector) < 0) {
		var swap = segmentB[0];
		segmentB[0] = segmentB[1];
		segmentB[1] = swap;
	}
	// a and b are both facing the same direction
	var q;
	if (VecDot(segmentA[0], lineVector) >= VecDot(segmentB[0], lineVector)) {
		q = segmentA[0];
	} else {
		q = segmentB[0];
	}
	
	var r;
	if (VecDot(segmentA[1], lineVector) <= VecDot(segmentB[1], lineVector)) {
		r = segmentA[1];
	} else {
		r = segmentB[1];
	}
	
	if (VecDot(VecSub(r, q), lineVector) > 0)
		return [q, r];
	return;
}

function CSG() {
	var csg = {
		mesh: {vertices: [], normals: [], uvs: [], count: 0},
		
		append: function(subMesh, transform, uvTransform) {
			if (transform) {
				subMesh = CloneMesh(subMesh);
				subMesh = TransformMesh(subMesh, transform);
				if (uvTransform)
					TransformMeshUVs(subMesh, uvTransform);
			}
			
			csg.mesh.count += subMesh.count;
			csg.mesh.vertices = csg.mesh.vertices.concat(subMesh.vertices);
			if (subMesh.normals)
				csg.mesh.normals = csg.mesh.normals.concat(subMesh.normals);
			if (subMesh.uvs)
				csg.mesh.uvs = csg.mesh.uvs.concat(subMesh.uvs);
		},
		
		subtract: function(subMesh, transform) {
			if (transform) {
				subMesh = CloneMesh(subMesh);
				subMesh = TransformMesh(subMesh, transform);
			}
			
			var mesh = csg.mesh;
			var culled = {count: 0, vertices: [], normals: [], uvs: []}
			var intersection = false;
			
			// go through each triangle in the mesh
			for (var i = 0; i < mesh.vertices.length; i+=9) 
			{
				var segments = []; var linkedVertices = [];
				var linkedNormals = [];
				// go through each triangle of the subtrahend
				for (var j = 0; j < subMesh.vertices.length; j+=9)
				{
					// check if the triangles collide and find the overlapping segment
					
					// find the line of the intersection of the planes
					var mNormal = [mesh.normals[i], mesh.normals[i+1], mesh.normals[i+2]];
					var sNormal = [subMesh.normals[j], subMesh.normals[j+1], subMesh.normals[j+2]];
					var lineVector = VecCross(mNormal, sNormal);
					if (VecLengthSqr(lineVector) < 0.5) continue;
					
					var lineVertex;
					var mAnchor = Vector3(mesh.vertices[i], mesh.vertices[i+1], mesh.vertices[i+2]);
					var sAnchor = Vector3(subMesh.vertices[j], subMesh.vertices[j+1], subMesh.vertices[j+2]);
					lineVertex = VecDot(VecSub(mAnchor, sAnchor), mNormal);
					lineVertex = VecAdd(VecScale(mNormal, lineVertex), sAnchor);
					
					// clip segment along mTriangle
					var mSegment = []; var mK;
					for (var k = 0; k < 3; k++) {
						var m0 = Vector3(mesh.vertices[i+k*3], mesh.vertices[i+k*3+1], mesh.vertices[i+k*3+2]);
						var m1 = Vector3(mesh.vertices[i+((k+1)%3)*3],
							mesh.vertices[i+((k+1)%3)*3+1],
							mesh.vertices[i+((k+1)%3)*3+2]);
						var mV = LineIntersection(lineVertex, lineVector, m0, m1);
						if (mV) {
							mSegment.push(mV);
						} else {
							mK = k;
						}
					}
					if (mSegment.length < 2) continue;
					
					// clip segment along sTriangle
					var sSegment = [];
					for (var k = 0; k < 3; k++) {
						var s0 = Vector3(subMesh.vertices[j+k*3], subMesh.vertices[j+k*3+1], subMesh.vertices[j+k*3+2]);
						var s1 = Vector3(subMesh.vertices[j+((k+1)%3)*3],
							subMesh.vertices[j+((k+1)%3)*3+1],
							subMesh.vertices[j+((k+1)%3)*3+2]);
						var sV = LineIntersection(lineVertex, lineVector, s0, s1);
						if (sV) {
							sSegment.push(sV);
						}
					}
					if (sSegment.length < 2) continue;
					
					var segment = LineOverlap(mSegment, sSegment, lineVector);
					if (segment) {
						segments.push(segment);
						linkedVertices.push([
							Vector3(mesh.vertices[i+mK*3], 
								mesh.vertices[i+mK*3+1], 
								mesh.vertices[i+mK*3+2]),
							Vector3(mesh.vertices[i+((mK+1)%3)*3],
								mesh.vertices[i+((mK+1)%3)*3+1],
								mesh.vertices[i+((mK+1)%3)*3+2])
						]);
						linkedNormals.push(mNormal);
					}
				}
				if (segments.length > 0) {
					// create new faces
					intersection = true;
					for (var k = 0; k < segments.length; k++) {
						culled.count += 2;
						culled.vertices = culled.vertices.concat(segments[k][0]);
						culled.vertices = culled.vertices.concat(segments[k][1]);
						culled.vertices = culled.vertices.concat(linkedVertices[k][0]);
						culled.vertices = culled.vertices.concat(segments[k][1]);
						culled.vertices = culled.vertices.concat(linkedVertices[k][1]);
						culled.vertices = culled.vertices.concat(linkedVertices[k][0]);
						for (var q = 0; q < 6; q++)
							culled.normals = culled.normals.concat(linkedNormals[k]);
					}
				} else {
					// no intersection, so keep this triangle
					culled.count++;
					for (var k = 0; k < 9; k++) {
						culled.vertices.push(mesh.vertices[i+k]);
						culled.normals.push(mesh.normals[i+k]);
					}
					if (mesh.uvs) {
						var ui = i*2/3;
						for (var k = 0; k < 6; k++) {
							culled.uvs.push(mesh.uvs[ui+k]);
						}
					}
				}
			}
			
			csg.mesh = culled;
			csg.mesh.uvs = [];
		},
		
		compile: function(transform) {
			var mesh = {vertices: csg.mesh.vertices, count: csg.mesh.count};
			if (csg.mesh.normals.length) mesh.normals = csg.mesh.normals;
			if (csg.mesh.uvs.length) mesh.uvs = csg.mesh.uvs;
			if (transform)
				mesh = TransformMesh(mesh, transform);
			return BufferMesh(mesh);
		}
	};
	return csg;
}
/* dev.js */
function TextSprite(text, style, font, x, y) {
	if (style === undefined) style = "white";
	if (font === undefined) font = "32px lucida console";
	if (x === undefined) x = 0;
	if (y === undefined) y = 0;
	
	var t = {"x": x, "y": y};
	var bitmap;
	var size;
	var texture = gl.createTexture();
	var mesh = BufferMesh(SQUARE_MESH);
	
	
	context.clearRect(0, 0, canvas2D.width, canvas2D.height);
	context.fillStyle = style;
	context.font = font;
	context.textBaseline = "top";
	context.fillText(text, 0, 0);
	size = context.measureText(text);
	t.size = size;
	var width = 1; while (width < size.width) width *= 2;
	bitmap = context.getImageData(0, 0, width, width);
	StoreTexture(texture, bitmap);
	
	var identity = Mat4List(Matrix4());
	var screen = Matrix4();
	screen = Mat4Mult(screen, Mat4Translate([1, -1, 0]));
	screen = Mat4Mult(screen, Mat4Scale(width/2, width/2, 1));
	screen = Mat4Mult(screen, Mat4Translate([-canvas.width/2, -canvas.height/2, 0]));
	screen = Mat4Mult(screen, Mat4Scale(2/canvas.width, 2/canvas.height, 1));
	screen = Mat4List(screen);
	
	if (x < 0) t.x = canvas.width - size.width + t.x;
	
	t.render = function (mtx) {
		// set up texture shader
		TEX_SHADER.enable();
		
		// orthogonal
		gl.uniformMatrix4fv(TEX_SHADER.pMatrix, false, identity);
		gl.uniformMatrix4fv(TEX_SHADER.vMatrix, false, screen);
		
		// blending for transparency
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
		gl.depthMask(false);
		
		// bind texture
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.uniform1i(TEX_SHADER.samplerUniform, 0);
		DrawMesh(mesh, Mat4List(Mat4Translate([2*t.x/width, 2*(canvas.height - t.y)/width, 0])), TEX_SHADER);
		
		gl.disable(gl.BLEND);
		gl.depthMask(true);
		
		// draw
		gl.uniformMatrix4fv(TEX_SHADER.pMatrix, false, pMatrix);
		gl.uniformMatrix4fv(TEX_SHADER.vMatrix, false, vMatrix);
		TEX_SHADER.disable();
		STD_SHADER.enable();
	}
	return t;
}
/* game.js */
/* rift 0.01 zalpha
- cylindrical space station
- fps controls
- shoot lasers
- 3 types of enemies
- textures and stuff
- boss battle (energy spider?)
*/


var flashColor = [1, 1, 1];
var STATION_RADIUS;
var ROTATIONAL_INERTIA = true;
var THIRD_PERSON = false;


/* entities */

// static crate
function Box(position, rotation) {
	var texs = [CorrugatedSteelTexture, HazardTexture, CrateTexture, DeepPurpleTexture];
	var tex = texs[entities.length % texs.length]();
	var texture = MakeTexture(tex, 128);
	var b = StaticEntity(BOX_MESH, Mat4Scale(5, 5, 5));
	b.texture = texture;
	
	if (position) {
		b.pos = position;
		if (rotation) b.rot = rotation;
	}
	
	return b;
}

// starry exterior
function SpaceBox() {
	var s = {textures: [], renderFirst: true};
	var mesh = BufferMesh(SQUARE_MESH);
	var theta = 0;
	
	// store in vram
	for (var f = 0; f < 6; f++) {
		s.textures.push(MakeTexture(SpaceBoxTexture(f), 256));
	}
	
	gl.bindTexture(gl.TEXTURE_2D, null);
	
	var t = 0;
	s.update = function (dt) 
	{
		t += dt * 0.1;
	}
	
	s.render = function (mtx) 
	{
		// set up texture shader
		TEX_SHADER.enable();
		gl.uniformMatrix4fv(TEX_SHADER.pMatrix, false, pMatrix);
		gl.uniformMatrix4fv(TEX_SHADER.vMatrix, false, StaticMatrix(vMatrix));
		
		// render six sides
		var mtx;
		gl.depthMask(false);
		gl.disable(gl.DEPTH_TEST);
		
		// four walls
		for (var f = 0; f < 4; f++) {
			TEX_SHADER.enable(s.textures[f]);
			mtx = Mat4Translate([0, 0, -1]);
			mtx = Mat4Mult(mtx, Mat4World([0,0,0], QuatXYZ(0,f*3.1416/2,0)));
			mtx = Mat4Mult(mtx, Mat4Rotate(QuatXYZ(0, 0, t)));
			DrawMesh(mesh, Mat4List(mtx), TEX_SHADER);
		}
		
		// ceiling
		mtx = Mat4Translate([0, 0, -1]);
		mtx = Mat4Mult(mtx, Mat4World([0,0,0], QuatXYZ(3.1416/2, 0, 0)));
		mtx = Mat4Mult(mtx, Mat4Rotate(QuatXYZ(0, 0, t)));
		TEX_SHADER.enable(s.textures[4]);
		DrawMesh(mesh, Mat4List(mtx), TEX_SHADER);
		
		// floor
		mtx = Mat4Translate([0, 0, -1]);
		mtx = Mat4Mult(mtx, Mat4World([0,0,0], QuatXYZ(-3.1416/2, 0, 0)));
		mtx = Mat4Mult(mtx, Mat4Rotate(QuatXYZ(0, 0, t)));
		TEX_SHADER.enable(s.textures[5]);
		DrawMesh(mesh, Mat4List(mtx), TEX_SHADER);
		
		gl.enable(gl.DEPTH_TEST);
		gl.depthMask(true);
		gl.uniformMatrix4fv(TEX_SHADER.vMatrix, false, vMatrix);
	}
	
	return s;
}


// level
var gMap;
function Map() 
{
	var map = {width: 48, height: 16, depth: 3, size: 16, ceilingHeight: 16};
	var grid = [];
	
	var FLOOR = 1; var WALL_X = 2; var WALL_Z = 4;
	for (var x = 0; x < map.width; x++) {
		grid.push([]);
		for (var y = 0; y <= map.height; y++) {
			grid[x].push([]);
			for (var z = 0; z <= map.depth; z++) {
				var walls = 0;
				// floor/ceiling
				walls |= (y < map.height) ? FLOOR : 0;
				if (z < map.depth) {
					// boundaries
					walls |= (y == 0 || y == (map.height) ? WALL_X : 0);
					// hallway
					walls |= ((y == (map.height/2) || 
							y == (map.height/2) - 1) &&
							x%(map.width/2) > 0) ? WALL_X : 0;
					// room divisions
					walls |= (x == (map.width/4) || x == (3*map.width/4)) &&
							(y < (map.height/2 - 1) || y > (map.height/2 - 1)) &&
							(y < map.height) ? WALL_Z : 0;
				}
				grid[x][y].push(walls);
			}
		}
	}
	
	var csg = CSG();
	// add floors/ceilings
	var floorTile = TransformMesh(CloneMesh(SQUARE_MESH), 
			Mat4Mult(Mat4World(Vector3(0, 0, 0), QuatXYZ(Math.PI/2,0,0)), 
					Mat4Scale(map.size/2)));
					
	var wallXTile = TransformMesh(CloneMesh(SQUARE_MESH), 
			Mat4Mult(Mat4World(Vector3(0, 1, -1), QuatXYZ(0,0,0)), 
					Mat4Scale(map.size/2, map.ceilingHeight/2, map.size/2)));
				
	var wallYTile = TransformMesh(CloneMesh(SQUARE_MESH), 
			Mat4Mult(Mat4World(Vector3(-1, 1, 0), QuatXYZ(0,Math.PI/2,0)), 
					Mat4Scale(map.size/2, map.ceilingHeight/2, map.size/2)));
					
	var texture = PackTexture([SteelGridTexture(), HazardTexture()], 256);
	TransformMeshUVs(floorTile, [0.5, 0, 0, 0, 1, 0]);
	TransformMeshUVs(wallXTile, [0.5, 0, 0.5, 0, 1, 0]);
	TransformMeshUVs(wallYTile, [0.5, 0, 0.5, 0, 1, 0]);
					
	for (var x = 0; x < map.width; x++) {
		for (var y = 0; y <= map.height; y++) {
			for (var z = 0; z <= map.depth; z++) {
				var matrix = Mat4Translate([x*map.size, z*map.ceilingHeight, y*map.size]);
				if (grid[x][y][z] & 1) {
					csg.append(floorTile, matrix);
				}
				if (grid[x][y][z] & 2) {
					csg.append(wallXTile, matrix);
				}
				if (grid[x][y][z] & 4) {
					csg.append(wallYTile, matrix);
				}
			}
		}
	}
	var mesh = csg.compile();
	
	var R = STATION_RADIUS = map.width*map.size/(2*Math.PI);
	var cylinderize = function (x, y, z) {
		var r = R - y;
		var phi = 2*x*Math.PI/(map.width*map.size);
		return [Math.sin(phi)*r, Math.cos(phi)*r, z];
	}
	
	function transformPosition(v) {
		// should use bounding box center, actually
		var x = v[0]; var y = v[1]; var z = v[2];
		var r = R - y;
		var phi = 2*x*Math.PI/(map.width*map.size);
		return [Math.sin(phi)*r, -Math.cos(phi)*r, z];
	}
	function transformRotation(v, q) {
		v = gMap.transformPosition(v); v[2] = 0;
		v = VecNormalize(v);
		v = VecScale(v, -1);
		var transform = QuatFromVectors(VEC_UP, v);
		transform = QuatNormalize(transform);
		return QuatMult(transform, q);
	}
	
	if (ROTATIONAL_INERTIA) {
		TransformMeshNonlinear(mesh, transformPosition);
		UpdateMesh(mesh);
	}
	
	gMap = StaticEntity(mesh);
	gMap.texture = texture;
	if (ROTATIONAL_INERTIA) {
		gMap.transformPosition = transformPosition;
		gMap.transformRotation = transformRotation;
	} else {
		gMap.transformPosition = function (x) { return x; };
		gMap.transformRotation = function (q) { return q; };
	}
	gMap.renderFirst = true;
	
	return gMap;
}


// player character
var gPlayer;
var PLASMA_FIRE_RATE = 0.2;
function Player(puid)
{
	var mesh;
	var generator = CSG();
	
	// construct player model
	var cone = Math2MeshCylinder(function(theta, t) {return 1 - t*0.9;}, 2, 24);
	var ball = Math2MeshSphere(function() { return 1; }, 10, 10);
	generator.append(cone, Mat4Scale(1.4, 4, 1.4));
	generator.append(ball, Mat4Translate(0, 4, 0));
	generator.append(BOX_MESH, 
		Mat4Mult(Mat4Scale(0.5, 0.5, 2), Mat4Translate(-1, 3, 0))
	);

	mesh = generator.compile(Mat4World(Vector3(), QuatXYZ(0, Math.PI, 0)));
	
	var gunMesh = PlasmaGunMesh(Mat4World(Vector3(1, 0, 0), QuatXYZ(0, Math.PI, 0)));
	var gunTexture = MakeTexture(PlasmaGunTexture(), 128);
	
	// create player entity
	var p = DynamicEntity(mesh);
	gPlayer = p;
	InputtingEntity(p, puid);
	p.pos = [25, 8, 25];
	p.vel = [0.0, 0.0, 0.0];
	p.friction = 1;
	p.force = [0, -100, 0];
	p.center[1] = p.radius;
	p.up = VEC_UP;
	p.look = Quat();
	
	// spawn the tracking camera
	if (THIRD_PERSON) {
		gCamera = TrackingCamera(p);
		gCamera.vector = [0, 2.5, 8];
		gCamera.target = [0, 2, 0];
		gCamera.distance = 1;
		gCamera.pos = VecAdd(p.pos, gCamera.vector);
		entities.push(gCamera);
	} else {
		gCamera = FPSCamera(p);
		gCamera.offset = Vector3(0, 4, 0);
		entities.push(gCamera);
	}
	
	var yaw = Quat();
	var roll = 0;
	var shootDelay = 0;
	p.update = function (dt)
	{
		// figure out player's orientation
		if (ROTATIONAL_INERTIA) {
			p.force = Vector3(p.pos);
			p.force[2] = 0;
			var r = VecLength(p.force);
			p.up = VecScale(p.force, -1/r);
			gCamera.up = p.up;
			p.force = VecScale(p.force, 5000/(r*r));
			p.rot = QuatFromVectors(VEC_UP, p.up);
			p.rot = QuatMult(p.rot, yaw);
			p.rot = QuatNormalize(p.rot);
			gCamera.offset = Mat4TransformPoint(Vector3(0, 4, 0),
								Mat4World(Vector3(), p.rot));
		} else {
			p.rot = yaw;
		}
		
		// get mouse position
		var mouse = p.mousePosition();
		mouse[0] = (mouse[0] - 0.5)*canvas.width/canvas.height;
		mouse[1] = mouse[1] - 0.5;
		if (mouse[0] < -0.5) mouse[0] = -0.5;
		if (mouse[0] > 0.5) mouse[0] = 0.5;
		/* aiming */
		var r = mouse[0]*mouse[0] + mouse[1]*mouse[1];
		if (r > 0.008) 
		{
			yaw = QuatMult(yaw, QuatXYZ(0.0, -3*mouse[0]*dt, 0.0));
			roll += -3*mouse[1]*dt;
		}
		
		/* movement */
		if (p.keyDown(K_A)) 
		{
			p.pos = VecAdd(p.pos, VecRotate(VecScale(VEC_RIGHT, -10*dt), p.rot));
		}
		if (p.keyDown(K_D)) 
		{
			p.pos = VecAdd(p.pos, VecRotate(VecScale(VEC_RIGHT, 10*dt), p.rot));
		}
		if (p.keyDown(K_W))
		{
			p.pos = VecAdd(p.pos, VecRotate(VecScale(VEC_FORWARD, -13*dt), p.rot));
		}
		if (p.keyDown(K_S))
		{
			p.pos = VecAdd(p.pos, VecRotate(VecScale(VEC_FORWARD, 7*dt), p.rot));
		}
		/* jump */
		if (p.keyHit(K_SPACE)) {
			p.vel = VecRotate(VecScale(VEC_UP, 10), p.rot);
		}
		
		/* set up camera matrix */
		if (roll > Math.PI/2) roll = Math.PI/2;
		if (roll < -Math.PI/2) roll = -Math.PI/2;
		p.look = QuatMult(p.rot, QuatXYZ(roll,0,0));
		if (THIRD_PERSON)
		{
			//gCamera.set(p.pos, p.look);
		} else {
			gCamera.set(p.pos, p.look);
		}
		
		/* shoot */
		if (shootDelay > 0) {
			shootDelay -= dt;
		}
		if (p.mouseDown(M_LEFT) && shootDelay <= 0)
		{
			var barrelPosition = Mat4TransformPoint([1, 3.5, -2], Mat4World(p.pos, p.rot));
			var bolt = PlasmaBolt(p, barrelPosition, p.look);
			bolt.size = 2;
			bolt.color = [1, 1, 3, 5];
			entities.push(bolt);
			shootDelay = PLASMA_FIRE_RATE;
		}
	}
	
	var meshRender = p.render;
	p.render = function (mtx)
	{
		if (THIRD_PERSON)
		{
			// render player guy
			STD_SHADER.enable();
			STD_SHADER.setColor(0, 0, 1);
			meshRender(mtx);
		} 
		// draw gun
		TEX_SHADER.enable(gunTexture);
		TEX_SHADER.setColor(1,1,1);
		var gunPos = Mat4TransformPoint([0, 3.5, 0], Mat4World(p.pos, p.rot));
		DrawMesh(gunMesh, Mat4List(Mat4World(gunPos, p.look)), TEX_SHADER);
	}
	
	return p;
}

// plasma projectile
var BOLT_SPEED = -50;
var BOLT_LIFE = 10;
function PlasmaBolt(shooter, pos, rotation)
{
	var texture = GetParticleTexture();
	var mesh = BufferMesh(SQUARE_MESH);
	
	var bolt = DynamicEntity(mesh);
	bolt.pos = pos;
	bolt.vel = Mat4TransformPoint(VecScale(VEC_FORWARD, BOLT_SPEED), 
		Mat4Rotate(rotation));
	bolt.force = Vector3();
	bolt.friction = 0;
	bolt.size = 1;
	bolt.color = [1,1,1,1];
	
	var t = 0;
	bolt.update = function (dt) {
		t += dt;
		if (t > BOLT_LIFE) {
			removeEntity(bolt);
		}
	}
	
	bolt.collision = function (target, collision) {
		if (target != shooter) {
			var explosion = Explosion(bolt.pos);
			explosion.color = bolt.color;
			entities.push(explosion);
			
			if (target.dynamic == false) 
			{
				var scorch = ScorchMark(collision.contact, collision.normal);
				entities.push(scorch);
			}
			
			removeEntity(bolt);
		}
	}
	
	bolt.render = function () {
		TEX_SHADER.enable(texture);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
		gl.depthMask(false);
		
		var rot = gCamera.rot;
		var matrix = Mat4World(bolt.pos, rot);
		matrix = Mat4Mult(Mat4Scale(bolt.size), matrix);
		TEX_SHADER.setColor(bolt.color);
		matrix = Mat4List(matrix);
		DrawMesh(mesh, matrix, TEX_SHADER);

		gl.depthMask(true);
		gl.disable(gl.BLEND);
		TEX_SHADER.setColor(1, 1, 1, 1);
	}
	
	return bolt;
}

// burn decal
function ScorchMark(pos, normal) 
{
	var mark = {size: 3};
	var texture = GetParticleTexture();
	var mesh = GetMarkMesh();
	
	var matrix = Mat4World(pos,
		QuatNormalize(QuatFromVectors(VEC_FORWARD, normal)));
	matrix = Mat4Mult(Mat4Scale(mark.size), matrix);
	matrix = Mat4List(matrix);
	
	var t = 0;
	mark.update = function (dt) {
		t += dt;
	}
	
	mark.render = function () {
		TEX_SHADER.enable(texture);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		gl.depthMask(false);
		TEX_SHADER.setColor(0, 0, 0, 1);
		DrawMesh(mesh, matrix, TEX_SHADER);
		gl.depthMask(true);
		gl.disable(gl.BLEND);
		TEX_SHADER.setColor(1, 1, 1, 1);
	}

	return mark;
}


// science equipment
function Tubes(pos) 
{
	var tubes;
	var mesh;
	var generator = CSG();
	
	var pt = PanelTexture();
	var tex = function (y, x) {
		if (y < 0.2 || y > 0.7) {
			c = pt(x,y);
			return [c[0], c[0], c[0]];
		} else {
			x = abs(x-0.5);
			return [96*x, 512*y*x, 255*y];
		}
	}
	
	var texture = MakeTexture(tex, 128);
	
	// construct science tube model
	var cylinder = Math2MeshCylinder(function(theta, t) {return (t < 0.05) ? t : (t > 0.95) ? 1 - t : 1;}, 12, 6);
	cylinder = TransformMesh(cylinder, Mat4Scale(1.5, 6, 1.5));
	
	var pipe = Math2MeshCylinder(function () { return 1; }, 12, 6);
	pipe = TransformMesh(pipe, Mat4Mult(Mat4Scale(0.5, 2, 0.5), Mat4Translate(0, 5, 0)));
	TransformMeshUVs(pipe, [0.2, 0, 0, 0, 1, 0]);
	
	var bigPipe = Math2MeshCylinder(function (theta, t) { return 0.75 + (Math.floor(t*20)%7 < 2 ? 0.5 : 0); }, 12, 6);
	bigPipe = TransformMesh(bigPipe, Mat4Mult(Mat4Scale(0.75, 42, 0.75), Mat4World([17,7,0], QuatXYZ(0,0,Math.PI/2))));
	TransformMeshUVs(bigPipe, [0, 0.25, 0.72, 5, 0, 0]);
	
	for (var i = 0; i < 5; i++) {
		generator.append(cylinder, Mat4Translate(i * 4, 0, 0));
		generator.append(pipe, Mat4Translate(i * 4, 0, 0));
	}
	generator.append(bigPipe);

	
	mesh = generator.compile();
	
	tubes = StaticEntity(mesh);
	if (pos) tubes.pos = pos;
		
	tubes.render = function () {
		var matrix = Mat4List(tubes.matrix);
		TEX_SHADER.enable(texture);
		TEX_SHADER.setColor(flashColor);
		DrawMesh(mesh, matrix, TEX_SHADER);
	}

	return tubes;
}

// high tech science equipment
function EnergyCore() {
	var fullCylinder = Math2MeshCylinder(function () { return 3; }, 3, 12);
	fullCylinder = TransformMesh(fullCylinder, Mat4Scale(1, 7, 1));
	var mesh = Math2MeshTunnel(function (t, theta) {
		if (theta > 0) {
			theta = -theta;
			return [Math.sin(theta/2)*2.5, t*7, Math.cos(theta/2)*2.5];
		} else {
			return [Math.sin(theta/2)*3, t*7, Math.cos(theta/2)*3];
		}
	}, 3, 12);
	BufferMesh(mesh);
	
	var core = StaticEntity(fullCylinder);
	core.pos = [30, 0, 30];
	core.rot = QuatXYZ(0, Math.PI/2, 0);
	
	var t = 0;
	core.update = function (dt) {
		t += dt * 2;
	}
	
	core.render = function () {
		STD_SHADER.enable();
		STD_SHADER.setColor(0,0.1,0.2,0.5);
		DrawMesh(fullCylinder, Mat4List(Mat4Mult(Mat4Scale(1, 1/7, 1), 
			core.matrix)), STD_SHADER);
		DrawMesh(fullCylinder, Mat4List(Mat4Mult(Mat4Scale(1, 1/7, 1), 
			Mat4Mult(Mat4Translate([0, 6, 0]), core.matrix))), STD_SHADER);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
		gl.depthMask(false);
		for (var i = 0; i < 5; i++) {
			for (var k = 0; k < 2; k++) {
				var scale = 1 - i/6;
				var rotation = QuatXYZ(0,k*Math.PI + t*(i+1) * ((i%2)*2 -1),0);
				var matrix = Mat4Scale(scale, 1, scale);
				matrix = Mat4Mult(matrix, Mat4World([0, 1, 0], rotation));
				matrix = Mat4Mult(matrix, core.matrix);
				matrix = Mat4List(matrix);
				DrawMesh(mesh, matrix, STD_SHADER);
			}
		}
		gl.depthMask(true);
		gl.disable(gl.BLEND);
	}
	
	return core;
}

// dynamic vegetation
function Tree(pos) 
{
	var tree = {depth: 3, branches: 3};
	var mesh;
	var generator = CSG();
	var texture = PackTexture([WoodGrainTexture(), LeafTexture()], 128);
	
	// create a tree graph
	var graph = {a: [0, 0, 0], b: [0, 3, 0], sub: []};
	var recurse = function (g, itr) {
		var vec = VecSub(g.b, g.a);
		g.quat = QuatNormalize(QuatFromVectors(VEC_UP, vec));
		if (itr > 0) {
			for (var i = 0; i < tree.branches; i++) {
				var next = {a: g.b, sub: []};
				var limb = Vector3(Math.random() - 0.5, Math.random(), Math.random() - 0.5);
				limb = VecScale(limb, 2);
				limb = Mat4TransformPoint(limb, Mat4World(g.b, g.quat));
				next.b = limb;
				if (next.b[1] < 2)
					next.b[1] += 2;
				g.sub.push(recurse(next, itr-1));
			}
		}
		return g;
	};
	graph = recurse(graph, tree.depth);
	
	// start with cylinders and squares
	var cylinder = Math2MeshCylinder(function(theta, t) {return 1;}, 2, 3);
	cylinder = TransformMesh(cylinder, Mat4Scale(0.3, 1, 0.3));
	TransformMeshUVs(cylinder, [0.5, 0, 0, 0, 1, 0]);
	
	var leaf = CloneMesh(SQUARE_MESH);
	leaf = TransformMesh(leaf, Mat4Scale(0.75));
	TransformMeshUVs(leaf, [0.5, 0, 0.5, 0, 1, 0]);
	
	// add the tree limbs recursively
	recurse = function (g, depth) {
		var vec = VecSub(g.b, g.a);
		var length = VecLength(vec);
		var matrix = Mat4World(g.a, g.quat);
		var size = 1-depth/(tree.depth+1);
		matrix = Mat4Mult(Mat4Scale(size, length, size), matrix);
		generator.append(cylinder, matrix);
		for (var i in g.sub) {
			recurse(g.sub[i], depth+1);
		}
	}
	recurse(graph, 0);
	
	// add the leaves at the end for alpha reasons
	var addLeaves = function (g) {
		if (g.sub.length) {
			for (var i in g.sub) {
				addLeaves(g.sub[i]);
			}
		} else {
			generator.append(leaf, Mat4Mult(Mat4Scale(0.5, 0.5, 0.5), Mat4World(g.b, g.quat)));
		}	
	}
	addLeaves(graph);
	mesh = generator.compile();
	
	tree = StaticEntity(cylinder, Mat4Scale(2, 5, 2));
	if (pos) tree.pos = pos;
	
	tree.render = function () {
		var matrix = Mat4List(Mat4Translate(tree.pos));
		TEX_SHADER.enable(texture);
		TEX_SHADER.setColor(flashColor);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		DrawMesh(mesh, matrix, TEX_SHADER);
		gl.disable(gl.BLEND);
	}	
	
	return tree;
}

// centipede enemy
function Snake(pos)
{
	var snake = {segments: []};
	var mesh = Math2MeshSphere(function() {return 0.75;}, 5, 5);
	var colors = [[1,0,0], [0,1,0], [0,0,1]];
	if (pos === undefined) {
		pos = Vector3(Math.random()*50, Math.random()*12, Math.random()*50);
	}
	
	var head = DynamicEntity(mesh);
	head.pos = pos;
	head.vel = Vector3(Math.random(), Math.random(), Math.random());
	head.vel = VecScale(head.vel, 8);
	head.force = [0, 0, 0];
	head.friction = 0;
	head.lastVel = Vector3(head.vel);
	snake.segments.push(head);
	
	snake.color = colors[entities.length % colors.length];
	
	var t = 0;
	var tfactor = Math.random() + 0.5;
	snake.update = function (dt) {
		// in the beginning make segments
		if (snake.segments.length < 10) {
			for (var i = 1; i < 10; i++) {
				var segment = DynamicEntity(mesh);
				segment.pos = VecAdd(head.pos, [0, 0, 2*i]);
				segment.force = [0, 0, 0];
				segment.friction = 1;
				snake.segments.push(segment);
			}
		}
		
		// move the head along a wave
		t += dt * tfactor;
		head.vel = VecAdd(head.vel,
			VecScale(Vector3(Math.sin(t), Math.cos(t), Math.sin(t) * Math.cos(t)), 3*dt));
		
		// have the segments follow the one before
		var last = head;
		for (var i = 1; i < snake.segments.length; i++) 
		{
			var segment = snake.segments[i];
			segment.vel = VecScale(VecSub(last.pos, segment.pos), 3);
			last = segment;
		}
	}
	
	// bounce off walls
	head.collision = function (target, collision) 
	{
		for (var i = 0; i < snake.segments.length; i++) 
		{
			if (target == snake.segments[i])
				return;
		}
		// reflect velocity across normal
		var dot = VecDot(head.lastVel, collision.normal);
		head.vel = VecAdd(head.lastVel, VecScale(collision.normal, -2*dot));
		head.lastVel = Vector3(head.vel);
	}
	
	// draw colored spheres
	snake.render = function () {
		for (var s in snake.segments) {
			STD_SHADER.setColor(snake.color);
			DrawMesh(mesh, Mat4List(
				Mat4Mult(Mat4Scale(1.5), snake.segments[s].matrix)), 
				STD_SHADER);
		}
	}
	
	snake.devRender = function() {
		for (var s in snake.segments) {
			snake.segments[s].devRender();
		}
	}
	
	return snake;
}

// flying spaghetti monster enemy
function BlobMonster(pos) 
{
	var FRAMES = 3;
	var meshes = [];
	for (var i = 0; i < FRAMES; i++) {
		meshes.push(BlobMesh());
	}
	
	var physicsModel = Math2MeshSphere(function () { 
		return 5; 
	}, 5, 5);
	
	var texture = MakeTexture(BlobTexture(), 256);
	var blob = DynamicEntity(physicsModel);
	if (pos) blob.pos = pos;
	blob.center[1] = blob.radius;
	blob.force = [0, -100, 0];
	blob.friction = 1;
	
	var t = 0;
	blob.update = function (dt)
	{
		t += dt;
		if (gPlayer && gPlayer.pos) {
			blob.vel = VecSub(gPlayer.pos, blob.pos);
			blob.vel = VecScale(VecNormalize(blob.vel), 3);
		}
		
		if (ROTATIONAL_INERTIA) {
			blob.force = Vector3(blob.pos);
			blob.force[2] = 0;
			var r = VecLength(blob.force);
			blob.up = VecScale(blob.force, -1/r);
			blob.force = VecScale(blob.force, 5000/(r*r));
			blob.rot = QuatFromVectors(VEC_UP, blob.up);
			blob.rot = QuatNormalize(blob.rot);
		}
	}
	
	blob.render = function ()
	{
		var frame = Math.floor(t) % FRAMES;
		var tfactor = t - Math.floor(t);
		ANIM_SHADER.enable(texture);
		ANIM_SHADER.setBlend(0.5-0.5*Math.cos(tfactor*3.14));
		ANIM_SHADER.render(meshes[frame], 
						meshes[(frame+1)%FRAMES], 
						Mat4List(blob.matrix));
	}

	return blob;
}

// high tech HUD
function HelmetDisplay() 
{
	var hud = {renderLast: true};
	var health = 0.5;
	var energy = 0.74;
	var Meter = function (color, amount) {
		return function (x, y) {
			x = (x < amount) ? 1 : 0;
			return [color[0], color[1], color[2], x*255];
		};
	}
	var ht = HexagonalTexture();
	var backdrop = function (x, y) {
		var color = ht(x*1.5, y/3);
		return [color[0], color[1], color[2], color[0] > 0 ? 255 : 0];
	}
	var backingTexture = MakeTexture(backdrop, 256);
	
	// health bar at the bottom
	var healthMeter = MakeTexture(Meter([196,0,64], health), 64);
	var csg = CSG();
	for (var x = 0; x < 20; x++) {
		var t = 2*(x/19) - 1;
		var matrix = Mat4World([Math.sin(t)*15, -11, -Math.cos(t)*8 - 20], QuatXYZ(0, (10 - x)/10, 0));
		var uvMatrix = [0.045, 0, x/20, 0, 0.5, 0];
		csg.append(SQUARE_MESH, matrix, uvMatrix);
	}
	var healthBar = csg.compile();
	
	// energy bar on the side
	var powerMeter = MakeTexture(Meter([64,196,0], energy), 64);
	var powerGauge = CloneMesh(SQUARE_MESH);
	TransformMeshUVs(powerGauge, [0,0.99,0,1,0,0]);
	BufferMesh(powerGauge);
	
	// upper and lower helmet texture
	var display = MakeTexture(HelmetTexture(), 512);
	var top = BufferMesh(SQUARE_MESH);
	var bottom = CloneMesh(SQUARE_MESH);
	TransformMeshUVs(bottom, [1, 0, 0, 0, -1, 0]);
	BufferMesh(bottom);
	
	// targetting display
	var targettingTex = TargettingTexture();
	var targettingTexStretch = function (x, y) {
		x -= 0.5;
		x *= canvas.width/canvas.height;
		x += 0.5;
		return targettingTex(x, y);
	}
	var target = MakeTexture(targettingTexStretch, 512);
	var box = CloneMesh(SQUARE_MESH);
	BufferMesh(box);
	
	// weapons display
	var weaponMeshes = [PlasmaGunMesh(Mat4Rotate(QuatXYZ(0, -Math.Pi/2, 0)))];
	var weaponTextures = [MakeTexture(PlasmaGunTexture(), 64)];
	
	var t;
	hud.update = function (dt)
	{
		t += dt;
		health = Math.sin(t*0.1)*0.3 + 0.5;
		energy = Math.cos(t*0.5)*0.5 + 0.5;
		UpdateTexture(healthMeter, Meter([196,0,64], health));
		UpdateTexture(powerMeter, Meter([64,196,0], energy));
	}
	
	hud.render = function () 
	{
		// set up rendering state
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		gl.disable(gl.DEPTH_TEST);
		
		// targetting reticles
		TEX_SHADER.enable(target);
		TEX_SHADER.setColor(1,1,1,1);
		OrthogonalProjection();
		DrawMesh(box, Mat4List(Matrix4()), TEX_SHADER);
		
		// helmet inside
		TEX_SHADER.enable(display);
		var matrix = Mat4Mult(Mat4Scale(1, 0.15, 1), Mat4Translate(0, 0.93, 0));
		DrawMesh(top, Mat4List(matrix), TEX_SHADER);
		matrix = Mat4Mult(Mat4Scale(1, 0.25, 1), Mat4Translate(0, -0.85, 0));
		DrawMesh(bottom, Mat4List(matrix), TEX_SHADER);
		
		// energy bar
		TEX_SHADER.enable(backingTexture);
		TEX_SHADER.setColor(0.1, 0.3, 0.0);
		matrix = Mat4Mult(Mat4Scale(0.07, 0.75, 1), Mat4Translate(-0.85, 0.05, 0));
		DrawMesh(powerGauge, Mat4List(matrix), TEX_SHADER);
		TEX_SHADER.enable(powerMeter);
		TEX_SHADER.setColor(1, 1, 1);
		matrix = Mat4Mult(Mat4Scale(0.05, 0.7, 1), Mat4Translate(-0.85, 0.05, 0));
		DrawMesh(powerGauge, Mat4List(matrix), TEX_SHADER);
		
		// health bar
		TEX_SHADER.enable(backingTexture);
		TEX_SHADER.setColor(0.3,0,0);
		NormalProjection();
		gl.uniformMatrix4fv(TEX_SHADER.vMatrix, false, Mat4List(Matrix4()));
		DrawMesh(healthBar, Mat4List(Matrix4()), TEX_SHADER);
		TEX_SHADER.enable(healthMeter);
		TEX_SHADER.setColor(1,1,1);
		DrawMesh(healthBar, Mat4List(Matrix4()), TEX_SHADER);
		
		gl.enable(gl.DEPTH_TEST);
		
		// weapon selection
		for (var i = 0; i < weaponMeshes.length; i++) {
			TEX_SHADER.enable(weaponTextures[i]);
			DrawMesh(weaponMeshes[i], Mat4List(Mat4Mult(Mat4Scale(0.1), Mat4Translate(1, 1, 1))), TEX_SHADER);
		}
		
		// restore rendering state
		//gl.depthMask(true);
		gl.disable(gl.BLEND);
		NormalProjection();
	}
	
	return hud;
}



// main
function gameInit()
{
	puid = connect();
	
	//TextureViewer(); return;
	//ModelViewer(); return;
	
	// receive / create game data
	Load([
			[SpaceBox],
			[Box, [0,0,0]],
			[Box, [45, 0, 0]],
			[Box, [0, 0, 45]],
			[Box, [45, 0, 45]],
			[3, Snake],
			[BlobMonster, [40, 0, 35]],
			[Player, puid],
			[Tubes, [25, 2, 2]],
			[FireEffect, [6, 2, 45]],
			[Tree, [17, 0, 17]],
			[EnergyCore],
			[Map],
			[HelmetDisplay],
			[FPSCounter]
		], finishedLoading);
}


function finishedLoading() 
{
	// warning sticker
	var label = TextSprite("don't look at this sam");
	label.x = (canvas.width - label.size.width) / 2;
	label.renderLast = true;
	entities.push(label);
	
	// transform everything to cylindrical space
	if (ROTATIONAL_INERTIA) {
		for (var e in entities) {
			if (entities[e].pos && entities[e].rot && entities[e] != gMap) {
				entities[e].pos = gMap.transformPosition(entities[e].pos);
				entities[e].rot = gMap.transformRotation(entities[e].pos, entities[e].rot);
			}
		}
	}
	
	// hand over control to tedge / tedge server enterprise
	startGame();
}
/* glMatrix-0.9.5.min.js */
// glMatrix v0.9.5
glMatrixArrayType=typeof Float32Array!="undefined"?Float32Array:typeof WebGLFloatArray!="undefined"?WebGLFloatArray:Array;var vec3={};vec3.create=function(a){var b=new glMatrixArrayType(3);if(a){b[0]=a[0];b[1]=a[1];b[2]=a[2]}return b};vec3.set=function(a,b){b[0]=a[0];b[1]=a[1];b[2]=a[2];return b};vec3.add=function(a,b,c){if(!c||a==c){a[0]+=b[0];a[1]+=b[1];a[2]+=b[2];return a}c[0]=a[0]+b[0];c[1]=a[1]+b[1];c[2]=a[2]+b[2];return c};
vec3.subtract=function(a,b,c){if(!c||a==c){a[0]-=b[0];a[1]-=b[1];a[2]-=b[2];return a}c[0]=a[0]-b[0];c[1]=a[1]-b[1];c[2]=a[2]-b[2];return c};vec3.negate=function(a,b){b||(b=a);b[0]=-a[0];b[1]=-a[1];b[2]=-a[2];return b};vec3.scale=function(a,b,c){if(!c||a==c){a[0]*=b;a[1]*=b;a[2]*=b;return a}c[0]=a[0]*b;c[1]=a[1]*b;c[2]=a[2]*b;return c};
vec3.normalize=function(a,b){b||(b=a);var c=a[0],d=a[1],e=a[2],g=Math.sqrt(c*c+d*d+e*e);if(g){if(g==1){b[0]=c;b[1]=d;b[2]=e;return b}}else{b[0]=0;b[1]=0;b[2]=0;return b}g=1/g;b[0]=c*g;b[1]=d*g;b[2]=e*g;return b};vec3.cross=function(a,b,c){c||(c=a);var d=a[0],e=a[1];a=a[2];var g=b[0],f=b[1];b=b[2];c[0]=e*b-a*f;c[1]=a*g-d*b;c[2]=d*f-e*g;return c};vec3.length=function(a){var b=a[0],c=a[1];a=a[2];return Math.sqrt(b*b+c*c+a*a)};vec3.dot=function(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]};
vec3.direction=function(a,b,c){c||(c=a);var d=a[0]-b[0],e=a[1]-b[1];a=a[2]-b[2];b=Math.sqrt(d*d+e*e+a*a);if(!b){c[0]=0;c[1]=0;c[2]=0;return c}b=1/b;c[0]=d*b;c[1]=e*b;c[2]=a*b;return c};vec3.lerp=function(a,b,c,d){d||(d=a);d[0]=a[0]+c*(b[0]-a[0]);d[1]=a[1]+c*(b[1]-a[1]);d[2]=a[2]+c*(b[2]-a[2]);return d};vec3.str=function(a){return"["+a[0]+", "+a[1]+", "+a[2]+"]"};var mat3={};
mat3.create=function(a){var b=new glMatrixArrayType(9);if(a){b[0]=a[0];b[1]=a[1];b[2]=a[2];b[3]=a[3];b[4]=a[4];b[5]=a[5];b[6]=a[6];b[7]=a[7];b[8]=a[8];b[9]=a[9]}return b};mat3.set=function(a,b){b[0]=a[0];b[1]=a[1];b[2]=a[2];b[3]=a[3];b[4]=a[4];b[5]=a[5];b[6]=a[6];b[7]=a[7];b[8]=a[8];return b};mat3.identity=function(a){a[0]=1;a[1]=0;a[2]=0;a[3]=0;a[4]=1;a[5]=0;a[6]=0;a[7]=0;a[8]=1;return a};
mat3.transpose=function(a,b){if(!b||a==b){var c=a[1],d=a[2],e=a[5];a[1]=a[3];a[2]=a[6];a[3]=c;a[5]=a[7];a[6]=d;a[7]=e;return a}b[0]=a[0];b[1]=a[3];b[2]=a[6];b[3]=a[1];b[4]=a[4];b[5]=a[7];b[6]=a[2];b[7]=a[5];b[8]=a[8];return b};mat3.toMat4=function(a,b){b||(b=mat4.create());b[0]=a[0];b[1]=a[1];b[2]=a[2];b[3]=0;b[4]=a[3];b[5]=a[4];b[6]=a[5];b[7]=0;b[8]=a[6];b[9]=a[7];b[10]=a[8];b[11]=0;b[12]=0;b[13]=0;b[14]=0;b[15]=1;return b};
mat3.str=function(a){return"["+a[0]+", "+a[1]+", "+a[2]+", "+a[3]+", "+a[4]+", "+a[5]+", "+a[6]+", "+a[7]+", "+a[8]+"]"};var mat4={};mat4.create=function(a){var b=new glMatrixArrayType(16);if(a){b[0]=a[0];b[1]=a[1];b[2]=a[2];b[3]=a[3];b[4]=a[4];b[5]=a[5];b[6]=a[6];b[7]=a[7];b[8]=a[8];b[9]=a[9];b[10]=a[10];b[11]=a[11];b[12]=a[12];b[13]=a[13];b[14]=a[14];b[15]=a[15]}return b};
mat4.set=function(a,b){b[0]=a[0];b[1]=a[1];b[2]=a[2];b[3]=a[3];b[4]=a[4];b[5]=a[5];b[6]=a[6];b[7]=a[7];b[8]=a[8];b[9]=a[9];b[10]=a[10];b[11]=a[11];b[12]=a[12];b[13]=a[13];b[14]=a[14];b[15]=a[15];return b};mat4.identity=function(a){a[0]=1;a[1]=0;a[2]=0;a[3]=0;a[4]=0;a[5]=1;a[6]=0;a[7]=0;a[8]=0;a[9]=0;a[10]=1;a[11]=0;a[12]=0;a[13]=0;a[14]=0;a[15]=1;return a};
mat4.transpose=function(a,b){if(!b||a==b){var c=a[1],d=a[2],e=a[3],g=a[6],f=a[7],h=a[11];a[1]=a[4];a[2]=a[8];a[3]=a[12];a[4]=c;a[6]=a[9];a[7]=a[13];a[8]=d;a[9]=g;a[11]=a[14];a[12]=e;a[13]=f;a[14]=h;return a}b[0]=a[0];b[1]=a[4];b[2]=a[8];b[3]=a[12];b[4]=a[1];b[5]=a[5];b[6]=a[9];b[7]=a[13];b[8]=a[2];b[9]=a[6];b[10]=a[10];b[11]=a[14];b[12]=a[3];b[13]=a[7];b[14]=a[11];b[15]=a[15];return b};
mat4.determinant=function(a){var b=a[0],c=a[1],d=a[2],e=a[3],g=a[4],f=a[5],h=a[6],i=a[7],j=a[8],k=a[9],l=a[10],o=a[11],m=a[12],n=a[13],p=a[14];a=a[15];return m*k*h*e-j*n*h*e-m*f*l*e+g*n*l*e+j*f*p*e-g*k*p*e-m*k*d*i+j*n*d*i+m*c*l*i-b*n*l*i-j*c*p*i+b*k*p*i+m*f*d*o-g*n*d*o-m*c*h*o+b*n*h*o+g*c*p*o-b*f*p*o-j*f*d*a+g*k*d*a+j*c*h*a-b*k*h*a-g*c*l*a+b*f*l*a};
mat4.inverse=function(a,b){b||(b=a);var c=a[0],d=a[1],e=a[2],g=a[3],f=a[4],h=a[5],i=a[6],j=a[7],k=a[8],l=a[9],o=a[10],m=a[11],n=a[12],p=a[13],r=a[14],s=a[15],A=c*h-d*f,B=c*i-e*f,t=c*j-g*f,u=d*i-e*h,v=d*j-g*h,w=e*j-g*i,x=k*p-l*n,y=k*r-o*n,z=k*s-m*n,C=l*r-o*p,D=l*s-m*p,E=o*s-m*r,q=1/(A*E-B*D+t*C+u*z-v*y+w*x);b[0]=(h*E-i*D+j*C)*q;b[1]=(-d*E+e*D-g*C)*q;b[2]=(p*w-r*v+s*u)*q;b[3]=(-l*w+o*v-m*u)*q;b[4]=(-f*E+i*z-j*y)*q;b[5]=(c*E-e*z+g*y)*q;b[6]=(-n*w+r*t-s*B)*q;b[7]=(k*w-o*t+m*B)*q;b[8]=(f*D-h*z+j*x)*q;
b[9]=(-c*D+d*z-g*x)*q;b[10]=(n*v-p*t+s*A)*q;b[11]=(-k*v+l*t-m*A)*q;b[12]=(-f*C+h*y-i*x)*q;b[13]=(c*C-d*y+e*x)*q;b[14]=(-n*u+p*B-r*A)*q;b[15]=(k*u-l*B+o*A)*q;return b};mat4.toRotationMat=function(a,b){b||(b=mat4.create());b[0]=a[0];b[1]=a[1];b[2]=a[2];b[3]=a[3];b[4]=a[4];b[5]=a[5];b[6]=a[6];b[7]=a[7];b[8]=a[8];b[9]=a[9];b[10]=a[10];b[11]=a[11];b[12]=0;b[13]=0;b[14]=0;b[15]=1;return b};
mat4.toMat3=function(a,b){b||(b=mat3.create());b[0]=a[0];b[1]=a[1];b[2]=a[2];b[3]=a[4];b[4]=a[5];b[5]=a[6];b[6]=a[8];b[7]=a[9];b[8]=a[10];return b};mat4.toInverseMat3=function(a,b){var c=a[0],d=a[1],e=a[2],g=a[4],f=a[5],h=a[6],i=a[8],j=a[9],k=a[10],l=k*f-h*j,o=-k*g+h*i,m=j*g-f*i,n=c*l+d*o+e*m;if(!n)return null;n=1/n;b||(b=mat3.create());b[0]=l*n;b[1]=(-k*d+e*j)*n;b[2]=(h*d-e*f)*n;b[3]=o*n;b[4]=(k*c-e*i)*n;b[5]=(-h*c+e*g)*n;b[6]=m*n;b[7]=(-j*c+d*i)*n;b[8]=(f*c-d*g)*n;return b};
mat4.multiply=function(a,b,c){c||(c=a);var d=a[0],e=a[1],g=a[2],f=a[3],h=a[4],i=a[5],j=a[6],k=a[7],l=a[8],o=a[9],m=a[10],n=a[11],p=a[12],r=a[13],s=a[14];a=a[15];var A=b[0],B=b[1],t=b[2],u=b[3],v=b[4],w=b[5],x=b[6],y=b[7],z=b[8],C=b[9],D=b[10],E=b[11],q=b[12],F=b[13],G=b[14];b=b[15];c[0]=A*d+B*h+t*l+u*p;c[1]=A*e+B*i+t*o+u*r;c[2]=A*g+B*j+t*m+u*s;c[3]=A*f+B*k+t*n+u*a;c[4]=v*d+w*h+x*l+y*p;c[5]=v*e+w*i+x*o+y*r;c[6]=v*g+w*j+x*m+y*s;c[7]=v*f+w*k+x*n+y*a;c[8]=z*d+C*h+D*l+E*p;c[9]=z*e+C*i+D*o+E*r;c[10]=z*
g+C*j+D*m+E*s;c[11]=z*f+C*k+D*n+E*a;c[12]=q*d+F*h+G*l+b*p;c[13]=q*e+F*i+G*o+b*r;c[14]=q*g+F*j+G*m+b*s;c[15]=q*f+F*k+G*n+b*a;return c};mat4.multiplyVec3=function(a,b,c){c||(c=b);var d=b[0],e=b[1];b=b[2];c[0]=a[0]*d+a[4]*e+a[8]*b+a[12];c[1]=a[1]*d+a[5]*e+a[9]*b+a[13];c[2]=a[2]*d+a[6]*e+a[10]*b+a[14];return c};
mat4.multiplyVec4=function(a,b,c){c||(c=b);var d=b[0],e=b[1],g=b[2];b=b[3];c[0]=a[0]*d+a[4]*e+a[8]*g+a[12]*b;c[1]=a[1]*d+a[5]*e+a[9]*g+a[13]*b;c[2]=a[2]*d+a[6]*e+a[10]*g+a[14]*b;c[3]=a[3]*d+a[7]*e+a[11]*g+a[15]*b;return c};
mat4.translate=function(a,b,c){var d=b[0],e=b[1];b=b[2];if(!c||a==c){a[12]=a[0]*d+a[4]*e+a[8]*b+a[12];a[13]=a[1]*d+a[5]*e+a[9]*b+a[13];a[14]=a[2]*d+a[6]*e+a[10]*b+a[14];a[15]=a[3]*d+a[7]*e+a[11]*b+a[15];return a}var g=a[0],f=a[1],h=a[2],i=a[3],j=a[4],k=a[5],l=a[6],o=a[7],m=a[8],n=a[9],p=a[10],r=a[11];c[0]=g;c[1]=f;c[2]=h;c[3]=i;c[4]=j;c[5]=k;c[6]=l;c[7]=o;c[8]=m;c[9]=n;c[10]=p;c[11]=r;c[12]=g*d+j*e+m*b+a[12];c[13]=f*d+k*e+n*b+a[13];c[14]=h*d+l*e+p*b+a[14];c[15]=i*d+o*e+r*b+a[15];return c};
mat4.scale=function(a,b,c){var d=b[0],e=b[1];b=b[2];if(!c||a==c){a[0]*=d;a[1]*=d;a[2]*=d;a[3]*=d;a[4]*=e;a[5]*=e;a[6]*=e;a[7]*=e;a[8]*=b;a[9]*=b;a[10]*=b;a[11]*=b;return a}c[0]=a[0]*d;c[1]=a[1]*d;c[2]=a[2]*d;c[3]=a[3]*d;c[4]=a[4]*e;c[5]=a[5]*e;c[6]=a[6]*e;c[7]=a[7]*e;c[8]=a[8]*b;c[9]=a[9]*b;c[10]=a[10]*b;c[11]=a[11]*b;c[12]=a[12];c[13]=a[13];c[14]=a[14];c[15]=a[15];return c};
mat4.rotate=function(a,b,c,d){var e=c[0],g=c[1];c=c[2];var f=Math.sqrt(e*e+g*g+c*c);if(!f)return null;if(f!=1){f=1/f;e*=f;g*=f;c*=f}var h=Math.sin(b),i=Math.cos(b),j=1-i;b=a[0];f=a[1];var k=a[2],l=a[3],o=a[4],m=a[5],n=a[6],p=a[7],r=a[8],s=a[9],A=a[10],B=a[11],t=e*e*j+i,u=g*e*j+c*h,v=c*e*j-g*h,w=e*g*j-c*h,x=g*g*j+i,y=c*g*j+e*h,z=e*c*j+g*h;e=g*c*j-e*h;g=c*c*j+i;if(d){if(a!=d){d[12]=a[12];d[13]=a[13];d[14]=a[14];d[15]=a[15]}}else d=a;d[0]=b*t+o*u+r*v;d[1]=f*t+m*u+s*v;d[2]=k*t+n*u+A*v;d[3]=l*t+p*u+B*
v;d[4]=b*w+o*x+r*y;d[5]=f*w+m*x+s*y;d[6]=k*w+n*x+A*y;d[7]=l*w+p*x+B*y;d[8]=b*z+o*e+r*g;d[9]=f*z+m*e+s*g;d[10]=k*z+n*e+A*g;d[11]=l*z+p*e+B*g;return d};mat4.rotateX=function(a,b,c){var d=Math.sin(b);b=Math.cos(b);var e=a[4],g=a[5],f=a[6],h=a[7],i=a[8],j=a[9],k=a[10],l=a[11];if(c){if(a!=c){c[0]=a[0];c[1]=a[1];c[2]=a[2];c[3]=a[3];c[12]=a[12];c[13]=a[13];c[14]=a[14];c[15]=a[15]}}else c=a;c[4]=e*b+i*d;c[5]=g*b+j*d;c[6]=f*b+k*d;c[7]=h*b+l*d;c[8]=e*-d+i*b;c[9]=g*-d+j*b;c[10]=f*-d+k*b;c[11]=h*-d+l*b;return c};
mat4.rotateY=function(a,b,c){var d=Math.sin(b);b=Math.cos(b);var e=a[0],g=a[1],f=a[2],h=a[3],i=a[8],j=a[9],k=a[10],l=a[11];if(c){if(a!=c){c[4]=a[4];c[5]=a[5];c[6]=a[6];c[7]=a[7];c[12]=a[12];c[13]=a[13];c[14]=a[14];c[15]=a[15]}}else c=a;c[0]=e*b+i*-d;c[1]=g*b+j*-d;c[2]=f*b+k*-d;c[3]=h*b+l*-d;c[8]=e*d+i*b;c[9]=g*d+j*b;c[10]=f*d+k*b;c[11]=h*d+l*b;return c};
mat4.rotateZ=function(a,b,c){var d=Math.sin(b);b=Math.cos(b);var e=a[0],g=a[1],f=a[2],h=a[3],i=a[4],j=a[5],k=a[6],l=a[7];if(c){if(a!=c){c[8]=a[8];c[9]=a[9];c[10]=a[10];c[11]=a[11];c[12]=a[12];c[13]=a[13];c[14]=a[14];c[15]=a[15]}}else c=a;c[0]=e*b+i*d;c[1]=g*b+j*d;c[2]=f*b+k*d;c[3]=h*b+l*d;c[4]=e*-d+i*b;c[5]=g*-d+j*b;c[6]=f*-d+k*b;c[7]=h*-d+l*b;return c};
mat4.frustum=function(a,b,c,d,e,g,f){f||(f=mat4.create());var h=b-a,i=d-c,j=g-e;f[0]=e*2/h;f[1]=0;f[2]=0;f[3]=0;f[4]=0;f[5]=e*2/i;f[6]=0;f[7]=0;f[8]=(b+a)/h;f[9]=(d+c)/i;f[10]=-(g+e)/j;f[11]=-1;f[12]=0;f[13]=0;f[14]=-(g*e*2)/j;f[15]=0;return f};mat4.perspective=function(a,b,c,d,e){a=c*Math.tan(a*Math.PI/360);b=a*b;return mat4.frustum(-b,b,-a,a,c,d,e)};
mat4.ortho=function(a,b,c,d,e,g,f){f||(f=mat4.create());var h=b-a,i=d-c,j=g-e;f[0]=2/h;f[1]=0;f[2]=0;f[3]=0;f[4]=0;f[5]=2/i;f[6]=0;f[7]=0;f[8]=0;f[9]=0;f[10]=-2/j;f[11]=0;f[12]=-(a+b)/h;f[13]=-(d+c)/i;f[14]=-(g+e)/j;f[15]=1;return f};
mat4.lookAt=function(a,b,c,d){d||(d=mat4.create());var e=a[0],g=a[1];a=a[2];var f=c[0],h=c[1],i=c[2];c=b[1];var j=b[2];if(e==b[0]&&g==c&&a==j)return mat4.identity(d);var k,l,o,m;c=e-b[0];j=g-b[1];b=a-b[2];m=1/Math.sqrt(c*c+j*j+b*b);c*=m;j*=m;b*=m;k=h*b-i*j;i=i*c-f*b;f=f*j-h*c;if(m=Math.sqrt(k*k+i*i+f*f)){m=1/m;k*=m;i*=m;f*=m}else f=i=k=0;h=j*f-b*i;l=b*k-c*f;o=c*i-j*k;if(m=Math.sqrt(h*h+l*l+o*o)){m=1/m;h*=m;l*=m;o*=m}else o=l=h=0;d[0]=k;d[1]=h;d[2]=c;d[3]=0;d[4]=i;d[5]=l;d[6]=j;d[7]=0;d[8]=f;d[9]=
o;d[10]=b;d[11]=0;d[12]=-(k*e+i*g+f*a);d[13]=-(h*e+l*g+o*a);d[14]=-(c*e+j*g+b*a);d[15]=1;return d};mat4.str=function(a){return"["+a[0]+", "+a[1]+", "+a[2]+", "+a[3]+", "+a[4]+", "+a[5]+", "+a[6]+", "+a[7]+", "+a[8]+", "+a[9]+", "+a[10]+", "+a[11]+", "+a[12]+", "+a[13]+", "+a[14]+", "+a[15]+"]"};quat4={};quat4.create=function(a){var b=new glMatrixArrayType(4);if(a){b[0]=a[0];b[1]=a[1];b[2]=a[2];b[3]=a[3]}return b};quat4.set=function(a,b){b[0]=a[0];b[1]=a[1];b[2]=a[2];b[3]=a[3];return b};
quat4.calculateW=function(a,b){var c=a[0],d=a[1],e=a[2];if(!b||a==b){a[3]=-Math.sqrt(Math.abs(1-c*c-d*d-e*e));return a}b[0]=c;b[1]=d;b[2]=e;b[3]=-Math.sqrt(Math.abs(1-c*c-d*d-e*e));return b};quat4.inverse=function(a,b){if(!b||a==b){a[0]*=1;a[1]*=1;a[2]*=1;return a}b[0]=-a[0];b[1]=-a[1];b[2]=-a[2];b[3]=a[3];return b};quat4.length=function(a){var b=a[0],c=a[1],d=a[2];a=a[3];return Math.sqrt(b*b+c*c+d*d+a*a)};
quat4.normalize=function(a,b){b||(b=a);var c=a[0],d=a[1],e=a[2],g=a[3],f=Math.sqrt(c*c+d*d+e*e+g*g);if(f==0){b[0]=0;b[1]=0;b[2]=0;b[3]=0;return b}f=1/f;b[0]=c*f;b[1]=d*f;b[2]=e*f;b[3]=g*f;return b};quat4.multiply=function(a,b,c){c||(c=a);var d=a[0],e=a[1],g=a[2];a=a[3];var f=b[0],h=b[1],i=b[2];b=b[3];c[0]=d*b+a*f+e*i-g*h;c[1]=e*b+a*h+g*f-d*i;c[2]=g*b+a*i+d*h-e*f;c[3]=a*b-d*f-e*h-g*i;return c};
quat4.multiplyVec3=function(a,b,c){c||(c=b);var d=b[0],e=b[1],g=b[2];b=a[0];var f=a[1],h=a[2];a=a[3];var i=a*d+f*g-h*e,j=a*e+h*d-b*g,k=a*g+b*e-f*d;d=-b*d-f*e-h*g;c[0]=i*a+d*-b+j*-h-k*-f;c[1]=j*a+d*-f+k*-b-i*-h;c[2]=k*a+d*-h+i*-f-j*-b;return c};quat4.toMat3=function(a,b){b||(b=mat3.create());var c=a[0],d=a[1],e=a[2],g=a[3],f=c+c,h=d+d,i=e+e,j=c*f,k=c*h;c=c*i;var l=d*h;d=d*i;e=e*i;f=g*f;h=g*h;g=g*i;b[0]=1-(l+e);b[1]=k-g;b[2]=c+h;b[3]=k+g;b[4]=1-(j+e);b[5]=d-f;b[6]=c-h;b[7]=d+f;b[8]=1-(j+l);return b};
quat4.toMat4=function(a,b){b||(b=mat4.create());var c=a[0],d=a[1],e=a[2],g=a[3],f=c+c,h=d+d,i=e+e,j=c*f,k=c*h;c=c*i;var l=d*h;d=d*i;e=e*i;f=g*f;h=g*h;g=g*i;b[0]=1-(l+e);b[1]=k-g;b[2]=c+h;b[3]=0;b[4]=k+g;b[5]=1-(j+e);b[6]=d-f;b[7]=0;b[8]=c-h;b[9]=d+f;b[10]=1-(j+l);b[11]=0;b[12]=0;b[13]=0;b[14]=0;b[15]=1;return b};quat4.slerp=function(a,b,c,d){d||(d=a);var e=c;if(a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3]<0)e=-1*c;d[0]=1-c*a[0]+e*b[0];d[1]=1-c*a[1]+e*b[1];d[2]=1-c*a[2]+e*b[2];d[3]=1-c*a[3]+e*b[3];return d};
quat4.str=function(a){return"["+a[0]+", "+a[1]+", "+a[2]+", "+a[3]+"]"};
/* meshes.js */
/* simple meshes */
BOX_MESH = {"count":12,"vertices":[0,1,1,0,0,1,1,1,1,0,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,1,0,1,0,1,1,0,0,1,1,0,1,1,0,1,0,0,0,1,0,1,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,1,1,0,0,0,0,0,1,0,1,1,0,1,0,0,1,1,1,1,0,0,1,1,1,1,1,1,1,0,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,1,0,1],"uvs":[0,0,0,1,1,0,0,1,1,1,1,0,0,0,0,1,1,0,0,1,1,1,1,0,0,0,0,1,1,0,0,1,1,1,1,0,0,0,0,1,1,0,0,1,1,1,1,0,0,0,0,1,1,0,0,1,1,1,1,0,0,0,0,1,1,0,0,1,1,1,1,0],"normals":[0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,-1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0]};

SQUARE_MESH = {"count":2,"vertices":[-1,-1,0,1,-1,0,-1,1,0,-1,1,0,1,-1,0,1,1,0],"uvs":[0,0,1,0,0,1,0,1,1,0,1,1],"normals":[0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1]};

/* procedural meshes */
var MARK_MESH;
function GetMarkMesh() {
	if (MARK_MESH === undefined) {
		var csg = CSG();
		csg.append(SQUARE_MESH, Mat4Translate(0, 0, 0.1));
		csg.append(SQUARE_MESH, Mat4Translate(0, 0, -0.1));
		MARK_MESH = csg.compile();
	}
	return MARK_MESH;
}

function BlobMesh() 
{
	var blob = Math2MeshSphere(function () { 
		return (1 + Math.random()) * 2;
	}, 16, 16);
	
	TransformMesh(blob, Mat4Translate(0, 1, 0));
	
	for (var i = 0; i < blob.vertices.length; i+=3) {
		if (blob.vertices[i+1] < 0)
			blob.vertices[i+1] = 0;
	}
	
	TransformMesh(blob, Mat4Scale(1.4, 1.25, 1.4));
	
	var csg = CSG();
	csg.append(blob);
	
	for (var k = 0; k < 8; k++) {
		// psuedo randomly oriented limbs
		var pos = [k*k + 17*(k+1) + 13];
		pos.push(pos[0]*11*k + 13*k + 19);
		pos.push(pos[0] + pos[1]*2 + 21*k);
		pos[0] = ((pos[0]%11)/11)*5 - 2.5;
		pos[1] = ((pos[1]%11)/11)*2 + 1.0;
		pos[2] = ((pos[2]%11)/11)*5 - 2.5;
		
		var path = [{
			pos: pos,
			radius: 0.5
		}];
		var angle = QuatFromVectors(VEC_UP, VecNormalize(path[0].pos));
		angle = QuatNormalize(angle);
		for (var i = 1; i < 7; i++) {
			// randomly arrange the tentacles
			var pos = Mat4TransformPoint([Math.random()*2 - 1, Math.random()+0.5, Math.random()*2 - 1], Mat4Rotate(angle));
			pos = VecAdd(pos, path[i-1].pos);
			path.push({pos: pos, radius: 0.5});
		}
		var tentacle = Math2MeshPath(path, 3);
		csg.append(tentacle, Matrix4(), [0.2, 0, 0, 0, 0.2, 0]);
	}
	
	return csg.compile();
}


function PlasmaGunMesh(transform)
{
	var csg = CSG();
	var matrix;
	
	var barrel = Math2MeshCylinder(function (theta, t) {
		return MAX(Math.sin(t*6)*0.5 + 1.2, Math.cos(t*6)*0.5 + 1);
	}, 12, 12);
	
	var ball = Math2MeshSphere(function() { return 0.5; }, 8, 8);
	
	var handle = CloneMesh(BOX_MESH);
	matrix = Mat4Translate(-0.5, -0.5, 0)
	matrix = Mat4Mult(matrix, Mat4Scale(0.4, 0.5, 1.2));
	matrix = Mat4Mult(matrix, Mat4Rotate(QuatXYZ(0.5, 0, 0)));
	handle = TransformMesh(handle, matrix);
	
	csg.append(barrel, Mat4Scale(0.25, 2, 0.25), [1, 0, 0, 0, 0.48, 0.01]);
	csg.append(ball, Matrix4(), [0.5, 0, 0, 0, 0.5, 0.5]);
	csg.append(handle, Matrix4(), [0.5, 0, 0.5, 0, 0.5, 0.5]);
	if (transform) {
		transform = Mat4Mult(Mat4Rotate(QUAT_X), transform);
	} else {
		transform = Mat4Rotate(QUAT_X);
	}
	return csg.compile(transform);
}

/* model viewing tool */
function ModelViewer()
{
	//var mesh = BufferMesh(BOX_MESH);
	var model = 0;
	var models = [
		PlasmaGunMesh(),
		BlobMesh(),
	];
	var texture = MakeTexture(CheckeredTexture(), 256);
	gl.clearColor(0.0, 0.0, 1.0, 1.0);
	
	var mv = InputtingEntity({}, puid);
	var rotation = Quat();
	var wireframe = false;
	var t = 0;
	var zoom = 1;
	mv.update = function (dt)
	{
		t += dt;
		if (mv.mouseHit(M_LEFT)) {
			origin = mv.mousePosition();
		}
		if (mv.mouseDown(M_LEFT)) {
			var vector = mv.mousePosition();
			vector = [(vector[0] - origin[0])*3, 
					(origin[1] - vector[1])*3];
			rotation = QuatMult(rotation, QuatXYZ(0, vector[0], 0));
			rotation = QuatMult(QuatXYZ(vector[1], 0, 0), rotation);
			origin = mv.mousePosition();
		}
		if (mv.keyHit(K_W)) {
			wireframe = !wireframe;
		}
		if (mv.keyHit(K_LEFT)) model = (model+1)%models.length;
		if (mv.keyHit(K_RIGHT)) model = (model-1+models.length)%models.length;
		if (mv.keyDown(K_UP)) zoom *= 1 + dt;
		if (mv.keyDown(K_DOWN)) zoom *= 1 - dt;
	}
	
	gCamera = Camera(VEC_FORWARD);
	mv.render = function ()
	{
		var matrix = Mat4World([0, 0, 5], rotation);
		matrix = Mat4Mult(Mat4Scale(zoom), matrix);
		matrix = Mat4List(matrix);
		TEX_SHADER.enable(texture);
		DrawMesh(models[model], matrix, TEX_SHADER, wireframe);
	}
	
	entities.push(mv);
	
	startGame();
}
/* particles.js */
/* particle effects */
function ParticleGenerator() 
{
	var pg = {
		pos: [25, 1, 30],
		delay: 0.1,
		size: 1,
		range: 2,
		count: 25,
		color: [1, 1, 1, 1],
		velocity: VEC_UP,
		blending: [gl.SRC_ALPHA, gl.ONE]
	};
	var particles = [];
	
	pg.texture = GetParticleTexture();
	pg.mesh = BufferMesh(SQUARE_MESH);
	
	var t = 0;
	pg.update = function (dt) {
		pg.duration = pg.delay * pg.count;
		t += dt;
		
		// generate new particles
		if (t > pg.delay) {
			var particle = {life: 0};
			particle.pos = Vector3(Math.random(), Math.random(), Math.random());
			particle.pos = VecSub(particle.pos, [0.5, 0.5, 0.5]);
			if (pg.range.length)
				particle.pos = VecMult(particle.pos, pg.range);
			else
				particle.pos = VecScale(particle.pos, pg.range);
			particle.pos = VecAdd(particle.pos, pg.pos);
			particles.push(particle);
			
			if (particles.length > pg.count) {
				particles = particles.slice(particles.length - pg.count);
			}
			
			t -= pg.delay;
		}
		
		// update existing ones
		for (var p in particles) {
			var particle = particles[p];
			particle.pos = VecAdd(VecScale(pg.velocity, dt), particle.pos);
			particle.life += dt;
		}
	}
	
	pg.render = function () {
		TEX_SHADER.enable(pg.texture);
		gl.enable(gl.BLEND);
		gl.blendFunc(pg.blending[0], pg.blending[1]);
		gl.depthMask(false);
		var rot = gCamera.rot;
		for (var p in particles) 
		{
			var particle = particles[p];
			var matrix = Mat4World(particle.pos, rot);
			matrix = Mat4Mult(Mat4Scale(pg.size), matrix);
			var alpha = 1 - (2*abs(particle.life - pg.duration/2) / pg.duration);
			TEX_SHADER.setColor(pg.color[0], pg.color[1], pg.color[2], pg.color[3] * alpha);
			matrix = Mat4List(matrix);
			DrawMesh(pg.mesh, matrix, TEX_SHADER);
		}
		gl.depthMask(true);
		gl.disable(gl.BLEND);
		
		TEX_SHADER.setColor(1, 1, 1, 1);
	}
	
	pg.devRender = function () 
	{
		var verts = [];
		for (var i = 0; i < particles.length; i++) {
			verts = verts.concat(particles[i].pos);
		}
		var boundingBox = BBFromMesh(verts);
		DrawBoundingBox(boundingBox);
	}
	
	return pg;
}

function FireEffect(pos) 
{
	var effect = {rot: Quat()};
	var fire = ParticleGenerator();
	if (pos) {
		fire.pos = pos;
	}
	effect.pos = fire.pos;
	fire.size = 1.5;
	fire.pos[1] = 0;
	fire.range = 2.5;
	fire.velocity = [0.6, 4, 0];
	fire.color = [1, 0.25, 0.1, 2];
	fire.delay = 0.02;
	fire.count = 50;
	
	var smoke = ParticleGenerator();
	smoke.size = fire.size * 2;
	smoke.pos = VecAdd(fire.pos, VecScale(fire.velocity, 0.5));
	smoke.range = fire.range * 3;
	smoke.velocity = VecScale(fire.velocity, 0.25);
	smoke.color = [0.5, 0.5, 0.5, 1];
	smoke.delay = 0.5;
	smoke.count = 20;
	smoke.blending = [gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA];
	
	effect.update = function (dt) {
		fire.pos = effect.pos;
		smoke.pos = VecAdd(effect.pos, VecScale(fire.velocity, 0.5));
		
		fire.update(dt);
		smoke.update(dt);
	}
	
	effect.render = function () {
		fire.render();
		smoke.render();
	}
	
	effect.devRender = function () {
		fire.devRender(); smoke.devRender();
	}
	
	return effect;
}

function Explosion(pos) 
{
	var exp = {
		pos: [25, 0, 30],
		size: 1,
		range: 1,
		count: 50,
		duration: 1,
		color: [0.8, 0.3, 0.2, 1],
		velocity: [0, 0, 0],
		velocityRange: 15,
		force: [0, 0, 0],
		blending: [gl.SRC_ALPHA, gl.ONE]
	};	
	exp.texture = GetParticleTexture();
	exp.mesh = BufferMesh(SQUARE_MESH);
	
	if (pos) exp.pos = pos;
	
	var particles = [];
	// generate particles
	for (var i = 0; i < exp.count; i++) {
		var particle = {life: 0};
		particle.pos = Vector3(Math.random(), Math.random(), Math.random());
		particle.pos = VecSub(particle.pos, [0.5, 0.5, 0.5]);
		if (exp.range.length)
			particle.pos = VecMult(particle.pos, exp.range);
		else
			particle.pos = VecScale(particle.pos, exp.range);
		particle.pos = VecAdd(particle.pos, exp.pos);
		
		particle.vel = Vector3(Math.random(), Math.random(), Math.random());
		particle.vel = VecSub(particle.vel, [0.5, 0.5, 0.5]);
		if (exp.velocityRange.length)
			particle.vel = VecMult(particle.vel, exp.velocityRange);
		else
			particle.vel = VecScale(particle.vel, exp.velocityRange);
		particle.vel = VecAdd(particle.vel, exp.velocity);
		
		particles.push(particle);
	}
	
	var t = 0;
	exp.update = function (dt) {
		t += dt;
		if (t < exp.duration) {
			// update existing ones
			for (var p in particles) {
				var particle = particles[p];
				particle.pos = VecAdd(VecScale(particle.vel, dt), particle.pos);
				particle.vel = VecAdd(VecScale(exp.force, dt), particle.vel);
				particle.life += dt;
			}
		} else {
			// delete?
			removeEntity(exp);
		}
	}
	
	exp.render = function () {
		TEX_SHADER.enable(exp.texture);
		gl.enable(gl.BLEND);
		gl.blendFunc(exp.blending[0], exp.blending[1]);
		gl.depthMask(false);
		var rot = gCamera.rot;
		for (var p in particles) 
		{
			var particle = particles[p];
			var matrix = Mat4World(particle.pos, rot);
			matrix = Mat4Mult(Mat4Scale(exp.size), matrix);
			var alpha = 1 - particle.life/exp.duration;
			TEX_SHADER.setColor(exp.color[0], exp.color[1], exp.color[2], exp.color[3] * alpha);
			matrix = Mat4List(matrix);
			DrawMesh(exp.mesh, matrix, TEX_SHADER);
		}
		gl.depthMask(true);
		gl.disable(gl.BLEND);
		
		TEX_SHADER.setColor(1, 1, 1, 1);
	}
	
	exp.devRender = function () 
	{
		var verts = [];
		for (var i = 0; i < particles.length; i++) {
			verts = verts.concat(particles[i].pos);
		}
		var boundingBox = BBFromMesh(verts);
		DrawBoundingBox(boundingBox);
	}
	
	return exp;
}
/* physics.js */
/* physics.js - Basic 3D physics in JavaScript
 * Greg Tourville, December 2011 - March 2013
 * -------------------------------------------
 * TODO:
 *  - static/dynamic octree
 *  - arbitrary collision
 *  - angular kinematics
 *  - collision response
 *  - scene graph utilities
 *  - complete matrix library (math.js)
**/

var physObjects = [];
var staticTree;

// VECTOR MATH ////////////////////////////////////////
function MAX(a,b) { return a > b ? a : b; }
function MIN(a,b) { return a < b ? a : b; }
function MOD(a,b) { return a - Math.floor(a/b)*b; }

function Vector3(x, y, z)
{
	if (x === undefined) return [0.0, 0.0, 0.0];
	if (x.length) return [x[0], x[1], x[2]];
	return [x, y, z];
}

var VEC_RIGHT	= Vector3(1.0, 0.0, 0.0);
var VEC_LEFT	= Vector3(-1.0,0.0, 0.0);
var VEC_UP		= Vector3(0.0, 1.0, 0.0);
var VEC_DOWN	= Vector3(0.0,-1.0, 0.0);
var VEC_FORWARD = Vector3(0.0, 0.0, 1.0);
var VEC_BACKWARD= Vector3(0.0, 0.0,-1.0);

function VecCopy(v)
{
	return [v[0], v[1], v[2]];
}

function VecAdd(a, b, c)
{
	return [a[0]+b[0]+c[0], a[1]+b[1]+c[1], a[2]+b[2]+c[2]];
}
	
function VecAdd(a, b)
{
	return [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
}

function VecSub(a, b)
{
	return [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
}

function VecScale(v, s)
{
	return [v[0]*s, v[1]*s, v[2]*s];
}

function VecNormalize(v)
{
	var denom = 1.0/Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
	return [v[0]*denom, v[1]*denom, v[2]*denom];	
}

function VecLength(v)
{
	return Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
}

function VecLengthSqr(v)
{
	return (v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
}

function VecDot(a, b)
{
	return (a[0]*b[0] + a[1]*b[1] + a[2]*b[2]);
}

function VecCross(a, b)
{
	return [a[1] * b[2] - a[2] * b[1],
			a[2] * b[0] - a[0] * b[2],
			a[0] * b[1] - a[1] * b[0]];
}

function VecMult(a, b)
{
	return [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
}

function VecRotate(v, q)
{
	return (Mat4TransformPoint(v, Mat4World(Vector3(), q)));
}

// QUATERNION MATH ////////////////////////////////////

function Quat(w, x, y, z)
{
	if (w === undefined)
		return {w: 1.0, x: 0.0, y: 0.0, z: 0.0};
	else
		return {w: w, x: x, y: y, z: z};
}

function QuatInverse(q) 
{
	var d = q.w*q.w + q.x*q.x + q.y*q.y + q.z*q.z;
	return {w: q.w/d, x: -q.x/d, y: -q.y/d, z: -q.z/d};
}

function QuatFromVectors(a, b) 
{
	var xyz = VecCross(a, b);
	var w = Math.sqrt(VecLengthSqr(a) * VecLengthSqr(b)) + VecDot(a, b);
	if (VecLengthSqr(xyz) == 0 && w == 0)
		return Quat();
	//if (abs(w) < 0.0001) w = 1;
	return Quat(w, xyz[0], xyz[1], xyz[2]);
}

function QuatNormalize(q)
{
	var m = Math.sqrt(q.w*q.w + q.x*q.x + q.y*q.y + q.z*q.z);
	return {w: q.w/m, x: q.x/m, y: q.y/m, z: q.z/m};
}

function QuatMult(a, b)
{
	return {
		w: a.w * b.w -
			a.x * b.x -
			a.y * b.y -
			a.z * b.z,
		x: a.w * b.x +
			a.x * b.w +
			a.y * b.z -
			a.z * b.y,
		y: a.w * b.y -
			a.x * b.z +
			a.y * b.w +
			a.z * b.x,
		z: a.w * b.z +
			a.x * b.y -
			a.y * b.x + 
			a.z * b.w
	};
}

function QuatXYZ(pitch, yaw, roll)
{
	var qx = Quat(Math.cos(pitch/2), Math.sin(pitch/2), 0, 0);
	var qy = Quat(Math.cos(yaw/2), 0, Math.sin(yaw/2), 0);
	var qz = Quat(Math.cos(roll/2), 0, 0, Math.sin(roll/2));
	return QuatMult(QuatMult(qx, qy), qz);
}

var QUAT_X	=	QuatXYZ(Math.PI/2, 0, 0);
var QUAT_Y	=	QuatXYZ(0, Math.PI/2, 0);
var QUAT_Z	=	QuatXYZ(0, 0, Math.PI/2);

var QUAT_EPSILON = 0.00000001;
function QuatSlerp(start, end, alpha)
{
	var temp;
	var cosOmega = start.x * end.x + start.y * end.y +
					start.z * end.z + start.w * end.w;
	
	if (cosOmega < 0.0)
		{
		cosOmega *= -1.0;
		temp = {x: -start.x, y: -start.y, z: -start.z, w: -start.w};
		}
	else
		{
		temp = {x: start.x, y: start.y, z: start.z, w: start.w};
		}

	var startFactor, endFactor;
	// Determine multiplication factor to apply to start and end quaternions
	if ((1.0 - cosOmega) > QUAT_EPSILON)
		{
		// Normal case
		var omega = Math.acos(cosOmega);
		var sinOmega = Math.sin(omega);

		startFactor = (Math.sin((1.0 - alpha) * omega) / sinOmega);
		endFactor   = (Math.sin(alpha * omega) / sinOmega);
		}
	else
		{
		// Special case: start and end quaterions are close (just linear interpretation)
		startFactor = 1.0 - alpha;
		endFactor   = alpha;
		}
	
	return {
		x: startFactor * temp.x + endFactor * end.x,
		y: startFactor * temp.y + endFactor * end.y,
		z: startFactor * temp.z + endFactor * end.z,
		w: startFactor * temp.w + endFactor * end.w
	};
}

// MATRIX MATH ////////////////////////////////////////

function Matrix4()
{
	return [
		[1.0, 0.0, 0.0, 0.0], 
		[0.0, 1.0, 0.0, 0.0], 
		[0.0, 0.0, 1.0, 0.0], 
		[0.0, 0.0, 0.0, 1.0]
	];
}


function Mat4List(m)
{
	return [m[0][0], m[0][1], m[0][2], m[0][3],
			m[1][0], m[1][1], m[1][2], m[1][3],
			m[2][0], m[2][1], m[2][2], m[2][3],
			m[3][0], m[3][1], m[3][2], m[3][3]];
}

function Mat4Scale(x, y, z)
{
	if (y === undefined) { y = x; z = x; }
	if (x.length) {x = x[0]; y = y[1]; z = z[2]}
	return [
		[  x, 0.0, 0.0, 0.0], 
		[0.0,   y, 0.0, 0.0], 
		[0.0, 0.0,   z, 0.0], 
		[0.0, 0.0, 0.0, 1.0]
	];
}

function Mat4Translate(x, y, z)
{
	var pos;
	if (y === undefined) pos = x;
	else pos = [x, y, z];
	return [
		[1.0, 0.0, 0.0, 0.0], 
		[0.0, 1.0, 0.0, 0.0], 
		[0.0, 0.0, 1.0, 0.0], 
		[pos[0],pos[1],pos[2], 1.0]
	];
}

function Mat4FromVectors(right, up, forward)
{
	return [
		[right[0], right[1], right[2], 0.0],
		[up[0], up[1], up[2], 0.0],
		[foward[0], forward[1], forward[2], 0.0],
		[0.0, 0.0, 0.0, 1.0]
	];
}

function Mat4World(pos, rot)
{
   // Precalcs to avoid duplication
	var x2  = rot.x * 2.0;
	var y2  = rot.y * 2.0;
	var z2  = rot.z * 2.0;
	
	var wx2 = rot.w * x2;
	var wy2 = rot.w * y2;
	var wz2 = rot.w * z2;
	
	var xx2 = rot.x * x2;
	var xy2 = rot.x * y2;
	var xz2 = rot.x * z2;
	
	var yy2 = rot.y * y2;
	var yz2 = rot.y * z2;
	var zz2 = rot.z * z2;
	
	// Set the matrix
	var m = [[], [], [], []];
	m[0][0] = 1.0 - (yy2 + zz2);
	m[0][1] =		 xy2 + wz2;
	m[0][2] =		 xz2 - wy2;
	m[0][3] = 0.0;
	
	m[1][0] =		 xy2 - wz2;
	m[1][1] = 1.0 - (xx2 + zz2);
	m[1][2] =		 yz2 + wx2;
	m[1][3] = 0.0;
	
	m[2][0] =		 xz2 + wy2;
	m[2][1] =		 yz2 - wx2;
	m[2][2] = 1.0 - (xx2 + yy2);
	m[2][3] = 0.0;
	
	m[3][0] = pos[0];
	m[3][1] = pos[1];
	m[3][2] = pos[2];
	m[3][3] = 1.0;
	
	return m;
}

function Mat4Rotate(rot)
{
   // Precalcs to avoid duplication
	var x2  = rot.x * 2.0;
	var y2  = rot.y * 2.0;
	var z2  = rot.z * 2.0;
	
	var wx2 = rot.w * x2;
	var wy2 = rot.w * y2;
	var wz2 = rot.w * z2;
	
	var xx2 = rot.x * x2;
	var xy2 = rot.x * y2;
	var xz2 = rot.x * z2;
	
	var yy2 = rot.y * y2;
	var yz2 = rot.y * z2;
	var zz2 = rot.z * z2;
	
	// Set the matrix
	var m = [[], [], [], []];
	m[0][0] = 1.0 - (yy2 + zz2);
	m[0][1] =		 xy2 + wz2;
	m[0][2] =		 xz2 - wy2;
	m[0][3] = 0.0;
	
	m[1][0] =		 xy2 - wz2;
	m[1][1] = 1.0 - (xx2 + zz2);
	m[1][2] =		 yz2 + wx2;
	m[1][3] = 0.0;
	
	m[2][0] =		 xz2 + wy2;
	m[2][1] =		 yz2 - wx2;
	m[2][2] = 1.0 - (xx2 + yy2);
	m[2][3] = 0.0;
	
	m[3][0] = 0.0;
	m[3][1] = 0.0;
	m[3][2] = 0.0;
	m[3][3] = 1.0;
	
	return m;
}

function Mat4TransformPoints(points, mtx)
{
	var transformed = [];
	for (var i = 0; i < points.length; i += 3)
	{
		p = Mat4TransformPoint([points[i], points[i+1], points[i+2]], mtx);
		transformed.push(p[0]);
		transformed.push(p[1]);
		transformed.push(p[2]);
	}
	return transformed;
}

function Mat4TransformPoint(point, mtx)
{
	return [
		point[0] * mtx[0][0] +
		point[1] * mtx[1][0] +
		point[2] * mtx[2][0] +
		mtx[3][0],
		point[0] * mtx[0][1] +
		point[1] * mtx[1][1] +
		point[2] * mtx[2][1] +
		mtx[3][1],
		point[0] * mtx[0][2] +
		point[1] * mtx[1][2] +
		point[2] * mtx[2][2] +
		mtx[3][2]
	];
}


function Mat3TransformPoints(points, mtx)
{
	var transformed = [];
	for (var i = 0; i < points.length; i += 3)
	{
		p = Mat3TransformPoint([points[i], points[i+1], points[i+2]], mtx);
		transformed.push(p[0]);
		transformed.push(p[1]);
		transformed.push(p[2]);
	}
	return transformed;
}

function Mat3TransformPoint(point, mtx)
{
	return [
		point[0] * mtx[0][0] +
		point[1] * mtx[1][0] +
		point[2] * mtx[2][0],
		point[0] * mtx[0][1] +
		point[1] * mtx[1][1] +
		point[2] * mtx[2][1],
		point[0] * mtx[0][2] +
		point[1] * mtx[1][2] +
		point[2] * mtx[2][2]
	];
}

function Mat4Mult(a, b)
{
	var c = [];
	for (var i = 0; i < 4; i++)
	{
		c.push([]);
		for (var j = 0; j < 4; j++)
		{
			c[i].push(0);
			for (var k = 0; k < 4; k++)
				c[i][j] += a[i][k] * b[k][j];
		}
	}
	return c;
}

function Mat4Determinant(a) 
{
	return a[1][1]*a[2][2]*a[3][3]*a[4][4] + a[1][1]*a[2][3]*a[3][4]*a[4][2]
		+ a[1][1]*a[2][4]*a[3][2]*a[4][3] + a[1][2]*a[2][1]*a[3][4]*a[4][3]
		+ a[1][2]*a[2][3]*a[3][1]*a[4][4] + a[1][2]*a[2][4]*a[3][3]*a[4][1]
		+ a[1][3]*a[2][1]*a[3][2]*a[4][4] + a[1][3]*a[2][2]*a[3][4]*a[4][1]
		+ a[1][3]*a[2][4]*a[3][1]*a[4][2] + a[1][4]*a[2][1]*a[3][3]*a[4][2]
		+ a[1][4]*a[2][2]*a[3][1]*a[4][3] + a[1][4]*a[2][3]*a[3][2]*a[4][1]
		- a[1][1]*a[2][2]*a[3][4]*a[4][3] - a[1][1]*a[2][3]*a[3][2]*a[4][4] 
		- a[1][1]*a[2][4]*a[3][3]*a[4][2] - a[1][2]*a[2][1]*a[3][3]*a[4][4] 
		- a[1][2]*a[2][3]*a[3][4]*a[4][1] - a[1][2]*a[2][4]*a[3][1]*a[4][3] 
		- a[1][3]*a[2][1]*a[3][4]*a[4][2] - a[1][3]*a[2][2]*a[3][1]*a[4][4] 
		- a[1][3]*a[2][4]*a[3][2]*a[4][1] - a[1][4]*a[2][1]*a[3][2]*a[4][3] 
		- a[1][4]*a[2][2]*a[3][3]*a[4][1] - a[1][4]*a[2][3]*a[3][1]*a[4][2];
}

function Mat4Transpose(m) 
{
	return [
		[m[0][0], m[1][0], m[2][0], m[3][0]], 
		[m[0][1], m[1][1], m[2][1], m[3][1]], 
		[m[0][2], m[1][2], m[2][2], m[3][2]], 
		[m[0][3], m[1][3], m[2][3], m[3][3]]
	];
}

function Mat4Inverse(a) 
{
	var det = Mat4Determinant(a);
}

// BOUNDING BOX MATH ////////////////////////////////

function BBCopy(bb)
{
	return {
		max: [bb.max[0], bb.max[1], bb.max[2]],
		min: [bb.min[0], bb.min[1], bb.min[2]]
	};
}

function BBJoin(bb1, bb2)
{
	return {
		max: [MAX(bb1.max[0], bb2.max[0]),
				MAX(bb1.max[1], bb2.max[1]),
				MAX(bb1.max[2], bb2.max[2])],
		min: [MIN(bb1.min[0], bb2.min[0]),
				MIN(bb1.min[1], bb2.min[1]),
				MIN(bb1.min[2], bb2.min[2])]
	};
}

function BBAddPoint(bb, point)
{
	if (point[0] < bb.min[0]) bb.min[0] = point[0];
	if (point[1] < bb.min[1]) bb.min[1] = point[1];
	if (point[2] < bb.min[2]) bb.min[2] = point[2];
	if (point[0] > bb.max[0]) bb.max[0] = point[0];
	if (point[1] > bb.max[1]) bb.max[1] = point[1];
	if (point[2] > bb.max[2]) bb.max[2] = point[2];
}

function BBTestPoint(bb, point)
{
	if (point[0] < bb.min[0]) return false;
	if (point[1] < bb.min[1]) return false;
	if (point[2] < bb.min[2]) return false;
	if (point[0] > bb.max[0]) return false;
	if (point[1] > bb.max[1]) return false;
	if (point[2] > bb.max[2]) return false;
	return true;
}

function BBTestBB(bb1, bb2)
{
	if (bb1.min[0] > bb2.max[0]) return false;
	if (bb1.min[1] > bb2.max[1]) return false;
	if (bb1.min[2] > bb2.max[2]) return false;
	if (bb1.max[0] < bb2.min[0]) return false;
	if (bb1.max[1] < bb2.min[1]) return false;
	if (bb1.max[2] < bb2.min[2]) return false;
	return true;
}

function BBTestRay(box, origin, dir, t0, t1)
{
	var tmin, tmax, tymin, tymax, tzmin, tzmax;
	
	if (dir[0] >= 0.0)
	{
		tmin = (box.min[0] - origin[0]) / dir[0];
		tmax = (box.max[0] - origin[0]) / dir[0];
	}
	else
	{
		tmin = (box.max[0] - origin[0]) / dir[0];
		tmax = (box.min[0] - origin[0]) / dir[0];
	}
	if (dir[1] >= 0.0)
	{
		tymin = (box.min[1] - origin[1]) / dir[1];
		tymax = (box.max[1] - origin[1]) / dir[1];
	}
	else
	{
		tymin = (box.max[1] - origin[1]) / dir[1];
		tymax = (box.min[1] - origin[1]) / dir[1];
	}
	
	if ((tmin > tymax) || (tymin > tmax))
		return false;
	
	if (tymin > tmin) tmin = tymin;
	if (tymax < tmax) tmax = tymax;

	if (dir[2] >= 0.0)
	{
		tzmin = (box.min[2] - origin[2]) / dir[2];
		tzmax = (box.max[2] - origin[2]) / dir[2];
	}
	else
	{
		tzmin = (box.max[2] - origin[2]) / dir[2];
		tzmax = (box.min[2] - origin[2]) / dir[2];
	}
	
	if ( (tmin > tzmax) || (tzmin > tmax) )
		return false;
	
	if (tzmin > tmin) tmin = tzmin;
	if (tzmax < tmax) tmax = tzmax;
	
	return ((tmin < t1) && (tmax > t0));
}

function BBFromMesh(verts)
{
	var bb;
	for (var i = 0; i < verts.length; i += 3)
	{
		if (bb === undefined) 
			bb = {min: [verts[i], verts[i+1], verts[i+2]], 
				  max: [verts[i], verts[i+1], verts[i+2]]};
		else 
			BBAddPoint(bb, [verts[i], verts[i+1], verts[i+2]]);
	}
	return bb;
}

function DrawBoundingBox(bb)
{
	// draw bounding box
	var matrix = Mat4Translate(bb.min);
	matrix = Mat4Mult(Mat4Scale(BBSize(bb)), matrix);
	DrawMesh(BOX_MESH, Mat4List(matrix), STD_SHADER, true);
}

function BBSize(bb)
{
	return VecSub(bb.max, bb.min);
}

function BBCenter(bb)
{
	return [(bb.max[0]+bb.min[0])/2,
			(bb.max[1]+bb.min[1])/2,
			(bb.max[2]+bb.min[2])/2];
}

function BBContains(big, small)
{
	return (big.min[0] < small.min[0] &&
			big.min[1] < small.min[1] &&
			big.min[2] < small.min[2] &&
			big.max[0] > small.max[0] &&
			big.max[1] > small.max[1] &&
			big.max[2] > small.max[2]);
}

var BBIntersect = BBTestBB;

function BBCut(bb, axis)
{
	var center = BBCenter(bb);
	var x = axis % 2;
	var y = Math.floor(axis/2) % 2;
	var z = Math.floor(axis/4) % 2;
	return {
		min: [x ? center[0] : bb.min[0],
				y ? center[1] : bb.min[1],
				z ? center[2] : bb.min[2]],
		max: [x ? bb.max[0] : center[0],
				y ? bb.max[1] : center[1],
				z ? bb.max[2] : center[2]]
	}
}
	
// transform from model space to an AABB
function BBTransform(bb, m)	
{
	var outMin = [m[3][0], m[3][1], m[3][2]];
	var outMax = [m[3][0], m[3][1], m[3][2]];
	var inMin = [bb.min[0], bb.min[1], bb.min[2]];
	var inMax = [bb.max[0], bb.max[1], bb.max[2]];
	
	var k, l;
	for (var i = 0; i < 3; i++)
	{
		for (var j = 0; j < 3; j++)
		{
			k = m[j][i] * inMin[j];
			l = m[j][i] * inMax[j];
			if (k < l)
			{
				outMin[i] += k;
				outMax[i] += l;
			}
			else
			{
				outMin[i] += l;
				outMax[i] += k;
			}
		}
	}
	
	return {
		min: [outMin[0], outMin[1], outMin[2]],
		max: [outMax[0], outMax[1], outMax[2]]
	};
}

function Prune(vertices, bb)
{
	var inside = [];
	var p;
	for (var i = 0; i < vertices.length; i += 9)
	{
		p = [];
		for (var j = 0; j < 9; j++)
			p.push(vertices[i+j]);
		var check = BBFromMesh(p);
		if (BBTestBB(bb, check))
		{
			inside = inside.concat(p);
		}
	}
	
	return inside;
}

function Octree(vertices, rootBB)
{
	if (vertices.length/9 < 30) {
		return {
			getVertices: function (bb)
			{
				return vertices;
			}
		};
	}
	
	var sub = [];
	for (var i = 0; i < 8; i++)
	{
		var bb = BBCut(rootBB, i);
		sub[i] = Octree(Prune(vertices, bb), bb);
		sub[i].bb = bb;
	}
	
	return {
		getVertices: function (bb)
		{
			if (BBContains(bb, rootBB))
				return vertices;
			
			var v = [];
			for (var axis = 0; axis < 8; axis++)
			{
				if (BBTestBB(sub[axis].bb, bb))
					v = v.concat(sub[axis].getVertices(bb));
			}
			return v;
		}
	}
}

// SIMULATION CODE /////////////////////////////////////
var SPHEROID_MESH;
function PhysicalEntity(e, mesh, dynamic)
{
	// linear kinematics
	e.mass	= 5.0;
	e.force	= Vector3();
	e.pos	= Vector3();
	e.vel	= Vector3();
	e.acl	= Vector3();
	e.friction = 5.0;
	e.dynamic = dynamic;
	
	// rotational kinematics
	// e.moment = Matrix4();
	e.torque = Vector3();
	e.rot = Quat();
	e.rotVel = Quat();
	e.rotAcl = Quat();
	
	// collision
	e.matrix = Mat4World(e.pos, e.rot);
	if (mesh)
	{
		if (mesh.count === undefined || mesh.count <= 0) {
			console.log("Warning: Using empty mesh for collision.");
		}
		e.mesh	= mesh;
		e.bb	= BBFromMesh(mesh.vertices);
		e.aabb	= BBTransform(e.bb, e.matrix);
		if (dynamic)
		{	// radius + center of mass
			e.radius = VecDot(BBSize(e.bb), Vector3(1.0/6.0, 1.0/6.0, 1.0/6.0));
			e.center = BBCenter(e.bb);
		}
		else
		{	// store an octree
			e.tree = Octree(mesh.vertices, e.bb);
		}
	}
	
	if (SPHEROID_MESH === undefined) {
		SPHEROID_MESH = Math2MeshSphere(function() {return 1;}, 6, 6);
		BufferMesh(SPHEROID_MESH);
		BufferMesh(BOX_MESH);
	}
	e.devRender = function () {
		var matrix;
		
		// draw spheroid
		if (e.center && e.radius !== undefined) {
			matrix = Mat4Mult(Mat4Translate(e.center), e.matrix);
			//matrix = e.matrix;
			matrix = Mat4Mult(Mat4Scale(e.radius), matrix);
			DrawMesh(SPHEROID_MESH, Mat4List(matrix), STD_SHADER, true);
		}
		
		// draw bounding box
		matrix = Mat4Mult(Mat4Translate(e.bb.min), e.matrix);
		matrix = Mat4Mult(Mat4Scale(BBSize(e.bb)), matrix);
		DrawMesh(BOX_MESH, Mat4List(matrix), STD_SHADER, true);
		
		// draw AABB
		matrix = Mat4Translate(e.aabb.min);
		matrix = Mat4Mult(Mat4Scale(BBSize(e.aabb)), matrix);
		DrawMesh(BOX_MESH, Mat4List(matrix), STD_SHADER, true);
	}
	
	// manage object list
	var destroyE = e.destroy;
	e.destroy = function () {
		var idx = physObjects.indexOf(e);
		if (idx != -1) 
			physObjects.splice(idx, 1);
		
		if (destroyE) destroyE();
	}
	physObjects.push(e);
	
	return e;
}

function Physics(dt)
{
	var list = [];
	// update phys objects
	for (var idx in physObjects)
	{
		// integrate motion
		var e = physObjects[idx];
		//if (e.dynamic || e.old_pos != e.pos)
		{   
			e.old_pos = e.pos;
			e.pos = VecAdd(e.pos, VecScale(e.vel, dt)/*, VecScale(e.acl, dt * dt / 2)*/);
			e.vel = VecAdd(e.vel, VecScale(e.acl, dt));
			e.acl = VecAdd(VecScale(e.force, 1.0 / e.mass),
						   VecScale(e.vel, -1.0 * e.friction));
			
			// handle rotation
			e.rot = QuatMult(e.rot, QuatSlerp(Quat(), e.rotVel, dt));
			
			// rebuild matrices / bounding boxes
			e.pathAABB = BBCopy(e.aabb);
			e.matrix = Mat4World(e.pos, e.rot);
			//if (e.radius)
			//{
			//	e.aabb = {min: VecSub(e.center, Vector3(e.radius, e.radius, e.radius)),
			//			max: VecAdd(e.center, Vector3(e.radius, e.radius, e.radius))};
			//	e.aabb = BBTransform(e.aabb, e.matrix);
			//} else {
			e.aabb = BBTransform(e.bb, e.matrix);
			//}
			
			e.pathAABB = BBJoin(e.pathAABB, e.aabb);
			
			// check for collision [O(n^2)]
			if (e.mesh !== undefined || e.radius !== undefined)
			//if (e.dynamic)
			{
				var nearby = list;
				for (var o in nearby)
				{
					if (BBTestBB(e.pathAABB, nearby[o].aabb))
					{
						checkCollision(e, nearby[o]);
					}
				}
				
				// add the object to the list
				list.push(e);
			}
		}
	}
}

// COLLISION CODE ////////////////////////////////////

function checkCollision(objA, objB)
{
	var check;
	if (objA.radius !== undefined)
	{
		if (objB.radius !== undefined)
			check = sphereSphereCollision;
		else if (objB.mesh !== undefined)
			check = sphereGeometryCollision;
	}
	else if (objA.mesh !== undefined)
	{
		if (objB.radius !== undefined)
			check = geometrySphereCollision;
		else if (objB.mesh !== undefined)
			check = geometryGeometryCollision;
	}
	
	var collision = check(objA, objB);
	if (collision.hit)
	{
		if (objA.collision) objA.collision(objB, collision);
		if (objB.collision) objB.collision(objA, collision);
	}
}

function sphereSphereCollision(objA, objB)
{
	var posA = Mat4TransformPoint(objA.center, objA.matrix);
	var posB = Mat4TransformPoint(objB.center, objB.matrix);
	//var posA = objA.pos;
	//var posB = objB.pos;
	//var posA = VecAdd(objA.pos, objA.center);
	//var posB = VecAdd(objB.pos, objB.center);
	var vector = VecSub(posA, posB);
	var length2 = VecLengthSqr(vector);
	var radius  = objA.radius + objB.radius;
	
	if (length2 < radius * radius)
	{
		// objB.mass / (objA.mass + objB.mass)
		var length = Math.sqrt(length2);
		var delta = VecScale(vector, (radius - length) * 0.5);
		objA.pos = VecAdd(objA.pos, delta);
		objB.pos = VecSub(objB.pos, delta);
		//objA.vel = VecAdd(objA.vel, VecScale(vector, VecDot(objA.vel, vector)));
		//objB.vel = VecAdd(objB.vel, VecScale(vector, VecDot(objB.vel, vector)));
		var collision = {hit: true, normal: VecScale(vector, 1/length)};
		collision.contact = VecAdd(objB.pos, VecScale(collision.normal, objB.radius));
		return collision;
	}
	return {hit: false};
}

// COLLISION MODELS:
//   VERTEX collision	-	quadtree in local space, to retrieve vertex subsets
//   SPHERE collision	-	center of mass + radius
//   BOX collision		-	bounding box + matrix
//   AABB collision		-	bounding box

function geometryGeometryCollision(objA, objB)
{
	return false;
}

function geometrySphereCollision(geom, sphere)
{
	return sphereGeometryCollision(sphere, geom);
}

function sphereGeometryCollision(sphere, geom)
{
	var centerOffset = VecSub(Mat4TransformPoint(sphere.center, sphere.matrix),
		Mat4TransformPoint(Vector3(), sphere.matrix));
	var pos = VecAdd(sphere.pos, centerOffset);
	var opos = VecAdd(sphere.old_pos, centerOffset);
	var hit = false;
	var collision = {contact: [], normal: []};
	
	var inverseMatrix = Mat4Mult(Mat4Translate(VecScale(geom.pos, -1)),
								Mat4World(Vector3(), QuatInverse(geom.rot)));
	var localBounds = BBTransform(sphere.pathAABB, inverseMatrix);
	//var localBounds = {min: VecSub(sphere.aabb.min, geom.pos),
	//				max: VecSub(sphere.aabb.max, geom.pos)};
	
	var vertices = geom.tree.getVertices(localBounds);
	for (var j = 0; j < vertices.length; j += 9)
	{
		var tri = [[vertices[j],   vertices[j+1], vertices[j+2]],
				   [vertices[j+3], vertices[j+4], vertices[j+5]],
				   [vertices[j+6], vertices[j+7], vertices[j+8]]];
		tri[0] = Mat4TransformPoint(tri[0], geom.matrix);
		tri[1] = Mat4TransformPoint(tri[1], geom.matrix);
		tri[2] = Mat4TransformPoint(tri[2], geom.matrix);
		//tri[0] = VecAdd(geom.pos, tri[0]);
		//tri[1] = VecAdd(geom.pos, tri[1]);
		//tri[2] = VecAdd(geom.pos, tri[2]);
		var normal   = VecNormalize( VecCross(VecSub(tri[1], tri[0]), VecSub(tri[2], tri[0])) );
		var constant = -VecDot(tri[1], normal);
		
		// check interior points
		var sign = SignedDistToPlane(opos, normal, constant);
		var dist = SignedDistToPlane(pos, normal, constant);
		if (Math.abs(dist) < sphere.radius || (dist * sign) < 0.0)
		{
			var contact = VecAdd(pos, VecScale(normal, -dist));
			if (dist * sign < 0.0)
			{   // trace the segment it traveled
				contact = VecSub(pos, opos);
				contact = VecAdd(opos, VecScale(contact, sign/(sign-dist)));
			}
			sign = sign < 0 ? -1 : 1;
			
			if (PointIsInTriangle(contact, tri))
			{
				// correct position and velocity
				pos = VecAdd(contact, VecScale(normal, sign * sphere.radius));
				sphere.vel = VecSub(sphere.vel, VecScale(normal, VecDot(sphere.vel, normal)));
				collision.contact = contact;
				collision.normal = normal;
				hit = true;
			}
			else
			{
				// check line segments
				for (var i = 0; i < 3; i++)
				{
					contact  = ClosestPointOnLine(contact, tri[i], tri[(i+1)%3]);
					var diff = VecSub(pos, contact);
					var dist = VecLength(diff);
					if (dist < sphere.radius)
					{
						diff = VecScale(diff, sphere.radius/dist);
						pos = VecAdd(contact, diff);
						collision.contact = contact;
						collision.normal = VecScale(diff, 1/sphere.radius);
						hit = true;
					}
				}
			}
			
		}
	}
	
	if (hit) {
		sphere.pos = VecSub(pos, centerOffset);
	}
	
	collision.hit = hit;
	return collision;
}

// MATH HELPERS ////////////////////////////////////////

function SignedDistToPlane(point, normal, planeConst)
{
	return (VecDot(point, normal) + planeConst);
}

function PointIsInTriangle(point, tri)
{
	// calculate barycentric coordinates to check
	var v0 = VecSub(tri[2], tri[0]);
	var v1 = VecSub(tri[1], tri[0]);
	var v2 = VecSub(point, tri[0]);
	
	var dot00 = VecDot(v0, v0);
	var dot01 = VecDot(v0, v1);
	var dot02 = VecDot(v0, v2);
	var dot11 = VecDot(v1, v1);
	var dot12 = VecDot(v1, v2);
	
	var denom = 1.0 / (dot00 * dot11 - dot01 * dot01);
	var u = (dot11 * dot02 - dot01 * dot12) * denom;
	var v = (dot00 * dot12 - dot01 * dot02) * denom;
	
	return (u >= 0) && (v >= 0) && (u + v < 1);

}

function ClosestPointOnLine(point, lineA, lineB)
{
	var c = VecSub(point, lineA);
	var v = VecSub(lineB, lineA);
	var d = VecLength(v);
	var t = VecDot(v, c) / d;
	
	if (t < 0) return (lineA);
	if (t > d) return (lineB);
	
	return VecAdd(lineA, VecScale(v, t / d));
}
/* shaders.js */
// SHADERS: //////////////////////////////////////////


/* standard */
var STD_PIXEL_SHADER = 
"#ifdef GL_ES\n" +
"precision highp float;\n" +
"#endif\n" +
"varying vec4 vColor;\n" +
"varying vec3 vLighting;\n"+
"void main(void)\n" +
"{\n" +
"gl_FragColor = ((dot(vLighting, vLighting) * 0.5) + (dot(vLighting, vec3(-0.4, 0.4, -0.4)) * 0.7)) * vColor;\n" +
"gl_FragColor = vec4(vec3(gl_FragColor), 1.0);\n" + 
"}\n";

var STD_VERT_SHADER = 
"attribute vec3 aVertPos;\n" +
"attribute vec3 aVertNorm;\n" +
"attribute vec4 aVertColor;\n" +
"uniform mat4 uWMatrix;\n" +
"uniform mat4 uVMatrix;\n" +
"uniform mat4 uPMatrix;\n" +
"uniform vec4 uColor;\n" +
"varying vec4 vColor;\n" +
"varying vec3 vLighting;\n" +
"void main(void) {\n" +
"gl_Position = uPMatrix * uVMatrix * uWMatrix * vec4(aVertPos, 1.0);\n" +
"vLighting = normalize(aVertPos);\n" +
"vColor = uColor;\n" +
"}\n";

/* texture */
var TEX_PIXEL_SHADER = 
"#ifdef GL_ES\n" +
"precision highp float;\n" +
"#endif\n" +
"uniform sampler2D uTexture;\n" +
"varying vec2 vTexCoord;\n" +
"varying vec4 vColor;\n" +
"void main(void)\n" +
"{\n" +
"gl_FragColor = texture2D(uTexture, vTexCoord) * vColor;\n" + 
"}\n";

var TEX_VERT_SHADER = 
"attribute vec3 aVertPos;\n" +
"attribute vec2 aTexCoord;\n" +
"uniform mat4 uWMatrix;\n" +
"uniform mat4 uVMatrix;\n" +
"uniform mat4 uPMatrix;\n" +
"uniform vec4 uColor;\n" +
"varying vec2 vTexCoord;\n" +
"varying vec4 vColor;\n" +
"void main(void) {\n" +
"gl_Position = uPMatrix * uVMatrix * uWMatrix * vec4(aVertPos, 1.0);\n" +
"vTexCoord = aTexCoord;\n" +
"vColor = uColor;\n" +
"}\n";

/* animated */
var ANIMATION_PIXEL_SHADER = 
"#ifdef GL_ES\n" +
"precision highp float;\n" +
"#endif\n" +
"uniform sampler2D uTexture;\n" +
"varying vec2 vTexCoord;\n" +
"varying vec4 vColor;\n" +
"void main(void)\n" +
"{\n" +
"gl_FragColor = texture2D(uTexture, vTexCoord) * vColor;\n" + 
"}\n";

var ANIMATION_VERT_SHADER = 
"attribute vec3 aVertPosA;\n" +
"attribute vec3 aVertPosB;\n" +
"attribute vec2 aTexCoord;\n" +
"uniform mat4 uWMatrix;\n" +
"uniform mat4 uVMatrix;\n" +
"uniform mat4 uPMatrix;\n" +
"uniform float uAnimationBlend;\n" +
"uniform vec4 uColor;\n" +
"varying vec2 vTexCoord;\n" +
"varying vec4 vColor;\n" +
"void main(void) {\n" +
"gl_Position = vec4(aVertPosB * uAnimationBlend + aVertPosA * (1.0 - uAnimationBlend), 1.0);\n" +
"gl_Position = uPMatrix * uVMatrix * uWMatrix * gl_Position;\n" +
"vTexCoord = aTexCoord;\n" +
"vColor = uColor;\n" +
"}\n";

var gCurrentShader;

function StandardShader()
{
	var pShader = gl.createShader(gl.FRAGMENT_SHADER);
	var vShader = gl.createShader(gl.VERTEX_SHADER);
	
	gl.shaderSource(pShader, STD_PIXEL_SHADER);
	gl.compileShader(pShader);
	if (!gl.getShaderParameter(pShader, gl.COMPILE_STATUS))
	{
		alert(gl.getShaderInfoLog(pShader));
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
	gl.attachShader(shader, pShader);
	gl.attachShader(shader, vShader);
	gl.linkProgram(shader);
	if (!gl.getProgramParameter(shader, gl.LINK_STATUS))
	{
		alert("Error: Could not initialize standard shader.");
		return;
	}
	
	gl.useProgram(shader);
	
	shader.vertPos = gl.getAttribLocation(shader, "aVertPos");
	shader.wMatrix = gl.getUniformLocation(shader, "uWMatrix");	
	shader.vMatrix = gl.getUniformLocation(shader, "uVMatrix");	
	shader.pMatrix = gl.getUniformLocation(shader, "uPMatrix");
	
	shader.color   = gl.getUniformLocation(shader, "uColor");
	shader.setColor = function(r, g, b, a)
	{
		if (r[0] !== undefined)
		{
			g = r[1]; b = r[2];
			if (r[3] !== undefined)
				a = r[3];
			r = r[0];
		}
		if (a === undefined)
			a = 1.0;
		gl.uniform4f(shader.color, r, g, b, a);
	}
	shader.setColor([1.0, 1.0, 1.0]);
	
	shader.enable = function () {
		if (gCurrentShader == shader) return;
		if (gCurrentShader) gCurrentShader.disable();
		// bind attributes
		gl.enableVertexAttribArray(shader.vertPos);
		gl.useProgram(shader);
		// load matrices
		gl.uniformMatrix4fv(shader.pMatrix, false, pMatrix);
		gl.uniformMatrix4fv(shader.vMatrix, false, vMatrix);
		gCurrentShader = shader;
	}
	shader.disable = function () {
		gl.disableVertexAttribArray(shader.vertPos);
		gCurrentShader = undefined;
	}
	
	shader.disable();
	return shader;
}

function TextureShader()
{
	var pShader = gl.createShader(gl.FRAGMENT_SHADER);
	var vShader = gl.createShader(gl.VERTEX_SHADER);
	
	gl.shaderSource(pShader, TEX_PIXEL_SHADER);
	gl.compileShader(pShader);
	if (!gl.getShaderParameter(pShader, gl.COMPILE_STATUS))
	{
		alert(gl.getShaderInfoLog(pShader));
		return;
	}
	
	gl.shaderSource(vShader, TEX_VERT_SHADER);
	gl.compileShader(vShader);
	if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS))
	{
		alert(gl.getShaderInfoLog(vShader));
		return;
	}
	
	var shader = gl.createProgram();
	gl.attachShader(shader, pShader);
	gl.attachShader(shader, vShader);
	gl.linkProgram(shader);
	if (!gl.getProgramParameter(shader, gl.LINK_STATUS))
	{
		alert("Error: Could not initialize texture shader.");
		return;
	}
	
	gl.useProgram(shader);
	
	shader.vertPos = gl.getAttribLocation(shader, "aVertPos");
	shader.texCoord = gl.getAttribLocation(shader, "aTexCoord");
	shader.wMatrix = gl.getUniformLocation(shader, "uWMatrix");
	shader.vMatrix = gl.getUniformLocation(shader, "uVMatrix");
	shader.pMatrix = gl.getUniformLocation(shader, "uPMatrix");
	
	shader.color   = gl.getUniformLocation(shader, "uColor");
	shader.setColor = function(r, g, b, a)
	{
		if (r[0] !== undefined)
		{
			g = r[1]; b = r[2];
			if (r[3] !== undefined)
				a = r[3];
			r = r[0];
		}
		if (a === undefined)
			a = 1.0;
		gl.uniform4f(shader.color, r, g, b, a);
	}
	shader.setColor([1.0, 1.0, 1.0, 1.0]);
	
	shader.enable = function (texture) {
		if (gCurrentShader != shader) {
			if (gCurrentShader) gCurrentShader.disable();
			// bind shader attributes
			gl.enableVertexAttribArray(shader.vertPos);
			gl.enableVertexAttribArray(shader.texCoord);
			gl.useProgram(shader);
			// load matrices
			gl.uniformMatrix4fv(shader.pMatrix, false, pMatrix);
			gl.uniformMatrix4fv(shader.vMatrix, false, vMatrix);
		}
		// bind texture
		if (texture) {
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.uniform1i(shader.samplerUniform, 0);
		}
		//shader.setColor([1.0, 1.0, 1.0, 1.0]);
		gCurrentShader = shader;
	}
	shader.disable = function () {
		gl.disableVertexAttribArray(shader.vertPos);
		gl.disableVertexAttribArray(shader.texCoord);
		gCurrentShader = undefined;
	}
	
	shader.disable();
	return shader;
}


function AnimationShader()
{
	// compile fragment and vertex shaders
	var pShader = gl.createShader(gl.FRAGMENT_SHADER);
	var vShader = gl.createShader(gl.VERTEX_SHADER);
	
	gl.shaderSource(pShader, ANIMATION_PIXEL_SHADER);
	gl.compileShader(pShader);
	if (!gl.getShaderParameter(pShader, gl.COMPILE_STATUS))
	{
		alert(gl.getShaderInfoLog(pShader));
		return;
	}
	
	gl.shaderSource(vShader, ANIMATION_VERT_SHADER);
	gl.compileShader(vShader);
	if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS))
	{
		alert(gl.getShaderInfoLog(vShader));
		return;
	}
	
	// create shader
	var shader = gl.createProgram();
	gl.attachShader(shader, pShader);
	gl.attachShader(shader, vShader);
	gl.linkProgram(shader);
	if (!gl.getProgramParameter(shader, gl.LINK_STATUS))
	{
		alert("Error: Could not initialize texture shader.");
		return;
	}
	
	// bind attributes
	gl.useProgram(shader);
	shader.vertPosA = gl.getAttribLocation(shader, "aVertPosA");
	shader.vertPosB = gl.getAttribLocation(shader, "aVertPosB");
	shader.texCoord = gl.getAttribLocation(shader, "aTexCoord");
	shader.wMatrix = gl.getUniformLocation(shader, "uWMatrix");
	shader.vMatrix = gl.getUniformLocation(shader, "uVMatrix");
	shader.pMatrix = gl.getUniformLocation(shader, "uPMatrix");
	
	// color
	shader.color   = gl.getUniformLocation(shader, "uColor");
	shader.setColor = function(r, g, b, a)
	{
		if (r[0] !== undefined)
		{
			g = r[1]; b = r[2];
			if (r[3] !== undefined)
				a = r[3];
			r = r[0];
		}
		if (a === undefined)
			a = 1.0;
		gl.uniform4f(shader.color, r, g, b, a);
	}
	shader.setColor([1.0, 1.0, 1.0, 1.0]);
	
	// animation blend factor
	shader.animationBlend = gl.getUniformLocation(shader, "uAnimationBlend");
	shader.setBlend = function (a) {
		gl.uniform1f(shader.animationBlend, a);
	}
	shader.setBlend(0);
	
	// shader enable
	shader.enable = function (texture) {
		if (gCurrentShader != shader) {
			if (gCurrentShader) gCurrentShader.disable();
			// bind shader attributes
			gl.enableVertexAttribArray(shader.vertPosA);
			gl.enableVertexAttribArray(shader.vertPosB);
			gl.enableVertexAttribArray(shader.texCoord);
			gl.useProgram(shader);
			// load matrices
			gl.uniformMatrix4fv(shader.pMatrix, false, pMatrix);
			gl.uniformMatrix4fv(shader.vMatrix, false, vMatrix);
		}
		// bind texture
		if (texture) {
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.uniform1i(shader.samplerUniform, 0);
		}
		//shader.setColor([1.0, 1.0, 1.0, 1.0]);
		gCurrentShader = shader;
	}
	
	// shader disable
	shader.disable = function () {
		gl.disableVertexAttribArray(shader.vertPosA);
		gl.disableVertexAttribArray(shader.vertPosB);
		gl.disableVertexAttribArray(shader.texCoord);
		gCurrentShader = undefined;
	}
	
	// render function
	shader.render = function (meshA, meshB, worldMatrix) 
	{
		if (worldMatrix === undefined) {
			worldMatrix = Mat4List(Matrix4());
		}
		shader.enable();
		
		// set vertex position array buffers
		gl.bindBuffer(gl.ARRAY_BUFFER, meshA.vert_buf);
		gl.vertexAttribPointer(shader.vertPosA, 3, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ARRAY_BUFFER, meshB.vert_buf);
		gl.vertexAttribPointer(shader.vertPosB, 3, gl.FLOAT, false, 0, 0);
			
		// set UV array buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, meshA.uv_buf);
		gl.vertexAttribPointer(shader.texCoord, 2, gl.FLOAT, false, 0, 0);
		
		// set world matrix
		gl.uniformMatrix4fv(shader.wMatrix, false, worldMatrix);

		// do it
		gl.drawArrays(gl.TRIANGLES, 0, meshA.count * 3);
	}
	
	shader.disable();
	return shader;
}


function OrthogonalProjection() {
	gl.uniformMatrix4fv(gCurrentShader.pMatrix, false, Mat4List(Matrix4()));
	gl.uniformMatrix4fv(gCurrentShader.vMatrix, false, Mat4List(Matrix4()));
}

function NormalProjection() {
	gl.uniformMatrix4fv(gCurrentShader.pMatrix, false, pMatrix);
	gl.uniformMatrix4fv(gCurrentShader.vMatrix, false, vMatrix);
}

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

function FixedMatrix(vMatrix)
{
	return [
		1, 0, 0, vMatrix[3], 
		0, 1, 0, vMatrix[7], 
		0, 0, 1, vMatrix[11], 
		vMatrix[12], vMatrix[13], vMatrix[14], vMatrix[15]
	];
}


// shaders
function initShaders()
{
	TEX_SHADER = TextureShader();
	ANIM_SHADER = AnimationShader();
	STD_SHADER = StandardShader();
	STD_SHADER.enable();
}
/* tedge.js */
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
var mouseX = 0;
var mouseY = 0;

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
/* textures.js */
/* texture generator functions */
function CrateTexture() {
	return function (x, y) {
		x *= 128; y *= 128;
		var c = (x < 10 || x > 117 || y < 10 || y > 117 ||
				abs(x-y+256) < 7 || abs(128-x-y) < 7) ? 1 : 0;
		var color = [];
		color[0] = 128 - c * 32 + Math.random() * 20;
		color[1] = 96 - c * 32 + Math.random() * 20;
		color[2] = 64 - c * 32 + Math.random() * 20;
		return color;
	}
}

function WoodGrainTexture() {
	return function (y, x) {
		var c = (Math.floor(abs((x-0.2)*(y-0.4)*128))%3);
		c += (Math.floor(abs((x-0.7)*(y-0.6)*128))%2);
		c += (Math.floor(abs((x-0.1)*(y-0.9)*128))%3);
		c += (Math.floor(abs((x-0.5)*(y-0.2)*128))%4);
		c += (Math.floor(abs((x-0)*(y-1.0)*128))%3);
		c += (Math.floor(abs((x-0.8)*(y-0.05)*128))%3);
		var color = [];
		color[0] = 192 - c * 32 + Math.random() * 20;
		color[1] = 128 - c * 32 + Math.random() * 20;
		color[2] = 96 - c * 32 + Math.random() * 20;
		return color;
	}
}

function LeafTexture() 
{
	return function (x, y) {
		var c = Math.sin(x*y*2*Math.PI) * Math.sin(x/(y+0.1)*4*Math.PI) > 0.3 ? 194 + Math.random() * 64 : 0;
		return [Math.random()*64, c, Math.random()*128, c > 0 ? 255 : 0];
	}
}

	
function HazardTexture() {
	return function (x, y) {
		x *= 128; y *= 128;
		var c = ((128+x-y)%64 < 32) ? 1 : 0;
		var color = [];
		color[0] = 128 - c * 128 + Math.random() * 48;
		color[1] = 128 - c * 128 + Math.random() * 48;
		color[2] = 0;
		return color;
	}
}

function PanelTexture() {
	var coords = [];
	for (var i = 0; i < 128; i++) {
		coords.push(Math.floor(Math.random()*256));
		if (i%2 && coords[i] < coords[i-1]) {
			var swap = coords[i-1];
			coords[i-1] = coords[i];
			coords[i] = swap;
		}
	}
	return function (x, y) {
		x *= 256; y *= 256;
		var c = 0;
		for (var i = 0; i < coords.length; i += 4) {
			if (x > coords[i] && x < coords[i+1] && 
					y > coords[i+2] && y < coords[i+3]) {
				c++;
			}
		}
		c *= 2 * 256*4/coords.length;
		return color = [c * 1.1, c * 0.9, c * 1.2];
	}
}

function SteelGridTexture() {
	return function (x, y) {
		x *= 128; y *= 128;
		var color = (x < 5 || x > 122 || y < 5 || y > 122 ||
				abs(x-y) < 4 || abs(128-x-y) < 4) ? 1 : 0;
		color = 100 - color * 96 + Math.random() * 20;
		return [color, color, color];
	}
}

function CheckeredTexture() {
	return function (x, y) {
		x *= 4; y *= 4;
		var c = ((x ^ y)%2) * 255;
		return [c, c, c];
	}
}

function DeepPurpleTexture() {
	return function(x, y) {
		return [x*x*60 + y*x*45, y/(x+0.1), 255*x*y];
	}
}

function FunHouseTexture() {
	return function (x, y) {
		xx = x * 7 + y * 2; yy = y * 7 + x * 2;
		xxx = x * 8 + y * 3; yyy = y * 8 + x * 3;
		var c = ((xx ^ yy ^ xxx ^ yyy)%2) * 255;
		return [c, c, c];
	}
}

function CorrugatedSteelTexture() {
	return function (x, y) {
		xx = x * 20 + y * 20; yy = 20 + y * 20 - x * 20;
		var c = ((xx ^ yy)%2) * 64;
		xx -= Math.floor(xx); yy -= Math.floor(yy);
		if (xx < 0.2 || yy < 0.2) c += 96;
		c += 32 + (Math.sin(x*62) + Math.sin(x*31)) * 64;
		return [c, c, c * 1.3];
	}
}

function HazardSteelTexture() {
	var panel = PanelTexture();
	var steel = SteelGridTexture();
	return function (x, y) {
		var a = panel(x, y); var b = steel(Math.floor(x*128*5)%128/128, Math.floor(y*128*5)%128/128);
		var avg = VecScale(VecAdd(a,b), 0.5);
		var xor = [a[0] ^ b[0], a[1] ^ b[1], a[2] ^ b[2]];
		return VecScale(VecAdd(avg, xor), 0.5);
	}
}

function LightParticleTexture() 
{
	return function (x, y) {
		var c = MAX(Math.sin(x*Math.PI) * Math.sin(y*Math.PI) - 0.2, 0) * 256;
		return [c, c, c, c];
	}
}

var PARTICLE_TEXTURE;
function GetParticleTexture() {
	if (PARTICLE_TEXTURE === undefined) {
		PARTICLE_TEXTURE = MakeTexture(LightParticleTexture(), 32);
	}
	return PARTICLE_TEXTURE;
}


function HexagonalTexture() 
{
	return function (x, y)
	{
		x *= 8; y *= 6;
		if (x > 1) x -= Math.floor(x);
		if (y > 1) y -= Math.floor(y);
		if (y > (-2*x/3 + 1/3) && y > (2*x/3 - 1/3) &&
			y < (-2*x/3 + 4/3) && y < (2*x/3 + 2/3))
		{
			x = x*1.3 - 0.15; y = y*1.3 - 0.15;
			if (y > (-2*x/3 + 1/3) && y > (2*x/3 - 1/3) &&
				y < (-2*x/3 + 4/3) && y < (2*x/3 + 2/3) &&
				x > 0 && x < 1)
			{
				return [255, 255, 255];
			}
			var g = (x > y) ? 196 : 128;
			if (x > 0.5) g += 32;
			return [g, g, g];
		}
		return [0, 0, 0];
	}
}

function HelmetTexture()
{
	var dpt = DeepPurpleTexture();
	var cst = HexagonalTexture();
	return function (x, y) {
		var xx = 1.8*(x - 0.5);
		var r = (xx*xx + y*y);
		if (y < 0.02 || r > 1) return [0, 0, 0, 0];
		var color = VecAdd(VecScale(VecMult(cst(x*2+y/5,x*2-y/5+1), dpt(x,y)), (r*r)/128),
			VecScale([8, 0, 64], 1-x));
		if (r > 0.94) color = VecScale(color, 1.75);
		return color;
	}
}

function TargettingTexture()
{
	return function (x, y) {
		x -= 0.5; y -= 0.5;
		var angle = 16*(Math.atan2(x,y) + Math.PI)/2/Math.PI;
		var r = x*x + y*y;
		var color = [0, 0, 255, 0];
		
		color[3] = (y+0.5)*(y+0.5)*128;
		color[0] = (2-x)*(y+0.5)*96;
		
		y = Math.floor(y*256);
		if (x > -0.4 && x < 0.4) {
			if ((y%64) == 0)
				color[3] = 64;
		} else {
			if ((y%64) == Math.floor(x*32))
				color[3] = 64;
		}
		
		if (((angle - Math.floor(angle) > 2/3) && r < 0.4 && r > 0.3))
			color[3] = 128;
		
		if (r < 0.023 && r > 0.02)
			color[3] = 196;
		
		angle *= 2;
		if ((angle - Math.floor(angle) < 1/2) && r < 0.01 && r > 0.009)
			color[3] = 256;
		
		return color;
	}
}

function SpaceBoxTexture(face) {
	var width = 256;
	var height = 256;
	var rot = [0,0,0,0,3.1416/2,0,0,3.1416,0,0,-3.1416/2,0,3.1416/2,0,0,-3.1416/2,0,0];
	var matrix = Mat4World([0,0,0], QuatXYZ(rot[face*3],rot[face*3+1],rot[face*3+2]));
	
	var for_vectors = [[0,0,-1], [1,0,0], [0,0,1], [-1,0,0], [0,-1,0], [0,1,0]];
	var right_vectors = [[-1,0,0], [0,0,-1], [1,0,0], [0,0,1], [-1,0,0], [-1,0,0]];
	
	var forward = for_vectors[face];
	var right = right_vectors[face];
	var up = VecCross(forward, right);
	
	return function (x, y) {
		x *= width;
		y *= height;
		var color;
		var vec = VecAdd(VecScale(right, 2*(x+0.5)/width - 1),
						VecScale(up, 2*(y+0.5)/height - 1));
		vec = VecAdd(vec, forward);
		var angle = Math.atan2(vec[0], vec[2]) / Math.PI;
		vec = VecNormalize(vec);
		// space colors
		color = VecScale(VecMult(vec, vec), 16);
		if (Math.floor(Math.random()*32) == 0) color = [255, 255, 255];
		return color;
	}
}

function BlobTexture() 
{
	return function (x, y) {
		var color = Vector3();
		xx = x*10; yy = y*10;
		xx -= Math.floor(xx) + 0.5;
		yy -= Math.floor(yy) + 0.5;
		color = VecAdd(color, [0, 0, 32/(xx*xx+yy*yy)]);
		
		color = VecAdd(color, [0, (Math.sin(x*6.28)*Math.cos(y*6.28) + 1)*64, 0]);
		
		xx = x*12; yy = y*12;
		xx -= Math.floor(xx) + 0.5;
		yy -= Math.floor(yy) + 0.5;
		color = VecAdd(color, [(x*5 + y*5)/(xx*xx+yy*yy), 0, 0]);
		if ((xx*xx + yy*yy) < 0.01) color = [0, 0, 0];
		return color;
	}
}



function PlasmaGunTexture()
{
	return function (x, y)
	{
		y = 1 - y;
		if (y < 0.5) {
			// barrel
			y = y*2;
			var xx = Math.sin(x*20)*0.4 + 0.6;
			var yy = Math.cos(y*Math.PI*8)*0.3 + 0.7;
			var a = VecScale([1,1,1], 96*yy*yy);
			var b = VecScale([0,0,1], 255*xx*x);
			var c = VecScale([0,1,0], 255*xx*yy);
			var color = VecAdd(a, b);
			color = VecAdd(color, c);
			return color;
			return VecScale(color, 1/3);
			return [255*y*y, 128*x*x, 255*x*y];
		} else if (x < 0.5) {
			// ball
			x = 1 - x*2;
			x = Math.sin(x*20)*0.4 + 0.6;
			y = (y - 0.5)*2;
			y = Math.cos(y*Math.PI*8 + Math.PI)*0.5 + 0.5;
			return VecAdd([0, 0, 256*y*y], [128*x, 128*y, 128*x]);
			return [255*y, 255*x, 255*y];
		} else {
			// handle
			x = (x - 0.5)*2;
			y = (y - 0.5)*2;
			var c = y*Math.sin(x*30)*128 + 64;
			return [MAX(c,64), MAX(x*c,0), MAX(c*2,128)];
		}
	}
}

/* texture viewing tool */
function TextureViewer()
{
	var PAGE_SIZE = 4;
	var grayscale = false;
	var textureGenerators = [
		CrateTexture(),
		WoodGrainTexture(),
		LeafTexture(),
		HazardTexture(),
		PanelTexture(),
		SteelGridTexture(),
		CheckeredTexture(),
		DeepPurpleTexture(),
		FunHouseTexture(),
		CorrugatedSteelTexture(),
		HazardSteelTexture(),
		LightParticleTexture(),
		HelmetTexture(),
		HexagonalTexture(),
		TargettingTexture(),
		SpaceBoxTexture(0),
		BlobTexture(),
		PlasmaGunTexture()
	];
	
	var textures = [];
	for (var t in textureGenerators) {
		var tex = textureGenerators[t];
		if (grayscale) {
			tex = function (x,y) {
				var color = textureGenerators[t](x, y);
				var g = (color[0] + color[1] + color[2])/3;
				var a = (color[3] !== undefined) ? color[3] : 255;
				return [g, g, g, a];
			}
		}
		textures.push(MakeTexture(tex, 256));
	}
	
	var square = CloneMesh(SQUARE_MESH);
	TransformMesh(square, Mat4Scale(1/PAGE_SIZE, 1/PAGE_SIZE * canvas.width / canvas.height, 1));
	BufferMesh(square);
	
	gCamera = Camera([0, 0, 1]);
	var xOffset = 0;
	var yOffset = 0;
	
	entities.push({
		render: function() {
			OrthogonalProjection();
			gl.enable(gl.BLEND);
			gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
			for (var i = 0; i < textures.length; i++) {
				TEX_SHADER.enable(textures[i]);
				var x = 2*(i%PAGE_SIZE)/PAGE_SIZE - (PAGE_SIZE-1)/PAGE_SIZE;
				var y = -2*Math.floor(i/PAGE_SIZE)/PAGE_SIZE + 0.25;
				y *= canvas.width / canvas.height;
				x += xOffset; y += yOffset;
				var matrix = Mat4Translate(x, y, 0);
				DrawMesh(square, Mat4List(matrix), TEX_SHADER);
			}
		},
		update: function (dt) {
			if (K_UP in keysDown) yOffset -= dt;
			if (K_DOWN in keysDown) yOffset += dt;
			//if (K_LEFT in keysDown) xOffset += dt;
			//if (K_RIGHT in keysDown) xOffset -= dt;
		}
	});
	startGame();
}

