#!/home/gjones/jshost/jshost

System.include('Util.js');

function motd()
{
	this.main = function () {
		var dt = new Date();
		var map_name = 'mp_' + dt.getFullYear() + Util.padNumber(1+dt.getMonth(), 2, '0') + Util.padNumber(dt.getDate(), 2, '0');

		System.out.write('Making map of the day: ' + map_name + '\n');

		System.execute('jshost.exe Prag.js cod4.xml ' + map_name);
	}
}
