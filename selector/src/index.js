const {app} = require('hyperapp');
const {main, h3, div, button} = require('@hyperapp/html');
const devtools = require('hyperapp-redux-devtools');
const server = new (require('bluetooth-serial-port')).BluetoothSerialPortServer();

const send = data => new Promise((resolve, reject) => server.write(data, (err, bytes) => {
	if (err) {
		return reject(err);
	}
	resolve(bytes);
}));

const state = {
	listening: false,
	message: '',
	address: ''
};

const actions = {
	received: message => ({message}),
	connected: address => ({address}),
	init: () => (state, actions) => {
		server.listen(address => {
			actions.connected(address);
			server.on('data', buffer => actions.received(buffer.toString('utf-8')));
		}, error => {
			console.error(error);
			actions.connected();
		}, {
			channel: 8
		});
		return {listening: true};
	},
	prev: () => async (state, actions) => {
		await send(Buffer.from('-'));
	},
	select: () => async (state, actions) => {
		await send(Buffer.from('='));
	},
	next: () => async (state, actions) => {
		await send(Buffer.from('+'));
	}
};

const view = (state, actions) =>
  main([
	h3(state.message || state.address || 'Not Connected'),
	div([
		button({onclick: actions.prev}, '<--'),
		button({onclick: actions.select}, 'toggle'),
		button({onclick: actions.next}, '-->')
	])
]);

const vm = devtools(app)(state, actions, view, document.body);

vm.init();
