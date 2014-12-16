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

