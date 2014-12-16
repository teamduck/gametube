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
