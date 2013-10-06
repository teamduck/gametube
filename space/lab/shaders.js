// SHADERS: //////////////////////////////////////////

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

var TEX_PIXEL_SHADER = 
"#ifdef GL_ES\n" +
"precision highp float;\n" +
"#endif\n" +
"uniform sampler2D uTexture;\n" +
"varying vec2 vTexCoord;\n" +
"void main(void)\n" +
"{\n" +
"gl_FragColor = texture2D(uTexture, vTexCoord);\n" + 
"}\n";

var TEX_VERT_SHADER = 
"attribute vec3 aVertPos;\n" +
"attribute vec2 aTexCoord;\n" +
"uniform mat4 uWMatrix;\n" +
"uniform mat4 uVMatrix;\n" +
"uniform mat4 uPMatrix;\n" +
"varying vec2 vTexCoord;\n" +
"void main(void) {\n" +
"gl_Position = uPMatrix * uVMatrix * uWMatrix * vec4(aVertPos, 1.0);\n" +
"vTexCoord = aTexCoord;\n" +
"}\n";

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
	gl.enableVertexAttribArray(shader.vertPos);
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
		gl.enableVertexAttribArray(shader.vertPos);
		gl.useProgram(shader);
	}
	shader.disable = function () {
		gl.disableVertexAttribArray(shader.vertPos);
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
	gl.enableVertexAttribArray(shader.vertPos);
	shader.texCoord = gl.getAttribLocation(shader, "aTexCoord");
	gl.enableVertexAttribArray(shader.texCoord);
	shader.wMatrix = gl.getUniformLocation(shader, "uWMatrix");	
	shader.vMatrix = gl.getUniformLocation(shader, "uVMatrix");	
	shader.pMatrix = gl.getUniformLocation(shader, "uPMatrix");
	
	shader.enable = function () {
		gl.enableVertexAttribArray(shader.vertPos);
		gl.enableVertexAttribArray(shader.texCoord);
		gl.useProgram(shader);
	}
	shader.disable = function () {
		gl.disableVertexAttribArray(shader.vertPos);
		gl.disableVertexAttribArray(shader.texCoord);
	}
	
	shader.disable();
	return shader;
}

// shaders
function initShaders()
{
	TEX_SHADER = TextureShader();
	STD_SHADER = StandardShader();
	STD_SHADER.enable();
}
