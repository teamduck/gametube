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
