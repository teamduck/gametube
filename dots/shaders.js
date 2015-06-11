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
