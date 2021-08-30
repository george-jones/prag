// Rand.js
// For generating random data or making random selections
// from arrays.

function Rand()
{
	var the = this;

	// returns a number with the given range at random
	the.range = function(n1, n2)
	{
		var d = n2 - n1;
		var n = n1 + Math.round(d*Math.random());
		return n;
	}
	
	the.rangeFloat = function(n1, n2)
	{
		var d = n2 - n1;
		var n = n1 + d*Math.random();
		return n;		
	}

	// returns true or false based on a probability (p)
	// where 0 <= p < 1
	the.prob = function(p)
	{
		// optimizations for cases of <= 0 and >= 1.0 - no need to calculate
		if (p <= 0.0) return false;
		if (p >= 1.0) return true;
		var rnd = Math.random();		
		return (rnd < p);
	}

	// randomly choose an element from an array
	the.pick = function(s)
	{
		var idx = the.pickIndex(s);
		return s[idx];
	}

	// randomly choose an index from an array
	the.pickIndex = function(s)
	{
		var l = s.length;
		var idx = the.range(0, l-1);
		return idx;
	}
	
	// pick an item from an array (a)of objects with weights (w.)
	the.pickWeighted = function(a)
	{
		var r = Math.random();
		var c = 0.0;
		for (var i=0; i<a.length; i++) {
			c += a[i].w;
			if (r <= c) {
				return a[i];
			}
		}
		return a[a.length-1];
	}

	the.pickN = function(a, n)
	{
		if (n > a.length) {
			throw "Tried to pick more items than are in the list";
		}
		
		var shuffled = the.shuffle(a);
		var ret = [];
		for (var i=0; i<n; i++) {
			ret[i] = shuffled[i];
		}
		
		return ret;
	}

	the.shuffle = function (a)
	{
		var tmp = [];
		var ret = [];
		
		for (var i=0; i<a.length; i++) {
			tmp[i] = a[i];
		}

		while (tmp.length > 0) {
			var p = the.pickIndex(tmp);
			var el = tmp[p];
			tmp.splice(p,1);
			ret.push(el);
		}	
		
		return ret;		
	}

	the.main = function()
	{
		var n = 0;		

		System.out.write("\n");

		System.out.write("Testing prob().\n  Approximate result:  200\n");
		for (var i=0; i<1000; i++) {
			n += (the.prob(0.2)) ? 1 : 0;
		}
		System.out.write("  Experimental result: " + n + "\n\n");

		n = 0;
		System.out.write("Testing range().\n  Approximate result:  2.5\n");
		for (var i=0; i<1000; i++) {
			n += the.range(1, 4);
		}
		System.out.write("  Experimental result: " + (n/1000) + "\n\n");

		n = 0;
		var a = [ 10, 20, 30 ];
		System.out.write("Testing pick().\n  Approximate result:  20\n");
		for (var i=0; i<1000; i++) {
			n += the.pick(a);
		}
		System.out.write("  Experimental result: " + (n/1000) + "\n\n");

		n = 0;
		var a = [ 10, 20, 30 ];
		System.out.write("Testing pickIndex().\n  Approximate result:  1.0\n");
		for (var i=0; i<1000; i++) {
			n += the.pickIndex(a);
		}
		System.out.write("  Experimental result: " + (n/1000) + "\n\n");

		System.out.write("Testing pickWeighted\n");
		var items = [ { color:"red", w:0.7 },
		              { color:"green", w:0.1 },
			      { color:"blue", w:0.2 } ];	              
		var red = 0;
		var green = 0;
		var blue = 0;
		for (var i=0; i<1000; i++) {
			var c = the.pickWeighted(items);
			if (c.color == "red") red++;
			if (c.color == "green") green++;
			if (c.color == "blue") blue++;
		}
		System.out.write("  Expect red~700\n");
		System.out.write("  Actual red=" + red + "\n");
		System.out.write("  Expect green~100\n");
		System.out.write("  Actual green=" + green + "\n");
		System.out.write("  Expect blue~200\n");
		System.out.write("  Actual blue=" + blue + "\n\n");

		System.out.write("Testing pickN (also tests shuffle)\n");
		var a = [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ];
		System.out.write("  Expect 3 random numbers from 1-10\n");
		System.out.write("  Actual " + the.pickN(a, 3) + "\n\n");
		

	}
}
