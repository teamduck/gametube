function TextSprite(text, style, font, x, y) {
	if (style === undefined) style = "white";
	if (font === undefined) font = "32px lucida console";
	if (x === undefined) x = 0;
	if (y === undefined) y = 0;
	
	var t = {"x": x, "y": y};
	var bitmap;
	var size;
	var texture = gl.createTexture();
	var mesh = BufferMesh(SQUARE_MESH);
	
	
	context.clearRect(0, 0, canvas2D.width, canvas2D.height);
	context.fillStyle = style;
	context.font = font;
	context.textBaseline = "top";
	context.fillText(text, 0, 0);
	size = context.measureText(text);
	var width = 1; while (width < size.width) width *= 2;
	bitmap = context.getImageData(0, 0, width, width);
	StoreTexture(texture, bitmap);
	
	var identity = Mat4List(Matrix4());
	var screen = Matrix4();
	screen = Mat4Mult(screen, Mat4Translate([1, -1, 0]));
	screen = Mat4Mult(screen, Mat4Scale(width/2, width/2, 1));
	screen = Mat4Mult(screen, Mat4Translate([-canvas.width/2, -canvas.height/2, 0]));
	screen = Mat4Mult(screen, Mat4Scale(2/canvas.width, 2/canvas.height, 1));
	screen = Mat4List(screen);
	
	t.render = function (mtx) {
		// set up texture shader
		TEX_SHADER.enable();
		
		// orthogonal
		gl.uniformMatrix4fv(TEX_SHADER.pMatrix, false, identity);
		gl.uniformMatrix4fv(TEX_SHADER.vMatrix, false, screen);
		
		// blending for transparency
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
		gl.depthMask(false);
		
		// bind texture
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.uniform1i(TEX_SHADER.samplerUniform, 0);
		DrawMesh(mesh, Mat4List(Mat4Translate([2*t.x/width, 2*(canvas.height - t.y)/width, 0])), TEX_SHADER);
		
		gl.disable(gl.BLEND);
		gl.depthMask(true);	
		
		// draw
		gl.uniformMatrix4fv(TEX_SHADER.pMatrix, false, pMatrix);
		gl.uniformMatrix4fv(TEX_SHADER.vMatrix, false, vMatrix);
		TEX_SHADER.disable();
		STD_SHADER.enable();
	}
	return t;
}
