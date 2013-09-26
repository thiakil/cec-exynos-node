var util = require("util");
var events = require("events");
var fs = require('fs');
var ceccodes = require('./ceccodes');
var ioctl = require('./cecioctl/build/Release/cecioctl');

var cecfd = -1;
var /*writeStream = -1,*/ readStream = -1;

function cecCodeToString(code){
	for (key in ceccodes)
	{
		if (ceccodes[key] == code)
			return key;
	}
}

function CECNode(logical_addr) {
    if (arguments.length == 0)
    	throw "must specify logical address!";
    events.EventEmitter.call(this);
    this.logical_addr = logical_addr;
	this.listened = false;
    var cecnode=this;
   	fs.open('/dev/CEC', 'r+', function(err,fd){
		cecfd = fd;
		//console.log('opened '+err);
		readStream = fs.createReadStream('/dev/CEC', {'fd': fd, autoClose: false, 'flags': 'r+'});
		cecnode.listen();
		cecnode.emit('connected');
	    readStream.on('readable', function() {
	  		// there is some data to read now
	  		//console.log("theres data");
	  		cecnode.emit('received', readCecPacket(readStream));
		});
	});
}

util.inherits(CECNode, events.EventEmitter);

module.exports.CECNode = CECNode;
module.exports.cecCodeToString = cecCodeToString;

CECNode.prototype.sendMessage = function(message) {
    //this.emit("data", data);
    if (typeof(message.dst) == "undefined")
		return 0;
	if (typeof(message.src) == "undefined") 
		message.src = this.logical_addr; 
	var numArgs = 1;
	if (typeof(message.opcode) != "undefined")
		numArgs++;
	if (typeof(message.args) == "number")
		numArgs++;
	if (typeof(message.args) == "object")
		numArgs = numArgs + message.args.length;
	var packet = new Buffer(numArgs)
	packet[0] = ( (message.src & 0xf) << 4 ) | (message.dst & 0xf);
	if (typeof(message.opcode) != "undefined"){
		packet[1] = message.opcode;
		if (typeof(message.args) != "undefined"){
			if (typeof(message.args) == "object") {//assuming array
				for (var i = 0; i < message.args.length; i++)
				{
					packet[i+2] = message.args[i];
					//console.log("%d -> %d: %d", i-1, i, message.args[i]);
				}
			} else if (typeof(message.args) == "number") {
				packet[2] = message.args;
			} else {
				return 0;//ERRORRRRR
			}
		}
	}
	try{
		//writeStream.write(packet);
		//console.log("sending");
		//console.log(packet);
		fs.writeSync(cecfd, packet, 0, packet.length, null);
	} catch(e){ 
		//console.log('err'); console.log(arguments); 
		return 0; 
	}
		return 1;
    //this.emit('received', message);
}

function readCecPacket(readStream){
	//console.log('reading');
	var message = readStream.read();
	//console.log(message);
	if (message == null)
		return;
	var decoded = {src: message[0]>>4, dst: message[0] & 0xf, opcode: message.length>1 ? message[1] : -1};
	if (message.length > 2)
		decoded.args = message.slice(2);
	return decoded;
}


CECNode.prototype.listen = function() {/*console.log(this.logical_addr);*/ /*console.log("iocl: %d", */ioctl.setLogicalAddress(cecfd, this.logical_addr)/*)*/; }
