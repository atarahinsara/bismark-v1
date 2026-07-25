/**
 * Notification Template Engine — Deterministic Renderer (LAW-55)
 * ============================================================
 *
 * Implements a Handlebars-style mini template language for notification
 * subject/body rendering. The engine is fully deterministic (LAW-53 style):
 *   - No Date.now(), no Math.random(), no I/O, no side effects.
 *   - Same template + same variables → same output. Always.
 *
 * Any "current date" must come from the variables payload (e.g. {{currentDate}}
 * is provided by the caller as a string). The engine NEVER reads the system
 * clock, NEVER calls Math.random(), NEVER touches the network or DB.
 *
 * Supported syntax
 * ----------------
 *   {{variable.path}}                    — dot-path lookup
 *   {{this.field}}                       — current loop item field
 *   {{this}}                             — current loop item (primitive)
 *   {{@index}} {{@first}} {{@last}}      — loop context (only inside #each)
 *   {{#if condition}}...{{else}}...{{/if}} — conditional with optional else
 *   {{#each array}}...{{/each}}          — iteration over arrays
 *
 * Truthiness (for {{#if}})
 * ------------------------
 *   Falsy:   false, 0, '', null, undefined, [] (empty array)
 *   Truthy:  everything else (including '0', 'false', {}, non-empty arrays)
 *
 * Edge cases
 * ----------
 *   - Missing variable              → empty string (never throws)
 *   - {{else}} outside {{#if}}      → treated as literal text "{{else}}"
 *   - {{this}} (bare) inside #each  → renders the primitive item itself
 *   - {{#each}} on non-array        → renders nothing, adds a warning
 *   - HTML escaping                 → NONE (output is raw text; caller's job)
 *   - Nested {{#if}} / {{#each}}    → supported in any combination
 *
 * Example test cases (documented; not a test file)
 * ------------------------------------------------
 *   renderString('Hello {{customer.name}}!', { customer: { name: 'علی' } })
 *     → 'Hello علی!'
 *
 *   renderString('{{#if invoice.paid}}PAID{{else}}UNPAID{{/if}}',
 *                { invoice: { paid: true } })
 *     → 'PAID'
 *
 *   renderString('{{#each items}}{{@index}}: {{this.name}}; {{/each}}',
 *                { items: [{ name: 'A' }, { name: 'B' }] })
 *     → '0: A; 1: B; '
 *
 *   renderString('{{#if a}}{{#if b}}both{{/if}}{{/if}}',
 *                { a: true, b: true })
 *     → 'both'
 *
 * Architecture laws
 * -----------------
 *   LAW-55: Notifications Must Be Template-Based (versioned, language-aware)
 *   LAW-53: Determinism — same input always yields same output
 */

// ============================================================
// Public API
// ============================================================

export interface RenderResult {
  /** Rendered subject (null when the template had no subject, e.g. SMS/Push). */
  subject: string | null
  /** Rendered body. */
  body: string
  /** Non-fatal warnings (parser issues, type mismatches). Never thrown. */
  warnings: string[]
}

export interface TemplateInput {
  /** Subject template (null for channels without a subject — SMS/Push/In-App). */
  subjectTemplate: string | null
  /** Body template (required). */
  bodyTemplate: string
  /** Caller-provided variables. Currency/dates must already be formatted as strings. */
  variables: Record<string, any>
}

/**
 * Render a notification template (subject + body) with the given variables.
 *
 * Deterministic: the same input always produces the same output. Warnings
 * are returned (never thrown) for malformed templates — the renderer will
 * still produce its best-effort output.
 */
export function renderTemplate(input: TemplateInput): RenderResult {
  const warnings: string[] = []
  const body = renderStringInternal(input.bodyTemplate, input.variables, warnings)
  const subject =
    input.subjectTemplate != null
      ? renderStringInternal(input.subjectTemplate, input.variables, warnings)
      : null
  return { subject, body, warnings }
}

/**
 * Convenience: render an ad-hoc template string (no subject, no warnings).
 *
 * Useful for one-off rendering where the caller does not need a Template object.
 * Returns just the rendered text. Any structural issues are silently ignored.
 */
export function renderString(template: string, variables: Record<string, any>): string {
  const safeVars = variables && typeof variables === 'object' ? variables : {}
  return renderStringInternal(template, safeVars, [])
}

/**
 * Validate a template string. Returns a list of structural issues:
 *   - Unclosed {{#if}} / {{#each}}
 *   - Unexpected {{/if}} / {{/each}} without matching open
 *
 * Stray {{else}} is NOT reported — it is treated as literal text per spec.
 * Empty array = template is structurally valid.
 */
export function validateTemplate(template: string): string[] {
  const issues: string[] = []
  const tokens = tokenize(template)
  parse(tokens, issues)
  return issues
}

// ============================================================
// AST Node Types (internal)
// ============================================================

interface TextNode {
  type: 'text'
  value: string
}

interface VariableNode {
  type: 'variable'
  path: string[]
}

interface IfNode {
  type: 'if'
  condition: string[]
  children: TemplateNode[]
  elseChildren: TemplateNode[]
}

interface EachNode {
  type: 'each'
  path: string[]
  children: TemplateNode[]
}

type TemplateNode = TextNode | VariableNode | IfNode | EachNode

// ============================================================
// Token Types (internal)
// ============================================================

type Token =
  | { kind: 'text'; value: string }
  | { kind: 'variable'; path: string[] }
  | { kind: 'open-if'; path: string[] }
  | { kind: 'open-each'; path: string[] }
  | { kind: 'else' }
  | { kind: 'close-if' }
  | { kind: 'close-each' }

// ============================================================
// Tokenizer
// ============
// Splits the source into a flat stream of tokens. Never throws —
// malformed tags (e.g. {{#if}} with no expression) are emitted as
// literal text tokens so rendering always produces something.
// ============================================================

const TAG_PATTERN = /\{\{(.*?)\}\}/g

function tokenize(src: string): Token[] {
  const tokens: Token[] = []
  let lastIndex = 0
  TAG_PATTERN.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = TAG_PATTERN.exec(src)) !== null) {
    if (m.index > lastIndex) {
      tokens.push({ kind: 'text', value: src.slice(lastIndex, m.index) })
    }
    const fullMatch = m[0]
    const trimmed = m[1].trim()
    tokens.push(parseTokenContent(trimmed, fullMatch))
    lastIndex = m.index + fullMatch.length
  }
  if (lastIndex < src.length) {
    tokens.push({ kind: 'text', value: src.slice(lastIndex) })
  }
  return tokens
}

function parseTokenContent(trimmed: string, fullMatch: string): Token {
  // Empty {{}} or {{ }} → literal text
  if (trimmed === '') {
    return { kind: 'text', value: fullMatch }
  }
  if (trimmed === 'else') {
    return { kind: 'else' }
  }
  if (trimmed === '/if') {
    return { kind: 'close-if' }
  }
  if (trimmed === '/each') {
    return { kind: 'close-each' }
  }

  // Block directives — keyword must be its own whitespace-delimited token
  const parts = trimmed.split(/\s+/)
  if (parts[0] === '#if') {
    if (parts.length < 2) {
      // Malformed: {{#if}} with no condition → literal text
      return { kind: 'text', value: fullMatch }
    }
    const expr = parts.slice(1).join(' ')
    return { kind: 'open-if', path: splitPath(expr) }
  }
  if (parts[0] === '#each') {
    if (parts.length < 2) {
      return { kind: 'text', value: fullMatch }
    }
    const expr = parts.slice(1).join(' ')
    return { kind: 'open-each', path: splitPath(expr) }
  }

  // Otherwise: variable reference
  return { kind: 'variable', path: splitPath(trimmed) }
}

function splitPath(expr: string): string[] {
  return expr
    .split('.')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

// ============================================================
// Parser (recursive descent → AST)
// ==================================
// parseBlock returns when it hits a stop sentinel:
//   - {{else}}         (only when stopOnElse=true, i.e. inside #if then-branch)
//   - {{/if}}           (only when stopOnClose='if')
//   - {{/each}}         (only when stopOnClose='each')
//   - end of tokens
// The caller decides what to do based on which sentinel fired.
// Structural issues (unbalanced tags) are appended to `issues` and
// parsing continues with best-effort recovery.
// ============================================================

interface ParseResult {
  nodes: TemplateNode[]
  stoppedOnElse: boolean
  stoppedOnClose: 'if' | 'each' | null
}

function parse(tokens: Token[], issues: string[]): TemplateNode[] {
  let pos = 0

  function parseBlock(stopOnElse: boolean, stopOnClose: 'if' | 'each' | null): ParseResult {
    const nodes: TemplateNode[] = []

    while (pos < tokens.length) {
      const t = tokens[pos]

      if (t.kind === 'text') {
        pos++
        if (t.value.length > 0) {
          nodes.push({ type: 'text', value: t.value })
        }
      } else if (t.kind === 'variable') {
        pos++
        nodes.push({ type: 'variable', path: t.path })
      } else if (t.kind === 'open-if') {
        pos++
        const condition = t.path
        // Then-part stops on EITHER {{else}} OR {{/if}}
        const thenPart = parseBlock(true, 'if')
        let elseChildren: TemplateNode[] = []
        if (thenPart.stoppedOnElse) {
          // There was an {{else}} — parse the else branch until {{/if}}
          const afterElse = parseBlock(false, 'if')
          elseChildren = afterElse.nodes
          if (afterElse.stoppedOnClose !== 'if') {
            issues.push(`Unclosed {{#if}} (expression: ${condition.join('.')})`)
          }
        } else {
          // No {{else}} — thenPart should have stopped on {{/if}}
          if (thenPart.stoppedOnClose !== 'if') {
            issues.push(`Unclosed {{#if}} (expression: ${condition.join('.')})`)
          }
        }
        nodes.push({
          type: 'if',
          condition,
          children: thenPart.nodes,
          elseChildren,
        })
      } else if (t.kind === 'open-each') {
        pos++
        const path = t.path
        const body = parseBlock(false, 'each')
        if (body.stoppedOnClose !== 'each') {
          issues.push(`Unclosed {{#each}} (expression: ${path.join('.')})`)
        }
        nodes.push({ type: 'each', path, children: body.nodes })
      } else if (t.kind === 'else') {
        pos++
        if (stopOnElse) {
          return { nodes, stoppedOnElse: true, stoppedOnClose: null }
        }
        // Stray {{else}} outside {{#if}} → literal text (per spec)
        nodes.push({ type: 'text', value: '{{else}}' })
      } else if (t.kind === 'close-if') {
        pos++
        if (stopOnClose === 'if') {
          return { nodes, stoppedOnElse: false, stoppedOnClose: 'if' }
        }
        issues.push('Unexpected {{/if}} without matching {{#if}}')
      } else if (t.kind === 'close-each') {
        pos++
        if (stopOnClose === 'each') {
          return { nodes, stoppedOnElse: false, stoppedOnClose: 'each' }
        }
        issues.push('Unexpected {{/each}} without matching {{#each}}')
      } else {
        // Unknown token kind (defensive — should never happen)
        pos++
      }
    }

    return { nodes, stoppedOnElse: false, stoppedOnClose: null }
  }

  return parseBlock(false, null).nodes
}

// ============================================================
// Renderer (AST walker with scope stack)
// =======================================
// The scope stack supports loop variable shadowing:
//   - Root scope: the caller's variables object
//   - Per-iteration scope: { this, @index, @first, @last }
//
// Lookup order (top → bottom of stack) means inner loops shadow outer
// loops' `this`/`@index`/etc. Regular dot-paths (e.g. {{customer.name}})
// walk down the stack until a scope has the first segment as own property,
// then traverse the rest of the path on that value.
// ============================================================

interface Scope {
  [key: string]: any
}

function renderStringInternal(
  template: string,
  variables: Record<string, any>,
  warnings: string[],
): string {
  const issues: string[] = []
  const tokens = tokenize(template)
  const ast = parse(tokens, issues)
  for (const issue of issues) {
    warnings.push(issue)
  }
  const scopes: Scope[] = [variables]
  return renderNodes(ast, scopes, warnings)
}

function renderNodes(nodes: TemplateNode[], scopes: Scope[], warnings: string[]): string {
  let out = ''
  for (const node of nodes) {
    out += renderNode(node, scopes, warnings)
  }
  return out
}

function renderNode(node: TemplateNode, scopes: Scope[], warnings: string[]): string {
  switch (node.type) {
    case 'text':
      return node.value

    case 'variable':
      return renderVariable(node.path, scopes)

    case 'if': {
      const condValue = resolvePath(node.condition, scopes)
      if (isTruthy(condValue)) {
        return renderNodes(node.children, scopes, warnings)
      }
      return renderNodes(node.elseChildren, scopes, warnings)
    }

    case 'each': {
      const arr = resolvePath(node.path, scopes)
      if (arr == null) {
        // null/undefined array → render nothing (silent)
        return ''
      }
      if (!Array.isArray(arr)) {
        warnings.push(
          `{{#each ${node.path.join('.')}}} expected an array but got ${typeof arr}`,
        )
        return ''
      }
      let out = ''
      const len = arr.length
      for (let i = 0; i < len; i++) {
        const scope: Scope = {
          this: arr[i],
          '@index': i,
          '@first': i === 0,
          '@last': i === len - 1,
        }
        scopes.push(scope)
        out += renderNodes(node.children, scopes, warnings)
        scopes.pop()
      }
      return out
    }

    default:
      return ''
  }
}

function renderVariable(path: string[], scopes: Scope[]): string {
  const value = resolvePath(path, scopes)
  if (value == null) return '' // null or undefined → empty string
  // Numbers, booleans, strings: String() handles them all correctly.
  // Caller is responsible for formatting currency/dates as strings before
  // passing them in (per LAW-55 spec).
  return String(value)
}

// Sentinel returned by findInScopes when no scope owns the key.
// Using a Symbol guarantees no collision with user-supplied values.
const NOT_FOUND = Symbol('notification.template-engine.NOT_FOUND')

/**
 * Resolve a dot-path against the scope stack.
 *
 * Special first-segment handling:
 *   'this'    → topmost loop-iteration scope's 'this' value, then traverse
 *   '@index'  → topmost loop-iteration scope's '@index' (no traversal)
 *   '@first'  → topmost loop-iteration scope's '@first' (no traversal)
 *   '@last'   → topmost loop-iteration scope's '@last' (no traversal)
 *
 * For any other first segment, search the scope chain top-to-bottom for the
 * first segment as an own property; then traverse the rest of the path on
 * that value.
 *
 * Returns undefined if not found (or if traversal hits a non-object).
 */
function resolvePath(path: string[], scopes: Scope[]): any {
  if (path.length === 0) return undefined
  const first = path[0]

  if (first === 'this') {
    const item = findInScopes(scopes, 'this')
    if (item === NOT_FOUND) return undefined
    if (path.length === 1) return item
    return traversePath(item, path.slice(1))
  }

  if (first === '@index' || first === '@first' || first === '@last') {
    const value = findInScopes(scopes, first)
    if (value === NOT_FOUND) return undefined
    return value
  }

  const firstValue = findInScopes(scopes, first)
  if (firstValue === NOT_FOUND) return undefined
  if (path.length === 1) return firstValue
  return traversePath(firstValue, path.slice(1))
}

function findInScopes(scopes: Scope[], key: string): any {
  for (let i = scopes.length - 1; i >= 0; i--) {
    const scope = scopes[i]
    if (scope && Object.prototype.hasOwnProperty.call(scope, key)) {
      return scope[key]
    }
  }
  return NOT_FOUND
}

function traversePath(obj: any, segments: string[]): any {
  let cur = obj
  for (const seg of segments) {
    if (cur == null) return undefined
    // typeof null === 'object' in JS, so the null check above must come first
    if (typeof cur !== 'object') return undefined
    cur = cur[seg]
  }
  return cur
}

/**
 * Truthiness for {{#if}}.
 *
 * Falsy:   false, 0, '', null, undefined, [] (empty array)
 * Truthy:  everything else
 *
 * Note: empty object {} is truthy (matches JS Boolean({}) === true).
 * Note: NaN is technically falsy in JS, but the spec lists only the five
 *       explicit falsy values above. NaN is left as truthy (the caller
 *       should not pass NaN).
 */
function isTruthy(value: any): boolean {
  if (value == null) return false // null or undefined
  if (value === false) return false
  if (value === 0) return false // also matches -0 / +0
  if (value === '') return false
  if (Array.isArray(value) && value.length === 0) return false
  return true
}
