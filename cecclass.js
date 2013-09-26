var util = require("util");
var events = require("events");
var fs = require('fs');
var ceccodes = require('./ceccodes');
var ioctl = require('/home/odroid/bin/cecioctl');

var cecfd;
var /*writeStream = -1,*/ readStream = -1;

function cecCodeToString(code){
	for (key in ceccodes)
	{
		if (ceccodes[key] == code)
			return key;
	}
}

function CECMaster() {
    events.EventEmitter.call(this);
    var master=this;
   	fs.open('/dev/CEC', 'r+', function(err,fd){
		cecfd = fd;
		//console.log('opened '+err);
		readStream = fs.createReadStream('/dev/CEC', {'fd': fd, autoClose: false, 'flags': 'r+'});
		master.emit('connected');
	    readStream.on('readable', function() {
	  	// there is some data to read now
	  		master.emit('received', cec_master.readCecPacket());
		});
	});
}

util.inherits(CECMaster, events.EventEmitter);

CECMaster.prototype.sendMessage = function(message) {
    //this.emit("data", data);
    if (typeof(message.src) == "undefined" || typeof(message.dst) == "undefined")
		return 0;
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
					packet[i+2] = arguments[i];
					//console.log("%d -> %d: %d", i-1, i, arguments[i]);
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
		fs.writeSync(cecfd, packet, 0, packet.length, null);
	} catch(e){ 
		//console.log('err'); console.log(arguments); 
		return 0; 
	}
		return 1;
    this.emit('received', message);
}

CECMaster.prototype.readCecPacket = function(){
	var message = readStream.read();
	var decoded = {src: message[0]>>4, dst: message[0] & 0xf, opcode: message.length>1 ? message[1] : -1};
	if (message.length > 2)
		decoded.args = message.slice(2);
	return decoded;
}

var cec_master = new CECMaster();

function CECLogical(logical_addr){
	events.EventEmitter.call(this);
	this.logical_addr = -1;
	var logical = this;
	cec_master.on('received', function(message){
		/*console.log('we got called');
		console.log(message);*/
		if (message.src == logical.logical_addr)
			return;//ignore our own messages!
		if (logical.promiscuous || message.dst == logical.logical_addr || message.dst == ceccodes.CEC_BROADCAST)
			logical.emit('received', message);
	}).on('connected', function(){
		logical.emit('connected');
	});
	if (arguments.length == 0)
	{
		this.monitor_mode = true;
		this.promiscuous = true;
		return;
	}
	this.logical_addr = logical_addr;
	this.listen();
}

util.inherits(CECLogical, events.EventEmitter);

CECLogical.prototype.sendMessage = function(message) { 
	if (typeof(message.src) == "undefined") 
		message.src = this.logical_addr; 
	return cec_master.sendMessage(message);
}

CECLogical.prototype.listen = function() {console.log(this.logical_addr); console.log("iocl: %d", ioctl.setLogicalAddress(cecfd+0, this.logical_addr+0)); }

var test = new CECLogical(8);

test.on('received', function(message){
	var opcode = typeof(message.opcode) != "undefined" ? cecCodeToString(message.opcode) : 'ping';
	console.log("%d > %d: %s", message.src, message.dst, opcode);
	if (typeof  message.args != "undefined")
		console.log( message.args);
	if (message.opcode == ceccodes.CEC_OSD_SET_OSD)
		console.log(message.args.toString());
}).on('connected', function(){
	console.log(test.sendMessage({dst: 4, opcode: ceccodes.CEC_INFO_REQ_PHYS_ADDR}));
	console.log(test.sendMessage({dst: 4, opcode: ceccodes.CEC_OSD_REQ_OSD}));
	console.log(test.sendMessage({src: 0, dst: 4, opcode: ceccodes.CEC_POWER_REQ_STATUS}));
});
