// Util.js
// Various generically useful utility functions that could be
// useful in other projects.

function Util()
{
	var the = this;

	the.shallowCopy = function(o)
	{
		var c = {};
		for (var k in o) {
			c[k] = o[k];
		}
		return c;
	}

	the.deepCopy = function(o)
	{
		var c = {};
		if (o._noDeepCopy) {
			// some objects, like XML nodes would be an infinite recursive mess
			// if deep-copied.  Mark these with _noDeepCopy
			return the.shallowCopy(o);
		}
		for (var k in o) {			
			if (typeof(o[k]) == "object") {					
				c[k] = the.deepCopy(o[k]);
			} else {
				c[k] = o[k];
			}
		}
		return c;
	}

	the.padNumber = function(num, padlen, padchar, fromRight)
	{
		var str = "" + num;
		var ret = "";
		
		function pad() {
			for (var i=0; i<padlen-str.length; i++) {
				ret += padchar;
			}
		}

		if (!fromRight) {
			pad();
		}
		ret += str;
		if (fromRight) {
			pad();
		}
		return ret;
	}

	the.arrayMaxIndex = function(arr, evalfunc)
	{
		var maxval = -1;
		var maxidx = -1;
		for (var i=0; i<arr.length; i++) {
			var v = evalfunc(arr[i]);
			if (i==0 || v > maxval) {
				maxidx = i;
				maxval = v;
			}
		}
		return maxidx;
	}
	
	the.Group = function(unique)
	{
		var items = [];

		// private function.  The element's order in the group is
		// undefined.  You shouldn't care about its index.
		function findItemIndex(item) {
			for (var i=0; i<items.length; i++) {
				if (items[i] == item) {
					return i;
				}		
			}					
			return -1;
		}

		// returns true if found		
		this.findItem = function(item) {
			if (findItemIndex(item) > -1) {
				return true;	
			} else {
				return false;
			}
		}
				
		this.addItem = function(item)
		{
			if (!unique || !this.findItem(item)) {
				items.push(item);	
			}
		}
				
		this.removeItem = function(item) {
			var idx = findItemIndex(item);
			if (idx > -1) {
				items.splice(idx, 1);
			}
		}
		
		this.getItems = function() {
			var a = []; // will be a copy of the items array
			for (var i=0; i<items.length; i++) {
				a.push(items[i]);	
			}
			return a;
		}
	}

	the.require = function(o, props)
	{
		if (!o || typeof(o) != 'object') {
			throw "Required object is null or not an object.";
		}
		for (var i=0; i<props.length; i++) {
			if (o[props[i]] === undefined) {
				throw "Object missing required property: " + props[i];
			}
		}
	}
	
	the.keyFromValue = function (o, val)
	{
		for (var k in o) {
			if (o[k] == val) {
				return k;
			}
		}
		return null;
	}
	
	the.inRange = function (v, v1, v2)
	{
		return ((v1 <= v && v <= v2) || (v2 <= v && v <= v1));
	}
	
	the.inRangeTolerance = function (v, v1, v2, tol)
	{
		if (the.inRange(v, v1, v2)) {
			return true;
		}
		return ((Math.abs(v-v1) <= tol) || (Math.abs(v-v2) <= tol));
	}
	
	the.arrayOperate = function (a, func, val)
	{
		for (var i=0; i<a.length; i++) {
			val = func(a[i], val);
		}
		return val;
	}
	
	// swaps items in array by rearranging to new indices
	// as indicated in the other array that gets passed
	the.arrayArrange = function (a, indices)
	{
		var tmp = [];
		for (var i=0; i<a.length; i++) {
			tmp[indices[i]] = a[i];
		}
		for (var i=0; i<a.length; i++) {
			a[i] = tmp[i];
		}		
	}
	
	the.objectKeys = function (o)
	{
		var a = [];
		for (var k in o) {
			a.push(k);
		}
		return a;
	}

	the.main = function()
	{
		System.out.write("Testing shallowCopy\n");
		var o = { "abc": "123", "def":"456" };
		var c = the.shallowCopy(o);
		System.out.write("  Expect 123 456\n");
		System.out.write("  Actual " + c.abc + " " + c.def + "\n\n");

		System.out.write("Testing deepCopy\n");
		o = { "abc": "AAA", "def": { "xyz" : "BBB" } };
		c = the.deepCopy(o);
		System.out.write("  Expect AAA BBB\n");
		System.out.write("  Actual " + c.abc + " " + c.def.xyz + "\n\n");
		
		System.out.write("Testing padNumber\n");
		var n = 210;
		var nstr = the.padNumber(n, 5, "0");
		System.out.write("  Expect 00210\n");
		System.out.write("  Actual " + nstr + "\n\n");

		System.out.write("Testing padNumber (from right)\n");
		var n = 210;
		var nstr = the.padNumber(n, 5, "*", true);
		System.out.write("  Expect 210**\n");
		System.out.write("  Actual " + nstr + "\n\n");

		System.out.write("Testing arrayMaxIndex\n");
		var arr = [20, 10, 5, 8, 17];
		var idx = the.arrayMaxIndex(arr, function (i) { return -1 * i; });
		System.out.write("  Expect 2\n");
		System.out.write("  Actual " + idx + "\n\n");

		System.out.write("Testing Group (non-unique)\n");
		var g = new the.Group();
		g.addItem(10);
		g.addItem(10);
		g.addItem(20);
		g.addItem(30);		
		g.removeItem(20);
		System.out.write("  Expect 10 10 30\n");
		System.out.write("  Actual");
		var items = g.getItems();
		for (var i in items) {
			System.out.write(" " + items[i]);
		}
		System.out.write("\nFinding '10'\n");
		System.out.write("  Expect true\n");
		System.out.write("  Actual " + g.findItem(10) + "\n");
		System.out.write("Finding '20'\n");
		System.out.write("  Expect false\n");
		System.out.write("  Actual " + g.findItem(20) + "\n");				
		System.out.write("\n");
		
		System.out.write("Testing Group (unique)\n");
		var g = new the.Group(true);
		g.addItem(10);
		g.addItem(10);
		g.addItem(20);
		g.addItem(30);		
		g.removeItem(20);
		System.out.write("  Expect 10 30\n");
		System.out.write("  Actual");
		var items = g.getItems();
		for (var i in items) {
			System.out.write(" " + items[i]);
		}
		System.out.write("\nFinding '10'\n");
		System.out.write("  Expect true\n");
		System.out.write("  Actual " + g.findItem(10) + "\n");
		System.out.write("Finding '20'\n");
		System.out.write("  Expect false\n");
		System.out.write("  Actual " + g.findItem(20) + "\n");				
		System.out.write("\n");
		
		System.out.write("Testing require (property present)\n");
		var o = { "a":0, "b":null, "c":10 };
		System.out.write("  Expect OK\n");
		System.out.write("  Actual ");
		try {
			the.require(o, ["a", "b", "c"]);
			System.out.write("OK\n");
		} catch (ex) {
			System.out.write(ex + "\n\n");
		}
		
		System.out.write("Testing require (property missing)\n");
		System.out.write("  Expect Object missing required property: d\n");
		System.out.write("  Actual ");
		try {
			the.require(o, ["a", "b", "c", "d"]);
			System.out.write("OK\n");
		} catch (ex) {
			System.out.write(ex + "\n");
		}
		System.out.write("Testing require (not an object)\n");
		System.out.write("  Expect Required object is null or not an object\n");
		System.out.write("  Actual ");
		try {
			the.require(10, ["a", "b", "c", "d"]);
			System.out.write("OK\n");
		} catch (ex) {
			System.out.write(ex + "\n");
		}
		System.out.write("\n");
		System.out.write("\n");
		
		System.out.write("Testing keyFromValue\n");
		var o = { 'a':5, 'b':10, 'c':15 };
		System.out.write("  Expect 'a', 'b', 'c', 'null'\n");
		System.out.write("  Actual '" + the.keyFromValue(o, 5) + "', '" + the.keyFromValue(o, 10) + "', '" +
			the.keyFromValue(o, 15) + "', '" + the.keyFromValue(o, 20) + "'\n");
		System.out.write("\n");
		
		System.out.write("Testing inRange\n");
		System.out.write("  Expect true, true, false\n");
		System.out.write("  Actual " + the.inRange(5, 0, 10) + ", " + the.inRange(5, 10, 0) + ", " + the.inRange(0, 5, 10));
		System.out.write("\n\n");

		System.out.write("Testing arrayOperate\n");
		var a = [ 5, 10, 15, 20, 25 ];
		System.out.write("  Expect 15\n");
		var ave = the.arrayOperate(a, function(val, init) { return val/a.length + init; }, 0);
		System.out.write("  Actual " + ave + "\n\n");		
		
		System.out.write("Testing arrayArrange\n");
		var a = [ 1, 3, 5, 7, 2, 4, 6, 8 ];
		System.out.write("  Expect 1,2,3,4,5,6,7,8\n");
		the.arrayArrange(a, [ 0, 2, 4, 6, 1, 3, 5, 7 ]);
		System.out.write("  Actual " + a + "\n\n");
		
		System.out.write("Testing objectKeys\n");
		var o = { 'a':0, 'b':1, 'c':2 };
		var keys = the.objectKeys(o);
		System.out.write("  Expect a,b,c\n");
		System.out.write("  Actual " + keys + "\n\n");
		
	}
}
