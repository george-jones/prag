// RoadMaker.js
// Creates a rounded road that follows an underlying
// terrain.  Since the terrain and road cannot have
// an infinite resolution, it is best to not actually
// use the underlying terrain to produce a surface
// in the game, because the road will at points diverge
// somewhat from it, causing ugly effects.

System.include('Geom.js');
System.include('Terrain.js');
System.include('Texture.js');

function RoadMaker()
{
	var the = this;
	var road_sizes = [ 220, 160, 120, 100, 30, 20, 10 ];	
	var road_seg_len = 220;
	
	this.dirt_road_level = 4;
	
	the.roundRoad = function (terrain, h) {
		var offsets = [
			-5.0*h,
			0.20*h,
			0.40*h,
			0.50*h,
			1.0*h,
			0.50*h,
			0.40*h,
			0.20*h,
			-5.0*h
		];
		
		for (var u = 0; u<terrain.u_size; u++) {			
			for (var v = 0; v<offsets.length; v++) {
				var p = terrain.points[u][v];
				p.z += offsets[v];
			}
		}
	}
	
	the.createRoad = function (pt1, pt2, segs, w, terrain, taper_ends) 
	{
		var dist = Geom.Point3.dist(pt2, pt1);
		var csec = segs + 1;		
		var perp;
		var pt;
		var x;
		var y;
		var z;
		var rt;		
		var off;
		var pts;
		var maxz;
		var offsets = [
			-1*w,
			-0.99*w,
			-0.98*w,
			-0.95*w,
			0,
			0.95*w,
			0.98*w,
			0.99*w,
			1*w
		];		
		
		rt = new Terrain.Patch(csec, offsets.length);		
		
		perp = Geom.Point3.sub(pt2, pt1);
		perp.z = 0;
		
		// rotate 90 degrees to get cross-sectional axis
		x = perp.x;
		y = perp.y;
		perp.x = -1 * y;
		perp.y = x;				
		
		perp = Geom.Point3.unitize(perp);		
		
		for (var u=0; u<csec; u++) {
			
			// find central point
			x = (pt1.x * (segs-u) + pt2.x * u) / segs;
			y = (pt1.y * (segs-u) + pt2.y * u) / segs;
			
			pts = [];
			maxz = 0.0;

			// get x and y coords			
			for (var v=0; v<offsets.length; v++) {
				off = offsets[v];
				pt = new Geom.Point3(x + off*perp.x, y + off*perp.y, 0);				
				pts.push(pt);
				try {
					pt.z = terrain.heightAt(pt);
					if (v > 0 && v < offsets.length-1) {
						if (v == 1 || pt.z > maxz) {
							maxz = pt.z;
						}
					}
				} catch (ex) {
					System.out.write(ex + '\n');
				}				
			}
			
			// find average terrain height for cross section
			var ave_h = 0;
			var max_h = 0;
			for (var v=0; v<pts.length; v++) {
				ave_h += pts[v].z;
				if (v == 0 || pts[v].z > max_h) {
					max_h = pts[v].z;
				}
			}
			ave_h /= pts.length;

			for (var v=0; v<pts.length; v++) {
				var at_cap = (u == 0 || u == csec-1);
				var center = (csec-1)/2;
				var mid_dist = Math.abs(center - u);
				var cap_dist = center - mid_dist;
				off = offsets[v];
				pt = pts[v];
				
				//pt.z = max_h;
				pt.z = pts[v].z;
				
				//
				//if (taper_ends) {
				//	if (at_cap) {
				//		// leave at 0 distance from ground
				//	} else {
				//		pt.z = off.h + (pt.z*mid_dist + ave_h*cap_dist)/center;
				//		
				//		/*
				//		// bring the points adjacent to the caps closer to where
				//		// we want to end up
				//		if (cap_dist == 1) {
				//			var z_cap = 0;
				//			if (u >= center) {
				//				z_cap = pts[pts.length-1].z;
				//			} else {
				//				z_cap = pts[0].z;
				//			}						
				//			pt.z = (pt.z + 3*z_cap)/4;
				//		}
				//		*/
				//	}
				//} else {
				//	// as we near the caps, put more emphasis with jiving with the
				//	// underlying terrain.  toward the center, work at flattening the
				//	// road out using average height of the cross section.										
				//	//pt.z = off.h + (pt.z*mid_dist + ave_h*cap_dist)/center;
				//	pt.z = off.h + min_h;
				//}
				rt.setPoint(u, v, pt);
			}			
			
		}
		
		return rt;
	}
	
	function get_textures(config, dist, large_v_size)
	{
		var textures = {};
		var txt = {};
		var t = config.roads[0].texture;
		for (var i=0; i<t.length; i++) {
			textures[t[i].name] = t[i];
		}
		txt.small = Texture.configToMap(textures.small, 1, 1, Texture.map_types.uniform);
		txt.large = Texture.configToMap(textures.large, 1, large_v_size, Texture.map_types.natural);
		txt.large.u_size = dist / txt.large.u_scale;
		return txt;
	}
	
	the.createTerrain = function(config, map, seg, tp)
	{
		var pt1 = seg.pt1;
		var pt2 = seg.pt2;
		var dist = Geom.Point2.dist(pt2, pt1);
		var rh;		
		var txt = get_textures(config, dist/2048, 3);
		
		rs = road_sizes[Math.min(road_sizes.length-1, seg.level)];
										
		var num_road_segs = Math.ceil(dist / road_seg_len);
		var road = the.createRoad(pt1, pt2, num_road_segs, rs, tp, (seg.level > 0)?true:false);

		if (seg.level >= this.dirt_road_level) {
			road.textureMap = txt.small;
			rh = rs / 100;
		} else {
			var u_scale = 2048;			
			road.textureMap = txt.large;
			rh = rs / 20;
		}
		
		the.roundRoad(road, rh);
		
		road.colorPatch = tp.colorPatch;		
		seg.terrain = road;
		return road;
	}
	
	the.createRoadTriangles = function(config, map, roads, tp)
	{
		var txt = get_textures(config, 0.15, 2);
		var terrains = [];
		for (var i=0; i<roads.length; i++) {
			// create a triangular patch to fill in the gap between outermost road segments
			var road = roads[i];
			var prev_road = roads[(i>0)?(i-1):(roads.length-1)];
			
			if (prev_road && prev_road.v_size == road.v_size) {
				var u = 0;
				var prev_u = prev_road.u_size-1;
				var last_v = Math.floor(road.v_size/2);
				var tri = new Terrain.Patch(2, last_v+1);										
				
				for (var v=0; v<=last_v; v++) {
					var pt1 = Geom.Point3.copy(prev_road.points[prev_u][v]);
					var pt2 = Geom.Point3.copy(road.points[u][v]);						
					tri.setPoint(0, v, pt1);
					tri.setPoint(1, v, pt2);
				}
				tri.textureMap = txt.large
				tri.colorPatch = tp.colorPatch;
				terrains.push(tri);
			}
		}
		return terrains;
	}
	
	the.main = function()
	{
		// no test written
	}	
}