const socket = io();

socket.emit('games:mode_update', {
	mode : 'games'
});

var is_classic_connected = false;
var is_ble_connected = false;

	
window.onload = function(){ 
	/////////////////////////////////////////////////////////////
	/////////////////// INTERFACE INTERACTION ///////////////////
	/////////////////////////////////////////////////////////////
	
	document.getElementById("connect_classic").onclick = function() {
		// Start emg connection
		if (document.getElementById("connect_classic").value == "off") {
			document.getElementById("connect_classic").value = "connecting";
			document.getElementById("connect_classic").style.background = "#808080";
			document.getElementById("connect_classic").innerHTML = "Connecting...";
			socket.emit('bluetooth:connect_classic');
			console.log("connnect")

		// Stop emg_connection
		} else if (document.getElementById("connect_classic").value == "on") {
			document.getElementById("connect_classic").value = "off";
			document.getElementById("connect_classic").innerHTML = "Connect Bluetooth Classic";
			document.getElementById("connect_classic").style.background = "#4e73df";
			socket.emit('bluetooth:disconnect_classic');

		} else if (document.getElementById("connect_classic").value == "connecting") {
			document.getElementById("connect_classic").value = "off";
			document.getElementById("connect_classic").innerHTML = "Connect Bluetooth Classic";
			document.getElementById("connect_classic").style.background = "#4e73df";
			socket.emit('bluetooth:disconnect_classic');
		}
	}	
	
	document.getElementById("connect_ble").onclick = function() {
		// Start emg connection
		if (document.getElementById("connect_ble").value == "off") {
			document.getElementById("connect_ble").value = "connecting";
			document.getElementById("connect_ble").style.background = "#808080";
			document.getElementById("connect_ble").innerHTML = "Connecting...";
			socket.emit('bluetooth:connect_ble');

		// Stop emg_connection
		} else if (document.getElementById("connect_ble").value == "on") {
			document.getElementById("connect_ble").value = "off";
			document.getElementById("connect_ble").innerHTML = "Desconnect BLE";
			document.getElementById("connect_ble").style.background = "#4e73df";
			socket.emit('bluetooth:disconnect_ble');

		} else if (document.getElementById("connect_ble").value == "connecting") {
			document.getElementById("connect_ble").value = "off";
			document.getElementById("connect_ble").innerHTML = "Connect BLE";
			document.getElementById("connect_ble").style.background = "#4e73df";
			socket.emit('bluetooth:disconnect_ble');
		}
	}	
	
	document.getElementById("record").onclick = function() {
		socket.emit('bluetooth:start');
		document.getElementById("record").disabled = true;
		document.getElementById("stop").disabled = false;
		
	}
	document.getElementById("stop").onclick = function() {
		socket.emit('bluetooth:stop');
		document.getElementById("record").disabled = false;
		document.getElementById("stop").disabled = true;
		document.getElementById("save").disabled = false;
		
	}
	document.getElementById("save").onclick = function() {
		socket.emit('bluetooth:download');
		document.getElementById("save").disabled = true;
		window.open('http://192.168.43.1:3000/downloadpressuresensor');
		
	}

	socket.on('bluetooth:connection_status', (data) => {
		let device= data.device;
		let status= data.status;
		console.log(data);
		if(device == 'ble'){
			if (status==0){
				console.log("is con")
				//change button color and text;
				document.getElementById("connect_ble").value = "on";
				document.getElementById("connect_ble").innerHTML = "Desconnect BLE";
				document.getElementById("connect_ble").style.background = "#4eb14e";
				is_ble_connected = true

				document.getElementById("record").disabled = false;
				document.getElementById("connect_classic").disabled = true;

				
				
			} else {
				console.log("error connection / disconnection")
				document.getElementById('calibrate').style.display = "none";
				//change button color and text;
				document.getElementById("connect_ble").value = "off";
				document.getElementById("connect_ble").innerHTML = "Connect BLE";
				document.getElementById("connect_ble").style.background = "#4e73df";
				is_ble_connected = false;
				
				document.getElementById("record").disabled = true;
				document.getElementById("stop").disabled = true;
				document.getElementById("save").disabled = true;
				
				document.getElementById("connect_classic").disabled = false;
				
				
			}

		} else if(device == 'classic'){
			if (status==0){
				console.log("is con")
				//change button color and text;
				document.getElementById("connect_classic").value = "on";
				document.getElementById("connect_classic").innerHTML = "Desconnect Bluetooth Classic";
				document.getElementById("connect_classic").style.background = "#4eb14e";
				is_classic_connected = true

				document.getElementById("record").disabled = false;
				document.getElementById("connect_ble").disabled = true;
				
				
				
			} else {
				console.log("error connection / disconnection")
				//change button color and text;
				document.getElementById("connect_classic").value = "off";
				document.getElementById("connect_classic").innerHTML = "Connect Bluetooth Classic";
				document.getElementById("connect_classic").style.background = "#4e73df";
				is_classic_connected = false;
				
				document.getElementById("record").disabled = true;
				document.getElementById("stop").disabled = true;
				document.getElementById("save").disabled = true;
				
				document.getElementById("connect_ble").disabled = false;

				
				
			}
		}
	});
	
}


