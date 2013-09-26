var cec = require('./CECNode');
var ceccodes = require('./ceccodes');

var test = new cec.CECNode(0);

test.on('received', function(message){
	var opcode = typeof(message.opcode) != "undefined" ? cec.cecCodeToString(message.opcode) : 'ping';
	console.log("%d > %d: %s", message.src, message.dst, opcode);
	if (typeof  message.args != "undefined")
		console.log( message.args);
	if (message.opcode == ceccodes.CEC_OSD_SET_OSD)
		console.log(message.args.toString());
}).on('connected', function(){
	//console.log(test.sendMessage({dst: 4, opcode: ceccodes.CEC_INFO_REQ_PHYS_ADDR}));
	//console.log(test.sendMessage({dst: 4, opcode: ceccodes.CEC_OSD_REQ_OSD}));
	//console.log("sendng: %d", test.sendMessage({dst: 4, opcode: ceccodes.CEC_POWER_REQ_STATUS}));
	//test.sendMessage({dst: 0xf, opcode: ceccodes.CEC_ROUTING_REQ_PATH, args: [0x20, 0]});
	/*for (i=1; i<14; i++){
		console.log("pinging %d: %d", i, test.sendMessage({dst: i}));
	}*/
	console.log("sendng: %d", test.sendMessage({dst: 4, opcode: ceccodes.CEC_POWER_REQ_STATUS}));
	//console.log(cec_master.readCecPacket());
});