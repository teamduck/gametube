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
//    b.shader = TEX_SHADER;
	
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

    var ceilTile = TransformMesh(CloneMesh(SQUARE_MESH),
            Mat4Mult(Mat4World(Vector3(0, 0, 0), QuatXYZ(Math.PI/2,0,0)),
                    Mat4Scale(-map.size/2)));
					
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
//					csg.append(ceilTile, matrix);
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
//    console.log("Map: " + mesh.normals.length + " normals");
//    for (var q = 0; q < mesh.normals.length; q += 3)
//        console.log(mesh.normals[q] + ", " + mesh.normals[q+1] + ", " + mesh.normals[q+2]);
	
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
        ReCalculateNormals(mesh);
		UpdateMesh(mesh);
	}
	
	gMap = StaticEntity(mesh);
	gMap.texture = texture;
//    gMap.shader = LIT_TEX_SHADER;
	if (ROTATIONAL_INERTIA) {
		gMap.transformPosition = transformPosition;
		gMap.transformRotation = transformRotation;
	} else {
		gMap.transformPosition = function (x) { return x; };
		gMap.transformRotation = function (q) { return q; };
	}
	gMap.renderFirst = true;
	
    gMap.mesh = mesh;
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
		LIT_TEX_SHADER.enable(texture);
		LIT_TEX_SHADER.setColor(flashColor);
		DrawMesh(mesh, matrix, LIT_TEX_SHADER);
	}

    tubes.mesh = mesh;
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
	
    core.mesh = mesh;
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
    tree.mesh = mesh;
	
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
	
    snake.mesh = mesh;
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
			//[3, Snake],
			//[BlobMonster, [40, 0, 35]],
			[Player, puid],
			[Tubes, [25, 2, 2]],
			[FireEffect, [6, 2, 45]],
			[Tree, [17, 0, 17]],
			[EnergyCore],
			[Map],
			[HelmetDisplay],
			//[FPSCounter]
		], finishedLoading);
}


function finishedLoading() 
{
	// warning sticker
	//var label = TextSprite("don't look at this sam");
	//label.x = (canvas.width - label.size.width) / 2;
	//label.renderLast = true;
	//entities.push(label);
	
	// transform everything to cylindrical space
	if (ROTATIONAL_INERTIA) {
		for (var e in entities) {
			if (entities[e].pos && entities[e].rot && entities[e] != gMap) {
				entities[e].pos = gMap.transformPosition(entities[e].pos);
				entities[e].rot = gMap.transformRotation(entities[e].pos, entities[e].rot);
			}
		}
	}

    for (var i = 0; i < 10; i++) {
        entities.push(Snake(VecAdd(gPlayer.pos, Vector3(Math.random()*50, Math.random()*12, Math.random()*50) )));
    }
	
	// hand over control to tedge / tedge server enterprise
	startGame();
}
