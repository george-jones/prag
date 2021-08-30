
System.include('Geom.js');

function PrefabBrowse()
{

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

  this.Entity = function (pos, model, class_name, angles)
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

	this.main = function(fname, spacing)
	{
		var f = System.openFile(fname, 'r');
		var m = System.openFile('pfabs.map', 'w');
		var p = new Geom.Point3(0,0,0);
		var s = parseInt(spacing, 10);
		
		map_start(m);
		
		var models = f.read().split('\n');
		var a = [0,0,0];
		for (var i=0; i<models.length; i++) {
			var pos = Geom.Point3.addXYZ(p, s*i, 0, 0);
			var ent = new this.Entity(pos, models[i], 'misc_prefab', a);
			entity_write(m, ent);
		}				
		
		f.close();
		m.close();
	}
}