import { LitElement, html, css } from 'lit'

class FsmPlayground extends LitElement {
  static properties = {
    states: { type: Array },
    transitions: { type: Array },
    current: { type: String },
    input: { type: String },
    output: { type: String },
    transducerMode: { type: Boolean }
  }

  static styles = css`
    :host { display: block; font-family: system-ui, Arial, sans-serif; padding: 16px; }
    .panel { display: grid; gap: 12px; grid-template-columns: 1fr 1fr; }
    section { border: 1px solid #ddd; padding: 12px; border-radius: 8px; background: #fff }
    label { display:block; font-size: 13px; margin-bottom:6px }
    input, select { width:100%; padding:6px; margin-bottom:8px }
    button { padding:6px 10px }
    pre { background:#f6f8fa; padding:8px; border-radius:6px; overflow:auto }
  `

  constructor () {
    super()
    this.states = []
    this.transitions = []
    this.current = ''
    this.input = ''
    this.output = ''
    this.transducerMode = false
  }

  addState (e) {
    e.preventDefault()
    const name = this.shadowRoot.getElementById('stateName').value.trim()
    if (!name) return
    if (!this.states.includes(name)) this.states = [...this.states, name]
    if (!this.current) this.current = name
    this.requestUpdate()
  }

  addTransition (e) {
    e.preventDefault()
    const from = this.shadowRoot.getElementById('fromState').value
    const to = this.shadowRoot.getElementById('toState').value
    const symbol = this.shadowRoot.getElementById('symbol').value
    const out = this.shadowRoot.getElementById('output').value
    if (!from || !to || symbol === '') return
    const t = { from, to, symbol, output: out }
    this.transitions = [...this.transitions, t]
    this.requestUpdate()
  }

  setCurrent (e) {
    this.current = e.target.value
  }

  simulate (e) {
    e && e.preventDefault()
    const input = this.shadowRoot.getElementById('inputStr').value || ''
    let state = this.current
    let out = ''
    for (const ch of input) {
      const t = this.transitions.find(t => t.from === state && t.symbol === ch)
      if (!t) { state = null; break }
      state = t.to
      if (t.output) out += t.output
    }
    this.output = out
    this.requestUpdate()
  }

  exportJSON () {
    const data = { states: this.states, transitions: this.transitions, start: this.current }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'fsm.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  importJSON (e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result)
        this.states = obj.states || []
        this.transitions = obj.transitions || []
        this.current = obj.start || (this.states[0] || '')
        this.requestUpdate()
      } catch (err) {
        console.error(err)
      }
    }
    reader.readAsText(file)
  }

  toggleTransducer (e) {
    this.transducerMode = e.target.checked
  }

  render () {
    return html`
      <div class="panel">
        <section>
          <h3>States</h3>
          <form @submit=${this.addState}>
            <label for="stateName">New state name</label>
            <input id="stateName" placeholder="q0" />
            <button type="submit">Add state</button>
          </form>

          <label>Start / Current state</label>
          <select @change=${this.setCurrent} .value=${this.current}>
            ${this.states.map(s => html`<option value=${s}>${s}</option>`) }
          </select>

          <h4>Export / Import</h4>
          <button @click=${this.exportJSON}>Export FSM</button>
          <input type="file" accept="application/json" @change=${this.importJSON} />
        </section>

        <section>
          <h3>Transitions</h3>
          <form @submit=${this.addTransition}>
            <label>From</label>
            <select id="fromState">
              ${this.states.map(s => html`<option value=${s}>${s}</option>`)}
            </select>
            <label>To</label>
            <select id="toState">
              ${this.states.map(s => html`<option value=${s}>${s}</option>`)}
            </select>
            <label>Symbol (single char)</label>
            <input id="symbol" maxlength="4" placeholder="a" />
            <label>Output (optional, for transducers)</label>
            <input id="output" placeholder="x" />
            <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
              <input id="tdMode" type="checkbox" @change=${this.toggleTransducer} ?checked=${this.transducerMode} />
              <label for="tdMode">Transducer mode (enable outputs)</label>
            </div>
            <button type="submit">Add transition</button>
          </form>

          <h4>Current Transitions</h4>
          <pre>${JSON.stringify(this.transitions, null, 2)}</pre>
        </section>

        <section style="grid-column: 1 / -1">
          <h3>Run / Simulate</h3>
          <form @submit=${this.simulate}>
            <label>Input string</label>
            <input id="inputStr" placeholder="abba" />
            <button type="submit">Simulate</button>
          </form>
          <div style="margin-top:12px">
            <strong>Output:</strong>
            <pre>${this.output}</pre>
            <strong>Start state:</strong> ${this.current}
          </div>
        </section>
      </div>
    `
  }
}

customElements.define('fsm-playground', FsmPlayground)
