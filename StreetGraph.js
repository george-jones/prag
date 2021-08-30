// StreetGraph.js
// Uses recursive subdivision method to break a large
// convex polygon into smaller areas.

System.include('Geom.js');
System.include('Util.js');

function StreetGraph()
{
	this.create = function(play_size, pos, max_area)
	{
		var segs = [];
		var polys = new Util.Group();
				
		function Segment(pt1, pt2)
		{
			this.pt1 = pt1;
			this.pt2 = pt2;
			this.terrain = null;			
		}
		
		function Poly(pta)
		{
			this.points = pta;
			this.segments = [];
		}
		
		function initial_shape()
		{
			var s = 1000;
			var ptg = new Util.Group();
			var num = 16;
			var inc = 2 * Math.PI / num;
			
			// get all points around a circle at a given increment
			for (var angle=0; angle<2*Math.PI; angle += inc) {
				ptg.addItem({'pt': new Geom.Point2(s*Math.cos(angle), s*Math.sin(angle)), 'angle':angle});
			}
			
			// decide how many, and which points should make up the basic shape
			var numpts = Rand.pickWeighted([{ w:0.3, val:5}, { w:0.5, val:6 }, { w:0.2, val:7 }]).val;
			var apts = [];
			var max_pt = null;
			var min_pt = null;
			
			for (var i=0; i<numpts; i++) {
				var pta = ptg.getItems();
				var pto = Rand.pick(pta);
				var pt = pto.pt;
				if (max_pt == null) {					
					max_pt = new Geom.Point2(pt.x, pt.y);
					min_pt = new Geom.Point2(pt.x, pt.y);
				} else {
					if (pt.x > max_pt.x) {
						max_pt.x = pt.x;
					}
					if (pt.y > max_pt.y) {
						max_pt.y = pt.y;
					}
					if (pt.x < min_pt.x) {
						min_pt.x = pt.x;
					}
					if (pt.y < min_pt.y) {
						min_pt.y = pt.y;
					}
				}
				ptg.removeItem(pto);
				apts.push(pto);				
			}						
			
			// put the list of points in order, by angle
			apts.sort(function(a,b) { return a.angle - b.angle; });					
			
			// get list of just the points, with angles ignored, and scaled so that it reaches the
			// same extents (basically) no matter which points were picked
			var scale = new Geom.Point2(play_size.x / (max_pt.x - min_pt.x), play_size.y / (max_pt.y - min_pt.y));			
			var pts = [];
			for (var i=0; i<apts.length; i++) {
				var oldpt = apts[i].pt;
				var scp = new Geom.Point2(pos.x + scale.x*(oldpt.x - min_pt.x), pos.y + scale.y*(oldpt.y - min_pt.y));
				pts.push(scp);
			}			

			// create initial polygon
			var main_poly = new Poly(pts);
			main_poly.level = 0;
			polys.addItem(main_poly);
			
			// create initial segments
			for (var i=0; i<pts.length; i++) {
				var nextpt = pts[(i+1) % pts.length];
				var seg = new Segment(pts[i], nextpt);
				seg.level = 0;
				segs.push(seg);				
				main_poly.segments.push(seg);
			}
			
			// do the splitting
			divide_poly(main_poly);
		}		
		
		function divide_poly(poly)
		{
			var lengths = [];
			
			// get the lengths of all sides
			var pp = poly.points;
			var polysegs = [];
			var polyArea = Geom.Point2.polygonArea(pp);
			var seg_map = [];
			
			if (polyArea > max_area) {
				var seg_lengths = [];
				for (var i=0; i<pp.length; i++) {
			    var p1 = pp[i];
			    var p2 = pp[(i+1)%pp.length];
			    var ps = new Segment(p1, p2);
			    ps.dist = Geom.Point2.dist(p1, p2);
			    if (i==0 || ps.dist > long_seg_len) {
			    	longest_seg = i;
			    	long_seg_len = ps.dist;
			    }
			    ps.index = i;
					polysegs.push(ps);
					seg_lengths.push(ps);
				}				
				
				function seglensort(a,b) { return b.dist - a.dist; }
				
				seg_lengths.sort(seglensort);
				longest_seg = seg_lengths[0].index;

				// make list of segments that it could connect with.  prefer non-adjacent
				// for less ugly splitting
				var splitsegs = [];
				for (var i=0; i<polysegs.length; i++) {
					if (i != longest_seg) {
						if (polysegs.length < 4 || ((i+1) % polysegs.length != longest_seg && (longest_seg + 1) % polysegs.length != i)) {
							splitsegs.push(polysegs[i]);
						}
					}
				}
								
				var other_seg;				
				if (poly.level > 0) {
					// pick the 2nd longest, non-adjacent segment for subdivisions
					splitsegs.sort(seglensort);
					other_seg = splitsegs[0].index;																
				} else {
					// be more loose for the initial division
					other_seg = Rand.pick(splitsegs).index;
				}
				
				var both_segs = [ longest_seg, other_seg ];
				
				// sort by index
				both_segs.sort();								
				
				polysegs = [ polysegs[both_segs[0]], polysegs[both_segs[1]] ];
				
				var segnum = 0;
				var newseg = [];
				var pts_first = [];
				var pts_second = [];
				var segs_first = [];
				var segs_second = [];
				var tol = 0.25;				
				
				// get the points for the connecting segment
				for (var i=0; i<2; i++) {
			    var wiggle = Rand.rangeFloat(0.5-tol/2, 0.5+tol/2);
			    var p1scale = 1 - wiggle;
			    var p2scale = wiggle;
			    var p1 = polysegs[i].pt1;
			    var p2 = polysegs[i].pt2;
			    var mp = new Geom.Point2(p1.x*p1scale + p2.x*p2scale, p1.y*p1scale + p2.y*p2scale);
			    newseg[i] = mp;	
				}
			
				// add new segment to list
				var seg = new Segment(newseg[0], newseg[1]);
				seg.level = poly.level + 1;								
				segs.push(seg);
				
				// place points from original poly and also from the new segment
				// into new lists of points				
				for (var i=0; i<pp.length; i++) {
					var at_divide = false;
					var oseg = poly.segments[i];
					
					if (segnum < 2) {
						at_divide = (i == longest_seg || i == other_seg)? true : false;
					} else {
						at_divide = false;
					}
					
			    if (segnum != 1) {
			    	pts_first.push(pp[i]);
			    	segs_first.push(oseg);
			    } else {
			    	pts_second.push(pp[i]);			    	
			    	segs_second.push(oseg);
			    }
		    	
		    	if (at_divide) {		    	
		        var mp = newseg[segnum];
		        pts_first.push(mp);
		        pts_second.push(mp);		        
		        
		        if (segnum == 0) {
		    			segs_first.push(seg);		    		
		    			segs_second.push(oseg);
		    		} else if (segnum == 1) {
		    			segs_second.push(seg);
		    			segs_first.push(oseg);		    			
		    		}
		    		
		    		segnum++;
			    }
				}
											
				// remove existing poly from the group
				polys.removeItem(poly);
				
				// create two new sub-poly's, and add to group
				var poly1 = new Poly(pts_first);
				var poly2 = new Poly(pts_second);
				poly1.level = poly.level + 1;
				poly2.level = poly.level + 1;
				poly1.segments = segs_first;
				poly2.segments = segs_second;				
				polys.addItem(poly1);
				polys.addItem(poly2);

				divide_poly(poly1);
				divide_poly(poly2);
			}
		}
		initial_shape();
		
		return {'polys':polys, 'segs':segs };			
	}
	
	this.get_inner_poly = function(p, tp)
	{
		var mid = Geom.Point2.midpoint(p.points);
		var lines = [];
		var pts = [];
		var in_range_tol = 0.5;
				
		for (var i in p.segments) {
			var seg = p.segments[i];
			var t = seg.terrain;
			var L1 = [];
			var L2 = [];
			var m1;
			var m2;
			var line;
			
			L1[0] = t.points[0][1];
			L1[1] = t.points[t.u_size-1][1];
			L1.v = 1;
			L1.seg = seg;
			L2[0] = t.points[0][t.v_size-2];
			L2[1] = t.points[t.u_size-1][t.v_size-2];
			L2.v = t.v_size-2;
			L2.seg = seg;
			
			m1 = Geom.Point2.midpoint(L1);
			m2 = Geom.Point2.midpoint(L2);
			
			// see which midpoint is closer to the polygon's midpoint.
			// that is the "inside" line.
			var d1 = Geom.Point2.dist(m1, mid);
			var d2 = Geom.Point2.dist(m2, mid);
							
			if (d1 <= d2) {
				line = L1;
			} else {
				line = L2;					
			}
			lines.push(line);
		}
		
		var i1 = 0;
		var i2 = 1;
		var i3;
		var lines_needed = [];
		var max_d = 0;
		var max_i = 0;
		
		// find the longest segment.  that's where we'll start,
		// as it is most likely to actually be needed.
		for (var i=0; i<lines.length; i++) {
			var d = Geom.Point2.dist(lines[i][0], lines[i][1]);
			if (d > max_d) {
				max_d = d;
				max_i = i;
			}
		}
		
		// keep in counter-clockwise order, but start with longest segment
		var lines_try = [];
		for (var i=0; i<lines.length; i++) {
			lines_try.push((i + max_i) % lines.length);
		}
		
		var skip = [];
		
		// find lines we actually need
		for (var i=0; i<lines_try.length; i++) {		
			i1 = lines_try[i];
			if (skip[i1]) continue;
			L1 = lines[i1];
			i2 = i1;
			while (true) {
				i2 = (i2 + 1) % lines.length;
				i3 = (i2 + 1) % lines.length;
				L2 = lines[i2];
				try {
					var pt = Geom.Point2.linesIntersect(L1[0], L1[1], L2[0], L2[1]);
					var t = p.segments[i3].terrain;
					if (t.onTerrain(pt)) {
						// move to next line, this one is not needed
						skip[i2] = true;
						System.out.write('S ');
						continue;
					} else {
						// this point is actually needed							
						pts.push(pt);
						lines_needed.push(L1);
						break;
					}
				} catch (ex) {
					System.out.write('Line intersection error: ' + ex + '\n');
					return;
				}					
			}
		}
		
		
		// fix up disagreements among corner points. these can be caused by a 3-way intersection.
		// hmmm... doesn't work.
		///for (var i=0; i<lines_needed.length; i++) {
			///var L1 = lines_needed[i];
			///var L2 = lines_needed[(i+1) % lines_needed.length];
			///if (L1[1].x != L2[0].x || L1[1].y != L2[0].y) {
				///return; /// temporary
			///}
		///}			
		
		var all_points = [];
		
		// get intermediate points, as required to fit nicely with the road segments
		for (var i=0; i<lines_needed.length; i++) {
			var L = lines_needed[i];
			var end_1;
			var end_2;
			var start_point;
			var end_point;
			var t = L.seg.terrain;
			all_points[i] = [];
							
			if (i == 0) {
				start_point = Geom.Point3.copy(pts[pts.length-1]);					
			} else {
				start_point = Geom.Point3.copy(pts[i-1]);
			}
			try {
				start_point.z = t.heightAt(start_point);
			} catch (ex) {
				start_point.z = tp.heightAt(start_point);
			}
			
			end_point = Geom.Point3.copy(pts[i]);				
			try {
				end_point.z = t.heightAt(end_point);
			} catch (ex) {
				end_point.z = tp.heightAt(end_point);
			}
			start_point.level = L.seg.level;
			all_points[i].push(start_point);
			
			var middle_points = [];
			
			for (var u=0; u<t.u_size; u++) {					
				var roadpoint = t.points[u][L.v];
				// make sure it is in range, but not the same as one of
				// the endpoints.
				if (Util.inRangeTolerance(roadpoint.x, start_point.x, end_point.x, in_range_tol) &&
				    Util.inRangeTolerance(roadpoint.y, start_point.y, end_point.y, in_range_tol) &&
				    (roadpoint.x != start_point.x || roadpoint.y != start_point.y) &&
				    (roadpoint.x != end_point.x || roadpoint.y != end_point.y)) {
				  var rp2 = Geom.Point3.copy(roadpoint);
					middle_points.push(rp2);
				}
			}
			
			// see which end is closer to the start_point so that they will be added in the right order
			if (middle_points.length > 1) {
				var d1 = Geom.Point2.dist(middle_points[0], start_point);
				var d2 = Geom.Point2.dist(middle_points[middle_points.length-1], start_point);
				var offset_idx;
				var inc;
				
				if (d1 < d2) {
					offset_idx = 0;
					inc = 1;
				} else {
					offset_idx = middle_points.length-1;
					inc = -1;
				}
				
				for (var j=0; j < middle_points.length; j++) {
					var idx = offset_idx + inc*j;
					all_points[i].push(middle_points[idx]);						
				}					
			} else if (middle_points.length > 0) {
				all_points[i].push(middle_points[0]);
			}
			
			all_points[i].push(end_point);
		}
		
		// fix up discrepancies between height at corners.  always take the lower height,
		// as it is better to be slightly further sunken into the road than to be able
		// to see underneath buildings from the road.
		for (var i=0; i<all_points.length; i++) {				
			var prev_i = ((i==0)?(all_points.length-1):i-1);
			var curr_line = all_points[i];
			var curr_pt = curr_line[0];
			var prev_line = all_points[prev_i];
			var prev_pt = prev_line[prev_line.length-1];
			var z;
			
			z = Math.min(curr_pt.z, prev_pt.z);
			curr_pt.z = z;
			prev_pt.z = z;
		}
		
		return all_points;
	}
}