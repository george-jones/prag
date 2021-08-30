// Terrain.js
// Constructor for a terrain patch, and functions
// for getting and setting points and otherwise manipulating.

System.include('Geom.js');
System.include('Rand.js');
System.include('Util.js');

function Terrain()
{
	var the = this;
	
	// u and v are pseudo-coordinates.  The patch can get
	// bent into an arbitrary shape because the points are all
	// assigned their own x,y,z independent of eachother, so the
	// u and v have no relationship with any real coordinates in
	// the 3d space.
	//
	//   3+---+---+
	//    |   |   |
	//    |   |   |
	//   2+---+---+	
	//    |   |   |
	//    |   |   |
	// ^ 1+---+---+
	// |  |   |   |
	// v  |   |   |
	//    +---+---+
	//    0   1   2
	//      u ---->
	//
	the.Patch = function (u_size, v_size) {
		var that = this;
		
		if (u_size < 2 || v_size < 2) {
			throw 'Terrain Patches must be 2x2 or larger';
		}
		
		that.u_size = u_size;
		that.v_size = v_size;
		that.points = [];
		
		var vec_u = null;
		var vec_v = null;
		var vec_u_mag = 0;
		var vec_v_mag = 0;
		
		for (var u=0; u<u_size; u++) {
			that.points[u] = [];
			for (var v=0; v<v_size; v++) {
				that.points[u][v] = new Geom.Point3(0, 0, 0);
			}
		}
		
		function calc_vec_uv()
		{
			var p0 = that.points[0][0];
			var p1 = null;
				
			p1 = that.points[u_size-1][0];
			vec_u = Geom.Point2.sub(p1, p0);
			vec_u_mag = Geom.Point2.magnitude(vec_u);
			vec_u = Geom.Point2.unitize(vec_u);
			
			p2 = that.points[0][v_size-1];
			vec_v = Geom.Point2.sub(p2, p0);
			vec_v_mag = Geom.Point2.magnitude(vec_v);
			vec_v = Geom.Point2.unitize(vec_v);
		}
		
		that.setPoint = function(u, v, p3)
		{
				that.points[u][v] = Geom.Point3.copy(p3);
		}
		
		that.setRectangularXY = function(x0, y0, x1, y1)
		{
			var y_coords = [];
			
			for (var v=0; v<v_size; v++) {				
				y_coords.push(y0 + (y1-y0) * (v / (v_size-1)));
			}
			
			for (var u=0; u<u_size; u++) {
				var ptsu = that.points[u];
				var x = x0 + (x1-x0) * (u / (u_size-1));
				for (var v=0; v<v_size; v++) {
					var pt = ptsu[v];
					pt.x = x;
					pt.y = y_coords[v];
				}
			}			
		}
	
		that.randomize = function(amplitude) {			
			for (var u=0; u<u_size; u++) {
				var ptsu = that.points[u];
				for (var v=0; v<v_size; v++) {
					ptsu[v].z = amplitude * Math.random();
				}
			}			
		}
		
		that.smooth = function() {			
			var u;
			var v;
			var z;
			var k;
			var u_plus;
			var u_minus;
			var v_plus;
			var v_minus;
			var vals;			
			var w = { 'center': 0.5, 'touching':0.1, 'corner':0.025 };
			var weights = [];
			
			// precompute all weighted point values
			for (u=0; u<u_size; u++) {
				weights[u] = [];
				for (v=0; v<v_size; v++) {					
					var o = {};
					z = that.points[u][v].z;
					for (var k in w) {
						o[k] = w[k] * z;
					}
					weights[u][v] = o;					
				}
			}			
						
			for (u=0; u<u_size; u++) {
				u_plus = (u+1) % u_size;
				u_minus = (u>0)? (u-1) : 0;
				for (v=0; v<v_size; v++) {
					v_plus = (v+1) % v_size;
					v_minus = (v>0)? (v-1) : 0;
					vals = [
							weights[u][v].center,
							weights[u_plus][v].touching,
							weights[u_minus][v].touching,
							weights[u][v_plus].touching,
							weights[u][v_minus].touching,
							weights[u_plus][v_plus].corner,
							weights[u_plus][v_minus].corner,
							weights[u_minus][v_plus].corner,
							weights[u_minus][v_minus].corner
					];
					z = 0;
					for (k=0; k<vals.length; k++) {
						z += vals[k];
					}
					that.points[u][v].z = z;
				}
			}						
		}
		
		that.amplify = function(amplitude) {
			var zmin = -1;
			var zmax = -1;
			var ptsu;
			var u;
			var v;
			var ci;
			var mult = 0.0;
			var pt;
			var ptz;
			
			// determine current range
			for (u=0; u<u_size; u++) {
				ptsu = that.points[u];
				for (v=0; v<v_size; v++) {	
					pt = ptsu[v];
					ptz = pt.z;
					if (zmin == -1 || ptz < zmin) {
						zmin = ptz;
					}
					if (zmax == -1 || ptz > zmax) {
						zmax = ptz;
					}				
				}
			}
			
			// perfectly flat.  can't be amplified.
			if (zmax-zmin == 0.0) {
				return;
			}
			
			mult = amplitude / (zmax - zmin);
			
			for (u=0; u<u_size; u++) {
				ptsu = that.points[u];
				for (v=0; v<v_size; v++) {
					pt = ptsu[v];					
					pt.z = (pt.z - zmin) * mult;					
				}
			}						
		}
		
		that.onTerrain = function (point) {
			// translate to u and v coords.  this assumes that the patch is rectangular,
			// but does not need not be aligned with x and y axes.
			
			if (vec_u == null || vec_v == null) {
				calc_vec_uv();
			}
			
			if (vec_u == null || vec_v == null) {
				throw 'Unable to calculate u and v basis vectors';
			}
						
			// to calculate 'u' instead of iterating to find it
			var vec_test = Geom.Point2.sub(point, that.points[0][0]);
			var u_test = Geom.Point2.dot(vec_test, vec_u);
			var v_test = Geom.Point2.dot(vec_test, vec_v);
			
			if (u_test < 0 || v_test < 0 || u_test > vec_u_mag || v_test > vec_v_mag) {
				return false;
			}
			
			return { 'u': u_test };
		}
		
		that.heightAt = function (point) {
			var ont = that.onTerrain(point);
			var u_test;
			
			if (!ont) {
				throw 'Point ' + point + ' not on terrain';
			}
			
			u_test = ont.u;
			
			var u_test2 = (u_size-1) * u_test / vec_u_mag;
			var u1 = Math.floor(u_test2);
			var u2 = Math.ceil(u_test2);
			
			if (u1 < 0 || u2 < 0 || u1 >= that.u_size || u2 >= that.u_size) {
				throw 'Point ' + point + ' not on terrain';				
			}						
			
			for (var v=0; v<v_size-1; v++) {
				var prev = that.points[u1][v];
				var pt = that.points[u2][v+1];
				
				// simple test that really only works if the grid points are evenly spaced
				if (Util.inRange(point.x, prev.x, pt.x) && Util.inRange(point.y, prev.y, pt.y)) {
					var allpts = [];
					
					allpts.push(prev);
					allpts.push(that.points[u1][v+1]);
					allpts.push(pt);
					allpts.push(that.points[u2][v]);																		
					
					for (var i in allpts) {
						if (allpts[i].x == point.x && allpts[i].y == point.y) {
							return allpts[i].z; // exactly on a point
						}
					}
					
					// figure out which triangle we're in, assuming this setup
					//     .----.
					//     |\   |
					//     | \  |
					//     |  \ |
					//     |   \|
					//     .----.
					// we'll take a vector from the bottom-right point to the top-left point,
					// and cross that with a vector from the bottom-right point to the point
					// in consideration.  The z component should be positive for the bottom-left
					// triangle, negative for the top-right triangle.  In these cross-products,
					// we'll ignore the true z coordinates of the terrain points and use 0.
					
					var pt_br = new Geom.Point3(allpts[3].x, allpts[3].y, 0);
					var pt_ul = new Geom.Point3(allpts[1].x, allpts[1].y, 0);
					var pt_test = new Geom.Point3(point.x, point.y, 0);
					var diag_vec = Geom.Point3.sub(pt_ul, pt_br);
					var test_vec = Geom.Point3.sub(pt_test, pt_br);

					var crossZ = Geom.Point3.cross(diag_vec, test_vec).z;
					var planepts = [];
					if (crossZ >= 0) { // lower, or exactly on the line
						planepts.push(allpts[0]);
						planepts.push(allpts[1]);
						planepts.push(allpts[3]);
					} else { // upper
						planepts.push(allpts[1]);
						planepts.push(allpts[2]);
						planepts.push(allpts[3]);
					}
					var vec1 = Geom.Point3.sub(planepts[1], planepts[0]);
					var vec2 = Geom.Point3.sub(planepts[2], planepts[0]);
					var norm = Geom.Point3.cross(vec2, vec1);
												
					// not on the plane after all
					if (norm.z == 0.0) return 0.0;					
					
					var a = planepts[1];
					var z = a.z - ((point.x-a.x)*norm.x + (point.y-a.y)*norm.y) / norm.z;

					return z;
				}
			}
			throw 'Point ' + point + ' not on terrain\n';
		}
		
		that.split = function() {
			var us_1 = Math.ceil(that.u_size / 2);
			var us_2 = 1 + that.u_size - us_1;
			
			var tp1 = new the.Patch(us_1, that.v_size);
			var tp2 = new the.Patch(us_2, that.v_size);
			
			for (var u=0; u<us_1; u++) {
				tp1.points[u] = that.points[u];
			}
			
			for (var u=0; u<us_2; u++) {
				tp2.points[u] = that.points[u+us_1-1];
			}
			return [tp1, tp2];
		}
	}
	
	the.main = function ()
	{
		var p = new the.Patch(5, 6, 0);
		
		System.out.write('Create Patch\n');
		System.out.write(' Expect 5, 6\n');
		System.out.write(' Actual ' + p.u_size + ', ' + p.v_size + '\n\n');
	
		System.out.write('Set Patch size\n');
		p.setRectangularXY(0, 0, 1500, 1800);
		System.out.write('Expect 375, 360\n');
		System.out.write('Actual ' + p.points[1][1].x + ', ' + p.points[1][1].y + '\n\n');
		
		// the following 3 methods are hard to test, other than to just see
		// that they execute with error'ing out
		
		System.out.write('Test randomize\n');
		p.randomize(250);

		System.out.write('Test smooth\n');
		p.smooth();
		
		System.out.write('Test amplify\n');
		p.amplify(250);
		
		System.out.write('Test heightAt: ');
		System.out.write(p.heightAt(new Geom.Point2(500, 500)) + '\n');
		
	}
}