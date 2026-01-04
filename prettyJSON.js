// prettyJSON.js - Beautiful terminal JSON printer

class PrettyJSON {
  static max_prim_length = -1;
  static discourage_multiline = false;
  static print(obj, indent = 0) {
    const INDENT_SIZE = 2;
    const indentStr = ' '.repeat(indent * INDENT_SIZE);

    const type = this.#getType(obj);

    if (type === 'primitive') {
      return indentStr + this.#formatPrimitive(obj);
    }

    if (type === 'array') {
      return this.#printArray(obj, indent);
    }

    if (type === 'object') {
      return this.#printObject(obj, indent);
    }

    return indentStr + String(obj);
  }

  static #getType(value) {
    if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return 'primitive';
    }
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return 'unknown';
  }

  static #formatPrimitive(value) {
    if (typeof value === 'string') {
      return `\u001b[93m${this.#truncate(value, this.max_prim_length)}\u001b[0m`; // bright yellow
    }
    if (typeof value === 'number') {
      return `\u001b[36m${this.#truncate(value.toString(), this.max_prim_length)}\u001b[0m`; // cyan
    }
    if (typeof value === 'boolean') {
      return value ? '\u001b[32mtrue\u001b[0m' : '\u001b[31mfalse\u001b[0m'; // green/red
    }
    if (value === null) {
      return '\u001b[90mnull\u001b[0m'; // gray
    }
    return String(value);
  }

  static #truncate(str, maxLen) {
    const new_line_idx = str.indexOf('\n');

    if (!maxLen || isNaN(maxLen) || maxLen < 0) {
      maxLen = str.length;
    }

    if (new_line_idx !== -1 && new_line_idx < maxLen) {
      maxLen = new_line_idx;
    }
    if (str.length <= maxLen) return str;

    if (maxLen > 24 && this.discourage_multiline) {
      if (str.slice(0, maxLen + 1).endsWith('\n')) return str.slice(0, maxLen - 21) + ` \u001b[0m(multi-line ${str.length - maxLen} more...)`;
      return str.slice(0, maxLen - 12 - (str.length - maxLen).toString().length) + `... \u001b[0m(${str.length - maxLen} more)`;
    } else {
      return str.slice(0, maxLen - 3) + '...';
    }
  }

  static #stripColors(str) {
    return str.replace(/\u001b\[[0-9;]*m/g, '');
  }

  static #printObject(obj, indent) {
    const keys = Object.keys(obj);
    if (keys.length === 0) {
      return ' '.repeat(indent * 2) + '{}';
    }

    const lines = [];
    for (const key of keys) {
      const value = obj[key];
      const valueType = this.#getType(value);

      if (valueType === 'primitive') {
        lines.push(`  ${' '.repeat(indent * 2)}\u001b[1m${key}\u001b[0m: ${this.#formatPrimitive(value)}`);
      } else {
        lines.push(`  ${' '.repeat(indent * 2)}\u001b[1m${key}\u001b[0m:`);
        lines.push(this.print(value, indent + 1));
      }
    }

    return lines.join('\n');
  }

  static #printArray(arr, indent) {
    if (arr.length === 0) {
      return ' '.repeat(indent * 2) + '[]';
    }

    // Try table if uniform objects
    const allObjects = arr.every(item => this.#getType(item) === 'object');
    if (allObjects && arr.length > 0) {
      const firstKeys = Object.keys(arr[0]);
      const allSameShape = arr.every(item => {
        const keys = Object.keys(item);
        return keys.length === firstKeys.length && keys.every(k => firstKeys.includes(k));
      });

      if (allSameShape && firstKeys.length > 0) {
        return this.#printTable(arr, indent);
      }
    }

    // Fallback: vertical list
    const lines = [];
    for (let i = 0; i < arr.length; i++) {
      lines.push(this.print(arr[i], indent + 1));
    }
    return lines.join('\n');
  }

  static #printTable(arr, indent) {
    const keys = Object.keys(arr[0]);
    const indentStr = ' '.repeat(indent * 2);

    // Calculate max width per column
    const widths = {};
    keys.forEach(key => {
      const headerLen = key.length;
      const valuesLens = arr.map(row => {
        const val = row[key];
        const str = this.#formatPrimitive(val);
        return this.#stripColors(str).length;
      });
      widths[key] = Math.min(Math.max(headerLen, ...valuesLens), 50); // cap at 50
    });

    const totalWidth = keys.reduce((sum, k) => sum + widths[k] + 3, -3) + 2;

    let lines = [];

    // Top border
    lines.push(`${indentStr}┌${'─'.repeat(totalWidth)}┐`);

    // Bold header
    const headerCells = keys.map(key => {
      const padded = key.padEnd(widths[key]);
      return ` \u001b[1m${padded}\u001b[0m `;
    }).join('│');
    lines.push(`${indentStr}│${headerCells}│`);

    // Separator
    const sep = keys.map(key => '─'.repeat(widths[key] + 2)).join('┬');
    lines.push(`${indentStr}├${sep}┤`);

    // Rows with color
    for (const row of arr) {
      const cells = keys.map(key => {
        const rawVal = row[key];
        let display = this.#formatPrimitive(rawVal);
        const colorCode = display.match(/^\u001b\[[\d;]+m/)?.[0] || '';
        const reset = '\u001b[0m';
        const plain = this.#stripColors(display);
        display = this.#truncate(plain, widths[key]);
        // Re-apply color to truncated string
        display = display.replace(/\u001b\[[0-9;]*m/g, '');
        display = `${colorCode}${display.padEnd(widths[key])}${reset}`;
        return ` ${display} `;
      }).join('│');
      lines.push(`${indentStr}│${cells}│`);
    }

    // Bottom border
    const bottom = keys.map(key => '─'.repeat(widths[key] + 2)).join('┴');
    lines.push(`${indentStr}└${bottom}┘`);

    return '\n' + lines.join('\n');
  }
}
module.exports = PrettyJSON;
/*
// === Test ===
const data = {
  user: "Alice",
  status: true,
  notes: null,
  really_long_number: 2312831290482390185483215893218590851830483248239085931851,
  rooms: [
    { name: "general", topic: "A very long topic that describes the purpose of this room in great detail and goes on forever", member_count: 123 },
    { name: "random", topic: "", member_count: 45 },
    { name: "tech-talk", topic: "Discussions about programming, AI, and futuristic tech like xAI and Grok", member_count: 8 }
  ]
};

console.log(PrettyJSON.print(data));




// === Usage Example (paste into REPL) ===

const data2 = {
  user: "Alice",
  age: 30,
  active: true,
  settings: {
    theme: "dark",
    notifications: true,
    "embedded data": data
  },
  rooms: [
    { name: "general", topic: "Welcome!", member_count: 42 },
    { name: "random", topic: "", member_count: 15 },
    { name: "tech", topic: "Tech talk", member_count: 8 }
  ],
  tags: ["admin", "beta", "vip"],
  score: null
};


console.log(PrettyJSON.print(data2));
*/