import { LitElement, html, css } from 'lit'
import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import 'blockly/javascript'

class FsmPlayground extends LitElement {
  static properties = {
    nodes: { type: Array },
    edges: { type: Array },
    current: { type: String },
    input: { type: String },
    output: { type: String },
    transducerMode: { type: Boolean },
    creatingEdgeFrom: { type: String }
  }

  static styles = css`
    :host { display: block; font-family: system-ui, Arial, sans-serif; padding: 16px; }
    .workspace { display: grid; grid-template-columns: 220px 1fr; gap: 12px; }
    .panel { border: 1px solid #ddd; padding: 12px; border-radius: 8px; background: #fff }
    .palette { display:flex;flex-direction:column;gap:8px }
    .block { background:#0f172a;color:#fff;padding:8px;border-radius:6px;cursor:grab }
    .canvas { background:#fff;border-radius:8px;min-height:480px;border:1px solid #e6e6e6 }
    svg{width:100%;height:480px;display:block}
    .controls{display:flex;gap:8px;align-items:center;margin-top:8px}
  `

  constructor () {
    super()
    this.nodes = []
    this.edges = []
    this.current = ''
    this.input = ''
    this.output = ''
    this.transducerMode = true
    this.creatingEdgeFrom = null
    this._nodeId = 1
    this.workspace = null
  }

  firstUpdated () {
    // Initialize Blockly workspace inside the palette area
    try {
      const div = this.shadowRoot.getElementById('blocklyDiv')
      if (div) {
        const toolbox = `
          <xml xmlns="https://developers.google.com/blockly/xml">
            <category name="FSM" colour="#5C81A6">
              <block type="fsm_state"></block>
              <block type="fsm_transition"></block>
            </category>
            <category name="Regex" colour="#A65C9E">
              <block type="regex_literal"></block>
              <block type="regex_concat"></block>
              <block type="regex_union"></block>
              <block type="regex_star"></block>
              <block type="regex_plus"></block>
              <block type="regex_group"></block>
              <block type="regex_test"></block>
            </category>
            <category name="Logic" colour="#5CA65C">
              <block type="controls_if"></block>
            </category>
          </xml>`

        // Define FSM blocks
        if (!Blockly.Blocks['fsm_state']) {
          Blockly.Blocks['fsm_state'] = {
            init: function () {
              this.appendDummyInput().appendField('state').appendField(new Blockly.FieldTextInput('q0'), 'NAME')
              this.setColour(230)
              this.setTooltip('Defines a state')
              this.setHelpUrl('')
            }
          }
        }

        if (!Blockly.Blocks['fsm_transition']) {
          Blockly.Blocks['fsm_transition'] = {
            init: function () {
              this.appendDummyInput()
                .appendField('transition from')
                .appendField(new Blockly.FieldTextInput('q0'), 'FROM')
                .appendField('to')
                .appendField(new Blockly.FieldTextInput('q1'), 'TO')
              this.appendDummyInput()
                .appendField('symbol')
                .appendField(new Blockly.FieldTextInput('a'), 'SYMBOL')
                .appendField('output')
                .appendField(new Blockly.FieldTextInput(''), 'OUTPUT')
              this.setColour(120)
              this.setTooltip('Defines a transition')
              this.setHelpUrl('')
            }
          }
        }

        // Define regex blocks and generators
        try { this._defineRegexBlocks() } catch (e) { console.warn('defineRegexBlocks failed', e) }

        // inject into main workspace area (large, Scratch-like)
        const mainDiv = this.shadowRoot.getElementById('blocklyMain') || div
        this.workspace = Blockly.inject(mainDiv, {
          toolbox,
          scrollbars: true,
          zoom: { controls: true, wheel: true, startScale: 1 },
          grid: { spacing: 20, length: 3, colour: '#ccc', snap: true }
        })

        // Rebuild graph from blocks whenever workspace changes
        this.workspace.addChangeListener(() => this._rebuildGraphFromBlocks())
      }
    } catch (err) {
      // Blockly may fail in some environments; log and continue
      console.warn('Blockly init failed', err)
    }
  }

  // --- Regex blocks definitions and JS generators ---
  _defineRegexBlocks () {
    // Literal
    if (!Blockly.Blocks['regex_literal']) {
      Blockly.Blocks['regex_literal'] = {
        init: function () {
          this.appendDummyInput().appendField('literal').appendField(new Blockly.FieldTextInput('a'), 'CHAR')
          this.setOutput(true, 'String')
          this.setColour(290)
          this.setTooltip('Literal character')
        }
      }
      Blockly.JavaScript['regex_literal'] = function (block) {
        const ch = block.getFieldValue('CHAR') || ''
        const code = `'${ch.replace(/'/g, "\\'")}'`
        return [code, Blockly.JavaScript.ORDER_ATOMIC]
      }
    }

    // Concat
    if (!Blockly.Blocks['regex_concat']) {
      Blockly.Blocks['regex_concat'] = {
        init: function () {
          this.appendValueInput('A').setCheck('String').appendField('concat')
          this.appendValueInput('B').setCheck('String')
          this.setOutput(true, 'String')
          this.setColour(200)
        }
      }
      Blockly.JavaScript['regex_concat'] = function (block) {
        const a = Blockly.JavaScript.valueToCode(block, 'A', Blockly.JavaScript.ORDER_CONCAT) || "''"
        const b = Blockly.JavaScript.valueToCode(block, 'B', Blockly.JavaScript.ORDER_CONCAT) || "''"
        const code = `${a} + ${b}`
        return [code, Blockly.JavaScript.ORDER_ADD]
      }
    }

    // Union (|)
    if (!Blockly.Blocks['regex_union']) {
      Blockly.Blocks['regex_union'] = {
        init: function () {
          this.appendValueInput('A').setCheck('String').appendField('union')
          this.appendValueInput('B').setCheck('String')
          this.setOutput(true, 'String')
          this.setColour(20)
        }
      }
      Blockly.JavaScript['regex_union'] = function (block) {
        const a = Blockly.JavaScript.valueToCode(block, 'A', Blockly.JavaScript.ORDER_ATOMIC) || "''"
        const b = Blockly.JavaScript.valueToCode(block, 'B', Blockly.JavaScript.ORDER_ATOMIC) || "''"
        const code = "'(' + " + a + " + '|' + " + b + " + ')'"
        return [code, Blockly.JavaScript.ORDER_ATOMIC]
      }
    }

    // Star (*)
    if (!Blockly.Blocks['regex_star']) {
      Blockly.Blocks['regex_star'] = {
        init: function () {
          this.appendValueInput('A').setCheck('String').appendField('star')
          this.setOutput(true, 'String')
          this.setColour(120)
        }
      }
      Blockly.JavaScript['regex_star'] = function (block) {
        const a = Blockly.JavaScript.valueToCode(block, 'A', Blockly.JavaScript.ORDER_ATOMIC) || "''"
        const code = "'(' + " + a + " + ')*'"
        return [code, Blockly.JavaScript.ORDER_ATOMIC]
      }
    }

    // Plus (+)
    if (!Blockly.Blocks['regex_plus']) {
      Blockly.Blocks['regex_plus'] = {
        init: function () {
          this.appendValueInput('A').setCheck('String').appendField('plus')
          this.setOutput(true, 'String')
          this.setColour(120)
        }
      }
      Blockly.JavaScript['regex_plus'] = function (block) {
        const a = Blockly.JavaScript.valueToCode(block, 'A', Blockly.JavaScript.ORDER_ATOMIC) || "''"
        const code = "'(' + " + a + " + ')+'"
        return [code, Blockly.JavaScript.ORDER_ATOMIC]
      }
    }

    // Group
    if (!Blockly.Blocks['regex_group']) {
      Blockly.Blocks['regex_group'] = {
        init: function () {
          this.appendValueInput('A').setCheck('String').appendField('group')
          this.setOutput(true, 'String')
          this.setColour(60)
        }
      }
      Blockly.JavaScript['regex_group'] = function (block) {
        const a = Blockly.JavaScript.valueToCode(block, 'A', Blockly.JavaScript.ORDER_ATOMIC) || "''"
        const code = "'(' + " + a + " + ')'"
        return [code, Blockly.JavaScript.ORDER_ATOMIC]
      }
    }

    // Test block (statement) - runs a test and alerts result
    if (!Blockly.Blocks['regex_test']) {
      Blockly.Blocks['regex_test'] = {
        init: function () {
          this.appendValueInput('REGEX').setCheck('String').appendField('regex')
          this.appendValueInput('INPUT').setCheck('String').appendField('test string')
          this.setPreviousStatement(true)
          this.setNextStatement(true)
          this.setColour(0)
        }
      }
      Blockly.JavaScript['regex_test'] = function (block) {
        const re = Blockly.JavaScript.valueToCode(block, 'REGEX', Blockly.JavaScript.ORDER_ATOMIC) || "''"
        const inp = Blockly.JavaScript.valueToCode(block, 'INPUT', Blockly.JavaScript.ORDER_ATOMIC) || "''"
        const code = `var __re = new RegExp(${re}); alert(__re.test(${inp}));\n`
        return code
      }
    }
  }

  _rebuildGraphFromBlocks () {
    if (!this.workspace) return
    const blocks = this.workspace.getAllBlocks(false)
    const states = []
    const edges = []
    const seen = new Set()
    for (const b of blocks) {
      if (b.type === 'fsm_state') {
        const name = (b.getFieldValue && b.getFieldValue('NAME')) || 'q0'
        if (!seen.has(name)) { states.push({ id: `s_${name}`, name, x: 60 + states.length * 80, y: 80 }) ; seen.add(name) }
      }
    }
    for (const b of blocks) {
      if (b.type === 'fsm_transition') {
        const from = b.getFieldValue && b.getFieldValue('FROM')
        const to = b.getFieldValue && b.getFieldValue('TO')
        const symbol = b.getFieldValue && b.getFieldValue('SYMBOL')
        const output = b.getFieldValue && b.getFieldValue('OUTPUT')
        if (from && to && symbol) {
          // ensure states exist
          if (!seen.has(from)) { states.push({ id: `s_${from}`, name: from, x: 60 + states.length * 80, y: 160 }); seen.add(from) }
          if (!seen.has(to)) { states.push({ id: `s_${to}`, name: to, x: 60 + states.length * 80, y: 160 }); seen.add(to) }
          const fromId = `s_${from}`
          const toId = `s_${to}`
          edges.push({ from: fromId, to: toId, symbol, output })
        }
      }
    }
    // map state ids to nodes used by canvas
    this.nodes = states.map(s => ({ id: s.id, name: s.name, x: s.x, y: s.y }))
    this.edges = edges
    if (!this.current && this.nodes.length) this.current = this.nodes[0].name
    this.requestUpdate()
  }

  disconnectedCallback () {
    super.disconnectedCallback()
    if (this.workspace) {
      try { Blockly.cancelProcessing && Blockly.cancelProcessing(this.workspace) } catch (e) {}
      try { this.workspace.dispose() } catch (e) {}
      this.workspace = null
    }
  }

  // Palette dragstart
  onPaletteDragStart (e) {
    e.dataTransfer.setData('text/fsm', 'create-node')
  }

  // Canvas dragover/drop to create node
  onCanvasDragOver (e) { e.preventDefault() }
  onCanvasDrop (e) {
    e.preventDefault()
    const type = e.dataTransfer.getData('text/fsm')
    if (type !== 'create-node') return
    const rect = this.shadowRoot.getElementById('svgArea').getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = `n${this._nodeId++}`
    const name = `q${this.nodes.length}`
    this.nodes = [...this.nodes, { id, name, x, y }]
    if (!this.current) this.current = name
    this.requestUpdate()
  }

  // Node pointer drag
  startNodeDrag (ev, node) {
    ev.preventDefault()
    const svg = this.shadowRoot.getElementById('svgArea')
    const onMove = (e) => {
      const rect = svg.getBoundingClientRect()
      node.x = e.clientX - rect.left
      node.y = e.clientY - rect.top
      this.requestUpdate()
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  clickNode (ev, node) {
    ev.stopPropagation()
    if (!this.creatingEdgeFrom) {
      this.creatingEdgeFrom = node.id
      this.requestUpdate()
      return
    }
    if (this.creatingEdgeFrom === node.id) {
      this.creatingEdgeFrom = null
      this.requestUpdate()
      return
    }
    const symbol = prompt('Enter transition symbol (single char)') || ''
    if (symbol === '') { this.creatingEdgeFrom = null; return }
    const output = this.transducerMode ? (prompt('Output for transducer (optional)') || '') : ''
    this.edges = [...this.edges, { from: this.creatingEdgeFrom, to: node.id, symbol, output }]
    this.creatingEdgeFrom = null
    this.requestUpdate()
  }

  // Render helpers
  nodeById (id) { return this.nodes.find(n => n.id === id) }

  simulate (e) {
    e && e.preventDefault()
    const input = this.shadowRoot.getElementById('inputStr').value || ''
    let stateName = this.current
    let out = ''
    for (const ch of input) {
      const fromNode = this.nodes.find(n => n.name === stateName)
      if (!fromNode) { stateName = null; break }
      const edge = this.edges.find(ed => ed.from === fromNode.id && ed.symbol === ch)
      if (!edge) { stateName = null; break }
      const toNode = this.nodeById(edge.to)
      stateName = toNode ? toNode.name : null
      if (edge.output) out += edge.output
    }
    this.output = out
    this.requestUpdate()
  }

  exportJSON () {
    const data = { nodes: this.nodes, edges: this.edges, start: this.current }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'fsm-graph.json'
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
        this.nodes = obj.nodes || []
        this.edges = obj.edges || []
        this.current = obj.start || (this.nodes[0] && this.nodes[0].name) || ''
        this.requestUpdate()
      } catch (err) {
        console.error('Invalid JSON', err)
      }
    }
    reader.readAsText(file)
  }

  setCurrentByName (e) { this.current = e.target.value }

  render () {
    return html`
      <div class="workspace">
        <aside class="panel">
          <h3>Palette</h3>
          <div class="palette">
            <div class="block" draggable="true" @dragstart=${this.onPaletteDragStart}>State</div>
            <div style="margin-top:8px">
              <button @click=${() => {
                if (!this.workspace) return alert('Blockly not initialized')
                try {
                  const code = Blockly.JavaScript.workspaceToCode(this.workspace)
                  alert(code || 'No code')
                } catch (err) { console.error(err) }
              }}>Show code</button>
              <button @click=${() => {
                if (!this.workspace) return alert('Blockly not initialized')
                try {
                  const xml = Blockly.Xml.workspaceToDom(this.workspace)
                  const s = Blockly.Xml.domToPrettyText(xml)
                  const blob = new Blob([s], { type: 'text/xml' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url; a.download = 'workspace.xml'; a.click(); URL.revokeObjectURL(url)
                } catch (e) { console.error(e) }
              }}>Export workspace</button>
              <input style="display:block;margin-top:6px" type="file" accept="text/xml" @change=${(e) => {
                const f = e.target.files[0]; if (!f || !this.workspace) return
                const r = new FileReader(); r.onload = () => {
                  try { const xml = Blockly.Xml.textToDom(r.result); Blockly.Xml.clearWorkspaceAndLoadFromXml(xml, this.workspace) } catch (err) { console.error(err) }
                }; r.readAsText(f)
              }} />
            </div>
          </div>

          <h4 style="margin-top:12px">Controls</h4>
          <div class="controls">
            <button @click=${this.exportJSON}>Export</button>
            <input type="file" accept="application/json" @change=${this.importJSON} />
          </div>

          <h4 style="margin-top:12px">Start / Current</h4>
          <select @change=${this.setCurrentByName} .value=${this.current}>
            ${this.nodes.map(n => html`<option value=${n.name}>${n.name}</option>`) }
          </select>

          <div style="margin-top:12px">
            <label><input type="checkbox" @change=${(e) => this.transducerMode = e.target.checked} ?checked=${this.transducerMode} /> Transducer mode</label>
          </div>
        </aside>

        <section class="canvas panel" @dragover=${this.onCanvasDragOver} @drop=${this.onCanvasDrop} @click=${() => { this.creatingEdgeFrom = null }}>
          <div id="blocklyMain" style="height:560px;width:100%"></div>
          <svg id="svgArea" style="display:none">
            ${this.edges.map(ed => {
              const a = this.nodeById(ed.from)
              const b = this.nodeById(ed.to)
              if (!a || !b) return null
              return html`<g>
                <line x1=${a.x} y1=${a.y} x2=${b.x} y2=${b.y} stroke="#666" stroke-width="2" marker-end="url(#arrow)" />
                <text x=${(a.x + b.x)/2} y=${(a.y + b.y)/2 - 6} font-size="12" fill="#111" text-anchor="middle">${ed.symbol}${ed.output ? ' / ' + ed.output : ''}</text>
              </g>`
            })}

            <defs>
              <marker id="arrow" markerWidth="10" markerHeight="10" refX="10" refY="3" orient="auto">
                <path d="M0,0 L0,6 L9,3 z" fill="#666" />
              </marker>
            </defs>

            ${this.nodes.map(node => {
              const fill = this.creatingEdgeFrom === node.id ? '#ffecb3' : (node.name === this.current ? '#0f172a' : '#88a')
              return html`<g @pointerdown=${(e) => this.startNodeDrag(e, node)} @click=${(e) => this.clickNode(e, node)} style="cursor:move">
                <circle cx=${node.x} cy=${node.y} r="28" fill=${fill} />
                <text x=${node.x} y=${node.y + 4} font-size="12" fill="#fff" text-anchor="middle">${node.name}</text>
              </g>`
            })}
          </svg>

          <div style="padding:12px">
            <form @submit=${this.simulate}>
              <label>Input</label>
              <input id="inputStr" placeholder="abba" />
              <button type="submit">Run</button>
            </form>
            <div style="margin-top:8px"><strong>Output:</strong> <pre>${this.output}</pre></div>
          </div>
        </section>
      </div>
    `
  }
}

customElements.define('fsm-playground', FsmPlayground)
