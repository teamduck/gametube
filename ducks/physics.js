/* physics.js - basic 3d physics in javascript
 * grg, 12/2011
**/

var physObjects = [];

// VECTOR MATH ////////////////////////////////////////

function Vector3(x, y, z)
{
    if (x === undefined) return [0.0, 0.0, 0.0];
    return [x, y, z];
}

var VEC_RIGHT   = Vector3(1.0, 0.0, 0.0);
var VEC_UP      = Vector3(0.0, 1.0, 0.0);
var VEC_FORWARD = Vector3(0.0, 0.0, 1.0);

function VecCopy(v)
{
    return [v[0], v[1], v[2]];
}

function VecAdd(a, b, c)
{
    return [a[0]+b[0]+c[0], a[1]+b[1]+c[1], a[2]+b[2]+c[2]];
    //return {x: a.x+b.x+c.x, y: a.y+b.y+c.y, z: a.z+b.z+c.z};
}
    
function VecAdd(a, b)
{
    return [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
    //return {x: a.x+b.x, y: a.y+b.y, z: a.z+b.z};
}

function VecSub(a, b)
{
    return [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
    //return {x: a.x-b.x, y: a.y-b.y, z: a.z-b.z};
}

function VecScale(v, s)
{
    return [v[0]*s, v[1]*s, v[2]*s];
    //return {x: v.x*s, y: v.y*s, z: v.z*s};
}

function VecNormalize(v)
{
    var denom = 1.0/Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
    return [v[0]*denom, v[1]*denom, v[2]*denom];    
}

function VecLength(v)
{
    return Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
    //return Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z);
}

function VecLengthSqr(v)
{
    return (v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
    //return (v.x*v.x + v.y*v.y + v.z*v.z);
}

function VecDot(a, b)
{
    return (a[0]*b[0] + a[1]*b[1] + a[2]*b[2]);
    //return (a.x*b.x + a.y*b.y + a.z*b.z);
}

function VecCross(a, b)
{
    return [a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0]];
    //return {x: a.y * b.z - a.z * b.y,
    //        y: a.z * b.x - a.x * b.z,
    //        z: a.x * b.y - a.y * b.x};
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

/*
function Mat4List(m)
{
    return [m[0][0], m[1][0], m[2][0], m[3][0],
            m[0][1], m[1][1], m[2][1], m[3][1],
            m[0][2], m[1][2], m[2][2], m[3][2],
            m[0][3], m[1][3], m[2][3], m[3][3]];
}
*/

function Mat4Scale(f)
{
    return [
        [  f, 0.0, 0.0, 0.0], 
        [0.0,   f, 0.0, 0.0], 
        [0.0, 0.0,   f, 0.0], 
        [0.0, 0.0, 0.0, 1.0]
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
    m[0][1] =         xy2 + wz2;
    m[0][2] =         xz2 - wy2;
    m[0][3] = 0.0;

    m[1][0] =         xy2 - wz2;
    m[1][1] = 1.0 - (xx2 + zz2);
    m[1][2] =         yz2 + wx2;
    m[1][3] = 0.0;

    m[2][0] =         xz2 + wy2;
    m[2][1] =         yz2 - wx2;
    m[2][2] = 1.0 - (xx2 + yy2);
    m[2][3] = 0.0;

    m[3][0] = pos[0];
    m[3][1] = pos[1];
    m[3][2] = pos[2];
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

// BOUNDING BOX MATH ////////////////////////////////

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

// SIMULATION CODE /////////////////////////////////////

function PhysicalEntity(e, mesh, dynamic)
{
    // linear kinematics
    e.mass  = 5.0;
    e.force = Vector3();
    e.pos   = Vector3();
    e.vel   = Vector3();
    e.acl   = Vector3();
    e.friction = 5.0;
    e.dynamic = dynamic;
    
    // rotational kinematics
    // e.moment = Matrix4();
    e.torque = Vector3();
    e.rot    = Quat();
    e.rotVel = Quat();
    e.rotAcl = Quat();
    
    // collision
    e.matrix = Mat4World(e.pos, e.rot);
    if (mesh)
    {
        e.mesh   = mesh;
        e.bb     = BBFromMesh(mesh.vertices);
        e.aabb   = BBTransform(e.bb, e.matrix);
        if (dynamic)
            e.radius = VecDot(BBSize(e.bb), Vector3(1/6.0, 1/6.0, 1/6.0));
    }
    
    physObjects.push(e);
    return e;
}


function Physics(dt)
{
    //var tree = newOctree();
    var tree = [];

    // update phys objects
    for (var idx in physObjects)
    {
        // integrate motion
        var e = physObjects[idx];
        //if (e.dynamic)
        {        
            e.pos = VecAdd(e.pos, VecScale(e.vel, dt), VecScale(e.acl, dt * dt / 2));
            e.vel = VecAdd(e.vel, VecScale(e.acl, dt));
            e.acl = VecAdd(VecScale(e.force, 1.0 / e.mass),
                           VecScale(e.vel, -1.0 * e.friction));
            
            // handle rotation
            e.rot = QuatMult(e.rot, QuatSlerp(Quat(), e.rotVel, dt));
            
            // rebuild matrices / bounding boxes
            e.matrix = Mat4World(e.pos, e.rot);
            if (e.radius)
            {
                e.aabb = {min: VecSub(BBCenter(e.bb), Vector3(e.radius, e.radius, e.radius)),
                        max: VecAdd(BBCenter(e.bb), Vector3(e.radius, e.radius, e.radius))};
                e.aabb.min = VecAdd(e.aabb.min, e.pos);
                e.aabb.max = VecAdd(e.aabb.max, e.pos);
            } else {
                e.aabb = BBTransform(e.bb, e.matrix);
            }
            
            // check for collision
            if (e.mesh !== undefined || e.radius !== undefined)
            {
                var nearby = tree; //tree.getObjects(e.aabb);
                for (o in nearby)
                {
                    if (BBTestBB(e.aabb, nearby[o].aabb))
                    {
                        checkCollision(e, nearby[o]);
                    }
                }
                
                // add the object to the spatial tree
                tree.push(e);
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
    
    if (check(objA, objB))
    {
        if (objA.collision) objA.collision(objB);
        if (objB.collision) objB.collision(objA);
    }
}

function sphereSphereCollision(objA, objB)
{
    var diff  = VecSub(objA.pos, objB.pos);
    var len2 = VecLengthSqr(diff);
    var rad  = objA.radius + objB.radius;
    
    if (len2 < rad * rad)
    {
        var len = Math.sqrt(len2);
        var cor = (rad - len) * objB.mass / (objA.mass + objB.mass);
        objA.pos = VecAdd(objB.pos, VecScale(diff, (len + cor)/len));
        objB.pos = VecAdd(objA.pos, VecScale(diff, -rad/len));
        objA.vel = VecSub(objA.vel, VecScale(diff, VecDot(objA.vel, diff)/len));
        objB.vel = VecAdd(objB.vel, VecScale(diff, VecDot(objB.vel, diff)/len));
        return true;
    }
    return false;
}

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
    //debugger;

    var pos = VecAdd(sphere.pos, BBCenter(sphere.bb));
    var hit = false;
    var vertices = geom.mesh.vertices;
    for (var j = 0; j < vertices.length; j += 9)
    {
        var tri = [[vertices[j],   vertices[j+1], vertices[j+2]],
                   [vertices[j+3], vertices[j+4], vertices[j+5]],
                   [vertices[j+6], vertices[j+7], vertices[j+8]]];
        tri[0] = VecAdd(geom.pos, tri[0]);
        tri[1] = VecAdd(geom.pos, tri[1]);
        tri[2] = VecAdd(geom.pos, tri[2]);                   
        var normal   = VecNormalize( VecCross(VecSub(tri[1], tri[0]), VecSub(tri[2], tri[0])) );
        var constant = -VecDot(tri[1], normal);
                   
        // check interior points
        var dist = SignedDistToPlane(pos, normal, constant);
        if (Math.abs(dist) < sphere.radius)
        {
            var contact = VecAdd(pos, VecScale(normal, -dist));
            if (PointIsInTriangle(contact, tri))
            {
                // correct position and velocity
                pos = VecAdd(contact, VecScale(normal, sphere.radius));
                sphere.vel = VecSub(sphere.vel, VecScale(normal, VecDot(sphere.vel, normal)));
                hit = true;
            }
            else
            {                
                // check line segments
                for (var i = 0; i < 3; i++)
                {
                    contact  = ClosestPointOnLine(pos, tri[i], tri[(i+1)%3]);
                    var diff = VecSub(pos, contact);
                    var dist = VecLength(diff);
                    if (dist < sphere.radius)
                    {
                        diff = VecScale(diff, sphere.radius/dist);
                        pos = VecAdd(contact, diff);
                        sphere.vel = VecSub(sphere.vel, VecScale(diff, VecDot(sphere.vel, diff)/sphere.radius));
                        hit = true;
                    }
                }
            }
            
        }
    }
    
    if (hit) {
        sphere.pos = VecSub(pos, BBCenter(sphere.bb));
    }
    
    return hit;
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

