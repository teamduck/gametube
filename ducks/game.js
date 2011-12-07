/* Quack Arena.js
 * 12/2011
 * by Team Duck
 * ***************/
    
function Box()
{
    var b = StaticEntity(BOX_MESH, Mat4Mult(Mat4Scale(Math.random()*13+1),Mat4World(Vector3(),QuatXYZ(Math.random(),Math.random(),Math.random()))));
    b.pos = [Math.random()*100.0 - 50, Math.random() * 7.0 - 5.0, Math.random()*100.0 - 50];
    return b;
}

function Level()
{
    var placement = Mat4Scale(100);    
    placement = Mat4Mult(placement, Mat4World(Vector3(-50.0, -100.0, -50.0),Quat()));
    //placement = Mat4Mult(Mat4Scale(100), Mat4World(Vector3(), QuatXYZ(0.1, 0.0, 0.0)));
    var l = StaticEntity(BOX_MESH, placement);
    //l.pos = Vector3(-50.0, -100.0, -50.0);
    return l;
}

function Player(puid)
{
    var p = DynamicEntity(DUCK_MESH, Mat4World(Vector3(), QuatXYZ(0, 3.14, 0)));//, Mat4Scale(1));
    InputtingEntity(p, puid);
    
    p.pos = [3.0, 12.0, 3.0];
    
    p.update = function (dt)
    {
        //setTexture(loadTexture("thick.png"));
        p.force = Vector3(0.0, -60.0, 0.0);
        p.rotVel = Quat();
        //p.acl[0] = 0; p.acl[1] = 0; p.acl[2] = 0;
        if (p.keyDown(K_UP)) 
            p.acl = VecAdd(p.acl, VecRotate(VecScale(VEC_FORWARD, 30.0), p.rot));
        if (p.keyDown(K_DOWN)) 
            p.acl = VecAdd(p.acl, VecRotate(VecScale(VEC_FORWARD, -15.0), p.rot));
        if (p.keyDown(K_LEFT)) p.rotVel = QuatXYZ(0.0, 1.5, 0.0);
        //p.rot = QuatMult(p.rot, QuatXYZ(0.0, -dt, 0.0));
        if (p.keyDown(K_RIGHT)) p.rotVel = QuatXYZ(0.0, -1.5, 0.0);
        //p.rot = QuatMult(p.rot, QuatXYZ(0.0, dt * 100, 0.0));
        if (p.keyDown(K_SPACE))
        {
            //receiveNew(Bullet, p);
            p.acl[1] = 20.0;
        }
    }
    
    p.health = 5;
    p.hit = function (by)
    {
        p.health--;
    }
    
    return p;
}

Camera = createTrackingCamera;

function Bullet(shooter)
{
    var b = DynamicEntity(BULLET_MESH);
    b.pos = shooter.pos;
    b.rot = shooter.rot;
    b.vel = VecRotate(VecScale(VEC_FORWARD, 100.0), b.rot);
    
    b.collision = function (target)
    {
        if (target != shooter)
        {
            if (target.hit) target.hit(shooter);
            removeEntity(b);
        }
    }
    
    return b;
}

function gameInit()
{
    puid = connect("server:port");
    
    // receive / create game data
    obstacles = receiveAll(Box, 50);
    level = receive(Level);
    players = receiveAll(Player);
    bullets = receiveAll(Bullet);

    player = receiveNew(Player, puid);
    gCamera = receiveNew(Camera, player);

    // hand over control to tedge / tedge server enterprise
    startGame();
}
