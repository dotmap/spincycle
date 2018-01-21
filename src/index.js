const { get } = require('axios')
const { app } = require('hyperapp')
const { main, h1, div, button, input, ul, li } = require('@hyperapp/html')

const devtools = require('hyperapp-redux-devtools')

const state = {
  user: '',
  name: '',
  issues: [],
  activeIssue: null
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
  selectIssue: ({number}) => ({ activeIssue: number })
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
    button({ onclick: e => actions.getIssues({user: state.user, name: state.name}) }, 'Request')
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
