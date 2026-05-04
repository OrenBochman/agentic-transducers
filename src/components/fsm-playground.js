import { LitElement, html, css } from 'lit'

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
          <svg id="svgArea">
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
