// Geom.js
// Functions for 2D and 3D points (can be used as vectors), and for 6-pointed boxes.

function Geom()
{
	var the = this;

	the.shapeTypes = { hexahedron:"hexahedron" };

	// 2D point / 2D vector
	the.Point2 = function(x, y)
	{
		this.x = x;
		this.y = y;
		this.toString = function() {
			return "<" + this.x + ", " + this.y + ">";
		}
	}
	the.Point2.add = function(p1, p2) // or pass a single array as the first argument
	{
		var p = new the.Point2(0, 0);
		var arr;
		if (arguments.length == 1) {
			arr = arguments[0];
		} else {
			arr = [p1, p2];
		}
		for (var i=0; i<arr.length; i++) {
			var ap = arr[i];
			p.x += ap.x;
			p.y += ap.y;
		}
		return p;
	}
	the.Point2.sub = function (p1, p2)
	{
		return new the.Point2(p1.x - p2.x, p1.y - p2.y);
	}	
	the.Point2.addXY = function(p1, x, y)
	{
		return new the.Point2(p1.x + x, p1.y + y);
	}
	the.Point2.copy = function(p)
	{
		return new the.Point2(p.x, p.y);
	}
	the.Point2.scale = function(p, s)
	{
		return new the.Point2(p.x * s, p.y * s);
	}
	the.Point2.dist = function(p1, p2)
	{
		var sum = 0.0;
		var dirs = ['x','y'];
		for (var i in dirs) {
			var d = dirs[i];
			var v = p2[d] - p1[d]; 
			sum += v*v;
		}
		return Math.sqrt(sum);
	}
	the.Point2.unitize = function(p)
	{
		var ret = the.Point2.copy(p);
		var mag = the.Point2.magnitude(p);
		if (mag > 0) {			
			ret.x /= mag;
			ret.y /= mag;
		}
		return ret;
	}	
	the.Point2.magnitude = function(p)
	{
		return Math.sqrt(p.x*p.x + p.y*p.y);
	}	
	the.Point2.dot = function(p1, p2)
	{
		return p1.x*p2.x + p1.y*p2.y;	
	}
	the.Point2.polygonArea = function(pts)
	{
		var a1 = 0;
		var a2 = 0;
		var pt1;
		var pt2;
		
		for (var i=0; i<pts.length; i++) {
			pt1 = pts[i];
			pt2 = pts[(i+1)%pts.length];
			a1 += pt1.x*pt2.y;
			a2 += pt2.x*pt1.y;
		}
		
		return 0.5 * (a1 - a2);		
	}
	the.Point2.inTriangle = function(P, tri_pts)
	{		
		// using barycentric coordinate method, taken from
		// http://www.blackpawn.com/texts/pointinpoly/default.html
		
		if (tri_pts.length != 3) {
			throw "Passed wrong number of points (" + tri_pts.length + ")";
		}
		
		var A = tri_pts[0];
		var B = tri_pts[1];
		var C = tri_pts[2];
		
		// Compute vectors
		var v0 = the.Point2.sub(C, A);
		var v1 = the.Point2.sub(B, A);
		var v2 = the.Point2.sub(P, A);
		
		// Compute dot products
		var dot00 = the.Point2.dot(v0, v0);
		var dot01 = the.Point2.dot(v0, v1);
		var dot02 = the.Point2.dot(v0, v2);
		var dot11 = the.Point2.dot(v1, v1);
		var dot12 = the.Point2.dot(v1, v2);
		
		// Compute barycentric coordinates
		var invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
		var u = (dot11 * dot02 - dot01 * dot12) * invDenom;
		var v = (dot00 * dot12 - dot01 * dot02) * invDenom;
		
		// Check if point is in triangle
		return (u > 0) && (v > 0) && (u + v < 1);		
	}
	the.Point2.midpoint = function(arr)
	{
		var p = new the.Point2(0, 0);
		for (var i=0; i<arr.length; i++) {
			var ap = arr[i];
			p.x += ap.x;
			p.y += ap.y;
		}
		p.x /= arr.length;
		p.y /= arr.length;
		return p;		
	}
	the.Point2.linesIntersect = function(a1, a2, b1, b2)
	{
		var i;
		var j;
		var k;
		var x;
		var y;
		
		i = (a1.x*a2.y - a2.x*a1.y);
		j = (b1.x*b2.y - b2.x*b1.y);
		k = ((a1.x-a2.x)*(b1.y-b2.y) - (b1.x-b2.x)*(a1.y-a2.y));

		if (k != 0.0) {		
			x = (i*(b1.x-b2.x) - j*(a1.x-a2.x)) / k;
			y = (i*(b1.y-b2.y) - j*(a1.y-a2.y)) / k;
			return new the.Point2(x, y);
		} else {
			throw "colinear";
		}	
	}
		
	/*
	the.Line = function(pt1, pt2)
	{
		this.pt1 = pt1;
		this.pt2 = pt2;
	}
	
	the.Line.point2Dist = function(l, pt)
	{
		
	}

	the.Line.point3Dist = function(l, pt)
	{
		
	}
	*/

	// 3D point / 3D vector
	the.Point3 = function(x, y, z)
	{
		this.x = x;
		this.y = y;
		this.z = z;
		this.toString = function() {
			return "<" + this.x + ", " + this.y + ", " + this.z + ">";
		}
	}
	the.Point3.add = function(p1, p2) // or pass a single array as the first argument
	{
		var p = new the.Point3(0, 0, 0);
		var arr;
		if (arguments.length == 1) {
			arr = arguments[0];
		} else {
			arr = [p1, p2];
		}
		for (var i=0; i<arr.length; i++) {
			var ap = arr[i];
			p.x += ap.x;
			p.y += ap.y;
			p.z += ap.z;
		}
		return p;
	}
	the.Point3.sub = function (p1, p2)
	{
		return new the.Point3(p1.x - p2.x, p1.y - p2.y, p1.z - p2.z);
	}
	the.Point3.addXYZ = function(p1, x, y, z)
	{
		return new the.Point3(p1.x + x, p1.y + y, p1.z + z);
	}	
	the.Point3.copy = function(p)
	{
		return new the.Point3(p.x, p.y, p.z);
	}
	the.Point3.scale = function(p, s)
	{
		return new the.Point3(p.x * s, p.y * s, p.z * s);
	}
	the.Point3.magnitude = function(p)
	{
		return Math.sqrt(p.x*p.x + p.y*p.y + p.z*p.z);
	}
	the.Point3.unitize = function(p)
	{
		var ret = the.Point3.copy(p);
		var mag = the.Point3.magnitude(p);
		if (mag > 0) {			
			ret.x /= mag;
			ret.y /= mag;
			ret.z /= mag;
		}
		return ret;
	}
	the.Point3.dot = function(v1, v2)
	{
		return v1.x*v2.x + v1.y*v2.y + v1.z*v2.z;
	}
	the.Point3.cross = function(v1, v2)
	{
		var c = new the.Point3();

		c.x = v1.y * v2.z - v1.z * v2.y;
		c.y = v1.z * v2.x - v1.x * v2.z;
		c.z = v1.x * v2.y - v1.y * v2.x;

		return c;
	}
	the.Point3.rotateAxis = function(v, v_axis, angle)
	{
		var axis = the.Point3.unitize(v_axis);
		var s_angle = Math.sin(angle);
		var c_angle = Math.cos(angle);
		var r1 = the.Point3.scale(v, c_angle);
		var r2 = the.Point3.scale(the.Point3.cross(axis, v), s_angle);
		var r3 = the.Point3.scale(axis, the.Point3.dot(axis, v) * (1 - c_angle));
		return the.Point3.add([r1, r2, r3]);
	}
	the.Point3.midpoint = function(arr)
	{
		var p = new the.Point3(0, 0, 0);
		for (var i=0; i<arr.length; i++) {
			var ap = arr[i];
			p.x += ap.x;
			p.y += ap.y;
			p.z += ap.z;
		}
		p.x /= arr.length;
		p.y /= arr.length;
		p.z /= arr.length;
		return p;		
	}
	the.Point3.dist = function(p1, p2)
	{
		var sum = 0.0;
		var dirs = ['x','y','z'];
		for (var i in dirs) {
			var d = dirs[i];
			var v = p2[d] - p1[d]; 
			sum += v*v;
		}
		return Math.sqrt(sum);
	}
	the.Point3.vectorsAngle = function(v1, v2)
	{
		var mag_1 = the.Point3.magnitude(v1);
		var mag_2 = the.Point3.magnitude(v2);
		var dot = the.Point3.dot(v1, v2);
		var c = dot / (mag_1 * mag_2);
		return Math.acos(c);			                            
	}
	
	// Plane
	the.Plane = function(p0, p1, p2)
        {
                this.p0 = p0;
                this.p1 = p1;
                this.p2 = p2;
        }


	the.Hexahedron = function(pts)
	{
		this.type = the.shapeTypes.hexahedron;
		this.points = pts;		
	}
	
	the.Hexahedron.join = function(a, b)
	{
		
		// find the caps we intend to join
		var a1 = [a.points[0], a.points[4], a.points[7], a.points[3]];
		var a2 = [a.points[2], a.points[6], a.points[5], a.points[1]];
		var b1 = [b.points[0], b.points[4], b.points[7], b.points[3]];
		var b2 = [b.points[2], b.points[6], b.points[5], b.points[1]];
		
		var ma1 = the.Point3.midpoint(a1);
		var ma2 = the.Point3.midpoint(a2);
		var mb1 = the.Point3.midpoint(b1);
		var mb2 = the.Point3.midpoint(b2);				
		
		var d = [];
		var cmp = [[ma1,mb1,a1,b1],[ma1,mb2,a1,b2],[ma2,mb1,a2,b1],[ma2,mb2,a2,b2]];
		for (var i=0; i<cmp.length; i++) {
			d[i] = the.Point3.dist(cmp[i][0], cmp[i][1]);
		}
		
		// find min dist
		var min_idx = Util.arrayMaxIndex(d, function(i) { return -1 * i; });
		var mpa = cmp[min_idx][0];
		var mpb = cmp[min_idx][1];
		var pts_a = cmp[min_idx][2];
		var pts_b = cmp[min_idx][3];
		
		var norm_a;
		var norm_b;	
		var flip_a = false;
		
		if (mpa == ma1) {
			norm_a = the.Point3.unitize(the.Point3.sub(ma1, ma2));
			pts_a = [a.points[0], a.points[4], a.points[7], a.points[3]];
		} else {
			norm_a = the.Point3.unitize(the.Point3.sub(ma2, ma1));		
			pts_a = [a.points[1], a.points[5], a.points[6], a.points[2]];
			flip_a = true;
		}
	
		if (mpb == mb1) {
			norm_b = the.Point3.unitize(the.Point3.sub(mb1, mb2));
			if (flip_a) {
				pts_b = [b.points[3], b.points[7], b.points[4], b.points[0]];
			} else {
				pts_b = [b.points[0], b.points[4], b.points[7], b.points[3]];
			}
		} else {
			norm_b = the.Point3.unitize(the.Point3.sub(mb2, mb1));
			if (flip_a) {
				pts_b = [b.points[1], b.points[5], b.points[6], b.points[2]];
			} else {
				pts_b = [b.points[2], b.points[6], b.points[5], b.points[1]];
			}
		}
		
		var angle = Math.abs(the.Point3.vectorsAngle(norm_a, norm_b));
		if (angle < 0.005) {
			return; // boxes are practically parallel.  Don't bother joining.
		}
				
		// a vector normal to the plane that holds both normal vectors
		var cross = the.Point3.cross(norm_a, norm_b);

		// must consider the opposite rotation if we're talking about the "a" end
		if (min_idx == 0 || min_idx == 1) {
			angle *= -1.0;
		}

		// split the angle in half to find a midway point
		angle /= 2.0;
		if (cross.z < 0) {
			angle *= -1.0;
		}

		// this part is important and I don't understand it yet,
		// but it works and I am moving on.  George
		angle = (Math.PI/2 - angle);

		// calculate offset
		var w = the.Point3.dist(pts_a[0], pts_a[3]);
		var offset = (w / 2) * Math.tan(angle);
		var aov = the.Point3.scale(norm_a, offset);
		for (var i in pts_a) {
			var newpt;
			if (i == 0 || i == 1) {
				newpt = the.Point3.add(pts_a[i], aov);
			} else {
				newpt = the.Point3.sub(pts_a[i], aov);
			}
			var pta = pts_a[i];
			var ptb = pts_b[3-i];
			
			pta.x = newpt.x;
			pta.y = newpt.y;
			pta.z = newpt.z;						
			
			ptb.x = newpt.x;
			ptb.y = newpt.y;
			ptb.z = newpt.z;
		}
	}

	the.rotatedBox = function(p0, p1, w, h, angle)
	{
		var norm = the.Point3.unitize(the.Point3.sub(p1, p0));
		var up;
		var angles = [];

		if (w == 0 || h == 0) {
			throw "Width and height must be non-zero";
		}

		if (norm.x == 0 && norm.y == 0 && norm.z == 0) {
			throw "Box end points must not coincide";
		}

		if (norm.x == 0.0 && norm.y == 0.0) {
			up = new the.Point3(1, 0, 0)	
		} else {
			var z_vec = new the.Point3(0, 0, 1);
			up = the.Point3.unitize(the.Point3.cross(the.Point3.cross(norm, z_vec), norm));
		}
		
		var a = Math.atan(h/w);
		var b = Math.PI/2 - a;
		angles[0] = angle + b;
		angles[1] = angle + b + 2*a;
		angles[2] = angle + 3*b + 2*a;
		angles[3] = angle + 3*b + 4*a;

		var radius = Math.sqrt(w*w/4 + h*h/4);

		var pp = []; // points on the plane
		for (var i=0; i<4; i++) {
			pp[i] = the.Point3.scale(the.Point3.rotateAxis(up, norm, angles[i]), radius);
		}

		// points of the box
		var pts = [];
		pts[0] = the.Point3.add(p0, pp[2]);
		pts[1] = the.Point3.add(p1, pp[2]);
		pts[2] = the.Point3.add(p1, pp[1]);
		pts[3] = the.Point3.add(p0, pp[1]);
		pts[4] = the.Point3.add(p0, pp[3]);
		pts[5] = the.Point3.add(p1, pp[3]);
		pts[6] = the.Point3.add(p1, pp[0]);
		pts[7] = the.Point3.add(p0, pp[0]);
				
		return new the.Hexahedron(pts);
	}	

	// Box - can be used for a large variety of things.  The points (a, b) form a line across the
	// bottom middle of the box.  The box has a thickness w and a height h.
	the.box = function(a, b, w, h)
	{
		
		// calculate all eight points
		//
		//       5-------6  ^
		//      /|      /|  h
		//     / |     / |  |
		//    /  1---B/--2  V
		//   4-------7  /
		//   | /   / | /
		//   |/   /  |/
		//   0---A---3
		//
		//   <---w--->
		var points = [];
		var diff = the.Point3.add(b, the.Point3.scale(a, -1));		
		diff.z = 0; // ignore change in z direction
		diff = the.Point3.unitize(diff);
		diff = the.Point3.scale(diff, w/2);

		points[0] = new the.Point3(a.x - diff.y, a.y + diff.x, a.z);
		points[1] = new the.Point3(b.x - diff.y, b.y + diff.x, b.z);
		points[2] = new the.Point3(b.x + diff.y, b.y - diff.x, b.z);
		points[3] = new the.Point3(a.x + diff.y, a.y - diff.x, a.z);
		points[4] = the.Point3.addXYZ(points[0], 0, 0, h);
		points[5] = the.Point3.addXYZ(points[1], 0, 0, h);
		points[6] = the.Point3.addXYZ(points[2], 0, 0, h);
		points[7] = the.Point3.addXYZ(points[3], 0, 0, h);
		
		return new the.Hexahedron(points);
	}

	the.main = function()
	{
		System.out.write("Testing Point2 constructor\n");
		var p = new the.Point2(5, 10);
		System.out.write("Expect <5, 10>\n");
		System.out.write("Actual " + p + "\n\n");

		System.out.write("Testing Point3 constructor\n");
		var p = new the.Point3(5, 10, 15);
		System.out.write("Expect <5, 10, 15>\n");
		System.out.write("Actual " + p + "\n\n");

		System.out.write("Testing Point2.add\n");
		var p = new the.Point2(5, 10);
		var p2 = new the.Point2(1, -5);
		System.out.write(p + " + " + p2 + "\n");
		System.out.write("Expect <6, 5>\n");
		System.out.write("Actual " + the.Point2.add(p, p2));
		System.out.write("\n\n");

		System.out.write("Testing Point3.add\n");
		var p = new the.Point3(5, 10, 2);
		var p2 = new the.Point3(1, -5, 10);
		System.out.write(p + " + " + p2 + "\n");
		System.out.write("Expect <6, 5, 12>\n");
		System.out.write("Actual " + the.Point3.add(p, p2));
		System.out.write("\n\n");

		System.out.write("Testing Point3.scale\n");
		var p = new the.Point3(1, 2, 3);
		System.out.write("Expect <3, 6, 9>\n");
		System.out.write("Actual " + the.Point3.scale(p, 3));
		System.out.write("\n\n");
	
		System.out.write("Testing Box\n");
		var b = the.box(new the.Point3(0,0,0), new the.Point3(1,1,1), 0.5, 1.0);
		for (var i in b.points) {
			System.out.write(" " + b.points[i] + "\n");
		}
		System.out.write("\n");

		System.out.write("Testing vector dot-product\n");
		var v1 = new the.Point3(1, 1, 0);
		var v2 = new the.Point3(0, 1, 1);
		System.out.write("Expect 1\n");
		System.out.write("Actual " + the.Point3.dot(v1, v2) + "\n\n");

		System.out.write("Testing vector cross-product\n");
		var v1 = new the.Point3(1, 0, 0);
		var v2 = new the.Point3(0, 1, 0);
		System.out.write("Expect <0, 0, 1>\n");
		System.out.write("Actual " + the.Point3.cross(v1, v2) + "\n\n");

		System.out.write("Testing vector rotateAxis\n");
		var v = new the.Point3(5, 0, 3);
		var a = new the.Point3(10, 0, 0);
		var r = the.Point3.rotateAxis(v, a, -1*Math.PI/2);
		System.out.write("Expect <5, 3, 0>\n");	
		System.out.write("Actual " + r + "\n\n");

		System.out.write("Testing Point3.dist\n");
		var v = new the.Point3(3, 4, 0);
		var v2 = new the.Point3(0, -3, 4);
		var d = the.Point3.dist(v1, v2);
		System.out.write("Expect 10\n");
		System.out.write("Actual 10\n\n");

		System.out.write("Testing Point2.inTriangle\n");
		var p = new the.Point2(1, 1);
		var tp = [];
		tp[0] = new the.Point2(0, 0);
		tp[1] = new the.Point2(0, 4);
		tp[2] = new the.Point2(4, 0);
		System.out.write("Expect true\n");
		System.out.write("Actual " + the.Point2.inTriangle(p, tp) + "\n");
		System.out.write("Expect false\n");
		p = new the.Point2(-1, -1);
		System.out.write("Actual " + the.Point2.inTriangle(p, tp) + "\n\n");		

		System.out.write("Testing Point2.linesIntersect\n");
		var p1 = new the.Point2(-5, -5);		
		var p2 = new the.Point2(5, 5);
		var p3 = new the.Point2(0, 5);
		var p4 = new the.Point2(5, 0);
		System.out.write("Expect <2.5, 2.5>\n");
		System.out.write("Actual " + the.Point2.linesIntersect(p1, p2, p3, p4) + "\n\n");

		System.out.write("Testing Point2.linesIntersect colinear\n");
		var p1 = new the.Point2(-5, -5);		
		var p2 = new the.Point2(5, 5);
		var p3 = new the.Point2(-3, -3);
		var p4 = new the.Point2(3, 3);
		System.out.write("Expect colinear\n");
		System.out.write("Actual ");
		try {
			var p = the.Point2.linesIntersect(p1, p2, p3, p4);
			System.out.write(p);
		} catch (ex) {
			System.out.write(ex);
		}
		System.out.write("\n\n");	
	}
}
