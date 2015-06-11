// dots


/* entities */


// starry exterior
function SpaceBox() {
	var s = {textures: [], renderFirst: true};
	var mesh = BufferMesh(SQUARE_MESH);
	var theta = 0;
	
	// store in vram
	for (var f = 0; f < 6; f++) {
		s.textures.push(MakeTexture(SpaceBoxTexture(f), 128));
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


var BUFFERED_TEXTURES = [];

function Box(position, rotation) {
	var texs = [CorrugatedSteelTexture, HazardTexture, CrateTexture, DeepPurpleTexture];
    for (var t in texs) {
        if (BUFFERED_TEXTURES[texs[t]] === undefined)
            BUFFERED_TEXTURES[texs[t]] = MakeTexture(texs[t](), 128);
    }
	var tex = texs[entities.length % texs.length];
	var texture = BUFFERED_TEXTURES[tex];
	var b = StaticEntity(BOX_MESH);
	b.texture = texture;
	
	if (position) {
		b.pos = [position[0], position[1], position[2]];
		if (rotation) b.rot = rotation;
	}
	
	return b;
}

function Red()
{
    return function (x, y) {
        return [255, 0, 0];
    }
}

function Blue()
{
    return function (x, y) {
        return [Math.random() * 64, Math.random() * 128, Math.random() * 255];
    }
}

function White()
{
    return function (x, y) {
        return [255, 255, 255];
    }
}

function Resource(position, rotation)
{
    if (BUFFERED_TEXTURES[Blue] === undefined)
        BUFFERED_TEXTURES[Blue] = MakeTexture(Blue(), 64);
	var texture = BUFFERED_TEXTURES[Blue];
    if (BUFFERED_TEXTURES[White] === undefined)
        BUFFERED_TEXTURES[White] = MakeTexture(White(), 64);
	var white = BUFFERED_TEXTURES[White];
	var r = StaticEntity(Math2MeshSphere(function () { return Math.random(); }, 5, 5));
	r.texture = texture;
	
	if (position) {
		r.pos = position;
		if (rotation) r.rot = rotation;
	}
    
    r.amount = 1000;
    r.resource = true;
    r.render = function () {
        TEX_SHADER.enable(texture);
        DrawMesh(r.mesh, Mat4List(r.matrix), TEX_SHADER, false);
        TEX_SHADER.enable(white);
        gl.disable(gl.DEPTH_TEST);
        DrawMesh(r.mesh, Mat4List(r.matrix), TEX_SHADER, true);
        gl.enable(gl.DEPTH_TEST);
    }
	
	return r;
}

var terrain;
function GameMap()
{
    var size = 64;
    
	var map = StaticEntity(BOX_MESH, 
        Mat4Mult(
            Mat4Scale(size, size, size),
            Mat4Translate(0, -size, 0)
        ));

    map.texture = MakeTexture(DeepPurpleTexture(), 128);
    entities.push(map);
    
    terrain = [];
    for (var x = 0; x < size; x++)
    {
        terrain.push([]);
        for (var y = 0; y < size; y++)
        {
            terrain[x].push(0);
            var baseArea = (x < 8 && y < 8) ||
                (x > 46 && y < 8) ||
                (x > 46 && y > 46) ||
                (x < 8 && y > 46);
            if (Math.random() > 0.9 && !baseArea) {
                terrain[x][y] = 1;
                entities.push(Box([x, 0, y]));
            }
        }
    }
    
    for (var x = 0; x < 2; x++) {
        for (var y = 0; y < 10; y++) {
            var ax = x + 1 + x*61;
            var ay = (y % 5) + 2 + Math.floor(y/5)*56;
            terrain[ax][ay] = 2;
            entities.push(Resource([ax, 0, ay]));
        }
    }
    
    return Worker();
}

var cursor;
function RTSCamera()
{
    var camera = {
		pos:	[0, 10, 0],
		rot:	QuatXYZ(Math.PI/2, 0, 0),
		up:		[0, 0, 1],
		vel:	[0, 0, 0],
		accl:	[0, 0, 0],
		drag:	3.0,
		bounds: {min: [-1, -1, -1], max: [1, 1, 1]},
		vector: [0, 0, 0],
		target: [0, 0, 0],
		acceleration: 25,
		distance: 0.5
	};
    InputtingEntity(camera, puid);
	
	camera.update = function (dt)
	{
        var mouse = camera.mousePosition();
        var SCROLL_SPEED = 4.0;
        if (mouse[0] < 0.1 || camera.keyDown(K_LEFT))
            camera.pos[0] += dt * SCROLL_SPEED;
        if (mouse[0] > 0.9 || camera.keyDown(K_RIGHT))
            camera.pos[0] -= dt * SCROLL_SPEED;
        if (mouse[1] < 0.1 || camera.keyDown(K_UP))
            camera.pos[2] += dt * SCROLL_SPEED;
        if (mouse[1] > 0.9 || camera.keyDown(K_DOWN))
            camera.pos[2] -= dt * SCROLL_SPEED;
            
        if (camera.pos[0] < 0) camera.pos[0] = 0;
        if (camera.pos[0] > terrain.length) camera.pos[0] = terrain.length;
        if (camera.pos[2] < 0) camera.pos[2] = 0;
        if (camera.pos[2] > terrain.length) camera.pos[2] = terrain.length;
        
        if (camera.mouseHit(M_LEFT)) {
            if (cursor === undefined) {
                cursor = TargetCursor();
                entities.push(cursor);
            }
            mouse[0] -= 0.5;
            mouse[1] -= 0.5;
            mouse[0] *= 10 * canvas.width / canvas.height;
            mouse[1] *= 10;
            cursor.pos = VecAdd(camera.pos, [-mouse[0], 0, -mouse[1]]);
            cursor.pos[1] = 0;
        }
	};
	
	var cameraMtx = mat4.create();
	camera.getMatrix = function ()
	{
        var tpos = VecAdd(camera.pos, [0, -1, 0]);
		mat4.lookAt(camera.pos,
            tpos, 
            camera.up, 
            cameraMtx);
		return cameraMtx;
	};

    gCamera = camera;
	return camera;
}

function TargetCursor(position)
{
    var texs = [HazardTexture];
    for (var t in texs) {
        if (BUFFERED_TEXTURES[texs[t]] === undefined)
            BUFFERED_TEXTURES[texs[t]] = MakeTexture(texs[t](), 128);
    }
	var tex = texs[entities.length % texs.length];
	var texture = BUFFERED_TEXTURES[tex];
    var mesh = Math2MeshSphere(function () { return 0.5; }, 6, 6);
	var b = StaticEntity(mesh);
	b.texture = texture;
	
	if (position) {
		b.pos = position;
	}
	
	return b;
}

function Base(player)
{
    var texs = [CorrugatedSteelTexture];
    for (var t in texs) {
        if (BUFFERED_TEXTURES[texs[t]] === undefined)
            BUFFERED_TEXTURES[texs[t]] = MakeTexture(texs[t](), 128);
    }
	var tex = texs[entities.length % texs.length];
	var texture = BUFFERED_TEXTURES[tex];
    var mesh = Math2MeshSphere(function () { return 2.5; }, 8, 8);
    var frame = BufferMesh(BOX_MESH);
	var b = StaticEntity(mesh);
	b.texture = texture;
    
    var positions = [
        [5, 0, 5],
        [59, 0, 59],
        [59, 0, 5],
        [5, 0, 59],
    ];
    
	b.pos = Vector3(positions[entities.length % positions.length]);
    b.selected = true;
    var drawBase = b.render;
    b.render = function ()
    {
        if (b.selected) {
            STD_SHADER.enable();
            STD_SHADER.setColor(0, 255, 0);
            
            var matrix = Mat4Mult(Mat4Translate(-0.5, -0.5, -0.5), Mat4Scale(5));
            matrix = Mat4Mult(matrix, b.matrix);
            matrix = Mat4List(matrix);
            DrawMesh(frame, matrix, STD_SHADER, true);
            
            STD_SHADER.disable();
        }
        drawBase();
    }
	
	return b;
}


function PQ() {
    var list = [];
    return {
        pop: function () {
            if (list.length > 0) {
                var top = list[0];
                list = list.slice(1);
                return top.value;
            } else {
                return;
            }
        },
        push: function (value, priority) {
            for (var i = 0; i < list.length; i++) {
                if (list[i].priority < priority)
                    break;
            }
            list.splice(i, 0, {value: value, priority: priority});
        }
    };
}

function FindPath(start, dest, terrain) {
    var a = [Math.floor(start[0]), Math.floor(start[2])];
    var b = [Math.floor(dest[0]), Math.floor(dest[2])];
    
    console.log("FROM " + a[0] + ", " + a[1] + " TO " + b[0] + ", " + b[1]);
    
    var visited = {};
    var moves = [
        [0, -1],
        [0, 1],
        [-1, 0],
        [1, 0]
    ];
      
    var pq = PQ();
    pq.push([a], 
        Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]));
    visited[a[0] + "," + a[1]] = true;
    var path = pq.pop();
    while (path) {
        a = path[path.length - 1];
        if (a[0] == b[0] && a[1] == b[1])
            return path;
        for (var m in moves) {
            var next = [a[0] + moves[m][0], a[1] + moves[m][1]];
            if (next[0] >= 0 && next[0] < terrain.length && next[1] >= 0 && next[1] < terrain.length 
                && terrain[next[0]][next[1]] == 0 && visited[next[0] + "," + next[1]] === undefined)
            {
                var cost = Math.abs(next[0] - b[0]) + Math.abs(next[1] - b[1]);
                var newpath = path.slice(0);
                newpath.push(next);
                pq.push(newpath, cost);
                visited[next[0] + "," + next[1]] = true;
            }
        }
        path = pq.pop();
    }
    return [];
}


function Worker()
{
    var MOVEMENT_SPEED = 2;
    if (BUFFERED_TEXTURES[Red] === undefined)
        BUFFERED_TEXTURES[Red] = MakeTexture(Red(), 64);
	var texture = BUFFERED_TEXTURES[Red];
    var mesh = Math2MeshSphere(function () { return 0.5; }, 3, 3);
	var w = DynamicEntity(mesh);
	w.texture = texture;
	
    w.target = [Math.random()*64, 0, Math.random()*64];
    w.pos = [Math.random()*64, 0.5, Math.random()*64];
    
    w.path = FindPath(w.pos, w.target, terrain);
    w.update = function (dt) {
        if (w.path && w.path.length > 0) {
            var p0 = [w.path[0][0] + 0.5, 0.5, w.path[0][1] + 0.5];
            var dist = VecSub(p0, w.pos);
            if (VecLengthSqr(dist) < 0.02) {
                w.path = w.path.slice(1);
            } else {
                dist = VecNormalize(dist);
                w.pos = VecAdd(w.pos, VecScale(dist, dt*MOVEMENT_SPEED));
                w.rot = QuatXYZ(0, Math.atan2(dist[0], dist[2]) + Math.PI/2, 0);
            }
        }
    }
    
    w.render = function () {
        TEX_SHADER.enable(texture);
        DrawMesh(w.mesh, Mat4List(w.matrix), TEX_SHADER, false);
        TEX_SHADER.disable();
    }
	
	return w;
}

function ControlScreen()
{
    var menuTex = MakeTexture(HelmetTexture(), 128);
    var menuQuad = BufferMesh(SQUARE_MESH);
    var cs = {};
	var label1 = TextSprite("10,000 crystalium");
    var label2 = TextSprite("2,000 boredairum");
    label2.y = 32;
	//label.x = (canvas.width - label.size.width) / 2;
	//label.renderLast = true;
	//entities.push(label);
    
    cs.render = function() {
        label1.render();
        label2.render();
        
        TEX_SHADER.enable(menuTex);
        OrthogonalProjection();
		var matrix = Mat4Mult(Mat4Scale(1, 0.25, 1), Mat4Translate(0, -0.85, 0));
		DrawMesh(menuQuad, Mat4List(matrix), TEX_SHADER);
        NormalProjection();
        TEX_SHADER.disable();
    }
    cs.update = function (dt) {}
    return cs;
}

// main
function gameInit()
{
	puid = connect();
	
	// receive / create game data
	Load([
            [RTSCamera],
			[SpaceBox],
			[GameMap],
            [Base],
            [Base],
            [Base],
            [Base],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            [Worker],
            //[ControlScreen],
			[FPSCounter]
		], finishedLoading);
}


function finishedLoading() 
{
    gCamera.pos[0] = 32;
    gCamera.pos[2] = 32;
	// hand over control to tedge / tedge server enterprise
	startGame();
}
