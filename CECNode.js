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
    this.logical_addr = ceccodes.CEC_UNREGISTERED;
    if (arguments.length)
    	this.logical_addr = logical_addr;
	this.listened = false;
    var cecnode=this;
   	fs.open('/dev/CEC', 'r+', function(err,fd){
		cecfd = fd;
		//console.log('opened '+err);
		readStream = fs.createReadStream('/dev/CEC', {'fd': fd, autoClose: false, 'flags': 'r+'});
		if (cecnode.logical_addr != ceccodes.CEC_UNREGISTERED)
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

CECNode.prototype.ping = function(dst)
{
	return this.sendMessage({"dst": dst});
}

var CECDeviceType = {
    CEC_DEVICE_INVALID: 0
    /** TV */
    CEC_DEVICE_TV: 1,
    /** Recording Device */
    CEC_DEVICE_RECODER: 2,
    /** Tuner */
    CEC_DEVICE_TUNER: 3,
    /** Playback Device */
    CEC_DEVICE_PLAYER: 4,
    /** Audio System */
    CEC_DEVICE_AUDIO: 5
};

var deviceTypeToLogical = [
	[ CEC_DEVICE_TV, 0 ],
	[ CEC_DEVICE_TV, 14 ],//E
	[ CEC_DEVICE_RECODER, 1 ],
    [ CEC_DEVICE_RECODER, 2 ],
    [ CEC_DEVICE_TUNER, 3 ],
    [ CEC_DEVICE_PLAYER, 4 ],
    [ CEC_DEVICE_AUDIO, 5 ],
    [ CEC_DEVICE_TUNER, 6 ],
    [ CEC_DEVICE_TUNER, 7 ],
    [ CEC_DEVICE_PLAYER, 8 ],
    [ CEC_DEVICE_RECODER, 9 ],
    [ CEC_DEVICE_TUNER, 10 ],//A
    [ CEC_DEVICE_PLAYER, 11 ]//B
    //13 & 14 are reserved
];

CECNode.prototype.allocateAddress = function(devicetype, physaddr) {
	if (arguments.length == 0 || devicetype < 1)
		devicetype = CEC_DEVICE_PLAYER;
	var assignedaddr = ceccodes.CEC_UNREGISTERED;
	for (i=0; i<deviceTypeToLogical.length; i++)
	{
		if (deviceTypeToLogical[i][0] == devicetype)
		{
			if (this.ping(deviceTypeToLogical[i][1]) == 0)//address is free
			{
				assignedaddr = deviceTypeToLogical[i][1];
				break;
			}
		}
	}
	if (assignedaddr == ceccodes.CEC_UNREGISTERED && this.ping(14) == 0)//check if free use is available
		assignedaddr = 14;

	if (assignedaddr==ceccodes.CEC_UNREGISTERED){//if not even the free use addr is available, bail out with the unregistered address
		return ceccodes.CEC_UNREGISTERED;
	}

	if (arguments.length == 2)//a physical address was given
	{
		this.sendMessage({dst: 15, opcode: ceccodes.CEC_INFO_PHYS_ADDR, args: [physaddr >> 4, physaddr & 0xff, devicetype]});
	}

	return assignedaddr;
}