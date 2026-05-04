import { LitElement, html } from 'lit'
import * as Blockly from 'blockly'
import 'blockly/blocks'

class FsmPlayground extends LitElement {
  static properties = {
    nodes: { type: Array },
    edges: { type: Array },
    current: { type: String },
    output: { type: String },
    // UI form fields (light DOM reads)
    selectedFrom: { type: String },
    selectedTo: { type: String }
    ,statusMessage: { type: String }
  }


  constructor () {
    super()
    this.nodes = []
    this.edges = []
    this.current = ''
    this.output = ''
    this.workspace = null
    this.autosaveKey = 'tansducers_workspace'
    this.selectedFrom = ''
    this.selectedTo = ''
    this.startState = ''
    this.blockScale = 0.7 // 70% size (30% smaller)
    this.statusMessage = ''
    this._statusTimer = null
  }

  showStatus (msg, timeout = 3000) {
    this.statusMessage = msg
    this.requestUpdate()
    if (this._statusTimer) clearTimeout(this._statusTimer)
    this._statusTimer = setTimeout(() => { this.statusMessage = ''; this.requestUpdate() }, timeout)
  }

  // render into light DOM so global styles and Blockly tooling apply
  createRenderRoot () { return this }

  firstUpdated () {
    let mainDiv = this.querySelector('#blocklyMain')
    if (!mainDiv) mainDiv = document.getElementById('blocklyMain')
    if (!mainDiv) console.warn('fsm-playground: #blocklyMain not found when initializing Blockly')
    // No categories: list blocks directly so the toolbox flyout stays visible
    const toolbox = `
      <xml xmlns="https://developers.google.com/blockly/xml">
        <block type="fsm_start"></block>
        <block type="fsm_end"></block>
        <block type="fsm_state"></block>
        <block type="fsm_transition"></block>
      </xml>`

    this._defineFSMBlocks()

    try {
      this.workspace = Blockly.inject(mainDiv, {
      toolbox,
      renderer: 'zelos',
      grid: { spacing: 20, length: 3, colour: '#ddd', snap: true },
      zoom: { controls: true, wheel: true }
    })
      // apply scale to make blocks smaller
      try { this.workspace.setScale(this.blockScale) } catch (e) { console.warn('setScale failed', e) }
    } catch (err) {
      console.error('Failed to inject Blockly workspace:', err)
      return
    }

    // load autosave (use serialization-aware loader)
    try { this.loadFromLocal() } catch (e) { console.warn('loadFromLocal failed during init', e) }

    this.workspace.addChangeListener(() => {
      try {
        if (Blockly.serialization && Blockly.serialization.workspaces && Blockly.serialization.workspaces.save) {
          try {
            const stateObj = Blockly.serialization.workspaces.save(this.workspace)
            localStorage.setItem(this.autosaveKey, JSON.stringify({ format: 'ser', v: 1, state: stateObj }))
          } catch (se) {
            // fall back to XML
            const xml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(this.workspace))
            localStorage.setItem(this.autosaveKey, xml)
          }
        } else {
          const xml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(this.workspace))
          localStorage.setItem(this.autosaveKey, xml)
        }
      } catch (e) {}
      this._rebuildGraphFromBlocks()
    })

    // Save on page unload to avoid losing recent changes
    window.addEventListener('beforeunload', () => { try { this.saveToLocal() } catch (e) {} })

    // initial build
    this._rebuildGraphFromBlocks()
    // Ensure blocks are not hidden under the toolbox flyout
    this._shiftTopBlocksIfUnderToolbox()
  }

  // --- Block definitions ---
  _defineFSMBlocks () {
    // fsm_start: name + next state
    if (!Blockly.Blocks['fsm_start']) {
      Blockly.Blocks['fsm_start'] = {
        init: function () {
          this.appendDummyInput().appendField('Start').appendField(new Blockly.FieldTextInput('Start'), 'START_NAME').appendField('next').appendField(new Blockly.FieldTextInput('StateName'), 'NEXT_STATE')
          this.setColour(120)
          this.setTooltip('Start state: name and next state')
          this.setPreviousStatement(false)
          this.setNextStatement(false)
        }
      }
    }

    // fsm_end: only a name
    if (!Blockly.Blocks['fsm_end']) {
      Blockly.Blocks['fsm_end'] = {
        init: function () {
          this.appendDummyInput().appendField('End').appendField(new Blockly.FieldTextInput('EndState'), 'END_NAME')
          this.setColour(0)
          this.setTooltip('End state')
          this.setPreviousStatement(false)
          this.setNextStatement(false)
        }
      }
    }
    // fsm_state with a statement input for transitions (TRANSITIONS)
    if (!Blockly.Blocks['fsm_state']) {
      Blockly.Blocks['fsm_state'] = {
        init: function () {
          this.appendDummyInput().appendField('State').appendField(new Blockly.FieldTextInput('StateName'), 'STATE_NAME')
          this.appendDummyInput()
          this.appendStatementInput('TRANSITIONS').setCheck('fsm_transition').appendField('transitions')
          this.setColour(230)
          this.setTooltip('Defines a state in the FSM.')
          this.setPreviousStatement(false)
          this.setNextStatement(false)
        }
      }
    }

    // fsm_transition is a statement block that can be chained inside TRANSITIONS
    if (!Blockly.Blocks['fsm_transition']) {
      Blockly.Blocks['fsm_transition'] = {
        init: function () {
          this.appendDummyInput().appendField('on event').appendField(new Blockly.FieldTextInput('event_name'), 'EVENT').appendField('go to').appendField(new Blockly.FieldTextInput('TargetState'), 'DESTINATION')
          this.setPreviousStatement(true, 'fsm_transition')
          this.setNextStatement(true, 'fsm_transition')
          this.setColour(160)
          this.setTooltip('Moves the FSM to a new state based on an event.')
        }
      }
    }
  }

  // Removed regex blocks and custom theme to keep this component minimal.

  _rebuildGraphFromBlocks () {
    if (!this.workspace) return
    const blocks = this.workspace.getAllBlocks(false)
    const states = []
    const edges = []
    const seen = new Set()

    // First pass: collect states and special start/end blocks
    for (const b of blocks) {
      if (b.type === 'fsm_state') {
        const name = (b.getFieldValue && b.getFieldValue('STATE_NAME')) || `State${states.length}`
        if (!seen.has(name)) {
          states.push({ id: `s_${name}`, name, x: 60 + states.length * 120, y: 80, type: 'state' })
          seen.add(name)
        }
      } else if (b.type === 'fsm_start') {
        const name = (b.getFieldValue && b.getFieldValue('START_NAME')) || 'Start'
        const next = (b.getFieldValue && b.getFieldValue('NEXT_STATE')) || ''
        if (!seen.has(name)) { states.push({ id: `s_${name}`, name, x: 60 + states.length * 120, y: 20, type: 'start' }); seen.add(name) }
        if (next) { if (!seen.has(next)) { states.push({ id: `s_${next}`, name: next, x: 60 + states.length * 120, y: 160, type: 'state' }); seen.add(next) } edges.push({ from: `s_${name}`, to: `s_${next}`, symbol: 'start', output: '' }) }
      } else if (b.type === 'fsm_end') {
        const name = (b.getFieldValue && b.getFieldValue('END_NAME')) || 'End'
        if (!seen.has(name)) { states.push({ id: `s_${name}`, name, x: 60 + states.length * 120, y: 260, type: 'end' }); seen.add(name) }
      }
    }

    // Second pass: for each state block, iterate its TRANSITIONS statement children
    for (const b of blocks) {
      if (b.type === 'fsm_state') {
        const fromName = (b.getFieldValue && b.getFieldValue('STATE_NAME')) || ''
        const input = b.getInput('TRANSITIONS')
        if (!fromName || !input) continue
        let child = input.connection && input.connection.targetBlock()
        while (child) {
          if (child.type === 'fsm_transition') {
            const event = child.getFieldValue && child.getFieldValue('EVENT')
            const dest = child.getFieldValue && child.getFieldValue('DESTINATION')
            if (dest) {
              if (!seen.has(dest)) { states.push({ id: `s_${dest}`, name: dest, x: 60 + states.length * 120, y: 200 }); seen.add(dest) }
              edges.push({ from: `s_${fromName}`, to: `s_${dest}`, symbol: event || '', output: '' })
            }
          }
          child = child.getNextBlock()
        }
      }
    }
    this.nodes = states
    this.edges = edges
    if (!this.current && this.nodes.length) this.current = this.nodes[0].name
    this.requestUpdate()
  }

  // Programmatic helpers to mutate Blockly workspace
  addState () {
    if (!this.workspace) { this.showStatus('Workspace not ready'); return }
    const name = window.prompt('State name', `q${this.nodes.length}`)
    if (!name) return
    const blk = this.workspace.newBlock('fsm_state')
    blk.setFieldValue(name, 'STATE_NAME')
    blk.initSvg(); blk.render(); this.workspace.render()
    this._rebuildGraphFromBlocks()
    // auto-set start state if none
    if (!this.startState) { this.startState = name; this.requestUpdate() }
  }

  createTransitionFromUI () {
    if (!this.workspace) { this.showStatus('Workspace not ready'); return }
    const from = (this.querySelector('#fromSelect') && this.querySelector('#fromSelect').value) || ''
    const to = (this.querySelector('#toSelect') && this.querySelector('#toSelect').value) || ''
    const event = (this.querySelector('#symbolInput') && this.querySelector('#symbolInput').value) || ''
    if (!from || !to || !event) { this.showStatus('Please select From, To and provide an event'); return }

    // find the state block corresponding to `from`
    const blocks = this.workspace.getAllBlocks(false)
    let stateBlock = null
    for (const b of blocks) {
      if (b.type === 'fsm_state') {
        const name = b.getFieldValue && b.getFieldValue('STATE_NAME')
        if (name === from) { stateBlock = b; break }
      }
    }
    if (!stateBlock) { this.showStatus('From state block not found'); return }

    // create transition and connect into the TRANSITIONS statement input
    const t = this.workspace.newBlock('fsm_transition')
    t.setFieldValue(event, 'EVENT')
    t.setFieldValue(to, 'DESTINATION')
    t.initSvg(); t.render()

    const inputConn = stateBlock.getInput('TRANSITIONS') && stateBlock.getInput('TRANSITIONS').connection
    if (!inputConn) {
      this.showStatus('State block has no TRANSITIONS input')
      return
    }
    const first = inputConn.targetBlock()
    if (!first) {
      inputConn.connect(t.previousConnection)
    } else {
      // find last in chain
      let last = first
      while (last && last.getNextBlock && last.getNextBlock()) last = last.getNextBlock()
      if (last && last.nextConnection) last.nextConnection.connect(t.previousConnection)
      else inputConn.connect(t.previousConnection)
    }
    this.workspace.render()
    this._rebuildGraphFromBlocks()
    this._shiftTopBlocksIfUnderToolbox()
  }

  _shiftTopBlocksIfUnderToolbox () {
    if (!this.workspace) return
    try {
      const top = this.workspace.getTopBlocks(true) || []
      if (!top.length) return
      let minX = Infinity
      for (const b of top) {
        if (!b.getRelativeToSurfaceXY) continue
        const xy = b.getRelativeToSurfaceXY()
        if (!xy) continue
        if (xy.x < minX) minX = xy.x
      }
      if (minX === Infinity) return
      const desiredLeft = 220 // pixels from left so flyout doesn't overlap
      if (minX < desiredLeft) {
        const shift = desiredLeft - minX
        for (const b of top) {
          try { b.moveBy(shift, 0) } catch (e) { /* ignore */ }
        }
        try { this.workspace.render() } catch (e) {}
      }
    } catch (e) {
      console.warn('shiftTopBlocks failed', e)
    }
  }

  // Explicit save/load to localStorage
  saveToLocal () {
    if (!this.workspace) return
    try {
      // Prefer Blockly serialization API when available
      if (Blockly.serialization && Blockly.serialization.workspaces && Blockly.serialization.workspaces.save) {
        const stateObj = Blockly.serialization.workspaces.save(this.workspace)
        try {
          const envelope = { format: 'ser', v: 1, state: stateObj }
          const txt = JSON.stringify(envelope)
          localStorage.setItem(this.autosaveKey, txt)
        } catch (jsErr) {
          console.error('JSON.stringify failed for serialized state', jsErr)
          // fallback to XML
          const xml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(this.workspace))
          localStorage.setItem(this.autosaveKey, xml)
        }
      } else {
        const xml = Blockly.Xml.workspaceToDom(this.workspace)
        const txt = Blockly.Xml.domToText(xml)
        localStorage.setItem(this.autosaveKey, txt)
      }
      this.showStatus('Workspace saved')
    } catch (e) { console.error(e); this.showStatus('Save failed') }
  }

  loadFromLocal () {
    if (!this.workspace) return
    const saved = localStorage.getItem(this.autosaveKey)
    if (!saved) { this.showStatus('No saved workspace in localStorage'); return }
    try {
      // detect our serialized envelope
      let parsed = null
      try { parsed = JSON.parse(saved) } catch (e) { parsed = null }
      if (parsed && parsed.format === 'ser' && parsed.state) {
        if (Blockly.serialization && Blockly.serialization.workspaces && Blockly.serialization.workspaces.load) {
          try {
            Blockly.serialization.workspaces.load(parsed.state, this.workspace)
          } catch (loadErr) {
            console.error('serialization.workspaces.load failed', loadErr)
            this.showStatus('Serialized load failed; attempting XML fallback')
            // try XML fallback below
            throw loadErr
          }
        } else {
          console.warn('Serialization load requested but Blockly.serialization not available')
          this.showStatus('Cannot load serialized state: serialization API missing')
        }
      } else {
        // treat as XML string
        let xml
        try {
          xml = Blockly.Xml.textToDom(saved)
        } catch (inner) {
          console.warn('Blockly.Xml.textToDom failed, trying DOMParser', inner)
          const parser = new DOMParser()
          const doc = parser.parseFromString(saved, 'application/xml')
          if (doc && doc.documentElement) xml = doc.documentElement
          else throw inner
        }
        Blockly.Xml.clearWorkspaceAndLoadFromXml(xml, this.workspace)
      }
      // re-apply workspace scale (if available) after load
      try { if (this.workspace && this.workspace.setScale) this.workspace.setScale(this.blockScale) } catch (sErr) { console.warn('setScale after load failed', sErr) }
      this._rebuildGraphFromBlocks()
      this._shiftTopBlocksIfUnderToolbox()
      this.showStatus('Workspace loaded')
    } catch (e) { console.error('Load failed', e); this.showStatus('Load failed: ' + (e && e.message ? e.message : e)) }
  }

  inspectSaved () {
    try {
      const raw = localStorage.getItem(this.autosaveKey)
      if (!raw) { this.showStatus('No saved workspace found'); console.info('No saved workspace'); return }
      // try to detect format
      let parsed = null
      try { parsed = JSON.parse(raw) } catch (e) { parsed = null }
      if (parsed && parsed.format === 'ser') {
        const size = raw.length
        this.showStatus(`Saved: serialized (${size} bytes)`, 6000)
        console.info('Saved serialized workspace:', parsed)
      } else if (parsed) {
        this.showStatus(`Saved: JSON (unknown envelope, ${raw.length} bytes)`, 6000)
        console.info('Saved JSON workspace:', parsed)
      } else {
        // likely XML
        this.showStatus(`Saved: XML (${raw.length} bytes)`, 6000)
        console.info('Saved XML (first 500 chars):', raw.slice(0, 500))
      }
    } catch (e) { console.error('inspectSaved failed', e); this.showStatus('Inspect failed') }
  }

  clearSaved () {
    try {
      localStorage.removeItem(this.autosaveKey)
      this.showStatus('Cleared saved workspace')
    } catch (e) { console.error('clearSaved failed', e); this.showStatus('Clear failed') }
  }

  setStartState () {
    const from = (this.querySelector('#fromSelect') && this.querySelector('#fromSelect').value) || ''
    if (!from) { this.showStatus('Select a state to set as start'); return }
    this.startState = from
    this.requestUpdate()
  }

  start () {
    if (!this.startState) { this.showStatus('No start state defined'); return }
    this.current = this.startState
    this.requestUpdate()
    // simple visual feedback
    this.showStatus(`FSM started at ${this.startState}`)
  }

  exportWorkspace () {
    if (!this.workspace) return
    const xml = Blockly.Xml.workspaceToDom(this.workspace)
    const txt = Blockly.Xml.domToPrettyText(xml)
    const blob = new Blob([txt], { type: 'text/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'workspace.xml'; a.click(); URL.revokeObjectURL(url)
  }

  importWorkspace (file) {
    if (!this.workspace || !file) return
    const r = new FileReader()
    r.onload = () => {
      try {
        const raw = (r.result || '').toString().trim()
        // If it looks like XML, parse as XML
        if (raw.startsWith('<')) {
          let xml
          try { xml = Blockly.Xml.textToDom(raw) } catch (inner) {
            console.warn('Blockly.Xml.textToDom failed for import, trying DOMParser', inner)
            const parser = new DOMParser()
            const doc = parser.parseFromString(raw, 'application/xml')
            if (doc && doc.documentElement) xml = doc.documentElement
            else throw inner
          }
          Blockly.Xml.clearWorkspaceAndLoadFromXml(xml, this.workspace)
        } else {
          // try JSON serialized format
          let parsed = null
          try { parsed = JSON.parse(raw) } catch (je) { parsed = null }
          if (parsed && parsed.format === 'ser' && parsed.state) {
            if (Blockly.serialization && Blockly.serialization.workspaces && Blockly.serialization.workspaces.load) {
              Blockly.serialization.workspaces.load(parsed.state, this.workspace)
            } else {
              throw new Error('Blockly.serialization not available to load serialized workspace')
            }
          } else if (parsed) {
            // assume parsed is a direct state object
            if (Blockly.serialization && Blockly.serialization.workspaces && Blockly.serialization.workspaces.load) {
              Blockly.serialization.workspaces.load(parsed, this.workspace)
            } else {
              throw new Error('Blockly.serialization not available to load serialized workspace')
            }
          } else {
            throw new Error('Unrecognized import format')
          }
        }
        this._rebuildGraphFromBlocks()
        this._shiftTopBlocksIfUnderToolbox()
        this.showStatus('Workspace imported')
      } catch (e) { console.error('Import failed', e); this.showStatus('Import failed: ' + (e && e.message ? e.message : e)) }
    }
    r.readAsText(file)
  }

  clearWorkspace () { if (!this.workspace) return Blockly.Xml.clearWorkspaceAndLoadFromXml(Blockly.Xml.textToDom('<xml></xml>'), this.workspace) }

  render () {
    return html`
      <div class="app">
        <div class="topbar">
          <button @click=${() => this.saveToLocal()}>Save</button>
          <button @click=${() => this.loadFromLocal()}>Load</button>
          <button @click=${() => this.exportWorkspace()}>Export</button>
          <button @click=${() => this.inspectSaved()}>Inspect</button>
          <button @click=${() => this.clearSaved()}>Clear Saved</button>
          <input id="wsImport" type="file" accept="text/xml" style="display:none" @change=${(e) => this.importWorkspace(e.target.files[0])} />
          <button @click=${() => this.shadowRoot ? this.shadowRoot.getElementById('wsImport').click() : document.getElementById('wsImport').click()}>Import</button>
        </div>

        <div id="blocklyMain" class="panel"></div>

        <div class="panel graph">
          <h4>Graph</h4>
          <div class="list">
            <strong>States</strong>
            <ul>
              ${this.nodes.map(n => html`<li>${n.name}${n.name === this.startState ? html` <strong>(start)</strong>` : ''}${n.name === this.current ? html` <em>← current</em>` : ''}</li>`)}
            </ul>
            <div style="margin-top:12px">
              <svg width="100%" height="220" viewBox="0 0 1000 300">
                <defs>
                  <marker id="arrow" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto">
                    <path d="M0,0 L10,5 L0,10 z" fill="#333" />
                  </marker>
                </defs>
                ${this.nodes.map(n => {
                  if (n.type === 'end') {
                    return html`<g><circle cx="${n.x}" cy="${n.y}" r="20" fill="#ff4d4d" stroke="#330000" stroke-width="3"></circle><text x="${n.x}" y="${n.y+35}" text-anchor="middle">${n.name}</text></g>`
                  }
                  if (n.type === 'start') {
                    return html`<g><rect x="${n.x-30}" y="${n.y-18}" width="60" height="36" rx="6" fill="#86efac" stroke="#2a7f3d" stroke-width="2"></rect><text x="${n.x}" y="${n.y+35}" text-anchor="middle">${n.name}</text></g>`
                  }
                  return html`<g><rect x="${n.x-30}" y="${n.y-18}" width="60" height="36" rx="6" fill="#fff" stroke="#666" stroke-width="1"></rect><text x="${n.x}" y="${n.y+35}" text-anchor="middle">${n.name}</text></g>`
                })}
                ${this.edges.map(e => {
                  const from = this.nodes.find(x => x.id === e.from)
                  const to = this.nodes.find(x => x.id === e.to)
                  if (!from || !to) return ''
                  const x1 = from.x
                  const y1 = from.y
                  const x2 = to.x
                  const y2 = to.y
                  const mx = (x1 + x2) / 2
                  const my = (y1 + y2) / 2
                  return html`<g><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#333" stroke-width="2" marker-end="url(#arrow)"></line><text x="${mx}" y="${my-6}" text-anchor="middle" font-size="12">${e.symbol}</text></g>`
                })}
              </svg>
            </div>
            <strong>Transitions</strong>
            <ul>
              ${this.edges.map(e => html`<li>${e.from.replace('s_','') } -[${e.symbol}${e.output? ' / ' + e.output: ''}]-> ${e.to.replace('s_','')}</li>`)}
            </ul>
          </div>
        </div>
                <div class="statusbar">${this.statusMessage ? html`<div class="msg">${this.statusMessage}</div>` : ''}</div>
              </div>
    `
  }
}

customElements.define('fsm-playground', FsmPlayground)
