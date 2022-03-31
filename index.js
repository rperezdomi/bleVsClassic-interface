

const path = require('path'); // Modulo de nodejs para trabajar con rutas
const express = require('express'); // Configurar express
const fs = require('fs'); //  File System module
const net = require('net');
const SocketIO = require('socket.io');
const ExcelJS = require('exceljs');
const matrix = require('node-matrix');
const {createBluetooth} = require('node-ble');
const {bluetooth, destroy} = createBluetooth();

const BluetoothClassicSerialportClient = require('bluetooth-classic-serialport-client');
const bt_classic = new BluetoothClassicSerialportClient();
const bt_classic_name = "20220015-PM"
var characteristic_object = null;
var device_object = null;
const PLOTSAMPLINGTIME = 100; //ms

/////////////////////////////////
//** Webserver configuration **//
/////////////////////////////////
//
// Express initialization SWalker
const app = express();
app.set('port', process.env.PORT || 3000)
// Send static files
app.use(express.static(path.join(__dirname, 'public')));
// Configure PORT of the web
const server = app.listen(app.get('port'), () => {
    console.log('Server', app.get('port'));
})

/////////////////////////////////
//** Socket io configuration **//
/////////////////////////////////
// Socket io is the javascript library used for the
// realtime, bi-directional communication between web
// clients and servers.
//
// Give the server to socketio
const io = SocketIO(server);
var sockets = Object.create(null);

//////////////////////////////////////
//***** SENSORS DATA RECEPTION
//////////////////////////////
//

// vars of recorded therapy data
var record_therapy = false;
var is_first_data = [true, true, true, true];   //sw, imu1, pressure, imu3
var is_classic_connected = false;
var is_ble_connected = false;

// vars used for the imus data reception

// IMU1 data reception (bt)
bt_classic.on('data', function(data){ 

	console.log(data.toString());

}); 

bt_classic.on('closed', function(){
	console.log("connection closed");
	
	sockets['websocket'].emit('bluetooth:connection_status',{
		 device: "classic",
		 status:3
	}) 
	
	disconnect_bt_device(sockets['websocket'], bt_classic, is_classic_connected, "classic")

})

bt_classic.on('failure', function(e){
	console.log(e);

})

bt_classic.on('disconnected', function(e){
	console.log(e);

})



// Websockets
io.on('connection', (socket) => {
    console.log('new connection', socket.id);
    sockets['websocket'] = socket;
    
    var datitos=[];
    app.get('/downloadpressuresensor', (req, res) => setTimeout(function(){ res.download('./PressureSensor.xlsx'); }, 1000))

    
    // Connect classic bluetooth 
    socket.on('bluetooth:connect_classic', function(callbackFn) {
	    
	console.log(is_classic_connected);
        connect_bt_device(socket, bt_classic, is_classic_connected, "classic");

    });
    // Disconnect classic bluetooth
    socket.on('bluetooth:disconnect_classic', function(callbackFn) {

       disconnect_bt_device(socket, bt_classic, is_classic_connected, "classic");
       
    });
    // Connect ble
    socket.on('bluetooth:connect_ble', function(callbackFn) {

    	console.log(is_ble_connected);
	subscribe_ble_char(socket, adapter, ble_macAddr, ble_service_macAddr, ble_characteristic_macAddr)

    });
    // Disconnect Pressure Sensor
    socket.on('bluetooth:disconnect_ble', function(callbackFn) {

	if(is_ble_connected){
		characteristic_object.stopNotifications()
		device_object.disconnect()
		destroy()
		
		is_ble_connected = false
		socket.emit('bluetooth:connection_status', {
			device: "ble",
			// status--> 0: connect, 1: error, 2: not paired, 3: disconnected
			status: 3
		})
		
	}
       
    });

    // Start therapy.
    socket.on('bluetooth:start', function(callbackFn) {
		
        // Start recording
        record_therapy = true;

		
    });

    // Stop therapy.
    socket.on('bluetooth:stop', function(callbackFn) {

        record_therapy = false;

    });
    
    socket.on('bluetooth:download', function(callbackFn) {

    	const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('data');
        
        /*worksheet.addRow(["Milisegundos", "Alfa", "Beta", "Gamma", "Sensor Presión"]);
        for (var i = 0; i < row_values.length; i++) {
		let miliseconds = (i/50)*1000
		row_values[i].unshift(miliseconds)
		worksheet.addRow((row_values[i]));
	}
	workbook.xlsx.writeFile('PressureSensor.xlsx');
        
	*/
	
    });
    
});

function hex2a_general(hexx, lasthex, is_first_data) {
    var hex = hexx.toString();//force conversion
    var message = [];
    var newhex = "";
    
    if(is_first_data){
		is_first_data = false;
		lasthex = "";
		var splitted = [];
			
	} else {
		for (var i = 0; i < hex.length; i++){
			if (!(hex[i] == "\r" || hex[i] == "\n")){
				newhex += hex[i];
			}
		}
		
		newhex = lasthex + newhex;
		if (newhex.includes("#")){
			var splitted = newhex.split("#");
		} else {
			var splitted = []
		}
	
	}
	
    message.push(splitted)
    message.push(is_first_data)
    return message; 
}

function connect_bt_device(socket, bt_object, status_boolean, str_device){
		
	if (!status_boolean){
		status_boolean = false;
		var deviceNotFound = true;
		var pairedDevices = bt_object.scan()
		.then(function(devices) {
			console.log("[Bt] Scanning devices ...");
			console.log(devices)
			
			// Check if the device is switch on and close to the raspberry
			for (let i = 0; i < devices.length; i++) {
				
				if(deviceNotFound){
					var device_name = devices[i].name;
					var device_address = devices[i].address;
							
					// case SWalker / pressure sensor
					if( str_device == 'classic'){
						if(devices[i].name== bt_classic_name){
							console.log('[Bt] Classic bt sensor found. Trying_connection...')
							deviceNotFound = false;
						}
					}
					
					// Device found
					if(!deviceNotFound){
						bt_object.connect(device_address)
						.then(function() {
							console.log('[Bt] Bluetooth connection established with device name: ' + device_name)
							socket.emit('bluetooth:connection_status', {
								device: str_device,
								// status--> 0: connect, 1: disconnect, 2: not paired
								status: 0
							})
							is_classic_connected = true;
							
							
							
						})
						.catch(function(err) {
							// The device has not been found.
							var deviceNotFound = false;
							console.log('[Error] Device: ' + device_name , err);
							
							// message status in case GAMES interface
							socket.emit('bluetooth:connection_status', {
								device: str_device,
								// status--> 0: connect, 1: disconnect, 2: not paired
								status: 1
							})
						})
					}
				}
			}
			
			// Device not found
			if(deviceNotFound){
				console.log("device not found!");
				// message status in case GAMES interface
				socket.emit('bluetooth:connection_status', {   
					device: str_device,
					// status--> 0: connect, 1: disconnect, 2: not paired/not found
					status: 2
				})
			} 
		});
		
	
		
	}else{
		console.log('[Bt] The device is already connected!')
		socket.emit('bluetooth:connection_status', {
			device: str_device,
			// status--> 0: connect, 1: disconnect, 2: not paired
			status: 0
		}) 
    }
	
}

function disconnect_bt_device(socket, bt_object, status_boolean, str_device){
    if (status_boolean){
		
		bt_object.close()
		.then(function() {
			console.log('[Bt] Bluetooth connection successfully closed ');
			status_boolean = false;
			socket.emit('bluetooth:connection_status', {
					device: str_device,
					// status--> 0: connect, 1: error, 2: not paired, 3: disconnected
					status: 3
				})
		
		})
		.catch(function(err) {
			console.log('Connetion already close')
			
		})
	
		is_classic_connected = false;
				
				
	}
	
}


function subscribe_ble_char(socket, adapter, ble_macAddr, ble_service_macAddr, ble_characteristic_macAddr){
	
	adapter.isDiscovering()
	.then(function(is_discovering){
		if(! is_discovering){
			adapter.startDiscovery()
			.then(function() {
				console.log("discovery started...");
				dapter.waitDevice(ble_macAddr)
				.then(function(device) {
					console.log("find device!");
					device_object = device
					device_object.connect()
					.then(function(){
						console.log("Successfully connected");
						
						device_object.gatt()
						.then(function(gattServer){
							const gattServer_ble = gattServer
							gattServer_ble.getPrimaryService(ble_service_macAddr)
							.then(function(service){
								console.log("Service found!")
								const ble_service = service
								ble_service.getCharacteristic(ble_characteristic_macAddr)
								.then(function(char){
									console.log("found characteristic!")
									characteristic_object = char
									characteristic_object.startNotifications()
									.then(function(){
										console.log("successfully subscribe to characteristic!")
										socket.emit('bluetooth:connection_status', {
											device: "ble",
											// status--> 0: connect, 1: disconnect, 2: not paired
											status: 0
										})
										is_ble_connected = true
										
										characteristic_object.on("valuechanged", buffer => {
											console.log(buffer)
										})
										
												 
									})
									.catch(function(err){
										console.log("error while subscribing to char: " + err)
									});
								})
								.catch(function(err){
									console.log("error at getCharacteristic(): " + err)
								});
									
							})
							.catch(function(err) {
								console.log("error while getting service: " + err)
							});
						})
						.catch(function(err){
							console.log("error while getting gattServer: " + err)
						});
					})
					.catch(function(err){
						console.log("error while connecting device: " + err)
						socket.emit('bluetooth:connection_status', {
							device: "ble",
							// status--> 0: connect, 1: disconnect, 2: not found/error
							status: 2
						})
					});
					
				})
				.catch(function(err){
					console.log("could not find device. " + err)
					socket.emit('bluetooth:connection_status', {
						device: "ble",
						// status--> 0: connect, 1: disconnect, 2: not found/error
						status: 2
					})
				});
			
			})
			.catch(function(err){
				console.log("error while trying startDiscovery(): " + err)
				socket.emit('bluetooth:connection_status', {
					device: "ble",
					// status--> 0: connect, 1: disconnect, 2: not found/error
					status: 2
				})
			});
		 
		}
	})
	.catch(function(err) {
		console.log(err)
		socket.emit('bluetooth:connection_status', {
			device: "ble",
			// status--> 0: connect, 1: disconnect, 2: not found/error
			status: 2
		})
	});
	
}
