const { get } = require('axios')
const { app } = require('hyperapp')
const { main, h1, div, button, input, ul, li } = require('@hyperapp/html')
const devtools = require('hyperapp-redux-devtools')
const {remote} = require('electron')
const bluetooth = remote.require('bluetooth-serial-port')

const btSerial = new bluetooth.BluetoothSerialPort()
const connect = address => new Promise((resolve, reject) => {
  btSerial.connect(address, 8, function () {
    console.log('connected')

    btSerial.on('data', function (buffer) {
      console.log(buffer.toString('utf-8'))
    })

    resolve(btSerial)
  }, reject)
})

const state = {
  user: '',
  name: '',
  issues: [],
  activeIssue: null,
  btPending: false,
  btAddress: ''
}

const actions = {
  getIssues: ({ user, name }) => async (state, actions) => {
    actions.setIssues(await get(`https://api.github.com/repos/${user}/${name}/issues`)
      .then(issues => (issues.data.map(({number, title}, index) => ({number, title, active: index === 0})))))
  },
  setIssues: (issues) => ({issues}),
  setUser: (user) => ({user}),
  setName: (name) => ({name}),
  setActive: (direction) => ({issues}) => {
    const current = issues.findIndex(({active}) => (active === true))
    issues[current].active = false
    if (current + direction >= issues.length) issues[0].active = true
    else if (current + direction < 0) issues[issues.length - 1].active = true
    else issues[current + direction].active = true
    return { issues }
  },
  selectIssue: ({number}) => ({ activeIssue: number }),
  connecting: () => ({ btPending: true }),
  connected: addr => ({ btPending: false, btAddress: addr }),
  connectSelector: () => async (state, actions) => {
    const address = 'b8-27-eb-5a-b1-9f'
    try {
      actions.connecting()
      const bt = await connect(address)
      bt.on('data', chunk => {
        const dir = {
          '-': -1,
          '+': 1
        }[chunk.toString()]
        actions.setActive(dir)
        const issue = state.issues.find(({active}) => (active === true))
        btSerial.write(Buffer.from(`${issue.number}: ${issue.title}`), function (err, bytesWritten) {
          if (err) console.log(err)
        })
      })
      bt.on('error', err => {
        console.error(err)
        actions.connected('')
      })
      actions.connected(address)
      // connection.write(Buffer.from('hello world'))
    } catch (err) {
      console.error(err)
      actions.connected('')
    }
  }
}

const view = (state, actions) => main([
  h1('Search for a repo...'),
  div([
    input({
      type: 'text',
      name: 'user',
      oninput: ({target: {value}}) => actions.setUser(value),
      placeholder: 'User...'
    }),
    input({
      type: 'text',
      name: 'name',
      oninput: ({target: {value}}) => actions.setName(value),
      placeholder: 'Repo...'
    })
  ]),
  div([
    button({ onclick: e => actions.getIssues({user: state.user, name: state.name}) }, 'Request'),
    button({ onclick: e => actions.connectSelector(), disabled: state.btAddress || state.btPending }, state.btPending ? 'Busy...' : state.btAddress ? 'Connected' : 'Connect')
  ]),
  div([
    ul([
      state.issues.map(({number, title, active}) => {
        return li({class: active ? 'active' : '', onclick: ({target}) => active ? actions.selectIssue({number}) : null}, `${number}: ${title}`)
      })
    ])
  ])
])

devtools(app)(state, actions, view, document.body)
