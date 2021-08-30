// BuildingGen.js
// Generates geometry of and entities inside a building

System.include('Prag.js');
System.include('Rand.js');
System.include('Geom.js');
System.include('Util.js');

/*
building types
==============
shop
restaurant
home
office
factory
meeting hall
*/

function BuildingGen()
{
	var out = System.out.write;
	var the = this;
	
	// this should all come from XML
	var build_types = [
		{ 'name':'shop', 'ideal_area':67000, 'func': shop },
		{ 'name':'rest', 'ideal_area':78000, 'func': shop },
		{ 'name':'home', 'ideal_area':100000, 'func': shop },
		{ 'name':'offc', 'ideal_area':130000, 'func': shop },
		{ 'name':'fact', 'ideal_area':142000, 'func': shop },
		{ 'name':'meet', 'ideal_area':165000, 'func': shop }
	];
	
	// a is the area
	// x_size and y_size are sizes of the rectangle
	// dc is distance to the center of the map
	// maxdc is the maximum distance from an exterior point to the center of the map
	this.create = function(config, bldg, a, x_size, y_size, dc, maxdc)
	{
		var diffs = [];
		var td = 0; // total of all differences		
		var idx = -1;			
		
		//
		// pick the building type using a sort of gravitational method
		// of distance away from each 'ideal' area as a factor in the
		// probability of choosing that building type.		
		// 
		
		// see how far away from each building type's ideal area this building is
		for (var i=0; i<build_types.length; i++) {
			var bt = build_types[i];
			var ia = bt.ideal_area;
			var d = Math.abs(a - ia);
			if (d == 0.0) {
				idx = i;
			}
			td += d;
			diffs.push(d);
		}
		
		if (idx == -1) {
			var tp = 0;
			for (var i=0; i<diffs.length; i++) {
				//
				// this is the 'gravity' part, ie:  1/dist^2
				//
				diffs[i] = 1.0 / Math.pow(diffs[i] / td, 2.0);
				tp += diffs[i];
			}			
		
			// determine a divisor and calculate weights such that they will add up to 100% (1.0)
			var probs = [];
			for (var i=0; i<diffs.length; i++) {
				var prob = {'idx':i, 'w':(diffs[i]/tp)};
				probs.push(prob);
			}		
			idx = Rand.pickWeighted(probs).idx;		
		}
		
		var bt = build_types[idx];
		
		return bt.func(config, bldg, a, x_size, y_size, dc, maxdc);		
	}
	
	function shop(config, bldg, a, x_size, y_size, dc, maxdc) {		
		var boxes = [];
		var floors = 0;						
		var textures = {};
		var t = bldg.texture;
		for (var i=0; i<t.length; i++) {
			textures[t[i].name] = Texture.configToBasic(t[i]);
		}				
		var txt_int = textures.interior;
		var txt_ext = textures.exterior;
		var ww = parseInt(bldg.wall_width, 10); // wall width
		var sheight = parseInt(bldg.story_height, 10);
		var fh = parseInt(bldg.floor_height, 10);
		var dheight = parseInt(bldg.door_height, 10);		
		var dwidth = parseInt(bldg.door_width, 10);
		var stairwell_width = parseInt(bldg.stairwell_width);
		var stairwell_length = parseInt(bldg.stairwell_length);
		var max_floors = parseInt(bldg.max_floors);		
		var pts = []; // clockwise arrangement of corners		
		var ug = 2;		
		var dw;
		var dp;
		var wh;
		var ctr;
		var pcnt = (dc / maxdc);
		var doors = {};
		var landing_size = 50;			
		var do_stairs = (x_size > 2*landing_size + stairwell_length && y_size > 3*stairwell_width);
		
		floors = max_floors - Math.floor(pcnt*max_floors);
		
		if (floors > 1 && !do_stairs) {
			System.out.write('  Shortened building too small for a stairwell.\n');
		}
		
		if (floors == 0 || !do_stairs) {
			floors = 1;
		}
				
		var wnums = [];
		for (var i=0; i<floors; i++) {
			wnums.push(i);
		}
		
		var other_doors = Rand.pickWeighted([{w:0.20, n:0}, {w:0.50, n:1}, {w:0.30, n:2}]).n;
		var doorsGroup = new Util.Group();
		doorsGroup.addItem('left');
		doorsGroup.addItem('back');
		doorsGroup.addItem('right');
		for (var i=0; i<other_doors; i++) {
			var di = doorsGroup.getItems();
			var item = Rand.pick(di);
			doors[item] = true;
			doorsGroup.removeItem(item);
		}
		
		wh = floors * sheight + fh;

		pts[0] = new Geom.Point3(0,0,0);
		pts[1] = new Geom.Point3(0,y_size,0);
		pts[2] = new Geom.Point3(x_size,y_size,0);
		pts[3] = new Geom.Point3(x_size,0,0);
		
		function wall_shapes_append(wall) {
			var sh = wall.getShapes();
			for (var i=0; i<sh.length; i++) {
				boxes.push(sh[i]);
			}			
		}
		
		// floor
		var m1 = Geom.Point3.midpoint([pts[0], pts[1]]);
		var m2 = Geom.Point3.midpoint([pts[3], pts[2]]);
		m1.z = -1*ug;
		m2.z = -1*ug;
		var w = new the.Wall(m1, m2, y_size, fh+ug, txt_int, txt_ext, the.Wall.side.top);
		wall_shapes_append(w);

		function wall_rand_windows(wall, w_size, h_size, nums) {
			var num = Rand.pick(nums);
			for (var i=0; i<num; i++) {
				var buff = 15;
				var wind_size = new Geom.Point2(Rand.range(15, 75), Rand.range(15, 75));
				var min_w = buff + wind_size.x;
				var max_w = w_size - buff - wind_size.x;
				var min_h = buff + wind_size.y;
				var max_h = h_size - buff - wind_size.y;
				var w = Rand.range(min_w, max_w);
				var h = Rand.range(min_h, max_h);
				wall.addHole(w, h, w+wind_size.x, h+wind_size.y, the.Wall.holeTypes.window);
			}			
		}
				
		// left wall
		var w = new the.Wall(Geom.Point3.addXYZ(pts[0],ww/2,0,fh), Geom.Point3.addXYZ(pts[1],ww/2,0,fh),
			ww, wh, txt_int, txt_ext, the.Wall.side.right);
		if (doors.left) {
			ctr = y_size / 2;
			dw = Math.min(x_size - 2*ww, dwidth);
			dp = Rand.range(dw, y_size-dw);
			w.addHole(dp - dw/2, 0, dp + dw/2, dheight, the.Wall.holeTypes.door);
		}
		wall_rand_windows(w, y_size, wh, wnums);
		
		wall_shapes_append(w);		
		
		// right wall
		var w = new the.Wall(Geom.Point3.addXYZ(pts[3],-1*ww/2,0,fh), Geom.Point3.addXYZ(pts[2],-1*ww/2,0,fh),
			ww, wh, txt_int, txt_ext, the.Wall.side.left);
		if (doors.right) {
			ctr = y_size / 2;
			dw = Math.min(x_size - 2*ww, dwidth);
			dp = Rand.range(dw, y_size-dw);
			w.addHole(dp - dw/2, 0, dp + dw/2, dheight, the.Wall.holeTypes.door);
		}
		wall_rand_windows(w, y_size, wh, wnums);
		wall_shapes_append(w);		

		// front wall
		var w = new the.Wall(Geom.Point3.addXYZ(pts[0],ww,ww/2,fh), Geom.Point3.addXYZ(pts[3],-1*ww,ww/2,fh),
			ww, wh, txt_int, txt_ext, the.Wall.side.left);
		var ctr = x_size / 2;
		dwidth = Math.min(x_size - 2*ww, dwidth);		
		w.addHole(ctr - dwidth/2, 0, ctr + dwidth/2, dheight, the.Wall.holeTypes.door);
		wall_rand_windows(w, x_size, wh, wnums);
		wall_shapes_append(w);

		// back wall
		var w = new the.Wall(Geom.Point3.addXYZ(pts[1],ww,-1*ww/2,fh), Geom.Point3.addXYZ(pts[2],-1*ww,-1*ww/2,fh),
			ww, wh, txt_int, txt_ext, the.Wall.side.right);
		if (doors.back) {
			ctr = x_size / 2;
			dw = Math.min(x_size - 2*ww, dwidth);
			dp = Rand.range(dw, x_size-dw);
			w.addHole(dp - dw/2, 0, dp + dw/2, dheight, the.Wall.holeTypes.door);
		}
		wall_rand_windows(w, x_size, wh, wnums);
		wall_shapes_append(w);
		
		var stair_start = new Geom.Point2(landing_size, y_size/2 - stairwell_width/2);
		var stair_end = new Geom.Point2(landing_size + stairwell_length, y_size/2 + stairwell_width/2);
				
		for (var i=1; i<floors+1; i++) {
			var pt1 = Geom.Point3.copy(pts[0]);
			var pt2 = Geom.Point3.copy(pts[1]);

			//pt1.y += ww;
			//pt2.y -= ww;			
			
			// draw a vertical wall
			var w = new the.Wall(pt1, pt2, fh, pts[3].x-pts[0].x-ww*2, txt_int, txt_ext, the.Wall.side.interior_side);
			if (do_stairs) {
				// y's and x's transposed purposely here
				w.addHole(stair_start.y, stair_start.x, stair_end.y, stair_end.x, the.Wall.holeTypes.door);
			}			
			
			//  the coordinates to pull the wall down to become
			// a ceiling with a hole in it for a stairwell
			var sh = w.getShapes();
			for (var j=0; j<sh.length; j++) {
				var bpts = sh[j].points;
				for (var k=0; k<bpts.length; k++) {
					var pt = bpts[k];
					var tmp = pt.x;
					pt.x = pt.z + ww;
					pt.z = 1.5*fh + i*sheight - tmp;
				}
				// points must also be rearranged because when the
				// box gets recreated to be put into the right spot,
				// it relies on points 0-3 being the bottom and 3-7
				// being the top.  This should be fixed, really.
				//
				//   original vertical wall
				//   4----7
				//   |5--6|       rotated         remapped pts array
				//   ||  ||       0-------4       4-------7
				//   ||  ||  -->  |1-----5|  -->  |5-----6|
				//   |1--2|       |2-----6|       |1-----2|
				//   0----3       3-------7       0-------3
				//
				Util.arrayArrange(bpts, [4, 5, 1, 0, 7, 6, 2, 3 ]);
				boxes.push(sh[j]);
			}
			
			// make stairs
			if (do_stairs) {	
				var step_height = 6;
				var h = sheight - ((i>1)?fh : 0);
				var num_steps = Math.ceil(h / step_height);
				step_height = h / num_steps;
				var step_length = stairwell_length / num_steps;							
				var pos = Geom.Point3.copy(stair_start);
				var pos2;
				pos.x += ww + step_length/2;				
				pos.z = (i-1)*sheight + ((i>1)?2:1)*fh;
								
				for (var j=0; j<num_steps; j++) {				
					pos2 = new Geom.Point3(pos.x, stair_end.y, pos.z);
					var b = Geom.box(pos, pos2, step_length, step_height);
					b.texture = txt_int;
					b.faceTextures = {};
					boxes.push(b);
					pos.x += step_length;
					pos.z += step_height;
				}
				
				// posts are put in to guide the player to the middle of the stairwell so
				// that they don't hit their head on the ceiling so much while going up.
				pos = Geom.Point3.copy(stair_start);
				pos.x += ww;
				pos.y -= ww/2;
				pos.z = (i-1)*sheight + fh;
				pos2 = Geom.Point3.addXYZ(pos, ww, 0, 0, 0);				
				var b = Geom.box(pos, pos2, ww, sheight);
				b.texture = txt_ext;
				b.faceTextures = {};
				boxes.push(b);

				pos = Geom.Point3.copy(stair_start);
				pos.x += ww;
				pos.y += stairwell_width + ww/2;
				pos.z = (i-1)*sheight + fh;
				pos2 = Geom.Point3.addXYZ(pos, ww, 0, 0, 0);
				var b = Geom.box(pos, pos2, ww, sheight);
				b.texture = txt_ext;
				b.faceTextures = {};
				boxes.push(b);
			}
		}
		
		// make spawn points that are not in the stairs
		var sp = new Geom.Point3(x_size/2, y_size/2 - stairwell_width + 3, fh+2);
		var sp2 = Geom.Point3.copy(sp);
		var entities = [];
		
		// make the spawn point face the main doorway
		entities.push(new Prag.Entity(sp, null, Prag.spawn_types.dm, [0, 270, 0]));
		entities.push(new Prag.Entity(sp2, null, Prag.spawn_types.tdm, [0, 270, 0]));
		
		return { 'boxes':boxes, 'entities':entities };
	}
	
	the.Wall = function(p1, p2, w, h, txt_int, txt_ext, interior_side)
	{
		var that = this;
		var holes = [];
		var dist = Geom.Point3.dist(p2, p1);
		var len = 0;		
		
		that.dist = dist;
		that.w = w;
		that.h = h;

		that.addHole = function(w1, h1, w2, h2, holeType)
		{
			var h = {'w1': w1, 'h1': h1, 'w2': w2, 'h2': h2, 'type': holeType};
			holes.push(h);
		}
		
		that.getShapes = function()
		{
			var shapes = [];
			var norm = Geom.Point3.sub(p2, p1);
			len = Geom.Point3.magnitude(norm);
			norm = Geom.Point3.unitize(norm);

			// gather all w and h into groups configured to hold unique items.
			var wg = new Util.Group(true);
			var hg = new Util.Group(true);
			wg.addItem(0);
			wg.addItem(len);
			hg.addItem(0);
			hg.addItem(h);
			
			for (var i=0; i<holes.length; i++) {
				wg.addItem(holes[i].w1);
				wg.addItem(holes[i].w2);
				hg.addItem(holes[i].h1);
				hg.addItem(holes[i].h2);
			}			

			var numeric_sort = function(a,b) { return a-b; };
			var w_coords = wg.getItems().sort(numeric_sort);
			var h_coords = hg.getItems().sort(numeric_sort);
			
			// organize into a grid of single-cell groups
			var grid = [];
			var wc;
			var hc;			
			for (var i=0; i<w_coords.length-1; i++) {
				wc = (w_coords[i] + w_coords[i+1]) / 2;
				grid[i] = [];
				for (var j=0; j<h_coords.length-1; j++) {
					var in_hole = false;
					hc = (h_coords[j] + h_coords[j+1]) / 2;
					for (var k=0; k<holes.length && !in_hole; k++) {
						var hole = holes[k];
						if (hole.w1 < wc && hole.h1 < hc && hole.w2 > wc && hole.h2 > hc) {
							in_hole = hole;
						}
					}										
					grid[i][j] = { 'hole':in_hole, 'i1':i, 'j1':j, 'i2':i+1, 'j2':j+1 };					
				}
			}
			
			// merge the groups where possible... 			
			// smear up			
			for (var i=0; i<grid.length; i++) {
				var prev = false;
				var gridi = grid[i];
				for (var j=0; j<gridi.length; j++) {
					var cell = gridi[j];
					if (!prev || prev.hole != cell.hole) {
						prev = cell;
					} else {
						prev.j2 = j+1; // this is the smearing
						gridi[j] = null;
					}
				}
			}			
						
			for (var i=0; i<grid.length; i++) {
				var gridi = grid[i];
				for (var j=0; j<gridi.length; j++) {					
					var cell = gridi[j];
					if (cell) {
						var w1 = w_coords[cell.i1];
						var w2 = w_coords[cell.i2];
						var h1 = h_coords[cell.j1];
						var h2 = h_coords[cell.j2];
						
						///// TODO - support for real windows, not just empty spaces
						if (!cell.hole) {
							var low_v = Geom.Point3.addXYZ(Geom.Point3.add(p1, Geom.Point3.scale(norm, w1)), 0, 0, h1);
							var high_v = Geom.Point3.addXYZ(Geom.Point3.add(p1, Geom.Point3.scale(norm, w2)), 0, 0, h1);							
							var wh = h2-h1;
							var hh = Geom.box(low_v, high_v, w, wh);
							
							if (interior_side == the.Wall.side.interior) {
								hh.texture = txt_int;
								hh.faceTextures = {};
							} else {
								hh.texture = txt_ext;
								hh.faceTextures = {};
								hh.faceTextures[Util.keyFromValue(the.Wall.side, interior_side)] = txt_int;
								if (interior_side != the.Wall.side.top && interior_side != the.Wall.side.bottom) {
									hh.faceTextures.top = txt_int;
									hh.faceTextures.bottom = txt_int;
								}
							}
							
							shapes.push(hh);
						}
					}
				}
			}
			
			return shapes;
		}
	}
	
	the.Wall.holeTypes = { window:0, door:1 };
	the.Wall.side = { interior:0, left:1, right:2, front:3, back: 4, bottom: 5, top: 6 };
		
}
