// XML.js
//
// Simple pseudo-XML parser.  Caveats - don't try to specify xml prolog, doc type, namespace
// or any other "fancy" xml features.  There is also no support whatsoever for text nodes, eg:
//
//   <anelement>Text!</anelement> <--- not understood
//
// This is because the night that I wrote this it never occurred to me
// that XML used in config files would have any need to have "content",
// assuming instead that attributes would be preferred, eg:
//
//   <anelement value="Text!" /> <--- understood
//
// Usage:
//   var topNode = XML.parse(myXMLTest);
//
// George Jones

System.include('Util.js');

function XML()
{
	var the = this;
	
	function XMLNode()
	{
		this._noDeepCopy = true; // parentNode->children[...]->parentNode would be an infinite loop
		this.tagName = null;
		this.parentNode = null;
		this.children = [];
		this.attributes = {};
		this.getElementsByTagName = function(tagName) {
			var arr;
			if (arguments.length == 2) {
				arr = arguments[1];
			} else {
				arr = [];
			}
			if (this.tagName == tagName) {
				arr.push(this);
			}
			for (var i in this.children) {
				arr = this.children[i].getElementsByTagName(tagName, arr);
			}
			return arr;
		};
		this.getChildNamed = function(tagName) {
			for (var i=0; i<this.children.length; i++) {
				var c = this.children[i];
				if (c.tagName == tagName) {
					return c;
				}
			}
			return null;
		}
	}

	function node_add_child(n, c)
	{
		var clen = n.children.length;

		if (clen > 0) {
			var last_child = n.children[clen-1];
			last_child.nextSibling = c;
		}
		n.children.push(c);
	}

	function node_create(tag_name, parent)
	{
		var n = new XMLNode();
		n.parentNode = parent;		
		n.tagName = tag_name;
		if (parent) node_add_child(parent, n);
		return n;
	}
	
	function decode(txt)
	{
		// fix basic entities
		txt = txt.replace('&amp;', '&', 'g');
		txt = txt.replace('&quot;', '"', 'g');
		txt = txt.replace('&apos;', "'", 'g');
		txt = txt.replace('&lt;', '<', 'g');
		txt = txt.replace('&gt;', '>', 'g');
		
		// fix numeric entities (decimal and hex)
		// (todo)
		
		return txt;
	}

	// returns the top-level XMLNode.  Look at the XMLNode constructor to
	// see what you can actually do with it.
	the.parse = function(text) {
		var top = null;
		var p = null;
		var node = null;
		var tag_name = "";
		var attr_name = "";
		var attr_val = "";
		var in_comment = 0;
		var in_tag = 0;
		var in_tag_ending = 0;
		var in_tag_name = 0;
		var in_attr_name = 0;
		var in_attr_val = 0;		
		var c;
		var i = 0;
		var len = 0;
		var tag_name_start = 0;
		var attr_name_start = 0;
		var attr_val_start = 0;	

		len = text.length;

		for (i=0; i<len; i++) {
			c = text.charAt(i);
			switch (c) {
			case '<':
				if (i+3 < len && text.substr(i+1,3) == "!--") {
					in_comment = 1;
				} else if (!in_comment) {		
					if (!in_tag) {
						in_tag = 1; // tag started
						in_tag_ending = 0;
						tag_name = "";
					} else {
						throw "XML Parsing error - found erroneous '<'"; // bad state
					}
				}
				break;
			case '>':
				if (in_comment && i-2 > 0 && text.substr(i-2, 2) == "--") {
					in_comment = 0;
				} else if (in_tag && !in_comment) {
					in_tag = 0;
					in_attr_name = 0;
					attr_name = "";
					if (in_tag_name) {
						in_tag_name = 0;
						if (in_tag_ending) {
							node = p;
							if (node) p = node.parentNode;
						} else {
							p = node;
							node = node_create(tag_name, p);
							if (!p) top = node;
							tag_name = "";
						}
					}				
				} else if (!in_comment) {
					throw "XML Parsing error - found erroneous '>'"; // bad state
				}
				break;
			case '/':
				if (!in_comment) {
					if (in_tag_name) {
						in_tag_name = 0;
						tag_name = "";
					}
					if (in_tag && !in_attr_val && i+1 < len &&
					    text.substr(i+1, 1) == ">") {
						node = p; // shortcut ending tag
						if (node) p = node.parentNode;
					} else if (in_tag && i-1 > 0 &&
						   text.substr(i-1, 1) == "<") {
						in_tag_name = 1; // end tag
						tag_name_start = i + 1;
						in_tag_ending = 1;
					} else if (in_attr_val) {
						attr_val += c; // add to attr val
					} else {				
						throw "XML Parsing error - found erroneous '/'"; // bad state	
					}
				}
				break;
			case '"':
				if (!in_comment) {
					if (!in_attr_val) {
						in_attr_val = 1; // starting attribute value
						attr_val_start = i + 1;
					} else {
						in_attr_val = 0; // end attribute value
						node.attributes[attr_name] = decode(attr_val);
						attr_name = "";
						attr_val = "";
					}
				}
				break;
			case ' ':
				if (in_tag) {			
					if (!in_attr_val) {
						if (in_tag_name) { // starting attribute name
							p = node;
							node = node_create(tag_name, p);
							if (!p) top = node;
							in_tag_name = 0;
							tag_name = "";
						}
						in_attr_name=1;
						attr_name_start = i+1;
					} else {
						attr_val += c; // add to attribute value
					}
				}
				break;
			case '=':
				if (in_attr_name) {
					in_attr_name = 0; // end attribute name
				}
				break;
			default:
				if (!in_comment) {
					if (in_tag) {
						if (text.charAt(i-1) == '<') {
							in_tag_name = 1; // starting tag name
							tag_name_start = i;
							tag_name += c; // add to tag name
						} else if (in_attr_name) {
							attr_name += c; // add to attr name
						} else if (in_attr_val) {
							attr_val += c; // add to attr value
						} else if (in_tag) {
							tag_name += c;	// add to tag name
						} else {
							throw "XML Parsing error - text found outside of a tag"; // bad state
						}
					}
				}
				break;
			}
		}
	
	 	// invalid end states
		if (in_comment) {
			throw "XML Parsing error - comment never closed";
		}
		if (in_tag) {
			throw "XML Parsing error - unclosed tag: " + tag_name;
		}

		return top;
	}

	the.parseFile = function(filename)
	{
		var f = System.openFile(filename, "r");
		var xml;
		if (f) {
			var xmlText = f.read();
			if (xmlText.length > 0) {
				xml = the.parse(xmlText);
				xmlText = null;
			}
			f.close();
		}
		return xml;
	}		
	
	the.objectify = function(xml)
	{
		var o = {};
		for (var k in xml.attributes) {
			o[k] = xml.attributes[k];
		}
		for (var i=0; i<xml.children.length; i++) {
			var ch = xml.children[i];
			var tag = ch.tagName;
			var a = o[tag] || [];
			a.push(the.objectify(ch));
			o[tag] = a;
		}
		return o;
	}

	the.main = function()
	{
		System.out.write("Testing XML parser\n");
		var txt = '<this is="some">\n' +
							'   <extensible mark="up" />\n' +
							'   <yes it="is">\n' +
							'      <yes />\n' +
							'      <yes>\n' +
							'         <yes siree="bob"/>\n' +
							'   <no>\n' +
							'      <yes />' +
							'   </no>\n' +
							'</this>';
		var dom = the.parse(txt);
		System.out.write("dom.tagName expect: this\n");
		System.out.write("dom.tagName actual: " + dom.tagName + "\n\n");
		
		System.out.write("dom.attributes['is'] expect: some\n");
		System.out.write("dom.attributes['is'] actual: " + dom.attributes['is'] + "\n\n");

		var fc = dom.children[0];
		System.out.write("fc.tagName expect: extensible\n");
		System.out.write("fc.tagName expect: " + fc.tagName + "\n\n");
		
		System.out.write("fc.attributes['mark'] expect: up\n");
		System.out.write("fc.attributes['mark'] actual: " + fc.attributes['mark'] + "\n\n");
		
		var sc = dom.children[1];
		System.out.write("sc.tagName expect: yes\n");
		System.out.write("sc.tagName expect: " + sc.tagName + "\n\n");
		
		System.out.write("sc.attributes['it'] expect: is\n");
		System.out.write("sc.attributes['it'] actual: " + sc.attributes['it'] + "\n\n");

		var y = dom.getElementsByTagName("yes");
		System.out.write("dom.getElementsByTagName('yes').length expect: 5\n");
		System.out.write("dom.getElementsByTagName('yes').length actual: "+ y.length +"\n\n");
		
		var o = the.objectify(dom);
		System.out.write("o.yes[0].it expect: is\n");
		System.out.write("o.yes[0].it actual: " + o.yes[0].it + "\n\n");
		
		System.out.write("o.yes[0].yes[1].yes[0].siree expect: bob\n");
		System.out.write("o.yes[0].yes[1].yes[0].siree actual: " + o.yes[0].yes[1].yes[0].siree + "\n\n")
		
	}

}

