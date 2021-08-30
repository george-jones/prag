// Prag.js - procedural random arena generator
// Creates multiplayer maps for FPS games
// including Call of Duty 2 and Call of Duty 4

System.include('Geom.js');
System.include('Util.js');
System.include('XML.js');
System.include('Terrain.js');
System.include('Texture.js');
System.include('StreetGraph.js');
System.include('RoadMaker.js');
System.include('BuildingGen.js');

// Known issues:
// 1/28/2008:
//   * Sometimes a corner point of an area will be raised up far above its neighbors,
//     leaving a visible opening in the terrain
//   * The rotation code that converts boxes from simple coordinates to the real
//     coordinates is not correct.  Occassionally, a building will be 180-degrees
//     off and leave a hole where it belongs
//   * Walls are sometimes constructed in a way that they look solid in radiant
//     but are transparent from one side in the game.

function Prag()
{
  var the = this;
  var out = System.out.write;

  the.spawn_types = {
    'camera':'mp_global_intermission',
    'dm':'mp_dm_spawn',
    'ctf_allied':'mp_ctf_spawn_allied',
    'ctf_axis':'mp_ctf_spawn_axis',
    'tdm':'mp_tdm_spawn'
  };

  the.Entity = function (pos, model, class_name, angles)
  {
    this.pos = pos;   
    this.model = model;
    this.class_name = class_name;
    this.angles = angles;
  }
  
  function entity_write(file, ent)
  {
    var entStr;

    entStr = '{\n' +      
      '"origin" "' + ent.pos.x + ' ' + ent.pos.y + ' ' + ent.pos.z + '"\n';
    
    if (ent.model) {
      entStr += '"model" "' + ent.model + '"\n';
    }
    
    if (ent.class_name) {
      entStr += '"classname" "' + ent.class_name + '"\n';
    }
    
    if (ent.angles) {
      entStr += '"angles" "' + ent.angles[0] + ' ' + ent.angles[1] + ' ' + ent.angles[2] + '"\n';
    }
    
    entStr += '}\n';    
    file.write(entStr);
  }

  function point3_write(file, p)
  {
    file.write(' ( ' + Math.ceil(p.x) + ' ' + Math.ceil(p.y) + ' ' + Math.ceil(p.z) + ' ) ');
  }

  function plane_write(file, plane) 
  {
    var txt = plane.texture;
    point3_write(file, plane.p0);
    point3_write(file, plane.p1);
    point3_write(file, plane.p2);   
    file.write(txt.txt + ' ' + txt.scale.x + ' ' + txt.scale.y + ' 0 0 0 0 lightmap_gray 16384 16384 0 0 0 0\n');
  }

  function hh_write(file, hh)
  {
    var planes = [];
    var p;
    var pts = hh.points;

    // top
    p = new Geom.Plane(pts[7], pts[4], pts[5]);
    p.texture = hh.faceTextures.top || hh.texture;
    planes.push(p);

    // right
    p = new Geom.Plane(pts[3], pts[7], pts[6]);
    p.texture = hh.faceTextures.right || hh.texture;
    planes.push(p);

    // back
    p = new Geom.Plane(pts[6], pts[5], pts[1]);
    p.texture = hh.faceTextures.back || hh.texture;
    planes.push(p);

    // left
    p = new Geom.Plane(pts[5], pts[4], pts[0]);
    p.texture = hh.faceTextures.left || hh.texture;
    planes.push(p);

    // front
    p = new Geom.Plane(pts[4], pts[7], pts[3]);
    p.texture = hh.faceTextures.front || hh.texture;
    planes.push(p);

    // bottom
    p = new Geom.Plane(pts[0], pts[3], pts[2]);
    p.texture = hh.faceTextures.bottom || hh.texture;
    planes.push(p);

    file.write('{\n');
    for (var i in planes) {
      plane_write(file, planes[i]);
    }
    file.write('}\n');
  }
  
  function terrain_write(mapFile, tp)
  {
    var tm = tp.textureMap;
    
    if (tp.u_size > 10) { // because large patches don't compile well.  at least they didn't in CoD2.
      var tpa = tp.split();
      tpa[0].colorPatch = tp.colorPatch;
      tpa[0].textureMap = tm;
      tpa[1].colorPatch = tp.colorPatch;
      tpa[1].textureMap = tm;
      terrain_write(mapFile, tpa[0]);
      terrain_write(mapFile, tpa[1]);
      return;
    }
        
    function place_in_range(val, highval, convert_low, convert_high) {
      return convert_low + (convert_high - convert_low) * (val / highval);
    }
    
    function texture_values(p, u, v, p_first)
    {
      var ret = { 'u':0, 'v':0, 'd1':0, 'd2':0, 'bw':-1 };

      if (tp.colorPatch) {
        ret.bw = tp.colorPatch.heightAt(p)
      }

      switch (tm.type) {
      case Texture.map_types.uniform:
        ret.u = p.x / tm.scale.x;
        ret.v = p.y / tm.scale.y;
        ret.d1 = ret.u / 64;
        ret.d2 = ret.v / 64;
        break;
      case Texture.map_types.natural:        
        ret.u = tm.scale.x * tm.size.x * (u / (tp.points.length-1));
        var dist = Geom.Point2.dist(p_first, p);
        ret.v = dist * tm.scale.y;
        ret.d1 = ret.u / 64;
        ret.d2 = ret.v / 64;        
        break;
      }
      
      for (var k in ret) {
        ret[k] = ret[k].toFixed(2);
      }
      
      return ret;
    }   
    
    function output_point(p, u, v, p_first) {
      var o;
      var z = p.z;
      if (z >= 10.0) z -= 10.0;
      o = texture_values(p, u, v, p_first);
      mapFile.write('      v ' + p.x.toFixed(2) + ' ' + p.y.toFixed(2) + ' ' + p.z.toFixed(2) + ' ');
      if (o.bw > -1) {        
        mapFile.write('c ' + o.bw + ' ' + o.bw + ' ' + o.bw + ' 192 '); // 192 means 75% opacity on the color
      }
      mapFile.write('t ' + o.u + ' ' + o.v + ' ' + o.d1 + ' ' +  o.d2 + '\n');
    }
    
    mapFile.write(' {\n');
    mapFile.write('  mesh\n');
    mapFile.write('  {\n');
    mapFile.write('   ' + tm.name + '\n');
    mapFile.write('   lightmap_gray\n');
        
    // I have no clue what the 16 and 8 are.
    mapFile.write('   ' + tp.u_size + ' ' + tp.v_size + ' 16 8\n');

    for (var u=0; u<tp.u_size; u++) {
      var p_first = tp.points[u][0];
      mapFile.write('   (\n');
      for (var v=0; v<tp.v_size; v++) {
        output_point(tp.points[u][v], u, v, p_first);
      }
      mapFile.write('   )\n');
    }

    mapFile.write('  }\n');
    mapFile.write(' }\n');    
  }

  function map_start(mapFile)
  {
    mapFile.write('iwmap 4\n' +
                  '// entity 0\n' +
                  '{\n' +
                  '"_color" "0.95 0.95 1.000000"\n' +
                  '"sundirection" "-35 195 0"\n' +
                  '"suncolor" "0.99 0.98 0.86"\n' +
                  '"sunlight" "1.6"\n' +
                  '"ambient" ".20"\n' +
                  '"sundiffusecolor" "0.94 0.94 1.000000"\n' +
                  '"diffusefraction" ".55"\n' +
                  '"northyaw" "90"\n' +
                  '"classname" "worldspawn"\n');
  }

  function skybox(config, map)
  {
  	var skysize = config_get_size_3d(config.skybox[0].size[0]);
    var top = skysize.z;
    var bot = -1*top;
    var left = 0;
    var right = skysize.x;
    var front = 0;
    var back = skysize.y;
    var ww = 1;
    
    var camera_pt = new Geom.Point3(120, 120, top - 40);
    
 		// make intermission camera
		map.entities.push(new the.Entity(camera_pt, null, the.spawn_types.camera, [15, 45, 0]));
    
    var skytxt = Texture.configToBasic(config.skybox[0].texture[0]);
    
    // left
    var b = Geom.box(new Geom.Point3(left-ww/2,front,bot), new Geom.Point3(left-ww/2,back,bot), ww, top-bot);
    b.faceTextures = {};
    b.texture = skytxt;
    map.boxes.push(b);

    // right
    var b = Geom.box(new Geom.Point3(right+ww/2,front,bot), new Geom.Point3(right+ww/2,back,bot), ww, top-bot);
    b.faceTextures = {};
    b.texture = skytxt;
    map.boxes.push(b);

    // front
    var b = Geom.box(new Geom.Point3(left-ww,front-ww/2,bot), new Geom.Point3(right+ww,front-ww/2,bot), ww, top-bot);
    b.faceTextures = {};
    b.texture = skytxt;
    map.boxes.push(b);

    // back
    var b = Geom.box(new Geom.Point3(left-ww,back+ww/2,bot), new Geom.Point3(right+ww,back+ww/2,bot), ww, top-bot);
    b.faceTextures = {};
    b.texture = skytxt;
    map.boxes.push(b);
    
    // bottom
    var b = Geom.box(new Geom.Point3(left-ww,(front+back)/2,bot-ww/2), new Geom.Point3(right+ww,(front+back)/2,bot-ww/2), (back-front), ww);
    b.faceTextures = {};
    b.texture = skytxt;
    map.boxes.push(b);

    // top
    var b = Geom.box(new Geom.Point3(left-ww,(front+back)/2,top-ww), new Geom.Point3(right+ww,(front+back)/2,top-ww), (back-front), ww);
    b.faceTextures = {};
    b.texture = skytxt;
    map.boxes.push(b);
  }

  function map_write(files, map)
  {

    map_start(files.map);

    out('Writing terrains... ');
    for (var i in map.terrainPatches) {
      var tp = map.terrainPatches[i];
      terrain_write(files.map, tp);
    }
    out('done\n');
        
    out('Writing boxes... ');
    for (var i in map.boxes) {
      var b =  map.boxes[i];
      hh_write(files.map, b);
    }
    out('done\n');

    files.map.write('}\n'); 

		out('Writing entities... ');
		for (var i in map.entities) {
			var ent = map.entities[i];
			entity_write(files.map, ent);
  	}
  	out('done\n');
    
    files.map.write('\n');          
  }

  function fill_area_grounded(config, map, mp, segs, center, max_dist)
  {  	
    // fill with entities appropriate to the location, size,
    // and shape of the area.
            
    var fence_arr = config.areas[0].grounded[0].fence;
    var fence_node = fence_arr && fence_arr[0];
    if (fence_node) {
			var fence_height = parseInt(fence_node.height, 10);
			var fence_width = parseInt(fence_node.width, 10);
			var depth = parseInt(fence_node.depth, 10);
	    var texmap = Texture.configToBasic(fence_node.texture[0]);
	    var points = [];
	    			
	    for (var i=0; i<segs.length; i++) {
	      var seg = segs[i];
	      for (var j=0; j<seg.length; j++) {
	      	var pt = Geom.Point3.addXYZ(seg[j][1], 0, 0, -1 * depth);
	      	points.push(pt);
	      }
	    }
			
	    fence(map, points, fence_height, fence_width, depth, texmap, 0.25);
	  }
  }
  
  function fill_area_groundless(config, map, mp, segs, center, max_dist)
  {
  	// only the "buildings" type of area is supported for now
  	var g = config.areas[0].groundless[0];
  	
  	if (!g) {
  		return false;
  	}
  	
  	var tm = map.groundTexture;
    var isegs = [];
    var c1_pcnt = 0.01;
    var e1_pcnt = 1.0 - c1_pcnt;
    var c2_pcnt = 0.25;
    var e2_pcnt = 1.0 - c2_pcnt;
    var fourpts = [];   
    var lines = [];
    var tol = 0.01;
    var z = 0;
    
    // gather inner segments from endpoints
    for (var i=0; i<segs.length; i++) {
      var seg1 = segs[i];
      var seg2 = segs[(i+1) % segs.length];
      var pt1 = seg1[0][2];
      var pt2 = seg2[0][2];
      if (i==0) z = pt1.z;
      lines[i] = [pt1, pt2];      
    }
    
    // loop through sides, looking for maximum area rectangle formed
    // by extending endpoint of each segment along the normal and intersecting
    // with the other segments
    
    var rectangles = [];
    
    function rect_area_sort(a,b) {
      return b.area - a.area;
    }
    
    for (var i=0; i<lines.length; i++) {
      var pt1 = lines[i][0];
      var pt2 = lines[i][1];
      var v = Geom.Point2.sub(pt2, pt1);
      var v_len = Geom.Point2.magnitude(v);
      v = Geom.Point2.unitize(v);
      var norm = Geom.Point2.copy(v);
      norm.x = -1*v.y;
      norm.y = v.x;
      norm.z = 0;
      
      var pts = [ (Geom.Point2.add(pt1, Geom.Point2.scale(v, c1_pcnt*v_len))),
                  (Geom.Point2.add(pt1, Geom.Point2.scale(v, c2_pcnt*v_len))),
                  (Geom.Point2.add(pt1, Geom.Point2.scale(v, e2_pcnt*v_len))),
                  (Geom.Point2.add(pt1, Geom.Point2.scale(v, e1_pcnt*v_len)))
                ];      
      
      var xsec = [];
      for (var j in pts) {
        var pt = pts[j];
        var npt = Geom.Point2.add(pt, norm);
        var inter = [];
        
        // look for intersection with other segments
        for (var k=0; k<segs.length; k++) {
          if (k == i) continue; // don't consider current segment
          var s;
          try {
            t = Geom.Point2.linesIntersect(pt, npt, lines[k][0], lines[k][1]);
          } catch (ex) {
            continue; // skip segment
          }
          var d = Geom.Point2.sub(t, pt);
          if (Geom.Point2.dot(d, norm) <= tol) {
            continue; // skip segment
          }
          var len = Geom.Point2.magnitude(d);
          inter.push({'t': t, 'len': len, 'xseg':k});
        }
        
        if (inter.length > 0) {
          // find the nearest intersection - this is the actual boundary of the polygon.
          // this would not always be true, except the way the polygons are constructed,
          // they are always convex.
          inter.sort(function(a,b) { return a.len - b.len; });
          xsec.push({'pt1': pt, 'pt2': inter[0].t, 'len': inter[0].len, 'xseg':inter[0].xseg });
        }
      }
      
      // now, find the rectangle with the largest area.  this will be at most 6 iterations.
      var rects = [];
      for (var j=0; j<xsec.length-1; j++) {
        var xs1 = xsec[j];
        for (var k=j+1; k<xsec.length; k++) {
          var xs2 = xsec[k];
          var w = Geom.Point2.magnitude(Geom.Point2.sub(xs2.pt1, xs1.pt1));
          var h;
          var intersects = 0;
          if (xs1.len < xs2.len) {
            h = xs1.len;
            intersects = 1;
          } else {
            h = xs2.len;
            intersects = 2;
          }
          var area = w*h;
          rects.push({'i':i, 's1': xs1, 's2': xs2, 'area': area, 'norm': norm, 'w': w, 'h': h, 'intersects': intersects});
        }
      }
      if (rects.length > 0) {
        rects.sort(rect_area_sort);
        rectangles[i] = rects[0];
      }
    }
    
    var did_build = false;
    var keep_terr = (g.keep_terrain == '1')? true : false;
    if (rectangles.length > 0) {
      rectangles.sort(rect_area_sort);      
      var rect = rectangles[0];
      if (rect.area >= parseInt(g.min_area, 10)) {
        var pt00 = new Geom.Point3(rect.s2.pt1.x, rect.s2.pt1.y, z);                  
        var pt01 = new Geom.Point3(rect.s1.pt1.x, rect.s1.pt1.y, z);
        var pt10 = Geom.Point3.add(pt00, Geom.Point3.scale(rect.norm, rect.h));
        var pt11 = Geom.Point3.add(pt01, Geom.Point3.scale(rect.norm, rect.h));
        var cpcnt;
        var epcnt;
        var skirt_size = 3;
        did_build = true;
  
        // make 4 terrain patches.  yes, I know what you're thinking -
        // "why any patches at all?  we're going to be covering up this spot
        // of ground with a rectangular building.  what's the point?", well,
        // the building just barely fails to cover the hole, by less than 1
        // whole unit, so a little skirt of terrain will cover it up.
        
        var bmp = Geom.Point3.midpoint([pt00, pt01, pt10, pt11]);
        
        cpcnt = skirt_size / Geom.Point2.dist(pt00, bmp);
        epcnt = 1.0 - cpcnt;
        
        // contract toward the center of the rectangle
        var ip = [];
        ip[0] = new Geom.Point3(bmp.x*cpcnt + pt00.x*epcnt, bmp.y*cpcnt + pt00.y*epcnt, z);
        ip[1] = new Geom.Point3(bmp.x*cpcnt + pt01.x*epcnt, bmp.y*cpcnt + pt01.y*epcnt, z);
        ip[2] = new Geom.Point3(bmp.x*cpcnt + pt10.x*epcnt, bmp.y*cpcnt + pt10.y*epcnt, z);
        ip[3] = new Geom.Point3(bmp.x*cpcnt + pt11.x*epcnt, bmp.y*cpcnt + pt11.y*epcnt, z);                        
        
        // top patch
        var tp = new Terrain.Patch(2, 2);
        tp.setPoint(0, 0, ip[2]);
        tp.setPoint(0, 1, ip[3]);
        tp.setPoint(1, 0, pt10);
        tp.setPoint(1, 1, pt11);
        tp.textureMap = tm;
        tp.colorPatch = map.colorpatch;
        if (keep_terr) map.terrainPatches.push(tp);
  
        // bottom patch
        var tp = new Terrain.Patch(2, 2);
        tp.setPoint(0, 0, pt00);
        tp.setPoint(0, 1, pt01);
        tp.setPoint(1, 0, ip[0]);
        tp.setPoint(1, 1, ip[1]);
        tp.textureMap = tm;
        tp.colorPatch = map.colorpatch;
        if (keep_terr) map.terrainPatches.push(tp);
        
        // left patch
        var tp = new Terrain.Patch(2, 2);
        tp.setPoint(0, 0, ip[1]);
        tp.setPoint(0, 1, pt01);
        tp.setPoint(1, 0, ip[3]);
        tp.setPoint(1, 1, pt11);
        tp.textureMap = tm;
        tp.colorPatch = map.colorpatch;
        if (keep_terr) map.terrainPatches.push(tp);      
        
        // right patch
        var tp = new Terrain.Patch(2, 2);
        tp.setPoint(0, 0, pt00);
        tp.setPoint(0, 1, ip[0]);
        tp.setPoint(1, 0, pt10);
        tp.setPoint(1, 1, ip[2]);
        tp.textureMap = tm;
        tp.colorPatch = map.colorpatch;
        if (keep_terr) map.terrainPatches.push(tp);      
        
        // fill in terrain around when the building will go.  there will be 3 main areas,
        // one for each side of the building that does not run along one of the segments
        
        // 1. go around the circle of segments, and determine which ones are applicable to each area
        // 2. for each area
        //   a. gather points of area, including only building corners and true corners of segments
        //   b. make terrains for them by finding midpoints and connecting in the same
        //      inefficient, but easy way as the "grounded" areas.
        
        var ptsA = [];
        var ptsB = [];
        var ptsC = [];
        var curr = 'a';
        for (var j=0; j<segs.length; j++) {
          i = (j + rect.i) % segs.length;
          var seg = segs[i];
          var pt = seg[seg.length-1][2];
          var pt_skip = false;
          if (curr == 'a') {
            if (i == rect.s2.xseg) {
              if (rect.intersects==1) {
                ptsA.push(Geom.Point2.copy(rect.s2.pt2));
              }
              ptsA.push(Geom.Point2.copy(pt10));
              ptsA.push(Geom.Point2.copy(pt00));
              curr = 'b';
            } else {
              ptsA.push(Geom.Point2.copy(pt));
            }
          }
          if (curr == 'b') {
            if (i == rect.s1.xseg) {
              if (rect.intersects==2) {
                ptsB.push(Geom.Point2.copy(rect.s1.pt2));
              }
              ptsB.push(Geom.Point2.copy(pt11));
              ptsB.push(Geom.Point2.copy(pt10));
              if (rect.intersects==1) {
                ptsB.push(Geom.Point2.copy(rect.s2.pt2));
              }
              curr = 'c';             
            } else {
              ptsB.push(Geom.Point2.copy(pt));
            }
          }
          if (curr == 'c') {
            ptsC.push(Geom.Point2.copy(pt));
          }         
        }
        
        ptsC.push(Geom.Point2.copy(pt01));
        ptsC.push(Geom.Point2.copy(pt11));
        if (rect.intersects == 2) {
          ptsC.push(Geom.Point2.copy(rect.s1.pt2));
        }
                        
        function two_by_two_terrain(points) {
          // set z coords of all points
          for (var i=0; i<points.length; i++) {           
            points[i] = new Geom.Point3(points[i].x, points[i].y, z);
            //out(points[i] + '\n');
          }
          var midpt = Geom.Point3.midpoint(points);
          for (var i=0; i<points.length; i++) {
            var curr_pt = points[i];
            var next_pt = points[(i+1)%points.length];
            var dirt_patch = new Terrain.Patch(2, 2);                   
          
            dirt_patch.setPoint(0, 0, curr_pt);
            dirt_patch.setPoint(1, 0, next_pt);
            dirt_patch.setPoint(0, 1, midpt);
            dirt_patch.setPoint(1, 1, midpt);    
            dirt_patch.textureMap = tm;
            dirt_patch.colorPatch = map.colorpatch;
            if (keep_terr) map.terrainPatches.push(dirt_patch);
          }
        }                 
        
        if (keep_terr) {
        	two_by_two_terrain(ptsA);
        	two_by_two_terrain(ptsB);
        	two_by_two_terrain(ptsC);
        }
        
        // find distance from the map's center point.
        var rect_pts = [pt00, pt01, pt10, pt11];        
        var rect_ctr = Geom.Point2.midpoint(rect_pts);
        var dist = Geom.Point2.dist(rect_ctr, center);
                
        var bldg = g.buildings && g.buildings[0];
        if (bldg) {
        	
        	// create the building itself and its contents        	                           
        	var o = BuildingGen.create(config, bldg, rect.area, rect.w, rect.h, dist, max_dist);
        
	       	// translate all boxes and entities to the real coordinates
	        
	        // first, figure out rotation angle based on two corner points of the rectangle along the bottom edge
	        var a;
	        var bl = rect.s1.pt1;
	        var br = rect.s2.pt1;
	        var flip_angle = false;
	        
	        if (bl.x == br.x) {
	          if (bl.y > br.y) {
	            a = -1 * Math.PI / 2;
	          } else {
	            a = Math.PI / 2;
	          }
	        } else {
	          var dy = br.y - bl.y;
	          var dx = bl.x - br.x;   
	          a = Math.atan(dy/dx);
	          if (dx > 0) {
	            flip_angle = true;
	          }
	        }       
	        a = -1.0 * a;
	        if (flip_angle) {
	          a = a + Math.PI;
	        }
	              
	        var up = new Geom.Point3(0,0,1);        
	        
	        for (var i=0; i<o.boxes.length; i++) {
	          var box = o.boxes[i];
	          var newbox;
	          var pts = box.points;         
	          
	          // completely recreate the box.  rotating and translating
	          // the individual points causes slight but disturbing 
	          // mangling effects.
	          
	          // 1/28/08 - there are definitely still problems here.
	          // lines that should be parallel aren't.  staircases are wavy.
	               
	          var y_size=0;
	          var z_size=0;
	          
	          var mp_a = Geom.Point3.midpoint([pts[0], pts[3]]);
	          var mp_b = Geom.Point3.midpoint([pts[1], pts[2]]);                    
	          y_size = Geom.Point3.dist(pts[0], pts[3]);
	          z_size = Geom.Point3.dist(pts[0], pts[4]);
	            
	          var mp_a2 = Geom.Point3.rotateAxis(mp_a, up, a);
	          var mp_b2 = Geom.Point3.rotateAxis(mp_b, up, a);
	          mp_a2 = Geom.Point3.addXYZ(mp_a2, bl.x, bl.y, z)
	          mp_b2 = Geom.Point3.addXYZ(mp_b2, bl.x, bl.y, z)
	          
	          newbox = Geom.box(mp_a2, mp_b2, y_size, z_size);
	          newbox.texture = box.texture;
	          newbox.faceTextures = box.faceTextures;          
	                    
	          map.boxes.push(newbox);	          
	        }
	        
	        for (var i=0; i<o.entities.length; i++) {        	
	          var ent = o.entities[i];
	          var pt = ent.pos;          
	          var newpt = Geom.Point3.rotateAxis(pt, up, a); // rotate
	          newpt = Geom.Point3.addXYZ(newpt, bl.x, bl.y, z); // translate
	          ent.pos = newpt;
	          // rotate middle angle
	          if (ent.angles) {
	          	ent.angles[1] += 180*a/Math.PI;
	          }
	          map.entities.push(ent);
	        }
	      }
      }
    }
    
    if (!did_build) {
      // convert to a grounded area and pretend like none of this ever happened
      for (var i=0; i<segs.length; i++) {
        var segi = segs[i];
        for (var j=0; j<segi.length; j++) {
          segi[j][2] = mp;
        }       
      }
    }
    
    return did_build;
  }
  
  function create_areas(config, map, ip, tp, center, max_dist)
  {
  	var areas = config.areas && config.areas[0];
  	
  	if (!areas) {
  		return;
  	}
  	  	
    // make bit beside the road   
    for (var i=0; i<ip.length; i++) {
      var all_pts = ip[i];
      var dirt_pts = [];
      var poly_points = [];
      var low_z = 0.0;
      var high_z = 0.0;
      
      // get midpoint of the whole poly
      var complete_pts = [];
      for (var j=0; j<all_pts.length; j++) {
        var pts = all_pts[j];
        poly_points.push(pts[0]);
        for (var k=0; k<pts.length; k++) {
          var pt = pts[k];
          complete_pts.push(pt);
          if ((j==0 && k==0) || pt.z > high_z) {
            high_z = pt.z;
          }
          if ((j==0 && k==0) || pt.z < low_z) {
            low_z = pt.z;
          }
        }
      }
      var mp = Geom.Point3.midpoint(complete_pts);
      var poly_area = Geom.Point2.polygonArea(poly_points);
      var too_small = true;
      var groundless_node = areas.groundless && areas.groundless[0];      
      
      if (groundless_node) {
      	too_small = (poly_area < parseInt(groundless_node.min_area, 10))? true: false;
      }
      
      var grounded = false;
      var chance_grounded = 0.10;
      
      if (too_small) {
        out('  Polygon grounded because of area size\n');
        grounded = true;
      }
      
      if (Rand.prob(chance_grounded)) {
        out('  Polygon grounded by random chance\n');
        grounded = true;
      }

      // Create solid terrain if "grounded", otherwise just a margin to
      // keep from smacking buildings right next to the street.
      var contract_pcnt = (grounded)? 1.0 : 0.25;
      var contact_inv = 1.0 - contract_pcnt;
      var expand_pcnt = 1.01;
      var expand_inv = expand_pcnt - 1.0;
      var z_balance = 0.65;
      var z_balance_mp = 0.35;
      var z = (z_balance_mp*mp.z) + (1.0 - z_balance_mp) * (z_balance * high_z + (1.0 - z_balance) * low_z);
      for (var j=0; j<complete_pts.length; j++) {
        var pta = Geom.Point3.copy(complete_pts[j]);
        var ptb = Geom.Point3.copy(complete_pts[j]);
        var ptc = Geom.Point3.copy(complete_pts[j]);
        
        // move pta away from midpoint some percentage.
        // this would not be necessary, except that there is
        // something wrong with the height of the computed
        // intersections
        pta.x = (expand_pcnt*pta.x - expand_inv*mp.x);
        pta.y = (expand_pcnt*pta.y - expand_inv*mp.y);
        pta.z -= 10;
        
        // leave ptb right where it was
        
        // move ptb toward midpoint some percentage
        ptc.x = (contact_inv*ptc.x + contract_pcnt*mp.x);
        ptc.y = (contact_inv*ptc.y + contract_pcnt*mp.y);
        ptc.z = z;
        
        dirt_pts.push([pta, ptb, ptc]);
      }
            
      // gather all the points into segment arrays, peeling them off in the
      // order they were created
      var segs = [];
      var idx = 0;
      for (var j=0; j<all_pts.length; j++) {
        var pts = all_pts[j];
        segs[j] = [];
        for (var k=0; k<pts.length; k++) {
          segs[j].push(dirt_pts[idx]);
          idx++;
        }
      }
                        
      if (!grounded) {
        grounded = !fill_area_groundless(config, map, mp, segs, center, max_dist);
        if (grounded) {
          out('  Reforming ground to change to grounded.\n');
          // recreate dirt_pts from segs, which have been altered by the
          // "grounded" function
          var idx = 0;
          for (var j=0; j<all_pts.length; j++) {
            var pts = all_pts[j];
            for (var k=0; k<pts.length; k++) {
              dirt_pts[idx][2] = segs[j][k][2];
              idx++;
            }
          }
        }
      }
      if (grounded) {
        fill_area_grounded(config, map, mp, segs, center, max_dist);
      }     
      
      if (areas.keep_terrain == '1') {
	      // make 2x3 terrains connecting points
	      for (var j=0; j<dirt_pts.length; j++) {
	        var curr_pair = dirt_pts[j];
	        var next_pair;
	        next_pair = dirt_pts[(j+1) % dirt_pts.length];
	        var dirt_patch = new Terrain.Patch(2, 3);                   
	        
	        for (var k=0; k<3; k++) {         
	          dirt_patch.setPoint(0, k, curr_pair[k]);
	          dirt_patch.setPoint(1, k, next_pair[k]);
	        }
	  
	        dirt_patch.textureMap = map.groundTexture;
	        dirt_patch.colorPatch = tp.colorPatch;
	        map.terrainPatches.push(dirt_patch);        
	      }
	  	}
    }   
  }

  the.openFiles = function (config, mapname)
  {
    if (!mapname) {
      throw 'Error - must provide map basename, eg: mp_whatever';     
    }
    
    var files = {};
    
    files.basename = mapname;
    
    out('Opening map file for writing... ');
    files.map = System.openFile(config.gamebase + '\\' + config.dest + '\\' + mapname + '.map', 'w');
    if (!files.map) {
      throw 'Unable to open map file';
    }
    out('done\n');
    
    return files;
  }
  
  the.closeFiles = function (files)
  {
    out('Closing files... ');
    files.map.close();    
    out('done\n');
  }
           
	function fence(map, points, fence_height, fence_width, depth, texture, seg_missing_prob)
	{
		var fence_boxes = [];
		
		for (var i=0; i<points.length; i++) {
			var pt1 = points[i];
			var pt2	= points[(i+1)%points.length];
			var box = Geom.box(pt1, pt2, fence_width, fence_height);
			box.texture = texture;
			box.faceTextures = {};
			fence_boxes.push(box);			
		}				
		
		// determine missing segments.  this will be random-ish.  If they've
		// said they want a 25% segment missing probability, we'll make sure that
		// 25% of the segments are missing, instead of giving each segment a 25%
		// chance individually.
		var missing = [];		
		if (seg_missing_prob > 0) {
			var num_miss = seg_missing_prob * fence_boxes.length;
			var a = [];
			for (var i=0; i<fence_boxes.length; i++) {
				a[i] = i;
			}
			var m = Rand.pickN(a, num_miss);
			for (var i=0; i<m.length; i++) {
				missing[m[i]] = true;				
			}
		}
				
		for (var i=0; i<fence_boxes.length; i++) {
			if (!missing[i]) {
				map.boxes.push(fence_boxes[i]);
			}
		}		
	}

	function boundary(config, fence_node, map, outer_roads)
	{
		var fence_height = parseInt(fence_node.height, 10);
		var fence_width = parseInt(fence_node.width, 10);
		var depth = parseInt(fence_node.depth, 10);
		var texmap = Texture.configToBasic(fence_node.texture[0]);
		
		var all_pts = [];		
		for (var i=0; i<outer_roads.length; i++) {
			var terr = outer_roads[i];
			for (var j=0; j<terr.u_size; j++) {
				all_pts.push(Geom.Point3.addXYZ(terr.points[j][2], 0, 0, -1 * depth));
			}
		}
		
		fence(map, all_pts, fence_height, fence_width, depth, texmap, 0);	
	}
	
	function config_get_size_2d(ob)
	{
		return new Geom.Point2(parseInt(ob.x,10), parseInt(ob.y,10));
	}
	
	function config_get_size_3d(ob)
	{
		return new Geom.Point3(parseInt(ob.x,10), parseInt(ob.y,10), parseInt(ob.z,10));
	}

  the.create = function(config)
  {
  	var map = {};

    map.boxes = [];
    map.entities = [];
  	
  	if (!config.skybox) {
  		throw 'ERROR - must define a skybox node in config file';  		
  	}
  	
  	skybox(config, map);
  	
  	if (!config.terrain) {
  		return;
  	}  	
  	
  	var terr = config.terrain[0];
    var play_size = config_get_size_2d(terr.playable[0]);
    var t_size = config_get_size_3d(terr.size[0]);
    
    map.terrainPatches = [];    
    map.size = t_size;
    map.play_size = play_size;
    
    var terrain_height = t_size.z;
    map.terrain_height = terrain_height;
    map.groundTexture = Texture.configToMap(terr.texture[0], 1, 1, Texture.map_types.uniform);        
		
		var colorpatch;
		if (config.colorpatch) {
			var colp = config.colorpatch[0];
			var cpsize = config_get_size_2d(colp.size[0]);
			var min_bright = parseInt(colp.darkest, 10);
			var max_bright = parseInt(colp.lightest, 10);
			
	    colorpatch = new Terrain.Patch(parseInt(colp.u,10), parseInt(colp.v,10));
	    var dx = (cpsize.x - t_size.x) / 2;
	    var dy = (cpsize.y - t_size.y) / 2;
	    colorpatch.setRectangularXY(-1*dx, -1*dy, t_size.x + dx, t_size.y + dy);
	    colorpatch.randomize(256);
	    for (var i=0; i<5; i++) {
	      colorpatch.smooth();
	    }
	    colorpatch.amplify(max_bright-min_bright);
	    for (var u=0; u<colorpatch.u_size; u++) {
	      for (var v=0; v<colorpatch.v_size; v++) {
	        colorpatch.points[u][v].z += min_bright;
	      }
	    }
		} else {
			// use boring defaults if none provided - we have to have this
	    colorpatch = new Terrain.Patch(2, 2);
	    colorpatch.setRectangularXY(-100, -100, t_size.x + 100, t_size.y + 100);
	    for (var u=0; u<colorpatch.u_size; u++) {
	      for (var v=0; v<colorpatch.v_size; v++) {
	        colorpatch.points[u][v].z = 255;
	      }
	    }			
		}
		map.colorpatch = colorpatch;

    out('Creating coloration patch... ');
    // a source of additional coloration for variety

    out('done\n');
    
    out('Creating ground height terrain... ');
    // the ground
    var tp = new Terrain.Patch(16, 16);
    tp.setRectangularXY(0, 0, t_size.x, t_size.y);
    tp.randomize(terrain_height);
    for (var i=0; i<15; i++) {
      tp.smooth();
    }
    tp.amplify(terrain_height);
    tp.textureMap = map.groundTexture;
    tp.colorPatch = colorpatch;
    
    if (terr.keep == '1') {
    	map.terrainPatches.push(tp); // keep this line of code.  will be useful for a terrain-only option.
    }
    out('done\n');    
    
    // see if there is a roads node.  everything we put on the map depends on the roads,
    // so if this isn't present we're done.
    var roads = config.roads && config.roads[0];
    if (!roads) {
    	return map;
    }
    
    var keep_roads = (roads.keep == '1')? true : false;
    
    out('Generating street graph... ');
    var pos = new Geom.Point2((t_size.x - play_size.x) / 2, (t_size.y - play_size.y) / 2);
    var graph = StreetGraph.create(play_size, pos, parseInt(roads.max_area, 10));
    out('done\n');
    
    var outer_roads = [];
  
    out('Making road terrain patches... ');
    var s = graph.segs;
    var cars = 0;
    var bad_cars = 0;
    var car_prob = 0.25;
    for (var i=0; i<s.length; i++) {
      var seg = s[i];
      var road = RoadMaker.createTerrain(config, map, seg, tp);
      if (seg.level == 0) {
        outer_roads.push(road);
      }
      if (keep_roads) {
      	map.terrainPatches.push(road);
      }
      if (seg.level < RoadMaker.dirt_road_level) { 	
      	if (config.roads[0].entities) {      		
	      	var v_mid = Math.floor(road.v_size/2);
	      	var pt1 = road.points[0][v_mid];
	      	var pt2 = road.points[road.u_size-1][v_mid];
	      	var len = Geom.Point3.dist(pt1, pt2);
	      	var car_size = 120;
	      	var maxcars = len / car_size;
		  		var entNode = config.roads[0].entities[0].entity[0];
	      	
	      	for (var j=0; j<maxcars; j++) {
	      		if (Rand.prob(car_prob)) {
		      		var k = maxcars-j;
		      		var p = new Geom.Point3((pt1.x*k + pt2.x*j)/maxcars, (pt1.y*k + pt2.y*j)/maxcars, 0);	      		
		      		try {
		      			p.z = road.heightAt(p);
		      			cars++;
				      	a = Rand.range(0,360);
				      	map.entities.push(new the.Entity(p, entNode.model, entNode.class_name, [0,a,0]));	      			
		      		} catch (ex) {	      			
		      			bad_cars++;
			      		//out('point not found on terrain\n');
			      	}
			      }
			  	}
      	}    	
      }
    }
    out('Cars placed: ' + cars + '\n');
    out('Cars unable to be placed: ' + bad_cars + '\n');
    out('done\n');
    
    // determine 2D center of the main poly, used for informational
    // purposes when making buildings.
    var outer_pts = [];
    for (var i=0; i<s.length; i++) {
      var seg = s[i];
    	outer_pts.push(seg.pt1);
    	outer_pts.push(seg.pt2);
    }

    var center = Geom.Point2.midpoint(outer_pts);

		// find average distance to an outside point, also useful for informational
    // purposes when making buildings, to give the distance from the center
    // some sort of context
		var odists = [];
    for (var i=0; i<outer_pts.length; i++) {
      odists.push(Geom.Point2.dist(outer_pts[i], center));
    }
    // average
    var max_dist = Util.arrayOperate(odists, function (d, v) { return Math.max(d,v); }, -1);    
    
    out('Creating triangular patches for outer road segments... ');
    var tris = RoadMaker.createRoadTriangles(config, map, outer_roads, tp);
    if (keep_roads) {
    	for (var i=0; i<tris.length; i++) {
      	map.terrainPatches.push(tris[i]);
      }
    }
    out('done\n');
    
    var gpolys = graph.polys.getItems();
    var ip = [];
    out('Generating inner polygons (' + gpolys.length + ') ... ');
    for (var i in gpolys) {
      var inp = StreetGraph.get_inner_poly(gpolys[i], tp);
      if (inp) {
        ip.push(inp);
      } else {
        out('Skipping ');
      }
      out(i + ' ');
    }
    out('done\n');
    
    out('Creating grounded and groundless areas...\n');
    create_areas(config, map, ip, tp, center, max_dist);

		var fence_node = config.fence && config.fence[0];
		if (fence_node) {
			out('Creating outer boundary... ');
			boundary(config, fence_node, map, outer_roads);
			out('done\n');
		}
		    
    return map;
  }

	function tplsub(str, mapname) {  		
		return str.replace('$PRAG_NAME$', mapname, 'g');
	}
  
  function templates_write(config, mapname)
  {
  	var base = config.gamebase;  	
  	
  	if (config.templates) {
  		var tpls = config.templates[0].template;
  		for (var i=0; i<tpls.length; i++) {
  			var tpl = tpls[i];
  			var dest = tplsub(tpl.dest, mapname);
  			var destfile = System.openFile(base + '\\' + dest, 'w');
  			var infile = System.openFile(tpl.src, 'r');
  			var srctext = infile.read();  			  			
  			var desttext = tplsub(srctext, mapname);
  			
  			destfile.write(desttext);
  			destfile.close();
  			infile.close();
  		}
  	}
  }
  
  function commands_run(config, mapname)
  {
  	var base = config.gamebase;
  	if (config.commands) {
  		var cmds = config.commands[0].command;
  		for (var i=0; i<cmds.length; i++) {
  			System.execute(tplsub(cmds[i].exec, mapname));
  		}
  	}
  }

  the.main = function(xmlfilename, mapname)
  {
    out('Scripting enging initialized.\n');
    
    if (!mapname) {
      out('Error - must provide map basename, eg: mp_whatever\n\n');
      return;
    }     
    var xml = XML.parseFile(xmlfilename);        
    var config = XML.objectify(xml);
    var files = the.openFiles(config, mapname);
    var map = the.create(config);
    
    map_write(files, map);
    templates_write(config, mapname);    
    the.closeFiles(files);
    
    commands_run(config, mapname);
    
    out('Done creating map, shutting down scripting engine.\n');
  }
}
