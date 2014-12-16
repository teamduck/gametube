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
