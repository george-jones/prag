// Texture.js

System.include('Geom.js');

function Texture() 
{
	// used for brushes
	this.basic = function (txt, u_scale, v_scale) {
		this.txt = txt;
		this.scale = new Geom.Point2(u_scale, v_scale);
	}

	// used for patches	
	this.map = function (name, u_size, v_size, u_scale, v_scale, type)
	{
		this.name = name;
		this.size = new Geom.Point2(u_size, v_size);
		this.scale = new Geom.Point2(u_scale, v_scale);
		this.type = type;
	}
	
	// a natural texture map curves with the surface
	// a uniform texture is the same, independent of the shape of the surface
	this.map_types = { 'natural':0, 'uniform':1 };			
	
	this.configToBasic = function (ob)
	{
		return new this.basic(ob.txt, parseInt(ob.x_scale, 10), parseInt(ob.y_scale, 10));
	}
	
	this.configToMap = function (ob, u_size, v_size, map_type)
	{
		return new this.map(ob.txt, parseInt(ob.x_scale, 10), parseInt(ob.y_scale, 10), u_size, v_size, map_type);
	}	
}