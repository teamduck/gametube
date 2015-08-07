// Tanks in JavaScript
// Started August 2011
// in Aizu, Fukushima, Japan
////////////////////////////

// net
var user_id;
var connected = false;
var socket;

var COLORS = [
	[1.0, 1.0, 1.0],
	[0.0, 1.0, 0.0],
	[1.0, 0.0, 0.0],
	[1.0, 1.0, 0.0],	
	[0.0, 0.8, 1.0],
	[1.0, 0.6, 0.0]
];

//////////////////////////////////////////////////////
// GAME ENTITIES
//////////////////////////////////////////////////////

var bounds = [];

var LEVEL_SIZE = 30;
var NUM_BOXES = 40;
var NUM_PICKUPS = 20;

// box level
function createLevel()
{
	var pulse = 0.0;
    
	var texture = loadTexture('thin.png');
    var mesh = loadMesh(BOX_MESH);
	
	var size = LEVEL_SIZE * 10.0;
	var offs = size / 2.0;	
	
	// throw some boxes down semi randomly
	var boxes = [];
	var x = 7;
	var y = 13;
	for (var i = 1; i <= NUM_BOXES; i++)
	{
		x = (3*x + 23*i) % LEVEL_SIZE;
		y = (7*y + 17*i) % LEVEL_SIZE;
		boxes.push([x, y]);
	}
	
	// make them not go-through-able
	for (box in boxes)
	{
		bounds.push({ 
			min: [boxes[box][0]*10 - offs, -10, boxes[box][1]*10 - offs],
			max: [boxes[box][0]*10 - offs + 10, 10, boxes[box][1]*10 - offs + 10]
		});
	}
	
	// make the arena not-leave-able
	bounds.push({min: [-size, -size, -size], max: [size, 0, size]});
	bounds.push({min: [-size,  size, -size], max: [size, 2*size, size]});
	bounds.push({min: [-size, -size, -size], max: [-offs,size, size]});
	bounds.push({min: [ offs, -size, -size], max: [size, size, size]});
	bounds.push({min: [-size, -size, -size], max: [size, size,-offs]});
	bounds.push({min: [-size, -size,  offs], max: [size, size, size]});
	
	return {
		update: function (dt) { pulse += dt * 1.5; },
		render: function (worldMtx)
		{
			// draw the arena
			setTexture(texture);
			setTexScale(LEVEL_SIZE);
			setColor([0.0, 0.0, 1.0]);
			setPulse(Math.sin(pulse)*0.4 + 0.4);
			mat4.translate(worldMtx, [-offs, -size, -offs]);
			mat4.scale(worldMtx, [size, size, size]);	
			drawMesh(mesh, worldMtx);
			
			// draw all dem little boxes
			mat4.translate(worldMtx, [0.0, 1.0, 0.0]);
			setTexScale(1.0);
			setColor([1.0, 0.0, 1.0]);
			mat4.scale(worldMtx, [10.0/size, 10.0/size, 10.0/size]);
			for (box in boxes)
			{
				mat4.translate(worldMtx, [boxes[box][0] * 1.0, 0.0, boxes[box][1] * 1.0]);
				drawMesh(mesh, worldMtx);
				mat4.translate(worldMtx, [boxes[box][0] * -1.0, 0.0, boxes[box][1] * -1.0]);
			}
		}
	};
}

var tanks = [];

// if you use your address bar to change these, thats cheating
var TANK_FORWARD_SPEED = 35.0;
var TANK_BOOST_SPEED   = 80.0;
var TANK_REVERSE_SPEED = 16.0;
var GRAVITY			   = 30.0;

// tank entity
function createTank()
{
	// public properties
	var t = {
		vel: 	[0, 0, 0],
		accl: 	[0, -GRAVITY, 0],
		drag:	2.0,
		rot:	0,
		rotv:	0,
		roll:	0,
		pitch:	0,		
		bounds: {min: [-1.0, 0.0, -1.0], max: [1.0, 1.0, 1.0]},
		color:	[0, 1, 0],
		health: 5,
		boostTime: 0
	};
	
	// private properties	
	var texture = loadTexture('thick.png');
    var mesh = loadMesh(TANK_MESH);
	var hit = 0;
	var spawnTimer = 1.0;
	
	// methods
	t.update = function (dt) 
	{
		if (t.pos)
		{
			if (hit > 0)
				hit -= dt;
			else
				hit = 0;
				
			if (t.boostTime > 0)
				t.boostTime -= dt;
		
			physics(t, dt);
			collision(t, bounds);
			t.checkForPowerups();
		}
		else
		{
			spawnTimer -= dt;
			if (spawnTimer < 0)
				t.spawn();
		}
	};
	
	t.checkForPowerups = function ()
	{
		for (p in powerups)
		{
			if (checkCollision(t, powerups[p]))
				powerups[p].pickup(t);
		}
	}
		
	t.render = function (worldMtx)
	{
		if (t.pos)
		{
			// render state
			setPulse(hit);
			setTexScale(1.0);
			setColor(t.color);			
			setTexture(texture);
			
			// position
			mat4.translate(worldMtx, t.pos);
			mat4.rotate(worldMtx, t.rot, [0.0, 1.0, 0.0]);
			mat4.rotate(worldMtx, t.roll, [1.0, 0.0, 0.0]);
			mat4.rotate(worldMtx, t.pitch, [0.0, 0.0, 1.0]);
			
			// draw
			drawMesh(mesh, worldMtx);
			
			if (t.boostTime > 0)
			{
				gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
				gl.enable(gl.BLEND);
				
				var alpha = 1.0;
				for (var j = 0; j < 2; j++)
				{
					alpha *= 0.6;
					setColor(t.color, alpha);				
					mat4.rotate(worldMtx, -t.rot, [0.0, 1.0, 0.0]);
					mat4.translate(worldMtx, [t.vel[0] * -0.02 - t.accl[0] * 0.001, t.vel[1] * -0.02, t.vel[2] * -0.02 - t.accl[2] * 0.001]);
					mat4.rotate(worldMtx, t.rot + t.rotv * -0.06, [0.0, 1.0, 0.0]);
					drawMesh(mesh, worldMtx);
				}
				
				gl.disable(gl.BLEND);
			}
		}
	};
	
	// destructor
	t.destroy = function ()
	{
		var idx = tanks.indexOf(t);
		if (idx != -1)
			tanks.splice(idx, 1); 
	}
		
	t.left = function ()
	{
		t.rotv = 2.0;
	};
		
	t.right = function ()
	{
		t.rotv = -2.0;
	};
		
	t.forward = function ()
	{
		t.accl[0] = Math.sin(t.rot-Math.PI/2.0) * 
			(t.boostTime > 0 ? TANK_BOOST_SPEED : TANK_FORWARD_SPEED);
		t.accl[2] = Math.cos(t.rot-Math.PI/2.0) * 
			(t.boostTime > 0 ? TANK_BOOST_SPEED : TANK_FORWARD_SPEED);
	};
		
	t.reverse = function ()
	{
		t.accl[0] = Math.sin(t.rot-Math.PI/2.0) * -TANK_REVERSE_SPEED;
		t.accl[2] = Math.cos(t.rot-Math.PI/2.0) * -TANK_REVERSE_SPEED;
	};
    
    t.shoot = function (side)
    {
        entities.push(createBullet(t, side));  
    };
	
	t.hit = function ()
	{
		t.health--;
		if (t.health <= 0)
			t.die();
		else
		{
			hit = 1.0;
		}
	};
	
	t.die = function ()
	{
		entities.push(createExplosion(t.pos, t.color, 9));
		t.health = 5;
		delete t.pos;
		spawnTimer = 5.0;
	};
	
	t.spawn = function ()
	{
		t.pos =	[Math.random() * 100 - 50, 30, Math.random() * 100 - 50],
		t.vel = [0, 0, 0];
		t.accl = [0, -30, 0];
	};
    
	tanks.push(t);
    return t;
}

// particle explosion
function createExplosion(pos, color, num)
{
	var explosion = {};
	var particles = [];
	var t = -num/10.0;
	
	for (var i = 0; i < num; i++)
	{
		p = [];
		for (var j = 0; j < 6; j++)
			p.push(Math.random() - 0.5);
		p[1] += 0.25;
		var l = 1.0/Math.sqrt(p[3]*p[3] + p[4]*p[4] + p[5]*p[5]);
		for (var j = 3; j < 6; j++)
			p[j] *= l;
		particles.push(p);
	}
	
	var texture = loadTexture('thick.png');
	var box = loadMesh(BOX_MESH);
	
	explosion.update = function (dt)
	{
		t += dt;
		if (num == 1)
			t += dt;
		
		if (t > 1)
			removeEntity(explosion);
	};
	
	var mtx = mat4.create();
	explosion.render = function(worldMtx)
	{
		var alpha = (t < 0) ? 1 : 1 - t;
		setPulse(0);
		setTexScale(1.0);
		setColor([color[0], color[1], color[2], alpha]);			
		setTexture(texture);
		
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
		gl.enable(gl.BLEND);
	
		var q = (t + num/10.0)/(1 + num/10.0);
		var s = num*(q - q*q/2.0);
		var r = t * (1 + num/10.0);
		var z = 0.4+num/5;
		if (num > 1)
			s *= 3;
		else
		{
			s = 0;
			r = 0;
			z = (q - q*q*q/2.0) + 0.2;
		}
	
		mat4.translate(worldMtx, pos);
		for (p in particles)
		{
			mat4.set(worldMtx, mtx);
			mat4.translate(mtx, [particles[p][0]*s, particles[p][1]*s, particles[p][2]*s]);
			mat4.rotate(mtx, r+p/3, [particles[p][3], particles[p][4], particles[p][5]]);
			mat4.scale(mtx, [z, z, z]);
			mat4.translate(mtx, [-0.5, -0.5, -0.5]);			
			
			drawMesh(box, mtx);
		}
		
		gl.disable(gl.BLEND);
	};

	return explosion;
}

var BULLET_SPEED = 40.0;
var BULLET_LIFE = 5.0;

// bullet entity
function createBullet(shooter, side)
{
	// public properties
    var b = {
		pos: 	[shooter.pos[0], shooter.pos[1], shooter.pos[2]],
		vel:	[0, 0, 0],
		accl:	[0, 0, 0],
		drag:	0,
		rot:	shooter.rot,
		rotv:	0,
		pitch:  shooter.pitch,
		bounds:	{min: [-0.5, -0.15, -0.5], max: [0.5, 0.15, 0.5]}
	};
	
	// private properties
    var life = BULLET_LIFE;
    var color = shooter.color;
    var texture = loadTexture('thick.png');
    var mesh = loadMesh(BULLET_MESH);
	
    b.vel[0] = Math.sin(b.rot-Math.PI/2.0) * BULLET_SPEED;
	b.vel[2] = Math.cos(b.rot-Math.PI/2.0) * BULLET_SPEED;
	b.vel[1] = Math.sin(-b.pitch) * BULLET_SPEED;
	
	// bullet placement just right	
	b.pos[0] += Math.sin(b.rot) * 0.4 * side + b.vel[0] * 0.05;
	b.pos[1] += 0.3;
	b.pos[2] += Math.cos(b.rot) * 0.4 * side + b.vel[2] * 0.05;	
    
	// methods
    b.update = function(dt)
    {
		physics(b, dt);
		
		for (t in tanks)
		{
			if (tanks[t] != shooter && checkCollision(tanks[t], b))
			{
				tanks[t].hit();
				entities.push(createExplosion(b.pos, tanks[t].color, 2));
				life = 0;
			}	
		}
		
		if (collision(b, bounds))
		{
			life = 0;
			entities.push(createExplosion(b.pos, color, 1));
		}
        
        life -= dt;
        if (life < 0)
            removeEntity(b);
    };
    
    b.render = function(worldMtx)
    {
        // render state
        setPulse(0.0);
        setTexScale(0.01);
        setColor(color);			
        setTexture(texture);
			
        // position
        mat4.translate(worldMtx, b.pos);
        mat4.rotate(worldMtx, b.rot, [0.0, 1.0, 0.0]);
		mat4.rotate(worldMtx, b.pitch, [0.0, 0.0, 1.0]);
		mat4.scale(worldMtx, [2.0, 1.0, 1.0]);
			
        // draw
        drawMesh(mesh, worldMtx);
    };
    
    return b;
}

powerups = [];

// powerup entity
function createHealth(location)
{
    var health = {
		pos: [location[0], 0.05, location[2]],
		bounds: {
			min: [-1.0, 0.0, -1.0],
			max: [1.0, 0.20, 1.0]
		}
	}; 
	
	var rot = 0.0;
    
    var texture = loadTexture('thick.png');
    var mesh = loadMesh(BOX_MESH);
    
    health.update = function(dt)
    {
        rot += dt;
		if (rot > Math.PI/2)
			rot -= Math.PI/2;
    };
    
    health.render = function(worldMtx)
    {
        // render state
        setPulse(0.0);
        setTexScale(0.01);
        setColor([0.0, 1.0, 0.0]);
        setTexture(texture);
			
        // position
		var scale = 1.0 + (rot / 8.0);
		
        mat4.translate(worldMtx, health.pos);
        mat4.rotate(worldMtx, rot, [0.0, 1.0, 0.0]);
		mat4.scale(worldMtx, [2.5 * scale, 0.1, 2.5 * scale]);		
		mat4.translate(worldMtx, [-0.5, 0.0, -0.5]);
		
        // draw
        drawMesh(mesh, worldMtx);    
    };
	
	health.pickup = function (tank)
	{
		// lol its not health
		tank.boostTime += 15.0;
		removeEntity(health);
	};
	
	// destructor
	health.destroy = function ()
	{
		var idx = powerups.indexOf(health);
		if (idx != -1)
			powerups.splice(idx, 1); 
	}

	powerups.push(health);
    return health;
}

// transform the tank into a biplane
// just for fun
function makePlane(tank)
{
	tank.isPlane = true;
	tank.drag = 1.0;	
	if (tank.hasBeenPlane)	// once a plane, always a plane
		return tank;
	
	tank.hasBeenPlane = 'VRRRRROOOOOOOM';
	
	var props = 0;
	var airSpeed = 0;
	
	var tankUpdate = tank.update;
	tank.update = function (dt)
	{
		if (tank.isPlane)
		{
			tank.drag = (tank.pos[1] > 0.1 ? 0.5 : 1.0);
		
			airSpeed = tank.vel[0] * Math.sin(tank.rot-Math.PI/2.0) + tank.vel[2] * Math.cos(tank.rot-Math.PI/2.0);
			
			tank.accl[1] = airSpeed - GRAVITY;
			
			tank.roll += (tank.rotv*airSpeed/tank.drag/150.0 - tank.roll) * 2.0 * dt;
			tank.pitch += (-tank.vel[1]/40.0 - tank.pitch) * 5.0 * dt;
		
			props += airSpeed * dt;
		}
	
		tankUpdate(dt);
	};
	
	var tankRender = tank.render;
	tank.render = function (worldMtx)
	{
		tankRender(worldMtx);
		
		if (tank.isPlane)
		{
			setColor(tank.color, 1.0);
			
			// position
			mat4.identity(worldMtx);
			mat4.translate(worldMtx, tank.pos);
			mat4.rotate(worldMtx, tank.rot, [0.0, 1.0, 0.0]);
			mat4.rotate(worldMtx, tank.roll, [1.0, 0.0, 0.0]);
			mat4.rotate(worldMtx, tank.pitch, [0.0, 0.0, 1.0]);			
			
			// draw wing
			mat4.rotate(worldMtx, Math.PI/2, [0.0, 1.0, 0.0]);
			mat4.translate(worldMtx, [-6.0, 0.5, 0.0]);		
			mat4.scale(worldMtx, [12.0, 0.2, 1.0]);
			drawMesh(BOX_MESH, worldMtx);
			
			// draw blade 1
			mat4.scale(worldMtx, [0.08, 5.0, 1.0]);
			mat4.rotate(worldMtx, props, [0.0, 0.0, 1.0]);		
			mat4.translate(worldMtx, [-1.5, 0.0, 0.0]);
			mat4.scale(worldMtx, [3.0, 0.3, 0.05]);
			drawMesh(BOX_MESH, worldMtx);
			
			// draw blade 2
			mat4.scale(worldMtx, [0.333, 3.333, 20]);
			mat4.translate(worldMtx, [1.5, 0.0, 0.0]);
			mat4.rotate(worldMtx, -props, [0.0, 0.0, 1.0]);
			mat4.translate(worldMtx, [12.0, 0.0, 0.0]);
			mat4.rotate(worldMtx, -props, [0.0, 0.0, 1.0]);
			mat4.translate(worldMtx, [-1.5, 0.0, 0.0]);
			mat4.scale(worldMtx, [3.0, 0.3, 0.05]);
			drawMesh(BOX_MESH, worldMtx);
		}
	};
	
	var tankShoot = tank.shoot;
	tank.shoot = function (side)
	{
		if (tank.isPlane)
		{
			entities.push(createBullet(tank, -1));
			entities.push(createBullet(tank, 1)); 		
		}
		else
			tankShoot(side); 
	}
	
	var tankDie = tank.die;
	tank.die = function ()
	{
		tank.isPlane = false; // gotta earn it
		tank.drag = 2.0;
		tank.roll = 0.0;
		tank.pitch = 0.0;
		tankDie();
	}
	
	return tank;
}


// player entity
var SHOOT_DELAY = 0.25;
function createPlayer()
{
	var player = createTank();
	
	// private properties
    var shootDelay = 0.0;
	var shootSide = -1;
	var netSync = 0.0;
	
	// override update()
	var tankUpdate = player.update;	
	player.update = function(dt)
	{	
        if (shootDelay > 0.0)
            shootDelay -= dt;
        else if (K_SPACE && player.pos)
        {
            player.shoot(shootSide);
			socket.json.send({
				event: 'shoot',
                id: user_id,
				pos: player.pos,
				vel: player.vel,
				accl: player.accl,
				rot: player.rot,
				rotv: player.rotv,
				pitch: player.pitch,
				roll: player.roll,
				side: shootSide
			});
			
			shootDelay = SHOOT_DELAY;
			shootSide *= -1.0;			
        }
    
		player.accl[0] = 0;
		player.accl[2] = 0;
		player.rotv = 0;
		
		if (K_LEFT)
			player.left(dt);
		if (K_RIGHT)
			player.right(dt);
		if (K_UP)
			player.forward(dt);
		if (K_DOWN)
			player.reverse(dt);
		if (K_KONAMI)
			makePlane(player);
		
		tankUpdate(dt);
        
		netSync += dt;
		if (connected && player.pos && netSync > 0.067)
		{
			socket.json.send({
				event: 'pos',
                id: user_id,
				pos: player.pos,
				vel: player.vel,
				accl: player.accl,
				rot: player.rot,
				rotv: player.rotv,
				roll: player.roll,
				pitch: player.pitch,
				isPlane: player.isPlane,
				keys: {
					left: 	K_LEFT, 
					right: 	K_RIGHT, 
					up:		K_UP, 
					down:	K_DOWN
				}
			});
			
			netSync = 0.0;
		}        
	}
	
	// override spawn()
	var tankSpawn = player.spawn;
	player.spawn = function ()
	{
		if (user_id)
			tankSpawn();
	}
	
	// override die()
	var tankDie = player.die;
	player.die = function ()
	{
		socket.json.send({
			event: 'die',
			id:	user_id
		});
		tankDie();
	}
	
	return player;
}

//////////////////////////////////////////////////////
// NET CODE
//////////////////////////////////////////////////////

var socket;
var netPlayers = {};

function createNetPlayer(id)
{
	var player = createTank();
	player.color = COLORS[id % COLORS.length];

	// public properties
	var tick = 0;
	var keys;
	
	// methods
	player.netUpdate = function(data)
	{
		tick = 0;
		player.pos = data['pos'];
		player.vel = data['vel'];
		player.accl = data['accl'];
		player.rot = data['rot'];
		player.rotv = data['rotv'];
		if (data['isPlane'])
		{
			if (!player.isPlane)
				makePlane(player);
			player.isPlane = data['isPlane'];
			player.roll = data['roll'];
			player.pitch = data['pitch'];
		}
		keys = data['keys'];
	}
	
	// override update()
	var tankUpdate = player.update;
	player.update = function (dt)
	{
		player.health = 5;
	
		if (keys && keys.left)
			player.left();
		if (keys && keys.right)
			player.right();
		if (keys && keys.up)
			player.forward();
		if (keys && keys.down)
			player.reverse();
	
		tankUpdate(dt);
	
		tick += dt;
		if (tick > 10.0)
		{
            removeEntity(player);
			if (netPlayers[id])
				delete netPlayers[id];
		}
	}
	
	// override spawn()
	player.spwan = function () {};
	
	return player;
}

function netMessage(resp)
{
    if (resp['event'] == 'hi')
    {
        user_id = resp['id'];
		connected = true;
		tanks[0].color = COLORS[user_id % COLORS.length];
    }
	else
	{
		var user = resp['id'];
		if (resp['event'] == 'pos' || resp['event'] == 'shoot')
		{
			// find the netplayer or create them		
			if (!netPlayers[user])
			{
				var player = createNetPlayer(user);
				entities.push(player);
				netPlayers[user] = player;
			}
		
			// update physics
			netPlayers[user].netUpdate(resp);
        
			// pew pew pew
			if (resp['event'] == 'shoot')
			{
				netPlayers[user].shoot(resp['side']);
			}
		}
		else if (resp['event'] == 'die')
		{
			if (netPlayers[user])
				netPlayers[user].die();
		}
		else
		{
			// unknown event
			alert("unknown event: " + resp['event']);
		}
	}
}

function netConnect()
{
	socket = io.connect();
	socket.on('disconnect', function(){connected = false;});
	socket.on('message', netMessage);
}

//////////////////////////////////////////////////////
// LOL THATS IT
//////////////////////////////////////////////////////

// preload for performance
function loadResources()
{
	loadMesh(TANK_MESH);
	loadMesh(BOX_MESH);
    loadMesh(BULLET_MESH);
	loadTexture('thick.png');
	loadTexture('thin.png');
}

function gameInit()
{
	loadResources();

	var level = createLevel();
	var player = createPlayer();
	gCamera = createTrackingCamera(player);
	entities = [level, player, gCamera];
	
	// sprinkle some boost packs on the ground for good measure
	var x = 7; var y = 17; var offs = LEVEL_SIZE*5;
	for (var i = 1; i <= NUM_PICKUPS; i++)
	{
		x = (3*x + 23*i) % (LEVEL_SIZE-1);
		y = (7*y + 17*i) % (LEVEL_SIZE-1);	
		var health = createHealth([x*10 - offs + 5, 0, y*10 - offs + 5]);
		entities.push(health);
	}	
	
	// rock and roll
	if (!singleplayer) {
    netConnect();
  } else {
    connected = true;
    connected = true;
    socket = {json: {send: function(a) { /*alert(a.event);*/ } } };
  }
	startGame();
  
  if (singleplayer) {
    netMessage({event: 'hi', id: 1});
  }
}
